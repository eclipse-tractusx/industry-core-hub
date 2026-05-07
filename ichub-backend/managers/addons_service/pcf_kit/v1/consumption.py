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
PCF Consumption Manager - Data Consumer operations for PCF data exchange.

Reference:
    - CX-0136 PCF Exchange Standard
    - CX-0002 Digital Twins in Catena-X
"""

from typing import Dict, Any, List, Optional
from uuid import UUID, uuid4
from datetime import datetime, timezone
from urllib.parse import quote

from managers.addons_service.pcf_kit.v1.notifications import pcf_notification_manager

from managers.config.log_manager import LoggingManager
from managers.config.config_manager import ConfigManager
from managers.metadata_database.manager import RepositoryManagerFactory
from managers.addons_service.pcf_kit.v1.management import management_manager
from models.metadata_database.pcf import PcfExchangeDirection, PcfExchangeStatus, PcfExchangeType
from models.metadata_database.notification.models import NotificationDirection
from models.services.addons.pcf_kit.v1.models import PcfExchangeModel, PcfRelationshipModel, PcfSpecificStateModel

logger = LoggingManager.get_logger(__name__)

# Asset type used to identify PCF exchange assets in EDC catalogs (CX-0136)
PCF_EXCHANGE_ASSET_TYPE = "https://w3id.org/catenax/taxonomy#PcfExchange"


class PcfConsumptionManager:
    """
    Manages PCF consumption operations for data consumers.

    This manager handles:
    - Creating PCF request records in the metadata database
    - Discovering the data provider's connector endpoints
    - Browsing catalogs for ``PcfExchange`` assets
    - Negotiating contracts and sending GET requests via EDC data plane
    - Creating notifications for PCF request events

    PCF Request Flow (CX-0136):
        1. Data consumer creates a PCF request via this consumption manager
        2. The request record is stored in the database with PENDING status
        3. The provider's connector endpoints are discovered via BPN
        4. For each connector, the SDK's ``do_get_by_dct_type()`` handles catalog
           filtering, contract negotiation, and GET request in a single call
        5. A notification is created for the outgoing request event
    """

    def __init__(
        self,
    ) -> None:
        """Initialize the consumption manager."""
        self._own_bpn = ConfigManager.get_config("bpn", default=None)
        if self._own_bpn == None:
            logger.warning("BPN not configured in configuration.yml.")
            raise ValueError("BPN must be configured in configuration.yml to send PCF requests and create notifications.")

    def send_pcf_request(
        self,
        manufacturer_part_id: Optional[str] = None,
        customer_part_id: Optional[str] = None,
        requesting_bpn: str = "",
        target_bpn: Optional[str] = None,
        message: Optional[str] = None,
        list_policies: Optional[List[Dict]] = None,
    ) -> Dict[str, Any]:
        """
        Create and send a new PCF request to a data provider.

        The request is stored locally in the database, then sent to the target
        provider through the EDC dataspace connector. The provider's
        ``footprintExchange/{requestId}`` endpoint is called via an EDC GET
        request after discovering the connector, browsing the catalog for a
        ``PcfExchange`` asset, and negotiating a contract.

        For synchronous data exchange (data pull), see PCF Standard CX-0136, chapter 5.2.

        Args:
            manufacturer_part_id: Manufacturer's part identifier.
            customer_part_id: Customer's part identifier.
            requesting_bpn: Business Partner Number of the requesting party.
            target_bpn: Business Partner Number of the target supplier.
            message: Optional message accompanying the request.

        Returns:
            Dictionary with the created request details.

        Raises:
            ValueError: If neither manufacturerPartId nor customerPartId is provided,
                        or if target_bpn is not specified, or if the EDC exchange fails.
        """
        if not manufacturer_part_id and not customer_part_id:
            raise ValueError("At least one of manufacturerPartId or customerPartId must be provided")

        if not target_bpn:
            raise ValueError("targetBpn is required to send a PCF request")

        request_id = str(uuid4())
        logger.info(f"Creating PCF request {request_id} from BPN {requesting_bpn} to BPN {target_bpn}")

        # Store the PCF request record in the metadata database
        self._store_request_record(
            request_id=request_id,
            requesting_bpn=requesting_bpn,
            responding_bpn=target_bpn,
            manufacturer_part_id=manufacturer_part_id,
            customer_part_id=customer_part_id,
            message=message,
        )

        # Send the PCF request to the target provider via EDC data plane
        self._send_pcf_request_via_edc(
            request_id=request_id,
            target_bpn=target_bpn,
            manufacturer_part_id=manufacturer_part_id,
            customer_part_id=customer_part_id,
            message=message,
            list_policies=list_policies,
        )

        # Create notification for the outgoing PCF request.
        pcf_notification_manager.create_pcf_notification(
            sender_bpn=self._own_bpn,
            receiver_bpn=self._own_bpn,
            notification_type="PCF_REQUEST_SENT",
            request_id=request_id,
            requesting_bpn=requesting_bpn,
            target_bpn=target_bpn,
            message=message or f"PCF data request sent to {target_bpn}",
            is_update=None,
            direction=NotificationDirection.OUTGOING,
        )

        now = datetime.now(timezone.utc).isoformat()
        response_data = {
            "requestId": request_id,
            "manufacturerPartId": manufacturer_part_id,
            "customerPartId": customer_part_id,
            "requestingBpn": requesting_bpn,
            "targetBpn": target_bpn,
            "status": PcfExchangeStatus.PENDING.value,
            "createdAt": now,
            "message": message,
        }

        logger.info(f"PCF request {request_id} sent successfully to BPN {target_bpn}")
        return response_data

    def _store_request_record(
        self,
        request_id: str,
        requesting_bpn: str,
        responding_bpn: str,
        manufacturer_part_id: Optional[str] = None,
        customer_part_id: Optional[str] = None,
        message: Optional[str] = None,
    ) -> None:
        """
        Store the PCF request record in the metadata database with PENDING status.

        Args:
            request_id: Unique identifier for the PCF request.
            requesting_bpn: BPN of the requesting party (consumer).
            responding_bpn: BPN of the target provider.
            manufacturer_part_id: Manufacturer's part identifier.
            customer_part_id: Customer's part identifier.
            message: Optional message for the exchange record.

        Raises:
            ValueError: If storing the exchange record fails.
        """
        try:
            with RepositoryManagerFactory.create() as repo_manager:
                repo_manager.pcf_repository.create_new(
                    request_id=UUID(request_id),
                    direction=PcfExchangeDirection.OUTGOING,
                    type=PcfExchangeType.REQUEST,
                    status=PcfExchangeStatus.PENDING,
                    requesting_bpn=requesting_bpn,
                    responding_bpn=responding_bpn,
                    manufacturer_part_id=manufacturer_part_id,
                    customer_part_id=customer_part_id,
                    message=message,
                )
                logger.info(f"Created PCF exchange record for request {request_id} with status PENDING")
        except Exception as e:
            logger.error(f"Failed to store PCF request {request_id}: {str(e)}")
            raise ValueError(f"Failed to store PCF request: {str(e)}")

    def _send_pcf_request_via_edc(
        self,
        request_id: str,
        target_bpn: str,
        manufacturer_part_id: Optional[str] = None,
        customer_part_id: Optional[str] = None,
        message: Optional[str] = None,
        list_policies: Optional[List[Dict]] = None,
    ) -> None:
        """
        Send a PCF request to the data provider via EDC.

        Delegates to the management manager's generic send_via_edc method.

        Args:
            request_id: The PCF request ID.
            target_bpn: BPN of the target data provider.
            manufacturer_part_id: Manufacturer's part identifier.
            customer_part_id: Customer's part identifier.
            message: Optional message.
            list_policies: Optional list of policies.

        Raises:
            ValueError: If the data transfer fails.
        """
        # Build query parameters per CX-0136 footprintExchange GET spec
        params: Dict[str, str] = {}
        if manufacturer_part_id:
            params["manufacturerPartId"] = manufacturer_part_id
        if customer_part_id:
            params["customerPartId"] = customer_part_id
        if message:
            params["message"] = quote(message, safe="")

        get_path = f"/{request_id}"

        # Use the shared EDC method from management manager
        management_manager.send_via_edc(
            request_id=request_id,
            target_bpn=target_bpn,
            http_method="GET",
            path=get_path,
            params=params if params else None,
            list_policies=list_policies,
            asset_type=PCF_EXCHANGE_ASSET_TYPE,
        )

    def search_own_parts_by_manufacturer_part_id(
        self,
        manufacturer_part_id: str,
    ) -> PcfRelationshipModel:
        """
        Search for sub-parts related to a main manufacturer part ID.

        Args:
            manufacturer_part_id: The main part ID to search for.

        Returns:
            PcfRelationshipModel with the main part ID and list of sub-parts.
        """
        with RepositoryManagerFactory.create() as repo_manager:
            own_part = repo_manager.pcf_relationship_repository.find_by_main_manufacturer_part_id(manufacturer_part_id)
            
            if not own_part:
                result = repo_manager.pcf_relationship_repository.create_new(
                    main_manufacturer_part_id=manufacturer_part_id,
                    list_sub_manufacturer_part_ids=[]
                )
                return PcfRelationshipModel(
                    main_manufacturer_part_id=result.main_manufacturer_part_id,
                    list_sub_manufacturer_part_ids=[]
                )
            
            result = PcfRelationshipModel(
                main_manufacturer_part_id=own_part.main_manufacturer_part_id,
                list_sub_manufacturer_part_ids=[]
            )

            if own_part.list_sub_manufacturer_part_id == []:
                return result

            for sub_part_id in own_part.list_sub_manufacturer_part_id:
                sub_part = repo_manager.pcf_repository.find_by_part_id(sub_part_id)
                if len(sub_part) > 0:
                    result.list_sub_manufacturer_part_ids.append(PcfExchangeModel.from_entity(sub_part[0]))
                else:
                    logger.warning(f"Sub part with ID {sub_part_id} not found in PCF repository")
            
            return result
        
    def add_subpart_and_create_request(
        self,
        main_manufacturer_part_id: str,
        sub_manufacturer_part_id: str,
        responding_bpn: str
    ) -> PcfRelationshipModel:
        """
        Add a sub-part to a main part and create a PCF request for it.

        This method prevents duplicate requests by checking if one already exists
        for the given sub_manufacturer_part_id before creating a new one.

        Args:
            main_manufacturer_part_id: The main part ID to add the sub-part to.
            sub_manufacturer_part_id: The sub-part ID to add.
            responding_bpn: The BPN of the supplier for this sub-part.

        Returns:
            The updated PcfRelationshipModel containing all sub-parts.

        Raises:
            ValueError: If the operation fails.
        """
        try:
            with RepositoryManagerFactory.create() as repo_manager:
                # Check if a request already exists for this sub_manufacturer_part_id
                existing_request = repo_manager.pcf_repository.find_by_part_id(sub_manufacturer_part_id)
                
                if not existing_request or len(existing_request) == 0:
                    # Only create a new request if one doesn't exist
                    repo_manager.pcf_repository.create_new(
                        request_id=UUID(str(uuid4())),
                        direction=PcfExchangeDirection.OUTGOING,
                        type=PcfExchangeType.REQUEST,
                        status=PcfExchangeStatus.PENDING,
                        requesting_bpn=self._own_bpn,
                        responding_bpn=responding_bpn,
                        manufacturer_part_id=sub_manufacturer_part_id,
                        customer_part_id=None,
                        message=None
                    )
                    logger.info(f"Created new PCF request for sub-part {sub_manufacturer_part_id}")
                else:
                    logger.info(f"PCF request already exists for sub-part {sub_manufacturer_part_id}, skipping creation")
                
                # Add the sub-part to the main part's relationship (only if not already present)
                repo_manager.pcf_relationship_repository.add_sub_manufacturer_part_id(
                    main_manufacturer_part_id=main_manufacturer_part_id,
                    sub_manufacturer_part_id=sub_manufacturer_part_id
                )
                
                # Commit changes to database so they're visible to the next session
                repo_manager.commit()
                
            # Now search in a new session - it will see the committed changes
            result = self.search_own_parts_by_manufacturer_part_id(main_manufacturer_part_id)
            return result
        except Exception as e:
            logger.error(f"Failed to add sub part and create request for main part {main_manufacturer_part_id}: {str(e)}")
            raise ValueError(f"Failed to add sub part and create request: {str(e)}")

    def send_pcf_request_to_participant(
        self,
        request_id: str,
        list_policies: List[Dict] = None
    ) -> None:
        """
        Send a new PCF request to a data provider.

        This method is intended to be called after adding a sub-part to an existing main part, which creates a new PCF request in the database. This method will then send that request to the target provider via EDC.

        Args:
            request_id: The ID of the PCF request to send. This request should already exist in the database with PENDING or FAILED status.
        Raises:
            ValueError: If the request does not exist, is not in PENDING status, or if the EDC exchange fails.
        """
        # Extract all request data first to avoid detached session issues
        request_data = None
        try:
            with RepositoryManagerFactory.create() as repo_manager:
                request = repo_manager.pcf_repository.find_by_request_id(UUID(request_id))
                if not request:
                    raise ValueError(f"PCF request with ID {request_id} not found")
                if request.status != PcfExchangeStatus.PENDING and request.status != PcfExchangeStatus.FAILED:
                    raise ValueError(f"PCF request with ID {request_id} is not in PENDING or FAILED status and cannot be sent")

                # Extract all data from request object while session is active
                request_data = {
                    'target_bpn': request.responding_bpn,
                    'manufacturer_part_id': request.manufacturer_part_id,
                    'customer_part_id': request.customer_part_id,
                    'message': request.message
                }
            
            # Call _send_pcf_request_via_edc outside the session context
            self._send_pcf_request_via_edc(
                request_id=request_id,
                target_bpn=request_data['target_bpn'],
                manufacturer_part_id=request_data['manufacturer_part_id'],
                customer_part_id=request_data['customer_part_id'],
                message=request_data['message'],
                list_policies=list_policies
            )
            
            # Update status after EDC operation completes
            management_manager.update_pcf_exchange_status(
                request_id=request_id,
                type=PcfExchangeType.REQUEST,
                new_status=PcfExchangeStatus.DELIVERED,
            )
                
        except Exception as e:
            management_manager.update_pcf_exchange_status(
                request_id=request_id,
                type=PcfExchangeType.REQUEST,
                new_status=PcfExchangeStatus.FAILED,
            )
            logger.error(f"Failed to send PCF request {request_id} to participant: {str(e)}")
            raise ValueError(f"Failed to send PCF request to participant: {str(e)}")

    def consult_pcf_response(self, request_id: str) -> PcfExchangeModel:
        """
        Consult the response for a given PCF request.

        Args:
            request_id: The ID of the PCF request to consult.
        Returns:
            The PCF exchange model representing the response.
        Raises:            
            ValueError: If the request does not exist or if there is an error retrieving the response.
        """
        try:
            with RepositoryManagerFactory.create() as repo_manager:
                exchange = repo_manager.pcf_repository.find_by_request_id(UUID(request_id))
                if not exchange:
                    raise ValueError(f"PCF request with ID {request_id} not found")
                pcf_data = management_manager.get_pcf_data(request_id=request_id)
                result = PcfExchangeModel.from_entity(exchange)
                result.pcf_data = pcf_data
                return result
        except Exception as e:
            logger.error(f"Failed to consult PCF response for request {request_id}: {str(e)}")
            raise ValueError(f"Failed to consult PCF response: {str(e)}")

    def consult_global_assembly_progress(self, manufacturer_part_id: str) -> PcfSpecificStateModel:
        """
        Consult the global assembly progress for a given manufacturer part ID.

        This method is intended to provide an overview of the assembly progress of a part across the supply chain, based on the PCF exchanges related to that part. The actual implementation of this method would depend on the specific requirements for how assembly progress is calculated and represented.

        Args:
            manufacturer_part_id: The manufacturer part ID to consult.
        Returns:
            A PcfSpecificStateModel representing the global assembly progress for the given part ID.
        Raises:
            ValueError: If there is an error retrieving the assembly progress.
        """
        try:
            part_info = self.search_own_parts_by_manufacturer_part_id(manufacturer_part_id)
            sub_parts = part_info.list_sub_manufacturer_part_ids
            total_sub_parts = len(sub_parts)
            responded_sub_parts = 0
            for sub_part in sub_parts:
                if sub_part.status == PcfExchangeStatus.DELIVERED.value and sub_part.type == PcfExchangeType.RESPONSE.value:
                    responded_sub_parts += 1
            progress = (responded_sub_parts / total_sub_parts) * 100 if total_sub_parts > 0 else 100
            return PcfSpecificStateModel(
                manufacturer_part_id=manufacturer_part_id,
                total_sub_parts=total_sub_parts,
                responded_sub_parts=responded_sub_parts,
                progress_percentage=progress,
                overall_status="PENDING" if responded_sub_parts < total_sub_parts else "COMPLETED"
            )
                
        except Exception as e:
            logger.error(f"Failed to consult global assembly progress for part {manufacturer_part_id}: {str(e)}")
            raise ValueError(f"Failed to consult global assembly progress: {str(e)}")
        
    def download_pcf_data(self, manufacturer_part_id: str) -> List[PcfExchangeModel]:
        """
        Download the PCF data payload for a given manufacturer part ID.

        Args:
            manufacturer_part_id: The ID of the manufacturer part to download data for.
        Returns:
            A list of PcfExchangeModel containing the PCF data payload.
        Raises:
            ValueError: If the request does not exist or if there is an error retrieving the data
        """
        try:
            status = self.consult_global_assembly_progress(manufacturer_part_id)
            if status.overall_status != "COMPLETED":
                raise ValueError(f"PCF data for part {manufacturer_part_id} is not yet available for download. Current assembly progress: {status.progress_percentage}%")
            part_info = self.search_own_parts_by_manufacturer_part_id(manufacturer_part_id)
            pcf_exchange_collection: List[PcfExchangeModel] = []
            for sub_part in part_info.list_sub_manufacturer_part_ids:
                exchange = self.consult_pcf_response(sub_part.request_id)
                pcf_exchange_collection.append(exchange)
            return pcf_exchange_collection
        except Exception as e:
            logger.error(f"Failed to download PCF data for part {manufacturer_part_id}: {str(e)}")
            raise ValueError(f"Failed to download PCF data: {str(e)}")

# Module-level singleton for convenience
consumption_manager = PcfConsumptionManager()
