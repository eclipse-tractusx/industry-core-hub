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
CCM Notification Manager — centralised notification creation for CCM events.

Mirrors the PCF notification manager pattern so that every inbound and outbound
CX-0135 Company Certificate Management event is automatically recorded in the
shared ``notifications`` table (with the full payload uploaded to the DTR).
"""

from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4

from tractusx_sdk.industry.models.notifications import (
    Notification,
    NotificationContent,
    NotificationHeader,
)

from managers.config.log_manager import LoggingManager
from models.metadata_database.notification.models import NotificationDirection
from services.notifications.notifications_management_service import NotificationsManagementService
from tools.constants import CCM
from utils.log_utils import sanitize_log_value as _s

logger = LoggingManager.get_logger(__name__)

# Notification type constants (used in both ``notificationType`` content field
# and the CX context string ``IndustryCore-CCM-{TYPE}:1.0.0``).
CCM_NT_REQUEST_RECEIVED = "CCM_REQUEST_RECEIVED"
CCM_NT_REQUEST_NOT_FOUND = "CCM_REQUEST_NOT_FOUND"
CCM_NT_REQUEST_SENT = "CCM_REQUEST_SENT"
CCM_NT_PUSH_RECEIVED = "CCM_PUSH_RECEIVED"
CCM_NT_PUSH_SENT = "CCM_PUSH_SENT"
CCM_NT_AVAILABLE_RECEIVED = "CCM_AVAILABLE_RECEIVED"
CCM_NT_AVAILABLE_SENT = "CCM_AVAILABLE_SENT"
CCM_NT_STATUS_SENT = "CCM_STATUS_SENT"
CCM_NT_STATUS_RECEIVED = "CCM_STATUS_RECEIVED"


class CcmNotificationManager:
    """
    Manages automatic notification creation for CCM exchange events.

    Provides centralised handling so every CX-0135 operation produces a
    corresponding entry in the shared ``notifications`` infrastructure
    (database row + full payload in the DTR).

    All methods are **fail-silent**: errors are logged but never raised so
    that notification failures never block the main CCM flow.
    """

    def __init__(
        self,
        notification_service: Optional[NotificationsManagementService] = None,
    ) -> None:
        self._notification_service = (
            notification_service or NotificationsManagementService()
        )

    def create_ccm_notification(
        self,
        sender_bpn: str,
        receiver_bpn: str,
        notification_type: str,
        certificate_type: Optional[str] = None,
        certified_bpn: Optional[str] = None,
        document_id: Optional[str] = None,
        message: Optional[str] = None,
        direction: NotificationDirection = NotificationDirection.INCOMING,
    ) -> None:
        """
        Create and store a notification for a CCM event.

        Constructs a CX-0135-style notification with proper header and
        CCM-specific content, then persists it via the shared notification
        service.  Failures are logged but do not propagate.

        Args:
            sender_bpn: BPN of the party that sent the CCM message.
            receiver_bpn: BPN of the party that received the CCM message.
            notification_type: Event type string (e.g. ``CCM_PUSH_RECEIVED``).
            certificate_type: Optional certificate type identifier.
            certified_bpn: Optional BPN of the certified legal entity.
            document_id: Optional provider document ID.
            message: Optional human-readable context message.
            direction: ``INCOMING`` for received events, ``OUTGOING`` for sent.
        """
        try:
            context = f"IndustryCore-CCM-{notification_type}:1.0.0"

            header = NotificationHeader(
                message_id=uuid4(),
                context=context,
                sender_bpn=sender_bpn,
                receiver_bpn=receiver_bpn,
            )

            content_data: dict = {
                "notificationType": notification_type,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
            if certificate_type is not None:
                content_data["certificateType"] = certificate_type
            if certified_bpn is not None:
                content_data["certifiedBpn"] = certified_bpn
            if document_id is not None:
                content_data["documentId"] = document_id
            if message is not None:
                content_data["message"] = message

            content = NotificationContent(**content_data)
            notification = Notification(header=header, content=content)

            self._notification_service.create_notification(
                notification=notification,
                direction=direction,
                use_case=CCM,
            )

            logger.info(
                "[CCM] Notification recorded: type=%s sender=%s receiver=%s",
                _s(notification_type),
                _s(sender_bpn),
                _s(receiver_bpn),
            )

        except Exception as exc:
            logger.error(
                "[CCM] Failed to create notification (type=%s): %s",
                _s(notification_type),
                _s(exc),
            )
            # Never re-raise — notification failures must not block CCM operations.


# Module-level singleton consumed by CCM services.
ccm_notification_manager = CcmNotificationManager()
