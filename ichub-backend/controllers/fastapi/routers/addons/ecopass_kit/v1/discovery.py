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

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks

from controllers.fastapi.routers.authentication.auth_api import get_authentication_dependency
from managers.config.log_manager import LoggingManager
from managers.addons_service.ecopass_kit.v1 import discovery_manager
from models.services.addons.ecopass_kit.v1 import DiscoverDppRequest, DiscoveryStatus, DiscoverDppResponse

logger = LoggingManager.get_logger(__name__)

router = APIRouter(
    prefix="/discover",
    dependencies=[Depends(get_authentication_dependency())]
)


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
        task_id = discovery_manager.generate_task_id()
        
        # Initialize task status
        discovery_manager.task_manager.create_task(task_id)
        
        # Validate ID format
        try:
            discovery_manager.validate_id_format(request.id)
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )
        
        # Schedule background task
        background_tasks.add_task(
            discovery_manager.execute_discovery,
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
    if not discovery_manager.task_manager.task_exists(task_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Discovery task not found: {task_id}"
        )
    
    task = discovery_manager.task_manager.get_task(task_id)
    
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
