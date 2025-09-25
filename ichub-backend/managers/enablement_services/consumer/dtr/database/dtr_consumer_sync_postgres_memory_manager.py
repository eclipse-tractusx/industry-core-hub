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

from .dtr_consumer_postgres_memory_manager import DtrConsumerPostgresMemoryManager
from sqlalchemy.engine import Engine as E
from sqlalchemy.orm import Session as S
import threading
import time
import logging
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from managers.enablement_services.connector_manager import BaseConnectorConsumerManager

class DtrConsumerSyncPostgresMemoryManager(DtrConsumerPostgresMemoryManager):
    """
    Manages DTR data using an in-memory cache synchronized with a Postgres database.
    Periodically persists changes and reloads updates from the database to ensure consistency.
    """
    def __init__(self, engine: E | S, connector_consumer_manager: 'BaseConnectorConsumerManager', persist_interval:int = 5, expiration_time:int=3600, table_name="known_dtrs", dtrs_key="dtrs", logger:logging.Logger=None, verbose:bool=False, dct_type_id="dct:type",dct_type_key:str="'http://purl.org/dc/terms/type'.'@id'", operator:str="=", dct_type:str="https://w3id.org/catenax/taxonomy#DigitalTwinRegistry"):
        """Initialize the DTR consumer synchronization manager.

        Args:
            engine (E | S): SQLAlchemy engine or session for database operations.
            connector_consumer_manager (BaseConnectorConsumerManager): Connector manager with consumer capabilities.
            persist_interval (int, optional): Interval for persisting changes to the database. Defaults to 5.
            expiration_time (int, optional): Time in seconds before a DTR is considered expired. Defaults to 3600.
            table_name (str, optional): Name of the database table for storing DTR data. Defaults to "known_dtrs".
            dtrs_key (str, optional): Key used to store DTR data within known_dtrs. Defaults to "dtrs".
            logger (logging.Logger, optional): Logger instance for debug output. Defaults to None.
            verbose (bool, optional): Flag for enabling verbose logging. Defaults to False.
        """
        super().__init__(connector_consumer_manager=connector_consumer_manager, expiration_time=expiration_time, logger=logger, verbose=verbose, table_name=table_name, dtrs_key=dtrs_key, engine=engine, dct_type_id=dct_type_id, dct_type_key=dct_type_key, operator=operator, dct_type=dct_type)
        self.persist_interval = persist_interval
        self._stop_event = threading.Event()
        self._start_background_tasks()

    def _start_background_tasks(self):
        """
        Start the background thread for periodic persistence and reloading from DB.
        """
        threading.Thread(target=self._persistence_loop, daemon=True).start()

    def _persistence_loop(self):
        """
        Periodically save current in-memory DTR data to DB and reload any changes.
        """
        while not self._stop_event.is_set():
            time.sleep(self.persist_interval)
            self._save_to_db()
            self._load_from_db()

    def stop(self):
        """
        Stop the background thread and perform a final save to the DB.
        """
        if self._save_thread:
            self._save_thread.join()
        self._stop_event.set()
        self._save_to_db()
