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
    - CcmReceived: Certificates received by this node as a consumer via PUSH or PULL.
    - CcmOutboundRequest: Certificate requests sent by this node to remote providers.

These models are designed to interact with a PostgreSQL database using
SQLAlchemy and SQLModel.
"""

from datetime import date, datetime, timezone
from enum import Enum
from typing import List, Optional

from sqlalchemy import Column, Enum as SAEnum, Index, LargeBinary, UniqueConstraint
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


class ReceivedCertificateStatus(str, Enum):
    """
    Consumer-local lifecycle status for a certificate that was received.

    Tracks how this node has processed the certificate after reception.

    - Pending:  Received but not yet evaluated.
    - Accepted: Consumer validated and accepted the certificate.
    - Rejected: Consumer validated and rejected the certificate.
    """
    Pending  = "Pending"
    Accepted = "Accepted"
    Rejected = "Rejected"


class OutboundRequestStatus(str, Enum):
    """
    Status of a certificate request that this node sent to a remote provider.

    - Pending:   Request sent; waiting for the provider to respond.
    - Found:     Provider confirmed the certificate exists (returned 200 COMPLETED
                 or shared it via PUSH/PULL).
    - NotFound:  Provider responded that no matching certificate exists (404).
    - Failed:    Notification delivery failed (EDC/network error).
    """
    Pending  = "Pending"
    Found    = "Found"
    NotFound = "NotFound"
    Failed   = "Failed"


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
    edc_asset_id: Optional[str] = Field(
        default=None,
        index=True,
        description="EDC asset ID when the certificate is published as an individual "
    )

    # --- Relationships ---
    sites: List["CcmSite"] = Relationship(back_populates="ccm")
    shares: List["CertificateShare"] = Relationship(back_populates="certificate")

    __tablename__ = "ccm"
    __table_args__ = (
        Index("ix_ccm_bpnl_certificate_type", "bpnl", "certificate_type"),
    )


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
    __table_args__ = (
        Index(
            "ix_cert_share_certificate_id_consumer_bpnl",
            "certificate_id",
            "consumer_bpnl",
        ),
    )


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
    validator_name: Optional[str] = Field(
        default=None,
        description="Name of the third-party validator that verified this certificate.",
    )
    valid_from: Optional[date] = Field(
        default=None,
        description="Start of the validity period.",
    )
    valid_until: Optional[date] = Field(
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

    # --- Consumer-local processing status ---
    # Tracks whether this node has accepted or rejected the received certificate.
    # Updated when POST /consumer/status is called by the consumer operator.
    local_status: ReceivedCertificateStatus = Field(
        default=ReceivedCertificateStatus.Pending,
        sa_column=Column(
            SAEnum(
                ReceivedCertificateStatus,
                values_callable=lambda x: [e.value for e in x],
                name="received_certificate_status",
                create_type=False,
            ),
            index=True,
            nullable=False,
        ),
        description=(
            "Consumer-local processing status: Pending / Accepted / Rejected. "
            "Updated when this node calls POST /consumer/status."
        ),
    )
    status_updated_at: Optional[datetime] = Field(
        default=None,
        description="Timestamp of the most recent local_status change.",
    )

    # --- Audit ---
    received_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Timestamp when the certificate was received.",
    )

    __tablename__ = "ccm_received"
    __table_args__ = (
        UniqueConstraint(
            "document_id", "provider_bpn",
            name="uq_ccm_received_doc_provider",
        ),
    )


# ---------------------------------------------------------------------------
# Outbound certificate requests (consumer-side tracking)
# ---------------------------------------------------------------------------

class CcmOutboundRequest(SQLModel, table=True):
    """
    Tracks certificate requests sent by this node to remote providers.

    Each row represents one POST /consumer/request call.  Storing these
    records allows operators to query the status of outstanding requests
    without relying solely on inbound PUSH or PULL responses.
    """

    id: Optional[int] = Field(default=None, primary_key=True)

    # --- Who sent to whom ---
    sender_bpn: str = Field(
        index=True,
        description="BPNL of this node (the consumer) that issued the request.",
    )
    provider_bpn: str = Field(
        index=True,
        description="BPNL of the remote provider the request was sent to.",
    )
    certified_bpn: str = Field(
        index=True,
        description="BPNL of the legal entity whose certificate was requested.",
    )
    certificate_type: str = Field(
        index=True,
        description="Certificate type identifier (e.g. ISO9001).",
    )
    location_bpns: Optional[str] = Field(
        default=None,
        description="JSON-serialised list of BPNS/BPNA to narrow scope.",
    )
    governance: Optional[str] = Field(
        default=None,
        description="JSON-serialised governance policies used in contract negotiation.",
    )

    # --- Tracking ---
    status: OutboundRequestStatus = Field(
        default=OutboundRequestStatus.Pending,
        sa_column=Column(
            SAEnum(
                OutboundRequestStatus,
                values_callable=lambda x: [e.value for e in x],
                name="outbound_request_status",
                create_type=False,
            ),
            index=True,
            nullable=False,
        ),
        description="Delivery/response status of this outbound request.",
    )
    # notification_id stored for correlation when the provider sends a PUSH back.
    notification_id: Optional[str] = Field(
        default=None,
        index=True,
        description="UUID of the CX-0135 notification sent (from header.message_id).",
    )
    document_id: Optional[str] = Field(
        default=None,
        index=True,
        description="Provider document ID — populated if the provider sends a PUSH back "
                    "and we can correlate it with this request.",
    )

    # --- Audit ---
    requested_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Timestamp when the request was sent.",
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Timestamp of the last status update.",
    )

    __tablename__ = "ccm_outbound_request"
    __table_args__ = (
        Index(
            "ix_ccm_outbound_request_provider_certified",
            "provider_bpn", "certified_bpn", "certificate_type",
        ),
    )
