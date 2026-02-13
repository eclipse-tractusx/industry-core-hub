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

from fastapi import FastAPI, Request, APIRouter
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
import os

from tools.exceptions import BaseError, ValidationError
from tools.constants import API_V1, API_V2
from managers.config.config_manager import ConfigManager

from tractusx_sdk.dataspace.tools import op

from .routers.provider.v1 import (
    part_management,
    partner_management,
    twin_management,
    submodel_dispatcher,
    sharing_handler,
    system_management,
)
from .routers.consumer.v1 import (
    connection_management,
    discovery_management
)

from .routers.provider.v2 import (
    twin_management as twin_management_v2,
    sharing_handler as sharing_handler_v2,
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
        "name": "System Management",
        "description": "Management of integrated system components (EDC, DTR, etc.)"
    },
    {
        "name": "Open Connection Management",
        "description": "Handles the connections from the consumer modules, for specific services like digital twin registry and data endpoints"
    },
    {
        "name": "Part Discovery Management",
        "description": "Management of the discovery of parts, searching for digital twins and digital twins registries"
    },
]

app = FastAPI(title="Industry Core Hub Backend API", version="0.0.1", openapi_tags=tags_metadata)

# Configure CORS middleware based on environment and configuration
def get_cors_origins():
    """Get CORS origins from environment variables and configuration."""
    # Start with default localhost origins for development
    default_origins = [
        "http://localhost:5173",  # Vite dev server
        "http://localhost:3000",  # React dev server
        "http://localhost:8080",  # Alternative frontend port
        "http://127.0.0.1:5173",  # Alternative localhost notation
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8080",
    ]
    
    # Add origins from environment variables (for container deployments)
    env_origins = []
    
    # Check for CORS_ORIGINS environment variable (comma-separated)
    cors_origins_env = os.getenv("CORS_ORIGINS")
    if cors_origins_env:
        env_origins.extend([origin.strip() for origin in cors_origins_env.split(",")])
    
    # Check for individual frontend URL environment variable
    frontend_url = os.getenv("FRONTEND_URL")
    if frontend_url:
        env_origins.append(frontend_url)
    
    # Try to get origins from configuration file
    try:
        config = ConfigManager.get_config()
        if config and "cors" in config and "allow_origins" in config["cors"]:
            config_origins = config["cors"]["allow_origins"]
            if isinstance(config_origins, list):
                env_origins.extend(config_origins)
    except Exception:
        # If config loading fails, continue with defaults
        pass
    
    # Combine all origins and remove duplicates
    all_origins = list(set(default_origins + env_origins))
    
    # In production, you might want to be more restrictive
    if os.getenv("ENVIRONMENT") == "production":
        # Filter out localhost origins in production
        all_origins = [origin for origin in all_origins if not ("localhost" in origin or "127.0.0.1" in origin)]
    
    return all_origins

# Check if CORS is enabled (default to True for development)
cors_enabled = os.getenv("CORS_ENABLED", "true").lower() == "true"

if cors_enabled:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=get_cors_origins(),
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        allow_headers=["*"],
    )

## Include here all the routers for the application.
# API Version 1
v1_router = APIRouter(prefix=f"/{API_V1}")
v1_router.include_router(part_management.router)
v1_router.include_router(partner_management.router)
v1_router.include_router(twin_management.router)
v1_router.include_router(submodel_dispatcher.router)
v1_router.include_router(sharing_handler.router)
v1_router.include_router(system_management.router)
v1_router.include_router(connection_management.router)
v1_router.include_router(discovery_management.router)

# API Version 2
v2_router = APIRouter(prefix=f"/{API_V2}")
v2_router.include_router(twin_management_v2.router)
v2_router.include_router(sharing_handler_v2.router)

# Include the API version 1 router into the main app
app.include_router(v1_router)
app.include_router(v2_router)

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
