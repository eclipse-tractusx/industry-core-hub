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

from typing import List, Optional, Dict, Any

from sqlmodel import select
from sqlalchemy.orm import selectinload

from managers.config.log_manager import LoggingManager
from managers.metadata_database.manager import RepositoryManagerFactory
from managers.enablement_services.submodel_service_manager import SubmodelServiceManager
from models.metadata_database.provider.models import (
    TwinAspect,
    Twin,
    SerializedPart,
    PartnerCatalogPart,
)
from models.services.addons.ecopass_kit.v1 import DigitalProductPassport, TwinAssociation

logger = LoggingManager.get_logger(__name__)

# DPP semantic ID pattern for querying
DPP_SEMANTIC_PATTERN = "%digital_product_passport%"


class PassportsManager:
    """
    Manages Digital Product Passports (DPP) operations.

    This manager handles the retrieval and transformation of DPP data
    from the database into the standardized DPP format.
    """

    def __init__(self) -> None:
        """Initialize the Passports Manager."""
        self.submodel_service_manager = SubmodelServiceManager()

    def get_all_passports(self) -> List[DigitalProductPassport]:
        """
        Retrieve all Digital Product Passports (DPPs) from the system.

        This method fetches all twins that have DPP aspects (digital_product_passport
        semantic ID) and returns them in the standardized DPP format.

        Returns:
            List[DigitalProductPassport]: A list of all Digital Product Passports

        Raises:
            Exception: If there's an error accessing the database or processing DPPs
        """
        dpps: List[DigitalProductPassport] = []

        with RepositoryManagerFactory.create() as repo:
            # Query twin aspects with DPP semantic ID and eagerly load related data
            stmt = (
                select(TwinAspect)
                .where(TwinAspect.semantic_id.like(DPP_SEMANTIC_PATTERN))  # type: ignore
                .options(
                    selectinload(TwinAspect.twin).selectinload(Twin.catalog_part),  # type: ignore
                    selectinload(TwinAspect.twin)  # type: ignore
                    .selectinload(Twin.serialized_part)
                    .selectinload(SerializedPart.partner_catalog_part)
                    .selectinload(PartnerCatalogPart.catalog_part),
                    selectinload(TwinAspect.twin).selectinload(Twin.batch),  # type: ignore
                    selectinload(TwinAspect.twin).selectinload(Twin.twin_exchanges),  # type: ignore
                )
            )

            dpp_aspects = repo.twin_aspect_repository._session.scalars(stmt).all()

            if not dpp_aspects:
                return []

            for dpp_aspect in dpp_aspects:
                try:
                    dpp = self._process_dpp_aspect(dpp_aspect)
                    if dpp:
                        dpps.append(dpp)
                except Exception as e:
                    logger.error(
                        f"Error processing DPP aspect {dpp_aspect.submodel_id}: {str(e)}"
                    )
                    continue

        return dpps

    def _process_dpp_aspect(
        self, dpp_aspect: TwinAspect
    ) -> Optional[DigitalProductPassport]:
        """
        Process a single DPP aspect and convert it to a DigitalProductPassport.

        Args:
            dpp_aspect: The TwinAspect containing DPP data

        Returns:
            DigitalProductPassport object or None if the twin is not found
        """
        db_twin = dpp_aspect.twin

        if not db_twin:
            return None

        # Get the passport data from the submodel service
        aspect_data = self.submodel_service_manager.get_twin_aspect_document(
            submodel_id=dpp_aspect.submodel_id,
            semantic_id=dpp_aspect.semantic_id
        )

        # Extract passport metadata
        passport_id = self._extract_passport_id(aspect_data)
        issue_date = self._extract_issue_date(aspect_data)
        expiration_date = self._extract_expiration_date(aspect_data)

        # Extract part information from the twin
        part_info = self._extract_part_info(db_twin)

        # Extract version from semantic ID
        version = self._extract_version_from_semantic_id(dpp_aspect.semantic_id)

        # Determine status based on shares
        share_count = len(db_twin.twin_exchanges) if db_twin.twin_exchanges else 0
        status = "shared" if share_count > 0 else "active"

        # Build the DPP ID
        dpp_id = self._build_dpp_id(
            passport_id,
            part_info["manufacturer_part_id"],
            part_info["part_instance_id"],
            db_twin.global_id,
        )

        # Build twin association
        twin_association = TwinAssociation(
            twinId=str(db_twin.global_id),
            aasId=str(db_twin.aas_id),
            manufacturerPartId=part_info["manufacturer_part_id"],
            partInstanceId=part_info["part_instance_id"],
            twinName=part_info["name"],
        )

        # Create DPP object
        return DigitalProductPassport(
            id=dpp_id,
            passportId=passport_id if passport_id else dpp_id,
            manufacturerPartId=part_info["manufacturer_part_id"],
            partInstanceId=part_info["part_instance_id"],
            partType=part_info["part_type"],
            name=part_info["name"],
            version=version,
            semanticId=dpp_aspect.semantic_id,
            status=status,
            issueDate=issue_date,
            expirationDate=expiration_date,
            twinAssociation=twin_association,
            submodelId=str(dpp_aspect.submodel_id),
            createdAt=db_twin.created_date.isoformat() if db_twin.created_date else "",
            updatedAt=db_twin.modified_date.isoformat()
            if db_twin.modified_date
            else "",
        )

    def _extract_passport_id(self, aspect_data: Dict[str, Any]) -> str:
        """
        Extract passport ID from the aspect data.

        Args:
            aspect_data: The submodel aspect data

        Returns:
            The passport ID (UUID) or empty string if not found
        """
        return aspect_data.get("metadata", {}).get("passportId", "")

    def _extract_issue_date(self, aspect_data: Dict[str, Any]) -> Optional[str]:
        """
        Extract issue date from the DPP aspect data.

        Tries multiple common paths where issue date might be stored.

        Args:
            aspect_data: The submodel aspect data

        Returns:
            The issue date string or None if not found
        """
        return (
            aspect_data.get("metadata", {}).get("issueDate")
            or aspect_data.get("metadata", {}).get("issuedDate")
            or aspect_data.get("issueDate")
            or aspect_data.get("issuedDate")
            or aspect_data.get("validity", {}).get("issueDate")
            or None
        )

    def _extract_expiration_date(self, aspect_data: Dict[str, Any]) -> Optional[str]:
        """
        Extract expiration date from the DPP aspect data.

        Tries multiple common paths where expiration date might be stored.

        Args:
            aspect_data: The submodel aspect data

        Returns:
            The expiration date string or None if not found
        """
        return (
            aspect_data.get("metadata", {}).get("expirationDate")
            or aspect_data.get("metadata", {}).get("validUntil")
            or aspect_data.get("expirationDate")
            or aspect_data.get("validUntil")
            or aspect_data.get("validity", {}).get("expirationDate")
            or None
        )

    def _extract_part_info(self, db_twin: Twin) -> Dict[str, Any]:
        """
        Extract part information from the twin's related entities.

        Args:
            db_twin: The Twin database object

        Returns:
            Dictionary with name, manufacturer_part_id, part_instance_id, and part_type
        """
        name = "Digital Product Passport"
        manufacturer_part_id = ""
        part_instance_id = ""
        part_type = None

        if db_twin.catalog_part:
            name = db_twin.catalog_part.name or name
            manufacturer_part_id = db_twin.catalog_part.manufacturer_part_id
            part_type = "catalog"
        elif db_twin.serialized_part:
            if db_twin.serialized_part.partner_catalog_part:
                name = db_twin.serialized_part.partner_catalog_part.catalog_part.name or name
                manufacturer_part_id = db_twin.serialized_part.partner_catalog_part.catalog_part.manufacturer_part_id
            part_instance_id = db_twin.serialized_part.part_instance_id
            part_type = "serialized"
        elif db_twin.batch:
            if db_twin.batch.catalog_part:
                name = db_twin.batch.catalog_part.name or name
                manufacturer_part_id = db_twin.batch.catalog_part.manufacturer_part_id
            part_type = "batch"

        return {
            "name": name,
            "manufacturer_part_id": manufacturer_part_id,
            "part_instance_id": part_instance_id,
            "part_type": part_type,
        }

    def _extract_version_from_semantic_id(self, semantic_id: str) -> str:
        """
        Extract version from a semantic ID.

        Example semantic ID:
        urn:samm:io.catenax.generic.digital_product_passport:6.1.0#DigitalProductPassport

        Args:
            semantic_id: The semantic ID string

        Returns:
            The version string or "1.0.0" as default fallback
        """
        version = "1.0.0"  # default fallback

        if "#" in semantic_id:
            # Split by # to get the part before the fragment
            before_hash = semantic_id.split("#")[0]
            # Get the last part after splitting by :
            parts = before_hash.split(":")
            if len(parts) > 0:
                # The version should be the last part (e.g., "6.1.0")
                potential_version = parts[-1]
                # Check if it looks like a version number (contains dots and digits)
                if "." in potential_version and any(
                    c.isdigit() for c in potential_version
                ):
                    version = potential_version

        return version

    def _build_dpp_id(
        self,
        passport_id: str,
        manufacturer_part_id: str,
        part_instance_id: str,
        global_id: Any,
    ) -> str:
        """
        Build the DPP ID from available identifiers.

        Uses passport ID from metadata.passportId (UUID) if available,
        otherwise constructs a fallback ID.

        Args:
            passport_id: The passport ID from metadata
            manufacturer_part_id: The manufacturer part ID
            part_instance_id: The part instance ID
            global_id: The twin's global ID

        Returns:
            The constructed DPP ID
        """
        if passport_id:
            return passport_id

        # Fallback: construct ID if metadata.passportId is not available
        if part_instance_id:
            return f"CX:{manufacturer_part_id}:{part_instance_id}"
        elif manufacturer_part_id:
            return f"CX:{manufacturer_part_id}:TYPE"
        else:
            return f"CX:{global_id}"


# Module-level singleton for convenience
passports_manager = PassportsManager()
