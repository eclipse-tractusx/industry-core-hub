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
from datetime import datetime, timezone
import uuid

# Mock the problematic imports before importing the actual service
with patch.dict('sys.modules', {
    'tractusx_sdk.dataspace.services.connector': Mock(),
    'managers.enablement_services.connector_manager': Mock(),
    'services.provider.twin_management_service': Mock(),
    'tools.submodel_document_generator': Mock(),
    'managers.metadata_database.repository_manager_factory': Mock(),
}):
    from services.provider.sharing_service import SharingService
from models.services.provider.sharing_management import ShareCatalogPart
from models.metadata_database.provider.models import (
    BusinessPartner, 
    Twin, 
    DataExchangeAgreement, 
    CatalogPart, 
    PartnerCatalogPart
)
from tools.exceptions import NotFoundError


class TestSharingService:
    """Test suite for SharingService class."""

    def setup_method(self):
        """Set up test fixtures before each test method."""
        self.service = SharingService()

    @pytest.fixture
    def mock_repo(self):
        """Create mock repository manager."""
        repo = Mock()
        repo.catalog_part_repository = Mock()
        repo.business_partner_repository = Mock()
        repo.data_exchange_agreement_repository = Mock()
        repo.partner_catalog_part_repository = Mock()
        repo.twin_repository = Mock()
        repo.twin_exchange_repository = Mock()
        repo.commit = Mock()
        repo.refresh = Mock()
        return repo

    @pytest.fixture
    def sample_share_catalog_part(self):
        """Create sample ShareCatalogPart object."""
        return ShareCatalogPart(
            manufacturerId="BPNL123456789012",
            manufacturerPartId="PART001",
            businessPartnerNumber="BPNL987654321098",
            customerPartId="CUST001",
            twinRegistryName="TestRegistry",
            connectorControlPlaneName="TestControlPlane"
        )

    @pytest.fixture
    def sample_catalog_part_db(self):
        """Create sample database catalog part."""
        catalog_part = Mock(spec=CatalogPart)
        catalog_part.id = 1
        catalog_part.manufacturer_part_id = "PART001"
        catalog_part.name = "Test Part"
        catalog_part.bpns = "BPNS123456789012"
        return catalog_part

    @pytest.fixture
    def sample_business_partner_db(self):
        """Create sample database business partner."""
        partner = Mock(spec=BusinessPartner)
        partner.id = 1
        partner.name = "Test Partner Company"
        partner.bpnl = "BPNL987654321098"
        return partner

    @pytest.fixture
    def sample_data_exchange_agreement_db(self):
        """Create sample database data exchange agreement."""
        agreement = Mock(spec=DataExchangeAgreement)
        agreement.id = 1
        agreement.business_partner_id = 1
        agreement.name = "Default"
        return agreement

    @pytest.fixture
    def sample_twin_db(self):
        """Create sample database twin."""
        twin = Mock(spec=Twin)
        twin.id = 1
        twin.global_id = uuid.uuid4()
        return twin

    @pytest.fixture
    def sample_partner_catalog_part_db(self):
        """Create sample database partner catalog part."""
        partner_catalog_part = Mock(spec=PartnerCatalogPart)
        partner_catalog_part.id = 1
        partner_catalog_part.catalog_part_id = 1
        partner_catalog_part.business_partner_id = 1
        partner_catalog_part.customer_part_id = "CUST001"
        return partner_catalog_part

    def test_service_initialization(self):
        """Test that the service initializes correctly with required dependencies."""
        # Act
        service = SharingService()
        
        # Assert
        assert service is not None
        assert hasattr(service, 'submodel_document_generator')
        assert hasattr(service, 'twin_management_service')

    def test_get_shared_partners_not_implemented(self):
        """Test that get_shared_partners is not yet implemented."""
        # Act
        result = self.service.get_shared_partners("BPNL123456789012", "PART001")
        
        # Assert
        assert result is None  # Method returns None as it's not implemented

    @patch('managers.metadata_database.manager.RepositoryManagerFactory.create')
    @patch.object(SharingService, '_get_catalog_part')
    @patch.object(SharingService, '_get_or_create_business_partner')
    @patch.object(SharingService, '_get_or_create_data_exchange_agreement')
    @patch.object(SharingService, '_get_or_create_partner_catalog_parts')
    @patch.object(SharingService, '_create_and_get_twin')
    @patch.object(SharingService, '_ensure_twin_exchange')
    @patch.object(SharingService, '_create_part_type_information_aspect_doc')
    def test_share_catalog_part_success(self, 
                                        mock_create_part_type_info,
                                        mock_ensure_twin_exchange,
                                        mock_create_and_get_twin,
                                        mock_get_or_create_partner_catalog_parts,
                                        mock_get_or_create_data_exchange_agreement,
                                        mock_get_or_create_business_partner,
                                        mock_get_catalog_part,
                                        mock_repo_factory,
                                        mock_repo,
                                        sample_share_catalog_part,
                                        sample_catalog_part_db,
                                        sample_business_partner_db,
                                        sample_data_exchange_agreement_db,
                                        sample_twin_db):
        """Test successful catalog part sharing."""
        # Arrange
        mock_repo_factory.return_value.__enter__.return_value = mock_repo
        mock_get_catalog_part.return_value = sample_catalog_part_db
        mock_get_or_create_business_partner.return_value = sample_business_partner_db
        mock_get_or_create_data_exchange_agreement.return_value = sample_data_exchange_agreement_db
        mock_get_or_create_partner_catalog_parts.return_value = {
            "CUST001": {"name": "Test Partner Company", "bpnl": "BPNL987654321098"}
        }
        mock_create_and_get_twin.return_value = sample_twin_db
        mock_create_part_type_info.return_value = {"test": "document"}
        
        # Mock twin management service methods
        self.service.twin_management_service.create_twin_aspect = Mock()
        self.service.twin_management_service.get_catalog_part_twin_details_id = Mock()
        
        # Create proper mock for twin details with all required fields   
        
        twin_details_mock = {
            "globalId": str(uuid.uuid4()),
            "dtrAasId": str(uuid.uuid4()),
            "createdDate": datetime.now(timezone.utc),
            "modifiedDate": datetime.now(timezone.utc),
            "manufacturerId": "BPNL123456789012",
            "manufacturerPartId": "PART001",
            "name": "Test Part",
            "aspects": {}  # Dict instead of list
        }
        self.service.twin_management_service.get_catalog_part_twin_details_id.return_value = twin_details_mock
        
        # Act
        result = self.service.share_catalog_part(sample_share_catalog_part)
        
        # Assert
        assert result is not None
        assert result.business_partner_number == "BPNL987654321098"
        assert "CUST001" in result.customer_part_ids
        assert result.shared_at is not None
        assert result.twin is not None
        
        # Verify all helper methods were called
        mock_get_catalog_part.assert_called_once()
        mock_get_or_create_business_partner.assert_called_once()
        mock_get_or_create_data_exchange_agreement.assert_called_once()
        mock_get_or_create_partner_catalog_parts.assert_called_once()
        mock_create_and_get_twin.assert_called_once()
        mock_ensure_twin_exchange.assert_called_once()
        mock_create_part_type_info.assert_called_once()

    @patch('managers.metadata_database.manager.RepositoryManagerFactory.create')
    def test_get_catalog_part_success(self, mock_repo_factory, mock_repo, sample_share_catalog_part, sample_catalog_part_db):
        """Test successful catalog part retrieval."""
        # Arrange
        mock_repo_factory.return_value.__enter__.return_value = mock_repo
        mock_repo.catalog_part_repository.find_by_manufacturer_id_manufacturer_part_id.return_value = [
            (sample_catalog_part_db, 1)
        ]
        
        # Act
        result = self.service._get_catalog_part(mock_repo, sample_share_catalog_part)
        
        # Assert
        assert result == sample_catalog_part_db
        mock_repo.catalog_part_repository.find_by_manufacturer_id_manufacturer_part_id.assert_called_once_with(
            "BPNL123456789012",
            "PART001",
            join_partner_catalog_parts=True
        )

    @patch('managers.metadata_database.manager.RepositoryManagerFactory.create')
    def test_get_catalog_part_not_found(self, mock_repo_factory, mock_repo, sample_share_catalog_part):
        """Test catalog part retrieval when part not found."""
        # Arrange
        mock_repo_factory.return_value.__enter__.return_value = mock_repo
        mock_repo.catalog_part_repository.find_by_manufacturer_id_manufacturer_part_id.return_value = []
        
        # Act & Assert
        with pytest.raises(NotFoundError, match="Catalog part not found."):
            self.service._get_catalog_part(mock_repo, sample_share_catalog_part)

    def test_get_or_create_business_partner_existing(self, mock_repo, sample_share_catalog_part, sample_business_partner_db):
        """Test business partner retrieval when partner already exists."""
        # Arrange
        mock_repo.business_partner_repository.get_by_bpnl.return_value = sample_business_partner_db
        
        # Act
        result = self.service._get_or_create_business_partner(mock_repo, sample_share_catalog_part)
        
        # Assert
        assert result == sample_business_partner_db
        mock_repo.business_partner_repository.get_by_bpnl.assert_called_once_with("BPNL987654321098")
        mock_repo.business_partner_repository.create.assert_not_called()

    def test_get_or_create_business_partner_new(self, mock_repo, sample_share_catalog_part, sample_business_partner_db):
        """Test business partner creation when partner doesn't exist."""
        # Arrange
        mock_repo.business_partner_repository.get_by_bpnl.return_value = None
        mock_repo.business_partner_repository.create.return_value = sample_business_partner_db
        
        # Act
        result = self.service._get_or_create_business_partner(mock_repo, sample_share_catalog_part)
        
        # Assert
        assert result == sample_business_partner_db
        mock_repo.business_partner_repository.create.assert_called_once()
        mock_repo.commit.assert_called_once()
        mock_repo.refresh.assert_called_once_with(sample_business_partner_db)
        
        # Verify business partner creation arguments
        create_call_args = mock_repo.business_partner_repository.create.call_args[0][0]
        assert create_call_args.name == "Partner_BPNL987654321098"
        assert create_call_args.bpnl == "BPNL987654321098"

    def test_get_or_create_data_exchange_agreement_existing(self, mock_repo, sample_business_partner_db, sample_data_exchange_agreement_db):
        """Test data exchange agreement retrieval when agreement already exists."""
        # Arrange
        mock_repo.data_exchange_agreement_repository.get_by_business_partner_id.return_value = [sample_data_exchange_agreement_db]
        
        # Act
        result = self.service._get_or_create_data_exchange_agreement(mock_repo, sample_business_partner_db)
        
        # Assert
        assert result == sample_data_exchange_agreement_db
        mock_repo.data_exchange_agreement_repository.get_by_business_partner_id.assert_called_once_with(1)
        mock_repo.data_exchange_agreement_repository.create.assert_not_called()

    def test_get_or_create_data_exchange_agreement_new(self, mock_repo, sample_business_partner_db, sample_data_exchange_agreement_db):
        """Test data exchange agreement creation when agreement doesn't exist."""
        # Arrange
        mock_repo.data_exchange_agreement_repository.get_by_business_partner_id.return_value = []
        mock_repo.data_exchange_agreement_repository.create.return_value = sample_data_exchange_agreement_db
        
        # Act
        result = self.service._get_or_create_data_exchange_agreement(mock_repo, sample_business_partner_db)
        
        # Assert
        assert result == sample_data_exchange_agreement_db
        mock_repo.data_exchange_agreement_repository.create.assert_called_once()
        mock_repo.commit.assert_called_once()
        mock_repo.refresh.assert_called_once_with(sample_data_exchange_agreement_db)
        
        # Verify data exchange agreement creation arguments
        create_call_args = mock_repo.data_exchange_agreement_repository.create.call_args[0][0]
        assert create_call_args.business_partner_id == 1
        assert create_call_args.name == "Default"

    def test_get_or_create_partner_catalog_parts_existing_match(self, mock_repo, sample_catalog_part_db, sample_business_partner_db, sample_partner_catalog_part_db):
        """Test partner catalog part retrieval when existing part matches customer part ID."""
        # Arrange
        mock_repo.partner_catalog_part_repository.get_by_catalog_part_id_business_partner_id.return_value = sample_partner_catalog_part_db
        sample_partner_catalog_part_db.customer_part_id = "CUST001"
        
        # Act
        result = self.service._get_or_create_partner_catalog_parts(
            mock_repo, "CUST001", sample_catalog_part_db, sample_business_partner_db
        )
        
        # Assert
        assert "CUST001" in result
        assert result["CUST001"].name == "Test Partner Company"
        assert result["CUST001"].bpnl == "BPNL987654321098"

    @patch.object(SharingService, '_create_or_update_partner_catalog_part')
    def test_get_or_create_partner_catalog_parts_existing_mismatch(self, mock_create_or_update, mock_repo, sample_catalog_part_db, sample_business_partner_db, sample_partner_catalog_part_db):
        """Test partner catalog part update when existing part has different customer part ID."""
        # Arrange
        mock_repo.partner_catalog_part_repository.get_by_catalog_part_id_business_partner_id.return_value = sample_partner_catalog_part_db
        sample_partner_catalog_part_db.customer_part_id = "OLD_CUST001"
        
        # Act
        result = self.service._get_or_create_partner_catalog_parts(
            mock_repo, "NEW_CUST001", sample_catalog_part_db, sample_business_partner_db
        )
        
        # Assert
        assert "NEW_CUST001" in result
        mock_create_or_update.assert_called_once_with(
            repo=mock_repo,
            customer_part_id="NEW_CUST001",
            db_catalog_part=sample_catalog_part_db,
            db_business_partner=sample_business_partner_db
        )

    @patch.object(SharingService, '_create_or_update_partner_catalog_part')
    def test_get_or_create_partner_catalog_parts_no_customer_part_id(self, mock_create_or_update, mock_repo, sample_catalog_part_db, sample_business_partner_db):
        """Test partner catalog part creation when no customer part ID is provided."""
        # Arrange
        mock_repo.partner_catalog_part_repository.get_by_catalog_part_id_business_partner_id.return_value = None
        
        # Act
        result = self.service._get_or_create_partner_catalog_parts(
            mock_repo, None, sample_catalog_part_db, sample_business_partner_db
        )
        
        # Assert
        expected_customer_part_id = "BPNL987654321098_PART001"
        assert expected_customer_part_id in result
        mock_create_or_update.assert_called_once_with(
            repo=mock_repo,
            customer_part_id=expected_customer_part_id,
            db_catalog_part=sample_catalog_part_db,
            db_business_partner=sample_business_partner_db
        )

    def test_create_or_update_partner_catalog_part(self, mock_repo, sample_catalog_part_db, sample_business_partner_db, sample_partner_catalog_part_db):
        """Test partner catalog part creation/update."""
        # Arrange
        mock_repo.partner_catalog_part_repository.create_or_update.return_value = sample_partner_catalog_part_db
        
        # Act
        result = self.service._create_or_update_partner_catalog_part(
            mock_repo, "CUST001", sample_catalog_part_db, sample_business_partner_db
        )
        
        # Assert
        assert result == sample_partner_catalog_part_db
        mock_repo.partner_catalog_part_repository.create_or_update.assert_called_once_with(
            catalog_part_id=1,
            business_partner_id=1,
            customer_part_id="CUST001"
        )
        mock_repo.commit.assert_called_once()
        mock_repo.refresh.assert_called_once_with(sample_partner_catalog_part_db)

    def test_create_and_get_twin(self, mock_repo, sample_share_catalog_part, sample_twin_db):
        """Test twin creation and retrieval."""
        # Arrange
        mock_twin_read = Mock()
        mock_twin_read.global_id = sample_twin_db.global_id
        self.service.twin_management_service.create_catalog_part_twin = Mock(return_value=mock_twin_read)
        mock_repo.twin_repository.find_by_global_id.return_value = sample_twin_db
        
        # Act
        result = self.service._create_and_get_twin(mock_repo, sample_share_catalog_part, 1)
        
        # Assert
        assert result == sample_twin_db
        self.service.twin_management_service.create_catalog_part_twin.assert_called_once()
        
        # Verify twin creation arguments
        create_call_args = self.service.twin_management_service.create_catalog_part_twin.call_args[0][0]
        assert create_call_args.manufacturer_id == "BPNL123456789012"
        assert create_call_args.manufacturer_part_id == "PART001"

    def test_ensure_twin_exchange_existing(self, mock_repo, sample_twin_db, sample_data_exchange_agreement_db):
        """Test twin exchange when exchange already exists."""
        # Arrange
        mock_twin_exchange = Mock()
        mock_repo.twin_exchange_repository.get_by_twin_id_data_exchange_agreement_id.return_value = mock_twin_exchange
        
        # Act
        self.service._ensure_twin_exchange(mock_repo, sample_twin_db, sample_data_exchange_agreement_db)
        
        # Assert
        mock_repo.twin_exchange_repository.get_by_twin_id_data_exchange_agreement_id.assert_called_once_with(1, 1)
        mock_repo.twin_exchange_repository.create_new.assert_not_called()

    def test_ensure_twin_exchange_new(self, mock_repo, sample_twin_db, sample_data_exchange_agreement_db):
        """Test twin exchange creation when exchange doesn't exist."""
        # Arrange
        mock_repo.twin_exchange_repository.get_by_twin_id_data_exchange_agreement_id.return_value = None
        mock_twin_exchange = Mock()
        mock_repo.twin_exchange_repository.create_new.return_value = mock_twin_exchange
        
        # Act
        self.service._ensure_twin_exchange(mock_repo, sample_twin_db, sample_data_exchange_agreement_db)
        
        # Assert
        mock_repo.twin_exchange_repository.create_new.assert_called_once_with(
            twin_id=1,
            data_exchange_agreement_id=1
        )
        mock_repo.commit.assert_called_once()

    def test_create_part_type_information_aspect_doc(self):
        """Test part type information aspect document creation."""
        # Arrange
        global_id = uuid.uuid4()
        self.service.submodel_document_generator.generate_part_type_information_v1 = Mock(return_value={"test": "document"})
        
        # Act
        result = self.service._create_part_type_information_aspect_doc(
            global_id=global_id,
            manufacturer_part_id="PART001",
            name="Test Part",
            bpns="BPNS123456789012"
        )
        
        # Assert
        assert result == {"test": "document"}
        self.service.submodel_document_generator.generate_part_type_information_v1.assert_called_once_with(
            global_id=global_id,
            manufacturer_part_id="PART001",
            name="Test Part",
            bpns="BPNS123456789012"
        )

    @patch('managers.metadata_database.manager.RepositoryManagerFactory.create')
    def test_share_catalog_part_datetime_handling(self, mock_repo_factory, mock_repo):
        """Test that share_catalog_part correctly handles datetime."""
        # Arrange
        mock_repo_factory.return_value.__enter__.return_value = mock_repo
        
        with patch.object(self.service, '_get_catalog_part') as mock_get_catalog_part, \
             patch.object(self.service, '_get_or_create_business_partner'), \
             patch.object(self.service, '_get_or_create_data_exchange_agreement'), \
             patch.object(self.service, '_get_or_create_partner_catalog_parts') as mock_get_partner_parts, \
             patch.object(self.service, '_create_and_get_twin') as mock_create_and_get_twin, \
             patch.object(self.service, '_ensure_twin_exchange'), \
             patch.object(self.service, '_create_part_type_information_aspect_doc') as mock_create_part_type_info:
            
            # Mock catalog part
            mock_catalog_part = Mock(spec=CatalogPart)
            mock_catalog_part.name = "Test Part"
            mock_catalog_part.bpns = "BPNS123456789012"
            mock_get_catalog_part.return_value = mock_catalog_part
            
            mock_get_partner_parts.return_value = {
                "CUST001": {"name": "Test", "bpnl": "BPNL123"}
            }
            
            # Mock twin with valid UUID
            import uuid
            mock_twin = Mock()
            mock_twin.global_id = uuid.uuid4()
            mock_create_and_get_twin.return_value = mock_twin
            
            # Mock part type info document
            mock_create_part_type_info.return_value = {"test": "document"}
            
            # Mock twin management service
            self.service.twin_management_service.create_twin_aspect = Mock()
            self.service.twin_management_service.get_catalog_part_twin_details_id = Mock()
            
            # Create twin details mock with all required fields
            from datetime import datetime, timezone
            
            twin_details_mock = {
                "globalId": str(uuid.uuid4()),
                "dtrAasId": str(uuid.uuid4()),
                "createdDate": datetime.now(timezone.utc),
                "modifiedDate": datetime.now(timezone.utc),
                "manufacturerId": "BPNL123456789012",
                "manufacturerPartId": "PART001",
                "name": "Test Part",
                "aspects": {}
            }
            self.service.twin_management_service.get_catalog_part_twin_details_id.return_value = twin_details_mock
            
            share_catalog_part = ShareCatalogPart(
                manufacturerId="BPNL123456789012",
                manufacturerPartId="PART001",
                businessPartnerNumber="BPNL987654321098",
                customerPartId="CUST001",
                twinRegistryName="TestRegistry",
                connectorControlPlaneName="TestControlPlane"
            )
            
            # Act
            before_time = datetime.now(timezone.utc)
            result = self.service.share_catalog_part(share_catalog_part)
            after_time = datetime.now(timezone.utc)
            
            # Assert - Check that shared_at is between before and after
            assert before_time <= result.shared_at <= after_time
            assert result.shared_at.tzinfo == timezone.utc

    @patch('managers.metadata_database.manager.RepositoryManagerFactory.create')
    def test_share_catalog_part_data_types_validation(self, mock_repo_factory, mock_repo):
        """Test that share_catalog_part handles correct data types."""
        # This test verifies that the method correctly processes different input types
        mock_repo_factory.return_value.__enter__.return_value = mock_repo
        
        with patch.object(self.service, '_get_catalog_part') as mock_get_catalog_part, \
             patch.object(self.service, '_get_or_create_business_partner'), \
             patch.object(self.service, '_get_or_create_data_exchange_agreement'), \
             patch.object(self.service, '_get_or_create_partner_catalog_parts') as mock_get_partner_parts, \
             patch.object(self.service, '_create_and_get_twin') as mock_create_and_get_twin, \
             patch.object(self.service, '_ensure_twin_exchange'), \
             patch.object(self.service, '_create_part_type_information_aspect_doc') as mock_create_part_type_info:

            mock_catalog_part = Mock(spec=CatalogPart)
            mock_catalog_part.name = "Test Part"
            mock_catalog_part.bpns = "BPNS123456789012"
            mock_get_catalog_part.return_value = mock_catalog_part
            
            mock_get_partner_parts.return_value = {
                "CUST001": {"name": "Test", "bpnl": "BPNL123"}
            }
            
            # Mock twin with valid UUID
            import uuid
            from datetime import datetime, timezone
            mock_twin = Mock()
            mock_twin.global_id = uuid.uuid4()
            mock_create_and_get_twin.return_value = mock_twin
            
            # Mock part type info document
            mock_create_part_type_info.return_value = {"test": "document"}

            self.service.twin_management_service.create_twin_aspect = Mock()
            self.service.twin_management_service.get_catalog_part_twin_details_id = Mock()
            
            # Create proper twin details mock
            twin_details_mock = {
                "globalId": str(uuid.uuid4()),
                "dtrAasId": str(uuid.uuid4()),
                "createdDate": datetime.now(timezone.utc),
                "modifiedDate": datetime.now(timezone.utc),
                "manufacturerId": "BPNL123456789012",
                "manufacturerPartId": "PART001",
                "name": "Test Part",
                "aspects": {}
            }
            self.service.twin_management_service.get_catalog_part_twin_details_id.return_value = twin_details_mock
            
            share_catalog_part = ShareCatalogPart(
                manufacturerId="BPNL123456789012",
                manufacturerPartId="PART001",
                businessPartnerNumber="BPNL987654321098",
                customerPartId="CUST001",
                twinRegistryName="TestRegistry",
                connectorControlPlaneName="TestControlPlane"
            )
            
            # Act
            result = self.service.share_catalog_part(share_catalog_part)
            
            # Assert
            assert result is not None
            assert isinstance(result.business_partner_number, str)
            assert isinstance(result.customer_part_ids, dict)
            assert isinstance(result.shared_at, datetime)
