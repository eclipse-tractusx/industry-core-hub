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

from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from controllers.fastapi.routers.authentication.auth_api import get_authentication_dependency
from managers.metadata_database.manager import RepositoryManagerFactory
from managers.enablement_services.submodel_service_manager import SubmodelServiceManager

router = APIRouter(
    prefix="/passports",
    dependencies=[Depends(get_authentication_dependency())]
)


class TwinAssociation(BaseModel):
    """Association between DPP and Digital Twin"""
    twin_id: str = Field(alias="twinId")
    aas_id: Optional[str] = Field(alias="aasId", default=None)
    manufacturer_part_id: str = Field(alias="manufacturerPartId")
    part_instance_id: str = Field(alias="partInstanceId")
    twin_name: Optional[str] = Field(alias="twinName", default=None)
    asset_id: Optional[str] = Field(alias="assetId", default=None)

    class Config:
        populate_by_name = True


class DigitalProductPassport(BaseModel):
    """Digital Product Passport model"""
    id: str
    passport_id: str = Field(alias="passportId")  # UUID from metadata.passportId
    manufacturer_part_id: Optional[str] = Field(alias="manufacturerPartId", default=None)  # For BPN Discovery
    part_instance_id: Optional[str] = Field(alias="partInstanceId", default=None)  # Part Instance ID
    part_type: Optional[str] = Field(alias="partType", default=None)  # "catalog" or "serialized"
    name: str
    version: str
    semantic_id: str = Field(alias="semanticId")
    status: str
    issue_date: Optional[str] = Field(alias="issueDate", default=None)  # Issue date from DPP
    expiration_date: Optional[str] = Field(alias="expirationDate", default=None)  # Expiration date from DPP
    twin_association: Optional[TwinAssociation] = Field(alias="twinAssociation", default=None)
    submodel_id: str = Field(alias="submodelId")
    created_at: str = Field(alias="createdAt")
    updated_at: str = Field(alias="updatedAt")

    class Config:
        populate_by_name = True


@router.get("", response_model=List[DigitalProductPassport])
async def get_all_passports():
    """
    Retrieve all Digital Product Passports (DPPs) from the system.
    
    This endpoint fetches all twins that have DPP aspects (digital_product_passport semantic ID)
    and returns them in the standardized DPP format.
    
    Returns:
        List[DigitalProductPassport]: A list of all Digital Product Passports in the system
    """
    try:
        dpps = []
        
        with RepositoryManagerFactory.create() as repo:
            # Query all TwinAspects with DPP semantic ID pattern
            from sqlmodel import select
            from models.metadata_database.provider.models import TwinAspect, Twin, SerializedPart, CatalogPart, PartnerCatalogPart
            from sqlalchemy.orm import selectinload
            
            dpp_semantic_pattern = "%digital_product_passport%"
            
            # Query twin aspects with DPP semantic ID and eagerly load related data
            stmt = select(TwinAspect).where(
                TwinAspect.semantic_id.like(dpp_semantic_pattern)  # type: ignore
            ).options(
                selectinload(TwinAspect.twin).selectinload(Twin.catalog_part),  # type: ignore
                selectinload(TwinAspect.twin).selectinload(Twin.serialized_part).selectinload(SerializedPart.partner_catalog_part).selectinload(PartnerCatalogPart.catalog_part),  # type: ignore
                selectinload(TwinAspect.twin).selectinload(Twin.batch),  # type: ignore
                selectinload(TwinAspect.twin).selectinload(Twin.twin_exchanges)  # type: ignore
            )
            
            dpp_aspects = repo.twin_aspect_repository._session.scalars(stmt).all()
            
            if not dpp_aspects:
                return []
            
            for dpp_aspect in dpp_aspects:
                try:
                    # Get the associated twin
                    db_twin = dpp_aspect.twin
                    
                    if not db_twin:
                        continue
                    
                    # Get the passport ID from the submodel data
                    submodel_service_manager = SubmodelServiceManager()
                    aspect_data = submodel_service_manager.get_twin_aspect_document(
                        submodel_id=dpp_aspect.submodel_id,
                        semantic_id=dpp_aspect.semantic_id
                    )
                    
                    # Extract passport ID (UUID) from metadata.passportId
                    passport_id = aspect_data.get("metadata", {}).get("passportId", "")
                    
                    # Extract issue date from DPP
                    # Try multiple common paths where issue date might be stored
                    issue_date = (
                        aspect_data.get("metadata", {}).get("issueDate") or
                        aspect_data.get("metadata", {}).get("issuedDate") or
                        aspect_data.get("issueDate") or
                        aspect_data.get("issuedDate") or
                        aspect_data.get("validity", {}).get("issueDate") or
                        None
                    )
                    
                    # Extract expiration date from DPP
                    # Try multiple common paths where expiration date might be stored
                    expiration_date = (
                        aspect_data.get("metadata", {}).get("expirationDate") or
                        aspect_data.get("metadata", {}).get("validUntil") or
                        aspect_data.get("expirationDate") or
                        aspect_data.get("validUntil") or
                        aspect_data.get("validity", {}).get("expirationDate") or
                        None
                    )
                    
                    # Determine the name from the twin's related part
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
                    
                    # Extract version from semantic ID
                    # Example: urn:samm:io.catenax.generic.digital_product_passport:6.1.0#DigitalProductPassport
                    version = "1.0.0"  # default fallback
                    if "#" in dpp_aspect.semantic_id:
                        # Split by # to get the part before the fragment
                        before_hash = dpp_aspect.semantic_id.split("#")[0]
                        # Get the last part after splitting by :
                        parts = before_hash.split(":")
                        if len(parts) > 0:
                            # The version should be the last part (e.g., "6.1.0")
                            potential_version = parts[-1]
                            # Check if it looks like a version number (contains dots and digits)
                            if "." in potential_version and any(c.isdigit() for c in potential_version):
                                version = potential_version
                    
                    # Determine status based on shares
                    share_count = len(db_twin.twin_exchanges) if db_twin.twin_exchanges else 0
                    status = "shared" if share_count > 0 else "active"
                    
                    # Use passport ID from metadata.passportId (UUID) or construct fallback
                    if passport_id:
                        dpp_id = passport_id  # This is the UUID from metadata.passportId
                    else:
                        # Fallback: construct ID if metadata.passportId is not available
                        dpp_id = f"CX:{manufacturer_part_id}:{part_instance_id}" if part_instance_id else f"CX:{manufacturer_part_id}:TYPE"
                        if not manufacturer_part_id:
                            dpp_id = f"CX:{db_twin.global_id}"
                    
                    # Build twin association
                    twin_association = TwinAssociation(
                        twinId=str(db_twin.global_id),
                        aasId=str(db_twin.aas_id),
                        manufacturerPartId=manufacturer_part_id,
                        partInstanceId=part_instance_id,
                        twinName=name
                    )
                    
                    # Create DPP object with submodel reference
                    dpp = DigitalProductPassport(
                        id=dpp_id,
                        passportId=passport_id if passport_id else dpp_id,  # UUID from metadata.passportId
                        manufacturerPartId=manufacturer_part_id,  # For BPN Discovery
                        partInstanceId=part_instance_id,  # Part Instance ID
                        partType=part_type,  # "catalog", "serialized", or "batch"
                        name=name,
                        version=version,
                        semanticId=dpp_aspect.semantic_id,
                        status=status,
                        issueDate=issue_date,  # Issue date from DPP
                        expirationDate=expiration_date,  # Expiration date from DPP
                        twinAssociation=twin_association,
                        submodelId=str(dpp_aspect.submodel_id),
                        createdAt=db_twin.created_date.isoformat() if db_twin.created_date else "",
                        updatedAt=db_twin.modified_date.isoformat() if db_twin.modified_date else ""
                    )
                    
                    dpps.append(dpp)
                    
                except Exception as e:
                    # Log error but continue processing other DPPs
                    print(f"Error processing DPP aspect {dpp_aspect.submodel_id}: {str(e)}")
                    continue
        
        return dpps
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving DPPs: {str(e)}")
