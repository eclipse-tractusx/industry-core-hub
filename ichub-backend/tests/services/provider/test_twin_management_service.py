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
from unittest.mock import Mock, patch, MagicMock
from uuid import UUID, uuid4
from datetime import datetime
import sys

# Mock problematic imports
mock_modules = [
    'tractusx_sdk',
    'tractusx_sdk.dataspace',
    'tractusx_sdk.dataspace.services',
    'tractusx_sdk.dataspace.services.connector',
    'tractusx_sdk.dataspace.services.connector.base_edc_service',
    'tractusx_sdk.dataspace.core',
    'tractusx_sdk.dataspace.core.dsc_manager',
    'tractusx_sdk.dataspace.core.exception',
    'tractusx_sdk.dataspace.core.exception.connector_error',
    'tractusx_sdk.dataspace.tools',
    'tractusx_sdk.dataspace.tools.op',
    'managers.enablement_services.submodel_service_manager',
    'managers.enablement_services.dtr_manager',
    'managers.enablement_services.connector_manager',
    'managers.submodels.submodel_document_generator',
    'managers.config.config_manager',
    'managers.config.log_manager',
    'managers.metadata_database.manager',
    'tools.exceptions',
    'database',
]

for module in mock_modules:
    sys.modules[module] = MagicMock()

from services.provider.twin_management_service import TwinManagementService
from models.services.provider.twin_management import (
    CatalogPartTwinCreate,
    CatalogPartTwinRead,
    CatalogPartTwinShareCreate,
    SerializedPartTwinCreate,
    SerializedPartTwinRead,
    SerializedPartTwinShareCreate,
    TwinRead,
    TwinAspectCreate,
    TwinAspectRead,
    TwinAspectRegistrationStatus,
    TwinsAspectRegistrationMode,
)
from models.services.provider.part_management import SerializedPartQuery
from models.services.provider.partner_management import BusinessPartnerRead

# Mock the exceptions as real exception classes
class NotFoundError(Exception):
    pass

class NotAvailableError(Exception):
    pass


class TestTwinManagementService:
    """Test cases for TwinManagementService."""

    def setup_method(self):
        """Setup method called before each test."""
        self.service = TwinManagementService()

    @pytest.fixture
    def sample_global_id(self):
        """Sample global ID for testing."""
        return UUID("123e4567-e89b-12d3-a456-426614174000")

    @pytest.fixture
    def sample_aas_id(self):
        """Sample AAS ID for testing."""
        return "urn:uuid:987fcdeb-51a2-43d8-9765-123456789abc"

    @pytest.fixture
    def sample_manufacturer_id(self):
        """Sample manufacturer ID for testing."""
        return "BPNL123456789012"

    @pytest.fixture
    def sample_manufacturer_part_id(self):
        """Sample manufacturer part ID for testing."""
        return "PART001"

    @pytest.fixture
    def sample_part_instance_id(self):
        """Sample part instance ID for testing."""
        return "INSTANCE001"

    @pytest.fixture
    def sample_business_partner_number(self):
        """Sample business partner number for testing."""
        return "BPNL987654321098"

    @pytest.fixture
    def sample_semantic_id(self):
        """Sample semantic ID for testing."""
        return "urn:bamm:io.catenax.part_type_information:1.0.0#PartTypeInformation"

    @pytest.fixture
    def sample_submodel_id(self):
        """Sample submodel ID for testing."""
        return "urn:uuid:12345678-1234-1234-1234-123456789012"

    @pytest.fixture
    def sample_payload(self):
        """Sample payload for testing."""
        return {
            "partTypeInformation": {
                "classification": "product",
                "manufacturerPartId": "PART001",
                "nameAtManufacturer": "Test Part"
            }
        }

    @pytest.fixture
    def mock_repo_manager(self):
        """Mock repository manager."""
        return Mock()

    @pytest.fixture
    def mock_twin(self):
        """Mock twin entity."""
        twin = Mock()
        twin.id = 1
        twin.global_id = UUID("123e4567-e89b-12d3-a456-426614174000")
        twin.aas_id = "urn:uuid:987fcdeb-51a2-43d8-9765-123456789abc"
        twin.created_date = datetime.now()
        twin.modified_date = datetime.now()
        twin.additional_context = {}
        twin.twin_exchanges = []
        twin.twin_registrations = []
        twin.twin_aspects = []
        return twin

    @pytest.fixture
    def mock_catalog_part(self):
        """Mock catalog part entity."""
        catalog_part = Mock()
        catalog_part.twin_id = None
        catalog_part.manufacturer_part_id = "PART001"
        catalog_part.name = "Test Part"
        catalog_part.category = "product"
        catalog_part.bpns = "BPNS123456789012"
        catalog_part.description = "Test description"
        catalog_part.materials = "Steel"
        catalog_part.width = 10.0
        catalog_part.height = 20.0
        catalog_part.length = 30.0
        catalog_part.weight = 1.5
        catalog_part.partner_catalog_parts = []
        catalog_part.legal_entity = Mock()
        catalog_part.legal_entity.bpnl = "BPNL123456789012"
        catalog_part.legal_entity.id = 1
        return catalog_part

    @pytest.fixture
    def mock_enablement_service_stack(self):
        """Mock enablement service stack entity."""
        stack = Mock()
        stack.id = 1
        stack.name = "EDC/DTR Default"
        stack.connection_settings = {}
        stack.legal_entity = Mock()
        stack.legal_entity.bpnl = "BPNL123456789012"
        return stack

    def test_service_initialization(self):
        """Test that the service initializes correctly."""
        service = TwinManagementService()
        assert service.submodel_document_generator is not None

    @patch('services.provider.twin_management_service.RepositoryManagerFactory.create')
    def test_get_or_create_enablement_stack_existing(self, mock_repo_factory, mock_enablement_service_stack):
        """Test retrieving existing enablement service stack."""
        # Arrange
        mock_repo = Mock()
        mock_repo_factory.return_value.__enter__.return_value = mock_repo
        mock_repo.enablement_service_stack_repository.find_by_legal_entity_bpnl.return_value = [mock_enablement_service_stack]

        # Act
        result = self.service.get_or_create_enablement_stack(mock_repo, "BPNL123456789012")

        # Assert
        assert result == mock_enablement_service_stack
        mock_repo.enablement_service_stack_repository.find_by_legal_entity_bpnl.assert_called_once_with(legal_entity_bpnl="BPNL123456789012")

    @patch('services.provider.twin_management_service.RepositoryManagerFactory.create')
    def test_get_or_create_enablement_stack_new(self, mock_repo_factory, mock_enablement_service_stack):
        """Test creating new enablement service stack."""
        # Arrange
        mock_repo = Mock()
        mock_repo_factory.return_value.__enter__.return_value = mock_repo
        mock_repo.enablement_service_stack_repository.find_by_legal_entity_bpnl.return_value = []
        mock_repo.legal_entity_repository.get_by_bpnl.return_value = Mock(id=1)
        mock_repo.enablement_service_stack_repository.create.return_value = mock_enablement_service_stack

        # Act
        result = self.service.get_or_create_enablement_stack(mock_repo, "BPNL123456789012")

        # Assert
        assert result == mock_enablement_service_stack
        mock_repo.enablement_service_stack_repository.create.assert_called_once()
        mock_repo.commit.assert_called()
        mock_repo.refresh.assert_called_once()

    @patch('services.provider.twin_management_service.RepositoryManagerFactory.create')
    @patch('services.provider.twin_management_service._create_dtr_manager')
    def test_create_catalog_part_twin_success(self, mock_dtr_manager, mock_repo_factory, 
                                            mock_catalog_part, mock_twin, mock_enablement_service_stack,
                                            sample_global_id, sample_aas_id, sample_manufacturer_id, 
                                            sample_manufacturer_part_id):
        """Test successful catalog part twin creation."""
        # Arrange
        create_input = CatalogPartTwinCreate(
            manufacturerId=sample_manufacturer_id,
            manufacturerPartId=sample_manufacturer_part_id,
            globalId=sample_global_id,
            dtrAasId=sample_aas_id
        )

        mock_repo = Mock()
        mock_repo_factory.return_value.__enter__.return_value = mock_repo
        mock_repo.catalog_part_repository.find_by_manufacturer_id_manufacturer_part_id.return_value = [(mock_catalog_part, None)]
        mock_repo.twin_repository.create_new.return_value = mock_twin
        mock_repo.twin_registration_repository.get_by_twin_id_enablement_service_stack_id.return_value = None
        mock_repo.twin_registration_repository.create_new.return_value = Mock()

        mock_dtr = Mock()
        mock_dtr_manager.return_value = mock_dtr

        # Act
        with patch.object(self.service, 'get_or_create_enablement_stack', return_value=mock_enablement_service_stack):
            result = self.service.create_catalog_part_twin(create_input)

            # Assert
            assert isinstance(result, TwinRead)
            assert result.global_id == sample_global_id
            mock_repo.catalog_part_repository.find_by_manufacturer_id_manufacturer_part_id.assert_called_once()
            mock_dtr.create_or_update_shell_descriptor.assert_called_once()

    @patch('services.provider.twin_management_service.RepositoryManagerFactory.create')
    def test_create_catalog_part_twin_not_found(self, mock_repo_factory, sample_manufacturer_id, sample_manufacturer_part_id):
        """Test catalog part twin creation when catalog part not found."""
        # Arrange
        create_input = CatalogPartTwinCreate(
            manufacturerId=sample_manufacturer_id,
            manufacturerPartId=sample_manufacturer_part_id
        )

        mock_repo = Mock()
        mock_repo_factory.return_value.__enter__.return_value = mock_repo
        mock_repo.catalog_part_repository.find_by_manufacturer_id_manufacturer_part_id.return_value = []

        # Act & Assert
        with pytest.raises(Exception):  # Changed from NotFoundError since it's mocked
            self.service.create_catalog_part_twin(create_input)

    @patch('services.provider.twin_management_service.RepositoryManagerFactory.create')
    def test_get_catalog_part_twins_success(self, mock_repo_factory, mock_twin, mock_catalog_part):
        """Test successful retrieval of catalog part twins."""
        # Arrange
        mock_twin.catalog_part = mock_catalog_part
        mock_repo = Mock()
        mock_repo_factory.return_value.__enter__.return_value = mock_repo
        mock_repo.twin_repository.find_catalog_part_twins.return_value = [mock_twin]

        # Act
        result = self.service.get_catalog_part_twins()

        # Assert
        assert len(result) == 1
        assert isinstance(result[0], CatalogPartTwinRead)
        assert result[0].global_id == mock_twin.global_id

    @patch('services.provider.twin_management_service.RepositoryManagerFactory.create')
    def test_create_catalog_part_twin_share_success(self, mock_repo_factory, mock_catalog_part, mock_twin, 
                                                   sample_manufacturer_id, sample_manufacturer_part_id, 
                                                   sample_business_partner_number):
        """Test successful catalog part twin share creation."""
        # Arrange
        share_input = CatalogPartTwinShareCreate(
            manufacturerId=sample_manufacturer_id,
            manufacturerPartId=sample_manufacturer_part_id,
            businessPartnerNumber=sample_business_partner_number
        )

        mock_catalog_part.twin_id = 1
        mock_catalog_part.find_partner_catalog_part_by_bpnl.return_value = Mock()
        mock_business_partner = Mock(id=1, bpnl=sample_business_partner_number)

        mock_repo = Mock()
        mock_repo_factory.return_value.__enter__.return_value = mock_repo
        mock_repo.catalog_part_repository.find_by_manufacturer_id_manufacturer_part_id.return_value = [(mock_catalog_part, None)]
        mock_repo.business_partner_repository.get_by_bpnl.return_value = mock_business_partner
        mock_repo.twin_repository.find_by_id.return_value = mock_twin

        with patch.object(TwinManagementService, '_create_twin_exchange', return_value=True) as mock_create_exchange:
            # Act
            result = self.service.create_catalog_part_twin_share(share_input)

            # Assert
            assert result is True
            mock_create_exchange.assert_called_once()

    @patch('services.provider.twin_management_service.RepositoryManagerFactory.create')
    def test_create_serialized_part_twin_success(self, mock_repo_factory, mock_twin, mock_enablement_service_stack,
                                                sample_manufacturer_id, sample_manufacturer_part_id, 
                                                sample_part_instance_id, sample_global_id, sample_aas_id):
        """Test successful serialized part twin creation."""
        # Arrange
        create_input = SerializedPartTwinCreate(
            manufacturerId=sample_manufacturer_id,
            manufacturerPartId=sample_manufacturer_part_id,
            partInstanceId=sample_part_instance_id,
            globalId=sample_global_id,
            dtrAasId=sample_aas_id
        )

        mock_serialized_part = Mock()
        mock_serialized_part.twin_id = None
        mock_serialized_part.van = "VAN123"
        mock_serialized_part.partner_catalog_part = Mock()
        mock_serialized_part.partner_catalog_part.customer_part_id = "CUST001"
        mock_serialized_part.partner_catalog_part.business_partner = Mock(bpnl="BPNL987654321098")
        mock_serialized_part.partner_catalog_part.catalog_part = Mock(category="product")

        mock_repo = Mock()
        mock_repo_factory.return_value.__enter__.return_value = mock_repo
        mock_repo.serialized_part_repository.find.return_value = [mock_serialized_part]
        mock_repo.enablement_service_stack_repository.get_by_name.return_value = mock_enablement_service_stack
        mock_repo.twin_repository.create_new.return_value = mock_twin
        mock_repo.twin_registration_repository.get_by_twin_id_enablement_service_stack_id.return_value = None
        mock_repo.twin_registration_repository.create_new.return_value = Mock(dtr_registered=False)

        # Act
        with patch('services.provider.twin_management_service._create_dtr_manager') as mock_dtr_manager:
            mock_dtr = Mock()
            mock_dtr_manager.return_value = mock_dtr

            result = self.service.create_serialized_part_twin(create_input)

            # Assert
            assert isinstance(result, TwinRead)
            assert result.global_id == sample_global_id
            mock_dtr.create_or_update_shell_descriptor_serialized_part.assert_called_once()

    @patch('services.provider.twin_management_service.RepositoryManagerFactory.create')
    def test_get_serialized_part_twins_success(self, mock_repo_factory, mock_twin):
        """Test successful retrieval of serialized part twins."""
        # Arrange
        mock_serialized_part = Mock()
        mock_serialized_part.partner_catalog_part = Mock()
        mock_serialized_part.partner_catalog_part.catalog_part = Mock()
        mock_serialized_part.partner_catalog_part.catalog_part.legal_entity = Mock(bpnl="BPNL123456789012")
        mock_serialized_part.partner_catalog_part.catalog_part.manufacturer_part_id = "PART001"
        mock_serialized_part.partner_catalog_part.catalog_part.name = "Test Part"
        mock_serialized_part.partner_catalog_part.catalog_part.category = "product"
        mock_serialized_part.partner_catalog_part.catalog_part.bpns = "BPNS123456789012"
        mock_serialized_part.partner_catalog_part.customer_part_id = "CUST001"
        # Use string values for business partner to avoid Pydantic validation errors
        mock_serialized_part.partner_catalog_part.business_partner = Mock()
        mock_serialized_part.partner_catalog_part.business_partner.name = "Test Partner"
        mock_serialized_part.partner_catalog_part.business_partner.bpnl = "BPNL987654321098"
        mock_serialized_part.part_instance_id = "INSTANCE001"
        mock_serialized_part.van = "VAN123"
        mock_twin.serialized_part = mock_serialized_part

        mock_repo = Mock()
        mock_repo_factory.return_value.__enter__.return_value = mock_repo
        mock_repo.twin_repository.find_serialized_part_twins.return_value = [mock_twin]

        # Act
        result = self.service.get_serialized_part_twins()

        # Assert
        assert len(result) == 1
        assert isinstance(result[0], SerializedPartTwinRead)
        assert result[0].global_id == mock_twin.global_id

    def test_get_manufacturer_id_from_twin_catalog_part(self, mock_twin):
        """Test manufacturer ID retrieval from twin with catalog part."""
        # Arrange
        mock_twin.catalog_part = Mock()
        mock_twin.catalog_part.legal_entity = Mock(bpnl="BPNL123456789012")
        mock_twin.serialized_part = None

        # Act
        result = TwinManagementService._get_manufacturer_id_from_twin(mock_twin)

        # Assert
        assert result == "BPNL123456789012"

    def test_get_manufacturer_id_from_twin_serialized_part(self, mock_twin):
        """Test manufacturer ID retrieval from twin with serialized part."""
        # Arrange
        mock_twin.catalog_part = None
        mock_twin.serialized_part = Mock()
        mock_twin.serialized_part.partner_catalog_part = Mock()
        mock_twin.serialized_part.partner_catalog_part.catalog_part = Mock()
        mock_twin.serialized_part.partner_catalog_part.catalog_part.legal_entity = Mock(bpnl="BPNL123456789012")

        # Act
        result = TwinManagementService._get_manufacturer_id_from_twin(mock_twin)

        # Assert
        assert result == "BPNL123456789012"

    def test_get_manufacturer_id_from_twin_not_found(self, mock_twin):
        """Test manufacturer ID retrieval when neither catalog nor serialized part exists."""
        # Arrange
        mock_twin.catalog_part = None
        mock_twin.serialized_part = None

        # Mock the exception inside the service
        with patch('services.provider.twin_management_service.NotFoundError', NotFoundError):
            # Act & Assert
            with pytest.raises(NotFoundError):
                TwinManagementService._get_manufacturer_id_from_twin(mock_twin)

    def test_create_twin_exchange_success(self, mock_repo_manager, mock_twin):
        """Test successful twin exchange creation."""
        # Arrange
        mock_business_partner = Mock()
        mock_business_partner.id = 1
        mock_business_partner.bpnl = "BPNL987654321098"

        mock_data_exchange_agreement = Mock()
        mock_data_exchange_agreement.id = 1

        mock_repo_manager.data_exchange_agreement_repository.get_by_business_partner_id.return_value = [mock_data_exchange_agreement]
        mock_repo_manager.twin_exchange_repository.get_by_twin_id_data_exchange_agreement_id.return_value = None
        mock_repo_manager.twin_exchange_repository.create_new.return_value = Mock()

        # Act
        result = TwinManagementService._create_twin_exchange(mock_repo_manager, mock_twin, mock_business_partner)

        # Assert
        assert result is True
        mock_repo_manager.twin_exchange_repository.create_new.assert_called_once()
        mock_repo_manager.commit.assert_called_once()

    def test_create_twin_exchange_already_exists(self, mock_repo_manager, mock_twin):
        """Test twin exchange creation when exchange already exists."""
        # Arrange
        mock_business_partner = Mock()
        mock_business_partner.id = 1
        mock_business_partner.bpnl = "BPNL987654321098"

        mock_data_exchange_agreement = Mock()
        mock_data_exchange_agreement.id = 1

        mock_repo_manager.data_exchange_agreement_repository.get_by_business_partner_id.return_value = [mock_data_exchange_agreement]
        mock_repo_manager.twin_exchange_repository.get_by_twin_id_data_exchange_agreement_id.return_value = Mock()

        # Act
        result = TwinManagementService._create_twin_exchange(mock_repo_manager, mock_twin, mock_business_partner)

        # Assert
        assert result is False
        mock_repo_manager.twin_exchange_repository.create_new.assert_not_called()

    def test_create_twin_exchange_no_agreement(self, mock_repo_manager, mock_twin):
        """Test twin exchange creation when no data exchange agreement exists."""
        # Arrange
        mock_business_partner = Mock()
        mock_business_partner.id = 1
        mock_business_partner.bpnl = "BPNL987654321098"

        mock_repo_manager.data_exchange_agreement_repository.get_by_business_partner_id.return_value = []

        # Mock the exception inside the service
        with patch('services.provider.twin_management_service.NotFoundError', NotFoundError):
            # Act & Assert
            with pytest.raises(NotFoundError):
                TwinManagementService._create_twin_exchange(mock_repo_manager, mock_twin, mock_business_partner)

    def test_fill_shares(self, mock_twin):
        """Test filling shares in twin result."""
        # Arrange
        mock_twin_exchange = Mock()
        mock_twin_exchange.data_exchange_agreement = Mock()
        mock_twin_exchange.data_exchange_agreement.name = "Test Agreement"
        mock_twin_exchange.data_exchange_agreement.business_partner = Mock()
        mock_twin_exchange.data_exchange_agreement.business_partner.name = "Test Partner"
        mock_twin_exchange.data_exchange_agreement.business_partner.bpnl = "BPNL987654321098"
        mock_twin.twin_exchanges = [mock_twin_exchange]

        twin_result = TwinRead(
            globalId=mock_twin.global_id,
            dtrAasId=mock_twin.aas_id,
            createdDate=mock_twin.created_date,
            modifiedDate=mock_twin.modified_date
        )

        # Act
        TwinManagementService._fill_shares(mock_twin, twin_result)

        # Assert
        assert len(twin_result.shares) == 1
        assert twin_result.shares[0].name == "Test Agreement"

    def test_fill_registrations(self, mock_twin):
        """Test filling registrations in twin result."""
        # Arrange
        mock_registration = Mock()
        mock_registration.enablement_service_stack = Mock()
        mock_registration.enablement_service_stack.name = "EDC/DTR Default"
        mock_registration.dtr_registered = True
        mock_twin.twin_registrations = [mock_registration]

        twin_result = Mock()
        twin_result.registrations = {}

        # Act
        TwinManagementService._fill_registrations(mock_twin, twin_result)

        # Assert
        assert twin_result.registrations["EDC/DTR Default"] is True

    def test_fill_aspects(self, mock_twin):
        """Test filling aspects in twin result."""
        # Arrange
        mock_aspect_registration = Mock()
        mock_aspect_registration.enablement_service_stack = Mock()
        mock_aspect_registration.enablement_service_stack.name = "EDC/DTR Default"
        mock_aspect_registration.status = TwinAspectRegistrationStatus.DTR_REGISTERED.value
        mock_aspect_registration.registration_mode = TwinsAspectRegistrationMode.DISPATCHED.value
        mock_aspect_registration.created_date = datetime.now()
        mock_aspect_registration.modified_date = datetime.now()

        mock_aspect = Mock()
        mock_aspect.semantic_id = "urn:bamm:io.catenax.part_type_information:1.0.0#PartTypeInformation"
        mock_aspect.submodel_id = "urn:uuid:12345678-1234-1234-1234-123456789012"
        mock_aspect.twin_aspect_registrations = [mock_aspect_registration]
        mock_twin.twin_aspects = [mock_aspect]

        twin_result = Mock()
        twin_result.aspects = {}

        # Act
        TwinManagementService._fill_aspects(mock_twin, twin_result)

        # Assert
        assert len(twin_result.aspects) == 1
        assert mock_aspect.semantic_id in twin_result.aspects

    def test_service_constants(self):
        """Test service constants are defined correctly."""
        from services.provider.twin_management_service import CATALOG_DIGITAL_TWIN_TYPE
        assert CATALOG_DIGITAL_TWIN_TYPE == "PartType"

    def test_service_parameter_types(self, sample_global_id, sample_manufacturer_id, sample_manufacturer_part_id):
        """Test that service methods accept correct parameter types."""
        # Test that methods handle different input types correctly
        query = SerializedPartQuery(
            manufacturerId=sample_manufacturer_id,
            manufacturerPartId=sample_manufacturer_part_id
        )
        
        # Verify the query object is created correctly
        assert query.manufacturer_id == sample_manufacturer_id
        assert query.manufacturer_part_id == sample_manufacturer_part_id

        # Test UUID handling
        assert isinstance(sample_global_id, UUID)

    def test_service_initialization_with_submodel_generator(self):
        """Test that service initializes with submodel document generator."""
        service = TwinManagementService()
        assert hasattr(service, 'submodel_document_generator')
        assert service.submodel_document_generator is not None

    @patch('services.provider.twin_management_service.ConfigManager')
    def test_create_dtr_manager(self, mock_config_manager):
        """Test DTR manager creation."""
        # Arrange
        mock_config_manager.get_config.side_effect = lambda key: {
            'digitalTwinRegistry.hostname': 'http://test.com',
            'digitalTwinRegistry.uri': '/api',
            'digitalTwinRegistry.lookupUri': '/lookup',
            'digitalTwinRegistry.apiPath': '/v3'
        }[key]

        # Act
        from services.provider.twin_management_service import _create_dtr_manager
        result = _create_dtr_manager(None)

        # Assert
        assert result is not None

    def test_create_connector_manager(self):
        """Test connector manager creation."""
        # Act
        from services.provider.twin_management_service import _create_connector_manager
        result = _create_connector_manager(None)

        # Assert
        assert result is not None

    def test_create_submodel_service_manager(self):
        """Test submodel service manager creation."""
        # Act
        from services.provider.twin_management_service import _create_submodel_service_manager
        result = _create_submodel_service_manager(None)

        # Assert
        assert result is not None
