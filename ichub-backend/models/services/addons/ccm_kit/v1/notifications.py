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

from tools.constants import BPNL_PATTERN as _BPNL_PATTERN
from tractusx_sdk.industry.models.notifications import NotificationHeader  # noqa: E402


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
        pattern=_BPNL_PATTERN,
        max_length=20,
        description="BPNL of the legal entity whose certificate is being requested.",
    )
    certificate_type: str = Field(
        alias="certificateType",
        max_length=64,
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
        pattern=_BPNL_PATTERN,
        description="BPNL of the provider whose catalog to search.",
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
        pattern=_BPNL_PATTERN,
        description="BPNL of the consumer sending this request (own BPN).",
    )
    provider_bpn: str = Field(
        alias="providerBpn",
        pattern=_BPNL_PATTERN,
        description="BPNL of the provider to request the certificate from.",
    )
    certified_bpn: str = Field(
        alias="certifiedBpn",
        pattern=_BPNL_PATTERN,
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
    governance: Optional[List[Dict[str, Any]]] = Field(
        default=None,
        description="Governance policies for contract negotiation.",
    )

    class Config:
        populate_by_name = True


class CcmSendStatusPayload(BaseModel):
    """Request body for consumer send-status endpoint."""
    sender_bpn: str = Field(
        alias="senderBpn",
        pattern=_BPNL_PATTERN,
        description="BPNL of the consumer sending this status (own BPN).",
    )
    provider_bpn: str = Field(
        alias="providerBpn",
        pattern=_BPNL_PATTERN,
        description="BPNL of the provider the status is sent to.",
    )
    document_id: str = Field(
        alias="documentId",
        max_length=256,
        description="Reference ID of the certificate document.",
    )
    certificate_status: CertificateStatusValue = Field(
        alias="certificateStatus",
        description="Consumer's processing result.",
    )
    related_message_id: Optional[str] = Field(
        default=None,
        alias="relatedMessageId",
        max_length=64,
        description="UUID of the original notification this status responds to.",
    )
    location_bpns: Optional[List[str]] = Field(
        default=None,
        alias="locationBpns",
        description="Locations covered by this status feedback.",
    )
    certificate_errors: Optional[List["CertificateErrorDetail"]] = Field(
        default=None,
        alias="certificateErrors",
        description="Top-level errors (when REJECTED).",
    )
    location_errors: Optional[List["LocationErrorDetail"]] = Field(
        default=None,
        alias="locationErrors",
        description="Per-location errors (when REJECTED).",
    )
    governance: Optional[List[Dict[str, Any]]] = Field(
        default=None,
        description="Governance policies for contract negotiation.",
    )

    class Config:
        populate_by_name = True


class CcmSendResult(BaseModel):
    """Response body for consumer send-request / send-status endpoints."""
    success: bool = Field(description="Whether the notification was sent successfully.")
    message_id: Optional[str] = Field(default=None, alias="messageId", description="UUID of the sent notification.")
    error: Optional[str] = Field(default=None, description="Error message if sending failed.")
    # Internal only — carries the raw provider response body for post-send
    # inspection (e.g. REJECTED status). Excluded from API serialisation.
    provider_response: Optional[Dict[str, Any]] = Field(default=None, exclude=True)

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


# Resolve forward references used in CcmSendStatusPayload
CcmSendStatusPayload.model_rebuild()


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
        max_length=256,
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
        max_length=256,
        description="Provider-internal reference ID for this document.",
    )
    creation_date: Optional[str] = Field(
        default=None,
        alias="creationDate",
        max_length=64,
        description="ISO 8601 timestamp when the document was created.",
    )
    content_type: str = Field(
        default="application/pdf",
        alias="contentType",
        max_length=128,
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
        max_length=256,
        description="Name of the validating entity.",
    )
    validator_bpn: Optional[str] = Field(
        default=None,
        alias="validatorBpn",
        max_length=20,
        description="BPNL of the validating entity.",
    )

    class Config:
        populate_by_name = True


class CcmPushIssuer(BaseModel):
    """Certification body that issued the certificate."""
    issuer_name: str = Field(
        alias="issuerName",
        max_length=256,
        description="Name of the issuing authority (e.g. TÜV).",
    )
    issuer_bpn: Optional[str] = Field(
        default=None,
        alias="issuerBpn",
        max_length=20,
        description="BPNL of the issuing authority.",
    )

    class Config:
        populate_by_name = True


class CcmPushCertificateType(BaseModel):
    """Certificate type with optional version."""
    certificate_type: str = Field(
        alias="certificateType",
        max_length=64,
        description="Certificate type identifier (e.g. ISO9001).",
    )
    certificate_version: Optional[str] = Field(
        default=None,
        alias="certificateVersion",
        max_length=32,
        description="Version of the certificate standard (e.g. 2015).",
    )

    class Config:
        populate_by_name = True


class CcmPushEnclosedSite(BaseModel):
    """Site covered by the certificate."""
    area_of_application: Optional[str] = Field(
        default=None,
        alias="areaOfApplication",
        max_length=512,
        description="Scope of the certificate at this site.",
    )
    enclosed_site_bpn: str = Field(
        alias="enclosedSiteBpn",
        max_length=20,
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
        max_length=20,
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
        max_length=256,
        description="Official registration number at the certification authority.",
    )
    uploader: Optional[str] = Field(
        default=None,
        max_length=20,
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
        max_length=32,
        description="Expiry date (ISO 8601 date).",
    )
    valid_from: Optional[str] = Field(
        default=None,
        alias="validFrom",
        max_length=32,
        description="Start date of validity (ISO 8601 date).",
    )
    trust_level: Optional[str] = Field(
        default=None,
        alias="trustLevel",
        max_length=16,
        description="Trust level (none/low/high/trusted).",
    )
    area_of_application: Optional[str] = Field(
        default=None,
        alias="areaOfApplication",
        max_length=512,
        description="Scope of the certificate.",
    )
    issuer: CcmPushIssuer = Field(
        description="Certification body that issued the certificate.",
    )

    class Config:
        populate_by_name = True


class CcmPushRequest(BaseModel):
    """Request body for the provider push trigger endpoint."""
    sender_bpn: str = Field(
        alias="senderBpn",
        pattern=_BPNL_PATTERN,
        description="BPNL of the provider sending this push (own BPN).",
    )
    certificate_id: int = Field(
        alias="certificateId",
        gt=0,
        description="Internal ID of the certificate to push.",
    )
    consumer_bpn: str = Field(
        alias="consumerBpn",
        pattern=_BPNL_PATTERN,
        description="BPNL of the consumer to push the certificate to.",
    )
    governance: Optional[List[Dict[str, Any]]] = Field(
        default=None,
        description="Governance policies for contract negotiation.",
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
        max_length=256,
        description="Reference ID of the certificate now available.",
    )
    certificate_type: str = Field(
        alias="certificateType",
        max_length=64,
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
    sender_bpn: str = Field(
        alias="senderBpn",
        pattern=_BPNL_PATTERN,
        description="BPNL of the provider sending this notification (own BPN).",
    )
    certificate_id: int = Field(
        alias="certificateId",
        gt=0,
        description="Internal ID of the certificate that is now available.",
    )
    consumer_bpn: str = Field(
        alias="consumerBpn",
        pattern=_BPNL_PATTERN,
        description="BPNL of the consumer to notify.",
    )
    governance: Optional[List[Dict[str, Any]]] = Field(
        default=None,
        description="Governance policies for contract negotiation.",
    )

    class Config:
        populate_by_name = True

class CcmPublishRequest(BaseModel):
    """Request body for publishing a certificate as an EDC asset."""
    certificate_id: int = Field(
        alias="certificateId",
        gt=0,
        description="Internal DB ID of the certificate to publish.",
    )

    class Config:
        populate_by_name = True


class CcmPublishResult(BaseModel):
    """Response body after successfully publishing a certificate."""
    document_id: str = Field(
        alias="documentId",
        description="The EDC asset ID, used as documentId in CX-0135 PULL flow.",
    )
    asset_id: str = Field(
        alias="assetId",
        description="EDC asset identifier (same as documentId).",
    )
    certificate_id: int = Field(
        alias="certificateId",
        description="Internal DB ID of the published certificate.",
    )

    class Config:
        populate_by_name = True


class CcmPublishedItem(BaseModel):
    """Entry in the list of published certificates."""
    certificate_id: int = Field(
        alias="certificateId",
        description="Internal DB ID of the certificate.",
    )
    asset_id: str = Field(
        alias="assetId",
        description="EDC asset ID under which the certificate is published.",
    )
    bpnl: str = Field(description="BPNL of the certificate holder.")
    certificate_type: str = Field(
        alias="certificateType",
        description="Certificate type (e.g. ISO9001).",
    )

    class Config:
        populate_by_name = True


class CcmPullRequest(BaseModel):
    """Request body for pulling a certificate from a provider's catalog."""
    provider_bpn: str = Field(
        alias="providerBpn",
        pattern=_BPNL_PATTERN,
        description="BPNL of the provider to pull from.",
    )
    document_id: str = Field(
        alias="documentId",
        max_length=256,
        description="The documentId (EDC asset ID) of the certificate to pull.",
    )
    governance: Optional[List[Dict[str, Any]]] = Field(
        default=None,
        description="Governance policies for contract negotiation. "
                    "Overrides the server-side provider.ccm.policy.usage config when provided.",
    )

    class Config:
        populate_by_name = True


class CcmPullResult(BaseModel):
    """Response body after successfully pulling a certificate."""
    certificate_data: dict = Field(
        alias="certificateData",
        description="The full BusinessPartnerCertificate payload.",
    )
    stored: bool = Field(
        default=False,
        description="Whether the certificate was stored in the local database.",
    )

    class Config:
        populate_by_name = True


# ---------------------------------------------------------------------------
# Typed notification body models (OpenAPI / Swagger documentation)
# ---------------------------------------------------------------------------

class CcmRequestNotification(BaseModel):
    """
    Typed request body for ``POST /companycertificate/request``.

    A consumer sends this notification to request a certificate from a provider.
    """
    header: NotificationHeader = Field(
        description="Standard Tractus-X notification header."
    )
    content: CcmRequestContent = Field(
        description="CCM request content: certifiedBpn + certificateType."
    )

    class Config:
        populate_by_name = True


class CcmStatusNotification(BaseModel):
    """
    Typed request body for ``POST /companycertificate/status``.

    A consumer sends this notification to report the processing result for a
    previously received certificate (RECEIVED, ACCEPTED, or REJECTED).
    """
    header: NotificationHeader = Field(
        description="Standard Tractus-X notification header."
    )
    content: CcmStatusContent = Field(
        description="CCM status content: documentId + certificateStatus."
    )

    class Config:
        populate_by_name = True


class CcmPushNotification(BaseModel):
    """
    Typed request body for ``POST /companycertificate/push``.

    A provider sends this notification to push the full certificate payload
    (including the Base64-encoded document) to a consumer.
    """
    header: NotificationHeader = Field(
        description="Standard Tractus-X notification header."
    )
    content: CcmPushContent = Field(
        description="Full BusinessPartnerCertificate push payload."
    )

    class Config:
        populate_by_name = True


class CcmAvailableNotification(BaseModel):
    """
    Typed request body for ``POST /companycertificate/available``.

    A provider sends this notification to inform a consumer that a certificate
    is now available for PULL retrieval via the EDC catalog.
    """
    header: NotificationHeader = Field(
        description="Standard Tractus-X notification header."
    )
    content: CcmAvailableContent = Field(
        description="CCM available content: documentId + certificateType."
    )

    class Config:
        populate_by_name = True


# ---------------------------------------------------------------------------
# View / list DTOs (consumer received, outbound requests, provider shares)
# ---------------------------------------------------------------------------

class ReceivedCertificateItem(BaseModel):
    """
    Summary item for a certificate received by this node.

    Returned by ``GET /consumer/received`` and ``GET /consumer/received/{id}``.
    The binary document is omitted in list responses; use the detail endpoint
    to retrieve it.
    """
    id: int = Field(description="Internal primary key of the ccm_received record.")
    document_id: str = Field(
        alias="documentId",
        description="Provider-assigned document reference ID.",
    )
    provider_bpn: str = Field(
        alias="providerBpn",
        description="BPNL of the provider that sent this certificate.",
    )
    certified_bpn: str = Field(
        alias="certifiedBpn",
        description="BPNL of the certified legal entity.",
    )
    certificate_type: str = Field(
        alias="certificateType",
        description="Certificate type identifier (e.g. ISO9001).",
    )
    trust_level: Optional[str] = Field(
        default=None,
        alias="trustLevel",
        description="Trust level assigned by the provider (none/low/high/trusted).",
    )
    valid_from: Optional[str] = Field(
        default=None,
        alias="validFrom",
        description="Start of the validity period (ISO 8601 date).",
    )
    valid_until: Optional[str] = Field(
        default=None,
        alias="validUntil",
        description="Expiry date (ISO 8601 date).",
    )
    local_status: str = Field(
        alias="localStatus",
        description="Consumer-local processing status: Pending / Accepted / Rejected.",
    )
    status_updated_at: Optional[str] = Field(
        default=None,
        alias="statusUpdatedAt",
        description="Timestamp of the most recent local_status change (ISO 8601).",
    )
    received_at: str = Field(
        alias="receivedAt",
        description="Timestamp when this certificate was received (ISO 8601).",
    )

    class Config:
        populate_by_name = True


class ReceivedCertificateDetail(ReceivedCertificateItem):
    """
    Full detail for a single received certificate.

    Extends ReceivedCertificateItem with metadata fields that are not
    included in list responses.
    """
    certificate_version: Optional[str] = Field(
        default=None,
        alias="certificateVersion",
        description="Version of the certificate standard.",
    )
    issuer_name: Optional[str] = Field(
        default=None,
        alias="issuerName",
        description="Name of the certification body.",
    )
    issuer_bpn: Optional[str] = Field(
        default=None,
        alias="issuerBpn",
        description="BPNL of the certification body.",
    )
    validator_name: Optional[str] = Field(
        default=None,
        alias="validatorName",
        description="Name of the third-party validator.",
    )
    registration_number: Optional[str] = Field(
        default=None,
        alias="registrationNumber",
        description="Official registration / serial number.",
    )
    area_of_application: Optional[str] = Field(
        default=None,
        alias="areaOfApplication",
        description="Scope the certificate applies to.",
    )
    uploader_bpn: Optional[str] = Field(
        default=None,
        alias="uploaderBpn",
        description="BPNL of the uploader.",
    )
    document_base64: Optional[str] = Field(
        default=None,
        alias="documentBase64",
        description="Base64-encoded PDF document content (only in detail response).",
    )

    class Config:
        populate_by_name = True


class OutboundRequestItem(BaseModel):
    """
    Summary item for a certificate request sent by this node.

    Returned by ``GET /consumer/requests`` and ``GET /consumer/requests/{id}``.
    """
    id: int = Field(description="Internal primary key of the ccm_outbound_request record.")
    sender_bpn: str = Field(
        alias="senderBpn",
        description="BPNL of this node (the consumer) that sent the request.",
    )
    provider_bpn: str = Field(
        alias="providerBpn",
        description="BPNL of the remote provider.",
    )
    certified_bpn: str = Field(
        alias="certifiedBpn",
        description="BPNL of the certified entity requested.",
    )
    certificate_type: str = Field(
        alias="certificateType",
        description="Certificate type identifier (e.g. ISO9001).",
    )
    location_bpns: Optional[List[str]] = Field(
        default=None,
        alias="locationBpns",
        description="BPNS/BPNA sites included in the original request.",
    )
    status: str = Field(
        description="Outbound request status: Pending / Found / NotFound / Failed.",
    )
    notification_id: Optional[str] = Field(
        default=None,
        alias="notificationId",
        description="UUID of the CX-0135 notification that was sent.",
    )
    document_id: Optional[str] = Field(
        default=None,
        alias="documentId",
        description="Provider document ID (populated when the provider responds).",
    )
    requested_at: str = Field(
        alias="requestedAt",
        description="Timestamp when the request was sent (ISO 8601).",
    )
    updated_at: str = Field(
        alias="updatedAt",
        description="Timestamp of the last status update (ISO 8601).",
    )

    class Config:
        populate_by_name = True


class ShareItem(BaseModel):
    """
    Summary item for a single certificate-sharing event.

    Returned by ``GET /provider/shares`` — a cross-certificate view of all
    share records across all locally stored certificates.
    """
    share_id: int = Field(
        alias="shareId",
        description="Internal primary key of the certificate_share record.",
    )
    certificate_id: int = Field(
        alias="certificateId",
        description="Internal ID of the shared certificate.",
    )
    certificate_type: str = Field(
        alias="certificateType",
        description="Certificate type identifier (e.g. ISO9001).",
    )
    provider_bpnl: str = Field(
        alias="providerBpnl",
        description="BPNL of the certificate-owning provider (this node).",
    )
    consumer_bpnl: str = Field(
        alias="consumerBpnl",
        description="BPNL of the consumer who received the certificate.",
    )
    status: str = Field(
        description="Share lifecycle status: Active / Pending / Revoked.",
    )
    rejection_reason: Optional[str] = Field(
        default=None,
        alias="rejectionReason",
        description=(
            "JSON-serialised rejection details from the consumer. "
            "Only present when status is Revoked."
        ),
    )
    last_shared_date: str = Field(
        alias="lastSharedDate",
        description="Timestamp of the most recent sharing event (ISO 8601).",
    )
    created_at: str = Field(
        alias="createdAt",
        description="Timestamp when this share record was created (ISO 8601).",
    )

    class Config:
        populate_by_name = True


class CcmInboundRequestItem(BaseModel):
    """
    Summary item for a single certificate request received by the provider.

    Returned by ``GET /provider/inbound-requests`` — a full list of all
    inbound requests, including those where no matching certificate existed
    at the time of the request (status = ``NotFound``).
    """
    request_id: int = Field(
        alias="requestId",
        description="Internal primary key of the ccm_inbound_request record.",
    )
    consumer_bpn: str = Field(
        alias="consumerBpn",
        description="BPNL of the consumer who sent the request.",
    )
    certified_bpn: str = Field(
        alias="certifiedBpn",
        description="BPNL of the legal entity whose certificate was requested.",
    )
    certificate_type: str = Field(
        alias="certificateType",
        description="Certificate type identifier (e.g. ISO9001).",
    )
    location_bpns: Optional[str] = Field(
        default=None,
        alias="locationBpns",
        description="JSON-serialised list of BPNS/BPNA scope (if provided).",
    )
    certificate_id: Optional[int] = Field(
        default=None,
        alias="certificateId",
        description="FK to the matched certificate (NULL when NotFound).",
    )
    status: str = Field(
        description="Inbound request status: NotFound / Registered / Available / Pushed.",
    )
    consumer_status: Optional[str] = Field(
        default=None,
        alias="consumerStatus",
        description=(
            "Consumer's acceptance feedback: RECEIVED / ACCEPTED / REJECTED. "
            "NULL until the consumer sends a status notification."
        ),
    )
    notification_id: Optional[str] = Field(
        default=None,
        alias="notificationId",
        description="CX-0135 notification message_id for correlation.",
    )
    received_at: str = Field(
        alias="receivedAt",
        description="Timestamp when the request was received (ISO 8601).",
    )
    updated_at: str = Field(
        alias="updatedAt",
        description="Timestamp of the last status update (ISO 8601).",
    )

    class Config:
        populate_by_name = True
