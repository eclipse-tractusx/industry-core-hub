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

"""
Endpoint-level tests for POST /v1/uniqueidpush/connect-to-parent.

Key cases covered:
* Valid body with SerializedPartItem → 201
* Valid body with BatchItem → 201
* Valid body with JISItem → 201
* Missing required fields → 422
* Empty listOfItems → 422
* Invalid digitalTwinType → 422
* Duplicate messageId → 409
"""

import pytest
from uuid import uuid4
from unittest.mock import patch, Mock

from models.metadata_database.notification.models import NotificationEntity, NotificationDirection, NotificationStatus


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

SENDER_BPN = "BPNL00000000024R"
RECEIVER_BPN = "BPNL000000000342"
ENDPOINT_URL = "/v1/uniqueidpush/connect-to-parent"

VALID_HEADER = {
    "messageId": str(uuid4()),
    "context": "IndustryCore-UniqueIDPush-ConnectToParent:2.0.0",
    "sentDateTime": "2025-01-15T10:00:00Z",
    "senderBpn": SENDER_BPN,
    "receiverBpn": RECEIVER_BPN,
    "version": "3.0.0",
}

SERIALIZED_PART_ITEM = {
    "manufacturerId": SENDER_BPN,
    "manufacturerPartId": "MPN-12345",
    "customerPartId": "CPN-67890",
    "catenaXId": "urn:uuid:b5f462a2-54e8-4034-85e2-2d663f1c2c2f",
    "partInstanceId": "SN-001",
}

BATCH_ITEM = {
    "manufacturerId": SENDER_BPN,
    "manufacturerPartId": "MPN-12345",
    "catenaXId": "urn:uuid:c6f572b3-65f9-5145-96f3-3e774g2d3d3g",
    "batchId": "BATCH-2025-001",
}

JIS_ITEM = {
    "manufacturerId": SENDER_BPN,
    "manufacturerPartId": "MPN-12345",
    "catenaXId": "urn:uuid:d7g683c4-76g0-6256-07g4-4f885h3e4e4h",
    "jisNumber": "JIS-2025-001",
    "jisCallDate": "2025-01-15",
    "parentOrderNumber": "ORD-9876",
}


def _make_body(items, digital_twin_type="PartInstance", header=None):
    """Helper to build a valid request body."""
    return {
        "header": header or VALID_HEADER,
        "content": {
            "digitalTwinType": digital_twin_type,
            "information": "Test notification",
            "listOfItems": items,
        },
    }


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


class TestUniqueIdPushConnectToParent:
    """Controller tests for POST /v1/uniqueidpush/connect-to-parent."""

    @pytest.fixture(autouse=True)
    def _mock_service(self):
        """Mock the unique_id_push_service and notification_management_service."""
        with patch(
            "controllers.fastapi.routers.notifications.v1.unique_id_push_api.unique_id_push_service"
        ) as mock_svc, patch(
            "controllers.fastapi.routers.notifications.v1.unique_id_push_api.notification_management_service"
        ) as mock_mgmt_svc:
            # Simulate a successful creation returning a mock entity
            mock_entity = Mock(spec=NotificationEntity)
            mock_entity.message_id = uuid4()
            mock_entity.direction = NotificationDirection.INCOMING
            mock_entity.status = NotificationStatus.RECEIVED
            mock_svc.receive_connect_to_parent.return_value = mock_entity
            mock_mgmt_svc.notification_exists.return_value = False
            self.mock_svc = mock_svc
            self.mock_mgmt_svc = mock_mgmt_svc
            yield

    def test_valid_serialized_part_item(self, app_client):
        """POST with a valid SerializedPartItem returns 201."""
        body = _make_body([SERIALIZED_PART_ITEM])
        response = app_client.post(ENDPOINT_URL, json=body)
        assert response.status_code == 201
        self.mock_svc.receive_connect_to_parent.assert_called_once()

    def test_valid_batch_item(self, app_client):
        """POST with a valid BatchItem returns 201."""
        body = _make_body([BATCH_ITEM])
        response = app_client.post(ENDPOINT_URL, json=body)
        assert response.status_code == 201

    def test_valid_jis_item(self, app_client):
        """POST with a valid JISItem returns 201."""
        body = _make_body([JIS_ITEM])
        response = app_client.post(ENDPOINT_URL, json=body)
        assert response.status_code == 201

    def test_valid_part_type(self, app_client):
        """POST with digitalTwinType=PartType returns 201."""
        body = _make_body([SERIALIZED_PART_ITEM], digital_twin_type="PartType")
        response = app_client.post(ENDPOINT_URL, json=body)
        assert response.status_code == 201

    def test_multiple_items(self, app_client):
        """POST with multiple items returns 201."""
        body = _make_body([SERIALIZED_PART_ITEM, BATCH_ITEM, JIS_ITEM])
        response = app_client.post(ENDPOINT_URL, json=body)
        assert response.status_code == 201

    def test_missing_body(self, app_client):
        """POST with no body returns 422."""
        response = app_client.post(ENDPOINT_URL)
        assert response.status_code == 422

    def test_empty_list_of_items(self, app_client):
        """POST with empty listOfItems returns 422 (min_length=1)."""
        body = _make_body([])
        response = app_client.post(ENDPOINT_URL, json=body)
        assert response.status_code == 422

    def test_invalid_digital_twin_type(self, app_client):
        """POST with an invalid digitalTwinType returns 422."""
        body = _make_body([SERIALIZED_PART_ITEM], digital_twin_type="InvalidType")
        response = app_client.post(ENDPOINT_URL, json=body)
        assert response.status_code == 422

    def test_missing_header(self, app_client):
        """POST without header field returns 422."""
        body = {
            "content": {
                "digitalTwinType": "PartInstance",
                "listOfItems": [SERIALIZED_PART_ITEM],
            }
        }
        response = app_client.post(ENDPOINT_URL, json=body)
        assert response.status_code == 422

    def test_missing_content(self, app_client):
        """POST without content field returns 422."""
        body = {"header": VALID_HEADER}
        response = app_client.post(ENDPOINT_URL, json=body)
        assert response.status_code == 422

    def test_missing_sender_bpn(self, app_client):
        """POST with missing senderBpn returns 422."""
        header = {**VALID_HEADER}
        del header["senderBpn"]
        body = _make_body([SERIALIZED_PART_ITEM], header=header)
        response = app_client.post(ENDPOINT_URL, json=body)
        assert response.status_code == 422

    def test_invalid_bpn_format(self, app_client):
        """POST with an invalid BPN format returns 422."""
        header = {**VALID_HEADER, "senderBpn": "INVALID_BPN"}
        body = _make_body([SERIALIZED_PART_ITEM], header=header)
        response = app_client.post(ENDPOINT_URL, json=body)
        assert response.status_code == 422

    def test_duplicate_message_id_returns_409(self, app_client):
        """POST with a messageId that already exists returns 409."""
        self.mock_mgmt_svc.notification_exists.return_value = True
        body = _make_body([SERIALIZED_PART_ITEM])
        response = app_client.post(ENDPOINT_URL, json=body)
        assert response.status_code == 409
        self.mock_svc.receive_connect_to_parent.assert_not_called()
