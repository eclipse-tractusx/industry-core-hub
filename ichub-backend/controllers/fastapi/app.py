#################################################################################
# Eclipse Tractus-X - Industry Core Hub Backend
#
# Copyright (c) 2026 LKS Next
# Copyright (c) 2026 Capgemini Deutschland GmbH
# Copyright (c) 2025 DRÄXLMAIER Group
# (represented by Lisa Dräxlmaier GmbH)
# Copyright (c) 2026 Contributors to the Eclipse Foundation
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

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, APIRouter
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi
import os
from tools.exceptions import BaseError
from tools.constants import API_V1
from managers.config.config_manager import ConfigManager
from managers.config.log_manager import LoggingManager

logger = LoggingManager.get_logger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler. Asset registration is handled by the Kubernetes asset-sync Job."""

    if ConfigManager.get_config("addons.mcp_addon.enabled", True):
        import asyncio
        from contextlib import AsyncExitStack
        from managers.addons_service.mcp_addon.v1.server import mcp_http_app
        from managers.addons_service.mcp_addon.v1.session import session_store

        eviction_interval: int = ConfigManager.get_config(
            "addons.mcp_addon.session_eviction_interval_seconds", 300
        )

        async def _eviction_loop() -> None:
            while True:
                await asyncio.sleep(eviction_interval)
                try:
                    n = session_store.evict_expired()
                    if n:
                        logger.debug("MCP session eviction: removed %d expired session(s).", n)
                except Exception:
                    logger.exception("Unexpected error during MCP session eviction sweep.")

        async with AsyncExitStack() as stack:
            await stack.enter_async_context(mcp_http_app.lifespan(mcp_http_app))
            eviction_task = asyncio.create_task(_eviction_loop(), name="mcp-session-eviction")
            try:
                yield
            finally:
                eviction_task.cancel()
                try:
                    await eviction_task
                except asyncio.CancelledError:
                    # Expected: cancelling the task above raises CancelledError
                    # when we await it. Nothing to clean up, so swallow it.
                    pass
    else:
        yield

from tractusx_sdk.dataspace.tools import op

from .routers.provider.v1 import (
    part_management,
    partner_management,
    twin_management,
    submodel_dispatcher,
    sharing_handler
)
from .routers.consumer.v1 import (
    connection_management,
    discovery_management
)
from .routers.notifications.v1 import (
    digital_twin_event_api,
    notifications_management,
    unique_id_push_api
)
from .routers.addons import addons

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
    },
    {
        "name": "Part Discovery Management",
        "description": "Management of the discovery of parts, searching for digital twins and digital twins registries"
    },
    {
        "name": "Digital Twin Event Management",
        "description": "Endpoints for receiving notifications about events related to digital twins, such as updates or changes in the twin data"
    },
    {
        "name": "Notifications Management",
        "description": "Endpoints for managing notifications, such as retrieving, deleting or marking notifications related to digital twins and part sharing"
    },
    {
        "name": "Unique ID Push Notifications",
        "description": "Endpoints for receiving Unique ID Push notifications (CX-0126) to link child digital twins to their parents"
    },
    {
        "name": "Add-Ons Microservices",
        "description": "Auxiliary add-ons such as Eco Pass Kit"
    },
    {
        "name": "EcoPass KIT Microservices",
        "description": "Provider-side EcoPass KIT endpoints"
    },
    {
        "name": "PCF KIT Microservices",
        "description": "Provider-side PCF KIT endpoints"
    },
    {
        "name": "MCP Addon Microservices",
        "description": "MCP Addon endpoints — AI tool surface over Model Context Protocol (enabled by default; disable via addons.mcp_addon.enabled)"
    }
]

app = FastAPI(title="Industry Core Hub Backend API", version="0.0.1", openapi_tags=tags_metadata, lifespan=lifespan)

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
v1_router.include_router(connection_management.router)
v1_router.include_router(discovery_management.router)
v1_router.include_router(digital_twin_event_api.router)
v1_router.include_router(notifications_management.router)
v1_router.include_router(unique_id_push_api.router)
v1_router.include_router(addons.router)

# Include the API version 1 router into the main app
app.include_router(v1_router)

# Mount the MCP Addon ASGI sub-application when the add-on is enabled.
# The REST router (health, audit) is included via addons.py above.
# The FastMCP streamable-HTTP transport needs a top-level mount so that
# MCP clients (Claude Desktop, Copilot) can reach it without the /api/v1 prefix.
if ConfigManager.get_config("addons.mcp_addon.enabled", True):
    from starlette.routing import Route
    from managers.addons_service.mcp_addon.v1.server import (
        mcp_http_app, _auth_provider, mcp_well_known_routes, mcp_mount_parent_path,
    )
    # Mount the sub-app at the PARENT of the configured endpoint (e.g.
    # "/addons/mcp-addon"), not at the endpoint itself. The streamable-HTTP route
    # is registered inside the sub-app as the leaf (e.g. "/mcp"), so the full
    # endpoint resolves as an exact route match and clients can connect with or
    # without a trailing slash. Mounting at the leaf would make it a mount root,
    # which Starlette only matches WITH the slash (307-redirecting otherwise and
    # breaking the POST-based MCP handshake).
    _mcp_mount_path = mcp_mount_parent_path
    if ConfigManager.get_config("authorization.enabled", False) and _auth_provider is None:
        import logging as _logging
        _logging.getLogger(__name__).error(
            "[MCP Addon] Authorization is enabled but no auth provider could be built. "
            "The MCP endpoint will NOT be mounted to prevent unauthenticated access."
        )
    else:
        app.mount(_mcp_mount_path, mcp_http_app)
        # RFC 9728: serve OAuth protected-resource metadata at the host root so
        # MCP clients (Claude Desktop, Copilot) can discover the authorization
        # server. FastMCP registers these routes inside the mounted sub-app,
        # where the doubly-prefixed path is unreachable by clients, so we
        # re-register them on the parent app at the correct root-level path.
        for _wk_route in mcp_well_known_routes:
            app.router.routes.append(_wk_route)
            # Also answer the no-trailing-slash variant for clients that strip it.
            if _wk_route.path.endswith("/"):
                app.router.routes.append(
                    Route(
                        _wk_route.path.rstrip("/"),
                        endpoint=_wk_route.endpoint,
                        methods=_wk_route.methods,
                    )
                )


def custom_openapi():
    """
    Add custom tag grouping so add-ons appear nested under the Add-Ons section.
    """
    if app.openapi_schema:
        return app.openapi_schema

    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
        tags=tags_metadata,
    )

    openapi_schema["x-tagGroups"] = [
        {
            "name": "Core Services",
            "tags": [
                "Part Management",
                "Sharing Functionality",
                "Partner Management",
                "Twin Management",
                "Submodel Dispatcher",
                "Open Connection Management",
                "Part Discovery Management",
                "Digital Twin Event Management",
                "Notifications Management",
                "Unique ID Push Notifications"
            ],
        },
        {
            "name": "Add-Ons",
            "tags": [
                "Add-Ons Microservices",
                "EcoPass KIT Microservices",
                "EcoPass KIT Consumer Microservices",
                "PCF KIT Microservices",
                "MCP Addon Microservices"
            ],
        },
    ]

    app.openapi_schema = openapi_schema
    return app.openapi_schema


app.openapi = custom_openapi

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
    Returns the first error message plus a list of all field-level errors so callers
    can see exactly which fields failed and why.
    """
    errors = exc.errors()
    message = errors[0]["msg"] if errors else "Validation error"
    details = [
        f"{' -> '.join(str(loc) for loc in e['loc'])}: {e['msg']}"
        for e in errors
    ]
    return JSONResponse(
        status_code=422,
        content={"status": 422, "message": message, "details": details}
    )

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
