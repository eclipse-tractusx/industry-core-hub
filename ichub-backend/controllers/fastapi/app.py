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

from fastapi import FastAPI, Request, Header, Body
from fastapi.responses import JSONResponse

from services.submodel_dispatcher_service import SubmodelNotSharedWithBusinessPartnerError

from tools.submodel_type_util import InvalidSemanticIdError
from tools import InvalidUUIDError

from tractusx_sdk.dataspace.tools import op

from .routers import (
    part_management,
    partner_management,
    twin_management,
    submodel_dispatcher,
    sharing_handler
)

tags_metadata = [
    {
        "name": "Part Management",
        "description": "Management of part metadata - including catalog parts, serialized parts, JIS parts and batches"
    },
    {
        "name": "Sharing Functionality",
        "description": "Sharing functionality for catalog part twins - including sharing of parts with business partners and automatic generation of digital twins and submodels"
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
        "description": "Internal API called by EDC Data Planes or Admins in order the deliver data of of the internal used Submodel Service"
    }
]

app = FastAPI(title="Industry Core Hub Backend API", version="0.0.1", openapi_tags=tags_metadata)

## Include here all the routers for the application.
app.include_router(part_management.router)
app.include_router(partner_management.router)
app.include_router(twin_management.router)
app.include_router(submodel_dispatcher.router)
app.include_router(sharing_handler.router)

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


@app.get("/health")
def check_health():
    """
    Retrieves health information from the server

    Returns:
        response: :obj:`status, timestamp`
    """
    return {
        "status": "RUNNING",
        "timestamp": op.timestamp() 
    }