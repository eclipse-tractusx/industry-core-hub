#################################################################################
# Eclipse Tractus-X - Industry Core Hub Backend
#
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

import sys

import pytest
from unittest.mock import Mock, patch, MagicMock
from fastapi.testclient import TestClient


# Modules that are permanently replaced with MagicMocks at collection time by
# tests/services/provider/test_twin_management_service.py (and similar files).
# They must be real implementations when the FastAPI app is imported so that
# ConfigManager.get_config() returns proper strings for router path prefixes.
_MODULES_NEEDING_REAL_IMPL = [
    'managers.config.config_manager',
    'managers.config.log_manager',
    'tools.exceptions',
    'tools.constants',
]


def _restore_real_modules() -> dict:
    """
    Remove any MagicMock entries for critical modules from sys.modules so that
    a subsequent import resolves the real implementation from disk.

    Returns the removed entries so they can be put back afterwards if needed.
    """
    removed = {}
    for mod_name in _MODULES_NEEDING_REAL_IMPL:
        entry = sys.modules.get(mod_name)
        if isinstance(entry, MagicMock):
            removed[mod_name] = sys.modules.pop(mod_name)
    return removed


@pytest.fixture(scope="session")
def app_client():
    """
    Session-scoped TestClient for the FastAPI app.

    Some test files permanently replace ``managers.config.config_manager`` (and
    other modules) in ``sys.modules`` at collection time via module-level
    ``sys.modules[name] = MagicMock()`` statements.  When the app is imported
    after those replacements, FastAPI fails to build router path prefixes because
    ``ConfigManager.get_config()`` returns MagicMock objects.

    We temporarily restore the real modules before importing the app, then let
    Python's import cache keep the real implementations for the duration of the
    session (the service tests that need mocked config already patch it via
    function-scoped ``@patch`` decorators, which restore the mock per test).

    Additionally, the notifications service imports ``connector_manager`` via
    ``from connector import connector_manager``, binding the module-level None
    value before the connector setup function runs.  We patch that local reference
    so that ``NotificationsManagementService.__init__`` succeeds when the router
    is imported.
    """
    _restore_real_modules()

    with patch("services.notifications.notifications_management_service.connector_manager") as mock_conn, \
         patch("services.notifications.notifications_management_service.dtr_manager") as mock_dtr, \
         patch("controllers.fastapi.routers.authentication.auth_api.api_key_manager", None), \
         patch("controllers.fastapi.routers.authentication.auth_api.oauth2_manager", None):
        mock_conn.consumer.connector_service = Mock()
        mock_dtr.purge_edrs_matching.return_value = 0

        from controllers.fastapi.app import app

        with TestClient(app, raise_server_exceptions=False) as client:
            yield client


@pytest.fixture
def mock_notification_svc():
    """
    Function-scoped patch of the module-level ``notification_management_service``
    singleton in the notifications router.  Tests that exercise the happy path
    use this fixture to control service return values without touching real
    infrastructure.
    """
    with patch(
        "controllers.fastapi.routers.notifications.v1.notifications_management.notification_management_service"
    ) as mock_svc:
        yield mock_svc
