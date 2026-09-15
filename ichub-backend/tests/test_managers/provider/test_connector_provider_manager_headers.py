#################################################################################
# Eclipse Tractus-X - Industry Core Hub Backend
#
# copyright (c) 2026 LKS Next
# Copyright (c) 2026 Contributors to the Eclipse Foundation
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

import unittest
from unittest.mock import Mock, patch
from managers.enablement_services.provider.connector_provider_manager import ConnectorProviderManager


class TestUpdateAssetHeaders(unittest.TestCase):
    """Tests for the credential synchronization logic in ConnectorProviderManager."""

    def setUp(self):
        """Set up test fixtures with a mocked connector service."""
        self.mock_connector_service = Mock()
        self.mock_connector_service.assets = Mock()
        self.mock_connector_service.policies = Mock()
        self.mock_connector_service.contract_definitions = Mock()

        # Minimal constructor args to instantiate the manager
        self.manager = ConnectorProviderManager(
            connector_provider_service=self.mock_connector_service,
            ichub_url="http://localhost:9000",
            agreements=[],
            authorization=True,
            backend_api_key="X-Api-Key",
            backend_api_key_value="new-secret-key",
            submodel_asset_headers={"X-Api-Key": "new-secret-key"},
        )

    # ──────────────────────────────────────────────────────────────
    # _mask_credential
    # ──────────────────────────────────────────────────────────────

    def test_mask_credential_short_value(self):
        """Short values are fully masked."""
        self.assertEqual(ConnectorProviderManager._mask_credential("abc"), "****")

    def test_mask_credential_normal_value(self):
        """Only the last 4 characters are shown."""
        self.assertEqual(ConnectorProviderManager._mask_credential("my-secret-key"), "****-key")

    def test_mask_credential_empty(self):
        """Empty or None values are fully masked."""
        self.assertEqual(ConnectorProviderManager._mask_credential(""), "****")
        self.assertEqual(ConnectorProviderManager._mask_credential(None), "****")

    # ──────────────────────────────────────────────────────────────
    # _extract_headers_from_data_address
    # ──────────────────────────────────────────────────────────────

    def test_extract_headers_from_data_address(self):
        """Header entries are extracted and prefix removed."""
        data_address = {
            "@type": "DataAddress",
            "type": "HttpData",
            "baseUrl": "http://backend:9000/submodel-dispatcher",
            "header:X-Api-Key": "old-key",
            "header:Authorization": "Bearer token123",
            "proxyPath": "true",
        }
        headers = self.manager._extract_headers_from_data_address(data_address)
        self.assertEqual(headers, {"X-Api-Key": "old-key", "Authorization": "Bearer token123"})

    def test_extract_headers_empty_data_address(self):
        """No headers means empty dict."""
        self.assertEqual(self.manager._extract_headers_from_data_address({}), {})

    # ──────────────────────────────────────────────────────────────
    # update_asset_headers
    # ──────────────────────────────────────────────────────────────

    def test_update_asset_headers_no_change(self):
        """When headers match, no update is performed."""
        self.mock_connector_service.assets.get_by_id.return_value = Mock(
            status_code=200,
            json=lambda: {
                "@context": {},
                "@id": "asset-1",
                "properties": {},
                "privateProperties": {},
                "dataAddress": {
                    "@type": "DataAddress",
                    "type": "HttpData",
                    "baseUrl": "http://example.com",
                    "header:X-Api-Key": "current-key",
                },
            },
        )

        result = self.manager.update_asset_headers("asset-1", {"X-Api-Key": "current-key"})

        self.assertFalse(result)
        self.mock_connector_service.assets.update.assert_not_called()

    @patch("managers.enablement_services.provider.connector_provider_manager.ModelFactory")
    def test_update_asset_headers_changed(self, mock_model_factory):
        """When headers differ, the asset is updated."""
        self.mock_connector_service.assets.get_by_id.return_value = Mock(
            status_code=200,
            json=lambda: {
                "@context": {"edc": "https://w3id.org/edc/v0.0.1/ns/"},
                "@id": "asset-1",
                "properties": {"dct:type": {"@id": "cx-taxo:SubmodelBundle"}},
                "privateProperties": {},
                "dataAddress": {
                    "@type": "DataAddress",
                    "type": "HttpData",
                    "baseUrl": "http://example.com",
                    "header:X-Api-Key": "old-key",
                },
            },
        )

        mock_asset_model = Mock()
        mock_model_factory.get_asset_model.return_value = mock_asset_model
        self.mock_connector_service.assets.update.return_value = Mock(status_code=204)

        result = self.manager.update_asset_headers("asset-1", {"X-Api-Key": "new-key"})

        self.assertTrue(result)
        self.mock_connector_service.assets.update.assert_called_once_with(obj=mock_asset_model)

        # Verify the data-address passed to ModelFactory has the new header
        call_kwargs = mock_model_factory.get_asset_model.call_args[1]
        self.assertEqual(call_kwargs["data_address"]["header:X-Api-Key"], "new-key")
        # Old header:* entries should have been replaced
        self.assertNotIn("old-key", str(call_kwargs["data_address"]))

    def test_update_asset_headers_asset_not_found(self):
        """When asset does not exist, returns False."""
        self.mock_connector_service.assets.get_by_id.return_value = Mock(status_code=404)

        result = self.manager.update_asset_headers("nonexistent", {"X-Api-Key": "key"})

        self.assertFalse(result)
        self.mock_connector_service.assets.update.assert_not_called()

    @patch("managers.enablement_services.provider.connector_provider_manager.ModelFactory")
    def test_update_asset_headers_update_fails(self, mock_model_factory):
        """When the PUT fails, returns False."""
        self.mock_connector_service.assets.get_by_id.return_value = Mock(
            status_code=200,
            json=lambda: {
                "@context": {},
                "@id": "asset-1",
                "properties": {},
                "privateProperties": {},
                "dataAddress": {
                    "header:X-Api-Key": "old-key",
                },
            },
        )
        mock_model_factory.get_asset_model.return_value = Mock()
        self.mock_connector_service.assets.update.return_value = Mock(status_code=500)

        result = self.manager.update_asset_headers("asset-1", {"X-Api-Key": "new-key"})

        self.assertFalse(result)

    def test_update_asset_headers_none_desired_headers(self):
        """When desired_headers is None, treats as empty (removes all header:* entries)."""
        self.mock_connector_service.assets.get_by_id.return_value = Mock(
            status_code=200,
            json=lambda: {
                "@context": {},
                "@id": "asset-1",
                "properties": {},
                "privateProperties": {},
                "dataAddress": {
                    "header:X-Api-Key": "some-key",
                },
            },
        )

        # None desired means {} — differs from current {"X-Api-Key": "some-key"}
        with patch("managers.enablement_services.provider.connector_provider_manager.ModelFactory") as mock_mf:
            mock_mf.get_asset_model.return_value = Mock()
            self.mock_connector_service.assets.update.return_value = Mock(status_code=204)

            result = self.manager.update_asset_headers("asset-1", None)
            self.assertTrue(result)

    # ──────────────────────────────────────────────────────────────
    # get_or_create_circular_submodel_asset — header sync
    # ──────────────────────────────────────────────────────────────

    @patch.object(ConnectorProviderManager, "update_asset_headers")
    def test_get_or_create_submodel_asset_existing_calls_update(self, mock_update):
        """When asset exists, update_asset_headers is called."""
        self.mock_connector_service.assets.get_by_id.return_value = Mock(status_code=200)

        self.manager.get_or_create_circular_submodel_asset(
            semantic_id="urn:samm:test:1.0.0#Test",
            headers={"X-Api-Key": "new-key"},
        )

        mock_update.assert_called_once()
        call_kwargs = mock_update.call_args[1]
        self.assertEqual(call_kwargs["desired_headers"], {"X-Api-Key": "new-key"})

    @patch.object(ConnectorProviderManager, "update_asset_headers")
    def test_get_or_create_submodel_asset_new_does_not_call_update(self, mock_update):
        """When asset is created fresh, update_asset_headers is not called."""
        self.mock_connector_service.assets.get_by_id.return_value = Mock(status_code=404)
        self.mock_connector_service.create_asset.return_value = {"@id": "new-asset-id"}

        self.manager.get_or_create_circular_submodel_asset(
            semantic_id="urn:samm:test:1.0.0#Test",
            headers={"X-Api-Key": "key"},
        )

        mock_update.assert_not_called()

    # ──────────────────────────────────────────────────────────────
    # get_or_create_dtr_asset — header sync
    # ──────────────────────────────────────────────────────────────

    @patch.object(ConnectorProviderManager, "update_asset_headers")
    def test_get_or_create_dtr_asset_existing_calls_update(self, mock_update):
        """When DTR asset exists, update_asset_headers is called."""
        self.mock_connector_service.assets.get_by_id.return_value = Mock(status_code=200)

        self.manager.get_or_create_dtr_asset(
            dtr_url="http://dtr:8080/api/v3",
            dct_type="https://w3id.org/catenax/taxonomy#DigitalTwinRegistry",
            headers={"X-Api-Key": "new-dtr-key"},
        )

        mock_update.assert_called_once()
        call_kwargs = mock_update.call_args[1]
        self.assertEqual(call_kwargs["desired_headers"], {"X-Api-Key": "new-dtr-key"})

    # ──────────────────────────────────────────────────────────────
    # get_or_create_pcf_exchange_asset — header sync
    # ──────────────────────────────────────────────────────────────

    @patch.object(ConnectorProviderManager, "update_asset_headers")
    def test_get_or_create_pcf_asset_existing_calls_update(self, mock_update):
        """When PCF exchange asset exists, update_asset_headers is called."""
        self.mock_connector_service.assets.get_by_id.return_value = Mock(status_code=200)

        self.manager.get_or_create_pcf_exchange_asset(
            pcf_exchange_url="http://localhost:9000/v1/addons/pcf-kit/footprintExchange",
            dct_type="cx-taxo:PcfExchange",
            headers={"X-Api-Key": "new-pcf-key"},
        )

        mock_update.assert_called_once()
        call_kwargs = mock_update.call_args[1]
        self.assertEqual(call_kwargs["desired_headers"], {"X-Api-Key": "new-pcf-key"})

    # ──────────────────────────────────────────────────────────────
    # get_or_create_digital_twin_event_asset — header sync
    # ──────────────────────────────────────────────────────────────

    @patch.object(ConnectorProviderManager, "update_asset_headers")
    def test_get_or_create_dt_event_asset_existing_calls_update(self, mock_update):
        """When DigitalTwinEvent asset exists, update_asset_headers is called."""
        self.mock_connector_service.assets.get_by_id.return_value = Mock(status_code=200)

        self.manager.get_or_create_digital_twin_event_asset(
            digital_twin_event_url="http://localhost:9000/digital-twin-event",
            headers={"X-Api-Key": "new-event-key"},
        )

        mock_update.assert_called_once()
        call_kwargs = mock_update.call_args[1]
        self.assertEqual(call_kwargs["desired_headers"], {"X-Api-Key": "new-event-key"})

    # ──────────────────────────────────────────────────────────────
    # Credential logging safety
    # ──────────────────────────────────────────────────────────────

    @patch("managers.enablement_services.provider.connector_provider_manager.logger")
    @patch("managers.enablement_services.provider.connector_provider_manager.ModelFactory")
    def test_no_plaintext_credentials_in_logs(self, mock_model_factory, mock_logger):
        """Ensure that API key values are never logged in plain text during update."""
        secret_key = "super-secret-api-key-value-12345"
        self.mock_connector_service.assets.get_by_id.return_value = Mock(
            status_code=200,
            json=lambda: {
                "@context": {},
                "@id": "asset-1",
                "properties": {},
                "privateProperties": {},
                "dataAddress": {
                    "header:X-Api-Key": "old-expired-key",
                },
            },
        )
        mock_model_factory.get_asset_model.return_value = Mock()
        self.mock_connector_service.assets.update.return_value = Mock(status_code=204)

        self.manager.update_asset_headers("asset-1", {"X-Api-Key": secret_key})

        # Collect all logged messages
        all_log_calls = (
            mock_logger.info.call_args_list
            + mock_logger.debug.call_args_list
            + mock_logger.warning.call_args_list
            + mock_logger.error.call_args_list
        )
        for call in all_log_calls:
            logged_message = str(call)
            self.assertNotIn(secret_key, logged_message,
                             f"Plain-text credential found in log: {logged_message}")


if __name__ == "__main__":
    unittest.main()
