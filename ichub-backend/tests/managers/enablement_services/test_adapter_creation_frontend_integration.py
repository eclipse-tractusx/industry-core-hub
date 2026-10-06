#################################################################################
# Eclipse Tractus-X - Industry Core Hub Backend
#
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
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND,
# either express or implied. See the
# License for the specific language governing permissions and limitations
# under the License.
#
# SPDX-License-Identifier: Apache-2.0
#################################################################################

"""
Integration tests for the submodel adapter creation flow, focused on the
"frontend" scenario: adapter type and adapter configuration are supplied at
runtime (e.g. from a frontend request or a database row) instead of the YAML
dispatcher section.

The whole chain runs unmocked:

    SubmodelServiceManager
        -> SubmodelAdapterProvider.create_adapter()
            -> AdapterConfigurationInterface.transform_config()
                -> SubmodelAdapterFactory.from_config()   (real Tractus-X SDK)

Covered scenarios:
1. Built-in adapters (file_system, http_submodel, s3) created from frontend config.
2. External adapters registered at runtime for the same three storage kinds and
   created through the frontend path.
3. Adapter caching keyed by (type, config) for frontend-supplied configurations.
4. Validation / error handling at the frontend boundary.
5. End-to-end write/read/delete round trip through a frontend-configured adapter.

Run with:
    pytest tests/managers/enablement_services/test_adapter_creation_frontend_integration.py -v
"""

from uuid import uuid4

import pytest

from tractusx_sdk.industry.adapters.submodel_adapter_factory import SubmodelAdapterFactory
from tractusx_sdk.industry.adapters.submodel_adapters import (
    FileSystemAdapter,
    HttpSubmodelAdapter,
    S3Adapter,
)

from managers.enablement_services.submodel_service_manager import SubmodelServiceManager
from managers.enablement_services.adapters.adapter_config_manager import (
    SubmodelAdapterProvider,
)
from tools.exceptions import NotFoundError


BUILT_IN_ADAPTERS = {"file_system", "http_submodel", "s3"}

# External adapter type keys registered at runtime by these tests.
EXTERNAL_FILE_SYSTEM = "frontend_file_system"
EXTERNAL_HTTP_SUBMODEL = "frontend_http_submodel"
EXTERNAL_S3 = "frontend_s3"


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def isolated_adapter_state():
    """Keep the adapter cache and the external adapter registry test-local."""
    SubmodelServiceManager.clear_adapter_cache()
    for adapter_type in SubmodelAdapterFactory.get_registered_adapter_types():
        SubmodelAdapterFactory.unregister_adapter(adapter_type)

    yield

    SubmodelServiceManager.clear_adapter_cache()
    for adapter_type in SubmodelAdapterFactory.get_registered_adapter_types():
        SubmodelAdapterFactory.unregister_adapter(adapter_type)


@pytest.fixture
def file_system_frontend_config(tmp_path) -> dict:
    """Frontend-supplied configuration for a file system adapter."""
    return {
        "root_path": str(tmp_path / "submodels"),
        "path_pattern": "{semantic_id_hash}/{submodel_id}.json",
    }


@pytest.fixture
def http_submodel_frontend_config() -> dict:
    """Frontend-supplied configuration for an HTTP submodel adapter."""
    return {
        "base_url": "https://external-ichub.example.com",
        "api_path": "/api/v1",
        "auth_type": "apikey",
        "auth_key_name": "X-Api-Key",
        "auth_token": "frontend-provided-key",
        "timeout": 10,
        "verify_ssl": True,
    }


@pytest.fixture
def s3_frontend_config() -> dict:
    """Frontend-supplied configuration for an S3 adapter (no network calls on build)."""
    return {
        "bucket_name": "submodels-frontend",
        "region_name": "eu-central-1",
        "endpoint_url": "http://localhost:8333",
        "key_pattern": "{semantic_id_hash}/{submodel_id}.json",
        "aws_access_key_id": "test-access-key",
        "aws_secret_access_key": "test-secret-key",
    }


# External adapter implementations. They reuse the SDK builders so the registered
# types behave exactly like the built-ins while living under their own keys.

class FrontendFileSystemAdapter(FileSystemAdapter):
    """External adapter registered via ``adapter_class``."""


class FrontendS3Adapter(S3Adapter):
    """External adapter registered via ``adapter_class``."""


def frontend_http_builder_factory():
    """External adapter registered via ``builder_factory``."""
    return HttpSubmodelAdapter.builder()


@pytest.fixture
def registered_external_adapters(request):
    """Register the three external adapter types through SubmodelServiceManager."""
    SubmodelServiceManager.register_external_adapter(
        adapter_type=EXTERNAL_FILE_SYSTEM,
        adapter_class=FrontendFileSystemAdapter,
    )
    SubmodelServiceManager.register_external_adapter(
        adapter_type=EXTERNAL_S3,
        adapter_class=FrontendS3Adapter,
    )
    SubmodelServiceManager.register_external_adapter(
        adapter_type=EXTERNAL_HTTP_SUBMODEL,
        builder_factory=frontend_http_builder_factory,
    )
    return [EXTERNAL_FILE_SYSTEM, EXTERNAL_S3, EXTERNAL_HTTP_SUBMODEL]


# ---------------------------------------------------------------------------
# 1. Built-in adapters created from frontend-supplied configuration
# ---------------------------------------------------------------------------

class TestFrontendBuiltInAdapterCreation:
    """Adapter creation bypassing YAML, using explicit type + config."""

    def test_file_system_adapter_from_frontend_config(self, file_system_frontend_config):
        manager = SubmodelServiceManager(
            adapter_type="file_system",
            adapter_config=file_system_frontend_config,
        )

        assert manager.adapter_mode == "file_system"
        assert isinstance(manager.adapter, FileSystemAdapter)
        assert manager.adapter.root_path == file_system_frontend_config["root_path"]
        assert manager.adapter.path_pattern == file_system_frontend_config["path_pattern"]

    def test_http_submodel_adapter_from_frontend_config(self, http_submodel_frontend_config):
        manager = SubmodelServiceManager(
            adapter_type="http_submodel",
            adapter_config=http_submodel_frontend_config,
        )

        assert manager.adapter_mode == "http_submodel"
        assert isinstance(manager.adapter, HttpSubmodelAdapter)
        assert manager.adapter.base_url == "https://external-ichub.example.com"
        assert manager.adapter.api_path == "/api/v1"
        assert manager.adapter.auth_key_name == "X-Api-Key"

    def test_s3_adapter_from_frontend_config(self, s3_frontend_config):
        manager = SubmodelServiceManager(
            adapter_type="s3",
            adapter_config=s3_frontend_config,
        )

        assert manager.adapter_mode == "s3"
        assert isinstance(manager.adapter, S3Adapter)
        assert manager.adapter.bucket_name == "submodels-frontend"
        assert manager.adapter.key_pattern == s3_frontend_config["key_pattern"]

    @pytest.mark.parametrize(
        "raw_type, expected_mode",
        [
            ("File-System", "file_system"),
            ("  FILE SYSTEM  ", "file_system"),
            ("File_System", "file_system"),
        ],
    )
    def test_adapter_type_from_frontend_is_normalized(
        self, raw_type, expected_mode, file_system_frontend_config
    ):
        """The frontend may send any casing/separator variant of the type key."""
        manager = SubmodelServiceManager(
            adapter_type=raw_type,
            adapter_config=file_system_frontend_config,
        )

        assert manager.adapter_mode == expected_mode
        assert isinstance(manager.adapter, FileSystemAdapter)


# ---------------------------------------------------------------------------
# 2. External adapter registration for the three storage kinds
# ---------------------------------------------------------------------------

class TestFrontendExternalAdapterRegistration:
    """Runtime registration + creation of external adapters via the frontend path."""

    def test_registered_types_are_reported(self, registered_external_adapters):
        registered = SubmodelServiceManager.get_registered_adapters()

        assert set(registered) == set(registered_external_adapters)
        assert BUILT_IN_ADAPTERS.isdisjoint(registered)

        available = SubmodelAdapterFactory.get_available_adapter_types()
        assert BUILT_IN_ADAPTERS.issubset(available)
        assert set(registered_external_adapters).issubset(available)

    def test_external_file_system_adapter_creation(
        self, registered_external_adapters, file_system_frontend_config
    ):
        manager = SubmodelServiceManager(
            adapter_type=EXTERNAL_FILE_SYSTEM,
            adapter_config=file_system_frontend_config,
        )

        assert manager.adapter_mode == EXTERNAL_FILE_SYSTEM
        assert isinstance(manager.adapter, FrontendFileSystemAdapter)
        assert manager.adapter.root_path == file_system_frontend_config["root_path"]

    def test_external_s3_adapter_creation(
        self, registered_external_adapters, s3_frontend_config
    ):
        manager = SubmodelServiceManager(
            adapter_type=EXTERNAL_S3,
            adapter_config=s3_frontend_config,
        )

        assert manager.adapter_mode == EXTERNAL_S3
        assert isinstance(manager.adapter, FrontendS3Adapter)
        assert manager.adapter.bucket_name == "submodels-frontend"

    def test_external_http_submodel_adapter_creation(
        self, registered_external_adapters, http_submodel_frontend_config
    ):
        manager = SubmodelServiceManager(
            adapter_type=EXTERNAL_HTTP_SUBMODEL,
            adapter_config=http_submodel_frontend_config,
        )

        assert manager.adapter_mode == EXTERNAL_HTTP_SUBMODEL
        assert isinstance(manager.adapter, HttpSubmodelAdapter)
        assert manager.adapter.auth_token == "frontend-provided-key"

    def test_duplicate_registration_requires_overwrite(self, registered_external_adapters):
        with pytest.raises(ValueError, match="already registered"):
            SubmodelServiceManager.register_external_adapter(
                adapter_type=EXTERNAL_S3,
                adapter_class=FrontendS3Adapter,
            )

        SubmodelServiceManager.register_external_adapter(
            adapter_type=EXTERNAL_S3,
            adapter_class=FrontendS3Adapter,
            overwrite=True,
        )
        assert EXTERNAL_S3 in SubmodelServiceManager.get_registered_adapters()

    def test_registration_requires_exactly_one_source(self):
        with pytest.raises(ValueError, match="mutually exclusive"):
            SubmodelServiceManager.register_external_adapter(
                adapter_type="invalid_adapter",
                adapter_class=FrontendS3Adapter,
                builder_factory=frontend_http_builder_factory,
            )

        with pytest.raises(ValueError, match="mutually exclusive"):
            SubmodelServiceManager.register_external_adapter(adapter_type="invalid_adapter")

        assert "invalid_adapter" not in SubmodelServiceManager.get_registered_adapters()

    def test_registration_rejects_class_without_builder(self):
        class AdapterWithoutBuilder:
            pass

        with pytest.raises(TypeError, match="builder"):
            SubmodelServiceManager.register_external_adapter(
                adapter_type="no_builder",
                adapter_class=AdapterWithoutBuilder,
            )

    def test_unregister_external_adapter(
        self, registered_external_adapters, http_submodel_frontend_config
    ):
        SubmodelServiceManager.unregister_external_adapter(EXTERNAL_HTTP_SUBMODEL)

        assert EXTERNAL_HTTP_SUBMODEL not in SubmodelServiceManager.get_registered_adapters()
        with pytest.raises(ValueError, match="not registered"):
            SubmodelServiceManager(
                adapter_type=EXTERNAL_HTTP_SUBMODEL,
                adapter_config=http_submodel_frontend_config,
            )

    def test_unregister_unknown_or_built_in_adapter_is_rejected(self):
        with pytest.raises(ValueError, match="not registered"):
            SubmodelServiceManager.unregister_external_adapter("s3")

        with pytest.raises(ValueError, match="not registered"):
            SubmodelServiceManager.unregister_external_adapter("never_registered")


# ---------------------------------------------------------------------------
# 3. Caching of frontend-supplied adapters
# ---------------------------------------------------------------------------

class TestFrontendAdapterCaching:
    """Cache keys are derived from adapter type and configuration content."""

    def test_identical_frontend_config_reuses_adapter(self, s3_frontend_config):
        first = SubmodelServiceManager(adapter_type="s3", adapter_config=s3_frontend_config)
        second = SubmodelServiceManager(adapter_type="s3", adapter_config=dict(s3_frontend_config))

        assert first.adapter is second.adapter

    def test_different_frontend_config_builds_new_adapter(self, s3_frontend_config):
        first = SubmodelServiceManager(adapter_type="s3", adapter_config=s3_frontend_config)

        other_config = dict(s3_frontend_config, bucket_name="another-bucket")
        second = SubmodelServiceManager(adapter_type="s3", adapter_config=other_config)

        assert first.adapter is not second.adapter
        assert second.adapter.bucket_name == "another-bucket"

    def test_built_in_and_external_types_are_cached_separately(
        self, registered_external_adapters, file_system_frontend_config
    ):
        built_in = SubmodelServiceManager(
            adapter_type="file_system", adapter_config=file_system_frontend_config
        )
        external = SubmodelServiceManager(
            adapter_type=EXTERNAL_FILE_SYSTEM, adapter_config=file_system_frontend_config
        )

        assert built_in.adapter is not external.adapter
        assert type(built_in.adapter) is FileSystemAdapter
        assert type(external.adapter) is FrontendFileSystemAdapter

    def test_clear_cache_forces_rebuild(self, file_system_frontend_config):
        first = SubmodelServiceManager(
            adapter_type="file_system", adapter_config=file_system_frontend_config
        )
        SubmodelServiceManager.clear_adapter_cache()
        second = SubmodelServiceManager(
            adapter_type="file_system", adapter_config=file_system_frontend_config
        )

        assert first.adapter is not second.adapter


# ---------------------------------------------------------------------------
# 4. Validation at the frontend boundary
# ---------------------------------------------------------------------------

class TestFrontendAdapterCreationValidation:
    """Invalid frontend payloads must fail before an adapter is built."""

    def test_unknown_adapter_type_is_rejected(self):
        with pytest.raises(ValueError, match="not registered"):
            SubmodelServiceManager(
                adapter_type="totally_unknown",
                adapter_config={"root_path": "./submodels"},
            )

    def test_adapter_type_without_config_is_rejected(self):
        with pytest.raises(ValueError, match="Both adapter_type and adapter_config"):
            SubmodelServiceManager(adapter_type="file_system")

    def test_config_without_adapter_type_is_rejected(self, file_system_frontend_config):
        with pytest.raises(ValueError, match="Both adapter_type and adapter_config"):
            SubmodelServiceManager(adapter_config=file_system_frontend_config)

    def test_non_dict_config_is_rejected(self):
        with pytest.raises(ValueError, match="must be a dictionary"):
            SubmodelAdapterProvider.create_adapter(
                adapter_type="file_system",
                adapter_config=["root_path", "./submodels"],
            )

    def test_empty_adapter_type_is_rejected(self, file_system_frontend_config):
        with pytest.raises(ValueError, match="non-empty string"):
            SubmodelAdapterProvider.create_adapter(
                adapter_type="   ",
                adapter_config=file_system_frontend_config,
            )

    def test_unsupported_config_key_is_rejected(self):
        with pytest.raises(ValueError, match="Unsupported config key"):
            SubmodelServiceManager(
                adapter_type="file_system",
                adapter_config={"root_path": "./submodels", "bucket_name": "nope"},
            )

    def test_missing_required_builder_key_is_rejected(self):
        with pytest.raises(ValueError, match="bucket_name"):
            SubmodelServiceManager(
                adapter_type="s3",
                adapter_config={"region_name": "eu-central-1"},
            )

    def test_invalid_config_value_type_is_rejected(self, http_submodel_frontend_config):
        invalid_config = dict(http_submodel_frontend_config, timeout="not-an-int")

        with pytest.raises(RuntimeError, match="Invalid type for config key 'timeout'"):
            SubmodelServiceManager(
                adapter_type="http_submodel",
                adapter_config=invalid_config,
            )


# ---------------------------------------------------------------------------
# 5. End-to-end operations through a frontend-configured adapter
# ---------------------------------------------------------------------------

class TestFrontendAdapterOperations:
    """Full round trip proving the created adapter is actually usable."""

    SEMANTIC_ID = "urn:samm:io.catenax.serial_part:3.0.0#SerialPart"

    def test_write_read_delete_round_trip(
        self, registered_external_adapters, file_system_frontend_config
    ):
        manager = SubmodelServiceManager(
            adapter_type=EXTERNAL_FILE_SYSTEM,
            adapter_config=file_system_frontend_config,
        )
        submodel_id = uuid4()
        payload = {"modelType": "Submodel", "catenaXId": str(submodel_id)}

        manager.upload_twin_aspect_document(submodel_id, self.SEMANTIC_ID, payload)
        assert manager.get_twin_aspect_document(submodel_id, self.SEMANTIC_ID) == payload

        manager.delete_twin_aspect_document(submodel_id, self.SEMANTIC_ID)
        with pytest.raises(NotFoundError):
            manager.get_twin_aspect_document(submodel_id, self.SEMANTIC_ID)

    def test_read_missing_submodel_raises_not_found(self, file_system_frontend_config):
        manager = SubmodelServiceManager(
            adapter_type="file_system",
            adapter_config=file_system_frontend_config,
        )

        with pytest.raises(NotFoundError):
            manager.get_twin_aspect_document(uuid4(), self.SEMANTIC_ID)
