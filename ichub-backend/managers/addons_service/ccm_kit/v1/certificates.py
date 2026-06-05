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

import base64
import re
from typing import List, Optional

from tools.constants import BPN_SITE_PATTERN as _BPN_SITE_PATTERN_STR

from managers.config.log_manager import LoggingManager
from managers.metadata_database.manager import RepositoryManagerFactory
from utils.log_utils import sanitize_log_value as _s
from models.metadata_database.addons.ccm_kit.v1.models import (
    Ccm,
    CertificateShare,
    TrustLevel,
)
from models.services.addons.ccm_kit.v1 import (
    BusinessPartnerCertificate,
    CertificateDetail,
    CertificateDocument,
    CertificateListItem,
    CertificateShareRead,
    CertificateUpdate,
    SiteRead,
    TrustLevelEnum,
    ShareStatusEnum,
    UploadCertificateRequest,
    UploadCertificateResponse,
)
from tools.exceptions import InvalidError, NotFoundError

logger = LoggingManager.get_logger(__name__)


class CertificatesManager:
    """
    Manages Business Partner Certificate operations for CCM.

    Implements the full CRUD lifecycle for certificates following the
    SAMM BusinessPartnerCertificate v3.1.0 aspect model (CX-0135).
    """

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def upload_certificate(
        self,
        file_content: bytes,
        file_name: str,
        metadata: UploadCertificateRequest,
    ) -> UploadCertificateResponse:
        """
        Upload a new certificate with its PDF document and SAMM metadata.

        Steps:
        1. Validate that the uploaded file is a PDF.
        2. Parse the comma-separated ``sites`` string into individual BPNS/BPNA
           values (if provided).
        3. Persist the Ccm record and associated CcmSite rows in a single
           database transaction.
        4. Encode the PDF as Base64 and return a full response object.

        Args:
            file_content: Raw bytes of the uploaded PDF.
            file_name: Original file name (used for MIME-type validation).
            metadata: Form-data fields mapped to UploadCertificateRequest.

        Returns:
            UploadCertificateResponse with certificateId and the full
            BusinessPartnerCertificate payload (including Base64 document).

        Raises:
            InvalidError: If the uploaded file is not a PDF.
        """
        if not file_name.lower().endswith(".pdf"):
            raise InvalidError("Only PDF files are accepted for certificates.")

        # Validate PDF magic bytes (%PDF-) to reject non-PDF content.
        if file_content[:5] != b"%PDF-":
            raise InvalidError(
                "File content is not a valid PDF (missing %PDF- header)."
            )

        logger.info(
            "Processing certificate PDF '%s' (%d bytes) for BPNL %s",
            file_name,
            len(file_content),
            metadata.bpnl,
        )

        # Parse optional comma-separated BPNS/BPNA list.
        site_bpns: List[str] = self._parse_sites(metadata.sites)

        with RepositoryManagerFactory.create() as repo:
            # Create the core certificate record.
            ccm_record = repo.ccm_repository.create_new(
                bpnl=metadata.bpnl,
                certificate_type=metadata.certificate_type,
                issuer=metadata.issuer,
                valid_from=metadata.valid_from,
                trust_level=TrustLevel(metadata.trust_level.value),
                certificate_name=metadata.certificate_name,
                registration_number=metadata.registration_number,
                area_of_application=metadata.area_of_application,
                valid_until=metadata.valid_until,
                validator=metadata.validator,
                description=metadata.description,
                doc=file_content,
            )

            # Flush (without committing) to obtain the auto-generated PK.
            repo.flush()
            repo.refresh(ccm_record)

            # Create site associations (one row per BPNS/BPNA).
            for site_bpn in site_bpns:
                repo.ccm_site_repository.create_new(
                    ccm_id=ccm_record.id,
                    site_bpn=site_bpn,
                )

            # Single commit — certificate + sites are persisted atomically.
            repo.commit()

            created_at = ccm_record.created_at
            updated_at = ccm_record.updated_at
            certificate_id = str(ccm_record.id)

            # Build site read models for the response.
            sites_read = [SiteRead(siteBpn=s) for s in site_bpns]

            logger.info(
                "Certificate %s persisted for BPNL %s (type: %s)",
                certificate_id,
                metadata.bpnl,
                metadata.certificate_type,
            )

        # Encode PDF to Base64 for the JSON response (never stored as Base64).
        base64_content = self._bytes_to_base64(file_content)
        document = CertificateDocument(
            documentTitle=file_name,
            documentType="application/pdf",
            documentContent=base64_content,
        )

        certificate = BusinessPartnerCertificate(
            certificateId=certificate_id,
            bpnl=metadata.bpnl,
            certificateType=metadata.certificate_type,
            certificateName=metadata.certificate_name,
            issuer=metadata.issuer,
            validFrom=metadata.valid_from,
            validUntil=metadata.valid_until,
            trustLevel=metadata.trust_level,
            registrationNumber=metadata.registration_number,
            areaOfApplication=metadata.area_of_application,
            validator=metadata.validator,
            description=metadata.description,
            sites=sites_read,
            document=document,
            createdAt=created_at,
            updatedAt=updated_at,
        )

        return UploadCertificateResponse(
            certificateId=certificate_id,
            message="Certificate uploaded successfully.",
            certificate=certificate,
        )

    def get_certificate(self, certificate_id: int) -> CertificateDetail:
        """
        Retrieve the full detail of a single certificate by its primary key.

        Includes all SAMM fields, the Base64-encoded PDF document, associated
        sites, and the complete sharing history.

        Args:
            certificate_id: Database primary key of the certificate.

        Returns:
            CertificateDetail with embedded document and sharing history.

        Raises:
            NotFoundError: If no certificate with the given ID exists.
        """
        with RepositoryManagerFactory.create() as repo:
            ccm = repo.ccm_repository.find_by_id_with_relations(certificate_id)
            if ccm is None:
                raise NotFoundError(
                    f"Certificate with ID {certificate_id} not found."
                )

            sites_read = [SiteRead(siteBpn=s.site_bpn) for s in ccm.sites]
            shares_read = [self._share_to_read(s) for s in ccm.shares]
            document = self._build_document(ccm)
            base_fields = self._ccm_to_base_fields(ccm, sites_read)

        return CertificateDetail(
            **base_fields,
            document=document,
            sharingHistory=shares_read,
        )

    def list_certificates(
        self,
        bpnl: Optional[str] = None,
        certificate_type: Optional[str] = None,
        offset: int = 0,
        limit: int = 100,
    ) -> List[CertificateListItem]:
        """
        Return a paginated list of certificates without binary document content.

        Args:
            bpnl: Optional BPNL filter (exact match).
            certificate_type: Optional certificate-type filter (exact match).
            offset: Number of records to skip (for pagination).
            limit: Maximum number of records to return.

        Returns:
            List of CertificateListItem objects.
        """
        with RepositoryManagerFactory.create() as repo:
            records = repo.ccm_repository.find_all_filtered(
                bpnl=bpnl,
                certificate_type=certificate_type,
                offset=offset,
                limit=limit,
            )
            result: List[CertificateListItem] = []
            for ccm in records:
                # Load sites per record (list endpoint; no binary doc needed).
                sites = repo.ccm_site_repository.find_by_ccm_id(ccm.id)
                sites_read = [SiteRead(siteBpn=s.site_bpn) for s in sites]
                result.append(
                    CertificateListItem(**self._ccm_to_base_fields(ccm, sites_read))
                )

        return result

    def update_certificate(
        self, certificate_id: int, update_data: CertificateUpdate
    ) -> CertificateDetail:
        """
        Apply a partial update to an existing certificate.

        Only the fields explicitly set (non-None) in ``update_data`` are
        written.  If ``sites`` is provided it replaces the existing site list
        entirely (delete-all-then-insert pattern).

        Args:
            certificate_id: Database primary key of the certificate to update.
            update_data: Partially-populated CertificateUpdate request model.

        Returns:
            The updated CertificateDetail.

        Raises:
            NotFoundError: If no certificate with the given ID exists.
        """
        with RepositoryManagerFactory.create() as repo:
            # Verify existence before any mutation.
            ccm = repo.ccm_repository.find_by_id_with_relations(certificate_id)
            if ccm is None:
                raise NotFoundError(
                    f"Certificate with ID {certificate_id} not found."
                )

            # Build the dict of fields to update, excluding None values and
            # the 'sites' key (handled separately).
            fields_to_update = {
                k: v
                for k, v in update_data.model_dump(
                    exclude_none=True, by_alias=False
                ).items()
                if k != "sites"
            }

            # Map TrustLevelEnum to the DB-layer TrustLevel enum if present.
            if "trust_level" in fields_to_update:
                fields_to_update["trust_level"] = TrustLevel(
                    fields_to_update["trust_level"]
                )

            if fields_to_update:
                repo.ccm_repository.update_fields(certificate_id, fields_to_update)

            # Replace sites if the caller supplied a new value.
            if update_data.sites is not None:
                repo.ccm_site_repository.delete_by_ccm_id(certificate_id)
                for bpn in self._parse_sites(update_data.sites):
                    repo.ccm_site_repository.create_new(
                        ccm_id=certificate_id, site_bpn=bpn
                    )

            repo.commit()

            # Re-fetch to return the refreshed state.
            ccm = repo.ccm_repository.find_by_id_with_relations(certificate_id)

            sites_read = [SiteRead(siteBpn=s.site_bpn) for s in ccm.sites]
            shares_read = [self._share_to_read(s) for s in ccm.shares]
            document = self._build_document(ccm)
            base_fields = self._ccm_to_base_fields(ccm, sites_read)

        return CertificateDetail(
            **base_fields,
            document=document,
            sharingHistory=shares_read,
        )

    def delete_certificate(self, certificate_id: int) -> bool:
        """
        Delete a certificate and all its associated sites and sharing records.

        The cascade is handled at the application layer (delete sites and
        shares explicitly) to remain independent of any FK cascade
        configuration differences across database backends.

        Args:
            certificate_id: Database primary key of the certificate to delete.

        Returns:
            True if the record was found and deleted.

        Raises:
            NotFoundError: If no certificate with the given ID exists.
        """
        with RepositoryManagerFactory.create() as repo:
            ccm = repo.ccm_repository.find_by_id_with_relations(certificate_id)
            if ccm is None:
                raise NotFoundError(
                    f"Certificate with ID {certificate_id} not found."
                )

            # Remove dependent rows first to avoid FK constraint violations.
            repo.ccm_site_repository.delete_by_ccm_id(certificate_id)
            for share in ccm.shares:
                repo.certificate_share_repository.delete(share.id)
            # Nullify the FK on inbound requests — preserves the consumer
            # demand audit trail while releasing the FK constraint.
            repo.ccm_inbound_request_repository.nullify_certificate_id_by_certificate(
                certificate_id
            )

            repo.ccm_repository.delete_by_id(certificate_id)
            repo.commit()

        logger.info(f"Certificate {_s(certificate_id)} deleted successfully.")
        return True

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _bytes_to_base64(data: bytes) -> str:
        """Return a UTF-8 Base64 string for the given raw bytes."""
        return base64.b64encode(data).decode("utf-8")

    # Regex for valid BPNS or BPNA identifiers (compiled from the central constant).
    _SITE_BPN_RE = re.compile(_BPN_SITE_PATTERN_STR)

    @staticmethod
    def _parse_sites(sites_str: Optional[str]) -> List[str]:
        """
        Parse a comma-separated BPNS/BPNA string into a deduplicated list.

        Each value is validated against the ``BPN[SA]`` format.  Invalid
        entries are silently dropped and a warning is logged.

        Example:
            "BPNS000000000001, BPNA000000000002" -> ["BPNS000000000001", "BPNA000000000002"]
        """
        if not sites_str:
            return []
        seen: set = set()
        result: List[str] = []
        for raw in sites_str.split(","):
            bpn = raw.strip()
            if not bpn:
                continue
            if not CertificatesManager._SITE_BPN_RE.match(bpn):
                logger.warning("Ignoring invalid site BPN: %s", _s(bpn))
                continue
            if bpn not in seen:
                seen.add(bpn)
                result.append(bpn)
        return result

    @staticmethod
    def _share_to_read(share: CertificateShare) -> CertificateShareRead:
        """Map a CertificateShare ORM record to a CertificateShareRead model."""
        return CertificateShareRead(
            id=share.id,
            certificateId=share.certificate_id,
            consumerBpnl=share.consumer_bpnl,
            lastSharedDate=share.last_shared_date,
            status=ShareStatusEnum(share.status.value),
            createdAt=share.created_at,
        )

    @staticmethod
    def _build_document(ccm: Ccm) -> Optional[CertificateDocument]:
        """
        Build the CertificateDocument model with Base64-encoded content.
        Returns None if no document bytes are stored.
        """
        if ccm.doc is None:
            return None
        return CertificateDocument(
            # Use the certificate name as the document title if available,
            # otherwise fall back to a generic name.
            documentTitle=ccm.certificate_name or f"certificate_{ccm.id}.pdf",
            documentType="application/pdf",
            documentContent=base64.b64encode(ccm.doc).decode("utf-8"),
        )

    @staticmethod
    def _ccm_to_base_fields(ccm: Ccm, sites_read: List[SiteRead]) -> dict:
        """
        Build the shared base-field dictionary used by both CertificateListItem
        and CertificateDetail constructors.

        Kept as a plain dict so both models can unpack it with ``**``.
        """
        return dict(
            certificateId=str(ccm.id),
            bpnl=ccm.bpnl,
            certificateType=ccm.certificate_type,
            certificateName=ccm.certificate_name,
            issuer=ccm.issuer,
            validFrom=ccm.valid_from,
            validUntil=ccm.valid_until,
            trustLevel=TrustLevelEnum(ccm.trust_level.value),
            registrationNumber=ccm.registration_number,
            areaOfApplication=ccm.area_of_application,
            validator=ccm.validator,
            uploaderBpnl=ccm.uploader_bpnl,
            description=ccm.description,
            sites=sites_read,
            createdAt=ccm.created_at,
            updatedAt=ccm.updated_at,
        )


# Singleton instance consumed by controllers.
certificates_manager = CertificatesManager()
