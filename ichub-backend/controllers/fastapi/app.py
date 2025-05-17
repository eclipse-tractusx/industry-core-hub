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

from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import FastAPI, Request, Header, Body
from fastapi.responses import JSONResponse

from services.submodel_dispatcher_service import SubmodelDispatcherService, SubmodelNotSharedWithBusinessPartnerError
from services.part_management_service import PartManagementService
from services.partner_management_service import PartnerManagementService
from services.twin_management_service import TwinManagementService
from services.part_sharing_shortcut_service import PartSharingShortcutService
from models.services.part_management import CatalogPartBase, CatalogPartRead, CatalogPartCreate, CatalogPartReadWithStatus, SerializedPartCreate, SerializedPartRead, SerializedPartQuery
from models.services.partner_management import BusinessPartnerRead, BusinessPartnerCreate, DataExchangeAgreementRead
from models.services.twin_management import TwinRead, TwinAspectRead, TwinAspectCreate, CatalogPartTwinRead, CatalogPartTwinDetailsRead, CatalogPartTwinCreate, CatalogPartTwinShare, SerializedPartTwinCreate, SerializedPartTwinRead, SerializedPartTwinDetailsRead
from tools.submodel_type_util import InvalidSemanticIdError
from tools import InvalidUUIDError

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
submodel_dispatcher_service = SubmodelDispatcherService()

@app.get("/part-management/catalog-part/{manufacturer_id}/{manufacturer_part_id}", response_model=CatalogPartRead, tags=["Part Management"])
async def part_management_get_catalog_part(manufacturer_id: str, manufacturer_part_id: str) -> Optional[CatalogPartRead]:
    return part_management_service.get_catalog_part(manufacturer_id, manufacturer_part_id)

@app.get("/part-management/catalog-part", response_model=List[CatalogPartReadWithStatus], tags=["Part Management"])
async def part_management_get_catalog_parts() -> List[CatalogPartReadWithStatus]:
    return part_management_service.get_catalog_parts()

@app.post("/part-management/catalog-part", response_model=CatalogPartRead, tags=["Part Management"])
async def part_management_create_catalog_part(catalog_part_create: CatalogPartCreate) -> CatalogPartReadWithStatus:
    return part_management_service.create_catalog_part(catalog_part_create)

@app.get("/part-management/serialized-part", response_model=List[SerializedPartRead], tags=["Part Management"])
async def part_management_get_serialized_parts() -> List[SerializedPartRead]:
    return part_management_service.get_serialized_parts()

@app.post("/part-management/serialized-part/query", response_model=List[SerializedPartRead], tags=["Part Management"])
async def part_management_query_serialized_parts(query: SerializedPartQuery) -> List[SerializedPartRead]:
    return part_management_service.get_serialized_parts(query)

@app.post("/part-management/serialized-part", response_model=SerializedPartRead, tags=["Part Management"])
async def part_management_create_serialized_part(serialized_part_create: SerializedPartCreate) -> SerializedPartRead:
    return part_management_service.create_serialized_part(serialized_part_create)

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

@app.get("/twin-management/catalog-part-twin/{global_id}", response_model=Optional[CatalogPartTwinDetailsRead], tags=["Twin Management"])
async def twin_management_get_catalog_part_twin(global_id: UUID) -> Optional[CatalogPartTwinDetailsRead]:
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

@app.get("/twin-management/serialized-part-twin", response_model=List[SerializedPartTwinRead], tags=["Twin Management"])
async def twin_management_get_serialized_part_twins(include_data_exchange_agreements: bool = False) -> List[SerializedPartTwinRead]:
    return twin_management_service.get_serialized_part_twins(include_data_exchange_agreements=include_data_exchange_agreements)

@app.get("/twin-management/serialized-part-twin/{global_id}", response_model=Optional[SerializedPartTwinDetailsRead], tags=["Twin Management"])
async def twin_management_get_serialized_part_twin(global_id: UUID) -> Optional[SerializedPartTwinDetailsRead]:
    return twin_management_service.get_serialized_part_twin_details(global_id)

@app.post("/twin-management/serialized-part-twin", response_model=TwinRead, tags=["Twin Management"])
async def twin_management_create_serialized_part_twin(serialized_part_twin_create: SerializedPartTwinCreate) -> TwinRead:
    return twin_management_service.create_serialized_part_twin(serialized_part_twin_create)

@app.post("/twin-management/twin-aspect", response_model=TwinAspectRead, tags=["Twin Management"])
async def twin_management_create_twin_aspect(twin_aspect_create: TwinAspectCreate) -> TwinAspectRead:
    return twin_management_service.create_twin_aspect(twin_aspect_create)

@app.post("/share/catalog-part", response_model=CatalogPartTwinDetailsRead, tags=["Twin Management"])
async def twin_management_create_part_sharing_shortcut(catalog_part_twin_share: CatalogPartTwinShare,
    auto_generate_part_type_information_submodel:bool = True) -> CatalogPartTwinDetailsRead:
    return part_sharing_shortcut_service.create_catalog_part_sharing_shortcut(
        catalog_part_twin_share,
        auto_generate_part_type_information=auto_generate_part_type_information_submodel
    )

@app.get("/submodel-dispatcher/{semantic_id}/{global_id}/submodel/$value", response_model=Dict[str, Any], tags=["Submodel Dispatcher"])
@app.get("/submodel-dispatcher/{semantic_id}/{global_id}/submodel", response_model=Dict[str, Any], tags=["Submodel Dispatcher"])
@app.get("/submodel-dispatcher/{semantic_id}/{global_id}", response_model=Dict[str, Any], tags=["Submodel Dispatcher"])
async def submodel_dispatcher_get_submodel_content_submodel_value(
    semantic_id: str,
    global_id: UUID,
    edc_bpn: Optional[str] = Header(default=None, alias="Edc-Bpn", description="The BPN of the consumer delivered by the EDC Data Plane"),
    edc_contract_agreement_id: Optional[str] = Header(default=None, alias="Edc-Contract-Agreement-Id", description="The contract agreement id of the consumer delivered by the EDC Data Plane")
) -> Dict[str, Any]:
    try:
        return submodel_dispatcher_service.get_submodel_content(edc_bpn, edc_contract_agreement_id, semantic_id, global_id)
    except FileNotFoundError:
        return JSONResponse(status_code=404, content={"detail": "Submodel not found"})

@app.exception_handler(SubmodelNotSharedWithBusinessPartnerError)
async def submodel_not_shared_with_business_partner_exception_handler(
        request: Request,
        exc: SubmodelNotSharedWithBusinessPartnerError) -> JSONResponse:
    """
    Custom exception handler for SubmodelNotSharedWithBusinessPartnerError.
    Returns a 403 Forbidden response with the error message.
    """
    return JSONResponse(status_code=403, content={"detail": str(exc)})

@app.exception_handler(InvalidSemanticIdError)
async def invalid_semantic_id_exception_handler(
        request: Request,
        exc: InvalidSemanticIdError) -> JSONResponse:
    """
    Custom exception handler for InvalidSemanticIdError.
    Returns a 400 Bad Request with the error message.
    """
    return JSONResponse(status_code=400, content={"detail": str(exc)})

@app.exception_handler(InvalidUUIDError)
async def invalid_uuid_error_exception_handler(
    request: Request,
    exc: InvalidUUIDError) -> JSONResponse:
    """
    Custom exception handler for InvalidUUIDError.
    Returns a 422 Unprocessable Entity with the error message.
    """
    return JSONResponse(status_code=422, content={"detail": str(exc)})


@app.post("/submodel-dispatcher/{semantic_id}/{global_id}/submodel", status_code=204, tags=["Submodel Dispatcher"])
async def submodel_dispatcher_upload_submodel(
    semantic_id: str,
    global_id: UUID,
    submodel_payload: Dict[str, Any] = Body(..., description="The submodel JSON payload")
) -> None:
    return submodel_dispatcher_service.upload_submodel( global_id, semantic_id, submodel_payload)

@app.delete("/submodel-dispatcher/{semantic_id}/{global_id}/submodel", status_code=204, tags=["Submodel Dispatcher"])
async def submodel_dispatcher_delete_submodel(
    semantic_id: str,
    global_id: UUID
) -> None:
    try:
        submodel_dispatcher_service.delete_submodel(global_id, semantic_id)
    except FileNotFoundError:
        return JSONResponse(status_code=404, content={"detail": "Submodel not found"})
