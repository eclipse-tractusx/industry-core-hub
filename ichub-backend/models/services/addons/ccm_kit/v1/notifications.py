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


# ---------------------------------------------------------------------------
# PUSH content models (CX-0135 §2.1.1 — Provider → Consumer)
# ---------------------------------------------------------------------------

class CcmPushDocument(BaseModel):
    """
    Document payload embedded in a PUSH notification.

    Contains the certificate file encoded as Base64 along with metadata
    that allows the consumer to process and store the document.

    Example::

        {
            "documentID": "UUID--123456789",
            "creationDate": "2024-08-23T13:19:00.280+02:00",
            "contentType": "application/pdf",
            "contentBase64": "iVBORw0KGgo..."
        }
    """
    document_id: str = Field(
        alias="documentID",
        description="Provider-internal reference ID for this document.",
    )
    creation_date: Optional[str] = Field(
        default=None,
        alias="creationDate",
        description="ISO 8601 timestamp when the document was created.",
    )
    content_type: str = Field(
        default="application/pdf",
        alias="contentType",
        description="MIME type of the certificate document.",
    )
    content_base64: str = Field(
        alias="contentBase64",
        description="Base64-encoded binary content of the certificate document.",
    )

    class Config:
        populate_by_name = True


class CcmPushValidator(BaseModel):
    """Third-party validator who verified the certificate."""
    validator_name: Optional[str] = Field(
        default=None,
        alias="validatorName",
        description="Name of the validating entity.",
    )
    validator_bpn: Optional[str] = Field(
        default=None,
        alias="validatorBpn",
        description="BPNL of the validating entity.",
    )

    class Config:
        populate_by_name = True


class CcmPushIssuer(BaseModel):
    """Certification body that issued the certificate."""
    issuer_name: str = Field(
        alias="issuerName",
        description="Name of the issuing authority (e.g. TÜV).",
    )
    issuer_bpn: Optional[str] = Field(
        default=None,
        alias="issuerBpn",
        description="BPNL of the issuing authority.",
    )

    class Config:
        populate_by_name = True


class CcmPushCertificateType(BaseModel):
    """Certificate type with optional version."""
    certificate_type: str = Field(
        alias="certificateType",
        description="Certificate type identifier (e.g. ISO9001).",
    )
    certificate_version: Optional[str] = Field(
        default=None,
        alias="certificateVersion",
        description="Version of the certificate standard (e.g. 2015).",
    )

    class Config:
        populate_by_name = True


class CcmPushEnclosedSite(BaseModel):
    """Site covered by the certificate."""
    area_of_application: Optional[str] = Field(
        default=None,
        alias="areaOfApplication",
        description="Scope of the certificate at this site.",
    )
    enclosed_site_bpn: str = Field(
        alias="enclosedSiteBpn",
        description="BPNS or BPNA of the site covered.",
    )

    class Config:
        populate_by_name = True


class CcmPushContent(BaseModel):
    """
    Full BusinessPartnerCertificate payload for ``POST /companycertificate/push``.

    The provider sends the complete certificate data — including the Base64-
    encoded document — to the consumer's notification endpoint.

    This matches the CX-0135 §2.1.1 push payload structure exactly.
    """
    business_partner_number: str = Field(
        alias="businessPartnerNumber",
        description="BPNL of the certified legal entity.",
    )
    type: CcmPushCertificateType = Field(
        description="Certificate type and version.",
    )
    enclosed_sites: Optional[List[CcmPushEnclosedSite]] = Field(
        default=None,
        alias="enclosedSites",
        description="Sites (BPNS/BPNA) covered by the certificate.",
    )
    registration_number: Optional[str] = Field(
        default=None,
        alias="registrationNumber",
        description="Official registration number at the certification authority.",
    )
    uploader: Optional[str] = Field(
        default=None,
        description="BPNL of the company that originally provided the certificate.",
    )
    document: CcmPushDocument = Field(
        description="Certificate document with Base64 content.",
    )
    validator: Optional[CcmPushValidator] = Field(
        default=None,
        description="Third-party validator information.",
    )
    valid_until: Optional[str] = Field(
        default=None,
        alias="validUntil",
        description="Expiry date (ISO 8601 date).",
    )
    valid_from: Optional[str] = Field(
        default=None,
        alias="validFrom",
        description="Start date of validity (ISO 8601 date).",
    )
    trust_level: Optional[str] = Field(
        default=None,
        alias="trustLevel",
        description="Trust level (none/low/high/trusted).",
    )
    area_of_application: Optional[str] = Field(
        default=None,
        alias="areaOfApplication",
        description="Scope of the certificate.",
    )
    issuer: CcmPushIssuer = Field(
        description="Certification body that issued the certificate.",
    )

    class Config:
        populate_by_name = True


class CcmPushRequest(BaseModel):
    """Request body for the provider push trigger endpoint."""
    certificate_id: int = Field(
        alias="certificateId",
        description="Internal ID of the certificate to push.",
    )
    consumer_bpn: str = Field(
        alias="consumerBpn",
        description="BPNL of the consumer to push the certificate to.",
    )

    class Config:
        populate_by_name = True


# ---------------------------------------------------------------------------
# AVAILABLE content models
# ---------------------------------------------------------------------------

class CcmAvailableContent(BaseModel):
    """
    Content payload for the Certificate Available notification.

    A lightweight notification from the provider telling the consumer
    that a certificate has been published or updated in the EDC catalog
    and can be retrieved via the PULL mechanism.

    Example::

        {
            "documentId": "00000000-0000-0000-0000-000000000001",
            "certificateType": "ISO9001",
            "locationBpns": ["BPNS000000000001", "BPNA000000000002"]
        }
    """
    document_id: str = Field(
        alias="documentId",
        description="Reference ID of the certificate now available.",
    )
    certificate_type: str = Field(
        alias="certificateType",
        description="Type of the available certificate.",
    )
    location_bpns: Optional[List[str]] = Field(
        default=None,
        alias="locationBpns",
        description="BPNS/BPNA sites covered by the certificate.",
    )

    class Config:
        populate_by_name = True


class CcmAvailableRequest(BaseModel):
    """Request body for the provider available-notification trigger endpoint."""
    certificate_id: int = Field(
        alias="certificateId",
        description="Internal ID of the certificate that is now available.",
    )
    consumer_bpn: str = Field(
        alias="consumerBpn",
        description="BPNL of the consumer to notify.",
    )

    class Config:
        populate_by_name = True
