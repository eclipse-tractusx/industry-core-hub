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
from typing import Dict, Any
from uuid import UUID
from hashlib import sha256
from enum import Enum

from managers.config.config_manager import ConfigManager
from managers.config.log_manager import LoggingManager
from tools.exceptions import InvalidError, NotFoundError

from tractusx_sdk.industry.adapters import SubmodelAdapter
from tractusx_sdk.industry.adapters.submodel_adapter_factory import SubmodelAdapterFactory, SubmodelAdapterType
from tractusx_sdk.industry.adapters.submodel_adapters.file_system_adapter import FileSystemAdapter
from tractusx_sdk.industry.adapters.submodel_adapters.http_submodel_adapter import HttpSubmodelAdapter
from tractusx_sdk.industry.adapters.submodel_adapters.s3_adapter import S3Adapter

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
            default="file_system"
        )
        
        if not isinstance(self.adapter_mode, str):
            raise ValueError(
                f"Expected 'provider.submodel_dispatcher.mode' to be a string, "
                f"got: {type(self.adapter_mode).__name__}"
            )
        
        self.adapter_mode = self.adapter_mode.lower()
        
        if self.adapter_mode not in SubmodelAdapterFactory.get_available_adapter_types():
            raise ValueError(
                f"Invalid adapter mode: {self.adapter_mode}. "
                f"Supported modes: {', '.join(SubmodelAdapterFactory.get_available_adapter_types())}"
            )
        
        # Initialize appropriate adapter based on mode
        if self.adapter_mode == "filesystem":
            self.adapter = self._initialize_filesystem_adapter()
        elif self.adapter_mode == "http":
            self.adapter = self._initialize_http_adapter()
        elif self.adapter_mode == "s3":
            self.adapter = self._initialize_s3_adapter()
        else:
            raise ValueError(f"Unsupported adapter mode: {self.adapter_mode}")
        
        self.logger.info(f"SubmodelServiceManager initialized with mode: {self.adapter_mode}")
    
    def _initialize_filesystem_adapter(self) -> FileSystemAdapter:
        """Initialize filesystem adapter for local storage."""
        submodel_service_path = ConfigManager.get_config(
            "provider.submodel_dispatcher.file_system.path",
            default="/industry-core-hub/data/submodels"
        )
        
        if not isinstance(submodel_service_path, str):
            raise ValueError(
                f"Expected 'provider.submodel_dispatcher.file_system.path' to be a string, "
                f"got: {type(submodel_service_path).__name__}"
            )
        
        path_pattern = ConfigManager.get_config(
            "provider.submodel_dispatcher.file_system.path_pattern",
            default="{base_path}/{semantic_id_hash}/{submodel_id}.json"
        )

        if not isinstance(path_pattern, str):
            raise ValueError(
                f"Expected 'provider.submodel_dispatcher.file_system.path_pattern' to be a string, "
                f"got: {type(path_pattern).__name__}"
            )

        try:
            return SubmodelAdapterFactory.from_config(SubmodelAdapterType.FILE_SYSTEM, {
                "root_path": submodel_service_path,
                "path_pattern": path_pattern
            })
        except Exception as e:
            self.logger.error("Failed to create FileSystemAdapter: %s", e)
            raise RuntimeError(f"Failed to initialize filesystem adapter: {e}") from e

    def _initialize_http_adapter(self) -> HttpSubmodelAdapter:
        """Initialize HTTP adapter for external submodel service."""
        http_config = ConfigManager.get_config("provider.submodel_dispatcher.http_submodel", default={})
        
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
        url_pattern = http_config.get("url_pattern", "{base_url}{api_path}/{semantic_id}/{submodel_id}/submodel")
        
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
        
        return SubmodelAdapterFactory.from_config(SubmodelAdapterType.HTTP_SUBMODEL, {
            "base_url": base_url,
            "api_path": api_path,
            "auth_type": auth_type,
            "auth_token": auth_token if auth_enabled else None,
            "auth_key_name": auth_key_name,
            "timeout": timeout,
            "verify_ssl": verify_ssl,
            "url_pattern": url_pattern
        })

    def _initialize_s3_adapter(self) -> S3Adapter:
        """Initialize S3 adapter for AWS S3 Storage."""
        s3_config = ConfigManager.get_config(
            "provider.submodel_dispatcher.s3", default={}
        )

        if not isinstance(s3_config, dict):
            raise ValueError(
                f"Expected 'provider.submodel_dispatcher.s3' to be a dict, "
                f"got: {type(s3_config).__name__}"
            )

        # Extract required configuration
        bucket_name = s3_config.get("bucket_name", "")
        if not bucket_name:
            raise ValueError(
                "Missing required configuration: provider.submodel_dispatcher.s3.bucket_name"
            )

        # Extract optional configuration with defaults
        # TODO: key_pattern should be configurable to allow different directory structures in the bucket, but default to a reasonable pattern that avoids too many files in a single directory
        key_pattern = s3_config.get("key_pattern", "")
        if not key_pattern:
            raise ValueError(
                "Missing required configuration: provider.submodel_dispatcher.s3.key_pattern"
            )
        
        region_name = s3_config.get("region_name", None)
        if not region_name:
            raise ValueError(
                "Missing required configuration: provider.submodel_dispatcher.s3.region_name"
            )

        endpoint_url = s3_config.get("endpoint_url", None) or None

        # Extract authentication configuration
        auth_config = s3_config.get("auth", {})
        auth_enabled = auth_config.get("enabled", False)
        aws_access_key_id = None
        aws_secret_access_key = None
        #TODO: Access key id and secret access key
        if auth_enabled:
            raw_access_key = auth_config.get("aws_access_key_id", "")
            raw_secret_key = auth_config.get("aws_secret_access_key", "")

            # Support environment variable substitution ($VAR or ${VAR})
            def resolve_env(value: str) -> str:
                if value.startswith("${") and value.endswith("}"):
                    env_var = value[2:-1]
                elif value.startswith("$"):
                    env_var = value[1:]
                else:
                    return value
                resolved = os.getenv(env_var, "")
                if not resolved:
                    self.logger.warning(
                        f"Environment variable {env_var} not set. "
                        f"S3 authentication may fail."
                    )
                return resolved

            aws_access_key_id = resolve_env(raw_access_key) or None
            aws_secret_access_key = resolve_env(raw_secret_key) or None

            if not aws_access_key_id or not aws_secret_access_key:
                self.logger.warning(
                    "S3 authentication enabled but credentials are incomplete. "
                    "Falling back to environment variables, IAM roles, or AWS config files."
                )
                aws_access_key_id = None
                aws_secret_access_key = None

        self.logger.info(f"Initializing S3 adapter for bucket: {bucket_name}")

        try:
            return (
                S3Adapter.builder()
                .bucket_name(bucket_name)
                .key_pattern(key_pattern)
                .region_name(region_name)
                .endpoint_url(endpoint_url)
                .aws_access_key_id(aws_access_key_id)
                .aws_secret_access_key(aws_secret_access_key)
                .build()
            )
        except Exception as e:
            self.logger.error("Failed to create S3Adapter: %s", e)
            raise RuntimeError(f"Failed to initialize S3 adapter: {e}") from e

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
        
        submodel_metadata = {
            "submodel_id": str(submodel_id),
            "semantic_id": semantic_id,
            "semantic_id_hash": self._hash_semantic_id(semantic_id),
        }
        
        if operation == OperationType.READ:
            if not self.adapter.exists(submodel_metadata):
                self.logger.error(f"Submodel file not found: {submodel_metadata}")
                raise NotFoundError(f"Submodel file not found: {submodel_metadata}")
            return self.adapter.read(submodel_metadata)
        
        elif operation == OperationType.WRITE:
            self.adapter.write_json(submodel_metadata, payload)
            self.logger.info("Submodel uploaded successfully.")
            return None
        
        elif operation == OperationType.DELETE:
            if not self.adapter.exists(submodel_metadata):
                self.logger.error(f"Submodel file not found: {submodel_metadata}")
                raise NotFoundError(f"Submodel file not found: {submodel_metadata}")
            self.adapter.delete(submodel_metadata)
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
