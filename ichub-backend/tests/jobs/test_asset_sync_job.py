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

import unittest
from unittest.mock import Mock, patch
from jobs.asset_sync_job import AssetSyncJob


class TestAssetSyncJob(unittest.TestCase):
    """Test cases for the AssetSyncJob class."""

    def setUp(self):
        """Set up test fixtures."""
        self.mock_connector_manager = Mock()
        self.job = AssetSyncJob(
            connector_provider_manager=self.mock_connector_manager,
            enabled=True
        )

    def test_init_enabled(self):
        """Test job initialization when enabled."""
        self.assertTrue(self.job.enabled)
        self.assertEqual(self.job.connector_provider_manager, self.mock_connector_manager)

    def test_init_disabled(self):
        """Test job initialization when disabled."""
        job = AssetSyncJob(
            connector_provider_manager=self.mock_connector_manager,
            enabled=False
        )
        self.assertFalse(job.enabled)

    @patch('jobs.asset_sync_job.logger')
    def test_run_disabled(self, mock_logger):
        """Test that sync doesn't run when disabled."""
        job = AssetSyncJob(
            connector_provider_manager=self.mock_connector_manager,
            enabled=False
        )
        job.run()
        mock_logger.info.assert_any_call("[AssetSyncJob] Asset synchronization is disabled.")

    @patch('jobs.asset_sync_job.ConfigManager')
    def test_sync_dtr_asset_success(self, mock_config_manager):
        """Test successful DTR asset synchronization."""
        # Setup mock configuration
        mock_config_manager.get_config.return_value = {
            "hostname": "http://test-dtr",
            "uri": "/api",
            "apiPath": "/v3",
            "policy": {},
            "asset_config": {
                "dct_type": "https://w3id.org/catenax/taxonomy#DigitalTwinRegistry",
                "existing_asset_id": None
            }
        }
        
        # Setup mock connector manager response
        self.mock_connector_manager.register_dtr_offer.return_value = (
            "dtr-asset-id", "policy-id", "access-policy-id", "contract-id"
        )
        
        # Execute sync
        self.job._sync_dtr_asset()
        
        # Verify connector manager was called
        self.mock_connector_manager.register_dtr_offer.assert_called_once()

    @patch('jobs.asset_sync_job.ConfigManager')
    def test_sync_semantic_assets_success(self, mock_config_manager):
        """Test successful semantic assets synchronization."""
        # Setup mock configuration with agreements
        mock_config_manager.get_config.return_value = [
            {
                "semanticid": "urn:samm:io.catenax.part_type_information:1.0.0#PartTypeInformation",
                "usage": {},
                "access": {}
            },
            {
                "semanticid": "urn:samm:io.catenax.serial_part:3.0.0#SerialPart",
                "usage": {},
                "access": {}
            }
        ]
        
        # Setup mock connector manager response
        self.mock_connector_manager.register_submodel_bundle_circular_offer.return_value = (
            "asset-id", "policy-id", "access-policy-id", "contract-id"
        )
        
        # Execute sync
        self.job._sync_semantic_assets()
        
        # Verify connector manager was called for each semantic ID
        self.assertEqual(
            self.mock_connector_manager.register_submodel_bundle_circular_offer.call_count,
            2
        )

    @patch('jobs.asset_sync_job.ConfigManager')
    def test_sync_semantic_assets_empty_agreements(self, mock_config_manager):
        """Test semantic assets sync with empty agreements list."""
        mock_config_manager.get_config.return_value = []
        
        # Execute sync
        self.job._sync_semantic_assets()
        
        # Verify connector manager was not called
        self.mock_connector_manager.register_submodel_bundle_circular_offer.assert_not_called()

    @patch('jobs.asset_sync_job.ConfigManager')
    def test_sync_semantic_assets_partial_failure(self, mock_config_manager):
        """Test semantic assets sync with some failures."""
        # Setup mock configuration
        mock_config_manager.get_config.return_value = [
            {"semanticid": "urn:test:1"},
            {"semanticid": "urn:test:2"},
        ]
        
        # Setup mock to succeed for first, fail for second
        self.mock_connector_manager.register_submodel_bundle_circular_offer.side_effect = [
            ("asset-1", "p1", "a1", "c1"),
            Exception("Connection error")
        ]
        
        # Execute sync - should not raise exception
        self.job._sync_semantic_assets()
        
        # Verify both were attempted
        self.assertEqual(
            self.mock_connector_manager.register_submodel_bundle_circular_offer.call_count,
            2
        )

    @patch('jobs.asset_sync_job.ConfigManager')
    @patch('jobs.asset_sync_job.logger')
    def test_run_complete_flow(self, mock_logger, mock_config_manager):
        """Test complete sync flow."""
        # Setup mocks
        mock_config_manager.get_config.side_effect = [
            {  # DTR config
                "hostname": "http://dtr",
                "uri": "/api",
                "apiPath": "/v3",
                "policy": {},
                "asset_config": {"dct_type": "dtr", "existing_asset_id": None}
            },
            [  # Agreements config
                {"semanticid": "urn:test:1"}
            ]
        ]
        
        self.mock_connector_manager.register_dtr_offer.return_value = ("dtr-id", "p", "a", "c")
        self.mock_connector_manager.register_submodel_bundle_circular_offer.return_value = ("s-id", "p", "a", "c")
        
        # Execute
        self.job.run()
        
        # Verify both sync methods were called
        self.mock_connector_manager.register_dtr_offer.assert_called_once()
        self.mock_connector_manager.register_submodel_bundle_circular_offer.assert_called_once()
        
        # Verify completion logging
        mock_logger.info.assert_any_call("[AssetSyncJob] Asset synchronization completed successfully.")

    @patch('jobs.asset_sync_job.logger')
    @patch('jobs.asset_sync_job.ConfigManager')
    def test_run_with_exception(self, mock_config_manager, mock_logger):
        """Test that exceptions are caught and logged properly."""
        # Setup mock to raise exception
        mock_config_manager.get_config.side_effect = Exception("Config error")
        
        # Execute - should not raise exception, but log errors
        self.job.run()
        
        # Verify errors were logged for both sync operations
        error_calls = [call for call in mock_logger.error.call_args_list if "Config error" in str(call)]
        self.assertGreater(len(error_calls), 0, "Expected error logging for config failure")

    # -----------------------------------------------------------------------
    # CCM notification asset tests
    # -----------------------------------------------------------------------

    @patch('jobs.asset_sync_job.ConfigManager')
    def test_sync_ccm_asset_success(self, mock_config_manager):
        """
        Test that _sync_ccm_asset calls register_ccm_notification_offer with
        the URL built from hostname + apiPath and the policy from config.
        """
        mock_config_manager.get_config.return_value = {
            "hostname": "http://ichub-backend",
            "apiPath": "/addons/ccm-kit",
            "policy": {
                "usage": {"permissions": []},
                "access": {"permissions": []}
            },
            "asset_config": {"existing_asset_id": None},
        }
        self.mock_connector_manager.register_ccm_notification_offer.return_value = (
            "ichub:asset:ccm-notification:abc123", "up-id", "ap-id", "c-id"
        )

        self.job._sync_ccm_asset()

        self.mock_connector_manager.register_ccm_notification_offer.assert_called_once_with(
            ccm_notification_url="http://ichub-backend/addons/ccm-kit",
            ccm_policy_config=mock_config_manager.get_config.return_value["policy"],
            existing_asset_id=None,
        )

    @patch('jobs.asset_sync_job.ConfigManager')
    @patch('jobs.asset_sync_job.logger')
    def test_sync_ccm_asset_no_config(self, mock_logger, mock_config_manager):
        """
        Test that _sync_ccm_asset skips gracefully when 'provider.ccm' is absent,
        so deployments without the CCM add-on are unaffected.
        """
        mock_config_manager.get_config.return_value = None

        self.job._sync_ccm_asset()

        self.mock_connector_manager.register_ccm_notification_offer.assert_not_called()
        mock_logger.warning.assert_any_call(
            "[AssetSyncJob] No 'provider.ccm' configuration found. "
            "Skipping CCM asset sync."
        )

    @patch('jobs.asset_sync_job.ConfigManager')
    @patch('jobs.asset_sync_job.logger')
    def test_sync_ccm_asset_handles_exception(self, mock_logger, mock_config_manager):
        """
        Test that _sync_ccm_asset catches and logs exceptions without propagating
        them, so a CCM failure does not abort the rest of the sync job.
        """
        mock_config_manager.get_config.return_value = {
            "hostname": "http://ichub-backend",
            "apiPath": "/addons/ccm-kit",
            "policy": {},
            "asset_config": {},
        }
        self.mock_connector_manager.register_ccm_notification_offer.side_effect = (
            Exception("EDC unreachable")
        )

        # Should not raise
        self.job._sync_ccm_asset()

        mock_logger.error.assert_called_once()
        error_msg = mock_logger.error.call_args[0][0]
        self.assertIn("EDC unreachable", error_msg)

    @patch('jobs.asset_sync_job.ConfigManager')
    def test_run_calls_ccm_sync(self, mock_config_manager):
        """
        Test that run() invokes _sync_ccm_asset as step 4 alongside the other
        three sync steps.
        """
        # All config lookups return minimal valid objects so no step errors out
        mock_config_manager.get_config.return_value = None  # skip each optional step

        self.mock_connector_manager.register_dtr_offer.return_value = ("d", "p", "a", "c")
        self.mock_connector_manager.register_ccm_notification_offer.return_value = ("ccm", "p", "a", "c")

        with patch.object(self.job, '_sync_dtr_asset') as mock_dtr, \
             patch.object(self.job, '_sync_semantic_assets') as mock_sem, \
             patch.object(self.job, '_sync_digital_twin_event_asset') as mock_dte, \
             patch.object(self.job, '_sync_ccm_asset') as mock_ccm:
            self.job.run()

        mock_dtr.assert_called_once()
        mock_sem.assert_called_once()
        mock_dte.assert_called_once()
        mock_ccm.assert_called_once()

    @patch('jobs.asset_sync_job.ConfigManager')
    def test_sync_ccm_asset_strips_trailing_slashes(self, mock_config_manager):
        """
        Test that hostname and apiPath trailing slashes are stripped before
        building the notification URL so there is no double-slash.
        """
        mock_config_manager.get_config.return_value = {
            "hostname": "http://ichub-backend/",   # trailing slash
            "apiPath": "/addons/ccm-kit/",          # trailing slash
            "policy": {},
            "asset_config": {},
        }
        self.mock_connector_manager.register_ccm_notification_offer.return_value = (
            "ichub:asset:ccm-notification:x", "p", "a", "c"
        )

        self.job._sync_ccm_asset()

        call_kwargs = self.mock_connector_manager.register_ccm_notification_offer.call_args[1]
        self.assertEqual(
            call_kwargs["ccm_notification_url"],
            "http://ichub-backend/addons/ccm-kit",
        )


if __name__ == '__main__':
    unittest.main()
