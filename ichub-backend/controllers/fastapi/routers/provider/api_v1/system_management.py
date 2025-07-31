from fastapi import APIRouter
from typing import List
from services.provider.system_management_service import SystemManagementService
from models.services.provider.system_management import (
    DtrServiceCreate,
    DtrServiceRead,
    DtrServiceUpdate,
    ConnectorServiceCreate,
    ConnectorServiceRead,
    ConnectorServiceUpdate,
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

# Connector Service endpoints
@router.post("/connector-service", response_model=ConnectorServiceRead)
async def create_connector_service(connector_create: ConnectorServiceCreate):
    return system_management_service.create_connector_service(connector_create)

@router.get("/connector-service", response_model=List[ConnectorServiceRead])
async def get_connector_services():
    return system_management_service.get_connector_services()

@router.get("/connector-service/{connector_id}", response_model=ConnectorServiceRead)
async def get_connector_service(connector_id: int):
    return system_management_service.get_connector_service(connector_id)

@router.put("/connector-service/{connector_id}", response_model=ConnectorServiceRead)
async def update_connector_service(connector_id: int, connector_update: ConnectorServiceUpdate):
    return system_management_service.update_connector_service(connector_id, connector_update)

@router.delete("/connector-service/{connector_id}", response_model=bool)
async def delete_connector_service(connector_id: int):
    return system_management_service.delete_connector_service(connector_id)

# DTR Service endpoints
@router.post("/dtr-service", response_model=DtrServiceRead)
async def create_dtr_service(dtr_create: DtrServiceCreate):
    return system_management_service.create_dtr_service(dtr_create)

@router.get("/dtr-service", response_model=List[DtrServiceRead])
async def get_dtr_services():
    return system_management_service.get_dtr_services()

@router.get("/dtr-service/{dtr_id}", response_model=DtrServiceRead)
async def get_dtr_service(dtr_id: int):
    return system_management_service.get_dtr_service(dtr_id)

@router.put("/dtr-service/{dtr_id}", response_model=DtrServiceRead)
async def update_dtr_service(dtr_id: int, dtr_update: DtrServiceUpdate):
    return system_management_service.update_dtr_service(dtr_id, dtr_update)

@router.delete("/dtr-service/{dtr_id}", response_model=bool)
async def delete_dtr_service(dtr_id: int):
    return system_management_service.delete_dtr_service(dtr_id)

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

