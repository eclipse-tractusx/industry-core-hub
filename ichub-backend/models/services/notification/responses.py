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

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel
from datetime import datetime
from typing import Optional, Dict, Any
from uuid import UUID

class NotificationResponse(BaseModel):
    """
    API response model for notifications.

    Field names follow camelCase (via alias_generator) so the response JSON
    is consistent with the camelCase keys used in request bodies and the
    underlying Catena-X notification schema.
    """
    id: int
    created_at: datetime
    message_id: UUID
    sender_bpn: str
    receiver_bpn: str
    direction: str
    status: str
    use_case: Optional[str] = None
    full_notification: Dict[str, Any]

    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,          # allow construction with snake_case kwarg names
        alias_generator=to_camel,       # serialize response JSON as camelCase
        json_schema_extra={
            "example": {
                "id": 1,
                "createdAt": "2026-02-27T15:04:07.319919Z",
                "messageId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                "senderBpn": "BPNL00000000024R",
                "receiverBpn": "BPNL000000000342",
                "direction": "incoming",
                "status": "received",
                "useCase": "Industry Core Hub",
                "fullNotification": {
                    "header": {
                        "messageId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                        "context": "IndustryCore-DigitalTwinEventAPI-ConnectToParent:3.0.0",
                        "sentDateTime": "2026-02-27T11:26:21.146000Z",
                        "senderBpn": "BPNL00000000024R",
                        "receiverBpn": "BPNL000000000342",
                        "version": "3.0.0"
                    },
                    "content": {
                        "information": "Hello",
                        "listOfAffectedItems": ["urn:uuid:b5f462a2-54e8-4034-85e2-2d663f1c2c2f"]
                    }
                }
            }
        }
    )
