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
from typing import Dict, Optional
from pydantic import BaseModel, Field


from models.services.provider.part_management import CatalogPartBase, BusinessPartnerRead
from models.services.provider.twin_management import CatalogPartTwinDetailsRead

class SharingBase(BaseModel):
    business_partner_number: str = Field(alias="businessPartnerNumber", description="The business partner number of the business partner with which the catalog part is shared.")
    customer_part_id: Optional[str] = Field(alias="customerPartId", description="The customer part ID which will be mapped to the respective Business Partner", default=None)

class ShareCatalogPart(SharingBase, CatalogPartBase):
    """Class that stores the information required by request in the sharing functionalit, for catalog parts"""

class SharedPartBase(BaseModel):
    business_partner_number: str = Field(alias="businessPartnerNumber", description="The business partner number of the business partner with which the catalog part is shared.")
    customer_part_ids: Optional[Dict[str, BusinessPartnerRead]] = Field(alias="customerPartIds", description="The list of customer part IDs mapped to the respective Business Partners.", default={})
    shared_at: datetime = Field(alias="sharedAt", description="The date and time when the catalog part was shared.")
    twin: Optional[CatalogPartTwinDetailsRead] = Field(alias="twin", description="The digital twin created for part that was shared.", default=None)


class SharedPartner(SharingBase):
    name: str = Field(description="The unique name of the business partner.")