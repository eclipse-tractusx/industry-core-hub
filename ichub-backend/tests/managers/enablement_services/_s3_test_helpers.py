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
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND,
# either express or implied. See the
# License for the specific language governing permissions and limitations
# under the License.
#
# SPDX-License-Identifier: Apache-2.0
#################################################################################

"""
Shared helpers for S3 integration tests using moto mock.

Uses moto to mock S3 operations without requiring a real S3/SeaweedFS endpoint.
This approach eliminates external dependencies and makes tests fast and deterministic.

Moto mocks AWS S3 service calls in-memory, so all tests are isolated and can run
in parallel without side effects.

Environment variables (used for configuration compatibility, but not needed for mocking):
    S3_ENDPOINT_URL - Ignored when using moto (kept for config compatibility)
    S3_REGION       - Region name for moto S3 client (default: "us-east-1").
    S3_ACCESS_KEY   - Access key id (default: "admin").
    S3_SECRET_KEY   - Secret access key (default: "secret").
    S3_BUCKET_NAME  - Bucket used for tests (default: "ichub-submodels").
"""

import os

S3_ENDPOINT_URL = os.getenv("S3_ENDPOINT_URL", "http://localhost:8333") 
S3_REGION = os.getenv("S3_REGION", "us-east-1")
S3_ACCESS_KEY = os.getenv("S3_ACCESS_KEY", "admin")
S3_SECRET_KEY = os.getenv("S3_SECRET_KEY", "secret")
S3_BUCKET_NAME = os.getenv("S3_BUCKET_NAME", "ichub-submodels")


def build_s3_client_kwargs(endpoint_url: str | None = None) -> dict:
    """
    Build boto3 ``client("s3", **kwargs)`` keyword arguments for moto mock.

    Uses moto's in-memory S3 mock, so endpoint_url is ignored.
    Moto automatically intercepts all boto3 S3 calls without needing explicit endpoints.
    """
    return {
        "region_name": S3_REGION,
        "aws_access_key_id": S3_ACCESS_KEY,
        "aws_secret_access_key": S3_SECRET_KEY,
    }


def create_s3_client(endpoint_url: str | None = None):
    """Create a boto3 S3 client for moto mock (endpoint_url parameter ignored)."""
    import boto3
    return boto3.client("s3", **build_s3_client_kwargs())


def cleanup_bucket(s3_client, bucket_name: str = S3_BUCKET_NAME) -> None:
    """Delete every object (paginated) and then the bucket itself, ignoring missing resources."""
    try:
        paginator = s3_client.get_paginator("list_objects_v2")
        for page in paginator.paginate(Bucket=bucket_name):
            objects = [{"Key": obj["Key"]} for obj in page.get("Contents", [])]
            if objects:
                s3_client.delete_objects(Bucket=bucket_name, Delete={"Objects": objects})
        s3_client.delete_bucket(Bucket=bucket_name)
    except Exception:
        # Bucket/objects may already be gone - cleanup is best-effort.
        pass
