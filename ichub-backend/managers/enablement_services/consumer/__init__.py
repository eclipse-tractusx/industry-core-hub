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


# Package-level variables
__author__ = 'Eclipse Tractus-X Contributors'
__license__ = "Apache License, Version 2.0"

from .base_connector_consumer_manager import BaseConnectorConsumerManager
from .base_dtr_consumer_manager import BaseDtrConsumerManager

from .connector.memory.connector_consumer_memory_manager import ConnectorConsumerMemoryManager
from .connector.database.connector_consumer_postgres_memory_manager import ConsumerConnectorPostgresMemoryManager
from .connector.database.connector_consumer_sync_postgres_memory_manager import ConsumerConnectorSyncPostgresMemoryManager

from .dtr.memory.dtr_consumer_memory_manager import DtrConsumerMemoryManager
from .dtr.database.dtr_consumer_postgres_memory_manager import DtrConsumerPostgresMemoryManager
from .dtr.database.dtr_consumer_sync_postgres_memory_manager import DtrConsumerSyncPostgresMemoryManager