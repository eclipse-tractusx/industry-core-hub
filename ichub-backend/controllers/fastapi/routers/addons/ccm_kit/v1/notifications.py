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
CX-0135 Company Certificate Management — notification API endpoints.

Inbound notification endpoints for both PULL-flow and PUSH-flow:

- ``POST /companycertificate/request``   — consumer asks for a certificate
- ``POST /companycertificate/status``    — consumer reports processing result
- ``POST /companycertificate/push``      — provider pushes a full certificate
- ``POST /companycertificate/available`` — provider signals certificate availability
"""

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from controllers.fastapi.routers.authentication.auth_api import (
    get_authentication_dependency,
)
from managers.config.log_manager import LoggingManager
from models.services.addons.ccm_kit.v1.notifications import (
    CcmAvailableNotification,
    CcmPushNotification,
    CcmRequestNotification,
    CcmStatusNotification,
)
from services.addons.ccm_kit.v1.ccm_notification_service import (
    ccm_notification_service,
)
from tools.constants import INTERNAL_SERVER_ERROR

logger = LoggingManager.get_logger(__name__)

router = APIRouter(
    prefix="/companycertificate",
    tags=["Company Certificate Management"],
    dependencies=[Depends(get_authentication_dependency())],
)


@router.post("/request")
async def certificate_request(notification: CcmRequestNotification) -> JSONResponse:
    """
    Receive a certificate-request notification from a consumer.

    The consumer sends a ``Notification`` whose content includes
    ``certifiedBpn`` and ``certificateType``.  If the certificate
    exists locally the consumer's BPNL is registered for sharing
    and a push delivery is initiated asynchronously.
    """
    try:
        status_code, body = ccm_notification_service.process_certificate_request(
            notification
        )
        return JSONResponse(status_code=status_code, content=body)
    except Exception as e:
        logger.exception("Unhandled error in certificate_request endpoint")
        return JSONResponse(
            status_code=500, content={"detail": str(e)}
        )


@router.post("/status")
async def update_certificate_status(notification: CcmStatusNotification) -> JSONResponse:
    """
    Receive a status-update notification from a consumer.

    The consumer reports the processing outcome for a previously
    pushed certificate (RECEIVED, ACCEPTED, or REJECTED).
    """
    try:
        status_code, body = ccm_notification_service.update_certificate_status(
            notification
        )
        return JSONResponse(status_code=status_code, content=body)
    except Exception as e:
        logger.exception("Unhandled error in update_certificate_status endpoint")
        return JSONResponse(
            status_code=500, content={"detail": str(e)}
        )


@router.post("/push")
async def certificate_push(notification: CcmPushNotification) -> JSONResponse:
    """
    Receive a certificate-push notification from a provider.

    The provider sends the full certificate payload (including the
    Base64-encoded document) via the CX-0135 PUSH mechanism.
    """
    try:
        status_code, body = ccm_notification_service.process_certificate_push(
            notification
        )
        return JSONResponse(status_code=status_code, content=body)
    except Exception as e:
        logger.exception("Unhandled error in certificate_push endpoint")
        return JSONResponse(
            status_code=500, content={"detail": str(e)}
        )


@router.post("/available")
async def certificate_available(notification: CcmAvailableNotification) -> JSONResponse:
    """
    Receive a certificate-available notification from a provider.

    The provider notifies that a certificate is available for PULL
    retrieval via the EDC catalog.
    """
    try:
        status_code, body = ccm_notification_service.process_certificate_available(
            notification
        )
        return JSONResponse(status_code=status_code, content=body)
    except Exception as e:
        logger.exception("Unhandled error in certificate_available endpoint")
        return JSONResponse(
            status_code=500, content={"detail": str(e)}
        )
