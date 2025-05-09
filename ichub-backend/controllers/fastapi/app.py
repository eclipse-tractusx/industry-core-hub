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

from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field

from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse

from services.part_management_service import PartManagementService
from services.partner_management_service import PartnerManagementService
from services.twin_management_service import TwinManagementService
from services.part_sharing_shortcut_service import PartSharingShortcutService
from models.services.part_management import CatalogPartBase, CatalogPartRead, CatalogPartCreate
from models.services.partner_management import BusinessPartnerRead, BusinessPartnerCreate, DataExchangeAgreementRead
from models.services.twin_management import TwinRead, TwinAspectRead, TwinAspectCreate, CatalogPartTwinRead, CatalogPartTwinDetailsRead, CatalogPartTwinCreate, CatalogPartTwinShare

tags_metadata = [
    {
        "name": "Part Management",
        "description": "Management of part metadata - including catalog parts, serialized parts, JIS parts and batches"
    },
    {
        "name": "Partner Management",
        "description": "Management of master data around business partners - including business partners, data exchange agreements and contracts"
    },
    {
        "name": "Twin Management",
        "description": "Management of how product information can be managed and shared"
    },
    {
        "name": "Submodel Dispatcher",
        "description": "Internal API called by EDC Data Planes in order the deliver data of of the internall used Submodel Service"
    }
]

app = FastAPI(title="Industry Core Hub Backend API", version="0.0.1", openapi_tags=tags_metadata)

part_management_service = PartManagementService()
partner_management_service = PartnerManagementService()
twin_management_service = TwinManagementService()
part_sharing_shortcut_service = PartSharingShortcutService()

@app.get("/part-management/catalog-part/{manufacturer_id}/{manufacturer_part_id}", response_model=CatalogPartRead, tags=["Part Management"])
async def part_management_get_catalog_part(manufacturer_id: str, manufacturer_part_id: str) -> Optional[CatalogPartRead]:
    return part_management_service.get_catalog_part(manufacturer_id, manufacturer_part_id)

@app.get("/part-management/catalog-part", response_model=List[CatalogPartRead], tags=["Part Management"])
async def part_management_get_catalog_parts() -> List[CatalogPartRead]:
    return part_management_service.get_catalog_parts()

@app.post("/part-management/catalog-part", response_model=CatalogPartRead, tags=["Part Management"])
async def part_management_create_catalog_part(catalog_part_create: CatalogPartCreate) -> CatalogPartRead:
    return part_management_service.create_catalog_part(catalog_part_create)

@app.get("/partner-management/business-partner", response_model=List[BusinessPartnerRead], tags=["Partner Management"])
async def partner_management_get_business_partners() -> List[BusinessPartnerRead]:
    return partner_management_service.list_business_partners()

@app.get("/partner-management/business-partner/{business_partner_number}", response_model=Optional[BusinessPartnerRead], tags=["Partner Management"])
async def partner_management_get_business_partner(business_partner_number: str) -> Optional[BusinessPartnerRead]:
    return partner_management_service.get_business_partner(business_partner_number)

@app.post("/partner-management/business-partner", response_model=BusinessPartnerRead, tags=["Partner Management"])
async def partner_management_create_business_partner(business_partner_create: BusinessPartnerCreate) -> BusinessPartnerRead:
    return partner_management_service.create_business_partner(business_partner_create)

@app.get("/partner-management/business-partner/{business_partner_number}/data-exchange-agreement", response_model=List[DataExchangeAgreementRead], tags=["Partner Management"])
async def partner_management_get_data_exchange_agreements(business_partner_number: str) -> List[DataExchangeAgreementRead]:
    return partner_management_service.get_data_exchange_agreements(business_partner_number)

@app.get("/twin-management/catalog-part-twin", response_model=List[CatalogPartTwinRead], tags=["Twin Management"])
async def twin_management_get_catalog_part_twins(include_data_exchange_agreements: bool = False) -> List[CatalogPartTwinRead]:
    return twin_management_service.get_catalog_part_twins(include_data_exchange_agreements=include_data_exchange_agreements)

@app.get("/twin-management/catalog-part-twin/{global_id}", response_model=List[CatalogPartTwinDetailsRead], tags=["Twin Management"])
async def twin_management_get_catalog_part_twin(global_id: UUID) -> List[CatalogPartTwinDetailsRead]:
    return twin_management_service.get_catalog_part_twin_details(global_id)

@app.post("/twin-management/catalog-part-twin", response_model=TwinRead, tags=["Twin Management"])
async def twin_management_create_catalog_part_twin(catalog_part_twin_create: CatalogPartTwinCreate) -> TwinRead:
    return twin_management_service.create_catalog_part_twin(catalog_part_twin_create)

@app.post("/twin-management/catalog-part-twin/share", responses={
    201: {"description": "Catalog part twin shared successfully"},
    204: {"description": "Catalog part twin already shared"}
}, tags=["Twin Management"])
async def twin_management_share_catalog_part_twin(catalog_part_twin_share: CatalogPartTwinShare):
    if twin_management_service.create_catalog_part_twin_share(catalog_part_twin_share):
        return JSONResponse(status_code=201, content={"description":"Catalog part twin shared successfully"})
    else:
        return JSONResponse(status_code=204, content={"description":"Catalog part twin already shared"})

@app.post("/twin-management/twin-aspect", response_model=TwinAspectRead, tags=["Twin Management"])
async def twin_management_create_twin_aspect(twin_aspect_create: TwinAspectCreate) -> TwinAspectRead:
    return twin_management_service.create_twin_aspect(twin_aspect_create)

@app.post("/twin-management/catalog-part-twin/share-shortcut", response_model=CatalogPartTwinDetailsRead, tags=["Twin Management"])
async def twin_management_create_part_sharing_shortcut(catalog_part_twin_share: CatalogPartTwinShare,
    auto_generate_part_type_information_submodel:bool = True) -> CatalogPartTwinDetailsRead:
    return part_sharing_shortcut_service.create_catalog_part_sharing_shortcut(
        catalog_part_twin_share,
        auto_generate_part_type_information=auto_generate_part_type_information_submodel
    )