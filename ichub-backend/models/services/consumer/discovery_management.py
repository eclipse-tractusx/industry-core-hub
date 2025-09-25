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

from pydantic import BaseModel, Field

from typing import List, Optional, Any, Dict

class DiscoverRegistriesRequest(BaseModel):
    counter_party_id: str = Field(alias="counterPartyId", description="The counter party ID of the part.")


class DiscoverShellRequest(DiscoverRegistriesRequest):
    id: str = Field(alias="id", description="The ID of the AAS.")
    dtr_policies: Optional[List[Dict[str, Any]]] = Field(None, alias="dtrGovernance", description="DTR policies to use for connection negotiation. If not provided, will use cached policies for automatic contract negotiation.")


class QuerySpec(BaseModel):
    name: str = Field(..., description="The name of the query specification.")
    value: str = Field(..., description="The value of the query specification.")


class DiscoveryWithPaginationRequest(DiscoverRegistriesRequest):
    limit: Optional[int] = Field(None, description="Maximum number of shells to return per page.")
    cursor: Optional[str] = Field(None, description="Cursor for pagination.")

class DiscoverShellsRequest(DiscoveryWithPaginationRequest):
    query_spec: List[QuerySpec] = Field(..., alias="querySpec", description="The query specifications for discovering shells.")
    dtr_policies: Optional[List[Dict[str, Any]]] = Field(None, alias="dtrGovernance", description="DTR policies to use for connection negotiation. If not provided, will use cached policies for automatic contract negotiation.")


class DiscoverSubmodelsDataRequest(DiscoverShellRequest):
    governance: Optional[Dict[str, List[Dict[str, Any]]]] = Field(
        None, 
        alias="governance", 
        description="Mapping of semantic IDs to their acceptable policies for submodel data retrieval."
    )

class DiscoverSubmodelDataRequest(DiscoverShellRequest):
    submodel_id: str = Field(None, alias="submodelId", description="The ID of the submodel.")
    governance: List[Dict[str, Any]] = Field(
        None, 
        alias="governance", 
        description="Policies to be accepted for this semantic ID."
    )

class DiscoverSubmodelSemanticIdDataRequest(DiscoverShellRequest):
    semantic_ids: Optional[List[Dict[str, str]]] = Field(None, alias="semanticIds", description="The semantic IDs of the submodel.")
    semantic_id: Optional[str] = Field(None, alias="semanticId", description="The semantic ID of the submodel.")

    governance: List[Dict[str, Any]] = Field(
        None, 
        alias="governance", 
        description="Policies to be accepted for this semantic ID."
    )