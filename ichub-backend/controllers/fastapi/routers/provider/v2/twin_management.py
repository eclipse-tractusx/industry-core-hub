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

from services.provider.twin_management_service import TwinManagementService
from models.services.provider.twin_management import (
    TwinRead, TwinAspectRead, TwinAspectCreate,
    CatalogPartTwinCreate, CatalogPartTwinShareCreate,
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

@router.post("/{twin_registry_id}/catalog-part-twin", response_model=TwinRead, responses=exception_responses)
async def twin_management_create_catalog_part_twin(
    twin_registry_id: int,
    catalog_part_twin_create: CatalogPartTwinCreate,
    auto_create_part_type_information: bool = Query(True, alias="autoCreatePartTypeInformation", description="Automatically create part type information submodel if not present.")
) -> TwinRead:
    return twin_management_service.create_catalog_part_twin(
        catalog_part_twin_create,
        auto_create_part_type_information,
        db_twin_registry_id=twin_registry_id
    )

@router.post("/{twin_registry_id}/serialized-part-twin", response_model=TwinRead, responses=exception_responses)
async def twin_management_create_serialized_part_twin(twin_registry_id: int, serialized_part_twin_create: SerializedPartTwinCreate, auto_create_serial_part: bool = Query(True, alias="autoCreatePartTypeInformation", description="Automatically create part type information submodel if not present.")) -> TwinRead:
    return twin_management_service.create_serialized_part_twin(
        serialized_part_twin_create,
        auto_create_serial_part,
        db_twin_registry_id=twin_registry_id)

@router.post("/{twin_registry_id}/{connector_control_plane_id}/twin-aspect", response_model=TwinAspectRead, responses=exception_responses)
async def twin_management_create_twin_aspect(twin_registry_id: int, connector_control_plane_id: int, twin_aspect_create: TwinAspectCreate, default: bool = True) -> TwinAspectRead:
    if default:
        return twin_management_service.create_twin_aspect(
            twin_aspect_create,
            db_twin_registry_id=twin_registry_id,
            db_connector_control_plane_id=connector_control_plane_id
        )
    return twin_management_service.create_or_update_twin_aspect_not_default(
        twin_aspect_create,
        db_twin_registry_id=twin_registry_id,
        db_connector_control_plane_id=connector_control_plane_id)
