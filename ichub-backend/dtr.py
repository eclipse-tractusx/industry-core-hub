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

from managers.enablement_services import DtrManager

from managers.enablement_services.consumer import DtrConsumerSyncPostgresMemoryManager
from managers.enablement_services.provider import DtrProviderManager

import logging

logger = logging.getLogger("connector")
logger.setLevel(logging.INFO)

from connector import connector_manager
from database import engine
from managers.config.config_manager import ConfigManager

# Get DTR discovery configuration parameters
dtr_dct_type_id = ConfigManager.get_config('consumer.discovery.digitalTwinRegistry.dct_type_key')
dtr_filter_operand_left = ConfigManager.get_config('consumer.discovery.digitalTwinRegistry.dct_type_filter.operandLeft')
dtr_filter_operator = ConfigManager.get_config('consumer.discovery.digitalTwinRegistry.dct_type_filter.operator')
dtr_dct_type = ConfigManager.get_config('consumer.discovery.digitalTwinRegistry.dct_type_filter.operandRight')

dtr_consumer_manager = DtrConsumerSyncPostgresMemoryManager(
    engine=engine,
    connector_consumer_manager=connector_manager.consumer,
    logger=logger,
    verbose=True,
    dct_type_id=dtr_dct_type_id,
    dct_type_key=dtr_filter_operand_left,
    operator=dtr_filter_operator,
    dct_type=dtr_dct_type
)

"""
Currently only one digital twin registry is supported from the provider side.
"""
dtr_hostname = ConfigManager.get_config('provider.digitalTwinRegistry.hostname')
dtr_uri = ConfigManager.get_config('provider.digitalTwinRegistry.uri')
dtr_lookup_uri = ConfigManager.get_config('provider.digitalTwinRegistry.lookupUri')
dtr_api_path = ConfigManager.get_config('provider.digitalTwinRegistry.apiPath')
dtr_url = f"{dtr_hostname}{dtr_uri}"
dtr_lookup_url = f"{dtr_hostname}{dtr_lookup_uri}"

dtr_provider_manager = DtrProviderManager(
    dtr_url=dtr_url, dtr_lookup_url=dtr_lookup_url,
    api_path=str(dtr_api_path),
    connector_controlplane_hostname=ConfigManager.get_config("provider.connector.controlplane.hostname"),
    connector_controlplane_catalog_path=ConfigManager.get_config("provider.connector.controlplane.protocolPath"),
    connector_dataplane_hostname=ConfigManager.get_config("provider.connector.dataplane.hostname"),
    connector_dataplane_public_path=ConfigManager.get_config("provider.connector.dataplane.publicPath")
)

from utils.async_utils import AsyncManagerWrapper

dtr_manager = DtrManager(
    dtr_consumer_manager=dtr_consumer_manager,
    dtr_provider_manager=dtr_provider_manager
)

# Create universal async wrappers - works with any manager!
async_dtr_consumer = AsyncManagerWrapper(dtr_manager.consumer, "DTRConsumer")
async_dtr_provider = AsyncManagerWrapper(dtr_manager.provider, "DTRProvider")  


