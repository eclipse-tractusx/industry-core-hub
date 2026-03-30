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

from services.provider.system_management_service import SystemManagementService

class TestSystemManagementService:
    """Test cases for SystemManagementService."""

    def setup_method(self):
        """Setup method called before each test."""
        self.service = SystemManagementService()

    @patch('services.provider.system_management_service.ConfigManager')
    @patch('services.provider.system_management_service.connector_manager')
    def test_ensure_dtr_asset_registration_success(self, mock_connector, mock_config):
        """Test successful DTR asset registration."""
        # Arrange
        mock_config.get_config.return_value = {
            "hostname": "http://test-dtr",
            "uri": "/api",
            "apiPath": "/v3",
            "policy": {},
            "asset_config": {"dct_type": "test", "existing_asset_id": None}
        }
        mock_connector.provider.register_dtr_offer.return_value = ("dtr_asset_id", None, None, None)

        # Act
        self.service.ensure_dtr_asset_registration()

        # Assert
        mock_connector.provider.register_dtr_offer.assert_called_once()

    @patch('services.provider.system_management_service.ConfigManager')
    @patch('services.provider.system_management_service.connector_manager')
    def test_ensure_dtr_asset_registration_failure(self, mock_connector, mock_config):
        """Test DTR asset registration failure."""
        # Arrange
        mock_config.get_config.return_value = {
            "hostname": "http://test-dtr",
            "uri": "/api",
            "apiPath": "/v3",
            "policy": {},
            "asset_config": {"dct_type": "test", "existing_asset_id": None}
        }
        mock_connector.provider.register_dtr_offer.return_value = (None, None, None, None)  # Failure

        # Act & Assert
        with pytest.raises(Exception):  # Should raise NotAvailableError
            self.service.ensure_dtr_asset_registration()
