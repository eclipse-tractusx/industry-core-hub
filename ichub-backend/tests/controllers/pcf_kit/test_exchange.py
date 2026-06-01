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
Endpoint-level tests for the PCF Kit Exchange controller (EDC-facing API).

Base URL: /v1/addons/pcf-kit/footprintExchange

Endpoints under test
--------------------
PUT /{requestId}  → submit_pcf_response  (PCF response / update from a supplier)
GET /{requestId}  → request_pcf          (PCF request from a consumer via EDC)

The ``edc-bpn`` header is mandatory on both endpoints; its absence must be
rejected with HTTP 400 before the manager is ever called.

GET also requires at least one of ``manufacturerPartId`` or ``customerPartId``
query parameters; omitting both must return 400.
"""

# ---------------------------------------------------------------------------
# URL constants
# ---------------------------------------------------------------------------

BASE = "/v1/addons/pcf-kit/footprintExchange"
REQUEST_ID = "req-xyz-456"
PART_ID = "part-abc-123"
CUSTOMER_PART_ID = "cust-part-789"
VALID_BPN = "BPNL000000000342"

# ---------------------------------------------------------------------------
# PCF data payload (minimal valid structure for the PUT body)
# ---------------------------------------------------------------------------

PCF_BODY = {
    "specVersion": "2.0.1-20230314T161325Z-027-88749B3",
    "pcf": {"pCfExcludingBiogenic": 2.0},
}


# ---------------------------------------------------------------------------
# PUT /{requestId}  — submit_pcf_response
# ---------------------------------------------------------------------------

class TestPutPcfWithPathId:
    """PUT /{requestId} — EDC calls this to deliver a PCF response."""

    def test_valid_request_returns_200(self, app_client, mock_exchange_mgr):
        mock_exchange_mgr.submit_pcf_response.return_value = {"status": "accepted"}

        resp = app_client.put(
            f"{BASE}/{REQUEST_ID}",
            json=PCF_BODY,
            headers={"edc-bpn": VALID_BPN},
        )

        assert resp.status_code == 200
        mock_exchange_mgr.submit_pcf_response.assert_called_once_with(
            request_id=REQUEST_ID,
            pcf_data=PCF_BODY,
            edc_bpn=VALID_BPN,
            is_update=False,
            message=None,
        )

    def test_update_flag_is_passed_to_manager(self, app_client, mock_exchange_mgr):
        mock_exchange_mgr.submit_pcf_response.return_value = {}

        resp = app_client.put(
            f"{BASE}/{REQUEST_ID}?update=true",
            json=PCF_BODY,
            headers={"edc-bpn": VALID_BPN},
        )

        assert resp.status_code == 200
        _, kwargs = mock_exchange_mgr.submit_pcf_response.call_args
        assert kwargs["is_update"] is True

    def test_optional_message_param_forwarded(self, app_client, mock_exchange_mgr):
        mock_exchange_mgr.submit_pcf_response.return_value = {}
        # FastAPI URL-decodes query params before passing them to the handler,
        # so '+' is decoded to ' ' (space).
        raw_param = "Hello+world"
        decoded_msg = "Hello world"

        resp = app_client.put(
            f"{BASE}/{REQUEST_ID}?message={raw_param}",
            json=PCF_BODY,
            headers={"edc-bpn": VALID_BPN},
        )

        assert resp.status_code == 200
        _, kwargs = mock_exchange_mgr.submit_pcf_response.call_args
        assert kwargs["message"] == decoded_msg

    def test_missing_edc_bpn_header_returns_400(self, app_client, mock_exchange_mgr):
        """edc-bpn header is required; missing it must be rejected before calling manager."""
        resp = app_client.put(f"{BASE}/{REQUEST_ID}", json=PCF_BODY)

        assert resp.status_code == 400
        mock_exchange_mgr.submit_pcf_response.assert_not_called()

    def test_manager_value_error_returns_400(self, app_client, mock_exchange_mgr):
        mock_exchange_mgr.submit_pcf_response.side_effect = ValueError("Malformed PCF")

        resp = app_client.put(
            f"{BASE}/{REQUEST_ID}",
            json=PCF_BODY,
            headers={"edc-bpn": VALID_BPN},
        )

        assert resp.status_code == 400

    def test_manager_unexpected_error_returns_500(self, app_client, mock_exchange_mgr):
        mock_exchange_mgr.submit_pcf_response.side_effect = RuntimeError("DB crash")

        resp = app_client.put(
            f"{BASE}/{REQUEST_ID}",
            json=PCF_BODY,
            headers={"edc-bpn": VALID_BPN},
        )

        assert resp.status_code == 500


# ---------------------------------------------------------------------------
# GET /{requestId}  — request_pcf
# ---------------------------------------------------------------------------

class TestRequestPcf:
    """GET /{requestId} — EDC calls this to request a PCF footprint."""

    def test_valid_request_with_manufacturer_part_id_returns_202(self, app_client, mock_exchange_mgr):
        mock_exchange_mgr.request_pcf.return_value = {"status": "accepted"}

        resp = app_client.get(
            f"{BASE}/{REQUEST_ID}",
            params={"manufacturerPartId": PART_ID},
            headers={"edc-bpn": VALID_BPN},
        )

        assert resp.status_code == 202
        mock_exchange_mgr.request_pcf.assert_called_once_with(
            request_id=REQUEST_ID,
            edc_bpn=VALID_BPN,
            manufacturer_part_id=PART_ID,
            customer_part_id=None,
            message=None,
        )

    def test_valid_request_with_customer_part_id_returns_202(self, app_client, mock_exchange_mgr):
        mock_exchange_mgr.request_pcf.return_value = {}

        resp = app_client.get(
            f"{BASE}/{REQUEST_ID}",
            params={"customerPartId": CUSTOMER_PART_ID},
            headers={"edc-bpn": VALID_BPN},
        )

        assert resp.status_code == 202
        _, kwargs = mock_exchange_mgr.request_pcf.call_args
        assert kwargs["customer_part_id"] == CUSTOMER_PART_ID
        assert kwargs["manufacturer_part_id"] is None

    def test_both_part_ids_can_be_provided(self, app_client, mock_exchange_mgr):
        mock_exchange_mgr.request_pcf.return_value = {}

        resp = app_client.get(
            f"{BASE}/{REQUEST_ID}",
            params={"manufacturerPartId": PART_ID, "customerPartId": CUSTOMER_PART_ID},
            headers={"edc-bpn": VALID_BPN},
        )

        assert resp.status_code == 202

    def test_missing_edc_bpn_header_returns_400(self, app_client, mock_exchange_mgr):
        """edc-bpn header is required; router must reject before calling manager."""
        resp = app_client.get(
            f"{BASE}/{REQUEST_ID}",
            params={"manufacturerPartId": PART_ID},
        )

        assert resp.status_code == 400
        mock_exchange_mgr.request_pcf.assert_not_called()

    def test_missing_both_part_ids_returns_400(self, app_client, mock_exchange_mgr):
        """At least one part ID must be supplied."""
        resp = app_client.get(
            f"{BASE}/{REQUEST_ID}",
            headers={"edc-bpn": VALID_BPN},
        )

        assert resp.status_code == 400
        mock_exchange_mgr.request_pcf.assert_not_called()

    def test_optional_message_forwarded_to_manager(self, app_client, mock_exchange_mgr):
        mock_exchange_mgr.request_pcf.return_value = {}
        # When passing params dict to TestClient, the value is already a plain
        # string; FastAPI/Starlette passes it through as-is.
        msg = "PCF request for battery"

        resp = app_client.get(
            f"{BASE}/{REQUEST_ID}",
            params={"manufacturerPartId": PART_ID, "message": msg},
            headers={"edc-bpn": VALID_BPN},
        )

        assert resp.status_code == 202
        _, kwargs = mock_exchange_mgr.request_pcf.call_args
        assert kwargs["message"] == msg

    def test_manager_value_error_returns_400(self, app_client, mock_exchange_mgr):
        mock_exchange_mgr.request_pcf.side_effect = ValueError("Part not found")

        resp = app_client.get(
            f"{BASE}/{REQUEST_ID}",
            params={"manufacturerPartId": PART_ID},
            headers={"edc-bpn": VALID_BPN},
        )

        assert resp.status_code == 400

    def test_manager_unexpected_error_returns_500(self, app_client, mock_exchange_mgr):
        mock_exchange_mgr.request_pcf.side_effect = RuntimeError("Timeout")

        resp = app_client.get(
            f"{BASE}/{REQUEST_ID}",
            params={"manufacturerPartId": PART_ID},
            headers={"edc-bpn": VALID_BPN},
        )

        assert resp.status_code == 500
