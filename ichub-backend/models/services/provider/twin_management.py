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

from datetime import datetime
import enum
from uuid import UUID
from typing import Dict, Optional, List, Any
from pydantic import BaseModel, Field

from models.services.provider.part_management import (
    BatchCreate,
    CatalogPartBase,
    CatalogPartDetailsRead,
    JISPartCreate,
    SerializedPartBase,
    SerializedPartRead,
    SerializedPartDetailsRead,
)
from models.services.provider.partner_management import DataExchangeAgreementRead

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
    
    PLANNED = 0
    """An aspect is just planned to be registered but not yet actually done"""

    SINGLE = 1
    """A extra asset has been generated within the Eclipse Dataspace Connector for the aspect document"""

    DISPATCHED = 2
    """No extra asset has been generated within the Eclipse Dataspace Connector for the aspect document - instead there is a bundle asset that points to a dispatching service"""

class TwinAspectRegistration(BaseModel):
    """Represents the registration of a twin aspect within a DTR."""

    status: TwinAspectRegistrationStatus = Field(description="The current status of the aspect registration process.")
    mode: TwinsAspectRegistrationMode = Field(description="The current mode of the aspect registration process.")
    created_date: datetime = Field(alias="createdDate", description="The date when the aspect was initially registered.")
    modified_date: datetime = Field(alias="modifiedDate", description="The date when the registration status information last changed.")

class TwinAspectRead(BaseModel):
    semantic_id: str = Field(alias="semanticId", description="The semantic ID of the aspect determining the structure of the associated payload data.")
    submodel_id: UUID = Field(alias="submodelId", description="The ID of the submodel descriptor within the DTR shell descriptor for the associated twin.")
    registrations: Optional[Dict[str, TwinAspectRegistration]] = Field(description="A map of registration information for the aspect in different twin registries. The key is the name of the twin registry.", default={})

class TwinAspectCreate(BaseModel):
    global_id: UUID = Field(alias="globalId", description="The Catena-X ID / global ID of the digital twin to which the new aspect belongs.")
    semantic_id: str = Field(alias="semanticId", description="The semantic ID of the new aspect determining the structure of the associated payload data.")
    submodel_id: Optional[UUID] = Field(alias="submodelId", description="The optional ID of the submodel descriptor within the DTR shell descriptor for the associated twin. If not specified, a new UUID will be created automatically.", default=None) 
    payload: Dict[str, Any] = Field(description="The payload data of the new aspect. This is a JSON object that contains the actual data of the aspect. The structure of this object is determined by the semantic ID of the aspect.")

class TwinRead(BaseModel):
    """Represents a digital twin within the Digital Twin Registry."""

    global_id: UUID = Field(alias="globalId", description="The Catena-X ID / global ID of the digital twin.")
    dtr_aas_id: UUID = Field(alias="dtrAasId", description="The shell descriptor ID ('AAS ID') of the digital twin in the Digital Twin Registry.") 
    created_date: datetime = Field(alias="createdDate", description="The date when the digital twin was created.")
    modified_date: datetime = Field(alias="modifiedDate", description="The date when the digital twin was last modified.")
    shares: Optional[List[DataExchangeAgreementRead]] = Field(description="A list of data exchange agreements the digital twin is shared via.", default=None)

class TwinCreateBase(BaseModel):
    """Represents a digital twin to be created within the Digital Twin Registry."""

    global_id: Optional[UUID] = Field(alias="globalId", description="Optionally the Catena-X ID / global ID of the digital twin to create. If not specified, a new UUID will be created automatically.", default=None)
    dtr_aas_id: Optional[UUID] = Field(alias="dtrAasId", description="Optionally the shell descriptor ID ('AAS ID') of the digital twin in the Digital Twin Registry. If not specified, a new UUID will be created automatically.", default=None)
    id_short: Optional[str] = Field(alias="idShort", description="Optionally the idShort of the digital twin in the Digital Twin Registry. If not specified, a default value 'Twin-{globalId}' will be used.", default=None)

class TwinDetailsReadBase(BaseModel):
    additional_context: Optional[Dict[str, Any]] = Field(alias="additionalContext", description="Additional context information about the digital twin. This can include various metadata or properties associated with the twin. Intended for handling twins by third party apps.", default=None)
    registrations: Optional[Dict[str, bool]] = Field(description="A map of registration information for the digital twin in different DTRs. The key is the name of the DTR.", default=None)
    all_aspects: Optional[List[TwinAspectRead]] = Field(alias="allAspects", description="A complete list of all aspect information for the digital twin, including multiple aspects with the same semantic ID.", default=None)
    aspects: Optional[Dict[str, TwinAspectRead]] = Field(description="A map of aspect information for the digital twin. The key is the semantic ID of the aspect. The value is a TwinAspectRead object containing details about the aspect. For backward compatibility, only the first aspect of each semantic type is included.", default=None)

class TwinShareCreateBase(BaseModel):
    business_partner_number: str = Field(alias="businessPartnerNumber", description="The business partner number of the business partner with which the catalog part is shared.")
    #data_exchange_agreement_name: str = Field(alias="dataExchangeAgreementName", description="The name of the data exchange agreement under which the catalog part is shared.")

class CatalogPartTwinRead(CatalogPartDetailsRead, TwinRead):
    """Represents a catalog part twin within the Digital Twin Registry."""

class CatalogPartTwinCreate(CatalogPartBase, TwinCreateBase):
    pass

class CatalogPartTwinDetailsRead(CatalogPartTwinRead, TwinDetailsReadBase):
    """Represents the details of a catalog part twin within the Digital Twin Registry."""

class CatalogPartTwinShareCreate(CatalogPartBase, TwinShareCreateBase):
    pass

class BatchTwinCreate(BatchCreate, TwinCreateBase):
    pass

class JISPartTwinCreate(JISPartCreate, TwinCreateBase):
    pass

class SerializedPartTwinCreate(SerializedPartBase, TwinCreateBase):
    pass

class SerializedPartTwinRead(SerializedPartRead, TwinRead):
    """Represents a serialized part twin within the Digital Twin Registry."""

class SerializedPartTwinDetailsRead(SerializedPartDetailsRead, TwinRead, TwinDetailsReadBase):
    """Represents the details of a serialized part twin within the Digital Twin Registry."""

class SerializedPartTwinShareCreate(SerializedPartBase):
    # Hint: we don't need the TwinShareCreateBase here, because a serialized part has already a link to a single business partner
    pass

class SerializedPartTwinUnshareCreate(BaseModel):
    aas_id: UUID = Field(alias="aasId", description="The AAS ID of the serialized part twin to unshare.")
    business_partner_number_to_unshare: list[str] = Field(alias="businessPartnerNumberToUnshare", description="The business partner number of the business partner with which the serialized part twin should be unshared.")
    manufacturer_id: str = Field(alias="manufacturerId", description="The manufacturer ID of the serialized part twin to unshare.")
    asset_id_names_filter: Optional[List[str]] = Field(alias="assetIdNamesFilter", description="An optional list of asset ID names to filter the serialized part twin unshare operation. If provided, only asset IDs with names in this list will be considered for unsharing.", default=None)
