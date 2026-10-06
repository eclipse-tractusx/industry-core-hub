#################################################################################
# Eclipse Tractus-X - Industry Core Hub Backend
#
# Copyright (c) 2026 LKS Next
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

import json
from dataclasses import dataclass
from typing import Dict, Any, Callable
from uuid import UUID
from hashlib import sha256
from enum import Enum

from managers.config.log_manager import LoggingManager
from managers.config.config_manager import ConfigManager
from tools.exceptions import InvalidError, NotFoundError

from tractusx_sdk.industry.adapters.submodel_adapter_factory import SubmodelAdapterFactory
from managers.enablement_services.adapters.adapter_config_manager import SubmodelAdapterProvider


class OperationType(Enum):
    """Enumeration of supported submodel operations."""
    READ = "read"
    WRITE = "write"
    DELETE = "delete"


@dataclass
class SubmodelMetadata:
    """
    Container for submodel metadata used across read/write/delete operations.
    
    Attributes:
        submodel_id: UUID of the submodel.
        semantic_id: Semantic ID of the submodel.
        semantic_id_hash: SHA-256 hash of the semantic ID for storage organization.
    """
    submodel_id: str
    semantic_id: str
    semantic_id_hash: str
    
    def to_dict(self) -> Dict[str, str]:
        """
        Convert metadata to dictionary for adapter operations.
        
        Returns:
            Dictionary representation of metadata.
        """
        return {
            "submodel_id": self.submodel_id,
            "semantic_id": self.semantic_id,
            "semantic_id_hash": self.semantic_id_hash,
        }

class SubmodelServiceManager:
    """
    Manager for handling submodel service operations (read, write, delete).
    
    Orchestrates storage backend operations via a dynamically-selected adapter,
    implementing clean separation of concerns between YAML configuration, adapter
    selection, and storage operations. Adapter initialization is dynamic and delegated
    to SubmodelAdapterFactory via SubmodelAdapterProvider.
    
    Supported Storage Backends:
    - FileSystem: Local directory-based storage
    - S3: AWS S3 or S3-compatible object storage
    - HttpSubmodel: External submodel service via HTTP/REST API
    
    Architecture (Four-Layer):
        YAML File (configuration.yml) → ConfigManager → SubmodelServiceManager
        → SubmodelAdapterProvider → SubmodelAdapterFactory → Adapter Instance
    
    Features:
    - Configuration-driven adapter selection (zero hardcoded logic)
    - Per-source adapter caching to avoid repeated instantiation
    - Support for runtime registration of custom (external) adapter types
    - Configurable from YAML, frontend payloads, or database rows
    - Full logging and error handling
    - UUID validation and semantic ID hashing for storage organization
    
    Configuration Structure (YAML):
        provider:
          submodel_dispatcher:
            mode: "file_system"  # or "s3", "http_submodel"
            file_system:
              root_path: "..."
              path_pattern: "..."
            s3:
              bucket_name: "..."
              aws_access_key_id: "..."
            http_submodel:
              base_url: "..."
              auth_token: "..."
    
    Adapter Caching:
        Adapter instances are cached per configuration source:
        - YAML-based: cached by dispatcher_path (e.g., "provider.submodel_dispatcher")
        - Frontend/DB-based: cached by adapter_type + config hash
        Repeated manager instantiations with the same source reuse cached adapters.
    
    Usage Examples:
        # Load from YAML configuration (default)
        manager = SubmodelServiceManager()
        manager.upload_twin_aspect_document(submodel_id, semantic_id, payload)
        
        # Reuses cached adapter from same dispatcher section
        manager2 = SubmodelServiceManager()
        
        # Different dispatcher section builds/caches separate adapter
        manager3 = SubmodelServiceManager("provider.secondary_dispatcher")
        
        # Load from frontend payload (e.g., REST API request)
        manager4 = SubmodelServiceManager(
            adapter_type="s3",
            adapter_config={"bucket_name": "my-bucket", "region": "us-east-1"}
        )
    """
    logger = LoggingManager.get_logger(__name__)

    # Adapter instances are cached per resolved source so repeated instantiations
    # (e.g. one per request) reuse the same adapter instead of rebuilding it.
    # Cache structure: {cache_key: {"adapter": adapter_instance, "mode": adapter_type_string}}
    _adapter_cache: Dict[str, Dict[str, Any]] = {}

    def __init__(
        self,
        dispatcher_path: str = "provider.submodel_dispatcher",
        adapter_type: str | None = None,
        adapter_config: Dict[str, Any] | None = None,
    ):
        """
        Initialize a manager with an adapter selected from the given configuration section.
        
        Architecture (Clean Separation of Concerns):
            YAML File (configuration.yml)
                ↓
            ConfigManager (load + provide raw config)
                └─ get_adapter_mode_and_config() → raw config
                ↓
            SubmodelServiceManager (bridge - orchestrate)
                └─ SubmodelAdapterProvider loads and builds the configured adapter
                    ↓
                SubmodelAdapterFactory (creates adapter from builder-compatible config)
                    └─ from_config() builds adapter instance
        
        Configuration Flow:
          Adapter creation is delegated to SubmodelAdapterProvider so this manager
          does not depend on the YAML schema or adapter-specific mappings.
        
        Raises:
            ValueError: If configuration section is missing or invalid
            RuntimeError: If adapter initialization fails
        
        Example:
            # First instantiation builds and caches the adapter
            manager = SubmodelServiceManager()
            
            # Reuses the cached adapter, keyed by dispatcher_path
            manager2 = SubmodelServiceManager()
            
            # Different dispatcher path builds/caches a separate adapter
            manager3 = SubmodelServiceManager("provider.secondary_dispatcher")
        """
        try:
            adapter, adapter_mode = self._resolve_adapter(dispatcher_path, adapter_type, adapter_config)
            self.adapter = adapter
            self.adapter_mode = adapter_mode
        except ValueError as e:
            self.logger.error(f"Configuration error during initialization: {e}")
            raise
        except Exception as e:
            self.logger.error(f"Failed to initialize SubmodelServiceManager: {e}")
            raise RuntimeError(f"Failed to initialize submodel adapter: {e}") from e

    def _resolve_adapter(
        self,
        dispatcher_path: str,
        adapter_type: str | None,
        adapter_config: Dict[str, Any] | None,
    ) -> tuple[Any, str]:
        """
        Resolve and cache an adapter based on configuration source.
        
        This internal method handles two configuration sources:
        1. YAML-based: Load from dispatcher_path via ConfigManager
        2. Frontend/DB-based: Use provided adapter_type and adapter_config directly
        
        Adapter caching is per-source:
        - YAML: cached by dispatcher_path
        - Frontend/DB: cached by adapter_type + config signature hash
        
        Args:
            dispatcher_path: YAML path to dispatcher config (e.g., "provider.submodel_dispatcher")
                Used only if adapter_type and adapter_config are None (YAML mode).
            adapter_type: Adapter type (e.g., "file_system", "s3", "http_submodel").
                If provided, adapter_config must also be provided (frontend mode).
            adapter_config: Raw adapter configuration dictionary (frontend mode).
                If provided, adapter_type must also be provided.
        
        Returns:
            Tuple of (adapter_instance, normalized_adapter_mode_string)
        
        Raises:
            ValueError: If configuration is invalid or incomplete.
        
        Cache Behavior:
            - Subsequent calls with the same source reuse the cached adapter
            - Clearing cache forces rebuild on next instantiation
        """
        if adapter_type is not None or adapter_config is not None:
            if adapter_type is None or adapter_config is None:
                raise ValueError(
                    "Both adapter_type and adapter_config are required for "
                    "frontend-configured adapters"
                )
            # Normalize so adapter_mode is consistent regardless of config source (YAML vs frontend/db).
            resolved_mode = adapter_type.strip().lower().replace(" ", "_").replace("-", "_")
            cache_key = self._build_cache_key(resolved_mode, adapter_config)
            source = f"frontend adapter '{resolved_mode}'"
        else:
            cache_key = f"dispatcher:{dispatcher_path}"
            source = f"dispatcher '{dispatcher_path}'"
            # Get the adapter mode from config
            resolved_mode, _ = ConfigManager.get_adapter_mode_and_config(
                dispatcher_path=dispatcher_path,
                validate_adapter_exists=True,
            )

        if cache_key in self._adapter_cache:
            self.logger.info(f"Reusing cached adapter for {source}")
            cached_data = self._adapter_cache[cache_key]
            return cached_data["adapter"], cached_data["mode"]

        # Provider resolves the source internally; manager stays source-agnostic.
        adapter = SubmodelAdapterProvider.create_adapter(
            dispatcher_path=dispatcher_path,
            adapter_type=adapter_type,
            adapter_config=adapter_config,
        )
        self._adapter_cache[cache_key] = {"adapter": adapter, "mode": resolved_mode}
        self.logger.info(f"SubmodelServiceManager initialized from {source}")
        return adapter, resolved_mode

    @staticmethod
    def _build_cache_key(adapter_type: str, adapter_config: Dict[str, Any]) -> str:
        """
        Build a stable, deterministic cache key for frontend-supplied adapter configuration.
        
        Uses SHA-256 hash of the sorted config dictionary to ensure consistent cache keys
        even if dictionary keys appear in different orders. Handles non-JSON-serializable
        values by falling back to repr() of sorted items.
        
        Args:
            adapter_type: Adapter type (e.g., "s3", "http_submodel").
            adapter_config: Configuration dictionary for the adapter.
        
        Returns:
            Cache key in format: "frontend:{adapter_type}:{config_hash}"
        
        Example:
            config = {"bucket": "my-bucket", "region": "us-east-1"}
            key = SubmodelServiceManager._build_cache_key("s3", config)
            # Returns: "frontend:s3:a1b2c3d4e5f6..."
        """
        try:
            config_signature = json.dumps(adapter_config, sort_keys=True, default=str)
        except TypeError:
            config_signature = repr(sorted(adapter_config.items(), key=str))
        config_hash = sha256(config_signature.encode("utf-8")).hexdigest()
        return f"frontend:{adapter_type}:{config_hash}"

    @classmethod
    def clear_adapter_cache(cls) -> None:
        """
        Clear all cached adapter instances.
        
        Removes all cached adapters regardless of source (YAML or frontend).
        The next manager instantiation will rebuild adapters from the current
        configuration instead of reusing cached instances.
        
        Use cases:
        - After reloading application configuration
        - Between test cases to ensure test isolation
        - To force adapter recreation without restarting the application
        
        Logging:
            Logs info message when cache is cleared.
        """
        cls._adapter_cache.clear()
        cls.logger.info("Submodel adapter cache cleared")

    @classmethod
    def register_external_adapter(
        cls,
        adapter_type: str,
        builder_factory: Callable | None = None,
        adapter_class: Any = None,
        overwrite: bool = False,
    ) -> None:
        """
        Register an external (custom) adapter type at runtime.

        Allows dynamic registration of adapter implementations that are not built-in
        to the SDK. Provide either a builder factory or an adapter class with a
        ``builder()`` classmethod.

        Args:
            adapter_type: External adapter type key (e.g., "custom_adapter").
            builder_factory: Callable that returns a configured builder instance.
                Mutually exclusive with ``adapter_class``.
            adapter_class: Adapter class exposing a ``builder()`` classmethod.
                Mutually exclusive with ``builder_factory``.
            overwrite: If True, overwrites existing registration with the same type.
                Default: False (raises ValueError if already registered).

        Raises:
            ValueError: If exactly one of builder_factory or adapter_class is not provided,
                or if type already exists and overwrite=False.
            TypeError: If builder_factory is not callable or adapter_class
                lacks a callable ``builder()`` method.

        Example:
            Register a custom adapter class::

                class MyCustomAdapter:
                    @classmethod
                    def builder(cls):
                        return cls._Builder()

                SubmodelServiceManager.register_external_adapter(
                    adapter_type="my_custom",
                    adapter_class=MyCustomAdapter,
                )
        """
        # Validate mutual exclusivity: exactly one registration path must be chosen.
        if (builder_factory is None) == (adapter_class is None):
            raise ValueError(
                "Exactly one of 'builder_factory' or 'adapter_class' must be provided. "
                "They are mutually exclusive."
            )

        # Validate builder_factory if provided
        if builder_factory is not None and not callable(builder_factory):
            raise TypeError(
                f"'builder_factory' must be callable, got {type(builder_factory).__name__}"
            )

        # Validate adapter_class if provided
        if adapter_class is not None:
            if not hasattr(adapter_class, "builder"):
                raise TypeError(
                    f"'adapter_class' must have a 'builder' classmethod. "
                    f"Class {adapter_class.__name__} does not have one."
                )
            if not callable(getattr(adapter_class, "builder")):
                raise TypeError(
                    f"'adapter_class.builder' must be callable. "
                    f"Got {type(getattr(adapter_class, 'builder')).__name__}"
                )

        try:
            SubmodelAdapterFactory.register_adapter(
                adapter_type=adapter_type,
                builder_factory=builder_factory,
                adapter_class=adapter_class,
                overwrite=overwrite,
            )
            cls.logger.info(
                f"External adapter '{adapter_type}' registered successfully. "
                f"Available external adapters: {cls.get_registered_adapters()}"
            )
        except (ValueError, TypeError) as e:
            cls.logger.error(f"Failed to register external adapter '{adapter_type}': {e}")
            raise

    @classmethod
    def get_registered_adapters(cls) -> list[str]:
        """
        Get list of externally registered (custom) adapter types.

        This method returns only adapters registered at runtime via
        ``register_external_adapter()``. Built-in adapters (FileSystem, S3,
        HttpSubmodel) are intentionally excluded.

        Returns:
            Sorted list of registered external adapter type keys.

        Example:
            Inspect runtime registrations::

                external = SubmodelServiceManager.get_registered_adapters()
                # Returns: ['my_custom', 'another_adapter']
        """
        built_in_adapters = {"file_system", "http_submodel", "s3"}
        adapters = sorted(
            set(SubmodelAdapterFactory.get_available_adapter_types())
            - built_in_adapters
        )
        cls.logger.debug(f"Registered external adapter types: {adapters}")
        return adapters

    @classmethod
    def unregister_external_adapter(cls, adapter_type: str) -> None:
        """
        Unregister a previously registered external adapter type.

        Args:
            adapter_type: External adapter type key to unregister.

        Raises:
            ValueError: If adapter_type is not registered.

        Example:
            Remove a custom adapter::

                SubmodelServiceManager.unregister_external_adapter("my_custom")
        """
        # TODO: Consider whether to allow unregistering built-in adapters in the future or not.
        # Check if adapter is a built-in adapter
        # built_in_adapters = {"file_system", "http_submodel", "s3"}
        # if adapter_type in built_in_adapters:
        #     error_msg = f"Cannot unregister built-in adapter '{adapter_type}'. Built-in adapters are: {', '.join(sorted(built_in_adapters))}"
        #     cls.logger.error(error_msg)
        #     raise ValueError(error_msg)

        # Check if adapter is currently registered
        registered_adapters = cls.get_registered_adapters()
        if adapter_type not in registered_adapters:
            error_msg = f"Adapter '{adapter_type}' is not registered. Registered adapters are: {', '.join(sorted(registered_adapters)) if registered_adapters else 'none'}"
            cls.logger.error(error_msg)
            raise ValueError(error_msg)

        try:
            SubmodelAdapterFactory.unregister_adapter(adapter_type=adapter_type)
            cls.logger.info(
                f"External adapter '{adapter_type}' unregistered successfully. "
                f"Remaining registered adapters: {cls.get_registered_adapters()}"
            )
        except Exception as e:
            cls.logger.error(f"Failed to unregister external adapter '{adapter_type}': {e}")
            raise

    def _validate_uuid(self, value: Any) -> UUID:
        """
        Validate and convert a value to a UUID instance.
        
        Accepts UUID instances or strings and returns a validated UUID object.
        Useful for coercing input from frontend payloads or database rows to UUIDs.
        
        Args:
            value: Value to validate as UUID. Can be a UUID instance or string representation.
        
        Returns:
            Valid UUID instance.
        
        Raises:
            InvalidError: If value cannot be converted to a valid UUID.
        
        Example:
            uuid_str = "550e8400-e29b-41d4-a716-446655440000"
            validated = manager._validate_uuid(uuid_str)
            # Returns: UUID('550e8400-e29b-41d4-a716-446655440000')
        """
        if isinstance(value, UUID):
            return value
        try:
            return UUID(value)
        except (ValueError, AttributeError, TypeError) as e:
            raise InvalidError(f"Invalid UUID: {value}") from e

    def _hash_semantic_id(self, semantic_id: str) -> str:
        """Generate SHA-256 hash of semantic ID for storage organization.
        
        Creates a deterministic hash of the semantic ID that can be used for organizing
        storage paths or grouping related submodels.
        
        Args:
            semantic_id: Semantic ID of the submodel (e.g., urn:samm:io.catenax...).
        
        Returns:
            SHA-256 hash of the semantic ID as hexadecimal string.
        """
        sha256_semantic_id = sha256(semantic_id.encode()).hexdigest()
        return sha256_semantic_id
    
    def _execute_submodel_operation(
        self,
        operation: OperationType,
        submodel_id: UUID,
        semantic_id: str,
        payload: Dict[str, Any] | None = None
    ) -> Dict[str, Any] | None:
        """
        Execute a submodel operation (read, write, delete) via the configured adapter.
        
        This is the unified entry point for all submodel operations. It:
        1. Validates the submodel_id (converts to UUID if needed)
        2. Hashes the semantic_id for storage organization
        3. Creates SubmodelMetadata object for adapter communication
        4. Dispatches to operation-specific handler (read/write/delete)
        5. Logs all operations
        
        Operation Handlers:
        - READ: Checks existence, returns submodel content
        - WRITE: Stores submodel content to backend
        - DELETE: Checks existence, removes submodel
        
        Args:
            operation: Type of operation to perform (OperationType enum).
            submodel_id: UUID of the submodel. Can be UUID instance or string representation.
            semantic_id: Semantic ID of the submodel (e.g., "urn:samm:io.catenax...").
            payload: Payload data for write operations. Ignored for read/delete.
        
        Returns:
            - READ: Dictionary containing submodel content
            - WRITE: None
            - DELETE: None
        
        Raises:
            InvalidError: If submodel_id is not a valid UUID.
            NotFoundError: If submodel does not exist (read/delete operations).
            RuntimeError: If adapter is not initialized or operation fails.
        
        Logging:
            All operations are logged at info level with operation type, IDs, and results.
        """
        submodel_id = self._validate_uuid(submodel_id)
        
        # Log operation
        self.logger.info(f"{operation.value.capitalize()}ing submodel with id=[{submodel_id}], semanticId=[{semantic_id}]")
        
        # Create metadata object for adapter communication
        submodel_metadata = SubmodelMetadata(
            submodel_id=str(submodel_id),
            semantic_id=semantic_id,
            semantic_id_hash=self._hash_semantic_id(semantic_id),
        )

        handlers = {
            OperationType.READ: self._read_submodel,
            OperationType.WRITE: self._write_submodel,
            OperationType.DELETE: self._delete_submodel,
        }
        return handlers[operation](submodel_metadata, payload)

    def _read_submodel(self, submodel_metadata: SubmodelMetadata, _payload: Dict[str, Any] | None) -> Dict[str, Any]:
        if not self.adapter.exists(submodel_metadata.to_dict()):
            self.logger.error(f"Submodel file not found: {submodel_metadata}")
            raise NotFoundError(f"Submodel file not found: {submodel_metadata}")
        return self.adapter.read(submodel_metadata.to_dict())

    def _write_submodel(self, submodel_metadata: SubmodelMetadata, payload: Dict[str, Any] | None) -> None:
        self.logger.info(f"Writing submodel with metadata: {submodel_metadata.to_dict()}")
        self.adapter.write_json(submodel_metadata.to_dict(), payload)
        self.logger.info("Submodel uploaded successfully.")
        return None

    def _delete_submodel(self, submodel_metadata: SubmodelMetadata, _payload: Dict[str, Any] | None) -> None:
        if not self.adapter.exists(submodel_metadata.to_dict()):
            self.logger.error(f"Submodel file not found: {submodel_metadata}")
            raise NotFoundError(f"Submodel file not found: {submodel_metadata}")
        self.adapter.delete(submodel_metadata.to_dict())
        self.logger.info("Submodel deleted successfully.")
        return None

    def upload_twin_aspect_document(
        self,
        submodel_id: UUID,
        semantic_id: str,
        payload: Dict[str, Any]
    ) -> None:
        """
        Upload a submodel to the configured storage backend.
        
        Uploads a JSON-serializable submodel document to the underlying storage
        system (FileSystem, S3, or external HTTP submodel service) based on the
        configured adapter. The submodel is indexed by semantic ID hash and submodel ID.
        
        Storage Path Organization:
            - FileSystem: Uses semantic_id hash and submodel_id for directory structure
            - S3: Object key derived from semantic_id hash and submodel_id
            - HttpSubmodel: Delegated to external service via HTTP POST
        
        Args:
            submodel_id: UUID of the submodel being uploaded. Can be UUID instance or string.
            semantic_id: Semantic ID of the submodel type (e.g., "urn:samm:io.catenax...").
                Used for organizing storage paths by semantic type.
            payload: Submodel content as a dictionary. Must be JSON-serializable.
                Typically follows AAS structure (modelType, identification, submodelElements, etc.).
        
        Returns:
            None
        
        Raises:
            InvalidError: If submodel_id is not a valid UUID.
            RuntimeError: If adapter is not initialized, payload is not JSON-serializable,
                or storage operation fails.
        
        Example:
            payload = {
                "modelType": "Submodel",
                "identification": "...",
                "submodelElements": [...]
            }
            manager.upload_twin_aspect_document(
                submodel_id=UUID("550e8400-e29b-41d4-a716-446655440000"),
                semantic_id="urn:example:submodel:v1",
                payload=payload
            )
        """
        self._execute_submodel_operation(
            OperationType.WRITE,
            submodel_id,
            semantic_id,
            payload
        )

    def get_twin_aspect_document(
        self,
        submodel_id: UUID,
        semantic_id: str
    ) -> Dict[str, Any]:
        """
        Retrieve a submodel from the configured storage backend.
        
        Fetches a previously uploaded submodel document from the underlying storage
        system (FileSystem, S3, or external HTTP submodel service) by its UUID and
        semantic ID. Raises NotFoundError if the submodel does not exist.
        
        Return Format:
            Returns the complete submodel as a dictionary. Content format depends on
            the storage adapter:
            - FileSystem: Reads from JSON file
            - S3: Deserializes from S3 object
            - HttpSubmodel: Fetches from external service via HTTP GET
        
        Args:
            submodel_id: UUID of the submodel to retrieve. Can be UUID instance or string.
            semantic_id: Semantic ID of the submodel type (e.g., "urn:samm:io.catenax...").
                Used to locate the submodel in storage.
        
        Returns:
            Submodel content as a dictionary with full AAS structure:
                - modelType: "Submodel"
                - identification: "..."
                - submodelElements: [...]  (array of elements)
                - and other AAS-defined properties
        
        Raises:
            InvalidError: If submodel_id is not a valid UUID.
            NotFoundError: If the submodel does not exist in storage.
            RuntimeError: If adapter is not initialized or retrieval fails.
        
        Example:
            submodel = manager.get_twin_aspect_document(
                submodel_id=UUID("550e8400-e29b-41d4-a716-446655440000"),
                semantic_id="urn:example:submodel:v1"
            )
            print(f"Submodel type: {submodel['modelType']}")
        """
        return self._execute_submodel_operation(
            OperationType.READ,
            submodel_id,
            semantic_id
        )

    def delete_twin_aspect_document(
        self,
        submodel_id: UUID,
        semantic_id: str
    ) -> None:
        """
        Delete a submodel from the configured storage backend.
        
        Removes a submodel document from the underlying storage system (FileSystem,
        S3, or external HTTP submodel service). The submodel must exist before deletion;
        attempting to delete a non-existent submodel raises NotFoundError.
        
        Storage Backend Behavior:
            - FileSystem: Deletes the JSON file from disk
            - S3: Deletes the object from the S3 bucket
            - HttpSubmodel: Sends HTTP DELETE request to external service
        
        Args:
            submodel_id: UUID of the submodel to delete. Can be UUID instance or string.
            semantic_id: Semantic ID of the submodel type (e.g., "urn:samm:io.catenax...").
                Used to locate the submodel in storage.
        
        Returns:
            None
        
        Raises:
            InvalidError: If submodel_id is not a valid UUID.
            NotFoundError: If the submodel does not exist in storage.
            RuntimeError: If adapter is not initialized or deletion fails.
        
        Example:
            manager.delete_twin_aspect_document(
                submodel_id=UUID("550e8400-e29b-41d4-a716-446655440000"),
                semantic_id="urn:example:submodel:v1"
            )
            print("Submodel deleted successfully")
        """
        self._execute_submodel_operation(
            OperationType.DELETE,
            submodel_id,
            semantic_id
        )
