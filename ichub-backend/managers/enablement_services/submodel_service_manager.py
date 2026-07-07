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

import os
from pathlib import Path
from typing import Dict, Any
from uuid import UUID
from hashlib import sha256
from enum import Enum

from managers.config.config_manager import ConfigManager
from managers.config.log_manager import LoggingManager
from tools.exceptions import InvalidError, NotFoundError

from tractusx_sdk.industry.adapters import SubmodelAdapter
from tractusx_sdk.industry.adapters.submodel_adapter_factory import SubmodelAdapterFactory
from tractusx_sdk.industry.adapters.submodel_adapters.file_system_adapter import FileSystemAdapter
from managers.enablement_services.adapters.http_submodel_adapter import HttpSubmodelAdapter


class OperationType(Enum):
    """Enumeration of supported submodel operations."""
    READ = "read"
    WRITE = "write"
    DELETE = "delete"

class SubmodelServiceManager:
    """Manager for handling submodel service."""
    adapter: SubmodelAdapter
    adapter_mode: str
    logger = LoggingManager.get_logger(__name__)

    def __init__(self):
        # Get adapter mode from configuration (default: filesystem)
        self.adapter_mode = ConfigManager.get_config(
            "provider.submodel_dispatcher.mode",
            default="filesystem"
        )
        
        if not isinstance(self.adapter_mode, str):
            raise ValueError(
                f"Expected 'provider.submodel_dispatcher.mode' to be a string, "
                f"got: {type(self.adapter_mode).__name__}"
            )
        
        self.adapter_mode = self.adapter_mode.lower()
        
        if self.adapter_mode not in ["filesystem", "http"]:
            raise ValueError(
                f"Invalid adapter mode: {self.adapter_mode}. "
                f"Supported modes: 'filesystem', 'http'"
            )
        
        # Initialize appropriate adapter based on mode
        if self.adapter_mode == "filesystem":
            self.adapter = self._initialize_filesystem_adapter()
        elif self.adapter_mode == "http":
            self.adapter = self._initialize_http_adapter()
        else:
            raise ValueError(f"Unsupported adapter mode: {self.adapter_mode}")
        
        self.logger.info(f"SubmodelServiceManager initialized with mode: {self.adapter_mode}")
    
    def _initialize_filesystem_adapter(self) -> FileSystemAdapter:
        """Initialize filesystem adapter for local storage."""
        submodel_service_path = ConfigManager.get_config(
            "provider.submodel_dispatcher.path",
            default="/industry-core-hub/data/submodels"
        )
        
        if not isinstance(submodel_service_path, str):
            raise ValueError(
                f"Expected 'provider.submodel_dispatcher.path' to be a string, "
                f"got: {type(submodel_service_path).__name__}"
            )
        
        # Convert relative path to absolute path if needed
        if not os.path.isabs(submodel_service_path):
            submodel_service_path = os.path.abspath(submodel_service_path)
        
        # Ensure the directory exists and check permissions
        try:
            path_obj = Path(submodel_service_path)
            path_obj.mkdir(parents=True, exist_ok=True)
            
            # Check if we have write permissions using os.access()
            if not os.access(submodel_service_path, os.W_OK):
                raise PermissionError(
                    f"No write permission for directory: {submodel_service_path}"
                )
            
            self.logger.info(f"Submodel storage initialized at: {submodel_service_path}")
        except PermissionError as e:
            self.logger.error(
                f"Permission denied accessing submodel storage path: {submodel_service_path}"
            )
            raise PermissionError(
                f"Cannot access submodel storage directory: {submodel_service_path}. Error: {e}"
            )
        except Exception as e:
            self.logger.error(
                f"Failed to initialize submodel storage at {submodel_service_path}: {e}"
            )
            raise RuntimeError(f"Failed to initialize submodel storage: {e}")
        
        return SubmodelAdapterFactory.get_file_system(root_path=submodel_service_path)
    
    def _initialize_http_adapter(self) -> HttpSubmodelAdapter:
        """Initialize HTTP adapter for external submodel service."""
        http_config = ConfigManager.get_config("provider.submodel_dispatcher.http", default={})
        
        if not isinstance(http_config, dict):
            raise ValueError(
                f"Expected 'provider.submodel_dispatcher.http' to be a dict, "
                f"got: {type(http_config).__name__}"
            )
        
        # Extract required configuration
        base_url = http_config.get("base_url", "")
        if not base_url:
            raise ValueError(
                "Missing required configuration: provider.submodel_dispatcher.http.base_url"
            )
        
        # Extract optional configuration with defaults
        api_path = http_config.get("api_path", "")
        timeout = http_config.get("timeout", 30)
        verify_ssl = http_config.get("verify_ssl", True)
        
        # Extract authentication configuration
        auth_config = http_config.get("auth", {})
        auth_enabled = auth_config.get("enabled", False)
        auth_type = "none"
        auth_token = None
        auth_key_name = None
        
        if auth_enabled:
            # Get authentication type (default to apikey for backward compatibility)
            auth_type = auth_config.get("type", "apikey").lower()
            
            # Get authentication token/key
            auth_token = auth_config.get("token", "")
            
            # Support environment variable substitution
            if auth_token.startswith("${") and auth_token.endswith("}"):
                env_var = auth_token[2:-1]
                auth_token = os.getenv(env_var, "")
                if not auth_token:
                    self.logger.warning(
                        f"Environment variable {env_var} not set. "
                        f"Authentication may fail."
                    )
            
            if not auth_token:
                self.logger.warning(
                    "Authentication enabled but no token provided. "
                    "External service calls may fail if authentication is required."
                )
            
            # Get API key header name if using apikey auth
            if auth_type == "apikey":
                auth_key_name = auth_config.get("key_name", "X-Api-Key")
                if not auth_key_name:
                    raise ValueError(
                        "key_name is required when auth type is 'apikey'"
                    )
                self.logger.info(f"Using API Key authentication with header: {auth_key_name}")
            elif auth_type == "bearer":
                self.logger.info("Using Bearer token authentication")
        
        self.logger.info(f"Initializing HTTP adapter for: {base_url}")
        
        return HttpSubmodelAdapter(
            base_url=base_url,
            api_path=api_path,
            auth_type=auth_type,
            auth_token=auth_token if auth_enabled else None,
            auth_key_name=auth_key_name,
            timeout=timeout,
            verify_ssl=verify_ssl
        )

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

    def _get_filesystem_path(self, semantic_id: str, submodel_id: UUID) -> tuple[str, str]:
        """Get filesystem path components for a submodel.
        
        Args:
            semantic_id: Semantic ID of the submodel.
            submodel_id: UUID of the submodel.
        
        Returns:
            Tuple of (directory_hash, file_path).
        """
        sha256_semantic_id = sha256(semantic_id.encode()).hexdigest()
        file_path = f"{sha256_semantic_id}/{submodel_id}.json"
        return sha256_semantic_id, file_path

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
        
        # Use HTTP adapter with semantic IDs
        if self.adapter_mode == "http" and isinstance(self.adapter, HttpSubmodelAdapter):
            if operation == OperationType.READ:
                return self.adapter.read_submodel(semantic_id, submodel_id)
            elif operation == OperationType.WRITE:
                self.adapter.write_submodel(semantic_id, submodel_id, payload)
                self.logger.info(f"Submodel uploaded successfully to external service.")
                return None
            elif operation == OperationType.DELETE:
                self.adapter.delete_submodel(semantic_id, submodel_id)
                self.logger.info("Submodel deleted successfully from external service.")
                return None
        
        # Filesystem adapter with hashed paths
        sha256_id, file_path = self._get_filesystem_path(semantic_id, submodel_id)
        
        # Cache semantic_id if using HTTP adapter
        if isinstance(self.adapter, HttpSubmodelAdapter):
            self.adapter.cache_semantic_id(sha256_id, semantic_id)
        
        if operation == OperationType.READ:
            if not self.adapter.exists(file_path):
                self.logger.error(f"Submodel file not found: {file_path}")
                raise NotFoundError(f"Submodel file not found: {file_path}")
            return self.adapter.read(file_path)
        
        elif operation == OperationType.WRITE:
            if not self.adapter.exists(sha256_id):
                self.adapter.create_directory(sha256_id)
            self.adapter.write(file_path, payload)
            self.logger.info("Submodel uploaded successfully.")
            return None
        
        elif operation == OperationType.DELETE:
            if not self.adapter.exists(file_path):
                self.logger.error(f"Submodel file not found: {file_path}")
                raise NotFoundError(f"Submodel file not found: {file_path}")
            self.adapter.delete(file_path)
            self.logger.info("Submodel deleted successfully.")
            return None

    def upload_twin_aspect_document(
        self,
        submodel_id: UUID,
        semantic_id: str,
        payload: Dict[str, Any]
    ) -> None:
        """Upload a submodel to the service."""
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
        """Get a submodel from the service."""
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
        """Delete a submodel from the service."""
        self._execute_submodel_operation(
            OperationType.DELETE,
            submodel_id,
            semantic_id
        )
