###############################################################
# Eclipse Tractus-X - Industry Core Hub Backend
#
# Copyright (c) 2025 LKS NEXT
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
# distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
# WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
# License for the specific language governing permissions and limitations
# under the License.
#
# SPDX-License-Identifier: Apache-2.0
###############################################################

import pytest
from unittest.mock import Mock, patch, MagicMock
from uuid import UUID
from datetime import datetime
import sys

# Mock problematic imports
mock_modules = [
    'tractusx_sdk',
    'tractusx_sdk.dataspace',
    'tractusx_sdk.dataspace.managers',
    'tractusx_sdk.dataspace.managers.connection',
    'tractusx_sdk.dataspace.services',
    'tractusx_sdk.dataspace.services.discovery',
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
    'managers.enablement_services',
    'managers.enablement_services.provider',
    'managers.enablement_services.consumer',
    'managers.submodels.submodel_document_generator',
    'managers.config.config_manager',
    'managers.config.log_manager',
    'managers.metadata_database.manager',
    'tools.exceptions',
    'database',
    'connector',
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
    TwinRead,
    TwinAspectCreate,
    TwinAspectRead,
    TwinAspectRegistrationStatus,
    TwinsAspectRegistrationMode,
)
from models.services.provider.part_management import SerializedPartQuery

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

    @pytest.fixture
    def mock_digital_twin_registry(self):
        """Mock digital twin registry entity."""
        registry = Mock()
        registry.id = 1
        registry.name = "TestRegistry"
        registry.version = "0.4"
        registry.connection_settings = {}
        return registry
    
    @pytest.fixture
    def mock_connector_control_plane(self):
        """Mock connector control plane entity."""

        legal_entity = Mock()
        legal_entity.id = 1
        legal_entity.bpnl = "BPNL123456789012"

        control_plane = Mock()
        control_plane.id = 1
        control_plane.name = "TestConnector"
        control_plane.legal_entity = legal_entity

        return control_plane

    def test_service_initialization(self):
        """Test that the service initializes correctly."""
        service = TwinManagementService()
        assert service.submodel_document_generator is not None

    @patch('services.provider.system_management_service.dtr_provider_manager')
    @patch('services.provider.twin_management_service.RepositoryManagerFactory.create')
    def test_create_catalog_part_twin_success(self, mock_repo_factory, mock_dtr_provider,
                                            mock_catalog_part, mock_twin, mock_digital_twin_registry,
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
        mock_repo.twin_registration_repository.get_by_twin_id_twin_registry_id.return_value = None
        mock_repo.twin_registration_repository.create_new.return_value = Mock(dtr_registered=False)
        mock_repo.twin_registry_repository.get_default.return_value = mock_digital_twin_registry
        
        # Act
        result = self.service.create_catalog_part_twin(create_input)

        # Assert
        assert isinstance(result, TwinRead)
        assert result.global_id == sample_global_id
        mock_repo.catalog_part_repository.find_by_manufacturer_id_manufacturer_part_id.assert_called_once()
        mock_dtr_provider.create_or_update_shell_descriptor.assert_called_once()

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

    @patch('services.provider.system_management_service.dtr_provider_manager')
    @patch('services.provider.twin_management_service.RepositoryManagerFactory.create')
    def test_create_serialized_part_twin_success(self, mock_repo_factory, mock_dtr_provider, mock_twin,
                                                sample_manufacturer_id, sample_manufacturer_part_id, 
                                                sample_part_instance_id, sample_global_id, sample_aas_id):
        """Test successful serialized part twin creation."""
        # Arrange
        create_input = SerializedPartTwinCreate(
            manufacturerId=sample_manufacturer_id,
            manufacturerPartId=sample_manufacturer_part_id,
            partInstanceId=sample_part_instance_id,
            globalId=sample_global_id,
            dtrAasId=sample_aas_id,
        )

        mock_serialized_part = Mock()
        mock_serialized_part.twin_id = None
        mock_serialized_part.van = "VAN123"
        
        # Create mock catalog part
        mock_catalog_part = Mock()
        mock_catalog_part.category = "product"
        mock_catalog_part.name = "Test Part"
        mock_catalog_part.description = "Test Description"
        mock_catalog_part.bpns = "BPNS123456789012"
        
        # Create mock business partner
        mock_business_partner = Mock()
        mock_business_partner.bpnl = "BPNL987654321098"
        
        # Create mock partner catalog part
        mock_partner_catalog_part = Mock()
        mock_partner_catalog_part.customer_part_id = "CUST001"
        mock_partner_catalog_part.business_partner = mock_business_partner
        mock_partner_catalog_part.catalog_part = mock_catalog_part
        
        mock_serialized_part.partner_catalog_part = mock_partner_catalog_part

        # Create mock twin registry
        mock_digital_twin_registry = Mock()
        mock_digital_twin_registry.id = 1
        mock_digital_twin_registry.name = "TestRegistry"

        mock_repo = Mock()
        mock_repo_factory.return_value.__enter__.return_value = mock_repo
        mock_repo.serialized_part_repository.find.return_value = [mock_serialized_part]
        mock_repo.twin_repository.create_new.return_value = mock_twin
        mock_repo.twin_registration_repository.get_by_twin_id_twin_registry_id.return_value = None
        mock_repo.twin_registration_repository.create_new.return_value = Mock(dtr_registered=False)
        mock_repo.twin_registry_repository.get_default.return_value = mock_digital_twin_registry

        # Act
        result = self.service.create_serialized_part_twin(create_input)

        # Assert
        assert isinstance(result, TwinRead)
        assert result.global_id == sample_global_id
        mock_dtr_provider.create_or_update_shell_descriptor.assert_called_once()

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

    def test_fill_registrations(self, mock_twin, mock_digital_twin_registry):
        """Test filling registrations in twin result."""
        # Arrange
        mock_registration = Mock()
        mock_registration.twin_registry = mock_digital_twin_registry
        mock_registration.dtr_registered = True

        mock_twin.twin_registrations = [mock_registration]

        twin_result = Mock()
        twin_result.registrations = {}

        # Act
        TwinManagementService._fill_registrations(mock_twin, twin_result)

        # Assert
        assert twin_result.registrations["TestRegistry"] is True

    def test_fill_aspects(self, mock_twin, mock_digital_twin_registry, mock_connector_control_plane):
        """Test filling aspects in twin result."""
        # Arrange
        mock_aspect_registration = Mock()
        mock_aspect_registration.twin_registry = mock_digital_twin_registry
        mock_aspect_registration.connector_control_plane = mock_connector_control_plane
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

    def test_dtr_integration_available(self):
        """Test that DTR provider manager is available for integration."""
        # This test ensures that the DTR integration is properly imported and available
        from services.provider.system_management_service import dtr_provider_manager
        assert dtr_provider_manager is not None

    def test_connector_integration_available(self):
        """Test that connector manager is available for integration."""
        # This test ensures that the connector integration is properly imported and available
        from services.provider.system_management_service import connector_manager
        assert connector_manager is not None

    def test_create_submodel_service_manager(self):
        """Test submodel service manager creation."""
        # Act
        from services.provider.twin_management_service import _create_submodel_service_manager
        result = _create_submodel_service_manager(None)

        # Assert
        assert result is not None

    @patch('services.provider.system_management_service.ConfigManager')
    @patch('services.provider.twin_management_service._create_submodel_service_manager')
    @patch('services.provider.system_management_service.connector_manager')
    @patch('services.provider.twin_management_service.RepositoryManagerFactory.create')
    def test_create_twin_aspect_new_aspect(self, mock_repo_factory, mock_connector,
                                         mock_submodel_manager, mock_config, mock_twin, mock_digital_twin_registry,
                                         mock_connector_control_plane, sample_global_id, sample_semantic_id, sample_payload):
        """Test creating a new twin aspect."""
        # Arrange
        twin_aspect_create = TwinAspectCreate(
            globalId=sample_global_id,
            semanticId=sample_semantic_id,
            payload=sample_payload
        )
        
        mock_repo = Mock()
        mock_repo_factory.return_value.__enter__.return_value = mock_repo
        
        # Setup twin with registration
        mock_twin_registration = Mock()
        mock_twin_registration.twin_registry_id = mock_digital_twin_registry.id
        mock_twin.twin_registrations = [mock_twin_registration]
        
        mock_repo.twin_repository.find_by_global_id.return_value = mock_twin
        mock_repo.twin_aspect_repository.get_by_twin_id_semantic_id.return_value = None
        
        # Setup twin registry mock
        mock_repo.twin_registry_repository.find_by_id.return_value = mock_digital_twin_registry
        
        # Setup connector control plane mock
        mock_repo.connector_control_plane_repository.get_by_id.return_value = mock_connector_control_plane

        mock_new_aspect = Mock()
        mock_new_aspect.id = 1
        mock_new_aspect.semantic_id = sample_semantic_id
        mock_new_aspect.submodel_id = UUID("12345678-1234-1234-1234-123456789012")
        mock_new_aspect.find_registration_by_twin_registry_id.return_value = None
        mock_repo.twin_aspect_repository.create_new.return_value = mock_new_aspect
        
        mock_registration = Mock()
        mock_registration.status = TwinAspectRegistrationStatus.PLANNED.value
        mock_registration.registration_mode = TwinsAspectRegistrationMode.DISPATCHED.value
        mock_registration.created_date = datetime.now()
        mock_registration.modified_date = datetime.now()
        mock_registration.twin_registry = mock_digital_twin_registry
        mock_repo.twin_aspect_registration_repository.create_new.return_value = mock_registration
        
        # Mock configuration
        mock_config.get_config.return_value = {
            "hostname": "http://test-dtr",
            "uri": "/api",
            "apiPath": "/v3",
            "policy": {},
            "asset_config": {"dct_type": "test", "existing_asset_id": None}
        }
        
        # Mock connector and DTR responses
        mock_connector.provider.register_dtr_offer.return_value = ("dtr_asset_id", None, None, None)
        mock_connector.provider.register_submodel_bundle_circular_offer.return_value = ("asset_id", "policy_id", "access_id", "contract_id")
        
        # Mock submodel service manager
        mock_submodel_service = Mock()
        mock_submodel_manager.return_value = mock_submodel_service
        
        with patch.object(self.service, '_get_manufacturer_id_from_twin', return_value=mock_connector_control_plane.legal_entity.bpnl):
            # Act
            result = self.service.create_twin_aspect(twin_aspect_create,
                                                     mock_digital_twin_registry.id,
                                                     mock_connector_control_plane.id)
            
            # Assert
            assert isinstance(result, TwinAspectRead)
            assert result.semantic_id == sample_semantic_id
            mock_repo.twin_aspect_repository.create_new.assert_called_once()
            mock_submodel_service.upload_twin_aspect_document.assert_called_once()

    @patch('services.provider.system_management_service.ConfigManager')
    @patch('services.provider.twin_management_service._create_submodel_service_manager')
    @patch('services.provider.system_management_service.connector_manager')
    @patch('services.provider.twin_management_service.RepositoryManagerFactory.create')
    def test_create_or_update_twin_aspect_not_default_new(self, mock_repo_factory, mock_connector,mock_submodel_manager, mock_config, 
                                                        mock_twin, mock_digital_twin_registry, mock_connector_control_plane,
                                                        sample_global_id, sample_semantic_id, sample_payload):
        """Test creating a new twin aspect using the non-default method."""
        # Arrange
        twin_aspect_create = TwinAspectCreate(
            globalId=sample_global_id,
            semanticId=sample_semantic_id,
            payload=sample_payload
        )
        
        mock_repo = Mock()
        mock_repo_factory.return_value.__enter__.return_value = mock_repo
        mock_repo.twin_repository.find_by_global_id.return_value = mock_twin
        mock_new_aspect2 = Mock()
        mock_new_aspect2.id = 1
        mock_new_aspect2.semantic_id = sample_semantic_id
        mock_new_aspect2.submodel_id = UUID("12345678-1234-1234-1234-123456789012")
        mock_repo.twin_aspect_repository.create_new.return_value = mock_new_aspect2
        
        mock_registration = Mock()
        mock_registration.status = TwinAspectRegistrationStatus.PLANNED.value
        mock_registration.registration_mode = TwinsAspectRegistrationMode.DISPATCHED.value
        mock_registration.created_date = datetime.now()
        mock_registration.modified_date = datetime.now()
        mock_registration.twin_registry = mock_digital_twin_registry
        mock_registration.connector_control_plane_id = mock_connector_control_plane.id
        mock_repo.twin_aspect_registration_repository.create_new.return_value = mock_registration

        # Setup twin registry mock
        mock_repo.twin_registry_repository.find_by_id.return_value = mock_digital_twin_registry
        
        # Setup connector control plane mock
        mock_repo.connector_control_plane_repository.get_by_id.return_value = mock_connector_control_plane

        # Mock the find_registration_by_twin_registry_id to return None (new registration)
        mock_new_aspect2.find_registration_by_twin_registry_id.return_value = None
        
        # Mock configuration
        mock_config.get_config.return_value = {
            "hostname": "http://test-dtr",
            "uri": "/api",
            "apiPath": "/v3",
            "policy": {},
            "asset_config": {"dct_type": "test", "existing_asset_id": None}
        }
        
        # Mock connector and DTR responses
        mock_connector.provider.register_dtr_offer.return_value = ("dtr_asset_id", None, None, None)
        mock_connector.provider.register_submodel_bundle_circular_offer.return_value = ("asset_id", "policy_id", "access_id", "contract_id")
        
        # Mock submodel service manager
        mock_submodel_service = Mock()
        mock_submodel_manager.return_value = mock_submodel_service
        
        with patch.object(self.service, '_get_manufacturer_id_from_twin', return_value=mock_connector_control_plane.legal_entity.bpnl):
            # Act
            result = self.service.create_or_update_twin_aspect_not_default(twin_aspect_create,
                                                                           mock_digital_twin_registry.id,
                                                                           mock_connector_control_plane.id)
            
            # Assert
            assert isinstance(result, TwinAspectRead)
            assert result.semantic_id == sample_semantic_id
            mock_repo.twin_aspect_repository.create_new.assert_called_once()

    @patch('services.provider.twin_management_service.RepositoryManagerFactory.create')
    @patch('services.provider.twin_management_service._create_submodel_service_manager')
    def test_create_or_update_twin_aspect_not_default_update_existing(self, mock_submodel_manager, mock_repo_factory, mock_twin, 
                                                                    mock_digital_twin_registry, mock_connector_control_plane,
                                                                    sample_global_id, sample_semantic_id, sample_payload):
        """Test updating an existing twin aspect using the non-default method."""
        # Arrange
        submodel_id = UUID("12345678-1234-1234-1234-123456789012")
        twin_aspect_create = TwinAspectCreate(
            globalId=sample_global_id,
            semanticId=sample_semantic_id,
            submodelId=submodel_id,
            payload=sample_payload
        )
        
        mock_existing_aspect = Mock()
        mock_existing_aspect.id = 1
        mock_existing_aspect.semantic_id = sample_semantic_id
        mock_existing_aspect.submodel_id = submodel_id
        
        mock_registration = Mock()
        mock_registration.status = TwinAspectRegistrationStatus.STORED.value
        mock_registration.registration_mode = TwinsAspectRegistrationMode.DISPATCHED.value
        mock_registration.created_date = datetime.now()
        mock_registration.modified_date = datetime.now()
        mock_registration.twin_registry = mock_digital_twin_registry
        mock_existing_aspect.twin_aspect_registrations = [mock_registration]
        
        mock_repo = Mock()
        mock_repo_factory.return_value.__enter__.return_value = mock_repo
        mock_repo.twin_repository.find_by_global_id.return_value = mock_twin
        mock_repo.twin_aspect_repository.get_by_twin_id_semantic_id_submodel_id.return_value = mock_existing_aspect
        
        # Setup twin registry mock
        mock_repo.twin_registry_repository.find_by_id.return_value = mock_digital_twin_registry
        
        # Setup connector control plane mock
        mock_repo.connector_control_plane_repository.get_by_id.return_value = mock_connector_control_plane

        # Mock submodel service manager
        mock_submodel_service = Mock()
        mock_submodel_manager.return_value = mock_submodel_service
        
        with patch.object(self.service, '_get_manufacturer_id_from_twin', return_value=mock_connector_control_plane.legal_entity.bpnl):
            # Act
            result = self.service.create_or_update_twin_aspect_not_default(twin_aspect_create,
                                                                           mock_digital_twin_registry.id,
                                                                           mock_connector_control_plane.id)
            
            # Assert
            assert isinstance(result, TwinAspectRead)
            assert result.semantic_id == sample_semantic_id
            mock_submodel_service.upload_twin_aspect_document.assert_called_once()

    @patch('services.provider.twin_management_service.RepositoryManagerFactory.create')
    def test_create_or_update_twin_aspect_not_default_update_wrong_status(self, mock_repo_factory, mock_twin, 
                                                                        mock_digital_twin_registry, mock_connector_control_plane,
                                                                        sample_global_id, sample_semantic_id, sample_payload):
        """Test updating an existing twin aspect with wrong status raises error."""
        # Arrange
        submodel_id = UUID("12345678-1234-1234-1234-123456789012")
        twin_aspect_create = TwinAspectCreate(
            globalId=sample_global_id,
            semanticId=sample_semantic_id,
            submodelId=submodel_id,
            payload=sample_payload
        )
        
        mock_existing_aspect = Mock()
        mock_existing_aspect.id = 1
        mock_existing_aspect.semantic_id = sample_semantic_id
        mock_existing_aspect.submodel_id = submodel_id
        
        mock_registration = Mock()
        mock_registration.status = TwinAspectRegistrationStatus.PLANNED.value  # Wrong status for update
        mock_existing_aspect.registrations = [mock_registration]
        
        mock_repo = Mock()
        mock_repo_factory.return_value.__enter__.return_value = mock_repo
        mock_repo.twin_repository.find_by_global_id.return_value = mock_twin
        mock_repo.twin_aspect_repository.get_by_twin_id_semantic_id_submodel_id.return_value = mock_existing_aspect
        
        with patch.object(self.service, '_get_manufacturer_id_from_twin', return_value=mock_connector_control_plane.legal_entity.bpnl):
            # Act & Assert
            with pytest.raises(Exception):  # Should raise NotAvailableError
                self.service.create_or_update_twin_aspect_not_default(twin_aspect_create)
    
    def test_fill_aspects_multiple_submodels_same_type(self, mock_twin, mock_digital_twin_registry, mock_connector_control_plane):
        """Test filling aspects with multiple submodels of the same semantic type."""
        # Arrange
        mock_aspect_registration1 = Mock()
        mock_aspect_registration1.twin_registry = mock_digital_twin_registry
        mock_aspect_registration1.connector_control_plane = mock_connector_control_plane
        mock_aspect_registration1.status = TwinAspectRegistrationStatus.DTR_REGISTERED.value
        mock_aspect_registration1.registration_mode = TwinsAspectRegistrationMode.DISPATCHED.value
        mock_aspect_registration1.created_date = datetime.now()
        mock_aspect_registration1.modified_date = datetime.now()

        mock_aspect_registration2 = Mock()
        mock_aspect_registration2.twin_registry = mock_digital_twin_registry
        mock_aspect_registration2.connector_control_plane = mock_connector_control_plane
        mock_aspect_registration2.status = TwinAspectRegistrationStatus.DTR_REGISTERED.value
        mock_aspect_registration2.registration_mode = TwinsAspectRegistrationMode.DISPATCHED.value
        mock_aspect_registration2.created_date = datetime.now()
        mock_aspect_registration2.modified_date = datetime.now()

        # Create two aspects with same semantic ID but different submodel IDs
        mock_aspect1 = Mock()
        mock_aspect1.semantic_id = "urn:bamm:io.catenax.part_type_information:1.0.0#PartTypeInformation"
        mock_aspect1.submodel_id = UUID("12345678-1234-1234-1234-123456789012")
        mock_aspect1.twin_aspect_registrations = [mock_aspect_registration1]

        mock_aspect2 = Mock()
        mock_aspect2.semantic_id = "urn:bamm:io.catenax.part_type_information:1.0.0#PartTypeInformation"  # Same semantic ID
        mock_aspect2.submodel_id = UUID("87654321-4321-4321-4321-210987654321")  # Different submodel ID
        mock_aspect2.twin_aspect_registrations = [mock_aspect_registration2]

        mock_twin.twin_aspects = [mock_aspect1, mock_aspect2]

        twin_result = Mock()
        twin_result.aspects = {}

        # Act
        TwinManagementService._fill_aspects(mock_twin, twin_result)

        # Assert
        # Should have both all_aspects (complete list) and aspects (backward compatibility)
        assert hasattr(twin_result, 'all_aspects')
        assert hasattr(twin_result, 'aspects')
        
        # all_aspects should contain both aspects
        assert len(twin_result.all_aspects) == 2
        
        # aspects should only contain the first aspect of each semantic type (backward compatibility)
        assert len(twin_result.aspects) == 1
        assert mock_aspect1.semantic_id in twin_result.aspects



    def test_fill_aspects_different_semantic_types(self, mock_twin, mock_digital_twin_registry, mock_connector_control_plane):
        """Test filling aspects with different semantic types."""
        # Arrange
        mock_aspect_registration1 = Mock()
        mock_aspect_registration1.twin_registry = mock_digital_twin_registry
        mock_aspect_registration1.connector_control_plane = mock_connector_control_plane
        mock_aspect_registration1.status = TwinAspectRegistrationStatus.DTR_REGISTERED.value
        mock_aspect_registration1.registration_mode = TwinsAspectRegistrationMode.DISPATCHED.value
        mock_aspect_registration1.created_date = datetime.now()
        mock_aspect_registration1.modified_date = datetime.now()

        mock_aspect_registration2 = Mock()
        mock_aspect_registration2.twin_registry = mock_digital_twin_registry
        mock_aspect_registration2.connector_control_plane = mock_connector_control_plane
        mock_aspect_registration2.status = TwinAspectRegistrationStatus.DTR_REGISTERED.value
        mock_aspect_registration2.registration_mode = TwinsAspectRegistrationMode.DISPATCHED.value
        mock_aspect_registration2.created_date = datetime.now()
        mock_aspect_registration2.modified_date = datetime.now()

        # Create two aspects with different semantic IDs
        mock_aspect1 = Mock()
        mock_aspect1.semantic_id = "urn:bamm:io.catenax.part_type_information:1.0.0#PartTypeInformation"
        mock_aspect1.submodel_id = UUID("12345678-1234-1234-1234-123456789012")
        mock_aspect1.twin_aspect_registrations = [mock_aspect_registration1]

        mock_aspect2 = Mock()
        mock_aspect2.semantic_id = "urn:bamm:io.catenax.serial_part:3.0.0#SerialPart"  # Different semantic ID
        mock_aspect2.submodel_id = UUID("87654321-4321-4321-4321-210987654321")
        mock_aspect2.twin_aspect_registrations = [mock_aspect_registration2]

        mock_twin.twin_aspects = [mock_aspect1, mock_aspect2]

        twin_result = Mock()
        twin_result.aspects = {}

        # Act
        TwinManagementService._fill_aspects(mock_twin, twin_result)

        # Assert
        # Should have both all_aspects (complete list) and aspects (by semantic ID)
        assert hasattr(twin_result, 'all_aspects')
        assert hasattr(twin_result, 'aspects')
        
        # all_aspects should contain both aspects
        assert len(twin_result.all_aspects) == 2
        
        # aspects should contain both aspects since they have different semantic IDs
        assert len(twin_result.aspects) == 2
        assert mock_aspect1.semantic_id in twin_result.aspects
        assert mock_aspect2.semantic_id in twin_result.aspects

    @patch('services.provider.twin_management_service.RepositoryManagerFactory.create')
    def test_get_or_create_twin_aspect_registration_existing(self, mock_repo_factory, mock_digital_twin_registry, mock_connector_control_plane):
        """Test getting an existing twin aspect registration."""
        # Arrange
        mock_aspect = Mock()
        mock_existing_registration = Mock()
        mock_existing_registration.connector_control_plane_id = mock_connector_control_plane.id
        mock_aspect.find_registration_by_twin_registry_id.return_value = mock_existing_registration

        mock_repo = Mock()
        mock_repo_factory.return_value.__enter__.return_value = mock_repo

        # Act
        result = self.service._get_or_create_twin_aspect_registration(mock_repo, mock_aspect, mock_digital_twin_registry, mock_connector_control_plane)

        # Assert
        assert result == mock_existing_registration
        mock_aspect.find_registration_by_twin_registry_id.assert_called_once_with(mock_digital_twin_registry.id)

    @patch('services.provider.twin_management_service.RepositoryManagerFactory.create')
    def test_get_or_create_twin_aspect_registration_new(self, mock_repo_factory, mock_digital_twin_registry, mock_connector_control_plane):
        """Test creating a new twin aspect registration."""
        # Arrange
        mock_aspect = Mock()
        mock_aspect.find_registration_by_twin_registry_id.return_value = None
        mock_new_registration = Mock()

        mock_repo = Mock()
        mock_repo_factory.return_value.__enter__.return_value = mock_repo
        mock_repo.twin_aspect_registration_repository.create_new.return_value = mock_new_registration

        # Act
        result = self.service._get_or_create_twin_aspect_registration(mock_repo, mock_aspect, mock_digital_twin_registry, mock_connector_control_plane)

        # Assert
        assert result == mock_new_registration
        mock_repo.twin_aspect_registration_repository.create_new.assert_called_once()
        mock_repo.commit.assert_called()
        mock_repo.refresh.assert_called()

    def test_create_twin_aspect_read_response(self, mock_digital_twin_registry, mock_connector_control_plane):
        """Test creating twin aspect read response."""
        # Arrange
        mock_aspect = Mock()
        mock_aspect.semantic_id = "urn:bamm:io.catenax.part_type_information:1.0.0#PartTypeInformation"
        mock_aspect.submodel_id = UUID("12345678-1234-1234-1234-123456789012")
        
        mock_registration = Mock()
        mock_registration.status = TwinAspectRegistrationStatus.DTR_REGISTERED.value
        mock_registration.registration_mode = TwinsAspectRegistrationMode.DISPATCHED.value
        mock_registration.created_date = datetime.now()
        mock_registration.modified_date = datetime.now()

        # Act
        result = self.service._create_twin_aspect_read_response(mock_aspect, mock_digital_twin_registry, mock_connector_control_plane, mock_registration)

        # Assert
        assert isinstance(result, TwinAspectRead)
        assert result.semantic_id == mock_aspect.semantic_id
        assert result.submodel_id == mock_aspect.submodel_id
        assert mock_digital_twin_registry.name in result.registrations

    @patch('services.provider.twin_management_service.RepositoryManagerFactory.create')
    def test_create_twin_aspect_entity_db(self, mock_repo_factory, mock_twin, mock_digital_twin_registry, mock_connector_control_plane, sample_global_id, sample_semantic_id):
        """Test creating twin aspect entity in database."""
        # Arrange
        twin_aspect_create = TwinAspectCreate(
            globalId=sample_global_id,
            semanticId=sample_semantic_id,
            payload={}
        )
        
        mock_new_aspect = Mock()
        mock_repo = Mock()
        mock_repo_factory.return_value.__enter__.return_value = mock_repo
        mock_repo.twin_aspect_repository.create_new.return_value = mock_new_aspect

        # Act
        result = self.service._create_twin_aspect_entity_db(twin_aspect_create, mock_repo, mock_twin)

        # Assert
        assert result == mock_new_aspect
        mock_repo.twin_aspect_repository.create_new.assert_called_once_with(
            twin_id=mock_twin.id,
            semantic_id=sample_semantic_id,
            submodel_id=None
        )
        mock_repo.commit.assert_called_once()
        mock_repo.refresh.assert_called_once_with(mock_new_aspect)
