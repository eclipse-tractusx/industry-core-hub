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

from fastapi import FastAPI, Request, APIRouter, Header, Body
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

from tools.exceptions import BaseError, ValidationError
from tools.constants import API_V1

from tractusx_sdk.dataspace.tools import op

from .routers.provider.api_v1 import (
    part_management,
    partner_management,
    twin_management,
    submodel_dispatcher,
    sharing_handler
)
from .routers.consumer.api_v1 import (
    connection_management
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
    },
    {
        "name": "Open Connection Management",
        "description": "Handles the connections from the consumer modules, for specific services like digital twin registry and data endpoints"
    }
]

app = FastAPI(title="Industry Core Hub Backend API", version="0.0.1", openapi_tags=tags_metadata)

## Include here all the routers for the application.
# API Version 1
v1_router = APIRouter(prefix=f"/{API_V1}")
v1_router.include_router(part_management.router)
v1_router.include_router(partner_management.router)
v1_router.include_router(twin_management.router)
v1_router.include_router(submodel_dispatcher.router)
v1_router.include_router(sharing_handler.router)
v1_router.include_router(connection_management.router)

# Include the API version 1 router into the main app
app.include_router(v1_router)

@app.exception_handler(BaseError)
async def base_error_exception_handler(
    request: Request,
    exc: BaseError) -> JSONResponse:
    """
    Generic exception handler for all exceptions derived from BaseError.
    """
    return JSONResponse(status_code=exc.status_code, content=exc.detail.model_dump())

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """
    Exception handler for validation errors.
    """
    raise ValidationError(exc.errors()[0]["msg"])

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
