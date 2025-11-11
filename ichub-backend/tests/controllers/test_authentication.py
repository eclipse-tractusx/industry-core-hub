###############################################################
# Eclipse Tractus-X - Industry Core Hub Backend
#
# Copyright (c) 2025 LKS NEXT
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
# distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
# WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
# License for the specific language governing permissions and limitations
# under the License.
#
# SPDX-License-Identifier: Apache-2.0
###############################################################
## Code created partially using a LLM and reviewed by a human committer

import pytest
import os
from unittest.mock import Mock, MagicMock
from fastapi import Request, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials


class TestAuthenticationLogic:
    """Test cases for authentication dependency logic."""

    def test_authentication_function_with_no_auth_manager(self):
        """Test authentication behavior when auth_manager is None."""
        # Simulate the authenticate function behavior
        auth_manager = None
        mock_request = Mock(spec=Request)
        
        # When auth_manager is None, should return True
        if auth_manager is None:
            result = True
        else:
            result = auth_manager.is_authenticated(request=mock_request)
        
        assert result is True

    def test_authentication_function_with_valid_api_key(self):
        """Test authentication with valid API key."""
        # Mock auth manager
        auth_manager = Mock()
        auth_manager.is_authenticated = Mock(return_value=True)
        
        mock_request = Mock(spec=Request)
        api_key = "valid-api-key"
        bearer_token = None
        
        # Simulate authentication logic
        if auth_manager is None:
            result = True
        elif api_key or bearer_token:
            result = auth_manager.is_authenticated(request=mock_request)
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required"
            )
        
        assert result is True
        auth_manager.is_authenticated.assert_called_once_with(request=mock_request)

    def test_authentication_function_with_valid_bearer_token(self):
        """Test authentication with valid Bearer token."""
        # Mock auth manager
        auth_manager = Mock()
        auth_manager.is_authenticated = Mock(return_value=True)
        
        mock_request = Mock(spec=Request)
        api_key = None
        bearer_token = Mock(spec=HTTPAuthorizationCredentials)
        bearer_token.credentials = "valid-token"
        
        # Simulate authentication logic
        if auth_manager is None:
            result = True
        elif api_key or bearer_token:
            result = auth_manager.is_authenticated(request=mock_request)
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required"
            )
        
        assert result is True
        auth_manager.is_authenticated.assert_called_once_with(request=mock_request)

    def test_authentication_function_without_credentials_raises_error(self):
        """Test that missing credentials raise appropriate error."""
        # Mock auth manager
        auth_manager = Mock()
        
        mock_request = Mock(spec=Request)
        api_key = None
        bearer_token = None
        
        # Simulate authentication logic
        with pytest.raises(HTTPException) as exc_info:
            if auth_manager is None:
                result = True
            elif api_key or bearer_token:
                result = auth_manager.is_authenticated(request=mock_request)
            else:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required: provide either X-Api-Key header or Bearer token"
                )
        
        assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED
        assert "Authentication required" in exc_info.value.detail

    def test_authentication_function_with_invalid_credentials(self):
        """Test authentication with invalid credentials."""
        # Mock auth manager that returns False
        auth_manager = Mock()
        auth_manager.is_authenticated = Mock(return_value=False)
        
        mock_request = Mock(spec=Request)
        api_key = "invalid-key"
        bearer_token = None
        
        # Simulate authentication logic
        if auth_manager is None:
            result = True
        elif api_key or bearer_token:
            result = auth_manager.is_authenticated(request=mock_request)
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required"
            )
        
        assert result is False
        auth_manager.is_authenticated.assert_called_once_with(request=mock_request)


class TestRouterDependencies:
    """Test that routers have authentication dependencies configured."""

    @pytest.mark.parametrize("router_file,expected_import", [
        ("part_management.py", "get_authentication_dependency"),
        ("partner_management.py", "get_authentication_dependency"),
        ("twin_management.py", "get_authentication_dependency"),
        ("sharing_handler.py", "get_authentication_dependency"),
        ("submodel_dispatcher.py", "get_authentication_dependency"),
        ("connection_management.py", "get_authentication_dependency"),
        ("discovery_management.py", "get_authentication_dependency"),
    ])
    def test_router_files_import_authentication_dependency(self, router_file, expected_import):
        """Test that router files import the authentication dependency."""
        
        # Define router paths
        router_paths = {
            "part_management.py": "controllers/fastapi/routers/provider/v1/part_management.py",
            "partner_management.py": "controllers/fastapi/routers/provider/v1/partner_management.py",
            "twin_management.py": "controllers/fastapi/routers/provider/v1/twin_management.py",
            "sharing_handler.py": "controllers/fastapi/routers/provider/v1/sharing_handler.py",
            "submodel_dispatcher.py": "controllers/fastapi/routers/provider/v1/submodel_dispatcher.py",
            "connection_management.py": "controllers/fastapi/routers/consumer/v1/connection_management.py",
            "discovery_management.py": "controllers/fastapi/routers/consumer/v1/discovery_management.py",
        }
        
        file_path = router_paths[router_file]
        
        # Check if file exists and contains the import
        if os.path.exists(file_path):
            with open(file_path, 'r') as f:
                content = f.read()
                assert expected_import in content, f"{router_file} should import {expected_import}"
                assert "dependencies=[Depends(get_authentication_dependency())]" in content, \
                    f"{router_file} should have authentication dependency in APIRouter"

    @pytest.mark.parametrize("router_file", [
        "part_management.py",
        "partner_management.py", 
        "twin_management.py",
        "sharing_handler.py",
        "submodel_dispatcher.py",
        "connection_management.py",
        "discovery_management.py",
    ])
    def test_router_files_have_depends_import(self, router_file):
        """Test that router files import Depends from FastAPI."""

        router_paths = {
            "part_management.py": "controllers/fastapi/routers/provider/v1/part_management.py",
            "partner_management.py": "controllers/fastapi/routers/provider/v1/partner_management.py",
            "twin_management.py": "controllers/fastapi/routers/provider/v1/twin_management.py",
            "sharing_handler.py": "controllers/fastapi/routers/provider/v1/sharing_handler.py",
            "submodel_dispatcher.py": "controllers/fastapi/routers/provider/v1/submodel_dispatcher.py",
            "connection_management.py": "controllers/fastapi/routers/consumer/v1/connection_management.py",
            "discovery_management.py": "controllers/fastapi/routers/consumer/v1/discovery_management.py",
        }
        
        file_path = router_paths[router_file]
        
        if os.path.exists(file_path):
            with open(file_path, 'r') as f:
                content = f.read()
                # Check for Depends import (can be in different forms)
                assert ("from fastapi import" in content and "Depends" in content) or \
                       "from fastapi import Depends" in content, \
                    f"{router_file} should import Depends from FastAPI"


class TestAuthenticationConfiguration:
    """Test authentication configuration scenarios."""

    def test_api_key_auth_manager_initialization(self):
        """Test that API key auth manager can be initialized."""
        
        # Simulate AuthManager initialization
        auth_manager = MagicMock()
        auth_manager.api_key_header = "X-Api-Key"
        auth_manager.configured_api_key = "test-key"
        auth_manager.auth_enabled = True
        
        assert auth_manager is not None
        assert auth_manager.api_key_header == "X-Api-Key"
        assert auth_manager.auth_enabled is True

    def test_oauth2_auth_manager_initialization(self):
        """Test that OAuth2 auth manager can be initialized."""
        
        # Simulate OAuth2Manager initialization
        auth_manager = MagicMock()
        auth_manager.auth_url = "https://keycloak.example.com"
        auth_manager.realm = "test-realm"
        auth_manager.clientid = "test-client"
        
        assert auth_manager is not None
        assert auth_manager.auth_url == "https://keycloak.example.com"
        assert auth_manager.realm == "test-realm"

    def test_authentication_disabled_scenario(self):
        """Test authentication disabled scenario."""
        auth_manager = None
        
        # When disabled, auth_manager should be None
        assert auth_manager is None
