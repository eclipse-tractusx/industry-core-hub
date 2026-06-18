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

from typing import Dict, Any, Optional, List
from uuid import UUID
import time

from managers.config.log_manager import LoggingManager
from managers.config.config_manager import ConfigManager
from managers.enablement_services.submodel_service_manager import SubmodelServiceManager
from managers.metadata_database.manager import RepositoryManagerFactory
from models.metadata_database.pcf import PcfExchangeEntity, PcfExchangeDirection, PcfExchangeStatus, PcfExchangeType
from tractusx_sdk.dataspace.tools.validate_submodels import submodel_schema_finder
from tools.json_validator import json_validator_draft_aware
from tools.exceptions import NotFoundError
from utils.log_utils import sanitize_log_value as _s
from utils.pcf_utils import (
    DEFAULT_PCF_VERSION,
    SUPPORTED_PCF_VERSIONS,
    get_pcf_exchange_semantic_id,
    get_pcf_semantic_id,
    pcf_submodel_id,
)

logger = LoggingManager.get_logger(__name__)


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
        if self._own_bpn is None:
            logger.warning("BPN not configured in configuration.yml. PCF operations requiring BPN will fail at call time.")

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
            "version": entity.version,
            "createdAt": entity.created_at.isoformat() if entity.created_at else None,
            "updatedAt": entity.updated_at.isoformat() if entity.updated_at else None,
        }

    def get_pcf_data(self, request_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve the PCF data payload for a request.

        The payload is looked up by ``manufacturer_part_id`` (product-scoped
        storage).  The PCF schema version is read from the stored entity so
        the correct submodel document is returned.

        Args:
            request_id: The unique request identifier (UUID string).
            
        Returns:
            The PCF data payload, or None if not found.
        """
        logger.info(f"Retrieving PCF data for request {_s(request_id)}")
        
        try:
            with RepositoryManagerFactory.create() as repo_manager:
                entity = repo_manager.pcf_repository.find_by_request_id(UUID(request_id))

                if not entity or not entity.manufacturer_part_id:
                    logger.warning(
                        f"No manufacturerPartId for request {_s(request_id)}. "
                        "Cannot retrieve PCF data."
                    )
                    return None

                # Store fields while session is open
                stored_manufacturer_part_id = entity.manufacturer_part_id
                stored_version = entity.version or DEFAULT_PCF_VERSION

            semantic_id = get_pcf_exchange_semantic_id(stored_version)
            submodel_id = pcf_submodel_id(stored_manufacturer_part_id, stored_version)
            pcf_data = self._submodel_service.get_twin_aspect_document(
                submodel_id=submodel_id,
                semantic_id=semantic_id
            )
            return pcf_data
        except Exception as e:
            logger.warning(f"PCF data not found for request {_s(request_id)}: {_s(e)}")
            return None
        
    def get_pcf_data_by_manufacturer_part_id(
        self,
        manufacturer_part_id: str,
        version: str = DEFAULT_PCF_VERSION,
    ) -> Optional[Dict[str, Any]]:
        """
        Retrieve the PCF data payload by manufacturer part ID and version.

        Args:
            manufacturer_part_id: The manufacturer part ID.
            version: PCF schema version (default: ``"v9.0.0"``).
            
        Returns:
            The PCF data payload, or None if not found.
        """
        logger.info(
            f"Retrieving PCF data for manufacturer part ID {_s(manufacturer_part_id)} "
            f"version={_s(version)}"
        )
        
        try:
            semantic_id = get_pcf_exchange_semantic_id(version)
            submodel_id = pcf_submodel_id(manufacturer_part_id, version)
            pcf_data = self._submodel_service.get_twin_aspect_document(
                submodel_id=submodel_id,
                semantic_id=semantic_id
            )
            return pcf_data
        except Exception as e:
            logger.warning(f"PCF data not found for manufacturer part ID {_s(manufacturer_part_id)}: {_s(e)}")
            return None

    def check_both_versions_exist(
        self,
        manufacturer_part_id: str,
        flow: str = "synchronous",
    ) -> None:
        """Ensure all supported PCF versions have been uploaded for a part.

        When the configuration flag
        ``provider.pcfExchange.requireBothVersions.<flow>`` is enabled, this
        method verifies that every version listed in
        :data:`~utils.pcf_utils.SUPPORTED_PCF_VERSIONS` has a stored submodel
        document.  If any version is missing, a
        :class:`~tools.exceptions.PcfVersionGateError` is raised so the
        caller (provision / exchange managers) can block the operation.

        When the flag is disabled (the default), the method returns
        immediately without performing any check.

        Args:
            manufacturer_part_id: The manufacturer part identifier to check.
            flow: ``"synchronous"`` or ``"asynchronous"`` — selects the
                corresponding configuration toggle.

        Raises:
            PcfVersionGateError: If the gate is enabled and at least one
                version has not been uploaded yet.
        """
        from tools.exceptions import PcfVersionGateError

        require_both = ConfigManager.get_config(
            f"provider.pcfExchange.requireBothVersions.{flow}", default=False
        )
        if not require_both:
            return

        missing = [
            v for v in sorted(SUPPORTED_PCF_VERSIONS)
            if self.get_pcf_data_by_manufacturer_part_id(manufacturer_part_id, version=v) is None
        ]

        if missing:
            raise PcfVersionGateError(
                f"Both PCF versions must be uploaded for manufacturerPartId "
                f"'{manufacturer_part_id}' before it can be published or exchanged. "
                f"Missing version(s): {', '.join(missing)}"
            )

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
        logger.info(f"Updating PCF exchange {_s(request_id)} status to {_s(status_label)}")

        try:
            with RepositoryManagerFactory.create() as repo_manager:
                entity = repo_manager.pcf_repository.update_status(
                    request_id=UUID(request_id),
                    new_status=status_label,
                    type=type,
                    message=message,
                )
                if not entity:
                    logger.warning(f"PCF exchange {_s(request_id)} not found for status update")
                    return None

                # Convert entity to dict while session is still active
                result = self._entity_to_dict(entity)
                logger.info(f"PCF exchange {_s(request_id)} status updated to {_s(status_label)}")
                return result
                
        except ValueError as e:
            logger.error(f"Invalid request ID format: {_s(request_id)} - {_s(e)}")
            raise
        except Exception as e:
            logger.error(f"Error updating PCF exchange {_s(request_id)}: {_s(e)}")
            raise

    def upload_pcf_data(
        self,
        manufacturer_part_id: str,
        pcf_data: Dict[str, Any],
        version: str = DEFAULT_PCF_VERSION,
    ) -> Dict[str, Any]:
        """
        Upload a PCF payload for a product.

        Validates the payload against the Catena-X PCF schema for the
        specified version and stores it in the submodel service keyed by
        ``manufacturerPartId`` and ``version``.

        Args:
            manufacturer_part_id: The manufacturer part ID for the product.
            pcf_data: The PCF payload to store.
            version: PCF schema version (default: ``"v9.0.0"``).

        Returns:
            Dictionary with upload confirmation details.

        Raises:
            ValueError: If the PCF data fails schema validation.
        """
        logger.info(
            f"Uploading PCF data for manufacturerPartId={_s(manufacturer_part_id)} "
            f"version={_s(version)}"
        )

        semantic_id = get_pcf_exchange_semantic_id(version)
        submodel_id = pcf_submodel_id(manufacturer_part_id, version)

        # Verify that existing data is not present
        try:
            existing = self._submodel_service.get_twin_aspect_document(
                submodel_id=submodel_id,
                semantic_id=semantic_id,
            )
            if existing:
                raise ValueError(
                    f"PCF data already exists for manufacturerPartId={manufacturer_part_id} "
                    f"version={version}. Use update to modify existing data."
                )
        except NotFoundError:
            # File doesn't exist yet - this is expected for a new upload
            pass


        self._validate_pcf_schema(pcf_data, version)


        pcf_location = f"submodel://{semantic_id}/{manufacturer_part_id}"

        self._submodel_service.upload_twin_aspect_document(
            submodel_id=submodel_id,
            semantic_id=semantic_id,
            payload=pcf_data,
        )

        # Update all pending responses with the PCF location
        self._update_pending_responses_with_pcf_location(manufacturer_part_id, pcf_location)

        logger.info(
            f"PCF data uploaded for manufacturerPartId={_s(manufacturer_part_id)} "
            f"version={_s(version)} (submodel_id={_s(submodel_id)})"
        )

        return {
            "manufacturerPartId": manufacturer_part_id,
            "pcfLocation": pcf_location,
            "version": version,
            "status": "uploaded",
        }

    def update_pcf_data(
        self,
        manufacturer_part_id: str,
        pcf_data: Dict[str, Any],
        version: str = DEFAULT_PCF_VERSION,
    ) -> Dict[str, Any]:
        """
        Update an existing PCF payload for a product.

        Validates the payload against the Catena-X PCF schema for the
        specified version and overwrites the existing data in the submodel
        service.

        Args:
            manufacturer_part_id: The manufacturer part ID for the product.
            pcf_data: The updated PCF payload.
            version: PCF schema version (default: ``"v9.0.0"``).

        Returns:
            Dictionary with update confirmation details.

        Raises:
            ValueError: If the PCF data fails schema validation or no
                        existing data is found.
        """
        logger.info(
            f"Updating PCF data for manufacturerPartId={_s(manufacturer_part_id)} "
            f"version={_s(version)}"
        )

        semantic_id = get_pcf_exchange_semantic_id(version)
        submodel_id = pcf_submodel_id(manufacturer_part_id, version)

        # Verify that existing data is present
        existing = self._submodel_service.get_twin_aspect_document(
            submodel_id=submodel_id,
            semantic_id=semantic_id,
        )
        if not existing:
            raise ValueError(
                f"No existing PCF data found for manufacturerPartId={manufacturer_part_id} "
                f"version={version}. Use upload to create new data."
            )

        self._validate_pcf_schema(pcf_data, version)

        pcf_location = f"submodel://{semantic_id}/{manufacturer_part_id}"

        self._submodel_service.upload_twin_aspect_document(
            submodel_id=submodel_id,
            semantic_id=semantic_id,
            payload=pcf_data,
        )

        shared_bpns = self._get_shared_bpns(manufacturer_part_id)

        logger.info(
            f"PCF data updated for manufacturerPartId={_s(manufacturer_part_id)} "
            f"version={_s(version)} (submodel_id={_s(submodel_id)})"
        )

        return {
            "manufacturerPartId": manufacturer_part_id,
            "pcfLocation": pcf_location,
            "version": version,
            "status": "updated",
            "sharedWithBpns": shared_bpns
        }
    
    def get_pcf_location(
        self,
        manufacturer_part_id: str,
        version: str = DEFAULT_PCF_VERSION,
    ) -> str:
        """
        Get the storage location of the PCF data for a given manufacturer part ID.

        Args:
            manufacturer_part_id: The manufacturer part ID to look up.
            version: PCF schema version (default: ``"v9.0.0"``).

        Returns:
            The PCF location string (e.g., submodel URL).
        """
        semantic_id = get_pcf_exchange_semantic_id(version)
        submodel_id = pcf_submodel_id(manufacturer_part_id, version)

        # Verify that existing data is present
        existing = self._submodel_service.get_twin_aspect_document(
            submodel_id=submodel_id,
            semantic_id=semantic_id,
        )

        if not existing:
            raise ValueError(
                f"No existing PCF data found for manufacturerPartId={manufacturer_part_id} "
                f"version={version}."
            )
        return f"submodel://{semantic_id}/{manufacturer_part_id}"


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
                    logger.info(f"Updated PCF location for pending response {_s(entity.request_id)}")
            
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

    def _validate_pcf_schema(
        self,
        pcf_data: Dict[str, Any],
        version: str = DEFAULT_PCF_VERSION,
    ) -> None:
        """Validate PCF data against the Catena-X PCF JSON schema.

        Args:
            pcf_data: The PCF payload to validate.
            version: PCF schema version to validate against (default: ``"v9.0.0"``).

        Raises:
            ValueError: If the data does not conform to the schema.
        """
        semantic_id = get_pcf_semantic_id(version)
        pcf_schema_result = submodel_schema_finder(semantic_id)
        json_validator_draft_aware(pcf_schema_result["schema"], pcf_data)

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

        logger.info(f"[PCF EDC] Discovering connectors for BPN [{_s(target_bpn)}]")

        # Evict any stale EDR for this counterparty from both the in-memory cache
        # and the edr_connections DB table before attempting a fresh negotiation.
        #
        # In Saturn, the cache is keyed by the counterparty DID
        # (e.g. "did:web:wallet.example.com:BPNL000000000065"). We resolve the
        # exact DID first so that clear_connections_by_party can do a precise
        # match. If discovery fails or the service is Jupiter, we fall back to
        # the BPN value, which clear_connections_by_party also handles via
        # substring matching (the DID always contains the BPN).
        if hasattr(consumer_connector_service, 'connection_manager'):
            party_key = target_bpn
            if hasattr(consumer_connector_service, 'get_discovery_info'):
                try:
                    _, party_key, _ = consumer_connector_service.get_discovery_info(bpnl=target_bpn)
                    logger.debug(f"[PCF EDC] Resolved counterparty DID for BPN [{_s(target_bpn)}]: {_s(party_key)}")
                except Exception as discovery_err:
                    logger.warning(
                        f"[PCF EDC] Could not resolve DID for BPN [{_s(target_bpn)}], "
                        f"falling back to BPN substring clear: {_s(discovery_err)}"
                    )
            removed = consumer_connector_service.connection_manager.clear_connections_by_party(party_key)
            logger.debug(f"[PCF EDC] Cleared EDR cache for [{_s(party_key)}] (removed {removed} entries)")

        connectors = connector_consumer_manager.get_connectors(target_bpn)
        if not connectors:
            raise ValueError(f"No connector endpoints found for BPN [{target_bpn}].")
        logger.info(f"[PCF EDC] Found {len(connectors)} connector(s) for BPN [{_s(target_bpn)}]")

        last_error = None
        for connector_url in connectors:
            try:
                response = self._dispatch_edc_request(
                    consumer_connector_service, http_method, target_bpn,
                    connector_url, asset_type, list_policies, path, params, json_data,
                )

                if response.status_code in (200, 201, 202, 204):
                    logger.info(
                        f"[PCF EDC] {_s(http_method)} successful for request [{_s(request_id)}] "
                        f"(HTTP {_s(response.status_code)})"
                    )
                    return response

                logger.warning(
                    f"[PCF EDC] {_s(http_method)} returned status {_s(response.status_code)} "
                    f"on [{_s(connector_url)}]: {_s(response.text)}"
                )
                last_error = ValueError(
                    f"EDC data transfer failed with status {response.status_code}"
                )

            except Exception as e:
                logger.warning(
                    f"[PCF EDC] Failed on connector [{_s(connector_url)}]: {_s(e)}. "
                    f"Retrying in 3 seconds..."
                )
                
                # Wait and retry once more
                time.sleep(3)
                
                try:
                    logger.info(
                        f"[PCF EDC] Retry: Attempting {_s(http_method)} on [{_s(connector_url)}] path=[{_s(path)}]"
                    )
                    response = self._dispatch_edc_request(
                        consumer_connector_service, http_method, target_bpn,
                        connector_url, asset_type, list_policies, path, params, json_data,
                    )
                    
                    if response.status_code in (200, 201, 202, 204):
                        logger.info(
                            f"[PCF EDC] Retry successful for request [{_s(request_id)}] "
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
                        f"[PCF EDC] Retry also failed: {_s(retry_error)}"
                    )
                    last_error = retry_error

        raise ValueError(
            f"Failed to send PCF data via EDC to any connector for BPN [{target_bpn}]: {last_error}"
        )

    def _dispatch_edc_request(
        self,
        consumer_connector_service,
        http_method: str,
        target_bpn: str,
        connector_url: str,
        asset_type: str,
        list_policies: Optional[List[Dict]],
        path: str,
        params: Optional[Dict[str, str]],
        json_data: Optional[Dict[str, Any]],
    ):
        """Execute a single EDC GET or PUT request and return the response."""
        logger.info(
            f"[PCF EDC] Attempting {_s(http_method)} on [{_s(connector_url)}] path=[{_s(path)}]"
        )

        if http_method.upper() == "GET":
            return consumer_connector_service.do_get_by_dct_type_with_bpnl(
                bpnl=target_bpn,
                counter_party_address=connector_url,
                dct_type=asset_type,
                policies=list_policies,
                path=path,
                params=params if params else None,
            )
        elif http_method.upper() == "PUT":
            return consumer_connector_service.do_put_by_dct_type_with_bpnl(
                bpnl=target_bpn,
                counter_party_address=connector_url,
                dct_type=asset_type,
                json=json_data if json_data is not None else {},
                policies=list_policies,
                path=path,
            )
        else:
            raise ValueError(f"Unsupported HTTP method: {http_method}")

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
