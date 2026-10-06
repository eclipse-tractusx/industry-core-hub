#################################################################################
# Eclipse Tractus-X - Industry Core Hub Backend
#
# Copyright (c) 2026 Capgemini Deutschland GmbH
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

# MCP Addon top-level router.

from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse

from managers.config.config_manager import ConfigManager

router = APIRouter(
    prefix="/mcp-addon",
    tags=["MCP Addon Microservices"],
)


@router.get("/health", include_in_schema=True)
async def health():
    """Liveness check for the MCP Addon add-on."""
    return JSONResponse({"status": "ok", "addon": "mcp_addon"})


if ConfigManager.get_config("addons.mcp_addon.audit.expose_admin_endpoint", True):

    @router.get("/audit", include_in_schema=True)
    async def get_audit_log(limit: int = Query(default=50, ge=1, le=500)):
        """Return recent MCP Addon tool-call audit records (newest last).

        Each record contains mcp_tool_name, mcp_session_id, end_user_sub,
        outcome, duration_ms, downstream_ids, and timestamp.
        """
        from managers.addons_service.mcp_addon.v1.audit import audit_logger
        records = audit_logger.get_recent(limit)
        return JSONResponse([r.model_dump() for r in records])
