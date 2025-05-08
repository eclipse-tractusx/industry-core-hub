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

import json
import base64

from fastapi import FastAPI, HTTPException, Request, Query
from fastapi.responses import JSONResponse

from services.submodel_dispatcher_service import SubmodelDispatcherService, SubmodelNotSharedWithBusinessPartnerError
from services.part_management_service import PartManagementService
from services.partner_management_service import PartnerManagementService
from services.twin_management_service import TwinManagementService
from services.dtr_facade_service import DTRFacadeService, NotAuthorizedError, TwinNotFoundError
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
    },
    {
        "name": "Digital Twin Registry Facade",
        "description": "DTR compatible API provided directly out of the Industry Core Hub Backend. No separate DTR service is needed"
    }
]

app = FastAPI(title="Industry Core Hub Backend API", version="0.0.1", openapi_tags=tags_metadata)

part_management_service = PartManagementService()
partner_management_service = PartnerManagementService()
twin_management_service = TwinManagementService()
submodel_dispatcher_service = SubmodelDispatcherService()
dtr_facade_service = DTRFacadeService()

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

@app.get("/submodel-dispatcher/{semantic_id}/{global_id}", response_model=Dict[str, Any], tags=["Submodel Dispatcher"])
async def submodel_dispatcher_get_submodel_content(semantic_id: str, global_id: UUID, request: Request) -> Dict[str, Any]:
    return _submodel_dispatcher_get_submodel_content(semantic_id, global_id, request)
    
@app.get("/submodel-dispatcher/{semantic_id}/{global_id}/submodel", response_model=Dict[str, Any], tags=["Submodel Dispatcher"])
async def submodel_dispatcher_get_submodel_content_submodel(semantic_id: str, global_id: UUID, request: Request) -> Dict[str, Any]:
    return _submodel_dispatcher_get_submodel_content(semantic_id, global_id, request)

@app.get("/submodel-dispatcher/{semantic_id}/{global_id}/submodel/$value", response_model=Dict[str, Any], tags=["Submodel Dispatcher"])
async def submodel_dispatcher_get_submodel_content_submodel_value(semantic_id: str, global_id: UUID, request: Request) -> Dict[str, Any]:
    return _submodel_dispatcher_get_submodel_content(semantic_id, global_id, request)

def _submodel_dispatcher_get_submodel_content(semantic_id: str, global_id: UUID, request: Request) -> Dict[str, Any]:
    """
    Dispatch a submodel to the appropriate service or endpoint.
    """
    # Extract the headers we get from the EDC Data Plane
    edc_bpn = request.headers.get("Edc-Bpn")
    edc_contract_agreement_id = request.headers.get("Edc-Contract-Agreement-Id")

    # ... and check if both are present
    if not edc_bpn or not edc_contract_agreement_id:
        raise HTTPException(status_code=400, detail="Missing required headers: Edc-Bpn and Edc-Contract-Agreement-Id")

    # Get the submodel content (including the security check)
    try:
        return submodel_dispatcher_service.get_submodel_content(edc_bpn, edc_contract_agreement_id, semantic_id, global_id)
    
    # If the requestor has no access to the twin return a respective 403
    except SubmodelNotSharedWithBusinessPartnerError as e:
        raise HTTPException(status_code=403, detail=str(e)) from e


@app.get("/dtr-facade/{enablement_service_stack_id}/shell-descriptors",
    description="Returns all Asset Administration Shell Descriptors",
    response_model=Dict[str, Any],
    tags=["Digital Twin Registry Facade"])
async def dtr_facade_get_shell_descriptors(
    # TODO: Define explicit result schema to match the DTR API specs
    enablement_service_stack_id: int,
    request: Request,
    limit: Optional[int] = Query(ge=1, description="The maximum number of elements in the response array", default=None),
    cursor: Optional[str] = Query(description="A server-generated identifier retrieved from pagingMetadata that specifies from which position the result listing should continue", default=None),
    asset_kind: Optional[str] = Query(
        alias="assetKind",
        description="The Asset's kind (Instance or Type)",
        enum=["Instance", "NotApplicable", "Type"],  # List of allowed values,
        default=None
    ),
    asset_type: Optional[str] = Query(
        alias="assetType",
        description="The Asset's type (UTF8-BASE64-URL-encoded)",
        regex="^[\\x09\\x0A\\x0D\\x20-\\uD7FF\\uE000-\\uFFFD\\U00010000-\\U0010FFFF]*$",
        default=None
    ),
) -> Dict[str, Any]:
    return {
        "pagingMetadata": {
            "cursor": "123"
        },
        "result": []
    }

@app.get("/dtr-facade/{enablement_service_stack_id}/shell-descriptors/{aasIdentifier}",
    description="Returns a specific Asset Administration Shell Descriptor",
    response_model=Dict[str, Any],
    tags=["Digital Twin Registry Facade"])
async def dtr_facade_get_shell_descriptor(enablement_service_stack_id: int, aasIdentifier: str, request: Request) -> Dict[str, Any]:
    # TODO: Define explicit result schema to match the DTR API specs
    
    """
    Get the shell descriptor for a given AAS ID.
    """
    edc_bpn = request.headers.get("Edc-Bpn")
    
    try:
        return dtr_facade_service.get_shell_descriptor(enablement_service_stack_id, aasIdentifier, edc_bpn)
    except TwinNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except NotAuthorizedError as e:
        raise HTTPException(status_code=403, detail=str(e)) from e
    
@app.get("/dtr-facade/{enablement_service_stack_id}/lookup/shells",
    description="Returns a list of Asset Administration Shell ids linked to specific Asset identifiers",
    response_model=Dict[str, Any],
    tags=["Digital Twin Registry Facade"])
async def dtr_facade_lookup_shells(
    request: Request,
    enablement_service_stack_id: int,
    asset_ids: Optional[List[str]] = Query(alias="assetIds", description="A list of specific Asset identifiers", default=None),
    limit: Optional[int] = Query(ge=1, description="The maximum number of elements in the response array", default=None),
    cursor: Optional[str] = Query(description="A server-generated identifier retrieved from pagingMetadata that specifies from which position the result listing should continue", default=None),
) -> Dict[str, Any]:
    """
    Lookup shells for a given enablement service stack ID.
    """
    edc_bpn = request.headers.get("Edc-Bpn")
    
    search_params = {}
    if asset_ids:
        for asset_id in asset_ids:
            try:
                decoded_asset_id = json.loads(base64.b64decode(asset_id).decode('utf-8'))
                search_params[decoded_asset_id["name"]] = decoded_asset_id["value"]
            except (json.JSONDecodeError, KeyError, ValueError) as e:
                raise HTTPException(status_code=400, detail=f"Invalid asset ID format: {asset_id}") from e

    return dtr_facade_service.lookup_shells(enablement_service_stack_id, search_params, edc_bpn)