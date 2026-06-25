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
CX-0135 Company Certificate Management — provider-side trigger endpoints.

These endpoints are called by the provider operator (or by internal logic)
to initiate outbound operations towards a consumer:

- ``POST /provider/push``                                  — push a full certificate to a consumer
- ``POST /provider/available``                             — notify a consumer that a certificate is available
- ``POST /provider/publish``                               — publish a certificate as an EDC HttpData asset
- ``DELETE /provider/publish/{id}``                        — unpublish a certificate from the EDC catalog
- ``GET /provider/certificates/{certificate_id}/payload``  — serve the certificate JSON for the EDC data plane
- ``GET /provider/shares``                                 — cross-certificate view of all sharing events
"""

from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import JSONResponse

from controllers.fastapi.routers.authentication.auth_api import (
    get_authentication_dependency,
)
from managers.config.log_manager import LoggingManager
from models.services.addons.ccm_kit.v1.notifications import (
    CcmAvailableRequest,
    CcmInboundRequestItem,
    CcmPublishedItem,
    CcmPublishRequest,
    CcmPublishResult,
    CcmPushRequest,
    CcmSendResult,
    ShareItem,
)
from services.addons.ccm_kit.v1.ccm_provider_service import ccm_provider_service

logger = LoggingManager.get_logger(__name__)

router = APIRouter(
    prefix="/provider",
    tags=["CCM Provider"],
    dependencies=[Depends(get_authentication_dependency())],
)


@router.post(
    "/push",
    response_model=CcmSendResult,
    summary="Push a certificate to a consumer",
)
async def push_certificate(request: CcmPushRequest) -> CcmSendResult:
    """
    Push a full certificate (including Base64 document) to a consumer.

    The provider loads the certificate from its local database and transmits
    the complete CX-0135 push payload to the consumer's
    ``/companycertificate/push`` notification endpoint via the EDC.
    """
    try:
        return ccm_provider_service.push_certificate(
            request, request.sender_bpn
        )
    except Exception as e:
        logger.exception("Unhandled error in push_certificate endpoint")
        return CcmSendResult(success=False, error=str(e))


@router.post(
    "/available",
    response_model=CcmSendResult,
    summary="Notify a consumer that a certificate is available",
)
async def send_certificate_available(
    request: CcmAvailableRequest,
) -> CcmSendResult:
    """
    Send a lightweight CX-0135 Available notification to a consumer.

    Informs the consumer that a certificate has been published (or updated)
    in the provider's EDC catalog and can be retrieved via the PULL mechanism.
    """
    try:
        return ccm_provider_service.send_certificate_available(
            request, request.sender_bpn
        )
    except Exception as e:
        logger.exception(
            "Unhandled error in send_certificate_available endpoint"
        )
        return CcmSendResult(success=False, error=str(e))


@router.post(
    "/publish",
    response_model=CcmPublishResult,
    summary="Publish a certificate as an EDC HttpData asset",
)
async def publish_certificate(request: CcmPublishRequest) -> CcmPublishResult:
    """
    Publish a certificate as an individual EDC asset with an HttpData
    DataAddress pointing to the ``/provider/certificates/{id}/payload``
    endpoint.  The EDC data plane fetches the payload live from that URL
    whenever a consumer pulls the asset.

    Consumers can discover this asset in the catalog and pull it via the
    CX-0135 PULL mechanism.
    """
    try:
        result = ccm_provider_service.publish_certificate(
            request.certificate_id
        )
        return CcmPublishResult(**result)
    except Exception as e:
        logger.exception("Unhandled error in publish_certificate endpoint")
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/certificates/{certificate_id}/payload",
    summary="Serve certificate payload for the EDC data plane",
)
async def get_certificate_payload(certificate_id: int) -> JSONResponse:
    """
    Return the full ``BusinessPartnerCertificate`` JSON payload for the given
    certificate.  This endpoint is the ``baseUrl`` embedded in the certificate's
    EDC asset DataAddress; the EDC data plane calls it when a consumer pulls
    the asset via the CX-0135 PULL mechanism.
    """
    try:
        payload = ccm_provider_service.get_certificate_payload(certificate_id)
        return JSONResponse(content=payload)
    except Exception as e:
        logger.exception("Unhandled error in get_certificate_payload endpoint")
        raise HTTPException(status_code=500, detail=str(e))


@router.put(
    "/publish/{certificate_id}",
    response_model=CcmPublishResult,
    summary="Republish a certificate (refresh EDC policy)",
)
async def republish_certificate(certificate_id: int) -> CcmPublishResult:
    """
    Refresh the EDC contract/policy configuration of an already-published
    certificate.  The asset DataAddress is unchanged — only the ODRL policy
    is updated.  Use this when the BPN allowlist or usage constraints change.
    """
    try:
        result = ccm_provider_service.republish_certificate(certificate_id)
        return CcmPublishResult(**result)
    except Exception as e:
        logger.exception("Unhandled error in republish_certificate endpoint")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete(
    "/publish/{certificate_id}",
    status_code=204,
    summary="Unpublish a certificate from the EDC catalog",
)
async def unpublish_certificate(certificate_id: int) -> None:
    """
    Remove a previously published certificate's EDC asset, contract
    definition and policies.  After this call the certificate is no longer
    discoverable in the provider's catalog.
    """
    try:
        ccm_provider_service.unpublish_certificate(certificate_id)
    except Exception as e:
        logger.exception("Unhandled error in unpublish_certificate endpoint")
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/published/{certificate_id}",
    response_model=Dict[str, bool],
    summary="Check if a single certificate is published as an EDC asset",
)
async def get_published_certificate(certificate_id: int) -> Dict[str, bool]:
    """
    Return ``{"published": true}`` if the certificate has an active EDC asset,
    or ``{"published": false}`` if it does not exist or is not published.
    Always responds with HTTP 200.
    """
    try:
        published = ccm_provider_service.get_published_certificate(certificate_id)
        return {"published": published}
    except Exception as e:
        logger.exception("Unhandled error in get_published_certificate endpoint")
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/published",
    response_model=List[CcmPublishedItem],
    summary="List certificates currently published as EDC assets",
)
async def list_published_certificates() -> List[CcmPublishedItem]:
    """
    Return all certificates that have an active EDC asset registered
    (``edc_asset_id IS NOT NULL`` in the database).

    Useful for auditing which certificates are currently discoverable
    in the provider's EDC catalog and for diagnosing DB/EDC sync issues.
    """
    try:
        items = ccm_provider_service.list_published_certificates()
        return [CcmPublishedItem(**item) for item in items]
    except Exception as e:
        logger.exception("Unhandled error in list_published_certificates endpoint")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete(
    "/publish/asset/{asset_id:path}",
    status_code=204,
    summary="Force-unpublish an EDC certificate asset by its asset ID",
)
async def force_unpublish_by_asset_id(asset_id: str) -> None:
    """
    Remove a certificate asset from the EDC connector directly using its
    EDC asset ID, bypassing the database ``edc_asset_id`` check.

    Use this endpoint when the database and the EDC connector are out of
    sync — for example when the ``edc_asset_id`` column was accidentally
    cleared (or the DB was reset) but the EDC still holds the asset.

    If a matching database record is found, its ``edc_asset_id`` will be
    cleared automatically.
    """
    try:
        ccm_provider_service.force_unpublish_by_asset_id(asset_id)
    except Exception as e:
        logger.exception("Unhandled error in force_unpublish_by_asset_id endpoint")
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/shares",
    response_model=List[ShareItem],
    summary="Cross-certificate view of all sharing events",
)
async def list_shares(
    consumer_bpnl: Optional[str] = Query(
        default=None,
        alias="consumerBpnl",
        description="Filter by consumer BPNL.",
    ),
    status: Optional[str] = Query(
        default=None,
        description="Filter by share status (Active / Pending / Revoked).",
    ),
    offset: int = Query(default=0, ge=0, description="Pagination offset."),
    limit: int = Query(default=100, ge=1, le=500, description="Maximum results per page."),
) -> List[ShareItem]:
    """
    Return a cross-certificate, paginated list of all sharing events
    recorded by this provider node.

    Each entry shows which certificate (type), which consumer received it,
    the current share status, and timestamps.  Allows operators to audit
    the complete sharing history from the provider side.
    """
    try:
        return ccm_provider_service.list_shares(
            consumer_bpnl=consumer_bpnl,
            status=status,
            offset=offset,
            limit=limit,
        )
    except Exception as e:
        logger.exception("Unhandled error in list_shares endpoint")
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/inbound-requests",
    response_model=List[CcmInboundRequestItem],
    summary="List inbound certificate requests (latest per combination)",
)
async def list_inbound_requests(
    consumer_bpn: Optional[str] = Query(
        default=None,
        alias="consumerBpn",
        description="Filter by requesting consumer BPNL.",
    ),
    certified_bpn: Optional[str] = Query(
        default=None,
        alias="certifiedBpn",
        description="Filter by certified entity BPNL.",
    ),
    certificate_type: Optional[str] = Query(
        default=None,
        alias="certificateType",
        description="Filter by certificate type.",
    ),
    status: Optional[str] = Query(
        default=None,
        description="Filter by status (NotFound / Registered / Available / Pushed).",
    ),
    offset: int = Query(default=0, ge=0, description="Pagination offset."),
    limit: int = Query(default=100, ge=1, le=500, description="Maximum results per page."),
) -> List[CcmInboundRequestItem]:
    """
    Return a deduplicated list of inbound certificate requests — only the
    **most recent** entry per ``(consumerBpn, certifiedBpn, certificateType)``
    combination.

    Use ``GET /inbound-requests/history`` to see the full timeline for a
    specific combination.
    """
    try:
        return ccm_provider_service.list_inbound_requests(
            consumer_bpn=consumer_bpn,
            certified_bpn=certified_bpn,
            certificate_type=certificate_type,
            status=status,
            offset=offset,
            limit=limit,
        )
    except Exception as e:
        logger.exception("Unhandled error in list_inbound_requests endpoint")
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/inbound-requests/history",
    response_model=List[CcmInboundRequestItem],
    summary="Full history of inbound requests for a specific combination",
)
async def list_inbound_request_history(
    consumer_bpn: str = Query(
        alias="consumerBpn",
        description="Consumer BPNL (required).",
    ),
    certified_bpn: str = Query(
        alias="certifiedBpn",
        description="Certified entity BPNL (required).",
    ),
    certificate_type: str = Query(
        alias="certificateType",
        description="Certificate type identifier (required).",
    ),
    offset: int = Query(default=0, ge=0, description="Pagination offset."),
    limit: int = Query(default=100, ge=1, le=500, description="Maximum results per page."),
) -> List[CcmInboundRequestItem]:
    """
    Return the full history of inbound certificate requests for a specific
    ``(consumerBpn, certifiedBpn, certificateType)`` combination, ordered
    newest first.

    All three query parameters are **required** so the results are scoped
    to a single consumer-certificate pair.
    """
    try:
        return ccm_provider_service.list_inbound_request_history(
            consumer_bpn=consumer_bpn,
            certified_bpn=certified_bpn,
            certificate_type=certificate_type,
            offset=offset,
            limit=limit,
        )
    except Exception as e:
        logger.exception("Unhandled error in list_inbound_request_history endpoint")
        raise HTTPException(status_code=500, detail=str(e))
