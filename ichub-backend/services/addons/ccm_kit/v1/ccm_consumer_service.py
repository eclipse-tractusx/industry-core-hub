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

import time
import math
from typing import Dict, Optional
import requests as http_requests

from connector import consumer_connector_service
from managers.config.config_manager import ConfigManager
from managers.config.log_manager import LoggingManager
from managers.metadata_database.manager import RepositoryManagerFactory
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
    CCM_CERTIFICATE_DCT_TYPE,
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
            catalog = consumer_connector_service.get_catalog_by_dct_type(
                counter_party_id=provider_bpn,
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
        2. Query the catalog for the certificate asset by its ``documentId``
           (= EDC asset ID).
        3. Negotiate a contract and obtain an EDR.
        4. Retrieve the certificate data via the data plane.
        5. Store the certificate in the local ``ccm_received`` table.

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

        # --- 2. Query catalog for the specific certificate asset ---
        try:
            catalog = consumer_connector_service.get_catalog_by_dct_type(
                counter_party_id=provider_bpn,
                counter_party_address=dsp_url,
                dct_type=CCM_CERTIFICATE_DCT_TYPE,
            )
        except Exception as e:
            logger.error(
                f"[CCM Consumer] Catalog query failed: {_s(e)}"
            )
            return CcmPullResult(certificate_data={}, stored=False)

        # --- 3. Find the matching dataset by asset ID ---
        dataset, policy = self._find_dataset_by_id(catalog, document_id)
        if dataset is None or policy is None:
            logger.warning(
                f"[CCM Consumer] Asset {_s(document_id)} not found in catalog."
            )
            return CcmPullResult(certificate_data={}, stored=False)

        # --- 4. Negotiate EDR and retrieve data ---
        try:
            negotiation_id = consumer_connector_service.start_edr_negotiation(
                counter_party_id=provider_bpn,
                counter_party_address=dsp_url,
                target=document_id,
                policy=policy,
            )
            if negotiation_id is None:
                raise RuntimeError("EDR negotiation returned None.")

            # Wait for EDR to be available (configurable timeout with backoff).
            edr_max_retries = int(
                ConfigManager.get_config("consumer.ccm.edr_max_retries", default=30)
            )
            edr_entry = None
            for attempt in range(edr_max_retries):
                edr_entry = consumer_connector_service.get_edr_entry(
                    negotiation_id=negotiation_id
                )
                if edr_entry:
                    break
                # Exponential backoff: 1s, 2s, 4s … capped at 10s.
                delay = min(math.pow(2, attempt), 10)
                time.sleep(delay)

            if not edr_entry:
                raise RuntimeError(
                    f"EDR not available after timeout for negotiation {negotiation_id}."
                )

            # Retrieve data from data plane
            endpoint = edr_entry.get("endpoint")
            token = edr_entry.get("authorization")

            if not endpoint or not token:
                raise RuntimeError(
                    f"EDR entry missing endpoint or authorization token "
                    f"for negotiation {negotiation_id}."
                )

            headers = consumer_connector_service.get_data_plane_headers(
                access_token=token
            )
            response = http_requests.get(endpoint, headers=headers, timeout=30)
            response.raise_for_status()
            certificate_data = response.json()

        except Exception as e:
            logger.error(
                f"[CCM Consumer] Failed to pull certificate data: {_s(e)}"
            )
            return CcmPullResult(certificate_data={}, stored=False)

        # --- 5. Store in ccm_received ---
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
    def _find_dataset_by_id(catalog: dict, asset_id: str):
        """
        Find a specific dataset in the catalog response by its ``@id``.

        Returns:
            Tuple of ``(dataset_dict, policy_dict)`` or ``(None, None)``.
        """
        if not catalog:
            return None, None

        datasets = catalog.get("dcat:dataset") or catalog.get("dataset")
        if not datasets:
            return None, None

        if isinstance(datasets, dict):
            datasets = [datasets]

        for ds in datasets:
            if ds.get("@id", ds.get("id")) != asset_id:
                continue
            policy = ds.get("odrl:hasPolicy") or ds.get("hasPolicy")
            if isinstance(policy, list):
                policy = policy[0] if policy else None
            return ds, policy

        return None, None

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
        import base64
        from models.metadata_database.addons.ccm_kit.v1.models import CcmReceived

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
                doc_bytes = base64.b64decode(content_b64)

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
