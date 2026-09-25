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
Pytest configuration for enablement_services tests.

SeaweedFS integration tests (test_seaweedfs_integration.py and test_seaweedfs_frontend_s3_adapter.py)
use real boto3 without any mocking to connect to actual SeaweedFS instances.

These tests are automatically skipped if:
- boto3 is not installed
- SeaweedFS is not reachable at http://localhost:8333
"""

import pytest
import logging
import socket
from botocore.config import Config


def _is_seaweedfs_available() -> bool:
    """Check if boto3 is available and SeaweedFS is reachable."""
    # Suppress boto3 debug logging during availability check
    logging.getLogger("botocore").setLevel(logging.CRITICAL)
    logging.getLogger("urllib3").setLevel(logging.CRITICAL)
    
    try:
        import boto3
    except ImportError:
        return False
    
    try:
        # Quick socket check first - fail fast if port is closed
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(1)  # 1 second timeout
        result = sock.connect_ex(("localhost", 8333))
        sock.close()
        if result != 0:
            return False
        
        # If socket check passes, verify with S3 client (with minimal retries)
        s3_config = Config(
            connect_timeout=2,
            read_timeout=2,
            retries={"max_attempts": 0},  # Disable retries
        )
        s3_client = boto3.client(
            "s3",
            endpoint_url="http://localhost:8333",
            aws_access_key_id="admin",
            aws_secret_access_key="secret",
            region_name="us-east-1",
            config=s3_config,
        )
        s3_client.list_buckets()
        return True
    except Exception:
        return False


def pytest_collection_modifyitems(config, items):
    """
    Mark all SeaweedFS tests as integration tests and skip if SeaweedFS unavailable.
    
    This applies to:
    - test_seaweedfs_integration.py
    - test_seaweedfs_frontend_s3_adapter.py
    
    Tests can be run with: pytest -m seaweedfs
    Tests will be skipped if SeaweedFS is not available.
    """
    seaweedfs_available = _is_seaweedfs_available()
    
    for item in items:
        fspath_str = str(item.fspath)
        if 'test_seaweedfs_integration' in fspath_str or 'test_seaweedfs_frontend_s3_adapter' in fspath_str:
            item.add_marker(pytest.mark.seaweedfs)
            
            if not seaweedfs_available:
                item.add_marker(
                    pytest.mark.skip(
                        reason="SeaweedFS not available at http://localhost:8333 or boto3 not installed"
                    )
                )
