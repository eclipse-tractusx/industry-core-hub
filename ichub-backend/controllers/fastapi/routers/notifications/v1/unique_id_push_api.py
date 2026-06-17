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

from fastapi import APIRouter, Depends
from fastapi.responses import Response, JSONResponse

from controllers.fastapi.routers.authentication.auth_api import get_authentication_dependency
from managers.config.log_manager import LoggingManager
from models.metadata_database.notification.models import NotificationDirection
from models.services.notification.unique_id_push import UniqueIdPushConnectToParentRequest
from services.notifications.notifications_management_service import NotificationsManagementService
from services.notifications.unique_id_push_service import UniqueIdPushService
from tools.constants import INTERNAL_SERVER_ERROR
from tools.exceptions import NotificationCreationError

logger = LoggingManager.get_logger(__name__)

notification_management_service = NotificationsManagementService()
unique_id_push_service = UniqueIdPushService(notification_management_service)

router = APIRouter(
    prefix="/uniqueidpush",
    tags=["Unique ID Push Notifications"],
    dependencies=[Depends(get_authentication_dependency())],
)


@router.post("/connect-to-parent")
async def connect_to_parent(request: UniqueIdPushConnectToParentRequest) -> Response:
    """
    Receive a Unique ID Push Connect-to-Parent notification.

    This endpoint is called by data providers to notify the parent
    manufacturer about newly created digital twins that should be
    linked in the parent's bill-of-material.
    """
    try:
        unique_id_push_service.receive_connect_to_parent(
            request, direction=NotificationDirection.INCOMING
        )
        return Response(status_code=201)
    except NotificationCreationError as e:
        return JSONResponse(
            status_code=e.status_code, content={"detail": e.detail.model_dump()}
        )
    except Exception as e:
        logger.exception("Unhandled error in uniqueidpush/connect-to-parent endpoint")
        return JSONResponse(
            status_code=500, content={"detail": INTERNAL_SERVER_ERROR}
        )
