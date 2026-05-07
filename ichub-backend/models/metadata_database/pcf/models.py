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

"""
Database models for Product Carbon Footprint (PCF) exchange tracking.

These SQLModel entities persist PCF request/response metadata in the database,
enabling tracking of PCF data exchanges between business partners.
"""

from datetime import datetime, timezone
from enum import Enum
from typing import List, Optional
from uuid import UUID, uuid4

from sqlalchemy import Column, JSON
from sqlmodel import SQLModel, Field


class PcfExchangeDirection(str, Enum):
    """Direction of the PCF exchange from the perspective of this system."""
    OUTGOING = "outgoing"  # We sent a request (consumer role)
    INCOMING = "incoming"  # We received a request (provider role)


class PcfExchangeStatus(str, Enum):
    """Status of a PCF exchange."""
    PENDING = "pending"          # Request sent, awaiting response
    DELIVERED = "delivered"      # Response delivered successfully
    UPDATED = "updated"          # Response updated after initial delivery
    REJECTED = "rejected"        # Request was rejected
    FAILED = "failed"            # Exchange failed due to error
    CANCELLED = "cancelled"      # Exchange was cancelled

class PcfExchangeType(str, Enum):
    """Type of PCF exchange."""
    REQUEST = "request"          # Initial request for PCF data
    RESPONSE = "response"        # Response containing PCF data


class PcfExchangeEntity(SQLModel, table=True):
    """
    Tracks PCF data exchange requests and responses.

    This entity stores metadata about PCF exchanges, including the requesting
    and responding BPNs, part identifiers, and exchange status. The actual
    PCF payload is stored in the submodel service or referenced by location.

    Attributes:
        id: Primary key.
        request_id: Unique identifier for the PCF request (UUID).
        created_at: Timestamp when the exchange was initiated.
        updated_at: Timestamp of the last status update.
        direction: Whether this is an incoming or outgoing exchange.
        status: Current status of the exchange.
        requesting_bpn: BPN of the party requesting PCF data.
        responding_bpn: BPN of the party providing PCF data (if known).
        manufacturer_part_id: Manufacturer's part identifier.
        customer_part_id: Customer's part identifier (optional).
        message: Optional message associated with the exchange.
        pcf_location: URI/path where the PCF data payload is stored.
        correlation_id: Optional ID to correlate with external systems.
    """
    __tablename__ = "pcf_exchanges"

    id: Optional[int] = Field(default=None, primary_key=True)
    request_id: UUID = Field(
        default_factory=uuid4,
        index=True,
        description="Unique identifier for the PCF exchange request"
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Timestamp when the exchange was initiated"
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Timestamp of the last status update"
    )

    # Exchange metadata
    direction: PcfExchangeDirection = Field(
        default=PcfExchangeDirection.OUTGOING,
        index=True,
        description="Direction of exchange from this system's perspective"
    )
    status: PcfExchangeStatus = Field(
        default=PcfExchangeStatus.PENDING,
        index=True,
        description="Current status of the PCF exchange"
    )
    type: PcfExchangeType = Field(
        default=PcfExchangeType.REQUEST,
        index=True,
        description="Type of PCF exchange (request or response)"
    )

    # Business Partner information
    requesting_bpn: str = Field(
        index=True,
        description="BPN of the party requesting PCF data"
    )
    responding_bpn: Optional[str] = Field(
        default=None,
        index=True,
        description="BPN of the party providing PCF data"
    )

    # Part identification
    manufacturer_part_id: Optional[str] = Field(
        default=None,
        index=True,
        description="Manufacturer's part identifier"
    )
    customer_part_id: Optional[str] = Field(
        default=None,
        index=True,
        description="Customer's part identifier"
    )

    # Additional metadata
    message: Optional[str] = Field(
        default=None,
        description="Optional message associated with the exchange"
    )
    pcf_location: Optional[str] = Field(
        default=None,
        description="URI/path where the PCF data payload is stored"
    )
    correlation_id: Optional[str] = Field(
        default=None,
        index=True,
        description="Optional ID to correlate with external systems"
    ) 

class PcfRelationshipEntity(SQLModel, table=True):

    __tablename__ = "pcf_relationships"

    id: Optional[int] = Field(default=None, primary_key=True)
    main_manufacturer_part_id: str = Field(
        index=True,
        description="Manufacturer's part identifier for the main part"
    )
    list_sub_manufacturer_part_id: List[str] = Field(
        default_factory=list,
        sa_column=Column(JSON),
        description="List of manufacturer part identifiers for subparts related to the main part"
    )
