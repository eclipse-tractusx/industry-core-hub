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

import pytest
from uuid import uuid4
from pydantic import ValidationError

from models.services.notification.requests import SendNotificationRequest


class TestSendNotificationRequest:
    """Tests for the SendNotificationRequest Pydantic model."""

    def test_minimum_required_fields(self):
        """Only message_id and provider_bpn are required; all others default to None."""
        message_id = uuid4()
        req = SendNotificationRequest(
            message_id=message_id,
            provider_bpn="BPNL00000003CRHK",
        )
        assert req.message_id == message_id
        assert req.provider_bpn == "BPNL00000003CRHK"
        assert req.endpoint_path is None
        assert req.provider_dsp_url is None
        assert req.governance is None

    def test_all_fields_provided(self):
        """All optional fields are accepted when explicitly set."""
        message_id = uuid4()
        policy = [{"action": "use", "constraints": []}]
        req = SendNotificationRequest(
            message_id=message_id,
            endpoint_path="/connect-to-parent",
            provider_bpn="BPNL00000003CRHK",
            provider_dsp_url="https://edc.partner.example.com/api/v1/dsp",
            governance=policy,
        )
        assert req.endpoint_path == "/connect-to-parent"
        assert req.provider_dsp_url == "https://edc.partner.example.com/api/v1/dsp"
        assert req.governance == policy

    def test_missing_message_id_raises_validation_error(self):
        """message_id is required; omitting it must raise ValidationError."""
        with pytest.raises(ValidationError) as exc_info:
            SendNotificationRequest(provider_bpn="BPNL00000003CRHK")
        assert "message_id" in str(exc_info.value)

    def test_missing_provider_bpn_raises_validation_error(self):
        """provider_bpn is required; omitting it must raise ValidationError."""
        with pytest.raises(ValidationError) as exc_info:
            SendNotificationRequest(message_id=uuid4())
        assert "provider_bpn" in str(exc_info.value)

    def test_invalid_uuid_for_message_id_raises_validation_error(self):
        """A non-UUID string for message_id must raise ValidationError."""
        with pytest.raises(ValidationError):
            SendNotificationRequest(
                message_id="not-a-valid-uuid",
                provider_bpn="BPNL00000003CRHK",
            )

    def test_governance_accepts_list_of_dicts(self):
        """governance accepts a list with multiple arbitrary policy objects."""
        policy = [
            {"permissions": [{"action": "use"}], "prohibitions": []},
            {"obligations": []},
        ]
        req = SendNotificationRequest(
            message_id=uuid4(),
            provider_bpn="BPNL00000003CRHK",
            governance=policy,
        )
        assert len(req.governance) == 2
        assert req.governance == policy

    def test_governance_none_is_explicit_default(self):
        """governance=None is treated the same as omitting it."""
        req = SendNotificationRequest(
            message_id=uuid4(),
            provider_bpn="BPNL00000003CRHK",
            governance=None,
        )
        assert req.governance is None

    def test_endpoint_path_none_is_explicit_default(self):
        """endpoint_path=None is treated the same as omitting it."""
        req = SendNotificationRequest(
            message_id=uuid4(),
            provider_bpn="BPNL00000003CRHK",
            endpoint_path=None,
        )
        assert req.endpoint_path is None

    def test_provider_dsp_url_none_is_explicit_default(self):
        """provider_dsp_url=None is treated the same as omitting it."""
        req = SendNotificationRequest(
            message_id=uuid4(),
            provider_bpn="BPNL00000003CRHK",
            provider_dsp_url=None,
        )
        assert req.provider_dsp_url is None

    def test_serialisation_round_trip(self):
        """model_dump / model_validate round trip preserves all fields."""
        message_id = uuid4()
        original = SendNotificationRequest(
            message_id=message_id,
            endpoint_path="/feedback",
            provider_bpn="BPNL00000003CRHK",
            provider_dsp_url="https://edc.example.com/api/v1/dsp",
            governance=[{"action": "use"}],
        )
        restored = SendNotificationRequest.model_validate(original.model_dump())
        assert restored == original
