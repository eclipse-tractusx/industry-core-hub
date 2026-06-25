#################################################################################
# Eclipse Tractus-X - Industry Core Hub Backend
#
# Copyright (c) 2025,2026 LKS Next
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

            # Step 3: Sync Digital Twin Event asset
            self._sync_digital_twin_event_asset()

            # Step 4: Sync Unique ID Push asset
            self._sync_unique_id_push_asset()

            # Step 5: Sync PCF Exchange asset if enabled
            if self._pcf_kit_enablement_check():
                self._sync_pcf_exchange_asset()

            # Step 5: Sync Company Certificate Management notification asset if enabled
            if self._ccm_kit_enablement_check():
                self._sync_ccm_asset()
            
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

    def _sync_digital_twin_event_asset(self) -> None:
        """
        Synchronize the Digital Twin Event asset with the connector.
        """
        try:
            logger.info("[AssetSyncJob] Synchronizing Digital Twin Event asset...")
            
            # Get DTE configuration
            dte_config = ConfigManager.get_config("provider.digitalTwinEventAPI")
            if not dte_config:
                logger.warning("[AssetSyncJob] No Digital Twin Event configuration found. Skipping DTE sync.")
                return
            
            asset_config = dte_config.get("asset_config", {})
            
            # Register DTE asset
            dte_asset_id, _, _, _ = self.connector_provider_manager.register_digital_twin_event_offer(
                digital_twin_event_url=dte_config.get("hostname"),
                digital_twin_event_policy_config=dte_config.get("policy"),
                existing_asset_id=asset_config.get("existing_asset_id", None)
            )
            
            if dte_asset_id:
                logger.info(f"[AssetSyncJob] Digital Twin Event asset synchronized: {dte_asset_id}")
            else:
                logger.error("[AssetSyncJob] Failed to synchronize Digital Twin Event asset.")
                
        except Exception as e:
            logger.error(f"[AssetSyncJob] Error synchronizing DTE asset: {e}", exc_info=True)

    def _sync_unique_id_push_asset(self) -> None:
        """
        Synchronize the Unique ID Push notification asset with the connector.
        """
        try:
            logger.info("[AssetSyncJob] Synchronizing Unique ID Push asset...")

            uid_config = ConfigManager.get_config("provider.uniqueIdPush")
            if not uid_config:
                logger.warning("[AssetSyncJob] No Unique ID Push configuration found. Skipping sync.")
                return

            asset_config = uid_config.get("asset_config", {})

            uid_asset_id, _, _, _ = self.connector_provider_manager.register_unique_id_push_offer(
                hostname=uid_config.get("hostname"),
                api_path=uid_config.get("apiPath", "/v1/uniqueidpush"),
                unique_id_push_policy_config=uid_config.get("policy"),
                existing_asset_id=asset_config.get("existing_asset_id", None),
                dct_type=asset_config.get(
                    "dct_type",
                    "https://w3id.org/catenax/taxonomy#UniqueIdPushConnectToParentNotification",
                ),
            )

            if uid_asset_id:
                logger.info(f"[AssetSyncJob] Unique ID Push asset synchronized: {uid_asset_id}")
            else:
                logger.error("[AssetSyncJob] Failed to synchronize Unique ID Push asset.")

        except Exception as e:
            logger.error(f"[AssetSyncJob] Error synchronizing Unique ID Push asset: {e}", exc_info=True)
    
    def _sync_ccm_asset(self) -> None:
        """
        Synchronize the Company Certificate Management (CX-0135) notification
        asset with the connector.

        Reads the ``provider.ccm`` configuration block. If the block is absent
        the step is skipped with a warning so that deployments that do not use
        the CCM add-on are not affected.
        """
        try:
            logger.info("[AssetSyncJob] Synchronizing CCM notification asset...")

            ccm_config = ConfigManager.get_config("provider.ccm")
            if not ccm_config:
                logger.warning(
                    "[AssetSyncJob] No 'provider.ccm' configuration found. "
                    "Skipping CCM asset sync."
                )
                return

            asset_config = ccm_config.get("asset_config", {})

            # Build the full notification endpoint URL from hostname + apiPath
            hostname = ccm_config.get("hostname", "").rstrip("/")
            api_path = ccm_config.get("apiPath", "").rstrip("/")
            ccm_notification_url = hostname + api_path

            ccm_asset_id, _, _, _ = self.connector_provider_manager.register_ccm_notification_offer(
                ccm_notification_url=ccm_notification_url,
                ccm_policy_config=ccm_config.get("policy"),
                existing_asset_id=asset_config.get("existing_asset_id"),
            )

            if ccm_asset_id:
                logger.info(f"[AssetSyncJob] CCM notification asset synchronized: {ccm_asset_id}")
            else:
                logger.error("[AssetSyncJob] Failed to synchronize CCM notification asset.")

        except Exception as e:
            logger.error(f"[AssetSyncJob] Error synchronizing CCM asset: {e}", exc_info=True)

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

    def _sync_pcf_exchange_asset(self) -> None:
        """
        Synchronize both PCF Exchange assets with the connector.

        CX-0136 §6 requires two EDC assets with the same ``dct:type``
        (``PCFExchange``) but different ``cx-common:version``:

        * **v1.2.0** → ``/footprintExchange`` endpoints (PCF v9.0.0)
        * **v1.1.1** → ``/productIds`` endpoints      (PCF v7.0.0)
        """
        try:
            logger.info("[AssetSyncJob] Synchronizing PCF Exchange assets...")
            
            # Get PCF Exchange configuration
            pcf_config = ConfigManager.get_config("provider.pcfExchange")
            if not pcf_config:
                logger.warning("[AssetSyncJob] No PCF Exchange configuration found. Skipping PCF Exchange sync.")
                return
            
            asset_config = pcf_config.get("asset_config", {})
            
            # --- v1.2.0 asset (/footprintExchange → PCF v9.0.0) ---
            pcf_asset_id, _, _, _ = self.connector_provider_manager.register_pcf_exchange_offer(
                base_url=pcf_config.get("hostname"),
                api_path="/v1/addons/pcf-kit/footprintExchange",
                pcf_exchange_policy_config=pcf_config.get("policy"),
                existing_asset_id=asset_config.get("existing_asset_id", None),
                version="1.2.0",
            )
            
            if pcf_asset_id:
                logger.info(f"[AssetSyncJob] PCF Exchange v1.2.0 asset synchronized: {pcf_asset_id}")
            else:
                logger.error("[AssetSyncJob] Failed to synchronize PCF Exchange v1.2.0 asset.")

            # --- v1.1.1 asset (/productIds → PCF v7.0.0) ---
            legacy_asset_id, _, _, _ = self.connector_provider_manager.register_pcf_exchange_offer(
                base_url=pcf_config.get("hostname"),
                api_path="/v1/addons/pcf-kit/productIds",
                pcf_exchange_policy_config=pcf_config.get("policy"),
                existing_asset_id=asset_config.get("existing_legacy_asset_id", None),
                version="1.1.1",
            )

            if legacy_asset_id:
                logger.info(f"[AssetSyncJob] PCF Exchange v1.1.1 (legacy) asset synchronized: {legacy_asset_id}")
            else:
                logger.error("[AssetSyncJob] Failed to synchronize PCF Exchange v1.1.1 (legacy) asset.")
                
        except Exception as e:
            logger.error(f"[AssetSyncJob] Error synchronizing PCF Exchange assets: {e}", exc_info=True)

    def _pcf_kit_enablement_check(self) -> bool:
        """
        Check if the PCF Kit enablement is active in the configuration.
        
        Returns:
            bool: True if PCF Kit is enabled, False otherwise.
        """
        try:
            pcf_config = ConfigManager.get_config("provider.pcfExchange", {})
            return pcf_config.get("enabled", False)
        except Exception as e:
            logger.error(f"[AssetSyncJob] Error checking PCF Kit enablement: {e}", exc_info=True)
            return False

    def _ccm_kit_enablement_check(self) -> bool:
        """
        Check if the CCM Kit enablement is active in the configuration.

        Returns:
            bool: True if CCM Kit is enabled (default), False otherwise.
        """
        try:
            ccm_config = ConfigManager.get_config("provider.ccm", {})
            return ccm_config.get("enabled", True)
        except Exception as e:
            logger.error(f"[AssetSyncJob] Error checking CCM Kit enablement: {e}", exc_info=True)
            return True
