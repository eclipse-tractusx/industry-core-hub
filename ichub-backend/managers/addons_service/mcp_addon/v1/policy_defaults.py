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

# Loads consumer-side policy defaults for MCP tools from existing backend config:
#
#   DTR policies     — reuses provider.digitalTwinRegistry.policy.usage.
#                      The same Catena-X standard policy this hub offers its own
#                      DTR under is what partners also require for their DTRs.
#
#   Governance       — reads per-semantic-ID policies from
#                      addons.mcp_addon.consumption.governance (Saturn shorthand).
#
# Both paths normalise to the singular-key, context-free format the DTR SDK expects.

from managers.config.config_manager import ConfigManager


def _to_sdk_policy(policy: dict) -> dict:
    """Normalise a provider-format policy to the SDK consumer format.

    Converts plural keys (permissions/prohibitions/obligations) → singular,
    also accepts already-singular keys, and drops the JSON-LD context.
    """
    result = {}
    for plural, singular in [
        ("permissions", "permission"),
        ("prohibitions", "prohibition"),
        ("obligations", "obligation"),
    ]:
        result[singular] = policy.get(plural) or policy.get(singular, [])
    return result


def get_dtr_policies() -> list[dict] | None:
    """Return DTR governance policies derived from provider.digitalTwinRegistry.policy.usage."""
    usage = ConfigManager.get_config("provider.digitalTwinRegistry.policy.usage", None)
    if not usage:
        return None
    return [_to_sdk_policy(usage)]


def get_governance_for_semantic_id(semantic_id: str) -> list[dict]:
    """Return governance policies for a specific semantic ID derived from agreements[].usage."""
    agreements = ConfigManager.get_config("agreements", []) or []
    for entry in agreements:
        if entry.get("semanticid") == semantic_id:
            usage = entry.get("usage")
            return [_to_sdk_policy(usage)] if usage else []
    return []
