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
Unit tests for CCM Pydantic model validations.

Covers:
  - BPNL pattern enforcement on certificate and notification models
  - Date-range coherence validator on UploadCertificateRequest
"""

import pytest
from datetime import date
from pydantic import ValidationError

from models.services.addons.ccm_kit.v1.certificates import (
    CertificateListItem,
    TrustLevelEnum,
    UploadCertificateRequest,
)
from models.services.addons.ccm_kit.v1.notifications import (
    CcmCatalogSearchRequest,
    CcmRequestContent,
    CcmSendRequestPayload,
    CcmSendStatusPayload,
)


# ---------------------------------------------------------------------------
# BPNL pattern – certificate models
# ---------------------------------------------------------------------------

class TestBpnlPatternCertificates:
    """Validate that BPNL fields reject malformed identifiers."""

    def test_certificate_list_item_valid_bpnl(self):
        """A correctly formatted BPNL is accepted."""
        item = CertificateListItem(
            certificateId="1",
            bpnl="BPNL00000000001A",
            certificateType="ISO9001",
            issuer="TÜV",
            validFrom=date(2024, 1, 1),
            trustLevel=TrustLevelEnum.none,
        )
        assert item.bpnl == "BPNL00000000001A"

    @pytest.mark.parametrize("bad_bpnl", [
        "BPNL_TOO_SHORT",
        "NOTABPNL00000001",
        "bpnl000000000001",   # lowercase prefix
        "BPNS000000000001",   # site, not legal entity
        "",
    ])
    def test_certificate_list_item_rejects_bad_bpnl(self, bad_bpnl):
        """Malformed BPNL values are rejected with a ValidationError."""
        with pytest.raises(ValidationError):
            CertificateListItem(
                certificateId="1",
                bpnl=bad_bpnl,
                certificateType="ISO9001",
                issuer="TÜV",
                validFrom=date(2024, 1, 1),
                trustLevel=TrustLevelEnum.none,
            )


# ---------------------------------------------------------------------------
# BPNL pattern – notification models
# ---------------------------------------------------------------------------

class TestBpnlPatternNotifications:
    """Validate that BPN fields on notification payloads enforce the pattern."""

    def test_ccm_request_content_valid(self):
        content = CcmRequestContent(
            certifiedBpn="BPNL00000000001A",
            certificateType="ISO9001",
        )
        assert content.certified_bpn == "BPNL00000000001A"

    def test_ccm_request_content_rejects_bad_bpn(self):
        with pytest.raises(ValidationError):
            CcmRequestContent(
                certifiedBpn="INVALID",
                certificateType="ISO9001",
            )

    def test_catalog_search_valid(self):
        req = CcmCatalogSearchRequest(providerBpn="BPNL00000000001A")
        assert req.provider_bpn == "BPNL00000000001A"

    def test_catalog_search_rejects_bad_bpn(self):
        with pytest.raises(ValidationError):
            CcmCatalogSearchRequest(providerBpn="BAD")

    def test_send_request_payload_rejects_bad_bpn(self):
        with pytest.raises(ValidationError):
            CcmSendRequestPayload(
                senderBpn="INVALID",
                providerBpn="BPNL00000000001A",
                certifiedBpn="BPNL00000000001A",
                certificateType="ISO9001",
            )

    def test_send_status_payload_rejects_bad_bpn(self):
        with pytest.raises(ValidationError):
            CcmSendStatusPayload(
                senderBpn="BPNL00000000001A",
                providerBpn="INVALID",
                documentId="1",
                certificateStatus="ACCEPTED",
            )


# ---------------------------------------------------------------------------
# Date-range coherence – UploadCertificateRequest
# ---------------------------------------------------------------------------

class TestDateRangeValidator:
    """Validate the model_validator that enforces valid_from <= valid_until."""

    def test_valid_range_accepted(self):
        req = UploadCertificateRequest(
            bpnl="BPNL00000000001A",
            certificateType="ISO9001",
            issuer="TÜV",
            validFrom=date(2024, 1, 1),
            validUntil=date(2026, 12, 31),
        )
        assert req.valid_from < req.valid_until

    def test_same_date_accepted(self):
        """valid_from == valid_until is allowed (e.g. single-day certificate)."""
        req = UploadCertificateRequest(
            bpnl="BPNL00000000001A",
            certificateType="ISO9001",
            issuer="TÜV",
            validFrom=date(2024, 6, 15),
            validUntil=date(2024, 6, 15),
        )
        assert req.valid_from == req.valid_until

    def test_no_valid_until_accepted(self):
        """Omitting valid_until (open-ended certificate) is allowed."""
        req = UploadCertificateRequest(
            bpnl="BPNL00000000001A",
            certificateType="ISO9001",
            issuer="TÜV",
            validFrom=date(2024, 1, 1),
        )
        assert req.valid_until is None

    def test_inverted_range_rejected(self):
        """valid_from > valid_until must raise a ValidationError."""
        with pytest.raises(ValidationError, match="validFrom must not be later"):
            UploadCertificateRequest(
                bpnl="BPNL00000000001A",
                certificateType="ISO9001",
                issuer="TÜV",
                validFrom=date(2026, 12, 31),
                validUntil=date(2024, 1, 1),
            )
