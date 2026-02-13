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

from fastapi import APIRouter
from typing import List
from services.provider.system_management_service import SystemManagementService
from models.services.provider.system_management import (
    TwinRegistryCreate,
    TwinRegistryRead,
    TwinRegistryUpdate,
    ConnectorControlPlaneCreate,
    ConnectorControlPlaneRead,
    ConnectorControlPlaneUpdate,
    EnablementServiceStackCreate,
    EnablementServiceStackRead,
    EnablementServiceStackUpdate,
    LegalEntityCreate,
    LegalEntityRead,
    LegalEntityUpdate,
)

router = APIRouter(prefix="/system-management", tags=["System Management"])
system_management_service = SystemManagementService()

@router.post("/enablement-service-stack", response_model=EnablementServiceStackRead)
async def create_enablement_service_stack(stack_create: EnablementServiceStackCreate):
    return system_management_service.create_enablement_service_stack(stack_create)

@router.get("/enablement-service-stack", response_model=List[EnablementServiceStackRead])
async def get_enablement_service_stacks():
    return system_management_service.get_enablement_service_stacks()

@router.get("/enablement-service-stack/{stack_id}", response_model=EnablementServiceStackRead)
async def get_enablement_service_stack(stack_id: int):
    return system_management_service.get_enablement_service_stack(stack_id)

@router.put("/enablement-service-stack/{stack_id}", response_model=EnablementServiceStackRead)
async def update_enablement_service_stack(stack_id: int, stack_update: EnablementServiceStackUpdate):
    return system_management_service.update_enablement_service_stack(stack_id, stack_update)

@router.delete("/enablement-service-stack/{stack_id}", response_model=bool)
async def delete_enablement_service_stack(stack_id: int):
    return system_management_service.delete_enablement_service_stack(stack_id)

# Connector Control Plane endpoints
@router.post("/connector-control-plane", response_model=ConnectorControlPlaneRead)
async def create_connector_control_plane(connector_create: ConnectorControlPlaneCreate):
    return system_management_service.create_connector_control_plane(connector_create)

@router.get("/connector-control-plane", response_model=List[ConnectorControlPlaneRead])
async def get_connector_control_planes():
    return system_management_service.retrieve_connector_control_planes()

@router.get("/connector-control-plane/{connector_id}", response_model=ConnectorControlPlaneRead)
async def get_connector_control_plane(connector_id: int):
    return system_management_service.get_connector_control_plane(connector_id)

@router.put("/connector-control-plane/{connector_id}", response_model=ConnectorControlPlaneRead)
async def update_connector_control_plane(connector_id: int, connector_update: ConnectorControlPlaneUpdate):
    return system_management_service.update_connector_control_plane(connector_id, connector_update)

@router.delete("/connector-control-plane/{connector_id}", response_model=bool)
async def delete_connector_control_plane(connector_id: int):
    return system_management_service.delete_connector_control_plane(connector_id)

# Twin Registry endpoints
@router.post("/twin-registry", response_model=TwinRegistryRead)
async def create_twin_registry(dtr_create: TwinRegistryCreate):
    return system_management_service.create_twin_registry(dtr_create)

@router.get("/twin-registry", response_model=List[TwinRegistryRead])
async def get_twin_registries():
    return system_management_service.get_twin_registries()

@router.get("/twin-registry/{dtr_id}", response_model=TwinRegistryRead)
async def get_twin_registry(dtr_id: int):
    return system_management_service.get_twin_registry(dtr_id)

@router.put("/twin-registry/{dtr_id}", response_model=TwinRegistryRead)
async def update_twin_registry(dtr_id: int, dtr_update: TwinRegistryUpdate):
    return system_management_service.update_twin_registry(dtr_id, dtr_update)

@router.delete("/twin-registry/{dtr_id}", response_model=bool)
async def delete_twin_registry(dtr_id: int):
    return system_management_service.delete_twin_registry(dtr_id)

# LegalEntity endpoints
@router.post("/legal-entity", response_model=LegalEntityRead)
async def create_legal_entity(legal_entity_create: LegalEntityCreate):
    return system_management_service.create_legal_entity(legal_entity_create)

@router.get("/legal-entity", response_model=List[LegalEntityRead])
async def get_legal_entities():
    return system_management_service.get_legal_entities()

@router.get("/legal-entity/{legal_entity_id}", response_model=LegalEntityRead)
async def get_legal_entity(legal_entity_id: int):
    return system_management_service.get_legal_entity(legal_entity_id)

@router.put("/legal-entity/{legal_entity_id}", response_model=LegalEntityRead)
async def update_legal_entity(legal_entity_id: int, legal_entity_update: LegalEntityUpdate):
    return system_management_service.update_legal_entity(legal_entity_id, legal_entity_update)

@router.delete("/legal-entity/{legal_entity_id}", response_model=bool)
async def delete_legal_entity(legal_entity_id: int):
    return system_management_service.delete_legal_entity(legal_entity_id)

