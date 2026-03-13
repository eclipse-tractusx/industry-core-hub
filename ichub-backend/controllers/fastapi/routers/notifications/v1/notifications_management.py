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
from typing import List, Dict
from fastapi import APIRouter, Depends
from fastapi.responses import Response, JSONResponse

from tractusx_sdk.industry.models.notifications import (
    Notification)

from controllers.fastapi.routers.authentication.auth_api import get_authentication_dependency
from services.notifications.notifications_management_service import NotificationsManagementService
from models.metadata_database.notification.models import NotificationStatus, NotificationDirection
from models.services.notification.responses import NotificationResponse
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

@router.post("/notification")
async def create_notification(notification: Notification) -> Response:
    """
    Create a new notification (OUTGOING direction).
    """
    try:
        notification_management_service.create_notification(notification, direction=NotificationDirection.OUTGOING)
        return Response(status_code=201)
    except NotificationCreationError as e:
        return JSONResponse(status_code=e.status_code, content={"detail": e.detail.model_dump()})
    except Exception as e:
        logger.exception("Unhandled error in create_notification endpoint")
        return JSONResponse(status_code=500, content={"detail": INTERNAL_SERVER_ERROR})

@router.post("/notification/send")
async def send_notification(message_id: UUID, endpoint_path: str, provider_bpn: str, provider_dsp_url: str, list_policies: List[Dict]) -> Response:
    """
    Send an existing notification to the specified endpoint.
    """
    try:
        notification_management_service.send_notification(message_id, endpoint_path, provider_bpn, provider_dsp_url, list_policies)
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
