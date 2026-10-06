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

from typing import Optional
from pydantic import BaseModel


class AuditRecord(BaseModel):
    """One structured audit log entry per MCP tool call."""

    timestamp: str
    mcp_session_id: str
    mcp_tool_name: str
    redacted_args: dict
    end_user_sub: str
    outcome: str  # "success" | "error"
    duration_ms: int
    downstream_ids: list[str]
    error_message: Optional[str] = None
