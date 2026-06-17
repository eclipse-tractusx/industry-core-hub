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

from managers.config.log_manager import LoggingManager
from models.metadata_database.notification.models import NotificationDirection, NotificationEntity
from models.services.notification.unique_id_push import UniqueIdPushConnectToParentRequest
from services.notifications.notifications_management_service import NotificationsManagementService
from tools.constants import INDUSTRY_CORE_HUB
from tools.exceptions import NotificationCreationError

logger = LoggingManager.get_logger(__name__)


class UniqueIdPushService:
    """Service for processing Unique ID Push notifications."""

    def __init__(self, notifications_management_service: NotificationsManagementService):
        self.notifications_management_service = notifications_management_service

    def receive_connect_to_parent(
        self,
        request: UniqueIdPushConnectToParentRequest,
        direction: NotificationDirection,
    ) -> NotificationEntity:
        """
        Handle an incoming Unique ID Push Connect-to-Parent notification.

        Converts the strongly-typed request into the generic SDK Notification
        format and persists it through the shared notification management service.
        """
        logger.info(
            f"Received UniqueIdPush connect-to-parent notification with ID: "
            f"{request.header.message_id}"
        )
        try:
            notification = request.to_notification()
            return self.notifications_management_service.create_notification(
                notification, direction, INDUSTRY_CORE_HUB
            )
        except NotificationCreationError as e:
            logger.error(f"Failed to create UniqueIdPush notification: {e}")
            raise
