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

from fastapi import APIRouter, Depends
from fastapi.responses import Response, JSONResponse

from tractusx_sdk.industry.models.notifications import (
    Notification)

from controllers.fastapi.routers.authentication.auth_api import get_authentication_dependency

from services.notifications.notifications_management_service import NotificationsManagementService
from services.notifications.digital_twin_event_api_service import DigitalTwinEventApiService
from tools.exceptions import NotificationCreationError
from tools.constants import INTERNAL_SERVER_ERROR
from models.metadata_database.notification.models import NotificationDirection
from managers.config.log_manager import LoggingManager

logger = LoggingManager.get_logger(__name__)


notification_management_service = NotificationsManagementService()
digital_twin_event_api_service = DigitalTwinEventApiService(notification_management_service)

router = APIRouter(
    prefix="/digital-twin-event",
    tags=["Digital Twin Event Management"],
    dependencies=[Depends(get_authentication_dependency())]
)

@router.post("/connect-to-parent")
async def connect_to_parent(notification: Notification) -> Response:
    # TODO: Implement the logic to handle the connection to the parent endpoint and process the received notification
    try:
        digital_twin_event_api_service.receive_connect_to_parent(notification, direction=NotificationDirection.INCOMING)
        return Response(status_code=201)
    except NotificationCreationError as e:
        return JSONResponse(status_code=e.status_code, content={"detail": e.detail.model_dump()})
    except Exception as e:
        logger.exception("Unhandled error in connect_to_parent endpoint")
        return JSONResponse(status_code=500, content={"detail": INTERNAL_SERVER_ERROR})

@router.post("/connect-to-child")
async def connect_to_child(notification: Notification) -> Response:
    # TODO: Implement the logic to handle the connection to the child endpoint and process the received notification
    try:
        digital_twin_event_api_service.receive_connect_to_child(notification, direction=NotificationDirection.INCOMING)
        return Response(status_code=201)
    except NotificationCreationError as e:
        return JSONResponse(status_code=e.status_code, content={"detail": e.detail.model_dump()})
    except Exception as e:
        logger.exception("Unhandled error in connect_to_child endpoint")
        return JSONResponse(status_code=500, content={"detail": INTERNAL_SERVER_ERROR})

@router.post("/submodel-update")
async def submodel_update(notification: Notification) -> Response:
    # TODO: Implement the logic to handle the submodel update and process the received notification
    try:
        digital_twin_event_api_service.receive_submodel_update(notification, direction=NotificationDirection.INCOMING)
        return Response(status_code=201)
    except NotificationCreationError as e:
        return JSONResponse(status_code=e.status_code, content={"detail": e.detail.model_dump()})
    except Exception as e:
        logger.exception("Unhandled error in submodel_update endpoint")
        return JSONResponse(status_code=500, content={"detail": INTERNAL_SERVER_ERROR})

@router.post("/feedback")
async def feedback(notification: Notification) -> Response:
    # TODO: Implement the logic to handle the feedback and process the received notification
    try:
        digital_twin_event_api_service.receive_feedback(notification, direction=NotificationDirection.INCOMING)
        return Response(status_code=201)
    except NotificationCreationError as e:
        return JSONResponse(status_code=e.status_code, content={"detail": e.detail.model_dump()})
    except Exception as e:
        logger.exception("Unhandled error in feedback endpoint")
        return JSONResponse(status_code=500, content={"detail": INTERNAL_SERVER_ERROR})
