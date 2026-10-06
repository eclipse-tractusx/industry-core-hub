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

# Structured audit logger for MCP Addon tool calls.
#
# Every tool call passes through `audit_logger.record_call()` which:
#   - Times the call
#   - Captures outcome (success / error)
#   - Logs a structured line via IC-Hub's LoggingManager
#   - Appends an AuditRecord to an in-process ring buffer
#
# The ring buffer powers the REST admin endpoint
# GET /v1/addons/mcp-addon/audit (see controllers/…/mcp_addon.py).
# No new database tables; no Alembic migrations.

import time
from collections import deque
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Optional

from managers.config.config_manager import ConfigManager
from managers.config.log_manager import LoggingManager
from models.services.addons.mcp_addon.v1.audit import AuditRecord

logger = LoggingManager.get_logger(__name__)

# Keys whose values are redacted before logging (never log credentials).
_REDACT_KEYS = frozenset({"api_key", "token", "password", "secret"})


def _redact(args: dict) -> dict:
    return {k: ("***" if k in _REDACT_KEYS else v) for k, v in args.items()}


class AuditLogger:
    """Thread-safe in-process audit log with a fixed-size ring buffer."""

    def __init__(self, buffer_size: int = 500) -> None:
        self._buffer: deque[AuditRecord] = deque(maxlen=buffer_size)

    @asynccontextmanager
    async def record_call(
        self,
        session_id: str,
        tool_name: str,
        args: dict,
        user_sub: str = "anonymous",
    ):
        """Async context manager that wraps one tool call with timing + audit.

        Yields a mutable ``meta`` dict. Tools may set ``meta["downstream_ids"]``
        to a list of IDs (twin_ids, submodel_ids, etc.) produced by the call.

        Usage::

            async with audit_logger.record_call(ctx.session_id, "my_tool", {"arg": v}) as meta:
                result = do_work()
                meta["downstream_ids"] = [result["twin_id"]]
                return result
        """
        start = time.monotonic()
        outcome = "success"
        error_message: Optional[str] = None
        meta: dict = {"downstream_ids": []}

        try:
            yield meta
        except Exception as exc:
            outcome = "error"
            error_message = str(exc)
            raise
        finally:
            duration_ms = int((time.monotonic() - start) * 1000)
            record = AuditRecord(
                timestamp=datetime.now(timezone.utc).isoformat(),
                mcp_session_id=session_id,
                mcp_tool_name=tool_name,
                redacted_args=_redact(args),
                end_user_sub=user_sub,
                outcome=outcome,
                duration_ms=duration_ms,
                downstream_ids=meta.get("downstream_ids", []),
                error_message=error_message,
            )
            self._buffer.append(record)
            logger.info(
                "[MCP AUDIT] tool=%s session=%s user=%s outcome=%s duration_ms=%d",
                tool_name,
                session_id,
                user_sub,
                outcome,
                duration_ms,
            )

    def get_recent(self, limit: int = 50) -> list[AuditRecord]:
        """Return up to ``limit`` most-recent audit records."""
        entries = list(self._buffer)
        return entries[-limit:] if limit < len(entries) else entries


# Module-level singleton imported by server.py and the REST endpoint.
audit_logger = AuditLogger(
    buffer_size=int(ConfigManager.get_config("addons.mcp_addon.audit.buffer_size", 500))
)
