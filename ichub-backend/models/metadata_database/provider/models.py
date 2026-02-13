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
"""
This module defines the database models for the Industrial Core Database,
representing entities and relationships within the Catena-X ecosystem.
These models are designed to interact with a PostgreSQL database using
SQLAlchemy and SQLModel.
"""

from enum import Enum
from typing import Any, Dict, List, Optional
from uuid import UUID, uuid4
from datetime import datetime
from pydantic import BaseModel, Field as PydField
from sqlmodel import Field, SQLModel, Relationship
from sqlalchemy import Column, JSON, UniqueConstraint, SmallInteger
from tools.constants import TWIN_ID_DESCRIPTION, BUSINESS_PARTNER_ID_DESCRIPTION

class Unit(str, Enum):
    mm = "mm"
    cm = "cm"
    m  = "m"
    g  = "g"
    kg = "kg"

class Measurement(SQLModel, table=False):
    value: float = PydField(description="Numeric value of the measurement")
    unit: Unit = PydField(description="Unit of measure")

class Material(BaseModel):
    name: str = PydField(description="Name of the material")
    share: float = PydField(description="Share of the material in percent. 0-100")

class LegalEntity(SQLModel, table=True):
    """
    Holds information about the company offering the parts. 
    Mainly holds the BPN information. 

    Attributes:
        id (Optional[int]): The unique identifier for the legal entity.
        bpnl (str): The Business Partner Number Legal (BPNL) of the legal entity. 

    Relationships:
        catalog_parts (List["CatalogPart"]):  A list of catalog parts offered by this legal entity.
        connector_control_planes (List["ConnectorControlPlane"]): A list of connector control planes associated with this legal entity.

    Table Name:
        legal_entity
    """
    id: Optional[int] = Field(default=None, primary_key=True)
    bpnl: str = Field(index=True, unique=True, description="The BPNL of the legal entity.")

    # Relationships
    catalog_parts: List["CatalogPart"] = Relationship(back_populates="legal_entity")
    connector_control_planes: List["ConnectorControlPlane"] = Relationship(back_populates="legal_entity")

    __tablename__ = "legal_entity"


class BusinessPartner(SQLModel, table=True):
    """
    Represents an external partner organization (organization with who data will be exchanged). 
    Mainly holds the BPN information. 

    Attributes:
        id (Optional[int]): The unique identifier for the business partner.
        name (str): The name of the business partner. 
        bpnl (str): The Business Partner Number Legal (BPNL) of the business partner. 

    Relationships:
        partner_catalog_parts (List["PartnerCatalogPart"]): A list of partner catalog parts associated with this business partner.
        data_exchange_agreements (List["DataExchangeAgreement"]): A list of data exchange agreements involving this business partner.

    Table Name:
        business_partner
    """
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True, unique=True, description="The name of the business partner.")
    bpnl: str = Field(index=True, unique=True, description="The BPNL of the business partner.")

    # Relationships
    partner_catalog_parts: List["PartnerCatalogPart"] = Relationship(back_populates="business_partner")
    data_exchange_agreements: List["DataExchangeAgreement"] = Relationship(back_populates="business_partner")
    
    __tablename__ = "business_partner"


class Twin(SQLModel, table=True):
    """
    Represents a digital twin in the Catena-X ecosystem. 
    A twin is the digital representation of a part (type or instance level). 
    On system level it will related to a shell descriptor within the digital twin registry. 
    It is linked to all the part tables by means of foreign keys in those tables. 
    It is also linked to twin_exchange that enables the relation between a twin and a data_exchange_agreement. 
    It is also linked to twin_aspect that relates the twin with a twin_aspect_registration. 

    Attributes:
        id (Optional[int]): The unique identifier for the twin.
        global_id (UUID): The global ID (aka. Catena-X ID) of the twin. Could be automatically generated. 
        aas_id (UUID): The AAS ID of the twin. Could be automatically generated. 
        created_date (datetime): The creation date of the twin. The date fields could be auto-created at insert time by the DB. 
        modified_date (datetime): The last modification date of the twin. The date fields could be auto-created at insert time by the DB. 
        asset_class (Optional[str]): The asset class of the twin. This field is used at DRÄXLMAIER but might not be necessary in IC-Hub. It could be removed them from the table if no necessary.
        additional_context (Optional[str]): Additional context for the twin. This field is used at DRÄXLMAIER but might not be necessary in IC-Hub. It could be removed them from the table if no necessary.

    Relationships:
        catalog_parts (List["CatalogPart"]): A list of catalog parts associated with this twin.
        serialized_parts (List["SerializedPart"]): A list of serialized parts associated with this twin.
        jis_parts (List["JISPart"]): A list of JIS parts associated with this twin.
        twin_aspects (List["TwinAspect"]): A list of twin aspects associated with this twin.
        twin_exchanges (List["TwinExchange"]): A list of twin exchanges associated with this twin.
        twin_registrations (List["TwinRegistration"]): A list of twin registrations associated with this twin.

    Table Name:
        twin
    """
    id: Optional[int] = Field(default=None, primary_key=True)
    global_id: UUID = Field(default_factory=uuid4, unique=True, description="The global ID (aka. Catena-X ID) of the twin.")
    aas_id: UUID = Field(default_factory=uuid4, unique=True, description="The AAS ID of the twin.")
    created_date: datetime = Field(index=True, default_factory=datetime.utcnow, description="The creation date of the twin.")
    modified_date: datetime = Field(index=True, default_factory=datetime.utcnow, description="The last modification date of the twin.")
    asset_class: Optional[str] = Field(default=None, description="The asset class of the twin.")
    additional_context: Optional[str] = Field(default=None, description="Additional context for the twin.")

    # Relationships
    batch: Optional["Batch"] = Relationship(back_populates="twin")
    catalog_part: Optional["CatalogPart"] = Relationship(back_populates="twin")
    serialized_part: Optional["SerializedPart"] = Relationship(back_populates="twin")
    jis_part: Optional["JISPart"] = Relationship(back_populates="twin")
    twin_aspects: List["TwinAspect"] = Relationship(back_populates="twin")
    twin_exchanges: List["TwinExchange"] = Relationship(back_populates="twin")
    twin_registrations: List["TwinRegistration"] = Relationship(back_populates="twin")

    __tablename__ = "twin"


class CatalogPart(SQLModel, table=True):
    """
    Represents details about a part of type 'catalog part'. 
    A catalog part is the representation of a part on the “plan” or “engineering” level (model, reference …). 
    It’s something that the supplier company CAN produce and/or deliver. 
    In contradiction when producing part we speak of instance level parts. 
    There are three types: Instance or SerialPart, BatchPart and JISPart. 
    This table holds information about the id assigned by the manufacturer to the part (manufacturer_part_id). 
    It also links this table to the legal_entity via foreign key legal_entity_id. 
    When data about the catalog part itself should be offered via Catena-X,
    this table also relates to the twin table through foreign key (twin_id). 

    Attributes:
        id (Optional[int]): The unique identifier for the catalog part.
        manufacturer_part_id (str): The manufacturer part ID. 
        legal_entity_id (int): The ID of the associated legal entity. 
        twin_id (Optional[int]): The ID of the associated twin. 
        category (Optional[str]): The category of the catalog part.
        bpns (Optional[str]): The optional site information (BPNS) of the catalog part. It is a link to a 'site information' of a business partner (s at the end).

    Relationships:
        legal_entity (LegalEntity): The legal entity that offers this catalog part.
        twin (Optional[Twin]): The digital twin associated with this catalog part.
        partner_catalog_parts (List["PartnerCatalogPart"]):  A list of partner catalog parts that reference this catalog part.
        batches (List["Batch"]): A list of batches associated with this catalog part.

    Table Name:
        catalog_part
    """
    id: Optional[int] = Field(default=None, primary_key=True)
    manufacturer_part_id: str = Field(index=True, description="The manufacturer part ID.")
    legal_entity_id: int = Field(index=True, foreign_key="legal_entity.id", description="The ID of the associated legal entity.")
    twin_id: Optional[int] = Field(unique=True, foreign_key="twin.id", description=TWIN_ID_DESCRIPTION)
    name: str = Field(default="", description="The name of the catalog part at the manufacturer.")
    description: Optional[str] = Field(default=None, description="The description of the catalog part.")
    category: Optional[str] = Field(default=None, description="The category of the catalog part.")
    bpns: Optional[str] = Field(default=None, description="The optional site information (BPNS) of the catalog part.")
    materials: List[Material] = Field(default_factory=list, sa_column=Column(JSON), description="List of materials, e.g. [{'name':'aluminum','share':20.5}, {'name':'steel','share':75.25}]")
    width: Optional[Measurement] = Field(default=None, sa_column=Column(JSON), description="Width of the part")
    height: Optional[Measurement] = Field(default=None, sa_column=Column(JSON), description="Height of the part")
    length: Optional[Measurement] = Field(default=None, sa_column=Column(JSON), description="Length of the part")
    weight: Optional[Measurement] = Field(default=None, sa_column=Column(JSON), description="Weight of the part")

    # Relationships
    legal_entity: LegalEntity = Relationship(back_populates="catalog_parts")
    twin: Optional[Twin] = Relationship(back_populates="catalog_part")
    partner_catalog_parts: List["PartnerCatalogPart"] = Relationship(back_populates="catalog_part")
    batches: List["Batch"] = Relationship(back_populates="catalog_part")
    

    __table_args__ = (
        UniqueConstraint("legal_entity_id", "manufacturer_part_id", name="uk_catalog_part_legal_entity_id_manufacturer_part_id"),
    )

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


class PartnerCatalogPart(SQLModel, table=True):
    """
    Represents a customer relationship of a catalog part to a partner –
    meaning that a given catalog part is potentially sold/delivered to a specific business partner. 
    It is linked to catalog_part and business_partner through foreign keys
    (catalog_part_id and business_part_id respectively). 
    Single instance level parts (serialized, and JIS parts) refer to this table. 
    The part number under which the partner/customer know the part is stored in the customer_part_id. 

    Attributes:
        id (Optional[int]): The unique identifier for the partner catalog part.
        business_partner_id (int): The ID of the associated business partner. 
        catalog_part_id (int): The ID of the associated catalog part. 
        customer_part_id (str): The customer part ID. It is the naming/numbering given by a customer to a part. It‘s neccessary for suppliers to know under which number a customer knows a part.

    Relationships:
        business_partner (BusinessPartner): The business partner in this relationship.
        catalog_part (CatalogPart): The catalog part in this relationship.
        serialized_parts (List["SerializedPart"]): A list of serialized parts that reference this relationship.
        jis_parts (List["JISPart"]): A list of JIS parts that reference this relationship.

    Table Name:
        partner_catalog_part

    Composite Constraints:
        UniqueConstraint:  Ensures that the combination of business_partner_id and catalog_part_id is unique. 
    """
    id: Optional[int] = Field(default=None, primary_key=True)
    business_partner_id: int = Field(index=True, foreign_key="business_partner.id", description=BUSINESS_PARTNER_ID_DESCRIPTION)
    catalog_part_id: int = Field(index=True, foreign_key="catalog_part.id", description="The ID of the associated catalog part.")
    customer_part_id: str = Field(index=True, default="", description="The customer part ID.")

    # Relationships
    business_partner: BusinessPartner = Relationship(back_populates="partner_catalog_parts")
    catalog_part: CatalogPart = Relationship(back_populates="partner_catalog_parts")
    serialized_parts: List["SerializedPart"] = Relationship(back_populates="partner_catalog_part")
    jis_parts: List["JISPart"] = Relationship(back_populates="partner_catalog_part")

    # Composite Unique Constraint
    __table_args__ = (
        UniqueConstraint("business_partner_id", "catalog_part_id", name="uk_partner_catalog_part_business_partner_id_catalog_part_id"),
    )

    __tablename__ = "partner_catalog_part"


class SerializedPart(SQLModel, table=True):
    """
    Represents details about a part of type serial part. 
    This represents a specific single part (component, piece, module …). 
    This table holds information about the id assigned by the manufacturer to the instance or serial part (part_instance_id). 
    It also links this table to the partner_catalog_part and the twin tables through
    foreign keys (partner_catalog_part _id and twin_id respectively). 

    Attributes:
        id (Optional[int]): The unique identifier for the serialized part.
        partner_catalog_part_id (int): The ID of the associated partner catalog part. 
        part_instance_id (str): The part instance ID. 
        van (Optional[str]): The optional VAN (Vehicle Assembly Number). This is the vehicle number given by the Industry Core KIT.
        twin_id (int): The ID of the associated twin. 

    Relationships:
        partner_catalog_part (PartnerCatalogPart): The partner catalog part this serial part is related to.
        twin (Twin): The digital twin associated with this serial part.

    Table Name:
        serialized_part
    """
    id: Optional[int] = Field(default=None, primary_key=True)
    partner_catalog_part_id: int = Field(index=True, foreign_key="partner_catalog_part.id", description="The ID of the associated partner catalog part.")
    part_instance_id: str = Field(index=True, description="The part instance ID.")
    van: Optional[str] = Field(index=True, default=None, description="The optional VAN (Vehicle Assembly Number).")
    twin_id: Optional[int] = Field(unique=True, foreign_key="twin.id", description=TWIN_ID_DESCRIPTION)

    # Relationships
    partner_catalog_part: PartnerCatalogPart = Relationship(back_populates="serialized_parts")
    twin: Optional[Twin] = Relationship(back_populates="serialized_part")

    __table_args__ = (
        UniqueConstraint("part_instance_id", "partner_catalog_part_id", name="uk_serialized_part_partner_catalog_part_id_part_instance_id"),
    )

    __tablename__ = "serialized_part"


class JISPart(SQLModel, table=True):
    """
    Represents details about a part of type 'Just In Sequence part'. 
    This table holds information about the id assigned by the manufacturer to the JIS part (jis_number). 
    It also links this table to the partner_catalog_part and the twin tables through
    foreign keys (partner_catalog_part _id and twin_id respectively). 

    Attributes:
        id (Optional[int]): The unique identifier for the JIS part.
        partner_catalog_part_id (int): The ID of the associated partner catalog part. 
        jis_number (str): The JIS number. 
        parent_order_number (Optional[str]): The parent order number. 
        jis_call_date (Optional[datetime]): The JIS call date. 
        twin_id (int): The ID of the associated twin. 

    Relationships:
        partner_catalog_part (PartnerCatalogPart): The partner catalog part this JIS part is related to.
        twin (Twin): The digital twin associated with this JIS part.

    Table Name:
        jis_part
    """
    id: Optional[int] = Field(default=None, primary_key=True)
    partner_catalog_part_id: int = Field(index=True, foreign_key="partner_catalog_part.id", description="The ID of the associated partner catalog part.")
    jis_number: str = Field(index=True, description="The JIS number.")
    parent_order_number: Optional[str] = Field(index=True, default=None, description="The parent order number.")
    jis_call_date: Optional[datetime] = Field(index=True, default=None, description="The JIS call date.")
    twin_id: Optional[int] = Field(unique=True, foreign_key="twin.id", description=TWIN_ID_DESCRIPTION)

    # Relationships
    partner_catalog_part: PartnerCatalogPart = Relationship(back_populates="jis_parts")
    twin: Optional[Twin] = Relationship(back_populates="jis_part")

    __table_args__ = (
        UniqueConstraint("jis_number", "partner_catalog_part_id", name="uk_jis_part_partner_catalog_part_id_jis_number"),
    )

    __tablename__ = "jis_part"


class Batch(SQLModel, table=True):
    """
    Represents details about a Batch production.
    This represents either a group of parts that were produced as a batch (several instances grouped)
    or something that cannot be counted by piece (e.g., liquids that just have a volume).
    This table holds information about the id assigned by the manufacturer to the batch (batch_id).
    It also links this table to the partner_catalog_part and the twin tables through foreign keys
    (partner_catalog_part _id and twin_id respectively). Batches are instance level parts. 
	Other than serialized part and JIS part they can be shared with multiple partners. 
	But each batch can have it‘s own (sub-)list of partners it‘s shared with. 
	Thus we cannot re-use the partner_catalog_part relation of the associated catalog_part.

    Attributes:
        id (Optional[int]): The unique identifier for the batch.
        batch_id (str): The batch ID.
        catalog_part_id (int): The ID of the associated catalog part (foreign key to catalog_part).
        twin_id (Optional[int]): The ID of the associated twin (foreign key to twin).

    Relationships:
        catalog_part (CatalogPart): The catalog part associated with this batch.
        batch_business_partners (List["BatchBusinessPartner"]): The business partners associated with this batch.

    Table Name:
        batch

    Composite Constraints:
        UniqueConstraint: Ensures that the combination of catalog_part_id and batch_id is unique.

    """
    id: Optional[int] = Field(default=None, primary_key=True)
    batch_id: str = Field(index=True, description="The batch ID.")
    catalog_part_id: int = Field(index=True, foreign_key="catalog_part.id", description="The ID of the associated catalog part.")
    twin_id: Optional[int] = Field(unique=True, foreign_key="twin.id", description=TWIN_ID_DESCRIPTION)

    # Relationships
    catalog_part: CatalogPart = Relationship(back_populates="batches")
    batch_business_partners: List["BatchBusinessPartner"] = Relationship(back_populates="batch")
    twin: Optional[Twin] = Relationship(back_populates="batch")

    # Composite Unique Constraint
    __table_args__ = (
        UniqueConstraint("catalog_part_id", "batch_id", name="uk_batch_catalog_part_id_batch_id"),
    )

    __tablename__ = "batch"


class BatchBusinessPartner(SQLModel, table=True):
    """
    Represents the relation between a batch and a business_partner.
    It is linked to batch and business_partner through foreign keys (batch_id and business_partner_id respectively).
    This is the mapping of a batch part to a business partner indicating that (parts of) this batch are sold/delivered to that partner..

    Attributes:
        batch_id (str): The batch ID (foreign key to batch).
        business_partner_id (int): The ID of the associated business partner (foreign key to business_partner).

    Relationships:
        business_partner (BusinessPartner): The business partner associated with this relation.
        batch (Batch): The batch associated with this relation.

    Table Name:
        batch_business_partner

    
    """
    batch_id: int = Field(foreign_key="batch.id", description="The batch ID.", primary_key=True)
    business_partner_id: int = Field(foreign_key="business_partner.id", description=BUSINESS_PARTNER_ID_DESCRIPTION, primary_key=True)

    # Relationships
    business_partner: BusinessPartner = Relationship()
    batch: Batch = Relationship(back_populates="batch_business_partners")

    __tablename__ = "batch_business_partner"


class DataExchangeAgreement(SQLModel, table=True):
    """
    Gives name to a formal agreement and relates it with a business partner.
    The agreement will usually be the digital counterpart of a real-life contractual relationship
    between a supplier and customer about the production and/or delivery of parts.
    It links the data exchange_agreement to a business_partner through a foreign key (business_partner_id).
    This table is also linked to twin_exchange to relate the agreement with a twin_id.

    Attributes:
        id (Optional[int]): The unique identifier for the data exchange agreement.
        name (str): The name of the data exchange agreement.
        business_partner_id (int): The ID of the associated business partner (foreign key to business_partner).

    Relationships:
        business_partner (BusinessPartner): The business partner associated with this agreement.
        data_exchange_contracts (List["DataExchangeContract"]): The contracts associated with this agreement.
        twin_exchanges (List["TwinExchange"]): The twin exchanges associated with this agreement.

    Table Name:
        data_exchange_agreement

    
    """
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True, description="The name of the data exchange agreement.")
    business_partner_id: int = Field(index=True, foreign_key="business_partner.id", description=BUSINESS_PARTNER_ID_DESCRIPTION)

    # Relationships
    business_partner: BusinessPartner = Relationship(back_populates="data_exchange_agreements")
    data_exchange_contracts: List["DataExchangeContract"] = Relationship(back_populates="data_exchange_agreement")
    twin_exchanges: List["TwinExchange"] = Relationship(back_populates="data_exchange_agreement")

    __table_args__ = (
        UniqueConstraint("business_partner_id", "name", name="uk_data_exchange_agreement_name_business_partner_id"),
    )

    __tablename__ = "data_exchange_agreement"


class DataExchangeContract(SQLModel, table=True):
    """
    Represents a formal contract with a business partner through an agreement.
    It is linked with a data_exchange_agreement through a foreign key (data_exchange_agreement_id).

    Attributes:
        data_exchange_agreement_id (int): The ID of the associated data exchange agreement (foreign key).
        semantic_id (str): The semantic ID of the contract. At a later time we will need to included editors in the frontend for that. 
			The semantic ID refers to one from the types defined here: eclipse-tractusx/sldt-semantic-models: sldt-semantic-models 
        edc_usage_policy_id (str): The EDC usage policy ID.

    Relationships:
        data_exchange_agreement (DataExchangeAgreement): The data exchange agreement associated with this contract.

    Table Name:
        data_exchange_contract

    """
    data_exchange_agreement_id: int = Field(foreign_key="data_exchange_agreement.id", primary_key=True, description="The ID of the associated data exchange agreement.")
    semantic_id: str = Field(primary_key=True, description="The semantic ID of the contract.")
    edc_usage_policy_id: str = Field(description="The EDC usage policy ID.")

    # Relationships
    data_exchange_agreement: DataExchangeAgreement = Relationship(back_populates="data_exchange_contracts")

    __tablename__ = "data_exchange_contract"

class ConnectorControlPlane(SQLModel, table=True):
    """
    Represents a Connector Control Plane.
    It holds information about the Connector Control Plane, including its ID, name, and connection settings.
    It is linked to the enablement_service_stack by a foreign key (enablement_service_stack_id).
    Also it refers the legal entity under whose BPNL the Connector is registered.

    Attributes:
        id (Optional[int]): The unique identifier for the Connector Control Plane.
        name (str): The name of the Connector Control Plane.
        dataspace_version (str): The version of the dataspace release.
        dma_path (str): The path to the Connector management API.
        connection_settings (Optional[Dict[str, Any]]): Connection settings stored as JSON.
        legal_entity_id (int): The ID of the associated legal entity (foreign key to legal_entity).

    Relationships:
        enablement_service_stack (EnablementServiceStack): The enablement service stack associated with this Connector service.

    Table Name:
        connector_control_plane
    """
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True, unique=True, description="The name of the Connector Control Plane.")
    dataspace_version: str = Field(default="jupiter", description="The version of the dataspace release.")
    dma_path: str = Field(default="/management", description="The path to the Connector management API.")
    connection_settings: Optional[Dict[str, Any]] = Field(sa_column=Column(JSON), description="Connection settings stored as JSON")
    is_default: bool = Field(default=False, description="Indicates if this is the default Connector Control Plane")
    legal_entity_id: int = Field(index=True, foreign_key="legal_entity.id", description="The ID of the associated legal entity.")

    # Relationships
    enablement_service_stack: Optional["EnablementServiceStack"] = Relationship(back_populates="connector_control_plane")
    legal_entity: LegalEntity = Relationship()
    twin_aspect_registrations: List["TwinAspectRegistration"] = Relationship(back_populates="connector_control_plane")

    __tablename__ = "connector_control_plane"


class TwinRegistry(SQLModel, table=True):
    """
    Represents a Digital Twin Registry (DTR).
    It holds information about the Twin Registry, including its ID, name, and connection settings.
    It is linked to the enablement_service_stack by a foreign key (enablement_service_stack_id).

    Attributes:
        id (Optional[int]): The unique identifier for the Twin Registry.
        name (str): The name of the Twin Registry.
        version (str): The version of the Twin Registry.
        connection_settings (Optional[Dict[str, Any]]): Connection settings stored as JSON.

    Relationships:
        enablement_service_stack (EnablementServiceStack): The enablement service stack associated with this DTR service.
        twin_aspect_registrations (List["TwinAspectRegistration"]): The twin aspect registrations associated with this service stack.

    Table Name:
        twin_registry
    """
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True, unique=True, description="The name of the Twin Registry.")
    version: str = Field(default="3.0", description="The version of the Twin Registry.")
    connection_settings: Optional[Dict[str, Any]] = Field(sa_column=Column(JSON), description="Connection settings stored as JSON")
    is_default: bool = Field(default=False, description="Indicates if this is the default Twin Registry")

    # Relationships
    enablement_service_stack: Optional["EnablementServiceStack"] = Relationship(back_populates="twin_registry")
    twin_aspect_registrations: List["TwinAspectRegistration"] = Relationship(back_populates="twin_registry")
    twin_registrations: List["TwinRegistration"] = Relationship(back_populates="twin_registry")

    __tablename__ = "twin_registry"


class EnablementServiceStack(SQLModel, table=True):
    """
    An instance/installation of the `Enablement services` stack.
    The `Enablement services` stack is a set of services that are used to enable standardized exchange of data between partners.
    For this implementation, it needs to consist at least of one unique Connector Control Plane
    and one (sharable) Digital Twin Registry (DTR).

    Attributes:
        id (Optional[int]): The unique identifier for the enablement service stack.
        name (str): The name of the enablement service stack.
        settings (Optional[Dict[str, Any]]): Any stack specific settings stored as JSON. 
        connector_control_plane_id (int): The ID of the associated Connector control plane (foreign key to connector_control_plane).
        twin_registry_id (int): The ID of the associated twin registry (foreign key to twin_registry).

    Relationships:
        connector_control_plane (ConnectorControlPlane): The Connector control plane associated with this enablement service stack.
        twin_registry (TwinRegistry): The twin registry associated with this enablement service stack.
        twin_registrations (List["TwinRegistration"]): The twin registrations associated with this service stack.

    Table Name:
        enablement_service_stack

    """
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True, unique=True, description="The name of the enablement service stack.")
    settings: Optional[Dict[str, Any]] = Field(
        sa_column=Column(JSON),  # Specify JSON column type
        description="Any stack specific settings stored as JSON"
    )
    connector_control_plane_id: int = Field(index=True, unique=True, foreign_key="connector_control_plane.id", description="The ID of the associated connector control plane.")
    twin_registry_id: int = Field(index=True, foreign_key="twin_registry.id", description="The ID of the associated twin registry.")

    # Relationships
    connector_control_plane: ConnectorControlPlane = Relationship(back_populates="enablement_service_stack")
    twin_registry: TwinRegistry = Relationship(back_populates="enablement_service_stack")

    __tablename__ = "enablement_service_stack"


class TwinAspect(SQLModel, table=True):
    """
    Represents an aspect (document) associated to a certain twin.
    It holds information about the submodel (id) and semantics (id).
    It is linked to twin through a foreign key (twin_id).

    Attributes:
        id (Optional[int]): The unique identifier for the twin aspect.
        submodel_id (UUID): The submodel ID. Like aas_id the submodel_id can be auto-generated.		
        semantic_id (str): The semantic ID. Semantic_id will need to come from the frontend (or API caller)
        twin_id (int): The ID of the associated twin (foreign key to twin).

    Relationships:
        twin (Twin): The twin associated with this aspect.
        twin_aspect_registrations (List["TwinAspectRegistration"]): The registrations associated with this twin aspect.

    Table Name:
        twin_aspect

    """
    id: Optional[int] = Field(default=None, primary_key=True)
    submodel_id: UUID = Field(default_factory=uuid4, unique=True, description="The submodel ID.")
    semantic_id: str = Field(index=True, description="The semantic ID.")
    twin_id: int = Field(index=True, foreign_key="twin.id", description=TWIN_ID_DESCRIPTION)

    # Relationships
    twin: Twin = Relationship(back_populates="twin_aspects")
    twin_aspect_registrations: List["TwinAspectRegistration"] = Relationship(back_populates="twin_aspect")

    __table_args__ = (
        UniqueConstraint("twin_id", "semantic_id", name="uk_twin_aspect_twin_id_semantic_id"),
    )

    __tablename__ = "twin_aspect"

    def find_registration_by_twin_registry_id(self, twin_registry_id: int) -> Optional["TwinAspectRegistration"]:
        """Find the registration for a given twin registry."""
        for registration in self.twin_aspect_registrations:
            if registration.twin_registry_id == twin_registry_id:
                return registration
        return None


class TwinAspectRegistration(SQLModel, table=True):
    """
    Represents the relation between a twin_aspect and a twin_registry
    through their ids (twin_aspect_id and twin_registry_id).
    It holds information about the status, the registration mode and creation and update dates.

    Attributes:
        twin_aspect_id (int): The ID of the associated twin aspect (foreign key to twin_aspect).
        twin_registry_id (int): The ID of the associated twin registry (foreign key).
        status (int): The status of the registration.
			It's actually the status for all 3 services DTR/EDC/Submodel Service (number). It will be set by the system internally.
        registration_mode (int): The registration mode. It indicates asset bundling (yes or no). 
			In the first version, there is no asset bundling. Later provided by the API caller
        created_date (datetime): The creation date of the registration. Auto-generated in the DB.
        modified_date (datetime): The last modification date of the registration. Auto-generated in the DB.

    Relationships:
        twin_aspect (TwinAspect): The twin aspect being registered.
        twin_registry (TwinRegistry): The twin registry used for registration.

    Table Name:
        twin_aspect_registration

   
    """
    twin_aspect_id: int = Field(foreign_key="twin_aspect.id", primary_key=True, description="The ID of the associated twin aspect.")
    twin_registry_id: int = Field(foreign_key="twin_registry.id", primary_key=True, description="The ID of the associated twin registry.")
    connector_control_plane_id: int = Field(index=True, foreign_key="connector_control_plane.id", description="The ID of the associated connector control plane.")
    status: int = Field(index=True, default=0, description="The status of the registration.", sa_type=SmallInteger) # TODO: Use Enum for status
    registration_mode: int = Field(index=True, default=0, description="The registration mode.", sa_type=SmallInteger) # TODO: Use Enum for registration mode
    created_date: datetime = Field(index=True, default_factory=datetime.utcnow, description="The creation date of the registration.")
    modified_date: datetime = Field(index=True, default_factory=datetime.utcnow, description="The last modification date of the registration.")

    # Relationships
    twin_aspect: TwinAspect = Relationship(back_populates="twin_aspect_registrations")
    twin_registry: TwinRegistry = Relationship(back_populates="twin_aspect_registrations")
    connector_control_plane: ConnectorControlPlane = Relationship(back_populates="twin_aspect_registrations")

    __tablename__ = "twin_aspect_registration"


class TwinExchange(SQLModel, table=True):
    """
    Represents the relation between a twin and a data_exchange_agreement.
    It is indicating that documents/aspects attached to this twin are shared with the respective business part
    via (an) EDC asset(s) and related EDC contract definition(s).
    It is linked to twin and data_exchange_agreement through foreign keys
    (twin_id and data_exchange_agreement_id).

    Attributes:
        twin_id (int): The ID of the associated twin (foreign key to twin).
        data_exchange_agreement_id (int): The ID of the associated data exchange agreement (foreign key).
        is_cancelled (bool): Whether the twin exchange is cancelled. This is set to true when the data exchange agreement is cancelled.

    Relationships:
        twin (Twin): The twin involved in the exchange.
        data_exchange_agreement (DataExchangeAgreement): The data exchange agreement governing the exchange.

    Table Name:
        twin_exchange

    
    """
    twin_id: int = Field(foreign_key="twin.id", primary_key=True, description=TWIN_ID_DESCRIPTION)
    data_exchange_agreement_id: int = Field(index=True, foreign_key="data_exchange_agreement.id", primary_key=True, description="The ID of the associated data exchange agreement.")
    is_cancelled: bool = Field(index=True, default=False, description="Whether the twin exchange is cancelled. This is set to true when the data exchange agreement is cancelled.")

    # Relationships
    twin: Twin = Relationship(back_populates="twin_exchanges")
    data_exchange_agreement: DataExchangeAgreement = Relationship(back_populates="twin_exchanges")

    __tablename__ = "twin_exchange"


class TwinRegistration(SQLModel, table=True):
    """
    Represents the relation between a twin and a twin registry
    through their ids (twin_id and twin_registry_id).
    It also indicates if the twin is registered in the twin registry using a boolean (twin_registered).

    Attributes:
        twin_id (int): The ID of the associated twin (foreign key to twin).
        twin_registry_id (int): The ID of the associated twin registry (foreign key).
        dtr_registered (bool): Whether the twin is registered in the twin registry.

    Relationships:
        twin (Twin): The twin being registered.
        twin_registry (TwinRegistry): The twin registry used for registration.

    Table Name:
        twin_registration

    """
    twin_id: int = Field(foreign_key="twin.id", primary_key=True, description=TWIN_ID_DESCRIPTION)
    twin_registry_id: int = Field(foreign_key="twin_registry.id", primary_key=True, description="The ID of the associated twin registry.")
    dtr_registered: bool = Field(index=True, default=False, description="Whether the twin is registered in the twin registry.")

    # Relationships
    twin: Twin = Relationship(back_populates="twin_registrations")
    twin_registry: TwinRegistry = Relationship(back_populates="twin_registrations")

    __tablename__ = "twin_registration"