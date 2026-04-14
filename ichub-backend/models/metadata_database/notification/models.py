#################################################################################
# Eclipse Tractus-X - Software Development KIT
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

from sqlmodel import SQLModel, Field, Column
from sqlalchemy import Enum as SAEnum
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from uuid import UUID
from enum import Enum
from tractusx_sdk.industry.models.notifications import Notification

class NotificationDirection(str, Enum):
    INCOMING = "incoming"
    OUTGOING = "outgoing"

class NotificationStatus(str, Enum):
    RECEIVED = "received"
    READ = "read"
    PENDING = "pending"
    SENT = "sent"
    FAILED = "failed"

class NotificationEntity(SQLModel, table=True):
    __tablename__ = "notifications"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Internal timestamp of when the record was created"
    )

    message_id: UUID = Field(index=True, unique=True)
    sender_bpn: str = Field(index=True)
    receiver_bpn: str = Field(index=True)
    direction: NotificationDirection = Field(
        default=NotificationDirection.INCOMING,
        sa_column=Column(
            SAEnum(NotificationDirection, values_callable=lambda x: [e.value for e in x], name="notification_direction", create_type=False),
            index=True,
            nullable=False,
        )
    )
    status: NotificationStatus = Field(
        default=NotificationStatus.RECEIVED,
        sa_column=Column(
            SAEnum(NotificationStatus, values_callable=lambda x: [e.value for e in x], name="notification_status", create_type=False),
            index=True,
            nullable=False,
        )
    )

    use_case: Optional[str] = Field(
        default=None,
        description="Originating use case or category for the notification (e.g., 'CCM', 'TRACEABILITY', 'INDUSTRY CORE', 'PCF', etc.). Generic string for future extensibility."
    )

    location: str = Field(index=True, nullable=False)

    @classmethod
    def from_sdk(
        cls,
        notification: Notification,
        direction: NotificationDirection = NotificationDirection.INCOMING,
        status: NotificationStatus = NotificationStatus.RECEIVED,
        use_case: Optional[str] = None,
        location: str = ""
        ) -> "NotificationEntity":
        """
        Maps the nested SDK Notification to a flat, searchable Database Entity.
        Args:
            notification: The SDK Notification object.
            direction: Direction of the notification (incoming/outgoing).
            status: Status of the notification.
            use_case: Optional string indicating the use case/category (e.g., 'CCM', 'TRACEABILITY').
        """
        return cls(
            message_id=notification.header.message_id,
            sender_bpn=notification.header.sender_bpn,
            receiver_bpn=notification.header.receiver_bpn,
            direction=direction,
            status=status,
            use_case=use_case,
            location=location
        )

    def to_sdk(self, payload: Dict[str, Any]) -> Notification:
        """
        Reconstructs the original SDK Notification object from the database record.
        """
        return Notification.model_validate(payload)
