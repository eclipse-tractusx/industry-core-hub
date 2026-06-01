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
from typing import Dict

from managers.config.config_manager import ConfigManager
from managers.config.log_manager import LoggingManager
from managers.metadata_database.manager import RepositoryManagerFactory
from utils.log_utils import sanitize_log_value as _s
from models.services.addons.ccm_kit.v1.notifications import (
    CcmAvailableRequest,
    CcmPushRequest,
    CcmSendResult,
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

        # --- 3. Build and send notification ---
        notification = self._build_notification(
            context=CCM_CONTEXT_PUSH,
            sender_bpn=sender_bpn,
            receiver_bpn=consumer_bpn,
            content_fields=content_fields,
        )

        result = self._send_notification(
            target_bpn=consumer_bpn,
            notification=notification,
            endpoint_path=CCM_ENDPOINT_PUSH,
        )

        # --- 4. Update share record on success ---
        if result.success:
            self._update_share_status(
                certificate_id=request.certificate_id,
                consumer_bpn=consumer_bpn,
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

            # --- 2. Build available content ---
            # Use the EDC asset ID as documentId when the certificate is
            # published (PULL mechanism); fall back to the internal DB ID.
            document_id = ccm.edc_asset_id or str(ccm.id)
            location_bpns = [site.site_bpn for site in ccm.sites] if ccm.sites else None
            content_fields: Dict = {
                "documentId": document_id,
                "certificateType": ccm.certificate_type,
            }
            if location_bpns:
                content_fields["locationBpns"] = location_bpns

        # --- 3. Build and send notification ---
        notification = self._build_notification(
            context=CCM_CONTEXT_AVAILABLE,
            sender_bpn=sender_bpn,
            receiver_bpn=consumer_bpn,
            content_fields=content_fields,
        )

        return self._send_notification(
            target_bpn=consumer_bpn,
            notification=notification,
            endpoint_path=CCM_ENDPOINT_AVAILABLE,
        )

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

            # Reuse existing asset ID or generate a new one
            asset_id = ccm.edc_asset_id or f"ichub:asset:ccm-cert:{uuid.uuid4()}"

            # Build the HttpData base URL pointing to our payload endpoint
            base_url = connector_provider_manager.build_ccm_certificate_payload_url(
                certificate_id
            )

            # Load policy from configuration
            policy_config = ConfigManager.get_config(
                "provider.ccm.certificate_asset.policy"
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
            ccm.edc_asset_id = asset_id
            repo.ccm_repository.update(ccm)
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
        from connector import connector_provider_manager

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

            ccm.edc_asset_id = None
            repo.ccm_repository.update(ccm)
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
        from connector import connector_provider_manager

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

        content: Dict = {
            "businessPartnerNumber": ccm.bpnl,
            "type": {
                "certificateType": ccm.certificate_type,
            },
            "document": {
                "documentID": str(ccm.id),
                "creationDate": ccm.created_at.isoformat(),
                "contentType": "application/pdf",
                "contentBase64": doc_b64,
            },
            "issuer": {
                "issuerName": ccm.issuer,
            },
            "trustLevel": ccm.trust_level.value if ccm.trust_level else "none",
        }

        # Optional fields
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
        if ccm.validator:
            content["validator"] = {"validatorName": ccm.validator}

        # Enclosed sites
        if ccm.sites:
            content["enclosedSites"] = [
                {"enclosedSiteBpn": site.site_bpn}
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
        from models.metadata_database.addons.ccm_kit.v1.models import (
            ShareStatus,
        )

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


# Singleton instance consumed by the controller.
ccm_provider_service = CcmProviderService()
