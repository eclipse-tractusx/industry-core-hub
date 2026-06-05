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
Unit tests for CcmNotificationManager.
"""

import pytest
from unittest.mock import Mock, call

from managers.addons_service.ccm_kit.v1.notifications import (
    CcmNotificationManager,
    CCM_NT_REQUEST_RECEIVED,
    CCM_NT_REQUEST_NOT_FOUND,
    CCM_NT_PUSH_RECEIVED,
    CCM_NT_PUSH_SENT,
    CCM_NT_AVAILABLE_RECEIVED,
    CCM_NT_AVAILABLE_SENT,
    CCM_NT_STATUS_SENT,
)
from models.metadata_database.notification.models import NotificationDirection
from tools.constants import CCM


class TestCcmNotificationManager:
    """Unit tests for CcmNotificationManager.create_ccm_notification()."""

    def setup_method(self):
        self.mock_service = Mock()
        self.manager = CcmNotificationManager(
            notification_service=self.mock_service
        )

    # ------------------------------------------------------------------
    # Basic contract tests
    # ------------------------------------------------------------------

    def test_create_notification_calls_service_with_correct_use_case(self):
        """
        GIVEN valid sender/receiver BPNs and a notification type
        WHEN create_ccm_notification is called
        THEN create_notification is called once with use_case=CCM.
        """
        self.manager.create_ccm_notification(
            sender_bpn="BPNL000000000001",
            receiver_bpn="BPNL000000000002",
            notification_type=CCM_NT_PUSH_RECEIVED,
        )

        self.mock_service.create_notification.assert_called_once()
        kwargs = self.mock_service.create_notification.call_args.kwargs
        assert kwargs["use_case"] == CCM

    def test_create_notification_default_direction_is_incoming(self):
        """
        GIVEN no explicit direction
        WHEN create_ccm_notification is called
        THEN create_notification receives direction=INCOMING.
        """
        self.manager.create_ccm_notification(
            sender_bpn="BPNL000000000001",
            receiver_bpn="BPNL000000000002",
            notification_type=CCM_NT_REQUEST_RECEIVED,
        )

        kwargs = self.mock_service.create_notification.call_args.kwargs
        assert kwargs["direction"] == NotificationDirection.INCOMING

    def test_create_notification_outgoing_direction(self):
        """
        GIVEN direction=OUTGOING
        WHEN create_ccm_notification is called
        THEN create_notification receives direction=OUTGOING.
        """
        self.manager.create_ccm_notification(
            sender_bpn="BPNL000000000001",
            receiver_bpn="BPNL000000000002",
            notification_type=CCM_NT_PUSH_SENT,
            direction=NotificationDirection.OUTGOING,
        )

        kwargs = self.mock_service.create_notification.call_args.kwargs
        assert kwargs["direction"] == NotificationDirection.OUTGOING

    def test_context_string_includes_notification_type(self):
        """
        GIVEN a notification_type
        WHEN create_ccm_notification is called
        THEN the Notification header context contains the type.
        """
        self.manager.create_ccm_notification(
            sender_bpn="BPNL000000000001",
            receiver_bpn="BPNL000000000002",
            notification_type=CCM_NT_AVAILABLE_RECEIVED,
        )

        notification = self.mock_service.create_notification.call_args.kwargs["notification"]
        assert CCM_NT_AVAILABLE_RECEIVED in notification.header.context

    def test_optional_fields_present_in_content(self):
        """
        GIVEN certificate_type, certified_bpn, document_id are provided
        WHEN create_ccm_notification is called
        THEN the Notification content contains those fields as extras.
        """
        self.manager.create_ccm_notification(
            sender_bpn="BPNL000000000001",
            receiver_bpn="BPNL000000000002",
            notification_type=CCM_NT_PUSH_RECEIVED,
            certificate_type="ISO9001",
            certified_bpn="BPNL000000000003",
            document_id="DOC-123",
        )

        notification = self.mock_service.create_notification.call_args.kwargs["notification"]
        content_dump = notification.content.model_dump(by_alias=True)
        assert content_dump.get("certificateType") == "ISO9001"
        assert content_dump.get("certifiedBpn") == "BPNL000000000003"
        assert content_dump.get("documentId") == "DOC-123"

    def test_optional_fields_absent_when_not_provided(self):
        """
        GIVEN certificate_type/certified_bpn/document_id are None
        WHEN create_ccm_notification is called
        THEN the content dict does NOT contain those keys.
        """
        self.manager.create_ccm_notification(
            sender_bpn="BPNL000000000001",
            receiver_bpn="BPNL000000000002",
            notification_type=CCM_NT_STATUS_SENT,
        )

        notification = self.mock_service.create_notification.call_args.kwargs["notification"]
        content_dump = notification.content.model_dump(by_alias=True, exclude_none=True)
        assert "certificateType" not in content_dump
        assert "certifiedBpn" not in content_dump
        assert "documentId" not in content_dump

    # ------------------------------------------------------------------
    # Fail-silent guarantee
    # ------------------------------------------------------------------

    def test_failure_is_silent(self):
        """
        GIVEN the notification service raises an exception
        WHEN create_ccm_notification is called
        THEN no exception propagates to the caller.
        """
        self.mock_service.create_notification.side_effect = RuntimeError("DTR unreachable")

        # Must not raise
        self.manager.create_ccm_notification(
            sender_bpn="BPNL000000000001",
            receiver_bpn="BPNL000000000002",
            notification_type=CCM_NT_REQUEST_NOT_FOUND,
            certificate_type="IATF16949",
            certified_bpn="BPNL000000000003",
        )

    def test_missing_notification_service_argument_does_not_raise(self):
        """
        GIVEN notification service raises on construction
        WHEN create_ccm_notification is called via a working manager
        THEN the fail-silent wrapper absorbs it.
        """
        failing_service = Mock()
        failing_service.create_notification.side_effect = Exception("unexpected")
        manager = CcmNotificationManager(notification_service=failing_service)

        manager.create_ccm_notification(
            sender_bpn="BPNL000000000001",
            receiver_bpn="BPNL000000000002",
            notification_type=CCM_NT_AVAILABLE_SENT,
            direction=NotificationDirection.OUTGOING,
        )
        # Still no exception raised

    # ------------------------------------------------------------------
    # Notification type constants sanity check
    # ------------------------------------------------------------------

    def test_all_notification_types_have_distinct_values(self):
        types = [
            CCM_NT_REQUEST_RECEIVED,
            CCM_NT_REQUEST_NOT_FOUND,
            CCM_NT_PUSH_RECEIVED,
            CCM_NT_PUSH_SENT,
            CCM_NT_AVAILABLE_RECEIVED,
            CCM_NT_AVAILABLE_SENT,
            CCM_NT_STATUS_SENT,
        ]
        assert len(types) == len(set(types)), "All notification type constants must be unique"
