#################################################################################
# Eclipse Tractus-X - Industry Core Hub Backend
#
# Copyright (c) 2025 LKS Next
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
from uuid import UUID
from datetime import datetime, timezone

from managers.submodels.submodel_document_generator import SubmodelDocumentGenerator, SEM_ID_PART_TYPE_INFORMATION_V1, SEM_ID_SERIAL_PART_V3
from managers.metadata_database.manager import RepositoryManagerFactory, RepositoryManager
from managers.enablement_services.submodel_service_manager import SubmodelServiceManager
from models.services.provider.part_management import SerializedPartQuery
from models.services.provider.partner_management import BusinessPartnerRead, DataExchangeAgreementRead
from models.services.provider.twin_management import (
    CatalogPartTwinRead,
    CatalogPartTwinCreate,
    CatalogPartTwinShareCreate,
    CatalogPartTwinDetailsRead,
    SerializedPartTwinCreate,
    SerializedPartTwinRead,
    SerializedPartTwinShareCreate,
    SerializedPartTwinDetailsRead,
    TwinRead,
    TwinAspectCreate,
    TwinAspectRead,
    TwinAspectRegistration as SvcTwinAspectRegistration,
    TwinAspectRegistrationStatus,
    TwinsAspectRegistrationMode,
    TwinDetailsReadBase,
)
from models.metadata_database.provider.models import BusinessPartner, TwinAspect, TwinAspectRegistration, CatalogPart, Twin, TwinRegistry, ConnectorControlPlane
from tools.exceptions import InvalidError, NotFoundError, NotAvailableError

from managers.config.log_manager import LoggingManager

from .part_management_service import PartManagementService
from .system_management_service import SystemManagementService

logger = LoggingManager.get_logger(__name__)

CATALOG_DIGITAL_TWIN_TYPE = "PartType"
INSTANCE_DIGITAL_TWIN_TYPE = "PartInstance"

class TwinManagementService:
    """
    Service class for managing twin-related operations (CRUD and Twin sharing).
    """
    
    def __init__(self):
        self.submodel_document_generator = SubmodelDocumentGenerator()

    @staticmethod
    def _none_if_empty(value: Optional[str]) -> Optional[str]:
        """Return None if the given string is None, empty, or whitespace-only; otherwise the trimmed string."""
        if value is None:
            return None
        trimmed = str(value).strip()
        return trimmed if trimmed else None

    def create_catalog_part_twin(self,
        create_input: CatalogPartTwinCreate,
        auto_create_part_type_information: Optional[bool] = None,
        db_twin_registry_id: Optional[int] = None,
        db_connector_control_plane_id: Optional[int] = None) -> TwinRead:
        
        with RepositoryManagerFactory.create() as repo:
            # Step 1: Retrieve the catalog part entity according to the catalog part data (manufacturer_id, manufacturer_part_id)
            db_catalog_parts = repo.catalog_part_repository.find_by_manufacturer_id_manufacturer_part_id(
                create_input.manufacturer_id,
                create_input.manufacturer_part_id,
                join_partner_catalog_parts=True
            )
            if not db_catalog_parts:
                raise NotFoundError("Catalog part not found.")
            else:
                db_catalog_part, _ = db_catalog_parts[0]

            # Step 2: Retrieve the twin registry entity from the DB according to the given name
            db_twin_registry = TwinManagementService._get_digital_twin_registry(repo, db_twin_registry_id)

            # Step 3a: Load existing twin metadata from the DB (if there)
            if db_catalog_part.twin_id:
                db_twin = repo.twin_repository.find_by_id(db_catalog_part.twin_id)
                if not db_twin:
                    raise NotFoundError("Twin not found.")
            # Step 3b: If no twin was there, create it now in the DB (generating on demand a new global_id and dtr_aas_id)
            else:
                db_twin = repo.twin_repository.create_new(
                    global_id=create_input.global_id,
                    dtr_aas_id=create_input.dtr_aas_id)
                repo.commit()
                repo.refresh(db_twin)

                db_catalog_part.twin_id = db_twin.id
                repo.commit()

            # Step 4: Try to find the twin registration for the twin id and twin registry id
            # (if not there => create it now, setting the dtr_registered flag to False)
            db_twin_registration = repo.twin_registration_repository.get_by_twin_id_twin_registry_id(
                db_twin.id,
                db_twin_registry.id    
            )
            if not db_twin_registration:
                db_twin_registration = repo.twin_registration_repository.create_new(
                    twin_id=db_twin.id,
                    twin_registry_id=db_twin_registry.id
                )
                repo.commit()
                repo.refresh(db_twin_registration)

            # Step 6: Check the dtr_registered flag on the twin registration entity
            # (if True => we can skip the operation from here on => nothing to do)
            # (if False => we need to register the twin in the DTR using the industry core SDK, then
            #  update the twin registration entity with the dtr_registered flag to True)
            
            dtr_provider_manager = SystemManagementService.get_dtr_manager(db_twin_registry)
            
            customer_part_ids = {partner_catalog_part.customer_part_id: partner_catalog_part.business_partner.bpnl 
                                    for partner_catalog_part in db_catalog_part.partner_catalog_parts}
            
            _id_short = None
            if(create_input.id_short):
                _id_short = create_input.id_short
            elif db_catalog_part.name:
                _id_short = db_catalog_part.name

            # Normalize empty category to None for asset_type
            asset_type_value = None
            if db_catalog_part and getattr(db_catalog_part, 'category', None):
                _cat = str(db_catalog_part.category).strip()
                if _cat:
                    asset_type_value = _cat

            dtr_provider_manager.create_or_update_shell_descriptor(
                global_id=db_twin.global_id,
                aas_id=db_twin.aas_id,
                asset_kind="Type",
                display_name=db_catalog_part.name,
                description=db_catalog_part.description,
                id_short=_id_short,
                manufacturer_id=create_input.manufacturer_id,
                manufacturer_part_id=create_input.manufacturer_part_id,
                customer_part_ids=customer_part_ids,
                asset_type=asset_type_value,
                digital_twin_type=CATALOG_DIGITAL_TWIN_TYPE
            )

            db_twin_registration.dtr_registered = True
            repo.commit()
            
            ## Create part type information submodel when registering, if configured
            # TODO: This makes our API unclean - aspect creation should not be part of twin creation - should be moved to the frontend in future
            if auto_create_part_type_information:
                part_type_info_doc = self.submodel_document_generator.generate_part_type_information_v1(
                    global_id=db_twin.global_id,
                    manufacturer_part_id=create_input.manufacturer_part_id,
                    name=db_catalog_part.name,
                    bpns=db_catalog_part.bpns
                )

                self.create_twin_aspect(
                    TwinAspectCreate(
                        globalId= db_twin.global_id,
                        semanticId= SEM_ID_PART_TYPE_INFORMATION_V1,
                        payload= part_type_info_doc,
                    ),
                    db_twin_registry_id,
                    db_connector_control_plane_id                    
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
                    category=TwinManagementService._none_if_empty(db_catalog_part.category),
                    bpns=db_catalog_part.bpns,
                    customerPartIds={partner_catalog_part.customer_part_id: BusinessPartnerRead(
                        name=partner_catalog_part.business_partner.name,
                        bpnl=partner_catalog_part.business_partner.bpnl
                    ) for partner_catalog_part in db_catalog_part.partner_catalog_parts}
                )
                if include_data_exchange_agreements:
                    self._fill_shares(db_twin, twin_result)

                result.append(twin_result)
            
            return result

    def create_catalog_part_twin_share(self, catalog_part_share_input: CatalogPartTwinShareCreate) -> bool:
        
        with RepositoryManagerFactory.create() as repo:
            # Step 1: Retrieve the catalog part entity according to the catalog part data (manufacturer_id, manufacturer_part_id)
            db_catalog_parts = repo.catalog_part_repository.find_by_manufacturer_id_manufacturer_part_id(
                catalog_part_share_input.manufacturer_id,
                catalog_part_share_input.manufacturer_part_id,
                join_partner_catalog_parts=True
            )
            if not db_catalog_parts:
                raise NotFoundError("Catalog part not found.")
            db_catalog_part, _ = db_catalog_parts[0]

            # Step 2: Retrieve the business partner entity according to the business_partner_name
            # (if not there => raise error)
            db_business_partner = repo.business_partner_repository.get_by_bpnl(catalog_part_share_input.business_partner_number)
            if not db_business_partner:
                raise NotFoundError(f"Business partner with number '{catalog_part_share_input.business_partner_number}' not found.")

            # Step 3a: Consistency check if there is a twin associated with the catalog part
            if not db_catalog_part.twin_id:
                raise NotFoundError("Catalog part has not yet a twin associated.")
            # Step 3b: Consistency check if there exists a partner catalog part entity for the given catalog part and business partner
            if not db_catalog_part.find_partner_catalog_part_by_bpnl(catalog_part_share_input.business_partner_number):
                raise NotFoundError(f"Not customer part ID existing for given business partner '{catalog_part_share_input.business_partner_number}'.")

            # Step 4: Retrieve the twin entity for the catalog part entity
            db_twin = repo.twin_repository.find_by_id(db_catalog_part.twin_id)
            if not db_twin:
                raise NotFoundError("Twin not found.")

            # Step 5: Create a twin exchange entity for the twin and business partner
            return self._create_twin_exchange(
                repo=repo,
                db_twin=db_twin,
                db_business_partner=db_business_partner
            )

    def create_serialized_part_twin(self,
        create_input: SerializedPartTwinCreate,
        auto_create_serial_part_aspect: Optional[bool] = False,
        db_twin_registry_id: Optional[int] = None,
        db_connector_control_plane_id: Optional[int] = None) -> TwinRead:

        with RepositoryManagerFactory.create() as repo:
            # Step 1: Retrieve the catalog part entity according to the catalog part data (manufacturer_id, manufacturer_part_id)
            db_serialized_parts = repo.serialized_part_repository.find(
                manufacturer_id=create_input.manufacturer_id,
                manufacturer_part_id=create_input.manufacturer_part_id,
                part_instance_id=create_input.part_instance_id,
            )
            if not db_serialized_parts:
                raise NotFoundError("Serialized Part not found.")
            else:
                db_serialized_part = db_serialized_parts[0]

            if not db_serialized_part.partner_catalog_part:
                raise NotAvailableError("Serialized Part is not linked to a Catalog Part of a Business Partner.")
            
            # Step 2: Retrieve the twin registry entity from the DB according to the given name
            db_twin_registry = TwinManagementService._get_digital_twin_registry(repo, db_twin_registry_id)
    
            # Step 3a: Load existing twin metadata from the DB (if there)
            if db_serialized_part.twin_id:
                db_twin = repo.twin_repository.find_by_id(db_serialized_part.twin_id)
                if not db_twin:
                    raise NotFoundError("Twin not found.")
            # Step 3b: If no twin was there, create it now in the DB (generating on demand a new global_id and dtr_aas_id)
            else:
                db_twin = repo.twin_repository.create_new(
                    global_id=create_input.global_id,
                    dtr_aas_id=create_input.dtr_aas_id)
                repo.commit()
                repo.refresh(db_twin)

                db_serialized_part.twin_id = db_twin.id
                repo.commit()

            # Step 4: Try to find the twin registration for the twin id and twin registry id
            # (if not there => create it now, setting the dtr_registered flag to False)
            db_twin_registration = repo.twin_registration_repository.get_by_twin_id_twin_registry_id(
                db_twin.id,
                db_twin_registry.id
            )
            if not db_twin_registration:
                db_twin_registration = repo.twin_registration_repository.create_new(
                    twin_id=db_twin.id,
                    twin_registry_id=db_twin_registry.id
                )
                repo.commit()

            # Step 6: Check the dtr_registered flag on the twin registration entity
            # (if True => we can skip the operation from here on => nothing to do)
            # (if False => we need to register the twin in the DTR using the industry core SDK, then
            #  update the twin registration entity with the dtr_registered flag to True)
            
            db_catalog_part = None
            if db_serialized_part.partner_catalog_part.catalog_part:
                db_catalog_part:CatalogPart = db_serialized_part.partner_catalog_part.catalog_part
                
            customer_part_ids = {db_serialized_part.partner_catalog_part.customer_part_id: db_serialized_part.partner_catalog_part.business_partner.bpnl}
                                    
            # Normalize empty category to None for asset_type
            asset_type_value = None
            if db_catalog_part and getattr(db_catalog_part, 'category', None):
                _cat = str(db_catalog_part.category).strip()
                if _cat:
                    asset_type_value = _cat

            dtr_provider_manager = SystemManagementService.get_dtr_manager(db_twin_registry)
                
            dtr_provider_manager.create_or_update_shell_descriptor(
                global_id=db_twin.global_id,
                aas_id=db_twin.aas_id,
                asset_kind="Instance",
                display_name=db_catalog_part.name if db_catalog_part else None,
                description=db_catalog_part.description if db_catalog_part else None,
                id_short=db_catalog_part.name if db_catalog_part else None,
                manufacturer_id=create_input.manufacturer_id,
                manufacturer_part_id=create_input.manufacturer_part_id,
                customer_part_ids=customer_part_ids,
                asset_type=asset_type_value,
                digital_twin_type=INSTANCE_DIGITAL_TWIN_TYPE,
                van=db_serialized_part.van,
                part_instance_id=create_input.part_instance_id
            )

            db_twin_registration.dtr_registered = True
            repo.commit()

            ## Create serial part submodel when registering, if configured
            # TODO: This makes our API unclean - aspect creation should not be part of twin creation - should be moved to the frontend in future
            if auto_create_serial_part_aspect:
                serial_part_doc = self.submodel_document_generator.generate_serial_part_v3(
                    global_id=db_twin.global_id,
                    manufacturer_id=create_input.manufacturer_id,
                    manufacturer_part_id=create_input.manufacturer_part_id,
                    customer_part_id=db_serialized_part.partner_catalog_part.customer_part_id,
                    name=db_serialized_part.partner_catalog_part.catalog_part.name,
                    part_instance_id=create_input.part_instance_id,
                    van=db_serialized_part.van,
                    bpns=db_serialized_part.partner_catalog_part.catalog_part.bpns
                )

                self.create_twin_aspect(
                    TwinAspectCreate(
                        globalId=db_twin.global_id,
                        semanticId=SEM_ID_SERIAL_PART_V3,
                        payload=serial_part_doc
                    ),
                    db_twin_registry_id,
                    db_connector_control_plane_id
                )

            return TwinRead(
                globalId=db_twin.global_id,
                dtrAasId=db_twin.aas_id,
                createdDate=db_twin.created_date,
                modifiedDate=db_twin.modified_date
            )

    def get_serialized_part_twins(self,
        serialized_part_query: SerializedPartQuery = SerializedPartQuery(),
        global_id: Optional[UUID] = None,
        include_data_exchange_agreements: bool = False) -> List[SerializedPartTwinRead]:
        
        with RepositoryManagerFactory.create() as repo:
            db_twins = repo.twin_repository.find_serialized_part_twins(
                manufacturer_id=serialized_part_query.manufacturer_id,
                manufacturer_part_id=serialized_part_query.manufacturer_part_id,
                part_instance_id=serialized_part_query.part_instance_id,
                van=serialized_part_query.van,
                customer_part_id=serialized_part_query.customer_part_id,
                business_partner_number=serialized_part_query.business_partner_number,
                global_id=global_id,
                include_data_exchange_agreements=include_data_exchange_agreements
            )
            
            result = []
            for db_twin in db_twins:
                twin_result = TwinManagementService._build_serialized_part_twin(db_twin)
                if include_data_exchange_agreements:
                    self._fill_shares(db_twin, twin_result)
                result.append(twin_result)
            
            return result

    def get_serialized_part_twin_details(self, global_id: UUID) -> Optional[SerializedPartTwinDetailsRead]:
        with RepositoryManagerFactory.create() as repo:
            db_twins = repo.twin_repository.find_serialized_part_twins(
                global_id=global_id,
                include_data_exchange_agreements=True,
                include_aspects=True,
                include_registrations=True,
                include_all_partner_catalog_parts=True
            )
            if not db_twins:
                return None
            
            db_twin = db_twins[0]
            
            twin_result: SerializedPartTwinDetailsRead = TwinManagementService._build_serialized_part_twin(db_twin, details=True) # type: ignore

            PartManagementService.fill_customer_part_ids(db_twin.serialized_part.partner_catalog_part.catalog_part, twin_result)
            self._fill_shares(db_twin, twin_result)
            self._fill_registrations(db_twin, twin_result)
            self._fill_aspects(db_twin, twin_result)

            return twin_result
    
    def create_serialized_part_twin_share(self, serialized_part_share_input: SerializedPartTwinShareCreate) -> bool:
        
        with RepositoryManagerFactory.create() as repo:
            # Step 1: Retrieve the serialized part entity according to the serialized part data (manufacturer_id, manufacturer_part_id, part_instance_id)
            db_serialized_parts = repo.serialized_part_repository.find(
                manufacturer_id=serialized_part_share_input.manufacturer_id,
                manufacturer_part_id=serialized_part_share_input.manufacturer_part_id,
                part_instance_id=serialized_part_share_input.part_instance_id,
            )
            if not db_serialized_parts:
                raise NotFoundError("Serialized part not found.")
            else:
                db_serialized_part = db_serialized_parts[0]

            # Step 2: Retrieve the business partner entity from the part
            db_business_partner = db_serialized_part.partner_catalog_part.business_partner

            # Step 3a: Consistency check if there is a twin associated with the catalog part
            if not db_serialized_part.twin_id:
                raise NotFoundError("Serialized part has not yet a twin associated.")

            # Step 4: Retrieve the twin entity for the catalog part entity
            db_twin = repo.twin_repository.find_by_id(db_serialized_part.twin_id)
            if not db_twin:
                raise NotFoundError("Twin not found.")

            # Step 5: Create a twin exchange entity for the twin and business partner
            return self._create_twin_exchange(
                repo=repo,
                db_twin=db_twin,
                db_business_partner=db_business_partner
            )

    def get_twin_registrations(self, global_id: UUID) -> Dict[int, bool]:
        """
        Get the twin registrations for a given twin global ID.
        Returns a dictionary mapping twin registry IDs to their DTR registration status.
        """

        with RepositoryManagerFactory.create() as repo:
            db_twin = repo.twin_repository.find_by_global_id(global_id, include_registrations=True)
            if not db_twin:
                raise NotFoundError(f"Twin for global ID '{global_id}' not found.")

            return {
                db_twin_registration.twin_registry_id: db_twin_registration.dtr_registered
                for db_twin_registration in db_twin.twin_registrations
            }

    def create_twin_aspect(self,
        twin_aspect_create: TwinAspectCreate,
        db_twin_registry_id: Optional[int] = None,
        db_connector_control_plane_id: Optional[int] = None) -> TwinAspectRead:
        """
        Create a new twin aspect for a give twin.
        """

        with RepositoryManagerFactory.create() as repo:
            
            # Step 1: Retrieve the twin entity according to the global_id
            db_twin = repo.twin_repository.find_by_global_id(twin_aspect_create.global_id, include_registrations=True)
            if not db_twin:
                raise NotFoundError(f"Twin for global ID '{twin_aspect_create.global_id}' not found.")

            # Step 1a: Get associated manufacturer id
            manufacturer_id = self._get_manufacturer_id_from_twin(db_twin)

            # Step 2a: Retrieve the twin registry entity from the DB according to the given name
            db_twin_registry = TwinManagementService._get_digital_twin_registry(repo, db_twin_registry_id)

            # Step 2b: Retrieve the connector control plane entity from the DB according to the given name
            db_connector_control_plane = TwinManagementService._get_connector_control_plane(
                repo, db_connector_control_plane_id, join_legal_entity=True
            )
           
            # Check if there is a twin_registration for the given twin registry and throw an error if not
            if not any(reg.twin_registry_id == db_twin_registry.id for reg in db_twin.twin_registrations):
                raise NotFoundError(f"Twin registration for twin registry ID '{db_twin_registry.id}' not found.")

            # Consistency check of the manufacturer id with the connector control plane
            if manufacturer_id != db_connector_control_plane.legal_entity.bpnl:
                raise InvalidError(f"Manufacturer ID '{manufacturer_id}' does not match with connector control plane's manufacturer ID '{db_connector_control_plane.legal_entity.bpnl}'.")

            # Step 3: Retrieve a potentially existing twin aspect entity for the given twin_id and semantic_id
            db_twin_aspect = repo.twin_aspect_repository.get_by_twin_id_semantic_id(
                db_twin.id,
                twin_aspect_create.semantic_id,
                include_registrations=True
            )
            if not db_twin_aspect:
                # Step 3a: Create a new twin aspect entity in the database
                db_twin_aspect = self._create_twin_aspect_entity_db(twin_aspect_create, repo, db_twin)

            # Step 4: Check if there is already a registration for the given twin registry and create it if not
            db_twin_aspect_registration = self._get_or_create_twin_aspect_registration(
                repo, db_twin_aspect, db_twin_registry, db_connector_control_plane
            )

            # Step 4b: Ensure DTR asset is registered
            # TODO: make this a more explicit operation out of System Management Service
            SystemManagementService.ensure_dtr_asset_registration()

            # Step 5: Handle the submodel service
            self._handle_submodel_service_upload(
                repo, db_twin_aspect_registration, db_twin_aspect, db_connector_control_plane, twin_aspect_create
            )
            
            # Step 6: Handle the EDC registration
            asset_id = self._handle_edc_registration(repo, db_twin_aspect_registration, db_twin_aspect)
            
            # Step 7: Handle the DTR registration
            self._handle_dtr_registration(repo, db_twin_aspect_registration, db_twin, db_twin_aspect, asset_id)

            return self._create_twin_aspect_read_response(db_twin_aspect, db_twin_registry, db_connector_control_plane, db_twin_aspect_registration)
        
    def create_or_update_twin_aspect_not_default(self,
        twin_aspect_create: TwinAspectCreate,
        db_twin_registry_id: Optional[int] = None,
        db_connector_control_plane_id: Optional[int] = None) -> TwinAspectRead:
        """
        Create or update a twin aspect for a give twin without using the default Twin Registry and Connector Control Plane.
        """

        with RepositoryManagerFactory.create() as repo:
            
            # Step 1: Retrieve the twin entity according to the global_id
            db_twin = repo.twin_repository.find_by_global_id(twin_aspect_create.global_id)
            if not db_twin:
                raise NotFoundError(f"Twin for global ID '{twin_aspect_create.global_id}' not found.")

            # Step 2: Get associated manufacturer id
            manufacturer_id = self._get_manufacturer_id_from_twin(db_twin)

            # Step 3a: Retrieve the twin registry entity from the DB according to the given name
            db_twin_registry = TwinManagementService._get_digital_twin_registry(repo, db_twin_registry_id)

            # Step 3b: Retrieve the connector control plane entity from the DB according to the given name
            db_connector_control_plane = TwinManagementService._get_connector_control_plane(
                repo, db_connector_control_plane_id, join_legal_entity=True
            )

            # Consistency check of the manufacturer id with the connector control plane
            if manufacturer_id != db_connector_control_plane.legal_entity.bpnl:
                raise InvalidError(f"Manufacturer ID '{manufacturer_id}' does not match with connector control plane's manufacturer ID '{db_connector_control_plane.manufacturer_id}'.")
            
            # Step 4a: Create a new twin aspect entity in the database if a submodel_id is not provided
            if not twin_aspect_create.submodel_id:
                db_twin_aspect = self._create_twin_aspect_entity_db(twin_aspect_create, repo, db_twin)

            # Step 4b: Retrieve a potentially existing twin aspect entity for the given twin_id, semantic_id and submodel_id. If not found, create it. Otherwise, update it.
            else:
                db_twin_aspect = repo.twin_aspect_repository.get_by_twin_id_semantic_id_submodel_id(
                    db_twin.id,
                    twin_aspect_create.semantic_id,
                    twin_aspect_create.submodel_id
                )
                if not db_twin_aspect:
                    db_twin_aspect = self._create_twin_aspect_entity_db(twin_aspect_create, repo, db_twin)
                else:
                    # Update existing twin aspect
                    self._handle_submodel_service_update(
                        repo, db_twin_aspect.twin_aspect_registrations[0], db_twin_aspect, db_connector_control_plane, twin_aspect_create
                    )
                    repo.commit()
                    repo.refresh(db_twin_aspect)
                    return self._create_twin_aspect_read_response(db_twin_aspect, db_twin_registry, db_connector_control_plane, db_twin_aspect.twin_aspect_registrations[0])
            

            # Step 5a: Check if there is already a registration for the given Twin Registry stack and create it if not
            db_twin_aspect_registration = self._get_or_create_twin_aspect_registration(
                repo, db_twin_aspect, db_twin_registry, db_connector_control_plane
            )

            # Step 5b: Ensure DTR asset is registered
            # TODO: make this a more explicit operation out of System Management Service
            SystemManagementService.ensure_dtr_asset_registration()

            # Step 6: Handle the submodel service
            self._handle_submodel_service_upload(
                repo, db_twin_aspect_registration, db_twin_aspect, db_connector_control_plane,twin_aspect_create
            )
            
            # Step 7: Handle the EDC registration
            asset_id = self._handle_edc_registration(repo, db_twin_aspect_registration, db_twin_aspect)
            
            # Step 8: Handle the DTR registration
            self._handle_dtr_registration(repo, db_twin_aspect_registration, db_twin, db_twin_aspect, asset_id)

            return self._create_twin_aspect_read_response(db_twin_aspect, db_twin_registry, db_connector_control_plane, db_twin_aspect_registration)

    def _get_or_create_twin_aspect_registration(self, repo: RepositoryManager, db_twin_aspect: TwinAspect, db_twin_registry: TwinRegistry, db_connector_control_plane: ConnectorControlPlane) -> TwinAspectRegistration:
        """
        Get or create a twin aspect registration for the given Twin Registry and Connector Control Plane.
        """
        db_twin_aspect_registration = db_twin_aspect.find_registration_by_twin_registry_id(
            db_twin_registry.id
        )
        if not db_twin_aspect_registration:
            db_twin_aspect_registration = repo.twin_aspect_registration_repository.create_new(
                twin_aspect_id=db_twin_aspect.id,
                twin_registry_id=db_twin_registry.id,
                connector_control_plane_id=db_connector_control_plane.id,
                registration_mode=TwinsAspectRegistrationMode.DISPATCHED.value, 
            )
            repo.commit()
            repo.refresh(db_twin_aspect_registration)
            repo.refresh(db_twin_aspect)
        
        # Consistency check for the control plane
        elif db_twin_aspect_registration.connector_control_plane_id != db_connector_control_plane.id:
            raise InvalidError("Twin aspect registration already exists with a different Connector Control Plane.")
 
        return db_twin_aspect_registration

    def _handle_submodel_service_upload(self, repo: RepositoryManager, db_twin_aspect_registration: TwinAspectRegistration, db_twin_aspect: TwinAspect, db_connector_control_plane: ConnectorControlPlane, twin_aspect_create: TwinAspectCreate) -> None:
        """
        Handle the upload of the twin aspect payload to the submodel service.
        """
        if db_twin_aspect_registration.status < TwinAspectRegistrationStatus.STORED.value:
            submodel_service_manager = _create_submodel_service_manager()
            
            # Upload the payload to the submodel service
            submodel_service_manager.upload_twin_aspect_document(
                db_twin_aspect.submodel_id,
                db_twin_aspect.semantic_id,
                twin_aspect_create.payload
            )

            # Update the registration status to STORED
            db_twin_aspect_registration.status = TwinAspectRegistrationStatus.STORED.value
            repo.commit()
            repo.refresh(db_twin_aspect_registration)
    
    def _handle_submodel_service_update(self, repo: RepositoryManager, db_twin_aspect_registration: TwinAspectRegistration, db_twin_aspect: TwinAspect, db_connector_control_plane: ConnectorControlPlane, twin_aspect_create: TwinAspectCreate) -> None:
        """
        Handle the update of the twin aspect payload to the submodel service.
        """
        if db_twin_aspect_registration.status == TwinAspectRegistrationStatus.STORED.value:
            submodel_service_manager = _create_submodel_service_manager()
            
            # Update the payload to the submodel service
            submodel_service_manager.upload_twin_aspect_document(
                db_twin_aspect.submodel_id,
                db_twin_aspect.semantic_id,
                twin_aspect_create.payload
            )
            # Update the registration modified date
            db_twin_aspect_registration.modified_date = datetime.now(timezone.utc)
            repo.commit()
        else:
            raise NotAvailableError("Twin aspect document cannot be updated before it is stored in the submodel service.")

    def _handle_edc_registration(self, repo: RepositoryManager, db_twin_aspect_registration: TwinAspectRegistration, db_twin_aspect: TwinAspect) -> str:
        """
        Handle the EDC registration for the twin aspect and return the asset ID.
        """
        connector_manager_provider = SystemManagementService.get_connector_manager(db_twin_aspect_registration.connector_control_plane)

        asset_id, usage_policy_id, access_policy_id, contract_id = connector_manager_provider.register_submodel_bundle_circular_offer(
            semantic_id=db_twin_aspect.semantic_id
        )
        
        # Handle the EDC registration
        if asset_id and db_twin_aspect_registration.status < TwinAspectRegistrationStatus.EDC_REGISTERED.value:
            # Update the registration status to EDC_REGISTERED
            db_twin_aspect_registration.status = TwinAspectRegistrationStatus.EDC_REGISTERED.value
            repo.commit()
        
        return asset_id

    def _handle_dtr_registration(self, repo: RepositoryManager, db_twin_aspect_registration: TwinAspectRegistration, db_twin: Twin, db_twin_aspect: TwinAspect, asset_id: str) -> None:
        """
        Handle the DTR registration for the twin aspect.
        """
        dtr_provider_manager = SystemManagementService.get_dtr_manager(db_twin_aspect_registration.twin_registry)
        connector_provider_manager = SystemManagementService.get_connector_manager(db_twin_aspect_registration.connector_control_plane)

        if db_twin_aspect_registration.status < TwinAspectRegistrationStatus.DTR_REGISTERED.value:               
            href_url = f"{connector_provider_manager.connector_dataplane_hostname}{connector_provider_manager.connector_dataplane_public_path}"
            dsp_endpoint_url = f"{connector_provider_manager.connector_controlplane_hostname}{connector_provider_manager.connector_controlplane_catalog_path}"

            # Register the submodel in the DTR (if necessary)
            try:
                dtr_provider_manager.create_submodel_descriptor(
                    aas_id=db_twin.aas_id,
                    submodel_id=db_twin_aspect.submodel_id,
                    semantic_id=db_twin_aspect.semantic_id,
                    connector_asset_id=asset_id,
                    dsp_endpoint_url=dsp_endpoint_url,
                    href_url=href_url
                )
                # Update the registration status to DTR_REGISTERED only on success
                db_twin_aspect_registration.status = TwinAspectRegistrationStatus.DTR_REGISTERED.value
                repo.commit()
            except Exception as e:
                logger.error(f"Failed to create submodel descriptor: {e}")
                raise e  # Re-raise the exception to prevent twin creation from completing

    def _create_twin_aspect_read_response(self, db_twin_aspect: TwinAspect, db_twin_registry: TwinRegistry, db_connector_control_plane: ConnectorControlPlane, db_twin_aspect_registration: TwinAspectRegistration) -> TwinAspectRead:
        """
        Create and return the TwinAspectRead response object.
        """
        registration_data = SvcTwinAspectRegistration(
            status=TwinAspectRegistrationStatus(db_twin_aspect_registration.status),
            mode=TwinsAspectRegistrationMode(db_twin_aspect_registration.registration_mode),
            createdDate=db_twin_aspect_registration.created_date,
            modifiedDate=db_twin_aspect_registration.modified_date
        )
        
        return TwinAspectRead(
            semanticId=db_twin_aspect.semantic_id,
            submodelId=db_twin_aspect.submodel_id,
            registrations={db_twin_registry.name: registration_data}
        )

    def _create_twin_aspect_entity_db(self, twin_aspect_create: TwinAspectCreate, repo: RepositoryManager, db_twin: Twin) -> TwinAspect:
        db_twin_aspect = repo.twin_aspect_repository.create_new(
                    twin_id=db_twin.id,
                    semantic_id=twin_aspect_create.semantic_id,
                    submodel_id=twin_aspect_create.submodel_id
                )
        repo.commit()
        repo.refresh(db_twin_aspect)
        return db_twin_aspect
            
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
            return TwinManagementService._build_catalog_part_twin_details(db_twin=db_twin)
    
    def get_catalog_part_twin_details(self, manufacturer_id:str, manufacturer_part_id:str) -> Optional[CatalogPartTwinDetailsRead]:
        with RepositoryManagerFactory.create() as repo:
            db_twins = repo.twin_repository.find_catalog_part_twins(
                manufacturer_id=manufacturer_id,
                manufacturer_part_id=manufacturer_part_id,
                include_data_exchange_agreements=True,
                include_aspects=True,
                include_registrations=True
            )
            if not db_twins:
                return None
            
            db_twin = db_twins[0]
            return TwinManagementService._build_catalog_part_twin_details(db_twin=db_twin)

    @staticmethod
    def _build_catalog_part_twin_details(db_twin: Twin) -> Optional[CatalogPartTwinDetailsRead]:
            
        db_catalog_part = db_twin.catalog_part
        twin_result = CatalogPartTwinDetailsRead(
            globalId=db_twin.global_id,
            dtrAasId=db_twin.aas_id,
            createdDate=db_twin.created_date,
            modifiedDate=db_twin.modified_date,
            manufacturerId=db_catalog_part.legal_entity.bpnl,
            manufacturerPartId=db_catalog_part.manufacturer_part_id,
            name=db_catalog_part.name,
            category=TwinManagementService._none_if_empty(db_catalog_part.category),
            bpns=db_catalog_part.bpns,
            additionalContext=db_twin.additional_context,
            customerPartIds={partner_catalog_part.customer_part_id: BusinessPartnerRead(
                name=partner_catalog_part.business_partner.name,
                bpnl=partner_catalog_part.business_partner.bpnl
            ) for partner_catalog_part in db_catalog_part.partner_catalog_parts}
        )

        TwinManagementService._fill_shares(db_twin, twin_result)
        TwinManagementService._fill_registrations(db_twin, twin_result)
        TwinManagementService._fill_aspects(db_twin, twin_result)

        return twin_result

    @staticmethod
    def _build_serialized_part_twin(db_twin: Twin, details: bool = False) -> SerializedPartTwinRead | SerializedPartTwinDetailsRead:
        db_serialized_part = db_twin.serialized_part
        base_kwargs = {
            "globalId": db_twin.global_id,
            "dtrAasId": db_twin.aas_id,
            "createdDate": db_twin.created_date,
            "modifiedDate": db_twin.modified_date,
            "manufacturerId": db_serialized_part.partner_catalog_part.catalog_part.legal_entity.bpnl,
            "manufacturerPartId": db_serialized_part.partner_catalog_part.catalog_part.manufacturer_part_id,
            "name": db_serialized_part.partner_catalog_part.catalog_part.name,
            "category": TwinManagementService._none_if_empty(db_serialized_part.partner_catalog_part.catalog_part.category),
            "bpns": db_serialized_part.partner_catalog_part.catalog_part.bpns,
            "customerPartId": db_serialized_part.partner_catalog_part.customer_part_id,
            "businessPartner": BusinessPartnerRead(
            name=db_serialized_part.partner_catalog_part.business_partner.name,
            bpnl=db_serialized_part.partner_catalog_part.business_partner.bpnl
            ),
            "partInstanceId": db_serialized_part.part_instance_id,
            "van": db_serialized_part.van,
        }
        if details:
            details_kwargs = {
                "description": db_serialized_part.partner_catalog_part.catalog_part.description,
                "materials": db_serialized_part.partner_catalog_part.catalog_part.materials,
                "width": db_serialized_part.partner_catalog_part.catalog_part.width,
                "height": db_serialized_part.partner_catalog_part.catalog_part.height,
                "length": db_serialized_part.partner_catalog_part.catalog_part.length,
                "weight": db_serialized_part.partner_catalog_part.catalog_part.weight,
                "additionalContext": db_twin.additional_context,
            }
            base_kwargs.update(details_kwargs)
            return SerializedPartTwinDetailsRead(**base_kwargs)
        else:
            return SerializedPartTwinRead(**base_kwargs)

    @staticmethod
    def _fill_shares(db_twin: Twin, twin_result: TwinRead):
        twin_result.shares = [
            DataExchangeAgreementRead(
                name=db_twin_exchange.data_exchange_agreement.name,
                businessPartner=BusinessPartnerRead(
                    name=db_twin_exchange.data_exchange_agreement.business_partner.name,
                    bpnl=db_twin_exchange.data_exchange_agreement.business_partner.bpnl
                )
            ) for db_twin_exchange in db_twin.twin_exchanges
        ]

    @staticmethod   
    def _fill_registrations(db_twin: Twin, twin_result: TwinDetailsReadBase):
        twin_result.registrations = {
                db_twin_registration.twin_registry.name: db_twin_registration.dtr_registered
                    for db_twin_registration in db_twin.twin_registrations
            }

    @staticmethod
    def _fill_aspects(db_twin: Twin, twin_result: TwinDetailsReadBase):
        # Create TwinAspectRead objects for all aspects
        all_aspects = []
        aspects_by_semantic_id = {}
        
        for db_twin_aspect in db_twin.twin_aspects:
            # Build registrations dictionary separately
            registrations = {}
            for db_twin_aspect_registration in db_twin_aspect.twin_aspect_registrations:
                registration_data = SvcTwinAspectRegistration(
                    twinRegistryName=db_twin_aspect_registration.twin_registry.name,
                    connectorControlPlaneName=db_twin_aspect_registration.connector_control_plane.name,
                    status=TwinAspectRegistrationStatus(db_twin_aspect_registration.status),
                    mode=TwinsAspectRegistrationMode(db_twin_aspect_registration.registration_mode),
                    createdDate=db_twin_aspect_registration.created_date,
                    modifiedDate=db_twin_aspect_registration.modified_date
                )
                registrations[db_twin_aspect_registration.twin_registry.name] = registration_data
            
            aspect_read = TwinAspectRead(
                semanticId=db_twin_aspect.semantic_id,
                submodelId=db_twin_aspect.submodel_id,
                registrations=registrations
            )
            
            # Add to complete list
            all_aspects.append(aspect_read)
            
            # For backward compatibility, only keep the first aspect of each semantic type
            if db_twin_aspect.semantic_id not in aspects_by_semantic_id:
                aspects_by_semantic_id[db_twin_aspect.semantic_id] = aspect_read
        
        # Set both fields
        twin_result.all_aspects = all_aspects
        twin_result.aspects = aspects_by_semantic_id

    @staticmethod
    def _get_manufacturer_id_from_twin(db_twin: Twin) -> str:
        """
        Helper method to retrieve the manufacturer ID from a Twin object.
        """
        if db_twin.catalog_part:
            return db_twin.catalog_part.legal_entity.bpnl
        elif db_twin.serialized_part:
            return db_twin.serialized_part.partner_catalog_part.catalog_part.legal_entity.bpnl
        else:
            raise NotFoundError("Twin does not have a catalog part or serialized part associated.")

    @staticmethod
    def _create_twin_exchange(
        repo: RepositoryManager,
        db_twin: Twin,
        db_business_partner: BusinessPartner
    ) -> bool:
        
        # Step 1: Retrieve the first data exchange agreement entity for the business partner
        # (this will will later be replaced with an explicit mechanism choose a specific data exchange agreement)
        db_data_exchange_agreements = repo.data_exchange_agreement_repository.get_by_business_partner_id(
            db_business_partner.id
        )
        if not db_data_exchange_agreements:
            raise NotFoundError(f"No data exchange agreement found for business partner '{db_business_partner.bpnl}'.")
        db_data_exchange_agreement = db_data_exchange_agreements[0] # Get the first one for now
        
        # Step 2: Check if there is already a twin exchange entity for the twin and data exchange agreement and create it if not
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
        
    @staticmethod
    def _get_digital_twin_registry(repo: RepositoryManager, db_twin_registry_id: Optional[int] = None) -> TwinRegistry:
        """
        Helper method to retrieve the default digital twin registry from the database.
        """
        if db_twin_registry_id is None:
            result = repo.twin_registry_repository.get_default()
            if not result:
                raise NotFoundError("Default digital twin registry not found.")
            return result
        
        else:
            result = repo.twin_registry_repository.find_by_id(db_twin_registry_id)
            if not result:
                raise NotFoundError(f"Twin registry with ID '{db_twin_registry_id}' not found.")
            return result
    
    @staticmethod
    def _get_connector_control_plane(repo: RepositoryManager, db_connector_control_plane_id: Optional[int] = None, join_legal_entity: bool = False) -> ConnectorControlPlane:
        """
        Helper method to retrieve the default connector control plane from the database.
        """
        if db_connector_control_plane_id is None:
            result = repo.connector_control_plane_repository.get_default(join_legal_entity=join_legal_entity)
            if not result:
                raise NotFoundError("Default connector control plane not found.")
            return result
        
        else:
            result = repo.connector_control_plane_repository.get_by_id(db_connector_control_plane_id, join_legal_entity=join_legal_entity)
            if not result:
                raise NotFoundError(f"Connector control plane with ID '{db_connector_control_plane_id}' not found.")
            return result

def _create_submodel_service_manager(connection_settings: Optional[Dict[str, Any]] = None) -> SubmodelServiceManager:
    """
    Create a new instance of the SubmodelServiceManager class.
    """
    # TODO: later we can configure the manager via the settings from the DB here
    # TODO: !!!! design decision: do we allow only one submodel service ??? If no, we need to change to init logic to work with the DB params
    return SubmodelServiceManager()
