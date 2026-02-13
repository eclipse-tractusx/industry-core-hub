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

from tractusx_sdk.dataspace.managers.connection import PostgresMemoryRefreshConnectionManager
from tractusx_sdk.dataspace.services.discovery import ConnectorDiscoveryService, DiscoveryFinderService
from tractusx_sdk.dataspace.services.connector import ServiceFactory, BaseConnectorService
from database import engine, wait_for_db_connection
from managers.enablement_services import ConnectorManager
from managers.enablement_services.provider import ConnectorProviderManager
from managers.config.config_manager import ConfigManager
from tractusx_sdk.dataspace.managers import OAuth2Manager

from managers.enablement_services.consumer import ConsumerConnectorSyncPostgresMemoryManager
import logging

logger = logging.getLogger("connector")
logger.setLevel(logging.INFO)

"""
Currently only one connector is supported from consumer/provider side.
"""
connector_start_up_error:bool = False
connection_manager:PostgresMemoryRefreshConnectionManager = None
connector_manager:ConnectorManager = None
provider_connector_service:BaseConnectorService = None
consumer_connector_service:BaseConnectorService = None
connector_provider_manager:ConnectorProviderManager = None
connector_consumer_manager:ConsumerConnectorSyncPostgresMemoryManager = None
connector_discovery_service:ConnectorDiscoveryService = None
discovery_finder_service:DiscoveryFinderService = None
discovery_oauth:OAuth2Manager = None
database_error:bool = False

try:

    # If the database is not ready, the backend should wait until the PostgreSQL service is fully available and accepting connections 
    wait_for_db_connection()

    # Create the connection manager for the provider
    connection_manager = PostgresMemoryRefreshConnectionManager(engine=engine, logger=logger, verbose=True)

    if not connection_manager:
        logger.critical("Failed to create PostgresMemoryRefreshConnectionManager. Your database is not connected or misconfigured.")
        database_error = True

    # Get configuration provider values
    provider_connector_controlplane_hostname = ConfigManager.get_config("provider.connector.controlplane.hostname")
    provider_connector_controlplane_management_api = ConfigManager.get_config("provider.connector.controlplane.managementPath")
    provider_api_key_header = ConfigManager.get_config("provider.connector.controlplane.apiKeyHeader")
    provider_api_key = ConfigManager.get_config("provider.connector.controlplane.apiKey")
    provider_dataspace_version = ConfigManager.get_config("provider.connector.dataspace.version", default="jupiter")


    ichub_url = ConfigManager.get_config("hostname")
    agreements = ConfigManager.get_config("agreements")
    path_submodel_dispatcher = ConfigManager.get_config("provider.submodel_dispatcher.apiPath", default="/submodel-dispatcher")

    provider_connector_controlplane_catalog_path=ConfigManager.get_config("provider.connector.controlplane.protocolPath"),
    provider_connector_dataplane_hostname=ConfigManager.get_config("provider.connector.dataplane.hostname"),
    provider_connector_dataplane_public_path=ConfigManager.get_config("provider.connector.dataplane.publicPath")


    # Authorization configuration
    authorization_enabled = ConfigManager.get_config("authorization.enabled", False)
    backend_api_key = ConfigManager.get_config("authorization.apiKey.key", "X-Api-Key")
    backend_api_key_value = ConfigManager.get_config("authorization.apiKey.value", "")

    # Create EDC headers
    provider_connector_headers = {
        provider_api_key_header: provider_api_key,
        "Content-Type": "application/json"
    }

    if(not database_error):
        # Create the connector provider service
        provider_connector_service:BaseConnectorService = ServiceFactory.get_connector_provider_service(
            dataspace_version=provider_dataspace_version,
            base_url=provider_connector_controlplane_hostname,
            dma_path=provider_connector_controlplane_management_api,
            headers=provider_connector_headers,
            logger=logger,
            verbose=True
        )

        # Create the provider manager
        connector_provider_manager = ConnectorProviderManager(
            connector_provider_service=provider_connector_service,
            ichub_url=ichub_url,
            agreements=agreements,
            connector_controlplane_hostname=provider_connector_controlplane_hostname,
            connector_controlplane_catalog_path=provider_connector_controlplane_catalog_path,
            connector_dataplane_hostname=provider_connector_dataplane_hostname,
            connector_dataplane_public_path=provider_connector_dataplane_public_path,
            path_submodel_dispatcher=path_submodel_dispatcher,
            authorization=authorization_enabled,
            backend_api_key=backend_api_key,
            backend_api_key_value=backend_api_key_value
        )
    
    
    discovery_oauth:OAuth2Manager = None

    try:
        discovery_oauth = OAuth2Manager(
            auth_url=ConfigManager.get_config("consumer.discovery.oauth.url"),
            realm=ConfigManager.get_config("consumer.discovery.oauth.realm"),
            clientid=ConfigManager.get_config("consumer.discovery.oauth.client_id"),
            clientsecret=ConfigManager.get_config("consumer.discovery.oauth.client_secret"),
        )
    except ConnectionError as ce:
        logger.critical(f"Failed to connect to the IAM instance for consumer discovery: {ce}")
        connector_start_up_error = True
    except Exception as e:
        logger.critical(f"An unexpected error occurred while setting up OAuth2Manager for consumer discovery: {e}")
        connector_start_up_error = True

    connector_discovery_service: ConnectorDiscoveryService = None
    discovery_finder_service: DiscoveryFinderService = None

    
    if discovery_oauth is not None and discovery_oauth.connected:

        discovery_finder_service = DiscoveryFinderService(
            url=ConfigManager.get_config("consumer.discovery.discovery_finder.url"),
            oauth=discovery_oauth
        )

        # Create the connector discovery service for the consumer
        connector_discovery_service = ConnectorDiscoveryService(
            oauth=discovery_oauth,
            discovery_finder_service=discovery_finder_service
        )
    else:
        logger.critical("OAuth2Manager is not connected. Cannot initialize ConnectorDiscoveryService. The application will not function correctly.")
        connector_start_up_error = True

    consumer_connector_controlplane_hostname = ConfigManager.get_config("consumer.connector.controlplane.hostname")
    consumer_connector_controlplane_management_api = ConfigManager.get_config("consumer.connector.controlplane.managementPath")
    consumer_api_key_header = ConfigManager.get_config("consumer.connector.controlplane.apiKeyHeader")
    consumer_api_key = ConfigManager.get_config("consumer.connector.controlplane.apiKey")
    consumer_dataspace_version = ConfigManager.get_config("consumer.connector.dataspace.version", default="jupiter")

    consumer_connector_headers = {
        consumer_api_key_header: consumer_api_key,
        "Content-Type": "application/json"
    }

    consumer_connector_service:BaseConnectorService = ServiceFactory.get_connector_consumer_service(
        dataspace_version=consumer_dataspace_version,
        base_url=consumer_connector_controlplane_hostname,
        dma_path=consumer_connector_controlplane_management_api,
        headers=consumer_connector_headers,
        connection_manager=connection_manager,
        logger=logger,
        verbose=True
    )


    # Create the consumer manager
    connector_consumer_manager = ConsumerConnectorSyncPostgresMemoryManager(
        connector_consumer_service=consumer_connector_service,
        engine=engine,
        connector_discovery=connector_discovery_service,
        expiration_time=60,  # 60 minutes cache expiration
        logger=logger,
        verbose=True
    )

    # Create the main connector manager
    connector_manager = ConnectorManager(
        connector_consumer_manager=connector_consumer_manager,
        connector_provider_manager=connector_provider_manager
    )
    
except Exception as e:
    logger.critical(f"An unexpected error occurred during connector setup: {e}")
    connector_start_up_error = True
    