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
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND,
# either express or implied. See the
# License for the specific language govern in permissions and limitations
# under the License.
#
# SPDX-License-Identifier: Apache-2.0
#################################################################################

import asyncio
import uuid
from typing import Dict, Any, Optional, List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from pydantic import BaseModel, Field

from connector import discovery_oauth
from tractusx_sdk.industry.services.discovery.bpn_discovery_service import BpnDiscoveryService
from tractusx_sdk.dataspace.services.discovery import DiscoveryFinderService

from controllers.fastapi.routers.authentication.auth_api import get_authentication_dependency
from managers.config.config_manager import ConfigManager
from managers.config.log_manager import LoggingManager

from dtr import dtr_manager

logger = LoggingManager.get_logger(__name__)

router = APIRouter(
    prefix="/discover",
    dependencies=[Depends(get_authentication_dependency())]
)

# In-memory storage for discovery task statuses
# In production, this should use Redis or similar
_discovery_tasks: Dict[str, Dict[str, Any]] = {}


class DiscoverDppRequest(BaseModel):
    """Request model for discovering a Digital Product Passport"""
    id: str = Field(
        description="The identifier in format 'CX:<manufacturerPartId>:<partInstanceId>'"
    )
    semantic_id: str = Field(
        alias="semanticId",
        description="The semantic ID of the submodel to retrieve (e.g., 'urn:samm:io.catenax.generic.digital_product_passport:6.1.0#DigitalProductPassport')"
    )
    dtr_policies: Optional[List[Dict[str, Any]]] = Field(
        None,
        alias="dtrPolicies",
        description="Policies to apply for DTR (Digital Twin Registry) access"
    )
    governance: Optional[Dict[str, Any]] = Field(
        None,
        description="Governance policies for submodel consumption (passport data access)"
    )

    class Config:
        populate_by_name = True


class DiscoveryStatus(BaseModel):
    """Status model for discovery progress"""
    status: str = Field(
        description="Current status: 'in_progress', 'completed', 'failed'"
    )
    step: str = Field(
        description="Current step: 'parsing', 'discovering_bpn', 'retrieving_twin', 'looking_up_submodel', 'consuming_data', 'complete'"
    )
    message: str = Field(
        description="Human-readable status message"
    )
    progress: int = Field(
        description="Progress percentage (0-100)"
    )

    class Config:
        populate_by_name = True


class DiscoverDppResponse(BaseModel):
    """Response model for DPP discovery operation"""
    task_id: str = Field(
        alias="taskId",
        description="Unique identifier for tracking this discovery task"
    )
    status: DiscoveryStatus = Field(
        description="Current discovery status"
    )
    digital_twin: Optional[Dict[str, Any]] = Field(
        None,
        alias="digitalTwin",
        description="The discovered digital twin shell descriptor"
    )
    data: Optional[Dict[str, Any]] = Field(
        None,
        description="The consumed DPP data"
    )

    class Config:
        populate_by_name = True


@router.post("/", response_model=DiscoverDppResponse, status_code=status.HTTP_202_ACCEPTED)
async def discover_dpp(request: DiscoverDppRequest, background_tasks: BackgroundTasks):
    """
    Discover a Digital Product Passport using BPN Discovery and DTR lookup.
    
    This endpoint:
    1. Parses the ID to extract manufacturerPartId and partInstanceId
    2. Uses BPN Discovery to find the BPN owner of the manufacturerPartId
    3. Uses DTR Consumer to retrieve the digital twin shell
    4. Looks up the submodel matching the provided semanticId
    5. Consumes the submodel data
    
    The operation runs asynchronously with step-by-step status tracking.
    Use the returned taskId to check progress via GET /discover/{taskId}/status
    
    Args:
        request: DiscoverDppRequest with id and semanticId
        background_tasks: FastAPI background tasks
        
    Returns:
        DiscoverDppResponse with taskId and initial status
        
    Raises:
        HTTPException: If the ID format is invalid
    """
    try:
        # Generate unique task ID
        task_id = str(uuid.uuid4())
        
        # Initialize task status
        _discovery_tasks[task_id] = {
            "status": "in_progress",
            "step": "parsing",
            "message": "Parsing identifier...",
            "progress": 0,
            "digital_twin": None,
            "data": None,
            "created_at": datetime.utcnow().isoformat(),
            "error": None
        }
        
        # Validate ID format
        if not request.id.startswith("CX:"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="ID must be in format 'CX:<manufacturerPartId>:<partInstanceId>'"
            )
        
        # Schedule background task
        background_tasks.add_task(
            _execute_discovery_task,
            task_id=task_id,
            id_str=request.id,
            semantic_id=request.semantic_id,
            dtr_policies=request.dtr_policies,
            governance=request.governance
        )
        
        return DiscoverDppResponse(
            taskId=task_id,
            status=DiscoveryStatus(
                status="in_progress",
                step="parsing",
                message="Discovery task started",
                progress=0
            ),
            digitalTwin=None,
            data=None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error initiating discovery: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to initiate discovery: {str(e)}"
        )


@router.get("/{task_id}/status", response_model=DiscoverDppResponse)
async def get_discovery_status(task_id: str):
    """
    Get the current status of a discovery task.
    
    Args:
        task_id: The unique task identifier from the initial discovery request
        
    Returns:
        DiscoverDppResponse with current status and results (if completed)
        
    Raises:
        HTTPException: If the task ID is not found
    """
    if task_id not in _discovery_tasks:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Discovery task not found: {task_id}"
        )
    
    task = _discovery_tasks[task_id]
    
    return DiscoverDppResponse(
        taskId=task_id,
        status=DiscoveryStatus(
            status=task["status"],
            step=task["step"],
            message=task["message"],
            progress=task["progress"]
        ),
        digitalTwin=task.get("digital_twin"),
        data=task.get("data")
    )


async def _execute_discovery_task(
    task_id: str, 
    id_str: str, 
    semantic_id: str,
    dtr_policies: Optional[List[Dict[str, Any]]] = None,
    governance: Optional[Dict[str, Any]] = None
):
    """
    Execute the discovery task in the background with step-by-step status updates.
    
    Args:
        task_id: The unique task identifier
        id_str: The identifier string (format: CX:<manufacturerPartId>:<partInstanceId>)
        semantic_id: The semantic ID to search for
        dtr_policies: Policies to apply for DTR access
        governance: Governance policies for submodel consumption
    """
    try:
        # Step 1: Parse the ID
        logger.info(f"[Task {task_id}] Step 1: Parsing identifier: {id_str}")
        _update_task(task_id, "parsing", "Parsing identifier...", 10)
        
        parts = id_str.split(":")
        if len(parts) != 3:
            raise ValueError("Invalid ID format. Expected 'CX:<manufacturerPartId>:<partInstanceId>'")
        
        manufacturer_part_id = parts[1]
        part_instance_id = parts[2]
        
        logger.info(f"[Task {task_id}] Parsed - ManufacturerPartId: {manufacturer_part_id}, PartInstanceId: {part_instance_id}")
        
        # Step 2: Discover BPN using BPN Discovery
        logger.info(f"[Task {task_id}] Step 2: Discovering BPN for manufacturerPartId: {manufacturer_part_id}")
        _update_task(task_id, "discovering_bpn", f"Looking up BPN owner for {manufacturer_part_id}...", 25)
        
        bpn_list = await _discover_bpn(manufacturer_part_id)
        
        if not bpn_list:
            raise ValueError(f"No BPN found for manufacturerPartId: {manufacturer_part_id}")
        
        logger.info(f"[Task {task_id}] Found {len(bpn_list)} BPN(s): {bpn_list}")
        
        # Step 3: Retrieve digital twin shells using DTR (in parallel for multiple BPNs)
        logger.info(f"[Task {task_id}] Step 3: Retrieving digital twin for manufacturerPartId: {manufacturer_part_id}, partInstanceId: {part_instance_id}")
        _update_task(task_id, "retrieving_twin", f"Retrieving digital twin from DTR across {len(bpn_list)} BPN(s)...", 50)
        
        # Build query spec for DTR lookup using specific asset IDs
        query_spec = [
            {
                "key": "manufacturerPartId",
                "value": manufacturer_part_id
            }
        ]
        
        # Add partInstanceId if available (for serialized parts)
        if part_instance_id:
            query_spec.append({
                "key": "partInstanceId",
                "value": part_instance_id
            })
        
        # Query all BPNs in parallel to find shells with DPP submodels
        shell_tasks = [
            asyncio.to_thread(
                dtr_manager.consumer.discover_shells,
                counter_party_id=bpn,
                query_spec=query_spec,
                dtr_policies=dtr_policies
            )
            for bpn in bpn_list
        ]
        
        shell_results = await asyncio.gather(*shell_tasks, return_exceptions=True)
        
        # Process results and find shells with matching semantic ID
        shell_descriptor = None
        matching_bpn = None
        
        for bpn, result in zip(bpn_list, shell_results):
            if isinstance(result, Exception):
                logger.warning(f"[Task {task_id}] Error querying BPN {bpn}: {str(result)}")
                continue
            
            logger.info(f"[Task {task_id}] DTR discover_shells result for BPN {bpn}: found {result.get('shellsFound', 0)} shell(s)")
            
            shell_descriptors = result.get("shellDescriptors", [])
            
            # Check each shell for matching semantic ID in submodels
            for shell in shell_descriptors:
                for submodel in shell.get("submodelDescriptors", []):
                    submodel_semantic_id = _extract_semantic_id(submodel)
                    if submodel_semantic_id == semantic_id:
                        shell_descriptor = shell
                        matching_bpn = bpn
                        logger.info(f"[Task {task_id}] Found matching shell with DPP submodel in BPN {bpn}, shell ID: {shell.get('id')}")
                        break
                
                if shell_descriptor:
                    break
            
            if shell_descriptor:
                break
        
        if not shell_descriptor:
            raise ValueError(f"Digital twin shell with semanticId '{semantic_id}' not found for manufacturerPartId: {manufacturer_part_id}, partInstanceId: {part_instance_id} across {len(bpn_list)} BPN(s)")
        
        logger.info(f"[Task {task_id}] Retrieved digital twin shell with ID: {shell_descriptor.get('id')} from BPN: {matching_bpn}")
        
        # Step 4: Look up submodel by semantic ID
        logger.info(f"[Task {task_id}] Step 4: Looking up submodel with semanticId: {semantic_id}")
        _update_task(task_id, "looking_up_submodel", f"Searching for submodel with matching semantic ID...", 70)
        
        matching_submodel = None
        for submodel in shell_descriptor.get("submodelDescriptors", []):
            submodel_semantic_id = _extract_semantic_id(submodel)
            if submodel_semantic_id == semantic_id:
                matching_submodel = submodel
                break
        
        if not matching_submodel:
            raise ValueError(f"No submodel found with semanticId: {semantic_id}")
        
        submodel_id = matching_submodel.get("id")
        logger.info(f"[Task {task_id}] Found matching submodel: {submodel_id}")
        
        # Step 5: Consume submodel data
        logger.info(f"[Task {task_id}] Step 5: Consuming submodel data for submodel: {submodel_id}")
        _update_task(task_id, "consuming_data", f"Retrieving submodel data...", 85)
        
        # Use discover_submodel to get the specific submodel data
        submodel_result = await asyncio.to_thread(
            dtr_manager.consumer.discover_submodel,
            counter_party_id=matching_bpn,
            id=shell_descriptor.get("id"),
            dtr_policies=dtr_policies,
            governance=governance,
            submodel_id=submodel_id
        )
        
        logger.info(f"[Task {task_id}] Submodel discovery result: {submodel_result.get('status', 'unknown')}")
        
        # Extract the submodel data
        submodel_data = submodel_result.get("submodel")
        
        if not submodel_data:
            logger.warning(f"[Task {task_id}] No submodel data retrieved. Submodel descriptor: {submodel_result.get('submodelDescriptor', {})}")
        
        logger.info(f"[Task {task_id}] Successfully consumed submodel data")
        
        # Step 6: Complete
        _update_task(
            task_id,
            "complete",
            "Discovery completed successfully",
            100,
            status="completed",
            digital_twin=shell_descriptor,
            data=submodel_data
        )
        
        logger.info(f"[Task {task_id}] Discovery task completed successfully")
        
    except Exception as e:
        logger.error(f"[Task {task_id}] Discovery task failed: {str(e)}", exc_info=True)
        # Keep the current step to show where it failed
        current_step = _discovery_tasks[task_id].get("step", "error")
        _discovery_tasks[task_id].update({
            "status": "failed",
            "step": current_step,  # Preserve the step where failure occurred
            "message": f"Discovery failed: {str(e)}",
            "progress": _discovery_tasks[task_id].get("progress", 0),  # Keep current progress
            "error": str(e)
        })


def _update_task(
    task_id: str,
    step: str,
    message: str,
    progress: int,
    status: str = "in_progress",
    digital_twin: Optional[Dict[str, Any]] = None,
    data: Optional[Dict[str, Any]] = None
):
    """
    Update the status of a discovery task.
    
    Args:
        task_id: The unique task identifier
        step: Current step name
        message: Status message
        progress: Progress percentage (0-100)
        status: Task status (in_progress, completed, failed)
        digital_twin: Optional digital twin data
        data: Optional submodel data
    """
    if task_id in _discovery_tasks:
        _discovery_tasks[task_id].update({
            "status": status,
            "step": step,
            "message": message,
            "progress": progress
        })
        if digital_twin is not None:
            _discovery_tasks[task_id]["digital_twin"] = digital_twin
        if data is not None:
            _discovery_tasks[task_id]["data"] = data


async def _discover_bpn(manufacturer_part_id: str) -> List[str]:
    """
    Discover BPN(s) using BPN Discovery service.
    
    Args:
        manufacturer_part_id: The manufacturer part ID to search for
        
    Returns:
        List of BPNLs that own the manufacturer part ID
        
    Raises:
        ValueError: If BPN Discovery service is not available or lookup fails
    """
    try:
        if not discovery_oauth or not discovery_oauth.connected:
            raise ValueError("Discovery OAuth service is not available")
        
        # Get Discovery Finder URL from configuration
        discovery_finder_url = ConfigManager.get_config("consumer.discovery.discovery_finder.url")
        
        if not discovery_finder_url:
            raise ValueError("Discovery Finder URL not configured")
        
        # Create Discovery Finder service
        discovery_finder = DiscoveryFinderService(
            url=discovery_finder_url,
            oauth=discovery_oauth
        )
        
        # Create BPN Discovery service
        bpn_discovery_service = BpnDiscoveryService(
            oauth=discovery_oauth,
            discovery_finder_service=discovery_finder
        )
        
        # Get the type identifier from configuration (default: "manufacturerPartId")
        bpn_type = ConfigManager.get_config("consumer.discovery.bpn_discovery.type", default="manufacturerPartId")
        
        # Look up the BPN using the manufacturer part ID
        # Note: find_bpns expects a list of keys, not a single key
        bpn_list = await asyncio.to_thread(
            bpn_discovery_service.find_bpns,
            keys=[manufacturer_part_id],
            identifier_type=bpn_type
        )
        
        logger.info(f"BPN Discovery lookup for {manufacturer_part_id}: {bpn_list}")
        
        return bpn_list if bpn_list else []
        
    except Exception as e:
        logger.error(f"Failed to discover BPN: {str(e)}", exc_info=True)
        raise ValueError(f"BPN Discovery failed: {str(e)}")


def _extract_semantic_id(submodel: Dict[str, Any]) -> str:
    """
    Extract semantic ID from a submodel descriptor.
    
    Args:
        submodel: The submodel descriptor
        
    Returns:
        The semantic ID string
    """
    semantic_id_obj = submodel.get("semanticId", {})
    
    # Try different formats
    if isinstance(semantic_id_obj, dict):
        keys = semantic_id_obj.get("keys", [])
        if keys and isinstance(keys, list):
            # Format: {"keys": [{"type": "GlobalReference", "value": "urn:..."}]}
            return keys[0].get("value", "")
        elif "value" in semantic_id_obj:
            # Format: {"value": "urn:..."}
            return semantic_id_obj["value"]
    elif isinstance(semantic_id_obj, str):
        # Direct string format
        return semantic_id_obj
    
    return ""
