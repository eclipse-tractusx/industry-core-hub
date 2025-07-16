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
# Unless required by routerlicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND,
# either express or implied. See the
# License for the specific language govern in permissions and limitations
# under the License.
#
# SPDX-License-Identifier: Apache-2.0
#################################################################################

from pydantic import BaseModel, Field

from pydantic import BaseModel, Field
from typing import List, Optional


class ConnectionDetails(BaseModel):
    counter_party_id: str = Field(..., description="Unique ID of the counter party")
    service_type: Optional[str] = Field(None, description="Optional type of service")


class ConnectionDescription(BaseModel):
    connection_id: str = Field(..., description="Unique ID of the connection")
    target_id: str = Field(..., description="ID of the connected target")
    service_type: Optional[str] = Field(None, description="Type of service")
    counter_party_address: str = Field(None, description="Address of the counter party connector")
    transfer_process_id: str = Field(None, description="ID of the transfer process if applicable")
    policy_checksum: Optional[str] = Field(None, description="Checksum of the policy applied to the connection")


class PossibleConnections(BaseModel):
    possible_connections: List[ConnectionDescription] = Field(..., description="List of possible connections")


class StartConnection(BaseModel):
    counter_party_id: str = Field(..., description="Unique ID of the counter party")
    target_id: str = Field(..., description="ID of the target to connect to")
    policies: list[dict] = Field(..., description="Policies to be applied for the connection")
    counter_party_address: str = Field(None, description="Address of the counter party connector")


class ForgetConnection(BaseModel):
    connection_id: str = Field(..., description="ID of the connection to forget")