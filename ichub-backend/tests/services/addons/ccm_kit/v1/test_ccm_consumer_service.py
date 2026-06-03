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

from services.addons.ccm_kit.v1.ccm_consumer_service import CcmConsumerService
from tools.constants import CCM_DCT_TYPE
from models.services.addons.ccm_kit.v1.notifications import (
    CcmCatalogSearchRequest,
    CcmPullRequest,
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
        mock_ccs.get_catalog_by_dct_type_with_bpnl.return_value = {
            "dcat:dataset": {
                "@id": "ichub:asset:ccm-notification:1",
                "dct:type": {"@id": CCM_DCT_TYPE},
            }
        }

        request = CcmCatalogSearchRequest(providerBpn=PROVIDER_BPN)
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
        mock_ccs.get_catalog_by_dct_type_with_bpnl.return_value = {}

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
        mock_ccs.get_catalog_by_dct_type_with_bpnl.side_effect = Exception("Connection timeout")

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
        mock_ccs.get_catalog_by_dct_type_with_bpnl.return_value = {
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
        mock_ccs.get_catalog_by_dct_type_with_bpnl.return_value = {
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
        mock_ncs.get_notification_endpoint_with_bpnl.return_value = (
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
        mock_ncs.get_notification_endpoint_with_bpnl.assert_called_once()
        call_kwargs = mock_ncs.get_notification_endpoint_with_bpnl.call_args[1]
        assert call_kwargs["dct_type"] == CCM_DCT_TYPE
        assert call_kwargs["bpnl"] == PROVIDER_BPN

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
        mock_ncs.get_notification_endpoint_with_bpnl.side_effect = NotificationError(
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
        mock_ncs.get_notification_endpoint_with_bpnl.return_value = (
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

    @patch("services.addons.ccm_kit.v1.ccm_base_service.NotificationConsumerService")
    @patch("services.addons.ccm_kit.v1.ccm_base_service.ConfigManager")
    @patch("services.addons.ccm_kit.v1.ccm_base_service.connector_manager")
    @patch("services.addons.ccm_kit.v1.ccm_consumer_service.consumer_connector_service")
    def test_send_request_with_governance(self, mock_ccs, mock_cm, mock_config, mock_ncs_class, service):
        """Governance in payload is passed as policies to the notification service."""
        mock_cm.consumer.get_connectors.return_value = [DSP_URL]
        mock_config.get_config.return_value = None

        mock_ncs = Mock()
        mock_ncs_class.return_value = mock_ncs
        mock_ncs.get_notification_endpoint_with_bpnl.return_value = (
            "https://dataplane.example.com/public",
            "token-gov",
        )
        mock_ncs.send_notification_to_endpoint.return_value = {"status": "sent"}

        api_governance = [{"permission": [{"action": "use"}]}]
        payload = CcmSendRequestPayload(
            senderBpn=CONSUMER_BPN,
            providerBpn=PROVIDER_BPN,
            certifiedBpn="BPNL00000003XYZQ",
            certificateType="ISO9001",
            governance=api_governance,
        )
        result = service.send_certificate_request(payload, CONSUMER_BPN)

        assert result.success is True
        call_kwargs = mock_ncs.get_notification_endpoint_with_bpnl.call_args[1]
        assert call_kwargs["policies"] == api_governance


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
        mock_ncs.get_notification_endpoint_with_bpnl.return_value = (
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
        mock_ncs.get_notification_endpoint_with_bpnl.return_value = (
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
        cert_errors = notification.content.model_extra.get("certificateErrors")
        assert len(cert_errors) == 1
        assert cert_errors[0].message == "Certificate expired"

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
        mock_ncs.get_notification_endpoint_with_bpnl.return_value = (
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
        call_kwargs = mock_ncs.get_notification_endpoint_with_bpnl.call_args[1]
        assert call_kwargs["policies"] == [ccm_policy]

    @patch("services.addons.ccm_kit.v1.ccm_base_service.NotificationConsumerService")
    @patch("services.addons.ccm_kit.v1.ccm_base_service.ConfigManager")
    @patch("services.addons.ccm_kit.v1.ccm_base_service.connector_manager")
    @patch("services.addons.ccm_kit.v1.ccm_consumer_service.consumer_connector_service")
    def test_send_status_with_related_message_id(self, mock_ccs, mock_cm, mock_config, mock_ncs_class, service):
        """Status notification sets relatedMessageId when provided."""
        mock_cm.consumer.get_connectors.return_value = [DSP_URL]
        mock_config.get_config.return_value = None

        mock_ncs = Mock()
        mock_ncs_class.return_value = mock_ncs
        mock_ncs.get_notification_endpoint_with_bpnl.return_value = (
            "https://dataplane.example.com/public",
            "token-rel",
        )
        mock_ncs.send_notification_to_endpoint.return_value = {"status": "sent"}

        original_msg_id = "d9452f24-3bf3-4134-b3de-123456789abc"
        payload = CcmSendStatusPayload(
            senderBpn=CONSUMER_BPN,
            providerBpn=PROVIDER_BPN,
            documentId="12345",
            certificateStatus=CertificateStatusValue.ACCEPTED,
            relatedMessageId=original_msg_id,
        )
        result = service.send_certificate_status(payload, CONSUMER_BPN)

        assert result.success is True

        # Verify relatedMessageId is set in the notification header
        call_args = mock_ncs.send_notification_to_endpoint.call_args
        notification = call_args[1]["notification"]
        assert str(notification.header.related_message_id) == original_msg_id

    @patch("services.addons.ccm_kit.v1.ccm_base_service.NotificationConsumerService")
    @patch("services.addons.ccm_kit.v1.ccm_base_service.ConfigManager")
    @patch("services.addons.ccm_kit.v1.ccm_base_service.connector_manager")
    @patch("services.addons.ccm_kit.v1.ccm_consumer_service.consumer_connector_service")
    def test_send_status_without_related_message_id(self, mock_ccs, mock_cm, mock_config, mock_ncs_class, service):
        """Status notification omits relatedMessageId when not provided."""
        mock_cm.consumer.get_connectors.return_value = [DSP_URL]
        mock_config.get_config.return_value = None

        mock_ncs = Mock()
        mock_ncs_class.return_value = mock_ncs
        mock_ncs.get_notification_endpoint_with_bpnl.return_value = (
            "https://dataplane.example.com/public",
            "token-no-rel",
        )
        mock_ncs.send_notification_to_endpoint.return_value = {"status": "sent"}

        payload = CcmSendStatusPayload(
            senderBpn=CONSUMER_BPN,
            providerBpn=PROVIDER_BPN,
            documentId="12345",
            certificateStatus=CertificateStatusValue.RECEIVED,
        )
        result = service.send_certificate_status(payload, CONSUMER_BPN)

        assert result.success is True

        call_args = mock_ncs.send_notification_to_endpoint.call_args
        notification = call_args[1]["notification"]
        assert notification.header.related_message_id is None

    @patch("services.addons.ccm_kit.v1.ccm_base_service.NotificationConsumerService")
    @patch("services.addons.ccm_kit.v1.ccm_base_service.ConfigManager")
    @patch("services.addons.ccm_kit.v1.ccm_base_service.connector_manager")
    @patch("services.addons.ccm_kit.v1.ccm_consumer_service.consumer_connector_service")
    def test_send_status_governance_overrides_config(self, mock_ccs, mock_cm, mock_config, mock_ncs_class, service):
        """API governance takes priority over config-based policies."""
        mock_cm.consumer.get_connectors.return_value = [DSP_URL]
        config_policy = {"permissions": [{"action": "use"}]}
        mock_config.get_config.return_value = config_policy

        mock_ncs = Mock()
        mock_ncs_class.return_value = mock_ncs
        mock_ncs.get_notification_endpoint_with_bpnl.return_value = (
            "https://dataplane.example.com/public",
            "token-override",
        )
        mock_ncs.send_notification_to_endpoint.return_value = {"status": "sent"}

        api_governance = [{"permission": [{"action": "read"}]}]
        payload = CcmSendStatusPayload(
            senderBpn=CONSUMER_BPN,
            providerBpn=PROVIDER_BPN,
            documentId="12345",
            certificateStatus=CertificateStatusValue.ACCEPTED,
            governance=api_governance,
        )
        result = service.send_certificate_status(payload, CONSUMER_BPN)

        assert result.success is True
        call_kwargs = mock_ncs.get_notification_endpoint_with_bpnl.call_args[1]
        assert call_kwargs["policies"] == api_governance


# ---------------------------------------------------------------------------
# Internal helper tests
# ---------------------------------------------------------------------------

class TestBuildNotification:
    """Tests for CcmBaseService._build_notification (via CcmConsumerService)."""

    def test_header_version_uses_sdk_default(self, service):
        """Header version must follow shared.message_header (SDK default 3.0.0)."""
        from tractusx_sdk.industry.constants import DEFAULT_HEADER_VERSION

        notification = service._build_notification(
            context="Test-Context:1.0.0",
            sender_bpn=CONSUMER_BPN,
            receiver_bpn=PROVIDER_BPN,
            content_fields={"key": "value"},
        )

        assert notification.header.version == DEFAULT_HEADER_VERSION

    def test_related_message_id_set_when_provided(self, service):
        """relatedMessageId is set in header when passed."""
        import uuid
        msg_id = uuid.uuid4()

        notification = service._build_notification(
            context="Test-Context:1.0.0",
            sender_bpn=CONSUMER_BPN,
            receiver_bpn=PROVIDER_BPN,
            content_fields={"key": "value"},
            related_message_id=msg_id,
        )

        assert notification.header.related_message_id == msg_id

    def test_related_message_id_none_by_default(self, service):
        """relatedMessageId is None when not provided."""
        notification = service._build_notification(
            context="Test-Context:1.0.0",
            sender_bpn=CONSUMER_BPN,
            receiver_bpn=PROVIDER_BPN,
            content_fields={"key": "value"},
        )

        assert notification.header.related_message_id is None


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


# ---------------------------------------------------------------------------
# Pull Certificate Tests
# ---------------------------------------------------------------------------


class TestPullCertificate:
    """Tests for CcmConsumerService.pull_certificate"""

    @patch(
        "services.addons.ccm_kit.v1.ccm_consumer_service"
        ".CcmConsumerService._store_received_certificate"
    )
    @patch(
        "services.addons.ccm_kit.v1.ccm_consumer_service.http_requests"
    )
    @patch(
        "services.addons.ccm_kit.v1.ccm_consumer_service.consumer_connector_service"
    )
    @patch(
        "services.addons.ccm_kit.v1.ccm_consumer_service.ConfigManager"
    )
    @patch(
        "services.addons.ccm_kit.v1.ccm_base_service.connector_manager"
    )
    def test_pull_success(
        self, mock_cm, mock_config, mock_ccs, mock_http, mock_store, service
    ):
        """Full pull flow succeeds end-to-end."""
        mock_cm.consumer.get_connectors.return_value = [DSP_URL]
        mock_config.get_config.return_value = "1"

        mock_ccs.get_filter_expression.return_value = {}
        mock_ccs.do_dsp_with_bpnl.return_value = ("https://dp.example.com/data", "token-abc")
        mock_ccs.get_data_plane_headers.return_value = {"Authorization": "token-abc"}

        response_mock = Mock()
        response_mock.json.return_value = {"businessPartnerNumber": "BPNL000000000001"}
        response_mock.raise_for_status.return_value = None
        mock_http.get.return_value = response_mock

        mock_store.return_value = True

        request = CcmPullRequest(providerBpn=PROVIDER_BPN, documentId="doc-001")
        result = service.pull_certificate(request)

        assert result.certificate_data == {"businessPartnerNumber": "BPNL000000000001"}
        assert result.stored is True
        mock_store.assert_called_once()

    @patch(
        "services.addons.ccm_kit.v1.ccm_base_service.connector_manager"
    )
    def test_pull_discovery_failure(self, mock_cm, service):
        """Discovery failure returns empty result."""
        mock_cm.consumer.get_connectors.return_value = []

        request = CcmPullRequest(providerBpn=PROVIDER_BPN, documentId="doc-001")
        result = service.pull_certificate(request)

        assert result.certificate_data == {}
        assert result.stored is False

    @patch(
        "services.addons.ccm_kit.v1.ccm_consumer_service.consumer_connector_service"
    )
    @patch(
        "services.addons.ccm_kit.v1.ccm_consumer_service.ConfigManager"
    )
    @patch(
        "services.addons.ccm_kit.v1.ccm_base_service.connector_manager"
    )
    def test_pull_dsp_failure(self, mock_cm, mock_config, mock_ccs, service):
        """DSP negotiation failure (e.g. asset not in catalog) returns empty result."""
        mock_cm.consumer.get_connectors.return_value = [DSP_URL]
        mock_config.get_config.return_value = "5"
        mock_ccs.get_filter_expression.return_value = {}
        mock_ccs.do_dsp_with_bpnl.side_effect = RuntimeError(
            "Asset not found in provider catalog"
        )

        request = CcmPullRequest(providerBpn=PROVIDER_BPN, documentId="doc-001")
        result = service.pull_certificate(request)

        assert result.certificate_data == {}
        assert result.stored is False

    @patch(
        "services.addons.ccm_kit.v1.ccm_consumer_service.http_requests"
    )
    @patch(
        "services.addons.ccm_kit.v1.ccm_consumer_service.consumer_connector_service"
    )
    @patch(
        "services.addons.ccm_kit.v1.ccm_consumer_service.ConfigManager"
    )
    @patch(
        "services.addons.ccm_kit.v1.ccm_base_service.connector_manager"
    )
    def test_pull_edr_timeout(
        self, mock_cm, mock_config, mock_ccs, mock_http, service
    ):
        """DSP polling exhausts retries without obtaining an EDR — returns empty result."""
        mock_cm.consumer.get_connectors.return_value = [DSP_URL]
        mock_config.get_config.return_value = "2"

        mock_ccs.get_filter_expression.return_value = {}
        mock_ccs.do_dsp_with_bpnl.side_effect = RuntimeError(
            "EDR entry not available after timeout"
        )

        request = CcmPullRequest(providerBpn=PROVIDER_BPN, documentId="doc-001")
        result = service.pull_certificate(request)

        assert result.certificate_data == {}
        assert result.stored is False

    @patch(
        "services.addons.ccm_kit.v1.ccm_consumer_service.http_requests"
    )
    @patch(
        "services.addons.ccm_kit.v1.ccm_consumer_service.consumer_connector_service"
    )
    @patch(
        "services.addons.ccm_kit.v1.ccm_consumer_service.ConfigManager"
    )
    @patch(
        "services.addons.ccm_kit.v1.ccm_base_service.connector_manager"
    )
    def test_pull_invalid_json_response(
        self, mock_cm, mock_config, mock_ccs, mock_http, service
    ):
        """Data plane returns non-JSON response."""
        mock_cm.consumer.get_connectors.return_value = [DSP_URL]
        mock_config.get_config.return_value = "1"

        mock_ccs.get_filter_expression.return_value = {}
        mock_ccs.do_dsp_with_bpnl.return_value = ("https://dp.example.com/data", "token-abc")
        mock_ccs.get_data_plane_headers.return_value = {"Authorization": "token-abc"}

        response_mock = Mock()
        response_mock.raise_for_status.return_value = None
        response_mock.json.side_effect = ValueError("No JSON object could be decoded")
        mock_http.get.return_value = response_mock

        request = CcmPullRequest(providerBpn=PROVIDER_BPN, documentId="doc-001")
        result = service.pull_certificate(request)

        assert result.certificate_data == {}
        assert result.stored is False


# ---------------------------------------------------------------------------
# _store_received_certificate Tests
# ---------------------------------------------------------------------------


class TestStoreReceivedCertificate:
    """Tests for CcmConsumerService._store_received_certificate"""

    @patch(
        "services.addons.ccm_kit.v1.ccm_consumer_service.RepositoryManagerFactory"
    )
    def test_store_success(self, mock_factory, service):
        """Certificate data is stored successfully."""
        repos = Mock()
        mock_factory.create.return_value.__enter__.return_value = repos

        cert_data = {
            "businessPartnerNumber": "BPNL000000000001",
            "type": {"certificateType": "ISO9001"},
            "document": {"documentID": "1", "contentBase64": "AQID"},
            "issuer": {"issuerName": "Test Issuer"},
            "validator": {"validatorName": "Test Validator"},
            "validFrom": "2024-01-01",
            "validUntil": "2027-12-31",
            "trustLevel": "high",
            "registrationNumber": "REG-001",
            "areaOfApplication": "Manufacturing",
            "uploader": "BPNL00000003AYRE",
        }

        stored = service._store_received_certificate(
            certificate_data=cert_data,
            provider_bpn=PROVIDER_BPN,
            document_id="doc-001",
        )

        assert stored is True
        repos.session.add.assert_called_once()
        repos.commit.assert_called_once()

    @patch(
        "services.addons.ccm_kit.v1.ccm_consumer_service.RepositoryManagerFactory"
    )
    def test_store_invalid_base64_still_stores(self, mock_factory, service):
        """Invalid base64 content is logged as warning but storage proceeds."""
        repos = Mock()
        mock_factory.create.return_value.__enter__.return_value = repos

        cert_data = {
            "businessPartnerNumber": "BPNL000000000001",
            "type": {"certificateType": "ISO9001"},
            "document": {"contentBase64": "!!!invalid-base64!!!"},
            "issuer": {},
            "validator": {},
        }

        stored = service._store_received_certificate(
            certificate_data=cert_data,
            provider_bpn=PROVIDER_BPN,
            document_id="doc-002",
        )

        assert stored is True
        repos.session.add.assert_called_once()

    @patch(
        "services.addons.ccm_kit.v1.ccm_consumer_service.RepositoryManagerFactory"
    )
    def test_store_db_error(self, mock_factory, service):
        """Database commit failure returns False."""
        repos = Mock()
        repos.commit.side_effect = Exception("DB connection lost")
        mock_factory.create.return_value.__enter__.return_value = repos

        cert_data = {
            "businessPartnerNumber": "BPNL000000000001",
            "type": {"certificateType": "ISO9001"},
            "document": {},
            "issuer": {},
            "validator": {},
        }

        stored = service._store_received_certificate(
            certificate_data=cert_data,
            provider_bpn=PROVIDER_BPN,
            document_id="doc-003",
        )

        assert stored is False
