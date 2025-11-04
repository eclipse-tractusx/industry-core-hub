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
from fastapi.security import APIKeyHeader, HTTPBearer, HTTPAuthorizationCredentials
from fastapi import HTTPException, Request, status, Depends

auth_manager: AuthManager | OAuth2Manager = None

if ConfigManager.get_config("authorization.enabled"):
    if not ConfigManager.get_config("authorization.keycloak.enabled"):
        auth_manager = AuthManager(
            api_key_header=ConfigManager.get_config("authorization.api_key.key"),
            configured_api_key=ConfigManager.get_config("authorization.api_key.value"),
            auth_enabled=ConfigManager.get_config("authorization.enabled")
        )
    else:
        auth_manager = OAuth2Manager(
            auth_url=ConfigManager.get_config("authorization.keycloak.auth_url"),
            realm=ConfigManager.get_config("authorization.keycloak.realm"),
            clientid=ConfigManager.get_config("authorization.keycloak.client_id"),
            clientsecret=ConfigManager.get_config("authorization.keycloak.client_secret"),
        )

api_key_header = APIKeyHeader(name=ConfigManager.get_config("authorization.api_key.key"), auto_error=False)
bearer_security = HTTPBearer(auto_error=False)

def get_authentication_dependency():
    """Dynamic authentication dependency based on configuration"""
    def authenticate(
        request: Request,
        api_key: str = Depends(api_key_header),
        bearer_token: HTTPAuthorizationCredentials = Depends(bearer_security)
    ) -> bool:

        if auth_manager is None:
            return True

        if api_key or bearer_token:
            return auth_manager.is_authenticated(request=request)
        
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required: provide either X-Api-Key header or Bearer token"
        )
    return authenticate
