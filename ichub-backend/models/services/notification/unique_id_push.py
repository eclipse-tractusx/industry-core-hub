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

from enum import Enum
from typing import List, Optional, Union

from pydantic import BaseModel, Field

from tractusx_sdk.industry.models.notifications import Notification, NotificationHeader, NotificationContent


class DigitalTwinType(str, Enum):
    """Type of digital twin being referenced in the notification."""
    PART_TYPE = "PartType"
    PART_INSTANCE = "PartInstance"


class PartItem(BaseModel):
    """
    Base item identifying a part by manufacturer and partner IDs.
    All item types in the Unique ID Push payload share these fields.
    """
    manufacturer_id: str = Field(
        ...,
        alias="manufacturerId",
        description="BPN of the manufacturer (BPNL)",
    )
    manufacturer_part_id: str = Field(
        ...,
        alias="manufacturerPartId",
        description="Part ID assigned by the manufacturer",
    )
    customer_part_id: Optional[str] = Field(
        default=None,
        alias="customerPartId",
        description="Part ID assigned by the customer (optional)",
    )
    catena_x_id: str = Field(
        ...,
        alias="catenaXId",
        description="Catena-X identifier (UUID, optionally prefixed with urn:uuid:)",
    )

    model_config = {"populate_by_name": True}


class SerializedPartItem(PartItem):
    """Item for a specific serialized part instance."""
    part_instance_id: str = Field(
        ...,
        alias="partInstanceId",
        description="Unique identifier of the serialized part instance",
    )


class BatchItem(PartItem):
    """Item for a batch of parts."""
    batch_id: str = Field(
        ...,
        alias="batchId",
        description="Identifier of the batch",
    )


class JISItem(PartItem):
    """Item for a Just-In-Sequence (JIS) delivery."""
    jis_number: str = Field(
        ...,
        alias="jisNumber",
        description="JIS number identifying the delivery sequence",
    )
    jis_call_date: Optional[str] = Field(
        default=None,
        alias="jisCallDate",
        description="Date of the JIS call (ISO 8601)",
    )
    parent_order_number: Optional[str] = Field(
        default=None,
        alias="parentOrderNumber",
        description="Parent order number associated with the JIS delivery",
    )


# Union type for all possible item types in the list
UniqueIdPushItem = Union[JISItem, BatchItem, SerializedPartItem, PartItem]


class UniqueIdPushContent(BaseModel):
    """
    Content payload for Unique ID Push Connect-to-Parent notifications.

    Follows io.catenax.unique_id_push_connect_to_parent_notification:2.0.0.
    """
    digital_twin_type: DigitalTwinType = Field(
        ...,
        alias="digitalTwinType",
        description="Type of digital twin (PartType or PartInstance)",
    )
    information: Optional[str] = Field(
        default=None,
        description="Optional human-readable description",
    )
    list_of_items: List[UniqueIdPushItem] = Field(
        ...,
        alias="listOfItems",
        min_length=1,
        description="Non-empty list of items being pushed to the parent",
    )

    model_config = {"populate_by_name": True}


class UniqueIdPushConnectToParentRequest(BaseModel):
    """
    Full request body for POST /uniqueidpush/connect-to-parent.

    Contains a standard Catena-X message header (v3.0.0) and the
    Unique ID Push content payload.
    """
    header: NotificationHeader = Field(
        ...,
        description="Message header (io.catenax.shared.message_header:3.0.0)",
    )
    content: UniqueIdPushContent = Field(
        ...,
        description="Unique ID Push notification content",
    )

    model_config = {"populate_by_name": True}

    def to_notification(self) -> Notification:
        """
        Convert to the generic SDK Notification model for internal storage.

        This bridges the strongly-typed Unique ID Push request into the
        generic notification format used by the persistence layer.
        """
        # Build a NotificationContent with extra fields allowed
        notification_content = NotificationContent(
            information=self.content.information,
            # Store the full typed payload as extra fields
            digitalTwinType=self.content.digital_twin_type.value,
            listOfItems=[
                item.model_dump(by_alias=True, exclude_none=True)
                for item in self.content.list_of_items
            ],
        )

        return Notification(
            header=self.header,
            content=notification_content,
        )
