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

from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Dict, Any
from uuid import UUID

class NotificationResponse(BaseModel):
    """
    API response model for notifications.
    
    This model ensures proper serialization of notification data when returned
    from API endpoints. It maps from the database entity to a clean, serializable
    format for the API consumer.
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
    
    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": 1,
                "created_at": "2026-02-27T15:04:07.319919Z",
                "message_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                "sender_bpn": "BPNL00000000024R",
                "receiver_bpn": "BPNL000000000342",
                "direction": "INCOMING",
                "status": "RECEIVED",
                "use_case": "Industry Core Hub",
                "full_notification": {
                    "header": {
                        "message_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                        "context": "IndustryCore-DigitalTwinEventAPI-ConnectToParent:3.0.0",
                        "sent_date_time": "2026-02-27T11:26:21.146000Z",
                        "sender_bpn": "BPNL00000000024R",
                        "receiver_bpn": "BPNL000000000342",
                        "version": "3.0.0"
                    },
                    "content": {
                        "information": "Hello",
                        "list_of_affected_items": ["DTR_Update"],
                        "additionalProp1": {}
                    }
                }
            }
        }
