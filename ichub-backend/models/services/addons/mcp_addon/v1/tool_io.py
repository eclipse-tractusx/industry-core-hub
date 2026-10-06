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

# Per-tool Pydantic request / response DTOs.
# Populated incrementally as tools are implemented in Steps 1–8.

from typing import Any

from pydantic import BaseModel, Field

from models.services.consumer.discovery_management import QuerySpec

__all__ = ["QuerySpec", "OdrlPolicy"]


class OdrlPolicy(BaseModel):
    """One ODRL policy object accepted by the IC-Hub EDC negotiation layer.

    All three lists default to empty, matching the normalised SDK format
    produced by policy_defaults._to_sdk_policy().

    Most callers should omit the ``governance`` parameter entirely and let
    IC-Hub derive the policy from ``semantic_id`` automatically.
    """

    permission: list[Any] = Field(
        default_factory=list,
        description=(
            "ODRL permission rules. Each rule is an object with an 'action' key "
            "(e.g. 'use') and an optional 'constraint' object."
        ),
    )
    prohibition: list[Any] = Field(
        default_factory=list,
        description="ODRL prohibition rules. Usually empty for Catena-X standard policies.",
    )
    obligation: list[Any] = Field(
        default_factory=list,
        description="ODRL obligation rules. Usually empty for Catena-X standard policies.",
    )
