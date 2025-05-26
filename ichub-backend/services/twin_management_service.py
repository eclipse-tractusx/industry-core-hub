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

from typing import Optional, Dict, Any, List
from uuid import UUID, uuid4
import json
from managers.submodels.submodel_document_generator import SubmodelDocumentGenerator, SEM_ID_PART_TYPE_INFORMATION_V1
from managers.config.config_manager import ConfigManager
from managers.metadata_database.manager import RepositoryManagerFactory, RepositoryManager
from managers.enablement_services.dtr_manager import DTRManager
from managers.enablement_services.connector_manager import ConnectorManager
from managers.enablement_services.submodel_service_manager import SubmodelServiceManager
from models.services.partner_management import BusinessPartnerRead, DataExchangeAgreementRead
from models.services.twin_management import (
    CatalogPartTwinRead,
    CatalogPartTwinCreate,
    CatalogPartTwinShare,
    CatalogPartTwinDetailsRead,
    TwinRead,
    TwinAspectCreate,
    TwinAspectRead,
    TwinAspectRegistration,
    TwinAspectRegistrationStatus,
    TwinsAspectRegistrationMode,
)
from models.metadata_database.models import Twin, EnablementServiceStack

from managers.config.log_manager import LoggingManager

logger = LoggingManager.get_logger(__name__)

CATALOG_DIGITAL_TWIN_TYPE = "PartType"

class TwinManagementService:
    """
    Service class for managing twin-related operations (CRUD and Twin sharing).
    """
    
    def __init__(self):
        self.submodel_document_generator = SubmodelDocumentGenerator()

    def get_or_create_enablement_stack(self, repo: RepositoryManager, manufacturer_id: str) -> EnablementServiceStack:
        """
        Retrieve or create an EnablementServiceStack for the given manufacturer ID.
        """
        
        db_enablement_service_stacks = repo.enablement_service_stack_repository.find_by_legal_entity_bpnl(legal_entity_bpnl=manufacturer_id)
        if not db_enablement_service_stacks:
            db_legal_entity = repo.legal_entity_repository.get_by_bpnl(bpnl=manufacturer_id)
            db_enablement_service_stack = repo.enablement_service_stack_repository.create(
                EnablementServiceStack(name=uuid4(), legal_entity_id=db_legal_entity.id))
            repo.commit()
            repo.refresh(db_enablement_service_stack)
        else:
            db_enablement_service_stack = db_enablement_service_stacks[0]
        return db_enablement_service_stack
    
    def create_catalog_part_twin(self, create_input: CatalogPartTwinCreate) -> TwinRead:
        with RepositoryManagerFactory.create() as repo:
            # Step 1: Retrieve the catalog part entity according to the catalog part data (manufacturer_id, manufacturer_part_id)
            db_catalog_parts = repo.catalog_part_repository.find_by_manufacturer_id_manufacturer_part_id(
                create_input.manufacturer_id,
                create_input.manufacturer_part_id,
                join_partner_catalog_parts=True
            )
            if not db_catalog_parts:
                raise ValueError("Catalog part not found.")
            else:
                db_catalog_part, _ = db_catalog_parts[0]

            # Step 2: Retrieve the enablement service stack entity from the DB according to the given name
            # (if not there => raise error)
            db_enablement_service_stack = self.get_or_create_enablement_stack(repo=repo, manufacturer_id=create_input.manufacturer_id)

            # Step 3a: Load existing twin metadata from the DB (if there)
            if db_catalog_part.twin_id:
                db_twin = repo.twin_repository.find_by_id(db_catalog_part.twin_id)
                if not db_twin:
                    raise ValueError("Twin not found.")
            # Step 3b: If no twin was there, create it now in the DB (generating on demand a new global_id and dtr_aas_id)
            else:
                db_twin = repo.twin_repository.create_new(
                    global_id=create_input.global_id,
                    dtr_aas_id=create_input.dtr_aas_id)
                repo.commit()
                repo.refresh(db_twin)

                db_catalog_part.twin_id = db_twin.id
                repo.commit()

            # Step 4: Try to find the twin registration for the twin id and enablement service stack id
            # (if not there => create it now, setting the dtr_registered flag to False)
            db_twin_registration = repo.twin_registration_repository.get_by_twin_id_enablement_service_stack_id(
                db_twin.id,
                db_enablement_service_stack.id
            )
            if not db_twin_registration:
                db_twin_registration = repo.twin_registration_repository.create_new(
                    twin_id=db_twin.id,
                    enablement_service_stack_id=db_enablement_service_stack.id
                )
                repo.commit()

            # Step 6: Check the dtr_registered flag on the twin registration entity
            # (if True => we can skip the operation from here on => nothing to do)
            # (if False => we need to register the twin in the DTR using the industry core SDK, then
            #  update the twin registration entity with the dtr_registered flag to True)
            
            dtr_manager = _create_dtr_manager(db_enablement_service_stack.connection_settings)
            
            customer_part_ids = {partner_catalog_part.customer_part_id: partner_catalog_part.business_partner.bpnl 
                                    for partner_catalog_part in db_catalog_part.partner_catalog_parts}
            
            dtr_manager.create_or_update_shell_descriptor(
                global_id=db_twin.global_id,
                aas_id=db_twin.aas_id,
                manufacturer_id=create_input.manufacturer_id,
                manufacturer_part_id=create_input.manufacturer_part_id,
                customer_part_ids=customer_part_ids,
                part_category=db_catalog_part.category,
                digital_twin_type=CATALOG_DIGITAL_TWIN_TYPE
            )

            db_twin_registration.dtr_registered = True
            
            ## Create submodel when registering
            self.create_twin_aspect_and_submodel(
                global_id=db_twin.global_id,
                manufacturer_part_id=create_input.manufacturer_part_id,
                name=db_catalog_part.name,
                bpns=db_catalog_part.bpns,
                manufacturer_id=create_input.manufacturer_id
            )
            
            return TwinRead(
                globalId=db_twin.global_id,
                dtrAasId=db_twin.aas_id,
                createdDate=db_twin.created_date,
                modifiedDate=db_twin.modified_date
            )

    def get_catalog_part_twins(self,
        manufacturer_id: Optional[str] = None,
        manufacturer_part_id: Optional[str] = None,
        include_data_exchange_agreements: bool = False) -> List[CatalogPartTwinRead]:
        
        with RepositoryManagerFactory.create() as repo:
            db_twins = repo.twin_repository.find_catalog_part_twins(
                manufacturer_id=manufacturer_id,
                manufacturer_part_id=manufacturer_part_id,
                include_data_exchange_agreements=include_data_exchange_agreements
            )
            
            result = []
            for db_twin in db_twins:
                db_catalog_part = db_twin.catalog_part
                twin_result = CatalogPartTwinRead(
                    globalId=db_twin.global_id,
                    dtrAasId=db_twin.aas_id,
                    createdDate=db_twin.created_date,
                    modifiedDate=db_twin.modified_date,
                    manufacturerId=db_catalog_part.legal_entity.bpnl,
                    manufacturerPartId=db_catalog_part.manufacturer_part_id,
                    name=db_catalog_part.name,
                    category=db_catalog_part.category,
                    bpns=db_catalog_part.bpns,
                    customerPartIds={partner_catalog_part.customer_part_id: BusinessPartnerRead(
                        name=partner_catalog_part.business_partner.name,
                        bpnl=partner_catalog_part.business_partner.bpnl
                    ) for partner_catalog_part in db_catalog_part.partner_catalog_parts}
                )
                if include_data_exchange_agreements:
                    twin_result.shares = [
                        DataExchangeAgreementRead(
                            name=db_twin_exchange.data_exchange_agreement.name,
                            businessPartner=BusinessPartnerRead(
                                name=db_twin_exchange.data_exchange_agreement.business_partner.name,
                                bpnl=db_twin_exchange.data_exchange_agreement.business_partner.bpnl
                            )
                        ) for db_twin_exchange in db_twin.twin_exchanges
                    ]


                result.append(twin_result)
            
            return result

    def create_catalog_part_twin_share(self, catalog_part_share_input: CatalogPartTwinShare) -> bool:
        
        with RepositoryManagerFactory.create() as repo:
            # Step 1: Retrieve the catalog part entity according to the catalog part data (manufacturer_id, manufacturer_part_id)
            db_catalog_parts = repo.catalog_part_repository.find_by_manufacturer_id_manufacturer_part_id(
                catalog_part_share_input.manufacturer_id,
                catalog_part_share_input.manufacturer_part_id,
                join_partner_catalog_parts=True
            )
            if not db_catalog_parts:
                raise ValueError("Catalog part not found.")
            db_catalog_part, _ = db_catalog_parts[0]

            # Step 2: Retrieve the business partner entity according to the business_partner_name
            # (if not there => raise error)
            db_business_partner = repo.business_partner_repository.get_by_bpnl(catalog_part_share_input.business_partner_number)
            if not db_business_partner:
                raise ValueError(f"Business partner with number '{catalog_part_share_input.business_partner_number}' not found.")

            # Step 3a: Consistency check if there is a twin associated with the catalog part
            if not db_catalog_part.twin_id:
                raise ValueError("Catalog part has not yet a twin associated.")
            # Step 3b: Consistency check if there exists a partner catalog part entity for the given catalog part and business partner
            if not db_catalog_part.find_partner_catalog_part_by_bpnl(catalog_part_share_input.business_partner_number):
                raise ValueError(f"Not customer part ID existing for given business partner '{catalog_part_share_input.business_partner_number}'.")

            # Step 4: Retrieve the twin entity for the catalog part entity
            db_twin = repo.twin_repository.find_by_id(db_catalog_part.twin_id)
            if not db_twin:
                raise ValueError("Twin not found.")

            # Step 5: Retrieve the first data exchange agreement entity for the business partner
            # (this will will later be replaced with an explicit mechanism choose a specific data exchange agreement)
            db_data_exchange_agreements = repo.data_exchange_agreement_repository.get_by_business_partner_id(
                db_business_partner.id
            )
            if not db_data_exchange_agreements:
                raise ValueError(f"No data exchange agreement found for business partner '{db_business_partner.name}'.")
            db_data_exchange_agreement = db_data_exchange_agreements[0] # Get the first one for now
            
            # Step 6: Check if there is already a twin exchange entity for the twin and data exchange agreement and create it if not
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
                return True
            else:
                return False
    
    def create_twin_aspect_and_submodel(self, global_id: str, manufacturer_part_id: str, name: str, bpns: str, manufacturer_id: str) -> TwinAspectRead:
        """
        Create a twin aspect representing part type information for the catalog part twin.
        """

        # TODO: in the future we need to remove the manufacturer id as a param and instead (re-)active the respective 
        # out-commented property in the input object 
        # (reason: there could be more than one enablement service stack for a manufacturer id - e.g. for supporting different
        #  Tractus-X versions in parallel)
        payload = self.submodel_document_generator.generate_part_type_information_v1(
            global_id=global_id,
            manufacturer_part_id=manufacturer_part_id,
            name=name,
            bpns=bpns
        )
        return self.create_twin_aspect(TwinAspectCreate(
            globalId=global_id,
            semanticId=SEM_ID_PART_TYPE_INFORMATION_V1,
            payload=payload
        ), manufacturer_id=manufacturer_id)
            
    def create_twin_aspect(self, twin_aspect_create: TwinAspectCreate, manufacturer_id:str) -> TwinAspectRead:
        """
        Create a new twin aspect for a give twin.
        """

        # TODO: in the future we need to remove the manufacturer id as a param and instead (re-)active the respective 
        # out-commented property in the input object 
        # (reason: there could be more than one enablement service stack for a manufacturer id - e.g. for supporting different
        #  Tractus-X versions in parallel)
        
        with RepositoryManagerFactory.create() as repo:
            
            # Step 1: Retrieve the twin entity according to the global_id
            db_twin = repo.twin_repository.find_by_global_id(twin_aspect_create.global_id)
            if not db_twin:
                raise ValueError(f"Twin for global ID '{twin_aspect_create.global_id}' not found.")

            # Step 2: Retrieve the enablement service stack entity from the DB according to the given name
            # (if not there => raise error)
            # Step 2: Retrieve the enablement service stack entity from the DB according to the given name
            # (if not there => raise error)
            db_enablement_service_stack = self.get_or_create_enablement_stack(repo=repo, manufacturer_id=manufacturer_id)
            
            # Step 3: Retrieve a potentially existing twin aspect entity for the given twin_id and semantic_id
            db_twin_aspect = repo.twin_aspect_repository.get_by_twin_id_semantic_id(
                db_twin.id,
                twin_aspect_create.semantic_id,
                include_registrations=True
            )
            if not db_twin_aspect:
                # Step 3a: Create a new twin aspect entity in the database
                db_twin_aspect = repo.twin_aspect_repository.create_new(
                    twin_id=db_twin.id,
                    semantic_id=twin_aspect_create.semantic_id,
                    submodel_id=twin_aspect_create.submodel_id
                )
                repo.commit()
                repo.refresh(db_twin_aspect)

            # Step 4: Check if there is already a registration for the given enablement service stack and create it if not
            db_twin_aspect_registration = db_twin_aspect.find_registration_by_stack_id(
                db_enablement_service_stack.id
            )
            if not db_twin_aspect_registration:
                db_twin_aspect_registration = repo.twin_aspect_registration_repository.create_new(
                    twin_aspect_id=db_twin_aspect.id,
                    enablement_service_stack_id=db_enablement_service_stack.id,
                    registration_mode=TwinsAspectRegistrationMode.DISPATCHED.value, 
                )
                repo.commit()
                repo.refresh(db_twin_aspect_registration)
                repo.refresh(db_twin_aspect)

            ## Step 4b: Check if there is created a asset for the digital twin registry.
            
            edc_manager = _create_connector_manager(db_enablement_service_stack.connection_settings)
            dtr_config = ConfigManager.get_config("digitalTwinRegistry")
            asset_config = dtr_config.get("asset_config")
            dtr_asset_id, _, _, _ = edc_manager.register_dtr_offer(
                base_dtr_url=dtr_config.get("hostname"),
                uri=dtr_config.get("uri"),
                api_path=dtr_config.get("apiPath"),
                dtr_policy_config=dtr_config.get("policy"),
                dct_type=asset_config.get("dct_type"),
                existing_asset_id=asset_config.get("existing_asset_id", None)
            )
            if(not dtr_asset_id):
                raise Exception("The Digital Twin Registry was not able to be registered, or was not found in the Connector!")

            # Step 5: Handle the submodel service
            if db_twin_aspect_registration.status < TwinAspectRegistrationStatus.STORED.value:
                submodel_service_manager = _create_submodel_service_manager(db_enablement_service_stack.connection_settings)
                
                # Step 5a: Upload the payload to the submodel service
                submodel_service_manager.upload_twin_aspect_document(
                    db_twin_aspect.submodel_id,
                    db_twin_aspect.semantic_id,
                    twin_aspect_create.payload
                )

                # Step 5b: Update the registration status to STORED
                db_twin_aspect_registration.status = TwinAspectRegistrationStatus.STORED.value
                repo.commit()

            # Step 6: Handle the EDC registration
            if db_twin_aspect_registration.status < TwinAspectRegistrationStatus.EDC_REGISTERED.value:
                
                # Step 6a: Register the aspect as asset in the EDC (if necessary) only submodel bundle allowed
                asset_id, usage_policy_id, access_policy_id, contract_id = edc_manager.register_submodel_bundle_circular_offer(
                    semantic_id=db_twin_aspect.semantic_id
                )

                # Step 6b: Update the registration status to EDC_REGISTERED
                db_twin_aspect_registration.status = TwinAspectRegistrationStatus.EDC_REGISTERED.value
                repo.commit()

            # Step 7: Handle the DTR registration
            if db_twin_aspect_registration.status < TwinAspectRegistrationStatus.DTR_REGISTERED.value:
                dtr_manager = _create_dtr_manager(db_enablement_service_stack.connection_settings)
                
                # Step 7a: Register the submodel in the DTR (if necessary)
                try:
                    dtr_manager.create_submodel_descriptor(
                        aas_id=db_twin.aas_id,
                        submodel_id=db_twin_aspect.submodel_id,
                        semantic_id=db_twin_aspect.semantic_id,
                        edc_asset_id=asset_id
                )
                except Exception as e:
                    logger.error("It was not possible to create the submodel descriptor")

                # Step 7b: Update the registration status to DTR_REGISTERED
                db_twin_aspect_registration.status = TwinAspectRegistrationStatus.DTR_REGISTERED.value
                repo.commit()

            return TwinAspectRead(
                semanticId=db_twin_aspect.semantic_id,
                submodelId=db_twin_aspect.submodel_id,

                registrations={
                    db_enablement_service_stack.name: TwinAspectRegistration(
                        enablementServiceStackName=db_enablement_service_stack.name,
                        status=TwinAspectRegistrationStatus(db_twin_aspect_registration.status),
                        mode=TwinsAspectRegistrationMode(db_twin_aspect_registration.registration_mode),
                        createdDate=db_twin_aspect_registration.created_date,
                        modifiedDate=db_twin_aspect_registration.modified_date
                    )
                }
            )
            
    def get_catalog_part_twin_details_id(self, global_id:UUID) -> Optional[CatalogPartTwinDetailsRead]:
        with RepositoryManagerFactory.create() as repo:
            db_twins = repo.twin_repository.find_catalog_part_twins(
                global_id=global_id,
                include_data_exchange_agreements=True,
                include_aspects=True,
                include_registrations=True
            )
            if not db_twins:
                return None
            
            db_twin = db_twins[0]
            return self.build_catalog_part_twin_details(db_twin=db_twin)
    
    def get_catalog_part_twin_details(self, manufacturerId:str, manufacturerPartId:str) -> Optional[CatalogPartTwinDetailsRead]:
        with RepositoryManagerFactory.create() as repo:
            db_twins = repo.twin_repository.find_catalog_part_twins(
                manufacturer_id=manufacturerId,
                manufacturer_part_id=manufacturerPartId,
                include_data_exchange_agreements=True,
                include_aspects=True,
                include_registrations=True
            )
            if not db_twins:
                return None
            
            db_twin = db_twins[0]
            return self.build_catalog_part_twin_details(db_twin=db_twin)
        
    
    def build_catalog_part_twin_details(self, db_twin: Twin) -> Optional[CatalogPartTwinDetailsRead]:
            
            db_catalog_part = db_twin.catalog_part
            twin_result = CatalogPartTwinDetailsRead(
                globalId=db_twin.global_id,
                dtrAasId=db_twin.aas_id,
                createdDate=db_twin.created_date,
                modifiedDate=db_twin.modified_date,
                manufacturerId=db_catalog_part.legal_entity.bpnl,
                manufacturerPartId=db_catalog_part.manufacturer_part_id,
                name=db_catalog_part.name,
                category=db_catalog_part.category,
                bpns=db_catalog_part.bpns,
                additionalContext=db_twin.additional_context,
                customerPartIds={partner_catalog_part.customer_part_id: BusinessPartnerRead(
                    name=partner_catalog_part.business_partner.name,
                    bpnl=partner_catalog_part.business_partner.bpnl
                ) for partner_catalog_part in db_catalog_part.partner_catalog_parts}
            )

            twin_result.shares = [
                DataExchangeAgreementRead(
                    name=db_twin_exchange.data_exchange_agreement.name,
                    businessPartner=BusinessPartnerRead(
                        name=db_twin_exchange.data_exchange_agreement.business_partner.name,
                        bpnl=db_twin_exchange.data_exchange_agreement.business_partner.bpnl
                    )
                ) for db_twin_exchange in db_twin.twin_exchanges
            ]

            twin_result.registrations = {
                db_twin_registration.enablement_service_stack.name: db_twin_registration.dtr_registered
                    for db_twin_registration in db_twin.twin_registrations
            }

            twin_result.aspects = {
                db_twin_aspect.semantic_id: TwinAspectRead(
                    semanticId=db_twin_aspect.semantic_id,
                    submodelId=db_twin_aspect.submodel_id,
                    registrations={
                        db_twin_aspect_registration.enablement_service_stack.name: TwinAspectRegistration(
                            enablementServiceStackName=db_twin_aspect_registration.enablement_service_stack.name,
                            status=TwinAspectRegistrationStatus(db_twin_aspect_registration.status),
                            mode=TwinsAspectRegistrationMode(db_twin_aspect_registration.registration_mode),
                            createdDate=db_twin_aspect_registration.created_date,
                            modifiedDate=db_twin_aspect_registration.modified_date
                        ) for db_twin_aspect_registration in db_twin_aspect.twin_aspect_registrations
                    } 
                ) for db_twin_aspect in db_twin.twin_aspects
            }

            return twin_result


def _create_dtr_manager(connection_settings: Optional[Dict[str, Any]]) -> DTRManager:
    """
    Create a new instance of the DTRManager class.
    """
    # TODO: later we can configure the manager via the connection settings from the DB here
    # For now we take the values from the config file
    dtr_hostname = ConfigManager.get_config('digitalTwinRegistry.hostname')
    dtr_uri = ConfigManager.get_config('digitalTwinRegistry.uri')
    dtr_lookup_uri = ConfigManager.get_config('digitalTwinRegistry.lookupUri')
    dtr_api_path = ConfigManager.get_config('digitalTwinRegistry.apiPath')
    dtr_url = f"{dtr_hostname}{dtr_uri}"
    dtr_lookup_url = f"{dtr_hostname}{dtr_lookup_uri}"

    return DTRManager(
        dtr_url=dtr_url, dtr_lookup_url=dtr_lookup_url,
        api_path=str(dtr_api_path))

def _create_connector_manager(connection_settings: Optional[Dict[str, Any]]) -> ConnectorManager:
    """
    Create a new instance of the EDCManager class.
    """
    # TODO: later we can configure the manager via the connection settings from the DB here
    return ConnectorManager()

def _create_submodel_service_manager(connection_settings: Optional[Dict[str, Any]]) -> SubmodelServiceManager:
    """
    Create a new instance of the SubmodelServiceManager class.
    """
    # TODO: later we can configure the manager via the connection settings from the DB here
    return SubmodelServiceManager()