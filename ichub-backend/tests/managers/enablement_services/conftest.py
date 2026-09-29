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

S3 integration tests (test_seaweedfs_integration.py and test_seaweedfs_frontend_s3_adapter.py)
use moto to mock S3 operations in-memory without requiring external services.

Moto provides a complete mock of AWS S3 service, so tests:
- Do not require SeaweedFS or any S3-compatible endpoint
- Run in isolation without side effects
- Execute quickly and deterministically
- Can be run in parallel

Connection details (S3_REGION, S3_ACCESS_KEY, S3_SECRET_KEY, S3_BUCKET_NAME) are read from
environment variables - see _s3_test_helpers.py for defaults.
"""

import pytest


def _is_s3_mocking_available() -> bool:
    """Check if boto3 and moto are available for S3 mocking."""
    try:
        import boto3
        import moto
        return True
    except ImportError:
        return False


def pytest_collection_modifyitems(config, items):
    """
    Mark all S3 tests as integration tests and skip if moto unavailable.
    
    This applies to:
    - test_seaweedfs_integration.py
    - test_seaweedfs_frontend_s3_adapter.py
    
    Tests can be run with: pytest -m seaweedfs
    Tests use moto for S3 mocking, so they don't require external services.
    """
    s3_mocking_available = _is_s3_mocking_available()
    
    for item in items:
        fspath_str = str(item.fspath)
        if 'test_seaweedfs_integration' in fspath_str or 'test_seaweedfs_frontend_s3_adapter' in fspath_str:
            item.add_marker(pytest.mark.seaweedfs)
            
            if not s3_mocking_available:
                item.add_marker(
                    pytest.mark.skip(
                        reason="boto3 or moto not installed"
                    )
                )
