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
PCF Notification Manager - Centralized notification creation for PCF exchange events.
"""

from typing import Optional
from datetime import datetime, timezone
from uuid import uuid4
from tractusx_sdk.extensions.notification_api.models import (
    Notification,
    NotificationHeader,
    NotificationContent,
)

from managers.config.log_manager import LoggingManager
from models.metadata_database.notification.models import NotificationDirection
from services.notifications.notifications_management_service import NotificationsManagementService
from tools.constants import PCF

logger = LoggingManager.get_logger(__name__)


class PcfNotificationManager:
    """
    Manages notification creation for PCF exchange events.
    
    Provides centralized handling of PCF notifications to ensure consistent
    messaging and logging across all PCF operations.
    """

    def __init__(
        self,
        notification_service: Optional[NotificationsManagementService] = None
    ) -> None:
        """Initialize the notification manager with the notification service."""
        self._notification_service = (
            notification_service or NotificationsManagementService()
        )

    def create_pcf_notification(
        self,
        sender_bpn: str,
        receiver_bpn: str,
        notification_type: str,
        request_id: str,
        manufacturer_part_id: Optional[str] = None,
        customer_part_id: Optional[str] = None,
        requesting_bpn: Optional[str] = None,
        responding_bpn: Optional[str] = None,
        target_bpn: Optional[str] = None,
        message: Optional[str] = None,
        is_update: Optional[bool] = False,
        direction: NotificationDirection = NotificationDirection.INCOMING,
    ) -> None:
        """
        Create a notification for PCF exchange events.
        
        Constructs a notification with proper headers and content following
        Catena-X standards, then stores it via the notification service.
        On failure, logs the error but does not raise exceptions to prevent
        notification failures from blocking the main PCF flow.
        
        Args:
            sender_bpn: BPN of the party sending the notification
            receiver_bpn: BPN of the party receiving the notification
            notification_type: Type of notification (e.g., 'PCF_REQUEST', 'PCF_RESPONSE')
            request_id: The PCF request ID
            manufacturer_part_id: Optional manufacturer part ID
            customer_part_id: Optional customer part ID
            requesting_bpn: Optional requesting BPN (outgoing request notifications)
            responding_bpn: Optional responding BPN (outgoing response notifications)
            target_bpn: Optional target BPN (outgoing request notifications)
            message: Optional message accompanying the notification
            is_update: Whether this is an update notification
            direction: Notification direction (incoming/outgoing)
        """
        try:
            # Build notification header with required fields per
            # io.catenax.shared.message_header_3.0.0
            # Context format: <domain>-<subdomain>-<object>:<version>
            context = f"IndustryCore-PCF-{notification_type}:1.0.0"

            header = NotificationHeader(
                message_id=uuid4(),
                context=context,
                sender_bpn=sender_bpn,
                receiver_bpn=receiver_bpn,
            )

            # Build notification content with PCF-specific data
            content_data = {
                "notificationType": notification_type,
                "requestId": request_id,
                "message": message,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }

            if manufacturer_part_id is not None:
                content_data["manufacturerPartId"] = manufacturer_part_id
            if customer_part_id is not None:
                content_data["customerPartId"] = customer_part_id
            if requesting_bpn is not None:
                content_data["requestingBpn"] = requesting_bpn
            if responding_bpn is not None:
                content_data["respondingBpn"] = responding_bpn
            if target_bpn is not None:
                content_data["targetBpn"] = target_bpn
            if is_update is not None:
                content_data["isUpdate"] = is_update

            content = NotificationContent(**content_data)

            # Create the notification
            notification = Notification(header=header, content=content)

            # Store notification via the service
            self._notification_service.create_notification(
                notification=notification,
                direction=direction,
                use_case=PCF,
            )

            logger.info(
                f"Created PCF notification for request {request_id}: "
                f"type={notification_type}"
            )

        except Exception as e:
            logger.error(
                f"Failed to create PCF notification for request {request_id}: "
                f"{str(e)}"
            )
            # Don't raise - notification creation failure shouldn't block the main flow


# Module-level singleton for convenience
pcf_notification_manager = PcfNotificationManager()
