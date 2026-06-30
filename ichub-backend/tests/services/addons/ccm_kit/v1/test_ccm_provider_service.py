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

from tools.exceptions import AlreadyExistsError, InvalidError, NotFoundError
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
    m.certificate_version = kwargs.get("certificate_version", "2015")
    m.validator_name = kwargs.get("validator_name", "Validator GmbH")
    m.validator_bpn = kwargs.get("validator_bpn", "BPNL000000000VAL")
    m.issuer_bpn = kwargs.get("issuer_bpn", "BPNL000000000ISS")
    m.doc = kwargs.get("doc", b"%PDF-1.4 test content")
    m.created_at = kwargs.get("created_at", datetime(2024, 6, 1, tzinfo=timezone.utc))
    m.edc_asset_id = kwargs.get("edc_asset_id", None)

    # Sites
    site_mocks = kwargs.get("sites", None)
    if site_mocks is None:
        site1 = Mock(spec=CcmSite)
        site1.site_bpn = "BPNS000000000001"
        site1.area_of_application = "Assembly"
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
            notification_id=None,
            location_bpns='["BPNS000000000001"]',
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
            notification_id=None,
            location_bpns='["BPNS000000000001"]',
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
        GIVEN a valid published certificate
        WHEN send_certificate_available is called
        THEN the notification is sent successfully.
        """
        ccm = _make_ccm(edc_asset_id="asset-42")
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
            notification_id=None,
            location_bpns='["BPNS000000000001"]',
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
        "services.addons.ccm_kit.v1.ccm_provider_service"
        ".RepositoryManagerFactory.create"
    )
    def test_available_certificate_not_published(self, mock_factory, service):
        """
        GIVEN a certificate that exists but has no edc_asset_id (not yet published)
        WHEN send_certificate_available is called
        THEN the result indicates failure with a "not published" message.
        """
        ccm = _make_ccm(edc_asset_id=None)
        repos = Mock()
        repos.ccm_repository.find_by_id_with_relations.return_value = ccm
        mock_factory.return_value.__enter__.return_value = repos

        result = service.send_certificate_available(
            _available_request(), SENDER_BPN
        )

        assert result.success is False
        assert "not published" in result.error.lower()

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
        ccm = _make_ccm(edc_asset_id="asset-42")
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
        ccm = _make_ccm(edc_asset_id="asset-42")
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
        ccm = _make_ccm(edc_asset_id="asset-42")
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
            notification_id=None,
            location_bpns='["BPNS000000000001"]',
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
    def test_available_creates_inbound_request_when_none_exists(
        self, mock_factory, mock_cm, mock_ncs_class, service
    ):
        """
        GIVEN a valid certificate and no prior inbound requests (unsolicited)
        WHEN send_certificate_available is called
        THEN a new InboundRequest with status Available is created.
        """
        ccm = _make_ccm(edc_asset_id="asset-42")
        repos = Mock()
        repos.ccm_repository.find_by_id_with_relations.return_value = ccm
        # advance_status_for_consumer returns [] → no prior requests advanced
        repos.ccm_inbound_request_repository.advance_status_for_consumer.return_value = []
        # find_all_filtered (relatedMessageId lookup) returns [] first call,
        # then [] for the duplicate-check call
        repos.ccm_inbound_request_repository.find_all_filtered.return_value = []
        repos.certificate_share_repository.find_by_certificate_and_consumer.return_value = None
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
        repos.ccm_inbound_request_repository.create_new.assert_called_once_with(
            consumer_bpn=CONSUMER_BPN,
            certified_bpn=ccm.bpnl,
            certificate_type=ccm.certificate_type,
            status=InboundRequestStatus.Available,
            certificate_id=CERT_ID,
            notification_id=result.message_id,
            location_bpns='["BPNS000000000001"]',
        )
        # The duplicate-check must be scoped to the exact same site set.
        duplicate_check_call = repos.ccm_inbound_request_repository.find_all_filtered.call_args_list[-1]
        assert duplicate_check_call.kwargs.get('location_bpns') == '["BPNS000000000001"]'

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
    def test_available_does_not_duplicate_inbound_request_when_one_exists(
        self, mock_factory, mock_cm, mock_ncs_class, service
    ):
        """
        GIVEN a valid certificate with no advanced requests but an existing
              InboundRequest record for the same consumer/type combination
        WHEN send_certificate_available is called
        THEN no duplicate InboundRequest is created.
        """
        ccm = _make_ccm(edc_asset_id="asset-42")
        existing_inbound = Mock(spec=CcmInboundRequest)
        repos = Mock()
        repos.ccm_repository.find_by_id_with_relations.return_value = ccm
        repos.ccm_inbound_request_repository.advance_status_for_consumer.return_value = []
        # find_all_filtered returns an existing record on the duplicate-check call
        repos.ccm_inbound_request_repository.find_all_filtered.return_value = [
            existing_inbound
        ]
        repos.certificate_share_repository.find_by_certificate_and_consumer.return_value = None
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
        repos.ccm_inbound_request_repository.create_new.assert_not_called()
        # Even when a duplicate exists the check must be scoped by location_bpns.
        duplicate_check_call = repos.ccm_inbound_request_repository.find_all_filtered.call_args_list[-1]
        assert duplicate_check_call.kwargs.get('location_bpns') == '["BPNS000000000001"]'


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
        assert content["type"]["certificateVersion"] == "2015"
        assert content["issuer"]["issuerName"] == "TÜV Rheinland"
        assert content["issuer"]["issuerBpn"] == "BPNL000000000ISS"
        assert content["trustLevel"] == "high"
        assert content["document"]["documentID"] == str(CERT_ID)
        assert content["document"]["contentType"] == "application/pdf"

        # Verify Base64 encoding
        decoded = base64.b64decode(content["document"]["contentBase64"])
        assert decoded == b"%PDF-1.4 test content"

        # Sites
        assert len(content["enclosedSites"]) == 1
        assert content["enclosedSites"][0]["enclosedSiteBpn"] == "BPNS000000000001"
        assert content["enclosedSites"][0]["areaOfApplication"] == "Assembly"

        # Optional fields
        assert content["registrationNumber"] == "REG-001"
        assert content["areaOfApplication"] == "Manufacturing"
        assert content["uploader"] == SENDER_BPN
        assert content["validator"]["validatorName"] == "Validator GmbH"
        assert content["validator"]["validatorBpn"] == "BPNL000000000VAL"
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
            certificate_version=None,
            validator_name=None,
            validator_bpn=None,
            issuer_bpn=None,
        )
        content = service._build_push_content(ccm)

        assert content["document"]["contentBase64"] == ""
        assert "enclosedSites" not in content
        assert "registrationNumber" not in content
        assert "areaOfApplication" not in content
        assert "uploader" not in content
        assert "validator" not in content
        assert "certificateVersion" not in content["type"]
        assert "issuerBpn" not in content["issuer"]


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

        with pytest.raises(NotFoundError, match="not found"):
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

        with pytest.raises(InvalidError, match="Missing configuration"):
            service.publish_certificate(CERT_ID)

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
    def test_publish_edc_conflict_raises_already_exists(
        self, mock_factory, mock_cpm, mock_config, service
    ):
        """
        GIVEN the EDC returns 409 when registering the asset
        WHEN publish_certificate is called
        THEN an AlreadyExistsError is raised.
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
        mock_cpm.register_ccm_certificate_offer.side_effect = ValueError(
            "Failed to create asset abc-123. Status code: 409"
        )

        with pytest.raises(AlreadyExistsError, match="already published"):
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

        with pytest.raises(NotFoundError, match="not found"):
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

        with pytest.raises(InvalidError, match="not published"):
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

        with pytest.raises(NotFoundError, match="not found"):
            service.get_certificate_payload(999)


# ---------------------------------------------------------------------------
# Get Published Certificate Tests
# ---------------------------------------------------------------------------


class TestGetPublishedCertificate:
    """Tests for CcmProviderService.get_published_certificate"""

    @pytest.fixture
    def service(self):
        return CcmProviderService()

    @patch(
        "services.addons.ccm_kit.v1.ccm_provider_service"
        ".RepositoryManagerFactory.create"
    )
    def test_get_published_certificate_success(self, mock_factory, service):
        """
        GIVEN a certificate that exists and is published as an EDC asset
        WHEN get_published_certificate is called
        THEN True is returned.
        """
        ccm = _make_ccm()
        ccm.edc_asset_id = "asset-abc-123"
        repos = Mock()
        repos.ccm_repository.find_by_id_with_relations.return_value = ccm
        mock_factory.return_value.__enter__.return_value = repos

        assert service.get_published_certificate(CERT_ID) is True

    @patch(
        "services.addons.ccm_kit.v1.ccm_provider_service"
        ".RepositoryManagerFactory.create"
    )
    def test_get_published_certificate_not_found(self, mock_factory, service):
        """
        GIVEN a non-existent certificate ID
        WHEN get_published_certificate is called
        THEN False is returned.
        """
        repos = Mock()
        repos.ccm_repository.find_by_id_with_relations.return_value = None
        mock_factory.return_value.__enter__.return_value = repos

        assert service.get_published_certificate(999) is False

    @patch(
        "services.addons.ccm_kit.v1.ccm_provider_service"
        ".RepositoryManagerFactory.create"
    )
    def test_get_published_certificate_not_published(self, mock_factory, service):
        """
        GIVEN a certificate that exists but has no edc_asset_id
        WHEN get_published_certificate is called
        THEN False is returned.
        """
        ccm = _make_ccm()
        ccm.edc_asset_id = None
        repos = Mock()
        repos.ccm_repository.find_by_id_with_relations.return_value = ccm
        mock_factory.return_value.__enter__.return_value = repos

        assert service.get_published_certificate(CERT_ID) is False


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
        record.certificate = None
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
        record.certificate = None
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
        share.rejection_reason = '{"certificateErrors": [{"message": "Expired"}]}'
        share.last_shared_date = datetime(2025, 1, 1, tzinfo=timezone.utc)
        share.created_at = datetime(2025, 1, 1, tzinfo=timezone.utc)

        repos.certificate_share_repository.find_all_paginated.return_value = [share]
        repos.ccm_inbound_request_repository.find_latest_consumer_status.return_value = None

        cert = Mock(spec=Ccm)
        cert.certificate_type = "ISO9001"
        cert.bpnl = "BPNL000000000001"
        repos.ccm_repository.find_by_id_with_relations.return_value = cert

        service = CcmProviderService()
        items = service.list_shares()

        assert len(items) == 1
        assert items[0].status == "Revoked"
        # rejection_reason is now a typed RejectionReasonPayload, not a raw string
        from models.services.addons.ccm_kit.v1.notifications import RejectionReasonPayload
        assert isinstance(items[0].rejection_reason, RejectionReasonPayload)
        assert items[0].rejection_reason.certificate_errors[0].message == "Expired"


class TestListSharesConsumerStatus:
    """Tests for consumerStatus enrichment in list_shares."""

    @patch(
        "services.addons.ccm_kit.v1.ccm_provider_service"
        ".RepositoryManagerFactory.create"
    )
    def _make_share_item(self, mock_factory, share_status, consumer_status_value):
        """Helper that builds a ShareItem via list_shares with given statuses."""
        repos = Mock()
        mock_factory.return_value.__enter__.return_value = repos

        share = Mock(spec=CertificateShare)
        share.id = 1
        share.certificate_id = 10
        share.consumer_bpnl = "BPNL000000000099"
        share.status = share_status
        share.rejection_reason = None
        share.last_shared_date = datetime(2025, 6, 1, tzinfo=timezone.utc)
        share.created_at = datetime(2025, 6, 1, tzinfo=timezone.utc)

        repos.certificate_share_repository.find_all_paginated.return_value = [share]
        repos.ccm_inbound_request_repository.find_latest_consumer_status.return_value = consumer_status_value

        cert = Mock(spec=Ccm)
        cert.certificate_type = "ISO9001"
        cert.bpnl = "BPNL000000000001"
        repos.ccm_repository.find_by_id_with_relations.return_value = cert

        return CcmProviderService().list_shares()

    @patch(
        "services.addons.ccm_kit.v1.ccm_provider_service"
        ".RepositoryManagerFactory.create"
    )
    def test_consumer_status_none_when_no_feedback(self, mock_factory):
        """
        GIVEN a share where the consumer has not sent any status
        WHEN list_shares is called
        THEN consumerStatus is None.
        """
        repos = Mock()
        mock_factory.return_value.__enter__.return_value = repos

        share = Mock(spec=CertificateShare)
        share.id = 1
        share.certificate_id = 10
        share.consumer_bpnl = "BPNL000000000099"
        share.status = ShareStatus.Pending
        share.rejection_reason = None
        share.last_shared_date = datetime(2025, 6, 1, tzinfo=timezone.utc)
        share.created_at = datetime(2025, 6, 1, tzinfo=timezone.utc)

        repos.certificate_share_repository.find_all_paginated.return_value = [share]
        repos.ccm_inbound_request_repository.find_latest_consumer_status.return_value = None

        cert = Mock(spec=Ccm)
        cert.certificate_type = "ISO9001"
        cert.bpnl = "BPNL000000000001"
        repos.ccm_repository.find_by_id_with_relations.return_value = cert

        items = CcmProviderService().list_shares()

        assert items[0].consumer_status is None
        assert items[0].status == "Pending"

    @patch(
        "services.addons.ccm_kit.v1.ccm_provider_service"
        ".RepositoryManagerFactory.create"
    )
    def test_consumer_status_received(self, mock_factory):
        """
        GIVEN a share with consumerStatus RECEIVED
        WHEN list_shares is called
        THEN consumerStatus is 'RECEIVED' and status is still 'Pending'.
        """
        repos = Mock()
        mock_factory.return_value.__enter__.return_value = repos

        share = Mock(spec=CertificateShare)
        share.id = 2
        share.certificate_id = 11
        share.consumer_bpnl = "BPNL000000000099"
        share.status = ShareStatus.Pending
        share.rejection_reason = None
        share.last_shared_date = datetime(2025, 6, 1, tzinfo=timezone.utc)
        share.created_at = datetime(2025, 6, 1, tzinfo=timezone.utc)

        repos.certificate_share_repository.find_all_paginated.return_value = [share]
        repos.ccm_inbound_request_repository.find_latest_consumer_status.return_value = "RECEIVED"

        cert = Mock(spec=Ccm)
        cert.certificate_type = "ISO9001"
        cert.bpnl = "BPNL000000000001"
        repos.ccm_repository.find_by_id_with_relations.return_value = cert

        items = CcmProviderService().list_shares()

        assert items[0].consumer_status == "RECEIVED"
        assert items[0].status == "Pending"

    @patch(
        "services.addons.ccm_kit.v1.ccm_provider_service"
        ".RepositoryManagerFactory.create"
    )
    def test_consumer_status_accepted(self, mock_factory):
        """
        GIVEN a share with consumerStatus ACCEPTED
        WHEN list_shares is called
        THEN consumerStatus is 'ACCEPTED' and status is 'Active'.
        """
        repos = Mock()
        mock_factory.return_value.__enter__.return_value = repos

        share = Mock(spec=CertificateShare)
        share.id = 3
        share.certificate_id = 12
        share.consumer_bpnl = "BPNL000000000099"
        share.status = ShareStatus.Active
        share.rejection_reason = None
        share.last_shared_date = datetime(2025, 6, 1, tzinfo=timezone.utc)
        share.created_at = datetime(2025, 6, 1, tzinfo=timezone.utc)

        repos.certificate_share_repository.find_all_paginated.return_value = [share]
        repos.ccm_inbound_request_repository.find_latest_consumer_status.return_value = "ACCEPTED"

        cert = Mock(spec=Ccm)
        cert.certificate_type = "ISO9001"
        cert.bpnl = "BPNL000000000001"
        repos.ccm_repository.find_by_id_with_relations.return_value = cert

        items = CcmProviderService().list_shares()

        assert items[0].consumer_status == "ACCEPTED"
        assert items[0].status == "Active"


# =====================================================================
# CX-0135 compliance tests
# =====================================================================


class TestCX0135Compliance:
    """Tests for CX-0135 standard compliance changes."""

    # ------------------------------------------------------------------
    # Phase 1.1: Asset ID is now a plain UUID
    # ------------------------------------------------------------------

    @patch(
        "services.addons.ccm_kit.v1.ccm_provider_service"
        ".RepositoryManagerFactory.create"
    )
    @patch(
        "services.addons.ccm_kit.v1.ccm_provider_service"
        ".connector_provider_manager"
    )
    @patch(
        "services.addons.ccm_kit.v1.ccm_provider_service"
        ".ConfigManager"
    )
    def test_publish_generates_uuid_asset_id(
        self, mock_config, mock_conn, mock_factory, service
    ):
        """
        GIVEN a certificate without an edc_asset_id
        WHEN publish_certificate is called
        THEN the new asset_id is a plain UUID (no prefix).
        """
        repos = Mock()
        mock_factory.return_value.__enter__.return_value = repos
        ccm = _make_ccm(edc_asset_id=None)
        repos.ccm_repository.find_by_id_with_relations.return_value = ccm
        mock_config.get_config.return_value = {"some": "policy"}
        # register_ccm_certificate_offer returns (asset_id, policy_id, contract_id, _)
        # It receives the generated asset_id — capture it.
        mock_conn.register_ccm_certificate_offer.side_effect = (
            lambda asset_id, **kw: (asset_id, "pol", "con", None)
        )

        from uuid import UUID

        result = service.publish_certificate(CERT_ID)

        # The returned asset_id should be a valid UUID (no prefix)
        UUID(result["document_id"])  # raises ValueError if not a valid UUID
        assert "ichub:asset:" not in result["document_id"]

    # ------------------------------------------------------------------
    # Phase 1.2: _build_push_content uses edc_asset_id
    # ------------------------------------------------------------------

    def test_build_push_content_uses_edc_asset_id(self, service):
        """
        GIVEN a Ccm with edc_asset_id set
        WHEN _build_push_content is called
        THEN documentID in the result equals the edc_asset_id (not the int PK).
        """
        ccm = _make_ccm(edc_asset_id="550e8400-e29b-41d4-a716-446655440000")
        result = service._build_push_content(ccm)
        assert result["document"]["documentID"] == "550e8400-e29b-41d4-a716-446655440000"

    def test_build_push_content_falls_back_to_pk(self, service):
        """
        GIVEN a Ccm without edc_asset_id
        WHEN _build_push_content is called
        THEN documentID falls back to str(ccm.id).
        """
        ccm = _make_ccm(edc_asset_id=None)
        result = service._build_push_content(ccm)
        assert result["document"]["documentID"] == str(ccm.id)

    # ------------------------------------------------------------------
    # Phase 2.5: push_certificate sets relatedMessageId from inbound req
    # ------------------------------------------------------------------

    @patch(
        "services.addons.ccm_kit.v1.ccm_provider_service"
        ".RepositoryManagerFactory.create"
    )
    @patch.object(CcmProviderService, "_send_notification")
    def test_push_sets_related_message_id(
        self, mock_send, mock_factory, service
    ):
        """
        GIVEN an inbound request with a notification_id
        WHEN push_certificate is called for the same consumer
        THEN the outgoing notification includes relatedMessageId.
        """
        repos = Mock()
        mock_factory.return_value.__enter__.return_value = repos
        ccm = _make_ccm(edc_asset_id="aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee")
        repos.ccm_repository.find_by_id_with_relations.return_value = ccm

        inbound_req = Mock()
        inbound_req.notification_id = "11111111-2222-3333-4444-555555555555"
        repos.ccm_inbound_request_repository.find_all_filtered.return_value = [inbound_req]
        # Post-success path mocks
        share_mock = Mock(spec=CertificateShare)
        share_mock.id = 1
        share_mock.status = ShareStatus.Pending
        repos.certificate_share_repository.find_by_certificate_and_consumer.return_value = share_mock
        repos.ccm_inbound_request_repository.advance_status_for_consumer.return_value = []

        from models.services.addons.ccm_kit.v1.notifications import CcmSendResult
        mock_send.return_value = CcmSendResult(success=True)

        service.push_certificate(_push_request(), SENDER_BPN)

        # Verify _send_notification received a notification with relatedMessageId
        call_args = mock_send.call_args
        sent_notification = call_args.kwargs.get("notification") or call_args.args[1]
        from uuid import UUID
        assert sent_notification.header.related_message_id == UUID("11111111-2222-3333-4444-555555555555")

    # ------------------------------------------------------------------
    # Phase 2.5 (Bug fix): explicit relatedMessageId restricts advance
    # ------------------------------------------------------------------

    @patch(
        "services.addons.ccm_kit.v1.ccm_provider_service"
        ".RepositoryManagerFactory.create"
    )
    @patch.object(CcmProviderService, "_send_notification")
    def test_push_with_explicit_related_message_id_restricts_advance(
        self, mock_send, mock_factory, service
    ):
        """
        GIVEN a push request with an explicit relatedMessageId
        WHEN push_certificate is called
        THEN advance_status_for_consumer is called with notification_id=<that id>
        so only the targeted inbound request is advanced (not all matching ones).
        """
        repos = Mock()
        mock_factory.return_value.__enter__.return_value = repos
        ccm = _make_ccm(edc_asset_id="aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee")
        repos.ccm_repository.find_by_id_with_relations.return_value = ccm

        inbound_req = Mock()
        inbound_req.notification_id = "11111111-2222-3333-4444-555555555555"
        repos.ccm_inbound_request_repository.find_all_filtered.return_value = [inbound_req]
        share_mock = Mock(spec=CertificateShare)
        share_mock.id = 1
        share_mock.status = ShareStatus.Pending
        repos.certificate_share_repository.find_by_certificate_and_consumer.return_value = share_mock
        repos.ccm_inbound_request_repository.advance_status_for_consumer.return_value = []

        from models.services.addons.ccm_kit.v1.notifications import CcmSendResult
        mock_send.return_value = CcmSendResult(success=True)

        explicit_related_id = "11111111-2222-3333-4444-555555555555"
        request = CcmPushRequest(
            sender_bpn=SENDER_BPN,
            certificate_id=CERT_ID,
            consumer_bpn=CONSUMER_BPN,
            related_message_id=explicit_related_id,
        )
        service.push_certificate(request, SENDER_BPN)

        advance_call_kwargs = repos.ccm_inbound_request_repository.advance_status_for_consumer.call_args.kwargs
        assert advance_call_kwargs.get("notification_id") == explicit_related_id

    @patch(
        "services.addons.ccm_kit.v1.ccm_provider_service"
        ".RepositoryManagerFactory.create"
    )
    @patch.object(CcmProviderService, "_send_notification")
    def test_available_with_explicit_related_message_id_restricts_advance(
        self, mock_send, mock_factory, service
    ):
        """
        GIVEN an available request with an explicit relatedMessageId
        WHEN send_certificate_available is called
        THEN advance_status_for_consumer is called with notification_id=<that id>
        so only the targeted inbound request is advanced (not all matching ones).
        """
        repos = Mock()
        mock_factory.return_value.__enter__.return_value = repos
        ccm = _make_ccm(edc_asset_id="aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee")
        repos.ccm_repository.find_by_id_with_relations.return_value = ccm

        inbound_req = Mock()
        inbound_req.notification_id = "22222222-3333-4444-5555-666666666666"
        repos.ccm_inbound_request_repository.find_all_filtered.return_value = [inbound_req]
        share_mock = Mock(spec=CertificateShare)
        share_mock.id = 2
        share_mock.status = ShareStatus.Pending
        repos.certificate_share_repository.find_by_certificate_and_consumer.return_value = share_mock
        repos.ccm_inbound_request_repository.advance_status_for_consumer.return_value = []

        from models.services.addons.ccm_kit.v1.notifications import CcmSendResult
        mock_send.return_value = CcmSendResult(success=True)

        explicit_related_id = "22222222-3333-4444-5555-666666666666"
        request = CcmAvailableRequest(
            sender_bpn=SENDER_BPN,
            certificate_id=CERT_ID,
            consumer_bpn=CONSUMER_BPN,
            related_message_id=explicit_related_id,
        )
        service.send_certificate_available(request, SENDER_BPN)

        advance_call_kwargs = repos.ccm_inbound_request_repository.advance_status_for_consumer.call_args.kwargs
        assert advance_call_kwargs.get("notification_id") == explicit_related_id


# ---------------------------------------------------------------------------
# _to_inbound_request_item — certificate fields surfaced in list response
# ---------------------------------------------------------------------------


def _make_inbound_req(**kwargs) -> Mock:
    """Return a Mock resembling a CcmInboundRequest ORM record."""
    m = Mock(spec=CcmInboundRequest)
    m.id = kwargs.get("id", 1)
    m.consumer_bpn = kwargs.get("consumer_bpn", CONSUMER_BPN)
    m.certified_bpn = kwargs.get("certified_bpn", "BPNL000000000001")
    m.certificate_type = kwargs.get("certificate_type", "ISO9001")
    m.location_bpns = kwargs.get("location_bpns", None)
    m.certificate_id = kwargs.get("certificate_id", None)
    m.certificate = kwargs.get("certificate", None)
    m.status = kwargs.get("status", InboundRequestStatus.NotFound)
    m.consumer_status = kwargs.get("consumer_status", None)
    m.notification_id = kwargs.get("notification_id", None)
    m.received_at = kwargs.get("received_at", datetime(2025, 1, 1, tzinfo=timezone.utc))
    m.updated_at = kwargs.get("updated_at", datetime(2025, 6, 1, tzinfo=timezone.utc))
    return m


class TestToInboundRequestItem:
    """Tests for CcmProviderService._to_inbound_request_item."""

    def test_certificate_fields_populated_when_linked(self):
        """
        GIVEN an inbound request with a resolved certificate FK
        WHEN _to_inbound_request_item is called
        THEN certificateName and registrationNumber are taken from the linked cert.
        """
        cert = Mock(spec=Ccm)
        cert.certificate_name = "ISO 9001:2015 QMS"
        cert.registration_number = "REG-42"

        req = _make_inbound_req(
            certificate_id=CERT_ID,
            certificate=cert,
            status=InboundRequestStatus.Registered,
        )

        item = CcmProviderService._to_inbound_request_item(req)

        assert item.certificate_name == "ISO 9001:2015 QMS"
        assert item.registration_number == "REG-42"

    def test_certificate_fields_none_when_no_linked_cert(self):
        """
        GIVEN an inbound request with no matched certificate (NotFound)
        WHEN _to_inbound_request_item is called
        THEN certificateName and registrationNumber are None.
        """
        req = _make_inbound_req(certificate_id=None, certificate=None)

        item = CcmProviderService._to_inbound_request_item(req)

        assert item.certificate_name is None
        assert item.registration_number is None

    def test_certificate_name_none_when_cert_has_no_name(self):
        """
        GIVEN an inbound request linked to a cert that has no certificate_name set
        WHEN _to_inbound_request_item is called
        THEN certificateName is None (field is optional on the cert).
        """
        cert = Mock(spec=Ccm)
        cert.certificate_name = None
        cert.registration_number = "REG-99"

        req = _make_inbound_req(
            certificate_id=CERT_ID,
            certificate=cert,
            status=InboundRequestStatus.Registered,
        )

        item = CcmProviderService._to_inbound_request_item(req)

        assert item.certificate_name is None
        assert item.registration_number == "REG-99"

    def test_standard_fields_still_mapped(self):
        """
        GIVEN any inbound request
        WHEN _to_inbound_request_item is called
        THEN all pre-existing fields (consumerBpn, status, etc.) are still mapped.
        """
        req = _make_inbound_req(
            id=7,
            consumer_bpn=CONSUMER_BPN,
            status=InboundRequestStatus.NotFound,
        )

        item = CcmProviderService._to_inbound_request_item(req)

        assert item.request_id == 7
        assert item.consumer_bpn == CONSUMER_BPN
        assert item.status == InboundRequestStatus.NotFound.value


# ---------------------------------------------------------------------------
# Direct-push tracking tests (Bug 3 fix)
# ---------------------------------------------------------------------------


class TestDirectPushTracking:
    """
    When push_certificate succeeds but no prior CcmInboundRequest exists
    (direct push — no prior consumer REQUEST), a synthetic tracking record
    must be created with notification_id = the outgoing push messageId.
    """

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
    def test_direct_push_creates_inbound_request_record(
        self, mock_factory, mock_cm, mock_ncs_class, mock_update_share, service
    ):
        """
        GIVEN push_certificate is called for a consumer with no prior REQUEST
        WHEN advance_status_for_consumer returns [] (no rows to advance)
        THEN create_new is called with status=Pushed and notification_id=result.message_id.
        """
        ccm = _make_ccm()
        repos = Mock()
        repos.ccm_repository.find_by_id_with_relations.return_value = ccm
        # Simulate no prior CcmInboundRequest for this consumer.
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

        create_call_kwargs = repos.ccm_inbound_request_repository.create_new.call_args.kwargs
        assert create_call_kwargs["consumer_bpn"] == CONSUMER_BPN
        assert create_call_kwargs["certified_bpn"] == ccm.bpnl
        assert create_call_kwargs["certificate_type"] == ccm.certificate_type
        assert create_call_kwargs["status"] == InboundRequestStatus.Pushed
        assert create_call_kwargs["certificate_id"] == CERT_ID
        # The notification_id must equal the push notification's messageId so
        # that the incoming STATUS with relatedMessageId can be correlated.
        assert create_call_kwargs["notification_id"] == result.message_id

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
    def test_request_triggered_push_does_not_create_extra_record(
        self, mock_factory, mock_cm, mock_ncs_class, mock_update_share, service
    ):
        """
        GIVEN push_certificate is called for a consumer with an existing REQUEST
        WHEN advance_status_for_consumer returns updated rows
        THEN create_new is NOT called (no duplicate synthetic record).
        """
        from unittest.mock import MagicMock
        ccm = _make_ccm()
        repos = Mock()
        repos.ccm_repository.find_by_id_with_relations.return_value = ccm
        # Simulate existing CcmInboundRequest rows being advanced.
        existing_row = MagicMock()
        repos.ccm_inbound_request_repository.advance_status_for_consumer.return_value = [existing_row]
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
        repos.ccm_inbound_request_repository.create_new.assert_not_called()
