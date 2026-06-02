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
## Code created partially using a LLM and reviewed by a human committer

"""
Shared pytest fixtures for PCF Kit controller tests.

Requirements
------------
These tests require Python 3.12 and tractusx-sdk installed in the venv.
Run from ichub-backend/ with:

    PYTHONPATH=. python3.12 -m pytest tests/controllers/pcf_kit/

connector is stubbed at configure time to prevent DB/EDC connections.
All other packages (tractusx_sdk, fastapi, SQLAlchemy) are used as installed.
"""

import sys
import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient

_MODULES_NEEDING_REAL_IMPL = [
    "managers.config.config_manager",
    "managers.config.log_manager",
    "tools.exceptions",
    "tools.constants",
]


def pytest_configure(config):
    """Stub connector at collection time to prevent real DB/EDC initialisation."""
    sys.modules.setdefault("connector", MagicMock())


def _restore_real_modules() -> None:
    for mod_name in _MODULES_NEEDING_REAL_IMPL:
        entry = sys.modules.get(mod_name)
        if isinstance(entry, MagicMock):
            sys.modules.pop(mod_name)


@pytest.fixture(scope="session")
def app_client():
    """
    Session-scoped TestClient.

    Pre-imports the app so all modules are in sys.modules before patch()
    tries to resolve them. controllers/fastapi/__init__.py eagerly imports
    the full app, which would cause a chicken-and-egg problem otherwise.
    """
    _restore_real_modules()

    import controllers.fastapi.app  # noqa: F401 - pre-warm sys.modules

    with (
        patch(
            "controllers.fastapi.routers.authentication.auth_api.api_key_manager",
            None,
        ),
        patch(
            "controllers.fastapi.routers.authentication.auth_api.oauth2_manager",
            None,
        ),
        patch(
            "controllers.fastapi.routers.addons.pcf_kit.v1.consumption.consumption_manager",
            MagicMock(),
        ),
        patch(
            "controllers.fastapi.routers.addons.pcf_kit.v1.provision.provision_manager",
            MagicMock(),
        ),
        patch(
            "controllers.fastapi.routers.addons.pcf_kit.v1.exchange.exchange_manager",
            MagicMock(),
        ),
    ):
        from controllers.fastapi.app import app

        with TestClient(app, raise_server_exceptions=False) as client:
            yield client


@pytest.fixture
def mock_consumption_mgr():
    with patch(
        "controllers.fastapi.routers.addons.pcf_kit.v1.consumption.consumption_manager"
    ) as mock:
        yield mock


@pytest.fixture
def mock_provision_mgr():
    with patch(
        "controllers.fastapi.routers.addons.pcf_kit.v1.provision.provision_manager"
    ) as mock:
        yield mock


@pytest.fixture
def mock_exchange_mgr():
    with patch(
        "controllers.fastapi.routers.addons.pcf_kit.v1.exchange.exchange_manager"
    ) as mock:
        yield mock
