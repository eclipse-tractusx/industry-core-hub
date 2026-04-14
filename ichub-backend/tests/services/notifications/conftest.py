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
from unittest.mock import Mock, patch


@pytest.fixture(autouse=True)
def mock_submodel_service_manager():
    """Mock SubmodelServiceManager to avoid filesystem access during tests."""
    with patch(
        'services.notifications.notifications_management_service.SubmodelServiceManager'
    ) as mock_cls:
        mock_cls.return_value = Mock()
        yield mock_cls


@pytest.fixture(autouse=True)
def mock_dtr_manager():
    """Mock dtr_manager to avoid DTR connection attempts during tests."""
    with patch('services.notifications.notifications_management_service.dtr_manager') as mock:
        mock.purge_edrs_matching.return_value = 0
        yield mock


@pytest.fixture(autouse=True)
def mock_connector_manager():
    """Mock connector manager to avoid connection attempts during test collection."""
    with patch('services.notifications.notifications_management_service.connector_manager') as mock:
        mock.consumer.connector_service = Mock()
        yield mock


@pytest.fixture(autouse=True)
def mock_logger():
    """Mock logger to avoid logging configuration issues."""
    with patch('services.notifications.notifications_management_service.logger'):
        yield
