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

from typing import Dict, Any, Optional
import html

from sqlmodel import select
from sqlalchemy.orm import selectinload

from connector import discovery_oauth

from tractusx_sdk.industry.services.discovery.bpn_discovery_service import BpnDiscoveryService
from tractusx_sdk.dataspace.services.discovery import DiscoveryFinderService

from managers.config.config_manager import ConfigManager
from managers.config.log_manager import LoggingManager
from managers.metadata_database.manager import RepositoryManagerFactory
from managers.enablement_services.submodel_service_manager import SubmodelServiceManager
from services.provider.twin_management_service import TwinManagementService
from models.services.provider.twin_management import (
    CatalogPartTwinShareCreate,
    SerializedPartTwinShareCreate,
)
from models.metadata_database.provider.models import (
    TwinAspect,
    Twin,
    CatalogPart,
    SerializedPart,
    PartnerCatalogPart,
)
from tools.exceptions import DppNotFoundError, DppShareError

logger = LoggingManager.get_logger(__name__)

# DPP semantic ID pattern for querying
DPP_SEMANTIC_PATTERN = "%digital_product_passport%"


class ProvisionManager:
    """
    Manages Digital Product Passport (DPP) provisioning and sharing operations.

    This manager handles:
    - Finding catalog and serialized part twins by DPP ID
    - Sharing DPPs with business partners
    - Registering manufacturer part IDs in BPN Discovery
    """

    def __init__(self) -> None:
        """Initialize the Provision Manager."""
        self.twin_management_service = TwinManagementService()
        self.submodel_service_manager = SubmodelServiceManager()

    def share_dpp(
        self, dpp_id: str, business_partner_number: str
    ) -> Dict[str, Any]:
        """
        Share a Digital Product Passport with a business partner.

        This method:
        1. Validates the DPP exists and is associated with a catalog or serialized part twin
        2. Shares the twin using the appropriate sharing logic
        3. Returns the twin data for BPN Discovery registration

        Args:
            dpp_id: The DPP identifier
            business_partner_number: The target BPNL to share with

        Returns:
            Dict containing twin_data and share success status

        Raises:
            DppNotFoundError: If the DPP is not found
            DppShareError: If sharing fails
        """
        logger.info(
            f"Initiating DPP sharing for DPP ID: {html.escape(dpp_id)} with partner: {html.escape(business_partner_number)}"
        )

        # Try to find as catalog part first, then as serialized part
        twin_data = None
        is_catalog_part = False

        try:
            logger.info(f"Attempting to find catalog part twin for DPP ID: {html.escape(dpp_id)}")
            twin_data = self.get_catalog_part_twin_by_dpp_id(dpp_id)
            is_catalog_part = True
            logger.info(f"Found catalog part twin for DPP {html.escape(dpp_id)}: {twin_data}")
        except DppNotFoundError:
            # Not a catalog part, try serialized part
            logger.info(f"Not a catalog part, trying serialized part for DPP {html.escape(dpp_id)}")
            twin_data = self.get_serialized_part_twin_by_dpp_id(dpp_id)
            logger.info(f"Found serialized part twin for DPP {html.escape(dpp_id)}: {twin_data}")

        # Share the twin
        if is_catalog_part:
            success = self._share_catalog_part_twin(twin_data, business_partner_number)
        else:
            success = self._share_serialized_part_twin(
                twin_data, business_partner_number
            )

        if not success:
            raise DppShareError(
                message=f"Failed to share DPP with {business_partner_number}",
                dpp_id=dpp_id,
                partner=business_partner_number,
            )

        logger.info(f"Successfully shared twin for DPP {html.escape(dpp_id)}")

        return {
            "twin_data": twin_data,
            "success": True,
        }

    def _share_catalog_part_twin(
        self, twin_data: Dict[str, Any], business_partner_number: str
    ) -> bool:
        """
        Share a catalog part twin with a business partner.

        Args:
            twin_data: Dictionary containing manufacturer_id and manufacturer_part_id
            business_partner_number: The target BPNL

        Returns:
            True if sharing was successful, False otherwise
        """
        share_request = CatalogPartTwinShareCreate(
            manufacturerId=twin_data["manufacturer_id"],
            manufacturerPartId=twin_data["manufacturer_part_id"],
            businessPartnerNumber=business_partner_number,
        )

        logger.info(f"Sharing catalog part twin with request: {share_request}")
        success = self.twin_management_service.create_catalog_part_twin_share(
            share_request
        )
        logger.info(f"Catalog part share result: {success}")

        return success

    def _share_serialized_part_twin(
        self, twin_data: Dict[str, Any], business_partner_number: str  # noqa: ARG002
    ) -> bool:
        """
        Share a serialized part twin with a business partner.

        Note: The business_partner_number parameter is kept for API consistency
        with _share_catalog_part_twin, but serialized parts already have an
        implicit link to a single business partner in their model.

        Args:
            twin_data: Dictionary containing manufacturer_id, manufacturer_part_id,
                       and part_instance_id
            business_partner_number: The target BPNL (kept for API consistency)

        Returns:
            True if sharing was successful, False otherwise
        """
        share_request = SerializedPartTwinShareCreate(
            manufacturerId=twin_data["manufacturer_id"],
            manufacturerPartId=twin_data["manufacturer_part_id"],
            partInstanceId=twin_data["part_instance_id"],
        )

        logger.info(f"Sharing serialized part twin with request: {share_request}")
        success = self.twin_management_service.create_serialized_part_twin_share(
            share_request
        )
        logger.info(f"Serialized part share result: {success}")

        return success

    def get_catalog_part_twin_by_dpp_id(self, dpp_id: str) -> Dict[str, Any]:
        """
        Find a catalog part twin by its DPP ID and extract sharing parameters.

        Args:
            dpp_id: The passport ID (format: CX:manufacturerPartId:partInstanceId)

        Returns:
            Dict with manufacturer_id and manufacturer_part_id

        Raises:
            DppNotFoundError: If DPP is not found or not associated with a catalog part twin
        """
        with RepositoryManagerFactory.create() as repo:
            # Query for DPP aspects - don't filter by catalog vs serialized yet
            stmt = (
                select(TwinAspect)
                .where(TwinAspect.semantic_id.like(DPP_SEMANTIC_PATTERN))  # type: ignore
                .options(
                    selectinload(TwinAspect.twin)  # type: ignore
                    .selectinload(Twin.catalog_part)
                    .joinedload(CatalogPart.legal_entity),
                )
            )

            all_dpp_aspects = repo.twin_aspect_repository._session.scalars(stmt).all()

            logger.info(f"Found {len(all_dpp_aspects)} total DPP aspects")

            # Filter for catalog parts only
            dpp_aspects = [
                asp for asp in all_dpp_aspects if asp.twin and asp.twin.catalog_part
            ]

            logger.info(f"Found {len(dpp_aspects)} DPP aspects on catalog part twins")

            if not dpp_aspects:
                raise DppNotFoundError(
                    message="No DPPs found on catalog part twins",
                    dpp_id=dpp_id,
                )

            logger.info(f"Searching for catalog part twin with DPP ID: {html.escape(dpp_id)}")

            for dpp_aspect in dpp_aspects:
                try:
                    result = self._match_catalog_part_aspect(dpp_aspect, dpp_id)
                    if result:
                        return result
                except Exception as e:
                    logger.warning(
                        f"Error checking DPP aspect {dpp_aspect.submodel_id}: {str(e)}"
                    )
                    continue

            raise DppNotFoundError(
                message=f"DPP not found on catalog part twin with ID: {dpp_id}",
                dpp_id=dpp_id,
            )

    def _match_catalog_part_aspect(
        self, dpp_aspect: TwinAspect, dpp_id: str
    ) -> Optional[Dict[str, Any]]:
        """
        Check if a DPP aspect matches the given DPP ID for catalog parts.

        Args:
            dpp_aspect: The TwinAspect to check
            dpp_id: The DPP ID to match

        Returns:
            Dict with manufacturer_id and manufacturer_part_id if matched, None otherwise
        """
        if not dpp_aspect.twin or not dpp_aspect.twin.catalog_part:
            return None

        db_catalog_part = dpp_aspect.twin.catalog_part

        if not db_catalog_part.legal_entity:
            return None

        # Get DPP data
        aspect_data = self.submodel_service_manager.get_twin_aspect_document(
            submodel_id=dpp_aspect.submodel_id,
            semantic_id=dpp_aspect.semantic_id
        )

        # Extract passport ID from metadata
        passport_id = (
            aspect_data.get("metadata", {}).get("passportId")
            or aspect_data.get("passportId")
            or ""
        )

        # If no passport ID in metadata, construct from part data
        if not passport_id:
            manufacturer_part_id = db_catalog_part.manufacturer_part_id or ""
            # For catalog parts, partInstanceId is from the DPP ID
            part_instance_id = dpp_id.split(":")[-1] if ":" in dpp_id else ""
            passport_id = f"CX:{manufacturer_part_id}:{part_instance_id}"

        # Check if this matches the requested DPP ID
        if passport_id == dpp_id:
            return {
                "manufacturer_id": db_catalog_part.legal_entity.bpnl,
                "manufacturer_part_id": db_catalog_part.manufacturer_part_id,
            }

        return None

    def get_serialized_part_twin_by_dpp_id(self, dpp_id: str) -> Dict[str, Any]:
        """
        Find a serialized part twin by its DPP ID and extract sharing parameters.

        Args:
            dpp_id: The passport ID (format: CX:manufacturerPartId:partInstanceId)

        Returns:
            Dict with manufacturer_id, manufacturer_part_id, and part_instance_id

        Raises:
            DppNotFoundError: If DPP is not found or not associated with a serialized part twin
        """
        with RepositoryManagerFactory.create() as repo:
            # Query for DPP aspects on serialized part twins only
            stmt = (
                select(TwinAspect)
                .join(Twin, TwinAspect.twin_id == Twin.id)
                .join(SerializedPart, Twin.id == SerializedPart.twin_id)
                .where(TwinAspect.semantic_id.like(DPP_SEMANTIC_PATTERN))  # type: ignore
                .options(
                    selectinload(TwinAspect.twin)  # type: ignore
                    .selectinload(Twin.serialized_part)
                    .selectinload(SerializedPart.partner_catalog_part)
                    .selectinload(PartnerCatalogPart.catalog_part),
                    selectinload(TwinAspect.twin)  # type: ignore
                    .selectinload(Twin.serialized_part)
                    .selectinload(SerializedPart.partner_catalog_part)
                    .selectinload(PartnerCatalogPart.business_partner),
                )
            )

            dpp_aspects = repo.twin_aspect_repository._session.scalars(stmt).all()

            if not dpp_aspects:
                raise DppNotFoundError(
                    message="No DPPs found on serialized part twins",
                    dpp_id=dpp_id,
                )
            
            logger.info(f"Searching for serialized part twin with DPP ID: {html.escape(dpp_id)}")

            for dpp_aspect in dpp_aspects:
                try:
                    result = self._match_serialized_part_aspect(dpp_aspect, dpp_id)
                    if result:
                        return result
                except Exception as e:
                    logger.warning(
                        f"Error checking DPP aspect {dpp_aspect.submodel_id}: {str(e)}"
                    )
                    continue

            raise DppNotFoundError(
                message=f"DPP not found on serialized part twin with ID: {dpp_id}",
                dpp_id=dpp_id,
            )

    def _match_serialized_part_aspect(
        self, dpp_aspect: TwinAspect, dpp_id: str
    ) -> Optional[Dict[str, Any]]:
        """
        Check if a DPP aspect matches the given DPP ID for serialized parts.

        Args:
            dpp_aspect: The TwinAspect to check
            dpp_id: The DPP ID to match

        Returns:
            Dict with manufacturer_id, manufacturer_part_id, and part_instance_id
            if matched, None otherwise
        """
        if not dpp_aspect.twin or not dpp_aspect.twin.serialized_part:
            return None

        db_serialized_part = dpp_aspect.twin.serialized_part
        partner_catalog_part = db_serialized_part.partner_catalog_part

        if not partner_catalog_part or not partner_catalog_part.catalog_part:
            return None

        # Get DPP data
        aspect_data = self.submodel_service_manager.get_twin_aspect_document(
            submodel_id=dpp_aspect.submodel_id,
            semantic_id=dpp_aspect.semantic_id
        )

        # Extract passport ID from metadata
        passport_id = (
            aspect_data.get("metadata", {}).get("passportId")
            or aspect_data.get("passportId")
            or ""
        )

        # If no passport ID in metadata, construct from part data
        if not passport_id:
            manufacturer_part_id = partner_catalog_part.catalog_part.manufacturer_part_id or ""
            part_instance_id = db_serialized_part.part_instance_id or ""
            passport_id = f"CX:{manufacturer_part_id}:{part_instance_id}"

        # Check if this matches the requested DPP ID
        if passport_id == dpp_id:
            return {
                "manufacturer_id": partner_catalog_part.business_partner.bpnl,
                "manufacturer_part_id": partner_catalog_part.catalog_part.manufacturer_part_id,
                "part_instance_id": db_serialized_part.part_instance_id,
            }

        return None

    def register_in_bpn_discovery(self, manufacturer_part_id: str) -> bool:
        """
        Register a manufacturer part ID in BPN Discovery.

        Args:
            manufacturer_part_id: The manufacturer part ID to register

        Returns:
            True if registration was successful, False otherwise
        """
        try:
            if not discovery_oauth or not discovery_oauth.connected:
                logger.warning("Discovery OAuth service is not available")
                return False

            # Get Discovery Finder URL from configuration
            discovery_finder_url = ConfigManager.get_config(
                "consumer.discovery.discovery_finder.url"
            )

            if not discovery_finder_url:
                logger.warning("Discovery Finder URL not configured")
                return False

            # Create Discovery Finder service
            discovery_finder = DiscoveryFinderService(
                url=discovery_finder_url, oauth=discovery_oauth
            )

            # Create BPN Discovery service
            bpn_discovery_service = BpnDiscoveryService(
                oauth=discovery_oauth, discovery_finder_service=discovery_finder
            )

            # Get the type identifier from configuration (default: "manufacturerPartId")
            bpn_type = ConfigManager.get_config(
                "consumer.discovery.bpn_discovery.type", default="manufacturerPartId"
            )

            # Register the manufacturer part ID
            bpn_discovery_service.set_identifier(
                identifier_key=manufacturer_part_id, identifier_type=bpn_type
            )

            logger.info(
                f"Successfully registered manufacturer part ID in BPN Discovery: {html.escape(manufacturer_part_id)}"
            )
            return True

        except Exception as e:
            logger.error(f"Failed to register in BPN Discovery: {str(e)}", exc_info=True)
            return False


# Module-level singleton for convenience
provision_manager = ProvisionManager()
