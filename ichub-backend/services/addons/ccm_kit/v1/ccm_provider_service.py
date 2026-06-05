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
Provider-side service for CX-0135 Company Certificate Management (CCM).

Provides three groups of operations:
1. **Push** — send a full certificate (including Base64 document) to a consumer
   via the ``POST /companycertificate/push`` notification endpoint.
2. **Available** — send a lightweight notification informing a consumer that a
   certificate is available for retrieval via the PULL mechanism.
3. **Publish / Unpublish** — register or remove an individual certificate as an
   EDC HttpData asset so that consumers can discover and pull it from the
   catalog (PULL mechanism).  The asset DataAddress points to the
   ``GET /provider/certificates/{id}/payload`` endpoint which serves the
   certificate JSON live.

Both push/available operations resolve the consumer's DSP URL, negotiate an EDR
with the consumer's CCM notification asset, and transmit the payload through the
data-plane proxy — exactly mirroring the consumer-side send pattern.
"""

import base64
import uuid
from typing import Dict, List, Optional

from managers.config.config_manager import ConfigManager
from managers.config.log_manager import LoggingManager
from managers.metadata_database.manager import RepositoryManagerFactory
from utils.log_utils import sanitize_log_value as _s
from models.services.addons.ccm_kit.v1.notifications import (
    CcmAvailableRequest,
    CcmInboundRequestItem,
    CcmPushRequest,
    CcmSendResult,
    ShareItem,
)
from models.metadata_database.addons.ccm_kit.v1.models import (
    CcmInboundRequest,
    InboundRequestStatus,
    ShareStatus,
)
from connector import connector_provider_manager
from services.addons.ccm_kit.v1.ccm_base_service import CcmBaseService
from tools.constants import (
    CCM_CONTEXT_AVAILABLE,
    CCM_CONTEXT_PUSH,
    CCM_ENDPOINT_AVAILABLE,
    CCM_ENDPOINT_PUSH,
)

logger = LoggingManager.get_logger(__name__)


class CcmProviderService(CcmBaseService):
    """
    Provider-side operations for CX-0135 Company Certificate Management.

    Uses the EDC connector infrastructure (discovery, catalog, DSP negotiation)
    to send PUSH and Available notifications to a remote consumer's CCM
    notification API.
    """

    _log_prefix = "[CCM Provider]"

    # ------------------------------------------------------------------
    # Push certificate (provider → consumer)
    # ------------------------------------------------------------------

    def push_certificate(
        self,
        request: CcmPushRequest,
        sender_bpn: str,
    ) -> CcmSendResult:
        """
        Push a full certificate to a consumer via CX-0135 PUSH notification.

        Loads the certificate from the local database, serialises it into the
        CX-0135 push payload (including the Base64-encoded document), and
        transmits it to the consumer's ``/companycertificate/push`` endpoint
        through the EDC data-plane.

        Args:
            request: Contains ``certificate_id`` and ``consumer_bpn``.
            sender_bpn: BPNL of this node (the provider).

        Returns:
            CcmSendResult indicating success or failure.
        """
        consumer_bpn = request.consumer_bpn
        logger.info(
            f"[CCM Provider] Pushing certificate {request.certificate_id} "
            f"to consumer [{_s(consumer_bpn)}]"
        )

        # --- 1. Load certificate from DB ---
        with RepositoryManagerFactory.create() as repo:
            ccm = repo.ccm_repository.find_by_id_with_relations(
                request.certificate_id
            )
            if ccm is None:
                msg = (
                    f"Certificate with ID {request.certificate_id} not found."
                )
                logger.warning("[CCM Provider] %s", msg)
                return CcmSendResult(success=False, error=msg)

            # --- 2. Build push payload ---
            content_fields = self._build_push_content(ccm)
            certified_bpn = ccm.bpnl
            certificate_type_val = ccm.certificate_type
            cert_canonical_sites = self._canonicalize_location_bpns(
                [s.site_bpn for s in ccm.sites] if ccm.sites else None
            )

        # --- 3. Resolve relatedMessageId from inbound request (CX-0135) ---
        related_msg_id: Optional[uuid.UUID] = None
        if request.related_message_id:
            try:
                related_msg_id = uuid.UUID(request.related_message_id)
            except ValueError:
                logger.warning(
                    "[CCM Provider] Invalid relatedMessageId in push request: %s",
                    _s(request.related_message_id),
                )
        if related_msg_id is None:
            try:
                with RepositoryManagerFactory.create() as repo:
                    inbound_requests = repo.ccm_inbound_request_repository.find_all_filtered(
                        consumer_bpn=consumer_bpn,
                        certified_bpn=certified_bpn,
                        certificate_type=certificate_type_val,
                        limit=1,
                    )
                    if inbound_requests and inbound_requests[0].notification_id:
                        related_msg_id = uuid.UUID(inbound_requests[0].notification_id)
            except Exception as e:
                logger.debug(
                    f"[CCM Provider] Could not resolve relatedMessageId for push: {_s(e)}"
                )

        # --- 4. Build and send notification ---
        notification = self._build_notification(
            context=CCM_CONTEXT_PUSH,
            sender_bpn=sender_bpn,
            receiver_bpn=consumer_bpn,
            content_fields=content_fields,
            related_message_id=related_msg_id,
        )

        result = self._send_notification(
            target_bpn=consumer_bpn,
            notification=notification,
            endpoint_path=CCM_ENDPOINT_PUSH,
            policies=request.governance,
        )

        # --- 5. Update share record and inbound request tracking on success ---
        if result.success:
            try:
                self._update_share_status(
                    certificate_id=request.certificate_id,
                    consumer_bpn=consumer_bpn,
                )
            except Exception as e:
                logger.error(
                    f"[CCM Provider] Push succeeded but failed to update "
                    f"share status for cert {request.certificate_id}: {_s(e)}"
                )
            with RepositoryManagerFactory.create() as repo:
                updated = repo.ccm_inbound_request_repository.advance_status_for_consumer(
                    consumer_bpn=consumer_bpn,
                    certified_bpn=certified_bpn,
                    certificate_type=certificate_type_val,
                    certificate_id=request.certificate_id,
                    new_status=InboundRequestStatus.Pushed,
                    skip_statuses=[
                        InboundRequestStatus.Available,
                        InboundRequestStatus.Pushed,
                    ],
                    # Restrict to the specific request when relatedMessageId was
                    # explicitly provided by the caller; otherwise bulk-advance.
                    notification_id=(
                        request.related_message_id if request.related_message_id else None
                    ),
                    location_bpns=cert_canonical_sites,
                )
                if updated:
                    repo.commit()
                    logger.info(
                        f"[CCM Provider] Marked {len(updated)} inbound request(s) as Pushed "
                        f"for consumer {_s(consumer_bpn)} / cert {request.certificate_id}."
                    )
                else:
                    # Direct push — no prior REQUEST exists for this consumer.
                    # Create a synthetic CcmInboundRequest anchored to the push
                    # notification's messageId so that when the consumer sends
                    # STATUS with relatedMessageId, update_consumer_status can
                    # resolve the exact row via notification_id lookup.
                    repo.ccm_inbound_request_repository.create_new(
                        consumer_bpn=consumer_bpn,
                        certified_bpn=certified_bpn,
                        certificate_type=certificate_type_val,
                        status=InboundRequestStatus.Pushed,
                        certificate_id=request.certificate_id,
                        notification_id=result.message_id,
                    )
                    repo.commit()
                    logger.info(
                        f"[CCM Provider] Created direct-push tracking record "
                        f"(notification_id={_s(result.message_id)}) "
                        f"for consumer {_s(consumer_bpn)} / cert {request.certificate_id}."
                    )

        return result

    # ------------------------------------------------------------------
    # Send certificate-available notification (provider → consumer)
    # ------------------------------------------------------------------

    def send_certificate_available(
        self,
        request: CcmAvailableRequest,
        sender_bpn: str,
    ) -> CcmSendResult:
        """
        Notify a consumer that a certificate is available for PULL retrieval.

        Sends a lightweight CX-0135 Available notification containing the
        ``documentId``, ``certificateType`` and optional ``locationBpns``.

        Args:
            request: Contains ``certificate_id`` and ``consumer_bpn``.
            sender_bpn: BPNL of this node (the provider).

        Returns:
            CcmSendResult indicating success or failure.
        """
        consumer_bpn = request.consumer_bpn
        logger.info(
            f"[CCM Provider] Sending certificate-available for cert {request.certificate_id} "
            f"to [{_s(consumer_bpn)}]"
        )

        # --- 1. Load certificate metadata ---
        with RepositoryManagerFactory.create() as repo:
            ccm = repo.ccm_repository.find_by_id_with_relations(
                request.certificate_id
            )
            if ccm is None:
                msg = (
                    f"Certificate with ID {request.certificate_id} not found."
                )
                logger.warning("[CCM Provider] %s", msg)
                return CcmSendResult(success=False, error=msg)

            if not ccm.edc_asset_id:
                msg = (
                    f"Certificate {request.certificate_id} is not published as an "
                    f"EDC asset. Use publish_certificate() first."
                )
                logger.warning("[CCM Provider] %s", msg)
                return CcmSendResult(success=False, error=msg)

            # --- 2. Build available content ---
            document_id = ccm.edc_asset_id
            location_bpns = [site.site_bpn for site in ccm.sites] if ccm.sites else None
            cert_canonical_sites = self._canonicalize_location_bpns(location_bpns)
            content_fields: Dict = {
                "documentId": document_id,
                "certificateType": ccm.certificate_type,
            }
            if location_bpns:
                content_fields["locationBpns"] = location_bpns
            cert_id = ccm.id
            certified_bpn = ccm.bpnl
            certificate_type_val = ccm.certificate_type

        # --- 3. Resolve relatedMessageId from inbound request (CX-0135) ---
        related_msg_id: Optional[uuid.UUID] = None
        if request.related_message_id:
            try:
                related_msg_id = uuid.UUID(request.related_message_id)
            except ValueError:
                logger.warning(
                    "[CCM Provider] Invalid relatedMessageId in available request: %s",
                    _s(request.related_message_id),
                )
        if related_msg_id is None:
            try:
                with RepositoryManagerFactory.create() as repo:
                    inbound_requests = repo.ccm_inbound_request_repository.find_all_filtered(
                        consumer_bpn=consumer_bpn,
                        certified_bpn=certified_bpn,
                        certificate_type=certificate_type_val,
                        limit=1,
                    )
                    if inbound_requests and inbound_requests[0].notification_id:
                        related_msg_id = uuid.UUID(inbound_requests[0].notification_id)
            except Exception as e:
                logger.debug(
                    f"[CCM Provider] Could not resolve relatedMessageId for available: {_s(e)}"
                )

        # --- 4. Build and send notification ---
        notification = self._build_notification(
            context=CCM_CONTEXT_AVAILABLE,
            sender_bpn=sender_bpn,
            receiver_bpn=consumer_bpn,
            content_fields=content_fields,
            related_message_id=related_msg_id,
        )

        result = self._send_notification(
            target_bpn=consumer_bpn,
            notification=notification,
            endpoint_path=CCM_ENDPOINT_AVAILABLE,
            policies=request.governance,
        )

        # --- 5. Track notification + ensure share record exists ---
        if result.success:
            with RepositoryManagerFactory.create() as repo:
                updated = repo.ccm_inbound_request_repository.advance_status_for_consumer(
                    consumer_bpn=consumer_bpn,
                    certified_bpn=certified_bpn,
                    certificate_type=certificate_type_val,
                    certificate_id=cert_id,
                    new_status=InboundRequestStatus.Available,
                    # Restrict to the specific request when relatedMessageId was
                    # explicitly provided by the caller; otherwise bulk-advance.
                    notification_id=(
                        request.related_message_id if request.related_message_id else None
                    ),
                    location_bpns=cert_canonical_sites,
                )
                if updated:
                    logger.info(
                        f"[CCM Provider] Marked {len(updated)} inbound request(s) as Available "
                        f"for consumer {_s(consumer_bpn)} / cert {cert_id}."
                    )

                # Ensure a CertificateShare record exists so the consumer can
                # send status feedback later (PULL flow skips process_certificate_request,
                # which is where the share is normally created).
                existing_share = (
                    repo.certificate_share_repository
                    .find_by_certificate_and_consumer(cert_id, consumer_bpn)
                )
                if existing_share is None:
                    repo.certificate_share_repository.create_new(
                        certificate_id=cert_id,
                        consumer_bpnl=consumer_bpn,
                        status=ShareStatus.Pending,
                    )
                    logger.info(
                        f"[CCM Provider] Created CertificateShare (Pending) for "
                        f"cert {cert_id} → consumer {_s(consumer_bpn)} "
                        f"(available notification path)."
                    )

                repo.commit()

        return result

    # ------------------------------------------------------------------
    # Publish / unpublish certificate as EDC HttpData asset (PULL)
    # ------------------------------------------------------------------

    def publish_certificate(self, certificate_id: int) -> Dict:
        """
        Publish a certificate as an individual EDC HttpData asset.

        Registers an EDC asset whose DataAddress points to the
        ``GET /provider/certificates/{id}/payload`` endpoint.  The EDC data
        plane fetches the ``BusinessPartnerCertificate`` JSON from that URL
        live whenever a consumer pulls the asset.  The consumer can discover
        this asset in the catalog and pull it via the CX-0135 PULL mechanism.

        Args:
            certificate_id: Primary key of the certificate in the local DB.

        Returns:
            Dict with ``document_id`` (= EDC asset ID), ``asset_id``, and
            ``certificate_id``.

        Raises:
            ValueError: If the certificate is not found.
        """

        with RepositoryManagerFactory.create() as repo:
            ccm = repo.ccm_repository.find_by_id_with_relations(certificate_id)
            if ccm is None:
                raise ValueError(f"Certificate with ID {certificate_id} not found.")

            # Reuse existing asset ID or generate a new one.
            # CX-0135 requires documentId to be a plain UUID.
            asset_id = ccm.edc_asset_id or str(uuid.uuid4())

            # Build the HttpData base URL pointing to our payload endpoint
            base_url = connector_provider_manager.build_ccm_certificate_payload_url(
                certificate_id
            )

            # Load policy from configuration
            policy_config = ConfigManager.get_config(
                "provider.ccm.certificate_asset.policy"
            )
            if policy_config is None:
                raise ValueError(
                    "Missing configuration 'provider.ccm.certificate_asset.policy'. "
                    "Cannot publish certificate without a policy definition."
                )

            # Register asset + policies + contract via the connector manager
            asset_id, _, _, _ = (
                connector_provider_manager.register_ccm_certificate_offer(
                    asset_id=asset_id,
                    base_url=base_url,
                    ccm_policy_config=policy_config,
                )
            )

            # Persist the EDC asset ID on the certificate record
            repo.ccm_repository.update_fields(ccm.id, {"edc_asset_id": asset_id})
            repo.commit()

            logger.info(
                f"[CCM PULL] Published certificate {certificate_id} "
                f"as EDC asset {_s(asset_id)}."
            )

        return {
            "document_id": asset_id,
            "asset_id": asset_id,
            "certificate_id": certificate_id,
        }

    def unpublish_certificate(self, certificate_id: int) -> None:
        """
        Remove a published certificate's EDC asset, contract and policies.

        Args:
            certificate_id: Primary key of the certificate in the local DB.

        Raises:
            ValueError: If the certificate is not found or not published.
        """
        with RepositoryManagerFactory.create() as repo:
            ccm = repo.ccm_repository.find_by_id_with_relations(certificate_id)
            if ccm is None:
                raise ValueError(f"Certificate with ID {certificate_id} not found.")
            if not ccm.edc_asset_id:
                raise ValueError(
                    f"Certificate {certificate_id} is not published as an EDC asset."
                )

            connector_provider_manager.delete_ccm_certificate_offer(
                ccm.edc_asset_id
            )

            repo.ccm_repository.update_fields(ccm.id, {"edc_asset_id": None})
            repo.commit()

            logger.info(
                f"[CCM PULL] Unpublished certificate {certificate_id}."
            )

    def republish_certificate(self, certificate_id: int) -> Dict:
        """
        Refresh the EDC contract/policy configuration of a published certificate.

        .. note::
            This method is **not** needed for certificate data updates.  The
            asset DataAddress is a static URL; the EDC data plane always fetches
            the current data from the backend at pull time — updating the DB
            record is sufficient.  Call this only when the ODRL *policy* needs
            to change (e.g. different BPN allowlist or usage constraints).

        Args:
            certificate_id: Primary key of the certificate in the local DB.

        Returns:
            Dict with the (same) ``document_id``, ``asset_id``, and
            ``certificate_id``.

        Raises:
            ValueError: If the certificate is not found or not published.
        """
        with RepositoryManagerFactory.create() as repo:
            ccm = repo.ccm_repository.find_by_id_with_relations(certificate_id)
            if ccm is None:
                raise ValueError(f"Certificate with ID {certificate_id} not found.")
            if not ccm.edc_asset_id:
                raise ValueError(
                    f"Certificate {certificate_id} is not published — "
                    f"use publish_certificate() first."
                )

            base_url = connector_provider_manager.build_ccm_certificate_payload_url(
                certificate_id
            )
            policy_config = ConfigManager.get_config(
                "provider.ccm.certificate_asset.policy"
            )

            asset_id, _, _, _ = (
                connector_provider_manager.update_ccm_certificate_asset(
                    asset_id=ccm.edc_asset_id,
                    base_url=base_url,
                    ccm_policy_config=policy_config,
                )
            )

            logger.info(
                f"[CCM PULL] Republished certificate {certificate_id} "
                f"(asset {_s(asset_id)})."
            )

        return {
            "document_id": asset_id,
            "asset_id": asset_id,
            "certificate_id": certificate_id,
        }

    def get_certificate_payload(self, certificate_id: int) -> Dict:
        """
        Return the full ``BusinessPartnerCertificate`` JSON payload for the
        given certificate.

        This method is called by the ``GET /provider/certificates/{id}/payload``
        endpoint, which serves as the ``baseUrl`` in the EDC asset DataAddress.
        The EDC data plane invokes this URL whenever a consumer pulls the asset.

        The returned dict includes ``document.contentBase64``, which holds the
        certificate PDF encoded as a base64 string.

        Args:
            certificate_id: Primary key of the certificate in the local DB.

        Returns:
            Dict matching the CX-0135 BusinessPartnerCertificate structure,
            with the PDF document encoded as base64 in ``document.contentBase64``.

        Raises:
            ValueError: If the certificate is not found.
        """
        with RepositoryManagerFactory.create() as repo:
            ccm = repo.ccm_repository.find_by_id_with_relations(certificate_id)
            if ccm is None:
                raise ValueError(f"Certificate with ID {certificate_id} not found.")
            return self._build_push_content(ccm)

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _build_push_content(ccm) -> Dict:
        """
        Serialise a ``Ccm`` database entity into the CX-0135 push content
        dictionary.

        The structure mirrors the CX-0135 §2.1.1 push payload exactly:
        ``businessPartnerNumber``, ``type``, ``enclosedSites``, ``document``,
        ``issuer``, ``validator``, etc.
        """
        # Base64-encode the binary document
        doc_b64 = ""
        if ccm.doc:
            doc_b64 = base64.b64encode(ccm.doc).decode("ascii")

        # --- type block (required + optional certificateVersion) ---
        type_block: Dict = {"certificateType": ccm.certificate_type}
        if ccm.certificate_version:
            type_block["certificateVersion"] = ccm.certificate_version

        # --- issuer block (required + optional issuerBpn) ---
        issuer_block: Dict = {"issuerName": ccm.issuer}
        if ccm.issuer_bpn:
            issuer_block["issuerBpn"] = ccm.issuer_bpn

        content: Dict = {
            "businessPartnerNumber": ccm.bpnl,
            "type": type_block,
            "document": {
                "documentID": ccm.edc_asset_id or str(ccm.id),
                "creationDate": ccm.created_at.isoformat(),
                "contentType": "application/pdf",
                "contentBase64": doc_b64,
            },
            "issuer": issuer_block,
            "trustLevel": ccm.trust_level.value if ccm.trust_level else "none",
        }

        # Optional top-level fields
        if ccm.valid_from:
            content["validFrom"] = ccm.valid_from.isoformat()
        if ccm.valid_until:
            content["validUntil"] = ccm.valid_until.isoformat()
        if ccm.registration_number:
            content["registrationNumber"] = ccm.registration_number
        if ccm.area_of_application:
            content["areaOfApplication"] = ccm.area_of_application
        if ccm.uploader_bpnl:
            content["uploader"] = ccm.uploader_bpnl

        # --- validator block (optional name + optional BPN) ---
        if ccm.validator_name or ccm.validator_bpn:
            validator_block: Dict = {}
            if ccm.validator_name:
                validator_block["validatorName"] = ccm.validator_name
            if ccm.validator_bpn:
                validator_block["validatorBpn"] = ccm.validator_bpn
            content["validator"] = validator_block

        # --- enclosedSites (with optional per-site areaOfApplication) ---
        if ccm.sites:
            content["enclosedSites"] = [
                {
                    "enclosedSiteBpn": site.site_bpn,
                    **(
                        {"areaOfApplication": site.area_of_application}
                        if site.area_of_application
                        else {}
                    ),
                }
                for site in ccm.sites
            ]

        return content

    @staticmethod
    def _update_share_status(
        certificate_id: int, consumer_bpn: str
    ) -> None:
        """
        After a successful PUSH, ensure the CertificateShare record
        for this consumer is marked ``Active`` and the ``last_shared_date``
        is refreshed.
        """
        with RepositoryManagerFactory.create() as repo:
            share = (
                repo.certificate_share_repository
                .find_by_certificate_and_consumer(certificate_id, consumer_bpn)
            )
            if share is not None:
                repo.certificate_share_repository.update_status(
                    share_id=share.id,
                    new_status=ShareStatus.Active,
                )
            else:
                repo.certificate_share_repository.create_new(
                    certificate_id=certificate_id,
                    consumer_bpnl=consumer_bpn,
                    status=ShareStatus.Active,
                )
            repo.commit()

    # ------------------------------------------------------------------
    # Visibility: provider shares (cross-certificate view)
    # ------------------------------------------------------------------

    def list_shares(
        self,
        consumer_bpnl: Optional[str] = None,
        status: Optional[str] = None,
        offset: int = 0,
        limit: int = 100,
    ) -> List[ShareItem]:
        """
        Return a paginated cross-certificate view of all sharing events.

        Joins ``certificate_share`` with ``ccm`` so each row includes the
        certificate type, enabling operators to see the full sharing history
        in a single call — across all certificates, optionally filtered by
        consumer BPNL or share status.

        Args:
            consumer_bpnl: Optional filter by consumer BPNL.
            status: Optional filter by ShareStatus string value (Active/Pending/Revoked).
            offset: Pagination offset.
            limit: Maximum number of records to return.

        Returns:
            List of ShareItem DTOs ordered by most recent first.
        """
        from models.metadata_database.addons.ccm_kit.v1.models import ShareStatus as _SS

        with RepositoryManagerFactory.create() as repo:
            # Reuse the paginated query from the repository and apply optional
            # consumer BPNL + status filters.
            if consumer_bpnl:
                shares = repo.certificate_share_repository.find_by_consumer_bpnl(
                    consumer_bpnl
                )
                # apply status filter in-memory if needed (list is already small)
                if status:
                    shares = [s for s in shares if s.status.value == status]
                shares = shares[offset : offset + limit]
            else:
                # Full paginated scan; status filter applied after retrieval.
                # The repository returns all pages; we slice post-filter to respect
                # the requested offset/limit even when filtering reduces the result set.
                all_shares = repo.certificate_share_repository.find_all_paginated(
                    offset=0, limit=offset + limit + (limit if status else 0)
                )
                if status:
                    all_shares = [s for s in all_shares if s.status.value == status]
                shares = all_shares[offset : offset + limit]

            # Eagerly load the parent certificate for each share so we can
            # include certificate_type without a separate query per row.
            result: List[ShareItem] = []
            for share in shares:
                cert = repo.ccm_repository.find_by_id_with_relations(share.certificate_id)
                result.append(
                    ShareItem(
                        share_id=share.id,
                        certificate_id=share.certificate_id,
                        certificate_type=cert.certificate_type if cert else "",
                        provider_bpnl=cert.bpnl if cert else "",
                        consumer_bpnl=share.consumer_bpnl,
                        status=share.status.value,
                        rejection_reason=share.rejection_reason,
                        last_shared_date=share.last_shared_date.isoformat(),
                        created_at=share.created_at.isoformat(),
                    )
                )

        return result

    def list_published_certificates(self) -> List[Dict]:
        """
        Return all certificates that are currently published as EDC assets
        (i.e. have a non-NULL ``edc_asset_id`` in the database).

        Returns:
            List of dicts with ``certificate_id``, ``asset_id``, ``bpnl``,
            and ``certificate_type``.
        """
        with RepositoryManagerFactory.create() as repo:
            certs = repo.ccm_repository.find_published()
            return [
                {
                    "certificate_id": c.id,
                    "asset_id": c.edc_asset_id,
                    "bpnl": c.bpnl,
                    "certificate_type": c.certificate_type,
                }
                for c in certs
            ]

    def force_unpublish_by_asset_id(self, asset_id: str) -> None:
        """
        Remove an EDC certificate asset directly by its EDC asset ID, even
        when the database record has lost the ``edc_asset_id`` reference
        (DB/EDC desync scenario).

        Steps:
        1. Delete the contract definition and asset from the EDC connector.
        2. If the database has a ``Ccm`` record whose ``edc_asset_id`` matches,
           clear that field so the DB reflects the current state.

        Args:
            asset_id: The EDC asset ID to remove from the connector.
        """
        connector_provider_manager.delete_ccm_certificate_offer(asset_id)
        logger.info(f"[CCM PULL] Force-deleted EDC asset {_s(asset_id)}.")

        with RepositoryManagerFactory.create() as repo:
            ccm = repo.ccm_repository.find_by_edc_asset_id(asset_id)
            if ccm is not None:
                repo.ccm_repository.update_fields(ccm.id, {"edc_asset_id": None})
                repo.commit()
                logger.info(
                    f"[CCM PULL] Cleared edc_asset_id on certificate {ccm.id}."
                )

    def list_inbound_requests(
        self,
        consumer_bpn: Optional[str] = None,
        certified_bpn: Optional[str] = None,
        certificate_type: Optional[str] = None,
        status: Optional[str] = None,
        offset: int = 0,
        limit: int = 100,
    ) -> List[CcmInboundRequestItem]:
        """
        Return a deduplicated list of inbound certificate requests — only
        the most recent entry per ``(consumer_bpn, certified_bpn,
        certificate_type)`` combination is returned.

        This gives a "current state" overview of consumer demand.  For the
        full history of a specific combination, use
        ``list_inbound_request_history()``.

        Args:
            consumer_bpn: Filter by requesting consumer BPNL.
            certified_bpn: Filter by certified entity BPNL.
            certificate_type: Filter by certificate type.
            status: Filter by InboundRequestStatus string value.
            offset: Pagination offset.
            limit: Maximum records to return.

        Returns:
            List of CcmInboundRequestItem response objects (latest per combo).
        """
        status_enum: Optional[InboundRequestStatus] = None
        if status is not None:
            try:
                status_enum = InboundRequestStatus(status)
            except ValueError:
                logger.warning(f"Unknown inbound request status filter: {_s(status)}")

        with RepositoryManagerFactory.create() as repo:
            records = repo.ccm_inbound_request_repository.find_latest_per_combo(
                consumer_bpn=consumer_bpn,
                certified_bpn=certified_bpn,
                certificate_type=certificate_type,
                status=status_enum,
                offset=offset,
                limit=limit,
            )
            return [self._to_inbound_request_item(r) for r in records]

    def list_inbound_request_history(
        self,
        consumer_bpn: str,
        certified_bpn: str,
        certificate_type: str,
        offset: int = 0,
        limit: int = 100,
    ) -> List[CcmInboundRequestItem]:
        """
        Return the full history of inbound requests for a specific
        ``(consumer_bpn, certified_bpn, certificate_type)`` combination,
        ordered newest first.

        Args:
            consumer_bpn: BPNL of the requesting consumer.
            certified_bpn: BPNL of the certified entity.
            certificate_type: Certificate type identifier.
            offset: Pagination offset.
            limit: Maximum number of records to return.

        Returns:
            List of CcmInboundRequestItem DTOs (all entries for the combo).
        """
        with RepositoryManagerFactory.create() as repo:
            records = repo.ccm_inbound_request_repository.find_all_filtered(
                consumer_bpn=consumer_bpn,
                certified_bpn=certified_bpn,
                certificate_type=certificate_type,
                offset=offset,
                limit=limit,
            )
            return [self._to_inbound_request_item(r) for r in records]

    # ------------------------------------------------------------------
    # Private mapping helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _to_inbound_request_item(r: CcmInboundRequest) -> CcmInboundRequestItem:
        """Map a CcmInboundRequest ORM instance to a response DTO."""
        cert = r.certificate
        return CcmInboundRequestItem(
            requestId=r.id,
            consumerBpn=r.consumer_bpn,
            certifiedBpn=r.certified_bpn,
            certificateType=r.certificate_type,
            locationBpns=r.location_bpns,
            certificateId=r.certificate_id,
            status=r.status.value,
            consumerStatus=r.consumer_status,
            notificationId=r.notification_id,
            certificateName=cert.certificate_name if cert else None,
            registrationNumber=cert.registration_number if cert else None,
            receivedAt=r.received_at.isoformat(),
            updatedAt=r.updated_at.isoformat(),
        )


# Singleton instance consumed by the controller.
ccm_provider_service = CcmProviderService()
