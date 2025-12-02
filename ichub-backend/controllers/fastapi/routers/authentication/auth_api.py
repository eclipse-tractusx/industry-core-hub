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

from tractusx_sdk.dataspace.managers import AuthManager, OAuth2Manager
from managers.config.config_manager import ConfigManager
from managers.config.log_manager import LoggingManager
from fastapi.security import APIKeyHeader, HTTPBearer, HTTPAuthorizationCredentials
from fastapi import HTTPException, Request, status, Depends
import time

logger = LoggingManager.get_logger('staging')
auth_manager: AuthManager | OAuth2Manager = None

if ConfigManager.get_config("authorization.enabled"):
    if not ConfigManager.get_config("authorization.keycloak.enabled"):
        logger.info("[API Key Manager] Authorization enabled with API Key authentication")
        logger.info(f"[API Key Manager] API Key header: {ConfigManager.get_config('authorization.api_key.key')}")
        auth_manager = AuthManager(
            api_key_header=ConfigManager.get_config("authorization.api_key.key"),
            configured_api_key=ConfigManager.get_config("authorization.api_key.value"),
            auth_enabled=ConfigManager.get_config("authorization.enabled")
        )
    else:
        keycloak_url = ConfigManager.get_config("authorization.keycloak.auth_url")
        keycloak_realm = ConfigManager.get_config("authorization.keycloak.realm")
        keycloak_client_id = ConfigManager.get_config("authorization.keycloak.client_id")
        logger.info(f"[OAuth2 Manager] Attempting to connect to Keycloak OAuth2: {keycloak_url} realm: {keycloak_realm}")
        
        # Retry logic for Keycloak connection
        max_retries = ConfigManager.get_config("authorization.keycloak.retry.max_retries", 5)
        retry_delay = ConfigManager.get_config("authorization.keycloak.retry.retry_delay", 10)
        keycloak_connected = False
        logger.info(f"[OAuth2 Manager] Retry configuration: max_retries={max_retries}, retry_delay={retry_delay}s")
        
        for attempt in range(1, max_retries + 1):
            try:
                logger.info(f"[OAuth2 Manager] Connection attempt {attempt}/{max_retries}...")
                auth_manager = OAuth2Manager(
                    auth_url=keycloak_url,
                    realm=keycloak_realm,
                    clientid=keycloak_client_id,
                    clientsecret=ConfigManager.get_config("authorization.keycloak.client_secret"),
                )
                keycloak_connected = True
                logger.info(f"[OAuth2 Manager] Successfully connected to Keycloak")
                break
            except Exception as e:
                logger.warning(f"[OAuth2 Manager] Connection attempt {attempt}/{max_retries} failed: {e}")
                if attempt < max_retries:
                    logger.info(f"[OAuth2 Manager] Retrying in {retry_delay} seconds...")
                    time.sleep(retry_delay)
                else:
                    logger.error(f"[OAuth2 Manager] Failed to connect to Keycloak after {max_retries} attempts")
        
        # Fallback to API Key authentication if Keycloak connection fails
        if not keycloak_connected:
            logger.warning("=" * 80)
            logger.warning("[AUTH] Keycloak connection failed - Falling back to API Key authentication")
            logger.warning("=" * 80)
            auth_manager = AuthManager(
                api_key_header=ConfigManager.get_config("authorization.api_key.key"),
                configured_api_key=ConfigManager.get_config("authorization.api_key.value"),
                auth_enabled=ConfigManager.get_config("authorization.enabled")
            )
            logger.info(f"[API Key Manager] Fallback authentication initialized with header: {ConfigManager.get_config('authorization.api_key.key')}")
else:
    logger.warning("=" * 80)
    logger.warning("[AUTH] Authorization is DISABLED - API endpoints are publicly accessible")
    logger.warning("=" * 80)

api_key_header = APIKeyHeader(name=ConfigManager.get_config("authorization.api_key.key"), auto_error=False)
bearer_security = HTTPBearer(auto_error=False)

def get_authentication_dependency():
    """Dynamic authentication dependency based on configuration"""
    def authenticate(
        request: Request,
        api_key: str = Depends(api_key_header),
        bearer_token: HTTPAuthorizationCredentials = Depends(bearer_security)
    ) -> bool:
        # Always allow OPTIONS requests for CORS preflight
        if request.method == "OPTIONS":
            return True

        if auth_manager is None:
            return True

        try:
            if api_key or bearer_token:
                return auth_manager.is_authenticated(request=request)
            
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required: provide either X-Api-Key header or Bearer token"
            )
        except HTTPException:
            # Re-raise HTTP exceptions as-is
            raise
        except Exception as e:
            # Log unexpected errors and return 401 instead of 500
            logger.error(f"Authentication error: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication failed"
            )
    return authenticate
