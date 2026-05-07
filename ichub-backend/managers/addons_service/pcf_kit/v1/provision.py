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
PCF Provision Manager - Data Provider operations for PCF data exchange.

Reference:
    - CX-0136 PCF Exchange Standard
    - CX-0002 Digital Twins in Catena-X
"""

from typing import Dict, Any, List, Optional
from uuid import UUID, NAMESPACE_URL, uuid5
from datetime import datetime, timezone

from managers.addons_service.pcf_kit.v1.notifications import pcf_notification_manager
from managers.config.log_manager import LoggingManager
from managers.config.config_manager import ConfigManager
from managers.enablement_services.submodel_service_manager import SubmodelServiceManager
from managers.addons_service.pcf_kit.v1.management import PcfManagementManager, management_manager
from managers.metadata_database.manager import RepositoryManagerFactory
from models.metadata_database.pcf import PcfExchangeDirection, PcfExchangeStatus, PcfExchangeType
from models.services.addons.pcf_kit.v1.models import PcfExchangeModel
from models.metadata_database.notification.models import NotificationDirection
from tools.constants import PCF

logger = LoggingManager.get_logger(__name__)

# PCF semantic ID constant (Catena-X PCF aspect model v9.0.0 - async exchange use case)
PCF_SEMANTIC_ID = "urn:samm:io.catenax.pcf:9.0.0#PcfExchangeAsync"

# Asset type used to identify PCF exchange assets in EDC catalogs (CX-0136)
PCF_EXCHANGE_ASSET_TYPE = "https://w3id.org/catenax/taxonomy#PcfExchange"


def _pcf_submodel_id(manufacturer_part_id: str) -> UUID:
    """Derive a deterministic UUID for a manufacturer part ID.

    Uses UUID5 with NAMESPACE_URL so the same part always maps to the
    same submodel document in the submodel service.
    """
    return uuid5(NAMESPACE_URL, manufacturer_part_id)


class PcfProvisionManager:
    """
    Manages PCF provision operations for data providers.

    This manager handles:
    - Validating PCF data against the Catena-X schema
    - Storing PCF payloads in the submodel service
    - Tracking exchange status in the metadata database
    - Creating notifications for PCF response events
    - Sending PCF data to the requesting party via EDC (discovery, negotiation, transfer)

    PCF Response Flow (CX-0136):
        1. Data consumer sends a PCF request (handled by exchange manager)
        2. Data provider reviews the incoming request (via management endpoints)
        3. Data provider responds with PCF data via this provision manager
        4. The response is validated, stored locally, and sent via EDC
        5. The exchange status is updated in the database

    EDC Data Exchange Flow:
        1. Discover connector endpoints for the requesting BPN
        2. For each connector, the SDK's ``do_put_by_dct_type()`` handles
           catalog filtering, contract negotiation, and PUT in a single call
        3. The PCF data is sent via EDC data plane PUT to ``/{requestId}``

    PCF Update Flow:
        Updates are ONLY feasible for PCF responses that have been previously
        delivered at least once. Proactive updates without a prior request are
        NOT achievable with the current Catena-X PCF specification version.
    """

    def __init__(
        self,
        submodel_service: Optional[SubmodelServiceManager] = None,
    ) -> None:
        """Initialize the provision manager with the submodel service."""
        self._submodel_service = submodel_service or SubmodelServiceManager()
        self._own_bpn = ConfigManager.get_config("bpn", default=None)
        if self._own_bpn == None:
            logger.warning("BPN not configured in configuration.yml.")
            raise ValueError("BPN must be configured in configuration.yml to send PCF requests and create notifications.")

    def send_or_update_pcf_response(
        self,
        request_id: str,
        responding_bpn: str,
        status: str = "delivered",
        message: Optional[str] = None,
        list_policies: Optional[List[Dict]] = None,
    ) -> Dict[str, Any]:
        """
        Send or update a PCF response for a given request.

        If the exchange record already has delivered/updated status, this is treated
        as an update. Otherwise, it is a first-time delivery.

        The PCF payload is always retrieved from the product-scoped store keyed
        by ``manufacturerPartId``.  This means the PCF document must have been
        uploaded beforehand (e.g. via the PCF store endpoint).

        For synchronous data exchange (data pull), see PCF Standard CX-0136, chapter 5.2.

        Args:
            request_id: The ID of the PCF request being responded to.
            responding_bpn: Business Partner Number of the responding party.
            status: Status of the response (default: delivered).
            message: Optional message accompanying the response.

        Returns:
            Dictionary with the response details and whether it was created or updated.

        Raises:
            ValueError: If the request is not found, no manufacturerPartId is
                        associated, or no PCF data exists for the product.
        """
        logger.info(f"Processing PCF provision response for request {request_id}")

        # Retrieve the exchange record to get the requesting BPN and manufacturer part ID
        exchange_entity = self._get_exchange_entity(request_id)
        is_update = exchange_entity is not None and exchange_entity.status in (
            PcfExchangeStatus.DELIVERED,
            PcfExchangeStatus.UPDATED,
        )

        manufacturer_part_id = (
            exchange_entity.manufacturer_part_id if exchange_entity else None
        )
        if not manufacturer_part_id:
            raise ValueError(
                f"No manufacturerPartId associated with request {request_id}. "
                "Cannot retrieve PCF data without a part identifier."
            )

        # Retrieve the PCF payload from the product-scoped store
        pcf_data = self._retrieve_pcf_data(manufacturer_part_id)
        if not pcf_data:
            raise ValueError(
                f"No PCF data found for manufacturerPartId [{manufacturer_part_id}]. "
                "Ensure a PCF has been stored before responding to a request."
            )
        logger.info(
            f"Retrieved PCF data for manufacturerPartId [{manufacturer_part_id}]"
        )

        # Send the PCF data to the requesting party via EDC data plane
        if exchange_entity and exchange_entity.requesting_bpn:
            self._send_pcf_via_edc(
                request_id=request_id,
                requesting_bpn=exchange_entity.requesting_bpn,
                pcf_data=pcf_data,
                is_update=is_update,
                manufacturer_part_id=manufacturer_part_id,
                list_policies=list_policies,
            )
        else:
            logger.warning(
                f"No requesting BPN found for request {request_id}. "
                "Skipping EDC data exchange — PCF data stored locally only."
            )

        self._notify_pcf_response(
            request_id=request_id,
            responding_bpn=responding_bpn,
            is_update=is_update,
            message=message,
        )

        now = datetime.now(timezone.utc).isoformat()
        response_data = {
            "requestId": request_id,
            "respondingBpn": responding_bpn,
            "status": PcfExchangeStatus.UPDATED.value if is_update else PcfExchangeStatus.DELIVERED.value,
            "message": message,
            "isUpdate": is_update,
            "manufacturerPartId": manufacturer_part_id,
            "updatedAt": now,
        }

        logger.info(
            f"PCF response for request {request_id} "
            f"{'updated' if is_update else 'delivered'} successfully"
        )

        return response_data

    def _get_exchange_entity(self, request_id: str):
        """
        Retrieve the PCF exchange entity from the database.

        Args:
            request_id: The request ID to look up.

        Returns:
            The PcfExchangeEntity if found, otherwise None.
        """
        try:
            with RepositoryManagerFactory.create() as repo_manager:
                return repo_manager.pcf_repository.find_by_request_id(UUID(request_id))
        except Exception as e:
            logger.debug(f"Could not retrieve exchange record for request {request_id}: {str(e)}")
        return None

    def _retrieve_pcf_data(self, manufacturer_part_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve a previously stored PCF document for a given manufacturer part.

        Args:
            manufacturer_part_id: The manufacturer part ID.

        Returns:
            The PCF payload if found, otherwise None.
        """
        submodel_id = _pcf_submodel_id(manufacturer_part_id)
        try:
            return self._submodel_service.get_twin_aspect_document(
                submodel_id=submodel_id,
                semantic_id=PCF_SEMANTIC_ID,
            )
        except Exception as e:
            logger.debug(
                f"No existing PCF found for manufacturerPartId "
                f"[{manufacturer_part_id}]: {e}"
            )
            return None

    def _send_pcf_via_edc(
        self,
        request_id: str,
        requesting_bpn: str,
        pcf_data: Dict[str, Any],
        is_update: bool = False,
        manufacturer_part_id: Optional[str] = None,
        list_policies: Optional[List[Dict]] = None,
    ) -> None:
        """
        Send PCF data to the requesting party through the EDC dataspace connector.

        Delegates to the management manager's generic send_via_edc method which 
        handles connector discovery, EDR cleanup, contract negotiation, and PUT request.

        Args:
            request_id: The PCF request ID (used as the PUT path).
            requesting_bpn: BPN of the party that requested the PCF data.
            pcf_data: The validated PCF payload to send.
            is_update: Whether this is an update to a previously delivered response.
            manufacturer_part_id: The manufacturer part ID (used for pcf_location).
            list_policies: Optional list of policies for contract negotiation.

        Raises:
            ValueError: If no connectors are found or the data transfer fails.
        """
        put_path = f"/{request_id}"
        if is_update:
            put_path += "?update=true"

        # Use the shared EDC method from management manager
        management_manager.send_via_edc(
            request_id=request_id,
            target_bpn=requesting_bpn,
            http_method="PUT",
            path=put_path,
            json_data=pcf_data,
            list_policies=list_policies,
            asset_type=PCF_EXCHANGE_ASSET_TYPE,
        )

        # Update exchange record after successful EDC transfer
        self._update_exchange_record(
            request_id, is_update, manufacturer_part_id=manufacturer_part_id
        )

    def _update_exchange_record(
        self,
        request_id: str,
        is_update: bool,
        message: Optional[str] = None,
        manufacturer_part_id: Optional[str] = None,
    ) -> None:
        """
        Update the PCF exchange record in the metadata database.

        For first-time deliveries, the PCF location and DELIVERED status are set.
        The ``pcf_location`` points to the submodel document keyed by
        ``manufacturer_part_id`` so that all exchanges for the same product
        share the same PCF payload reference.
        For updates, only the status is changed to UPDATED.

        Args:
            request_id: The request ID of the exchange.
            is_update: Whether this is an update to a previously delivered response.
            message: Optional message for the exchange record.
            manufacturer_part_id: The manufacturer part ID (used in pcf_location).

        Raises:
            ValueError: If the exchange record is not found or the update fails.
        """
        try:
            pcf_location = management_manager.get_pcf_location(manufacturer_part_id)
            logger.info(f"Stored PCF data location for request {request_id}: {pcf_location}")
            
            if is_update:
                management_manager.update_pcf_exchange_status(
                    request_id=request_id,
                    new_status=PcfExchangeStatus.UPDATED,
                    type=PcfExchangeType.RESPONSE,
                    message=message or "PCF exchange updated with new data"
                )
            else:
                management_manager.update_pcf_exchange_status(
                    request_id=request_id,
                    new_status=PcfExchangeStatus.DELIVERED,
                    type=PcfExchangeType.RESPONSE,
                    message=message or "PCF exchange delivered with data location"
                )

        except Exception as e:
            logger.error(f"Failed to update exchange record for request {request_id}: {str(e)}")
            raise ValueError(f"Failed to update exchange record: {str(e)}")

    def _notify_pcf_response(
        self,
        request_id: str,
        responding_bpn: str,
        is_update: bool,
        message: Optional[str] = None,
    ) -> None:
        """Create an outgoing notification for a PCF response or update."""
        if not self._own_bpn:
            logger.warning(
                f"Cannot create notification for PCF response {request_id}: "
                "bpn not configured in configuration.yml"
            )
            return

        notification_type = "PCF_UPDATE_SENT" if is_update else "PCF_RESPONSE_SENT"
        default_message = (
            f"PCF data update sent by {responding_bpn}"
            if is_update
            else f"PCF data response sent by {responding_bpn}"
        )

        pcf_notification_manager.create_pcf_notification(
            sender_bpn=self._own_bpn,
            receiver_bpn=self._own_bpn,
            notification_type=notification_type,
            request_id=request_id,
            responding_bpn=responding_bpn,
            message=message or default_message,
            is_update=is_update,
            direction=NotificationDirection.OUTGOING,
        )

    def upload_new_pcf(
            self,
            manufacturer_part_id: str,
            pcf_data: Dict[str, Any]
    ) -> None:
        """
        Upload a new PCF document to the submodel service for a given manufacturer part ID.

        This is a helper method to store PCF data before responding to requests.
        It can be used by external processes that generate PCF data and want to
        make it available for exchange.

        Args:
            manufacturer_part_id: The manufacturer part ID to associate with the PCF data.
            pcf_data: The PCF payload to store.
        Raises:
            ValueError: If there is an error during upload to the submodel service.
        """
        try:
            if pcf_data is None:
                raise ValueError("PCF data payload is required for upload.")

            management_manager.upload_pcf_data(
                manufacturer_part_id=manufacturer_part_id,
                pcf_data=pcf_data
            )
        except Exception as e:
            logger.error(f"Failed to upload PCF data for manufacturerPartId [{manufacturer_part_id}]: {str(e)}")
            raise ValueError(f"Failed to upload PCF data: {str(e)}")


    def view_existing_pcf(
            self,
            manufacturer_part_id: str
    ) -> Dict[str, Any]:
        """
        View an existing PCF document from the submodel service for a given manufacturer part ID.

        Args:
            manufacturer_part_id: The manufacturer part ID to retrieve the PCF data for.
        Raises:
            ValueError: If there is an error during retrieval from the submodel service.
        """
        try:
            result = management_manager.get_pcf_data_by_manufacturer_part_id(
                manufacturer_part_id=manufacturer_part_id
            )
            if result is None:
                raise ValueError(f"No PCF data found for manufacturerPartId [{manufacturer_part_id}].")
            return result
        except Exception as e:
            logger.error(f"Failed to retrieve PCF data for manufacturerPartId [{manufacturer_part_id}]: {str(e)}")
            raise ValueError(f"Failed to retrieve PCF data: {str(e)}")
        
    def update_pcf_and_get_participants(            
            self,
            manufacturer_part_id: str,
            pcf_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        try:
            if pcf_data is None:
                raise ValueError("PCF data payload is required for update.")
            
            result = management_manager.update_pcf_data(
                manufacturer_part_id=manufacturer_part_id,
                pcf_data=pcf_data
            )
            return result
        except Exception as e:
            logger.error(f"Failed to update PCF data for manufacturerPartId [{manufacturer_part_id}]: {str(e)}")
            raise ValueError(f"Failed to update PCF data: {str(e)}")

    def confirm_and_send_update_to_participants(
            self,
            manufacturer_part_id: str,
            list_bpns: List[str],
            list_policies: Optional[List[Dict]] = None
    ) -> Dict[str, Any]:
        """
        Confirm the update of a PCF document and proactively send the updated data to participants.

        This method is intended to be called after a PCF document has been updated. It will send the updated PCF data to all participants that have previously received the PCF for the same manufacturer part ID.

        Args:
            manufacturer_part_id: The manufacturer part ID whose PCF data was updated.
            list_bpns: List of BPNs to send the updated PCF data to.
            list_policies: Optional list of policies to apply when sending the update.
        Raises:            
            ValueError: If there is an error during the update or sending process.
        """
        try:
            pcf_data = self.view_existing_pcf(manufacturer_part_id=manufacturer_part_id)
            with RepositoryManagerFactory.create() as repo_manager:
                for bpn in list_bpns:
                    result = repo_manager.pcf_repository.find_by_bpn(bpn, manufacturer_part_id, direction=PcfExchangeDirection.OUTGOING, status=PcfExchangeStatus.DELIVERED)
                    if result:
                        request_id = str(result[0].request_id)
                        self._send_pcf_via_edc(
                            request_id=request_id,
                            requesting_bpn=bpn,
                            pcf_data=pcf_data,
                            is_update=True,
                            manufacturer_part_id=manufacturer_part_id,
                            list_policies=list_policies,
                        )
            return {"message": f"PCF update sent to {len(list_bpns)} participant(s) successfully."}
        except Exception as e:
            logger.error(f"Failed to confirm and send PCF update for manufacturerPartId [{manufacturer_part_id}]: {str(e)}")
            raise ValueError(f"Failed to confirm and send PCF update: {str(e)}")

    def list_provider_notifications(self, status: Optional[str] = None, offset: int = 0, limit: int = 100) -> List[Dict[str, Any]]:
        """
        List all notifications related to a specific manufacturer part ID.

        This method retrieves all notifications from the database that are associated with the given manufacturer part ID, regardless of direction (incoming or outgoing). This allows the data provider to see all interactions related to that part.

        Args:
            manufacturer_part_id: The manufacturer part ID to filter notifications by.
        Returns:
            A list of notifications related to the specified manufacturer part ID.
        Raises:
            ValueError: If there is an error during retrieval from the database.
        """
        try:
            with RepositoryManagerFactory.create() as repo_manager:
                notifications = repo_manager.pcf_repository.find_by_bpn(
                        bpn=self._own_bpn,
                        type=PcfExchangeType.RESPONSE,
                        direction=PcfExchangeDirection.OUTGOING,
                        status=status,
                        offset=offset,
                        limit=limit)
                return [PcfExchangeModel.from_entity(n) for n in notifications]
        except Exception as e:
            logger.error(f"Failed to list provider notifications: {str(e)}")
            raise ValueError(f"Failed to list provider notifications: {str(e)}")
    
    def accept_request_and_send_response(self, request_id: str, list_policies: Optional[List[Dict]] = None) -> Dict[str, Any]:
        """
        Accept a PCF request and send the corresponding PCF response.

        This method is intended to be called when a data provider accepts a PCF request. It will retrieve the associated manufacturer part ID from the exchange record, fetch the corresponding PCF data from the submodel service, and send it to the requesting party via EDC.

        Args:
            request_id: The ID of the PCF request being accepted.
        Returns:
            A dictionary containing the details of the sent response.
        Raises:
            ValueError: If there is an error during the acceptance or sending process.
        """        
        try:
            with RepositoryManagerFactory.create() as repo_manager:
                exchange_entity = repo_manager.pcf_repository.find_by_request_id(UUID(request_id), type=PcfExchangeType.RESPONSE)
                if not exchange_entity:
                    raise ValueError(f"No exchange record found for request {request_id}. Cannot accept request without a valid exchange record.")
                if exchange_entity.pcf_location is None:
                    raise ValueError(f"Request {request_id} has no PCF assigned")
                if exchange_entity.status == PcfExchangeStatus.DELIVERED:
                    raise ValueError(f"Request {request_id} is DELIVERED already. Use the update endpoint to send an update response instead of accepting the request again.")
                pcf_data = management_manager.get_pcf_data_by_manufacturer_part_id(exchange_entity.manufacturer_part_id)
                self._send_pcf_via_edc(
                    request_id=request_id,
                    requesting_bpn=exchange_entity.requesting_bpn,
                    pcf_data=pcf_data,
                    is_update=False,
                    manufacturer_part_id=exchange_entity.manufacturer_part_id,
                    list_policies=list_policies
                )
                management_manager.update_pcf_exchange_status(
                    request_id=request_id,
                    type=PcfExchangeType.RESPONSE,
                    new_status=PcfExchangeStatus.DELIVERED,
                )
                
        except Exception as e:
            if exchange_entity.status != PcfExchangeStatus.DELIVERED:
                management_manager.update_pcf_exchange_status(
                    request_id=request_id,
                    type=PcfExchangeType.RESPONSE,
                    new_status=PcfExchangeStatus.FAILED,
                )
                logger.error(f"Failed to accept request and send response for request {request_id}: {str(e)}")
                raise ValueError(f"Failed to accept request and send response: {str(e)}")
            else:
                logger.error(f"Request {request_id} is already DELIVERED. No action taken. Error details: {str(e)}")
                raise ValueError(f"Request {request_id} is already DELIVERED. No action taken.")

    def refresh_pcf_data_for_request(self, request_id: str) -> PcfExchangeModel:
        """
        Refresh the PCF data for a given request by re-sending the latest PCF document.

        This method can be used to proactively refresh the PCF data for a request, for example if the underlying PCF document has been updated and the provider wants to ensure the requester has the latest version.

        Args:
            request_id: The ID of the PCF request to refresh.
        Returns:
            A PcfExchangeModel containing the details of the refreshed response.
        Raises:
            ValueError: If there is an error during the refresh process.
        """
        try:
            with RepositoryManagerFactory.create() as repo_manager:
                exchange_entity = repo_manager.pcf_repository.find_by_request_id(UUID(request_id))
                if not exchange_entity:
                    raise ValueError(f"No exchange record found for request {request_id}. Cannot refresh PCF data.")

                manufacturer_part_id = exchange_entity.manufacturer_part_id
                if not manufacturer_part_id:
                    raise ValueError(f"No manufacturerPartId associated with request {request_id}. Cannot retrieve PCF data for refresh.")
                
                pcf_location = management_manager.get_pcf_location(manufacturer_part_id)
                if not pcf_location:
                    raise ValueError(f"No PCF location found for request {request_id}. Cannot refresh PCF data.")
                final_exchange = repo_manager.pcf_repository.update_pcf_location(
                    request_id=UUID(request_id),
                    type=PcfExchangeType.RESPONSE,
                    pcf_location=pcf_location
                )
                return PcfExchangeModel.from_entity(final_exchange)
        except Exception as e:
            logger.error(f"Failed to refresh PCF data for request {request_id}: {str(e)}")
            raise ValueError(f"Failed to refresh PCF data: {str(e)}")

# Module-level singleton for convenience
provision_manager = PcfProvisionManager()
