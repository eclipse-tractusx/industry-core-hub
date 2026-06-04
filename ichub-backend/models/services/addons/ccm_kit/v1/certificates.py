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

from datetime import date, datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field, model_validator

from tools.constants import BPNL_PATTERN as _BPNL_PATTERN


# ---------------------------------------------------------------------------
# Enumerations
# ---------------------------------------------------------------------------

class CertificateType(str, Enum):
    """
    Known certificate types as per CX-0135 CertificateType characteristic.

    Note: This enum is **not enforced** on model fields — ``certificate_type``
    is a free ``str`` everywhere because CX-0135 states the list is not
    exhaustive.  The enum is kept for reference and documentation only.
    """
    ISO9001   = "ISO9001"
    ISO14001  = "ISO14001"
    ISO45001  = "ISO45001"
    IATF16949 = "IATF16949"
    ISO27001  = "ISO27001"
    ISO50001  = "ISO50001"
    ISO22301  = "ISO22301"
    ISO20000  = "ISO20000"
    VDA6_4    = "VDA6.4"
    OTHER     = "OTHER"


class TrustLevelEnum(str, Enum):
    """
    Trust level values as per the SAMM TrustLevel characteristic in CX-0135.
    """
    none    = "none"
    low     = "low"
    high    = "high"
    trusted = "trusted"


class ShareStatusEnum(str, Enum):
    """
    Lifecycle status of a certificate-sharing record.
    Matches the ShareStatus enum on the database layer.
    """
    Active  = "Active"
    Pending = "Pending"
    Revoked = "Revoked"


# ---------------------------------------------------------------------------
# Sub-models
# ---------------------------------------------------------------------------

class SiteRead(BaseModel):
    """
    Represents a single BPNS or BPNA entry in the ``sites`` list of a certificate.
    Corresponds to the SAMM ``siteBpn`` property.
    """
    site_bpn: str = Field(
        alias="siteBpn",
        max_length=20,
        description="Business Partner Number Site (BPNS) or Address (BPNA)."
    )

    class Config:
        populate_by_name = True


class CertificateDocument(BaseModel):
    """
    Document attachment for a certificate (BASE64-encoded content).

    The ``documentContent`` field carries the Base64 string that is only
    populated when the detail of a single certificate is requested;
    it is omitted from list endpoints to keep payloads small.
    """
    document_title: str = Field(
        alias="documentTitle",
        max_length=256,
        description="File name or title of the certificate PDF."
    )
    document_type: str = Field(
        alias="documentType",
        max_length=128,
        description="MIME type of the document (e.g. 'application/pdf')."
    )
    document_content: str = Field(
        alias="documentContent",
        description="BASE64-encoded content of the certificate PDF."
    )

    class Config:
        populate_by_name = True


# ---------------------------------------------------------------------------
# Core certificate read models
# ---------------------------------------------------------------------------

class CertificateListItem(BaseModel):
    """
    Lightweight certificate representation used in list endpoints.

    Does NOT include the PDF document to keep responses lean.
    """
    certificate_id: str = Field(alias="certificateId", max_length=64)
    bpnl: str = Field(
        pattern=_BPNL_PATTERN,
        max_length=20,
        description="BPNL of the certificate holder."
    )
    certificate_type: str = Field(alias="certificateType", max_length=64)
    certificate_name: Optional[str] = Field(default=None, alias="certificateName", max_length=256)
    issuer: str = Field(max_length=256)
    valid_from: date = Field(alias="validFrom")
    valid_until: Optional[date] = Field(default=None, alias="validUntil")
    trust_level: TrustLevelEnum = Field(default=TrustLevelEnum.none, alias="trustLevel")
    registration_number: Optional[str] = Field(default=None, alias="registrationNumber", max_length=256)
    area_of_application: Optional[str] = Field(default=None, alias="areaOfApplication", max_length=512)
    validator: Optional[str] = Field(default=None, max_length=256)
    uploader_bpnl: Optional[str] = Field(default=None, alias="uploaderBpnl", max_length=20)
    description: Optional[str] = Field(default=None, max_length=1024)
    sites: List[SiteRead] = Field(default_factory=list)
    created_at: Optional[datetime] = Field(default=None, alias="createdAt")
    updated_at: Optional[datetime] = Field(default=None, alias="updatedAt")

    class Config:
        populate_by_name = True


class BusinessPartnerCertificate(CertificateListItem):
    """
    Full certificate detail model following CX-0135 v3.1.0.

    Extends CertificateListItem with the embedded document (Base64).
    """
    document: Optional[CertificateDocument] = Field(
        default=None,
        description="The certificate document with BASE64-encoded content."
    )

    class Config:
        populate_by_name = True


# ---------------------------------------------------------------------------
# Sharing-history models
# ---------------------------------------------------------------------------

class CertificateShareCreate(BaseModel):
    """Request model to record a new certificate-sharing event."""
    consumer_bpnl: str = Field(
        alias="consumerBpnl",
        description="BPNL of the Catena-X participant receiving the certificate."
    )
    status: ShareStatusEnum = Field(
        default=ShareStatusEnum.Pending,
        description="Initial status of the sharing record."
    )

    class Config:
        populate_by_name = True


class CertificateShareRead(BaseModel):
    """Read model for a single sharing-history entry."""
    id: int
    certificate_id: int = Field(alias="certificateId")
    consumer_bpnl: str = Field(alias="consumerBpnl")
    last_shared_date: datetime = Field(alias="lastSharedDate")
    status: ShareStatusEnum
    created_at: datetime = Field(alias="createdAt")

    class Config:
        populate_by_name = True


class CertificateDetail(BusinessPartnerCertificate):
    """
    Full certificate detail response, including the complete sharing history.
    Used by the GET /{id} endpoint.
    """
    sharing_history: List[CertificateShareRead] = Field(
        default_factory=list,
        alias="sharingHistory",
        description="All sharing events recorded for this certificate."
    )

    class Config:
        populate_by_name = True


# ---------------------------------------------------------------------------
# Request / Response models for upload and update
# ---------------------------------------------------------------------------

class UploadCertificateRequest(BaseModel):
    """
    Metadata received from the multipart form when uploading a certificate.
    Maps to BusinessPartnerCertificate v3.1.0 field set.
    """
    bpnl: str = Field(
        pattern=_BPNL_PATTERN,
        max_length=20,
        description="BPNL of the certificate holder."
    )
    certificate_type: str = Field(
        alias="certificateType",
        max_length=64,
        description="Certificate type identifier (e.g. ISO9001, IATF16949)."
    )
    issuer: str = Field(
        max_length=256,
        description="Certification body or authority that issued the certificate."
    )
    valid_from: date = Field(
        alias="validFrom",
        description="Start date of validity (ISO 8601: YYYY-MM-DD)."
    )
    trust_level: TrustLevelEnum = Field(
        default=TrustLevelEnum.none,
        alias="trustLevel",
        description="Trust level (none/low/high/trusted)."
    )
    certificate_name: Optional[str] = Field(
        default=None,
        alias="certificateName",
        max_length=256,
        description="Human-readable display name for the certificate."
    )
    registration_number: Optional[str] = Field(
        default=None,
        alias="registrationNumber",
        max_length=256,
        description="Official registration or serial number."
    )
    area_of_application: Optional[str] = Field(
        default=None,
        alias="areaOfApplication",
        max_length=512,
        description="Textual scope of the certificate."
    )
    valid_until: Optional[date] = Field(
        default=None,
        alias="validUntil",
        description="Expiry date of the certificate (ISO 8601: YYYY-MM-DD)."
    )
    validator: Optional[str] = Field(
        default=None,
        max_length=256,
        description="BPN or URL of the third-party validator."
    )
    description: Optional[str] = Field(
        default=None,
        max_length=1024,
        description="Free-text notes about the certificate."
    )
    # Comma-separated list of BPNS/BPNA values supplied via form data.
    # Example: "BPNS000000000001,BPNA000000000002"
    sites: Optional[str] = Field(
        default=None,
        description="Comma-separated BPNS/BPNA values associated with this certificate."
    )

    @model_validator(mode="after")
    def _validate_date_range(self) -> "UploadCertificateRequest":
        """Ensure valid_from is not later than valid_until when both are set."""
        if self.valid_until is not None and self.valid_from > self.valid_until:
            raise ValueError(
                "validFrom must not be later than validUntil."
            )
        return self

    class Config:
        populate_by_name = True


class CertificateUpdate(BaseModel):
    """
    Partial update request for an existing certificate (PUT /{id}).

    All fields are optional; only non-None values are written to the database.
    The PDF document and BPNL are intentionally excluded — those cannot be
    changed after initial upload.
    """
    certificate_type: Optional[str] = Field(default=None, alias="certificateType", max_length=64)
    certificate_name: Optional[str] = Field(default=None, alias="certificateName", max_length=256)
    issuer: Optional[str] = Field(default=None, max_length=256)
    valid_from: Optional[date] = Field(default=None, alias="validFrom")
    valid_until: Optional[date] = Field(default=None, alias="validUntil")
    trust_level: Optional[TrustLevelEnum] = Field(default=None, alias="trustLevel")
    registration_number: Optional[str] = Field(default=None, alias="registrationNumber", max_length=256)
    area_of_application: Optional[str] = Field(default=None, alias="areaOfApplication", max_length=512)
    validator: Optional[str] = Field(default=None, max_length=256)
    description: Optional[str] = Field(default=None, max_length=1024)
    # Comma-separated BPNS/BPNA; if provided, replaces the existing site list.
    sites: Optional[str] = Field(default=None)

    class Config:
        populate_by_name = True


class UploadCertificateResponse(BaseModel):
    """
    Response returned after successfully uploading a new certificate.
    """
    certificate_id: str = Field(
        alias="certificateId",
        description="Auto-generated unique identifier for the uploaded certificate."
    )
    message: str = Field(description="Human-readable status message.")
    certificate: BusinessPartnerCertificate = Field(
        description="The complete certificate object with BASE64-encoded document."
    )

    class Config:
        populate_by_name = True
