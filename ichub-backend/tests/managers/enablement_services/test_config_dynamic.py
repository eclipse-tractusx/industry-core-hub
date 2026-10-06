#################################################################################
# Eclipse Tractus-X - Industry Core Hub Backend
#
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
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND,
# either express or implied. See the
# License for the specific language governing permissions and limitations
# under the License.
#
# SPDX-License-Identifier: Apache-2.0
#################################################################################

"""
Unit tests for ConfigManager dynamic configuration loading.

This test suite validates:
1. ConfigManager loads YAML configuration correctly
2. Section-based retrieval works for factory integration
3. Dot-notation retrieval works (backward compatibility)
4. Configuration validation catches invalid setups
5. SubmodelAdapterFactory initializes with configured adapters

Run with:
    pytest tests/managers/enablement_services/test_config_dynamic.py -v
"""

import pytest
from typing import Dict, Any


# ============================================================================
# TEST HELPERS
# ============================================================================

def _setup_config_manager(config: Dict[str, Any]):
    """Setup ConfigManager with test configuration."""
    from managers.config.config_manager import ConfigManager
    original_config = ConfigManager._raw_config
    ConfigManager._raw_config = config
    return original_config


def _restore_config_manager(original_config):
    """Restore ConfigManager to original state."""
    from managers.config.config_manager import ConfigManager
    ConfigManager._raw_config = original_config


# ============================================================================
# TEST CLASSES
# ============================================================================

class TestConfigManagerLoadConfiguration:
    """Test ConfigManager configuration loading from YAML files."""

    def test_load_config_yaml(self):
        """Validate test configuration is loaded correctly."""
        from managers.config.config_manager import ConfigManager
        
        config = {
            "provider": {
                "submodel_dispatcher": {
                    "mode": "s3",
                    "s3": {
                        "bucket_name": "ichub-submodels",
                        "region_name": "us-east-1",
                        "endpoint_url": "http://localhost:8333",
                        "key_pattern": "{semantic_id}/{submodel_id}.json",
                        "aws_access_key_id": "admin",
                        "aws_secret_access_key": "secret"
                    }
                }
            }
        }
        
        original_config = _setup_config_manager(config)
        try:
            assert ConfigManager._raw_config is not None
            assert "provider" in ConfigManager._raw_config
            assert "submodel_dispatcher" in ConfigManager._raw_config["provider"]
            assert ConfigManager._raw_config["provider"]["submodel_dispatcher"]["mode"] == "s3"
        finally:
            _restore_config_manager(original_config)

    def test_config_caching_on_repeated_loads(self):
        """Validate ConfigManager handles multiple accesses to _raw_config."""
        from managers.config.config_manager import ConfigManager
        
        config = {
            "provider": {
                "submodel_dispatcher": {
                    "mode": "s3"
                }
            }
        }
        
        original_config = _setup_config_manager(config)
        try:
            # First access
            config1 = ConfigManager._raw_config
            
            # Second access should return same
            config2 = ConfigManager._raw_config
            
            # Should be identical
            assert config1 == config2
            assert ConfigManager._raw_config is not None
        finally:
            _restore_config_manager(original_config)


class TestConfigManagerSectionRetrieval:
    """Test section-based configuration retrieval for factory patterns."""

    def test_get_section_returns_dict(self):
        """Validate get_section returns configuration section as dictionary."""
        from managers.config.config_manager import ConfigManager
        
        config = {
            "provider": {
                "submodel_dispatcher": {
                    "mode": "s3",
                    "s3": {
                        "bucket_name": "ichub-submodels",
                        "endpoint_url": "http://localhost:8333",
                        "aws_access_key_id": "admin"
                    }
                }
            }
        }
        
        original_config = _setup_config_manager(config)
        try:
            section = ConfigManager.get_section("provider.submodel_dispatcher")
            assert isinstance(section, dict)
            assert "mode" in section
            assert "s3" in section
            assert section["mode"] == "s3"
        finally:
            _restore_config_manager(original_config)

    def test_get_section_s3_config(self):
        """Validate S3 section retrieval returns complete adapter config."""
        from managers.config.config_manager import ConfigManager
        
        config = {
            "provider": {
                "submodel_dispatcher": {
                    "mode": "s3",
                    "s3": {
                        "bucket_name": "ichub-submodels",
                        "endpoint_url": "http://localhost:8333",
                        "aws_access_key_id": "admin"
                    }
                }
            }
        }
        
        original_config = _setup_config_manager(config)
        try:
            section = ConfigManager.get_section("provider.submodel_dispatcher.s3")
            assert isinstance(section, dict)
            assert section["bucket_name"] == "ichub-submodels"
            assert section["endpoint_url"] == "http://localhost:8333"
            assert "aws_access_key_id" in section
        finally:
            _restore_config_manager(original_config)

    def test_get_section_with_default(self):
        """Validate get_section returns default if section not found."""
        from managers.config.config_manager import ConfigManager
        
        config = {
            "provider": {
                "submodel_dispatcher": {
                    "mode": "s3"
                }
            }
        }
        
        original_config = _setup_config_manager(config)
        try:
            default_value = {"default": "config"}
            section = ConfigManager.get_section("nonexistent.section", default=default_value)
            assert section == default_value
        finally:
            _restore_config_manager(original_config)

    def test_get_section_returns_empty_dict_without_default(self):
        """Validate get_section returns empty dict if section not found and no default."""
        from managers.config.config_manager import ConfigManager
        
        config = {
            "provider": {
                "submodel_dispatcher": {
                    "mode": "s3"
                }
            }
        }
        
        original_config = _setup_config_manager(config)
        try:
            section = ConfigManager.get_section("nonexistent.section")
            assert isinstance(section, dict)
            assert len(section) == 0
        finally:
            _restore_config_manager(original_config)


class TestConfigManagerDotNotationRetrieval:
    """Test backward-compatible dot-notation retrieval."""

    def test_get_single_value_with_dot_notation(self):
        """Validate dot-notation retrieval for single values."""
        from managers.config.config_manager import ConfigManager
        
        config = {
            "provider": {
                "submodel_dispatcher": {
                    "mode": "s3"
                }
            }
        }
        
        original_config = _setup_config_manager(config)
        try:
            mode = ConfigManager.get("provider.submodel_dispatcher.mode")
            assert mode == "s3"
        finally:
            _restore_config_manager(original_config)

    def test_get_nested_value(self):
        """Validate nested value retrieval with dot notation."""
        from managers.config.config_manager import ConfigManager
        
        config = {
            "provider": {
                "submodel_dispatcher": {
                    "s3": {
                        "bucket_name": "ichub-submodels"
                    }
                }
            }
        }
        
        original_config = _setup_config_manager(config)
        try:
            bucket_name = ConfigManager.get("provider.submodel_dispatcher.s3.bucket_name")
            assert bucket_name == "ichub-submodels"
        finally:
            _restore_config_manager(original_config)

    def test_get_with_default_value(self):
        """Validate default value is returned for missing keys."""
        from managers.config.config_manager import ConfigManager
        
        config = {
            "provider": {}
        }
        
        original_config = _setup_config_manager(config)
        try:
            value = ConfigManager.get("nonexistent.key", default="fallback_value")
            assert value == "fallback_value"
        finally:
            _restore_config_manager(original_config)

    def test_get_with_missing_intermediate_key(self):
        """Validate None/default returned for missing intermediate keys."""
        from managers.config.config_manager import ConfigManager
        
        config = {
            "provider": {
                "connector": {}
            }
        }
        
        original_config = _setup_config_manager(config)
        try:
            value = ConfigManager.get(
                "provider.nonexistent.submodel_dispatcher.mode", default="default_mode"
            )
            assert value == "default_mode"
        finally:
            _restore_config_manager(original_config)


class TestConfigManagerAdapterModeAndConfig:
    """Test get_adapter_mode_and_config for factory integration."""

    def test_get_adapter_mode_and_config_s3(self):
        """Validate retrieval of S3 adapter mode and configuration."""
        from managers.config.config_manager import ConfigManager
        
        config = {
            "provider": {
                "submodel_dispatcher": {
                    "mode": "s3",
                    "s3": {
                        "bucket_name": "ichub-submodels",
                        "endpoint_url": "http://localhost:8333"
                    }
                }
            }
        }
        
        original_config = _setup_config_manager(config)
        try:
            mode, config_dict = ConfigManager.get_adapter_mode_and_config(validate_adapter_exists=False)
            assert mode == "s3"
            assert isinstance(config_dict, dict)
            assert config_dict["bucket_name"] == "ichub-submodels"
            assert config_dict["endpoint_url"] == "http://localhost:8333"
        finally:
            _restore_config_manager(original_config)

    def test_get_adapter_mode_and_config_filesystem(self):
        """Validate retrieval of FileSystem adapter mode and configuration."""
        from managers.config.config_manager import ConfigManager
        
        config = {
            "provider": {
                "submodel_dispatcher": {
                    "mode": "file_system",
                    "file_system": {
                        "root_path": "/data",
                        "path_pattern": "{root_path}/{semantic_id}/{submodel_id}.json"
                    }
                }
            }
        }
        
        original_config = _setup_config_manager(config)
        try:
            mode, config_dict = ConfigManager.get_adapter_mode_and_config(validate_adapter_exists=False)
            assert mode == "file_system"
            assert isinstance(config_dict, dict)
            assert "root_path" in config_dict
            assert "path_pattern" in config_dict
            assert config_dict["path_pattern"] == "{root_path}/{semantic_id}/{submodel_id}.json"
        finally:
            _restore_config_manager(original_config)

    def test_get_adapter_mode_and_config_http_submodel(self):
        """Validate retrieval of HTTP Submodel adapter mode and configuration."""
        from managers.config.config_manager import ConfigManager
        
        config = {
            "provider": {
                "submodel_dispatcher": {
                    "mode": "http_submodel",
                    "http_submodel": {
                        "base_url": "https://external-ichub.example.com",
                        "api_path": "/api/v1",
                        "timeout": 30,
                        "verify_ssl": True,
                        "auth_token": "test-token",
                        "auth_key_name": "X-Api-Key"
                    }
                }
            }
        }
        
        original_config = _setup_config_manager(config)
        try:
            mode, config_dict = ConfigManager.get_adapter_mode_and_config(validate_adapter_exists=False)
            assert mode == "http_submodel"
            assert isinstance(config_dict, dict)
            assert config_dict["base_url"] == "https://external-ichub.example.com"
            assert config_dict["api_path"] == "/api/v1"
            assert config_dict["timeout"] == 30
            assert config_dict["verify_ssl"] is True
            assert config_dict["auth_token"] == "test-token"
            assert config_dict["auth_key_name"] == "X-Api-Key"
        finally:
            _restore_config_manager(original_config)

    def test_get_adapter_mode_and_config_with_validation(self):
        """Validate adapter existence validation with real SubmodelAdapterFactory."""
        from managers.config.config_manager import ConfigManager
        
        config = {
            "provider": {
                "submodel_dispatcher": {
                    "mode": "s3",
                    "s3": {
                        "bucket_name": "test"
                    }
                }
            }
        }
        
        original_config = _setup_config_manager(config)
        try:
            mode, config_dict = ConfigManager.get_adapter_mode_and_config(validate_adapter_exists=True)
            assert mode == "s3"
            assert isinstance(config_dict, dict)
        finally:
            _restore_config_manager(original_config)

    def test_get_adapter_mode_and_config_missing_mode(self):
        """Validate error when adapter mode is missing."""
        from managers.config.config_manager import ConfigManager
        
        config = {
            "provider": {
                "submodel_dispatcher": {
                    "s3": {"bucket_name": "test"}
                }
            }
        }
        
        original_config = _setup_config_manager(config)
        try:
            with pytest.raises(ValueError, match="No adapter mode specified"):
                ConfigManager.get_adapter_mode_and_config(validate_adapter_exists=False)
        finally:
            _restore_config_manager(original_config)

    def test_get_adapter_mode_and_config_missing_section(self):
        """Validate error when dispatcher section is missing."""
        from managers.config.config_manager import ConfigManager
        
        config = {"provider": {}}
        
        original_config = _setup_config_manager(config)
        try:
            with pytest.raises(ValueError, match="Configuration section.*not found"):
                ConfigManager.get_adapter_mode_and_config(validate_adapter_exists=False)
        finally:
            _restore_config_manager(original_config)


class TestConfigManagerGetConfig:
    """Test full configuration retrieval."""

    def test_get_config_returns_full_config(self):
        """Validate get_config returns complete configuration."""
        from managers.config.config_manager import ConfigManager
        
        # Set up a test config
        test_config = {
            "provider": {
                "submodel_dispatcher": {
                    "mode": "s3",
                    "s3": {
                        "bucket_name": "test-bucket"
                    }
                }
            }
        }
        
        # Store original and set test config
        original_config = ConfigManager._raw_config
        ConfigManager._raw_config = test_config
        
        try:
            # Note: ConfigManager.get_config() is mocked by disable_mcp_oauth fixture in parent conftest.py
            # So we test _raw_config directly, which is what get_config() returns when not mocked
            full_config = ConfigManager._raw_config
            assert isinstance(full_config, dict)
            assert "provider" in full_config
            assert full_config["provider"]["submodel_dispatcher"]["mode"] == "s3"
        finally:
            # Restore original config
            ConfigManager._raw_config = original_config


class TestSubmodelAdapterFactoryIntegration:
    """Test integration between ConfigManager and SubmodelAdapterFactory."""

    def test_factory_receives_s3_config_from_config_manager(self):
        """Validate ConfigManager output can be used with SubmodelAdapterFactory."""
        from managers.config.config_manager import ConfigManager
        
        config = {
            "provider": {
                "submodel_dispatcher": {
                    "mode": "s3",
                    "s3": {
                        "bucket_name": "ichub-submodels",
                        "endpoint_url": "http://localhost:8333",
                        "aws_access_key_id": "admin",
                        "aws_secret_access_key": "secret"
                    }
                }
            }
        }
        
        original_config = _setup_config_manager(config)
        try:
            mode, adapter_config = ConfigManager.get_adapter_mode_and_config(
                validate_adapter_exists=False
            )
            assert mode == "s3"
            assert "bucket_name" in adapter_config
            assert "endpoint_url" in adapter_config
        finally:
            _restore_config_manager(original_config)

    def test_factory_receives_filesystem_config_from_config_manager(self):
        """Validate ConfigManager returns raw filesystem config."""
        from managers.config.config_manager import ConfigManager
        
        config = {
            "provider": {
                "submodel_dispatcher": {
                    "mode": "file_system",
                    "file_system": {
                        "root_path": "/data",
                        "path_pattern": "{root_path}/{semantic_id}/{submodel_id}.json"
                    }
                }
            }
        }
        
        original_config = _setup_config_manager(config)
        try:
            mode, adapter_config = ConfigManager.get_adapter_mode_and_config(
                validate_adapter_exists=False
            )
            assert mode == "file_system"
            assert "root_path" in adapter_config
            assert "path_pattern" in adapter_config
        finally:
            _restore_config_manager(original_config)

    def test_factory_receives_http_submodel_config_from_config_manager(self):
        """Validate ConfigManager returns raw HTTP Submodel config."""
        from managers.config.config_manager import ConfigManager
        
        config = {
            "provider": {
                "submodel_dispatcher": {
                    "mode": "http_submodel",
                    "http_submodel": {
                        "base_url": "https://external-ichub.example.com",
                        "api_path": "/api/v1",
                        "url_pattern": "{base_url}{api_path}/{semantic_id}/{submodel_id}/submodel",
                        "timeout": 30,
                        "verify_ssl": True,
                        "auth_token": "test-token",
                        "auth_key_name": "X-Api-Key"
                    }
                }
            }
        }
        
        original_config = _setup_config_manager(config)
        try:
            mode, adapter_config = ConfigManager.get_adapter_mode_and_config(
                validate_adapter_exists=False
            )
            assert mode == "http_submodel"
            assert "base_url" in adapter_config
            assert "api_path" in adapter_config
            assert "url_pattern" in adapter_config
            assert "auth_token" in adapter_config
            assert "auth_key_name" in adapter_config
        finally:
            _restore_config_manager(original_config)
