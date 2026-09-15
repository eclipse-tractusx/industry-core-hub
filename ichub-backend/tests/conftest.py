#################################################################################
# Eclipse Tractus-X - Industry Core Hub Backend
#
# Copyright (c) 2026 LKS Next
# Copyright (c) 2026 Contributors to the Eclipse Foundation
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

import pytest
import sys
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock


def pytest_configure(config):
    """Configure pytest before test collection - only mock database, NOT SDK by default.
    
    This allows integration tests to use real SDK while unit tests can opt-in to mocking.
    """
    
    # ONLY mock the database engine (always safe to mock)
    # Do NOT mock tractusx_sdk - let it be imported normally
    
    # Mock the database engine and connection
    mock_engine = MagicMock()
    mock_connection = MagicMock()
    mock_engine.connect.return_value.__enter__.return_value = mock_connection
    mock_engine.connect.return_value.__exit__.return_value = None

    # Patch database module
    sys.modules['database'] = MagicMock()
    sys.modules['database'].engine = mock_engine
    sys.modules['database'].get_session = MagicMock(return_value=MagicMock())



@pytest.fixture(scope="session", autouse=True)
def disable_mcp_oauth():
    """Disable MCP OAuth support during tests as Keycloak is not available."""
    with patch(
            "managers.addons_service.mcp_addon.v1.auth.ConfigManager.get_config",
            side_effect=lambda key=None, default=None: (
                    False if key == "addons.mcp_addon.oauth_enabled" else default
            ),
    ):
        yield
