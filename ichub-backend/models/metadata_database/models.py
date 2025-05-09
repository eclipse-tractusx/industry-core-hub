#################################################################################
# Eclipse Tractus-X - Industry Core Hub Backend
#
# Copyright (c) 2025 DRÄXLMAIER Group
# (represented by Lisa Dräxlmaier GmbH)
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

from typing import Any, Dict, List, Optional
from uuid import UUID, uuid4
from datetime import datetime
from sqlmodel import Field, SQLModel, Relationship
from sqlalchemy import Column, JSON, UniqueConstraint

class LegalEntity(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    bpnl: str = Field(index=True, unique=True, description="The BPNL of the legal entity.")

    # Relationships
    catalog_parts: List["CatalogPart"] = Relationship(back_populates="legal_entity")
    enablement_service_stacks: List["EnablementServiceStack"] = Relationship(back_populates="legal_entity")

    __tablename__ = "legal_entity"


class BusinessPartner(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True, unique=True, description="The name of the business partner.")
    bpnl: str = Field(index=True, unique=True, description="The BPNL of the business partner.")

    # Relationships
    partner_catalog_parts: List["PartnerCatalogPart"] = Relationship(back_populates="business_partner")
    data_exchange_agreements: List["DataExchangeAgreement"] = Relationship(back_populates="business_partner")

    __tablename__ = "business_partner"


class Twin(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    global_id: UUID = Field(default_factory=uuid4, unique=True, description="The global ID (aka. Catena-X ID) of the twin.")
    aas_id: UUID = Field(default_factory=uuid4, unique=True, description="The AAS ID of the twin.")
    created_date: datetime = Field(default_factory=datetime.utcnow, description="The creation date of the twin.")
    modified_date: datetime = Field(default_factory=datetime.utcnow, description="The last modification date of the twin.")
    asset_class: Optional[str] = Field(default=None, description="The asset class of the twin.")
    additional_context: Optional[str] = Field(default=None, description="Additional context for the twin.")

    # Relationships
    catalog_part: Optional["CatalogPart"] = Relationship(back_populates="twin")
    serialized_part: Optional["SerializedPart"] = Relationship(back_populates="twin")
    jis_part: Optional["JISPart"] = Relationship(back_populates="twin")
    twin_aspects: List["TwinAspect"] = Relationship(back_populates="twin")
    twin_exchanges: List["TwinExchange"] = Relationship(back_populates="twin")
    twin_registrations: List["TwinRegistration"] = Relationship(back_populates="twin")

    __tablename__ = "twin"

    def has_registration(self, enablement_service_stack_id: int) -> bool:
        """Check if the twin has a registration with the given enablement service stack ID."""
        for registration in self.twin_registrations:
            if registration.enablement_service_stack_id == enablement_service_stack_id:
                return registration.dtr_registered
        return False


class CatalogPart(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    manufacturer_part_id: str = Field(index=True, unique=True, description="The manufacturer part ID.")
    legal_entity_id: int = Field(foreign_key="legal_entity.id", description="The ID of the associated legal entity.")
    twin_id: Optional[int] = Field(foreign_key="twin.id", description="The ID of the associated twin.", unique=True)
    category: Optional[str] = Field(default=None, description="The category of the catalog part.")
    bpns: Optional[str] = Field(default=None, description="The optional site information (BPNS) of the catalog part.")

    # Relationships
    legal_entity: LegalEntity = Relationship(back_populates="catalog_parts")
    twin: Optional[Twin] = Relationship(back_populates="catalog_part")
    partner_catalog_parts: List["PartnerCatalogPart"] = Relationship(back_populates="catalog_part")
    batches: List["Batch"] = Relationship(back_populates="catalog_part")

    __tablename__ = "catalog_part"

    def find_partner_catalog_part_by_business_partner_name(self, business_partner_name: str) -> Optional["PartnerCatalogPart"]:
        """Find the partner catalog part for a given business partner."""
        for partner_catalog_part in self.partner_catalog_parts:
            if partner_catalog_part.business_partner.name == business_partner_name:
                return partner_catalog_part
        return None

    def find_partner_catalog_part_by_bpnl(self, bpnl: str) -> Optional["PartnerCatalogPart"]:
        """Find the partner catalog part for a given business partner."""
        for partner_catalog_part in self.partner_catalog_parts:
            if partner_catalog_part.business_partner.bpnl == bpnl:
                return partner_catalog_part
        return None

    def find_partner_catalog_part_by_customer_part_id(self, customer_part_id: str) -> Optional["PartnerCatalogPart"]:
        """Find the partner catalog part for a given business partner."""
        for partner_catalog_part in self.partner_catalog_parts:
            if partner_catalog_part.customer_part_id == customer_part_id:
                return partner_catalog_part
        return None


class PartnerCatalogPart(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    business_partner_id: int = Field(foreign_key="business_partner.id", description="The ID of the associated business partner.")
    catalog_part_id: int = Field(foreign_key="catalog_part.id", description="The ID of the associated catalog part.")
    customer_part_id: str = Field(default="", description="The customer part ID.")

    # Relationships
    business_partner: BusinessPartner = Relationship(back_populates="partner_catalog_parts")
    catalog_part: CatalogPart = Relationship(back_populates="partner_catalog_parts")
    serialized_parts: List["SerializedPart"] = Relationship(back_populates="partner_catalog_part")
    jis_parts: List["JISPart"] = Relationship(back_populates="partner_catalog_part")

    # Composite Unique Constraint
    __table_args__ = (
        UniqueConstraint("business_partner_id", "catalog_part_id", name="uq_partner_catalog_part"),
    )

    __tablename__ = "partner_catalog_part"


class SerializedPart(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    partner_catalog_part_id: int = Field(foreign_key="partner_catalog_part.id", description="The ID of the associated partner catalog part.")
    part_instance_id: str = Field(index=True, unique=True, description="The part instance ID.")
    van: Optional[str] = Field(default=None, description="The optional VAN (Vehicle Assembly Number).")
    twin_id: Optional[int] = Field(foreign_key="twin.id", description="The ID of the associated twin.")

    # Relationships
    partner_catalog_part: PartnerCatalogPart = Relationship(back_populates="serialized_parts")
    twin: Optional[Twin] = Relationship(back_populates="serialized_part")

    __tablename__ = "serialized_part"


class JISPart(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    partner_catalog_part_id: int = Field(foreign_key="partner_catalog_part.id", description="The ID of the associated partner catalog part.")
    jis_number: str = Field(index=True, unique=True, description="The JIS number.")
    parent_order_number: Optional[str] = Field(default=None, description="The parent order number.")
    jis_call_date: Optional[datetime] = Field(default=None, description="The JIS call date.")
    twin_id: Optional[int] = Field(foreign_key="twin.id", description="The ID of the associated twin.")

    # Relationships
    partner_catalog_part: PartnerCatalogPart = Relationship(back_populates="jis_parts")
    twin: Optional[Twin] = Relationship(back_populates="jis_part")

    __tablename__ = "jis_part"

class Batch(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    batch_id: str = Field(index=True, unique=True, description="The batch ID.")
    catalog_part_id: int = Field(foreign_key="catalog_part.id", description="The ID of the associated catalog part.")

    # Relationships
    catalog_part: CatalogPart = Relationship(back_populates="batches")
    batch_business_partners: List["BatchBusinessPartner"] = Relationship(back_populates="batch")

    # Composite Unique Constraint
    __table_args__ = (
        UniqueConstraint("catalog_part_id", "batch_id", name="uq_catalog_batch_id"),
    )

    __tablename__ = "batch"

class BatchBusinessPartner(SQLModel, table=True):
    batch_id: str = Field(foreign_key="batch.id", description="The batch ID.", primary_key=True)
    business_partner_id: int = Field(foreign_key="business_partner.id", description="The ID of the associated business partner.", primary_key=True)

    # Relationships
    business_partner: BusinessPartner = Relationship()
    batch: Batch = Relationship(back_populates="batch_business_partners")

    __tablename__ = "batch_business_partner"

class DataExchangeAgreement(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True, unique=True, description="The name of the data exchange agreement.")
    business_partner_id: int = Field(foreign_key="business_partner.id", description="The ID of the associated business partner.")

    # Relationships
    business_partner: BusinessPartner = Relationship(back_populates="data_exchange_agreements")
    data_exchange_contracts: List["DataExchangeContract"] = Relationship(back_populates="data_exchange_agreement")
    twin_exchanges: List["TwinExchange"] = Relationship(back_populates="data_exchange_agreement")

    __tablename__ = "data_exchange_agreement"


class DataExchangeContract(SQLModel, table=True):
    data_exchange_agreement_id: int = Field(foreign_key="data_exchange_agreement.id", primary_key=True, description="The ID of the associated data exchange agreement.")
    semantic_id: str = Field(primary_key=True, description="The semantic ID of the contract.")
    edc_usage_policy_id: str = Field(description="The EDC usage policy ID.")

    # Relationships
    data_exchange_agreement: DataExchangeAgreement = Relationship(back_populates="data_exchange_contracts")

    __tablename__ = "data_exchange_contract"


class EnablementServiceStack(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True, unique=True, description="The name of the enablement service stack.")
    connection_settings: Optional[Dict[str, Any]] = Field(
        sa_column=Column(JSON),  # Specify JSON column type
        description="Connection settings stored as JSON"
    )
    legal_entity_id: int = Field(foreign_key="legal_entity.id", description="The ID of the associated legal entity.")

    # Relationships
    legal_entity: LegalEntity = Relationship(back_populates="enablement_service_stacks")
    twin_aspect_registrations: List["TwinAspectRegistration"] = Relationship(back_populates="enablement_service_stack")
    twin_registrations: List["TwinRegistration"] = Relationship(back_populates="enablement_service_stack")

    __tablename__ = "enablement_service_stack"


class TwinAspect(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    submodel_id: UUID = Field(default_factory=UUID, unique=True, description="The submodel ID.")
    semantic_id: str = Field(description="The semantic ID.")
    twin_id: int = Field(foreign_key="twin.id", description="The ID of the associated twin.")

    # Relationships
    twin: Twin = Relationship(back_populates="twin_aspects")
    twin_aspect_registrations: List["TwinAspectRegistration"] = Relationship(back_populates="twin_aspect")

    __tablename__ = "twin_aspect"

    def find_registration_by_stack_id(self, enablement_service_stack_id: int) -> Optional["TwinAspectRegistration"]:
        """Find the registration for a given enablement service stack."""
        for registration in self.twin_aspect_registrations:
            if registration.enablement_service_stack_id == enablement_service_stack_id:
                return registration
        return None


class TwinAspectRegistration(SQLModel, table=True):
    twin_aspect_id: int = Field(foreign_key="twin_aspect.id", primary_key=True, description="The ID of the associated twin aspect.")
    enablement_service_stack_id: int = Field(foreign_key="enablement_service_stack.id", primary_key=True, description="The ID of the associated enablement service stack.")
    status: int = Field(default=0, description="The status of the registration.") # TODO: Use Enum for status
    registration_mode: int = Field(default=0, description="The registration mode.") # TODO: Use Enum for registration mode
    created_date: datetime = Field(default_factory=datetime.utcnow, description="The creation date of the registration.")
    modified_date: datetime = Field(default_factory=datetime.utcnow, description="The last modification date of the registration.")

    # Relationships
    twin_aspect: TwinAspect = Relationship(back_populates="twin_aspect_registrations")
    enablement_service_stack: EnablementServiceStack = Relationship(back_populates="twin_aspect_registrations")

    __tablename__ = "twin_aspect_registration"


class TwinExchange(SQLModel, table=True):
    twin_id: int = Field(foreign_key="twin.id", primary_key=True, description="The ID of the associated twin.")
    data_exchange_agreement_id: int = Field(foreign_key="data_exchange_agreement.id", primary_key=True, description="The ID of the associated data exchange agreement.")

    # Relationships
    twin: Twin = Relationship(back_populates="twin_exchanges")
    data_exchange_agreement: DataExchangeAgreement = Relationship(back_populates="twin_exchanges")

    __tablename__ = "twin_exchange"


class TwinRegistration(SQLModel, table=True):
    twin_id: int = Field(foreign_key="twin.id", primary_key=True, description="The ID of the associated twin.")
    enablement_service_stack_id: int = Field(foreign_key="enablement_service_stack.id", primary_key=True, description="The ID of the associated enablement service stack.")
    dtr_registered: bool = Field(default=False, description="Whether the twin is registered in the DTR.")

    # Relationships
    twin: Twin = Relationship(back_populates="twin_registrations")
    enablement_service_stack: EnablementServiceStack = Relationship(back_populates="twin_registrations")

    __tablename__ = "twin_registration"