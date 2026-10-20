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

from typing import Any, Dict

import pytest
import sys
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock
import yaml


def _load_config_early():
    """Load configuration early in pytest_configure (before test collection).
    
    This prevents RuntimeError in module-level code that accesses ConfigManager
    during import (e.g., server.py, session.py).
    """
    from managers.config.config_manager import ConfigManager
    
    test_dir = Path(__file__).parent
    config_path = test_dir / "config" / "configuration.yml"
    
    print(f"[DEBUG] test_dir: {test_dir}")
    print(f"[DEBUG] config_path: {config_path}")
    print(f"[DEBUG] config_path.exists(): {config_path.exists()}")
    
    if config_path.exists():
        try:
            # Always load config fresh - don't skip based on _raw_config state
            # because ConfigManager.load_config() checks if _raw_config is not None and returns early
            result = ConfigManager.load_config(str(config_path))
            print(f"[DEBUG] load_config returned dict with {len(result) if result else 0} keys")
            if result:
                print(f"[OK] Test configuration loaded from {config_path}: {list(result.keys())[:3]}...")
            else:
                print(f"[WARN] Configuration file loaded but appears empty!")
        except Exception as e:
            print(f"[ERROR] Failed to load test configuration: {e}")
            import traceback
            traceback.print_exc()
    else:
        print(f"[WARN] Test configuration file not found at {config_path}")
        print("  Using empty configuration - unit tests will operate with minimal config")



def pytest_configure(config):
    """Configure pytest before test collection - only mock database, NOT SDK by default.

    This allows integration tests to use real SDK while unit tests can opt-in to mocking.
    
    CRITICAL: Load ConfigManager BEFORE ANY imports to prevent module-level
    ConfigManager access errors in server.py and session.py during import.
    """

    # FIRST: Load ConfigManager config EARLY before any module imports
    # This prevents "Configuration must be loaded" errors during test collection
    from managers.config.config_manager import ConfigManager
    
    # Load config immediately - don't pre-initialize _raw_config as {} because it prevents load_config from actually loading the YAML
    _load_config_early()

    # ONLY mock the database engine (always safe to mock)
    # Do NOT mock tractusx_sdk - let it be imported normally

    # Mock the database engine and connection
    mock_engine = MagicMock()
    mock_connection = MagicMock()
    mock_engine.connect.return_value.__enter__.return_value = mock_connection
    mock_engine.connect.return_value.__exit__.return_value = None

    # Patch database module
    sys.modules["database"] = MagicMock()
    sys.modules["database"].engine = mock_engine
    sys.modules["database"].get_session = MagicMock(return_value=MagicMock())


@pytest.fixture(scope="session", autouse=True)
def disable_mcp_oauth():
    """Disable MCP OAuth support during tests as Keycloak is not available."""
    from managers.addons_service.mcp_addon.v1.auth import ConfigManager as AuthConfigManager
    
    # Store the original method
    original_get_config = AuthConfigManager.get_config
    
    # Create wrapper that mocks only the specific key we care about
    def mock_get_config(key=None, default=None):
        if key == "addons.mcp_addon.oauth_enabled":
            return False
        # For all other keys, call the original method
        return original_get_config(key, default)
    
    # Patch the method in the auth module
    with patch.object(AuthConfigManager, 'get_config', side_effect=mock_get_config):
        yield


@pytest.fixture(scope="session")
def config_path() -> Path:
    """
    Provide path test configuration file.

    Returns:
        Path object pointing to configuration.yml
    """
    test_dir = Path(__file__).parent
    config_path = test_dir / "config" / "configuration.yml"
    if not config_path.exists():
        pytest.skip(f"Config file not found at {config_path}")
    return config_path


@pytest.fixture(scope="session")
def test_config(config_path: Path) -> Dict[str, Any]:
    """
    Load test configuration from YAML file.

    Yields:
        Dictionary containing test configuration
    """
    with open(config_path, "r") as f:
        config = yaml.safe_load(f)
    return config


@pytest.fixture(scope="session", autouse=True)
def ensure_config_loaded():
    """
    Autouse fixture to ensure ConfigManager is loaded for ALL tests.
    
    This runs automatically for every test session, regardless of whether
    individual tests request it. This prevents "Configuration must be loaded"
    errors when running all tests with `pytest tests/`.
    
    Note: Configuration should already be loaded by pytest_configure(),
    but this fixture acts as a safety net to catch any edge cases.
    """
    from managers.config.config_manager import ConfigManager
    
    # If _raw_config is None (should never happen, but safety check)
    if not hasattr(ConfigManager, '_raw_config') or ConfigManager._raw_config is None:
        print("[WARN] ConfigManager._raw_config was None during test session - initializing with empty dict")
        ConfigManager._raw_config = {}
        _load_config_early()
    
    # Verify config is accessible
    try:
        cfg = ConfigManager.get_config()
        print(f"[OK] ConfigManager verified: config is loaded with {len(cfg)} root keys")
    except Exception as e:
        print(f"[ERROR] ConfigManager error: {e}")
        raise
    
    yield
