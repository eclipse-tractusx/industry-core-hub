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

import os
from pathlib import Path
from typing import Dict, Any
from uuid import UUID
from hashlib import sha256

from managers.config.config_manager import ConfigManager
from managers.config.log_manager import LoggingManager
from tools.exceptions import InvalidError, NotFoundError

from tractusx_sdk.industry.adapters.submodel_adapter_factory import SubmodelAdapterFactory
from tractusx_sdk.industry.adapters.submodel_adapters.file_system_adapter import FileSystemAdapter

class SubmodelServiceManager:
    """Manager for handling submodel service."""
    file_system: FileSystemAdapter
    logger = LoggingManager.get_logger(__name__)

    def __init__(self):
        submodel_service_path = ConfigManager.get_config("provider.submodel_dispatcher.path", default="/industry-core-hub/data/submodels")
        if not isinstance(submodel_service_path, str):
            raise ValueError(f"Expected 'submodel_service.path' to be a string, got: {type(submodel_service_path).__name__}")
        
        # Convert relative path to absolute path if needed
        if not os.path.isabs(submodel_service_path):
            submodel_service_path = os.path.abspath(submodel_service_path)
        
        # Ensure the directory exists and check permissions
        try:
            path_obj = Path(submodel_service_path)
            path_obj.mkdir(parents=True, exist_ok=True)
            
            # Check if we have write permissions using os.access()
            if not os.access(submodel_service_path, os.W_OK):
                raise PermissionError(f"No write permission for directory: {submodel_service_path}")
            
            self.logger.info(f"Submodel storage initialized at: {submodel_service_path}")
        except PermissionError as e:
            self.logger.error(f"Permission denied accessing submodel storage path: {submodel_service_path}")
            raise PermissionError(f"Cannot access submodel storage directory: {submodel_service_path}. Error: {e}")
        except Exception as e:
            self.logger.error(f"Failed to initialize submodel storage at {submodel_service_path}: {e}")
            raise RuntimeError(f"Failed to initialize submodel storage: {e}")
        
        self.file_system = SubmodelAdapterFactory.get_file_system(root_path=submodel_service_path)

    def upload_twin_aspect_document(self, submodel_id : UUID, semantic_id: str, payload: Dict[str, Any]):
        """Upload a submodel to the service."""
        # Implementation for uploading a submodel
        if not isinstance(submodel_id, UUID):
            try:
                submodel_id = UUID(submodel_id)
            except ValueError:
                raise InvalidError(f"Invalid UUID: {submodel_id}")
        sha256_semantic_id = sha256(semantic_id.encode()).hexdigest()
        if not self.file_system.exists(sha256_semantic_id):
            self.file_system.create_directory(sha256_semantic_id)
        submodel_path = f"{sha256_semantic_id}/{submodel_id}.json"
        self.file_system.write(submodel_path,payload)
        self.logger.info(f"Submodel with id=[{submodel_id}] and semanticId=[{semantic_id}] uploaded successfully.")

    def get_twin_aspect_document(self, submodel_id: UUID, semantic_id: str) -> Dict[str, Any]:
        """Get a submodel from the service."""
        # Implementation for retrieving a submodel
        if not isinstance(submodel_id, UUID):
            try:
                submodel_id = UUID(submodel_id)
            except ValueError:
                raise InvalidError(f"Invalid UUID: {submodel_id}")
        sha256_semantic_id = sha256(semantic_id.encode()).hexdigest()
        self.logger.info(f"Retrieving submodel with Global ID: {submodel_id}")
        self.logger.debug(f"Semantic ID: {semantic_id}")
        self.logger.debug(f"SHA256 Semantic ID: {sha256_semantic_id}")

        file_path = f"{sha256_semantic_id}/{submodel_id}.json"
        if not self.file_system.exists(file_path):
            self.logger.error(f"Submodel file not found: {file_path}")
            raise NotFoundError(f"Submodel file not found: {file_path}")
        content = self.file_system.read(file_path)
        return content

    def delete_twin_aspect_document(self, submodel_id: UUID, semantic_id: str) -> None:
        """Delete a submodel from the service."""
        if not isinstance(submodel_id, UUID):
            try:
                submodel_id = UUID(submodel_id)
            except ValueError:
                raise InvalidError(f"Invalid UUID: {submodel_id}")
        sha256_semantic_id = sha256(semantic_id.encode()).hexdigest()
        self.logger.info(f"Deleting submodel with Global ID: {submodel_id}")
        self.logger.debug(f"Semantic ID: {semantic_id}")
        self.logger.debug(f"SHA256 Semantic ID: {sha256_semantic_id}")
        
        file_path = f"{sha256_semantic_id}/{submodel_id}.json"
        if self.file_system.exists(file_path):
            self.file_system.delete(file_path)
            self.logger.info("Submodel deleted successfully.")
        else:
            self.logger.error(f"Submodel file not found: {file_path}")
            raise NotFoundError(f"Submodel file not found: {file_path}")
