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
from uuid import UUID

from managers.config.log_manager import LoggingManager
from managers.config.config_manager import ConfigManager
from managers.enablement_services.submodel_service_manager import SubmodelServiceManager
from managers.addons_service.pcf_kit.v1.management import management_manager
from managers.metadata_database.manager import RepositoryManagerFactory
from models.metadata_database.pcf import PcfExchangeDirection, PcfExchangeStatus, PcfExchangeType
from models.services.addons.pcf_kit.v1.models import PcfExchangeModel
from utils.log_utils import sanitize_log_value as _s
from utils.pcf_utils import DEFAULT_PCF_VERSION, PCF_EXCHANGE_ASSET_TYPE

logger = LoggingManager.get_logger(__name__)


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
        if self._own_bpn is None:
            logger.warning("BPN not configured in configuration.yml. PCF operations requiring BPN will fail at call time.")

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
        Send PCF data to the requesting party via EDC with version negotiation.

        Tries the v1.2.0 asset (``/footprintExchange``) first. If no v1.2.0
        asset is available in the consumer's catalog, falls back to the
        v1.1.1 legacy asset (``/productIds``). CX-0136 §6 requires the
        highest compatible ``cx-common:version`` to be used.

        Args:
            request_id: The PCF request ID (used as the PUT path).
            requesting_bpn: BPN of the party that requested the PCF data.
            pcf_data: The validated PCF payload to send.
            is_update: Whether this is an update to a previously delivered response.
            manufacturer_part_id: The manufacturer part ID (used for pcf_location and v1.1.1 path).
            list_policies: Optional list of policies for contract negotiation.

        Raises:
            ValueError: If no connectors are found or the data transfer fails.
        """
        # --- Try v1.2.0 first ---
        try:
            put_path = f"/{request_id}"
            if is_update:
                put_path += "?update=true"

            management_manager.send_via_edc(
                request_id=request_id,
                target_bpn=requesting_bpn,
                http_method="PUT",
                path=put_path,
                json_data=pcf_data,
                list_policies=list_policies,
                asset_type=PCF_EXCHANGE_ASSET_TYPE,
                asset_version="1.2.0",
            )
            logger.info(f"[PCF Provision] Response {_s(request_id)} sent via v1.2.0 asset")

            self._update_exchange_record(
                request_id, is_update, manufacturer_part_id=manufacturer_part_id
            )
            return
        except Exception as e:
            logger.info(
                f"[PCF Provision] v1.2.0 asset not available for BPN {_s(requesting_bpn)}, "
                f"falling back to v1.1.1: {_s(e)}"
            )

        # --- Fall back to v1.1.1 (legacy /productIds) ---
        if not manufacturer_part_id:
            raise ValueError(
                "Cannot fall back to v1.1.1 /productIds API: "
                "manufacturerPartId is required but not provided."
            )

        put_path_legacy = f"/{manufacturer_part_id}?requestId={request_id}"
        if is_update:
            put_path_legacy += "&update=true"

        management_manager.send_via_edc(
            request_id=request_id,
            target_bpn=requesting_bpn,
            http_method="PUT",
            path=put_path_legacy,
            json_data=pcf_data,
            list_policies=list_policies,
            asset_type=PCF_EXCHANGE_ASSET_TYPE,
            asset_version="1.1.1",
        )
        logger.info(f"[PCF Provision] Response {_s(request_id)} sent via v1.1.1 (legacy) asset")

        self._update_exchange_record(
            request_id, is_update, manufacturer_part_id=manufacturer_part_id
        )

    def _update_exchange_record(
        self,
        request_id: str,
        is_update: bool,
        message: Optional[str] = None,
        manufacturer_part_id: Optional[str] = None,
        version: str = DEFAULT_PCF_VERSION,
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
            version: PCF schema version (default: ``"v9.0.0"``).

        Raises:
            ValueError: If the exchange record is not found or the update fails.
        """
        try:
            pcf_location = management_manager.get_pcf_location(manufacturer_part_id, version=version)
            logger.info(f"Stored PCF data location for request {_s(request_id)}: {_s(pcf_location)}")
            
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
            logger.error(f"Failed to update exchange record for request {_s(request_id)}: {_s(e)}")
            raise ValueError(f"Failed to update exchange record: {str(e)}")

    def upload_new_pcf(
            self,
            manufacturer_part_id: str,
            pcf_data: Dict[str, Any],
            version: str = DEFAULT_PCF_VERSION,
    ) -> None:
        """
        Upload a new PCF document to the submodel service for a given manufacturer part ID.

        This is a helper method to store PCF data before responding to requests.
        It can be used by external processes that generate PCF data and want to
        make it available for exchange.

        Args:
            manufacturer_part_id: The manufacturer part ID to associate with the PCF data.
            pcf_data: The PCF payload to store.
            version: PCF schema version (default: ``"v9.0.0"``).

        Raises:
            ValueError: If there is an error during upload to the submodel service.
        """
        try:
            if pcf_data is None:
                raise ValueError("PCF data payload is required for upload.")

            management_manager.upload_pcf_data(
                manufacturer_part_id=manufacturer_part_id,
                pcf_data=pcf_data,
                version=version,
            )
        except Exception as e:
            logger.error(f"Failed to upload PCF data for manufacturerPartId [{_s(manufacturer_part_id)}]: {_s(e)}")
            raise ValueError(f"Failed to upload PCF data: {str(e)}")


    def view_existing_pcf(
            self,
            manufacturer_part_id: str,
            version: str = DEFAULT_PCF_VERSION,
    ) -> Dict[str, Any]:
        """
        View an existing PCF document from the submodel service for a given manufacturer part ID.

        Args:
            manufacturer_part_id: The manufacturer part ID to retrieve the PCF data for.
            version: PCF schema version (default: ``"v9.0.0"``).

        Raises:
            ValueError: If there is an error during retrieval from the submodel service.
        """
        try:
            result = management_manager.get_pcf_data_by_manufacturer_part_id(
                manufacturer_part_id=manufacturer_part_id,
                version=version,
            )
            if result is None:
                raise ValueError(
                    f"No PCF data found for manufacturerPartId [{manufacturer_part_id}] "
                    f"version [{version}]."
                )
            return result
        except Exception as e:
            logger.error(f"Failed to retrieve PCF data for manufacturerPartId [{_s(manufacturer_part_id)}]: {_s(e)}")
            raise ValueError(f"Failed to retrieve PCF data: {str(e)}")
        
    def update_pcf_and_get_participants(            
            self,
            manufacturer_part_id: str,
            pcf_data: Dict[str, Any],
            version: str = DEFAULT_PCF_VERSION,
    ) -> Dict[str, Any]:
        try:
            if pcf_data is None:
                raise ValueError("PCF data payload is required for update.")

            # Gate: require both PCF versions before allowing publish/exchange
            management_manager.check_both_versions_exist(manufacturer_part_id, flow="synchronous")

            result = management_manager.update_pcf_data(
                manufacturer_part_id=manufacturer_part_id,
                pcf_data=pcf_data,
                version=version,
            )
            return result
        except Exception as e:
            logger.error(f"Failed to update PCF data for manufacturerPartId [{_s(manufacturer_part_id)}]: {_s(e)}")
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
            # Gate: require both PCF versions before allowing publish/exchange
            management_manager.check_both_versions_exist(manufacturer_part_id, flow="synchronous")
            # Collect required data from DB first, then close session before EDC calls
            send_targets: List[Dict[str, str]] = []
            with RepositoryManagerFactory.create() as repo_manager:
                for bpn in list_bpns:
                    result = repo_manager.pcf_repository.find_by_bpn(bpn, manufacturer_part_id=manufacturer_part_id, direction=PcfExchangeDirection.OUTGOING, status=PcfExchangeStatus.DELIVERED)
                    if result:
                        send_targets.append({"request_id": str(result[0].request_id), "bpn": bpn})
            # Send EDC calls outside DB session to avoid holding connections
            for target in send_targets:
                self._send_pcf_via_edc(
                    request_id=target["request_id"],
                    requesting_bpn=target["bpn"],
                    pcf_data=pcf_data,
                    is_update=True,
                    manufacturer_part_id=manufacturer_part_id,
                    list_policies=list_policies,
                )
            return {"message": f"PCF update sent to {len(list_bpns)} participant(s) successfully."}
        except Exception as e:
            logger.error(f"Failed to confirm and send PCF update for manufacturerPartId [{_s(manufacturer_part_id)}]: {_s(e)}")
            raise ValueError(f"Failed to confirm and send PCF update: {str(e)}")

    def list_provider_notifications(
        self,
        status: Optional[str] = None,
        version: Optional[str] = None,
        offset: int = 0,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
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
                        version=version,
                        offset=offset,
                        limit=limit)
                return [PcfExchangeModel.from_entity(n) for n in notifications]
        except Exception as e:
            logger.error(f"Failed to list provider notifications: {_s(e)}")
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
        exchange_entity = None
        try:
            with RepositoryManagerFactory.create() as repo_manager:
                exchange_entity = repo_manager.pcf_repository.find_by_request_id(UUID(request_id), type=PcfExchangeType.RESPONSE)
                if not exchange_entity:
                    raise ValueError(f"No exchange record found for request {request_id}. Cannot accept request without a valid exchange record.")
                if exchange_entity.pcf_location is None:
                    raise ValueError(f"Request {request_id} has no PCF assigned")
                if exchange_entity.status == PcfExchangeStatus.DELIVERED:
                    raise ValueError(f"Request {request_id} is DELIVERED already. Use the update endpoint to send an update response instead of accepting the request again.")
                # Extract data from entity while session is active
                entity_requesting_bpn = exchange_entity.requesting_bpn
                entity_manufacturer_part_id = exchange_entity.manufacturer_part_id
                entity_status = exchange_entity.status

            # Gate: require both PCF versions before allowing publish/exchange
            management_manager.check_both_versions_exist(entity_manufacturer_part_id, flow="asynchronous")

            # Perform EDC calls outside DB session
            pcf_data = management_manager.get_pcf_data_by_manufacturer_part_id(entity_manufacturer_part_id)
            self._send_pcf_via_edc(
                request_id=request_id,
                requesting_bpn=entity_requesting_bpn,
                pcf_data=pcf_data,
                is_update=False,
                manufacturer_part_id=entity_manufacturer_part_id,
                list_policies=list_policies
            )
            management_manager.update_pcf_exchange_status(
                request_id=request_id,
                type=PcfExchangeType.RESPONSE,
                new_status=PcfExchangeStatus.DELIVERED,
            )
                
        except Exception as e:
            if exchange_entity and entity_status != PcfExchangeStatus.DELIVERED:
                management_manager.update_pcf_exchange_status(
                    request_id=request_id,
                    type=PcfExchangeType.RESPONSE,
                    new_status=PcfExchangeStatus.FAILED,
                )
                logger.error(f"Failed to accept request and send response for request {_s(request_id)}: {_s(e)}")
                raise ValueError(f"Failed to accept request and send response: {str(e)}")
            else:
                logger.error(f"Request {_s(request_id)} is already DELIVERED. No action taken. Error details: {_s(e)}")
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
                
                entity_version = exchange_entity.version or DEFAULT_PCF_VERSION
                pcf_location = management_manager.get_pcf_location(manufacturer_part_id, version=entity_version)
                if not pcf_location:
                    raise ValueError(f"No PCF location found for request {request_id}. Cannot refresh PCF data.")
                final_exchange = repo_manager.pcf_repository.update_pcf_location(
                    request_id=UUID(request_id),
                    type=PcfExchangeType.RESPONSE,
                    pcf_location=pcf_location
                )
                return PcfExchangeModel.from_entity(final_exchange)
        except Exception as e:
            logger.error(f"Failed to refresh PCF data for request {_s(request_id)}: {_s(e)}")
            raise ValueError(f"Failed to refresh PCF data: {str(e)}")

# Module-level singleton for convenience
provision_manager = PcfProvisionManager()
