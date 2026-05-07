#################################################################################
# Eclipse Tractus-X - Industry Core Hub Backend
#
# Copyright (c) 2026 LKS Next
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

"""
PCF Management Manager - Administrative operations for PCF data.
"""

from typing import Dict, Any, Optional, List, Union
from datetime import datetime, timezone
from uuid import UUID, NAMESPACE_URL, uuid5
from urllib.parse import quote
import time

from managers.config.log_manager import LoggingManager
from managers.config.config_manager import ConfigManager
from managers.enablement_services.submodel_service_manager import SubmodelServiceManager
from managers.metadata_database.manager import RepositoryManagerFactory
from models.metadata_database.pcf import PcfExchangeEntity, PcfExchangeDirection, PcfExchangeStatus, PcfExchangeType
from tractusx_sdk.dataspace.tools.validate_submodels import submodel_schema_finder
from tools.json_validator import json_validator_draft_aware
from tools.edr_tools import remove_existing_edr
from tools.exceptions import NotFoundError

logger = LoggingManager.get_logger(__name__)

# PCF semantic ID constant (Catena-X PCF aspect model v9.0.0 - async exchange use case)
PCF_SEMANTIC_ID = "urn:samm:io.catenax.pcf:9.0.0#PcfExchangeAsync"


def _pcf_submodel_id(manufacturer_part_id: str) -> UUID:
    """Derive a deterministic UUID for a manufacturer part ID."""
    return uuid5(NAMESPACE_URL, manufacturer_part_id)


class PcfManagementManager:
    """
    Manages PCF administrative and retrieval operations.

    This manager handles read-only and administrative operations for PCF
    data, including listing, filtering, and retrieving requests and responses.
    """

    def __init__(self, submodel_service: Optional[SubmodelServiceManager] = None) -> None:
        """Initialize the management manager with submodel service."""
        self._submodel_service = submodel_service or SubmodelServiceManager()
        self._own_bpn = ConfigManager.get_config("bpn", default=None)
        if self._own_bpn == None:
            logger.warning("BPN not configured in configuration.yml.")
            raise ValueError("BPN must be configured in configuration.yml to send PCF requests and create notifications.")

    def _entity_to_dict(self, entity: PcfExchangeEntity) -> Dict[str, Any]:
        """Convert a PcfExchangeEntity to a dictionary representation."""
        # Handle both enum and string values for direction and status
        # Repository may store as string, while some paths store as enum
        direction_value = entity.direction.value if isinstance(entity.direction, PcfExchangeDirection) else entity.direction
        status_value = entity.status.value if isinstance(entity.status, PcfExchangeStatus) else entity.status
        
        return {
            "requestId": str(entity.request_id),
            "requestingBpn": entity.requesting_bpn,
            "respondingBpn": entity.responding_bpn,
            "direction": direction_value,
            "status": status_value,
            "manufacturerPartId": entity.manufacturer_part_id,
            "customerPartId": entity.customer_part_id,
            "message": entity.message,
            "pcfLocation": entity.pcf_location,
            "correlationId": entity.correlation_id,
            "createdAt": entity.created_at.isoformat() if entity.created_at else None,
            "updatedAt": entity.updated_at.isoformat() if entity.updated_at else None,
        }

    def get_pcf_exchange(self, request_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve a PCF exchange by ID.
        
        The actual PCF payload is looked up by ``manufacturer_part_id``
        (product-scoped storage).

        Args:
            request_id: The unique request identifier (UUID string).
            
        Returns:
            Dictionary with exchange metadata and PCF data if available, or None if not found.
        """
        logger.info(f"Retrieving PCF exchange {request_id}")
        
        try:
            with RepositoryManagerFactory.create() as repo_manager:
                entity = repo_manager.pcf_repository.find_by_request_id(UUID(request_id))
                if not entity:
                    logger.warning(f"PCF exchange {request_id} not found")
                    return None
                
                exchange_dict = self._entity_to_dict(entity)
                
                # Try to retrieve the actual PCF data payload
                try:
                    if not entity.manufacturer_part_id:
                        logger.warning(
                            f"No manufacturerPartId for exchange {request_id}. "
                            "Cannot retrieve PCF data."
                        )
                        return exchange_dict
                    submodel_id = _pcf_submodel_id(entity.manufacturer_part_id)
                    pcf_data = self._submodel_service.get_twin_aspect_document(
                        submodel_id=submodel_id,
                        semantic_id=PCF_SEMANTIC_ID
                    )
                    if pcf_data:
                        exchange_dict["pcfData"] = pcf_data
                except Exception as e:
                    logger.warning(f"Could not retrieve PCF data for exchange {request_id}: {str(e)}")
                
                return exchange_dict
        except ValueError as e:
            logger.error(f"Invalid request ID format: {request_id} - {str(e)}")
            return None
        except Exception as e:
            logger.error(f"Error retrieving PCF exchange {request_id}: {str(e)}")
            raise

    def get_pcf_data(self, request_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve the PCF data payload for a request.

        The payload is looked up by ``manufacturer_part_id`` (product-scoped
        storage).

        Args:
            request_id: The unique request identifier (UUID string).
            
        Returns:
            The PCF data payload, or None if not found.
        """
        logger.info(f"Retrieving PCF data for request {request_id}")
        
        try:
            with RepositoryManagerFactory.create() as repo_manager:
                entity = repo_manager.pcf_repository.find_by_request_id(UUID(request_id))

                if not entity or not entity.manufacturer_part_id:
                    logger.warning(
                        f"No manufacturerPartId for request {request_id}. "
                        "Cannot retrieve PCF data."
                    )
                    return None

                # Store the manufacturer_part_id while session is open
                stored_manufacturer_part_id = entity.manufacturer_part_id

            submodel_id = _pcf_submodel_id(stored_manufacturer_part_id)
            pcf_data = self._submodel_service.get_twin_aspect_document(
                submodel_id=submodel_id,
                semantic_id=PCF_SEMANTIC_ID
            )
            return pcf_data
        except Exception as e:
            logger.warning(f"PCF data not found for request {request_id}: {str(e)}")
            return None
        
    def get_pcf_data_by_manufacturer_part_id(self, manufacturer_part_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve the PCF data payload for a request.

        The payload is looked up by ``manufacturer_part_id`` (product-scoped
        storage).

        Args:
            manufacturer_part_id: The manufacturer part ID.
            
        Returns:
            The PCF data payload, or None if not found.
        """
        logger.info(f"Retrieving PCF data for manufacturer part ID {manufacturer_part_id}")
        
        try:
            with RepositoryManagerFactory.create() as repo_manager:
                entity = repo_manager.pcf_repository.find_by_part_id(manufacturer_part_id)

                if not entity or not entity[0].manufacturer_part_id:
                    logger.warning(
                        f"No manufacturerPartId for manufacturer part ID {manufacturer_part_id}. "
                        "Cannot retrieve PCF data."
                    )
                    return None

                # Store the manufacturer_part_id while session is open
                stored_manufacturer_part_id = entity[0].manufacturer_part_id

            submodel_id = _pcf_submodel_id(stored_manufacturer_part_id)
            pcf_data = self._submodel_service.get_twin_aspect_document(
                submodel_id=submodel_id,
                semantic_id=PCF_SEMANTIC_ID
            )
            return pcf_data
        except Exception as e:
            logger.warning(f"PCF data not found for manufacturer part ID {manufacturer_part_id}: {str(e)}")
            return None

    def get_all_incoming(
        self,
        status: Optional[str] = None,
        manufacturer_part_id: Optional[str] = None,
        customer_part_id: Optional[str] = None,
        requesting_bpn: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> List[Dict[str, Any]]:
        """
        Retrieve all incoming PCF exchanges (requests received from other parties).

        Args:
            status: Filter by exchange status (PENDING, APPROVED, REJECTED, DELIVERED, UPDATED, ERROR).
            manufacturer_part_id: Filter by manufacturer part ID.
            customer_part_id: Filter by customer part ID.
            requesting_bpn: Filter by the BPN of the party requesting data from us.
            limit: Maximum number of results (default 100).
            offset: Number of results to skip (default 0).

        Returns:
            List of incoming PCF exchange dictionaries.
        """
        logger.info(f"Listing incoming PCF exchanges with filters: status={status}, "
                   f"manufacturer_part_id={manufacturer_part_id}, requesting_bpn={requesting_bpn}")
        
        try:
            status_enum = None
            if status:
                try:
                    status_enum = PcfExchangeStatus(status.upper())
                except ValueError:
                    logger.warning(f"Invalid status filter: {status}")
            
            with RepositoryManagerFactory.create() as repo_manager:
                if requesting_bpn:
                    entities = repo_manager.pcf_repository.find_by_bpn(
                        bpn=requesting_bpn,
                        direction=PcfExchangeDirection.INCOMING,
                        status=status_enum,
                        manufacturer_part_id=manufacturer_part_id,
                        customer_part_id=customer_part_id,
                        limit=limit,
                        offset=offset,
                    )
                else:
                    entities = repo_manager.pcf_repository.find_by_bpn(
                        bpn=self._own_bpn,
                        direction=PcfExchangeDirection.INCOMING,
                        status=status_enum,
                        manufacturer_part_id=manufacturer_part_id,
                        customer_part_id=customer_part_id,
                        limit=limit,
                        offset=offset,
                    )
                
                return [self._entity_to_dict(entity) for entity in entities]
                
        except Exception as e:
            logger.error(f"Error listing incoming PCF exchanges: {str(e)}")
            raise

    def get_all_outgoing(
        self,
        status: Optional[str] = None,
        manufacturer_part_id: Optional[str] = None,
        customer_part_id: Optional[str] = None,
        responding_bpn: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> List[Dict[str, Any]]:
        """
        Retrieve all outgoing PCF exchanges (requests we sent to other parties).

        Args:
            status: Filter by exchange status (PENDING, APPROVED, REJECTED, DELIVERED, UPDATED, ERROR).
            manufacturer_part_id: Filter by manufacturer part ID.
            customer_part_id: Filter by customer part ID.
            responding_bpn: Filter by the BPN of the party we requested data from.
            limit: Maximum number of results (default 100).
            offset: Number of results to skip (default 0).

        Returns:
            List of outgoing PCF exchange dictionaries.
        """
        logger.info(f"Listing outgoing PCF exchanges with filters: status={status}, "
                   f"manufacturer_part_id={manufacturer_part_id}, responding_bpn={responding_bpn}")
        
        try:
            status_enum = None
            if status:
                try:
                    status_enum = PcfExchangeStatus(status.upper())
                except ValueError:
                    logger.warning(f"Invalid status filter: {status}")
            
            with RepositoryManagerFactory.create() as repo_manager:
                if responding_bpn:
                    entities = repo_manager.pcf_repository.find_by_bpn(
                        bpn=responding_bpn,
                        direction=PcfExchangeDirection.OUTGOING,
                        status=status_enum,
                        manufacturer_part_id=manufacturer_part_id,
                        customer_part_id=customer_part_id,
                        limit=limit,
                        offset=offset,
                    )
                else:
                    entities = repo_manager.pcf_repository.find_by_bpn(
                        bpn=self._own_bpn,
                        direction=PcfExchangeDirection.OUTGOING,
                        status=status_enum,
                        manufacturer_part_id=manufacturer_part_id,
                        customer_part_id=customer_part_id,
                        limit=limit,
                        offset=offset,
                    )
                
                return [self._entity_to_dict(entity) for entity in entities]
                
        except Exception as e:
            logger.error(f"Error listing outgoing PCF exchanges: {str(e)}")
            raise

    def get_exchange_thread(
        self,
        request_id: str,
    ) -> List[Dict[str, Any]]:
        """
        Retrieve all PCF exchanges related to a request ID, ordered chronologically.
        
        This returns all incoming and outgoing exchanges that share the same
        correlation_id or request_id, representing the full conversation thread.
        Each exchange includes its direction (INCOMING/OUTGOING).

        Args:
            request_id: The request ID to find related exchanges for.

        Returns:
            List of related exchanges ordered chronologically (oldest first).
        """
        logger.info(f"Retrieving PCF exchange thread for request {request_id}")
        
        try:
            with RepositoryManagerFactory.create() as repo_manager:
                # First, get the original exchange to find its correlation_id
                original = repo_manager.pcf_repository.find_by_request_id(UUID(request_id))
                if not original:
                    return []
                
                # Use correlation_id if available, otherwise use request_id
                correlation_id = original.correlation_id or str(original.request_id)
                
                # Find all exchanges with matching correlation_id or request_id
                all_incoming = repo_manager.pcf_repository.find_by_bpn(
                    bpn=self._own_bpn,
                    direction=PcfExchangeDirection.INCOMING,
                    limit=1000,
                )
                all_outgoing = repo_manager.pcf_repository.find_by_bpn(
                    bpn=self._own_bpn,
                    direction=PcfExchangeDirection.OUTGOING,
                    limit=1000,
                )
                
                # Filter by correlation_id or request_id and collect all related exchanges
                related_exchanges = []
                
                for entity in all_incoming:
                    if entity.correlation_id == correlation_id or str(entity.request_id) == request_id:
                        related_exchanges.append(entity)
                
                for entity in all_outgoing:
                    if entity.correlation_id == correlation_id or str(entity.request_id) == request_id:
                        related_exchanges.append(entity)
                
                # Sort chronologically (oldest first)
                related_exchanges.sort(key=lambda e: e.created_at or datetime.min.replace(tzinfo=timezone.utc))
                
                # Convert to dict representation
                return [self._entity_to_dict(e) for e in related_exchanges]
                
        except ValueError as e:
            logger.error(f"Invalid request ID format: {request_id} - {str(e)}")
            return []
        except Exception as e:
            logger.error(f"Error retrieving PCF exchange thread: {str(e)}")
            raise

    def get_all_exchange_threads(
        self,
        status: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> List[List[Dict[str, Any]]]:
        """
        Retrieve all PCF exchange threads, grouped by correlation_id.
        
        Each thread is a list of related exchanges (incoming and outgoing)
        ordered chronologically. Threads are ordered by the most recent activity.

        Args:
            status: Filter threads that contain exchanges with this status.
            limit: Maximum number of threads to return (default 100).
            offset: Number of threads to skip (default 0).

        Returns:
            List of threads, where each thread is a chronologically ordered list of exchanges.
        """
        logger.info(f"Retrieving all PCF exchange threads with filters: status={status}")
        
        try:
            status_enum = None
            if status:
                try:
                    status_enum = PcfExchangeStatus(status.upper())
                except ValueError:
                    logger.warning(f"Invalid status filter: {status}")
            
            with RepositoryManagerFactory.create() as repo_manager:
                # Get all exchanges
                all_incoming = repo_manager.pcf_repository.find_by_bpn(
                    bpn=self._own_bpn,
                    direction=PcfExchangeDirection.INCOMING,
                    status=status_enum,
                    limit=10000,
                )
                all_outgoing = repo_manager.pcf_repository.find_by_bpn(
                    bpn=self._own_bpn,
                    direction=PcfExchangeDirection.OUTGOING,
                    status=status_enum,
                    limit=10000,
                )
                
                # Combine all exchanges
                all_exchanges = list(all_incoming) + list(all_outgoing)
                
                # Group by correlation_id (or request_id if no correlation_id)
                threads_map: Dict[str, List[PcfExchangeEntity]] = {}
                for entity in all_exchanges:
                    thread_key = entity.correlation_id or str(entity.request_id)
                    if thread_key not in threads_map:
                        threads_map[thread_key] = []
                    threads_map[thread_key].append(entity)
                
                # Sort each thread chronologically and convert to dicts
                threads = []
                for thread_key, entities in threads_map.items():
                    entities.sort(key=lambda e: e.created_at or datetime.min.replace(tzinfo=timezone.utc))
                    threads.append([self._entity_to_dict(e) for e in entities])
                
                # Sort threads by most recent activity (newest thread first)
                threads.sort(
                    key=lambda t: t[-1].get("createdAt", "") if t else "",
                    reverse=True
                )
                
                # Apply pagination
                return threads[offset:offset + limit]
                
        except Exception as e:
            logger.error(f"Error retrieving PCF exchange threads: {str(e)}")
            raise

    def update_pcf_exchange_status(
        self,
        request_id: str,
        new_status: PcfExchangeStatus,
        type: PcfExchangeType, 
        message: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Update the status of an existing PCF exchange.

        Args:
            request_id: The ID of the exchange to update.
            new_status: New status as string or enum
                        (PENDING, APPROVED, REJECTED, DELIVERED, UPDATED, ERROR).
            type: The type of the exchange.
            message: Optional message (e.g., rejection reason or error details).

        Returns:
            Updated exchange data, or None if not found.
            
        Raises:
            ValueError: If the status value is invalid.
        """
        status_label = new_status.value if isinstance(new_status, PcfExchangeStatus) else new_status
        logger.info(f"Updating PCF exchange {request_id} status to {status_label}")

        try:
            with RepositoryManagerFactory.create() as repo_manager:
                entity = repo_manager.pcf_repository.update_status(
                    request_id=UUID(request_id),
                    new_status=status_label,
                    type=type,
                    message=message,
                )
                if not entity:
                    logger.warning(f"PCF exchange {request_id} not found for status update")
                    return None

                # Convert entity to dict while session is still active
                result = self._entity_to_dict(entity)
                logger.info(f"PCF exchange {request_id} status updated to {status_label}")
                return result
                
        except ValueError as e:
            logger.error(f"Invalid request ID format: {request_id} - {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Error updating PCF exchange {request_id}: {str(e)}")
            raise

    def approve_pcf_exchange(self, request_id: str, message: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """
        Approve a pending PCF exchange.
        
        Args:
            request_id: The ID of the exchange to approve.
            message: Optional approval message.
            
        Returns:
            Updated exchange data, or None if not found.
        """
        return self.update_pcf_exchange_status(
            request_id=request_id,
            new_status=PcfExchangeStatus.DELIVERED.value,
            type=PcfExchangeType.RESPONSE,
            message=message or "Exchange approved"
        )

    def reject_pcf_exchange(self, request_id: str, reason: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """
        Reject a pending PCF exchange.
        
        Args:
            request_id: The ID of the exchange to reject.
            reason: Optional rejection reason.
            
        Returns:
            Updated exchange data, or None if not found.
        """
        return self.update_pcf_exchange_status(
            request_id=request_id,
            type=PcfExchangeType.RESPONSE,
            new_status=PcfExchangeStatus.REJECTED.value,
            message=reason or "Exchange rejected"
        )

    def delete_pcf_exchange(self, request_id: str) -> bool:
        """
        Delete a PCF exchange and its associated data.
        
        Args:
            request_id: The ID of the exchange to delete.
            
        Returns:
            True if deleted successfully, False if not found.
        """
        logger.info(f"Deleting PCF exchange {request_id}")
        
        try:
            # Delete PCF data from submodel service (if exists)
            try:
                self._submodel_service.delete_twin_aspect_document(
                    submodel_id=UUID(request_id),
                    semantic_id=PCF_SEMANTIC_ID
                )
                logger.info(f"Deleted PCF data for exchange {request_id}")
            except Exception as e:
                logger.warning(f"Could not delete PCF data for exchange {request_id} (may not exist): {str(e)}")
            
            # Delete the database record
            with RepositoryManagerFactory.create() as repo_manager:
                deleted = repo_manager.pcf_repository.delete_by_request_id(UUID(request_id))
                
                if deleted:
                    logger.info(f"PCF exchange {request_id} deleted successfully")
                else:
                    logger.warning(f"PCF exchange {request_id} not found for deletion")
                    
                return deleted
                
        except ValueError as e:
            logger.error(f"Invalid request ID format: {request_id} - {str(e)}")
            return False
        except Exception as e:
            logger.error(f"Error deleting PCF exchange {request_id}: {str(e)}")
            raise

    def upload_pcf_data(
        self,
        manufacturer_part_id: str,
        pcf_data: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Upload a PCF payload for a product.

        Validates the payload against the Catena-X PCF 9.0.0 schema and stores
        it in the submodel service keyed by ``manufacturerPartId``.

        Args:
            manufacturer_part_id: The manufacturer part ID for the product.
            pcf_data: The PCF payload to store.

        Returns:
            Dictionary with upload confirmation details.

        Raises:
            ValueError: If the PCF data fails schema validation.
        """
        logger.info(f"Uploading PCF data for manufacturerPartId={manufacturer_part_id}")

        submodel_id = _pcf_submodel_id(manufacturer_part_id)

        # Verify that existing data is not present
        try:
            existing = self._submodel_service.get_twin_aspect_document(
                submodel_id=submodel_id,
                semantic_id=PCF_SEMANTIC_ID,
            )
            if existing:
                raise ValueError(
                    f"PCF data already exists for manufacturerPartId={manufacturer_part_id}. "
                    "Use update to modify existing data."
                )
        except NotFoundError:
            # File doesn't exist yet - this is expected for a new upload
            pass


        self._validate_pcf_schema(pcf_data)


        pcf_location = f"submodel://{PCF_SEMANTIC_ID}/{manufacturer_part_id}"

        self._submodel_service.upload_twin_aspect_document(
            submodel_id=submodel_id,
            semantic_id=PCF_SEMANTIC_ID,
            payload=pcf_data,
        )

        # Update all pending responses with the PCF location
        self._update_pending_responses_with_pcf_location(manufacturer_part_id, pcf_location)

        logger.info(
            f"PCF data uploaded for manufacturerPartId={manufacturer_part_id} "
            f"(submodel_id={submodel_id})"
        )

        return {
            "manufacturerPartId": manufacturer_part_id,
            "pcfLocation": pcf_location,
            "status": "uploaded",
        }

    def update_pcf_data(
        self,
        manufacturer_part_id: str,
        pcf_data: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Update an existing PCF payload for a product.

        Validates the payload against the Catena-X PCF 9.0.0 schema and
        overwrites the existing data in the submodel service.

        Args:
            manufacturer_part_id: The manufacturer part ID for the product.
            pcf_data: The updated PCF payload.

        Returns:
            Dictionary with update confirmation details.

        Raises:
            ValueError: If the PCF data fails schema validation or no
                        existing data is found.
        """
        logger.info(f"Updating PCF data for manufacturerPartId={manufacturer_part_id}")

        submodel_id = _pcf_submodel_id(manufacturer_part_id)

        # Verify that existing data is present
        existing = self._submodel_service.get_twin_aspect_document(
            submodel_id=submodel_id,
            semantic_id=PCF_SEMANTIC_ID,
        )
        if not existing:
            raise ValueError(
                f"No existing PCF data found for manufacturerPartId={manufacturer_part_id}. "
                "Use upload to create new data."
            )

        self._validate_pcf_schema(pcf_data)

        pcf_location = f"submodel://{PCF_SEMANTIC_ID}/{manufacturer_part_id}"

        self._submodel_service.upload_twin_aspect_document(
            submodel_id=submodel_id,
            semantic_id=PCF_SEMANTIC_ID,
            payload=pcf_data,
        )

        shared_bpns = self._get_shared_bpns(manufacturer_part_id)

        logger.info(
            f"PCF data updated for manufacturerPartId={manufacturer_part_id} "
            f"(submodel_id={submodel_id})"
        )

        return {
            "manufacturerPartId": manufacturer_part_id,
            "pcfLocation": pcf_location,
            "status": "updated",
            "sharedWithBpns": shared_bpns
        }
    
    def get_pcf_location(self, manufacturer_part_id: str) -> str:
        """
        Get the storage location of the PCF data for a given manufacturer part ID.

        Args:
            manufacturer_part_id: The manufacturer part ID to look up.
        Returns:
            The PCF location string (e.g., submodel URL).
        """
        submodel_id = _pcf_submodel_id(manufacturer_part_id)

        # Verify that existing data is present
        existing = self._submodel_service.get_twin_aspect_document(
            submodel_id=submodel_id,
            semantic_id=PCF_SEMANTIC_ID,
        )

        if not existing:
            raise ValueError(
                f"No existing PCF data found for manufacturerPartId={manufacturer_part_id}."
            )
        return f"submodel://{PCF_SEMANTIC_ID}/{manufacturer_part_id}"


    def _update_pending_responses_with_pcf_location(self, manufacturer_part_id: str, pcf_location: str) -> None:
        """Update all pending PCF responses for this manufacturer part with the PCF location.

        Finds all OUTGOING RESPONSE records with PENDING status for the given
        manufacturer_part_id and updates their pcf_location field so they're ready
        to be sent to requesting parties.

        Args:
            manufacturer_part_id: The manufacturer part ID to filter by.
            pcf_location: The PCF location string to set (e.g., submodel://.../id).
        """
        with RepositoryManagerFactory.create() as repo_manager:
            entities = repo_manager.pcf_repository.find_by_part_id(
                manufacturer_part_id=manufacturer_part_id,
                status=PcfExchangeStatus.PENDING
            )
            
            # Extract and update pending responses while session is open
            for entity in entities:
                if (entity.direction == PcfExchangeDirection.OUTGOING and 
                    entity.type == PcfExchangeType.RESPONSE):
                    
                    repo_manager.pcf_repository.update_pcf_location(entity.request_id, entity.type, pcf_location)
                    logger.info(f"Updated PCF location for pending response {entity.request_id}")
            
            repo_manager.commit()

    def _get_shared_bpns(self, manufacturer_part_id: str) -> List[str]:
        """Return deduplicated BPNs that have received this PCF data.

        Looks up OUTGOING RESPONSE records with DELIVERED or UPDATED status for the
        given ``manufacturer_part_id`` and collects the requesting BPNs.
        """
        direction = {PcfExchangeDirection.OUTGOING}
        type_pcf = {PcfExchangeType.RESPONSE}
        delivered_statuses = {PcfExchangeStatus.DELIVERED, PcfExchangeStatus.UPDATED}
        bpns: set[str] = set()
        
        with RepositoryManagerFactory.create() as repo_manager:
            entities = repo_manager.pcf_repository.find_by_part_id(
                manufacturer_part_id=manufacturer_part_id,
            )
            
            # Extract data while session is open to avoid detached instance errors
            for entity in entities:
                if entity.status in delivered_statuses and entity.requesting_bpn and entity.direction in direction and entity.type in type_pcf:
                    bpns.add(entity.requesting_bpn)

        return sorted(bpns)

    def _validate_pcf_schema(self, pcf_data: Dict[str, Any]) -> None:
        """Validate PCF data against the Catena-X PCF 9.0.0 JSON schema.

        Raises:
            ValueError: If the data does not conform to the schema.
        """
        pcf_schema_result = submodel_schema_finder("urn:samm:io.catenax.pcf:9.0.0#Pcf")
        json_validator_draft_aware(pcf_schema_result["schema"], pcf_data)

    def get_pending_incoming_count(self) -> int:
        """
        Get the count of pending incoming PCF exchanges.
        
        Returns:
            Number of pending incoming exchanges.
        """
        try:
            exchanges = self.get_all_incoming(status=PcfExchangeStatus.PENDING.value)
            return len(exchanges)
        except Exception as e:
            logger.error(f"Error counting pending incoming exchanges: {str(e)}")
            return 0

    def send_via_edc(
        self,
        request_id: str,
        target_bpn: str,
        http_method: str,
        path: str,
        params: Optional[Dict[str, str]] = None,
        json_data: Optional[Dict[str, Any]] = None,
        list_policies: Optional[List[Dict]] = None,
        asset_type: str = "https://w3id.org/catenax/taxonomy#PcfExchange",
    ) -> None:
        """
        Send PCF data via EDC using either GET or PUT method with single retry on failure.

        This is a shared method for both consumption (GET requests) and 
        provision (PUT responses) to avoid code duplication.

        Args:
            request_id: The PCF request/response ID
            target_bpn: Business Partner Number of the target organization
            http_method: 'GET' for requests, 'PUT' for responses
            path: The EDC path (e.g., '/request-id' or '/request-id?update=true')
            params: Query parameters for GET requests
            json_data: JSON payload for PUT requests
            list_policies: Optional list of policies for contract negotiation
            asset_type: The EDC asset type to filter by (default: PcfExchange)

        Returns:
            The response object from the EDC data plane

        Raises:
            ValueError: If no connectors found or all data transfers fail
        """
        from tractusx_sdk.dataspace.services.connector import BaseConnectorConsumerService

        connector_consumer_manager, consumer_connector_service = self._get_connector_services()

        if not connector_consumer_manager or not consumer_connector_service:
            raise ValueError("EDC connector services are not available.")

        logger.info(f"[PCF EDC] Discovering connectors for BPN [{target_bpn}]")

        # Remove stale EDR from database to ensure fresh EDR negotiation
        with RepositoryManagerFactory.create() as repos:
            remove_existing_edr(repos, target_bpn, "ichub:asset:pcf-exchange:%")

        connectors = connector_consumer_manager.get_connectors(target_bpn)
        if not connectors:
            raise ValueError(f"No connector endpoints found for BPN [{target_bpn}].")
        logger.info(f"[PCF EDC] Found {len(connectors)} connector(s) for BPN [{target_bpn}]")

        last_error = None
        for connector_url in connectors:
            try:
                logger.info(
                    f"[PCF EDC] Attempting {http_method} on [{connector_url}] path=[{path}]"
                )

                if http_method.upper() == "GET":
                    response = consumer_connector_service.do_get_by_dct_type(
                        counter_party_id=target_bpn,
                        counter_party_address=connector_url,
                        dct_type=asset_type,
                        policies=list_policies,
                        path=path,
                        params=params if params else None,
                    )
                elif http_method.upper() == "PUT":
                    response = self._do_put_by_dct_type(
                        consumer_connector_service=consumer_connector_service,
                        counter_party_id=target_bpn,
                        counter_party_address=connector_url,
                        dct_type=asset_type,
                        json_data=json_data,
                        policies=list_policies,
                        path=path,
                    )
                else:
                    raise ValueError(f"Unsupported HTTP method: {http_method}")

                if response.status_code in (200, 201, 202, 204):
                    logger.info(
                        f"[PCF EDC] {http_method} successful for request [{request_id}] "
                        f"(HTTP {response.status_code})"
                    )
                    return response

                logger.warning(
                    f"[PCF EDC] {http_method} returned status {response.status_code} "
                    f"on [{connector_url}]: {response.text}"
                )
                last_error = ValueError(
                    f"EDC data transfer failed with status {response.status_code}"
                )

            except Exception as e:
                logger.warning(
                    f"[PCF EDC] Failed on connector [{connector_url}]: {e}. "
                    f"Retrying in 3 seconds..."
                )
                last_error = e
                
                # Wait and retry once more
                time.sleep(3)
                
                try:
                    logger.info(
                        f"[PCF EDC] Retry: Attempting {http_method} on [{connector_url}] path=[{path}]"
                    )
                    
                    if http_method.upper() == "GET":
                        response = consumer_connector_service.do_get_by_dct_type(
                            counter_party_id=target_bpn,
                            counter_party_address=connector_url,
                            dct_type=asset_type,
                            policies=list_policies,
                            path=path,
                            params=params if params else None,
                        )
                    elif http_method.upper() == "PUT":
                        response = self._do_put_by_dct_type(
                            consumer_connector_service=consumer_connector_service,
                            counter_party_id=target_bpn,
                            counter_party_address=connector_url,
                            dct_type=asset_type,
                            json_data=json_data,
                            policies=list_policies,
                            path=path,
                        )
                    
                    if response.status_code in (200, 201, 202, 204):
                        logger.info(
                            f"[PCF EDC] Retry successful for request [{request_id}] "
                            f"(HTTP {response.status_code})"
                        )
                        return response
                    
                    logger.warning(
                        f"[PCF EDC] Retry also failed with status {response.status_code}"
                    )
                    last_error = ValueError(
                        f"EDC data transfer failed on retry with status {response.status_code}"
                    )
                    
                except Exception as retry_error:
                    logger.warning(
                        f"[PCF EDC] Retry also failed: {retry_error}"
                    )
                    last_error = retry_error

        raise ValueError(
            f"Failed to send PCF data via EDC to any connector for BPN [{target_bpn}]: {last_error}"
        )

    def _do_put_by_dct_type(
        self,
        consumer_connector_service,
        counter_party_id: str,
        counter_party_address: str,
        dct_type: str,
        json_data: Optional[Dict[str, Any]] = None,
        policies: Optional[List[Dict]] = None,
        path: str = "/",
        dct_type_key: str = "'http://purl.org/dc/terms/type'.'@id'",
        operator: str = "=",
        **kwargs,
    ):
        """
        Temporary wrapper for do_put_by_dct_type (not yet in SDK).
        
        Executes an HTTP PUT request to an asset behind an EDC, filtered by DCT type.
        This is a local wrapper that will be replaced once do_put_by_dct_type is
        merged into the tractusx SDK.

        Parameters:
        counter_party_id (str): Business Partner Number of the target organization.
        counter_party_address (str): The URL of the EDC provider's DSP endpoint.
        dct_type (str): The DCT type to filter assets by (e.g., "PcfExchange").
        json_data (dict, optional): The JSON data to be sent in the PUT request.
        policies (list, optional): List of allowed policies for contract negotiation.
        path (str, optional): The path to be appended to the dataplane URL. Defaults to "/".
        dct_type_key (str, optional): The JSON path key for DCT type filtering.
        operator (str, optional): The comparison operator for filtering. Defaults to "=".
        **kwargs: Additional keyword arguments (headers, timeout, verify, etc).

        Returns:
        Response: The HTTP response from the PUT request to the dataplane.

        Raises:
        RuntimeError: If EDR negotiation fails or dataplane details cannot be retrieved.
        ConnectionError: If catalog retrieval or HTTP request fails.
        """
        # Create filter expression matching the asset property structure
        filter_expression = [{
            "operandLeft": dct_type_key,
            "operator": operator,
            "operandRight": dct_type,
        }]

        

        # Call do_put with the filter expression
        # Only override json to ensure it's never None (SDK requirement)
        return consumer_connector_service.do_put(
            counter_party_id=counter_party_id,
            counter_party_address=counter_party_address,
            filter_expression=filter_expression,
            path=path,
            json=json_data if json_data is not None else {},
            policies=policies,
            headers={}
        )

    def _get_connector_services(self):
        """
        Lazily import connector services to avoid circular imports.

        Returns:
            Tuple of (connector_consumer_manager, consumer_connector_service).
        """
        if not hasattr(self, "_connector_consumer_manager") or self._connector_consumer_manager is None:
            from connector import connector_consumer_manager, consumer_connector_service
            self._connector_consumer_manager = connector_consumer_manager
            self._consumer_connector_service = consumer_connector_service
        return self._connector_consumer_manager, self._consumer_connector_service


# Module-level singleton for convenience
management_manager = PcfManagementManager()
