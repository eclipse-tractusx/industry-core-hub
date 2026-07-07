#################################################################################
# Eclipse Tractus-X - Industry Core Hub Backend
#
# Copyright (c) 2025 Contributors to the Eclipse Foundation
#
# See the NOTICE file(s) distributed with this work for additional
# information regarding copyright ownership.
#
# This program and the accompanying materials are made available under the
# terms of the Apache License, Version 2.0 which is available at
# https://www.apache.org/licenses/LICENSE-2.0.
#
# Unless required by applicable law or agreed in writing, software
# distributed under the License is distributed on an "AS IS" BASIS
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND,
# either express or implied. See the
# License for the specific language govern in permissions and limitations
# under the License.
#
# SPDX-License-Identifier: Apache-2.0
#################################################################################

from fastapi import APIRouter, Depends
import json
import asyncio

from fastapi.responses import Response
#from services.consumer import ConnectionService
from tools.log_capture import run_with_policy_log_capture
from tools.exceptions import PolicyMismatchError
from models.services.consumer.discovery_management import (
    DiscoverRegistriesRequest,
    DiscoverShellsRequest,
    DiscoverShellRequest,
    DiscoverSubmodelsDataRequest,
    DiscoverSubmodelDataRequest,
    DiscoverSubmodelSemanticIdDataRequest
)

from controllers.fastapi.routers.authentication.auth_api import get_authentication_dependency

router = APIRouter(
    prefix="/discover",
    tags=["Part Discovery Management"],
    dependencies=[Depends(get_authentication_dependency())]
)
#connection_service = ConnectionService()

from dtr import dtr_manager  # Use the original manager
from connector import connector_manager  # For cache management


def _map_error_to_status_code(error_message: str) -> int:
    """
    Map known error messages to appropriate HTTP status codes.

    Args:
        error_message: The error message string from the underlying service

    Returns:
        int: The HTTP status code to return
    """
    if "No valid asset and policy allowed" in error_message:
        return 403
    if "No valid policy was found" in error_message:
        return 403
    if "negotiation failed" in error_message.lower():
        return 403
    if "not found" in error_message.lower():
        return 404
    if "timeout" in error_message.lower():
        return 504
    return 500


async def _purge_bpn_cache(bpn: str) -> None:
    """
    Purge both DTR and connector discovery caches for a specific BPN.

    Called automatically when a discovery operation fails, so stale
    cache entries don't keep causing repeated failures.

    Args:
        bpn: The Business Partner Number whose cache entries should be removed
    """
    await asyncio.to_thread(dtr_manager.consumer.purge_bpn, bpn)
    await asyncio.to_thread(connector_manager.consumer.purge_bpn, bpn)


async def _handle_discovery_error(e: Exception, bpn: str, endpoint: str) -> Response:
    """
    Build an error response for a failed discovery operation.

    Automatically purges the DTR and connector caches for the involved BPN
    so the next retry starts with a clean state.

    Args:
        e: The exception that was raised
        bpn: The Business Partner Number involved in the failed operation
        endpoint: The API endpoint path (for error context)

    Returns:
        Response: A JSON error response with cache-purged notice
    """
    error_message = str(e)
    status_code = _map_error_to_status_code(error_message)

    # Purge stale cache so a retry has a fresh discovery state
    await _purge_bpn_cache(bpn)

    response_data: dict = {
        "error": error_message,
        "status": "error",
        "endpoint": endpoint,
        "cachePurged": True,
        "message": f"There was an error, the discovery cache for BPN {bpn} has been purged. Please retry the request.",
    }

    # When the SDK detected policy mismatches it populates PolicyMismatchError.detail.details
    # with per-policy diff lines.  Include them in the response so the frontend can render
    # them in a human-readable dropdown without requiring access to server logs.
    if isinstance(e, PolicyMismatchError) and e.detail.details:
        response_data["details"] = e.detail.details
        status_code = e.status_code  # Always 403 for policy mismatch

    return Response(
        content=json.dumps(response_data, indent=2),
        media_type="application/json",
        status_code=status_code
    )


# --- Cache management: DTR ---

@router.delete("/cache/dtr")
async def purge_dtr_cache() -> Response:
    """
    Purge the entire DTR discovery cache.

    Forces re-discovery of Digital Twin Registries on the next request for any BPN.
    """
    await asyncio.to_thread(dtr_manager.consumer.purge_cache)
    return Response(
        content=json.dumps({"status": "ok", "message": "DTR discovery cache purged"}),
        media_type="application/json",
        status_code=200
    )


@router.delete("/cache/dtr/{bpnl}")
async def purge_dtr_cache_for_bpn(bpnl: str) -> Response:
    """
    Purge the DTR discovery cache for a specific BPN.

    Forces re-discovery of Digital Twin Registries on the next request for that BPN.

    Args:
        bpnl: The Business Partner Number to purge from DTR cache
    """
    await asyncio.to_thread(dtr_manager.consumer.purge_bpn, bpnl)
    return Response(
        content=json.dumps({"status": "ok", "message": f"DTR cache purged for BPN {bpnl}"}),
        media_type="application/json",
        status_code=200
    )


# --- Cache management: Connector ---

@router.delete("/cache/connector")
async def purge_connector_cache() -> Response:
    """
    Purge the entire connector discovery cache.

    Forces re-discovery of EDC connectors on the next request for any BPN.
    """
    await asyncio.to_thread(connector_manager.consumer.purge_cache)
    return Response(
        content=json.dumps({"status": "ok", "message": "Connector discovery cache purged"}),
        media_type="application/json",
        status_code=200
    )


@router.delete("/cache/connector/{bpnl}")
async def purge_connector_cache_for_bpn(bpnl: str) -> Response:
    """
    Purge the connector discovery cache for a specific BPN.

    Forces re-discovery of EDC connectors on the next request for that BPN.

    Args:
        bpnl: The Business Partner Number to purge from connector cache
    """
    await asyncio.to_thread(connector_manager.consumer.purge_bpn, bpnl)
    return Response(
        content=json.dumps({"status": "ok", "message": f"Connector cache purged for BPN {bpnl}"}),
        media_type="application/json",
        status_code=200
    )


# --- Cache management: Both ---

@router.delete("/cache")
async def purge_discovery_cache() -> Response:
    """
    Purge both the DTR and connector discovery caches.

    Convenience endpoint that clears everything at once.
    Forces re-discovery on the next request for any BPN.
    """
    await asyncio.to_thread(dtr_manager.consumer.purge_cache)
    await asyncio.to_thread(connector_manager.consumer.purge_cache)
    return Response(
        content=json.dumps({"status": "ok", "message": "DTR and connector discovery cache purged"}),
        media_type="application/json",
        status_code=200
    )


@router.delete("/cache/{bpnl}")
async def purge_discovery_cache_for_bpn(bpnl: str) -> Response:
    """
    Purge both the DTR and connector discovery caches for a specific BPN.

    Convenience endpoint that clears everything for the given BPN.
    Forces re-discovery on the next request for that BPN.

    Args:
        bpnl: The Business Partner Number to purge from all caches
    """
    await asyncio.to_thread(dtr_manager.consumer.purge_bpn, bpnl)
    await asyncio.to_thread(connector_manager.consumer.purge_bpn, bpnl)
    return Response(
        content=json.dumps({"status": "ok", "message": f"Cache purged for BPN {bpnl}"}),
        media_type="application/json",
        status_code=200
    )


@router.post("/registries")
async def discover_registries(request: DiscoverRegistriesRequest) -> Response:
    """Discover available Digital Twin Registries for a given BPN."""
    captured_policy_logs: list[str] = []
    try:
        # Offload blocking I/O to thread pool to prevent blocking the event loop.
        # run_with_policy_log_capture wraps the call so that SDK policy-diff DEBUG
        # messages are captured in the worker thread and stored in captured_policy_logs.
        result = await asyncio.to_thread(
            run_with_policy_log_capture(dtr_manager.consumer.get_dtrs, captured_policy_logs),
            request.counter_party_id
        )
        return result
    except Exception as e:
        exc = PolicyMismatchError(message=str(e), details=captured_policy_logs) if captured_policy_logs else e
        return await _handle_discovery_error(exc, request.counter_party_id, "/discover/registries")

@router.post("/shells")
async def discover_shells(search_request: DiscoverShellsRequest) -> Response:
    """
    Discover digital twin shells using query specifications.
    
    This endpoint discovers available DTRs for the given BPN, negotiates access,
    and searches for shells matching the provided query specifications using
    the /lookup/shellsByAssetLink API.
    
    Args:
        search_request: Request containing counter_party_id (BPN) and query_spec
        
    Returns:
        Response containing discovered shells and metadata
    """
    # Convert query_spec from Pydantic models to JSON serializable format
    query_spec_dict = [
        {"name": spec.name, "value": spec.value} 
        for spec in search_request.query_spec
    ]
    
    captured_policy_logs: list[str] = []
    try:
        # Offload blocking I/O to thread pool to prevent blocking the event loop.
        # run_with_policy_log_capture captures SDK policy-diff DEBUG messages in the
        # worker thread so they can be included in the error response.
        result = await asyncio.to_thread(
            run_with_policy_log_capture(dtr_manager.consumer.discover_shells, captured_policy_logs),
            counter_party_id=search_request.counter_party_id,
            query_spec=query_spec_dict,
            dtr_policies=search_request.dtr_policies,
            limit=search_request.limit,
            cursor=search_request.cursor
        )

        # Collect error messages from failed DTRs into a top-level errorDetails list.
        # The SDK surfaces policy mismatch errors inside dtrs[].error without raising,
        # so we must extract them here to make them available to the frontend.
        if isinstance(result, dict):
            dtr_errors = list(dict.fromkeys(
                dtr["error"]
                for dtr in result.get("dtrs", [])
                if isinstance(dtr, dict)
                and dtr.get("error")
                and dtr.get("status", "").lower() in ("failed", "error", "timeout", "unavailable")
            ))
            # De-duplicate SDK policy-diff log lines: many catalog offers produce identical
            # mismatch descriptions (same constraints, different opaque policy ID in the
            # first line). Keep only unique diff bodies so the frontend doesn't show
            # hundreds of identical blocks.
            seen_bodies: set[str] = set()
            unique_logs: list[str] = []
            for entry in captured_policy_logs:
                lines = entry.split("\n", 1)
                body = lines[1] if len(lines) > 1 else entry
                if body not in seen_bodies:
                    seen_bodies.add(body)
                    unique_logs.append(entry)
            dtr_errors.extend(unique_logs)
            if dtr_errors:
                result["errorDetails"] = dtr_errors

        # Return the response as JSON
        return Response(
            content=json.dumps(result, indent=2),
            media_type="application/json",
            status_code=200
        )
    except Exception as e:
        exc = PolicyMismatchError(message=str(e), details=captured_policy_logs) if captured_policy_logs else e
        return await _handle_discovery_error(exc, search_request.counter_party_id, "/discover/shells")
    
@router.post("/shell")
async def discover_shell(search_request: DiscoverShellRequest) -> Response:
    """
    Discover digital twin shells using query specifications.
    
    This endpoint discovers available DTRs for the given BPN, negotiates access,
    and searches for shells matching the provided query specifications using
    the /lookup/shellsByAssetLink API.
    
    Args:
        search_request: Request containing counter_party_id (BPN) and query_spec
        
    Returns:
        Response containing discovered shells and metadata
    """
    
    captured_policy_logs: list[str] = []
    try:
        # Offload blocking I/O to thread pool to prevent blocking the event loop.
        result = await asyncio.to_thread(
            run_with_policy_log_capture(dtr_manager.consumer.discover_shell, captured_policy_logs),
            counter_party_id=search_request.counter_party_id,
            id=search_request.id,
            dtr_policies=search_request.dtr_policies
        )

        # Return the response as JSON
        return Response(
            content=json.dumps(result, indent=2),
            media_type="application/json",
            status_code=200
        )
    except Exception as e:
        exc = PolicyMismatchError(message=str(e), details=captured_policy_logs) if captured_policy_logs else e
        return await _handle_discovery_error(exc, search_request.counter_party_id, "/discover/shell")


@router.post("/shell/submodels")
async def discover_submodels(search_request: DiscoverSubmodelsDataRequest) -> Response:
    """
    Discover a digital twin shell by ID and retrieve its submodel data in parallel.
    
    This endpoint first discovers the shell using the provided ID, then analyzes its submodels
    to identify unique assets, pre-negotiates access to those assets in parallel, and finally
    fetches the actual submodel data using the negotiated tokens.
    
    The process is optimized to avoid duplicate asset negotiations when multiple submodels
    share the same underlying asset.
    
    Args:
        search_request: Request containing:
            - counter_party_id (BPN): The Business Partner Number
            - id: The shell ID to discover
            - semantic_id_policies: Mapping of semantic IDs to their acceptable policies
        
    Returns:
        Response containing the shell descriptor with submodel data included
        
    Example semantic_id_policies:
    {
        "urn:samm:io.catenax.part_type_information:1.0.0#PartTypeInformation": [
            {
                "odrl:permission": {
                    "odrl:action": {
                        "@id": "odrl:use"
                    },
                    "odrl:constraint": {
                        "odrl:and": [
                            {
                                "odrl:leftOperand": {
                                    "@id": "cx-policy:FrameworkAgreement"
                                },
                                "odrl:operator": {
                                    "@id": "odrl:eq"
                                },
                                "odrl:rightOperand": "DataExchangeGovernance:1.0"
                            },
                            {
                                "odrl:leftOperand": {
                                    "@id": "cx-policy:Membership"
                                },
                                "odrl:operator": {
                                    "@id": "odrl:eq"
                                },
                                "odrl:rightOperand": "active"
                            },
                            {
                                "odrl:leftOperand": {
                                    "@id": "cx-policy:UsagePurpose"
                                },
                                "odrl:operator": {
                                    "@id": "odrl:eq"
                                },
                                "odrl:rightOperand": "cx.core.industrycore:1"
                            }
                        ]
                    }
                },
                "odrl:prohibition": [],
                "odrl:obligation": []
            }
        ]
    }
    """
    
    captured_policy_logs: list[str] = []
    try:
        # Offload blocking I/O to thread pool to prevent blocking the event loop.
        result = await asyncio.to_thread(
            run_with_policy_log_capture(dtr_manager.consumer.discover_submodels, captured_policy_logs),
            counter_party_id=search_request.counter_party_id,
            id=search_request.id,
            dtr_policies=search_request.dtr_policies,
            governance=search_request.governance
        )

        # Return the response as JSON
        return Response(
            content=json.dumps(result, indent=2),
            media_type="application/json",
            status_code=200
        )
    except Exception as e:
        exc = PolicyMismatchError(message=str(e), details=captured_policy_logs) if captured_policy_logs else e
        return await _handle_discovery_error(exc, search_request.counter_party_id, "/discover/shell/submodels")

@router.post("/shell/submodel")
async def discover_submodel(search_request: DiscoverSubmodelDataRequest) -> Response:
    """
    Discover a specific submodel by exact submodel ID using direct API call for optimal performance.
    
    This endpoint uses the DTR API direct endpoint /shell-descriptors/:base64aasid/submodel-descriptors/:base64submodelid
    for fast, exact lookup of a specific submodel when you know the exact submodel ID.
    
    Args:
        search_request: Request containing:
            - counter_party_id (BPN): The Business Partner Number
            - id: The shell ID to discover
            - submodel_id: The exact submodel ID to retrieve (required)
            - governance: List of policy dictionaries for the target submodel
        
    Returns:
        Response containing single submodel descriptor and data
        
    Example governance structure:
    [
        {
            "odrl:permission": {
                "odrl:action": {"@id": "odrl:use"},
                "odrl:constraint": {
                    "odrl:and": [
                        {
                            "odrl:leftOperand": {"@id": "cx-policy:FrameworkAgreement"},
                            "odrl:operator": {"@id": "odrl:eq"},
                            "odrl:rightOperand": "DataExchangeGovernance:1.0"
                        }
                    ]
                }
            },
            "odrl:prohibition": [],
            "odrl:obligation": []
        }
    ]
    """
    
    # Validate that submodel_id is provided
    if not search_request.submodel_id:
        return Response(
            content=json.dumps({
                "error": "submodelId is required for direct submodel lookup",
                "status": "error"
            }, indent=2),
            media_type="application/json",
            status_code=400
        )
    
    captured_policy_logs: list[str] = []
    try:
        # Offload blocking I/O to thread pool to prevent blocking the event loop.
        result = await asyncio.to_thread(
            run_with_policy_log_capture(dtr_manager.consumer.discover_submodel, captured_policy_logs),
            counter_party_id=search_request.counter_party_id,
            id=search_request.id,
            dtr_policies=search_request.dtr_policies,
            submodel_id=search_request.submodel_id,
            governance=search_request.governance
        )

        # Return the response as JSON
        return Response(
            content=json.dumps(result, indent=2),
            media_type="application/json",
            status_code=200
        )

    except Exception as e:
        exc = PolicyMismatchError(message=str(e), details=captured_policy_logs) if captured_policy_logs else e
        return await _handle_discovery_error(exc, search_request.counter_party_id, "/discover/shell/submodel")


@router.post("/shell/submodels/semanticId")
async def discover_submodels_by_semantic_id(search_request: DiscoverSubmodelSemanticIdDataRequest) -> Response:
    """
    Discover submodels by semantic IDs. Searches through all submodels to find matches.
    
    This endpoint discovers the shell and searches through all submodels to find those
    that match the provided semantic IDs (requiring all to match). May return multiple results.
    
    Args:
        search_request: Request containing:
            - counter_party_id (BPN): The Business Partner Number
            - id: The shell ID to discover
            - semantic_ids: List of semantic ID objects to search for
            - semantic_id: Single semantic ID (converted to semantic_ids format)
            - governance: List of policy dictionaries for target submodels
        
    Returns:
        Response containing multiple submodel descriptors and data
        
    Example semantic_id format:
    "urn:samm:io.catenax.part_type_information:1.0.0#PartTypeInformation"
    
    Example semantic_ids format:
    [
        {"type": "GlobalReference", "value": "urn:samm:io.catenax.part_type_information:1.0.0#PartTypeInformation"},
        {"type": "DataElement", "value": "urn:samm:io.catenax.another_aspect:1.0.0#AnotherAspect"}
    ]
    """
    
    # Normalize semantic ID input:
    # If semantic_ids is provided, use it directly and ignore semantic_id
    # If semantic_id is provided (and semantic_ids is None), convert it to semantic_ids format with "GlobalReference" type
    normalized_semantic_ids = None
    if search_request.semantic_ids is not None:
        # Validate semantic_ids format before using
        for i, semantic_id in enumerate(search_request.semantic_ids):
            if not isinstance(semantic_id, dict):
                return Response(
                    content=json.dumps({
                        "error": f"Invalid semantic ID format at index {i}: must be an object with 'type' and 'value' keys",
                        "status": "error"
                    }, indent=2),
                    media_type="application/json",
                    status_code=400
                )
            
            if "type" not in semantic_id or "value" not in semantic_id:
                return Response(
                    content=json.dumps({
                        "error": f"Invalid semantic ID format at index {i}: missing required 'type' or 'value' key",
                        "status": "error"
                    }, indent=2),
                    media_type="application/json",
                    status_code=400
                )
            
            if not isinstance(semantic_id["type"], str) or not isinstance(semantic_id["value"], str):
                return Response(
                    content=json.dumps({
                        "error": f"Invalid semantic ID format at index {i}: 'type' and 'value' must be strings",
                        "status": "error"
                    }, indent=2),
                    media_type="application/json",
                    status_code=400
                )
        
        # Use semantic_ids directly, ignore semantic_id field
        normalized_semantic_ids = search_request.semantic_ids
    elif search_request.semantic_id is not None:
        # Convert semantic_id to semantic_ids format with default "GlobalReference" type
        normalized_semantic_ids = [
            {
                "type": "GlobalReference",
                "value": search_request.semantic_id
            }
        ]
    else:
        return Response(
            content=json.dumps({
                "error": "Either 'semanticIds' or 'semanticId' must be provided for semantic ID search",
                "status": "error"
            }, indent=2),
            media_type="application/json",
            status_code=400
        )
    
    captured_policy_logs: list[str] = []
    try:
        # Offload blocking I/O to thread pool to prevent blocking the event loop.
        result = await asyncio.to_thread(
            run_with_policy_log_capture(dtr_manager.consumer.discover_submodel_by_semantic_ids, captured_policy_logs),
            counter_party_id=search_request.counter_party_id,
            id=search_request.id,
            dtr_policies=search_request.dtr_policies,
            semantic_id_policies=normalized_semantic_ids
        )

        # Return the response as JSON
        return Response(
            content=json.dumps(result, indent=2),
            media_type="application/json",
            status_code=200
        )

    except Exception as e:
        exc = PolicyMismatchError(message=str(e), details=captured_policy_logs) if captured_policy_logs else e
        return await _handle_discovery_error(exc, search_request.counter_party_id, "/discover/shell/submodels/semanticId")
    