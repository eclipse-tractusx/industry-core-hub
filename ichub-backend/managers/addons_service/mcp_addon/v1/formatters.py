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

# Converts service / manager results into flat, LLM-friendly DTOs.
#
# Keeps tool implementations free of formatting concerns and makes it easy
# to iterate on the shape returned to the LLM without touching adapter logic.

from managers.config.log_manager import LoggingManager

logger = LoggingManager.get_logger(__name__)


def _extract_semantic_id(submodel: dict) -> str:
    """Extract semantic ID string from an AAS submodel descriptor."""
    sem = submodel.get("semanticId", {})
    if isinstance(sem, dict):
        keys = sem.get("keys", [])
        if keys:
            return keys[0].get("value", "")
        return sem.get("value", "")
    return str(sem) if sem else ""


def format_shell(shell: dict) -> dict:
    """Flatten an AAS shell descriptor to a concise LLM-friendly dict."""
    submodels = [
        {"id": sm.get("id"), "semantic_id": _extract_semantic_id(sm)}
        for sm in shell.get("submodelDescriptors", [])
    ]
    return {
        "twin_id": shell.get("id"),
        "global_asset_id": shell.get("globalAssetId"),
        "id_short": shell.get("idShort"),
        "submodel_count": len(submodels),
        "submodels": submodels,
    }


def format_shells(result: dict) -> list[dict]:
    """Flatten a discover_shells() response to a list of twin summaries."""
    return [format_shell(s) for s in result.get("shellDescriptors", [])]


def format_submodel_descriptors(result: dict) -> list[dict]:
    """Flatten a discover_submodels() response to a list of submodel summaries."""
    raw = result.get("submodelDescriptors")

    if isinstance(raw, dict):
        descriptors = raw
    elif isinstance(raw, list):
        logger.warning(
            "format_submodel_descriptors: expected dict (sm_id -> descriptor) but got list; "
            "adapting using each entry's 'id' field. This may indicate a raw AAS-3 response."
        )
        descriptors = {item.get("id", f"unknown_{i}"): item for i, item in enumerate(raw)}
    else:
        logger.warning(
            "format_submodel_descriptors: 'submodelDescriptors' is missing or has unexpected "
            "type %s; returning empty list.",
            type(raw).__name__,
        )
        return []

    return [
        {
            "submodel_id": sm_id,
            "semantic_id": _extract_semantic_id(desc),
            "status": desc.get("status"),
            "connector_url": desc.get("connectorUrl"),
        }
        for sm_id, desc in descriptors.items()
    ]


def format_submodel_fetch(result: dict) -> dict:
    """Flatten a discover_submodel() response to descriptor metadata + payload."""
    descriptor = result.get("submodelDescriptor") or {}
    return {
        "submodel_id": descriptor.get("submodelId") if isinstance(descriptor, dict) else None,
        "semantic_id": _extract_semantic_id(descriptor) if isinstance(descriptor, dict) else None,
        "status": descriptor.get("status") if isinstance(descriptor, dict) else None,
        "data": result.get("submodel"),
    }


# --------------- Write-tool formatters ---------------


def format_created_part(result: dict) -> dict:
    """Format a newly created or updated catalog part for the LLM."""
    return {
        "catalog_part_id": result.get("catalog_part_id"),
        "manufacturer_id": result.get("manufacturer_id"),
        "manufacturer_part_id": result.get("manufacturer_part_id"),
        "name": result.get("name"),
        "category": result.get("category"),
        "bpns": result.get("bpns"),
        "status": result.get("status"),
    }


def format_created_serialized_part(result: dict) -> dict:
    """Format a newly created serialized part for the LLM."""
    return {
        "manufacturer_id": result.get("manufacturer_id"),
        "manufacturer_part_id": result.get("manufacturer_part_id"),
        "part_instance_id": result.get("part_instance_id"),
        "customer_part_id": result.get("customer_part_id"),
        "van": result.get("van"),
        "name": result.get("name"),
    }


def format_shared_part(result: dict) -> dict:
    """Format a share_catalog_part result for the LLM."""
    return {
        "business_partner_number": result.get("business_partner_number"),
        "customer_part_ids": result.get("customer_part_ids"),
        "shared_at": result.get("shared_at"),
        "twin": result.get("twin"),
        "bpn_discovery_registered": result.get("bpn_discovery_registered"),
    }


def format_created_partner(result: dict) -> dict:
    """Format a newly registered business partner for the LLM."""
    return {
        "bpnl": result.get("bpnl"),
        "name": result.get("name"),
    }


def format_created_twin(result: dict) -> dict:
    """Format a newly created digital twin for the LLM."""
    return {
        "global_id": result.get("global_id"),
        "dtr_aas_id": result.get("dtr_aas_id"),
        "created_date": result.get("created_date"),
    }


def format_created_aspect(result: dict) -> dict:
    """Format a newly attached twin aspect for the LLM."""
    return {
        "submodel_id": result.get("submodel_id"),
        "semantic_id": result.get("semantic_id"),
        "global_id": result.get("global_id"),
    }


def format_shared_dpp(result: dict) -> dict:
    """Format a share_dpp result for the LLM."""
    return {
        "dpp_id": result.get("dpp_id"),
        "business_partner_number": result.get("business_partner_number"),
        "success": result.get("success"),
        "bpn_discovery_registered": result.get("bpn_discovery_registered"),
    }
