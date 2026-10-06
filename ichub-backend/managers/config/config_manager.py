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
# distributed under the License is distributed on an "AS IS" BASIS
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND,
# either express or implied. See the
# License for the specific language govern in permissions and limitations
# under the License.
#
# SPDX-License-Identifier: Apache-2.0
#################################################################################

from managers.config.log_manager import LoggingManager


import os
import yaml
from typing import Any, Dict
from tractusx_sdk.industry.adapters.submodel_adapter_factory import SubmodelAdapterFactory

logger = LoggingManager.get_logger(__name__)


class ConfigManager:
    """
    Dynamic configuration manager for loading, retrieving, and managing application settings.
    
    This manager loads YAML configuration files and provides flexible access to settings
    for all application components (database, authorization, adapters, connectors, etc.).
    
    Features:
    - Loads configuration from YAML files at startup (e.g., config/configuration.yml)
    - Supports dot-notation for nested key access (backward compatible with old patterns)
    - Section-based retrieval for factory-pattern usage (new, flexible approach)
    - Optional Pydantic schema validation for type safety
    - Full logging for debugging and auditability
    
    Configuration Structure (from configuration.yml):
        hostname: "http://localhost:9000"
        
        authorization:
          enabled: true
          keycloak:
            auth_url: "http://localhost:8080"
        
        database:
          connection_string: "postgresql://user:password@localhost:5432/ichub"
        
        cors:
          enabled: true
          allow_origins:
            - "http://localhost:5173"
        
        provider:
          connector:
            controlplane:
              hostname: "https://<edc-provider-control-hostname>"
          submodel_dispatcher:
            mode: "file_system"
            file_system:
              path: "industry-core-hub/data/submodels"
              path_pattern: "{base_path}/{semantic_id}/{submodel_id}.json"
            http_submodel:
              base_url: "https://external-ichub.example.com"
            s3:
              bucket_name: "<BUCKET_NAME>"
    
    Usage Examples:
        # Load configuration at startup
        ConfigManager.load_config()
        
        # Get entire configuration dictionary
        full_config = ConfigManager.get_config()
        
        # Get individual value with dot notation
        hostname = ConfigManager.get("provider.connector.controlplane.hostname")
        
        # Get entire section (e.g., for factory usage)
        dispatcher_config = ConfigManager.get_section("provider.submodel_dispatcher")
        
        # Get adapter mode and config together for factory
        mode, adapter_config = ConfigManager.get_adapter_mode_and_config()
        adapter = SubmodelAdapterFactory.from_config(mode, adapter_config)
    """
    
    _raw_config: Dict[str, Any] | None = None

    @classmethod
    def load_config(cls, config_path: str | None = None) -> Dict[str, Any]:
        """
        Load the configuration from a YAML file. Should be called once at startup.
        
        This method is intended to run once during application startup. Subsequent calls
        return the cached configuration without reloading.
        
        Args:
            config_path: Path to YAML configuration file. Defaults to ./config/configuration.yml
        
        Returns:
            Loaded configuration as dictionary. Empty dictionary if file not found or
            YAML parsing fails.
        
        Note:
            - Repeated calls return the cached configuration
            - File not found or YAML parse errors do not raise exceptions, but log warnings
            - Other configuration methods require this method to have completed first
        """
        if cls._raw_config is not None:
            return cls._raw_config

        if config_path is None:
            config_path = os.path.join(os.getcwd(), "config", "configuration.yml")

        try:
            with open(config_path, "r", encoding="utf-8") as config_file:
                loaded_config = yaml.safe_load(config_file) or {}
                if not isinstance(loaded_config, dict):
                    raise ValueError("The root configuration value must be a mapping")
                cls._raw_config = loaded_config
                logger.info(f"Configuration loaded successfully from {config_path}")
        except FileNotFoundError as e:
            logger.warning(f"Configuration file not found at '{config_path}': {e}")
            cls._raw_config = {}
        except (OSError, ValueError, yaml.YAMLError) as e:
            logger.error(f"Failed to load config from '{config_path}': {e}")
            cls._raw_config = {}

        return cls._raw_config

    @classmethod
    def get_section(
        cls,
        section_path: str,
        default: Dict[str, Any] | None = None
    ) -> Dict[str, Any]:
        """
        Get a configuration section as a dictionary.
        
        Retrieves entire configuration sections that can be passed directly to
        factory methods or used for batch operations.
        
        Args:
            section_path: Dot-notation path (e.g., 'provider.submodel_dispatcher')
            default: Default dictionary if section not found
        
        Returns:
            Configuration section as a dictionary
        
        Example:
            # Get dispatcher section
            dispatcher_config = ConfigManager.get_section("provider.submodel_dispatcher")
        """
        if cls._raw_config is None:
            raise RuntimeError(
                "Configuration must be loaded with ConfigManager.load_config() before access"
            )

        config_data = cls._navigate_config(section_path)
        if config_data is None:
            config_data = {} if default is None else default
            logger.debug(f"Config section '{section_path}' not found, using default")

        return config_data

    @classmethod
    def _navigate_config(cls, section_path: str) -> Dict[str, Any] | None:
        """
        Navigate nested configuration using dot notation to retrieve a configuration section.
        
        Internal method used by get_section() to traverse nested dictionaries. Returns the
        configuration value only if it is a dictionary (section), otherwise returns None.
        
        Configuration structure example:
            provider:                          # access via "provider"
              submodel_dispatcher:             # access via "provider.submodel_dispatcher"
                mode: "file_system"
                file_system:                   # access via "provider.submodel_dispatcher.file_system"
                  path: "..."
        
        Args:
            section_path: Dot-notation path (e.g., 'provider.submodel_dispatcher')
        
        Returns:
            Configuration section as a dictionary, or None if section not found or
            final value is not a dictionary.
        """
        keys = section_path.split(".")
        value: Any = cls._raw_config
        
        for key in keys:
            if not isinstance(value, dict) or key not in value:
                logger.debug(f"Configuration path '{section_path}' not found at key '{key}'")
                return None
            value = value[key]
        
        # Return as dict if it is one, otherwise return None
        if isinstance(value, dict):
            return value
        
        logger.debug(
            f"Configuration path '{section_path}' exists but is not a section (dictionary), "
            f"it's a {type(value).__name__}. Use get() for scalar values."
        )
        return None

    @classmethod
    def get(
        cls,
        key: str,
        default: Any = None
    ) -> Any:
        """
        Get a configuration value using dot notation (backward compatible approach).
        
        Access individual configuration values using dot-notation for nested keys.
        For factory usage, prefer get_section() for retrieving entire sections.
        
        Args:
            key: Dot-notation path (e.g., 'provider.submodel_dispatcher.mode')
            default: Default value if not found
        
        Returns:
            Configuration value
        
        Example:
            mode = ConfigManager.get("provider.submodel_dispatcher.mode", default="file_system")
        """
        if cls._raw_config is None:
            raise RuntimeError(
                "Configuration must be loaded with ConfigManager.load_config() before access"
            )

        keys = key.split(".")
        value: Any = cls._raw_config

        for config_key in keys:
            if not isinstance(value, dict) or config_key not in value:
                return default
            value = value[config_key]

        return value

    @classmethod
    def get_config(cls, key: str | None = None, default: Any = None) -> Any:
        """
        Get the entire configuration or a value using dot notation.

        The keyed form is retained for compatibility with existing backend callers.
        
        Returns:
            Complete configuration, or the requested value
        """
        if key is not None:
            return cls.get(key, default)

        if cls._raw_config is None:
            raise RuntimeError(
                "Configuration must be loaded with ConfigManager.load_config() before access"
            )
        return cls._raw_config


    @classmethod
    def get_available_adapters(cls) -> list[str]:
        """
        Get list of all available adapter types from SubmodelAdapterFactory.
        
        Combines built-in adapters (FileSystem, S3, HttpSubmodel) and any
        externally registered adapters at runtime via SubmodelServiceManager.
        
        Returns:
            Sorted list of available adapter type keys (lowercase with underscores)
        
        Example:
            available = ConfigManager.get_available_adapters()
            # Returns: ['file_system', 'http_submodel', 's3', ...]
        """
        adapters = sorted(SubmodelAdapterFactory.get_available_adapter_types())
        logger.debug(f"Available adapter types: {adapters}")
        return adapters



    @classmethod
    def get_adapter_mode_and_config(
        cls,
        dispatcher_path: str = "provider.submodel_dispatcher",
        validate_adapter_exists: bool = True
    ) -> tuple[str, Dict[str, Any]]:
        """
        Get adapter mode and raw configuration from YAML in a single call.
        
        This method retrieves both the adapter mode and its complete raw YAML
        configuration without loading the dispatcher config twice. The raw
        configuration is transformed by AdapterConfigurationInterface before it
        is passed to SubmodelAdapterFactory.from_config().
        
        Configuration structure (from YAML):
            provider:
              submodel_dispatcher:
                mode: "file_system"              # <- Adapter type
                file_system:                     # <- Raw adapter-specific config
                  root_path: "..."                 # <- FileSystem builder key
                  path_pattern: "..."
                http_submodel:
                  base_url: "..."
                                    auth_token: "..."              # <- HTTP builder key
                s3:
                  bucket_name: "..."
                                    aws_access_key_id: "..."       # <- S3 builder key
        
        Args:
            dispatcher_path: Dot-notation path to dispatcher config section
            validate_adapter_exists: Whether to validate adapter is available in factory (default: True)
        
        Returns:
            Tuple of (adapter_mode, raw_adapter_config_dict)
            Note: adapter_config is raw from YAML; the service transformation layer
            maps it to the factory builder API.
        
        Raises:
            ValueError: If dispatcher config not found, mode invalid, or adapter not supported
        
        Example:
            mode, config = ConfigManager.get_adapter_mode_and_config()
            # config is raw from YAML - the service manager maps it before the factory call
            adapter = SubmodelAdapterFactory.from_config(mode, config)
        """
        # Get dispatcher configuration once
        dispatcher_config = cls.get_section(dispatcher_path)
        if not dispatcher_config:
            raise ValueError(
                f"Configuration section '{dispatcher_path}' not found. "
                f"Please provide required configuration in YAML at: {dispatcher_path}"
            )
        
        # Extract adapter mode
        adapter_mode = dispatcher_config.get("mode")
        if not adapter_mode:
            raise ValueError(
                f"No adapter mode specified in '{dispatcher_path}.mode'. "
                f"Please specify a 'mode' field in your configuration."
            )

        if not isinstance(adapter_mode, str):
            raise ValueError(
                f"Adapter mode must be a string, got {type(adapter_mode).__name__}."
            )
        
        # Normalize mode to lowercase with underscores (e.g., "FileSystem" -> "file_system")
        normalized_mode = adapter_mode.strip().lower().replace(" ", "_").replace("-", "_")
        
        # Validate adapter exists in factory if requested
        if validate_adapter_exists:
            available = cls.get_available_adapters()
            if normalized_mode not in available:
                raise ValueError(
                    f"Adapter type '{adapter_mode}' is not available. "
                    f"Supported adapters: {', '.join(sorted(available))}"
                )
        
        # Get the selected adapter section using the normalized mode as its key.
        # The section is passed through to the factory without backend mappings.
        adapter_config = dispatcher_config.get(normalized_mode)
        if not isinstance(adapter_config, dict):
            raise ValueError(
                f"Missing or invalid configuration for adapter '{normalized_mode}'. "
                f"Expected configuration under '{dispatcher_path}.{normalized_mode}' as a dictionary."
            )
        
        logger.debug(
            f"Retrieved adapter mode '{normalized_mode}' and its configuration keys from YAML."
        )
        return normalized_mode, adapter_config
