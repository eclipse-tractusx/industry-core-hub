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

from fastapi import APIRouter
from typing import List, Optional

from services.provider.part_management_service import PartManagementService
from models.services.provider.part_management import (
    CatalogPartCreate,
    CatalogPartDetailsReadWithStatus,
    CatalogPartReadWithStatus,
    PartnerCatalogPartCreate,
    PartnerCatalogPartRead,
    SerializedPartCreate,
    SerializedPartQuery,
    SerializedPartRead,
)
from tools.exceptions import exception_responses

router = APIRouter(prefix="/part-management", tags=["Part Management"])
part_management_service = PartManagementService()


@router.get("/catalog-part/{manufacturer_id}/{manufacturer_part_id}", response_model=CatalogPartDetailsReadWithStatus, responses=exception_responses)
async def part_management_get_catalog_part_details(manufacturer_id: str, manufacturer_part_id: str) -> Optional[CatalogPartDetailsReadWithStatus]:
    return part_management_service.get_catalog_part_details(manufacturer_id, manufacturer_part_id)

@router.get("/catalog-part", response_model=List[CatalogPartReadWithStatus], responses=exception_responses)
async def part_management_get_catalog_parts() -> List[CatalogPartReadWithStatus]:
    return part_management_service.get_catalog_parts()

@router.post("/catalog-part", response_model=CatalogPartDetailsReadWithStatus, responses=exception_responses)
async def part_management_create_catalog_part(catalog_part_create: CatalogPartCreate) -> CatalogPartDetailsReadWithStatus:
    return part_management_service.create_catalog_part(catalog_part_create)

@router.post("/catalog-part/create-partner-mapping", response_model=PartnerCatalogPartRead, responses=exception_responses)
async def part_management_create_partner_mapping(partner_catalog_part_create: PartnerCatalogPartCreate) -> PartnerCatalogPartRead:
    return part_management_service.create_partner_catalog_part_mapping(partner_catalog_part_create)

@router.get("/serialized-part", response_model=List[SerializedPartRead], responses=exception_responses)
async def part_management_get_serialized_parts() -> List[SerializedPartRead]:
    return part_management_service.get_serialized_parts()

@router.post("/serialized-part/query", response_model=List[SerializedPartRead], responses=exception_responses)
async def part_management_query_serialized_parts(query: SerializedPartQuery) -> List[SerializedPartRead]:
    return part_management_service.get_serialized_parts(query)

@router.post("/serialized-part", response_model=SerializedPartRead, responses=exception_responses)
async def part_management_create_serialized_part(serialized_part_create: SerializedPartCreate) -> SerializedPartRead:
    return part_management_service.create_serialized_part(serialized_part_create)
