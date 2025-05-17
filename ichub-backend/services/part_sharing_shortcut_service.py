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

from .twin_management_service import TwinManagementService
from managers.submodels.submodel_document_generator import SubmodelDocumentGenerator, SEM_ID_PART_TYPE_INFORMATION_V1
from managers.metadata_database.manager import RepositoryManagerFactory
from models.services.twin_management import CatalogPartTwinCreate, CatalogPartTwinShare, TwinAspectCreate, CatalogPartTwinDetailsRead
from models.metadata_database.models import BusinessPartner, DataExchangeAgreement, EnablementServiceStack

class PartSharingShortcutService:
    """
    Service to handle part sharing shortcuts.
    """
    
    def __init__(self):
        self.submodel_document_generator = SubmodelDocumentGenerator()
        self.twin_management_service = TwinManagementService()

    def create_catalog_part_sharing_shortcut(self, create_input: CatalogPartTwinShare, auto_generate_part_type_information: bool = False) -> CatalogPartTwinDetailsRead:
        
        with RepositoryManagerFactory.create() as repo:
            # Step 1: Retrieve the catalog part entity according to the catalog part data (manufacturer_id, manufacturer_part_id)
            db_catalog_parts = repo.catalog_part_repository.find_by_manufacturer_id_manufacturer_part_id(
                create_input.manufacturer_id,
                create_input.manufacturer_part_id,
                join_partner_catalog_parts=True
            )
            if not db_catalog_parts:
                raise ValueError("Catalog part not found.")
            
            db_catalog_part = db_catalog_parts[0]

            # Step 2: Retrieve the enablement service stack entity from the DB according to the given name
            # (if not there => create it with the default name)
            db_enablement_service_stacks = repo.enablement_service_stack_repository.find_by_legal_entity_bpnl(create_input.manufacturer_id)
            if not db_enablement_service_stacks:
                # Legal entity must exist because the catalog part is already there
                db_legal_entity = repo.legal_entity_repository.get_by_bpnl(create_input.manufacturer_id)
                
                db_enablement_service_stack = repo.enablement_service_stack_repository.create(EnablementServiceStack(name = 'EDC/DTR Default', legal_entity_id=db_legal_entity.id))
                repo.commit()
                repo.refresh(db_enablement_service_stack)
            else:
                db_enablement_service_stack = db_enablement_service_stacks[0]
            
            # Step 3: Retrieve the business partner entity according to the business_partner_name
            # (if not there => create it)
            db_business_partner = repo.business_partner_repository.get_by_bpnl(create_input.business_partner_number)
            if not db_business_partner:
                # First create the business partner entity
                db_business_partner = repo.business_partner_repository.create(BusinessPartner(
                    name='Partner_' + create_input.business_partner_number,
                    bpnl=create_input.business_partner_number
                ))

                # Needed to get the generated ID from the database into the entity
                repo.commit()
                repo.refresh(db_business_partner)

            # Step 4: Retrieve the first data exchange agreement entity for the business partner
            # (if not there => create it with the default name)
            db_data_exchange_agreements = repo.data_exchange_agreement_repository.get_by_business_partner_id(
                db_business_partner.id
            )

            if not db_data_exchange_agreements:
                db_data_exchange_agreement = repo.data_exchange_agreement_repository.create(
                    DataExchangeAgreement(
                        business_partner_id=db_business_partner.id,
                        name='Default'
                    ))
                repo.commit()
                repo.refresh(db_data_exchange_agreement)
            else:
                db_data_exchange_agreement = db_data_exchange_agreements[0]
            

            # Step 5: Get the partner catalog part entity from the DB according to the catalog part and business partner
            # (if not there => create it was a generated customer part id)
            db_partner_catalog_part = repo.partner_catalog_part_repository.get_by_catalog_part_id_business_partner_id(
                business_partner_id=db_business_partner.id,
                catalog_part_id=db_catalog_part.id
            )
            if not db_partner_catalog_part:
                db_partner_catalog_part = repo.partner_catalog_part_repository.create_new(
                    catalog_part_id=db_catalog_part.id,
                    business_partner_id=db_business_partner.id,
                    customer_part_id=db_business_partner.bpnl + '_' + db_catalog_part.manufacturer_part_id,
                )
                repo.commit()
                repo.refresh(db_partner_catalog_part)

            # Step 6: Let the Twin Management Service create the catalog part twin
            # Then retrieve the twin from the DB
            twin_read = self.twin_management_service.create_catalog_part_twin(CatalogPartTwinCreate(
                manufacturerId=create_input.manufacturer_id,
                manufacturerPartId=create_input.manufacturer_part_id,
            ))
            db_twin = repo.twin_repository.find_by_global_id(twin_read.global_id)

            # Step 7: Check if there is already a twin exchange entity for the twin and data exchange agreement and create it if not
            db_twin_exchange = repo.twin_exchange_repository.get_by_twin_id_data_exchange_agreement_id(
                db_twin.id,
                db_data_exchange_agreement.id
            )
            if not db_twin_exchange:
                db_twin_exchange = repo.twin_exchange_repository.create_new(
                    twin_id=db_twin.id,
                    data_exchange_agreement_id=db_data_exchange_agreement.id
                )
                repo.commit()

            # Step 8: If specified, generate and upload the part type information submodel document
            if auto_generate_part_type_information:
                payload = self.submodel_document_generator.generate_part_type_information_v1(
                    global_id=db_twin.global_id,
                    manufacturer_part_id=create_input.manufacturer_part_id,
                    name=db_catalog_part.name,
                    bpns=db_catalog_part.bpns
                )

                self.twin_management_service.create_twin_aspect(TwinAspectCreate(
                    globalId=db_twin.global_id,
                    semanticId=SEM_ID_PART_TYPE_INFORMATION_V1,
                    payload=payload
                ))
            
            return self.twin_management_service.get_catalog_part_twin_details(db_twin.global_id)
