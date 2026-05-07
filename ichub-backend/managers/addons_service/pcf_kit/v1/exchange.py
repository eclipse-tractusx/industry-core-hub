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
PCF Exchange Manager - EDC-level operations for PCF data exchange.

Reference:
    - CX-0136 PCF Exchange Standard
    - CX-0002 Digital Twins in Catena-X
"""

from typing import Dict, Any, Optional
from datetime import datetime, timezone
from uuid import UUID, NAMESPACE_URL, uuid5
from tractusx_sdk.dataspace.tools.validate_submodels import submodel_schema_finder

from managers.addons_service.pcf_kit.v1.notifications import pcf_notification_manager
from managers.addons_service.pcf_kit.v1.management import management_manager
from managers.config.log_manager import LoggingManager
from managers.config.config_manager import ConfigManager
from managers.enablement_services.submodel_service_manager import SubmodelServiceManager
from managers.metadata_database.manager import RepositoryManagerFactory
from models.metadata_database.pcf import PcfExchangeDirection, PcfExchangeStatus, PcfExchangeType
from tools.json_validator import json_validator_draft_aware

logger = LoggingManager.get_logger(__name__)

# PCF semantic ID constant (Catena-X PCF aspect model v9.0.0 - async exchange use case)
PCF_SEMANTIC_ID = "urn:samm:io.catenax.pcf:9.0.0#PcfExchangeAsync"


def _pcf_submodel_id(manufacturer_part_id: str) -> UUID:
    """Derive a deterministic UUID for a manufacturer part ID.

    Uses UUID5 with NAMESPACE_URL so the same part always maps to the
    same submodel document in the submodel service.
    """
    return uuid5(NAMESPACE_URL, manufacturer_part_id)


class PcfExchangeManager:
    """
    Manages PCF (Product Carbon Footprint) Data Exchange operations.
    
    This manager handles the storage, retrieval, and exchange of PCF data
    between business partners via EDC.
    """

    def __init__(
        self,
        submodel_service: Optional[SubmodelServiceManager] = None
    ) -> None:
        """Initialize the exchange manager with the submodel service."""
        self._submodel_service = submodel_service or SubmodelServiceManager()
        self._own_bpn = ConfigManager.get_config("bpn", default=None)



    def request_pcf(
        self,
        request_id: str,
        edc_bpn: str,
        manufacturer_part_id: Optional[str] = None,
        customer_part_id: Optional[str] = None,
        message: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Receive a PCF data request from a data consumer via EDC data plane.
        
        This endpoint is called when a data consumer requests the PCF submodel
        of a serialized part. The edc_bpn is automatically set by EDC during
        the data transfer.
        
        Flow:
            1. Validate input parameters
            2. Store PCF request record in database with PENDING status
            3. Create a notification informing about the incoming PCF request
            4. Return confirmation (actual PCF data exchange happens asynchronously)
        
        Args:
            request_id: Unique identifier for the PCF request
            edc_bpn: Business Partner Number of the requesting party (set by EDC)
            manufacturer_part_id: Manufacturer's part identifier
            customer_part_id: Customer's part identifier  
            message: Optional message accompanying the request
            
        Returns:
            Dict containing request confirmation details
            
        Raises:
            ValueError: If neither manufacturerPartId nor customerPartId is provided
            ValueError: If storing the request fails
        """
        if not manufacturer_part_id and not customer_part_id:
            raise ValueError("At least one of manufacturerPartId or customerPartId must be provided")
        
        logger.info(f"Processing PCF request {request_id} from BPN {edc_bpn}")
        
        try:
            # Store PCF request in database
            with RepositoryManagerFactory.create() as repo_manager:
                # Check if incoming request record already exists
                existing_request = repo_manager.pcf_repository.find_by_request_id(
                    UUID(request_id), 
                    type=PcfExchangeType.REQUEST
                )
                
                if not existing_request:
                    # Create incoming request record
                    repo_manager.pcf_repository.create_new(
                        request_id=UUID(request_id),
                        direction=PcfExchangeDirection.INCOMING,
                        status=PcfExchangeStatus.DELIVERED,
                        type=PcfExchangeType.REQUEST,
                        requesting_bpn=edc_bpn,
                        responding_bpn=self._own_bpn,
                        manufacturer_part_id=manufacturer_part_id,
                        customer_part_id=customer_part_id,
                        message=message
                    )
                    logger.info(f"Created PCF exchange record for request {request_id} with status DELIVERED")
                else:
                    logger.info(f"PCF request {request_id} already exists, skipping incoming record creation")
                
                # Try to get existing PCF location, but handle case where it doesn't exist yet
                pcf_location = None
                if manufacturer_part_id:
                    try:
                        pcf_location = management_manager.get_pcf_location(manufacturer_part_id)
                    except Exception as e:
                        logger.info(f"No existing PCF data found for manufacturer_part_id {manufacturer_part_id}: {str(e)}")
                        pcf_location = None
                
                # Check if outgoing response record already exists
                existing_response = repo_manager.pcf_repository.find_by_request_id(
                    UUID(request_id), 
                    type=PcfExchangeType.RESPONSE
                )
                
                if not existing_response:
                    # Create outgoing response record
                    repo_manager.pcf_repository.create_new(
                        request_id=UUID(request_id),
                        direction=PcfExchangeDirection.OUTGOING,
                        status=PcfExchangeStatus.PENDING,
                        type=PcfExchangeType.RESPONSE,
                        requesting_bpn=edc_bpn,
                        responding_bpn=self._own_bpn,
                        manufacturer_part_id=manufacturer_part_id,
                        customer_part_id=customer_part_id,
                        message=message,
                        pcf_location=pcf_location
                    )
                    logger.info(f"Created PCF exchange record for response to request {request_id} with status PENDING")
                else:
                    logger.info(f"PCF response {request_id} already exists, skipping response record creation")
                
        except Exception as e:
            logger.error(f"Failed to store PCF request {request_id}: {str(e)}")
            raise ValueError(f"Failed to store PCF request: {str(e)}")
        
        # Create notification for the incoming PCF request
        if self._own_bpn:
            pcf_notification_manager.create_pcf_notification(
                sender_bpn=edc_bpn,
                receiver_bpn=self._own_bpn,
                notification_type="PCF_REQUEST_RECEIVED",
                request_id=request_id,
                manufacturer_part_id=manufacturer_part_id,
                customer_part_id=customer_part_id,
                message=message or f"PCF data request received from {edc_bpn}"
            )
        else:
            logger.warning(
                f"Cannot create notification for PCF request {request_id}: "
                "bpn not configured in configuration.yml"
            )
        
        logger.info(f"PCF request {request_id} created successfully")
        
        return {
            "status": "PCF request received",
            "requestId": request_id,
            "manufacturerPartId": manufacturer_part_id,
            "customerPartId": customer_part_id,
            "message": "Request stored. PCF data will be provided after approval."
        }

    def submit_pcf_response(
        self,
        request_id: str,
        pcf_data: Dict[str, Any],
        edc_bpn: str,
        is_update: bool = False,
        message: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Receive PCF response or update via EDC data plane.
        
        This endpoint handles incoming PCF data from data providers, either as
        a response to an existing request or as an update to previously shared
        data. The edc_bpn is automatically set by EDC during the data transfer.
        
        Implement Production Flow:
            1. Validate PCF data against Catena-X schema
            2. Store PCF data in database
            3. Update request status
            4. Create notification informing about the received PCF data:
               - If is_update=False: notification text for "new PCF response received"
               - If is_update=True: notification text for "PCF data update received"
            5. Log data exchange for compliance
        
        Args:
            request_id: ID of the PCF request being responded to
            pcf_data: PCF data payload (should match Catena-X PCF schema)
            edc_bpn: Business Partner Number of the responding party (set by EDC)
            is_update: Whether this is an update to existing data
            message: Optional message accompanying the response
            
        Returns:
            Dict containing response confirmation details
            
        Raises:
            ValueError: If PCF data validation fails
        """
        logger.info(
            f"Processing PCF {'update' if is_update else 'response'} "
            f"for request {request_id} from BPN {edc_bpn}"
        )
        
        # Validate PCF data structure (basic validation)
        if not pcf_data:
            raise ValueError("PCF data cannot be empty")
        
        try:
            # submodel_schema_finder returns {'status': ..., 'schema': <actual_schema>}
            pcf_schema_result = submodel_schema_finder("urn:samm:io.catenax.pcf:9.0.0#Pcf")
            # Use draft-aware validator (PCF schema uses Draft-04, not Draft-07)
            json_validator_draft_aware(pcf_schema_result['schema'], pcf_data)
            logger.info(f"PCF data for request {request_id} validated successfully against schema")
        except Exception as e:
            logger.error(f"PCF data validation failed for request {request_id}: {str(e)}")
            raise ValueError(f"PCF data validation failed: {str(e)}")
        

        try:
            self._store_and_update_pcf(
                request_id, 
                pcf_data, 
                is_update, 
                type=PcfExchangeType.RESPONSE,
                responding_bpn=edc_bpn
            )
        except Exception as e:
            logger.error(f"Failed to store PCF data for request {request_id}: {str(e)}")
            raise ValueError(f"Failed to store PCF data: {str(e)}")
        
        # Create notification for the received PCF data
        if self._own_bpn:
            notification_type = "PCF_DATA_UPDATE_RECEIVED" if is_update else "PCF_RESPONSE_RECEIVED"
            notification_message = (
                f"PCF data update received from {edc_bpn}" if is_update 
                else f"PCF data response received from {edc_bpn}"
            )
            pcf_notification_manager.create_pcf_notification(
                sender_bpn=edc_bpn,
                receiver_bpn=self._own_bpn,
                notification_type=notification_type,
                request_id=request_id,
                message=message or notification_message,
                is_update=is_update
            )
        else:
            logger.warning(
                f"Cannot create notification for PCF response {request_id}: "
                "bpn not configured in configuration.yml"
            )

        logger.info(f"PCF data for request {request_id} processed successfully")
        
        return {
            "status": "PCF data received successfully",
            "requestId": request_id,
            "isUpdate": is_update
        }

    def _store_and_update_pcf(
        self,
        request_id: str,
        pcf_data: Dict[str, Any],
        is_update: bool,
        type: PcfExchangeType,
        responding_bpn: Optional[str] = None
    ) -> None:
        """
        Store the PCF payload in the submodel service and update the exchange
        record status.

        When receiving a response (type=RESPONSE), this creates an INCOMING RESPONSE
        record. The payload is keyed by ``manufacturer_part_id`` (product-scoped).

        Args:
            request_id: The PCF request ID.
            pcf_data: The validated PCF payload.
            is_update: Whether this is an update to previously shared data.
            type: The type of exchange (REQUEST or RESPONSE).
            responding_bpn: The BPN of the party sending the response (required for RESPONSE type).
        """
        with RepositoryManagerFactory.create() as repo_manager:
            # Find the OUTGOING REQUEST to get the manufacturer_part_id and consumer BPN
            outgoing_request = repo_manager.pcf_repository.find_by_request_id(UUID(request_id), type=PcfExchangeType.REQUEST)
            if not outgoing_request or not outgoing_request.manufacturer_part_id:
                raise ValueError(
                    f"No manufacturerPartId found for request {request_id}. "
                    "Cannot store PCF data without a part identifier."
                )
            manufacturer_part_id = outgoing_request.manufacturer_part_id
            requesting_bpn = outgoing_request.requesting_bpn
        
        # Try to upload new PCF data; if it already exists, check if we should update or if it's identical
        try:
            management_manager.upload_pcf_data(manufacturer_part_id, pcf_data)
        except ValueError as e:
            if "already exists" in str(e):
                if is_update:
                    # Update is allowed when is_update=True
                    management_manager.update_pcf_data(manufacturer_part_id, pcf_data)
                else:
                    # If is_update=False but data exists, check if it's the same data (idempotent)
                    existing_pcf = management_manager.get_pcf_data_by_manufacturer_part_id(manufacturer_part_id)
                    if existing_pcf == pcf_data:
                        logger.info(f"PCF data for {manufacturer_part_id} already exists and is identical - treating as idempotent operation")
                        # Continue with normal flow (create/update response record)
                    else:
                        # Data exists but is different - this is a conflict
                        raise ValueError(
                            f"PCF data already exists for manufacturerPartId={manufacturer_part_id} and differs from received data. "
                            "Use is_update=true to replace it."
                        )
            else:
                raise

        with RepositoryManagerFactory.create() as repo_manager:
            pcf_location = management_manager.get_pcf_location(manufacturer_part_id)
            
            if type == PcfExchangeType.RESPONSE:
                # When receiving a response, create or update an INCOMING RESPONSE record
                existing_response = repo_manager.pcf_repository.find_by_request_id(UUID(request_id), type=PcfExchangeType.RESPONSE)
                
                if existing_response:
                    # Update existing INCOMING RESPONSE
                    if is_update:
                        repo_manager.pcf_repository.update_status(
                            request_id=UUID(request_id),
                            new_status=PcfExchangeStatus.UPDATED,
                            type=PcfExchangeType.RESPONSE
                        )
                        logger.info(f"Updated PCF INCOMING RESPONSE status to UPDATED for request {request_id}")
                    else:
                        # First response, update location if not set
                        repo_manager.pcf_repository.update_pcf_location(existing_response.request_id, existing_response.type, pcf_location)
                        repo_manager.commit()
                        logger.info(f"Updated PCF location for INCOMING RESPONSE {request_id}: {pcf_location}")
                else:
                    # Create new INCOMING RESPONSE record
                    new_response = repo_manager.pcf_repository.create_new(
                        requesting_bpn=requesting_bpn,
                        responding_bpn=responding_bpn,
                        direction=PcfExchangeDirection.INCOMING,
                        type=PcfExchangeType.RESPONSE,
                        manufacturer_part_id=manufacturer_part_id,
                        status=PcfExchangeStatus.DELIVERED if not is_update else PcfExchangeStatus.UPDATED,
                        pcf_location=pcf_location,
                        request_id=UUID(request_id)
                    )
                    repo_manager.commit()
                    logger.info(f"Created PCF INCOMING RESPONSE for request {request_id} with status DELIVERED")
            else:
                # For other types (not typically used in response flow)
                management_manager.update_pcf_exchange_status(
                    request_id=request_id,
                    new_status=PcfExchangeStatus.UPDATED if is_update else PcfExchangeStatus.DELIVERED,
                    type=type
                )
                logger.info(f"Updated PCF exchange status for request {request_id}")


# Module-level singleton for convenience
exchange_manager = PcfExchangeManager()
