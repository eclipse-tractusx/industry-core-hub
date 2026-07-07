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
# Unless required by applicable law or agreed in writing, software
# distributed under the License is distributed on an "AS IS" BASIS
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND,
# either express or implied. See the
# License for the specific language govern in permissions and limitations
# under the License.
#
# SPDX-License-Identifier: Apache-2.0
#################################################################################

from uuid import UUID
from typing import Annotated, List
from fastapi import APIRouter, Body, Depends
from fastapi.responses import Response, JSONResponse

from tractusx_sdk.industry.models.notifications import (
    Notification)

from controllers.fastapi.routers.authentication.auth_api import get_authentication_dependency
from services.notifications.notifications_management_service import NotificationsManagementService
from models.metadata_database.notification.models import NotificationStatus, NotificationDirection
from models.services.notification.responses import NotificationResponse
from models.services.notification.requests import SendNotificationRequest
from tools.exceptions import (
    NotificationCreationError,
    NotificationUpdateStatusError,
    NotificationRetrievalError,
    NotificationDeleteError,
    NotificationSendingError
)
from tools.constants import INTERNAL_SERVER_ERROR
from managers.config.log_manager import LoggingManager

logger = LoggingManager.get_logger(__name__)


notification_management_service = NotificationsManagementService()

router = APIRouter(
    prefix="/notifications-management",
    tags=["Notifications Management"],
    dependencies=[Depends(get_authentication_dependency())]
)

@router.post("/notifications")
async def get_all_notifications(bpn: str, status: NotificationStatus = None, offset: int = 0, limit: int = 10) -> List[NotificationResponse]:
    try:
        notifications = notification_management_service.get_all_notifications(bpn=bpn, status=status, offset=offset, limit=limit)
        return notifications
    except NotificationRetrievalError as e:
        return JSONResponse(status_code=e.status_code, content={"detail": e.detail.model_dump()})

# Explicit Swagger UI example without ``additionalProperties`` clutter.
# The SDK's ``NotificationContent`` model carries ``extra="allow"`` which causes
# Pydantic to emit ``additionalProperties: true`` in the JSON schema.  Swagger UI
# then inserts a placeholder ``additionalProp1: {}`` field in its auto-generated
# example body.  Users who delete that placeholder but forget to remove the
# trailing comma trigger a JSON decode error on every actual request.
# Providing ``openapi_examples`` via ``Body()`` replaces the auto-generated
# example with a clean, valid one so the issue cannot occur from the UI.
_NOTIFICATION_BODY_EXAMPLE = Body(
    openapi_examples={
        "connect_to_parent": {
            "summary": "ConnectToParent notification",
            "value": {
                "header": {
                    "context": "IndustryCore-DigitalTwinEventAPI-ConnectToParent:3.0.0",
                    "senderBpn": "BPNL00000000024R",
                    "receiverBpn": "BPNL000000000342",
                    "version": "3.0.0",
                },
                "content": {
                    "information": "Notification message",
                    "listOfAffectedItems": [
                        "urn:uuid:b5f462a2-54e8-4034-85e2-2d663f1c2c2f"
                    ],
                },
            },
        }
    }
)


@router.post("/notification")
async def create_notification(
    notification: Annotated[Notification, _NOTIFICATION_BODY_EXAMPLE],
) -> JSONResponse:
    """
    Create a new notification (OUTGOING direction).

    If ``message_id`` or ``sentDateTime`` are omitted from the request body the
    backend auto-generates them (UUID v4 and current UTC timestamp respectively).
    Caller-supplied values are preserved as-is.  The ``message_id`` is always
    returned in the 201 response body so callers can reference the notification.
    """
    try:
        entity = notification_management_service.create_notification(notification, direction=NotificationDirection.OUTGOING)
        return JSONResponse(status_code=201, content={"message_id": str(entity.message_id)})
    except NotificationCreationError as e:
        return JSONResponse(status_code=e.status_code, content={"detail": e.detail.model_dump()})
    except Exception as e:
        logger.exception("Unhandled error in create_notification endpoint")
        return JSONResponse(status_code=500, content={"detail": INTERNAL_SERVER_ERROR})

@router.post("/notification/send")
async def send_notification(request: SendNotificationRequest) -> Response:
    """
    Send an existing notification to the specified endpoint.

    All parameters are supplied in the request body. The ``governance`` field is
    optional — when omitted the backend falls back to the
    ``provider.digitalTwinEventAPI.policy.usage`` policy defined in
    ``configuration.yml``.
    """
    try:
        notification_management_service.send_notification(
            message_id=request.message_id,
            endpoint_url=request.endpoint_path,
            provider_bpn=request.provider_bpn,
            provider_dsp_url=request.provider_dsp_url,
            list_policies=request.governance,
        )
        return Response(status_code=200)
    except NotificationSendingError as e:
        return JSONResponse(status_code=e.status_code, content={"detail": e.detail.model_dump()})
    except Exception as e:
        logger.exception("Unhandled error in send_notification endpoint")
        return JSONResponse(status_code=500, content={"detail": INTERNAL_SERVER_ERROR})

@router.put("/notification/status")
async def update_notification_status(message_id: str, status: NotificationStatus) -> Response:
    try:
        notification_management_service.update_notification_status(message_id, status)
        return Response(status_code=200)
    except NotificationUpdateStatusError as e:
        return JSONResponse(status_code=e.status_code, content={"detail": e.detail.model_dump()})
    except Exception as e:
        logger.exception("Unhandled error in update_notification_status endpoint")
        return JSONResponse(status_code=500, content={"detail": INTERNAL_SERVER_ERROR})

@router.delete("/notification")
async def delete_notification(message_id: str) -> Response:
    try:
        notification_management_service.delete_notification(message_id)
        return Response(status_code=204)
    except NotificationDeleteError as e:
        return JSONResponse(status_code=e.status_code, content={"detail": e.detail.model_dump()})
    except Exception as e:
        logger.exception("Unhandled error in delete_notification endpoint")
        return JSONResponse(status_code=500, content={"detail": INTERNAL_SERVER_ERROR})
