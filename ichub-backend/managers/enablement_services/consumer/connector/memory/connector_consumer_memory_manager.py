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

## Code originally from `industry-flag-service`
## License: Apache-2.0
## Source Code: https://github.com/eclipse-tractusx/tractusx-sdk-services/blob/feature/industry-flag-service/industry-flag-service/backend/managers/edcManager.py
## Renamed as ConnectorConsumerManager

import threading
from tractusx_sdk.dataspace.services.discovery import ConnectorDiscoveryService
from tractusx_sdk.dataspace.services.connector import BaseConnectorConsumerService
from tractusx_sdk.dataspace.tools import op
from managers.enablement_services.consumer.base_connector_consumer_manager import BaseConnectorConsumerManager
from typing import List, Dict, Optional
import copy
import logging

class ConnectorConsumerMemoryManager(BaseConnectorConsumerManager):
    """
    Memory-based implementation of connector consumer management.
    
    This class provides in-memory caching of connector information with
    time-based expiration for Business Partner Numbers (BPNs). Extends
    the base connector consumer manager interface.
    """ 
    
    ## Declare variables
    known_connectors: Dict
    catalog_timeout: int
    logger: logging.Logger
    verbose: bool

    def __init__(self, 
                 connector_consumer_service: BaseConnectorConsumerService,
                 connector_discovery: ConnectorDiscoveryService, 
                 expiration_time: int = 60, 
                 logger: logging.Logger = None, 
                 verbose: bool = False):
        """
        Initialize the memory-based connector consumer manager.
        
        Args:
            connector_consumer_service (BaseConnectorConsumerService): The connector consumer service instance.
            connector_discovery (ConnectorDiscoveryService): Service for discovering connectors
            expiration_time (int, optional): Cache expiration time in minutes. Defaults to 60.
            logger (logging.Logger, optional): Logger instance
            verbose (bool, optional): Verbose flag
        """
        super().__init__(connector_consumer_service, connector_discovery, expiration_time)
        self.known_connectors = {}
        self.logger = logger if logger else None
        self.verbose = verbose
        self._lock = threading.RLock()
        
    def add_connectors(self, bpn: str, connectors: List[str]) -> None:
        """
        Add connectors to the in-memory cache for a specific BPN.
        
        Implements time-based caching with automatic expiration. If connectors
        for the BPN already exist and haven't expired, no update is performed.
        
        Args:
            bpn (str): The Business Partner Number to associate connectors with
            connectors (List[str]): List of connector URLs/endpoints to cache
        """
        with self._lock:
            if bpn not in self.known_connectors:
                self.known_connectors[bpn] = {}

            # Always update the refresh interval timestamp
            self.known_connectors[bpn][self.REFRESH_INTERVAL_KEY] = op.get_future_timestamp(minutes=self.expiration_time)
            
            # Check if we already have valid connectors and the cache hasn't expired
            if(self.CONNECTOR_LIST_KEY in self.known_connectors[bpn]) and (len(self.known_connectors[bpn][self.CONNECTOR_LIST_KEY]) > 0):
                if(self.logger and self.verbose):
                    self.logger.debug(f"[CONNECTOR Manager] [{bpn}] CONNECTORs already cached, skipping update")
                return
            
            # Store the connectors under the specific key
            self.known_connectors[bpn][self.CONNECTOR_LIST_KEY] = connectors
            
            if(self.logger and self.verbose):
                self.logger.info(f"[CONNECTOR Manager] [{bpn}] Added [{len(self.known_connectors[bpn][self.CONNECTOR_LIST_KEY])}] CONNECTORs to the cache! Next refresh at [{op.timestamp_to_datetime(self.known_connectors[bpn][self.REFRESH_INTERVAL_KEY])}] UTC")
            
        return 
        
    def is_connector_known(self, bpn: str, connector: str) -> bool:
        """
        Check if a specific connector is known/cached for the given BPN.
        
        Args:
            bpn (str): The Business Partner Number to check
            connector (str): The connector URL/endpoint to verify
            
        Returns:
            bool: True if the connector is known for the BPN, False otherwise
        """
        with self._lock:
            if bpn not in self.known_connectors:
                return False

            if self.CONNECTOR_LIST_KEY not in self.known_connectors[bpn]:
                return False
                
            return connector in self.known_connectors[bpn][self.CONNECTOR_LIST_KEY]
    
    def get_connector_by_id(self, bpn: str, connector_id: str) -> Optional[str]:
        """
        Retrieve a specific connector by its ID for the given BPN.
        
        Note: Since we're using list-based storage, this method uses the connector URL as the ID.
        
        Args:
            bpn (str): The Business Partner Number
            connector_id (str): The connector URL (used as ID)
            
        Returns:
            Optional[str]: The connector URL/endpoint if found, None otherwise
        """
        with self._lock:
            if bpn not in self.known_connectors:
                return None

            if self.CONNECTOR_LIST_KEY not in self.known_connectors[bpn]:
                return None
            
        if connector_id in self.known_connectors[bpn][self.CONNECTOR_LIST_KEY]:
            return connector_id
            
        return None

    
    def get_known_connectors(self) -> Dict:
        """
        Retrieve all known connectors from the in-memory cache.
        
        Returns:
            Dict: Complete cache dictionary containing all BPNs and their associated connectors
        """
        with self._lock:
            return self.known_connectors

    def delete_connector(self, bpn: str, connector_id: str) -> Dict:
        """
        Remove a specific connector from the in-memory cache.
        
        Args:
            bpn (str): The Business Partner Number
            connector_id (str): The connector URL (used as ID) to remove
            
        Returns:
            Dict: Updated cache state after deletion
        """
        with self._lock:
            if bpn in self.known_connectors and self.CONNECTOR_LIST_KEY in self.known_connectors[bpn]:
                if connector_id in self.known_connectors[bpn][self.CONNECTOR_LIST_KEY]:
                    self.known_connectors[bpn][self.CONNECTOR_LIST_KEY].remove(connector_id)
                    if(self.logger and self.verbose):
                        self.logger.debug(f"[CONNECTOR Manager] [{bpn}] Removed connector [{connector_id}] from cache")
        return self.known_connectors
        
    def purge_bpn(self, bpn: str) -> None:
        """
        Remove all connectors associated with a specific BPN from the cache.
        
        Args:
            bpn (str): The Business Partner Number to purge from cache
        """
        with self._lock:
            del self.known_connectors[bpn]
            
    def purge_cache(self) -> None:
        """
        Clear the entire in-memory connector cache.
        
        Resets the cache to an empty state, removing all cached connectors
        for all BPNs.
        """
        with self._lock:
            self.known_connectors = {}


    def get_connectors(self, bpn: str) -> List[str]:
        """
        Retrieve connectors for a specific BPN, with automatic discovery if not cached.
        
        First checks the in-memory cache for existing connectors. If cache is empty
        or expired, uses the connector discovery service to find and cache new
        connectors for the given BPN.
        
        Args:
            bpn (str): The Business Partner Number to get connectors for
            
        Returns:
            List[str]: List of connector URLs/endpoints for the BPN
        """
        with self._lock:
            known_connectors: Dict = {}
            
            ## If the connectors are known then the cache is loaded
            if(bpn in self.known_connectors):
                known_connectors = copy.deepcopy(self.known_connectors[bpn])
            
            ## In case there is connectors, and the interval has not yet been reached
            if(known_connectors != {}) and (self.REFRESH_INTERVAL_KEY in known_connectors) and (self.CONNECTOR_LIST_KEY in known_connectors) and (not op.is_interval_reached(end_timestamp=known_connectors[self.REFRESH_INTERVAL_KEY])):
                if(self.logger and self.verbose):
                    self.logger.debug(f"[CONNECTOR Manager] [{bpn}] Returning [{len(self.known_connectors[bpn][self.CONNECTOR_LIST_KEY])}] CONNECTORs from cache. Next refresh at [{op.timestamp_to_datetime(self.known_connectors[bpn][self.REFRESH_INTERVAL_KEY])}] UTC")
                return self.known_connectors[bpn][self.CONNECTOR_LIST_KEY] ## Return the urls from the connectors
            
            if(self.logger and self.verbose):
                self.logger.info(f"[CONNECTOR Manager] No cached CONNECTOR were found, discoverying CONNECTORs for bpn [{bpn}]...")

            connectors: Optional[List[str]] = self.connector_discovery.find_connector_by_bpn(bpn=bpn)
            if(connectors is None or len(connectors) == 0):
                return []
            
            self.add_connectors(bpn=bpn, connectors=connectors)
        
        return connectors

    def _is_cache_expired(self, bpn: str) -> bool:
        """
        Check if cache for a specific BPN has expired.
        
        Implements the cache expiration logic by checking if the BPN exists
        in the cache and whether the refresh interval timestamp has been reached.
        
        Args:
            bpn (str): The Business Partner Number to check
            
        Returns:
            bool: True if cache is expired or doesn't exist, False otherwise
        """
        # If BPN is not in cache, consider it expired
        if bpn not in self.known_connectors:
            return True
        
        # If no refresh interval is set, consider it expired
        if self.REFRESH_INTERVAL_KEY not in self.known_connectors[bpn]:
            return True
        
        # Check if the refresh interval has been reached
        return op.is_interval_reached(self.known_connectors[bpn][self.REFRESH_INTERVAL_KEY])