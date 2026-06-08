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
from models.metadata_database.addons.ccm_kit.v1.models import ReceivedCertificateStatus


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

    @patch("services.addons.ccm_kit.v1.ccm_base_service.NotificationConsumerService")
    @patch("services.addons.ccm_kit.v1.ccm_base_service.ConfigManager")
    @patch("services.addons.ccm_kit.v1.ccm_base_service.connector_manager")
    @patch("services.addons.ccm_kit.v1.ccm_consumer_service.consumer_connector_service")
    def test_send_request_provider_rejected(self, mock_ccs, mock_cm, mock_config, mock_ncs_class, service):
        """
        Provider returns 200 REJECTED (certificate not found on provider side).
        The consumer service must surface this as success=False so the caller
        receives a meaningful error instead of a misleading success=True.
        """
        mock_cm.consumer.get_connectors.return_value = [DSP_URL]
        mock_config.get_config.return_value = None

        mock_ncs = Mock()
        mock_ncs_class.return_value = mock_ncs
        mock_ncs.get_notification_endpoint_with_bpnl.return_value = (
            "https://dataplane.example.com/public",
            "token-reject",
        )
        # SDK returns the 200 REJECTED response body (CX-0135 §3.4)
        mock_ncs.send_notification_to_endpoint.return_value = {
            "header": {"messageId": "abc", "context": "CompanyCertificateManagement-CCMAPI-Request:1.0.0"},
            "content": {
                "requestStatus": "REJECTED",
                "requestErrors": [
                    {"message": "No certificate found for BPNL BPNL00000003XYZQ with type ISO50001."}
                ],
            },
        }

        payload = CcmSendRequestPayload(
            senderBpn=CONSUMER_BPN,
            providerBpn=PROVIDER_BPN,
            certifiedBpn="BPNL00000003XYZQ",
            certificateType="ISO50001",
        )
        result = service.send_certificate_request(payload, CONSUMER_BPN)

        assert result.success is False
        assert "No certificate found" in result.error
        assert result.message_id is not None  # notification was sent, ID preserved

    @patch("services.addons.ccm_kit.v1.ccm_base_service.NotificationConsumerService")
    @patch("services.addons.ccm_kit.v1.ccm_base_service.ConfigManager")
    @patch("services.addons.ccm_kit.v1.ccm_base_service.connector_manager")
    @patch("services.addons.ccm_kit.v1.ccm_consumer_service.consumer_connector_service")
    def test_send_request_provider_completed(self, mock_ccs, mock_cm, mock_config, mock_ncs_class, service):
        """
        Provider returns 200 COMPLETED (certificate already published).
        The consumer service must return success=True.
        """
        mock_cm.consumer.get_connectors.return_value = [DSP_URL]
        mock_config.get_config.return_value = None

        mock_ncs = Mock()
        mock_ncs_class.return_value = mock_ncs
        mock_ncs.get_notification_endpoint_with_bpnl.return_value = (
            "https://dataplane.example.com/public",
            "token-complete",
        )
        mock_ncs.send_notification_to_endpoint.return_value = {
            "header": {"messageId": "def"},
            "content": {
                "requestStatus": "COMPLETED",
                "documentId": "ichub:asset:ccm-cert:some-uuid",
            },
        }

        payload = CcmSendRequestPayload(
            senderBpn=CONSUMER_BPN,
            providerBpn=PROVIDER_BPN,
            certifiedBpn="BPNL000000000065",
            certificateType="ISO9001",
        )
        result = service.send_certificate_request(payload, CONSUMER_BPN)

        assert result.success is True
        assert result.error is None


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


class TestSendStatusLocalStatusMapping:
    """Tests that send_certificate_status maps consumer feedback to the correct local_status."""

    @patch("services.addons.ccm_kit.v1.ccm_consumer_service.RepositoryManagerFactory")
    @patch("services.addons.ccm_kit.v1.ccm_base_service.NotificationConsumerService")
    @patch("services.addons.ccm_kit.v1.ccm_base_service.ConfigManager")
    @patch("services.addons.ccm_kit.v1.ccm_base_service.connector_manager")
    @patch("services.addons.ccm_kit.v1.ccm_consumer_service.consumer_connector_service")
    def test_received_sets_local_status_received(
        self, mock_ccs, mock_cm, mock_config, mock_ncs_class, mock_factory, service
    ):
        """
        GIVEN certificateStatus=RECEIVED
        WHEN send_certificate_status is called
        THEN local_status is updated to ReceivedCertificateStatus.Received (not Pending).
        """
        mock_cm.consumer.get_connectors.return_value = [DSP_URL]
        mock_config.get_config.return_value = None

        mock_ncs = Mock()
        mock_ncs_class.return_value = mock_ncs
        mock_ncs.get_notification_endpoint_with_bpnl.return_value = (
            "https://dataplane.example.com/public", "token-rcv"
        )
        mock_ncs.send_notification_to_endpoint.return_value = {"status": "sent"}

        repos = Mock()
        mock_factory.create.return_value.__enter__.return_value = repos

        payload = CcmSendStatusPayload(
            senderBpn=CONSUMER_BPN,
            providerBpn=PROVIDER_BPN,
            documentId="doc-001",
            certificateStatus=CertificateStatusValue.RECEIVED,
        )
        result = service.send_certificate_status(payload, CONSUMER_BPN)

        assert result.success is True
        repos.ccm_received_repository.update_local_status.assert_called_once_with(
            document_id="doc-001",
            provider_bpn=PROVIDER_BPN,
            new_status=ReceivedCertificateStatus.Received,
            rejection_reason=None,
        )

    @patch("services.addons.ccm_kit.v1.ccm_consumer_service.RepositoryManagerFactory")
    @patch("services.addons.ccm_kit.v1.ccm_base_service.NotificationConsumerService")
    @patch("services.addons.ccm_kit.v1.ccm_base_service.ConfigManager")
    @patch("services.addons.ccm_kit.v1.ccm_base_service.connector_manager")
    @patch("services.addons.ccm_kit.v1.ccm_consumer_service.consumer_connector_service")
    def test_accepted_sets_local_status_accepted(
        self, mock_ccs, mock_cm, mock_config, mock_ncs_class, mock_factory, service
    ):
        """
        GIVEN certificateStatus=ACCEPTED
        WHEN send_certificate_status is called
        THEN local_status is updated to ReceivedCertificateStatus.Accepted.
        """
        mock_cm.consumer.get_connectors.return_value = [DSP_URL]
        mock_config.get_config.return_value = None

        mock_ncs = Mock()
        mock_ncs_class.return_value = mock_ncs
        mock_ncs.get_notification_endpoint_with_bpnl.return_value = (
            "https://dataplane.example.com/public", "token-acc"
        )
        mock_ncs.send_notification_to_endpoint.return_value = {"status": "sent"}

        repos = Mock()
        mock_factory.create.return_value.__enter__.return_value = repos

        payload = CcmSendStatusPayload(
            senderBpn=CONSUMER_BPN,
            providerBpn=PROVIDER_BPN,
            documentId="doc-002",
            certificateStatus=CertificateStatusValue.ACCEPTED,
        )
        result = service.send_certificate_status(payload, CONSUMER_BPN)

        assert result.success is True
        repos.ccm_received_repository.update_local_status.assert_called_once_with(
            document_id="doc-002",
            provider_bpn=PROVIDER_BPN,
            new_status=ReceivedCertificateStatus.Accepted,
            rejection_reason=None,
        )


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
        ".CcmConsumerService._correlate_outbound_after_pull"
    )
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
        self, mock_cm, mock_config, mock_ccs, mock_http, mock_store,
        mock_correlate, service,
    ):
        """Full pull flow succeeds end-to-end and correlates outbound requests."""
        mock_cm.consumer.get_connectors.return_value = [DSP_URL]
        mock_config.get_config.return_value = "1"

        mock_ccs.get_filter_expression.return_value = {}
        mock_ccs.do_dsp_with_bpnl.return_value = ("https://dp.example.com/data", "token-abc")
        mock_ccs.get_data_plane_headers.return_value = {"Authorization": "token-abc"}

        cert_data = {
            "businessPartnerNumber": "BPNL000000000001",
            "type": {"certificateType": "ISO9001"},
        }
        response_mock = Mock()
        response_mock.json.return_value = cert_data
        response_mock.raise_for_status.return_value = None
        mock_http.get.return_value = response_mock

        mock_store.return_value = True

        request = CcmPullRequest(providerBpn=PROVIDER_BPN, documentId="doc-001")
        result = service.pull_certificate(request)

        assert result.certificate_data == cert_data
        assert result.stored is True
        mock_store.assert_called_once()
        mock_correlate.assert_called_once_with(
            provider_bpn=PROVIDER_BPN,
            certified_bpn="BPNL000000000001",
            certificate_type="ISO9001",
            document_id="doc-001",
            related_message_id=None,
        )

    @patch(
        "services.addons.ccm_kit.v1.ccm_consumer_service"
        ".CcmConsumerService._correlate_outbound_after_pull"
    )
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
    def test_pull_correlation_failure_does_not_break_result(
        self, mock_cm, mock_config, mock_ccs, mock_http, mock_store,
        mock_correlate, service,
    ):
        """Correlation failure after pull is logged but doesn't affect the result."""
        mock_cm.consumer.get_connectors.return_value = [DSP_URL]
        mock_config.get_config.return_value = "1"

        mock_ccs.get_filter_expression.return_value = {}
        mock_ccs.do_dsp_with_bpnl.return_value = ("https://dp.example.com/data", "token-abc")
        mock_ccs.get_data_plane_headers.return_value = {"Authorization": "token-abc"}

        cert_data = {
            "businessPartnerNumber": "BPNL000000000001",
            "type": {"certificateType": "ISO9001"},
        }
        response_mock = Mock()
        response_mock.json.return_value = cert_data
        response_mock.raise_for_status.return_value = None
        mock_http.get.return_value = response_mock

        mock_store.return_value = True
        mock_correlate.side_effect = Exception("DB connection lost")

        request = CcmPullRequest(providerBpn=PROVIDER_BPN, documentId="doc-001")
        result = service.pull_certificate(request)

        assert result.stored is True
        assert result.certificate_data == cert_data

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
        repos.ccm_received_repository.find_by_document_id.return_value = None
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
        repos.ccm_received_repository.create_new.assert_called_once()

    @patch(
        "services.addons.ccm_kit.v1.ccm_consumer_service.RepositoryManagerFactory"
    )
    def test_store_invalid_base64_still_stores(self, mock_factory, service):
        """Invalid base64 content is logged as warning but storage proceeds."""
        repos = Mock()
        repos.ccm_received_repository.find_by_document_id.return_value = None
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
        repos.ccm_received_repository.create_new.assert_called_once()

    @patch(
        "services.addons.ccm_kit.v1.ccm_consumer_service.RepositoryManagerFactory"
    )
    def test_store_db_error(self, mock_factory, service):
        """Database commit failure returns False."""
        repos = Mock()
        repos.ccm_received_repository.find_by_document_id.return_value = None
        repos.ccm_received_repository.create_new.side_effect = Exception("DB connection lost")
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

    @patch(
        "services.addons.ccm_kit.v1.ccm_consumer_service.RepositoryManagerFactory"
    )
    def test_store_duplicate_returns_true(self, mock_factory, service):
        """Pulling an already-stored document is idempotent and returns True."""
        repos = Mock()
        repos.ccm_received_repository.find_by_document_id.return_value = Mock()
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
            document_id="doc-already-stored",
        )

        assert stored is True
        repos.ccm_received_repository.create_new.assert_not_called()


# ---------------------------------------------------------------------------
# OutboundRequest localStatus enrichment tests
# ---------------------------------------------------------------------------

class TestOutboundRequestLocalStatus:
    """Tests that list_requests / get_request expose localStatus from CcmReceived."""

    def _make_outbound_record(self, document_id=None):
        """Create a minimal CcmOutboundRequest-like mock."""
        from models.metadata_database.addons.ccm_kit.v1.models import OutboundRequestStatus
        from datetime import datetime, timezone
        record = Mock()
        record.id = 1
        record.sender_bpn = CONSUMER_BPN
        record.provider_bpn = PROVIDER_BPN
        record.certified_bpn = "BPNL000000000001"
        record.certificate_type = "ISO9001"
        record.location_bpns = None
        record.status = OutboundRequestStatus.Found
        record.notification_id = "notif-001"
        record.document_id = document_id
        record.requested_at = datetime(2024, 1, 1, tzinfo=timezone.utc)
        record.updated_at = datetime(2024, 1, 2, tzinfo=timezone.utc)
        return record

    @patch("services.addons.ccm_kit.v1.ccm_consumer_service.RepositoryManagerFactory")
    def test_local_status_none_when_no_document_id(self, mock_factory, service):
        """
        GIVEN an outbound request with document_id=None
        WHEN get_request is called
        THEN localStatus and rejectionReason are null (no CcmReceived lookup).
        """
        record = self._make_outbound_record(document_id=None)
        repos = Mock()
        repos.ccm_outbound_request_repository.find_by_id.return_value = record
        mock_factory.create.return_value.__enter__.return_value = repos

        result = service.get_request(1)

        assert result is not None
        assert result.local_status is None
        assert result.rejection_reason is None
        repos.ccm_received_repository.find_by_document_id.assert_not_called()

    @patch("services.addons.ccm_kit.v1.ccm_consumer_service.RepositoryManagerFactory")
    def test_local_status_from_received_record(self, mock_factory, service):
        """
        GIVEN document_id is set and CcmReceived.local_status = Received
        WHEN get_request is called
        THEN localStatus = "Received" and rejectionReason = None.
        """
        record = self._make_outbound_record(document_id="doc-abc")

        received_mock = Mock()
        received_mock.local_status = ReceivedCertificateStatus.Received
        received_mock.rejection_reason = None

        repos = Mock()
        repos.ccm_outbound_request_repository.find_by_id.return_value = record
        repos.ccm_received_repository.find_by_document_id.return_value = received_mock
        mock_factory.create.return_value.__enter__.return_value = repos

        result = service.get_request(1)

        assert result is not None
        assert result.local_status == "Received"
        assert result.rejection_reason is None
        repos.ccm_received_repository.find_by_document_id.assert_called_once_with(
            "doc-abc", provider_bpn=PROVIDER_BPN
        )

    @patch("services.addons.ccm_kit.v1.ccm_consumer_service.RepositoryManagerFactory")
    def test_local_status_none_when_no_received_record(self, mock_factory, service):
        """
        GIVEN document_id is set but find_by_document_id returns None
        WHEN get_request is called
        THEN localStatus and rejectionReason are null.
        """
        record = self._make_outbound_record(document_id="doc-missing")
        repos = Mock()
        repos.ccm_outbound_request_repository.find_by_id.return_value = record
        repos.ccm_received_repository.find_by_document_id.return_value = None
        mock_factory.create.return_value.__enter__.return_value = repos

        result = service.get_request(1)

        assert result is not None
        assert result.local_status is None
        assert result.rejection_reason is None

    @patch("services.addons.ccm_kit.v1.ccm_consumer_service.RepositoryManagerFactory")
    def test_local_status_rejected_with_reason(self, mock_factory, service):
        """
        GIVEN CcmReceived.local_status = Rejected with rejection_reason JSON
        WHEN get_request is called
        THEN localStatus = "Rejected" and rejectionReason is a typed RejectionReasonPayload.
        """
        import json
        from models.services.addons.ccm_kit.v1.notifications import RejectionReasonPayload

        record = self._make_outbound_record(document_id="doc-rej")

        # Store a properly structured JSON string in the DB (what the service writes).
        rejection_json = json.dumps({
            "certificateErrors": [{"message": "Certificate has expired"}]
        })
        received_mock = Mock()
        received_mock.local_status = ReceivedCertificateStatus.Rejected
        received_mock.rejection_reason = rejection_json

        repos = Mock()
        repos.ccm_outbound_request_repository.find_by_id.return_value = record
        repos.ccm_received_repository.find_by_document_id.return_value = received_mock
        mock_factory.create.return_value.__enter__.return_value = repos

        result = service.get_request(1)

        assert result is not None
        assert result.local_status == "Rejected"
        # rejection_reason is now a typed object, not a raw string
        assert isinstance(result.rejection_reason, RejectionReasonPayload)
        assert result.rejection_reason.certificate_errors is not None
        assert result.rejection_reason.certificate_errors[0].message == "Certificate has expired"


# ---------------------------------------------------------------------------
# send_certificate_status REJECTED saves rejection_reason
# ---------------------------------------------------------------------------

class TestSendStatusRejectionReason:
    """Tests that send_certificate_status persists rejection_reason when REJECTED."""

    @patch("services.addons.ccm_kit.v1.ccm_consumer_service.RepositoryManagerFactory")
    @patch("services.addons.ccm_kit.v1.ccm_base_service.NotificationConsumerService")
    @patch("services.addons.ccm_kit.v1.ccm_base_service.ConfigManager")
    @patch("services.addons.ccm_kit.v1.ccm_base_service.connector_manager")
    @patch("services.addons.ccm_kit.v1.ccm_consumer_service.consumer_connector_service")
    def test_rejected_saves_rejection_reason(
        self, mock_ccs, mock_cm, mock_config, mock_ncs_class, mock_factory, service
    ):
        """
        GIVEN certificateStatus=REJECTED with certificateErrors and locationErrors
        WHEN send_certificate_status is called
        THEN update_local_status is called with a structured JSON rejection_reason
             containing certificateErrors (list of {message}) and locationErrors
             (list of {bpn, locationErrors: [{message}]}).
        """
        import json
        from models.services.addons.ccm_kit.v1.notifications import (
            CcmSendStatusPayload,
            CertificateErrorDetail,
            LocationErrorDetail,
        )

        mock_cm.consumer.get_connectors.return_value = [DSP_URL]
        mock_config.get_config.return_value = None

        mock_ncs = Mock()
        mock_ncs_class.return_value = mock_ncs
        mock_ncs.get_notification_endpoint_with_bpnl.return_value = (
            "https://dataplane.example.com/public", "token-rej"
        )
        mock_ncs.send_notification_to_endpoint.return_value = {"status": "sent"}

        repos = Mock()
        mock_factory.create.return_value.__enter__.return_value = repos

        payload = CcmSendStatusPayload(
            senderBpn=CONSUMER_BPN,
            providerBpn=PROVIDER_BPN,
            documentId="doc-rej-001",
            certificateStatus=CertificateStatusValue.REJECTED,
            certificateErrors=[CertificateErrorDetail(message="Certificate has expired")],
            locationErrors=[
                LocationErrorDetail(
                    bpn="BPNS000000000001",
                    locationErrors=[
                        CertificateErrorDetail(message="Area of application mismatch"),
                    ],
                )
            ],
        )
        result = service.send_certificate_status(payload, CONSUMER_BPN)

        assert result.success is True
        call_kwargs = repos.ccm_received_repository.update_local_status.call_args
        assert call_kwargs is not None
        kwargs = call_kwargs.kwargs if call_kwargs.kwargs else {}

        # Must be called with Rejected status
        assert kwargs.get("new_status") == ReceivedCertificateStatus.Rejected

        # rejection_reason must be a structured JSON string
        rejection_reason = kwargs.get("rejection_reason")
        assert rejection_reason is not None
        parsed = json.loads(rejection_reason)

        # Certificate-level errors: list of {"message": "..."}
        assert "certificateErrors" in parsed
        assert parsed["certificateErrors"] == [{"message": "Certificate has expired"}]

        # Site-level errors: list of {"bpn": "...", "locationErrors": [{"message": "..."}]}
        assert "locationErrors" in parsed
        assert len(parsed["locationErrors"]) == 1
        loc = parsed["locationErrors"][0]
        assert loc["bpn"] == "BPNS000000000001"
        assert loc["locationErrors"] == [{"message": "Area of application mismatch"}]
