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

from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from connector import discovery_oauth

from tractusx_sdk.industry.services.discovery.bpn_discovery_service import BpnDiscoveryService
from tractusx_sdk.dataspace.services.discovery import DiscoveryFinderService

from controllers.fastapi.routers.authentication.auth_api import get_authentication_dependency
from managers.metadata_database.manager import RepositoryManagerFactory
from managers.enablement_services.submodel_service_manager import SubmodelServiceManager
from managers.config.config_manager import ConfigManager
from managers.config.log_manager import LoggingManager
from services.provider.twin_management_service import TwinManagementService
from models.services.provider.twin_management import SerializedPartTwinShareCreate

logger = LoggingManager.get_logger(__name__)

router = APIRouter(
    prefix="/provision",
    dependencies=[Depends(get_authentication_dependency())]
)


class ShareDppRequest(BaseModel):
    """Request model for sharing a Digital Product Passport"""
    dpp_id: str = Field(
        alias="dppId",
        description="The passport ID of the Digital Product Passport to share (format: CX:manufacturerPartId:partInstanceId)"
    )
    business_partner_number: str = Field(
        alias="businessPartnerNumber",
        description="The BPNL of the business partner to share the DPP with"
    )

    class Config:
        populate_by_name = True


class ShareDppResponse(BaseModel):
    """Response model for DPP sharing operation"""
    dpp_id: str = Field(alias="dppId", description="The passport ID of the shared DPP")
    business_partner_number: str = Field(
        alias="businessPartnerNumber",
        description="The BPNL the DPP was shared with"
    )
    bpn_discovery_registered: bool = Field(
        alias="bpnDiscoveryRegistered",
        description="Whether the manufacturer part ID was successfully registered in BPN Discovery"
    )

    class Config:
        populate_by_name = True


@router.post("/share", response_model=ShareDppResponse, status_code=status.HTTP_200_OK)
async def share_dpp(request: ShareDppRequest):
    """
    Share a Digital Product Passport (catalog or serialized part twin) with a single business partner.
    
    This endpoint:
    1. Validates the DPP exists and is associated with a catalog or serialized part twin
    2. Shares the twin using the appropriate sharing logic
    3. Registers the manufacturer part ID in BPN Discovery
    
    Args:
        request: ShareDppRequest containing DPP ID and target BPNL
        
    Returns:
        ShareDppResponse with sharing status
        
    Raises:
        HTTPException: If the DPP is not found or sharing fails
    """
    try:
        logger.info(f"Initiating DPP sharing for DPP ID: {request.dpp_id} with partner: {request.business_partner_number}")
        
        twin_management_service = TwinManagementService()
        
        # Try to find as catalog part first, then as serialized part
        try:
            logger.info(f"Attempting to find catalog part twin for DPP ID: {request.dpp_id}")
            twin_data = await _get_catalog_part_twin_by_dpp_id(request.dpp_id)
            logger.info(f"Found catalog part twin for DPP {request.dpp_id}: {twin_data}")
            
            # Share catalog part twin
            from models.services.provider.twin_management import CatalogPartTwinShareCreate
            share_request = CatalogPartTwinShareCreate(
                manufacturerId=twin_data["manufacturer_id"],
                manufacturerPartId=twin_data["manufacturer_part_id"],
                businessPartnerNumber=request.business_partner_number
            )
            
            logger.info(f"Sharing catalog part twin with request: {share_request}")
            success = twin_management_service.create_catalog_part_twin_share(share_request)
            logger.info(f"Catalog part share result: {success}")
            
        except HTTPException as e:
            logger.error(f"HTTPException while looking for catalog part: status={e.status_code}, detail={e.detail}")
            if e.status_code == 404:
                # Not a catalog part, try serialized part
                logger.info(f"Not a catalog part, trying serialized part for DPP {request.dpp_id}")
                twin_data = await _get_serialized_part_twin_by_dpp_id(request.dpp_id)
                
                share_request = SerializedPartTwinShareCreate(
                    manufacturerId=twin_data["manufacturer_id"],
                    manufacturerPartId=twin_data["manufacturer_part_id"],
                    partInstanceId=twin_data["part_instance_id"]
                )
                
                success = twin_management_service.create_serialized_part_twin_share(share_request)
            else:
                raise
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to share DPP with {request.business_partner_number}"
            )
        
        logger.info(f"Successfully shared twin for DPP {request.dpp_id}")
        
        # Register in BPN Discovery
        bpn_registered = await _register_in_bpn_discovery(twin_data["manufacturer_part_id"])
        
        return ShareDppResponse(
            dppId=request.dpp_id,
            businessPartnerNumber=request.business_partner_number,
            bpnDiscoveryRegistered=bpn_registered
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sharing DPP {request.dpp_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to share DPP: {str(e)}"
        )


async def _get_catalog_part_twin_by_dpp_id(dpp_id: str) -> Dict[str, Any]:
    """
    Find a catalog part twin by its DPP ID and extract sharing parameters.
    
    Args:
        dpp_id: The passport ID (format: CX:manufacturerPartId:partInstanceId)
        
    Returns:
        Dict with manufacturer_id and manufacturer_part_id
        
    Raises:
        HTTPException: If DPP is not found or not associated with a catalog part twin
    """
    from sqlmodel import select
    from models.metadata_database.provider.models import TwinAspect, Twin, CatalogPart, LegalEntity
    from sqlalchemy.orm import selectinload, joinedload
    
    with RepositoryManagerFactory.create() as repo:
        # Query for DPP aspects - don't filter by catalog vs serialized yet
        dpp_semantic_pattern = "%digital_product_passport%"
        stmt = (
            select(TwinAspect)
            .where(TwinAspect.semantic_id.like(dpp_semantic_pattern))  # type: ignore
            .options(
                selectinload(TwinAspect.twin).selectinload(Twin.catalog_part).joinedload(CatalogPart.legal_entity),  # type: ignore
            )
        )
        
        all_dpp_aspects = repo.twin_aspect_repository._session.scalars(stmt).all()
        
        logger.info(f"Found {len(all_dpp_aspects)} total DPP aspects")
        
        # Filter for catalog parts only
        dpp_aspects = [asp for asp in all_dpp_aspects if asp.twin and asp.twin.catalog_part]
        
        logger.info(f"Found {len(dpp_aspects)} DPP aspects on catalog part twins")
        
        if not dpp_aspects:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No DPPs found on catalog part twins"
            )
        
        logger.info(f"Searching for catalog part twin with DPP ID: {dpp_id}")
        submodel_service_manager = SubmodelServiceManager()
        
        for dpp_aspect in dpp_aspects:
            try:
                if not dpp_aspect.twin or not dpp_aspect.twin.catalog_part:
                    continue
                
                db_catalog_part = dpp_aspect.twin.catalog_part
                
                if not db_catalog_part.legal_entity:
                    continue
                
                # Get DPP data
                aspect_data = submodel_service_manager.get_twin_aspect_document(
                    submodel_id=dpp_aspect.submodel_id,
                    semantic_id=dpp_aspect.semantic_id
                )
                
                # Extract passport ID from metadata
                passport_id = (
                    aspect_data.get("metadata", {}).get("passportId") or
                    aspect_data.get("passportId") or
                    ""
                )
                
                # If no passport ID in metadata, construct from part data
                if not passport_id:
                    manufacturer_part_id = db_catalog_part.manufacturer_part_id or ""
                    # For catalog parts, partInstanceId is from the DPP ID
                    part_instance_id = dpp_id.split(":")[-1] if ":" in dpp_id else ""
                    passport_id = f"CX:{manufacturer_part_id}:{part_instance_id}"
                
                # Check if this matches the requested DPP ID
                if passport_id == dpp_id:
                    # Extract manufacturer_id from legal entity
                    manufacturer_id = db_catalog_part.legal_entity.bpnl
                    
                    return {
                        "manufacturer_id": manufacturer_id,
                        "manufacturer_part_id": db_catalog_part.manufacturer_part_id,
                    }
                    
            except Exception as e:
                logger.warning(f"Error checking DPP aspect {dpp_aspect.submodel_id}: {str(e)}")
                continue
        
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"DPP not found on catalog part twin with ID: {dpp_id}"
        )


async def _get_serialized_part_twin_by_dpp_id(dpp_id: str) -> Dict[str, Any]:
    """
    Find a serialized part twin by its DPP ID and extract sharing parameters.
    
    Args:
        dpp_id: The passport ID (format: CX:manufacturerPartId:partInstanceId)
        
    Returns:
        Dict with manufacturer_id, manufacturer_part_id, and part_instance_id
        
    Raises:
        HTTPException: If DPP is not found or not associated with a serialized part twin
    """
    from sqlmodel import select
    from models.metadata_database.provider.models import TwinAspect, Twin, SerializedPart, PartnerCatalogPart
    from sqlalchemy.orm import selectinload
    
    with RepositoryManagerFactory.create() as repo:
        # Query for DPP aspects on serialized part twins only
        dpp_semantic_pattern = "%digital_product_passport%"
        stmt = (
            select(TwinAspect)
            .join(Twin, TwinAspect.twin_id == Twin.id)
            .join(SerializedPart, Twin.id == SerializedPart.twin_id)
            .where(TwinAspect.semantic_id.like(dpp_semantic_pattern))  # type: ignore
            .options(
                selectinload(TwinAspect.twin).selectinload(Twin.serialized_part).selectinload(SerializedPart.partner_catalog_part).selectinload(PartnerCatalogPart.catalog_part),  # type: ignore
                selectinload(TwinAspect.twin).selectinload(Twin.serialized_part).selectinload(SerializedPart.partner_catalog_part).selectinload(PartnerCatalogPart.business_partner)  # type: ignore
            )
        )
        
        dpp_aspects = repo.twin_aspect_repository._session.scalars(stmt).all()
        
        if not dpp_aspects:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No DPPs found on serialized part twins"
            )
        
        logger.info(f"Searching for serialized part twin with DPP ID: {dpp_id}")
        submodel_service_manager = SubmodelServiceManager()
        
        for dpp_aspect in dpp_aspects:
            try:
                if not dpp_aspect.twin or not dpp_aspect.twin.serialized_part:
                    continue
                
                db_serialized_part = dpp_aspect.twin.serialized_part
                partner_catalog_part = db_serialized_part.partner_catalog_part
                
                if not partner_catalog_part or not partner_catalog_part.catalog_part:
                    continue
                
                # Get DPP data
                aspect_data = submodel_service_manager.get_twin_aspect_document(
                    submodel_id=dpp_aspect.submodel_id,
                    semantic_id=dpp_aspect.semantic_id
                )
                
                # Extract passport ID from metadata
                passport_id = (
                    aspect_data.get("metadata", {}).get("passportId") or
                    aspect_data.get("passportId") or
                    ""
                )
                
                # If no passport ID in metadata, construct from part data
                if not passport_id:
                    manufacturer_part_id = partner_catalog_part.catalog_part.manufacturer_part_id or ""
                    part_instance_id = db_serialized_part.part_instance_id or ""
                    passport_id = f"CX:{manufacturer_part_id}:{part_instance_id}"
                
                # Check if this matches the requested DPP ID
                if passport_id == dpp_id:
                    # Extract manufacturer_id from business partner
                    manufacturer_id = partner_catalog_part.business_partner.bpnl
                    
                    return {
                        "manufacturer_id": manufacturer_id,
                        "manufacturer_part_id": partner_catalog_part.catalog_part.manufacturer_part_id,
                        "part_instance_id": db_serialized_part.part_instance_id
                    }
                    
            except Exception as e:
                logger.warning(f"Error checking DPP aspect {dpp_aspect.submodel_id}: {str(e)}")
                continue
        
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"DPP not found on serialized part twin with ID: {dpp_id}"
        )


async def _register_in_bpn_discovery(manufacturer_part_id: str) -> bool:
    """
    Register a manufacturer part ID in BPN Discovery.
    
    Args:
        manufacturer_part_id: The manufacturer part ID to register
        
    Returns:
        bool: True if registration was successful, False otherwise
    """
    try:
        if not discovery_oauth or not discovery_oauth.connected:
            logger.warning("Discovery OAuth service is not available")
            return False
        
        # Get Discovery Finder URL from configuration
        discovery_finder_url = ConfigManager.get_config("consumer.discovery.discovery_finder.url")
        
        if not discovery_finder_url:
            logger.warning("Discovery Finder URL not configured")
            return False
        
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
        
        # Register the manufacturer part ID
        bpn_discovery_service.set_identifier(
            identifier_key=manufacturer_part_id,
            identifier_type=bpn_type
        )
        
        logger.info(f"Successfully registered manufacturer part ID in BPN Discovery: {manufacturer_part_id}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to register in BPN Discovery: {str(e)}", exc_info=True)
        return False
