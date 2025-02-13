#################################################################################
# Eclipse Tractus-X - Industry Core Hub Backend
#
# Copyright (c) DRÄXLMAIER Group
# (represented by Lisa Dräxlmaier GmbH)
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

import enum
import uuid
from datetime import datetime
from typing import Any, Dict, Optional

from sqlmodel import Field, SQLModel, Column
from sqlalchemy.types import JSON

class BusinessPartner(SQLModel, table=True):
    """A Catena-X partner with whom to exchange data"""

    id: Optional[int] = Field(default=None, primary_key=True)
    """Technical identifier of the business partner"""

    name: str = Field(index=True)
    """The (display) name of the business partner"""

    bpnl: str = Field(min_length=16, max_length=16, index=True)
    """The Catena-X Business Partner Number (BPNL) of the business partner"""

class DataExchangeAgreement(SQLModel, table=True):
    """A contractual (or other) relationship to a partner where specific data is exchange or a specific Catena-X use-case is performed"""

    id: Optional[int] = Field(default=None, primary_key=True)
    """Technical identifier of the data exchange agreement"""

    name: str = Field(index=True)
    """A speaking name identifying the data exchange agreement"""

    business_partner: BusinessPartner = Field(index=True)
    """Reference to the business partner with whom the data exchange agreement is made"""

    default_edc_url: Optional[str] = Field(default=None)
    """The URL of the primary/default EDC of the partner for this data exchange agreement"""

class EnablementServiceStack(SQLModel, table=True):
    """An instance/installation of the `Enablement services` stack
    
    The `Enablement services` stack is a set of services that are used to enable standardized exchange of data between partners.
    For this implementation, it need to consist at least of an Eclipse Dataspace Connector (EDC) and a Digital Twin Registry (DTR)."""

    id: Optional[int] = Field(default=None, primary_key=True)
    """Technical identifier of the enablement service stack"""

    name: str = Field(index=True)
    """A speaking name identifying the enablement service stack

    Examples: `Jupiter-1`, `Mars-2`, ..."""

    settings: Optional[Dict[str, str]] = Field(default=None, sa_column=Column(JSON))
    """Technical connect information (and other settings) for interacting with the services of the stack

    Idea: for the moment could be a generic JSON with key/value pairs - on a long term could be explicit fields - depending on future implementation    
    """

class Twin(SQLModel, table=True):
    """A digital twin in the Catena-X ecosystem"""

    id: Optional[int] = Field(default=None, primary_key=True)
    """Technical identifier of the twin"""

    catenax_id: uuid.UUID = Field(default_factory=uuid.uuid4, unique=True, index=True)
    """The unique business key for the digital twin in the Catena-X ecosystem - known as `Global ID` or `Catena-X ID`"""

    dtr_aas_id: uuid.UUID = Field(default_factory=uuid.uuid4, unique=True)
    """The unique (technical) identifier of the digital twin in the Digital Twin Registry (DTR)"""

    data_exchange_agreement: DataExchangeAgreement = Field(index=True)
    """The data exchange agreement under which the twin is created"""

    created_date: datetime = Field(default_factory=datetime.now, index=True)
    """The date and time when the twin was created"""

    modified_date: datetime = Field(default_factory=datetime.now, index=True)
    """The date and time when the twin was last modified"""

    custom_data: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSON))

    asset_class: str # TODO: was needed in older release as being part of the shortId in the DTR shell, maybe no longer needed

class TwinAspect(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    twin: Twin = Field(index=True)
    semantic_id: str = Field(index=True)
    dtr_submodel_id: uuid.UUID = Field(default_factory=uuid.uuid4)
    # TODO: create a composite unique key with twin and semantic_id

class TwinRegistration(SQLModel, table=True):
    enablement_service_stack: EnablementServiceStack = Field(primary_key=True, index=True)
    twin: Twin = Field(primary_key=True, index=True)
    dtr_registered: bool = Field(default=False, index=True)

class TwinAspectRegistrationStatus(enum.Enum):
    PLANNED = 0
    STORED = 1
    EDC_REGISTERED = 2
    DTR_REGISTERED = 3

class TwinsAspectRegistrationMode(enum.Enum):
    SINGLE = 1
    DISPATCHED = 2

class TwinAspectRegistration(SQLModel, table=True):
    enablement_service_stack: EnablementServiceStack = Field(primary_key=True, index=True)
    twin_aspect: TwinAspect = Field(primary_key=True, index=True)
    status: TwinAspectRegistrationStatus = Field(default=TwinAspectRegistrationStatus.PLANNED, index=True)
    mode: TwinsAspectRegistrationMode
    created_date: datetime = Field(default_factory=datetime.now, index=True)
    modified_date: datetime = Field(default_factory=datetime.now, index=True)

class PartType(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    manufacturer_part_id: str = Field(index=True, unique=True)
    customer_part_id: Optional[str] = Field(default=None, index=True)

class CatalogPart(SQLModel, table=True):
    twin: Twin = Field(primary_key=True, index=True)
    part_type: PartType = Field(primary_key=True, index=True)

class SerialPart(SQLModel, table=True):
    twin: Twin = Field(primary_key=True, index=True)
    part_type: PartType = Field(primary_key=True, index=True)
    part_instance_id: str = Field(index=True)
    van: Optional[str] = Field(default=None, index=True)
    # TODO: create a composite unique key with part_type and part_instance_id

class BatchPart(SQLModel, table=True):
    twin: Twin = Field(primary_key=True, index=True)
    part_type: PartType = Field(primary_key=True, index=True)
    batch_id: str = Field(index=True)
    # TODO: create a composite unique key with part_type and batch_id

class JISPart(SQLModel, table=True):
    twin: Twin = Field(primary_key=True, index=True)
    part_type: PartType = Field(primary_key=True, index=True)
    jis_number: str = Field(index=True)
    parent_order_number: Optional[str] = Field(default=None, index=True)
    jis_call_date: Optional[datetime] = Field(default=None, index=True)
    # TODO: create a composite unique key with part_type and jis_number ???

class UIDPushStatus(enum.Enum):
    SCHEDULED = 10
    SENDING = 20
    SEND_OK = 30
    SEND_NOK = 35
    FEEDBACK_OK = 40
    FEEDBACK_NOK = 45

class UIDPush(SQLModel, table=True):
    twin: Twin = Field(primary_key=True, index=True)
    message_id: Optional[uuid.UUID] = Field(default=None, default_factory=uuid.uuid4, index=True)
    status: UIDPushStatus = Field(default=UIDPushStatus.SCHEDULED, index=True)
    status_message: Optional[str] = Field(default=None)
    created_date: datetime = Field(default_factory=datetime.now, index=True)
    modified_date: datetime = Field(default_factory=datetime.now, index=True)