################################################################################
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
################################################################################

from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from uuid import UUID


class SendNotificationRequest(BaseModel):
    """
    Request body for sending an existing notification via the EDC connector.

    Fields
    ------
    message_id:
        UUID of the notification to send (must already exist in the database).
    endpoint_path:
        Path appended to the partner's DigitalTwinEventAPI dataplane URL
        (e.g. ``/connect-to-parent``). When omitted it is derived automatically
        from the notification's ``header.context`` field.
    provider_bpn:
        Business Partner Number of the target EDC participant.
    provider_dsp_url:
        DSP endpoint of the **partner's** EDC control-plane
        (e.g. ``https://edc-partner.example.net/api/v1/dsp``).
        When omitted the backend resolves it automatically via connector
        discovery for the given ``provider_bpn``.
    governance:
        Optional list of ODRL policy objects used to negotiate the contract
        with the partner's DigitalTwinEventAPI asset.
        When omitted the backend falls back to
        ``provider.digitalTwinEventAPI.policy.usage`` from ``configuration.yml``.
    """

    message_id: UUID = Field(..., description="UUID of the notification to send")
    endpoint_path: Optional[str] = Field(
        default=None,
        description="Path appended to the partner's DigitalTwinEventAPI dataplane URL (e.g. /connect-to-parent). Derived automatically from the notification context when omitted."
    )
    provider_bpn: str = Field(..., description="BPN of the target EDC participant")
    provider_dsp_url: Optional[str] = Field(
        default=None,
        description="DSP URL of the partner's EDC control-plane. When omitted it is resolved automatically via connector discovery for the given provider_bpn."
    )
    governance: Optional[List[Dict[str, Any]]] = Field(
        default=None,
        description=(
            "ODRL policy objects used to negotiate the DigitalTwinEventAPI contract. "
            "Falls back to provider.digitalTwinEventAPI.policy.usage in configuration.yml when omitted."
        )
    )

    model_config = {
        "json_schema_extra": {
            "example": {
                "message_id": "9cbb8a28-00ed-4d87-847f-00a37931e64a",
                "provider_bpn": "BPNL00000003CRHK",
                "provider_dsp_url": "https://edc-partner-control.int.catena-x.net/api/v1/dsp",
                "governance": [
                    {
                        "context": [
                            "https://w3id.org/catenax/2025/9/policy/odrl.jsonld",
                            "https://w3id.org/catenax/2025/9/policy/context.jsonld",
                            {"@vocab": "https://w3id.org/edc/v0.0.1/ns/"}
                        ],
                        "permission": [
                            {
                                "action": "use",
                                "constraint": {
                                    "and": [
                                        {"leftOperand": "FrameworkAgreement", "operator": "eq", "rightOperand": "DataExchangeGovernance:1.0"},
                                        {"leftOperand": "Membership", "operator": "eq", "rightOperand": "active"},
                                        {"leftOperand": "UsagePurpose", "operator": "isAnyOf", "rightOperand": "cx.core.industrycore:1"}
                                    ]
                                }
                            }
                        ],
                        "prohibition": [],
                        "obligation": []
                    }
                ]
            }
        }
    }
