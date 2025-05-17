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
from typing import Dict, Optional, List

from pydantic import BaseModel, Field

from models.metadata_database.models import Material, Measurement
from models.services.partner_management import BusinessPartnerRead

class PartnerRelatedPartReadBase(BaseModel):
    business_partner: BusinessPartnerRead = Field(alias="businessPartner", description="The business partner to whom the part is being offered.")

class PartnerRelatedPartCreateBase(BaseModel):
    business_partner_number: str = Field(alias="businessPartnerNumber", description="The unique BPNL of the business partner.")

class CatalogPartBase(BaseModel):
    manufacturer_id: str = Field(alias="manufacturerId", description="The BPNL (manufactuer ID) of the part to register.")
    manufacturer_part_id: str = Field(alias="manufacturerPartId", description="The manufacturer part ID of the part.")

class PartReadBase(CatalogPartBase):
    name: str = Field(description="The name of the part.")
    category: Optional[str] = Field(description="The category of the part.", default=None)
    bpns: Optional[str] = Field(description="The site number (BPNS) the part is attached to.", default=None)
    materials: List[Material] = Field(description="List of materials, e.g. [{'name':'aluminum','share':'20'}]", default=[])
    width: Optional[Measurement] = Field(description="The width of the part.", default=None)
    height: Optional[Measurement] = Field(description="The height of the part.", default=None)
    length: Optional[Measurement] = Field(description="The length of the part.", default=None)
    weight: Optional[Measurement] = Field(description="The weight of the part.", default=None)


class PartnerCatalogPartBase(PartnerRelatedPartCreateBase):
    customer_part_id: str = Field(alias="customerPartId", description="The customer part ID for partner specific mapping of the catalog part.")

class CatalogPartRead(PartReadBase):
    customer_part_ids: Optional[Dict[str, BusinessPartnerRead]] = Field(alias="customerPartIds", description="The list of customer part IDs mapped to the respective Business Partners.", default={})

class CatalogPartReadWithStatus(CatalogPartRead):
    status: int = Field(description="The status of the part. (0: draft, 1:pending, 2: registered, 3: shared)")

class CatalogPartCreate(CatalogPartRead):
    pass

class CatalogPartDelete(CatalogPartBase):
    pass

class CatalogPartQuery(BaseModel):
    manufacturer_id: Optional[str] = Field(alias="manufacturerId", description="The BPNL (manufactuer ID) of the part to register.", default=None)
    manufacturer_part_id: Optional[str] = Field(alias="manufacturerPartId", description="The manufacturer part ID of the part.", default=None)

class PartnerCatalogPartCreate(CatalogPartBase, PartnerCatalogPartBase):
    pass

class PartnerCatalogPartDelete(PartnerCatalogPartCreate):
    pass

class PartnerCatalogPartQuery(CatalogPartQuery):
    business_partner_number: Optional[str] = Field(alias="businessPartnerNumber", description="The unique BPNL of the business partner.", default=None)
    customer_part_id: Optional[str] = Field(alias="customerPartId", description="The customer part ID of the part.", default=None)

class BatchBase(BaseModel):
    batch_id: str = Field(alias="batchId", description="The batch ID of the part.")

class BatchRead(CatalogPartRead, BatchBase):
    pass

class BatchCreate(CatalogPartCreate, BatchBase):  
    pass

class BatchDelete(CatalogPartDelete, BatchBase):
    pass

class BatchQuery(CatalogPartQuery):
    batch_id: Optional[str] = Field(alias="batchId", description="The batch ID of the part.", default=None)

class SerializedPartBase(CatalogPartBase):
    part_instance_id: str = Field(alias="partInstanceId", description="The part instance ID of the serialized part.")

class SerializedPartRead(PartReadBase, SerializedPartBase, PartnerRelatedPartReadBase):
    customer_part_id: str = Field(alias="customerPartId", description="The customer part ID of the part.")
    van: Optional[str] = Field(description="The optional VAN (Vehicle Assembly Number) of the serialized part.", default=None)

class SerializedPartCreate(SerializedPartBase, PartnerRelatedPartCreateBase):
    van: Optional[str] = Field(description="The optional VAN (Vehicle Assembly Number) of the serialized part.", default=None)
    customer_part_id: Optional[str] = Field(alias="customerPartId", description="The customer part ID of the part.")

class SerializedPartDelete(SerializedPartBase):
    business_partner_name: str = Field(alias="businessPartnerName", description="The unique name of the business partner to map the catalog part to.")

class SerializedPartQuery(PartnerCatalogPartQuery):
    part_instance_id: Optional[str] = Field(alias="partInstanceId", description="The part instance ID of the serialized part.", default=None)
    van: Optional[str] = Field(description="The optional VAN (Vehicle Assembly Number) of the serialized part.", default=None)

class JISPartBase(CatalogPartBase):
    jis_number: str = Field(alias="jisNumber", description="The JIS number of the JIS part.")
    customer_part_id: str = Field(alias="customerPartId", description="The customer part ID of the part.")

class JISPartRead(JISPartBase):
    parent_order_number: Optional[str] = Field(alias="parentOrderNumber", description="The parent order number of the JIS part.", default=None)
    jis_call_date: Optional[datetime] = Field(alias="jisCallDate", description="The JIS call date of the JIS part.", default=None)
    business_partner: BusinessPartnerRead = Field(alias="businessPartner", description="The business partner to whom the part is being offered.")

class JISPartCreate(JISPartBase):
    parent_order_number: Optional[str] = Field(description="The parent order number of the JIS part.", default=None)
    jis_call_date: Optional[datetime] = Field(description="The JIS call date of the JIS part.", default=None)
    business_partner_name: str = Field(alias="businessPartnerName", description="The unique name of the business partner to map the catalog part to.")

class JISPartDelete(JISPartBase):
    business_partner_name: str = Field(alias="businessPartnerName", description="The unique name of the business partner to map the catalog part to.")

class JISPartQuery(CatalogPartQuery):
    jis_number: Optional[str] = Field(alias="jisNumber", description="The JIS number of the JIS part.", default=None)
    parent_order_number: Optional[str] = Field(alias="parentOrderNumber", description="The parent order number of the JIS part.", default=None)
    jis_call_date_min: Optional[datetime] = Field(alias="jisCallDate", description="The minimal JIS call date of the JIS part.", default=None)
    jis_call_date_max: Optional[datetime] = Field(alias="jisCallDate", description="The maximal JIS call date of the JIS part.", default=None)