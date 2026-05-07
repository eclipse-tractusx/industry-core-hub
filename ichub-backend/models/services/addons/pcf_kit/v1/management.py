#################################################################################
# Eclipse Tractus-X - Industry Core Hub Backend
#
# Copyright (c) 2026 LKS NEXT
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

"""Pydantic models for PCF Kit management API endpoints."""

from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class PcfResponseStatus(str, Enum):
    """Status values for PCF responses."""
    DELIVERED = "delivered"
    UPDATED = "updated"
    PENDING = "pending"
    REJECTED = "rejected"


class SendPcfRequestModel(BaseModel):
    """Model for sending a new PCF request as a data consumer."""
    manufacturer_part_id: Optional[str] = Field(
        alias="manufacturerPartId",
        default=None,
        description="Manufacturer part ID for the product. At least one of manufacturerPartId or customerPartId must be provided."
    )
    customer_part_id: Optional[str] = Field(
        alias="customerPartId",
        default=None,
        description="Customer part ID for the product. At least one of manufacturerPartId or customerPartId must be provided."
    )
    requesting_bpn: str = Field(
        alias="requestingBpn",
        description="Business Partner Number of the requesting party (data consumer)."
    )
    target_bpn: str = Field(
        alias="targetBpn",
        description="Business Partner Number of the target data provider."
    )
    message: Optional[str] = Field(
        default=None,
        description="Optional message to include with the request."
    )
    list_policies: Optional[List[Dict]] = Field(
        alias="listPolicies",
        default=None,
        description="List of allowed policies for contract negotiation."
    )


class SendOrUpdatePcfResponseModel(BaseModel):
    """Model for sending or updating a PCF response as a data provider.

    The PCF payload is always retrieved from the product-scoped store keyed
    by ``manufacturerPartId``.  The provider only needs to specify which
    request to respond to and their BPN.
    """
    responding_bpn: str = Field(
        alias="respondingBpn",
        description="Business Partner Number of the responding party (data provider)."
    )
    status: Optional[PcfResponseStatus] = Field(
        default=PcfResponseStatus.DELIVERED,
        description="Status of the PCF response."
    )
    message: Optional[str] = Field(
        default=None,
        description="Optional message to include with the response."
    )
    list_policies: Optional[List[Dict]] = Field(
        alias="listPolicies",
        default=None,
        description="List of allowed policies for contract negotiation."
    )


class UploadPcfDataModel(BaseModel):
    """Model for uploading or updating PCF data for a product."""
    pcf_data: Dict[str, Any] = Field(
        alias="pcfData",
        description="The PCF payload conforming to the Catena-X PCF 9.0.0 schema."
    )
