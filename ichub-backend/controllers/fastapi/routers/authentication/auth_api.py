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
import threading

logger = LoggingManager.get_logger('staging')
api_key_manager: AuthManager = None
oauth2_manager: OAuth2Manager = None
_keycloak_retry_thread = None
_keycloak_connected = False

if ConfigManager.get_config("authorization.enabled"):
    # Always initialize API Key authentication
    logger.info("[API Key Manager] Initializing API Key authentication")
    logger.info(f"[API Key Manager] API Key header: {ConfigManager.get_config('authorization.api_key.key')}")
    api_key_manager = AuthManager(
        api_key_header=ConfigManager.get_config("authorization.api_key.key"),
        configured_api_key=ConfigManager.get_config("authorization.api_key.value"),
        auth_enabled=ConfigManager.get_config("authorization.enabled")
    )
    
    # Additionally initialize Keycloak if enabled
    if ConfigManager.get_config("authorization.keycloak.enabled"):
        keycloak_url = ConfigManager.get_config("authorization.keycloak.auth_url")
        keycloak_realm = ConfigManager.get_config("authorization.keycloak.realm")
        keycloak_client_id = ConfigManager.get_config("authorization.keycloak.client_id")
        logger.info(f"[OAuth2 Manager] Attempting to connect to Keycloak OAuth2: {keycloak_url} realm: {keycloak_realm}")
        
        # Retry logic for Keycloak connection
        max_retries = ConfigManager.get_config("authorization.keycloak.retry.max_retries")
        retry_delay = ConfigManager.get_config("authorization.keycloak.retry.retry_delay")

        _keycloak_connected = False
        logger.info(f"[OAuth2 Manager] Retry configuration: max_retries={max_retries}, retry_delay={retry_delay}s")
        
        for attempt in range(1, max_retries + 1):
            try:
                logger.info(f"[OAuth2 Manager] Connection attempt {attempt}/{max_retries}...")
                oauth2_manager = OAuth2Manager(
                    auth_url=keycloak_url,
                    realm=keycloak_realm,
                    clientid=keycloak_client_id,
                    clientsecret=ConfigManager.get_config("authorization.keycloak.client_secret"),
                )
                _keycloak_connected = True
                logger.info(f"[OAuth2 Manager] Successfully connected to Keycloak")
                logger.info("=" * 80)
                logger.info("[AUTH] Dual authentication active: API Key + OAuth2 (Keycloak)")
                logger.info("=" * 80)
                break
            except Exception as e:
                logger.warning(f"[OAuth2 Manager] Connection attempt {attempt}/{max_retries} failed: {e}")
                if attempt < max_retries:
                    logger.info(f"[OAuth2 Manager] Retrying in {retry_delay} seconds...")
                    time.sleep(retry_delay)
                else:
                    logger.error(f"[OAuth2 Manager] Failed to connect to Keycloak after {max_retries} attempts")
        
        # Start background retry if Keycloak connection failed
        if not _keycloak_connected:
            logger.warning("=" * 80)
            logger.warning("[AUTH] Keycloak connection failed - API Key authentication active")
            logger.warning("[AUTH] Background retry task will continue attempting to connect to Keycloak")
            logger.warning("=" * 80)
            
            # Start background retry thread
            def retry_keycloak_connection():
                global oauth2_manager, _keycloak_connected
                retry_interval = ConfigManager.get_config("authorization.keycloak.retry.background_retry_interval", retry_delay)
                
                while not _keycloak_connected:
                    time.sleep(retry_interval)
                    try:
                        logger.info("[OAuth2 Manager] Background retry: Attempting to reconnect to Keycloak...")
                        temp_manager = OAuth2Manager(
                            auth_url=keycloak_url,
                            realm=keycloak_realm,
                            clientid=keycloak_client_id,
                            clientsecret=ConfigManager.get_config("authorization.keycloak.client_secret"),
                        )
                        # Success - enable OAuth2 alongside API Key
                        oauth2_manager = temp_manager
                        _keycloak_connected = True
                        logger.info("=" * 80)
                        logger.info("[AUTH] Successfully reconnected to Keycloak - Dual authentication now active: API Key + OAuth2")
                        logger.info("=" * 80)
                    except Exception as e:
                        logger.debug(f"[OAuth2 Manager] Background retry failed: {e}")
            
            _keycloak_retry_thread = threading.Thread(target=retry_keycloak_connection, daemon=True)
            _keycloak_retry_thread.start()
            background_interval = ConfigManager.get_config("authorization.keycloak.retry.background_retry_interval", retry_delay)
            logger.info(f"[OAuth2 Manager] Background retry thread started (interval: {background_interval}s)")
    else:
        logger.info("=" * 80)
        logger.info("[AUTH] API Key authentication active (Keycloak disabled)")
        logger.info("=" * 80)
else:
    logger.warning("=" * 80)
    logger.warning("[AUTH] Authorization is DISABLED - API endpoints are publicly accessible")
    logger.warning("=" * 80)

api_key_header = APIKeyHeader(name=ConfigManager.get_config("authorization.api_key.key"), auto_error=False)
bearer_security = HTTPBearer(auto_error=False)

def get_authentication_dependency():
    """Dynamic authentication dependency supporting both API Key and OAuth2 (Keycloak)"""
    def authenticate(
        request: Request,
        api_key: str = Depends(api_key_header),
        bearer_token: HTTPAuthorizationCredentials = Depends(bearer_security)
    ) -> bool:
        # Always allow OPTIONS requests for CORS preflight
        if request.method == "OPTIONS":
            return True

        # If authorization is disabled, allow all requests
        if api_key_manager is None and oauth2_manager is None:
            return True

        try:
            # Try API Key authentication first (always available when auth is enabled)
            if api_key and api_key_manager:
                try:
                    if api_key_manager.is_authenticated(request=request):
                        logger.debug("[AUTH] Request authenticated via API Key")
                        return True
                except Exception as e:
                    logger.debug(f"[AUTH] API Key authentication failed: {e}")
            
            # Try OAuth2 (Keycloak) authentication if available
            if bearer_token and oauth2_manager:
                try:
                    if oauth2_manager.is_authenticated(request=request):
                        logger.debug("[AUTH] Request authenticated via OAuth2 (Keycloak)")
                        return True
                except Exception as e:
                    logger.debug(f"[AUTH] OAuth2 authentication failed: {e}")
            
            # No valid authentication provided or both methods failed
            available_methods = []
            if api_key_manager:
                available_methods.append("X-Api-Key header")
            if oauth2_manager:
                available_methods.append("Bearer token")
            
            methods_str = " or ".join(available_methods) if available_methods else "valid credentials"
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Authentication required: provide {methods_str}"
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
