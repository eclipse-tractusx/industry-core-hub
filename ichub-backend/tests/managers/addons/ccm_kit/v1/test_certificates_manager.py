#################################################################################
# Eclipse Tractus-X - Industry Core Hub Backend
#
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
"""
Unit tests for CertificatesManager.

Covers the full CRUD surface of the manager using mocked repositories so that
no real database connection is required.  Each test follows the
Arrange → Act → Assert pattern established in the rest of the test suite.
"""

import pytest
from datetime import date, datetime
from unittest.mock import Mock, patch

from managers.addons_service.ccm_kit.v1.certificates import CertificatesManager
from models.metadata_database.addons.ccm_kit.v1.models import (
    Ccm,
    TrustLevel,
)
from models.services.addons.ccm_kit.v1 import (
    CertificateDetail,
    CertificateListItem,
    CertificateUpdate,
    TrustLevelEnum,
    UploadCertificateRequest,
    UploadCertificateResponse,
)
from tools.exceptions import InvalidError, NotFoundError


# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------

def _make_ccm(**kwargs) -> Mock:
    """Return a Mock that resembles a Ccm ORM record."""
    m = Mock(spec=Ccm)
    m.id = kwargs.get("id", 1)
    m.bpnl = kwargs.get("bpnl", "BPNL000000000001")
    m.certificate_type = kwargs.get("certificate_type", "ISO9001")
    m.issuer = kwargs.get("issuer", "TÜV SÜD")
    m.valid_from = kwargs.get("valid_from", date(2024, 1, 1))
    m.valid_until = kwargs.get("valid_until", date(2026, 12, 31))
    m.trust_level = kwargs.get("trust_level", TrustLevel.none)
    m.certificate_name = kwargs.get("certificate_name", "ISO 9001:2015")
    m.registration_number = kwargs.get("registration_number", None)
    m.area_of_application = kwargs.get("area_of_application", None)
    m.validator = kwargs.get("validator", None)
    m.uploader_bpnl = kwargs.get("uploader_bpnl", None)
    m.description = kwargs.get("description", None)
    m.doc = kwargs.get("doc", b"%PDF-1.4 test")
    m.created_at = kwargs.get("created_at", datetime(2024, 6, 1))
    m.updated_at = kwargs.get("updated_at", datetime(2024, 6, 1))
    m.sites = kwargs.get("sites", [])
    m.shares = kwargs.get("shares", [])
    return m


def _make_upload_request(**kwargs) -> UploadCertificateRequest:
    """Return a minimal valid UploadCertificateRequest."""
    return UploadCertificateRequest(
        bpnl=kwargs.get("bpnl", "BPNL000000000001"),
        certificateType=kwargs.get("certificate_type", "ISO9001"),
        issuer=kwargs.get("issuer", "TÜV SÜD"),
        validFrom=kwargs.get("valid_from", date(2024, 1, 1)),
        trustLevel=kwargs.get("trust_level", TrustLevelEnum.none),
        certificateName=kwargs.get("certificate_name", None),
        sites=kwargs.get("sites", None),
    )


# ---------------------------------------------------------------------------
# Test class
# ---------------------------------------------------------------------------

class TestCertificatesManager:
    """Unit tests for CertificatesManager CRUD operations."""

    def setup_method(self):
        """Instantiate a fresh manager before each test."""
        self.manager = CertificatesManager()

    @pytest.fixture
    def mock_repos(self):
        """Provide a mock RepositoryManager with all required sub-repos."""
        repos = Mock()
        repos.ccm_repository = Mock()
        repos.ccm_site_repository = Mock()
        repos.certificate_share_repository = Mock()
        repos.commit = Mock()
        repos.refresh = Mock()
        return repos

    # ------------------------------------------------------------------
    # upload_certificate
    # ------------------------------------------------------------------

    @patch("managers.addons_service.ccm_kit.v1.certificates.RepositoryManagerFactory.create")
    def test_upload_certificate_success(self, mock_factory, mock_repos):
        """
        GIVEN a valid PDF binary and SAMM metadata
        WHEN upload_certificate is called
        THEN a persisted Ccm record is created and the response contains the
             Base64-encoded document and the generated certificateId.
        """
        # Arrange
        mock_factory.return_value.__enter__.return_value = mock_repos
        ccm = _make_ccm()
        mock_repos.ccm_repository.create_new.return_value = ccm

        pdf_bytes = b"%PDF-1.4 minimal"
        metadata = _make_upload_request()

        # Act
        result = self.manager.upload_certificate(
            file_content=pdf_bytes,
            file_name="cert.pdf",
            metadata=metadata,
        )

        # Assert
        assert isinstance(result, UploadCertificateResponse)
        assert result.certificate_id == str(ccm.id)
        assert result.certificate.document is not None
        assert result.certificate.document.document_type == "application/pdf"
        mock_repos.ccm_repository.create_new.assert_called_once()
        mock_repos.commit.assert_called()

    @patch("managers.addons_service.ccm_kit.v1.certificates.RepositoryManagerFactory.create")
    def test_upload_certificate_with_sites(self, mock_factory, mock_repos):
        """
        GIVEN a comma-separated sites string in the request
        WHEN upload_certificate is called
        THEN a CcmSite row is inserted for each parsed BPNS/BPNA value.
        """
        mock_factory.return_value.__enter__.return_value = mock_repos
        ccm = _make_ccm()
        mock_repos.ccm_repository.create_new.return_value = ccm
        mock_repos.ccm_site_repository.create_new.return_value = Mock()

        metadata = _make_upload_request(sites="BPNS000000000001,BPNS000000000002")

        self.manager.upload_certificate(
            file_content=b"%PDF-1.4 test",
            file_name="cert.pdf",
            metadata=metadata,
        )

        assert mock_repos.ccm_site_repository.create_new.call_count == 2

    def test_upload_certificate_invalid_file_type(self):
        """
        GIVEN a non-PDF file name
        WHEN upload_certificate is called
        THEN an InvalidError is raised immediately (no DB access).
        """
        metadata = _make_upload_request()
        with pytest.raises(InvalidError):
            self.manager.upload_certificate(
                file_content=b"not a pdf",
                file_name="document.docx",
                metadata=metadata,
            )

    # ------------------------------------------------------------------
    # get_certificate
    # ------------------------------------------------------------------

    @patch("managers.addons_service.ccm_kit.v1.certificates.RepositoryManagerFactory.create")
    def test_get_certificate_success(self, mock_factory, mock_repos):
        """
        GIVEN a certificate ID that exists in the database
        WHEN get_certificate is called
        THEN a CertificateDetail object is returned with all SAMM fields.
        """
        mock_factory.return_value.__enter__.return_value = mock_repos
        ccm = _make_ccm()
        mock_repos.ccm_repository.find_by_id_with_relations.return_value = ccm

        result = self.manager.get_certificate(1)

        assert isinstance(result, CertificateDetail)
        assert result.certificate_id == "1"
        assert result.bpnl == ccm.bpnl

    @patch("managers.addons_service.ccm_kit.v1.certificates.RepositoryManagerFactory.create")
    def test_get_certificate_not_found(self, mock_factory, mock_repos):
        """
        GIVEN a certificate ID that does not exist
        WHEN get_certificate is called
        THEN a NotFoundError is raised.
        """
        mock_factory.return_value.__enter__.return_value = mock_repos
        mock_repos.ccm_repository.find_by_id_with_relations.return_value = None

        with pytest.raises(NotFoundError):
            self.manager.get_certificate(999)

    # ------------------------------------------------------------------
    # list_certificates
    # ------------------------------------------------------------------

    @patch("managers.addons_service.ccm_kit.v1.certificates.RepositoryManagerFactory.create")
    def test_list_certificates_returns_list(self, mock_factory, mock_repos):
        """
        GIVEN two Ccm records in the database
        WHEN list_certificates is called without filters
        THEN a list of two CertificateListItem objects is returned (no doc).
        """
        mock_factory.return_value.__enter__.return_value = mock_repos
        ccm1, ccm2 = _make_ccm(id=1), _make_ccm(id=2)
        mock_repos.ccm_repository.find_all_filtered.return_value = [ccm1, ccm2]
        mock_repos.ccm_site_repository.find_by_ccm_id.return_value = []

        result = self.manager.list_certificates()

        assert len(result) == 2
        assert all(isinstance(r, CertificateListItem) for r in result)

    @patch("managers.addons_service.ccm_kit.v1.certificates.RepositoryManagerFactory.create")
    def test_list_certificates_empty(self, mock_factory, mock_repos):
        """
        GIVEN no records in the database
        WHEN list_certificates is called
        THEN an empty list is returned.
        """
        mock_factory.return_value.__enter__.return_value = mock_repos
        mock_repos.ccm_repository.find_all_filtered.return_value = []

        result = self.manager.list_certificates()

        assert result == []

    # ------------------------------------------------------------------
    # update_certificate
    # ------------------------------------------------------------------

    @patch("managers.addons_service.ccm_kit.v1.certificates.RepositoryManagerFactory.create")
    def test_update_certificate_success(self, mock_factory, mock_repos):
        """
        GIVEN an existing certificate and a partial update payload
        WHEN update_certificate is called
        THEN the repository update method is invoked and a CertificateDetail
             reflecting the new state is returned.
        """
        mock_factory.return_value.__enter__.return_value = mock_repos
        original_ccm = _make_ccm()
        updated_ccm = _make_ccm(issuer="New Authority")
        mock_repos.ccm_repository.find_by_id_with_relations.side_effect = [
            original_ccm,
            updated_ccm,
        ]

        update_data = CertificateUpdate(issuer="New Authority")
        result = self.manager.update_certificate(1, update_data)

        assert isinstance(result, CertificateDetail)
        mock_repos.ccm_repository.update_fields.assert_called_once()
        mock_repos.commit.assert_called()

    @patch("managers.addons_service.ccm_kit.v1.certificates.RepositoryManagerFactory.create")
    def test_update_certificate_not_found(self, mock_factory, mock_repos):
        """
        GIVEN a certificate ID that does not exist
        WHEN update_certificate is called
        THEN a NotFoundError is raised.
        """
        mock_factory.return_value.__enter__.return_value = mock_repos
        mock_repos.ccm_repository.find_by_id_with_relations.return_value = None

        with pytest.raises(NotFoundError):
            self.manager.update_certificate(999, CertificateUpdate())

    # ------------------------------------------------------------------
    # delete_certificate
    # ------------------------------------------------------------------

    @patch("managers.addons_service.ccm_kit.v1.certificates.RepositoryManagerFactory.create")
    def test_delete_certificate_success(self, mock_factory, mock_repos):
        """
        GIVEN a certificate ID that exists in the database
        WHEN delete_certificate is called
        THEN True is returned and all dependent rows are removed first.
        """
        mock_factory.return_value.__enter__.return_value = mock_repos
        ccm = _make_ccm(shares=[])
        mock_repos.ccm_repository.find_by_id_with_relations.return_value = ccm

        result = self.manager.delete_certificate(1)

        assert result is True
        mock_repos.ccm_site_repository.delete_by_ccm_id.assert_called_once_with(1)
        mock_repos.ccm_repository.delete_by_id.assert_called_once_with(1)
        mock_repos.commit.assert_called()

    @patch("managers.addons_service.ccm_kit.v1.certificates.RepositoryManagerFactory.create")
    def test_delete_certificate_not_found(self, mock_factory, mock_repos):
        """
        GIVEN a certificate ID that does not exist
        WHEN delete_certificate is called
        THEN a NotFoundError is raised and no delete is attempted.
        """
        mock_factory.return_value.__enter__.return_value = mock_repos
        mock_repos.ccm_repository.find_by_id_with_relations.return_value = None

        with pytest.raises(NotFoundError):
            self.manager.delete_certificate(999)

        mock_repos.ccm_repository.delete_by_id.assert_not_called()

    # ------------------------------------------------------------------
    # Private helper unit tests
    # ------------------------------------------------------------------

    def test_parse_sites_normal(self):
        """Comma-separated string is split, validated and stripped correctly."""
        result = CertificatesManager._parse_sites(
            "BPNS00000000001A, BPNA00000000002B , BPNS00000000003C"
        )
        assert result == ["BPNS00000000001A", "BPNA00000000002B", "BPNS00000000003C"]

    def test_parse_sites_none(self):
        """None input returns empty list."""
        assert CertificatesManager._parse_sites(None) == []

    def test_parse_sites_empty_string(self):
        """Empty string returns empty list."""
        assert CertificatesManager._parse_sites("") == []

    def test_bytes_to_base64(self):
        """Raw bytes are encoded to a valid Base64 string."""
        import base64
        raw = b"hello world"
        expected = base64.b64encode(raw).decode("utf-8")
        assert CertificatesManager._bytes_to_base64(raw) == expected

    # ------------------------------------------------------------------
    # _parse_sites – validation & deduplication
    # ------------------------------------------------------------------

    def test_parse_sites_drops_invalid_bpn(self):
        """Invalid BPN format entries are silently dropped."""
        result = CertificatesManager._parse_sites(
            "BPNS00000000001A,INVALID,BPNA00000000002B"
        )
        assert result == ["BPNS00000000001A", "BPNA00000000002B"]

    def test_parse_sites_deduplicates(self):
        """Duplicate entries are removed preserving first-seen order."""
        result = CertificatesManager._parse_sites(
            "BPNS00000000001A,BPNS00000000001A,BPNA00000000002B"
        )
        assert result == ["BPNS00000000001A", "BPNA00000000002B"]

    def test_parse_sites_rejects_bpnl(self):
        """BPNL values are not valid site BPNs and should be dropped."""
        result = CertificatesManager._parse_sites("BPNL000000000001")
        assert result == []

    # ------------------------------------------------------------------
    # upload_certificate – PDF magic bytes validation
    # ------------------------------------------------------------------

    def test_upload_certificate_invalid_magic_bytes(self):
        """
        GIVEN a file named .pdf but whose content does not start with %PDF-
        WHEN upload_certificate is called
        THEN an InvalidError is raised.
        """
        metadata = _make_upload_request()
        with pytest.raises(InvalidError):
            self.manager.upload_certificate(
                file_content=b"PK\x03\x04 not a pdf",
                file_name="fake.pdf",
                metadata=metadata,
            )
