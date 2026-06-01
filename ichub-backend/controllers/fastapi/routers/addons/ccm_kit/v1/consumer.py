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

- ``POST /consumer/catalog-search`` — check if a provider has a CCM asset
- ``POST /consumer/request``        — send a certificate request to a provider
- ``POST /consumer/status``         — send a processing status to a provider
- ``POST /consumer/pull``           — pull a certificate from a provider's catalog
"""

from fastapi import APIRouter, Depends, HTTPException

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
)
from services.addons.ccm_kit.v1.ccm_consumer_service import ccm_consumer_service
from tools.constants import INTERNAL_SERVER_ERROR

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
    except Exception:
        logger.exception("Unhandled error in catalog_search endpoint")
        return CcmCatalogSearchResult(
            found=False,
            provider_bpn=request.provider_bpn,
            error=INTERNAL_SERVER_ERROR,
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
        return ccm_consumer_service.send_certificate_request(
            payload, payload.sender_bpn
        )
    except Exception:
        logger.exception("Unhandled error in send_certificate_request endpoint")
        return CcmSendResult(success=False, error=INTERNAL_SERVER_ERROR)


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
        return ccm_consumer_service.send_certificate_status(
            payload, payload.sender_bpn
        )
    except Exception:
        logger.exception("Unhandled error in send_certificate_status endpoint")
        return CcmSendResult(success=False, error=INTERNAL_SERVER_ERROR)


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
    except Exception:
        logger.exception("Unhandled error in pull_certificate endpoint")
        raise HTTPException(status_code=500, detail=INTERNAL_SERVER_ERROR)
