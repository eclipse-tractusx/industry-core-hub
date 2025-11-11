#################################################################################
# Eclipse Tractus-X - Industry Core Hub Backend
#
# Copyright (c) 2025 LKS Next
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
## Code created partially using a LLM and reviewed by a human committer

import sys
import logging
from pathlib import Path

# Add parent directory to path to import modules
sys.path.append(str(Path(__file__).resolve().parents[1]))
sys.dont_write_bytecode = True

from managers.config.log_manager import LoggingManager
from managers.config.config_manager import ConfigManager

LoggingManager.init_logging()
logger = LoggingManager.get_logger(__name__)

ConfigManager.load_config()

from database import engine, wait_for_db_connection
from tractusx_sdk.dataspace.services.connector import ServiceFactory
from managers.enablement_services.provider import ConnectorProviderManager
from jobs.asset_sync_job import AssetSyncJob


def run_asset_sync_job():
    """
    Run the asset synchronization job.
    
    This function initializes only the components needed for asset synchronization,
    without starting the full backend workflow (consumer, discovery, FastAPI, etc.).
    
    Returns:
        int: Exit code - 0 for success, 1 for failure.
    """
    connector_provider_manager = None
    
    try:
        logger.info("=" * 60)
        logger.info("Starting asset synchronization job...")
        logger.info("=" * 60)
        
        # Step 1: Wait for database connection
        logger.info("Step 1/3: Connecting to database...")
        try:
            wait_for_db_connection()
            logger.info("✓ Database connection established")
        except Exception as e:
            logger.error(f"✗ Database connection failed: {e}", exc_info=True)
            return 1
        
        # Step 2: Initialize provider connector service
        logger.info("Step 2/3: Initializing EDC connector service...")
        try:
            # Get provider connector configuration
            provider_connector_controlplane_hostname = ConfigManager.get_config("provider.connector.controlplane.hostname")
            provider_connector_controlplane_management_api = ConfigManager.get_config("provider.connector.controlplane.managementPath")
            provider_api_key_header = ConfigManager.get_config("provider.connector.controlplane.apiKeyHeader")
            provider_api_key = ConfigManager.get_config("provider.connector.controlplane.apiKey")
            provider_dataspace_version = ConfigManager.get_config("provider.connector.dataspace.version", default="jupiter")
            
            provider_connector_headers = {
                provider_api_key_header: provider_api_key,
                "Content-Type": "application/json"
            }
            
            # Create the connector provider service
            provider_connector_service = ServiceFactory.get_connector_provider_service(
                dataspace_version=provider_dataspace_version,
                base_url=provider_connector_controlplane_hostname,
                dma_path=provider_connector_controlplane_management_api,
                headers=provider_connector_headers,
                logger=logger,
                verbose=True
            )
            logger.info("✓ EDC connector service initialized")
            
        except Exception as e:
            logger.error(f"✗ Failed to initialize EDC connector service: {e}", exc_info=True)
            logger.error("  Check configuration: provider.connector.controlplane.*")
            return 1
        
        # Step 3: Initialize ConnectorProviderManager
        logger.info("Step 3/3: Initializing connector provider manager...")
        try:
            ichub_url = ConfigManager.get_config("hostname")
            agreements = ConfigManager.get_config("agreements")
            path_submodel_dispatcher = ConfigManager.get_config("provider.submodel_dispatcher.apiPath", default="/submodel-dispatcher")
            
            # Authorization configuration
            authorization_enabled = ConfigManager.get_config("authorization.enabled", True)
            backend_api_key = ConfigManager.get_config("authorization.api_key.key", "X-Api-Key")
            backend_api_key_value = ConfigManager.get_config("authorization.api_key.value")
            
            # Create the provider manager
            connector_provider_manager = ConnectorProviderManager(
                connector_provider_service=provider_connector_service,
                ichub_url=ichub_url,
                agreements=agreements,
                path_submodel_dispatcher=path_submodel_dispatcher,
                authorization=authorization_enabled,
                backend_api_key=backend_api_key,
                backend_api_key_value=backend_api_key_value
            )
            logger.info(f"✓ Connector provider manager initialized: {type(connector_provider_manager).__name__}")
            
        except Exception as e:
            logger.error(f"✗ Failed to initialize connector provider manager: {e}", exc_info=True)
            logger.error("  Check configuration: hostname, agreements, provider.submodel_dispatcher.*")
            return 1
        
        # Step 4: Create and run the sync job
        logger.info("=" * 60)
        logger.info("Running asset synchronization...")
        logger.info("=" * 60)
        
        sync_job = AssetSyncJob(
            connector_provider_manager=connector_provider_manager,
            enabled=True
        )
        
        sync_job.run()
        
        # If we reach here, sync was successful
        logger.info("=" * 60)
        logger.info("✓ Asset synchronization job completed successfully.")
        logger.info("=" * 60)
        return 0
            
    except Exception as e:
        logger.error("=" * 60)
        logger.error(f"✗ Asset synchronization job failed with exception: {e}", exc_info=True)
        logger.error("=" * 60)
        return 1


if __name__ == "__main__":
    exit_code = run_asset_sync_job()
    sys.exit(exit_code)
