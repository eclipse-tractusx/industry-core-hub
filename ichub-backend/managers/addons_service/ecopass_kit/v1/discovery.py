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
from datetime import datetime, timezone

from connector import discovery_oauth
from tractusx_sdk.industry.services.discovery.bpn_discovery_service import BpnDiscoveryService
from tractusx_sdk.dataspace.services.discovery import DiscoveryFinderService

from managers.config.config_manager import ConfigManager
from managers.config.log_manager import LoggingManager
from dtr import dtr_manager

logger = LoggingManager.get_logger(__name__)


class DiscoveryTaskManager:
    """
    Manages discovery task status and state.
    
    This class handles the in-memory storage and updates for discovery tasks.
    In production environments, consider replacing with Redis or similar
    distributed cache for scalability.
    """
    
    def __init__(self) -> None:
        """Initialize the task manager with empty storage."""
        self._tasks: Dict[str, Dict[str, Any]] = {}
    
    def create_task(self, task_id: str) -> Dict[str, Any]:
        """
        Create a new discovery task with initial status.
        
        Args:
            task_id: The unique task identifier
            
        Returns:
            The initial task state dictionary
        """
        self._tasks[task_id] = {
            "status": "in_progress",
            "step": "parsing",
            "message": "Parsing identifier...",
            "progress": 0,
            "digital_twin": None,
            "data": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "error": None
        }
        return self._tasks[task_id]
    
    def get_task(self, task_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve a task by its ID.
        
        Args:
            task_id: The unique task identifier
            
        Returns:
            The task state dictionary or None if not found
        """
        return self._tasks.get(task_id)
    
    def task_exists(self, task_id: str) -> bool:
        """
        Check if a task exists.
        
        Args:
            task_id: The unique task identifier
            
        Returns:
            True if the task exists, False otherwise
        """
        return task_id in self._tasks
    
    def update_task(
        self,
        task_id: str,
        step: str,
        message: str,
        progress: int,
        status: str = "in_progress",
        digital_twin: Optional[Dict[str, Any]] = None,
        data: Optional[Dict[str, Any]] = None
    ) -> None:
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
        if task_id in self._tasks:
            self._tasks[task_id].update({
                "status": status,
                "step": step,
                "message": message,
                "progress": progress
            })
            if digital_twin is not None:
                self._tasks[task_id]["digital_twin"] = digital_twin
            if data is not None:
                self._tasks[task_id]["data"] = data
    
    def mark_failed(self, task_id: str, error: str) -> None:
        """
        Mark a task as failed, preserving the step where failure occurred.
        
        Args:
            task_id: The unique task identifier
            error: The error message
        """
        if task_id in self._tasks:
            current_step = self._tasks[task_id].get("step", "error")
            self._tasks[task_id].update({
                "status": "failed",
                "step": current_step,
                "message": f"Discovery failed: {error}",
                "progress": self._tasks[task_id].get("progress", 0),
                "error": error
            })


class DiscoveryManager:
    """
    Manages the discovery of Digital Product Passports.
    
    This manager orchestrates the multi-step process of discovering DPPs:
    1. Parse the identifier (CX format)
    2. Discover BPN using BPN Discovery service
    3. Retrieve digital twin from DTR
    4. Look up matching submodel by semantic ID
    5. Consume the submodel data
    """
    
    def __init__(self, task_manager: Optional[DiscoveryTaskManager] = None) -> None:
        """
        Initialize the Discovery Manager.
        
        Args:
            task_manager: Optional task manager instance. If not provided,
                          a new instance will be created.
        """
        self.task_manager = task_manager or DiscoveryTaskManager()
    
    def generate_task_id(self) -> str:
        """
        Generate a unique task identifier.
        
        Returns:
            A unique UUID string
        """
        return str(uuid.uuid4())
    
    def validate_id_format(self, id_str: str) -> bool:
        """
        Validate that the ID is in the expected CX format.
        
        Args:
            id_str: The identifier string to validate
            
        Returns:
            True if the format is valid
            
        Raises:
            ValueError: If the ID format is invalid
        """
        if not id_str.startswith("CX:"):
            raise ValueError("ID must be in format 'CX:<manufacturerPartId>:<partInstanceId>'")
        
        parts = id_str.split(":")
        if len(parts) != 3:
            raise ValueError("Invalid ID format. Expected 'CX:<manufacturerPartId>:<partInstanceId>'")
        
        return True
    
    def parse_id(self, id_str: str) -> tuple[str, str]:
        """
        Parse a CX identifier into its components.
        
        Args:
            id_str: The identifier string (format: CX:<manufacturerPartId>:<partInstanceId>)
            
        Returns:
            Tuple of (manufacturerPartId, partInstanceId)
            
        Raises:
            ValueError: If the ID format is invalid
        """
        self.validate_id_format(id_str)
        parts = id_str.split(":")
        return parts[1], parts[2]
    
    async def execute_discovery(
        self,
        task_id: str,
        id_str: str,
        semantic_id: str,
        dtr_policies: Optional[List[Dict[str, Any]]] = None,
        governance: Optional[Dict[str, Any]] = None
    ) -> None:
        """
        Execute the discovery task with step-by-step status updates.
        
        This method performs the complete discovery process:
        1. Parse the ID to extract manufacturerPartId and partInstanceId
        2. Discover BPN using BPN Discovery service
        3. Retrieve digital twin shells from DTR
        4. Look up submodel by semantic ID
        5. Consume submodel data
        
        Args:
            task_id: The unique task identifier
            id_str: The identifier string (format: CX:<manufacturerPartId>:<partInstanceId>)
            semantic_id: The semantic ID to search for
            dtr_policies: Optional policies to apply for DTR access
            governance: Optional governance policies for submodel consumption
        """
        try:
            # Step 1: Parse the ID
            logger.info(f"[Task {task_id}] Step 1: Parsing identifier: {id_str}")
            self.task_manager.update_task(task_id, "parsing", "Parsing identifier...", 10)
            
            manufacturer_part_id, part_instance_id = self.parse_id(id_str)
            
            logger.info(f"[Task {task_id}] Parsed - ManufacturerPartId: {manufacturer_part_id}, PartInstanceId: {part_instance_id}")
            
            # Step 2: Discover BPN using BPN Discovery
            logger.info(f"[Task {task_id}] Step 2: Discovering BPN for manufacturerPartId: {manufacturer_part_id}")
            self.task_manager.update_task(task_id, "discovering_bpn", f"Looking up BPN owner for {manufacturer_part_id}...", 25)
            
            bpn_list = await self.discover_bpn(manufacturer_part_id)
            
            if not bpn_list:
                raise ValueError(f"No BPN found for manufacturerPartId: {manufacturer_part_id}")
            
            logger.info(f"[Task {task_id}] Found {len(bpn_list)} BPN(s): {bpn_list}")
            
            # Step 3: Retrieve digital twin shells using DTR (in parallel for multiple BPNs)
            logger.info(f"[Task {task_id}] Step 3: Retrieving digital twin for manufacturerPartId: {manufacturer_part_id}, partInstanceId: {part_instance_id}")
            self.task_manager.update_task(task_id, "retrieving_twin", f"Retrieving digital twin from DTR across {len(bpn_list)} BPN(s)...", 50)
            
            # Build query spec for DTR lookup using specific asset IDs
            query_spec = self._build_query_spec(manufacturer_part_id, part_instance_id)
            
            # Query all BPNs in parallel to find shells with DPP submodels
            shell_descriptor, matching_bpn = await self._query_bpns_for_shells(
                task_id, bpn_list, query_spec, semantic_id, dtr_policies
            )
            
            if not shell_descriptor:
                raise ValueError(
                    f"Digital twin shell with semanticId '{semantic_id}' not found for "
                    f"manufacturerPartId: {manufacturer_part_id}, partInstanceId: {part_instance_id} "
                    f"across {len(bpn_list)} BPN(s)"
                )
            
            logger.info(f"[Task {task_id}] Retrieved digital twin shell with ID: {shell_descriptor.get('id')} from BPN: {matching_bpn}")
            
            # Step 4: Look up submodel by semantic ID
            logger.info(f"[Task {task_id}] Step 4: Looking up submodel with semanticId: {semantic_id}")
            self.task_manager.update_task(task_id, "looking_up_submodel", "Searching for submodel with matching semantic ID...", 70)
            
            matching_submodel = self._find_matching_submodel(shell_descriptor, semantic_id)
            
            if not matching_submodel:
                raise ValueError(f"No submodel found with semanticId: {semantic_id}")
            
            submodel_id = matching_submodel.get("id")
            logger.info(f"[Task {task_id}] Found matching submodel: {submodel_id}")
            
            # Step 5: Consume submodel data
            logger.info(f"[Task {task_id}] Step 5: Consuming submodel data for submodel: {submodel_id}")
            self.task_manager.update_task(task_id, "consuming_data", "Retrieving submodel data...", 85)
            
            submodel_data = await self._consume_submodel_data(
                task_id, matching_bpn, shell_descriptor, submodel_id, dtr_policies, governance
            )
            
            logger.info(f"[Task {task_id}] Successfully consumed submodel data")
            
            # Step 6: Complete
            self.task_manager.update_task(
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
            self.task_manager.mark_failed(task_id, str(e))
    
    async def discover_bpn(self, manufacturer_part_id: str) -> List[str]:
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
    
    def _build_query_spec(self, manufacturer_part_id: str, part_instance_id: str) -> List[Dict[str, str]]:
        """
        Build the query specification for DTR lookup.
        
        Args:
            manufacturer_part_id: The manufacturer part ID
            part_instance_id: The part instance ID
            
        Returns:
            List of query specification dictionaries
        """
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
        
        return query_spec
    
    async def _query_bpns_for_shells(
        self,
        task_id: str,
        bpn_list: List[str],
        query_spec: List[Dict[str, str]],
        semantic_id: str,
        dtr_policies: Optional[List[Dict[str, Any]]] = None
    ) -> tuple[Optional[Dict[str, Any]], Optional[str]]:
        """
        Query all BPNs in parallel to find shells with matching DPP submodels.
        
        Args:
            task_id: The unique task identifier
            bpn_list: List of BPNs to query
            query_spec: Query specification for DTR lookup
            semantic_id: The semantic ID to search for
            dtr_policies: Optional policies to apply for DTR access
            
        Returns:
            Tuple of (shell_descriptor, matching_bpn) or (None, None) if not found
        """
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
        for bpn, result in zip(bpn_list, shell_results):
            if isinstance(result, Exception):
                logger.warning(f"[Task {task_id}] Error querying BPN {bpn}: {str(result)}")
                continue
            
            logger.info(f"[Task {task_id}] DTR discover_shells result for BPN {bpn}: found {result.get('shellsFound', 0)} shell(s)")
            
            shell_descriptors = result.get("shellDescriptors", [])
            
            # Check each shell for matching semantic ID in submodels
            for shell in shell_descriptors:
                for submodel in shell.get("submodelDescriptors", []):
                    submodel_semantic_id = extract_semantic_id(submodel)
                    if submodel_semantic_id == semantic_id:
                        logger.info(f"[Task {task_id}] Found matching shell with DPP submodel in BPN {bpn}, shell ID: {shell.get('id')}")
                        return shell, bpn
        
        return None, None
    
    def _find_matching_submodel(
        self,
        shell_descriptor: Dict[str, Any],
        semantic_id: str
    ) -> Optional[Dict[str, Any]]:
        """
        Find a submodel matching the given semantic ID in the shell descriptor.
        
        Args:
            shell_descriptor: The shell descriptor containing submodels
            semantic_id: The semantic ID to search for
            
        Returns:
            The matching submodel descriptor or None if not found
        """
        for submodel in shell_descriptor.get("submodelDescriptors", []):
            submodel_semantic_id = extract_semantic_id(submodel)
            if submodel_semantic_id == semantic_id:
                return submodel
        return None
    
    async def _consume_submodel_data(
        self,
        task_id: str,
        matching_bpn: str,
        shell_descriptor: Dict[str, Any],
        submodel_id: str,
        dtr_policies: Optional[List[Dict[str, Any]]] = None,
        governance: Optional[Dict[str, Any]] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Consume the submodel data from the DTR.
        
        Args:
            task_id: The unique task identifier
            matching_bpn: The BPN that owns the digital twin
            shell_descriptor: The shell descriptor
            submodel_id: The submodel ID to retrieve
            dtr_policies: Optional policies to apply for DTR access
            governance: Optional governance policies for submodel consumption
            
        Returns:
            The submodel data or None if not retrieved
        """
        submodel_result = await asyncio.to_thread(
            dtr_manager.consumer.discover_submodel,
            counter_party_id=matching_bpn,
            id=shell_descriptor.get("id"),
            dtr_policies=dtr_policies,
            governance=governance,
            submodel_id=submodel_id
        )
        
        logger.info(f"[Task {task_id}] Submodel discovery result: {submodel_result.get('status', 'unknown')}")
        
        submodel_data = submodel_result.get("submodel")
        
        if not submodel_data:
            logger.warning(f"[Task {task_id}] No submodel data retrieved. Submodel descriptor: {submodel_result.get('submodelDescriptor', {})}")
        
        return submodel_data


def extract_semantic_id(submodel: Dict[str, Any]) -> str:
    """
    Extract semantic ID from a submodel descriptor.
    
    Supports multiple formats:
    - {"keys": [{"type": "GlobalReference", "value": "urn:..."}]}
    - {"value": "urn:..."}
    - Direct string format
    
    Args:
        submodel: The submodel descriptor
        
    Returns:
        The semantic ID string or empty string if not found
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


# Module-level singleton for convenience
# This can be imported and used directly or a new instance can be created
discovery_manager = DiscoveryManager()
