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
Shared helpers for the SeaweedFS S3 integration tests.

All SeaweedFS/S3-compatible connection details are read from environment variables so the
same test suite can run against a local docker/Minikube SeaweedFS instance or any other
S3-compatible endpoint (e.g. in CI) without editing test code. Sensible defaults match the
values used by the local development docker-compose / Minikube setup.

Environment variables:
    S3_ENDPOINT_URL - Custom S3 endpoint (e.g. SeaweedFS gateway). Empty/unset means "real AWS S3".
    S3_REGION       - Region name reported to the S3 client (default: "us-east-1").
    S3_ACCESS_KEY   - Access key id (default: "admin").
    S3_SECRET_KEY   - Secret access key (default: "secret").
    S3_BUCKET_NAME  - Bucket used for the integration tests (default: "ichub-submodels").
"""

import os

from botocore.config import Config

S3_ENDPOINT_URL = os.getenv("S3_ENDPOINT_URL", "http://localhost:8333")
S3_REGION = os.getenv("S3_REGION", "us-east-1")
S3_ACCESS_KEY = os.getenv("S3_ACCESS_KEY", "admin")
S3_SECRET_KEY = os.getenv("S3_SECRET_KEY", "secret")
S3_BUCKET_NAME = os.getenv("S3_BUCKET_NAME", "ichub-submodels")


def build_s3_client_kwargs(endpoint_url: str | None = S3_ENDPOINT_URL) -> dict:
    """
    Build boto3 ``client("s3", **kwargs)`` keyword arguments for the given endpoint.

    When a custom endpoint is configured (e.g. SeaweedFS or any other S3-compatible store),
    Signature Version 4 and path-style addressing are enforced via a ``botocore.config.Config``,
    since most non-AWS S3 implementations do not support virtual-hosted-style addressing.

    When no custom endpoint is configured, no extra ``Config`` is added so the client falls back
    to boto3's default (virtual-hosted-style, region-based) behavior against real AWS S3.
    """
    kwargs: dict = {
        "region_name": S3_REGION,
        "aws_access_key_id": S3_ACCESS_KEY,
        "aws_secret_access_key": S3_SECRET_KEY,
    }

    if endpoint_url:
        kwargs["endpoint_url"] = endpoint_url
        kwargs["config"] = Config(
            signature_version="s3v4",
            s3={"addressing_style": "path"},
        )

    return kwargs


def create_s3_client(endpoint_url: str | None = S3_ENDPOINT_URL):
    """Create a boto3 S3 client configured for ``endpoint_url`` (or real AWS S3 if empty)."""
    import boto3

    return boto3.client("s3", **build_s3_client_kwargs(endpoint_url))


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
