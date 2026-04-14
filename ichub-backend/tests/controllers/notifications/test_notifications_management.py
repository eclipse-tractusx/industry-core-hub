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
## Code created partially using a LLM and reviewed by a human committer

"""
Endpoint-level tests for POST /v1/notifications-management/notification.

These are controller tests — they exercise the full HTTP stack (routing,
request deserialisation, Pydantic validation) while the service layer is mocked.

Key cases covered:
* Valid body → 201 with message_id
* Missing body → 422 with a descriptive ``details`` list (not ``null``)
* BPN with only 11 chars after BPNL → 422 with field-level error in details
  (this is the exact value ``BPNL000000093Q7`` seen failing in the Swagger UI)
* BPN without BPNL prefix → 422
* Body missing the required ``context`` field → 422

The SDK enforces ``^BPNL[a-zA-Z0-9]{12}$`` for sender/receiver BPNs via a
Pydantic ``pattern`` constraint.  A BPN that is one character short silently
produces a 422 which — before the exception-handler fix — showed
``"message": "JSON decode error", "details": null``.  These tests lock in the
correct behaviour: 422 with a non-null ``details`` list naming the failing field.
"""

import pytest
from uuid import UUID, uuid4
from unittest.mock import Mock

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

SENDER_BPN = "BPNL00000000024R"    # valid: exactly 12 alphanumeric chars after BPNL
RECEIVER_BPN = "BPNL000000000342"  # valid: exactly 12 alphanumeric chars after BPNL

CREATE_URL = "/v1/notifications-management/notification"

VALID_NOTIFICATION_BODY = {
    "header": {
        "context": "IndustryCore-DigitalTwinEventAPI-ConnectToParent:3.0.0",
        "senderBpn": SENDER_BPN,
        "receiverBpn": RECEIVER_BPN,
        "version": "3.0.0",
    },
    "content": {
        "information": "Test notification",
        "listOfAffectedItems": [
            "urn:uuid:b5f462a2-54e8-4034-85e2-2d663f1c2c2f"
        ],
    },
}


# ---------------------------------------------------------------------------
# Test class
# ---------------------------------------------------------------------------

class TestCreateNotificationEndpoint:
    """
    Controller tests for ``POST /v1/notifications-management/notification``.

    ``app_client`` and ``mock_notification_svc`` fixtures are provided by the
    local ``conftest.py``.
    """

    def test_valid_body_returns_201_with_message_id(self, app_client, mock_notification_svc):
        """
        Happy path: well-formed body with correctly-formatted BPNs must reach the
        service and return 201 with the generated ``message_id``.
        """
        fake_id = uuid4()
        entity = Mock()
        entity.message_id = fake_id
        mock_notification_svc.create_notification.return_value = entity

        response = app_client.post(CREATE_URL, json=VALID_NOTIFICATION_BODY)

        assert response.status_code == 201
        data = response.json()
        assert "message_id" in data
        assert UUID(data["message_id"]) == fake_id

    def test_missing_body_returns_422_with_details(self, app_client):
        """
        Sending no body must return 422 with a non-null ``details`` list.

        Before the exception-handler fix, the response was:
            {"status": 422, "message": "JSON decode error", "details": null}
        which gave callers no actionable information.  Now ``details`` must
        contain at least one human-readable error string.
        """
        response = app_client.post(CREATE_URL)

        assert response.status_code == 422
        data = response.json()
        assert data.get("details") is not None, (
            "details must not be null — callers need to know what is wrong"
        )
        assert len(data["details"]) > 0, "details must contain at least one error entry"

    def test_invalid_sender_bpn_too_short_returns_422_with_field_detail(self, app_client):
        """
        ``BPNL000000093Q7`` has only 11 chars after BPNL (the required 12),
        violating the SDK pattern ``^BPNL[a-zA-Z0-9]{12}$``.

        This is the exact BPN seen in the failing Swagger call that returned the
        misleading 'JSON decode error'.  After the validation-handler fix the
        response must describe the offending field in ``details``.
        """
        body = {
            **VALID_NOTIFICATION_BODY,
            "header": {
                **VALID_NOTIFICATION_BODY["header"],
                "senderBpn": "BPNL000000093Q7",  # BPNL + 11 chars — one too short
            },
        }

        response = app_client.post(CREATE_URL, json=body)

        assert response.status_code == 422
        data = response.json()
        assert data.get("details") is not None, (
            "details must not be null — the BPN pattern failure should be described"
        )
        details_str = " ".join(data["details"])
        assert any(kw in details_str for kw in ("sender_bpn", "senderBpn", "pattern", "String should")), (
            f"Expected a BPN-related error message in details, got: {data['details']}"
        )

    def test_invalid_receiver_bpn_wrong_prefix_returns_422(self, app_client):
        """BPN without the 'BPNL' prefix must fail pattern validation → 422."""
        body = {
            **VALID_NOTIFICATION_BODY,
            "header": {
                **VALID_NOTIFICATION_BODY["header"],
                "receiverBpn": "0000000003CRHKXX",  # no BPNL prefix
            },
        }

        response = app_client.post(CREATE_URL, json=body)

        assert response.status_code == 422

    def test_missing_required_context_field_returns_422(self, app_client):
        """
        ``header.context`` is a required field in the SDK ``NotificationHeader``
        model.  Omitting it must produce a 422 with a non-null details list.
        """
        body = {
            "header": {
                "senderBpn": SENDER_BPN,
                "receiverBpn": RECEIVER_BPN,
                "version": "3.0.0",
                # 'context' intentionally omitted
            },
            "content": {
                "information": "test",
                "listOfAffectedItems": [],
            },
        }

        response = app_client.post(CREATE_URL, json=body)

        assert response.status_code == 422
        data = response.json()
        assert data.get("details") is not None, (
            "details must not be null when a required field is missing"
        )
