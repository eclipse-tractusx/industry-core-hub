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

import logging
from managers.config.config_manager import ConfigManager
from managers.config.log_manager import LoggingManager
from managers.enablement_services.provider import ConnectorProviderManager

logger = LoggingManager.get_logger(__name__)


class AssetSyncJob:
    """
    Kubernetes Job that synchronizes EDC assets (Digital Twin Registry and Semantic assets) 
    from the database/configuration to the connector.
    
    This ensures all assets are registered in the connector before any sharing operations occur.
    Designed to run as a standalone Kubernetes Job/CronJob.
    """
    
    def __init__(self, connector_provider_manager: ConnectorProviderManager, enabled: bool = True):
        """
        Initialize the asset sync job.
        
        Args:
            connector_provider_manager: The connector provider manager instance
            enabled (bool): Whether the sync job is enabled. Defaults to True.
        """
        self.connector_provider_manager = connector_provider_manager
        self.enabled = enabled
        
    def run(self) -> None:
        """
        Execute the synchronization process.
        
        Runs synchronously - designed for Kubernetes Job execution.
        """
        if not self.enabled:
            logger.info("[AssetSyncJob] Asset synchronization is disabled.")
            return
        
        try:
            logger.info("[AssetSyncJob] Starting asset synchronization...")
            
            # Step 1: Sync Digital Twin Registry asset
            self._sync_dtr_asset()
            
            # Step 2: Sync all semantic assets from agreements configuration
            self._sync_semantic_assets()
            
            logger.info("[AssetSyncJob] Asset synchronization completed successfully.")
            
        except Exception as e:
            logger.error(f"[AssetSyncJob] Asset synchronization failed: {e}", exc_info=True)
            raise  # Re-raise to signal failure to Kubernetes
    
    def _sync_dtr_asset(self) -> None:
        """
        Synchronize the Digital Twin Registry asset with the connector.
        """
        try:
            logger.info("[AssetSyncJob] Synchronizing Digital Twin Registry asset...")
            
            # Get DTR configuration
            dtr_config = ConfigManager.get_config("provider.digitalTwinRegistry")
            if not dtr_config:
                logger.warning("[AssetSyncJob] No Digital Twin Registry configuration found. Skipping DTR sync.")
                return
            
            asset_config = dtr_config.get("asset_config", {})
            
            # Register DTR asset
            dtr_asset_id, _, _, _ = self.connector_provider_manager.register_dtr_offer(
                base_dtr_url=dtr_config.get("hostname"),
                uri=dtr_config.get("uri"),
                api_path=dtr_config.get("apiPath"),
                dtr_policy_config=dtr_config.get("policy"),
                dct_type=asset_config.get("dct_type", "https://w3id.org/catenax/taxonomy#DigitalTwinRegistry"),
                existing_asset_id=asset_config.get("existing_asset_id", None)
            )
            
            if dtr_asset_id:
                logger.info(f"[AssetSyncJob] Digital Twin Registry asset synchronized: {dtr_asset_id}")
            else:
                logger.error("[AssetSyncJob] Failed to synchronize Digital Twin Registry asset.")
                
        except Exception as e:
            logger.error(f"[AssetSyncJob] Error synchronizing DTR asset: {e}", exc_info=True)
    
    def _sync_semantic_assets(self) -> None:
        """
        Synchronize all semantic assets (PartTypeInformation, SerialPart, etc.) from agreements configuration.
        """
        try:
            logger.info("[AssetSyncJob] Synchronizing semantic assets...")
            
            # Get agreements configuration
            agreements = ConfigManager.get_config("agreements", [])
            if not agreements:
                logger.warning("[AssetSyncJob] No agreements configuration found. Skipping semantic asset sync.")
                return
            
            synced_count = 0
            failed_count = 0
            
            # Process each semantic ID from agreements
            for agreement in agreements:
                semantic_id = agreement.get("semanticid")
                if not semantic_id:
                    logger.warning("[AssetSyncJob] Agreement missing 'semanticid'. Skipping.")
                    continue
                
                try:
                    # Register the semantic asset
                    asset_id, _, _, _ = self.connector_provider_manager.register_submodel_bundle_circular_offer(
                        semantic_id=semantic_id
                    )
                    
                    if asset_id:
                        logger.info(f"[AssetSyncJob] Semantic asset synchronized: {semantic_id} -> {asset_id}")
                        synced_count += 1
                    else:
                        logger.error(f"[AssetSyncJob] Failed to synchronize semantic asset: {semantic_id}")
                        failed_count += 1
                        
                except Exception as e:
                    logger.error(f"[AssetSyncJob] Error synchronizing semantic asset {semantic_id}: {e}", exc_info=True)
                    failed_count += 1
            
            logger.info(f"[AssetSyncJob] Semantic asset sync complete. Synced: {synced_count}, Failed: {failed_count}")
            
        except Exception as e:
            logger.error(f"[AssetSyncJob] Error synchronizing semantic assets: {e}", exc_info=True)
