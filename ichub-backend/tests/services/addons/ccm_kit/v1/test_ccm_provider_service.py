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
Unit tests for CcmProviderService.

Covers the provider-side outbound operations:
- Push certificate (success / cert-not-found / discovery failure / notification error)
- Send certificate available (success / cert-not-found / error)
- Helper: _build_push_content serialisation
"""

import base64
from datetime import date, datetime, timezone
from unittest.mock import Mock, patch

import pytest
from tractusx_sdk.industry.services.notifications.exceptions import NotificationError

from models.metadata_database.addons.ccm_kit.v1.models import (
    Ccm,
    CcmInboundRequest,
    CcmSite,
    CertificateShare,
    InboundRequestStatus,
    ShareStatus,
    TrustLevel,
)
from models.services.addons.ccm_kit.v1.notifications import (
    CcmAvailableRequest,
    CcmPushRequest,
)
from services.addons.ccm_kit.v1.ccm_provider_service import (
    CcmProviderService,
)


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

SENDER_BPN = "BPNL00000003AYRE"
CONSUMER_BPN = "BPNL00000003CSGV"
DSP_URL = "https://consumer-edc.example.com/api/v1/dsp"
CERT_ID = 42


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_ccm(**kwargs) -> Mock:
    """Return a Mock resembling a Ccm ORM record."""
    m = Mock(spec=Ccm)
    m.id = kwargs.get("id", CERT_ID)
    m.bpnl = kwargs.get("bpnl", "BPNL000000000001")
    m.certificate_type = kwargs.get("certificate_type", "ISO9001")
    m.issuer = kwargs.get("issuer", "TÜV Rheinland")
    m.valid_from = kwargs.get("valid_from", date(2024, 1, 1))
    m.valid_until = kwargs.get("valid_until", date(2027, 12, 31))
    m.trust_level = kwargs.get("trust_level", TrustLevel.high)
    m.registration_number = kwargs.get("registration_number", "REG-001")
    m.area_of_application = kwargs.get("area_of_application", "Manufacturing")
    m.uploader_bpnl = kwargs.get("uploader_bpnl", SENDER_BPN)
    m.validator = kwargs.get("validator", "Validator GmbH")
    m.doc = kwargs.get("doc", b"%PDF-1.4 test content")
    m.created_at = kwargs.get("created_at", datetime(2024, 6, 1, tzinfo=timezone.utc))

    # Sites
    site_mocks = kwargs.get("sites", None)
    if site_mocks is None:
        site1 = Mock(spec=CcmSite)
        site1.site_bpn = "BPNS000000000001"
        m.sites = [site1]
    else:
        m.sites = site_mocks

    m.shares = kwargs.get("shares", [])
    return m


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def service():
    return CcmProviderService()


def _push_request(cert_id: int = CERT_ID) -> CcmPushRequest:
    return CcmPushRequest(
        sender_bpn=SENDER_BPN,
        certificate_id=cert_id,
        consumer_bpn=CONSUMER_BPN,
    )


def _available_request(cert_id: int = CERT_ID) -> CcmAvailableRequest:
    return CcmAvailableRequest(
        sender_bpn=SENDER_BPN,
        certificate_id=cert_id,
        consumer_bpn=CONSUMER_BPN,
    )


# ---------------------------------------------------------------------------
# Push Certificate Tests
# ---------------------------------------------------------------------------


class TestPushCertificate:
    """Tests for CcmProviderService.push_certificate"""

    @patch(
        "services.addons.ccm_kit.v1.ccm_provider_service"
        ".CcmProviderService._update_share_status"
    )
    @patch(
        "services.addons.ccm_kit.v1.ccm_base_service"
        ".NotificationConsumerService"
    )
    @patch(
        "services.addons.ccm_kit.v1.ccm_base_service.connector_manager"
    )
    @patch(
        "services.addons.ccm_kit.v1.ccm_provider_service"
        ".RepositoryManagerFactory.create"
    )
    def test_push_success(
        self, mock_factory, mock_cm, mock_ncs_class, mock_update_share, service
    ):
        """
        GIVEN a valid certificate in the DB
        WHEN push_certificate is called
        THEN the notification is sent and share status is updated.
        """
        ccm = _make_ccm()
        repos = Mock()
        repos.ccm_repository.find_by_id_with_relations.return_value = ccm
        repos.ccm_inbound_request_repository.advance_status_for_consumer.return_value = []
        mock_factory.return_value.__enter__.return_value = repos

        mock_cm.consumer.get_connectors.return_value = [DSP_URL]

        mock_ncs = Mock()
        mock_ncs.get_notification_endpoint_with_bpnl.return_value = (
            "https://endpoint.example.com",
            "token123",
        )
        mock_ncs_class.return_value = mock_ncs

        result = service.push_certificate(_push_request(), SENDER_BPN)

        assert result.success is True
        assert result.message_id is not None
        mock_ncs.send_notification_to_endpoint.assert_called_once()
        mock_update_share.assert_called_once_with(
            certificate_id=CERT_ID,
            consumer_bpn=CONSUMER_BPN,
        )
        repos.ccm_inbound_request_repository.advance_status_for_consumer.assert_called_once_with(
            consumer_bpn=CONSUMER_BPN,
            certified_bpn=ccm.bpnl,
            certificate_type=ccm.certificate_type,
            certificate_id=CERT_ID,
            new_status=InboundRequestStatus.Pushed,
            skip_statuses=[
                InboundRequestStatus.Available,
                InboundRequestStatus.Pushed,
            ],
        )

    @patch(
        "services.addons.ccm_kit.v1.ccm_provider_service"
        ".RepositoryManagerFactory.create"
    )
    def test_push_certificate_not_found(self, mock_factory, service):
        """
        GIVEN a certificate ID that doesn't exist
        WHEN push_certificate is called
        THEN the result indicates failure with an error message.
        """
        repos = Mock()
        repos.ccm_repository.find_by_id_with_relations.return_value = None
        mock_factory.return_value.__enter__.return_value = repos

        result = service.push_certificate(_push_request(999), SENDER_BPN)

        assert result.success is False
        assert "not found" in result.error.lower()

    @patch(
        "services.addons.ccm_kit.v1.ccm_base_service.connector_manager"
    )
    @patch(
        "services.addons.ccm_kit.v1.ccm_provider_service"
        ".RepositoryManagerFactory.create"
    )
    def test_push_discovery_failure(self, mock_factory, mock_cm, service):
        """
        GIVEN a valid certificate but discovery fails for the consumer
        WHEN push_certificate is called
        THEN the result indicates failure.
        """
        ccm = _make_ccm()
        repos = Mock()
        repos.ccm_repository.find_by_id_with_relations.return_value = ccm
        mock_factory.return_value.__enter__.return_value = repos

        mock_cm.consumer.get_connectors.return_value = []

        result = service.push_certificate(_push_request(), SENDER_BPN)

        assert result.success is False
        assert "discovery" in result.error.lower()

    @patch(
        "services.addons.ccm_kit.v1.ccm_base_service"
        ".NotificationConsumerService"
    )
    @patch(
        "services.addons.ccm_kit.v1.ccm_base_service.connector_manager"
    )
    @patch(
        "services.addons.ccm_kit.v1.ccm_provider_service"
        ".RepositoryManagerFactory.create"
    )
    def test_push_notification_error(
        self, mock_factory, mock_cm, mock_ncs_class, service
    ):
        """
        GIVEN a valid certificate and successful discovery
        WHEN the notification sending raises NotificationError
        THEN the result indicates failure.
        """
        ccm = _make_ccm()
        repos = Mock()
        repos.ccm_repository.find_by_id_with_relations.return_value = ccm
        mock_factory.return_value.__enter__.return_value = repos

        mock_cm.consumer.get_connectors.return_value = [DSP_URL]

        mock_ncs = Mock()
        mock_ncs.get_notification_endpoint_with_bpnl.side_effect = NotificationError(
            "EDR negotiation failed"
        )
        mock_ncs_class.return_value = mock_ncs

        result = service.push_certificate(_push_request(), SENDER_BPN)

        assert result.success is False
        assert "negotiation" in result.error.lower()

    @patch(
        "services.addons.ccm_kit.v1.ccm_provider_service"
        ".CcmProviderService._update_share_status"
    )
    @patch(
        "services.addons.ccm_kit.v1.ccm_base_service"
        ".NotificationConsumerService"
    )
    @patch(
        "services.addons.ccm_kit.v1.ccm_base_service.connector_manager"
    )
    @patch(
        "services.addons.ccm_kit.v1.ccm_provider_service"
        ".RepositoryManagerFactory.create"
    )
    def test_push_with_governance(
        self, mock_factory, mock_cm, mock_ncs_class, mock_update_share, service
    ):
        """
        GIVEN a push request with governance policies
        WHEN push_certificate is called
        THEN the governance policies are passed to the notification service.
        """
        ccm = _make_ccm()
        repos = Mock()
        repos.ccm_repository.find_by_id_with_relations.return_value = ccm
        repos.ccm_inbound_request_repository.advance_status_for_consumer.return_value = []
        mock_factory.return_value.__enter__.return_value = repos

        mock_cm.consumer.get_connectors.return_value = [DSP_URL]

        mock_ncs = Mock()
        mock_ncs.get_notification_endpoint_with_bpnl.return_value = (
            "https://endpoint.example.com",
            "token-gov",
        )
        mock_ncs_class.return_value = mock_ncs

        api_governance = [{"permission": [{"action": "use"}]}]
        request = CcmPushRequest(
            senderBpn=SENDER_BPN,
            certificateId=CERT_ID,
            consumerBpn=CONSUMER_BPN,
            governance=api_governance,
        )

        result = service.push_certificate(request, SENDER_BPN)

        assert result.success is True
        call_kwargs = mock_ncs.get_notification_endpoint_with_bpnl.call_args[1]
        assert call_kwargs["policies"] == api_governance
        repos.ccm_inbound_request_repository.advance_status_for_consumer.assert_called_once_with(
            consumer_bpn=CONSUMER_BPN,
            certified_bpn=ccm.bpnl,
            certificate_type=ccm.certificate_type,
            certificate_id=CERT_ID,
            new_status=InboundRequestStatus.Pushed,
            skip_statuses=[
                InboundRequestStatus.Available,
                InboundRequestStatus.Pushed,
            ],
        )


# ---------------------------------------------------------------------------
# Send Certificate Available Tests
# ---------------------------------------------------------------------------


class TestSendCertificateAvailable:
    """Tests for CcmProviderService.send_certificate_available"""

    @patch(
        "services.addons.ccm_kit.v1.ccm_base_service"
        ".NotificationConsumerService"
    )
    @patch(
        "services.addons.ccm_kit.v1.ccm_base_service.connector_manager"
    )
    @patch(
        "services.addons.ccm_kit.v1.ccm_provider_service"
        ".RepositoryManagerFactory.create"
    )
    def test_available_success(
        self, mock_factory, mock_cm, mock_ncs_class, service
    ):
        """
        GIVEN a valid certificate
        WHEN send_certificate_available is called
        THEN the notification is sent successfully.
        """
        ccm = _make_ccm()
        repos = Mock()
        repos.ccm_repository.find_by_id_with_relations.return_value = ccm
        repos.ccm_inbound_request_repository.advance_status_for_consumer.return_value = []
        mock_factory.return_value.__enter__.return_value = repos

        mock_cm.consumer.get_connectors.return_value = [DSP_URL]

        mock_ncs = Mock()
        mock_ncs.get_notification_endpoint_with_bpnl.return_value = (
            "https://endpoint.example.com",
            "token123",
        )
        mock_ncs_class.return_value = mock_ncs

        result = service.send_certificate_available(
            _available_request(), SENDER_BPN
        )

        assert result.success is True
        assert result.message_id is not None
        mock_ncs.send_notification_to_endpoint.assert_called_once()
        repos.ccm_inbound_request_repository.advance_status_for_consumer.assert_called_once_with(
            consumer_bpn=CONSUMER_BPN,
            certified_bpn=ccm.bpnl,
            certificate_type=ccm.certificate_type,
            certificate_id=CERT_ID,
            new_status=InboundRequestStatus.Available,
        )

    @patch(
        "services.addons.ccm_kit.v1.ccm_provider_service"
        ".RepositoryManagerFactory.create"
    )
    def test_available_certificate_not_found(self, mock_factory, service):
        """
        GIVEN a non-existent certificate ID
        WHEN send_certificate_available is called
        THEN the result indicates failure.
        """
        repos = Mock()
        repos.ccm_repository.find_by_id_with_relations.return_value = None
        mock_factory.return_value.__enter__.return_value = repos

        result = service.send_certificate_available(
            _available_request(999), SENDER_BPN
        )

        assert result.success is False
        assert "not found" in result.error.lower()

    @patch(
        "services.addons.ccm_kit.v1.ccm_base_service.connector_manager"
    )
    @patch(
        "services.addons.ccm_kit.v1.ccm_provider_service"
        ".RepositoryManagerFactory.create"
    )
    def test_available_discovery_failure(self, mock_factory, mock_cm, service):
        """
        GIVEN a valid certificate but consumer discovery fails
        WHEN send_certificate_available is called
        THEN the result indicates failure.
        """
        ccm = _make_ccm()
        repos = Mock()
        repos.ccm_repository.find_by_id_with_relations.return_value = ccm
        mock_factory.return_value.__enter__.return_value = repos

        mock_cm.consumer.get_connectors.return_value = []

        result = service.send_certificate_available(
            _available_request(), SENDER_BPN
        )

        assert result.success is False
        assert "discovery" in result.error.lower()

    @patch(
        "services.addons.ccm_kit.v1.ccm_base_service"
        ".NotificationConsumerService"
    )
    @patch(
        "services.addons.ccm_kit.v1.ccm_base_service.connector_manager"
    )
    @patch(
        "services.addons.ccm_kit.v1.ccm_provider_service"
        ".RepositoryManagerFactory.create"
    )
    def test_available_notification_error(
        self, mock_factory, mock_cm, mock_ncs_class, service
    ):
        """
        GIVEN a valid certificate and successful discovery
        WHEN notification sending raises an error
        THEN the result indicates failure.
        """
        ccm = _make_ccm()
        repos = Mock()
        repos.ccm_repository.find_by_id_with_relations.return_value = ccm
        mock_factory.return_value.__enter__.return_value = repos

        mock_cm.consumer.get_connectors.return_value = [DSP_URL]

        mock_ncs = Mock()
        mock_ncs.get_notification_endpoint_with_bpnl.side_effect = NotificationError(
            "Connection refused"
        )
        mock_ncs_class.return_value = mock_ncs

        result = service.send_certificate_available(
            _available_request(), SENDER_BPN
        )

        assert result.success is False
        assert "connection" in result.error.lower()

    @patch(
        "services.addons.ccm_kit.v1.ccm_base_service"
        ".NotificationConsumerService"
    )
    @patch(
        "services.addons.ccm_kit.v1.ccm_base_service.connector_manager"
    )
    @patch(
        "services.addons.ccm_kit.v1.ccm_provider_service"
        ".RepositoryManagerFactory.create"
    )
    def test_available_with_governance(
        self, mock_factory, mock_cm, mock_ncs_class, service
    ):
        """
        GIVEN an available request with governance policies
        WHEN send_certificate_available is called
        THEN the governance policies are passed to the notification service.
        """
        ccm = _make_ccm()
        repos = Mock()
        repos.ccm_repository.find_by_id_with_relations.return_value = ccm
        repos.ccm_inbound_request_repository.advance_status_for_consumer.return_value = []
        mock_factory.return_value.__enter__.return_value = repos

        mock_cm.consumer.get_connectors.return_value = [DSP_URL]

        mock_ncs = Mock()
        mock_ncs.get_notification_endpoint_with_bpnl.return_value = (
            "https://endpoint.example.com",
            "token-gov",
        )
        mock_ncs_class.return_value = mock_ncs

        api_governance = [{"permission": [{"action": "use"}]}]
        request = CcmAvailableRequest(
            senderBpn=SENDER_BPN,
            certificateId=CERT_ID,
            consumerBpn=CONSUMER_BPN,
            governance=api_governance,
        )

        result = service.send_certificate_available(request, SENDER_BPN)

        assert result.success is True
        call_kwargs = mock_ncs.get_notification_endpoint_with_bpnl.call_args[1]
        assert call_kwargs["policies"] == api_governance
        repos.ccm_inbound_request_repository.advance_status_for_consumer.assert_called_once_with(
            consumer_bpn=CONSUMER_BPN,
            certified_bpn=ccm.bpnl,
            certificate_type=ccm.certificate_type,
            certificate_id=CERT_ID,
            new_status=InboundRequestStatus.Available,
        )


# ---------------------------------------------------------------------------
# _build_push_content Tests
# ---------------------------------------------------------------------------


class TestBuildPushContent:
    """Tests for CcmProviderService._build_push_content"""

    def test_full_content_serialisation(self, service):
        """
        GIVEN a Ccm record with all fields populated (including sites and doc)
        WHEN _build_push_content is called
        THEN the returned dict matches CX-0135 push structure.
        """
        ccm = _make_ccm()
        content = service._build_push_content(ccm)

        assert content["businessPartnerNumber"] == "BPNL000000000001"
        assert content["type"]["certificateType"] == "ISO9001"
        assert content["issuer"]["issuerName"] == "TÜV Rheinland"
        assert content["trustLevel"] == "high"
        assert content["document"]["documentID"] == str(CERT_ID)
        assert content["document"]["contentType"] == "application/pdf"

        # Verify Base64 encoding
        decoded = base64.b64decode(content["document"]["contentBase64"])
        assert decoded == b"%PDF-1.4 test content"

        # Sites
        assert len(content["enclosedSites"]) == 1
        assert content["enclosedSites"][0]["enclosedSiteBpn"] == "BPNS000000000001"

        # Optional fields
        assert content["registrationNumber"] == "REG-001"
        assert content["areaOfApplication"] == "Manufacturing"
        assert content["uploader"] == SENDER_BPN
        assert content["validator"]["validatorName"] == "Validator GmbH"
        assert content["validFrom"] == "2024-01-01"
        assert content["validUntil"] == "2027-12-31"

    def test_minimal_content_no_doc(self, service):
        """
        GIVEN a Ccm record with no document, no optional fields, no sites
        WHEN _build_push_content is called
        THEN the content has empty contentBase64 and no optional keys.
        """
        ccm = _make_ccm(
            doc=None,
            sites=[],
            valid_until=None,
            registration_number=None,
            area_of_application=None,
            uploader_bpnl=None,
            validator=None,
        )
        content = service._build_push_content(ccm)

        assert content["document"]["contentBase64"] == ""
        assert "enclosedSites" not in content
        assert "registrationNumber" not in content
        assert "areaOfApplication" not in content
        assert "uploader" not in content
        assert "validator" not in content


# ---------------------------------------------------------------------------
# Publish Certificate Tests
# ---------------------------------------------------------------------------


class TestPublishCertificate:
    """Tests for CcmProviderService.publish_certificate"""

    @patch(
        "services.addons.ccm_kit.v1.ccm_provider_service.ConfigManager"
    )
    @patch(
        "services.addons.ccm_kit.v1.ccm_provider_service"
        ".connector_provider_manager"
    )
    @patch(
        "services.addons.ccm_kit.v1.ccm_provider_service"
        ".RepositoryManagerFactory.create"
    )
    def test_publish_success(
        self, mock_factory, mock_cpm, mock_config, service
    ):
        """
        GIVEN a valid certificate without an existing EDC asset
        WHEN publish_certificate is called
        THEN an EDC asset is registered and the asset ID is persisted.
        """
        ccm = _make_ccm()
        ccm.edc_asset_id = None
        repos = Mock()
        repos.ccm_repository.find_by_id_with_relations.return_value = ccm
        mock_factory.return_value.__enter__.return_value = repos

        mock_cpm.build_ccm_certificate_payload_url.return_value = (
            "https://backend.example.com/provider/certificates/42/payload"
        )
        mock_config.get_config.return_value = {"permissions": [{"action": "use"}]}
        mock_cpm.register_ccm_certificate_offer.return_value = (
            "ichub:asset:ccm-cert:new-uuid", "policy-1", "contract-1", "def-1"
        )

        result = service.publish_certificate(CERT_ID)

        assert result["document_id"] == "ichub:asset:ccm-cert:new-uuid"
        assert result["certificate_id"] == CERT_ID
        repos.ccm_repository.update_fields.assert_called_once_with(
            ccm.id, {"edc_asset_id": "ichub:asset:ccm-cert:new-uuid"}
        )
        repos.commit.assert_called_once()

    @patch(
        "services.addons.ccm_kit.v1.ccm_provider_service"
        ".RepositoryManagerFactory.create"
    )
    def test_publish_certificate_not_found(self, mock_factory, service):
        """
        GIVEN a non-existent certificate ID
        WHEN publish_certificate is called
        THEN a ValueError is raised.
        """
        repos = Mock()
        repos.ccm_repository.find_by_id_with_relations.return_value = None
        mock_factory.return_value.__enter__.return_value = repos

        with pytest.raises(ValueError, match="not found"):
            service.publish_certificate(999)

    @patch(
        "services.addons.ccm_kit.v1.ccm_provider_service.ConfigManager"
    )
    @patch(
        "services.addons.ccm_kit.v1.ccm_provider_service"
        ".connector_provider_manager"
    )
    @patch(
        "services.addons.ccm_kit.v1.ccm_provider_service"
        ".RepositoryManagerFactory.create"
    )
    def test_publish_reuses_existing_asset_id(
        self, mock_factory, mock_cpm, mock_config, service
    ):
        """
        GIVEN a certificate that already has an edc_asset_id
        WHEN publish_certificate is called
        THEN the existing asset ID is reused.
        """
        ccm = _make_ccm()
        ccm.edc_asset_id = "existing-asset-id"
        repos = Mock()
        repos.ccm_repository.find_by_id_with_relations.return_value = ccm
        mock_factory.return_value.__enter__.return_value = repos

        mock_cpm.build_ccm_certificate_payload_url.return_value = (
            "https://backend.example.com/provider/certificates/42/payload"
        )
        mock_config.get_config.return_value = {"permissions": [{"action": "use"}]}
        mock_cpm.register_ccm_certificate_offer.return_value = (
            "existing-asset-id", "policy-1", "contract-1", "def-1"
        )

        result = service.publish_certificate(CERT_ID)

        call_args = mock_cpm.register_ccm_certificate_offer.call_args
        assert call_args[1]["asset_id"] == "existing-asset-id"
        assert result["asset_id"] == "existing-asset-id"

    @patch(
        "services.addons.ccm_kit.v1.ccm_provider_service.ConfigManager"
    )
    @patch(
        "services.addons.ccm_kit.v1.ccm_provider_service"
        ".connector_provider_manager"
    )
    @patch(
        "services.addons.ccm_kit.v1.ccm_provider_service"
        ".RepositoryManagerFactory.create"
    )
    def test_publish_missing_policy_config(
        self, mock_factory, mock_cpm, mock_config, service
    ):
        """
        GIVEN no policy configuration
        WHEN publish_certificate is called
        THEN a ValueError is raised about missing policy.
        """
        ccm = _make_ccm()
        ccm.edc_asset_id = None
        repos = Mock()
        repos.ccm_repository.find_by_id_with_relations.return_value = ccm
        mock_factory.return_value.__enter__.return_value = repos

        mock_cpm.build_ccm_certificate_payload_url.return_value = (
            "https://backend.example.com/provider/certificates/42/payload"
        )
        mock_config.get_config.return_value = None

        with pytest.raises(ValueError, match="Missing configuration"):
            service.publish_certificate(CERT_ID)


# ---------------------------------------------------------------------------
# Unpublish Certificate Tests
# ---------------------------------------------------------------------------


class TestUnpublishCertificate:
    """Tests for CcmProviderService.unpublish_certificate"""

    @patch(
        "services.addons.ccm_kit.v1.ccm_provider_service"
        ".connector_provider_manager"
    )
    @patch(
        "services.addons.ccm_kit.v1.ccm_provider_service"
        ".RepositoryManagerFactory.create"
    )
    def test_unpublish_success(self, mock_factory, mock_cpm, service):
        """
        GIVEN a published certificate
        WHEN unpublish_certificate is called
        THEN the EDC asset is deleted and edc_asset_id is cleared.
        """
        ccm = _make_ccm()
        ccm.edc_asset_id = "asset-to-remove"
        repos = Mock()
        repos.ccm_repository.find_by_id_with_relations.return_value = ccm
        mock_factory.return_value.__enter__.return_value = repos

        service.unpublish_certificate(CERT_ID)

        mock_cpm.delete_ccm_certificate_offer.assert_called_once_with(
            "asset-to-remove"
        )
        repos.ccm_repository.update_fields.assert_called_once_with(
            ccm.id, {"edc_asset_id": None}
        )
        repos.commit.assert_called_once()

    @patch(
        "services.addons.ccm_kit.v1.ccm_provider_service"
        ".RepositoryManagerFactory.create"
    )
    def test_unpublish_not_found(self, mock_factory, service):
        """
        GIVEN a non-existent certificate ID
        WHEN unpublish_certificate is called
        THEN a ValueError is raised.
        """
        repos = Mock()
        repos.ccm_repository.find_by_id_with_relations.return_value = None
        mock_factory.return_value.__enter__.return_value = repos

        with pytest.raises(ValueError, match="not found"):
            service.unpublish_certificate(999)

    @patch(
        "services.addons.ccm_kit.v1.ccm_provider_service"
        ".RepositoryManagerFactory.create"
    )
    def test_unpublish_not_published(self, mock_factory, service):
        """
        GIVEN a certificate that is not published
        WHEN unpublish_certificate is called
        THEN a ValueError is raised.
        """
        ccm = _make_ccm()
        ccm.edc_asset_id = None
        repos = Mock()
        repos.ccm_repository.find_by_id_with_relations.return_value = ccm
        mock_factory.return_value.__enter__.return_value = repos

        with pytest.raises(ValueError, match="not published"):
            service.unpublish_certificate(CERT_ID)


# ---------------------------------------------------------------------------
# Get Certificate Payload Tests
# ---------------------------------------------------------------------------


class TestGetCertificatePayload:
    """Tests for CcmProviderService.get_certificate_payload"""

    @patch(
        "services.addons.ccm_kit.v1.ccm_provider_service"
        ".RepositoryManagerFactory.create"
    )
    def test_payload_returns_push_content(self, mock_factory, service):
        """
        GIVEN a valid certificate
        WHEN get_certificate_payload is called
        THEN it returns the CX-0135 BusinessPartnerCertificate structure.
        """
        ccm = _make_ccm()
        repos = Mock()
        repos.ccm_repository.find_by_id_with_relations.return_value = ccm
        mock_factory.return_value.__enter__.return_value = repos

        result = service.get_certificate_payload(CERT_ID)

        assert result["businessPartnerNumber"] == "BPNL000000000001"
        assert result["type"]["certificateType"] == "ISO9001"
        assert "contentBase64" in result["document"]

    @patch(
        "services.addons.ccm_kit.v1.ccm_provider_service"
        ".RepositoryManagerFactory.create"
    )
    def test_payload_not_found(self, mock_factory, service):
        """
        GIVEN a non-existent certificate ID
        WHEN get_certificate_payload is called
        THEN a ValueError is raised.
        """
        repos = Mock()
        repos.ccm_repository.find_by_id_with_relations.return_value = None
        mock_factory.return_value.__enter__.return_value = repos

        with pytest.raises(ValueError, match="not found"):
            service.get_certificate_payload(999)


# ---------------------------------------------------------------------------
# Push Share Status Error Handling Tests
# ---------------------------------------------------------------------------


class TestPushShareStatusErrorHandling:
    """Tests for push_certificate when _update_share_status fails."""

    @patch(
        "services.addons.ccm_kit.v1.ccm_provider_service"
        ".CcmProviderService._update_share_status"
    )
    @patch(
        "services.addons.ccm_kit.v1.ccm_base_service"
        ".NotificationConsumerService"
    )
    @patch(
        "services.addons.ccm_kit.v1.ccm_base_service.connector_manager"
    )
    @patch(
        "services.addons.ccm_kit.v1.ccm_provider_service"
        ".RepositoryManagerFactory.create"
    )
    def test_push_succeeds_even_if_share_update_fails(
        self, mock_factory, mock_cm, mock_ncs_class, mock_update_share, service
    ):
        """
        GIVEN a successful push notification
        WHEN _update_share_status raises an exception
        THEN the push result is still success (status update is best-effort).
        """
        ccm = _make_ccm()
        repos = Mock()
        repos.ccm_repository.find_by_id_with_relations.return_value = ccm
        repos.ccm_inbound_request_repository.advance_status_for_consumer.return_value = []
        mock_factory.return_value.__enter__.return_value = repos

        mock_cm.consumer.get_connectors.return_value = [DSP_URL]

        mock_ncs = Mock()
        mock_ncs.get_notification_endpoint_with_bpnl.return_value = (
            "https://endpoint.example.com",
            "token123",
        )
        mock_ncs_class.return_value = mock_ncs

        mock_update_share.side_effect = Exception("DB connection lost")

        result = service.push_certificate(_push_request(), SENDER_BPN)

        assert result.success is True
        mock_update_share.assert_called_once()


# ---------------------------------------------------------------------------
# Mapper Tests (ShareItem / CcmInboundRequestItem)
# ---------------------------------------------------------------------------


class TestProviderServiceMappers:
    """Tests for _to_inbound_request_item and ShareItem construction."""

    def test_inbound_request_item_includes_consumer_status(self):
        """
        GIVEN a CcmInboundRequest with consumer_status set
        WHEN _to_inbound_request_item is called
        THEN the resulting DTO includes consumerStatus.
        """
        record = Mock(spec=CcmInboundRequest)
        record.id = 1
        record.consumer_bpn = "BPNL000000000099"
        record.certified_bpn = "BPNL000000000001"
        record.certificate_type = "ISO9001"
        record.location_bpns = None
        record.certificate_id = 42
        record.status = InboundRequestStatus.Pushed
        record.consumer_status = "ACCEPTED"
        record.notification_id = "notif-123"
        record.received_at = datetime(2025, 1, 1, tzinfo=timezone.utc)
        record.updated_at = datetime(2025, 1, 2, tzinfo=timezone.utc)

        item = CcmProviderService._to_inbound_request_item(record)

        assert item.consumer_status == "ACCEPTED"
        assert item.status == "Pushed"

    def test_inbound_request_item_consumer_status_none(self):
        """
        GIVEN a CcmInboundRequest with consumer_status = None
        WHEN _to_inbound_request_item is called
        THEN consumerStatus is None in the DTO.
        """
        record = Mock(spec=CcmInboundRequest)
        record.id = 2
        record.consumer_bpn = "BPNL000000000099"
        record.certified_bpn = "BPNL000000000001"
        record.certificate_type = "ISO9001"
        record.location_bpns = None
        record.certificate_id = None
        record.status = InboundRequestStatus.NotFound
        record.consumer_status = None
        record.notification_id = None
        record.received_at = datetime(2025, 1, 1, tzinfo=timezone.utc)
        record.updated_at = datetime(2025, 1, 1, tzinfo=timezone.utc)

        item = CcmProviderService._to_inbound_request_item(record)

        assert item.consumer_status is None

    @patch(
        "services.addons.ccm_kit.v1.ccm_provider_service"
        ".RepositoryManagerFactory.create"
    )
    def test_list_shares_includes_rejection_reason(self, mock_factory):
        """
        GIVEN a CertificateShare with rejection_reason set
        WHEN list_shares is called
        THEN the resulting ShareItem includes rejectionReason.
        """
        repos = Mock()
        mock_factory.return_value.__enter__.return_value = repos

        share = Mock(spec=CertificateShare)
        share.id = 7
        share.certificate_id = 42
        share.consumer_bpnl = "BPNL000000000099"
        share.status = ShareStatus.Revoked
        share.rejection_reason = '{"certificateErrors": ["Expired"]}'
        share.last_shared_date = datetime(2025, 1, 1, tzinfo=timezone.utc)
        share.created_at = datetime(2025, 1, 1, tzinfo=timezone.utc)

        repos.certificate_share_repository.find_all_paginated.return_value = [share]

        cert = Mock(spec=Ccm)
        cert.certificate_type = "ISO9001"
        cert.bpnl = "BPNL000000000001"
        repos.ccm_repository.find_by_id_with_relations.return_value = cert

        service = CcmProviderService()
        items = service.list_shares()

        assert len(items) == 1
        assert items[0].rejection_reason == '{"certificateErrors": ["Expired"]}'
        assert items[0].status == "Revoked"
