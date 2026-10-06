#################################################################################
# Eclipse Tractus-X - Industry Core Hub Backend
#
# Copyright (c) 2025 LKS Next
# Copyright (c) 2025 Contributors to the Eclipse Foundation
#
# See the NOTICE file(s) distributed with this work for additional
# information regarding copyright ownership.
#
# This program and the accompanying materials are made available under the
# terms of the Apache License, Version 2.0 which is available at
# https://www.apache.org/licenses/LICENSE-2.0.
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND,
# either express or implied. See the
# License for the specific language govern in permissions and limitations
# under the License.
#
# SPDX-License-Identifier: Apache-2.0
#################################################################################

from tractusx_sdk.dataspace.managers import OAuth2Manager
from keycloak.exceptions import KeycloakConnectionError, KeycloakError, KeycloakGetError
from managers.config.config_manager import ConfigManager
from managers.config.log_manager import LoggingManager
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi import HTTPException, Request, status, Depends
from collections.abc import Mapping
import threading

logger = LoggingManager.get_logger('staging')
_authorization_enabled = bool(ConfigManager.get_config("authorization.enabled", False))
oauth2_manager: OAuth2Manager | None = None
_keycloak_initialization_lock = threading.Lock()
bearer_security = HTTPBearer(auto_error=False)

if not _authorization_enabled:
    logger.warning("=" * 80)
    logger.warning("[AUTH] Authorization is DISABLED - API endpoints are publicly accessible")
    logger.warning("=" * 80)


def _initialize_oauth2_manager() -> OAuth2Manager | None:
    """Create the Keycloak client on demand, retrying only for this request."""
    global oauth2_manager

    if oauth2_manager is not None:
        return oauth2_manager

    with _keycloak_initialization_lock:
        if oauth2_manager is not None:
            return oauth2_manager

        keycloak_url = ConfigManager.get_config("authorization.keycloak.auth_url")
        keycloak_realm = ConfigManager.get_config("authorization.keycloak.realm")
        keycloak_client_id = ConfigManager.get_config("authorization.keycloak.client_id")
        keycloak_client_secret = ConfigManager.get_config("authorization.keycloak.client_secret")
        logger.info(
            f"[OAuth2 Manager] Lazy initialization for Keycloak OAuth2: "
            f"{keycloak_url} realm: {keycloak_realm}"
        )
        try:
            oauth2_manager = OAuth2Manager(
                auth_url=keycloak_url,
                realm=keycloak_realm,
                clientid=keycloak_client_id,
                clientsecret=keycloak_client_secret,
            )
            logger.info("[AUTH] Keycloak authentication initialized")
            return oauth2_manager
        except (ConnectionError, KeycloakConnectionError, KeycloakGetError) as error:
            logger.warning(f"[OAuth2 Manager] Keycloak initialization failed: {error}")
            return None


def get_authentication_dependency():
    """Return a dependency that lazily authenticates requests with Keycloak."""
    def authenticate(
        request: Request,
        bearer_token: HTTPAuthorizationCredentials = Depends(bearer_security)
    ) -> bool:
        # Always allow OPTIONS requests for CORS preflight
        # Authorization disabled is the only configuration that allows requests through.
        if request.method == "OPTIONS" or not _authorization_enabled:
            return True

        if not bearer_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required: provide Bearer token",
            )

        manager = _initialize_oauth2_manager()
        if manager is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Authentication service unavailable",
            )

        if manager.is_authenticated(request=request):
            logger.debug("[AUTH] Request authenticated via OAuth2 (Keycloak)")
            return True

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired Bearer token",
        )
    return authenticate


def get_user_info_dependency():
    """Return a dependency that provides Keycloak UserInfo claims when available."""
    def get_user_info(
        request: Request,
        bearer_token: HTTPAuthorizationCredentials = Depends(bearer_security)
    ) -> Mapping[str, object] | None:
        if request.method == "OPTIONS" or not _authorization_enabled:
            return None

        if not bearer_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required: provide Bearer token",
            )

        manager = _initialize_oauth2_manager()
        if manager is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Authentication service unavailable",
            )

        try:
            return manager.keycloak_openid.userinfo(bearer_token.credentials)
        except (ConnectionError, KeycloakError, HTTPException) as error:
            logger.debug(f"[AUTH] Keycloak UserInfo unavailable: {error}")
            return None

    return get_user_info
