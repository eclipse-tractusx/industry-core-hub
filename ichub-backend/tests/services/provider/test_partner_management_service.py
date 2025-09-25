###############################################################
# Eclipse Tractus-X - Industry Core Hub Backend
#
# Copyright (c) 2025 LKS NEXT
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
# distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
# WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
# License for the specific language governing permissions and limitations
# under the License.
#
# SPDX-License-Identifier: Apache-2.0
###############################################################

import pytest
from unittest.mock import Mock, patch

from services.provider.partner_management_service import PartnerManagementService
from models.services.provider.partner_management import (
    BusinessPartnerCreate,
    BusinessPartnerRead,
    DataExchangeAgreementRead
)
from models.metadata_database.provider.models import BusinessPartner, DataExchangeAgreement


class TestPartnerManagementService:
    """Test suite for PartnerManagementService class."""

    def setup_method(self):
        """Set up test fixtures before each test method."""
        self.service = PartnerManagementService()

    @pytest.fixture
    def mock_repo(self):
        """Create mock repository manager."""
        repo = Mock()
        repo.business_partner_repository = Mock()
        repo.data_exchange_agreement_repository = Mock()
        repo.commit = Mock()
        repo.refresh = Mock()
        return repo

    @pytest.fixture
    def sample_business_partner_create(self):
        """Create sample business partner create object."""
        return BusinessPartnerCreate(
            name="Test Partner Company",
            bpnl="BPNL123456789012"
        )

    @pytest.fixture
    def sample_business_partner_db(self):
        """Create sample database business partner."""
        partner = Mock(spec=BusinessPartner)
        partner.id = 1
        partner.name = "Test Partner Company"
        partner.bpnl = "BPNL123456789012"
        return partner

    @pytest.fixture
    def sample_data_exchange_agreement_db(self):
        """Create sample database data exchange agreement."""
        agreement = Mock(spec=DataExchangeAgreement)
        agreement.id = 1
        agreement.business_partner_id = 1
        agreement.name = "Default"
        return agreement

    @patch('services.provider.partner_management_service.RepositoryManagerFactory.create')
    def test_create_business_partner_success(self, mock_repo_factory, mock_repo, sample_business_partner_create, sample_business_partner_db):
        """Test successful business partner creation."""
        # Arrange
        mock_repo_factory.return_value.__enter__.return_value = mock_repo
        mock_repo.business_partner_repository.create.return_value = sample_business_partner_db
        
        # Act
        result = self.service.create_business_partner(sample_business_partner_create)
        
        # Assert
        assert isinstance(result, BusinessPartnerRead)
        assert result.name == "Test Partner Company"
        assert result.bpnl == "BPNL123456789012"
        
        # Verify repository calls
        mock_repo.business_partner_repository.create.assert_called_once()
        mock_repo.commit.assert_called_once()
        mock_repo.refresh.assert_called_once_with(sample_business_partner_db)
        mock_repo.data_exchange_agreement_repository.create.assert_called_once()
        
        # Verify business partner creation arguments
        create_call_args = mock_repo.business_partner_repository.create.call_args[0][0]
        assert create_call_args.name == "Test Partner Company"
        assert create_call_args.bpnl == "BPNL123456789012"

    @patch('services.provider.partner_management_service.RepositoryManagerFactory.create')
    def test_create_business_partner_creates_default_agreement(self, mock_repo_factory, mock_repo, sample_business_partner_create, sample_business_partner_db):
        """Test that creating a business partner also creates a default data exchange agreement."""
        # Arrange
        mock_repo_factory.return_value.__enter__.return_value = mock_repo
        mock_repo.business_partner_repository.create.return_value = sample_business_partner_db
        
        # Act
        self.service.create_business_partner(sample_business_partner_create)
        
        # Assert
        mock_repo.data_exchange_agreement_repository.create.assert_called_once()
        
        # Verify data exchange agreement creation arguments
        agreement_call_args = mock_repo.data_exchange_agreement_repository.create.call_args[0][0]
        assert agreement_call_args.business_partner_id == sample_business_partner_db.id
        assert agreement_call_args.name == "Default"

    @patch('services.provider.partner_management_service.RepositoryManagerFactory.create')
    def test_get_business_partner_success(self, mock_repo_factory, mock_repo, sample_business_partner_db):
        """Test successful business partner retrieval."""
        # Arrange
        mock_repo_factory.return_value.__enter__.return_value = mock_repo
        mock_repo.business_partner_repository.get_by_bpnl.return_value = sample_business_partner_db
        
        # Act
        result = self.service.get_business_partner("BPNL123456789012")
        
        # Assert
        assert isinstance(result, BusinessPartnerRead)
        assert result.name == "Test Partner Company"
        assert result.bpnl == "BPNL123456789012"
        mock_repo.business_partner_repository.get_by_bpnl.assert_called_once_with("BPNL123456789012")

    @patch('services.provider.partner_management_service.RepositoryManagerFactory.create')
    def test_get_business_partner_not_found(self, mock_repo_factory, mock_repo):
        """Test business partner retrieval when partner not found."""
        # Arrange
        mock_repo_factory.return_value.__enter__.return_value = mock_repo
        mock_repo.business_partner_repository.get_by_bpnl.return_value = None
        
        # Act
        result = self.service.get_business_partner("BPNL999999999999")
        
        # Assert
        assert result is None
        mock_repo.business_partner_repository.get_by_bpnl.assert_called_once_with("BPNL999999999999")

    @patch('services.provider.partner_management_service.RepositoryManagerFactory.create')
    def test_list_business_partners_success(self, mock_repo_factory, mock_repo):
        """Test successful listing of all business partners."""
        # Arrange
        mock_repo_factory.return_value.__enter__.return_value = mock_repo
        
        partner1 = Mock(spec=BusinessPartner)
        partner1.name = "Partner One"
        partner1.bpnl = "BPNL111111111111"
        
        partner2 = Mock(spec=BusinessPartner)
        partner2.name = "Partner Two"
        partner2.bpnl = "BPNL222222222222"
        
        mock_repo.business_partner_repository.find_all.return_value = [partner1, partner2]
        
        # Act
        result = self.service.list_business_partners()
        
        # Assert
        assert len(result) == 2
        assert all(isinstance(partner, BusinessPartnerRead) for partner in result)
        
        assert result[0].name == "Partner One"
        assert result[0].bpnl == "BPNL111111111111"
        
        assert result[1].name == "Partner Two"
        assert result[1].bpnl == "BPNL222222222222"
        
        mock_repo.business_partner_repository.find_all.assert_called_once()

    @patch('services.provider.partner_management_service.RepositoryManagerFactory.create')
    def test_list_business_partners_empty_result(self, mock_repo_factory, mock_repo):
        """Test listing business partners when no partners exist."""
        # Arrange
        mock_repo_factory.return_value.__enter__.return_value = mock_repo
        mock_repo.business_partner_repository.find_all.return_value = []
        
        # Act
        result = self.service.list_business_partners()
        
        # Assert
        assert result == []
        mock_repo.business_partner_repository.find_all.assert_called_once()

    @patch('services.provider.partner_management_service.RepositoryManagerFactory.create')
    def test_get_data_exchange_agreements_success(self, mock_repo_factory, mock_repo, sample_business_partner_db, sample_data_exchange_agreement_db):
        """Test successful retrieval of data exchange agreements."""
        # Arrange
        mock_repo_factory.return_value.__enter__.return_value = mock_repo
        mock_repo.business_partner_repository.get_by_bpnl.return_value = sample_business_partner_db
        mock_repo.data_exchange_agreement_repository.get_by_business_partner_id.return_value = [sample_data_exchange_agreement_db]
        
        # Act
        result = self.service.get_data_exchange_agreements("BPNL123456789012")
        
        # Assert
        assert len(result) == 1
        assert isinstance(result[0], DataExchangeAgreementRead)
        assert result[0].name == "Default"
        assert result[0].business_partner.name == "Test Partner Company"
        assert result[0].business_partner.bpnl == "BPNL123456789012"
        
        mock_repo.business_partner_repository.get_by_bpnl.assert_called_once_with("BPNL123456789012")
        mock_repo.data_exchange_agreement_repository.get_by_business_partner_id.assert_called_once_with(sample_business_partner_db.id)

    @patch('services.provider.partner_management_service.RepositoryManagerFactory.create')
    def test_get_data_exchange_agreements_partner_not_found(self, mock_repo_factory, mock_repo):
        """Test data exchange agreements retrieval when business partner not found."""
        # Arrange
        mock_repo_factory.return_value.__enter__.return_value = mock_repo
        mock_repo.business_partner_repository.get_by_bpnl.return_value = None
        
        # Act
        result = self.service.get_data_exchange_agreements("BPNL999999999999")
        
        # Assert
        assert result == []
        mock_repo.business_partner_repository.get_by_bpnl.assert_called_once_with("BPNL999999999999")
        mock_repo.data_exchange_agreement_repository.get_by_business_partner_id.assert_not_called()

    @patch('services.provider.partner_management_service.RepositoryManagerFactory.create')
    def test_get_data_exchange_agreements_multiple_agreements(self, mock_repo_factory, mock_repo, sample_business_partner_db):
        """Test retrieval of multiple data exchange agreements for a partner."""
        # Arrange
        mock_repo_factory.return_value.__enter__.return_value = mock_repo
        mock_repo.business_partner_repository.get_by_bpnl.return_value = sample_business_partner_db
        
        agreement1 = Mock(spec=DataExchangeAgreement)
        agreement1.name = "Default"
        agreement1.business_partner_id = 1
        
        agreement2 = Mock(spec=DataExchangeAgreement)
        agreement2.name = "Custom Agreement"
        agreement2.business_partner_id = 1
        
        mock_repo.data_exchange_agreement_repository.get_by_business_partner_id.return_value = [agreement1, agreement2]
        
        # Act
        result = self.service.get_data_exchange_agreements("BPNL123456789012")
        
        # Assert
        assert len(result) == 2
        assert all(isinstance(agreement, DataExchangeAgreementRead) for agreement in result)
        
        assert result[0].name == "Default"
        assert result[1].name == "Custom Agreement"
        
        # Both should have the same business partner
        for agreement in result:
            assert agreement.business_partner.name == "Test Partner Company"
            assert agreement.business_partner.bpnl == "BPNL123456789012"

    @patch('services.provider.partner_management_service.RepositoryManagerFactory.create')
    def test_get_data_exchange_agreements_no_agreements(self, mock_repo_factory, mock_repo, sample_business_partner_db):
        """Test data exchange agreements retrieval when partner has no agreements."""
        # Arrange
        mock_repo_factory.return_value.__enter__.return_value = mock_repo
        mock_repo.business_partner_repository.get_by_bpnl.return_value = sample_business_partner_db
        mock_repo.data_exchange_agreement_repository.get_by_business_partner_id.return_value = []
        
        # Act
        result = self.service.get_data_exchange_agreements("BPNL123456789012")
        
        # Assert
        assert result == []
        mock_repo.business_partner_repository.get_by_bpnl.assert_called_once_with("BPNL123456789012")
        mock_repo.data_exchange_agreement_repository.get_by_business_partner_id.assert_called_once_with(sample_business_partner_db.id)

    def test_delete_business_partner_not_implemented(self):
        """Test that delete_business_partner is not yet implemented."""
        # Act
        result = self.service.delete_business_partner("Test Partner")
        
        # Assert
        assert result is None  # Method returns None as it's not implemented

    def test_service_initialization(self):
        """Test that the service can be initialized properly."""
        # Act
        service = PartnerManagementService()
        
        # Assert
        assert service is not None
        assert isinstance(service, PartnerManagementService)

    @patch('services.provider.partner_management_service.RepositoryManagerFactory.create')
    def test_repository_context_manager_usage(self, mock_repo_factory, mock_repo):
        """Test that repository context manager is used correctly."""
        # Arrange
        mock_repo_factory.return_value.__enter__.return_value = mock_repo
        mock_repo.business_partner_repository.find_all.return_value = []
        
        # Act
        self.service.list_business_partners()
        
        # Assert
        mock_repo_factory.return_value.__enter__.assert_called_once()
        mock_repo_factory.return_value.__exit__.assert_called_once()

    @patch('services.provider.partner_management_service.RepositoryManagerFactory.create')
    def test_business_partner_creation_data_types(self, mock_repo_factory, mock_repo, sample_business_partner_create):
        """Test that business partner creation uses correct data types."""
        # Arrange
        mock_repo_factory.return_value.__enter__.return_value = mock_repo
        mock_partner = Mock(spec=BusinessPartner)
        mock_partner.id = 1
        mock_partner.name = "Test Partner Company"
        mock_partner.bpnl = "BPNL123456789012"
        mock_repo.business_partner_repository.create.return_value = mock_partner
        
        # Act
        result = self.service.create_business_partner(sample_business_partner_create)
        
        # Assert
        # Verify that the created BusinessPartner object has correct attributes
        created_partner = mock_repo.business_partner_repository.create.call_args[0][0]
        assert isinstance(created_partner, BusinessPartner)
        assert isinstance(created_partner.name, str)
        assert isinstance(created_partner.bpnl, str)
        
        # Verify that the returned object is of correct type
        assert isinstance(result, BusinessPartnerRead)
        assert isinstance(result.name, str)
        assert isinstance(result.bpnl, str)
