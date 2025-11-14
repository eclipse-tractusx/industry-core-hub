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

from fastapi import APIRouter
import json


from fastapi.responses import Response
#from services.consumer import ConnectionService
from models.services.consumer.discovery_management import (
    DiscoverRegistriesRequest,
    DiscoverShellsRequest,
    DiscoverShellRequest,
    DiscoverSubmodelsDataRequest,
    DiscoverSubmodelDataRequest,
    DiscoverSubmodelSemanticIdDataRequest
)

router = APIRouter(prefix="/discover", tags=["Part Discovery Management"])
#connection_service = ConnectionService()

from dtr import dtr_manager  # Use the original manager



@router.post("/registries")
async def discover_registries(request: DiscoverRegistriesRequest) -> Response:
    ## Check if the api key is present and if it is authenticated
    # Clean, simple async call - no manual thread pool management needed!
    result = dtr_manager.consumer.get_dtrs(request.counter_party_id)
    return result

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
    
    # Clean, simple async call - no manual thread pool management needed!
    result = dtr_manager.consumer.discover_shells(
        counter_party_id=search_request.counter_party_id,
        query_spec=query_spec_dict,
        dtr_policies=search_request.dtr_policies,
        limit=search_request.limit,
        cursor=search_request.cursor
    )
    
    # Return the response as JSON
    return Response(
        content=json.dumps(result, indent=2),
        media_type="application/json",
        status_code=200
    )
    
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
    
    # Clean, simple async call - no manual thread pool management needed!
    result = dtr_manager.consumer.discover_shell(
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
    
    # Clean, simple async call - no manual thread pool management needed!
    result = dtr_manager.consumer.discover_submodels(
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
    
    try:
        # Clean, simple async call - no manual thread pool management needed!
        result = dtr_manager.consumer.discover_submodel(
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
        # Forward the original error message from connector service
        error_message = str(e)
        status_code = 500
        
        # Check for specific connector service errors to provide better status codes
        if "No valid asset and policy allowed" in error_message:
            status_code = 403
        elif "negotiation failed" in error_message.lower():
            status_code = 403
        elif "not found" in error_message.lower():
            status_code = 404
        elif "timeout" in error_message.lower():
            status_code = 504
            
        return Response(
            content=json.dumps({
                "error": error_message,
                "status": "error",
                "endpoint": "/discover/shell/submodel"
            }, indent=2),
            media_type="application/json",
            status_code=status_code
        )


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
    
    try:
        # Clean, simple async call - no manual thread pool management needed!
        result = dtr_manager.consumer.discover_submodel_by_semantic_ids(
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
        # Forward the original error message from connector service
        error_message = str(e)
        status_code = 500
        
        # Check for specific connector service errors to provide better status codes
        if "No valid asset and policy allowed" in error_message:
            status_code = 403
        elif "negotiation failed" in error_message.lower():
            status_code = 403
        elif "not found" in error_message.lower():
            status_code = 404
        elif "timeout" in error_message.lower():
            status_code = 504
            
        return Response(
            content=json.dumps({
                "error": error_message,
                "status": "error",
                "endpoint": "/discover/shell/submodels/semanticId"
            }, indent=2),
            media_type="application/json",
            status_code=status_code
        )
    