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
Unit tests for CcmNotificationService.

Covers the PULL-flow business logic for ``/companycertificate/request`` and
``/companycertificate/status`` endpoints using mocked repositories.
"""

import pytest
from datetime import datetime, timezone
from unittest.mock import Mock, patch
from uuid import uuid4

from services.addons.ccm_kit.v1.ccm_notification_service import CcmNotificationService
from models.metadata_database.addons.ccm_kit.v1.models import (
    Ccm,
    CertificateShare,
    InboundRequestStatus,
    OutboundRequestStatus,
    ShareStatus,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_notification(
    sender_bpn: str = "BPNL000000000099",
    receiver_bpn: str = "BPNL000000000001",
    context: str = "CompanyCertificateManagement-CCMAPI-Request:1.0.0",
    content_extras: dict | None = None,
) -> Mock:
    """Build a mock Notification matching the SDK structure."""
    header = Mock()
    header.sender_bpn = sender_bpn
    header.receiver_bpn = receiver_bpn
    header.context = context
    header.message_id = str(uuid4())

    content = Mock()
    extras = content_extras or {}
    # model_dump returns the base fields + anything explicit
    content.model_dump.return_value = {
        "information": None,
        "listOfAffectedItems": [],
        **extras,
    }
    # model_extra holds any extra="allow" fields
    content.model_extra = extras

    notification = Mock()
    notification.header = header
    notification.content = content
    return notification


def _make_ccm(**kwargs) -> Mock:
    """Return a Mock resembling a Ccm ORM record."""
    m = Mock(spec=Ccm)
    m.id = kwargs.get("id", 42)
    m.bpnl = kwargs.get("bpnl", "BPNL000000000001")
    m.certificate_type = kwargs.get("certificate_type", "ISO9001")
    m.edc_asset_id = kwargs.get("edc_asset_id", None)
    m.sites = kwargs.get("sites", [])
    m.shares = kwargs.get("shares", [])
    return m


def _make_share(**kwargs) -> Mock:
    """Return a Mock resembling a CertificateShare ORM record."""
    m = Mock(spec=CertificateShare)
    m.id = kwargs.get("id", 7)
    m.certificate_id = kwargs.get("certificate_id", 42)
    m.consumer_bpnl = kwargs.get("consumer_bpnl", "BPNL000000000099")
    m.status = kwargs.get("status", ShareStatus.Pending)
    m.last_shared_date = kwargs.get("last_shared_date", datetime.now(timezone.utc))
    return m


# ---------------------------------------------------------------------------
# Test class
# ---------------------------------------------------------------------------

class TestCcmNotificationService:
    """Unit tests for CcmNotificationService."""

    def setup_method(self):
        """Instantiate a fresh service before each test."""
        self.service = CcmNotificationService()

    @pytest.fixture
    def mock_repos(self):
        """Provide a mock RepositoryManager with CCM sub-repos."""
        repos = Mock()
        repos.ccm_repository = Mock()
        repos.certificate_share_repository = Mock()
        repos.ccm_inbound_request_repository = Mock()
        repos.commit = Mock()
        repos.refresh = Mock()
        return repos

    # ==================================================================
    # process_certificate_request
    # ==================================================================

    @patch(
        "services.addons.ccm_kit.v1.ccm_notification_service"
        ".RepositoryManagerFactory.create"
    )
    def test_request_certificate_found_new_share(self, mock_factory, mock_repos):
        """
        GIVEN a request notification for an existing certificate that is not yet published
        WHEN process_certificate_request is called
        AND the consumer has no prior share record
        THEN a new CertificateShare is created with status Pending
        AND the response is (202, IN_PROGRESS) per CX-0135.
        """
        mock_factory.return_value.__enter__.return_value = mock_repos
        ccm = _make_ccm()
        mock_repos.ccm_repository.find_by_bpnl_and_type.return_value = ccm
        mock_repos.certificate_share_repository.find_by_certificate_and_consumer.return_value = None

        notification = _make_notification(
            content_extras={
                "certifiedBpn": "BPNL000000000001",
                "certificateType": "ISO9001",
            }
        )

        status, body = self.service.process_certificate_request(notification)

        assert status == 202
        assert body["content"]["requestStatus"] == "IN_PROGRESS"
        mock_repos.ccm_repository.find_by_bpnl_and_type.assert_called_once_with(
            bpnl="BPNL000000000001",
            certificate_type="ISO9001",
        )
        mock_repos.certificate_share_repository.create_new.assert_called_once_with(
            certificate_id=ccm.id,
            consumer_bpnl="BPNL000000000099",
            status=ShareStatus.Pending,
        )
        mock_repos.ccm_inbound_request_repository.create_new.assert_called_once()
        call_kwargs = mock_repos.ccm_inbound_request_repository.create_new.call_args
        assert call_kwargs.kwargs.get("status") == InboundRequestStatus.Registered or \
               call_kwargs.args[3] == InboundRequestStatus.Registered
        mock_repos.commit.assert_called_once()

    @patch(
        "services.addons.ccm_kit.v1.ccm_notification_service"
        ".RepositoryManagerFactory.create"
    )
    def test_request_certificate_found_existing_share(self, mock_factory, mock_repos):
        """
        GIVEN a request notification for an existing certificate that is not yet published
        WHEN the consumer already has a share record
        THEN no new share is created, but the existing share's timestamp is updated
        AND the response is (202, IN_PROGRESS) per CX-0135.
        """
        mock_factory.return_value.__enter__.return_value = mock_repos
        ccm = _make_ccm()
        existing_share = _make_share(consumer_bpnl="BPNL000000000099")
        mock_repos.ccm_repository.find_by_bpnl_and_type.return_value = ccm
        mock_repos.certificate_share_repository.find_by_certificate_and_consumer.return_value = existing_share

        notification = _make_notification(
            content_extras={
                "certifiedBpn": "BPNL000000000001",
                "certificateType": "ISO9001",
            }
        )

        status, body = self.service.process_certificate_request(notification)

        assert status == 202
        assert body["content"]["requestStatus"] == "IN_PROGRESS"
        mock_repos.certificate_share_repository.create_new.assert_not_called()
        mock_repos.ccm_inbound_request_repository.create_new.assert_called_once()
        mock_repos.commit.assert_called_once()

    @patch(
        "services.addons.ccm_kit.v1.ccm_notification_service"
        ".RepositoryManagerFactory.create"
    )
    def test_request_certificate_not_found(self, mock_factory, mock_repos):
        """
        GIVEN a request notification for a certificate that does not exist
        WHEN process_certificate_request is called
        THEN the response is (200, REJECTED) per CX-0135 with requestErrors
        AND no share is created.
        """
        mock_factory.return_value.__enter__.return_value = mock_repos
        mock_repos.ccm_repository.find_by_bpnl_and_type.return_value = None

        notification = _make_notification(
            content_extras={
                "certifiedBpn": "BPNL000000000999",
                "certificateType": "IATF16949",
            }
        )

        status, body = self.service.process_certificate_request(notification)

        assert status == 200
        assert body["content"]["requestStatus"] == "REJECTED"
        assert len(body["content"]["requestErrors"]) == 1
        assert "no certificate found" in body["content"]["requestErrors"][0]["message"].lower()
        mock_repos.certificate_share_repository.create_new.assert_not_called()
        # Demand should be recorded even when cert not found.
        mock_repos.ccm_inbound_request_repository.create_new.assert_called_once()
        call_kwargs = mock_repos.ccm_inbound_request_repository.create_new.call_args
        assert call_kwargs.kwargs.get("status") == InboundRequestStatus.NotFound or \
               call_kwargs.args[3] == InboundRequestStatus.NotFound
        mock_repos.commit.assert_called_once()

    @patch(
        "services.addons.ccm_kit.v1.ccm_notification_service"
        ".RepositoryManagerFactory.create"
    )
    def test_request_with_location_bpns(self, mock_factory, mock_repos):
        """
        GIVEN a request notification that includes locationBpns
        WHEN process_certificate_request is called
        THEN the request is processed normally (locationBpns is optional, parsed but not yet filtered)
        AND the response is (202, IN_PROGRESS) per CX-0135.
        """
        mock_factory.return_value.__enter__.return_value = mock_repos
        ccm = _make_ccm()
        mock_repos.ccm_repository.find_by_bpnl_and_type.return_value = ccm
        mock_repos.certificate_share_repository.find_by_certificate_and_consumer.return_value = None

        notification = _make_notification(
            content_extras={
                "certifiedBpn": "BPNL000000000001",
                "certificateType": "ISO9001",
                "locationBpns": ["BPNA000000000001"],
            }
        )

        status, _ = self.service.process_certificate_request(notification)

        assert status == 202

    # ==================================================================
    # process_certificate_status
    # ==================================================================

    @patch(
        "services.addons.ccm_kit.v1.ccm_notification_service"
        ".RepositoryManagerFactory.create"
    )
    def test_status_accepted(self, mock_factory, mock_repos):
        """
        GIVEN a status notification with certificateStatus=ACCEPTED
        WHEN process_certificate_status is called
        THEN the CertificateShare status is updated to Active (rejection_reason cleared)
        AND consumer_status is stamped as ACCEPTED on the inbound request.
        """
        mock_factory.return_value.__enter__.return_value = mock_repos
        ccm = _make_ccm(id=42)
        share = _make_share(certificate_id=42)
        mock_repos.ccm_repository.find_by_id_with_relations.return_value = ccm
        mock_repos.certificate_share_repository.find_by_certificate_and_consumer.return_value = share
        mock_repos.certificate_share_repository.update_status.return_value = share

        notification = _make_notification(
            context="CompanyCertificateManagement-CCMAPI-Status:1.0.0",
            content_extras={
                "documentId": "42",
                "certificateStatus": "ACCEPTED",
            },
        )

        status, body = self.service.update_certificate_status(notification)

        assert status == 200
        assert "accepted" in body["message"].lower()
        mock_repos.certificate_share_repository.update_status.assert_called_once_with(
            share_id=share.id,
            new_status=ShareStatus.Active,
            rejection_reason=None,
        )
        mock_repos.ccm_inbound_request_repository.update_consumer_status.assert_called_once_with(
            consumer_bpn="BPNL000000000099",
            certified_bpn="BPNL000000000001",
            certificate_type="ISO9001",
            consumer_status="ACCEPTED",
        )
        mock_repos.commit.assert_called_once()

    @patch(
        "services.addons.ccm_kit.v1.ccm_notification_service"
        ".RepositoryManagerFactory.create"
    )
    def test_status_rejected(self, mock_factory, mock_repos):
        """
        GIVEN a status notification with certificateStatus=REJECTED (no error details)
        WHEN process_certificate_status is called
        THEN the CertificateShare status is updated to Revoked (rejection_reason=None)
        AND the inbound request consumer_status is stamped as REJECTED.
        """
        mock_factory.return_value.__enter__.return_value = mock_repos
        ccm = _make_ccm(id=10)
        share = _make_share(id=3, certificate_id=10)
        mock_repos.ccm_repository.find_by_id_with_relations.return_value = ccm
        mock_repos.certificate_share_repository.find_by_certificate_and_consumer.return_value = share
        mock_repos.certificate_share_repository.update_status.return_value = share

        notification = _make_notification(
            context="CompanyCertificateManagement-CCMAPI-Status:1.0.0",
            content_extras={
                "documentId": "10",
                "certificateStatus": "REJECTED",
            },
        )

        status, body = self.service.update_certificate_status(notification)

        assert status == 200
        mock_repos.certificate_share_repository.update_status.assert_called_once_with(
            share_id=3,
            new_status=ShareStatus.Revoked,
            rejection_reason=None,
        )
        mock_repos.ccm_inbound_request_repository.update_consumer_status.assert_called_once_with(
            consumer_bpn="BPNL000000000099",
            certified_bpn="BPNL000000000001",
            certificate_type="ISO9001",
            consumer_status="REJECTED",
        )

    @patch(
        "services.addons.ccm_kit.v1.ccm_notification_service"
        ".RepositoryManagerFactory.create"
    )
    def test_status_rejected_logs_errors(self, mock_factory, mock_repos, caplog):
        """
        GIVEN a REJECTED status with certificateErrors and locationErrors
        WHEN update_certificate_status is called
        THEN rejection details are logged AND stored as JSON on the share.
        """
        import json
        import logging

        mock_factory.return_value.__enter__.return_value = mock_repos
        ccm = _make_ccm(id=10)
        share = _make_share(id=3, certificate_id=10)
        mock_repos.ccm_repository.find_by_id_with_relations.return_value = ccm
        mock_repos.certificate_share_repository.find_by_certificate_and_consumer.return_value = share
        mock_repos.certificate_share_repository.update_status.return_value = share

        notification = _make_notification(
            context="CompanyCertificateManagement-CCMAPI-Status:1.0.0",
            content_extras={
                "documentId": "10",
                "certificateStatus": "REJECTED",
                "certificateErrors": [{"message": "Certificate expired"}],
                "locationErrors": [
                    {"bpn": "BPNS000000000001", "locationErrors": [{"message": "Invalid site"}]},
                ],
            },
        )

        with caplog.at_level(logging.INFO):
            status, body = self.service.update_certificate_status(notification)

        assert status == 200
        assert "Certificate expired" in caplog.text

        # Verify rejection_reason is passed as serialised JSON.
        call_kwargs = mock_repos.certificate_share_repository.update_status.call_args.kwargs
        reason = json.loads(call_kwargs["rejection_reason"])
        assert reason["certificateErrors"] == ["Certificate expired"]
        assert {"BPNS000000000001": ["Invalid site"]} in reason["locationErrors"]

    @patch(
        "services.addons.ccm_kit.v1.ccm_notification_service"
        ".RepositoryManagerFactory.create"
    )
    def test_status_received(self, mock_factory, mock_repos):
        """
        GIVEN a status notification with certificateStatus=RECEIVED
        WHEN process_certificate_status is called
        THEN the CertificateShare status is updated to Pending
        AND consumer_status is stamped as RECEIVED on the inbound request.
        """
        mock_factory.return_value.__enter__.return_value = mock_repos
        ccm = _make_ccm(id=5)
        share = _make_share(id=2, certificate_id=5)
        mock_repos.ccm_repository.find_by_id_with_relations.return_value = ccm
        mock_repos.certificate_share_repository.find_by_certificate_and_consumer.return_value = share
        mock_repos.certificate_share_repository.update_status.return_value = share

        notification = _make_notification(
            context="CompanyCertificateManagement-CCMAPI-Status:1.0.0",
            content_extras={
                "documentId": "5",
                "certificateStatus": "RECEIVED",
            },
        )

        status, _ = self.service.update_certificate_status(notification)

        assert status == 200
        mock_repos.certificate_share_repository.update_status.assert_called_once_with(
            share_id=2,
            new_status=ShareStatus.Pending,
            rejection_reason=None,
        )
        mock_repos.ccm_inbound_request_repository.update_consumer_status.assert_called_once_with(
            consumer_bpn="BPNL000000000099",
            certified_bpn="BPNL000000000001",
            certificate_type="ISO9001",
            consumer_status="RECEIVED",
        )

    @patch(
        "services.addons.ccm_kit.v1.ccm_notification_service"
        ".RepositoryManagerFactory.create"
    )
    def test_status_certificate_not_found(self, mock_factory, mock_repos):
        """
        GIVEN a status notification with a documentId that maps to a non-existent certificate
        WHEN process_certificate_status is called
        THEN the response is (404, ...).
        """
        mock_factory.return_value.__enter__.return_value = mock_repos
        mock_repos.ccm_repository.find_by_id_with_relations.return_value = None

        notification = _make_notification(
            context="CompanyCertificateManagement-CCMAPI-Status:1.0.0",
            content_extras={
                "documentId": "999",
                "certificateStatus": "ACCEPTED",
            },
        )

        status, body = self.service.update_certificate_status(notification)

        assert status == 404
        assert "not found" in body["message"].lower()

    @patch(
        "services.addons.ccm_kit.v1.ccm_notification_service"
        ".RepositoryManagerFactory.create"
    )
    def test_status_invalid_document_id(self, mock_factory, mock_repos):
        """
        GIVEN a status notification with a non-numeric documentId that is
        also not a known EDC asset ID
        WHEN process_certificate_status is called
        THEN the response is (404, ...) because the certificate cannot be found.
        """
        mock_repos.ccm_repository.find_by_edc_asset_id.return_value = None
        mock_factory.return_value.__enter__.return_value = mock_repos

        notification = _make_notification(
            context="CompanyCertificateManagement-CCMAPI-Status:1.0.0",
            content_extras={
                "documentId": "not-an-integer",
                "certificateStatus": "ACCEPTED",
            },
        )

        status, body = self.service.update_certificate_status(notification)

        assert status == 404
        assert "not found" in body["message"].lower()

    @patch(
        "services.addons.ccm_kit.v1.ccm_notification_service"
        ".RepositoryManagerFactory.create"
    )
    def test_status_share_not_found(self, mock_factory, mock_repos):
        """
        GIVEN a status notification for a valid certificate
        BUT no share record exists for the consumer
        WHEN process_certificate_status is called
        THEN the response is (404, ...).
        """
        mock_factory.return_value.__enter__.return_value = mock_repos
        ccm = _make_ccm(id=42)
        mock_repos.ccm_repository.find_by_id_with_relations.return_value = ccm
        mock_repos.certificate_share_repository.find_by_certificate_and_consumer.return_value = None

        notification = _make_notification(
            context="CompanyCertificateManagement-CCMAPI-Status:1.0.0",
            content_extras={
                "documentId": "42",
                "certificateStatus": "ACCEPTED",
            },
        )

        status, body = self.service.update_certificate_status(notification)

        assert status == 404
        assert "no sharing record" in body["message"].lower()

    # ==================================================================
    # process_certificate_push
    # ==================================================================

    @patch(
        "services.addons.ccm_kit.v1.ccm_notification_service"
        ".RepositoryManagerFactory.create"
    )
    def test_push_stores_certificate(self, mock_factory, mock_repos):
        """
        GIVEN a push notification with valid certificate data
        WHEN process_certificate_push is called
        THEN the certificate is stored in ccm_received.
        """
        mock_repos.ccm_received_repository = Mock()
        mock_repos.ccm_received_repository.find_by_document_id.return_value = None
        mock_repos.ccm_outbound_request_repository = Mock()
        mock_repos.ccm_outbound_request_repository.find_active_by_provider_and_type.return_value = []
        mock_factory.return_value.__enter__.return_value = mock_repos

        notification = _make_notification(
            context="CompanyCertificateManagement-CCMAPI-Push:1.0.0",
            content_extras={
                "businessPartnerNumber": "BPNL000000000001",
                "type": {
                    "certificateType": "ISO9001",
                    "certificateVersion": "2015",
                },
                "document": {
                    "documentID": "DOC-001",
                    "creationDate": "2024-06-01T00:00:00Z",
                    "contentType": "application/pdf",
                    "contentBase64": "JVBERi0xLjQgdGVzdA==",
                },
                "issuer": {
                    "issuerName": "TÜV Rheinland",
                    "issuerBpn": "BPNL000000000002",
                },
                "trustLevel": "high",
                "validFrom": "2024-01-01",
                "validUntil": "2027-12-31",
            },
        )

        status, body = self.service.process_certificate_push(notification)

        assert status == 200
        assert "received" in body["message"].lower()
        mock_repos.ccm_received_repository.create_new.assert_called_once()
        mock_repos.commit.assert_called()

    def test_push_rejects_non_pdf_content(self):
        """
        GIVEN a push notification whose decoded content is NOT a valid PDF
        WHEN process_certificate_push is called
        THEN a 400 response is returned with an appropriate error message.
        """
        notification = _make_notification(
            context="CompanyCertificateManagement-CCMAPI-Push:1.0.0",
            content_extras={
                "businessPartnerNumber": "BPNL000000000001",
                "type": {"certificateType": "ISO9001"},
                "document": {
                    "documentID": "DOC-INVALID",
                    "contentType": "application/pdf",
                    "contentBase64": "dGVzdA==",  # decodes to b"test"
                },
                "issuer": {"issuerName": "TÜV"},
            },
        )

        status, body = self.service.process_certificate_push(notification)

        assert status == 400
        assert "not a valid PDF" in body["message"]

    @patch(
        "services.addons.ccm_kit.v1.ccm_notification_service"
        ".RepositoryManagerFactory.create"
    )
    def test_push_duplicate_updates(self, mock_factory, mock_repos):
        """
        GIVEN a push notification for a document that already exists
        WHEN process_certificate_push is called
        THEN the existing record is updated instead of creating a new one.
        """
        existing = Mock()
        existing.doc = b"old"
        mock_repos.ccm_received_repository = Mock()
        mock_repos.ccm_received_repository.find_by_document_id.return_value = existing
        mock_repos.ccm_outbound_request_repository = Mock()
        mock_repos.ccm_outbound_request_repository.find_active_by_provider_and_type.return_value = []
        mock_factory.return_value.__enter__.return_value = mock_repos

        notification = _make_notification(
            context="CompanyCertificateManagement-CCMAPI-Push:1.0.0",
            content_extras={
                "businessPartnerNumber": "BPNL000000000001",
                "type": {"certificateType": "ISO9001"},
                "document": {
                    "documentID": "DOC-001",
                    "contentType": "application/pdf",
                    "contentBase64": "JVBERi0xLjQgbmV3",
                },
                "issuer": {"issuerName": "TÜV"},
            },
        )

        status, body = self.service.process_certificate_push(notification)

        assert status == 200
        assert "updated" in body["message"].lower()
        mock_repos.ccm_received_repository.create_new.assert_not_called()
        mock_repos.commit.assert_called()

    @patch(
        "services.addons.ccm_kit.v1.ccm_notification_service"
        ".RepositoryManagerFactory.create"
    )
    def test_push_correlates_not_found_outbound_requests(
        self, mock_factory, mock_repos,
    ):
        """
        GIVEN a push notification AND an outbound request in NotFound status
        WHEN process_certificate_push is called
        THEN the NotFound request is advanced to Found with the document_id.
        """
        mock_repos.ccm_received_repository = Mock()
        mock_repos.ccm_received_repository.find_by_document_id.return_value = None

        outbound_req = Mock(id=42)
        mock_repos.ccm_outbound_request_repository = Mock()
        mock_repos.ccm_outbound_request_repository.find_active_by_provider_and_type.return_value = [
            outbound_req
        ]
        mock_factory.return_value.__enter__.return_value = mock_repos

        notification = _make_notification(
            context="CompanyCertificateManagement-CCMAPI-Push:1.0.0",
            content_extras={
                "businessPartnerNumber": "BPNL000000000001",
                "type": {"certificateType": "ISO9001"},
                "document": {
                    "documentID": "DOC-099",
                    "contentType": "application/pdf",
                    "contentBase64": "JVBERi0xLjQgdGVzdA==",
                },
                "issuer": {"issuerName": "TÜV"},
            },
        )

        status, body = self.service.process_certificate_push(notification)

        assert status == 200
        mock_repos.ccm_outbound_request_repository.find_active_by_provider_and_type.assert_called_once_with(
            provider_bpn="BPNL000000000099",
            certificate_type="ISO9001",
            certified_bpn="BPNL000000000001",
        )
        mock_repos.ccm_outbound_request_repository.update_status.assert_called_once_with(
            request_id=42,
            new_status=OutboundRequestStatus.Found,
            document_id="DOC-099",
        )

    # ==================================================================
    # process_certificate_available
    # ==================================================================

    def test_available_acknowledges(self):
        """
        GIVEN an available notification with documentId and certificateType
        WHEN process_certificate_available is called
        THEN the response acknowledges the availability.
        """
        notification = _make_notification(
            context="CompanyCertificateManagement-CCMAPI-Available:1.0.0",
            content_extras={
                "documentId": "DOC-042",
                "certificateType": "IATF16949",
                "locationBpns": ["BPNS000000000001"],
            },
        )

        status, body = self.service.process_certificate_available(notification)

        assert status == 200
        assert "acknowledged" in body["message"].lower()

    # ==================================================================
    # Auto-push on request
    # ==================================================================

    @patch(
        "services.addons.ccm_kit.v1.ccm_notification_service"
        ".CcmNotificationService._auto_push_certificate"
    )
    @patch(
        "services.addons.ccm_kit.v1.ccm_notification_service"
        ".ConfigManager.get_config"
    )
    @patch(
        "services.addons.ccm_kit.v1.ccm_notification_service"
        ".RepositoryManagerFactory.create"
    )
    def test_request_auto_push_enabled(
        self, mock_factory, mock_config, mock_auto_push, mock_repos
    ):
        """
        GIVEN auto_push_on_request is True
        WHEN a certificate request is processed successfully
        THEN _auto_push_certificate is called.
        """
        mock_factory.return_value.__enter__.return_value = mock_repos
        ccm = _make_ccm()
        mock_repos.ccm_repository.find_by_bpnl_and_type.return_value = ccm
        mock_repos.certificate_share_repository.find_by_certificate_and_consumer.return_value = None
        mock_config.return_value = True

        notification = _make_notification(
            content_extras={
                "certifiedBpn": "BPNL000000000001",
                "certificateType": "ISO9001",
            }
        )

        status, _ = self.service.process_certificate_request(notification)

        assert status == 202
        mock_auto_push.assert_called_once_with(ccm.id, "BPNL000000000099", "BPNL000000000001")

    @patch(
        "services.addons.ccm_kit.v1.ccm_notification_service"
        ".CcmNotificationService._auto_push_certificate"
    )
    @patch(
        "services.addons.ccm_kit.v1.ccm_notification_service"
        ".ConfigManager.get_config"
    )
    @patch(
        "services.addons.ccm_kit.v1.ccm_notification_service"
        ".RepositoryManagerFactory.create"
    )
    def test_request_auto_push_disabled(
        self, mock_factory, mock_config, mock_auto_push, mock_repos
    ):
        """
        GIVEN auto_push_on_request is False
        WHEN a certificate request is processed successfully
        THEN _auto_push_certificate is NOT called.
        """
        mock_factory.return_value.__enter__.return_value = mock_repos
        ccm = _make_ccm()
        mock_repos.ccm_repository.find_by_bpnl_and_type.return_value = ccm
        mock_repos.certificate_share_repository.find_by_certificate_and_consumer.return_value = None
        mock_config.return_value = False

        notification = _make_notification(
            content_extras={
                "certifiedBpn": "BPNL000000000001",
                "certificateType": "ISO9001",
            }
        )

        status, _ = self.service.process_certificate_request(notification)

        assert status == 202
        mock_auto_push.assert_not_called()

    # ==================================================================
    # State-machine transition enforcement
    # ==================================================================

    @patch(
        "services.addons.ccm_kit.v1.ccm_notification_service"
        ".RepositoryManagerFactory.create"
    )
    def test_status_transition_revoked_to_active_blocked(
        self, mock_factory, mock_repos
    ):
        """
        GIVEN a share in Revoked state
        WHEN a status ACCEPTED (-> Active) notification arrives
        THEN the transition is blocked with 409.
        """
        mock_factory.return_value.__enter__.return_value = mock_repos
        ccm = _make_ccm(id=10)
        share = _make_share(id=1, certificate_id=10, status=ShareStatus.Revoked)
        mock_repos.ccm_repository.find_by_id_with_relations.return_value = ccm
        mock_repos.certificate_share_repository.find_by_certificate_and_consumer.return_value = share

        notification = _make_notification(
            context="CompanyCertificateManagement-CCMAPI-Status:1.0.0",
            content_extras={
                "documentId": "10",
                "certificateStatus": "ACCEPTED",
            },
        )

        status, body = self.service.update_certificate_status(notification)

        assert status == 409
        assert "cannot transition" in body["message"].lower()
        mock_repos.certificate_share_repository.update_status.assert_not_called()

    @patch(
        "services.addons.ccm_kit.v1.ccm_notification_service"
        ".RepositoryManagerFactory.create"
    )
    def test_status_transition_active_to_revoked_allowed(
        self, mock_factory, mock_repos
    ):
        """
        GIVEN a share in Active state
        WHEN a status REJECTED (-> Revoked) notification arrives
        THEN the transition is allowed.
        """
        mock_factory.return_value.__enter__.return_value = mock_repos
        ccm = _make_ccm(id=20)
        share = _make_share(id=5, certificate_id=20, status=ShareStatus.Active)
        mock_repos.ccm_repository.find_by_id_with_relations.return_value = ccm
        mock_repos.certificate_share_repository.find_by_certificate_and_consumer.return_value = share
        mock_repos.certificate_share_repository.update_status.return_value = share

        notification = _make_notification(
            context="CompanyCertificateManagement-CCMAPI-Status:1.0.0",
            content_extras={
                "documentId": "20",
                "certificateStatus": "REJECTED",
            },
        )

        status, _ = self.service.update_certificate_status(notification)

        assert status == 200
        mock_repos.certificate_share_repository.update_status.assert_called_once_with(
            share_id=5,
            new_status=ShareStatus.Revoked,
            rejection_reason=None,
        )

    @patch(
        "services.addons.ccm_kit.v1.ccm_notification_service"
        ".RepositoryManagerFactory.create"
    )
    def test_status_transition_active_to_pending_blocked(
        self, mock_factory, mock_repos
    ):
        """
        GIVEN a share in Active state
        WHEN a status RECEIVED (-> Pending) notification arrives
        THEN the transition is blocked with 409.
        """
        mock_factory.return_value.__enter__.return_value = mock_repos
        ccm = _make_ccm(id=30)
        share = _make_share(id=8, certificate_id=30, status=ShareStatus.Active)
        mock_repos.ccm_repository.find_by_id_with_relations.return_value = ccm
        mock_repos.certificate_share_repository.find_by_certificate_and_consumer.return_value = share

        notification = _make_notification(
            context="CompanyCertificateManagement-CCMAPI-Status:1.0.0",
            content_extras={
                "documentId": "30",
                "certificateStatus": "RECEIVED",
            },
        )

        status, body = self.service.update_certificate_status(notification)

        assert status == 409
        assert "cannot transition" in body["message"].lower()
        mock_repos.certificate_share_repository.update_status.assert_not_called()
