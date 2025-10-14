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
from typing import List, Dict, Optional, TYPE_CHECKING
import json
from datetime import datetime
from abc import abstractmethod
from sqlmodel import select, delete, Session, SQLModel
from sqlalchemy.exc import SQLAlchemyError
import logging
from ..memory import DtrConsumerMemoryManager
from tractusx_sdk.dataspace.tools import op
from sqlalchemy.engine import Engine as E
from sqlalchemy.orm import Session as S
from models.metadata_database.consumer.models import KnownDtrs

if TYPE_CHECKING:
    from managers.enablement_services.connector_manager import BaseConnectorConsumerManager

class DtrConsumerPostgresMemoryManager(DtrConsumerMemoryManager):
    """
    DTR manager for storing and synchronizing DTR data between memory and a Postgres database.
    Inherits from DtrConsumerMemoryManager to maintain an in-memory cache and extends it with persistent storage functionality.
    """

    def __init__(self, engine: E | S, connector_consumer_manager: 'BaseConnectorConsumerManager', expiration_time:int=3600, table_name="known_dtrs", dtrs_key="dtrs", logger:logging.Logger=None, verbose:bool=False, dct_type_id="dct:type", dct_type_key:str="'http://purl.org/dc/terms/type'.'@id'", operator:str="=", dct_type:str="https://w3id.org/catenax/taxonomy#DigitalTwinRegistry"):
        """
        Initialize the Postgres memory-backed DTR manager.

        Args:
            engine: SQLAlchemy engine or session for database operations.
            connector_consumer_manager: Connector manager with consumer capabilities.
            table_name: Name of the database table for storing DTR data.
            dtrs_key: Key used to store DTR data within known_dtrs.
            logger: Optional logger instance for debug output.
            verbose: Flag for enabling verbose logging.
        """
        # Initialize base memory DTR manager and configure database.
        # Dynamically define the SQLModel table for DTR data.
        # Load existing data from the database into memory.
        super().__init__(connector_consumer_manager=connector_consumer_manager, expiration_time=expiration_time, logger=logger, verbose=verbose, dct_type_id=dct_type_id, dct_type_key=dct_type_key, operator=operator, dct_type=dct_type)
        self.engine = engine
        self.table_name = table_name
        self.dtrs_key = dtrs_key
        self._save_thread = None
        self._last_saved_hash = None
        SQLModel.metadata.create_all(engine)
        class DynamicKnownDtrs(KnownDtrs, table=True):
            __tablename__ = table_name
            __table_args__ = {"extend_existing": True}

        self.KnownDtrsModel = DynamicKnownDtrs
        DynamicKnownDtrs.metadata.create_all(engine)
        self._load_from_db()

    def add_dtr(self, bpn: str, connector_url: str, asset_id: str, policies: List[str]) -> None:
        """
        Add DTR to the cache for a specific Business Partner Number (BPN).
        
        This method should store the provided DTR data associated with the given BPN,
        implementing appropriate caching logic including expiration handling.
        
        Args:
            bpn (str): The Business Partner Number to associate DTR with
            edc_url (str): URL of the EDC where the DTR is stored
            asset_id (str): Asset ID of the DTR
            policies (List[str]): List of policies for this DTR
            
        Returns:
            None
        """
        super().add_dtr(bpn, connector_url, asset_id, policies)  # Call the base class method to handle in-memory caching
        self._trigger_save()

    def delete_dtr(self, bpn: str, asset_id: str) -> Dict:
        """
        Remove a specific DTR from the cache.
        
        Args:
            bpn (str): The Business Partner Number
            asset_id (str): The asset ID of the DTR to remove
            
        Returns:
            Dict: Updated cache state after deletion
        """
        super().delete_dtr(bpn, asset_id)
        self._trigger_save()
        return self.known_dtrs

    
    def purge_bpn(self, bpn: str) -> None:
        """
        Remove all DTRs associated with a specific BPN from the cache.
        
        Args:
            bpn (str): The Business Partner Number to purge from cache
            
        Returns:
            None
        """
        super().purge_bpn(bpn)
        self._trigger_save()

    
    def purge_cache(self) -> None:
        """
        Clear the entire DTR cache.
        
        This method should remove all cached DTRs for all BPNs,
        effectively resetting the cache to an empty state.
        
        Returns:
            None
        """
        super().purge_cache()
        self._trigger_save()


    def _trigger_save(self):
        """
        Trigger a background thread to persist current DTR data to the database.
        Skips if a save is already in progress.
        """
        if self._save_thread and self._save_thread.is_alive():
            return
        self._save_thread = threading.Thread(target=self._save_to_db, daemon=True)
        self._save_thread.start()
        
    def _load_from_db(self):
        """
        Reload known_dtrs from the DB and restore them to memory.
        """
        with self._dtrs_lock:
            try:
                loaded_dtrs = 0
                with Session(self.engine) as session:
                    result = session.exec(select(self.KnownDtrsModel)).all()
                    
                    # Store current state to compare for changes
                    old_dtrs = self.known_dtrs.copy()
                    
                    # Clear current known_dtrs
                    self.known_dtrs = {}
                    
                    for row in result:
                        bpn = row.bpnl
                        edc_url = row.edc_url
                        asset_id = row.asset_id
                        policies = row.policies
                        expires_at = row.expires_at
                        
                        # Convert datetime back to timestamp for the SDK
                        timestamp = expires_at.timestamp()

                        # Initialize BPN structure if it doesn't exist
                        if bpn not in self.known_dtrs:
                            self.known_dtrs[bpn] = {
                                self.REFRESH_INTERVAL_KEY: timestamp,
                                self.DTR_DATA_KEY: {}
                            }
                        
                        # Update refresh interval to the latest timestamp
                        if timestamp > self.known_dtrs[bpn][self.REFRESH_INTERVAL_KEY]:
                            self.known_dtrs[bpn][self.REFRESH_INTERVAL_KEY] = timestamp
                        
                        # Add DTR using asset_id as key
                        self.known_dtrs[bpn][self.DTR_DATA_KEY][asset_id] = {
                            self.DTR_CONNECTOR_URL_KEY: edc_url,
                            self.DTR_ASSET_ID_KEY: asset_id,
                            self.DTR_POLICIES_KEY: policies
                        }
                        loaded_dtrs += 1

                # Only log if there's a change in the data
                new_hash = hashlib.sha256(json.dumps(self.known_dtrs, sort_keys=True, default=str).encode()).hexdigest()
                if self.logger and self.verbose and (self._last_saved_hash is None or new_hash != self._last_saved_hash):
                    self.logger.info(f"[DtrConsumerPostgresMemoryManager] Loaded {loaded_dtrs} DTR entries from the database.")
                    
                self._last_saved_hash = new_hash
            except SQLAlchemyError as e:
                if self.logger and self.verbose:
                    self.logger.error(f"[DtrConsumerPostgresMemoryManager] Error loading from db: {e}")
          
    def _save_to_db(self):
        """
        Persist current in-memory known_dtrs to the DB only if changes are detected.
        """
        with self._dtrs_lock:
            current_hash = hashlib.sha256(json.dumps(self.known_dtrs, sort_keys=True, default=str).encode()).hexdigest()
            if current_hash == self._last_saved_hash:
                return
            try:
                saved_dtrs = 0
                with Session(self.engine) as session:
                    # Clear existing data
                    session.exec(delete(self.KnownDtrsModel))
                    
                    # Save each BPN's DTR data
                    for bpn, bpn_data in self.known_dtrs.items():
                        if self.DTR_DATA_KEY in bpn_data and self.REFRESH_INTERVAL_KEY in bpn_data:
                            # Convert timestamp to datetime object instead of using the formatted string
                            timestamp = bpn_data[self.REFRESH_INTERVAL_KEY]
                            expires_at = datetime.fromtimestamp(timestamp)
                            dtr_dict = bpn_data[self.DTR_DATA_KEY]
                            
                            # Iterate through all DTRs for this BPN (now a dictionary keyed by asset_id)
                            if isinstance(dtr_dict, dict):
                                for asset_id, dtr_data in dtr_dict.items():
                                    if dtr_data is not None:
                                        session.add(self.KnownDtrsModel(
                                            bpnl=bpn,
                                            edc_url=dtr_data[self.DTR_CONNECTOR_URL_KEY],
                                            asset_id=dtr_data[self.DTR_ASSET_ID_KEY],
                                            policies=dtr_data[self.DTR_POLICIES_KEY],
                                            expires_at=expires_at
                                        ))
                                        saved_dtrs += 1
                                    
                    session.commit()
                    self._last_saved_hash = current_hash
                    if self.logger and self.verbose:
                        self.logger.info(f"[DtrConsumerPostgresMemoryManager] Saved {saved_dtrs} DTR entries to the database.")
            except SQLAlchemyError as e:
                if self.logger and self.verbose:
                    self.logger.error(f"[DtrConsumerPostgresMemoryManager] Error saving to db: {e}")

    def stop(self):
        """
        Stop the background thread and perform a final save to the database.
        """
        if self._save_thread:
            self._save_thread.join()
        self._save_to_db()
