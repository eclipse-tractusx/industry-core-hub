#################################################################################
# Eclipse Tractus-X - Industry Core Hub Backend
# 
# Copyright (c) 2026 LKS Next
# Copyright (c) 2026 IDEKO
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
This module defines the database models for the Company Certificate Management (CCM)
addon, representing certificate entities within the Catena-X ecosystem.

Models:
    - Ccm: Core certificate entity (SAMM BusinessPartnerCertificate v3.1.0).
    - CcmSite: Associated BPNS/BPNA sites for a certificate (normalised join table).
    - CertificateShare: Sharing-history record tracking which consumers received a certificate.

These models are designed to interact with a PostgreSQL database using
SQLAlchemy and SQLModel.
"""

from datetime import date, datetime, timezone
from enum import Enum
from typing import List, Optional

from sqlalchemy import Column, Enum as SAEnum, LargeBinary
from sqlmodel import Field, Relationship, SQLModel


# ---------------------------------------------------------------------------
# Enumerations
# ---------------------------------------------------------------------------

class TrustLevel(str, Enum):
    """
    Trust level of the certificate as defined in SAMM CX-0135.

    Values follow the BusinessPartnerCertificate v3.1.0 trustLevel characteristic.
    """
    none    = "none"
    low     = "low"
    high    = "high"
    trusted = "trusted"


class ShareStatus(str, Enum):
    """
    Lifecycle status of a certificate-sharing record.

    - Active:  The certificate has been successfully shared and is currently accessible.
    - Pending: The sharing workflow has been triggered but not yet confirmed by the EDC.
    - Revoked: Access to the certificate was revoked for the consumer.
    """
    Active  = "Active"
    Pending = "Pending"
    Revoked = "Revoked"


# ---------------------------------------------------------------------------
# Core certificate entity
# ---------------------------------------------------------------------------

class Ccm(SQLModel, table=True):
    """
    Database model for Company Certificate Management (CCM).

    Maps to the SAMM BusinessPartnerCertificate v3.1.0 aspect model defined
    in CX-0135.  The PDF document is stored as raw bytes (BYTEA in PostgreSQL);
    Base64 encoding is applied only at the API serialisation layer.

    Mandatory SAMM fields: businessPartnerNumber (bpnl), type (certificate_type),
    issuer, validFrom, trustLevel.
    Optional SAMM fields: registrationNumber, areaOfApplication, validUntil,
    validator, uploader.
    """

    id: Optional[int] = Field(default=None, primary_key=True)

    # --- SAMM mandatory fields ---
    bpnl: str = Field(
        index=True,
        description="Business Partner Number Legal (BPNL) of the certificate holder."
    )
    certificate_type: str = Field(
        index=True,
        description="Type of certificate as per CX-0135 CertificateType characteristic "
                    "(e.g. ISO9001, IATF16949)."
    )
    issuer: str = Field(
        index=True,
        description="Certification body or authority that issued the certificate."
    )
    valid_from: date = Field(
        index=True,
        description="Start date of the certificate's validity period (ISO 8601 date)."
    )
    trust_level: TrustLevel = Field(
        default=TrustLevel.none,
        sa_column=Column(
            SAEnum(
                TrustLevel,
                values_callable=lambda x: [e.value for e in x],
                name="trust_level",
                create_type=False,
            ),
            index=True,
            nullable=False,
        ),
        description="Trust level assigned to this certificate (none/low/high/trusted)."
    )

    # --- SAMM optional fields ---
    certificate_name: Optional[str] = Field(
        default=None,
        index=True,
        description="Human-readable display name for the certificate."
    )
    registration_number: Optional[str] = Field(
        default=None,
        index=True,
        description="Official registration or serial number of the certificate."
    )
    area_of_application: Optional[str] = Field(
        default=None,
        description="Textual description of the area / scope this certificate applies to."
    )
    valid_until: Optional[date] = Field(
        default=None,
        index=True,
        description="Expiry date of the certificate's validity period (ISO 8601 date)."
    )
    validator: Optional[str] = Field(
        default=None,
        description="BPN or URL of the third-party validator that verified this certificate."
    )
    uploader_bpnl: Optional[str] = Field(
        default=None,
        index=True,
        description="BPNL of the Catena-X participant who uploaded this certificate."
    )
    description: Optional[str] = Field(
        default=None,
        description="Free-text description or additional notes about the certificate."
    )

    # --- Document storage ---
    # The raw PDF bytes are stored here.  Base64 conversion happens at the
    # service/controller layer when building JSON responses.
    doc: Optional[bytes] = Field(
        default=None,
        sa_column=Column(LargeBinary),
        description="Binary PDF document content (BYTEA in PostgreSQL)."
    )

    # --- Internal audit timestamps ---
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Timestamp when the certificate record was created."
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Timestamp when the certificate record was last updated."
    )

    # --- Relationships ---
    sites: List["CcmSite"] = Relationship(back_populates="ccm")
    shares: List["CertificateShare"] = Relationship(back_populates="certificate")

    __tablename__ = "ccm"


# ---------------------------------------------------------------------------
# BPNS/BPNA site association (normalised join table)
# ---------------------------------------------------------------------------

class CcmSite(SQLModel, table=True):
    """
    Stores the BPNS or BPNA identifiers associated with a certificate.

    A single certificate can cover multiple production/address sites, so this
    entity holds a one-to-many relationship with Ccm.  Each row represents one
    ``siteBpn`` entry from the SAMM ``sites`` characteristic.
    """

    id: Optional[int] = Field(default=None, primary_key=True)
    ccm_id: int = Field(
        index=True,
        foreign_key="ccm.id",
        description="Foreign key to the parent certificate (ccm.id)."
    )
    site_bpn: str = Field(
        index=True,
        description="Business Partner Number Site (BPNS) or Address (BPNA) "
                    "covered by the certificate."
    )

    # --- Relationship ---
    ccm: Optional[Ccm] = Relationship(back_populates="sites")

    __tablename__ = "ccm_site"


# ---------------------------------------------------------------------------
# Certificate sharing history
# ---------------------------------------------------------------------------

class CertificateShare(SQLModel, table=True):
    """
    Tracks the sharing history of a certificate with external consumers.

    Each row represents one sharing event: a specific certificate was shared
    with a specific consumer (identified by BPNL) via the EDC.  The status
    column reflects the current state of the sharing workflow.
    """

    id: Optional[int] = Field(default=None, primary_key=True)
    certificate_id: int = Field(
        index=True,
        foreign_key="ccm.id",
        description="Foreign key to the shared certificate (ccm.id)."
    )
    consumer_bpnl: str = Field(
        index=True,
        description="BPNL of the Catena-X participant who received the certificate."
    )
    last_shared_date: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Timestamp of the most recent sharing event for this consumer."
    )
    status: ShareStatus = Field(
        default=ShareStatus.Pending,
        sa_column=Column(
            SAEnum(
                ShareStatus,
                values_callable=lambda x: [e.value for e in x],
                name="share_status",
                create_type=False,
            ),
            index=True,
            nullable=False,
        ),
        description="Current status of this sharing record (Active/Pending/Revoked)."
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Timestamp when this sharing record was created."
    )

    # --- Relationship ---
    certificate: Optional[Ccm] = Relationship(back_populates="shares")

    __tablename__ = "certificate_share"


# ---------------------------------------------------------------------------
# Received certificates (consumer-side persistence)
# ---------------------------------------------------------------------------

class CcmReceived(SQLModel, table=True):
    """
    Stores certificates received by this node as a consumer via PUSH
    notifications (CX-0135).

    Each row represents a single certificate pushed by a remote provider.
    The binary document (PDF) is stored as-is in the ``doc`` column; the
    service layer handles Base64 encoding/decoding.
    """

    id: Optional[int] = Field(default=None, primary_key=True)

    # --- Identity ---
    document_id: str = Field(
        index=True,
        unique=True,
        description="Provider-assigned document reference ID.",
    )
    provider_bpn: str = Field(
        index=True,
        description="BPNL of the provider that pushed this certificate.",
    )
    certified_bpn: str = Field(
        index=True,
        description="BPNL of the legal entity the certificate belongs to.",
    )
    certificate_type: str = Field(
        index=True,
        description="Certificate type identifier (e.g. ISO9001).",
    )

    # --- Certificate metadata ---
    certificate_version: Optional[str] = Field(
        default=None,
        description="Version of the certificate standard (e.g. 2015).",
    )
    issuer_name: Optional[str] = Field(
        default=None,
        description="Name of the certification body.",
    )
    issuer_bpn: Optional[str] = Field(
        default=None,
        description="BPNL of the certification body.",
    )
    valid_from: Optional[str] = Field(
        default=None,
        description="Start of the validity period.",
    )
    valid_until: Optional[str] = Field(
        default=None,
        description="End of the validity period.",
    )
    trust_level: Optional[str] = Field(
        default=None,
        description="Trust level (none/low/high/trusted).",
    )
    registration_number: Optional[str] = Field(
        default=None,
        description="Official registration/serial number.",
    )
    area_of_application: Optional[str] = Field(
        default=None,
        description="Scope the certificate applies to.",
    )
    uploader_bpn: Optional[str] = Field(
        default=None,
        description="BPNL of the uploader.",
    )

    # --- Document binary ---
    doc: Optional[bytes] = Field(
        default=None,
        sa_column=Column(LargeBinary),
        description="Binary PDF content (BYTEA in PostgreSQL).",
    )

    # --- Audit ---
    received_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Timestamp when the certificate was received.",
    )

    __tablename__ = "ccm_received"
