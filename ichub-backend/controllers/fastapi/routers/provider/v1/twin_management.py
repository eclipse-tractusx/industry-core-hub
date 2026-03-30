#################################################################################
# Eclipse Tractus-X - Industry Core Hub Backend
#
# Copyright (c) 2025 LKS Next
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

from fastapi import APIRouter, Query, Depends
from fastapi.responses import JSONResponse
from typing import Dict, List, Optional
from uuid import UUID

from services.provider.twin_management_service import TwinManagementService
from models.services.provider.twin_management import (
    TwinRead, TwinAspectRead, TwinAspectCreate,
    CatalogPartTwinRead, CatalogPartTwinDetailsRead,
    CatalogPartTwinCreate, CatalogPartTwinShareCreate,
    SerializedPartTwinRead, SerializedPartTwinDetailsRead,
    SerializedPartTwinCreate, SerializedPartTwinShareCreate,
    SerializedPartTwinUnshareCreate
)
from tools.exceptions import exception_responses
from utils.async_utils import AsyncManagerWrapper
from controllers.fastapi.routers.authentication.auth_api import get_authentication_dependency

router = APIRouter(
    prefix="/twin-management",
    tags=["Twin Management"],
    dependencies=[Depends(get_authentication_dependency())]
)
twin_management_service = TwinManagementService()

# Create universal async wrapper - works with any service!
async_twin_service = AsyncManagerWrapper(twin_management_service, "TwinManagement")

@router.get("/catalog-part-twin", response_model=List[CatalogPartTwinRead], responses=exception_responses)
async def twin_management_get_catalog_part_twins(include_data_exchange_agreements: bool = False) -> List[CatalogPartTwinRead]:
    # Clean, simple async call!
    return await async_twin_service.get_catalog_part_twins(include_data_exchange_agreements=include_data_exchange_agreements)

@router.get("/catalog-part-twin/{global_id}", response_model=Optional[CatalogPartTwinDetailsRead], responses=exception_responses)
async def twin_management_get_catalog_part_twin(global_id: UUID) -> Optional[CatalogPartTwinDetailsRead]:
    # Clean, simple async call!
    return await async_twin_service.get_catalog_part_twin_details_id(global_id)

@router.get("/catalog-part-twin/{manufacturer_id}/{manufacturer_part_id}", response_model=Optional[CatalogPartTwinDetailsRead], responses=exception_responses)
async def twin_management_get_catalog_part_twin_from_manufacturer(manufacturer_id: str, manufacturer_part_id: str) -> Optional[CatalogPartTwinDetailsRead]:
    return twin_management_service.get_catalog_part_twin_details(manufacturer_id, manufacturer_part_id)

@router.post("/catalog-part-twin", response_model=TwinRead, responses=exception_responses)
async def twin_management_create_catalog_part_twin(
    catalog_part_twin_create: CatalogPartTwinCreate,
    auto_create_part_type_information: bool = Query(True, alias="autoCreatePartTypeInformation", description="Automatically create part type information submodel if not present.")
) -> TwinRead:
    return twin_management_service.create_catalog_part_twin(
        catalog_part_twin_create,
        auto_create_part_type_information
    )

@router.post("/catalog-part-twin/share", responses={
    201: {"description": "Catalog part twin shared successfully"},
    204: {"description": "Catalog part twin already shared"},
    **exception_responses
})
async def twin_management_share_catalog_part_twin(catalog_part_twin_share: CatalogPartTwinShareCreate):
    if twin_management_service.create_catalog_part_twin_share(catalog_part_twin_share):
        return JSONResponse(status_code=201, content={"description":"Catalog part twin shared successfully"})
    else:
        return JSONResponse(status_code=204, content={"description":"Catalog part twin already shared"})

@router.get("/serialized-part-twin", response_model=List[SerializedPartTwinRead], responses=exception_responses)
async def twin_management_get_all_serialized_part_twins(
    include_data_exchange_agreements: bool = False,
    manufacturerId: Optional[str] = None,
    manufacturerPartId: Optional[str] = None,
    customerPartId: Optional[str] = None,
    partInstanceId: Optional[str] = None,
    van: Optional[str] = None,
    businessPartnerNumber: Optional[str] = None
) -> List[SerializedPartTwinRead]:
    from models.services.provider.part_management import SerializedPartQuery
    
    # Create a dynamic query object using all provided filter parameters
    query_data = {}
    
    # Map API parameter names to Pydantic field aliases
    filter_mapping = {
        "manufacturerId": manufacturerId,
        "manufacturerPartId": manufacturerPartId,
        "customerPartId": customerPartId,
        "partInstanceId": partInstanceId,
        "van": van,
        "businessPartnerNumber": businessPartnerNumber
    }
    
    # Only include non-None values in the query
    for field_name, value in filter_mapping.items():
        if value is not None:
            query_data[field_name] = value
    
    query = SerializedPartQuery(**query_data)
    
    return twin_management_service.get_serialized_part_twins(
        serialized_part_query=query,
        include_data_exchange_agreements=include_data_exchange_agreements
    )

@router.get("/serialized-part-twin/{global_id}", response_model=Optional[SerializedPartTwinDetailsRead], responses=exception_responses)
async def twin_management_get_serialized_part_twin(global_id: UUID) -> Optional[SerializedPartTwinDetailsRead]:
    return twin_management_service.get_serialized_part_twin_details(global_id)

@router.post("/serialized-part-twin", response_model=TwinRead, responses=exception_responses)
async def twin_management_create_serialized_part_twin(serialized_part_twin_create: SerializedPartTwinCreate, auto_create_serial_part: bool = Query(True, alias="autoCreatePartTypeInformation", description="Automatically create part type information submodel if not present.")) -> TwinRead:
    return twin_management_service.create_serialized_part_twin(serialized_part_twin_create, auto_create_serial_part)

@router.post("/twin-aspect", response_model=TwinAspectRead, responses=exception_responses)
async def twin_management_create_twin_aspect(twin_aspect_create: TwinAspectCreate, default: bool = True) -> TwinAspectRead:
    if default:
        return twin_management_service.create_twin_aspect(twin_aspect_create)
    return twin_management_service.create_or_update_twin_aspect_not_default(twin_aspect_create)

@router.get("/twin-registrations/{global_id}", response_model=Dict[int, bool], responses=exception_responses)
async def get_twin_registrations(global_id: UUID) -> Dict[int, bool]:
    return twin_management_service.get_twin_registrations(global_id)

@router.post("/serialized-part-twin/share", responses={
    201: {"description": "Catalog part twin shared successfully"},
    204: {"description": "Catalog part twin already shared"},
    **exception_responses
})
async def twin_management_share_serialized_part_twin(serialized_part_twin_share: SerializedPartTwinShareCreate):
    if twin_management_service.create_serialized_part_twin_share(serialized_part_twin_share):
        return JSONResponse(status_code=201, content={"description":"Serialized part twin shared successfully"})
    else:
        return JSONResponse(status_code=204, content=None)
    
@router.post("/serialized-part-twin/unshare", responses={
    201: {"description": "Catalog part twin unshared successfully"},
    204: {"description": "Catalog part twin already unshared"},
    **exception_responses
})
async def twin_management_unshare_serialized_part_twin(serialized_part_twin_unshare: SerializedPartTwinUnshareCreate):
    if twin_management_service.part_twin_unshare(serialized_part_twin_unshare):
        return JSONResponse(status_code=201, content={"description":"Serialized part twin unshared successfully"})
    else:
        return JSONResponse(status_code=204, content=None)
