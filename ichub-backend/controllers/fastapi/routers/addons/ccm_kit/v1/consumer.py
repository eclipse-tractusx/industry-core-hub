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
CX-0135 Company Certificate Management — consumer-side API endpoints.

Implements the consumer operations for the PULL flow:

- ``POST /consumer/catalog-search``      — check if a provider has a CCM asset
- ``POST /consumer/request``             — send a certificate request to a provider
- ``POST /consumer/status``              — send a processing status to a provider
- ``POST /consumer/pull``                — pull a certificate from a provider's catalog
- ``GET  /consumer/received``            — list certificates received by this node
- ``GET  /consumer/received/{document_id}`` — detail for one received certificate
- ``GET  /consumer/requests``            — list outbound certificate requests
- ``GET  /consumer/requests/{id}``       — detail for one outbound request
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from controllers.fastapi.routers.authentication.auth_api import (
    get_authentication_dependency,
)
from managers.config.log_manager import LoggingManager
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
from services.addons.ccm_kit.v1.ccm_consumer_service import ccm_consumer_service
from tools.exceptions import InvalidError

logger = LoggingManager.get_logger(__name__)

router = APIRouter(
    prefix="/consumer",
    tags=["CCM Consumer"],
    dependencies=[Depends(get_authentication_dependency())],
)


@router.post(
    "/catalog-search",
    response_model=CcmCatalogSearchResult,
    summary="Search provider catalog for CCM notification asset",
)
async def catalog_search(request: CcmCatalogSearchRequest) -> CcmCatalogSearchResult:
    """
    Search a provider's EDC catalog for a CompanyCertificateManagement
    notification asset.

    This allows the consumer to verify that the provider supports the
    CCM notification API before attempting to send a request or status.
    """
    try:
        return ccm_consumer_service.search_catalog(request)
    except Exception as e:
        logger.exception("Unhandled error in catalog_search endpoint")
        return CcmCatalogSearchResult(
            found=False,
            provider_bpn=request.provider_bpn,
            error=str(e),
        )


@router.post(
    "/request",
    response_model=CcmSendResult,
    summary="Send certificate request to provider",
)
async def send_certificate_request(payload: CcmSendRequestPayload) -> CcmSendResult:
    """
    Send a CX-0135 certificate request notification to a provider.

    Initiates the PULL flow: the consumer asks the provider to share a
    specific certificate identified by ``certifiedBpn`` and ``certificateType``.
    """
    try:
        result = ccm_consumer_service.send_certificate_request(
            payload, payload.sender_bpn
        )
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Unhandled error in send_certificate_request endpoint")
        raise HTTPException(status_code=500, detail=str(e))


@router.post(
    "/status",
    response_model=CcmSendResult,
    summary="Send certificate status to provider",
)
async def send_certificate_status(payload: CcmSendStatusPayload) -> CcmSendResult:
    """
    Send a CX-0135 certificate status notification to a provider.

    After receiving a certificate (via PUSH), the consumer communicates
    the processing result (RECEIVED, ACCEPTED, or REJECTED) back to the
    provider.
    """
    try:
        result = ccm_consumer_service.send_certificate_status(
            payload, payload.sender_bpn
        )
        return result
    except InvalidError as e:
        raise HTTPException(status_code=409, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Unhandled error in send_certificate_status endpoint")
        raise HTTPException(status_code=500, detail=str(e))


@router.post(
    "/pull",
    response_model=CcmPullResult,
    summary="Pull a certificate from a provider's EDC catalog",
)
async def pull_certificate(request: CcmPullRequest) -> CcmPullResult:
    """
    Pull a certificate from a provider's EDC catalog using the PULL mechanism.

    The consumer discovers the certificate asset (identified by ``documentId``)
    in the provider's catalog, negotiates a contract, and retrieves the
    embedded BusinessPartnerCertificate payload via the data plane.
    """
    try:
        return ccm_consumer_service.pull_certificate(request)
    except Exception as e:
        logger.exception("Unhandled error in pull_certificate endpoint")
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/received",
    response_model=List[ReceivedCertificateItem],
    summary="List certificates received by this node",
)
async def list_received(
    certified_bpn: Optional[str] = Query(
        default=None,
        alias="certifiedBpn",
        description="Filter by BPNL of the certified legal entity.",
    ),
    certificate_type: Optional[str] = Query(
        default=None,
        alias="certificateType",
        description="Filter by certificate type identifier (e.g. ISO9001).",
    ),
    offset: int = Query(default=0, ge=0, description="Pagination offset."),
    limit: int = Query(default=100, ge=1, le=500, description="Maximum results per page."),
) -> List[ReceivedCertificateItem]:
    """
    Return a paginated list of certificates received by this node via PUSH
    or PULL.

    Use the optional query parameters to narrow the results.  The binary
    document content is not included; call ``GET /consumer/received/{id}``
    to retrieve the full certificate payload including the PDF.
    """
    try:
        return ccm_consumer_service.list_received(
            certified_bpn=certified_bpn,
            certificate_type=certificate_type,
            offset=offset,
            limit=limit,
        )
    except Exception as e:
        logger.exception("Unhandled error in list_received endpoint")
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/received/{document_id}",
    response_model=ReceivedCertificateDetail,
    summary="Get detail for a single received certificate",
)
async def get_received(
    document_id: str,
    provider_bpn: str = Query(
        ...,
        alias="providerBpn",
        description="BPNL of the provider that sent the certificate.",
    ),
) -> ReceivedCertificateDetail:
    """
    Return the full detail for a single received certificate, including the
    Base64-encoded PDF document when available.

    The certificate is identified by the provider-assigned ``documentId``
    together with the ``providerBpn`` (which form a unique pair).
    """
    try:
        result = ccm_consumer_service.get_received_by_document_id(
            document_id, provider_bpn,
        )
        if result is None:
            raise HTTPException(status_code=404, detail="Received certificate not found.")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Unhandled error in get_received endpoint")
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/requests",
    response_model=List[OutboundRequestItem],
    summary="List outbound certificate requests (latest per combination)",
)
async def list_requests(
    provider_bpn: Optional[str] = Query(
        default=None,
        alias="providerBpn",
        description="Filter by provider BPNL.",
    ),
    certified_bpn: Optional[str] = Query(
        default=None,
        alias="certifiedBpn",
        description="Filter by certified entity BPNL.",
    ),
    certificate_type: Optional[str] = Query(
        default=None,
        alias="certificateType",
        description="Filter by certificate type identifier.",
    ),
    status: Optional[str] = Query(
        default=None,
        description="Filter by request status (Pending / Found / NotFound / Failed).",
    ),
    offset: int = Query(default=0, ge=0, description="Pagination offset."),
    limit: int = Query(default=100, ge=1, le=500, description="Maximum results per page."),
) -> List[OutboundRequestItem]:
    """
    Return a deduplicated list of certificate requests — only the **most
    recent** entry per ``(providerBpn, certifiedBpn, certificateType)``
    combination.

    Use ``GET /requests/history`` to see the full timeline for a specific
    combination.
    """
    try:
        return ccm_consumer_service.list_requests(
            provider_bpn=provider_bpn,
            certified_bpn=certified_bpn,
            certificate_type=certificate_type,
            status=status,
            offset=offset,
            limit=limit,
        )
    except Exception as e:
        logger.exception("Unhandled error in list_requests endpoint")
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/requests/history",
    response_model=List[OutboundRequestItem],
    summary="Full history of outbound requests for a specific combination",
)
async def list_request_history(
    provider_bpn: str = Query(
        alias="providerBpn",
        description="Provider BPNL (required).",
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
) -> List[OutboundRequestItem]:
    """
    Return the full history of outbound certificate requests for a specific
    ``(providerBpn, certifiedBpn, certificateType)`` combination, ordered
    newest first.

    All three query parameters are **required** so the results are scoped
    to a single certificate of interest.
    """
    try:
        return ccm_consumer_service.list_request_history(
            provider_bpn=provider_bpn,
            certified_bpn=certified_bpn,
            certificate_type=certificate_type,
            offset=offset,
            limit=limit,
        )
    except Exception as e:
        logger.exception("Unhandled error in list_request_history endpoint")
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/requests/{request_id}",
    response_model=OutboundRequestItem,
    summary="Get detail for a single outbound certificate request",
)
async def get_request(request_id: int) -> OutboundRequestItem:
    """
    Return the detail for a single outbound certificate request.
    """
    try:
        result = ccm_consumer_service.get_request(request_id)
        if result is None:
            raise HTTPException(status_code=404, detail="Outbound request not found.")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Unhandled error in get_request endpoint")
        raise HTTPException(status_code=500, detail=str(e))
