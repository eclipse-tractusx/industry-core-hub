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

import pytest
from unittest.mock import AsyncMock, patch

from models.services.addons.mcp_addon.v1.session import PendingConfirmation
from managers.addons_service.mcp_addon.v1.session import InMemorySessionStore
from managers.addons_service.mcp_addon.v1.confirmation import (
    confirm_or_execute,
    _compute_args_hash,
)


class TestComputeArgsHash:
    """Tests for deterministic hashing of tool name + args."""

    def test_same_args_produce_same_hash(self):
        h1 = _compute_args_hash("create_catalog_part", {"name": "Sensor", "id": "123"})
        h2 = _compute_args_hash("create_catalog_part", {"name": "Sensor", "id": "123"})
        assert h1 == h2

    def test_different_args_produce_different_hash(self):
        h1 = _compute_args_hash("create_catalog_part", {"name": "Sensor"})
        h2 = _compute_args_hash("create_catalog_part", {"name": "Battery"})
        assert h1 != h2

    def test_different_tool_names_produce_different_hash(self):
        h1 = _compute_args_hash("create_catalog_part", {"name": "Sensor"})
        h2 = _compute_args_hash("update_catalog_part", {"name": "Sensor"})
        assert h1 != h2

    def test_key_order_does_not_matter(self):
        h1 = _compute_args_hash("tool", {"a": 1, "b": 2})
        h2 = _compute_args_hash("tool", {"b": 2, "a": 1})
        assert h1 == h2

    def test_payload_value_changes_hash(self):
        """Regression (fix 6): 'payload' participates in the hash.

        Two attach_twin_aspect calls that differ only in payload value must
        produce distinct hashes so they are staged as separate pending
        confirmations rather than colliding in the single-slot model.
        """
        base_args = {
            "global_id": "urn:uuid:1234",
            "semantic_id": "urn:samm:io.catenax.part_type_information:1.0.0#PartTypeInformation",
            "payload": {"a": 1},
        }
        different_payload_args = {**base_args, "payload": {"a": 2}}
        h1 = _compute_args_hash("attach_twin_aspect", base_args)
        h2 = _compute_args_hash("attach_twin_aspect", different_payload_args)
        assert h1 != h2


class TestConfirmOrExecute:
    """Tests for the preview/confirm state machine."""

    def setup_method(self):
        self.store = InMemorySessionStore(ttl_seconds=3600)
        self.session_id = "test-session-1"
        self.tool_name = "create_catalog_part"
        self.args = {"manufacturer_id": "BPNL000000000001", "name": "Sensor"}
        self.preview_summary = "Create catalog part 'Sensor'"

    @pytest.mark.asyncio
    async def test_first_call_returns_preview(self):
        """First call should return a preview, not execute."""
        execute_fn = AsyncMock(return_value={"catalog_part_id": "X::Y"})

        executed, result = await confirm_or_execute(
            self.store, self.session_id, self.tool_name, self.args,
            self.preview_summary, execute_fn,
        )

        assert executed is False
        assert result["status"] == "preview"
        assert result["tool"] == self.tool_name
        assert result["summary"] == self.preview_summary
        execute_fn.assert_not_called()

    @pytest.mark.asyncio
    async def test_second_identical_call_executes(self):
        """Second call with identical args should execute."""
        execute_fn = AsyncMock(return_value={"catalog_part_id": "X::Y"})

        # First call — preview
        await confirm_or_execute(
            self.store, self.session_id, self.tool_name, self.args,
            self.preview_summary, execute_fn,
        )

        # Second call — execute
        executed, result = await confirm_or_execute(
            self.store, self.session_id, self.tool_name, self.args,
            self.preview_summary, execute_fn,
        )

        assert executed is True
        assert result == {"catalog_part_id": "X::Y"}
        execute_fn.assert_called_once()

    @pytest.mark.asyncio
    async def test_different_args_re_previews(self):
        """Second call with different args should discard previous and re-preview."""
        execute_fn = AsyncMock(return_value={"catalog_part_id": "X::Y"})

        # First call — preview
        await confirm_or_execute(
            self.store, self.session_id, self.tool_name, self.args,
            self.preview_summary, execute_fn,
        )

        # Second call with different args — should re-preview
        different_args = {"manufacturer_id": "BPNL000000000002", "name": "Battery"}
        executed, result = await confirm_or_execute(
            self.store, self.session_id, self.tool_name, different_args,
            "Create catalog part 'Battery'", execute_fn,
        )

        assert executed is False
        assert result["status"] == "preview"
        assert result["summary"] == "Create catalog part 'Battery'"
        execute_fn.assert_not_called()

    @pytest.mark.asyncio
    @patch("managers.addons_service.mcp_addon.v1.confirmation._require_confirmation", return_value=False)
    async def test_confirmation_disabled_executes_immediately(self, mock_conf):
        """When confirmation is disabled, execute immediately on first call."""
        execute_fn = AsyncMock(return_value={"catalog_part_id": "X::Y"})

        executed, result = await confirm_or_execute(
            self.store, self.session_id, self.tool_name, self.args,
            self.preview_summary, execute_fn,
        )

        assert executed is True
        assert result == {"catalog_part_id": "X::Y"}
        execute_fn.assert_called_once()

    @pytest.mark.asyncio
    async def test_pending_cleared_after_execution(self):
        """After executing, the pending confirmation should be cleared."""
        execute_fn = AsyncMock(return_value={"ok": True})

        await confirm_or_execute(
            self.store, self.session_id, self.tool_name, self.args,
            self.preview_summary, execute_fn,
        )
        await confirm_or_execute(
            self.store, self.session_id, self.tool_name, self.args,
            self.preview_summary, execute_fn,
        )

        state = self.store.get(self.session_id)
        args_hash = _compute_args_hash(self.tool_name, self.args)
        assert args_hash not in state.pending_confirmations

    @pytest.mark.asyncio
    async def test_interleaved_confirmations_coexist(self):
        """Regression (fix 9): concurrent previews for different args coexist.

        Preview A, preview B — both pending simultaneously. Confirming A executes
        only A; B remains pending. Confirming B then executes B.
        """
        args_a = {"manufacturer_id": "BPNL000000000001", "name": "Sensor"}
        args_b = {"manufacturer_id": "BPNL000000000002", "name": "Battery"}
        execute_a = AsyncMock(return_value={"catalog_part_id": "A::1"})
        execute_b = AsyncMock(return_value={"catalog_part_id": "B::2"})
        hash_a = _compute_args_hash(self.tool_name, args_a)
        hash_b = _compute_args_hash(self.tool_name, args_b)

        # Stage both previews.
        await confirm_or_execute(self.store, self.session_id, self.tool_name, args_a, "Preview A", execute_a)
        await confirm_or_execute(self.store, self.session_id, self.tool_name, args_b, "Preview B", execute_b)

        state = self.store.get(self.session_id)
        assert hash_a in state.pending_confirmations, "A should be pending"
        assert hash_b in state.pending_confirmations, "B should be pending"

        # Confirm A — only execute_a should run; B must remain pending.
        executed, result = await confirm_or_execute(
            self.store, self.session_id, self.tool_name, args_a, "Preview A", execute_a
        )
        assert executed is True
        assert result == {"catalog_part_id": "A::1"}
        execute_a.assert_called_once()
        execute_b.assert_not_called()

        state = self.store.get(self.session_id)
        assert hash_a not in state.pending_confirmations, "A should be cleared after execution"
        assert hash_b in state.pending_confirmations, "B must still be pending"

        # Confirm B.
        executed, result = await confirm_or_execute(
            self.store, self.session_id, self.tool_name, args_b, "Preview B", execute_b
        )
        assert executed is True
        assert result == {"catalog_part_id": "B::2"}
        execute_b.assert_called_once()


class TestSessionStorePendingConfirmation:
    """Tests for the pending confirmation methods on InMemorySessionStore."""

    def setup_method(self):
        self.store = InMemorySessionStore(ttl_seconds=3600)
        self.session_id = "test-session-2"

    def test_set_and_get_pending_confirmation(self):
        pending = PendingConfirmation(
            tool_name="create_catalog_part",
            args_hash="abc123",
            preview_summary="Create part",
        )
        self.store.set_pending_confirmation(self.session_id, pending)
        state = self.store.get(self.session_id)
        assert state is not None
        assert state.pending_confirmations["abc123"].tool_name == "create_catalog_part"
        assert state.pending_confirmations["abc123"].args_hash == "abc123"

    def test_clear_pending_confirmation(self):
        pending = PendingConfirmation(
            tool_name="share_catalog_part",
            args_hash="xyz789",
            preview_summary="Share part",
        )
        self.store.set_pending_confirmation(self.session_id, pending)
        self.store.clear_pending_confirmation(self.session_id, "xyz789")
        state = self.store.get(self.session_id)
        assert "xyz789" not in state.pending_confirmations

    def test_clear_nonexistent_session_is_noop(self):
        self.store.clear_pending_confirmation("nonexistent-session", "somehash")
        # Should not raise

    def test_pending_confirmations_capped(self):
        """Regression (step 4): oldest entries are evicted beyond the cap.

        Patches ConfigManager to return a cap of 2, then inserts 3 distinct
        pending confirmations. The oldest (first inserted) must be evicted so
        the dict never exceeds the cap.
        """
        with patch(
            "managers.addons_service.mcp_addon.v1.session.ConfigManager.get_config",
            side_effect=lambda key, default=None: 2 if key == "addons.mcp_addon.max_pending_confirmations" else default,
        ):
            for i in range(3):
                self.store.set_pending_confirmation(
                    self.session_id,
                    PendingConfirmation(
                        tool_name="create_catalog_part",
                        args_hash=f"hash-{i}",
                        preview_summary=f"Part {i}",
                    ),
                )

        state = self.store.get(self.session_id)
        assert len(state.pending_confirmations) == 2, "Dict must not exceed cap"
        assert "hash-0" not in state.pending_confirmations, "Oldest entry must be evicted"
        assert "hash-1" in state.pending_confirmations
        assert "hash-2" in state.pending_confirmations
