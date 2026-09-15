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

from pydantic import BaseModel, Field


class PendingConfirmation(BaseModel):
    """A staged write-tool invocation awaiting the user's second call.

    Populated by the confirmation state machine (Step 6).
    """

    tool_name: str
    args_hash: str
    preview_summary: str


class SessionState(BaseModel):
    """IC-Hub domain state held for one MCP session.

    Populated incrementally by tool calls so the LLM can refer back to
    previously seen entities (e.g. "the battery part", "the BMW twin").
    """

    session_id: str

    # Discovery — known partner BPNLs returned by list_known_partners /
    # find_partner_by_bpn (populated in Steps 1-4).
    bpnls: list[str] = Field(default_factory=list)

    # Consumption — twin IDs seen in list_partner_twins / get_twin_details
    # (populated in Step 4).
    twin_ids: list[str] = Field(default_factory=list)

    # Provision — catalog-part IDs seen in list_my_catalog_parts /
    # create_catalog_part (populated in Steps 6-7).
    catalog_part_ids: list[str] = Field(default_factory=list)

    # Write-tool confirmation — pending writes keyed by args_hash, awaiting
    # user re-invocation with identical args (populated in Step 6).
    pending_confirmations: dict[str, PendingConfirmation] = Field(default_factory=dict)
