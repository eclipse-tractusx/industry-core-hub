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
Unit tests for Unique ID Push models and the to_notification() conversion.
"""

import pytest
from uuid import uuid4

from models.services.notification.unique_id_push import (
    DigitalTwinType,
    PartItem,
    SerializedPartItem,
    BatchItem,
    JISItem,
    UniqueIdPushContent,
    UniqueIdPushConnectToParentRequest,
)
from tractusx_sdk.industry.models.notifications import Notification


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

SENDER_BPN = "BPNL00000000024R"
RECEIVER_BPN = "BPNL000000000342"


def _make_header() -> dict:
    return {
        "messageId": str(uuid4()),
        "context": "IndustryCore-UniqueIDPush-ConnectToParent:2.0.0",
        "sentDateTime": "2025-01-15T10:00:00Z",
        "senderBpn": SENDER_BPN,
        "receiverBpn": RECEIVER_BPN,
        "version": "3.0.0",
    }


# ---------------------------------------------------------------------------
# Model Parsing Tests
# ---------------------------------------------------------------------------


class TestDigitalTwinType:
    def test_valid_values(self):
        assert DigitalTwinType("PartType") == DigitalTwinType.PART_TYPE
        assert DigitalTwinType("PartInstance") == DigitalTwinType.PART_INSTANCE

    def test_invalid_value(self):
        with pytest.raises(ValueError):
            DigitalTwinType("Invalid")


class TestPartItem:
    def test_parse_with_alias(self):
        item = PartItem.model_validate({
            "manufacturerId": SENDER_BPN,
            "manufacturerPartId": "MPN-1",
            "catenaXId": "urn:uuid:12345678-1234-1234-1234-123456789012",
        })
        assert item.manufacturer_id == SENDER_BPN
        assert item.manufacturer_part_id == "MPN-1"
        assert item.customer_part_id is None

    def test_optional_customer_part_id(self):
        item = PartItem.model_validate({
            "manufacturerId": SENDER_BPN,
            "manufacturerPartId": "MPN-1",
            "customerPartId": "CPN-99",
            "catenaXId": "urn:uuid:12345678-1234-1234-1234-123456789012",
        })
        assert item.customer_part_id == "CPN-99"


class TestSerializedPartItem:
    def test_parse(self):
        item = SerializedPartItem.model_validate({
            "manufacturerId": SENDER_BPN,
            "manufacturerPartId": "MPN-1",
            "catenaXId": "urn:uuid:12345678-1234-1234-1234-123456789012",
            "partInstanceId": "SN-001",
        })
        assert item.part_instance_id == "SN-001"


class TestBatchItem:
    def test_parse(self):
        item = BatchItem.model_validate({
            "manufacturerId": SENDER_BPN,
            "manufacturerPartId": "MPN-1",
            "catenaXId": "urn:uuid:12345678-1234-1234-1234-123456789012",
            "batchId": "BATCH-001",
        })
        assert item.batch_id == "BATCH-001"


class TestJISItem:
    def test_parse_all_fields(self):
        item = JISItem.model_validate({
            "manufacturerId": SENDER_BPN,
            "manufacturerPartId": "MPN-1",
            "catenaXId": "urn:uuid:12345678-1234-1234-1234-123456789012",
            "jisNumber": "JIS-001",
            "jisCallDate": "2025-01-15",
            "parentOrderNumber": "ORD-123",
        })
        assert item.jis_number == "JIS-001"
        assert item.jis_call_date == "2025-01-15"
        assert item.parent_order_number == "ORD-123"

    def test_parse_optional_fields_absent(self):
        item = JISItem.model_validate({
            "manufacturerId": SENDER_BPN,
            "manufacturerPartId": "MPN-1",
            "catenaXId": "urn:uuid:12345678-1234-1234-1234-123456789012",
            "jisNumber": "JIS-001",
        })
        assert item.jis_call_date is None
        assert item.parent_order_number is None


class TestUniqueIdPushContent:
    def test_parse_valid(self):
        content = UniqueIdPushContent.model_validate({
            "digitalTwinType": "PartInstance",
            "information": "hello",
            "listOfItems": [{
                "manufacturerId": SENDER_BPN,
                "manufacturerPartId": "MPN-1",
                "catenaXId": "urn:uuid:12345678-1234-1234-1234-123456789012",
                "partInstanceId": "SN-001",
            }],
        })
        assert content.digital_twin_type == DigitalTwinType.PART_INSTANCE
        assert len(content.list_of_items) == 1

    def test_empty_list_rejected(self):
        with pytest.raises(Exception):
            UniqueIdPushContent.model_validate({
                "digitalTwinType": "PartInstance",
                "listOfItems": [],
            })


# ---------------------------------------------------------------------------
# to_notification() Conversion Tests
# ---------------------------------------------------------------------------


class TestToNotification:
    def test_converts_to_sdk_notification(self):
        """Verify the full request converts to a valid SDK Notification."""
        request = UniqueIdPushConnectToParentRequest.model_validate({
            "header": _make_header(),
            "content": {
                "digitalTwinType": "PartInstance",
                "information": "New child twin created",
                "listOfItems": [{
                    "manufacturerId": SENDER_BPN,
                    "manufacturerPartId": "MPN-1",
                    "catenaXId": "urn:uuid:12345678-1234-1234-1234-123456789012",
                    "partInstanceId": "SN-001",
                }],
            },
        })

        notification = request.to_notification()
        assert isinstance(notification, Notification)
        assert notification.header.sender_bpn == SENDER_BPN
        assert notification.header.receiver_bpn == RECEIVER_BPN
        assert notification.content.information == "New child twin created"
        # listOfItems extra field should contain the catenaXId
        content_data = notification.content.model_dump(by_alias=True)
        assert content_data["listOfItems"][0]["catenaXId"] == "urn:uuid:12345678-1234-1234-1234-123456789012"

    def test_preserves_header_fields(self):
        """Verify header fields are preserved through conversion."""
        header_data = _make_header()
        request = UniqueIdPushConnectToParentRequest.model_validate({
            "header": header_data,
            "content": {
                "digitalTwinType": "PartType",
                "listOfItems": [{
                    "manufacturerId": SENDER_BPN,
                    "manufacturerPartId": "MPN-1",
                    "catenaXId": "urn:uuid:12345678-1234-1234-1234-123456789012",
                    "batchId": "BATCH-1",
                }],
            },
        })

        notification = request.to_notification()
        assert str(notification.header.message_id) == header_data["messageId"]
        assert notification.header.context == header_data["context"]
