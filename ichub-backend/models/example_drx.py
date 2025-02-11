#################################################################################
# Eclipse Tractus-X - Industry Core Hub Backend
#
# Copyright (c) Lisa Dräxlmaier GmbH
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
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    bpn: str = Field(min_length=16, max_length=16, index=True)

class DataExchangeAgreement(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    business_partner: BusinessPartner = Field(index=True)
    default_edc: Optional[str] = Field(default=None)

class EnablementServiceStack(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    settings: Optional[Dict[str, str]] = Field(default=None, sa_column=Column(JSON))

class Twin(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    catenax_id: uuid.UUID = Field(default_factory=uuid.uuid4, unique=True, index=True)
    dtr_aas_id: uuid.UUID = Field(default_factory=uuid.uuid4, unique=True)
    data_exchange_agreement: DataExchangeAgreement = Field(index=True)
    asset_class: str
    created_date: datetime = Field(default_factory=datetime.now, index=True)
    modified_date: datetime = Field(default_factory=datetime.now, index=True)
    custom_data: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSON))

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