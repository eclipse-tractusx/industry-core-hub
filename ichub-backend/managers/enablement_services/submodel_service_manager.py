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

from dataclasses import dataclass
from typing import Dict, Any
from uuid import UUID
from hashlib import sha256
from enum import Enum

from managers.config.config_manager import ConfigManager
from managers.config.log_manager import LoggingManager
from tools.exceptions import InvalidError, NotFoundError

from tractusx_sdk.industry.adapters import SubmodelAdapter
from tractusx_sdk.industry.adapters.submodel_adapter_factory import SubmodelAdapterFactory

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
    
    Implemented as a singleton to ensure a single adapter instance is shared across
    the application. Uses SubmodelAdapterFactory for 100% dynamic adapter initialization
    based on configuration. Supports multiple storage backends:
    - FileSystem (local storage)
    - S3 (AWS S3 or S3-compatible)
    - HttpSubmodel (external submodel service)
    
    Configuration is loaded from YAML and passed to the factory without any
    hardcoded logic or switch statements. Adapter type and configuration are
    determined dynamically from the configuration section: provider.submodel_dispatcher
    
    Example:
        # First instantiation initializes the adapter
        manager1 = SubmodelServiceManager()
        
        # Subsequent instantiations return the same instance (singleton)
        manager2 = SubmodelServiceManager()
        assert manager1 is manager2  # True
    """
    _instance = None
    adapter: SubmodelAdapter
    adapter_mode: str
    logger = LoggingManager.get_logger(__name__)
    
    #TODO: consider if we need it in the future
    # def __new__(cls):
    #     """
    #     Implement singleton pattern to ensure only one adapter instance exists.
        
    #     Returns:
    #         Singleton instance of SubmodelServiceManager.
    #     """
    #     if cls._instance is None:
    #         cls._instance = super().__new__(cls)
    #         cls._instance._initialized = False
    #     return cls._instance

    def __init__(self):
        """
        Initialize SubmodelServiceManager with dynamic adapter configuration.
        
        Implements lazy initialization with singleton pattern - only initializes on first
        instantiation, subsequent calls skip initialization.
        
        Uses ConfigManager.get_adapter_mode_and_config() to efficiently retrieve
        both the adapter mode and its configuration in a single call. This approach
        is 100% dynamic and flexible - no hardcoded paths or adapter-specific logic.
        
        Configuration flow:
        1. ConfigManager.get_adapter_mode_and_config() → retrieves and validates
           both adapter mode and configuration
        2. Passes to SubmodelAdapterFactory.from_config() → adapter instance
        
        Raises:
            ValueError: If configuration is missing or invalid
            RuntimeError: If adapter initialization fails
        """
        if self._initialized:
            return
        
        try:
            # Get adapter mode and config efficiently in a single call
            # This avoids loading the dispatcher config multiple times
            self.adapter_mode, adapter_config = ConfigManager.get_adapter_mode_and_config(
                validate_adapter_exists=True
            )
            
            # Initialize adapter using factory
            self.adapter = SubmodelAdapterFactory.from_config(
                self.adapter_mode,
                adapter_config
            )
            
            self._initialized = True
            self.logger.info(
                f"SubmodelServiceManager initialized successfully with adapter mode: {self.adapter_mode}"
            )
        except ValueError as e:
            self.logger.error(f"Configuration error during initialization: {e}")
            raise
        except Exception as e:
            self.logger.error(f"Failed to initialize SubmodelServiceManager: {e}")
            raise RuntimeError(f"Failed to initialize submodel adapter: {e}") from e
    def _validate_uuid(self, value: Any) -> UUID:
        """Validate and convert value to UUID.
        
        Args:
            value: Value to validate as UUID.
        
        Returns:
            Valid UUID instance.
        
        Raises:
            InvalidError: If value cannot be converted to UUID.
        """
        if isinstance(value, UUID):
            return value
        try:
            return UUID(value)
        except (ValueError, AttributeError, TypeError) as e:
            raise InvalidError(f"Invalid UUID: {value}") from e

    def _hash_semantic_id(self, semantic_id: str) -> str:
        """Get filesystem path components for a submodel.
        
        Args:
            semantic_id: Semantic ID of the submodel.
        
        Returns:
            Directory hash for the submodel.
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
        """Execute a submodel operation (read, write, delete) in a generalized manner.
        
        This method handles the branching logic between HTTP and filesystem adapters,
        reducing code duplication across read/write/delete operations.
        
        Args:
            operation: Type of operation to perform.
            submodel_id: UUID of the submodel.
            semantic_id: Semantic ID of the submodel.
            payload: Payload data for write operations.
        
        Returns:
            Operation result (content for read operations, None for write/delete).
        
        Raises:
            InvalidError: If submodel_id is invalid.
            NotFoundError: If submodel not found during read/delete.
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
        
        if operation == OperationType.READ:
            if not self.adapter.exists(submodel_metadata.to_dict()):
                self.logger.error(f"Submodel file not found: {submodel_metadata}")
                raise NotFoundError(f"Submodel file not found: {submodel_metadata}")
            return self.adapter.read(submodel_metadata.to_dict())
        
        elif operation == OperationType.WRITE:
            self.adapter.write_json(submodel_metadata.to_dict(), payload)
            self.logger.info("Submodel uploaded successfully.")
            return None
        
        elif operation == OperationType.DELETE:
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
        configured adapter.
        
        Args:
            submodel_id: UUID of the submodel being uploaded.
            semantic_id: Semantic ID (e.g., urn:example:submodel) that identifies
                the submodel type. Used for storage path organization.
            payload: Submodel content as a dictionary. Must be JSON-serializable.
        
        Returns:
            None
        
        Raises:
            InvalidError: If submodel_id is not a valid UUID.
            RuntimeError: If adapter is not initialized or storage operation fails.
        
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
        semantic ID.
        
        Args:
            submodel_id: UUID of the submodel to retrieve.
            semantic_id: Semantic ID used to locate the submodel in storage.
        
        Returns:
            Submodel content as a dictionary with full AAS structure
            (modelType, identification, submodelElements, etc.).
        
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
        S3, or external HTTP submodel service). The submodel must exist; attempting
        to delete a non-existent submodel raises NotFoundError.
        
        Args:
            submodel_id: UUID of the submodel to delete.
            semantic_id: Semantic ID used to locate the submodel in storage.
        
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
