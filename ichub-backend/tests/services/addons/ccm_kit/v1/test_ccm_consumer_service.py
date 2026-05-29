#################################################################################
# Eclipse Tractus-X - Industry Core Hub Backend
#
# Copyright (c) 2026 LKS Next
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
"""
Unit tests for CcmConsumerService.

Covers the consumer-side PULL flow operations:
- Catalog search (found / not found / discovery failure / catalog error)
- Send certificate request (success / discovery failure / notification error)
- Send certificate status (success / error)
"""

import pytest
from unittest.mock import Mock, patch

from tractusx_sdk.industry.services.notifications.exceptions import NotificationError

from services.addons.ccm_kit.v1.ccm_consumer_service import CcmConsumerService, CCM_DCT_TYPE
from models.services.addons.ccm_kit.v1.notifications import (
    CcmCatalogSearchRequest,
    CcmSendRequestPayload,
    CcmSendStatusPayload,
    CertificateStatusValue,
)


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

CONSUMER_BPN = "BPNL00000003AYRE"
PROVIDER_BPN = "BPNL00000003CSGV"
DSP_URL = "https://provider-edc.example.com/api/v1/dsp"


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def service():
    return CcmConsumerService()


# ---------------------------------------------------------------------------
# Catalog Search Tests
# ---------------------------------------------------------------------------

class TestCatalogSearch:
    """Tests for CcmConsumerService.search_catalog"""

    @patch("services.addons.ccm_kit.v1.ccm_consumer_service.consumer_connector_service")
    @patch("services.addons.ccm_kit.v1.ccm_base_service.connector_manager")
    def test_catalog_search_found(self, mock_cm, mock_ccs, service):
        """Catalog contains a CCM notification asset."""
        mock_cm.consumer.get_connectors.return_value = [DSP_URL]
        mock_ccs.get_catalog_by_dct_type.return_value = {
            "dcat:dataset": {
                "@id": "ichub:asset:ccm-notification:1",
                "dct:type": {"@id": CCM_DCT_TYPE},
            }
        }

        request = CcmCatalogSearchRequest(
            providerBpn=PROVIDER_BPN,
            certificateType="ISO9001",
        )
        result = service.search_catalog(request)

        assert result.found is True
        assert result.provider_bpn == PROVIDER_BPN
        assert result.dsp_url == DSP_URL
        assert result.asset_id == "ichub:asset:ccm-notification:1"
        assert result.dct_type == CCM_DCT_TYPE
        assert result.error is None

    @patch("services.addons.ccm_kit.v1.ccm_consumer_service.consumer_connector_service")
    @patch("services.addons.ccm_kit.v1.ccm_base_service.connector_manager")
    def test_catalog_search_not_found_empty_dataset(self, mock_cm, mock_ccs, service):
        """Catalog response has no dataset."""
        mock_cm.consumer.get_connectors.return_value = [DSP_URL]
        mock_ccs.get_catalog_by_dct_type.return_value = {}

        request = CcmCatalogSearchRequest(providerBpn=PROVIDER_BPN)
        result = service.search_catalog(request)

        assert result.found is False
        assert result.asset_id is None
        assert result.error is None

    @patch("services.addons.ccm_kit.v1.ccm_base_service.connector_manager")
    def test_catalog_search_discovery_failure(self, mock_cm, service):
        """Connector discovery returns no DSP URL."""
        mock_cm.consumer.get_connectors.return_value = []

        request = CcmCatalogSearchRequest(providerBpn=PROVIDER_BPN)
        result = service.search_catalog(request)

        assert result.found is False
        assert "Discovery failed" in result.error

    @patch("services.addons.ccm_kit.v1.ccm_consumer_service.consumer_connector_service")
    @patch("services.addons.ccm_kit.v1.ccm_base_service.connector_manager")
    def test_catalog_search_catalog_query_error(self, mock_cm, mock_ccs, service):
        """Catalog query raises an exception."""
        mock_cm.consumer.get_connectors.return_value = [DSP_URL]
        mock_ccs.get_catalog_by_dct_type.side_effect = Exception("Connection timeout")

        request = CcmCatalogSearchRequest(providerBpn=PROVIDER_BPN)
        result = service.search_catalog(request)

        assert result.found is False
        assert "Catalog query failed" in result.error
        assert result.dsp_url == DSP_URL

    @patch("services.addons.ccm_kit.v1.ccm_consumer_service.consumer_connector_service")
    @patch("services.addons.ccm_kit.v1.ccm_base_service.connector_manager")
    def test_catalog_search_dataset_list(self, mock_cm, mock_ccs, service):
        """Catalog response has dataset as a list (multiple assets)."""
        mock_cm.consumer.get_connectors.return_value = [DSP_URL]
        mock_ccs.get_catalog_by_dct_type.return_value = {
            "dcat:dataset": [
                {"@id": "ichub:asset:ccm-notification:1"},
                {"@id": "ichub:asset:ccm-notification:2"},
            ]
        }

        request = CcmCatalogSearchRequest(providerBpn=PROVIDER_BPN)
        result = service.search_catalog(request)

        assert result.found is True
        assert result.asset_id == "ichub:asset:ccm-notification:1"

    @patch("services.addons.ccm_kit.v1.ccm_consumer_service.consumer_connector_service")
    @patch("services.addons.ccm_kit.v1.ccm_base_service.connector_manager")
    def test_catalog_search_saturn_keys(self, mock_cm, mock_ccs, service):
        """Catalog response uses Saturn-style keys (no dcat: prefix)."""
        mock_cm.consumer.get_connectors.return_value = [DSP_URL]
        mock_ccs.get_catalog_by_dct_type.return_value = {
            "dataset": {"@id": "saturn-asset-id"}
        }

        request = CcmCatalogSearchRequest(providerBpn=PROVIDER_BPN)
        result = service.search_catalog(request)

        assert result.found is True
        assert result.asset_id == "saturn-asset-id"


# ---------------------------------------------------------------------------
# Send Certificate Request Tests
# ---------------------------------------------------------------------------

class TestSendCertificateRequest:
    """Tests for CcmConsumerService.send_certificate_request"""

    @patch("services.addons.ccm_kit.v1.ccm_base_service.NotificationConsumerService")
    @patch("services.addons.ccm_kit.v1.ccm_base_service.ConfigManager")
    @patch("services.addons.ccm_kit.v1.ccm_base_service.connector_manager")
    @patch("services.addons.ccm_kit.v1.ccm_consumer_service.consumer_connector_service")
    def test_send_request_success(self, mock_ccs, mock_cm, mock_config, mock_ncs_class, service):
        """Successfully sends a certificate request notification."""
        mock_cm.consumer.get_connectors.return_value = [DSP_URL]
        mock_config.get_config.return_value = None  # no policy override

        mock_ncs = Mock()
        mock_ncs_class.return_value = mock_ncs
        mock_ncs.get_notification_endpoint.return_value = (
            "https://dataplane.example.com/public",
            "token123",
        )
        mock_ncs.send_notification_to_endpoint.return_value = {"status": "sent"}

        payload = CcmSendRequestPayload(
            senderBpn=CONSUMER_BPN,
            providerBpn=PROVIDER_BPN,
            certifiedBpn="BPNL00000003XYZQ",
            certificateType="ISO9001",
        )
        result = service.send_certificate_request(payload, CONSUMER_BPN)

        assert result.success is True
        assert result.message_id is not None
        assert result.error is None

        # Verify DSP negotiation used CCM dct_type
        mock_ncs.get_notification_endpoint.assert_called_once()
        call_kwargs = mock_ncs.get_notification_endpoint.call_args[1]
        assert call_kwargs["dct_type"] == CCM_DCT_TYPE
        assert call_kwargs["provider_bpn"] == PROVIDER_BPN

    @patch("services.addons.ccm_kit.v1.ccm_base_service.connector_manager")
    def test_send_request_discovery_failure(self, mock_cm, service):
        """Discovery returns no connectors."""
        mock_cm.consumer.get_connectors.return_value = []

        payload = CcmSendRequestPayload(
            senderBpn=CONSUMER_BPN,
            providerBpn=PROVIDER_BPN,
            certifiedBpn="BPNL00000003XYZQ",
            certificateType="ISO9001",
        )
        result = service.send_certificate_request(payload, CONSUMER_BPN)

        assert result.success is False
        assert "Discovery failed" in result.error

    @patch("services.addons.ccm_kit.v1.ccm_base_service.NotificationConsumerService")
    @patch("services.addons.ccm_kit.v1.ccm_base_service.ConfigManager")
    @patch("services.addons.ccm_kit.v1.ccm_base_service.connector_manager")
    @patch("services.addons.ccm_kit.v1.ccm_consumer_service.consumer_connector_service")
    def test_send_request_notification_error(self, mock_ccs, mock_cm, mock_config, mock_ncs_class, service):
        """NotificationError during DSP negotiation."""
        mock_cm.consumer.get_connectors.return_value = [DSP_URL]
        mock_config.get_config.return_value = None

        mock_ncs = Mock()
        mock_ncs_class.return_value = mock_ncs
        mock_ncs.get_notification_endpoint.side_effect = NotificationError(
            "Contract negotiation failed"
        )

        payload = CcmSendRequestPayload(
            senderBpn=CONSUMER_BPN,
            providerBpn=PROVIDER_BPN,
            certifiedBpn="BPNL00000003XYZQ",
            certificateType="ISO9001",
        )
        result = service.send_certificate_request(payload, CONSUMER_BPN)

        assert result.success is False
        assert "Contract negotiation failed" in result.error

    @patch("services.addons.ccm_kit.v1.ccm_base_service.NotificationConsumerService")
    @patch("services.addons.ccm_kit.v1.ccm_base_service.ConfigManager")
    @patch("services.addons.ccm_kit.v1.ccm_base_service.connector_manager")
    @patch("services.addons.ccm_kit.v1.ccm_consumer_service.consumer_connector_service")
    def test_send_request_with_location_bpns(self, mock_ccs, mock_cm, mock_config, mock_ncs_class, service):
        """Request includes optional locationBpns."""
        mock_cm.consumer.get_connectors.return_value = [DSP_URL]
        mock_config.get_config.return_value = None

        mock_ncs = Mock()
        mock_ncs_class.return_value = mock_ncs
        mock_ncs.get_notification_endpoint.return_value = (
            "https://dataplane.example.com/public",
            "token123",
        )
        mock_ncs.send_notification_to_endpoint.return_value = {"status": "sent"}

        payload = CcmSendRequestPayload(
            senderBpn=CONSUMER_BPN,
            providerBpn=PROVIDER_BPN,
            certifiedBpn="BPNL00000003XYZQ",
            certificateType="IATF16949",
            locationBpns=["BPNS000000000001", "BPNA000000000002"],
        )
        result = service.send_certificate_request(payload, CONSUMER_BPN)

        assert result.success is True

        # Verify notification content includes locationBpns
        call_args = mock_ncs.send_notification_to_endpoint.call_args
        notification = call_args[1]["notification"]
        assert notification.content.model_extra.get("locationBpns") == [
            "BPNS000000000001", "BPNA000000000002"
        ]


# ---------------------------------------------------------------------------
# Send Certificate Status Tests
# ---------------------------------------------------------------------------

class TestSendCertificateStatus:
    """Tests for CcmConsumerService.send_certificate_status"""

    @patch("services.addons.ccm_kit.v1.ccm_base_service.NotificationConsumerService")
    @patch("services.addons.ccm_kit.v1.ccm_base_service.ConfigManager")
    @patch("services.addons.ccm_kit.v1.ccm_base_service.connector_manager")
    @patch("services.addons.ccm_kit.v1.ccm_consumer_service.consumer_connector_service")
    def test_send_status_accepted(self, mock_ccs, mock_cm, mock_config, mock_ncs_class, service):
        """Successfully sends ACCEPTED status."""
        mock_cm.consumer.get_connectors.return_value = [DSP_URL]
        mock_config.get_config.return_value = None

        mock_ncs = Mock()
        mock_ncs_class.return_value = mock_ncs
        mock_ncs.get_notification_endpoint.return_value = (
            "https://dataplane.example.com/public",
            "token456",
        )
        mock_ncs.send_notification_to_endpoint.return_value = {"status": "sent"}

        payload = CcmSendStatusPayload(
            senderBpn=CONSUMER_BPN,
            providerBpn=PROVIDER_BPN,
            documentId="12345",
            certificateStatus=CertificateStatusValue.ACCEPTED,
        )
        result = service.send_certificate_status(payload, CONSUMER_BPN)

        assert result.success is True
        assert result.message_id is not None

        # Verify endpoint path
        call_kwargs = mock_ncs.send_notification_to_endpoint.call_args[1]
        assert call_kwargs["endpoint_path"] == "/companycertificate/status"

    @patch("services.addons.ccm_kit.v1.ccm_base_service.NotificationConsumerService")
    @patch("services.addons.ccm_kit.v1.ccm_base_service.ConfigManager")
    @patch("services.addons.ccm_kit.v1.ccm_base_service.connector_manager")
    @patch("services.addons.ccm_kit.v1.ccm_consumer_service.consumer_connector_service")
    def test_send_status_rejected_with_errors(self, mock_ccs, mock_cm, mock_config, mock_ncs_class, service):
        """REJECTED status includes error details."""
        mock_cm.consumer.get_connectors.return_value = [DSP_URL]
        mock_config.get_config.return_value = None

        mock_ncs = Mock()
        mock_ncs_class.return_value = mock_ncs
        mock_ncs.get_notification_endpoint.return_value = (
            "https://dataplane.example.com/public",
            "token789",
        )
        mock_ncs.send_notification_to_endpoint.return_value = {"status": "sent"}

        payload = CcmSendStatusPayload(
            senderBpn=CONSUMER_BPN,
            providerBpn=PROVIDER_BPN,
            documentId="67890",
            certificateStatus=CertificateStatusValue.REJECTED,
            certificateErrors=[{"message": "Certificate expired"}],
            locationErrors=[{"bpn": "BPNS000000000001", "locationErrors": [{"message": "Invalid site"}]}],
        )
        result = service.send_certificate_status(payload, CONSUMER_BPN)

        assert result.success is True

        # Verify notification content includes errors
        call_args = mock_ncs.send_notification_to_endpoint.call_args
        notification = call_args[1]["notification"]
        assert notification.content.model_extra.get("certificateStatus") == "REJECTED"
        assert notification.content.model_extra.get("certificateErrors") == [{"message": "Certificate expired"}]

    @patch("services.addons.ccm_kit.v1.ccm_base_service.connector_manager")
    def test_send_status_discovery_failure(self, mock_cm, service):
        """Discovery returns no connectors for status sending."""
        mock_cm.consumer.get_connectors.return_value = []

        payload = CcmSendStatusPayload(
            senderBpn=CONSUMER_BPN,
            providerBpn=PROVIDER_BPN,
            documentId="12345",
            certificateStatus=CertificateStatusValue.RECEIVED,
        )
        result = service.send_certificate_status(payload, CONSUMER_BPN)

        assert result.success is False
        assert "Discovery failed" in result.error

    @patch("services.addons.ccm_kit.v1.ccm_base_service.NotificationConsumerService")
    @patch("services.addons.ccm_kit.v1.ccm_base_service.ConfigManager")
    @patch("services.addons.ccm_kit.v1.ccm_base_service.connector_manager")
    @patch("services.addons.ccm_kit.v1.ccm_consumer_service.consumer_connector_service")
    def test_send_status_with_policies(self, mock_ccs, mock_cm, mock_config, mock_ncs_class, service):
        """CCM usage policy is resolved from config and passed to DSP."""
        mock_cm.consumer.get_connectors.return_value = [DSP_URL]
        ccm_policy = {"permissions": [{"action": "use"}]}
        mock_config.get_config.return_value = ccm_policy

        mock_ncs = Mock()
        mock_ncs_class.return_value = mock_ncs
        mock_ncs.get_notification_endpoint.return_value = (
            "https://dataplane.example.com/public",
            "token999",
        )
        mock_ncs.send_notification_to_endpoint.return_value = {"status": "sent"}

        payload = CcmSendStatusPayload(
            senderBpn=CONSUMER_BPN,
            providerBpn=PROVIDER_BPN,
            documentId="12345",
            certificateStatus=CertificateStatusValue.ACCEPTED,
        )
        result = service.send_certificate_status(payload, CONSUMER_BPN)

        assert result.success is True

        # Verify policies were passed
        call_kwargs = mock_ncs.get_notification_endpoint.call_args[1]
        assert call_kwargs["policies"] == [ccm_policy]


# ---------------------------------------------------------------------------
# Internal helper tests
# ---------------------------------------------------------------------------

class TestExtractAssetId:
    """Tests for CcmConsumerService._extract_asset_id"""

    def test_none_catalog(self):
        assert CcmConsumerService._extract_asset_id(None) is None

    def test_empty_catalog(self):
        assert CcmConsumerService._extract_asset_id({}) is None

    def test_single_dataset(self):
        catalog = {"dcat:dataset": {"@id": "asset-1"}}
        assert CcmConsumerService._extract_asset_id(catalog) == "asset-1"

    def test_dataset_list(self):
        catalog = {"dcat:dataset": [{"@id": "first"}, {"@id": "second"}]}
        assert CcmConsumerService._extract_asset_id(catalog) == "first"

    def test_empty_dataset_list(self):
        catalog = {"dcat:dataset": []}
        assert CcmConsumerService._extract_asset_id(catalog) is None

    def test_saturn_key(self):
        catalog = {"dataset": {"@id": "saturn-id"}}
        assert CcmConsumerService._extract_asset_id(catalog) == "saturn-id"

    def test_id_key_fallback(self):
        catalog = {"dcat:dataset": {"id": "fallback-id"}}
        assert CcmConsumerService._extract_asset_id(catalog) == "fallback-id"
