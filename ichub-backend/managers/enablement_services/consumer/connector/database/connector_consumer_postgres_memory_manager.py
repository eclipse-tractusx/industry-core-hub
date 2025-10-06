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
## Code created partially using a LLM (GPT 4o) and reviewed by a human committer

import threading
import hashlib
from typing import List, Dict, Optional
import json
from datetime import datetime
from abc import abstractmethod
from sqlmodel import select, delete, Session, SQLModel
from sqlalchemy.exc import SQLAlchemyError
import logging
from ..memory import ConnectorConsumerMemoryManager
from tractusx_sdk.dataspace.services.discovery import ConnectorDiscoveryService
from tractusx_sdk.dataspace.services.connector import BaseConnectorConsumerService
from tractusx_sdk.dataspace.tools import op
from sqlalchemy.engine import Engine as E
from sqlalchemy.orm import Session as S
from models.metadata_database.consumer.models import KnownConnectors

class ConsumerConnectorPostgresMemoryManager(ConnectorConsumerMemoryManager):
    """
    Connection manager for storing and synchronizing EDR connections between memory and a Postgres database.
    Inherits from MemoryConnectionManager to maintain an in-memory cache and extends it with persistent storage functionality.
    """

    def __init__(self, 
                 connector_consumer_service: BaseConnectorConsumerService,
                 engine: E | S, 
                 connector_discovery: ConnectorDiscoveryService, 
                 expiration_time: int = 3600, 
                 table_name: str = "known_connectors", 
                 connectors_key: str = "connectors", 
                 logger: logging.Logger = None, 
                 verbose: bool = False):
        """
        Initialize the Postgres memory-backed connection manager.

        Args:
            connector_consumer_service (BaseConnectorConsumerService): The connector consumer service instance.
            engine: SQLAlchemy engine or session for database operations.
            connector_discovery (ConnectorDiscoveryService): Service for discovering connectors
            expiration_time (int, optional): Cache expiration time in minutes. Defaults to 3600.
            table_name: Name of the database table for storing EDR connections.
            connectors_key: Key used to store EDR counts within open_connections.
            logger: Optional logger instance for debug output.
            verbose: Flag for enabling verbose logging.
        """
        # Initialize base memory connection manager and configure database.
        # Dynamically define the SQLModel table for EDR connections.
        # Load existing data from the database into memory.
        super().__init__(
            connector_consumer_service=connector_consumer_service,
            connector_discovery=connector_discovery, 
            expiration_time=expiration_time, 
            logger=logger, 
            verbose=verbose
        )
        self.engine = engine
        self.table_name = table_name
        self.open_connections = {}
        self._stop_event = threading.Event()
        self.connectors_key = connectors_key
        self._save_thread = None
        self._last_saved_hash = None
        SQLModel.metadata.create_all(engine)
        class DynamicKnownConnectors(KnownConnectors, table=True):
            __tablename__ = table_name
            __table_args__ = {"extend_existing": True}

        self.KnownConnectorsModel = DynamicKnownConnectors
        DynamicKnownConnectors.metadata.create_all(engine)
        self._load_from_db()

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
        super().add_connectors(bpn, connectors)  # Call the base class method to handle in-memory caching
        self._trigger_save()

    def delete_connector(self, bpn: str, connector_id: str) -> Dict:
        """
        Remove a specific connector from the cache.
        
        Args:
            bpn (str): The Business Partner Number
            connector_id (str): The unique identifier of the connector to remove
            
        Returns:
            Dict: Updated cache state after deletion
        """
        super().delete_connector(bpn, connector_id)
        self._trigger_save()
        return self.known_connectors

    
    def purge_bpn(self, bpn: str) -> None:
        """
        Remove all connectors associated with a specific BPN from the cache.
        
        Args:
            bpn (str): The Business Partner Number to purge from cache
            
        Returns:
            None
        """
        super().purge_bpn(bpn)
        self._trigger_save()

    
    def purge_cache(self) -> None:
        """
        Clear the entire connector cache.
        
        This method should remove all cached connectors for all BPNs,
        effectively resetting the cache to an empty state.
        
        Returns:
            None
        """
        super().purge_cache()
        self._trigger_save()


    def _trigger_save(self):
        """
        Trigger a background thread to persist current connections to the database.
        Skips if a save is already in progress.
        """
        if self._save_thread and self._save_thread.is_alive():
            return
        self._save_thread = threading.Thread(target=self._save_to_db, daemon=True)
        self._save_thread.start()
        
    def _load_from_db(self):
        """
        Reload known_connectors from the DB and restore them to memory.
        """
        with self._lock:
            try:
                loaded_bpns = 0
                with Session(self.engine) as session:
                    result = session.exec(select(self.KnownConnectorsModel)).all()
                    
                    # Store current state to compare for changes
                    old_connectors = self.known_connectors.copy()
                    
                    # Clear current known_connectors
                    self.known_connectors = {}
                    
                    for row in result:
                        bpn = row.bpnl
                        connectors_list = row.connectors
                        expires_at = row.expires_at
                        
                        # Convert datetime back to timestamp for the SDK
                        timestamp = expires_at.timestamp()

                        self.known_connectors[bpn] = {
                            self.REFRESH_INTERVAL_KEY: timestamp,
                            self.CONNECTOR_LIST_KEY: connectors_list
                        }
                        loaded_bpns += 1

                # Only log if there's a change in the data
                new_hash = hashlib.sha256(json.dumps(self.known_connectors, sort_keys=True, default=str).encode()).hexdigest()
                if self.logger and self.verbose and (self._last_saved_hash is None or new_hash != self._last_saved_hash):
                    self.logger.info(f"[ConsumerConnectorPostgresMemoryManager] Loaded {loaded_bpns} BPN connector entries from the database.")
                    
                self._last_saved_hash = new_hash
            except SQLAlchemyError as e:
                if self.logger and self.verbose:
                    self.logger.error(f"[ConsumerConnectorPostgresMemoryManager] Error loading from db: {e}")
          
    def _save_to_db(self):
        """
        Persist current in-memory known_connectors to the DB only if changes are detected.
        """
        with self._lock:
            current_hash = hashlib.sha256(json.dumps(self.known_connectors, sort_keys=True, default=str).encode()).hexdigest()
            if current_hash == self._last_saved_hash:
                return
            try:
                saved_connectors = 0
                with Session(self.engine) as session:
                    # Clear existing data
                    session.exec(delete(self.KnownConnectorsModel))
                    
                    # Save each BPN's connector data
                    for bpn, bpn_data in self.known_connectors.items():
                        if self.CONNECTOR_LIST_KEY in bpn_data and self.REFRESH_INTERVAL_KEY in bpn_data:
                            # Convert timestamp to datetime object instead of using the formatted string
                            timestamp = bpn_data[self.REFRESH_INTERVAL_KEY]
                            expires_at = datetime.fromtimestamp(timestamp)
                            connectors_list = bpn_data[self.CONNECTOR_LIST_KEY]
                            
                            session.add(self.KnownConnectorsModel(
                                bpnl=bpn,
                                connectors=connectors_list,
                                expires_at=expires_at
                            ))
                            saved_connectors += 1
                                    
                    session.commit()
                    self._last_saved_hash = current_hash
                    if self.logger and self.verbose:
                        self.logger.info(f"[ConsumerConnectorPostgresMemoryManager] Saved {saved_connectors} BPN connector entries to the database.")
            except SQLAlchemyError as e:
                if self.logger and self.verbose:
                    self.logger.error(f"[ConsumerConnectorPostgresMemoryManager] Error saving to db: {e}")

    def stop(self):
        """
        Stop the background thread and perform a final save to the database.
        """
        if self._save_thread:
            self._save_thread.join()
        self._save_to_db()