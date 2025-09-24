#################################################################################
# Eclipse Tractus-X - Industry Core Hub Backend
#
# Copyright (c) 2025 CGI Deutschland B.V. & Co. KG
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

from abc import ABC, abstractmethod
from typing import TYPE_CHECKING, List, Dict, Optional
from tractusx_sdk.dataspace.services.discovery import ConnectorDiscoveryService
if TYPE_CHECKING:
    from managers.enablement_services.connector_manager import BaseConnectorConsumerManager

import hashlib

class BaseConnectorConsumerManager(ABC):
    """
    Abstract base class for managing connector discovery and caching.
    
    This class defines the interface for connector management, including
    connector discovery, caching mechanisms, and BPN-based connector retrieval.
    Implementations should provide concrete behavior for connector storage
    and cache management strategies.
    """
    connector_discovery: ConnectorDiscoveryService
    expiration_time: int
    connector_service: "BaseConnectorConsumerManager"
    REFRESH_INTERVAL_KEY: str
    CONNECTOR_LIST_KEY: str

    def __init__(self, connector_consumer_service: "BaseConnectorConsumerManager", connector_discovery: ConnectorDiscoveryService, expiration_time: int = 60):
        """
        Initialize the connector consumer manager.
        
        Args:
            connector_consumer_service (BaseConnectorConsumerService): The connector consumer service instance.
            connector_discovery (ConnectorDiscoveryService): Service for discovering connectors
            connection_manager (BaseConnectionManager): Connection manager for handling database connections
            expiration_time (int, optional): Cache expiration time in minutes. Defaults to 60.
        """
        self.connector_discovery = connector_discovery
        self.expiration_time = expiration_time
        self.REFRESH_INTERVAL_KEY = "refresh_interval"
        self.CONNECTOR_LIST_KEY = "connectors"
        self.connector_service = connector_consumer_service

    @abstractmethod
    def add_connectors(self, bpn: str, connectors: List[str]) -> None:
        """
        Add connectors to the cache for a specific Business Partner Number (BPN).
        
        This method should store the provided connectors associated with the given BPN,
        implementing appropriate caching logic including expiration handling.
        
        Args:
            bpn (str): The Business Partner Number to associate connectors with
            connectors (List[str]): List of connector URLs/endpoints to cache
            
        Returns:
            None
        """
        pass

    @abstractmethod
    def is_connector_known(self, bpn: str, connector: str) -> bool:
        """
        Check if a specific connector is known/cached for the given BPN.
        
        Args:
            bpn (str): The Business Partner Number to check
            connector (str): The connector URL/endpoint to verify
            
        Returns:
            bool: True if the connector is known for the BPN, False otherwise
        """
        pass

    @abstractmethod
    def get_connector_by_id(self, bpn: str, connector_id: str) -> Optional[str]:
        """
        Retrieve a specific connector by its ID for the given BPN.
        
        Args:
            bpn (str): The Business Partner Number
            connector_id (str): The unique identifier of the connector
            
        Returns:
            Optional[str]: The connector URL/endpoint if found, None otherwise
        """
        pass

    @abstractmethod
    def get_known_connectors(self) -> Dict:
        """
        Retrieve all known connectors from the cache.
        
        Returns:
            Dict: Complete cache dictionary containing all BPNs and their associated connectors
        """
        pass

    @abstractmethod
    def delete_connector(self, bpn: str, connector_id: str) -> Dict:
        """
        Remove a specific connector from the cache.
        
        Args:
            bpn (str): The Business Partner Number
            connector_id (str): The unique identifier of the connector to remove
            
        Returns:
            Dict: Updated cache state after deletion
        """
        pass

    @abstractmethod
    def purge_bpn(self, bpn: str) -> None:
        """
        Remove all connectors associated with a specific BPN from the cache.
        
        Args:
            bpn (str): The Business Partner Number to purge from cache
            
        Returns:
            None
        """
        pass

    @abstractmethod
    def purge_cache(self) -> None:
        """
        Clear the entire connector cache.
        
        This method should remove all cached connectors for all BPNs,
        effectively resetting the cache to an empty state.
        
        Returns:
            None
        """
        pass

    @abstractmethod
    def get_connectors(self, bpn: str) -> List[str]:
        """
        Retrieve connectors for a specific BPN, with automatic discovery if not cached.
        
        This method should first check the cache for existing connectors. If cache is empty
        or expired, it should use the connector discovery service to find and cache new
        connectors for the given BPN.
        
        Args:
            bpn (str): The Business Partner Number to get connectors for
            
        Returns:
            List[str]: List of connector URLs/endpoints for the BPN
        """
        pass

    def _is_cache_expired(self, bpn: str) -> bool:
        """
        Helper method to check if cache for a specific BPN has expired.
        
        This is a template method that implementations can override or use
        to determine cache expiration logic.
        
        Args:
            bpn (str): The Business Partner Number to check
            
        Returns:
            bool: True if cache is expired or doesn't exist, False otherwise
        """
        # This can be implemented by subclasses or remain as a helper
        return True

    def _generate_connector_id(self, connector: str) -> str:
        """
        Generate a unique identifier for a connector.
        
        This helper method can be used by implementations to create
        consistent connector IDs.
        
        Args:
            connector (str): The connector URL/endpoint
            
        Returns:
            str: Unique identifier for the connector
        """
        return hashlib.sha3_256(str(connector).encode('utf-8')).hexdigest()
