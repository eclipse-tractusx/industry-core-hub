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
Pydantic models for CX-0135 Company Certificate Management notification payloads.

These models represent the CCM-specific ``content`` fields that extend the
generic ``NotificationContent`` from the Tractus-X SDK.  Since the SDK model
uses ``extra="allow"``, the additional CCM fields are accepted at parsing time
and can be validated post-hoc using these models.

Notification contexts:
    - Request:   ``CompanyCertificateManagement-CCMAPI-Request:1.0.0``
    - Status:    ``CompanyCertificateManagement-CCMAPI-Status:1.0.0``
    - Push:      ``CompanyCertificateManagement-CCMAPI-Push:1.0.0``
    - Available: ``CompanyCertificateManagement-CCMAPI-Available:1.0.0``
"""

from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Enumerations
# ---------------------------------------------------------------------------

class CertificateStatusValue(str, Enum):
    """
    Status values a consumer can send back via ``POST /companycertificate/status``.

    As defined in CX-0135
    - RECEIVED:  Certificate has been received; validation is in progress.
    - ACCEPTED:  Certificate has been accepted by the consumer.
    - REJECTED:  Certificate has been rejected by the consumer.
    """
    RECEIVED = "RECEIVED"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"

class CcmRequestContent(BaseModel):
    """
    Content payload for ``POST /companycertificate/request`` (consumer → provider).

    The consumer identifies the desired certificate by the certified BPNL
    and the certificate type.  Optional ``locationBpns`` can narrow the scope
    to specific sites/addresses.

    Example payload (CX-0135 §2.1.1)::

        {
            "certifiedBpn": "BPNL00000003AYRE",
            "certificateType": "ISO9001",
            "locationBpns": ["BPNA000000000001", "BPNS000000000003"]
        }
    """
    certified_bpn: str = Field(
        alias="certifiedBpn",
        description="BPNL of the legal entity whose certificate is being requested.",
    )
    certificate_type: str = Field(
        alias="certificateType",
        description="Certificate type identifier (e.g. ISO9001, IATF16949).",
    )
    location_bpns: Optional[List[str]] = Field(
        default=None,
        alias="locationBpns",
        description="Optional list of BPNS/BPNA to narrow the certificate scope.",
    )

    class Config:
        populate_by_name = True

class CcmCatalogSearchRequest(BaseModel):
    """Request body for consumer catalog search endpoint."""
    provider_bpn: str = Field(
        alias="providerBpn",
        description="BPNL of the provider whose catalog to search.",
    )
    certificate_type: Optional[str] = Field(
        default=None,
        alias="certificateType",
        description="Optional certificate type to filter for.",
    )

    class Config:
        populate_by_name = True


class CcmCatalogSearchResult(BaseModel):
    """Response body for consumer catalog search endpoint."""
    found: bool = Field(description="Whether a CCM notification asset was found in the provider catalog.")
    provider_bpn: str = Field(alias="providerBpn")
    dsp_url: Optional[str] = Field(default=None, alias="dspUrl", description="DSP URL used for the catalog query.")
    asset_id: Optional[str] = Field(default=None, alias="assetId", description="EDC asset ID if found.")
    dct_type: Optional[str] = Field(default=None, alias="dctType", description="DCT type of the asset.")
    error: Optional[str] = Field(default=None, description="Error message if search failed.")

    class Config:
        populate_by_name = True


class CcmSendRequestPayload(BaseModel):
    """Request body for consumer send-request endpoint."""
    sender_bpn: str = Field(
        alias="senderBpn",
        description="BPNL of the consumer sending this request (own BPN).",
    )
    provider_bpn: str = Field(
        alias="providerBpn",
        description="BPNL of the provider to request the certificate from.",
    )
    certified_bpn: str = Field(
        alias="certifiedBpn",
        description="BPNL of the legal entity whose certificate is being requested.",
    )
    certificate_type: str = Field(
        alias="certificateType",
        description="Certificate type identifier (e.g. ISO9001).",
    )
    location_bpns: Optional[List[str]] = Field(
        default=None,
        alias="locationBpns",
        description="Optional BPNS/BPNA to narrow scope.",
    )

    class Config:
        populate_by_name = True


class CcmSendStatusPayload(BaseModel):
    """Request body for consumer send-status endpoint."""
    sender_bpn: str = Field(
        alias="senderBpn",
        description="BPNL of the consumer sending this status (own BPN).",
    )
    provider_bpn: str = Field(
        alias="providerBpn",
        description="BPNL of the provider the status is sent to.",
    )
    document_id: str = Field(
        alias="documentId",
        description="Reference ID of the certificate document.",
    )
    certificate_status: CertificateStatusValue = Field(
        alias="certificateStatus",
        description="Consumer's processing result.",
    )
    location_bpns: Optional[List[str]] = Field(
        default=None,
        alias="locationBpns",
        description="Locations covered by this status feedback.",
    )
    certificate_errors: Optional[List[Any]] = Field(
        default=None,
        alias="certificateErrors",
        description="Top-level errors (when REJECTED).",
    )
    location_errors: Optional[List[Any]] = Field(
        default=None,
        alias="locationErrors",
        description="Per-location errors (when REJECTED).",
    )

    class Config:
        populate_by_name = True


class CcmSendResult(BaseModel):
    """Response body for consumer send-request / send-status endpoints."""
    success: bool = Field(description="Whether the notification was sent successfully.")
    message_id: Optional[str] = Field(default=None, alias="messageId", description="UUID of the sent notification.")
    error: Optional[str] = Field(default=None, description="Error message if sending failed.")

    class Config:
        populate_by_name = True

class CertificateErrorDetail(BaseModel):
    """Single error entry in a REJECTED status payload."""
    message: str = Field(description="Human-readable error description.")


class LocationErrorDetail(BaseModel):
    """Per-location error in a REJECTED status payload."""
    bpn: str = Field(description="BPNS or BPNA that was rejected.")
    location_errors: List[CertificateErrorDetail] = Field(
        alias="locationErrors",
        description="Errors specific to this location.",
    )

    class Config:
        populate_by_name = True


class CcmStatusContent(BaseModel):
    """
    Content payload for ``POST /companycertificate/status`` (consumer → provider).

    The consumer references the previously received certificate by its
    ``documentId`` and communicates the processing result.

    Example payload:

        {
            "documentId": "00000000-0000-0000-0000-000000000001",
            "certificateStatus": "ACCEPTED",
            "locationBpns": ["BPNS000000000001", "BPNA000000000001"]
        }
    """
    document_id: str = Field(
        alias="documentId",
        description="Internal reference ID of the certificate document.",
    )
    certificate_status: CertificateStatusValue = Field(
        alias="certificateStatus",
        description="Consumer's processing result (RECEIVED / ACCEPTED / REJECTED).",
    )
    location_bpns: Optional[List[str]] = Field(
        default=None,
        alias="locationBpns",
        description="BPNS/BPNA locations covered by this status feedback.",
    )
    certificate_errors: Optional[List[CertificateErrorDetail]] = Field(
        default=None,
        alias="certificateErrors",
        description="Top-level errors (only present when status is REJECTED).",
    )
    location_errors: Optional[List[LocationErrorDetail]] = Field(
        default=None,
        alias="locationErrors",
        description="Per-location errors (only present when status is REJECTED).",
    )

    class Config:
        populate_by_name = True
