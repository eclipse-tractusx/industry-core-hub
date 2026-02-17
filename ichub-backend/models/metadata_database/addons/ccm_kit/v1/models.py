#################################################################################
# Eclipse Tractus-X - Industry Core Hub Backend
# 
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
These models are designed to interact with a PostgreSQL database using
SQLAlchemy and SQLModel.
"""

from typing import Optional
from sqlmodel import SQLModel, Field
from sqlalchemy import Column, LargeBinary


class Ccm(SQLModel, table=True):
    """
    Database model for Company Certificate Management (CCM).
    Stores business partner certificates with binary document content.
    """
    id: Optional[int] = Field(default=None, primary_key=True)
    certificate_type: str = Field(index=True, description="Type of certificate (e.g., ISO 9001, IATF 16949)")
    certificate_name: str = Field(index=True, description="Name of the certificate")
    issuer_or_certification: str = Field(index=True, description="Certification body or authority")
    valid_from: str = Field(index=True, description="Start date of certificate validity")
    valid_to: str = Field(index=True, description="End date of certificate validity")
    bpn: str = Field(index=True, description="Business Partner Number (BPN-L) of the holder")
    description: str = Field(description="Optional description of the certificate")
    doc: bytes = Field(sa_column=Column(LargeBinary), description="Binary PDF document content (BYTEA in PostgreSQL)")

    __tablename__ = "ccm"
