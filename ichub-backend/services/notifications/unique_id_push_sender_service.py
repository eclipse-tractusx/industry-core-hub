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

from typing import Optional
from uuid import UUID

from managers.config.log_manager import LoggingManager
from models.metadata_database.notification.models import NotificationDirection
from models.services.notification.unique_id_push import (
    DigitalTwinType,
    PartItem,
    UniqueIdPushConnectToParentRequest,
    UniqueIdPushContent,
)
from services.notifications.notifications_management_service import NotificationsManagementService
from tools.constants import INDUSTRY_CORE_HUB
from tractusx_sdk.industry.models.notifications import NotificationHeader

logger = LoggingManager.get_logger(__name__)

CONNECT_TO_PARENT_CONTEXT = "IndustryCore-UniqueIDPush-ConnectToParent:2.0.0"


class UniqueIdPushSenderService:
    """Service for sending outgoing Unique ID Push notifications."""

    def __init__(self, notifications_management_service: NotificationsManagementService):
        self.notifications_management_service = notifications_management_service

    def send_connect_to_parent(
        self,
        sender_bpn: str,
        receiver_bpn: str,
        manufacturer_part_id: str,
        catena_x_id: str,
        customer_part_id: Optional[str] = None,
    ) -> Optional[UUID]:
        """
        Build and send a Unique ID Push Connect-to-Parent notification.

        Per CX-0126 v2.1.1 § 4.1, this notification is sent from the supplier
        (data provider) to the customer (data consumer) after a digital twin
        has been created and shared.

        Args:
            sender_bpn: BPNL of the sending manufacturer.
            receiver_bpn: BPNL of the receiving customer.
            manufacturer_part_id: Manufacturer part ID of the shared part.
            catena_x_id: The Catena-X ID (globalAssetId / twin global_id) of the twin.
            customer_part_id: Optional customer part ID mapping.

        Returns:
            The message_id of the created notification on success, None on failure.
        """
        try:
            # Ensure catena_x_id is URN-prefixed
            catena_x_id_str = str(catena_x_id)
            if not catena_x_id_str.startswith("urn:uuid:"):
                catena_x_id_str = f"urn:uuid:{catena_x_id_str}"

            header = NotificationHeader(
                context=CONNECT_TO_PARENT_CONTEXT,
                senderBpn=sender_bpn,
                receiverBpn=receiver_bpn,
            )

            item = PartItem(
                manufacturerId=sender_bpn,
                manufacturerPartId=manufacturer_part_id,
                customerPartId=customer_part_id,
                catenaXId=catena_x_id_str,
            )

            content = UniqueIdPushContent(
                digitalTwinType=DigitalTwinType.PART_TYPE,
                listOfItems=[item],
            )

            request = UniqueIdPushConnectToParentRequest(
                header=header,
                content=content,
            )

            notification = request.to_notification()

            # Persist as outgoing notification
            entity = self.notifications_management_service.create_notification(
                notification, NotificationDirection.OUTGOING, INDUSTRY_CORE_HUB
            )

            # Send via EDC data plane (DSP URL resolved automatically from BPN)
            self.notifications_management_service.send_notification(
                message_id=entity.message_id,
                endpoint_url=None,
                provider_bpn=receiver_bpn,
                provider_dsp_url=None,
                list_policies=None,
            )

            logger.info(
                f"UniqueIdPush connect-to-parent sent successfully "
                f"[message_id={entity.message_id}, receiver={receiver_bpn}]"
            )
            return entity.message_id

        except Exception as e:
            logger.warning(
                f"Failed to send UniqueIdPush connect-to-parent notification "
                f"to {receiver_bpn}: {e}"
            )
            return None
