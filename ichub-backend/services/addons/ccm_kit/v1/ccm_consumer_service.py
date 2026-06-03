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
import uuid
from typing import Dict, Optional

import requests as http_requests

from connector import consumer_connector_service
from managers.config.config_manager import ConfigManager
from managers.config.log_manager import LoggingManager
from managers.metadata_database.manager import RepositoryManagerFactory
from models.metadata_database.addons.ccm_kit.v1.models import CcmReceived
from utils.log_utils import sanitize_log_value as _s
from models.services.addons.ccm_kit.v1.notifications import (
    CcmCatalogSearchRequest,
    CcmCatalogSearchResult,
    CcmPullRequest,
    CcmPullResult,
    CcmSendRequestPayload,
    CcmSendResult,
    CcmSendStatusPayload,
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

        return self._send_notification(
            target_bpn=provider_bpn,
            notification=notification,
            endpoint_path=CCM_ENDPOINT_REQUEST,
            policies=payload.governance,
        )

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
        for a previously received certificate.
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

        return self._send_notification(
            target_bpn=provider_bpn,
            notification=notification,
            endpoint_path=CCM_ENDPOINT_STATUS,
            policies=payload.governance,
        )

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

            received = CcmReceived(
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

            with RepositoryManagerFactory.create() as repo:
                repo.session.add(received)
                repo.commit()

            return True
        except Exception as e:
            logger.error(f"[CCM Consumer] Failed to store received certificate: {_s(e)}")
            return False


# Module-level singleton
ccm_consumer_service = CcmConsumerService()
