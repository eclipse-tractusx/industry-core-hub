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

from typing import List, Optional

from models.services.provider.partner_management import BusinessPartnerCreate, BusinessPartnerRead, DataExchangeAgreementRead
from models.metadata_database.provider.models import BusinessPartner, DataExchangeAgreement
from managers.metadata_database.manager import RepositoryManagerFactory

class PartnerManagementService():
    """
    Service class for managing partners and exchange agreements.
    """

    def create_business_partner(self, partner_create: BusinessPartnerCreate) -> BusinessPartnerRead:
        """
        Create a new partner in the system.
        """
        with RepositoryManagerFactory.create() as repo:
            
            # First create the business partner entity
            db_partner = repo.business_partner_repository.create(BusinessPartner(
                name=partner_create.name,
                bpnl=partner_create.bpnl
            ))

            # Needed to get the generated ID from the database into the entity
            repo.commit()
            repo.refresh(db_partner)

            # Always create a default data exchange agreement for the partner
            # (TODO: to be replaced by an explicit API call in a later version)
            repo.data_exchange_agreement_repository.create(
                DataExchangeAgreement(
                    business_partner_id=db_partner.id,
                    name='Default'
                ))
            
            return BusinessPartnerRead(name=db_partner.name, bpnl=db_partner.bpnl)

    def get_business_partner(self, partner_number: str) -> Optional[BusinessPartnerRead]:
        """
        Retrieve a partner by its ID.
        """
        
        with RepositoryManagerFactory.create() as repo:
            db_partner = repo.business_partner_repository.get_by_bpnl(partner_number)
            return BusinessPartnerRead(name=db_partner.name, bpnl=db_partner.bpnl) if db_partner else None


    def delete_business_partner(self, partner_name: str) -> bool:
        """
        Delete a partner from the system.
        """
        # Logic to delete a partner
        pass

    def list_business_partners(self) -> List[BusinessPartnerRead]:
        """
        List all partners in the system.
        """
        with RepositoryManagerFactory.create() as repo:
            db_partners = repo.business_partner_repository.find_all()
            return [BusinessPartnerRead(name=bp.name, bpnl=bp.bpnl) for bp in db_partners]
        
    def get_data_exchange_agreements(self, partner_number: str) -> List[DataExchangeAgreementRead]:
        """
        List all data exchange agreements for a given partner.
        """
        with RepositoryManagerFactory.create() as repo:
            db_partner = repo.business_partner_repository.get_by_bpnl(partner_number)
            if not db_partner:
                return []
            
            db_agreements = repo.data_exchange_agreement_repository.get_by_business_partner_id(db_partner.id)
            return [DataExchangeAgreementRead(
                businessPartner=BusinessPartnerRead(name=db_partner.name, bpnl=db_partner.bpnl),
                name=agreement.name) for agreement in db_agreements]
