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
from typing import Any, Dict, Optional, List

import enum

from pydantic import BaseModel, Field

from models.metadata_database.provider.models import Material, Measurement
from models.services.provider.partner_management import BusinessPartnerRead
from tools.constants import PARENT_ORDER_NUMBER_DESCRIPTION, VAN_DESCRIPTION

class SharingStatus(enum.IntEnum):
    """The status of the part. (0: draft, 1: pending, 2: registered, 3: shared)"""

    DRAFT = 0
    """The aspect is in draft state and not yet finalized or submitted."""

    PENDING = 1
    """The aspect is pending approval or processing, twin is created in the database but not yet registered in the DTR"""

    REGISTERED = 2
    """The aspect has been registered as Digital Twin in the DTR, but not shared."""

    SHARED = 3
    """The aspect has been shared with a specific partner."""

class StatusBase(BaseModel):
    status: SharingStatus = Field(description="The status of the part. (0: draft, 1: pending, 2: registered, 3: shared)")

class CustomerPartIdBase(BaseModel):
    customer_part_id: str = Field(alias="customerPartId", description="The customer part ID for partner specific mapping of the catalog part.")

class PartnerRelatedPartReadBase(BaseModel):
    business_partner: BusinessPartnerRead = Field(alias="businessPartner", description="The business partner to whom the part is being offered.")

class PartnerRelatedPartCreateBase(BaseModel):
    business_partner_number: str = Field(alias="businessPartnerNumber", description="The unique BPNL of the business partner.")

class CatalogPartBase(BaseModel):
    manufacturer_id: str = Field(alias="manufacturerId", description="The BPNL (manufactuer ID) of the part to register.")
    manufacturer_part_id: str = Field(alias="manufacturerPartId", description="The manufacturer part ID of the part.")

class PartnerCatalogPartBase(PartnerRelatedPartCreateBase, CustomerPartIdBase):
    pass

class CatalogPartRead(CatalogPartBase):
    name: str = Field(description="The name of the part.")
    
    # New field that contains all metadata
    extra_metadata: Optional[Dict[str, Any]] = Field(
        alias="extraMetadata",
        description="Extended metadata for the catalog part, containing: description, category, bpns, materials, width, height, length, weight",
        default=None
    )

    # Deprecated fields - will be phased out in future versions
    category: Optional[str] = Field(description="[Deprecated] The category of the part. Use extra_metadata instead.", default=None)
    bpns: Optional[str] = Field(description="[Deprecated] The site number (BPNS) the part is attached to. Use extra_metadata instead.", default=None)

class CatalogPartReadWithStatus(CatalogPartRead, StatusBase):
    """Simple catalog part read model with status information."""

class CatalogPartDetailsRead(CatalogPartRead):
    customer_part_ids: Optional[Dict[str, BusinessPartnerRead]] = Field(alias="customerPartIds", description="The list of customer part IDs mapped to the respective Business Partners.", default={})

    # Deprecated fields - will be phased out in future versions
    description: Optional[str] = Field(description="[Deprecated] The description of the part. Use extra_metadata instead.", default=None)
    materials: Optional[List[Material]] = Field(description="[Deprecated] List of materials, e.g. [{'name':'aluminum','share':20.5}, {'name':'steel','share':75.25}] . Use extra_metadata instead.", default=[])
    width: Optional[Measurement] = Field(description="[Deprecated] The width of the part. Use extra_metadata instead.", default=None)
    height: Optional[Measurement] = Field(description="[Deprecated] The height of the part. Use extra_metadata instead.", default=None)
    length: Optional[Measurement] = Field(description="[Deprecated] The length of the part. Use extra_metadata instead.", default=None)
    weight: Optional[Measurement] = Field(description="[Deprecated] The weight of the part. Use extra_metadata instead.", default=None)

class CatalogPartDetailsReadWithStatus(CatalogPartDetailsRead, StatusBase):
    """Catalog part read model with status information."""

class CatalogPartCreate(CatalogPartDetailsRead):
    pass

class CatalogPartDelete(CatalogPartBase):
    pass

class CatalogPartUpdate(CatalogPartCreate):
    pass

class CatalogPartQuery(BaseModel):
    manufacturer_id: Optional[str] = Field(alias="manufacturerId", description="The BPNL (manufactuer ID) of the part to register.", default=None)
    manufacturer_part_id: Optional[str] = Field(alias="manufacturerPartId", description="The manufacturer part ID of the part.", default=None)

class PartnerCatalogPartCreate(CatalogPartBase, PartnerCatalogPartBase):
    pass

class PartnerCatalogPartDelete(PartnerCatalogPartCreate):
    pass

class PartnerCatalogPartRead(PartnerRelatedPartReadBase, CatalogPartRead, CustomerPartIdBase):
    pass

class PartnerCatalogPartQuery(CatalogPartQuery):
    business_partner_number: Optional[str] = Field(alias="businessPartnerNumber", description="The unique BPNL of the business partner.", default=None)
    customer_part_id: Optional[str] = Field(alias="customerPartId", description="The customer part ID of the part.", default=None)

class BatchBase(BaseModel):
    batch_id: str = Field(alias="batchId", description="The batch ID of the part.")

class BatchRead(CatalogPartDetailsRead, BatchBase):
    pass

class BatchCreate(CatalogPartCreate, BatchBase):  
    pass

class BatchDelete(CatalogPartDelete, BatchBase):
    pass

class BatchQuery(CatalogPartQuery):
    batch_id: Optional[str] = Field(alias="batchId", description="The batch ID of the part.", default=None)

class SerializedPartBase(CatalogPartBase):
    part_instance_id: str = Field(alias="partInstanceId", description="The part instance ID of the serialized part.")

class SerializedPartRead(CatalogPartRead, SerializedPartBase, PartnerRelatedPartReadBase, CustomerPartIdBase):
    van: Optional[str] = Field(description=VAN_DESCRIPTION, default=None)

class SerializedPartReadWithStatus(SerializedPartRead, StatusBase):
    """Serialized part read model with status information."""
    pass

class SerializedPartDetailsRead(SerializedPartRead, CatalogPartDetailsRead):
    pass

class SerializedPartDetailsReadWithStatus(SerializedPartDetailsRead, StatusBase):
    """Serialized part details read model with status information."""
    pass

class SerializedPartCreate(SerializedPartBase, PartnerRelatedPartCreateBase):
    van: Optional[str] = Field(description=VAN_DESCRIPTION, default=None)
    customer_part_id: Optional[str] = Field(alias="customerPartId", description="The customer part ID of the part.", default=None)
    name: Optional[str] = Field(description="The name of the part.", default=None)
    category: Optional[str] = Field(description="The category of the part.", default=None)
    bpns: Optional[str] = Field(description="The site number (BPNS) the part is produced", default=None)

class SerializedPartDelete(SerializedPartBase, PartnerRelatedPartCreateBase):
    pass

class SerializedPartUpdate(SerializedPartCreate):
    pass

class SerializedPartQuery(PartnerCatalogPartQuery):
    part_instance_id: Optional[str] = Field(alias="partInstanceId", description="The part instance ID of the serialized part.", default=None)
    van: Optional[str] = Field(description=VAN_DESCRIPTION, default=None)

class JISPartBase(CatalogPartBase, CustomerPartIdBase):
    jis_number: str = Field(alias="jisNumber", description="The JIS number of the JIS part.")

class JISPartRead(JISPartBase):
    parent_order_number: Optional[str] = Field(alias="parentOrderNumber", description=PARENT_ORDER_NUMBER_DESCRIPTION, default=None)
    jis_call_date: Optional[datetime] = Field(alias="jisCallDate", description="The JIS call date of the JIS part.", default=None)
    business_partner: BusinessPartnerRead = Field(alias="businessPartner", description="The business partner to whom the part is being offered.")

class JISPartCreate(JISPartBase):
    parent_order_number: Optional[str] = Field(description=PARENT_ORDER_NUMBER_DESCRIPTION, default=None)
    jis_call_date: Optional[datetime] = Field(description="The JIS call date of the JIS part.", default=None)
    business_partner_name: str = Field(alias="businessPartnerName", description="The unique name of the business partner to map the catalog part to.")

class JISPartDelete(JISPartBase):
    business_partner_name: str = Field(alias="businessPartnerName", description="The unique name of the business partner to map the catalog part to.")

class JISPartQuery(CatalogPartQuery):
    jis_number: Optional[str] = Field(alias="jisNumber", description="The JIS number of the JIS part.", default=None)
    parent_order_number: Optional[str] = Field(alias="parentOrderNumber", description=PARENT_ORDER_NUMBER_DESCRIPTION, default=None)
    jis_call_date_min: Optional[datetime] = Field(alias="jisCallDate", description="The minimal JIS call date of the JIS part.", default=None)
    jis_call_date_max: Optional[datetime] = Field(alias="jisCallDate", description="The maximal JIS call date of the JIS part.", default=None)