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
"""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse

from controllers.fastapi.routers.authentication.auth_api import (
    get_authentication_dependency,
)
from managers.config.log_manager import LoggingManager
from models.services.addons.ccm_kit.v1.notifications import (
    CcmAvailableRequest,
    CcmPublishRequest,
    CcmPublishResult,
    CcmPushRequest,
    CcmSendResult,
)
from services.addons.ccm_kit.v1.ccm_provider_service import ccm_provider_service
from tools.constants import INTERNAL_SERVER_ERROR

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
    except Exception:
        logger.exception("Unhandled error in push_certificate endpoint")
        return CcmSendResult(success=False, error=INTERNAL_SERVER_ERROR)


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
    except Exception:
        logger.exception(
            "Unhandled error in send_certificate_available endpoint"
        )
        return CcmSendResult(success=False, error=INTERNAL_SERVER_ERROR)


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
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception:
        logger.exception("Unhandled error in publish_certificate endpoint")
        raise HTTPException(status_code=500, detail=INTERNAL_SERVER_ERROR)


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
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception:
        logger.exception("Unhandled error in get_certificate_payload endpoint")
        raise HTTPException(status_code=500, detail=INTERNAL_SERVER_ERROR)


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
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception:
        logger.exception("Unhandled error in unpublish_certificate endpoint")
        raise HTTPException(status_code=500, detail=INTERNAL_SERVER_ERROR)
