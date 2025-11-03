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

from .connector_consumer_postgres_memory_manager import ConsumerConnectorPostgresMemoryManager
from sqlalchemy.engine import Engine as E
from sqlalchemy.orm import Session as S
import threading
import time
import logging
from tractusx_sdk.dataspace.services.discovery import ConnectorDiscoveryService
from tractusx_sdk.dataspace.services.connector import BaseConnectorConsumerService

class ConsumerConnectorSyncPostgresMemoryManager(ConsumerConnectorPostgresMemoryManager):
    """
    Manages EDR connections using an in-memory cache synchronized with a Postgres database.
    Periodically persists changes and reloads updates from the database to ensure consistency.
    """
    def __init__(self, 
                 connector_consumer_service: BaseConnectorConsumerService,
                 engine: E | S, 
                 connector_discovery: ConnectorDiscoveryService, 
                 persist_interval: int = 5, 
                 expiration_time: int = 3600, 
                 table_name: str = "known_connectors", 
                 connectors_key: str = "connectors", 
                 logger: logging.Logger = None, 
                 verbose: bool = False):

        super().__init__(
            connector_consumer_service=connector_consumer_service,
            connector_discovery=connector_discovery, 
            expiration_time=expiration_time, 
            logger=logger, 
            verbose=verbose, 
            table_name=table_name, 
            connectors_key=connectors_key, 
            engine=engine
        )
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
        Periodically save current in-memory connections to DB and reload any changes.
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