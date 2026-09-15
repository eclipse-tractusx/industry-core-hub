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

# Preview / confirm state machine for write tools.
#
# When addons.mcp_addon.require_confirmation_for_writes is true:
#   - First call to a write tool returns a preview DTO and stages the action
#     in the session keyed by hash(tool_name, normalized_args).
#   - Second call with identical args executes the staged action.
#   - Calls with different args are staged independently, keyed by their own
#     hash; they coexist as separate pending confirmations and each executes
#     on a later call with identical args.
# When the flag is false, write tools execute on the first call.

from __future__ import annotations

import hashlib
import json
from typing import Any, Callable, Awaitable

from managers.config.config_manager import ConfigManager
from models.services.addons.mcp_addon.v1.session import PendingConfirmation


def _compute_args_hash(tool_name: str, args: dict[str, Any]) -> str:
    """Deterministic hash over the tool name and its normalised arguments."""
    canonical = json.dumps({"tool": tool_name, "args": args}, sort_keys=True, default=str)
    return hashlib.sha256(canonical.encode()).hexdigest()


def _require_confirmation() -> bool:
    """Return True when the operator has enabled the preview/confirm gate."""
    return bool(ConfigManager.get_config(
        "addons.mcp_addon.require_confirmation_for_writes", True,
    ))


async def confirm_or_execute(
    session_store,
    session_id: str,
    tool_name: str,
    args: dict[str, Any],
    preview_summary: str,
    execute_fn: Callable[[], Awaitable[Any]],
) -> tuple[bool, Any]:
    """Preview/confirm gate for write tools.

    Returns ``(executed, result)`` where:
    - ``executed=False, result=preview_dict`` on first call (preview staged).
    - ``executed=True,  result=<execute_fn output>`` on confirmed second call.

    When ``require_confirmation_for_writes`` is ``false`` the action is
    executed immediately on the first call.
    """
    if not _require_confirmation():
        return True, await execute_fn()

    args_hash = _compute_args_hash(tool_name, args)
    pending = session_store.get_pending_confirmation(session_id, args_hash)

    # Second call with identical args → execute and clear.
    if pending and pending.tool_name == tool_name:
        session_store.clear_pending_confirmation(session_id, args_hash)
        return True, await execute_fn()

    # First call (or different args) → stage preview.
    session_store.set_pending_confirmation(
        session_id,
        PendingConfirmation(
            tool_name=tool_name,
            args_hash=args_hash,
            preview_summary=preview_summary,
        ),
    )
    return False, {
        "status": "preview",
        "message": (
            "This is a preview of the write operation. "
            "Call the same tool again with identical arguments to execute."
        ),
        "tool": tool_name,
        "summary": preview_summary,
        "args": args,
    }
