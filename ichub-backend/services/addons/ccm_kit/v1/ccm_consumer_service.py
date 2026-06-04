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
Consumer-side service for CX-0135 Company Certificate Management (CCM).

Provides four operations:
1. Catalog search — check whether a provider exposes a CCM notification asset.
2. Send request — ask a provider to share a specific certificate (PULL flow).
3. Send status — notify the provider of the processing result after receiving
   a certificate via PUSH.
4. Pull certificate — discover and retrieve a certificate from a provider's
   EDC catalog via the PULL mechanism (HttpData asset).
"""

import base64
import binascii
import json
import uuid
from typing import Dict, List, Optional

import requests as http_requests

from connector import consumer_connector_service
from managers.config.config_manager import ConfigManager
from managers.config.log_manager import LoggingManager
from managers.metadata_database.manager import RepositoryManagerFactory
from models.metadata_database.addons.ccm_kit.v1.models import (
    CcmReceived,
    OutboundRequestStatus,
    ReceivedCertificateStatus,
)
from utils.log_utils import sanitize_log_value as _s
from models.services.addons.ccm_kit.v1.notifications import (
    CcmCatalogSearchRequest,
    CcmCatalogSearchResult,
    CcmPullRequest,
    CcmPullResult,
    CcmSendRequestPayload,
    CcmSendResult,
    CcmSendStatusPayload,
    OutboundRequestItem,
    ReceivedCertificateDetail,
    ReceivedCertificateItem,
)
from services.addons.ccm_kit.v1.ccm_base_service import CcmBaseService
from tools.constants import (
    CCM_CONTEXT_REQUEST,
    CCM_CONTEXT_STATUS,
    CCM_DCT_TYPE,
    CCM_ENDPOINT_REQUEST,
    CCM_ENDPOINT_STATUS,
)

logger = LoggingManager.get_logger(__name__)


class CcmConsumerService(CcmBaseService):
    """
    Consumer-side operations for CX-0135 Company Certificate Management.

    Uses the EDC connector infrastructure (discovery, catalog, DSP negotiation)
    to interact with a remote provider's CCM notification API.
    """

    _log_prefix = "[CCM Consumer]"

    # ------------------------------------------------------------------
    # Catalog search
    # ------------------------------------------------------------------

    def search_catalog(self, request: CcmCatalogSearchRequest) -> CcmCatalogSearchResult:
        """
        Search a provider's EDC catalog for a CCM notification asset.

        Resolves the provider's DSP URL via connector discovery, then queries
        the catalog filtering by the CCM dct_type.
        """
        provider_bpn = request.provider_bpn
        logger.info(f"[CCM Consumer] Searching catalog for provider [{_s(provider_bpn)}]")

        try:
            dsp_url = self._resolve_dsp_url(provider_bpn)
        except Exception as e:
            logger.warning(f"[CCM Consumer] Discovery failed for [{_s(provider_bpn)}]: {_s(e)}")
            return CcmCatalogSearchResult(
                found=False,
                provider_bpn=provider_bpn,
                error=f"Discovery failed: {e}",
            )

        try:
            catalog = consumer_connector_service.get_catalog_by_dct_type_with_bpnl(
                bpnl=provider_bpn,
                counter_party_address=dsp_url,
                dct_type=CCM_DCT_TYPE,
            )
        except Exception as e:
            logger.warning(f"[CCM Consumer] Catalog query failed for [{_s(provider_bpn)}]: {_s(e)}")
            return CcmCatalogSearchResult(
                found=False,
                provider_bpn=provider_bpn,
                dsp_url=dsp_url,
                error=f"Catalog query failed: {e}",
            )

        # Extract asset ID from catalog response
        asset_id = self._extract_asset_id(catalog)
        found = asset_id is not None

        logger.info(
            f"[CCM Consumer] Catalog search result for [{_s(provider_bpn)}]: "
            f"found={found}, asset_id={_s(asset_id)}"
        )
        return CcmCatalogSearchResult(
            found=found,
            provider_bpn=provider_bpn,
            dsp_url=dsp_url,
            asset_id=asset_id,
            dct_type=CCM_DCT_TYPE if found else None,
        )

    # ------------------------------------------------------------------
    # Send certificate request (consumer → provider)
    # ------------------------------------------------------------------

    def send_certificate_request(
        self,
        payload: CcmSendRequestPayload,
        sender_bpn: str,
    ) -> CcmSendResult:
        """
        Send a certificate request notification to a provider.

        Builds a CX-0135 Request notification and transmits it via DSP
        negotiation to the provider's ``/companycertificate/request`` endpoint.
        The outbound request is persisted in ``ccm_outbound_request`` so
        operators can track the status of outstanding requests.
        """
        provider_bpn = payload.provider_bpn
        logger.info(
            f"[CCM Consumer] Sending certificate request to [{_s(provider_bpn)}] "
            f"for type={_s(payload.certificate_type)}, certifiedBpn={_s(payload.certified_bpn)}"
        )

        # Build notification content
        content_fields = {
            "certifiedBpn": payload.certified_bpn,
            "certificateType": payload.certificate_type,
        }
        if payload.location_bpns:
            content_fields["locationBpns"] = payload.location_bpns

        notification = self._build_notification(
            context=CCM_CONTEXT_REQUEST,
            sender_bpn=sender_bpn,
            receiver_bpn=provider_bpn,
            content_fields=content_fields,
        )

        result = self._send_notification(
            target_bpn=provider_bpn,
            notification=notification,
            endpoint_path=CCM_ENDPOINT_REQUEST,
            policies=payload.governance,
        )

        # Inspect the provider response body for a CX-0135 REJECTED status.
        # The SDK returns HTTP 200 for REJECTED (valid 2xx), so we must check
        # the body ourselves — HTTP 200 alone does not mean the cert was found.
        outbound_status = OutboundRequestStatus.Pending
        if result.success:
            provider_content = (
                (result.provider_response or {}).get("content", {})
            )
            request_status = provider_content.get("requestStatus")

            if request_status == "REJECTED":
                errors = provider_content.get("requestErrors", [])
                error_msg = (
                    errors[0].get("message", "Provider rejected the request.")
                    if errors
                    else "Provider rejected the request."
                )
                logger.warning(
                    f"[CCM Consumer] Provider REJECTED request for "
                    f"certifiedBpn={_s(payload.certified_bpn)} "
                    f"type={_s(payload.certificate_type)}: {_s(error_msg)}"
                )
                result = CcmSendResult(
                    success=False,
                    message_id=result.message_id,
                    error=error_msg,
                )
                outbound_status = OutboundRequestStatus.NotFound

            elif request_status == "COMPLETED":
                outbound_status = OutboundRequestStatus.Found

            # IN_PROGRESS → keep Pending (provider will push/notify later)

        else:
            outbound_status = OutboundRequestStatus.Failed

        # Persist the outbound request regardless of outcome so the operator
        # can inspect failed deliveries as well.
        try:
            with RepositoryManagerFactory.create() as repo:
                repo.ccm_outbound_request_repository.create_new(
                    sender_bpn=sender_bpn,
                    provider_bpn=provider_bpn,
                    certified_bpn=payload.certified_bpn,
                    certificate_type=payload.certificate_type,
                    location_bpns=(
                        json.dumps(payload.location_bpns)
                        if payload.location_bpns else None
                    ),
                    governance=(
                        json.dumps(payload.governance)
                        if payload.governance else None
                    ),
                    notification_id=str(notification.header.message_id),
                    status=outbound_status,
                )
        except Exception as persist_err:
            # Persistence failure must not mask a successful notification send.
            logger.warning(
                f"[CCM Consumer] Failed to persist outbound request record: "
                f"{_s(persist_err)}"
            )

        return result

    # ------------------------------------------------------------------
    # Send certificate status (consumer → provider)
    # ------------------------------------------------------------------

    def send_certificate_status(
        self,
        payload: CcmSendStatusPayload,
        sender_bpn: str,
    ) -> CcmSendResult:
        """
        Send a certificate status notification to a provider.

        Communicates the consumer's processing result (RECEIVED/ACCEPTED/REJECTED)
        for a previously received certificate.  The local ``ccm_received`` record
        is updated to reflect the new ``local_status`` so operators can see the
        current state from this node's perspective.
        """
        provider_bpn = payload.provider_bpn
        logger.info(
            f"[CCM Consumer] Sending certificate status to [{_s(provider_bpn)}] "
            f"documentId={_s(payload.document_id)}, status={_s(payload.certificate_status.value)}"
        )

        content_fields: Dict = {
            "documentId": payload.document_id,
            "certificateStatus": payload.certificate_status.value,
        }
        if payload.location_bpns:
            content_fields["locationBpns"] = payload.location_bpns
        if payload.certificate_errors:
            content_fields["certificateErrors"] = payload.certificate_errors
        if payload.location_errors:
            content_fields["locationErrors"] = payload.location_errors

        # Resolve relatedMessageId — links this status to the original notification.
        related_msg_id: Optional[uuid.UUID] = None
        if payload.related_message_id:
            try:
                related_msg_id = uuid.UUID(payload.related_message_id)
            except ValueError:
                logger.warning(
                    f"[CCM Consumer] Invalid relatedMessageId: "
                    f"{_s(payload.related_message_id)}"
                )

        notification = self._build_notification(
            context=CCM_CONTEXT_STATUS,
            sender_bpn=sender_bpn,
            receiver_bpn=provider_bpn,
            content_fields=content_fields,
            related_message_id=related_msg_id,
        )

        result = self._send_notification(
            target_bpn=provider_bpn,
            notification=notification,
            endpoint_path=CCM_ENDPOINT_STATUS,
            policies=payload.governance,
        )

        # Map CertificateStatusValue → ReceivedCertificateStatus and persist.
        # The mapping is intentional: ACCEPTED → Accepted, REJECTED → Rejected,
        # RECEIVED → Pending (still being reviewed by the consumer).
        _STATUS_LOCAL_MAP = {
            "ACCEPTED": ReceivedCertificateStatus.Accepted,
            "REJECTED": ReceivedCertificateStatus.Rejected,
            "RECEIVED": ReceivedCertificateStatus.Pending,
        }
        new_local_status = _STATUS_LOCAL_MAP.get(payload.certificate_status.value)
        if new_local_status is not None:
            try:
                with RepositoryManagerFactory.create() as repo:
                    repo.ccm_received_repository.update_local_status(
                        document_id=payload.document_id,
                        provider_bpn=provider_bpn,
                        new_status=new_local_status,
                    )
            except Exception as update_err:
                # A failed local update must not suppress a successful notification.
                logger.warning(
                    f"[CCM Consumer] Failed to update local_status for "
                    f"document_id={_s(payload.document_id)}: {_s(update_err)}"
                )

        return result

    # ------------------------------------------------------------------
    # Pull certificate (consumer ← provider, PULL mechanism)
    # ------------------------------------------------------------------

    def pull_certificate(
        self,
        request: CcmPullRequest,
    ) -> CcmPullResult:
        """
        Discover and pull a certificate from a provider's EDC catalog.

        1. Resolve the provider's DSP URL.
        2. Perform the full DSP exchange (catalog → contract negotiation → EDR)
           via ``do_dsp_with_bpnl``, which handles Saturn BPN→DID resolution
           internally and polls for the EDR with configurable ``max_wait``.
        3. Retrieve the certificate data via the data plane.
        4. Store the certificate in the local ``ccm_received`` table.

        Args:
            request: Contains ``provider_bpn`` and ``document_id``.

        Returns:
            CcmPullResult with the certificate payload and storage status.
        """
        provider_bpn = request.provider_bpn
        document_id = request.document_id

        logger.info(
            f"[CCM Consumer] Pulling certificate {_s(document_id)} "
            f"from provider [{_s(provider_bpn)}]"
        )

        # --- 1. Resolve DSP URL ---
        try:
            dsp_url = self._resolve_dsp_url(provider_bpn)
        except Exception as e:
            logger.error(
                f"[CCM Consumer] Discovery failed for [{_s(provider_bpn)}]: {_s(e)}"
            )
            return CcmPullResult(
                certificate_data={},
                stored=False,
            )

        # --- 2 & 3. DSP exchange + data plane fetch ---
        try:
            policies = request.governance if request.governance is not None else self._resolve_policies()
            max_wait = int(
                ConfigManager.get_config("consumer.ccm.edr_max_wait_sec", default=60)
            )
            filter_expression = [
                consumer_connector_service.get_filter_expression(
                    key="https://w3id.org/edc/v0.0.1/ns/id",
                    value=document_id,
                    operator="=",
                )
            ]
            # Evict any stale EDR for this counterparty before negotiating.
            self._evict_edr_cache(provider_bpn)

            # Performs catalog lookup → contract negotiation → EDR polling.
            # do_dsp_with_bpnl handles Saturn BPN→DID resolution internally;
            # for Jupiter it passes the BPN directly as counter_party_id.
            endpoint, token = consumer_connector_service.do_dsp_with_bpnl(
                bpnl=provider_bpn,
                counter_party_address=dsp_url,
                filter_expression=filter_expression,
                policies=policies,
                max_wait=max_wait,
                poll_interval=1,
            )
            if not endpoint or not token:
                raise RuntimeError("DSP exchange did not return endpoint or token.")

            headers = consumer_connector_service.get_data_plane_headers(
                access_token=token
            )
            timeout_sec = int(
                ConfigManager.get_config(
                    "consumer.ccm.data_plane_timeout_sec", default=60
                )
            )
            response = http_requests.get(endpoint, headers=headers, timeout=timeout_sec)
            response.raise_for_status()
            certificate_data = response.json()
        except ValueError as json_err:
            logger.error(
                f"[CCM Consumer] Invalid JSON from data plane: {_s(json_err)}"
            )
            return CcmPullResult(certificate_data={}, stored=False)
        except Exception as e:
            logger.error(
                f"[CCM Consumer] Failed to pull certificate data: {_s(e)}"
            )
            return CcmPullResult(certificate_data={}, stored=False)

        # --- 4. Store in ccm_received ---
        stored = self._store_received_certificate(
            certificate_data=certificate_data,
            provider_bpn=provider_bpn,
            document_id=document_id,
        )

        # --- 5. Correlate outbound requests ---
        if stored:
            cert_bpn = certificate_data.get("businessPartnerNumber", "")
            cert_type = (
                certificate_data.get("type", {}).get("certificateType", "")
            )
            if cert_bpn and cert_type:
                try:
                    self._correlate_outbound_after_pull(
                        provider_bpn=provider_bpn,
                        certified_bpn=cert_bpn,
                        certificate_type=cert_type,
                        document_id=document_id,
                    )
                except Exception as e:
                    logger.error(
                        f"[CCM Consumer] Outbound correlation failed after pull "
                        f"for {_s(document_id)}: {_s(e)}"
                    )

        logger.info(
            f"[CCM Consumer] Successfully pulled certificate {_s(document_id)} "
            f"from [{_s(provider_bpn)}]. Stored={stored}"
        )

        return CcmPullResult(
            certificate_data=certificate_data,
            stored=stored,
        )

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _extract_asset_id(catalog: dict) -> Optional[str]:
        """
        Extract the asset ID from a catalog response.

        The catalog structure varies by dataspace version (Jupiter vs Saturn),
        but the asset ID is typically in ``dcat:dataset`` → ``@id`` or
        ``dataset`` → ``@id``.
        """
        if not catalog:
            return None

        # Try both Jupiter and Saturn catalog keys
        dataset = catalog.get("dcat:dataset") or catalog.get("dataset")
        if not dataset:
            return None

        # dataset may be a single dict or a list
        if isinstance(dataset, list):
            if not dataset:
                return None
            dataset = dataset[0]

        if isinstance(dataset, dict):
            return dataset.get("@id") or dataset.get("id")

        return None


    @staticmethod
    def _store_received_certificate(
        certificate_data: dict,
        provider_bpn: str,
        document_id: str,
    ) -> bool:
        """
        Persist a pulled certificate in the ``ccm_received`` table.

        Returns ``True`` on success, ``False`` on failure.
        """
        try:
            # Parse fields from the BusinessPartnerCertificate payload
            doc_section = certificate_data.get("document", {})
            issuer_section = certificate_data.get("issuer", {})
            validator_section = certificate_data.get("validator", {})
            cert_type_section = certificate_data.get("type", {})

            # Decode base64 document if present
            doc_bytes = None
            content_b64 = doc_section.get("contentBase64")
            if content_b64:
                try:
                    doc_bytes = base64.b64decode(content_b64)
                except (binascii.Error) as b64_err:
                    logger.warning(
                        f"[CCM Consumer] Failed to decode base64 document "
                        f"for {_s(document_id)}: {_s(b64_err)}"
                    )

            with RepositoryManagerFactory.create() as repo:
                repo.ccm_received_repository.create_new(
                    document_id=document_id,
                    provider_bpn=provider_bpn,
                    certified_bpn=certificate_data.get("businessPartnerNumber", ""),
                    certificate_type=cert_type_section.get("certificateType", ""),
                    issuer_name=issuer_section.get("issuerName"),
                    valid_from=certificate_data.get("validFrom"),
                    valid_until=certificate_data.get("validUntil"),
                    trust_level=certificate_data.get("trustLevel"),
                    registration_number=certificate_data.get("registrationNumber"),
                    area_of_application=certificate_data.get("areaOfApplication"),
                    uploader_bpn=certificate_data.get("uploader"),
                    validator_name=validator_section.get("validatorName"),
                    doc=doc_bytes,
                )

            return True
        except Exception as e:
            logger.error(f"[CCM Consumer] Failed to store received certificate: {_s(e)}")
            return False

    @staticmethod
    def _correlate_outbound_after_pull(
        provider_bpn: str,
        certified_bpn: str,
        certificate_type: str,
        document_id: str,
    ) -> None:
        """
        Advance active outbound requests to ``Found`` after a manual pull.

        Matches ``Pending``, ``NotFound``, and ``Found``-without-``document_id``
        requests for the ``(provider_bpn, certificate_type, certified_bpn)``
        combination and sets ``document_id`` on each.
        """
        with RepositoryManagerFactory.create() as repo:
            active = repo.ccm_outbound_request_repository.find_active_by_provider_and_type(
                provider_bpn=provider_bpn,
                certificate_type=certificate_type,
                certified_bpn=certified_bpn,
            )
            for req in active:
                repo.ccm_outbound_request_repository.update_status(
                    request_id=req.id,
                    new_status=OutboundRequestStatus.Found,
                    document_id=document_id,
                )
                logger.info(
                    f"[CCM Consumer] Outbound request {req.id} → Found "
                    f"(documentId={_s(document_id)}) after pull"
                )
            if active:
                repo.commit()

    # ------------------------------------------------------------------
    # Visibility: received certificates
    # ------------------------------------------------------------------

    def list_received(
        self,
        certified_bpn: Optional[str] = None,
        certificate_type: Optional[str] = None,
        offset: int = 0,
        limit: int = 100,
    ) -> List[ReceivedCertificateItem]:
        """
        Return a paginated list of certificates received by this node.

        Supports filtering by certified BPNL and/or certificate type.
        The binary document content is excluded from list results; use
        ``get_received`` for the full detail including the document.

        Args:
            certified_bpn: Optional BPNL filter for the certified legal entity.
            certificate_type: Optional certificate-type filter.
            offset: Pagination offset.
            limit: Maximum number of records to return.

        Returns:
            List of ReceivedCertificateItem DTOs.
        """
        with RepositoryManagerFactory.create() as repo:
            records = repo.ccm_received_repository.find_all_filtered(
                certified_bpn=certified_bpn,
                certificate_type=certificate_type,
                offset=offset,
                limit=limit,
            )
            return [self._to_received_item(r) for r in records]

    def get_received(self, received_id: int) -> Optional[ReceivedCertificateDetail]:
        """
        Return the full detail for a single received certificate.

        Includes the Base64-encoded PDF document when present.

        Args:
            received_id: Primary key of the ccm_received record.

        Returns:
            ReceivedCertificateDetail, or None if not found.
        """
        with RepositoryManagerFactory.create() as repo:
            record = repo.ccm_received_repository.find_by_id(received_id)

            if record is None:
                return None

            return self._to_received_detail(record)

    def get_received_by_document_id(
        self, document_id: str, provider_bpn: str,
    ) -> Optional[ReceivedCertificateDetail]:
        """
        Return the full detail for a received certificate identified by the
        provider-assigned ``document_id`` and ``provider_bpn``.

        Args:
            document_id: Provider-assigned document reference.
            provider_bpn: BPNL of the provider that sent the certificate.

        Returns:
            ReceivedCertificateDetail, or None if not found.
        """
        with RepositoryManagerFactory.create() as repo:
            record = repo.ccm_received_repository.find_by_document_id(
                document_id, provider_bpn=provider_bpn,
            )

            if record is None:
                return None

            return self._to_received_detail(record)

    def _to_received_detail(
        self, record: "CcmReceived",
    ) -> ReceivedCertificateDetail:
        """Map a CcmReceived ORM instance to a full ReceivedCertificateDetail DTO."""
        item = self._to_received_item(record)
        detail = ReceivedCertificateDetail(**item.model_dump(by_alias=False))
        detail.certificate_version = record.certificate_version
        detail.issuer_name = record.issuer_name
        detail.issuer_bpn = record.issuer_bpn
        detail.validator_name = record.validator_name
        detail.registration_number = record.registration_number
        detail.area_of_application = record.area_of_application
        detail.uploader_bpn = record.uploader_bpn
        if record.doc:
            detail.document_base64 = base64.b64encode(record.doc).decode("ascii")
        return detail

    # ------------------------------------------------------------------
    # Visibility: outbound requests
    # ------------------------------------------------------------------

    def list_requests(
        self,
        provider_bpn: Optional[str] = None,
        certified_bpn: Optional[str] = None,
        certificate_type: Optional[str] = None,
        status: Optional[str] = None,
        offset: int = 0,
        limit: int = 100,
    ) -> List[OutboundRequestItem]:
        """
        Return a deduplicated list of certificate requests — only the most
        recent entry per ``(provider_bpn, certified_bpn, certificate_type)``
        combination is returned.

        This gives a "current state" overview.  For the full history of a
        specific combination, use ``list_request_history()``.

        Args:
            provider_bpn: Optional filter by provider BPNL.
            certified_bpn: Optional filter by certified entity BPNL.
            certificate_type: Optional filter by certificate type.
            status: Optional filter by OutboundRequestStatus string value.
            offset: Pagination offset.
            limit: Maximum number of records to return.

        Returns:
            List of OutboundRequestItem DTOs (latest per combination).
        """
        from models.metadata_database.addons.ccm_kit.v1.models import OutboundRequestStatus as _S

        status_enum: Optional[OutboundRequestStatus] = None
        if status:
            try:
                status_enum = _S(status)
            except ValueError:
                pass  # Unknown status → ignore filter; return all

        with RepositoryManagerFactory.create() as repo:
            records = repo.ccm_outbound_request_repository.find_latest_per_combo(
                provider_bpn=provider_bpn,
                certified_bpn=certified_bpn,
                certificate_type=certificate_type,
                status=status_enum,
                offset=offset,
                limit=limit,
            )
            return [self._to_request_item(r) for r in records]

    def list_request_history(
        self,
        provider_bpn: str,
        certified_bpn: str,
        certificate_type: str,
        offset: int = 0,
        limit: int = 100,
    ) -> List[OutboundRequestItem]:
        """
        Return the full history of outbound requests for a specific
        ``(provider_bpn, certified_bpn, certificate_type)`` combination,
        ordered newest first.

        Args:
            provider_bpn: BPNL of the remote provider.
            certified_bpn: BPNL of the certified entity.
            certificate_type: Certificate type identifier.
            offset: Pagination offset.
            limit: Maximum number of records to return.

        Returns:
            List of OutboundRequestItem DTOs (all entries for the combo).
        """
        with RepositoryManagerFactory.create() as repo:
            records = repo.ccm_outbound_request_repository.find_all_filtered(
                provider_bpn=provider_bpn,
                certified_bpn=certified_bpn,
                certificate_type=certificate_type,
                offset=offset,
                limit=limit,
            )
            return [self._to_request_item(r) for r in records]

    def get_request(self, request_id: int) -> Optional[OutboundRequestItem]:
        """
        Return the detail for a single outbound certificate request.

        Args:
            request_id: Primary key of the ccm_outbound_request record.

        Returns:
            OutboundRequestItem, or None if not found.
        """
        with RepositoryManagerFactory.create() as repo:
            record = repo.ccm_outbound_request_repository.find_by_id(request_id)

            if record is None:
                return None

            return self._to_request_item(record)

    # ------------------------------------------------------------------
    # Private mapping helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _to_received_item(record: "CcmReceived") -> ReceivedCertificateItem:
        """Map a CcmReceived ORM instance to a ReceivedCertificateItem DTO."""
        return ReceivedCertificateItem(
            id=record.id,
            document_id=record.document_id,
            provider_bpn=record.provider_bpn,
            certified_bpn=record.certified_bpn,
            certificate_type=record.certificate_type,
            trust_level=record.trust_level,
            valid_from=record.valid_from.isoformat() if record.valid_from else None,
            valid_until=record.valid_until.isoformat() if record.valid_until else None,
            local_status=record.local_status.value,
            status_updated_at=(
                record.status_updated_at.isoformat()
                if record.status_updated_at else None
            ),
            received_at=record.received_at.isoformat(),
        )

    @staticmethod
    def _to_request_item(record) -> OutboundRequestItem:
        """Map a CcmOutboundRequest ORM instance to an OutboundRequestItem DTO."""
        location_bpns: Optional[List[str]] = None
        if record.location_bpns:
            try:
                location_bpns = json.loads(record.location_bpns)
            except (json.JSONDecodeError, TypeError):
                pass

        return OutboundRequestItem(
            id=record.id,
            sender_bpn=record.sender_bpn,
            provider_bpn=record.provider_bpn,
            certified_bpn=record.certified_bpn,
            certificate_type=record.certificate_type,
            location_bpns=location_bpns,
            status=record.status.value,
            notification_id=record.notification_id,
            document_id=record.document_id,
            requested_at=record.requested_at.isoformat(),
            updated_at=record.updated_at.isoformat(),
        )


# Module-level singleton
ccm_consumer_service = CcmConsumerService()
