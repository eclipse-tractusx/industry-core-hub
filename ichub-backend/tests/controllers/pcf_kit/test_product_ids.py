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
Endpoint-level tests for the PCF Kit ProductIds controller (legacy v1.1.1 API).

Base URL: /v1/addons/pcf-kit/productIds

Endpoints under test
--------------------
PUT /{productId}?requestId=xxx  → submit_pcf_response  (PCF response, v7.0.0)
GET /{productId}?requestId=xxx  → request_pcf           (PCF request, v7.0.0)

The ``edc-bpn`` header is mandatory on both endpoints; its absence must be
rejected with HTTP 400 before the manager is ever called.

Both endpoints always call the exchange manager with ``version="v7.0.0"``.
"""

from tools.exceptions import PcfVersionGateError

# ---------------------------------------------------------------------------
# URL constants
# ---------------------------------------------------------------------------

BASE = "/v1/addons/pcf-kit/productIds"
PRODUCT_ID = "part-abc-123"
REQUEST_ID = "req-xyz-456"
VALID_BPN = "BPNL000000000342"

# ---------------------------------------------------------------------------
# PCF data payload (minimal valid structure for the PUT body)
# ---------------------------------------------------------------------------

PCF_BODY = {
    "specVersion": "2.0.1-20230314T161325Z-027-88749B3",
    "pcf": {"pCfExcludingBiogenic": 2.0},
}


# ---------------------------------------------------------------------------
# PUT /{productId}  — put_pcf_legacy
# ---------------------------------------------------------------------------

class TestPutPcfLegacy:
    """PUT /{productId}?requestId=xxx — EDC calls this to deliver a PCF v7 response."""

    def test_valid_request_returns_200(self, app_client, mock_product_ids_mgr):
        mock_product_ids_mgr.submit_pcf_response.return_value = {"status": "accepted"}

        resp = app_client.put(
            f"{BASE}/{PRODUCT_ID}?requestId={REQUEST_ID}",
            json=PCF_BODY,
            headers={"edc-bpn": VALID_BPN},
        )

        assert resp.status_code == 200
        mock_product_ids_mgr.submit_pcf_response.assert_called_once_with(
            request_id=REQUEST_ID,
            pcf_data=PCF_BODY,
            edc_bpn=VALID_BPN,
            is_update=False,
            message=None,
            version="v7.0.0",
        )

    def test_always_uses_v7_version(self, app_client, mock_product_ids_mgr):
        """productIds endpoint always hardcodes v7.0.0 regardless of any query params."""
        mock_product_ids_mgr.submit_pcf_response.return_value = {}

        resp = app_client.put(
            f"{BASE}/{PRODUCT_ID}?requestId={REQUEST_ID}",
            json=PCF_BODY,
            headers={"edc-bpn": VALID_BPN},
        )

        assert resp.status_code == 200
        _, kwargs = mock_product_ids_mgr.submit_pcf_response.call_args
        assert kwargs["version"] == "v7.0.0"

    def test_update_flag_is_passed_to_manager(self, app_client, mock_product_ids_mgr):
        mock_product_ids_mgr.submit_pcf_response.return_value = {}

        resp = app_client.put(
            f"{BASE}/{PRODUCT_ID}?requestId={REQUEST_ID}&update=true",
            json=PCF_BODY,
            headers={"edc-bpn": VALID_BPN},
        )

        assert resp.status_code == 200
        _, kwargs = mock_product_ids_mgr.submit_pcf_response.call_args
        assert kwargs["is_update"] is True

    def test_optional_message_param_forwarded(self, app_client, mock_product_ids_mgr):
        mock_product_ids_mgr.submit_pcf_response.return_value = {}
        raw_param = "Hello+world"
        decoded_msg = "Hello world"

        resp = app_client.put(
            f"{BASE}/{PRODUCT_ID}?requestId={REQUEST_ID}&message={raw_param}",
            json=PCF_BODY,
            headers={"edc-bpn": VALID_BPN},
        )

        assert resp.status_code == 200
        _, kwargs = mock_product_ids_mgr.submit_pcf_response.call_args
        assert kwargs["message"] == decoded_msg

    def test_missing_edc_bpn_header_returns_400(self, app_client, mock_product_ids_mgr):
        resp = app_client.put(
            f"{BASE}/{PRODUCT_ID}?requestId={REQUEST_ID}",
            json=PCF_BODY,
        )

        assert resp.status_code == 400
        mock_product_ids_mgr.submit_pcf_response.assert_not_called()

    def test_missing_request_id_returns_422(self, app_client, mock_product_ids_mgr):
        """requestId is a required query param."""
        resp = app_client.put(
            f"{BASE}/{PRODUCT_ID}",
            json=PCF_BODY,
            headers={"edc-bpn": VALID_BPN},
        )

        assert resp.status_code == 422
        mock_product_ids_mgr.submit_pcf_response.assert_not_called()

    def test_manager_value_error_returns_400(self, app_client, mock_product_ids_mgr):
        mock_product_ids_mgr.submit_pcf_response.side_effect = ValueError("Malformed PCF")

        resp = app_client.put(
            f"{BASE}/{PRODUCT_ID}?requestId={REQUEST_ID}",
            json=PCF_BODY,
            headers={"edc-bpn": VALID_BPN},
        )

        assert resp.status_code == 400

    def test_manager_unexpected_error_returns_500(self, app_client, mock_product_ids_mgr):
        mock_product_ids_mgr.submit_pcf_response.side_effect = RuntimeError("DB crash")

        resp = app_client.put(
            f"{BASE}/{PRODUCT_ID}?requestId={REQUEST_ID}",
            json=PCF_BODY,
            headers={"edc-bpn": VALID_BPN},
        )

        assert resp.status_code == 500

    def test_version_gate_error_returns_409(self, app_client, mock_product_ids_mgr):
        mock_product_ids_mgr.submit_pcf_response.side_effect = PcfVersionGateError(
            "Both PCF versions must be uploaded"
        )

        resp = app_client.put(
            f"{BASE}/{PRODUCT_ID}?requestId={REQUEST_ID}",
            json=PCF_BODY,
            headers={"edc-bpn": VALID_BPN},
        )

        assert resp.status_code == 409
        assert "Both PCF versions" in resp.json().get("detail", "")


# ---------------------------------------------------------------------------
# GET /{productId}  — request_pcf_legacy
# ---------------------------------------------------------------------------

class TestRequestPcfLegacy:
    """GET /{productId}?requestId=xxx — EDC calls this to request a PCF v7 footprint."""

    def test_valid_request_returns_202(self, app_client, mock_product_ids_mgr):
        mock_product_ids_mgr.request_pcf.return_value = {"status": "accepted"}

        resp = app_client.get(
            f"{BASE}/{PRODUCT_ID}",
            params={"requestId": REQUEST_ID},
            headers={"edc-bpn": VALID_BPN},
        )

        assert resp.status_code == 202
        mock_product_ids_mgr.request_pcf.assert_called_once_with(
            request_id=REQUEST_ID,
            edc_bpn=VALID_BPN,
            manufacturer_part_id=PRODUCT_ID,
            customer_part_id=None,
            message=None,
            version="v7.0.0",
        )

    def test_always_uses_v7_version(self, app_client, mock_product_ids_mgr):
        mock_product_ids_mgr.request_pcf.return_value = {}

        resp = app_client.get(
            f"{BASE}/{PRODUCT_ID}",
            params={"requestId": REQUEST_ID},
            headers={"edc-bpn": VALID_BPN},
        )

        assert resp.status_code == 202
        _, kwargs = mock_product_ids_mgr.request_pcf.call_args
        assert kwargs["version"] == "v7.0.0"

    def test_product_id_maps_to_manufacturer_part_id(self, app_client, mock_product_ids_mgr):
        mock_product_ids_mgr.request_pcf.return_value = {}

        resp = app_client.get(
            f"{BASE}/{PRODUCT_ID}",
            params={"requestId": REQUEST_ID},
            headers={"edc-bpn": VALID_BPN},
        )

        assert resp.status_code == 202
        _, kwargs = mock_product_ids_mgr.request_pcf.call_args
        assert kwargs["manufacturer_part_id"] == PRODUCT_ID
        assert kwargs["customer_part_id"] is None

    def test_optional_message_forwarded(self, app_client, mock_product_ids_mgr):
        mock_product_ids_mgr.request_pcf.return_value = {}
        msg = "PCF request for battery"

        resp = app_client.get(
            f"{BASE}/{PRODUCT_ID}",
            params={"requestId": REQUEST_ID, "message": msg},
            headers={"edc-bpn": VALID_BPN},
        )

        assert resp.status_code == 202
        _, kwargs = mock_product_ids_mgr.request_pcf.call_args
        assert kwargs["message"] == msg

    def test_missing_edc_bpn_header_returns_400(self, app_client, mock_product_ids_mgr):
        resp = app_client.get(
            f"{BASE}/{PRODUCT_ID}",
            params={"requestId": REQUEST_ID},
        )

        assert resp.status_code == 400
        mock_product_ids_mgr.request_pcf.assert_not_called()

    def test_missing_request_id_returns_422(self, app_client, mock_product_ids_mgr):
        """requestId is a required query param."""
        resp = app_client.get(
            f"{BASE}/{PRODUCT_ID}",
            headers={"edc-bpn": VALID_BPN},
        )

        assert resp.status_code == 422
        mock_product_ids_mgr.request_pcf.assert_not_called()

    def test_manager_value_error_returns_400(self, app_client, mock_product_ids_mgr):
        mock_product_ids_mgr.request_pcf.side_effect = ValueError("Part not found")

        resp = app_client.get(
            f"{BASE}/{PRODUCT_ID}",
            params={"requestId": REQUEST_ID},
            headers={"edc-bpn": VALID_BPN},
        )

        assert resp.status_code == 400

    def test_manager_unexpected_error_returns_500(self, app_client, mock_product_ids_mgr):
        mock_product_ids_mgr.request_pcf.side_effect = RuntimeError("Timeout")

        resp = app_client.get(
            f"{BASE}/{PRODUCT_ID}",
            params={"requestId": REQUEST_ID},
            headers={"edc-bpn": VALID_BPN},
        )

        assert resp.status_code == 500
