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

# TODO: Move to Tractus-X SDK if it can be generalized for any HTTP-based submodel service

from typing import Dict, Any, Optional
from uuid import UUID
from urllib.parse import quote
import httpx

from tractusx_sdk.industry.adapters import SubmodelAdapter
from managers.config.log_manager import LoggingManager
from tools.exceptions import InvalidError, NotFoundError
from tools.constants import JSON_EXTENSION


class HttpSubmodelAdapter(SubmodelAdapter):
    """
    HTTP adapter for external submodel services.
    
    This adapter connects to external ICHub-compatible services that expose
    submodels via REST API. It implements the SubmodelAdapter interface from
    the Tractus-X SDK to provide seamless integration.
    
    The adapter provides both path-based methods (required by the interface)
    and semantic-aware methods (recommended for HTTP operations).
    """
    
    logger = LoggingManager.get_logger(__name__)
    
    def __init__(
        self,
        base_url: str,
        api_path: str = "",
        auth_type: str = "apikey",
        auth_token: Optional[str] = None,
        auth_key_name: Optional[str] = None,
        timeout: int = 30,
        verify_ssl: bool = True
    ):
        """
        Initialize the HTTP submodel adapter.
        
        Args:
            base_url: Base URL of the external submodel service (e.g., "https://external-ichub.com")
            api_path: Optional API path prefix (e.g., "/api/v1")
            auth_type: Authentication type - "bearer" or "apikey" (default: "apikey")
            auth_token: Authentication token/key value
            auth_key_name: Header name for API key (e.g., "X-Api-Key"), required when auth_type="apikey"
            timeout: Request timeout in seconds (default: 30)
            verify_ssl: Whether to verify SSL certificates (default: True)
        """
        self.base_url = base_url.rstrip('/')
        self.api_path = api_path.rstrip('/') if api_path else ""
        self.auth_type = auth_type.lower()
        self.auth_token = auth_token
        self.auth_key_name = auth_key_name
        self.timeout = timeout
        self.verify_ssl = verify_ssl
        
        # Validate authentication configuration
        if self.auth_type not in ["bearer", "apikey", "none"]:
            raise ValueError(
                f"Invalid auth_type: {self.auth_type}. "
                f"Supported types: 'bearer', 'apikey', 'none'"
            )
        
        if self.auth_type == "apikey" and not self.auth_key_name:
            raise ValueError(
                "auth_key_name is required when auth_type='apikey'"
            )
        
        # Initialize HTTP client
        self.client = httpx.Client(
            timeout=timeout,
            verify=verify_ssl,
            follow_redirects=True
        )
        
        self.logger.info(f"HttpSubmodelAdapter initialized for {self.base_url}")
        if self.auth_type != "none":
            self.logger.info(f"Authentication type: {self.auth_type}")
        
        # Cache for semantic_id mapping (SHA256 hash -> original semantic_id)
        self._semantic_id_cache: Dict[str, str] = {}
    
    def _get_headers(self) -> Dict[str, str]:
        """Build HTTP headers including authentication if configured."""
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
        
        if self.auth_token:
            if self.auth_type == "bearer":
                headers["Authorization"] = f"Bearer {self.auth_token}"
            elif self.auth_type == "apikey" and self.auth_key_name:
                headers[self.auth_key_name] = self.auth_token
        
        return headers
    
    def _build_url(self, semantic_id: str, submodel_id: UUID) -> str:
        """
        Build the full URL for submodel operations.
        
        Args:
            semantic_id: Original semantic ID (not SHA256 hash)
            submodel_id: Submodel UUID
            
        Returns:
            Full URL for the submodel endpoint
        """
        # URL structure: {base_url}{api_path}/{semantic_id}/{submodel_id}/submodel
        encoded_semantic_id = quote(str(semantic_id), safe="")
        encoded_submodel_id = quote(str(submodel_id), safe="")
        url = (
            f"{self.base_url}{self.api_path}/{encoded_semantic_id}/"
            f"{encoded_submodel_id}/submodel"
        )
        return url
    
    def _handle_response(self, response: httpx.Response, operation: str) -> Any:
        """
        Handle HTTP response and map status codes to appropriate exceptions.
        
        Args:
            response: HTTP response object
            operation: Operation name for logging (e.g., "read", "write", "delete")
            
        Returns:
            Response JSON content if applicable
            
        Raises:
            NotFoundError: For 404 responses
            InvalidError: For 400, 422 responses
            PermissionError: For 401, 403 responses
            RuntimeError: For 5xx server errors
        """
        status = response.status_code
        
        # Success cases
        if status in (200, 201, 204):
            self.logger.info(f"HTTP {operation} successful: {status}")
            if status == 204 or not response.content:
                return None
            try:
                return response.json()
            except Exception as e:
                self.logger.warning(f"Failed to parse JSON response: {e}")
                return None
        
        # Error cases - map to ICHub exceptions
        error_msg = f"HTTP {operation} failed with status {status}"
        try:
            error_detail = response.json()
            error_msg += f": {error_detail}"
        except Exception:
            error_msg += f": {response.text[:200]}"
        
        self.logger.error(error_msg)
        
        if status == 404:
            raise NotFoundError(f"Submodel not found: {error_msg}")
        elif status in (400, 422):
            raise InvalidError(f"Invalid request: {error_msg}")
        elif status in (401, 403):
            raise PermissionError(f"Authentication/Authorization failed: {error_msg}")
        elif status >= 500:
            raise RuntimeError(f"Server error: {error_msg}. Please retry later.")
        else:
            raise RuntimeError(f"Unexpected error: {error_msg}")

    def read_submodel(self, semantic_id: str, submodel_id: UUID) -> Dict[str, Any]:
        """
        Retrieve a submodel from the external service.
        
        Args:
            semantic_id: Original semantic ID
            submodel_id: Submodel UUID
            
        Returns:
            Submodel content as dictionary
            
        Raises:
            NotFoundError: If submodel doesn't exist
            RuntimeError: On connection or server errors
        """
        url = self._build_url(semantic_id, submodel_id)
        self.logger.info(f"GET {url}")
        
        try:
            response = self.client.get(url, headers=self._get_headers())
            return self._handle_response(response, "GET")
        except httpx.RequestError as e:
            error_msg = f"Connection error while reading submodel: {e}"
            self.logger.error(error_msg)
            raise RuntimeError(error_msg) from e

    def write_submodel(
        self,
        semantic_id: str,
        submodel_id: UUID,
        content: Dict[str, Any]
    ) -> None:
        """
        Upload/create a submodel in the external service.
        
        Args:
            semantic_id: Original semantic ID
            submodel_id: Submodel UUID
            content: Submodel data to upload
            
        Raises:
            InvalidError: If content is invalid
            RuntimeError: On connection or server errors
        """
        url = self._build_url(semantic_id, submodel_id)
        self.logger.info(f"POST {url}")
        
        try:
            response = self.client.post(
                url,
                json=content,
                headers=self._get_headers()
            )
            self._handle_response(response, "POST")
            self.logger.info(f"Submodel {submodel_id} uploaded successfully")
        except httpx.RequestError as e:
            error_msg = f"Connection error while writing submodel: {e}"
            self.logger.error(error_msg)
            raise RuntimeError(error_msg) from e
    
    def delete_submodel(self, semantic_id: str, submodel_id: UUID) -> None:
        """
        Delete a submodel from the external service.
        
        Args:
            semantic_id: Original semantic ID
            submodel_id: Submodel UUID
            
        Raises:
            NotFoundError: If submodel doesn't exist
            RuntimeError: On connection or server errors
        """
        url = self._build_url(semantic_id, submodel_id)
        self.logger.info(f"DELETE {url}")
        
        try:
            response = self.client.delete(url, headers=self._get_headers())
            self._handle_response(response, "DELETE")
            self.logger.info(f"Submodel {submodel_id} deleted successfully")
        except httpx.RequestError as e:
            error_msg = f"Connection error while deleting submodel: {e}"
            self.logger.error(error_msg)
            raise RuntimeError(error_msg) from e
    
    def exists_submodel(self, semantic_id: str, submodel_id: UUID) -> bool:
        """
        Check if a submodel exists in the external service.
        
        Args:
            semantic_id: Original semantic ID
            submodel_id: Submodel UUID
            
        Returns:
            True if submodel exists, False otherwise
        """
        url = self._build_url(semantic_id, submodel_id)
        self.logger.debug(f"HEAD {url}")
        
        try:
            # Try HEAD request first (more efficient)
            response = self.client.head(url, headers=self._get_headers())
            exists = response.status_code == 200
            self.logger.debug(f"Submodel exists check: {exists}")
            return exists
        except httpx.RequestError as e:
            self.logger.warning(f"Failed to check submodel existence: {e}")
            return False
    
    def read(self, path: str) -> Dict[str, Any]:
        """
        Read a submodel using path-based access.
        
        Path format: {sha256_semantic_id}/{submodel_id}.json
        
        Note: This method requires semantic_id to be cached or path must contain
        the original semantic_id. Use read_submodel() for direct HTTP operations.
        
        Args:
            path: Path to the submodel file
            
        Returns:
            Submodel content
            
        Raises:
            InvalidError: If semantic_id cannot be resolved from path
            NotFoundError: If submodel doesn't exist
        """
        self.logger.warning(
            f"Using path-based read() method. Consider using read_submodel() "
            f"for better HTTP adapter support. Path: {path}"
        )
        
        # Extract sha256_semantic_id and submodel_id from path
        # Path format: {sha256_semantic_id}/{submodel_id}.json
        parts = path.split('/')
        if len(parts) < 2:
            raise InvalidError(f"Invalid path format: {path}")
        
        sha256_semantic_id = parts[0]
        submodel_filename = parts[1]
        submodel_id_str = submodel_filename.replace(JSON_EXTENSION, '')
        
        try:
            submodel_id = UUID(submodel_id_str)
        except ValueError:
            raise InvalidError(f"Invalid submodel ID in path: {submodel_id_str}")
        
        # Try to get original semantic_id from cache
        semantic_id = self._semantic_id_cache.get(sha256_semantic_id)
        if not semantic_id:
            raise InvalidError(
                f"Cannot resolve semantic_id for SHA256 hash: {sha256_semantic_id}. "
                f"Use read_submodel() method instead or ensure semantic_id is cached."
            )
        
        return self.read_submodel(semantic_id, submodel_id)
    
    def write(self, path: str, content: Dict[str, Any]) -> None:
        """
        Write a submodel using path-based access.
        
        Path format: {sha256_semantic_id}/{submodel_id}.json
        
        Note: This method requires semantic_id to be cached or path must contain
        the original semantic_id. Use write_submodel() for direct HTTP operations.
        
        Args:
            path: Path to the submodel file
            content: Submodel data to write
            
        Raises:
            InvalidError: If semantic_id cannot be resolved from path
        """
        self.logger.warning(
            f"Using path-based write() method. Consider using write_submodel() "
            f"for better HTTP adapter support. Path: {path}"
        )
        
        # Extract components from path
        parts = path.split('/')
        if len(parts) < 2:
            raise InvalidError(f"Invalid path format: {path}")
        
        sha256_semantic_id = parts[0]
        submodel_filename = parts[1]
        submodel_id_str = submodel_filename.replace(JSON_EXTENSION, '')
        
        try:
            submodel_id = UUID(submodel_id_str)
        except ValueError:
            raise InvalidError(f"Invalid submodel ID in path: {submodel_id_str}")
        
        # Try to get original semantic_id from cache
        semantic_id = self._semantic_id_cache.get(sha256_semantic_id)
        if not semantic_id:
            raise InvalidError(
                f"Cannot resolve semantic_id for SHA256 hash: {sha256_semantic_id}. "
                f"Use write_submodel() method instead or ensure semantic_id is cached."
            )
        
        self.write_submodel(semantic_id, submodel_id, content)
    
    def delete(self, path: str) -> None:
        """
        Delete a submodel using path-based access.
        
        Path format: {sha256_semantic_id}/{submodel_id}.json
        
        Note: This method requires semantic_id to be cached. Use delete_submodel()
        for direct HTTP operations.
        
        Args:
            path: Path to the submodel file
            
        Raises:
            InvalidError: If semantic_id cannot be resolved from path
            NotFoundError: If submodel doesn't exist
        """
        self.logger.warning(
            f"Using path-based delete() method. Consider using delete_submodel() "
            f"for better HTTP adapter support. Path: {path}"
        )
        
        # Extract components from path
        parts = path.split('/')
        if len(parts) < 2:
            raise InvalidError(f"Invalid path format: {path}")
        
        sha256_semantic_id = parts[0]
        submodel_filename = parts[1]
        submodel_id_str = submodel_filename.replace(JSON_EXTENSION, '')
        
        try:
            submodel_id = UUID(submodel_id_str)
        except ValueError:
            raise InvalidError(f"Invalid submodel ID in path: {submodel_id_str}")
        
        # Try to get original semantic_id from cache
        semantic_id = self._semantic_id_cache.get(sha256_semantic_id)
        if not semantic_id:
            raise InvalidError(
                f"Cannot resolve semantic_id for SHA256 hash: {sha256_semantic_id}. "
                f"Use delete_submodel() method instead or ensure semantic_id is cached."
            )
        
        self.delete_submodel(semantic_id, submodel_id)
    
    def exists(self, path: str) -> bool:
        """
        Check if a submodel exists using path-based access.
        
        Path format: {sha256_semantic_id}/{submodel_id}.json
        
        Note: This method requires semantic_id to be cached. Use exists_submodel()
        for direct HTTP operations.
        
        Args:
            path: Path to the submodel file
            
        Returns:
            True if submodel exists, False otherwise
        """
        self.logger.debug(f"Checking existence for path: {path}")
        
        # Extract components from path
        parts = path.split('/')
        if len(parts) < 2:
            self.logger.warning(f"Invalid path format: {path}")
            return False
        
        sha256_semantic_id = parts[0]
        
        # For directory check (only sha256 hash)
        if len(parts) == 1:
            # HTTP adapter doesn't have directory concept
            # Return True assuming semantic_id exists
            return True
        
        submodel_filename = parts[1]
        submodel_id_str = submodel_filename.replace(JSON_EXTENSION, '')
        
        try:
            submodel_id = UUID(submodel_id_str)
        except ValueError:
            self.logger.warning(f"Invalid submodel ID in path: {submodel_id_str}")
            return False
        
        # Try to get original semantic_id from cache
        semantic_id = self._semantic_id_cache.get(sha256_semantic_id)
        if not semantic_id:
            self.logger.warning(
                f"Cannot resolve semantic_id for SHA256 hash: {sha256_semantic_id}"
            )
            return False
        
        return self.exists_submodel(semantic_id, submodel_id)

    def create_directory(self, path: str) -> None:
        """
        Create a directory (no-op for HTTP adapter).
        
        HTTP-based storage doesn't require explicit directory creation.
        This method is provided for interface compatibility.
        
        Args:
            path: Directory path (ignored)
        """
        self.logger.debug(f"create_directory called (no-op for HTTP): {path}")
    
    def cache_semantic_id(self, sha256_hash: str, semantic_id: str) -> None:
        """
        Cache semantic_id mapping for path-based operations.
        
        This allows the adapter to resolve original semantic_id from SHA256 hash
        when using path-based methods.
        
        Args:
            sha256_hash: SHA256 hash of semantic_id
            semantic_id: Original semantic_id string
        """
        self._semantic_id_cache[sha256_hash] = semantic_id
        self.logger.debug(f"Cached semantic_id mapping: {sha256_hash[:16]}... -> {semantic_id}")
    
    def __del__(self):
        """Cleanup HTTP client on adapter destruction."""
        try:
            if hasattr(self, 'client'):
                self.client.close()
                self.logger.debug("HTTP client closed")
        except Exception as e:
            self.logger.warning(f"Error closing HTTP client: {e}")
