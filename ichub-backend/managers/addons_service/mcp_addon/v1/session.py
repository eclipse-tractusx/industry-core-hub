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

# SessionStore interface and InMemorySessionStore implementation.
#
# Holds per-MCP-session IC-Hub domain state (known BPNLs, twin IDs, etc.)
# independently of FastMCP's own protocol-level state.
# TTL is read from addons.mcp_addon.session_ttl_seconds (default 7200 s).
#
# For multi-replica deployments, replace with a shared session store implementation.

import time
from abc import ABC, abstractmethod

from managers.config.config_manager import ConfigManager
from models.services.addons.mcp_addon.v1.session import PendingConfirmation, SessionState


class SessionStore(ABC):
    """Interface for IC-Hub MCP session state."""

    @abstractmethod
    def get(self, session_id: str) -> SessionState | None:
        """Return the session state, or None if absent or expired."""

    @abstractmethod
    def put(self, session_id: str, state: SessionState) -> None:
        """Persist (or update) the session state, resetting its idle TTL."""

    @abstractmethod
    def delete(self, session_id: str) -> None:
        """Remove the session state."""

    def get_or_create(self, session_id: str) -> SessionState:
        """Return existing state or create a fresh one for this session."""
        state = self.get(session_id)
        if state is None:
            state = SessionState(session_id=session_id)
            self.put(session_id, state)
        return state

    @abstractmethod
    def merge_bpnls(self, session_id: str, new_ids: list[str]) -> None:
        """Atomically append new_ids to bpnls, preserving order and deduplicating.

        Implementations must not call await internally; synchronous execution
        guarantees atomicity in asyncio's single-threaded model.
        NOTE: Redis implementations must use a server-side atomic operation.
        """

    @abstractmethod
    def merge_twin_ids(self, session_id: str, new_ids: list[str]) -> None:
        """Atomically append new_ids to twin_ids, preserving order and deduplicating.

        Same atomicity contract as merge_bpnls.
        """

    @abstractmethod
    def merge_catalog_part_ids(self, session_id: str, new_ids: list[str]) -> None:
        """Atomically append new_ids to catalog_part_ids, preserving order and deduplicating.

        Same atomicity contract as merge_bpnls.
        """

    def set_pending_confirmation(self, session_id: str, pending: PendingConfirmation) -> None:
        """Stage a write-tool preview for later confirmation.

        Inserts (or replaces) the entry keyed by ``pending.args_hash``.
        After insertion, the oldest entries are evicted until the dict size is
        at or below ``addons.mcp_addon.max_pending_confirmations`` (default 50).
        This bounds memory in sessions where a client previews many distinct
        write calls without confirming them.
        """
        state = self.get_or_create(session_id)
        state.pending_confirmations[pending.args_hash] = pending
        # Evict oldest entries (FIFO via dict insertion order) beyond the cap.
        cap = max(1, int(ConfigManager.get_config("addons.mcp_addon.max_pending_confirmations", 50)))
        while len(state.pending_confirmations) > cap:
            state.pending_confirmations.pop(next(iter(state.pending_confirmations)))
        self.put(session_id, state)

    def get_pending_confirmation(self, session_id: str, args_hash: str) -> PendingConfirmation | None:
        """Return a pending confirmation by args_hash, or None if not found."""
        state = self.get(session_id)
        if state is None:
            return None
        return state.pending_confirmations.get(args_hash)

    def clear_pending_confirmation(self, session_id: str, args_hash: str) -> None:
        """Remove a pending write-tool confirmation after execution."""
        state = self.get(session_id)
        if state is not None:
            state.pending_confirmations.pop(args_hash, None)
            self.put(session_id, state)


class InMemorySessionStore(SessionStore):
    """Thread-safe in-process session store with idle-TTL eviction.

    Each call to ``get`` or ``put`` resets the idle timer for that session.
    Sessions that have not been accessed for ``ttl_seconds`` are evicted on
    the next ``get`` for that session ID.
    """

    def __init__(self, ttl_seconds: int = 7200) -> None:
        self._ttl = ttl_seconds
        # Maps session_id -> (SessionState, last_access_monotonic)
        self._store: dict[str, tuple[SessionState, float]] = {}

    def get(self, session_id: str) -> SessionState | None:
        entry = self._store.get(session_id)
        if entry is None:
            return None
        state, last_access = entry
        if time.monotonic() - last_access > self._ttl:
            del self._store[session_id]
            return None
        # Refresh idle timer on access
        self._store[session_id] = (state, time.monotonic())
        return state

    def put(self, session_id: str, state: SessionState) -> None:
        self._store[session_id] = (state, time.monotonic())

    def delete(self, session_id: str) -> None:
        self._store.pop(session_id, None)

    def merge_bpnls(self, session_id: str, new_ids: list[str]) -> None:
        if not new_ids:
            return
        state = self.get_or_create(session_id)
        state.bpnls = list(dict.fromkeys(state.bpnls + [i for i in new_ids if i not in state.bpnls]))
        self.put(session_id, state)

    def merge_twin_ids(self, session_id: str, new_ids: list[str]) -> None:
        if not new_ids:
            return
        state = self.get_or_create(session_id)
        state.twin_ids = list(dict.fromkeys(state.twin_ids + [i for i in new_ids if i not in state.twin_ids]))
        self.put(session_id, state)

    def merge_catalog_part_ids(self, session_id: str, new_ids: list[str]) -> None:
        if not new_ids:
            return
        state = self.get_or_create(session_id)
        state.catalog_part_ids = list(dict.fromkeys(state.catalog_part_ids + [i for i in new_ids if i not in state.catalog_part_ids]))
        self.put(session_id, state)

    def evict_expired(self) -> int:
        """Remove all entries whose idle time exceeds the TTL.

        Returns the number of sessions evicted. Safe to call from a single-
        threaded asyncio event loop without a lock.
        """
        now = time.monotonic()
        expired = [
            sid
            for sid, (_, last_access) in self._store.items()
            if now - last_access > self._ttl
        ]
        for sid in expired:
            self._store.pop(sid, None)
        return len(expired)


def create_session_store() -> SessionStore:
    """Factory — returns the store based on configuration."""
    ttl = ConfigManager.get_config("addons.mcp_addon.session_ttl_seconds", 7200)
    return InMemorySessionStore(ttl_seconds=ttl)


# Module-level singleton — imported by server.py, confirmation.py and the
# app lifespan eviction loop. Exported explicitly so it is recognised as the
# module's public state and not flagged as an unused global.
session_store: SessionStore = create_session_store()

__all__ = ["SessionStore", "InMemorySessionStore", "create_session_store", "session_store"]
