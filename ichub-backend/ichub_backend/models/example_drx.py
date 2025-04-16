#################################################################################
# Eclipse Tractus-X - Industry Core Hub Backend
#
# Copyright (c) 2025 DRÄXLMAIER Group
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
from typing import Any, Dict, List, Optional

from sqlmodel import Column, Field, Relationship, SQLModel, UniqueConstraint
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
    # TODO: create extra foreign key attribute if needed

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

class TwinAspect(SQLModel, table=True):
    """An aspect (document) associated to a certain twin"""

    id: Optional[int] = Field(default=None, primary_key=True)
    """Technical identifier of the twin aspect"""

    semantic_id: str = Field(index=True)
    """The semantic id identifying the related aspect model of the aspect document"""

    dtr_submodel_id: uuid.UUID = Field(default_factory=uuid.uuid4)
    """The unique (technical) identifier of the submodel descriptor in the Digital Twin Registry (DTR)"""

    twin_id: Optional[int] = Field(foreign_key="twin.id")
    """The foreign key to the twin table"""

    __table_args__ = (UniqueConstraint('twin_id', 'semantic_id', name='uc_twin_semantic_id'))


class Twin(SQLModel, table=True):
    """A digital twin in the Catena-X ecosystem"""

    id: Optional[int] = Field(default=None, primary_key=True)
    """Technical identifier of the twin"""

    catenax_id: uuid.UUID = Field(default_factory=uuid.uuid4, unique=True, index=True)
    """The unique business key for the digital twin in the Catena-X ecosystem - known as `Global ID` or `Catena-X ID`"""

    dtr_aas_id: uuid.UUID = Field(default_factory=uuid.uuid4, unique=True)
    """The unique (technical) identifier of the shell descriptor in the Digital Twin Registry (DTR)"""

    data_exchange_agreement: DataExchangeAgreement = Field(index=True)
    """The data exchange agreement under which the twin is created"""

    created_date: datetime = Field(default_factory=datetime.now, index=True)
    """The date and time when the twin was created"""

    modified_date: datetime = Field(default_factory=datetime.now, index=True)
    """The date and time when the twin was last modified"""

    custom_data: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSON))
    """Custom additinal information attached to the twin that might be useful for consuming applications"""

    aspects: List[TwinAspect] = Relationship() # TODO: check if how we can nicely model the one-to-many relationship here
    """The list of aspects associated to that twin"""

    asset_class: str # TODO: was needed in older release as being part of the shortId in the DTR shell, maybe no longer needed

class TwinRegistration(SQLModel, table=True):
    """Represents a twin being associated/registred within a certain enablement service stack"""

    enablement_service_stack: EnablementServiceStack = Field(primary_key=True, index=True)
    """The enable service stack where the twin is registered"""
    # TODO: create extra foreign key attribute if needed

    twin: Twin = Field(primary_key=True, index=True)
    """The reference to the registred twin"""
    # TODO: create extra foreign key attribute if needed

    dtr_registered: bool = Field(default=False, index=True)
    """The actual registration status of the twin as a shell descriptor within the Digital Twin Registry"""

class TwinAspectRegistrationStatus(enum.Enum):
    """An enumeration of potential status values when a twin aspect is registered within the system"""

    PLANNED = 0
    """An aspect is just planned to be registered but not yet actually done"""

    STORED = 1
    """The apect document is stored within the submodel service"""

    EDC_REGISTERED = 2
    """In addition to being stored within the submodel service an aspect is also registered within the Eclipse Dataspace Connector as an asset (if necessary)"""

    DTR_REGISTERED = 3
    """The aspect is store in all related systems: submodel service, Eclipse Dataspace Connector and Digital Twin Registry"""

class TwinsAspectRegistrationMode(enum.Enum):
    """An enumeration of potential possibilities how to provide aspects as assets wihtin the Eclipse Dataspace Connector"""
    
    SINGLE = 1
    """A extra asset has been generated within the Eclipse Dataspace Connector for the aspect document"""

    DISPATCHED = 2
    """No extra asset has been generated within the Eclipse Dataspace Connector for the aspect document - instead there is a bundle asset that points to a dispatching service"""

class TwinAspectRegistration(SQLModel, table=True):
    """Represents a twin aspect being associated/registred within a certain enablement service stack"""

    enablement_service_stack: EnablementServiceStack = Field(primary_key=True, index=True)
    """The enable service stack where the twin aspect is registered"""
    # TODO: create extra foreign key attribute if needed

    twin_aspect: TwinAspect = Field(primary_key=True, index=True)
    """The reference to the registred twin"""
    # TODO: create extra foreign key attribute if needed

    status: TwinAspectRegistrationStatus = Field(default=TwinAspectRegistrationStatus.PLANNED, index=True)
    """The progress / status of the registration in the related backend services"""

    mode: TwinsAspectRegistrationMode
    """The way how the aspect is provided as an asset within the Eclipse Dataspace Connector"""

    created_date: datetime = Field(default_factory=datetime.now, index=True)
    """The point in time where the registration was first announced or started"""

    modified_date: datetime = Field(default_factory=datetime.now, index=True)
    """The point in time of the last status change of the registration"""

class PartType(SQLModel, table=True):
    """Holds the type information (part numbers) of a registred part"""

    id: Optional[int] = Field(default=None, primary_key=True)
    """Technical identifier of the part type information entry"""

    manufacturer_part_id: str = Field(index=True, unique=True)
    """The manufacturer part id of the related part"""

    customer_part_id: Optional[str] = Field(default=None, index=True)
    """The optional customer part id of the related part"""

class CatalogPart(SQLModel, table=True):
    """Represents details about a twin/part of type 'catalog part'"""

    twin: Twin = Field(primary_key=True, index=True)
    """Relationship to a twin of the given part type"""
    # TODO: create extra foreign key attribute if needed

    part_type: PartType = Field(primary_key=True, index=True)
    """Link to the respective part type information"""
    # TODO: create extra foreign key attribute if needed

class SerialPart(SQLModel, table=True):
    """Represents details about a twin/part of type 'serial part'"""

    twin: Twin = Field(primary_key=True, index=True)
    """Relationship to a twin of the given part type"""
    # TODO: create extra foreign key attribute if needed

    part_type: PartType = Field(primary_key=True, index=True)
    """Link to the respective part type information"""
    # TODO: create extra foreign key attribute if needed

    part_instance_id: str = Field(index=True)
    """The part instance id of the serial part"""

    van: Optional[str] = Field(default=None, index=True)
    """The optional VAN if the serial part represents a vehicle"""
    # TODO: create a composite unique key with part_type and part_instance_id

class BatchPart(SQLModel, table=True):
    """Represents details about a twin/part of type 'batch part'"""

    twin: Twin = Field(primary_key=True, index=True)
    """Relationship to a twin of the given part type"""
    # TODO: create extra foreign key attribute if needed

    part_type: PartType = Field(primary_key=True, index=True)
    """Link to the respective part type information"""
    # TODO: create extra foreign key attribute if needed

    batch_id: str = Field(index=True)
    """The batch instance id of the part batch"""
    # TODO: create a composite unique key with part_type and batch_id

class JISPart(SQLModel, table=True):
    """Represents details about a twin/part of type 'JIS part'"""

    twin: Twin = Field(primary_key=True, index=True)
    """Relationship to a twin of the given part type"""
    # TODO: create extra foreign key attribute if needed

    part_type: PartType = Field(primary_key=True, index=True)
    """Link to the respective part type information"""
    # TODO: create extra foreign key attribute if needed

    jis_number: str = Field(index=True)
    """The JIS number id of the part"""

    parent_order_number: Optional[str] = Field(default=None, index=True)
    """The optional parent order number of the part"""

    jis_call_date: Optional[datetime] = Field(default=None, index=True)
    """The optional JIS call date related to the part"""

    # TODO: create a composite unique key with part_type and jis_number ???

class UIDPushStatus(enum.Enum):
    """An enumeration listing potential status values of a UID push transfer"""

    SCHEDULED = 10
    """A UID push transfer is planned/scheduled but not yet done"""

    SENDING = 20
    """The UID push message is currently being transmitted"""

    SEND_OK = 30
    """The UID push message has been successfully transmitted"""

    SEND_NOK = 35
    """A problem occured while transmitting a UID push message"""

    FEEDBACK_OK = 40
    """The UID push message was transmitted an a positive feedback/confirmation from the partner was received"""

    FEEDBACK_NOK = 45
    """The UID push message was transmitted but a negative feedback/confirmation from the partner was received"""

class UIDPush(SQLModel, table=True):
    """Holds status information about a (potential) UID push notfication transmitted for a certain twin"""

    twin: Twin = Field(primary_key=True, index=True)
    """The twin to be pushed"""
    # TODO: create extra foreign key attribute if needed

    message_id: Optional[uuid.UUID] = Field(default=None, default_factory=uuid.uuid4, index=True)
    """The unique message ID of the (exchanged) UID push message"""
    
    status: UIDPushStatus = Field(default=UIDPushStatus.SCHEDULED, index=True)
    """The status of the UID push message transmission"""

    status_message: Optional[str] = Field(default=None)
    """An optional status message containing further details about the message transmission"""

    created_date: datetime = Field(default_factory=datetime.now, index=True)
    """The point in time where this protocol entry was created"""

    modified_date: datetime = Field(default_factory=datetime.now, index=True)
    """The point in time of the last status update of the UID push message transmission"""