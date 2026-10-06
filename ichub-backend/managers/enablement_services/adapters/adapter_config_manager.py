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

from typing import Dict, Any
from managers.config.config_manager import ConfigManager
from tractusx_sdk.industry.adapters.submodel_adapter_factory import SubmodelAdapterFactory


class SubmodelAdapterProvider:
    """Create the configured submodel adapter without exposing YAML details to services."""

    @staticmethod
    def create_adapter(
        dispatcher_path: str = "provider.submodel_dispatcher",
        adapter_type: str | None = None,
        adapter_config: Dict[str, Any] | None = None,
    ) -> Any:
        """
        Build an adapter regardless of where its configuration originates.

        If both ``adapter_type`` and ``adapter_config`` are omitted, the configuration
        is loaded from the YAML dispatcher section at ``dispatcher_path``. Otherwise,
        both must be supplied together (e.g. from a frontend request or a database
        row) and are used as-is, bypassing YAML entirely. Either way the caller does
        not need to know which source was used.
        
        ARCHITECTURAL IMPROVEMENT: Dual-mode design enables runtime config override (frontend/DB),
        simplifies testing (no YAML needed), and keeps implementation agnostic to config source.
        """
        if adapter_type is None and adapter_config is None:
            adapter_type, adapter_config = ConfigManager.get_adapter_mode_and_config(
                dispatcher_path=dispatcher_path,
                validate_adapter_exists=True,
            )
        elif adapter_type is None or adapter_config is None:
            raise ValueError(
                "Both adapter_type and adapter_config are required when "
                "bypassing YAML configuration"
            )

        if not isinstance(adapter_type, str) or not adapter_type.strip():
            raise ValueError("Adapter type must be a non-empty string")
        if not isinstance(adapter_config, dict):
            raise ValueError("Adapter configuration must be a dictionary")

        normalized_type = adapter_type.strip().lower().replace(" ", "_").replace("-", "_")
        available_adapters = SubmodelAdapterFactory.get_available_adapter_types()
        if normalized_type not in available_adapters:
            raise ValueError(
                f"Adapter type '{adapter_type}' is not registered. "
                f"Available adapters: {', '.join(sorted(available_adapters))}"
            )

        config = AdapterConfigurationInterface.transform_config(
            normalized_type,
            adapter_config,
        )
        return SubmodelAdapterFactory.from_config(normalized_type, config)


class AdapterConfigurationInterface:
    """
    Generic boundary between YAML configuration and adapter builder methods.

    The selected adapter configuration is passed through without adapter-specific
    mappings. Adapter configuration keys must therefore match the builder API.

    The interface methods follow the pattern:
        raw_config (from YAML) → transform_config() → transformed_config (for adapter)
    
    ARCHITECTURAL IMPROVEMENT: Generic pass-through design decouples our code from SDK adapter schemas,
    making it extensible for new adapter types without backend code changes.
    """

    @staticmethod
    def transform_config(
        adapter_type: str, raw_config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Transform adapter configuration from YAML format to factory-expected format.

        Retrieves all keys from the selected adapter configuration and passes them
        through to SubmodelAdapterFactory.from_config(). This keeps the backend
        independent of built-in and externally registered adapter schemas.

        Args:
            adapter_type: Normalized adapter type (lowercase with underscores)
            raw_config: Raw configuration dictionary from YAML

        Returns:
            Transformed configuration dictionary ready for SubmodelAdapterFactory

        Raises:
            ValueError: If configuration is invalid
        """
        if not isinstance(raw_config, dict):
            raise ValueError(
                f"Configuration must be a dictionary, got {type(raw_config).__name__}"
            )

        if not isinstance(adapter_type, str) or not adapter_type.strip():
            raise ValueError("Adapter type must be a non-empty string")

        return {key: value for key, value in raw_config.items()}


def get_all_available_adapter_types() -> set[str]:
    """
    Get all available adapter types, including built-in and externally registered ones.

    Returns:
        Set of adapter type names (normalized to lowercase with underscores)
    """
    return SubmodelAdapterFactory.get_available_adapter_types()
