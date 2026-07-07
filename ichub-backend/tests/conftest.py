#################################################################################
# Eclipse Tractus-X - Industry Core Hub Backend
#
# Copyright (c) 2026 LKS Next
# Copyright (c) 2026 Contributors to the Eclipse Foundation
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

import pytest
import sys
from unittest.mock import Mock, patch, MagicMock


def pytest_configure(config):
    """Configure pytest before test collection - mock database before imports."""
    # Mock the database engine and connection before importing any test modules
    mock_engine = MagicMock()
    mock_connection = MagicMock()
    mock_engine.connect.return_value.__enter__.return_value = mock_connection
    mock_engine.connect.return_value.__exit__.return_value = None

    # Patch database module
    sys.modules['database'] = MagicMock()
    sys.modules['database'].engine = mock_engine
    sys.modules['database'].get_session = MagicMock(return_value=MagicMock())

    # Mock SubmodelServiceManager so that module-level instantiation in routers
    # (notification_management_service = NotificationsManagementService()) does not
    # attempt to create filesystem directories or connect to external storage.
    # Individual tests that need specific behaviour override this via their own patches.
    mock_submodel_module = MagicMock()
    sys.modules['managers.enablement_services.submodel_service_manager'] = mock_submodel_module


@pytest.fixture(scope="session", autouse=True)
def mock_connector_globally():
    """Mock connector manager globally to avoid connection initialization."""
    with patch('connector.connector_manager') as mock_connector:
        mock_connector.consumer.connector_service = Mock()
        yield mock_connector

