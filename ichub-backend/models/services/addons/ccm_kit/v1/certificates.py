#################################################################################
# Eclipse Tractus-X - Industry Core Hub Backend
#
# Copyright (c) 2025 Contributors to the Eclipse Foundation
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

from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field


class CertificateDocument(BaseModel):
    """
    Document model for certificate attachments as per CX-0135.
    Contains the BASE64-encoded document and metadata.
    """
    document_title: str = Field(
        alias="documentTitle",
        description="Title of the certificate document"
    )
    document_type: str = Field(
        alias="documentType",
        description="Type of document (e.g., 'application/pdf')"
    )
    document_content: str = Field(
        alias="documentContent",
        description="BASE64-encoded content of the certificate PDF"
    )

    class Config:
        populate_by_name = True


class BusinessPartnerCertificate(BaseModel):
    """
    Business Partner Certificate model following CX-0135 v3.1.0.
    
    This model represents a certificate issued to a business partner
    in the Catena-X network, such as ISO certifications, quality standards, etc.
    """
    certificate_id: str = Field(
        alias="certificateId",
        description="Unique identifier for the certificate"
    )
    certificate_type: str = Field(
        alias="certificateType",
        description="Type of certificate (e.g., ISO 9001, IATF 16949, ISO 14001)"
    )
    certificate_name: str = Field(
        alias="certificateName",
        description="Name of the certificate"
    )
    issuer: str = Field(
        description="Certification body or authority that issued the certificate"
    )
    valid_from: str = Field(
        alias="validFrom",
        description="Start date of certificate validity (ISO 8601 format)"
    )
    valid_until: str = Field(
        alias="validUntil",
        description="End date of certificate validity (ISO 8601 format)"
    )
    bpnl: str = Field(
        description="Business Partner Number Legal Entity (BPN-L) of the certificate holder"
    )
    description: Optional[str] = Field(
        default=None,
        description="Optional description or additional information about the certificate"
    )
    document: CertificateDocument = Field(
        description="The certificate document with BASE64-encoded content"
    )
    created_at: Optional[str] = Field(
        alias="createdAt",
        default=None,
        description="Timestamp when the certificate was uploaded"
    )
    updated_at: Optional[str] = Field(
        alias="updatedAt",
        default=None,
        description="Timestamp when the certificate was last updated"
    )

    class Config:
        populate_by_name = True


class UploadCertificateRequest(BaseModel):
    """
    Request model for uploading a certificate.
    Used to receive metadata from multipart form data.
    """
    certificate_type: str = Field(
        alias="certificateType",
        description="Type of certificate (e.g., ISO 9001, IATF 16949, ISO 14001)"
    )
    certificate_name: str = Field(
        alias="certificateName",
        description="Name of the certificate"
    )
    issuer: str = Field(
        description="Certification body or authority that issued the certificate"
    )
    valid_from: str = Field(
        alias="validFrom",
        description="Start date of certificate validity (ISO 8601 format: YYYY-MM-DD)"
    )
    valid_until: str = Field(
        alias="validUntil",
        description="End date of certificate validity (ISO 8601 format: YYYY-MM-DD)"
    )
    bpnl: str = Field(
        description="Business Partner Number Legal Entity (BPN-L) of the certificate holder"
    )
    description: Optional[str] = Field(
        default=None,
        description="Optional description or additional information about the certificate"
    )

    class Config:
        populate_by_name = True


class UploadCertificateResponse(BaseModel):
    """
    Response model after uploading a certificate.
    """
    certificate_id: str = Field(
        alias="certificateId",
        description="Unique identifier for the uploaded certificate"
    )
    message: str = Field(
        description="Status message"
    )
    certificate: BusinessPartnerCertificate = Field(
        description="The complete certificate object with embedded document"
    )

    class Config:
        populate_by_name = True
