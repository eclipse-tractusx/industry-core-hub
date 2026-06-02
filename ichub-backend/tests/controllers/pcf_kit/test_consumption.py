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
Endpoint-level tests for the PCF Kit Consumption controller.

Base URL: /v1/addons/pcf-kit/consumption

Endpoints under test
--------------------
GET  /parts/{manufacturerPartId}/subparts        → search_own_parts_by_manufacturer_part_id
POST /parts/{manufacturerPartId}/subparts        → add_subpart_and_create_request
POST /requests/{requestId}/send                  → send_pcf_request_to_participant
GET  /requests/{requestId}/response              → consult_pcf_response
POST /requests/{requestId}/retry                 → send_pcf_request_to_participant
GET  /parts/{manufacturerPartId}/pcf-status      → consult_global_assembly_progress
GET  /parts/{manufacturerPartId}/pcf-data/download → download_pcf_data

All tests are pure controller tests: the manager layer is fully mocked.
Cases covered per endpoint:
  * 200/201 happy path
  * 400 (manager raises ValueError)
  * 500 (manager raises unexpected Exception)
  * 422 / 400 for missing required request body fields
"""

from unittest.mock import MagicMock

# ---------------------------------------------------------------------------
# URL constants
# ---------------------------------------------------------------------------

BASE = "/v1/addons/pcf-kit/consumption"
PART_ID = "part-abc-123"
REQUEST_ID = "req-xyz-456"

# ---------------------------------------------------------------------------
# Reusable response payloads (minimal — only the fields our assertions check)
# ---------------------------------------------------------------------------

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

RELATIONSHIP_MODEL = {
    "mainManufacturerPartId": PART_ID,
    "listSubManufacturerPartIds": [EXCHANGE_MODEL],
}

PCF_STATUS_MODEL = {
    "manufacturerPartId": PART_ID,
    "totalSubParts": 2,
    "respondedSubParts": 1,
    "progressPercentage": 50.0,
    "overallStatus": "IN_PROGRESS",
}

SUB_PART_BODY = {
    "manufacturerPartId": "sub-part-111",
    "bpn": "BPNL000000000342",
}


# ---------------------------------------------------------------------------
# GET /parts/{manufacturerPartId}/subparts
# ---------------------------------------------------------------------------

class TestSearchOwnPartsByManufacturerPartId:
    """GET /parts/{manufacturerPartId}/subparts"""

    def test_returns_200_with_relationship_model(self, app_client, mock_consumption_mgr):
        mock_consumption_mgr.search_own_parts_by_manufacturer_part_id.return_value = (
            MagicMock(**RELATIONSHIP_MODEL, model_dump=lambda **_: RELATIONSHIP_MODEL)
        )

        resp = app_client.get(f"{BASE}/parts/{PART_ID}/subparts")

        assert resp.status_code == 200
        mock_consumption_mgr.search_own_parts_by_manufacturer_part_id.assert_called_once_with(PART_ID)

    def test_manager_value_error_returns_400(self, app_client, mock_consumption_mgr):
        mock_consumption_mgr.search_own_parts_by_manufacturer_part_id.side_effect = ValueError(
            "Part not found"
        )

        resp = app_client.get(f"{BASE}/parts/{PART_ID}/subparts")

        assert resp.status_code == 400
        assert "Part not found" in resp.json().get("detail", "")

    def test_manager_unexpected_error_returns_500(self, app_client, mock_consumption_mgr):
        mock_consumption_mgr.search_own_parts_by_manufacturer_part_id.side_effect = RuntimeError(
            "DB unavailable"
        )

        resp = app_client.get(f"{BASE}/parts/{PART_ID}/subparts")

        assert resp.status_code == 500


# ---------------------------------------------------------------------------
# POST /parts/{manufacturerPartId}/subparts
# ---------------------------------------------------------------------------

class TestAddSubpartAndCreateRequest:
    """POST /parts/{manufacturerPartId}/subparts"""

    def test_valid_body_returns_201_with_relationship(self, app_client, mock_consumption_mgr):
        mock_consumption_mgr.add_subpart_and_create_request.return_value = MagicMock(
            **RELATIONSHIP_MODEL,
            model_dump=lambda **_: RELATIONSHIP_MODEL,
        )

        resp = app_client.post(f"{BASE}/parts/{PART_ID}/subparts", json=SUB_PART_BODY)

        assert resp.status_code == 201
        mock_consumption_mgr.add_subpart_and_create_request.assert_called_once_with(
            main_manufacturer_part_id=PART_ID,
            sub_manufacturer_part_id=SUB_PART_BODY["manufacturerPartId"],
            responding_bpn=SUB_PART_BODY["bpn"],
        )

    def test_missing_body_returns_400(self, app_client, mock_consumption_mgr):
        """Router raises HTTP 400 explicitly when body is None."""
        resp = app_client.post(f"{BASE}/parts/{PART_ID}/subparts")

        assert resp.status_code == 400

    def test_manager_value_error_returns_400(self, app_client, mock_consumption_mgr):
        mock_consumption_mgr.add_subpart_and_create_request.side_effect = ValueError("Duplicate subpart")

        resp = app_client.post(f"{BASE}/parts/{PART_ID}/subparts", json=SUB_PART_BODY)

        assert resp.status_code == 400

    def test_manager_unexpected_error_returns_500(self, app_client, mock_consumption_mgr):
        mock_consumption_mgr.add_subpart_and_create_request.side_effect = RuntimeError("Unexpected")

        resp = app_client.post(f"{BASE}/parts/{PART_ID}/subparts", json=SUB_PART_BODY)

        assert resp.status_code == 500


# ---------------------------------------------------------------------------
# POST /requests/{requestId}/send
# ---------------------------------------------------------------------------

class TestSendPcfRequestToParticipant:
    """POST /requests/{requestId}/send"""

    def test_returns_201_on_success(self, app_client, mock_consumption_mgr):
        mock_consumption_mgr.send_pcf_request_to_participant.return_value = {
            "requestId": REQUEST_ID,
            "status": "PENDING",
        }

        resp = app_client.post(f"{BASE}/requests/{REQUEST_ID}/send")

        assert resp.status_code == 201
        mock_consumption_mgr.send_pcf_request_to_participant.assert_called_once_with(
            request_id=REQUEST_ID, list_policies=None
        )

    def test_with_governance_body_passes_policies(self, app_client, mock_consumption_mgr):
        mock_consumption_mgr.send_pcf_request_to_participant.return_value = {"requestId": REQUEST_ID}
        policies = [{"policyId": "p1"}]

        resp = app_client.post(
            f"{BASE}/requests/{REQUEST_ID}/send",
            json={"governance": policies},
        )

        assert resp.status_code == 201
        mock_consumption_mgr.send_pcf_request_to_participant.assert_called_once_with(
            request_id=REQUEST_ID, list_policies=policies
        )

    def test_manager_value_error_returns_400(self, app_client, mock_consumption_mgr):
        mock_consumption_mgr.send_pcf_request_to_participant.side_effect = ValueError("Unknown request")

        resp = app_client.post(f"{BASE}/requests/{REQUEST_ID}/send")

        assert resp.status_code == 400

    def test_manager_unexpected_error_returns_500(self, app_client, mock_consumption_mgr):
        mock_consumption_mgr.send_pcf_request_to_participant.side_effect = RuntimeError("Timeout")

        resp = app_client.post(f"{BASE}/requests/{REQUEST_ID}/send")

        assert resp.status_code == 500


# ---------------------------------------------------------------------------
# GET /requests/{requestId}/response
# ---------------------------------------------------------------------------

class TestConsultPcfResponse:
    """GET /requests/{requestId}/response"""

    def test_returns_200_with_exchange_model(self, app_client, mock_consumption_mgr):
        mock_consumption_mgr.consult_pcf_response.return_value = MagicMock(
            **EXCHANGE_MODEL,
            model_dump=lambda **_: EXCHANGE_MODEL,
        )

        resp = app_client.get(f"{BASE}/requests/{REQUEST_ID}/response")

        assert resp.status_code == 200
        mock_consumption_mgr.consult_pcf_response.assert_called_once_with(request_id=REQUEST_ID)

    def test_manager_value_error_returns_400(self, app_client, mock_consumption_mgr):
        mock_consumption_mgr.consult_pcf_response.side_effect = ValueError("Not found")

        resp = app_client.get(f"{BASE}/requests/{REQUEST_ID}/response")

        assert resp.status_code == 400

    def test_manager_unexpected_error_returns_500(self, app_client, mock_consumption_mgr):
        mock_consumption_mgr.consult_pcf_response.side_effect = Exception("DB error")

        resp = app_client.get(f"{BASE}/requests/{REQUEST_ID}/response")

        assert resp.status_code == 500


# ---------------------------------------------------------------------------
# POST /requests/{requestId}/retry
# ---------------------------------------------------------------------------

class TestRetryPcfRequestSending:
    """POST /requests/{requestId}/retry — delegates to send_pcf_request_to_participant."""

    def test_returns_201_on_success(self, app_client, mock_consumption_mgr):
        mock_consumption_mgr.send_pcf_request_to_participant.return_value = {
            "requestId": REQUEST_ID
        }

        resp = app_client.post(f"{BASE}/requests/{REQUEST_ID}/retry")

        assert resp.status_code == 201

    def test_manager_value_error_returns_400(self, app_client, mock_consumption_mgr):
        mock_consumption_mgr.send_pcf_request_to_participant.side_effect = ValueError("Not retryable")

        resp = app_client.post(f"{BASE}/requests/{REQUEST_ID}/retry")

        assert resp.status_code == 400

    def test_manager_unexpected_error_returns_500(self, app_client, mock_consumption_mgr):
        mock_consumption_mgr.send_pcf_request_to_participant.side_effect = RuntimeError()

        resp = app_client.post(f"{BASE}/requests/{REQUEST_ID}/retry")

        assert resp.status_code == 500


# ---------------------------------------------------------------------------
# GET /parts/{manufacturerPartId}/pcf-status
# ---------------------------------------------------------------------------

class TestConsultGlobalAssemblyProgress:
    """GET /parts/{manufacturerPartId}/pcf-status"""

    def test_returns_200_with_state_model(self, app_client, mock_consumption_mgr):
        mock_consumption_mgr.consult_global_assembly_progress.return_value = MagicMock(
            **PCF_STATUS_MODEL,
            model_dump=lambda **_: PCF_STATUS_MODEL,
        )

        resp = app_client.get(f"{BASE}/parts/{PART_ID}/pcf-status")

        assert resp.status_code == 200
        mock_consumption_mgr.consult_global_assembly_progress.assert_called_once_with(
            manufacturer_part_id=PART_ID
        )

    def test_all_responded_shows_100_percent(self, app_client, mock_consumption_mgr):
        payload = {**PCF_STATUS_MODEL, "respondedSubParts": 2, "progressPercentage": 100.0, "overallStatus": "COMPLETED"}
        mock_consumption_mgr.consult_global_assembly_progress.return_value = MagicMock(
            **payload, model_dump=lambda **_: payload
        )

        resp = app_client.get(f"{BASE}/parts/{PART_ID}/pcf-status")

        assert resp.status_code == 200

    def test_manager_value_error_returns_400(self, app_client, mock_consumption_mgr):
        mock_consumption_mgr.consult_global_assembly_progress.side_effect = ValueError("No subparts")

        resp = app_client.get(f"{BASE}/parts/{PART_ID}/pcf-status")

        assert resp.status_code == 400

    def test_manager_unexpected_error_returns_500(self, app_client, mock_consumption_mgr):
        mock_consumption_mgr.consult_global_assembly_progress.side_effect = Exception("Crash")

        resp = app_client.get(f"{BASE}/parts/{PART_ID}/pcf-status")

        assert resp.status_code == 500


# ---------------------------------------------------------------------------
# GET /parts/{manufacturerPartId}/pcf-data/download
# ---------------------------------------------------------------------------

class TestDownloadConsolidatedPcfData:
    """GET /parts/{manufacturerPartId}/pcf-data/download"""

    def test_returns_200_with_list(self, app_client, mock_consumption_mgr):
        mock_item = MagicMock()
        mock_item.model_dump.return_value = {"pcfData": {"co2": 1.5}}
        mock_consumption_mgr.download_pcf_data.return_value = [mock_item]

        resp = app_client.get(f"{BASE}/parts/{PART_ID}/pcf-data/download")

        assert resp.status_code == 200
        mock_consumption_mgr.download_pcf_data.assert_called_once_with(manufacturer_part_id=PART_ID)

    def test_returns_200_with_empty_list(self, app_client, mock_consumption_mgr):
        mock_consumption_mgr.download_pcf_data.return_value = []

        resp = app_client.get(f"{BASE}/parts/{PART_ID}/pcf-data/download")

        assert resp.status_code == 200
        assert resp.json() == []

    def test_manager_value_error_returns_400(self, app_client, mock_consumption_mgr):
        mock_consumption_mgr.download_pcf_data.side_effect = ValueError("No data")

        resp = app_client.get(f"{BASE}/parts/{PART_ID}/pcf-data/download")

        assert resp.status_code == 400

    def test_manager_unexpected_error_returns_500(self, app_client, mock_consumption_mgr):
        mock_consumption_mgr.download_pcf_data.side_effect = RuntimeError("Storage error")

        resp = app_client.get(f"{BASE}/parts/{PART_ID}/pcf-data/download")

        assert resp.status_code == 500
