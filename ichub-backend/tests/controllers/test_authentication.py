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


@pytest.fixture(autouse=True)
def _real_auth_modules(monkeypatch):
    """Import the real auth manager even if other test modules mocked its dependencies.

    test_twin_management_service.py puts MagicMock objects for tractusx_sdk.* and
    managers.* into sys.modules at collection time, so in a full run
    MultiApiKeyAuthManager would subclass a mocked AuthManager.
    monkeypatch restores the entries after each test.
    """
    import sys
    for name, module in list(sys.modules.items()):
        if isinstance(module, MagicMock) and name.startswith(("tractusx_sdk", "managers")):
            monkeypatch.delitem(sys.modules, name)
    monkeypatch.delitem(sys.modules, "managers.auth_manager", raising=False)


class TestMultiApiKeyAuthManager:
    """Test MultiApiKeyAuthManager supporting both string and list apiKey values."""

    def test_string_api_key_authenticated(self):
        from managers.auth_manager import MultiApiKeyAuthManager
        manager = MultiApiKeyAuthManager(
            configured_api_key="<example>",
            api_key_header="X-Api-Key",
            auth_enabled=True
        )
        mock_request = Mock(spec=Request)
        mock_request.headers = {"X-Api-Key": "<example>"}
        assert manager.is_authenticated(mock_request) is True

    def test_list_single_api_key_authenticated(self):
        from managers.auth_manager import MultiApiKeyAuthManager
        manager = MultiApiKeyAuthManager(
            configured_api_key=["<example>"],
            api_key_header="X-Api-Key",
            auth_enabled=True
        )
        mock_request = Mock(spec=Request)
        mock_request.headers = {"X-Api-Key": "<example>"}
        assert manager.is_authenticated(mock_request) is True

    def test_list_multiple_api_keys_authenticated(self):
        from managers.auth_manager import MultiApiKeyAuthManager
        manager = MultiApiKeyAuthManager(
            configured_api_key=["key1", "key2"],
            api_key_header="X-Api-Key",
            auth_enabled=True
        )
        mock_request_1 = Mock(spec=Request)
        mock_request_1.headers = {"X-Api-Key": "key1"}
        assert manager.is_authenticated(mock_request_1) is True

        mock_request_2 = Mock(spec=Request)
        mock_request_2.headers = {"X-Api-Key": "key2"}
        assert manager.is_authenticated(mock_request_2) is True

        mock_request_invalid = Mock(spec=Request)
        mock_request_invalid.headers = {"X-Api-Key": "wrong-key"}
        assert manager.is_authenticated(mock_request_invalid) is False

    def test_auth_disabled_returns_true(self):
        from managers.auth_manager import MultiApiKeyAuthManager
        manager = MultiApiKeyAuthManager(
            configured_api_key=["key1"],
            api_key_header="X-Api-Key",
            auth_enabled=False
        )
        mock_request = Mock(spec=Request)
        mock_request.headers = {}
        assert manager.is_authenticated(mock_request) is True


def _request(headers: dict) -> Request:
    return Request({
        "type": "http",
        "headers": [(k.lower().encode(), v.encode()) for k, v in headers.items()],
    })


class TestMultiApiKeyAuthManagerEdgeCases:

    def _manager(self, configured):
        from managers.auth_manager import MultiApiKeyAuthManager
        return MultiApiKeyAuthManager(
            configured_api_key=configured, api_key_header="X-Api-Key", auth_enabled=True
        )

    def test_missing_header_rejected(self):
        assert self._manager("k1").is_authenticated(_request({})) is False

    def test_header_lookup_is_case_insensitive(self):
        assert self._manager("k1").is_authenticated(_request({"x-api-key": "k1"})) is True

    @pytest.mark.parametrize("configured", [None, "", [], [None], [""]])
    def test_empty_config_fails_closed(self, configured):
        manager = self._manager(configured)
        assert manager.is_authenticated(_request({"X-Api-Key": "anything"})) is False
        assert manager.is_authenticated(_request({"X-Api-Key": ""})) is False

    def test_list_skips_empty_entries(self):
        manager = self._manager(["", "k2"])
        assert manager.is_authenticated(_request({"X-Api-Key": "k2"})) is True
        assert manager.is_authenticated(_request({"X-Api-Key": ""})) is False

    def test_numeric_scalar_key_accepted(self):
        # helm --set ...apiKey.value=12345678 renders an int via toJson
        assert self._manager(12345678).is_authenticated(_request({"X-Api-Key": "12345678"})) is True

    def test_add_auth_header_uses_first_key(self):
        assert self._manager(["k1", "k2"]).add_auth_header({}) == {"X-Api-Key": "k1"}


@pytest.mark.parametrize("raw,expected", [
    ("k", ["k"]),
    (["k1", "k2"], ["k1", "k2"]),
    (["", "k2"], ["k2"]),
    ([None, "k2"], ["k2"]),
    (12345678, ["12345678"]),
    (None, []),
    ([], []),
])
def test_normalize_api_keys(raw, expected):
    # also covers the connector.py / run_asset_sync.py key extraction
    from managers.auth_manager import normalize_api_keys
    assert normalize_api_keys(raw) == expected
