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
from unittest.mock import Mock, patch, call, MagicMock
from uuid import UUID
import sys

# Mock all problematic tractusx_sdk imports
mock_tractusx_modules = [
    'tractusx_sdk',
    'tractusx_sdk.dataspace',
    'tractusx_sdk.dataspace.services',
    'tractusx_sdk.dataspace.services.connector',
    'tractusx_sdk.dataspace.services.connector.base_edc_service',
    'tractusx_sdk.dataspace.services.connector.ServiceFactory',
    'tractusx_sdk.dataspace.core',
    'tractusx_sdk.dataspace.core.dsc_manager',
    'tractusx_sdk.dataspace.core.exception',
    'tractusx_sdk.dataspace.core.exception.connector_error',
    'tractusx_sdk.dataspace.core.exception.connector_error.ConnectorError',
]

for module in mock_tractusx_modules:
    sys.modules[module] = MagicMock()

# Mock managers modules 
sys.modules['managers.enablement_services.submodel_service_manager'] = MagicMock()
sys.modules['tools.submodel_type_util'] = MagicMock()

from services.provider.submodel_dispatcher_service import SubmodelDispatcherService


class TestSubmodelDispatcherService:
    """Test cases for SubmodelDispatcherService."""

    def setup_method(self):
        """Setup method called before each test."""
        self.service = SubmodelDispatcherService()

    @pytest.fixture
    def sample_global_id(self):
        """Sample global ID for testing."""
        return UUID("123e4567-e89b-12d3-a456-426614174000")

    @pytest.fixture
    def sample_semantic_id(self):
        """Sample semantic ID for testing."""
        return "urn:bamm:io.catenax.part_type_information:1.0.0#PartTypeInformation"

    @pytest.fixture
    def sample_submodel_payload(self):
        """Sample submodel payload for testing."""
        return {
            "partTypeInformation": {
                "classification": "product",
                "manufacturerPartId": "PART001",
                "nameAtManufacturer": "Test Part"
            }
        }

    @pytest.fixture
    def sample_edc_bpn(self):
        """Sample EDC BPN for testing."""
        return "BPNL123456789012"

    @pytest.fixture
    def sample_contract_agreement_id(self):
        """Sample contract agreement ID for testing."""
        return "agreement-123"

    def test_service_initialization(self):
        """Test that the service initializes correctly."""
        service = SubmodelDispatcherService()
        assert service.submodel_service_manager is not None

    @patch('services.provider.submodel_dispatcher_service.get_submodel_type')
    def test_get_submodel_content_success(self, mock_get_submodel_type, sample_global_id,
                                         sample_semantic_id, sample_submodel_payload,
                                         sample_edc_bpn, sample_contract_agreement_id):
        """Test successful submodel content retrieval."""
        # Arrange
        mock_get_submodel_type.return_value = "PartTypeInformation"
        self.service.submodel_service_manager.get_twin_aspect_document = Mock(
            return_value=sample_submodel_payload
        )

        # Act
        result = self.service.get_submodel_content(
            edc_bpn=sample_edc_bpn,
            edc_contract_agreement_id=sample_contract_agreement_id,
            semantic_id=sample_semantic_id,
            submodel_id=sample_global_id
        )

        # Assert
        assert result == sample_submodel_payload
        mock_get_submodel_type.assert_called_once_with(sample_semantic_id)
        self.service.submodel_service_manager.get_twin_aspect_document.assert_called_once_with(
            sample_global_id, sample_semantic_id
        )

    @patch('services.provider.submodel_dispatcher_service.get_submodel_type')
    def test_get_submodel_content_with_none_edc_parameters(self, mock_get_submodel_type,
                                                          sample_global_id, sample_semantic_id,
                                                          sample_submodel_payload):
        """Test submodel content retrieval with None EDC parameters."""
        # Arrange
        mock_get_submodel_type.return_value = "PartTypeInformation"
        self.service.submodel_service_manager.get_twin_aspect_document = Mock(
            return_value=sample_submodel_payload
        )

        # Act
        result = self.service.get_submodel_content(
            edc_bpn=None,
            edc_contract_agreement_id=None,
            semantic_id=sample_semantic_id,
            submodel_id=sample_global_id
        )

        # Assert
        assert result == sample_submodel_payload
        mock_get_submodel_type.assert_called_once_with(sample_semantic_id)
        self.service.submodel_service_manager.get_twin_aspect_document.assert_called_once_with(
            sample_global_id, sample_semantic_id
        )

    @patch('services.provider.submodel_dispatcher_service.get_submodel_type')
    def test_get_submodel_content_invalid_semantic_id(self, mock_get_submodel_type,
                                                     sample_global_id, sample_edc_bpn):
        """Test submodel content retrieval with invalid semantic ID."""
        # Arrange
        invalid_semantic_id = "invalid:semantic:id"
        mock_get_submodel_type.side_effect = ValueError("Invalid semantic ID")

        # Act & Assert
        with pytest.raises(ValueError, match="Invalid semantic ID"):
            self.service.get_submodel_content(
                edc_bpn=sample_edc_bpn,
                edc_contract_agreement_id="agreement-123",
                semantic_id=invalid_semantic_id,
                submodel_id=sample_global_id
            )

        mock_get_submodel_type.assert_called_once_with(invalid_semantic_id)

    @patch('services.provider.submodel_dispatcher_service.get_submodel_type')
    def test_get_submodel_content_submodel_service_error(self, mock_get_submodel_type,
                                                        sample_global_id, sample_semantic_id,
                                                        sample_edc_bpn):
        """Test submodel content retrieval when submodel service raises error."""
        # Arrange
        mock_get_submodel_type.return_value = "PartTypeInformation"
        self.service.submodel_service_manager.get_twin_aspect_document = Mock(
            side_effect=Exception("Submodel service error")
        )

        # Act & Assert
        with pytest.raises(Exception, match="Submodel service error"):
            self.service.get_submodel_content(
                edc_bpn=sample_edc_bpn,
                edc_contract_agreement_id="agreement-123",
                semantic_id=sample_semantic_id,
                submodel_id=sample_global_id
            )

        mock_get_submodel_type.assert_called_once_with(sample_semantic_id)
        self.service.submodel_service_manager.get_twin_aspect_document.assert_called_once_with(
            sample_global_id, sample_semantic_id
        )

    @patch('services.provider.submodel_dispatcher_service.get_submodel_type')
    def test_upload_submodel_success(self, mock_get_submodel_type, sample_global_id,
                                    sample_semantic_id, sample_submodel_payload):
        """Test successful submodel upload."""
        # Arrange
        mock_get_submodel_type.return_value = "PartTypeInformation"
        self.service.submodel_service_manager.upload_twin_aspect_document = Mock()

        # Act
        self.service.upload_submodel(
            submodel_id=sample_global_id,
            semantic_id=sample_semantic_id,
            submodel_payload=sample_submodel_payload
        )

        # Assert
        mock_get_submodel_type.assert_called_once_with(sample_semantic_id)
        self.service.submodel_service_manager.upload_twin_aspect_document.assert_called_once_with(
            sample_global_id, sample_semantic_id, sample_submodel_payload
        )

    @patch('services.provider.submodel_dispatcher_service.get_submodel_type')
    def test_upload_submodel_invalid_semantic_id(self, mock_get_submodel_type,
                                                 sample_global_id, sample_submodel_payload):
        """Test submodel upload with invalid semantic ID."""
        # Arrange
        invalid_semantic_id = "invalid:semantic:id"
        mock_get_submodel_type.side_effect = ValueError("Invalid semantic ID")

        # Act & Assert
        with pytest.raises(ValueError, match="Invalid semantic ID"):
            self.service.upload_submodel(
                submodel_id=sample_global_id,
                semantic_id=invalid_semantic_id,
                submodel_payload=sample_submodel_payload
            )

        mock_get_submodel_type.assert_called_once_with(invalid_semantic_id)

    @patch('services.provider.submodel_dispatcher_service.get_submodel_type')
    def test_upload_submodel_with_empty_payload(self, mock_get_submodel_type,
                                               sample_global_id, sample_semantic_id):
        """Test submodel upload with empty payload."""
        # Arrange
        empty_payload = {}
        mock_get_submodel_type.return_value = "PartTypeInformation"
        self.service.submodel_service_manager.upload_twin_aspect_document = Mock()

        # Act
        self.service.upload_submodel(
            submodel_id=sample_global_id,
            semantic_id=sample_semantic_id,
            submodel_payload=empty_payload
        )

        # Assert
        mock_get_submodel_type.assert_called_once_with(sample_semantic_id)
        self.service.submodel_service_manager.upload_twin_aspect_document.assert_called_once_with(
            sample_global_id, sample_semantic_id, empty_payload
        )

    @patch('services.provider.submodel_dispatcher_service.get_submodel_type')
    def test_upload_submodel_service_error(self, mock_get_submodel_type,
                                          sample_global_id, sample_semantic_id,
                                          sample_submodel_payload):
        """Test submodel upload when submodel service raises error."""
        # Arrange
        mock_get_submodel_type.return_value = "PartTypeInformation"
        self.service.submodel_service_manager.upload_twin_aspect_document = Mock(
            side_effect=Exception("Upload failed")
        )

        # Act & Assert
        with pytest.raises(Exception, match="Upload failed"):
            self.service.upload_submodel(
                submodel_id=sample_global_id,
                semantic_id=sample_semantic_id,
                submodel_payload=sample_submodel_payload
            )

        mock_get_submodel_type.assert_called_once_with(sample_semantic_id)
        self.service.submodel_service_manager.upload_twin_aspect_document.assert_called_once_with(
            sample_global_id, sample_semantic_id, sample_submodel_payload
        )

    @patch('services.provider.submodel_dispatcher_service.get_submodel_type')
    def test_delete_submodel_success(self, mock_get_submodel_type,
                                    sample_global_id, sample_semantic_id):
        """Test successful submodel deletion."""
        # Arrange
        mock_get_submodel_type.return_value = "PartTypeInformation"
        self.service.submodel_service_manager.delete_twin_aspect_document = Mock()

        # Act
        self.service.delete_submodel(
            submodel_id=sample_global_id,
            semantic_id=sample_semantic_id
        )

        # Assert
        mock_get_submodel_type.assert_called_once_with(sample_semantic_id)
        self.service.submodel_service_manager.delete_twin_aspect_document.assert_called_once_with(
            sample_global_id, sample_semantic_id
        )

    @patch('services.provider.submodel_dispatcher_service.get_submodel_type')
    def test_delete_submodel_invalid_semantic_id(self, mock_get_submodel_type,
                                                 sample_global_id):
        """Test submodel deletion with invalid semantic ID."""
        # Arrange
        invalid_semantic_id = "invalid:semantic:id"
        mock_get_submodel_type.side_effect = ValueError("Invalid semantic ID")

        # Act & Assert
        with pytest.raises(ValueError, match="Invalid semantic ID"):
            self.service.delete_submodel(
                submodel_id=sample_global_id,
                semantic_id=invalid_semantic_id
            )

        mock_get_submodel_type.assert_called_once_with(invalid_semantic_id)

    @patch('services.provider.submodel_dispatcher_service.get_submodel_type')
    def test_delete_submodel_service_error(self, mock_get_submodel_type,
                                          sample_global_id, sample_semantic_id):
        """Test submodel deletion when submodel service raises error."""
        # Arrange
        mock_get_submodel_type.return_value = "PartTypeInformation"
        self.service.submodel_service_manager.delete_twin_aspect_document = Mock(
            side_effect=Exception("Delete failed")
        )

        # Act & Assert
        with pytest.raises(Exception, match="Delete failed"):
            self.service.delete_submodel(
                submodel_id=sample_global_id,
                semantic_id=sample_semantic_id
            )

        mock_get_submodel_type.assert_called_once_with(sample_semantic_id)
        self.service.submodel_service_manager.delete_twin_aspect_document.assert_called_once_with(
            sample_global_id, sample_semantic_id
        )

    def test_get_submodel_content_parameter_types(self, sample_global_id, sample_semantic_id):
        """Test that get_submodel_content accepts correct parameter types."""
        # This test verifies the method signature and parameter handling
        with patch('services.provider.submodel_dispatcher_service.get_submodel_type') as mock_validate, \
             patch.object(self.service.submodel_service_manager, 'get_twin_aspect_document') as mock_get:

            mock_validate.return_value = "PartTypeInformation"
            mock_get.return_value = {"test": "data"}

            # Test with string BPN
            self.service.get_submodel_content("BPNL123", "agreement", sample_semantic_id, sample_global_id)

            # Test with None values
            self.service.get_submodel_content(None, None, sample_semantic_id, sample_global_id)

            # Verify calls were made correctly
            assert mock_validate.call_count == 2
            assert mock_get.call_count == 2

    def test_upload_submodel_parameter_types(self, sample_global_id, sample_semantic_id):
        """Test that upload_submodel accepts correct parameter types."""
        with patch('services.provider.submodel_dispatcher_service.get_submodel_type') as mock_validate, \
             patch.object(self.service.submodel_service_manager, 'upload_twin_aspect_document') as mock_upload:

            mock_validate.return_value = "PartTypeInformation"

            # Test with different payload types
            payloads = [
                {"simple": "dict"},
                {"complex": {"nested": {"data": [1, 2, 3]}}},
                {},  # empty dict
            ]

            for payload in payloads:
                self.service.upload_submodel(sample_global_id, sample_semantic_id, payload)

            assert mock_validate.call_count == 3
            assert mock_upload.call_count == 3

    def test_delete_submodel_parameter_types(self, sample_global_id):
        """Test that delete_submodel accepts correct parameter types."""
        with patch('services.provider.submodel_dispatcher_service.get_submodel_type') as mock_validate, \
             patch.object(self.service.submodel_service_manager, 'delete_twin_aspect_document') as mock_delete:

            mock_validate.return_value = "PartTypeInformation"

            # Test with different semantic ID formats
            semantic_ids = [
                "urn:bamm:io.catenax.part_type_information:1.0.0#PartTypeInformation",
                "urn:bamm:io.catenax.serial_part:1.0.0#SerialPart",
                "simple:semantic:id"
            ]

            for semantic_id in semantic_ids:
                self.service.delete_submodel(sample_global_id, semantic_id)

            assert mock_validate.call_count == 3
            assert mock_delete.call_count == 3

    def test_service_manager_dependency_injection(self):
        """Test that the service properly handles dependency injection."""
        # Test that submodel_service_manager is properly initialized
        assert hasattr(self.service, 'submodel_service_manager')
        assert self.service.submodel_service_manager is not None

        # Test that the service manager has the expected methods
        expected_methods = ['get_twin_aspect_document', 'upload_twin_aspect_document', 'delete_twin_aspect_document']
        for method in expected_methods:
            assert hasattr(self.service.submodel_service_manager, method)

    @patch('services.provider.submodel_dispatcher_service.get_submodel_type')
    def test_all_methods_validate_semantic_id(self, mock_get_submodel_type, sample_global_id):
        """Test that all public methods validate semantic ID."""
        # Arrange
        semantic_id = "test:semantic:id"
        mock_get_submodel_type.return_value = "TestType"

        # Mock all submodel service manager methods
        self.service.submodel_service_manager.get_twin_aspect_document = Mock(return_value={})
        self.service.submodel_service_manager.upload_twin_aspect_document = Mock()
        self.service.submodel_service_manager.delete_twin_aspect_document = Mock()

        # Act - Call all public methods
        self.service.get_submodel_content(None, None, semantic_id, sample_global_id)
        self.service.upload_submodel(sample_global_id, semantic_id, {})
        self.service.delete_submodel(sample_global_id, semantic_id)

        # Assert - get_submodel_type should be called for each method
        assert mock_get_submodel_type.call_count == 3
        mock_get_submodel_type.assert_has_calls([
            call(semantic_id),
            call(semantic_id),
            call(semantic_id)
        ])
