#################################################################################
# Eclipse Tractus-X - Software Development KIT
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

from sqlmodel import SQLModel, Field
from sqlalchemy import JSON
from sqlmodel import Column
from datetime import datetime
from typing import List

class KnownConnectors(SQLModel):
    """
    Represents cached connector information for a specific Business Partner Number Legal Entity (BPNL).
    
    This table stores the discovered connectors for each BPNL along with timestamps
    for cache management and expiration.
    """

    bpnl: str = Field(primary_key=True, index=True, description="Business Partner Number Legal Entity")
    connectors: List[str] = Field(sa_column=Column(JSON), description="List of connector URLs for this BPNL")
    expires_at: datetime = Field(index=True, description="When this cache entry expires")


class KnownDtrs(SQLModel):
    """
    Represents cached DTR information for a specific Business Partner Number Legal Entity (BPNL).
    
    This table stores the discovered DTRs for each BPNL along with timestamps
    for cache management and expiration, including the EDC URL, asset ID, and policies.
    """

    bpnl: str = Field(primary_key=True, index=True, description="Business Partner Number Legal Entity")
    edc_url: str = Field(description="URL of the EDC where the DTR is stored")
    asset_id: str = Field(description="Asset ID of the DTR")
    policies: List[str] = Field(sa_column=Column(JSON), description="List of policies for this DTR")
    expires_at: datetime = Field(index=True, description="When this cache entry expires")

