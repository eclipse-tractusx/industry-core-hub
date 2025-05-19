#################################################################################
# Eclipse Tractus-X - Industry Core Hub Backend
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
# Unless required by routerlicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND,
# either express or implied. See the
# License for the specific language govern in permissions and limitations
# under the License.
#
# SPDX-License-Identifier: Apache-2.0
#################################################################################

from fastapi import APIRouter, Body, Header
from fastapi.responses import JSONResponse
from typing import List, Optional, Dict
from uuid import UUID

from services.twin_management_service import TwinManagementService
from models.services.twin_management import (
    TwinRead, TwinAspectRead, TwinAspectCreate,
    CatalogPartTwinRead, CatalogPartTwinDetailsRead,
    CatalogPartTwinCreate, CatalogPartTwinShare
)

router = APIRouter(prefix="/twin-management", tags=["Twin Management"])
twin_management_service = TwinManagementService()

@router.get("/catalog-part-twin", response_model=List[CatalogPartTwinRead])
async def twin_management_get_catalog_part_twins(include_data_exchange_agreements: bool = False) -> List[CatalogPartTwinRead]:
    return twin_management_service.get_catalog_part_twins(include_data_exchange_agreements=include_data_exchange_agreements)

@router.get("/catalog-part-twin/{global_id}", response_model=List[CatalogPartTwinDetailsRead])
async def twin_management_get_catalog_part_twin(global_id: UUID) -> List[CatalogPartTwinDetailsRead]:
    return twin_management_service.get_catalog_part_twin_details(global_id)

@router.post("/catalog-part-twin", response_model=TwinRead)
async def twin_management_create_catalog_part_twin(catalog_part_twin_create: CatalogPartTwinCreate) -> TwinRead:
    return twin_management_service.create_catalog_part_twin(catalog_part_twin_create)

@router.post("/catalog-part-twin/share", responses={
    201: {"description": "Catalog part twin shared successfully"},
    204: {"description": "Catalog part twin already shared"}
})
async def twin_management_share_catalog_part_twin(catalog_part_twin_share: CatalogPartTwinShare):
    if twin_management_service.create_catalog_part_twin_share(catalog_part_twin_share):
        return JSONResponse(status_code=201, content={"description":"Catalog part twin shared successfully"})
    else:
        return JSONResponse(status_code=204, content={"description":"Catalog part twin already shared"})

@router.post("/twin-aspect", response_model=TwinAspectRead)
async def twin_management_create_twin_aspect(twin_aspect_create: TwinAspectCreate) -> TwinAspectRead:
    return twin_management_service.create_twin_aspect(twin_aspect_create)
