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
from pydantic import BaseModel, Field, ConfigDict
from models.metadata_database.pcf.models import PcfExchangeEntity



class PcfExchangeModel(BaseModel):
    """Model for representing a PCF exchange."""
    model_config = ConfigDict(populate_by_name=True)
    
    request_id: str = Field(
        alias="requestId",
        description="Unique identifier for the PCF request."
    )
    manufacturer_part_id: Optional[str] = Field(
        alias="manufacturerPartId",
        default=None,
        description="Manufacturer part ID associated with the PCF exchange."
    )
    customer_part_id: Optional[str] = Field(
        alias="customerPartId",
        default=None,
        description="Customer part ID associated with the PCF exchange."
    )
    requesting_bpn: str = Field(
        alias="requestingBpn",
        description="Business Partner Number of the requesting party (data consumer)."
    )
    target_bpn: str = Field(
        alias="targetBpn",
        description="Business Partner Number of the target party (data provider)."
    )
    status: str = Field(
        description="Current status of the PCF exchange (e.g., delivered, updated, pending, rejected)."
    )
    type: str = Field(
        description="Type of the PCF exchange (e.g., request, response)."
    )
    message: Optional[str] = Field(
        default=None,
        description="Optional message or note associated with the PCF exchange."
    )
    pcf_location: Optional[str] = Field(
        alias="pcfLocation",
        default=None,
        description="Location/URI where the PCF data is stored (e.g., submodel://...)."
    )
    pcf_data: Optional[Dict[str, Any]] = Field(
        alias="pcfData",
        default=None,
        description="The actual PCF data payload, if included in the response."
    )

    @staticmethod
    def from_entity(entity: PcfExchangeEntity) -> "PcfExchangeModel":
        """Factory method to create a PcfExchangeModel from a database entity."""
        return PcfExchangeModel(
            requestId=str(entity.request_id),
            manufacturerPartId=entity.manufacturer_part_id,
            customerPartId=entity.customer_part_id,
            requestingBpn=entity.requesting_bpn,
            targetBpn=entity.responding_bpn,
            status=entity.status.value,
            type=entity.type.value,
            message=entity.message,
            pcfLocation=entity.pcf_location
        )

class PcfRelationshipModel(BaseModel):
    """Model for returning relationships between main parts and sub-parts."""
    model_config = ConfigDict(populate_by_name=True)
    
    main_manufacturer_part_id: str = Field(
        alias="mainManufacturerPartId",
        description="The manufacturer part ID of the main part."
    )
    list_sub_manufacturer_part_ids: List[PcfExchangeModel] = Field(
        alias="listSubManufacturerPartIds",
        description="A list of manufacturer part IDs for the sub-parts related to the main part."
    )

class PcfSubPartModel(BaseModel):
    """Model for representing a sub-part in the context of PCF relationships."""
    manufacturer_part_id: str = Field(
        alias="manufacturerPartId",
        description="The manufacturer part ID of the sub-part."
    )
    bpn : str = Field(
        alias="bpn",
        description="The Business Partner Number (BPN) associated with the sub-part."
    )

class PcfSpecificStateModel(BaseModel):
    """Model for representing the global state of PCF exchanges."""
    model_config = ConfigDict(populate_by_name=True)
    
    manufacturer_part_id: str = Field(
        alias="manufacturerPartId"
    )
    total_sub_parts: int = Field(
        alias="totalSubParts",
        description="Total number of sub-parts related to the main part."
    )
    responded_sub_parts: int = Field(
        alias="respondedSubParts",
        description="Number of sub-parts for which a PCF response has been received."
    )
    progress_percentage: float = Field(
        alias="progressPercentage",
        description="Percentage of sub-parts that have received a PCF response."
    )
    overall_status: str = Field(
        alias="overallStatus",
        description="Overall status of the PCF exchange for the main part (e.g., pending, in progress, completed)."
    )