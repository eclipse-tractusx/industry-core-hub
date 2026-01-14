#################################################################################
# Eclipse Tractus-X - Industry Core Hub Backend
#
# Copyright (c) 2025 Contributors to the Eclipse Foundation
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

from typing import Dict, Any, Optional, List
from pydantic import BaseModel, Field


class DiscoverDppRequest(BaseModel):
    """Request model for discovering a Digital Product Passport"""
    id: str = Field(
        description="The identifier in format 'CX:<manufacturerPartId>:<partInstanceId>'"
    )
    semantic_id: str = Field(
        alias="semanticId",
        description="The semantic ID of the submodel to retrieve (e.g., 'urn:samm:io.catenax.generic.digital_product_passport:6.1.0#DigitalProductPassport')"
    )
    dtr_policies: Optional[List[Dict[str, Any]]] = Field(
        None,
        alias="dtrPolicies",
        description="Policies to apply for DTR (Digital Twin Registry) access"
    )
    governance: Optional[Dict[str, Any]] = Field(
        None,
        description="Governance policies for submodel consumption (passport data access)"
    )

    class Config:
        populate_by_name = True


class DiscoveryStatus(BaseModel):
    """Status model for discovery progress"""
    status: str = Field(
        description="Current status: 'in_progress', 'completed', 'failed'"
    )
    step: str = Field(
        description="Current step: 'parsing', 'discovering_bpn', 'retrieving_twin', 'looking_up_submodel', 'consuming_data', 'complete'"
    )
    message: str = Field(
        description="Human-readable status message"
    )
    progress: int = Field(
        description="Progress percentage (0-100)"
    )

    class Config:
        populate_by_name = True


class DiscoverDppResponse(BaseModel):
    """Response model for DPP discovery operation"""
    task_id: str = Field(
        alias="taskId",
        description="Unique identifier for tracking this discovery task"
    )
    status: DiscoveryStatus = Field(
        description="Current discovery status"
    )
    digital_twin: Optional[Dict[str, Any]] = Field(
        None,
        alias="digitalTwin",
        description="The discovered digital twin shell descriptor"
    )
    data: Optional[Dict[str, Any]] = Field(
        None,
        description="The consumed DPP data"
    )

    class Config:
        populate_by_name = True
