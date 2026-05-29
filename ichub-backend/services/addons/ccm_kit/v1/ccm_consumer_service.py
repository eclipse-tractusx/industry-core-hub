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

Provides three operations:
1. Catalog search — check whether a provider exposes a CCM notification asset.
2. Send request — ask a provider to share a specific certificate (PULL flow).
3. Send status — notify the provider of the processing result after receiving
   a certificate via PUSH.
"""

from typing import Dict, Optional

from connector import consumer_connector_service
from managers.config.log_manager import LoggingManager
from models.services.addons.ccm_kit.v1.notifications import (
    CcmCatalogSearchRequest,
    CcmCatalogSearchResult,
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
        logger.info(f"[CCM Consumer] Searching catalog for provider [{provider_bpn}]")

        try:
            dsp_url = self._resolve_dsp_url(provider_bpn)
        except Exception as e:
            logger.warning(f"[CCM Consumer] Discovery failed for [{provider_bpn}]: {e}")
            return CcmCatalogSearchResult(
                found=False,
                provider_bpn=provider_bpn,
                error=f"Discovery failed: {e}",
            )

        try:
            catalog = consumer_connector_service.get_catalog_by_dct_type(
                counter_party_id=provider_bpn,
                counter_party_address=dsp_url,
                dct_type=CCM_DCT_TYPE,
            )
        except Exception as e:
            logger.warning(f"[CCM Consumer] Catalog query failed for [{provider_bpn}]: {e}")
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
            f"[CCM Consumer] Catalog search result for [{provider_bpn}]: "
            f"found={found}, asset_id={asset_id}"
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
            f"[CCM Consumer] Sending certificate request to [{provider_bpn}] "
            f"for type={payload.certificate_type}, certifiedBpn={payload.certified_bpn}"
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
            f"[CCM Consumer] Sending certificate status to [{provider_bpn}] "
            f"documentId={payload.document_id}, status={payload.certificate_status.value}"
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

        notification = self._build_notification(
            context=CCM_CONTEXT_STATUS,
            sender_bpn=sender_bpn,
            receiver_bpn=provider_bpn,
            content_fields=content_fields,
        )

        return self._send_notification(
            target_bpn=provider_bpn,
            notification=notification,
            endpoint_path=CCM_ENDPOINT_STATUS,
        )

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


# Module-level singleton
ccm_consumer_service = CcmConsumerService()
