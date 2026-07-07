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
Endpoint-level tests for the PCF Kit Provision controller.

Base URL: /v1/addons/pcf-kit/provider

Endpoints under test
--------------------
POST /pcfs/{manufacturerPartId}                  → upload_new_pcf
GET  /pcfs/{manufacturerPartId}                  → view_existing_pcf
PUT  /pcfs/{manufacturerPartId}                  → update_pcf_and_get_participants
POST /pcfs/{manufacturerPartId}/notify-update    → confirm_and_send_update_to_participants
GET  /requests                                   → list_provider_notifications
POST /requests/{requestId}/accept                → accept_request_and_send_response
GET  /requests/{requestId}/refresh-pcf           → refresh_pcf_data_for_request
POST /requests/{requestId}/response/retry        → accept_request_and_send_response

All tests are pure controller tests: the manager layer is fully mocked.
"""

from unittest.mock import MagicMock

from models.metadata_database.pcf.models import PcfExchangeStatus

# ---------------------------------------------------------------------------
# URL constants
# ---------------------------------------------------------------------------

BASE = "/v1/addons/pcf-kit/provider"
PART_ID = "part-abc-123"
REQUEST_ID = "req-xyz-456"

# ---------------------------------------------------------------------------
# Reusable payloads
# ---------------------------------------------------------------------------

PCF_DATA_BODY = {
    "specVersion": "2.0.1-20230314T161325Z-027-88749B3",
    "partialFullPcf": "Cradle-to-gate",
    "productIds": ["urn:uuid:b5f462a2-54e8-4034-85e2-2d663f1c2c2f"],
    "pcfLegalStatement": "This PCF is valid.",
    "companyName": "ACME Corp",
    "companyIds": ["urn:uuid:51131FB5-42A2-4267-A402-0ECFEFAD1619"],
    "productDescription": "Battery 50kWh",
    "productCategoryCpc": "43-11",
    "reportingPeriodStart": "2023-01-01T00:00:00Z",
    "reportingPeriodEnd": "2023-12-31T23:59:59Z",
    "pcf": {
        "declaredUnit": "kilogramCO2ePerUnit",
        "unitaryProductAmount": 1000.0,
        "pCfExcludingBiogenic": 2.0,
        "fossilGhgEmissions": 0.5,
    },
}

EXCHANGE_MODEL = {
    "requestId": REQUEST_ID,
    "manufacturerPartId": PART_ID,
    "customerPartId": None,
    "requestingBpn": "BPNL00000000024R",
    "targetBpn": "BPNL000000000342",
    "status": "PENDING",
    "type": "REQUEST",
    "message": None,
    "pcfLocation": None,
    "pcfData": None,
}

NOTIFY_UPDATE_BODY = {
    "list_bpns": ["BPNL000000000342"],
    "governance": None,
}


# ---------------------------------------------------------------------------
# POST /pcfs/{manufacturerPartId}
# ---------------------------------------------------------------------------

class TestUploadNewPcf:
    """POST /pcfs/{manufacturerPartId}"""

    def test_valid_pcf_data_returns_201(self, app_client, mock_provision_mgr):
        mock_provision_mgr.upload_new_pcf.return_value = {
            "manufacturerPartId": PART_ID,
            "pcfLocation": "submodel://some-location",
        }

        resp = app_client.post(f"{BASE}/pcfs/{PART_ID}", json=PCF_DATA_BODY)

        assert resp.status_code == 201
        mock_provision_mgr.upload_new_pcf.assert_called_once_with(PART_ID, PCF_DATA_BODY)

    def test_manager_value_error_returns_400(self, app_client, mock_provision_mgr):
        mock_provision_mgr.upload_new_pcf.side_effect = ValueError("Schema validation failed")

        resp = app_client.post(f"{BASE}/pcfs/{PART_ID}", json=PCF_DATA_BODY)

        assert resp.status_code == 400
        assert "Schema validation failed" in resp.json().get("detail", "")

    def test_manager_unexpected_error_returns_500(self, app_client, mock_provision_mgr):
        mock_provision_mgr.upload_new_pcf.side_effect = RuntimeError("Storage unavailable")

        resp = app_client.post(f"{BASE}/pcfs/{PART_ID}", json=PCF_DATA_BODY)

        assert resp.status_code == 500


# ---------------------------------------------------------------------------
# GET /pcfs/{manufacturerPartId}
# ---------------------------------------------------------------------------

class TestViewExistingPcf:
    """GET /pcfs/{manufacturerPartId}"""

    def test_returns_200_with_pcf_dict(self, app_client, mock_provision_mgr):
        mock_provision_mgr.view_existing_pcf.return_value = {"pcfData": PCF_DATA_BODY}

        resp = app_client.get(f"{BASE}/pcfs/{PART_ID}")

        assert resp.status_code == 200
        mock_provision_mgr.view_existing_pcf.assert_called_once_with(PART_ID)

    def test_manager_value_error_returns_400(self, app_client, mock_provision_mgr):
        mock_provision_mgr.view_existing_pcf.side_effect = ValueError("Not found")

        resp = app_client.get(f"{BASE}/pcfs/{PART_ID}")

        assert resp.status_code == 400

    def test_manager_unexpected_error_returns_500(self, app_client, mock_provision_mgr):
        mock_provision_mgr.view_existing_pcf.side_effect = Exception("DB error")

        resp = app_client.get(f"{BASE}/pcfs/{PART_ID}")

        assert resp.status_code == 500


# ---------------------------------------------------------------------------
# PUT /pcfs/{manufacturerPartId}
# ---------------------------------------------------------------------------

class TestUpdatePcfAndGetParticipants:
    """PUT /pcfs/{manufacturerPartId}"""

    def test_returns_200_with_bpn_list(self, app_client, mock_provision_mgr):
        mock_provision_mgr.update_pcf_and_get_participants.return_value = [
            "BPNL000000000342",
            "BPNL00000000024R",
        ]

        resp = app_client.put(f"{BASE}/pcfs/{PART_ID}", json=PCF_DATA_BODY)

        assert resp.status_code == 200
        mock_provision_mgr.update_pcf_and_get_participants.assert_called_once_with(PART_ID, PCF_DATA_BODY)

    def test_manager_value_error_returns_400(self, app_client, mock_provision_mgr):
        mock_provision_mgr.update_pcf_and_get_participants.side_effect = ValueError("No existing PCF")

        resp = app_client.put(f"{BASE}/pcfs/{PART_ID}", json=PCF_DATA_BODY)

        assert resp.status_code == 400

    def test_manager_unexpected_error_returns_500(self, app_client, mock_provision_mgr):
        mock_provision_mgr.update_pcf_and_get_participants.side_effect = RuntimeError("Network error")

        resp = app_client.put(f"{BASE}/pcfs/{PART_ID}", json=PCF_DATA_BODY)

        assert resp.status_code == 500


# ---------------------------------------------------------------------------
# POST /pcfs/{manufacturerPartId}/notify-update
# ---------------------------------------------------------------------------

class TestConfirmAndSendUpdateToParticipants:
    """POST /pcfs/{manufacturerPartId}/notify-update"""

    def test_returns_200_on_success(self, app_client, mock_provision_mgr):
        mock_provision_mgr.confirm_and_send_update_to_participants.return_value = {
            "notified": ["BPNL000000000342"]
        }

        resp = app_client.post(f"{BASE}/pcfs/{PART_ID}/notify-update", json=NOTIFY_UPDATE_BODY)

        assert resp.status_code == 200
        mock_provision_mgr.confirm_and_send_update_to_participants.assert_called_once_with(
            manufacturer_part_id=PART_ID,
            list_bpns=NOTIFY_UPDATE_BODY["list_bpns"],
            list_policies=NOTIFY_UPDATE_BODY["governance"],
        )

    def test_no_body_calls_with_empty_bpns(self, app_client, mock_provision_mgr):
        """When no body is provided the router defaults to empty list / None."""
        mock_provision_mgr.confirm_and_send_update_to_participants.return_value = {}

        resp = app_client.post(f"{BASE}/pcfs/{PART_ID}/notify-update")

        assert resp.status_code == 200
        mock_provision_mgr.confirm_and_send_update_to_participants.assert_called_once_with(
            manufacturer_part_id=PART_ID,
            list_bpns=[],
            list_policies=None,
        )

    def test_manager_value_error_returns_400(self, app_client, mock_provision_mgr):
        mock_provision_mgr.confirm_and_send_update_to_participants.side_effect = ValueError("BPN invalid")

        resp = app_client.post(f"{BASE}/pcfs/{PART_ID}/notify-update", json=NOTIFY_UPDATE_BODY)

        assert resp.status_code == 400

    def test_manager_unexpected_error_returns_500(self, app_client, mock_provision_mgr):
        mock_provision_mgr.confirm_and_send_update_to_participants.side_effect = RuntimeError()

        resp = app_client.post(f"{BASE}/pcfs/{PART_ID}/notify-update", json=NOTIFY_UPDATE_BODY)

        assert resp.status_code == 500


# ---------------------------------------------------------------------------
# GET /requests
# ---------------------------------------------------------------------------

class TestListProviderNotifications:
    """GET /requests"""

    def test_returns_200_with_list(self, app_client, mock_provision_mgr):
        mock_provision_mgr.list_provider_notifications.return_value = [
            MagicMock(**EXCHANGE_MODEL, model_dump=lambda **_: EXCHANGE_MODEL)
        ]

        resp = app_client.get(f"{BASE}/requests")

        assert resp.status_code == 200
        mock_provision_mgr.list_provider_notifications.assert_called_once_with(
            status=None, offset=0, limit=100
        )

    def test_filters_by_status_query_param(self, app_client, mock_provision_mgr):
        mock_provision_mgr.list_provider_notifications.return_value = []

        resp = app_client.get(f"{BASE}/requests?status=pending&offset=5&limit=10")

        assert resp.status_code == 200
        mock_provision_mgr.list_provider_notifications.assert_called_once_with(
            status=PcfExchangeStatus.PENDING, offset=5, limit=10
        )

    def test_manager_value_error_returns_400(self, app_client, mock_provision_mgr):
        mock_provision_mgr.list_provider_notifications.side_effect = ValueError("Bad status value")

        resp = app_client.get(f"{BASE}/requests")

        assert resp.status_code == 400

    def test_manager_unexpected_error_returns_500(self, app_client, mock_provision_mgr):
        mock_provision_mgr.list_provider_notifications.side_effect = RuntimeError()

        resp = app_client.get(f"{BASE}/requests")

        assert resp.status_code == 500


# ---------------------------------------------------------------------------
# POST /requests/{requestId}/accept
# ---------------------------------------------------------------------------

class TestAcceptRequestAndSendResponse:
    """POST /requests/{requestId}/accept"""

    def test_returns_200_on_success(self, app_client, mock_provision_mgr):
        mock_provision_mgr.accept_request_and_send_response.return_value = {
            "requestId": REQUEST_ID,
            "status": "DELIVERED",
        }

        resp = app_client.post(f"{BASE}/requests/{REQUEST_ID}/accept")

        assert resp.status_code == 200
        mock_provision_mgr.accept_request_and_send_response.assert_called_once_with(
            request_id=REQUEST_ID, list_policies=None
        )

    def test_with_governance_body_passes_policies(self, app_client, mock_provision_mgr):
        mock_provision_mgr.accept_request_and_send_response.return_value = {}
        policies = [{"policyId": "some-policy"}]

        resp = app_client.post(
            f"{BASE}/requests/{REQUEST_ID}/accept",
            json={"governance": policies},
        )

        assert resp.status_code == 200
        mock_provision_mgr.accept_request_and_send_response.assert_called_once_with(
            request_id=REQUEST_ID, list_policies=policies
        )

    def test_manager_value_error_returns_400(self, app_client, mock_provision_mgr):
        mock_provision_mgr.accept_request_and_send_response.side_effect = ValueError("Request not found")

        resp = app_client.post(f"{BASE}/requests/{REQUEST_ID}/accept")

        assert resp.status_code == 400

    def test_manager_unexpected_error_returns_500(self, app_client, mock_provision_mgr):
        mock_provision_mgr.accept_request_and_send_response.side_effect = Exception("EDC error")

        resp = app_client.post(f"{BASE}/requests/{REQUEST_ID}/accept")

        assert resp.status_code == 500


# ---------------------------------------------------------------------------
# GET /requests/{requestId}/refresh-pcf
# ---------------------------------------------------------------------------

class TestRefreshPcfDataForRequest:
    """GET /requests/{requestId}/refresh-pcf"""

    def test_returns_200_with_updated_model(self, app_client, mock_provision_mgr):
        mock_provision_mgr.refresh_pcf_data_for_request.return_value = MagicMock(
            **EXCHANGE_MODEL, model_dump=lambda **_: EXCHANGE_MODEL
        )

        resp = app_client.get(f"{BASE}/requests/{REQUEST_ID}/refresh-pcf")

        assert resp.status_code == 200
        mock_provision_mgr.refresh_pcf_data_for_request.assert_called_once_with(request_id=REQUEST_ID)

    def test_manager_value_error_returns_400(self, app_client, mock_provision_mgr):
        mock_provision_mgr.refresh_pcf_data_for_request.side_effect = ValueError("Not found")

        resp = app_client.get(f"{BASE}/requests/{REQUEST_ID}/refresh-pcf")

        assert resp.status_code == 400

    def test_manager_unexpected_error_returns_500(self, app_client, mock_provision_mgr):
        mock_provision_mgr.refresh_pcf_data_for_request.side_effect = RuntimeError()

        resp = app_client.get(f"{BASE}/requests/{REQUEST_ID}/refresh-pcf")

        assert resp.status_code == 500


# ---------------------------------------------------------------------------
# POST /requests/{requestId}/response/retry
# ---------------------------------------------------------------------------

class TestRetryResponseSending:
    """POST /requests/{requestId}/response/retry — delegates to accept_request_and_send_response."""

    def test_returns_200_on_success(self, app_client, mock_provision_mgr):
        mock_provision_mgr.accept_request_and_send_response.return_value = {
            "requestId": REQUEST_ID
        }

        resp = app_client.post(f"{BASE}/requests/{REQUEST_ID}/response/retry")

        assert resp.status_code == 200

    def test_manager_value_error_returns_400(self, app_client, mock_provision_mgr):
        mock_provision_mgr.accept_request_and_send_response.side_effect = ValueError("Not retryable")

        resp = app_client.post(f"{BASE}/requests/{REQUEST_ID}/response/retry")

        assert resp.status_code == 400

    def test_manager_unexpected_error_returns_500(self, app_client, mock_provision_mgr):
        mock_provision_mgr.accept_request_and_send_response.side_effect = RuntimeError()

        resp = app_client.post(f"{BASE}/requests/{REQUEST_ID}/response/retry")

        assert resp.status_code == 500
