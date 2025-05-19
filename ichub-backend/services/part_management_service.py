#################################################################################
# Eclipse Tractus-X - Industry Core Hub Backend
#
# Copyright (c) 2025 DRÄXLMAIER Group
# (represented by Lisa Dräxlmaier GmbH)
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

from typing import Dict, List, Optional
from models.services.part_management import BatchCreate, BatchRead, CatalogPartCreate, CatalogPartDelete, CatalogPartRead, SimpleCatalogPartReadWithStatus, CatalogPartReadWithStatus, JISPartCreate, JISPartDelete, JISPartRead, PartnerCatalogPartBase, PartnerCatalogPartCreate, PartnerCatalogPartDelete, SerializedPartCreate, SerializedPartDelete, SerializedPartRead, SerializedPartQuery, SimpleSerializedPartRead
from models.services.partner_management import BusinessPartnerRead
from managers.metadata_database.manager import RepositoryManagerFactory
from models.metadata_database.models import CatalogPart, Batch, LegalEntity, SerializedPart, JISPart, PartnerCatalogPart
from managers.config.log_manager import LoggingManager

logger = LoggingManager.get_logger(__name__)

class PartManagementService():
    """
    Service class for managing parts and their relationships in the system.
    """

    def create_catalog_part(self, catalog_part_create: CatalogPartCreate) -> CatalogPartReadWithStatus:
        """
        Create a new catalog part in the system.
        Optionally also create attached partner catalog parts - i.e. partner specific mappings of the catalog part.
        """
        # Validate the input data
        # Validate materials share
        if catalog_part_create.materials:
            total_share = sum(material.share for material in catalog_part_create.materials)
            # We only allow the share to be 0-100%
            if total_share < 0:
                raise ValueError("The share of materials can't be lower than 0%.")
            if total_share > 100:
                raise ValueError("The total share of materials can't be higher than 100%.")
        with RepositoryManagerFactory.create() as repos:
            
            # First check if the legal entity exists for the given manufacturer ID
            db_legal_entity = repos.legal_entity_repository.get_by_bpnl(catalog_part_create.manufacturer_id)
            if not db_legal_entity:
                logger.warning(f"Legal Entity with manufacturer BPNL '{catalog_part_create.manufacturer_id}' not found. Creating a new one!")
                db_legal_entity = repos.legal_entity_repository.create(
                    LegalEntity(bpnl=catalog_part_create.manufacturer_id)
                )
                repos.legal_entity_repository.commit()
            
            if not db_legal_entity:
                raise ValueError(f"Failed to create or retrieve the legal entity '{catalog_part_create.manufacturer_id}'")
            
            # Check if the business partner exists for the given manufacturer ID
            # Check if the catalog part already exists
            db_catalog_part = repos.catalog_part_repository.get_by_legal_entity_id_manufacturer_part_id(
                db_legal_entity.id, catalog_part_create.manufacturer_part_id
            )
            if db_catalog_part:
                raise ValueError("Catalog part already exists.")
            else:
                # Create the catalog part in the metadata database, using legal_entity_id as foreign key
                db_catalog_part = CatalogPart(
                    legal_entity_id=db_legal_entity.id,
                    **catalog_part_create.model_dump(by_alias=False)
                )
                repos.catalog_part_repository.create(db_catalog_part)
                repos.catalog_part_repository.commit()
                
            # Prepare the result object
            result = CatalogPartReadWithStatus(
                **catalog_part_create.model_dump(by_alias=True),
                status=0,  # Default status is draft
            )

            # Check if we already should create some customer part IDs for the given catalog part
            if catalog_part_create.customer_part_ids:
                for partner_catalog_part_create in catalog_part_create.customer_part_ids:
                    
                    # We need both the customer part ID and the name of the business partner
                    if not partner_catalog_part_create.customer_part_id:
                        raise ValueError("Customer part ID is required for a customer part mapping.")
                    
                    if not partner_catalog_part_create.business_partner_name:
                        raise ValueError("Business partner name is required for a customer part mapping.")
                    
                    # Resolve the business partner by name from the metadata database
                    db_business_partner = repos.business_partner_repository.get_by_name(partner_catalog_part_create.business_partner_name)
                    if not db_business_partner:
                        raise ValueError(f"Business partner '{partner_catalog_part_create.business_partner_name}' does not exist. Please create it first.")

                    # Create the partner catalog part entry in the metadata database
                    repos.partner_catalog_part_repository.create(PartnerCatalogPart(
                        business_partner_id=db_business_partner.id,
                        customer_part_id=partner_catalog_part_create.customer_part_id,
                        catalog_part_id=db_catalog_part.id
                    ))
                    # TODO: error handling (issue: if one customer part ID fails, all should fail???)

                    result.customer_part_ids[partner_catalog_part_create.customer_part_id] = BusinessPartnerRead(name = db_business_partner.name, bpnl = db_business_partner.bpnl)  

            return result

    def create_catalog_part_by_ids(self,
        manufacturer_id: str,
        manufacturer_part_id: str,
        name: str,
        category: Optional[str],
        bpns: Optional[str],
        customer_parts: Optional[List[PartnerCatalogPartBase]]) -> CatalogPartReadWithStatus:
          
        """Convenience method to create a catalog part by its IDs."""

        partner_catalog_parts = []
        for partner_catalog_part in customer_parts:
            partner_catalog_part = PartnerCatalogPartBase(
                customerPartId=partner_catalog_part.customer_part_id,
                businessPartnerName=partner_catalog_part.business_partner_name
            )
            partner_catalog_parts.append(partner_catalog_part)

        catalog_part_create = CatalogPartCreate(
            manufacturerId=manufacturer_id,
            manufacturerPartId=manufacturer_part_id,
            name=name,
            category=category,
            bpns=bpns,
            customerPartIds=partner_catalog_parts
        )

        # Create the catalog part, and return the catalog saved in the database
        result_catalog_part_read = self.create_catalog_part(catalog_part_create)

        return result_catalog_part_read


    def delete_catalog_part(self, catlog_part: CatalogPartDelete) -> None:
        """
        Delete a catalog part from the system.
        """
        # Logic to delete a catalog part
        pass

    def get_simple_catalog_parts(self, manufacturer_id: Optional[str] = None, manufacturer_part_id: Optional[str] = None) -> List[SimpleCatalogPartReadWithStatus]:
        with RepositoryManagerFactory.create() as repos:
            result = []
            
            db_catalog_parts: List[tuple[CatalogPart, int]] = repos.catalog_part_repository.find_by_manufacturer_id_manufacturer_part_id(
                manufacturer_id, manufacturer_part_id, join_partner_catalog_parts=True
            )
            
            if db_catalog_parts:
                for db_catalog_part, status in db_catalog_parts:
                    result.append(
                        SimpleCatalogPartReadWithStatus(
                            manufacturerId=db_catalog_part.legal_entity.bpnl,
                            manufacturerPartId=db_catalog_part.manufacturer_part_id,
                            name=db_catalog_part.name,
                            category=db_catalog_part.category,
                            bpns=db_catalog_part.bpns,
                            status=status
                        )
                    )
            
            return result

    def get_catalog_parts(self, manufacturer_id: Optional[str] = None, manufacturer_part_id: Optional[str] = None) -> List[CatalogPartReadWithStatus]:
        with RepositoryManagerFactory.create() as repos:
            result = []
            
            db_catalog_parts: List[tuple[CatalogPart, int]] = repos.catalog_part_repository.find_by_manufacturer_id_manufacturer_part_id(
                manufacturer_id, manufacturer_part_id, join_partner_catalog_parts=True
            )
            
            if db_catalog_parts:
                for db_catalog_part, status in db_catalog_parts:
                    result.append(
                        CatalogPartReadWithStatus(
                            manufacturerId=db_catalog_part.legal_entity.bpnl,
                            manufacturerPartId=db_catalog_part.manufacturer_part_id,
                            name=db_catalog_part.name,
                            category=db_catalog_part.category,
                            bpns=db_catalog_part.bpns,
                            materials=db_catalog_part.materials,
                            width=db_catalog_part.width,
                            height=db_catalog_part.height,
                            length=db_catalog_part.length,
                            weight=db_catalog_part.weight,
                            description=db_catalog_part.description,
                            customerPartIds={partner_catalog_part.customer_part_id: BusinessPartnerRead(
                                 name=partner_catalog_part.business_partner.name,
                                 bpnl=partner_catalog_part.business_partner.bpnl
                             ) for partner_catalog_part in db_catalog_part.partner_catalog_parts},
                            status=status
                        )
                    )
            
            return result
    
    
    def get_catalog_part(self, manufacturer_id: str, manufacturer_part_id: str) -> Optional[CatalogPartReadWithStatus]:
        """
        Retrieve a catalog part from the system.
        """

        part_list = self.get_catalog_parts(manufacturer_id, manufacturer_part_id)
        return part_list[0] if part_list else None

    def create_batch(self, batch_create: BatchCreate) -> BatchRead:
        """
        Create a new batch in the system.
        """
        
        # Logic to create a batch
        pass

    def delete_batch(self, batch: BatchRead) -> None:
        """
        Delete a batch from the system.
        """
        
        # Logic to delete a batch
        pass

    def get_batch(self, manufacturer_id: str, manufacturer_part_id: str, batch_id: str) -> BatchRead:
        """
        Retrieve a batch from the system.
        """
        
        # Logic to retrieve a batch
        pass

    def get_batches(self, manufacturer_id: str = None, manufacturer_part_id = None, batch_id: str = None) -> List[BatchRead]:
        """
        Retrieves batches from the system according to given parameters.
        """

        pass

    def create_serialized_part(self, serialized_part_create: SerializedPartCreate) -> SerializedPartRead:
        """
        Create a new serialized part in the system.
        """
        with RepositoryManagerFactory.create() as repos:
            
            # Get the business partner by BPNL from the metadata database
            db_business_partner = repos.business_partner_repository.get_by_bpnl(serialized_part_create.business_partner_number)
            if not db_business_partner:
                raise ValueError(f"Business partner with BPNL '{serialized_part_create.business_partner_number}' does not exist. Please create it first.")

            # Check if the legal entity exists for the given manufacturer ID
            db_legal_entity = repos.legal_entity_repository.get_by_bpnl(serialized_part_create.manufacturer_id)
            if not db_legal_entity:
                raise ValueError(f"Legal Entity with manufacturer BPNL '{serialized_part_create.manufacturer_id}' does not exist. Please create it first.")

            # Check if the corresponding catalog part already exists
            db_catalog_part = repos.catalog_part_repository.get_by_legal_entity_id_manufacturer_part_id(
                db_legal_entity.id, serialized_part_create.manufacturer_part_id
            )
            if not db_catalog_part:
                raise ValueError("Corresponding catalog part not existing.")

            # Get the partner catalog part for the given catalog part and business partner
            db_partner_catalog_part = repos.partner_catalog_part_repository.get_by_catalog_part_id_business_partner_id(
                db_catalog_part.id, db_business_partner.id
            )
            if not db_partner_catalog_part:
                raise ValueError("No partner catalog part found for the given catalog part and business partner.")

            # Check if the serialized part already exists
            db_serialized_part = repos.serialized_part_repository.get_by_partner_catalog_part_id_part_instance_id(
                db_partner_catalog_part.id, serialized_part_create.part_instance_id
            )
            if not db_serialized_part:
                # Create the serialized part in the metadata database
                db_serialized_part = repos.serialized_part_repository.create_new(
                    partner_catalog_part_id=db_partner_catalog_part.id,
                    part_instance_id=serialized_part_create.part_instance_id,
                    van=serialized_part_create.van,
                )
            
            return SerializedPartRead(
                manufacturerId=serialized_part_create.manufacturer_id,
                manufacturerPartId=serialized_part_create.manufacturer_part_id,
                partInstanceId=serialized_part_create.part_instance_id,
                customerPartId=db_partner_catalog_part.customer_part_id,
                businessPartner=BusinessPartnerRead(
                    name=db_business_partner.name,
                    bpnl=db_business_partner.bpnl
                ),
                van=serialized_part_create.van,
                name=db_catalog_part.name,
                description=db_catalog_part.description,
                category=db_catalog_part.category,
                bpns=db_catalog_part.bpns,
                materials=db_catalog_part.materials,
                width=db_catalog_part.width,
                height=db_catalog_part.height,
                length=db_catalog_part.length,
                weight=db_catalog_part.weight,
            )


    def delete_serialized_part(self, serialized_part: SerializedPartDelete) -> None:
        """
        Delete a serialized part from the system.
        """
        
        # Logic to delete a serialized part
        pass

    def get_serialized_part(self, manufacturer_id: str, manufacturer_part_id: str, part_instance_id: str) -> SerializedPartRead:
        """
        Retrieve a serialized part from the system.
        """
        
        # Logic to retrieve a serialized part
        pass

    def get_simple_serialized_parts(self, query: SerializedPartQuery = SerializedPartQuery()) -> List[SimpleSerializedPartRead]:
        """
        Retrieves serialized parts from the system according to given parameters.
        """
        with RepositoryManagerFactory.create() as repos:
            db_serialized_parts: List[SerializedPart] = repos.serialized_part_repository.find(
                manufacturer_id=query.manufacturer_id,
                manufacturer_part_id=query.manufacturer_part_id,
                part_instance_id=query.part_instance_id,
                business_partner_number=query.business_partner_number,
                customer_part_id=query.customer_part_id,
                van=query.van
            )

            result = []
            for db_serialized_part in db_serialized_parts:
                result.append(
                    SimpleSerializedPartRead(
                        manufacturerId=db_serialized_part.partner_catalog_part.catalog_part.legal_entity.bpnl,
                        manufacturerPartId=db_serialized_part.partner_catalog_part.catalog_part.manufacturer_part_id,
                        name=db_serialized_part.partner_catalog_part.catalog_part.name,
                        category=db_serialized_part.partner_catalog_part.catalog_part.category,
                        bpns=db_serialized_part.partner_catalog_part.catalog_part.bpns,
                        partInstanceId=db_serialized_part.part_instance_id,
                        customerPartId=db_serialized_part.partner_catalog_part.customer_part_id,
                        businessPartner=BusinessPartnerRead(
                            name=db_serialized_part.partner_catalog_part.business_partner.name,
                            bpnl=db_serialized_part.partner_catalog_part.business_partner.bpnl
                        ),
                        van=db_serialized_part.van
                    )
                )
            return result

    def create_jis_part(self, jis_part_create: JISPartCreate) -> JISPartRead:
        """
        Create a new JIS part in the system.
        """
        
        # Logic to create a JIS part
        pass

    def delete_jis_part(self, jis_part: JISPartDelete) -> None:
        """
        Delete a JIS part from the system.
        """
        
        # Logic to delete a JIS part
        pass

    def get_jis_part(self, manufacturer_id: str, manufacturer_part_id: str, jis_number: str) -> JISPartRead:
        """
        Retrieve a JIS part from the system.
        """
        
        # Logic to retrieve a JIS part
        pass

    def get_jis_parts(self, manufacturer_id: str = None, manufacturer_part_id: str = None, jis_number: str = None) -> List[JISPartRead]:
        """
        Retrieves JIS parts from the system according to given parameters.
        """
        
        # Logic to retrieve all JIS parts
        pass

    def create_partner_catalog_part_mapping(self, partner_catalog_part_create: PartnerCatalogPartCreate) -> CatalogPartRead:
        """
        Create a new partner catalog part in the system.
        """
        
        # Logic to create a partner catalog part
        pass

    def delete_partner_catalog_part_mapping(self, partner_catalog_part: PartnerCatalogPartDelete) -> CatalogPartRead:
        """
        Delete a partner catalog part from the system.
        """
        
        # Logic to delete a partner catalog part
        pass