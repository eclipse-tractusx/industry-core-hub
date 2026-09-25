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
Integration tests for the frontend adapter scenario against a real SeaweedFS S3 backend.

Instead of reading the dispatcher section from YAML, an S3 adapter is registered
at runtime as a *new external adapter type* (as a frontend/plugin would do) and
then instantiated with a configuration supplied at request time:

    SubmodelServiceManager.register_external_adapter("frontend_s3", adapter_class=...)
    SubmodelServiceManager(adapter_type="frontend_s3", adapter_config={...})

The resulting adapter is exercised end-to-end through the manager API
(WRITE -> READ -> DELETE) against SeaweedFS, and every operation is cross-checked
with a raw boto3 client.

Prerequisites:
- SeaweedFS running with the S3 API on http://localhost:8333
- boto3 installed

Run with:
    pytest tests/managers/enablement_services/test_seaweedfs_frontend_s3_adapter.py -v -s

Written objects are kept in the bucket after the run so they can be inspected in
SeaweedFS; set ICHUB_TEST_PRESERVE_BUCKET=0 to clean the bucket up instead.

The whole module is skipped when boto3 is missing or SeaweedFS is unreachable.
"""

import json
import os
from uuid import UUID, uuid4

import pytest

boto3 = pytest.importorskip("boto3")

from tractusx_sdk.industry.adapters.submodel_adapter_factory import SubmodelAdapterFactory
from tractusx_sdk.industry.adapters.submodel_adapters import S3Adapter

from managers.enablement_services.submodel_service_manager import SubmodelServiceManager
from managers.enablement_services.adapters.adapter_config_manager import (
    get_all_available_adapter_types,
)
from tools.exceptions import NotFoundError


SEAWEEDFS_ENDPOINT = "http://localhost:8333"
BUCKET_NAME = "ichub-submodels"
KEY_PATTERN = "{semantic_id}/{submodel_id}.json"

# Keep the bucket and its objects after the run so results can be inspected in SeaweedFS.
# Set ICHUB_TEST_PRESERVE_BUCKET=0 to clean up instead.
PRESERVE_BUCKET_FOR_INSPECTION = os.getenv("ICHUB_TEST_PRESERVE_BUCKET", "1") != "0"

# Adapter type key a frontend/plugin would register for its own S3 storage.
FRONTEND_S3_ADAPTER_TYPE = "frontend_s3"


class FrontendS3Adapter(S3Adapter):
    """External S3 adapter registered at runtime, built through the SDK S3 builder."""


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(scope="module")
def s3_client():
    """Raw boto3 client used to verify what the manager wrote/deleted."""
    client = boto3.client(
        "s3",
        endpoint_url=SEAWEEDFS_ENDPOINT,
        aws_access_key_id="admin",
        aws_secret_access_key="secret",
        region_name="us-east-1",
    )
    try:
        client.list_buckets()
    except Exception as e:
        pytest.skip(f"SeaweedFS not reachable at {SEAWEEDFS_ENDPOINT}: {e}")
    return client


@pytest.fixture(scope="module")
def s3_bucket(s3_client):
    """Provide the test bucket, keeping written objects for inspection by default."""
    def purge_bucket() -> None:
        try:
            response = s3_client.list_objects_v2(Bucket=BUCKET_NAME)
            for obj in response.get("Contents", []):
                s3_client.delete_object(Bucket=BUCKET_NAME, Key=obj["Key"])
            s3_client.delete_bucket(Bucket=BUCKET_NAME)
        except Exception:
            pass

    if not PRESERVE_BUCKET_FOR_INSPECTION:
        purge_bucket()

    try:
        s3_client.create_bucket(Bucket=BUCKET_NAME)
    except Exception as e:
        # SeaweedFS returns an error when the bucket already exists from a previous run.
        if not PRESERVE_BUCKET_FOR_INSPECTION:
            pytest.fail(f"Cannot create S3 bucket '{BUCKET_NAME}' in SeaweedFS: {e}")

    yield BUCKET_NAME

    if PRESERVE_BUCKET_FOR_INSPECTION:
        response = s3_client.list_objects_v2(Bucket=BUCKET_NAME)
        objects = response.get("Contents", [])
        print(
            f"\n✓ PRESERVING S3 bucket '{BUCKET_NAME}' with {len(objects)} object(s) "
            f"for inspection at {SEAWEEDFS_ENDPOINT}"
        )
        for obj in objects:
            print(f"   - {obj['Key']} ({obj['Size']} bytes)")
    else:
        purge_bucket()


@pytest.fixture
def frontend_s3_config(s3_bucket) -> dict:
    """Adapter configuration as a frontend request would deliver it."""
    return {
        "bucket_name": s3_bucket,
        "region_name": "us-east-1",
        "endpoint_url": SEAWEEDFS_ENDPOINT,
        "key_pattern": KEY_PATTERN,
        "aws_access_key_id": "admin",
        "aws_secret_access_key": "secret",
    }


@pytest.fixture(autouse=True)
def registered_frontend_s3_adapter():
    """Register the external S3 adapter type for each test and clean up afterwards."""
    SubmodelServiceManager.clear_adapter_cache()
    SubmodelServiceManager.register_external_adapter(
        adapter_type=FRONTEND_S3_ADAPTER_TYPE,
        adapter_class=FrontendS3Adapter,
        overwrite=True,
    )

    yield FRONTEND_S3_ADAPTER_TYPE

    SubmodelServiceManager.clear_adapter_cache()
    SubmodelAdapterFactory.unregister_adapter(FRONTEND_S3_ADAPTER_TYPE)


@pytest.fixture
def manager(frontend_s3_config) -> SubmodelServiceManager:
    """Manager backed by the frontend-registered S3 adapter."""
    return SubmodelServiceManager(
        adapter_type=FRONTEND_S3_ADAPTER_TYPE,
        adapter_config=frontend_s3_config,
    )


@pytest.fixture
def sample_submodel() -> dict:
    """Minimal but realistic AAS submodel payload."""
    return {
        "modelType": "Submodel",
        "identification": "urn:example:submodel:frontend-s3",
        "semanticId": {
            "type": "ExternalReference",
            "keys": [
                {
                    "type": "GlobalReference",
                    "value": "urn:samm:io.catenax.serial_part:3.0.0#SerialPart",
                }
            ],
        },
        "submodelElements": [
            {
                "idShort": "serialNumber",
                "modelType": "Property",
                "valueType": "xs:string",
                "value": "SN-FRONTEND-001",
            }
        ],
    }


def s3_key(semantic_id: str, submodel_id) -> str:
    """Object key the adapter resolves from the configured key pattern."""
    return KEY_PATTERN.format(semantic_id=semantic_id, submodel_id=submodel_id)


# ---------------------------------------------------------------------------
# Adapter registration and creation
# ---------------------------------------------------------------------------

class TestFrontendS3AdapterRegistration:
    """The runtime-registered S3 type is usable like a built-in one."""

    def test_adapter_type_is_registered(self, registered_frontend_s3_adapter):
        assert FRONTEND_S3_ADAPTER_TYPE in SubmodelServiceManager.get_registered_adapters()
        assert FRONTEND_S3_ADAPTER_TYPE in get_all_available_adapter_types()

    def test_manager_builds_registered_s3_adapter(self, manager, frontend_s3_config):
        assert manager.adapter_mode == FRONTEND_S3_ADAPTER_TYPE
        assert isinstance(manager.adapter, FrontendS3Adapter)
        assert manager.adapter.bucket_name == frontend_s3_config["bucket_name"]
        assert manager.adapter.key_pattern == KEY_PATTERN

    def test_same_frontend_config_reuses_adapter(self, manager, frontend_s3_config):
        second = SubmodelServiceManager(
            adapter_type=FRONTEND_S3_ADAPTER_TYPE,
            adapter_config=dict(frontend_s3_config),
        )
        assert manager.adapter is second.adapter


# ---------------------------------------------------------------------------
# WRITE / READ / DELETE against SeaweedFS
# ---------------------------------------------------------------------------

class TestFrontendS3AdapterOperations:
    """Manager CRUD operations verified against the real SeaweedFS bucket."""

    SEMANTIC_ID = "urn:samm:io.catenax.frontend_s3:1.0.0"

    def test_write_stores_object_in_seaweedfs(
        self, manager, sample_submodel, s3_client, s3_bucket
    ):
        submodel_id = uuid4()

        manager.upload_twin_aspect_document(submodel_id, self.SEMANTIC_ID, sample_submodel)

        response = s3_client.get_object(
            Bucket=s3_bucket, Key=s3_key(self.SEMANTIC_ID, submodel_id)
        )
        assert json.loads(response["Body"].read()) == sample_submodel

    def test_read_returns_stored_payload(self, manager, sample_submodel, s3_client, s3_bucket):
        submodel_id = uuid4()
        s3_client.put_object(
            Bucket=s3_bucket,
            Key=s3_key(self.SEMANTIC_ID, submodel_id),
            Body=json.dumps(sample_submodel),
            ContentType="application/json",
        )

        assert manager.get_twin_aspect_document(submodel_id, self.SEMANTIC_ID) == sample_submodel

    def test_delete_removes_object_from_seaweedfs(
        self, manager, sample_submodel, s3_client, s3_bucket
    ):
        submodel_id = uuid4()
        manager.upload_twin_aspect_document(submodel_id, self.SEMANTIC_ID, sample_submodel)

        manager.delete_twin_aspect_document(submodel_id, self.SEMANTIC_ID)

        with pytest.raises(Exception):
            s3_client.head_object(
                Bucket=s3_bucket, Key=s3_key(self.SEMANTIC_ID, submodel_id)
            )

    def test_write_read_delete_round_trip(self, manager, sample_submodel):
        submodel_id = uuid4()

        manager.upload_twin_aspect_document(submodel_id, self.SEMANTIC_ID, sample_submodel)
        assert manager.get_twin_aspect_document(submodel_id, self.SEMANTIC_ID) == sample_submodel

        manager.delete_twin_aspect_document(submodel_id, self.SEMANTIC_ID)
        with pytest.raises(NotFoundError):
            manager.get_twin_aspect_document(submodel_id, self.SEMANTIC_ID)

    def test_overwrite_existing_submodel(self, manager, sample_submodel):
        submodel_id = uuid4()
        manager.upload_twin_aspect_document(submodel_id, self.SEMANTIC_ID, sample_submodel)

        updated = dict(sample_submodel, identification="urn:example:submodel:updated")
        manager.upload_twin_aspect_document(submodel_id, self.SEMANTIC_ID, updated)

        assert manager.get_twin_aspect_document(submodel_id, self.SEMANTIC_ID) == updated

    def test_multiple_submodels_share_semantic_id(self, manager, sample_submodel, s3_client, s3_bucket):
        submodel_ids = [UUID(int=index) for index in range(3)]
        for submodel_id in submodel_ids:
            manager.upload_twin_aspect_document(submodel_id, self.SEMANTIC_ID, sample_submodel)

        response = s3_client.list_objects_v2(
            Bucket=s3_bucket, Prefix=f"{self.SEMANTIC_ID}/"
        )
        stored_keys = {obj["Key"] for obj in response.get("Contents", [])}
        assert {s3_key(self.SEMANTIC_ID, submodel_id) for submodel_id in submodel_ids} <= stored_keys

    def test_large_payload_round_trip(self, manager):
        submodel_id = uuid4()
        large_submodel = {
            "modelType": "Submodel",
            "identification": "urn:example:submodel:large",
            "submodelElements": [
                {
                    "idShort": f"element_{index}",
                    "modelType": "Property",
                    "valueType": "xs:string",
                    "value": f"payload element {index}",
                }
                for index in range(1000)
            ],
        }

        manager.upload_twin_aspect_document(submodel_id, self.SEMANTIC_ID, large_submodel)

        assert manager.get_twin_aspect_document(submodel_id, self.SEMANTIC_ID) == large_submodel

    def test_persisted_submodel_stays_in_bucket(self, manager, sample_submodel, s3_client, s3_bucket):
        """Leave a stable, never-deleted object behind for manual inspection in SeaweedFS."""
        semantic_id = "urn:samm:io.catenax.frontend_s3_persisted:1.0.0"
        submodel_id = UUID("11111111-1111-1111-1111-111111111111")

        manager.upload_twin_aspect_document(submodel_id, semantic_id, sample_submodel)

        key = s3_key(semantic_id, submodel_id)
        response = s3_client.get_object(Bucket=s3_bucket, Key=key)
        assert json.loads(response["Body"].read()) == sample_submodel
        print(f"\n✓ Persisted submodel available at s3://{s3_bucket}/{key}")


class TestFrontendS3AdapterErrorHandling:
    """Error behaviour of the frontend-registered adapter."""

    SEMANTIC_ID = "urn:samm:io.catenax.frontend_s3_missing:1.0.0"

    def test_read_missing_submodel_raises_not_found(self, manager):
        with pytest.raises(NotFoundError):
            manager.get_twin_aspect_document(uuid4(), self.SEMANTIC_ID)

    def test_delete_missing_submodel_raises_not_found(self, manager):
        with pytest.raises(NotFoundError):
            manager.delete_twin_aspect_document(uuid4(), self.SEMANTIC_ID)

    def test_operations_fail_after_unregistering_adapter(self, frontend_s3_config):
        SubmodelServiceManager.unregister_external_adapter(FRONTEND_S3_ADAPTER_TYPE)

        with pytest.raises(ValueError, match="not registered"):
            SubmodelServiceManager(
                adapter_type=FRONTEND_S3_ADAPTER_TYPE,
                adapter_config=frontend_s3_config,
            )

        # Re-register so the autouse fixture teardown stays symmetric.
        SubmodelServiceManager.register_external_adapter(
            adapter_type=FRONTEND_S3_ADAPTER_TYPE,
            adapter_class=FrontendS3Adapter,
            overwrite=True,
        )
