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
from datetime import datetime, timezone
from managers.submodels.submodel_document_generator import SubmodelDocumentGenerator, SEM_ID_PART_TYPE_INFORMATION_V1
from managers.metadata_database.manager import RepositoryManagerFactory, RepositoryManager
from models.services.twin_management import CatalogPartTwinCreate, CatalogPartTwinShare, TwinAspectCreate, CatalogPartTwinDetailsRead, TwinAspectRead
from models.metadata_database.models import BusinessPartner, DataExchangeAgreement, EnablementServiceStack, CatalogPart, Twin, PartnerCatalogPart
from models.services.sharing_management import SharedPartBase, ShareCatalogPart
from models.services.partner_management import BusinessPartnerRead
from typing import Dict, Optional, List, Any, Tuple

from managers.config.log_manager import LoggingManager

logger = LoggingManager.get_logger(__name__)

class SharingService:
    """
    Service to handle part sharing shortcuts.
    """

    def __init__(self):
        self.submodel_document_generator = SubmodelDocumentGenerator()
        self.twin_management_service = TwinManagementService()

    def share_catalog_part(self, catalog_part_to_share: ShareCatalogPart) -> SharedPartBase:
        shared_at = datetime.now(timezone.utc)
        with RepositoryManagerFactory.create() as repo:
            # Step 1: Retrieve the catalog part from the repository
            db_catalog_part = self._get_catalog_part(repo, catalog_part_to_share)
            # Step 2: Get or create the enablement service stack for the manufacturer
            ## Note: this is not used at the moment
            db_enablement_service_stack = self._get_or_create_enablement_service_stack(repo, catalog_part_to_share)
            # Step 3: Get or create the business partner entity
            db_business_partner = self._get_or_create_business_partner(repo, catalog_part_to_share)
            # Step 4: Get or create the data exchange agreement for the business partner
            db_data_exchange_agreement = self._get_or_create_data_exchange_agreement(repo, db_business_partner)
            # Step 5: Get or create the partner catalog part
            db_partner_catalog_parts:Dict[str, BusinessPartnerRead] = self._get_or_create_partner_catalog_parts(repo, catalog_part_to_share.customer_part_id, db_catalog_part, db_business_partner)
            # Step 6: Create and retrieve the catalog part twin
            db_twin = self._create_and_get_twin(repo, catalog_part_to_share)
            # Step 7: Ensure a twin exchange exists between the twin and the data exchange agreement
            self._ensure_twin_exchange(repo, db_twin, db_data_exchange_agreement)
            # Step 8: Create the part twin aspect with part type information
            self._create_part_twin_aspect(db_twin, db_catalog_part, db_enablement_service_stack, catalog_part_to_share)
            # Step 9: Return the shared part information
            return SharedPartBase(
                businessPartnerNumber=catalog_part_to_share.business_partner_number,
                customerPartIds=db_partner_catalog_parts,
                sharedAt=shared_at,
                twin=self.twin_management_service.get_catalog_part_twin_details(db_twin.global_id)
            )

    def _get_catalog_part(self, repo: RepositoryManager, catalog_part_to_share: ShareCatalogPart) -> CatalogPart:
        """
        Retrieve a catalog part tuple and return the CatalogPart object.
        Raises:
            ValueError: If no catalog part is found.
        """
        db_catalog_parts: List[Tuple[CatalogPart, Any]] = repo.catalog_part_repository.find_by_manufacturer_id_manufacturer_part_id(
            catalog_part_to_share.manufacturer_id,
            catalog_part_to_share.manufacturer_part_id,
            join_partner_catalog_parts=True
        )
        if not db_catalog_parts:
            raise ValueError("Catalog part not found.")
        db_catalog_part, _ = db_catalog_parts[0]
        return db_catalog_part

    def _get_or_create_enablement_service_stack(self, repo: RepositoryManager, catalog_part_to_share: ShareCatalogPart) -> EnablementServiceStack:
        """
        Retrieve or create an EnablementServiceStack for the given manufacturer ID.
        """
        db_enablement_service_stacks = repo.enablement_service_stack_repository.find_by_legal_entity_bpnl(catalog_part_to_share.manufacturer_id)
        if not db_enablement_service_stacks:
            db_legal_entity = repo.legal_entity_repository.get_by_bpnl(catalog_part_to_share.manufacturer_id)
            db_enablement_service_stack = repo.enablement_service_stack_repository.create(
                EnablementServiceStack(name='EDC/DTR Default', legal_entity_id=db_legal_entity.id))
            repo.commit()
            repo.refresh(db_enablement_service_stack)
        else:
            db_enablement_service_stack = db_enablement_service_stacks[0]
        return db_enablement_service_stack

    def _get_or_create_business_partner(self, repo: RepositoryManager, catalog_part_to_share: ShareCatalogPart) -> BusinessPartner:
        """
        Retrieve or create a BusinessPartner for the given business partner number.
        """
        db_business_partner = repo.business_partner_repository.get_by_bpnl(catalog_part_to_share.business_partner_number)
        if not db_business_partner:
            db_business_partner = repo.business_partner_repository.create(BusinessPartner(
                name='Partner_' + catalog_part_to_share.business_partner_number,
                bpnl=catalog_part_to_share.business_partner_number
            ))
            repo.commit()
            repo.refresh(db_business_partner)
        return db_business_partner

    def _get_or_create_data_exchange_agreement(self, repo: RepositoryManager, db_business_partner: BusinessPartner) -> DataExchangeAgreement:
        """
        Retrieve or create a DataExchangeAgreement for the given business partner.
        """
        db_data_exchange_agreements = repo.data_exchange_agreement_repository.get_by_business_partner_id(db_business_partner.id)
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
        return db_data_exchange_agreement

    def _get_or_create_partner_catalog_parts(self, repo: RepositoryManager, customer_part_id: str, db_catalog_part: CatalogPart, db_business_partner: BusinessPartner) -> Dict[str, BusinessPartnerRead]:
        """
        Retrieve or create a single partner catalog part linking the catalog part and business partner for the given customer_part_id.
        If not provided or does not exist, create a personalized default one.
        Return a dictionary of customer_part_id -> BusinessPartnerRead.
        """
        # Create a reusable BusinessPartnerRead object
        bp_read = BusinessPartnerRead(
            name=db_business_partner.name,
            bpnl=db_business_partner.bpnl
        )

        partner_catalog_part: Optional[PartnerCatalogPart] = repo.partner_catalog_part_repository.get_by_catalog_part_id_business_partner_id(
            business_partner_id=db_business_partner.id,
            catalog_part_id=db_catalog_part.id
        )

        if partner_catalog_part and partner_catalog_part.customer_part_id == customer_part_id:
            return { customer_part_id: bp_read }

        if partner_catalog_part:
            # TODO: Very dangerous!!!! We might need to update thousands of twins in the DTR potentially
            # (in case e.g. there were already instance level parts created for that catalog part)
            logger.warning(f"A provider customer_part_id already exists in the database {partner_catalog_part.customer_part_id}, updating to the provided one {customer_part_id}")

        if not customer_part_id:
            customer_part_id = db_business_partner.bpnl + "_" + db_catalog_part.manufacturer_part_id

        self._create_or_update_partner_catalog_part(
            repo=repo,
            customer_part_id=customer_part_id,
            db_catalog_part=db_catalog_part,
            db_business_partner=db_business_partner
        )

        return { customer_part_id: bp_read }
    
    def _create_or_update_partner_catalog_part(self, repo: RepositoryManager, customer_part_id:str, db_catalog_part: CatalogPart, db_business_partner: BusinessPartner) -> PartnerCatalogPart:
        db_partner_catalog_part = repo.partner_catalog_part_repository.create_or_update(
            catalog_part_id=db_catalog_part.id,
            business_partner_id=db_business_partner.id,
            customer_part_id=customer_part_id,
        )
        repo.commit()
        repo.refresh(db_partner_catalog_part)
        return db_partner_catalog_part

    def _create_and_get_twin(self, repo: RepositoryManager, catalog_part_to_share: ShareCatalogPart) -> Twin:
        """
        Create a catalog part twin and retrieve its database representation.
        """
        twin_read = self.twin_management_service.create_catalog_part_twin(CatalogPartTwinCreate(
            manufacturerId=catalog_part_to_share.manufacturer_id,
            manufacturerPartId=catalog_part_to_share.manufacturer_part_id,
        ))
        db_twin = repo.twin_repository.find_by_global_id(twin_read.global_id)
        return db_twin

    def _ensure_twin_exchange(self, repo: RepositoryManager, db_twin: Twin, db_data_exchange_agreement: DataExchangeAgreement) -> None:
        """
        Ensure a twin exchange exists between the twin and data exchange agreement.
        Creates one if it does not exist.
        """
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

    def _create_part_twin_aspect(self,
        db_twin: Twin,
        db_catalog_part: CatalogPart,
        db_enablement_service_stack: EnablementServiceStack,
        catalog_part_to_share: ShareCatalogPart) -> TwinAspectRead:
        """
        Create a twin aspect representing the part type information for the catalog part twin.
        """
        payload = self.submodel_document_generator.generate_part_type_information_v1(
            global_id=db_twin.global_id,
            manufacturer_part_id=catalog_part_to_share.manufacturer_part_id,
            name=db_catalog_part.name,
            bpns=db_catalog_part.bpns
        )
        return self.twin_management_service.create_twin_aspect(
            twin_aspect_create=TwinAspectCreate(
                globalId=db_twin.global_id,
                semanticId=SEM_ID_PART_TYPE_INFORMATION_V1,
                payload=payload),
            enablement_service_stack_name=db_enablement_service_stack.name
        )
