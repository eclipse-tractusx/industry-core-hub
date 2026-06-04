#################################################################################
# Eclipse Tractus-X - Industry Core Hub Backend
#
# Copyright (c) 2025,2026 LKS Next
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

from sqlalchemy import case, and_, or_, func
from sqlmodel import SQLModel, Session, select, desc
from sqlalchemy.orm import selectinload
from sqlalchemy.orm.attributes import flag_modified
from typing import TypeVar, Type, List, Optional, Generic
from uuid import UUID, uuid4
from datetime import date, datetime, timezone

from models.metadata_database.provider.models import (
    BusinessPartner,
    EnablementServiceStack,
    LegalEntity,
    Twin,
    TwinAspect,
    TwinAspectRegistration,
    TwinExchange,
    TwinRegistration,
    CatalogPart,
    SerializedPart,
    PartnerCatalogPart,
    DataExchangeAgreement,
)
from models.metadata_database.notification.models import (
    NotificationEntity,
    NotificationDirection,
    NotificationStatus
)
from models.metadata_database.pcf.models import (
    PcfExchangeEntity,
    PcfExchangeDirection,
    PcfExchangeStatus,
    PcfExchangeType,
    PcfRelationshipEntity
)
from models.metadata_database.addons.ccm_kit.v1.models import (
    Ccm,
    CcmInboundRequest,
    CcmOutboundRequest,
    CcmReceived,
    CcmSite,
    CertificateShare,
    InboundRequestStatus,
    OutboundRequestStatus,
    ReceivedCertificateStatus,
    ShareStatus,
    TrustLevel,
)
from tractusx_sdk.industry.models.notifications import Notification

ModelType = TypeVar("ModelType", bound=SQLModel)

class BaseRepository(Generic[ModelType]):
    def __init__(self, session: Session):
        self._session = session

    def __init_subclass__(cls) -> None:
        # Fetch the model type from the first argument of the generic class

        # pylint: disable=no-member
        cls._type = cls.__orig_bases__[0].__args__[0]  # type: ignore

    @classmethod
    def get_type(cls) -> Type[ModelType]:
        return cls._type  # type: ignore

    def create(self, obj_in: ModelType) -> ModelType:
        self._session.add(obj_in)
        return obj_in
    
    def find_by_id(self, obj_id: int) -> Optional[ModelType]:
        stmt = select(self.get_type()).where(
            self.get_type().id == obj_id)  # type: ignore
        return self._session.scalars(stmt).first()

    def find_all(self, offset: Optional[int] = None, limit: Optional[int] = 100) -> List[ModelType]:
        stmt = select(self.get_type())  # select(Author)
        if offset is not None:
            stmt = stmt.offset(offset)

        if limit is not None:
            stmt = stmt.limit(limit)

        result = self._session.scalars(stmt).unique()
        return list(result)

    def update(self, id: int, obj_in: dict) -> Optional[ModelType]:
        db_obj = self._session.get(self.get_type(), id)
        if not db_obj:
            return None
        for field, value in obj_in.items():
            setattr(db_obj, field, value)
        self._session.commit()
        self._session.refresh(db_obj)
        return db_obj

    def commit(self) -> None:
        self._session.commit()

    def add(self, obj: ModelType, *, commit: bool = False) -> ModelType:
        self._session.add(obj)

        if commit:
            self._session.commit()
            self._session.refresh(obj)
        return obj
    
    def delete(self, obj_id: int) -> None:
        obj = self._session.get(self.get_type(), obj_id)
        if obj is None:
            err_msg = f'{self.get_type()} with id {obj_id} not found!'
            raise ValueError(err_msg)
        self.delete_obj(obj)

    def delete_obj(self, obj: ModelType) -> None:
        self._session.delete(obj)

class BusinessPartnerRepository(BaseRepository[BusinessPartner]):

    def create_new(self, name: str, bpnl: str) -> BusinessPartner:
        """Create a new BusinessPartner instance."""
        business_partner = BusinessPartner(
            name=name,
            bpnl=bpnl
        )
        self.create(business_partner)
        return business_partner

    def get_by_name(self, name: str) -> Optional[BusinessPartner]:
        stmt = select(BusinessPartner).where(
            BusinessPartner.name == name)  # type: ignore
        return self._session.scalars(stmt).first()

    def get_by_bpnl(self, bpnl: str) -> Optional[BusinessPartner]:
        stmt = select(BusinessPartner).where(
            BusinessPartner.bpnl == bpnl)  # type: ignore
        return self._session.scalars(stmt).first()

class CatalogPartRepository(BaseRepository[CatalogPart]):

    def get_by_legal_entity_id_manufacturer_part_id(self, legal_entity_id: int, manufacturer_part_id: str) -> Optional[CatalogPart]:
        stmt = select(CatalogPart).where(
            CatalogPart.legal_entity_id == legal_entity_id).where(
            CatalogPart.manufacturer_part_id == manufacturer_part_id)
        return self._session.scalars(stmt).first()

    def find_by_manufacturer_id_manufacturer_part_id(self, manufacturer_id: Optional[str], manufacturer_part_id: Optional[str], join_partner_catalog_parts : bool = False) -> List[tuple[CatalogPart, int]]:
        """
        Find catalog parts by manufacturer ID and manufacturer part ID.
        If manufacturer ID is not provided, all catalog parts are returned.
        If manufacturer part ID is not provided, all catalog parts with the given manufacturer ID are returned.
        
        The result is a list of tuples, where each tuple contains the CatalogPart object and its status.
        """

        # Case to determine the status of the catalog part
        status_expr = case(
            # 0: no twin at all (draft)
            (CatalogPart.twin_id.is_(None), 0),
            # 1: twin exists, but not yet DTR-registered (pending)
            (TwinRegistration.dtr_registered.is_(False), 1),
            # 2: DTR-registered but not yet in any TwinExchange row (registered)
            ((TwinRegistration.dtr_registered.is_(True)) & (TwinExchange.twin_id.is_(None)), 2),
            # 3: DTR-registered AND appears in TwinExchange (shared)
            ((TwinRegistration.dtr_registered.is_(True)) & (TwinExchange.twin_id.is_not(None)), 3),
            else_=0
        ).label("status")

        stmt = select(CatalogPart, status_expr).distinct(CatalogPart.id)

        stmt = stmt.outerjoin(TwinRegistration, TwinRegistration.twin_id == CatalogPart.twin_id)
        stmt = stmt.outerjoin(TwinExchange, TwinExchange.twin_id == CatalogPart.twin_id)

        if manufacturer_id:
            stmt = stmt.join(LegalEntity, LegalEntity.id == CatalogPart.legal_entity_id).where(LegalEntity.bpnl == manufacturer_id)

        if manufacturer_part_id:
            stmt = stmt.where(CatalogPart.manufacturer_part_id == manufacturer_part_id)

        if join_partner_catalog_parts:
            subquery = select(PartnerCatalogPart).join(BusinessPartner, BusinessPartner.id == PartnerCatalogPart.business_partner_id).where(PartnerCatalogPart.catalog_part_id == CatalogPart.id).subquery()
            stmt = stmt.join(subquery, subquery.c.catalog_part_id == CatalogPart.id, isouter=True)

        return self._session.exec(stmt).all()

class DataExchangeAgreementRepository(BaseRepository[DataExchangeAgreement]):
    def get_by_business_partner_id(self, business_partner_id: int) -> List[DataExchangeAgreement]:
        stmt = select(DataExchangeAgreement).where(
            DataExchangeAgreement.business_partner_id == business_partner_id  # type: ignore
        )
        return self._session.scalars(stmt).all()

class LegalEntityRepository(BaseRepository[LegalEntity]):

    def get_by_bpnl(self, bpnl: str) -> Optional[LegalEntity]:
        stmt = select(LegalEntity).where(
            LegalEntity.bpnl == bpnl)  # type: ignore
        return self._session.scalars(stmt).first()

class PartnerCatalogPartRepository(BaseRepository[PartnerCatalogPart]):
    def get_by_catalog_part_id_business_partner_id(self, catalog_part_id: int, business_partner_id: int) -> Optional[PartnerCatalogPart]:
        stmt = select(PartnerCatalogPart).where(
            PartnerCatalogPart.catalog_part_id == catalog_part_id).where(
            PartnerCatalogPart.business_partner_id == business_partner_id)
        return self._session.scalars(stmt).first()
    
    def create_new(self, catalog_part_id: int, business_partner_id: int, customer_part_id: str) -> PartnerCatalogPart:
        """Create a new PartnerCatalogPart instance."""
        partner_catalog_part = PartnerCatalogPart(
            catalog_part_id=catalog_part_id,
            business_partner_id=business_partner_id,
            customer_part_id=customer_part_id,
        )
        self.create(partner_catalog_part)
        return partner_catalog_part
    
    def get_by_catalog_part_id(self, catalog_part_id: int) -> List[PartnerCatalogPart]:
        stmt = select(PartnerCatalogPart).where(
            PartnerCatalogPart.catalog_part_id == catalog_part_id)
        return self._session.scalars(stmt).all()
    
    def create_or_update(self, catalog_part_id: int, business_partner_id: int, customer_part_id: str) -> PartnerCatalogPart:
        """Create or update a PartnerCatalogPart instance."""
        existing = self.get_by_catalog_part_id_business_partner_id(
            catalog_part_id=catalog_part_id,
            business_partner_id=business_partner_id
        )
        if existing:
            return self.update(
                catalog_part_id=catalog_part_id,
                business_partner_id=business_partner_id,
                customer_part_id=customer_part_id
            )
        return self.create_new(
            catalog_part_id=catalog_part_id,
            business_partner_id=business_partner_id,
            customer_part_id=customer_part_id
        )

    def update(self, catalog_part_id: int, business_partner_id: int, customer_part_id: str) -> Optional[PartnerCatalogPart]:
        """Update the customer_part_id for an existing PartnerCatalogPart."""
        stmt = select(PartnerCatalogPart).where(
            PartnerCatalogPart.catalog_part_id == catalog_part_id,
            PartnerCatalogPart.business_partner_id == business_partner_id
        )
        existing = self._session.scalars(stmt).first()
        if existing:
            existing.customer_part_id = customer_part_id
            self._session.commit()
            self._session.refresh(existing)
        return existing
    
class EnablementServiceStackRepository(BaseRepository[EnablementServiceStack]):
    def get_by_name(self, name: str, join_legal_entity: bool = False) -> Optional[EnablementServiceStack]:
        stmt = select(EnablementServiceStack).where(
            EnablementServiceStack.name == name)  # type: ignore
        
        if join_legal_entity:
            stmt = stmt.join(LegalEntity, LegalEntity.id == EnablementServiceStack.legal_entity_id)

        return self._session.scalars(stmt).first()
    
    def find_by_legal_entity_bpnl(self, legal_entity_bpnl: str) -> List[EnablementServiceStack]:
        stmt = select(EnablementServiceStack).join(
            LegalEntity, LegalEntity.id == EnablementServiceStack.legal_entity_id).where(
            LegalEntity.bpnl == legal_entity_bpnl)
        return self._session.scalars(stmt).all()

class SerializedPartRepository(BaseRepository[SerializedPart]):
    def get_by_partner_catalog_part_id_part_instance_id(self, partner_catalog_part_id: int, part_instance_id: str) -> Optional[SerializedPart]:
        stmt = select(SerializedPart).where(
            SerializedPart.partner_catalog_part_id == partner_catalog_part_id).where(
            SerializedPart.part_instance_id == part_instance_id)
        return self._session.scalars(stmt).first()

    def find_by_partner_catalog_part_id(self, partner_catalog_part_id: int) -> List[SerializedPart]:
        stmt = select(SerializedPart).where(
            SerializedPart.partner_catalog_part_id == partner_catalog_part_id)
        return self._session.scalars(stmt).all()

    def get_by_twin_id(
        self,
        twin_id: int,
        join_legal_entity: bool = False,
        join_partner_catalog_part: bool = False
    ) -> Optional[SerializedPart]:
        
        stmt = select(SerializedPart)
        
        if join_legal_entity or join_partner_catalog_part:
            stmt = stmt.join(PartnerCatalogPart, PartnerCatalogPart.id == SerializedPart.partner_catalog_part_id)
            stmt = stmt.join(BusinessPartner, BusinessPartner.id == PartnerCatalogPart.business_partner_id)
            stmt = stmt.join(CatalogPart, CatalogPart.id == PartnerCatalogPart.catalog_part_id)

        if join_legal_entity:
            stmt = stmt.join(LegalEntity, LegalEntity.id == CatalogPart.legal_entity_id)

        stmt = stmt.where(SerializedPart.twin_id == twin_id)
        return self._session.scalars(stmt).first()

    def find(self,
        manufacturer_id: Optional[str] = None,
        manufacturer_part_id: Optional[str] = None,
        business_partner_number: Optional[str] = None,
        customer_part_id: Optional[str] = None,
        part_instance_id: Optional[str] = None,
        van: Optional[str] = None) -> List[SerializedPart]:
        
        stmt = select(SerializedPart).join(
            PartnerCatalogPart, PartnerCatalogPart.id == SerializedPart.partner_catalog_part_id).join(
            CatalogPart, CatalogPart.id == PartnerCatalogPart.catalog_part_id).join(
            LegalEntity, LegalEntity.id == CatalogPart.legal_entity_id)

        if business_partner_number:
            stmt = stmt.join(BusinessPartner, BusinessPartner.id == PartnerCatalogPart.business_partner_id
                ).where(BusinessPartner.bpnl == business_partner_number)
        
        if manufacturer_id:
            stmt = stmt.where(LegalEntity.bpnl == manufacturer_id)

        if manufacturer_part_id:
            stmt = stmt.where(CatalogPart.manufacturer_part_id == manufacturer_part_id)
        
        if part_instance_id:
            stmt = stmt.where(SerializedPart.part_instance_id == part_instance_id)

        if van:
            stmt = stmt.where(SerializedPart.van == van)

        if customer_part_id:
            stmt = stmt.where(PartnerCatalogPart.customer_part_id == customer_part_id)

        return self._session.scalars(stmt).all()

    def find_with_status(self,
        manufacturer_id: Optional[str] = None,
        manufacturer_part_id: Optional[str] = None,
        business_partner_number: Optional[str] = None,
        customer_part_id: Optional[str] = None,
        part_instance_id: Optional[str] = None,
        van: Optional[str] = None) -> List[tuple[SerializedPart, int]]:
        """
        Find serialized parts with status information.
        The result is a list of tuples, where each tuple contains the SerializedPart object and its status.
        """
        
        # Case to determine the status of the serialized part
        status_expr = case(
            # 0: no twin at all (draft)
            (SerializedPart.twin_id.is_(None), 0),
            # 1: twin exists, but not yet DTR-registered (pending)
            (TwinRegistration.dtr_registered.is_(False), 1),
            # 2: DTR-registered but not yet in any TwinExchange row (registered)
            ((TwinRegistration.dtr_registered.is_(True)) & (TwinExchange.twin_id.is_(None)), 2),
            # 3: DTR-registered AND appears in TwinExchange (shared)
            ((TwinRegistration.dtr_registered.is_(True)) & (TwinExchange.twin_id.is_not(None)), 3),
            else_=0
        ).label("status")

        stmt = select(SerializedPart, status_expr).distinct(SerializedPart.id)
        
        stmt = stmt.join(PartnerCatalogPart, PartnerCatalogPart.id == SerializedPart.partner_catalog_part_id)
        stmt = stmt.join(CatalogPart, CatalogPart.id == PartnerCatalogPart.catalog_part_id)
        stmt = stmt.join(LegalEntity, LegalEntity.id == CatalogPart.legal_entity_id)
        
        stmt = stmt.outerjoin(TwinRegistration, TwinRegistration.twin_id == SerializedPart.twin_id)
        stmt = stmt.outerjoin(TwinExchange, TwinExchange.twin_id == SerializedPart.twin_id)

        if business_partner_number:
            stmt = stmt.join(BusinessPartner, BusinessPartner.id == PartnerCatalogPart.business_partner_id
                ).where(BusinessPartner.bpnl == business_partner_number)
        
        if manufacturer_id:
            stmt = stmt.where(LegalEntity.bpnl == manufacturer_id)

        if manufacturer_part_id:
            stmt = stmt.where(CatalogPart.manufacturer_part_id == manufacturer_part_id)
        
        if part_instance_id:
            stmt = stmt.where(SerializedPart.part_instance_id == part_instance_id)

        if van:
            stmt = stmt.where(SerializedPart.van == van)

        if customer_part_id:
            stmt = stmt.where(PartnerCatalogPart.customer_part_id == customer_part_id)

        return self._session.exec(stmt).all()

    def create_new(self, partner_catalog_part_id: int, part_instance_id: str, van: Optional[str]) -> SerializedPart:
        """Create a new SerializedPart instance."""
        serialized_part = SerializedPart(
            partner_catalog_part_id=partner_catalog_part_id,
            part_instance_id=part_instance_id,
            van=van
        )
        self.create(serialized_part)
        return serialized_part

class TwinRepository(BaseRepository[Twin]):
    def create_new(self, global_id: UUID = None, dtr_aas_id: UUID = None):
        """Create a new Twin instance with the given global_id and dtr_aas_id."""
        
        if global_id is None:
            global_id = uuid4()

        if dtr_aas_id is None:
            dtr_aas_id = uuid4()
        
        twin = Twin(
            global_id=global_id,
            dtr_aas_id=dtr_aas_id,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )
        self.create(twin)
        
        return twin
    
    def find_by_global_id(self, global_id: UUID) -> Optional[Twin]:
        stmt = select(Twin).where(
            Twin.global_id == global_id)
        return self._session.scalars(stmt).first()
    
    def find_by_aas_id(self, aas_id: UUID) -> Optional[Twin]:
        stmt = select(Twin).where(
            Twin.aas_id == aas_id)
        return self._session.scalars(stmt).first()
    
    def find_catalog_part_twins(self,
            manufacturer_id: Optional[str] = None,
            manufacturer_part_id: Optional[str] = None,
            global_id: Optional[UUID] = None,
            include_data_exchange_agreements: bool = False,
            include_aspects: bool = False,
            include_registrations: bool = False) -> List[Twin]:
        
        stmt = select(Twin).join(
            CatalogPart, CatalogPart.twin_id == Twin.id).join(
            LegalEntity, LegalEntity.id == CatalogPart.legal_entity_id
        ).distinct()

        stmt = self._apply_subquery_filters(stmt, include_data_exchange_agreements, include_aspects, include_registrations)

        if manufacturer_id:
            stmt = stmt.where(LegalEntity.bpnl == manufacturer_id)

        if manufacturer_part_id:
            stmt = stmt.where(CatalogPart.manufacturer_part_id == manufacturer_part_id)

        if global_id:
            stmt = stmt.where(Twin.global_id == global_id)

        return self._session.scalars(stmt).all()
    
    def find_serialized_part_twins(self,
            manufacturer_id: Optional[str] = None,
            manufacturer_part_id: Optional[str] = None,
            customer_part_id: Optional[str] = None,
            part_instance_id: Optional[str] = None,
            van: Optional[str] = None,
            business_partner_number: Optional[str] = None,
            global_id: Optional[UUID] = None,
            enablement_service_stack_id: Optional[int] = None,
            min_incl_created_date: Optional[datetime] = None,
            max_excl_created_date: Optional[datetime] = None,
            limit: int = 50,
            offset: int = 0,
            include_data_exchange_agreements: bool = False,
            include_aspects: bool = False,
            include_registrations: bool = False,
            include_all_partner_catalog_parts: bool = False) -> List[Twin]:
        
        stmt = select(Twin).join(
            SerializedPart, SerializedPart.twin_id == Twin.id).join(
            PartnerCatalogPart, PartnerCatalogPart.id == SerializedPart.partner_catalog_part_id).join(
            CatalogPart, CatalogPart.id == PartnerCatalogPart.catalog_part_id).join(
            LegalEntity, LegalEntity.id == CatalogPart.legal_entity_id
        ).distinct()

        stmt = self._apply_subquery_filters(stmt, include_data_exchange_agreements, include_aspects, include_registrations)

        if manufacturer_id:
            stmt = stmt.where(LegalEntity.bpnl == manufacturer_id)

        if manufacturer_part_id:
            stmt = stmt.where(CatalogPart.manufacturer_part_id == manufacturer_part_id)

        if customer_part_id:
            stmt = stmt.where(PartnerCatalogPart.customer_part_id == customer_part_id)

        if part_instance_id:
            stmt = stmt.where(SerializedPart.part_instance_id == part_instance_id)

        if van:
            stmt = stmt.where(SerializedPart.van == van)

        if global_id:
            stmt = stmt.where(Twin.global_id == global_id)

        if enablement_service_stack_id:
            stmt = stmt.join(
                TwinRegistration, TwinRegistration.twin_id == Twin.id
            ).where(
                TwinRegistration.enablement_service_stack_id == enablement_service_stack_id
            )

        if business_partner_number:
            stmt = stmt.join(BusinessPartner, BusinessPartner.id == PartnerCatalogPart.business_partner_id
                ).where(BusinessPartner.bpnl == business_partner_number)

        if include_all_partner_catalog_parts:
            subquery = select(PartnerCatalogPart).join(
                BusinessPartner, PartnerCatalogPart.business_partner_id == BusinessPartner.id
            ).subquery()
            stmt = stmt.join(subquery, subquery.c.catalog_part_id == CatalogPart.id, isouter=True)            

        if min_incl_created_date:
            stmt = stmt.where(Twin.created_date >= min_incl_created_date)

        if max_excl_created_date:
            stmt = stmt.where(Twin.created_date < max_excl_created_date)

        if limit or offset:
            stmt = stmt.order_by(desc(Twin.created_date))
            if offset:
                stmt = stmt.offset(offset)
            if limit:
                stmt = stmt.limit(limit)

        return self._session.scalars(stmt).all()

    @staticmethod
    def _apply_subquery_filters(stmt, include_data_exchange_agreements: bool, include_aspects: bool, include_registrations: bool):
        if include_data_exchange_agreements:
            subquery = select(TwinExchange).join(
                DataExchangeAgreement, TwinExchange.data_exchange_agreement_id == DataExchangeAgreement.id
            ).join(
                BusinessPartner, BusinessPartner.id == DataExchangeAgreement.business_partner_id
            ).subquery()
            stmt = stmt.join(subquery, subquery.c.twin_id == Twin.id, isouter=True)

        if include_registrations:
            stmt = stmt.options(selectinload(Twin.twin_registrations))
        
        if include_aspects:
            if include_registrations:
                stmt = stmt.options(selectinload(Twin.twin_aspects).selectinload(TwinAspect.twin_aspect_registrations))
            else:
                stmt = stmt.options(selectinload(Twin.twin_aspects))

        
        return stmt


class TwinAspectRepository(BaseRepository[TwinAspect]):
    def get_by_twin_id_semantic_id(self, twin_id: int, semantic_id: str, include_registrations: bool = False) -> Optional[TwinAspect]:
        """Retrieve a TwinAspect by its submodel_id."""
        stmt = select(TwinAspect).where(TwinAspect.twin_id == twin_id).where(TwinAspect.semantic_id == semantic_id)

        if include_registrations:
            stmt = stmt.join(
                TwinAspectRegistration, TwinAspectRegistration.twin_aspect_id == TwinAspect.id, isouter=True
            )

        return self._session.scalars(stmt).first()
    
    def get_by_twin_id_semantic_id_submodel_id(self, twin_id: int, semantic_id: str, submodel_id: UUID) -> Optional[TwinAspect]:
        """Retrieve a TwinAspect by its submodel_id."""
        stmt = select(TwinAspect).where(
            TwinAspect.twin_id == twin_id).where(
            TwinAspect.semantic_id == semantic_id).where(
            TwinAspect.submodel_id == submodel_id)
        return self._session.scalars(stmt).first()

    def create_new(self, twin_id: int, semantic_id: str, submodel_id: UUID = None) -> TwinAspect:
        """Create a new TwinAspect instance."""
        if not submodel_id:
            submodel_id = uuid4()
        
        twin_aspect = TwinAspect(
            submodel_id=submodel_id,
            semantic_id=semantic_id,
            twin_id=twin_id,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        self.create(twin_aspect)
        return twin_aspect


class TwinAspectRegistrationRepository(BaseRepository[TwinAspectRegistration]):
    def get_by_twin_aspect_id_enablement_service_stack_id(
        self, twin_aspect_id: int, enablement_service_stack_id: int
    ) -> Optional[TwinAspectRegistration]:
        """Retrieve a TwinAspectRegistration by twin_aspect_id and enablement_service_stack_id."""
        stmt = select(TwinAspectRegistration).where(
            TwinAspectRegistration.twin_aspect_id == twin_aspect_id
        ).where(
            TwinAspectRegistration.enablement_service_stack_id == enablement_service_stack_id
        )
        return self._session.scalars(stmt).first()

    def create_new(
        self,
        twin_aspect_id: int,
        enablement_service_stack_id: int,
        status: int = 0,
        registration_mode: int = 0,
    ) -> TwinAspectRegistration:
        """Create a new TwinAspectRegistration instance."""
        twin_aspect_registration = TwinAspectRegistration(
            twin_aspect_id=twin_aspect_id,
            enablement_service_stack_id=enablement_service_stack_id,
            status=status,
            registration_mode=registration_mode,
            created_at=datetime.now(timezone.utc),
            modified_date=datetime.now(timezone.utc),
        )
        self.create(twin_aspect_registration)
        return twin_aspect_registration

class TwinExchangeRepository(BaseRepository[TwinExchange]):
    def get_by_twin_id_data_exchange_agreement_id(self, twin_id: int, data_exchange_agreement_id: int) -> Optional[Twin]:
        stmt = select(TwinExchange).where(
            TwinExchange.twin_id == twin_id).where(
            TwinExchange.data_exchange_agreement_id == data_exchange_agreement_id
            )
        return self._session.scalars(stmt).first()
    
    def create_new(self, twin_id: int, data_exchange_agreement_id: int) -> TwinExchange:
        twin_exchange = TwinExchange(
            twin_id=twin_id,
            data_exchange_agreement_id=data_exchange_agreement_id
        )
        self.create(twin_exchange)
        return twin_exchange
    
    def find_by_global_id_business_partner_number(self, global_id: UUID, business_partner_number: str) -> Optional[TwinExchange]:
        stmt = select(TwinExchange).join(
            Twin, TwinExchange.twin_id == Twin.id
        ).join(
            DataExchangeAgreement, TwinExchange.data_exchange_agreement_id == DataExchangeAgreement.id
        ).join(
            BusinessPartner, BusinessPartner.id == DataExchangeAgreement.business_partner_id
        ).where(
            Twin.global_id == global_id,
            BusinessPartner.bpnl == business_partner_number
        )
        return self._session.scalars(stmt).first()  

class TwinRegistrationRepository(BaseRepository[TwinRegistration]):
    def get_by_twin_id_enablement_service_stack_id(self, twin_id: int, enablement_service_stack_id: int) -> Optional[TwinRegistration]:
        stmt = select(TwinRegistration).where(
            TwinRegistration.twin_id == twin_id).where(
            TwinRegistration.enablement_service_stack_id == enablement_service_stack_id)
        return self._session.scalars(stmt).first()
    
    def create_new(self, twin_id: int, enablement_service_stack_id: int, dtr_registered: bool = False) -> TwinRegistration:
        twin_registration = TwinRegistration(
            twin_id=twin_id,
            enablement_service_stack_id=enablement_service_stack_id,
            dtr_registered=dtr_registered
        )
        self.create(twin_registration)
        return twin_registration

class NotificationRepository(BaseRepository[NotificationEntity]):
    """
    Repository for managing Industry Core Notifications.
    """
    
    def create_new(
        self, 
        notification: Notification, 
        direction: NotificationDirection,
        status: NotificationStatus = NotificationStatus.PENDING,
        use_case: str = None,
        location: str = ""
    ) -> NotificationEntity:
        """
        Creates a new NotificationEntity from an SDK model (passed as a dict),
        the specific flow direction, and an optional use_case/category.
        """
        db_notification = NotificationEntity.from_sdk(
            notification=notification, 
            direction=direction, 
            status=status,
            use_case=use_case,
            location=location
        )
        self.create(db_notification)
        # Flush so the DB assigns the auto-increment ``id`` (and any other
        # server-side defaults) while the session is still open, then expunge
        # the instance from the session identity-map.  This transitions it to a
        # "detached but not expired" state: all in-memory attribute values
        # (message_id, sender_bpn, …) are preserved and readable after the
        # session is committed and closed by the RepositoryManager context
        # manager.  Without expunge, SQLAlchemy would expire every attribute on
        # commit and raise DetachedInstanceError the moment the caller probes
        # any field after the ``with`` block exits.
        self._session.flush()
        self._session.expunge(db_notification)
        return db_notification

    def find_by_message_id(self, message_id: UUID) -> Optional[NotificationEntity]:
        """Find a notification by its unique Catena-X messageId."""
        stmt = select(NotificationEntity).where(
            NotificationEntity.message_id == message_id
        )
        return self._session.scalars(stmt).first()

    def find_by_bpn(
        self, 
        bpn: str, 
        direction: Optional[NotificationDirection] = None,
        status: Optional[NotificationStatus] = None,
        use_case: Optional[str] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[NotificationEntity]:
        """
        Retrieves notifications related to a specific Business Partner.
        Useful for 'Inbox' (Incoming) or 'Sent' (Outgoing) views.
        Optionally filter by use_case/category.
        """
        stmt = select(NotificationEntity)
        
        # Filter by BPN: If incoming, we are the receiver. If outgoing, we are the sender.
        if direction == NotificationDirection.INCOMING:
            stmt = stmt.where(NotificationEntity.receiver_bpn == bpn)
        elif direction == NotificationDirection.OUTGOING:
            stmt = stmt.where(NotificationEntity.sender_bpn == bpn)
        else:
            # If direction isn't specified, find any interaction with this BPN
            stmt = stmt.where(
                (NotificationEntity.sender_bpn == bpn) | 
                (NotificationEntity.receiver_bpn == bpn)
            )

        if status:
            stmt = stmt.where(NotificationEntity.status == status)

        if use_case:
            stmt = stmt.where(NotificationEntity.use_case == use_case)

        # Order by newest first
        stmt = stmt.order_by(desc(NotificationEntity.created_at)).offset(offset).limit(limit)
        
        return list(self._session.scalars(stmt).all())

    def update_status(self, message_id: UUID, new_status: NotificationStatus) -> Optional[NotificationEntity]:
        """Update the lifecycle status of a notification."""
        db_obj = self.find_by_message_id(message_id)
        if not db_obj:
            return None
        
        db_obj.status = new_status
        self._session.add(db_obj)
        return db_obj

    def delete_by_message_id(self, message_id: UUID) -> bool:
        """Delete a notification by its messageId. Returns True if deleted, False if not found."""
        db_obj = self.find_by_message_id(message_id)
        if not db_obj:
            return False
        
        self.delete_obj(db_obj)
        return True
    
class PCFRepository(BaseRepository[PcfExchangeEntity]):
    """
    Repository for managing PCF (Product Carbon Footprint) exchange records.
    """

    def create_new(
        self,
        requesting_bpn: str,
        direction: PcfExchangeDirection,
        type: PcfExchangeType,
        responding_bpn: Optional[str] = None,
        manufacturer_part_id: Optional[str] = None,
        customer_part_id: Optional[str] = None,
        status: PcfExchangeStatus = PcfExchangeStatus.PENDING,
        message: Optional[str] = None,
        pcf_location: Optional[str] = None,
        correlation_id: Optional[str] = None,
        request_id: Optional[UUID] = None,
    ) -> PcfExchangeEntity:
        """
        Creates a new PCF exchange record.

        Args:
            requesting_bpn: BPN of the party requesting PCF data.
            direction: Direction of exchange (incoming/outgoing).
            responding_bpn: BPN of the data provider (optional).
            manufacturer_part_id: Manufacturer's part identifier (optional).
            customer_part_id: Customer's part identifier (optional).
            status: Initial status (defaults to PENDING).
            message: Optional message for the exchange.
            pcf_location: URI/path where PCF payload is stored.
            correlation_id: Optional external correlation ID.
            request_id: Optional UUID for the request (auto-generated if not provided).

        Returns:
            The created PcfExchangeEntity.
        """
        now = datetime.now(timezone.utc)
        pcf_exchange = PcfExchangeEntity(
            request_id=request_id or uuid4(),
            requesting_bpn=requesting_bpn,
            responding_bpn=responding_bpn,
            direction=direction,
            status=status,
            type=type,
            manufacturer_part_id=manufacturer_part_id,
            customer_part_id=customer_part_id,
            message=message,
            pcf_location=pcf_location,
            correlation_id=correlation_id,
            created_at=now,
            updated_at=now,
        )
        self.create(pcf_exchange)
        return pcf_exchange

    def find_by_request_id(self, request_id: UUID, type: Optional[PcfExchangeType] = None) -> Optional[PcfExchangeEntity]:
        """Find a PCF exchange by its unique request ID."""
        stmt = select(PcfExchangeEntity).where(
            PcfExchangeEntity.request_id == request_id
        )
        if type:
            stmt = stmt.where(PcfExchangeEntity.type == type)
        return self._session.scalars(stmt).first()

    def find_by_bpn(
        self,
        bpn: str,
        direction: Optional[PcfExchangeDirection] = None,
        status: Optional[PcfExchangeStatus] = None,
        manufacturer_part_id: Optional[str] = None,
        customer_part_id: Optional[str] = None,
        type: Optional[PcfExchangeType] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> List[PcfExchangeEntity]:
        """
        Retrieves PCF exchanges related to a specific Business Partner.

        Args:
            bpn: Business Partner Number to filter by.
            direction: Filter by exchange direction (optional).
            status: Filter by exchange status (optional).
            manufacturer_part_id: Filter by manufacturer part ID (optional).
            customer_part_id: Filter by customer part ID (optional).
            type: Filter by exchange type (optional).
            limit: Maximum number of results.
            offset: Number of results to skip.

        Returns:
            List of matching PcfExchangeEntity records.
        """
        stmt = select(PcfExchangeEntity)

        # Filter by BPN based on direction and type
        if direction == PcfExchangeDirection.OUTGOING:
            if type == PcfExchangeType.RESPONSE:
                # We are responding (provider sending a response)
                stmt = stmt.where(PcfExchangeEntity.responding_bpn == bpn)
            else:
                # We are requesting (consumer sending a request)
                stmt = stmt.where(PcfExchangeEntity.requesting_bpn == bpn)
        elif direction == PcfExchangeDirection.INCOMING:
            if type == PcfExchangeType.RESPONSE:
                # We received a response (consumer received a response)
                stmt = stmt.where(PcfExchangeEntity.requesting_bpn == bpn)
            else:
                # We received a request (provider received a request)
                stmt = stmt.where(PcfExchangeEntity.responding_bpn == bpn)
        else:
            # Any interaction with this BPN
            stmt = stmt.where(
                (PcfExchangeEntity.requesting_bpn == bpn) |
                (PcfExchangeEntity.responding_bpn == bpn)
            )

        if direction:
            stmt = stmt.where(PcfExchangeEntity.direction == direction)

        if status:
            stmt = stmt.where(PcfExchangeEntity.status == status)

        if manufacturer_part_id:
            stmt = stmt.where(PcfExchangeEntity.manufacturer_part_id == manufacturer_part_id)

        if customer_part_id:
            stmt = stmt.where(PcfExchangeEntity.customer_part_id == customer_part_id)

        if type:
            stmt = stmt.where(PcfExchangeEntity.type == type)

        # Order by newest first
        stmt = stmt.order_by(desc(PcfExchangeEntity.created_at)).offset(offset).limit(limit)

        return list(self._session.scalars(stmt).all())

    def find_by_part_id(
        self,
        manufacturer_part_id: Optional[str] = None,
        customer_part_id: Optional[str] = None,
        status: Optional[PcfExchangeStatus] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> List[PcfExchangeEntity]:
        """
        Find PCF exchanges by part identifier(s).

        Args:
            manufacturer_part_id: Filter by manufacturer part ID (optional).
            customer_part_id: Filter by customer part ID (optional).
            status: Filter by exchange status (optional).
            limit: Maximum number of results.
            offset: Number of results to skip.

        Returns:
            List of matching PcfExchangeEntity records.
        """
        stmt = select(PcfExchangeEntity)

        if manufacturer_part_id:
            stmt = stmt.where(PcfExchangeEntity.manufacturer_part_id == manufacturer_part_id)

        if customer_part_id:
            stmt = stmt.where(PcfExchangeEntity.customer_part_id == customer_part_id)

        if status:
            stmt = stmt.where(PcfExchangeEntity.status == status)

        stmt = stmt.order_by(desc(PcfExchangeEntity.created_at)).offset(offset).limit(limit)

        return list(self._session.scalars(stmt).all())

    def find_by_correlation_id(self, correlation_id: str) -> Optional[PcfExchangeEntity]:
        """Find a PCF exchange by its external correlation ID."""
        stmt = select(PcfExchangeEntity).where(
            PcfExchangeEntity.correlation_id == correlation_id
        )
        return self._session.scalars(stmt).first()

    def update_status(
        self,
        request_id: UUID,
        new_status: PcfExchangeStatus,
        type: PcfExchangeType,
        message: Optional[str] = None,
    ) -> Optional[PcfExchangeEntity]:
        """
        Update the status of a PCF exchange.

        Args:
            request_id: The unique request ID.
            new_status: The new status to set.
            message: Optional message to update (e.g., error details).

        Returns:
            The updated PcfExchangeEntity, or None if not found.
        """
        db_obj = self.find_by_request_id(request_id, type=type)
        if not db_obj:
            return None

        db_obj.status = new_status
        db_obj.updated_at = datetime.now(timezone.utc)
        if message is not None:
            db_obj.message = message

        self._session.add(db_obj)
        return db_obj

    def update_pcf_location(
        self,
        request_id: UUID,
        type: PcfExchangeType,
        pcf_location: str,
    ) -> Optional[PcfExchangeEntity]:
        """
        Update the PCF data location for an exchange.

        Args:
            request_id: The unique request ID.
            pcf_location: The URI/path where PCF data is stored.

        Returns:
            The updated PcfExchangeEntity, or None if not found.
        """
        db_obj = self.find_by_request_id(request_id, type=type)
        if not db_obj:
            return None

        db_obj.pcf_location = pcf_location
        db_obj.updated_at = datetime.now(timezone.utc)

        self._session.add(db_obj)
        return db_obj

    def delete_by_request_id(self, request_id: UUID) -> bool:
        """
        Delete a PCF exchange by its request ID.

        Args:
            request_id: The unique request ID.

        Returns:
            True if deleted, False if not found.
        """
        db_obj = self.find_by_request_id(request_id)
        if not db_obj:
            return False

        self.delete_obj(db_obj)
        return True

class PCFRelationshipRepository(BaseRepository[PcfRelationshipEntity]):
    """
    Repository for managing relationships between our PCF and other entities.
    """

    def create_new(
        self,
        main_manufacturer_part_id: str,
        list_sub_manufacturer_part_ids: List[str]
    ) -> PcfRelationshipEntity:
        pcf_relationship = PcfRelationshipEntity(
            main_manufacturer_part_id=main_manufacturer_part_id,
            list_sub_manufacturer_part_id=list_sub_manufacturer_part_ids
        )
        self.create(pcf_relationship)
        return pcf_relationship
    
    def find_by_main_manufacturer_part_id(self, main_manufacturer_part_id: str) -> Optional[PcfRelationshipEntity]:
        stmt = select(PcfRelationshipEntity).where(
            PcfRelationshipEntity.main_manufacturer_part_id == main_manufacturer_part_id
        )
        return self._session.scalars(stmt).first()
    
    def add_sub_manufacturer_part_id(self, main_manufacturer_part_id: str, sub_manufacturer_part_id: str) -> Optional[PcfRelationshipEntity]:
        """Add a sub manufacturer part ID to the list for a given main manufacturer part ID."""
        relationship = self.find_by_main_manufacturer_part_id(main_manufacturer_part_id)
        if relationship and sub_manufacturer_part_id not in relationship.list_sub_manufacturer_part_id:
            relationship.list_sub_manufacturer_part_id.append(sub_manufacturer_part_id)
            # Flag the list as modified so SQLAlchemy tracks the change to the JSON column
            flag_modified(relationship, "list_sub_manufacturer_part_id")
            self._session.add(relationship)
            return relationship
        return None


class CcmRepository(BaseRepository[Ccm]):
    """
    Repository for Company Certificate Management (CCM) records.

    Provides targeted query methods on top of the generic BaseRepository
    operations for the Ccm entity.
    """

    def create_new(
        self,
        bpnl: str,
        certificate_type: str,
        issuer: str,
        valid_from: date,
        trust_level: TrustLevel = TrustLevel.none,
        certificate_name: Optional[str] = None,
        registration_number: Optional[str] = None,
        area_of_application: Optional[str] = None,
        valid_until: Optional[date] = None,
        validator: Optional[str] = None,
        uploader_bpnl: Optional[str] = None,
        description: Optional[str] = None,
        doc: Optional[bytes] = None,
    ) -> Ccm:
        """
        Persist a new CCM certificate record.

        Args:
            bpnl: BPNL of the certificate holder.
            certificate_type: Certificate type identifier (e.g. ISO9001).
            issuer: Certification body or authority.
            valid_from: Start date of the certificate's validity period.
            trust_level: Assigned trust level (default: none).
            certificate_name: Optional human-readable display name.
            registration_number: Official certificate registration/serial number.
            area_of_application: Textual scope of the certificate.
            valid_until: Optional expiry date.
            validator: BPN or URL of the third-party validator.
            uploader_bpnl: BPNL of the participant who uploaded the certificate.
            description: Free-text notes.
            doc: Raw PDF bytes (BYTEA in PostgreSQL).

        Returns:
            Ccm: The newly created, unsaved record (caller must commit).
        """
        ccm = Ccm(
            bpnl=bpnl,
            certificate_type=certificate_type,
            issuer=issuer,
            valid_from=valid_from,
            trust_level=trust_level,
            certificate_name=certificate_name,
            registration_number=registration_number,
            area_of_application=area_of_application,
            valid_until=valid_until,
            validator=validator,
            uploader_bpnl=uploader_bpnl,
            description=description,
            doc=doc,
        )
        self.create(ccm)
        return ccm

    def find_by_id_with_relations(self, ccm_id: int) -> Optional[Ccm]:
        """
        Fetch a single Ccm record with its ``sites`` and ``shares`` eagerly
        loaded in one query, avoiding N+1 issues.
        """
        stmt = (
            select(Ccm)
            .where(Ccm.id == ccm_id)
            .options(
                selectinload(Ccm.sites),
                selectinload(Ccm.shares),
            )
        )
        return self._session.scalars(stmt).first()

    def find_by_edc_asset_id(self, edc_asset_id: str) -> Optional[Ccm]:
        """
        Fetch a single Ccm record by its EDC asset ID, with ``sites`` and
        ``shares`` eagerly loaded.

        Used when a consumer sends a status notification whose ``documentId``
        is the EDC asset ID string rather than the integer primary key.
        """
        stmt = (
            select(Ccm)
            .where(Ccm.edc_asset_id == edc_asset_id)
            .options(
                selectinload(Ccm.sites),
                selectinload(Ccm.shares),
            )
        )
        return self._session.scalars(stmt).first()

    def find_published(self) -> List[Ccm]:
        """
        Return all certificates that have an EDC asset registered
        (i.e. ``edc_asset_id IS NOT NULL``), ordered newest first.
        Relations are not loaded to keep the list lightweight.
        """
        stmt = (
            select(Ccm)
            .where(Ccm.edc_asset_id.isnot(None))
            .order_by(desc(Ccm.created_at))
        )
        return list(self._session.scalars(stmt).all())

    def find_by_bpnl_and_type(
        self, bpnl: str, certificate_type: str
    ) -> Optional[Ccm]:
        """
        Find the most recent certificate matching a given BPNL and type.

        Eagerly loads ``sites`` and ``shares`` relationships.  Returns the
        newest record (by ``created_at``) or ``None`` if no match exists.

        Args:
            bpnl: Business Partner Number Legal of the certificate holder.
            certificate_type: Certificate type identifier (e.g. ISO9001).

        Returns:
            The matching Ccm record with relations, or None.
        """
        stmt = (
            select(Ccm)
            .where(Ccm.bpnl == bpnl, Ccm.certificate_type == certificate_type)
            .options(
                selectinload(Ccm.sites),
                selectinload(Ccm.shares),
            )
            .order_by(desc(Ccm.created_at))
            .limit(1)
        )
        return self._session.scalars(stmt).first()

    def find_all_filtered(
        self,
        bpnl: Optional[str] = None,
        certificate_type: Optional[str] = None,
        offset: int = 0,
        limit: int = 100,
    ) -> List[Ccm]:
        """
        Return a paginated list of certificates, optionally filtered by BPNL
        and/or certificate type.  Sites and shares are NOT loaded here to keep
        list responses lightweight.
        """
        stmt = select(Ccm).order_by(desc(Ccm.created_at))

        if bpnl:
            stmt = stmt.where(Ccm.bpnl == bpnl)
        if certificate_type:
            stmt = stmt.where(Ccm.certificate_type == certificate_type)

        stmt = stmt.offset(offset).limit(limit)
        return list(self._session.scalars(stmt).all())

    def update_fields(self, ccm_id: int, fields: dict) -> Optional[Ccm]:
        """
        Apply a partial update to an existing Ccm record.

        Args:
            ccm_id: Primary key of the record to update.
            fields: Dictionary of column-name → new-value pairs.

        Returns:
            The updated Ccm record, or None if not found.
        """
        db_obj = self._session.get(Ccm, ccm_id)
        if db_obj is None:
            return None

        # Always refresh the updated_at timestamp on any write.
        fields["updated_at"] = datetime.now(timezone.utc)

        for key, value in fields.items():
            if hasattr(db_obj, key):
                setattr(db_obj, key, value)

        self._session.add(db_obj)
        return db_obj

    def delete_by_id(self, ccm_id: int) -> bool:
        """
        Delete a Ccm record by primary key.

        Returns:
            True if the record was found and deleted, False otherwise.
        """
        db_obj = self._session.get(Ccm, ccm_id)
        if db_obj is None:
            return False
        self._session.delete(db_obj)
        return True


class CcmSiteRepository(BaseRepository[CcmSite]):
    """
    Repository for CcmSite entities (BPNS/BPNA sites linked to a certificate).
    """

    def create_new(self, ccm_id: int, site_bpn: str) -> CcmSite:
        """
        Create and stage a new CcmSite record.

        Args:
            ccm_id: FK of the parent certificate.
            site_bpn: BPNS or BPNA value.

        Returns:
            The staged (unsaved) CcmSite instance.
        """
        site = CcmSite(ccm_id=ccm_id, site_bpn=site_bpn)
        self.create(site)
        return site

    def find_by_ccm_id(self, ccm_id: int) -> List[CcmSite]:
        """Return all sites associated with the given certificate ID."""
        stmt = select(CcmSite).where(CcmSite.ccm_id == ccm_id)
        return list(self._session.scalars(stmt).all())

    def delete_by_ccm_id(self, ccm_id: int) -> int:
        """
        Remove all site rows for a given certificate.

        Returns:
            Number of rows deleted.
        """
        sites = self.find_by_ccm_id(ccm_id)
        for site in sites:
            self._session.delete(site)
        return len(sites)


class CertificateShareRepository(BaseRepository[CertificateShare]):
    """
    Repository for CertificateShare entities (sharing-history records).
    """

    def create_new(
        self,
        certificate_id: int,
        consumer_bpnl: str,
        status: ShareStatus = ShareStatus.Pending,
    ) -> CertificateShare:
        """
        Stage a new sharing record for a certificate.

        Args:
            certificate_id: FK of the certificate being shared.
            consumer_bpnl: BPNL of the recipient.
            status: Initial status (default: Pending).

        Returns:
            The staged (unsaved) CertificateShare instance.
        """
        share = CertificateShare(
            certificate_id=certificate_id,
            consumer_bpnl=consumer_bpnl,
            status=status,
        )
        self.create(share)
        return share

    def find_by_certificate_id(self, certificate_id: int) -> List[CertificateShare]:
        """Return all sharing records for a given certificate."""
        stmt = (
            select(CertificateShare)
            .where(CertificateShare.certificate_id == certificate_id)
            .order_by(desc(CertificateShare.last_shared_date))
        )
        return list(self._session.scalars(stmt).all())

    def find_by_consumer_bpnl(self, consumer_bpnl: str) -> List[CertificateShare]:
        """Return all sharing records for a given consumer BPNL."""
        stmt = (
            select(CertificateShare)
            .where(CertificateShare.consumer_bpnl == consumer_bpnl)
            .order_by(desc(CertificateShare.last_shared_date))
        )
        return list(self._session.scalars(stmt).all())

    def find_by_certificate_and_consumer(
        self, certificate_id: int, consumer_bpnl: str
    ) -> Optional[CertificateShare]:
        """
        Look up an existing share record for a specific certificate/consumer pair.

        Args:
            certificate_id: FK of the certificate.
            consumer_bpnl: BPNL of the consumer.

        Returns:
            The matching CertificateShare, or None if not found.
        """
        stmt = (
            select(CertificateShare)
            .where(
                CertificateShare.certificate_id == certificate_id,
                CertificateShare.consumer_bpnl == consumer_bpnl,
            )
        )
        return self._session.scalars(stmt).first()

    def update_status(
        self, share_id: int, new_status: ShareStatus
    ) -> Optional[CertificateShare]:
        """
        Update the lifecycle status of a sharing record.

        Returns:
            The updated record, or None if not found.
        """
        db_obj = self._session.get(CertificateShare, share_id)
        if db_obj is None:
            return None
        db_obj.status = new_status
        db_obj.last_shared_date = datetime.now(timezone.utc)
        self._session.add(db_obj)
        return db_obj

    def find_all_paginated(
        self, offset: int = 0, limit: int = 100
    ) -> List[CertificateShare]:
        """Return all sharing records with pagination, newest first."""
        stmt = (
            select(CertificateShare)
            .order_by(desc(CertificateShare.last_shared_date))
            .offset(offset)
            .limit(limit)
        )
        return list(self._session.scalars(stmt).all())


class CcmReceivedRepository(BaseRepository[CcmReceived]):
    """
    Repository for CcmReceived entities — certificates received via PUSH.
    """

    def create_new(
        self,
        document_id: str,
        provider_bpn: str,
        certified_bpn: str,
        certificate_type: str,
        **kwargs,
    ) -> CcmReceived:
        """
        Stage a new received-certificate record.

        Args:
            document_id: Provider-assigned document reference ID.
            provider_bpn: BPNL of the provider that pushed the certificate.
            certified_bpn: BPNL of the certified legal entity.
            certificate_type: Certificate type identifier.
            **kwargs: Optional fields (certificate_version, issuer_name, etc.).

        Returns:
            The staged CcmReceived instance.
        """
        received = CcmReceived(
            document_id=document_id,
            provider_bpn=provider_bpn,
            certified_bpn=certified_bpn,
            certificate_type=certificate_type,
            **kwargs,
        )
        self.create(received)
        return received

    def find_by_document_id(
        self, document_id: str, provider_bpn: Optional[str] = None,
    ) -> Optional[CcmReceived]:
        """Look up a received certificate by its provider-assigned document ID.

        Args:
            document_id: The provider-assigned document reference ID.
            provider_bpn: Optional BPNL of the provider.  When supplied the
                lookup uses the composite unique key ``(document_id,
                provider_bpn)`` for an exact match.
        """
        stmt = select(CcmReceived).where(CcmReceived.document_id == document_id)
        if provider_bpn is not None:
            stmt = stmt.where(CcmReceived.provider_bpn == provider_bpn)
        return self._session.scalars(stmt).first()

    def find_by_provider_bpn(
        self, provider_bpn: str, offset: int = 0, limit: int = 100
    ) -> List[CcmReceived]:
        """Return all certificates received from a given provider."""
        stmt = (
            select(CcmReceived)
            .where(CcmReceived.provider_bpn == provider_bpn)
            .order_by(desc(CcmReceived.received_at))
            .offset(offset)
            .limit(limit)
        )
        return list(self._session.scalars(stmt).all())

    def find_all_filtered(
        self,
        certified_bpn: Optional[str] = None,
        certificate_type: Optional[str] = None,
        offset: int = 0,
        limit: int = 100,
    ) -> List[CcmReceived]:
        """Return received certificates with optional filters."""
        stmt = select(CcmReceived)
        if certified_bpn:
            stmt = stmt.where(CcmReceived.certified_bpn == certified_bpn)
        if certificate_type:
            stmt = stmt.where(CcmReceived.certificate_type == certificate_type)
        stmt = stmt.order_by(desc(CcmReceived.received_at)).offset(offset).limit(limit)
        return list(self._session.scalars(stmt).all())

    def find_by_id(self, received_id: int) -> Optional[CcmReceived]:
        """
        Look up a received certificate by primary key.

        Args:
            received_id: Primary key of the CcmReceived record.

        Returns:
            The matching CcmReceived instance, or None if not found.
        """
        return self._session.get(CcmReceived, received_id)

    def update_local_status(
        self,
        document_id: str,
        provider_bpn: str,
        new_status: ReceivedCertificateStatus,
    ) -> Optional[CcmReceived]:
        """
        Update the consumer-local processing status of a received certificate.

        Uses the composite unique key ``(document_id, provider_bpn)`` to
        locate the record.

        Args:
            document_id: Provider-assigned document reference ID.
            provider_bpn: BPNL of the originating provider.
            new_status: New ReceivedCertificateStatus value to apply.

        Returns:
            The updated CcmReceived record, or None if not found.
        """
        record = self.find_by_document_id(document_id, provider_bpn)
        if record is None:
            return None
        record.local_status = new_status
        record.status_updated_at = datetime.now(timezone.utc)
        self._session.add(record)
        return record


class CcmOutboundRequestRepository(BaseRepository[CcmOutboundRequest]):
    """
    Repository for CcmOutboundRequest entities — certificate requests sent
    by this node to remote providers.
    """

    def create_new(
        self,
        sender_bpn: str,
        provider_bpn: str,
        certified_bpn: str,
        certificate_type: str,
        **kwargs,
    ) -> CcmOutboundRequest:
        """
        Stage a new outbound-request record.

        Args:
            sender_bpn: BPNL of this node.
            provider_bpn: BPNL of the remote provider.
            certified_bpn: BPNL of the certificate holder being requested.
            certificate_type: Certificate type identifier.
            **kwargs: Optional fields (location_bpns, governance,
                      notification_id, document_id, status).

        Returns:
            The staged CcmOutboundRequest instance.
        """
        request = CcmOutboundRequest(
            sender_bpn=sender_bpn,
            provider_bpn=provider_bpn,
            certified_bpn=certified_bpn,
            certificate_type=certificate_type,
            **kwargs,
        )
        self.create(request)
        return request

    def find_by_id(self, request_id: int) -> Optional[CcmOutboundRequest]:
        """
        Look up an outbound request by primary key.

        Args:
            request_id: Primary key of the CcmOutboundRequest record.

        Returns:
            The matching CcmOutboundRequest instance, or None if not found.
        """
        return self._session.get(CcmOutboundRequest, request_id)

    def find_all_filtered(
        self,
        provider_bpn: Optional[str] = None,
        certified_bpn: Optional[str] = None,
        certificate_type: Optional[str] = None,
        status: Optional[OutboundRequestStatus] = None,
        offset: int = 0,
        limit: int = 100,
    ) -> List[CcmOutboundRequest]:
        """
        Return outbound requests with optional filters.

        Args:
            provider_bpn: Filter by provider BPNL.
            certified_bpn: Filter by certified entity BPNL.
            certificate_type: Filter by certificate type.
            status: Filter by OutboundRequestStatus.
            offset: Pagination offset.
            limit: Maximum number of records to return.

        Returns:
            List of matching CcmOutboundRequest records, newest first.
        """
        stmt = select(CcmOutboundRequest)
        if provider_bpn:
            stmt = stmt.where(CcmOutboundRequest.provider_bpn == provider_bpn)
        if certified_bpn:
            stmt = stmt.where(CcmOutboundRequest.certified_bpn == certified_bpn)
        if certificate_type:
            stmt = stmt.where(CcmOutboundRequest.certificate_type == certificate_type)
        if status:
            stmt = stmt.where(CcmOutboundRequest.status == status)
        stmt = stmt.order_by(desc(CcmOutboundRequest.requested_at)).offset(offset).limit(limit)
        return list(self._session.scalars(stmt).all())

    def find_latest_per_combo(
        self,
        provider_bpn: Optional[str] = None,
        certified_bpn: Optional[str] = None,
        certificate_type: Optional[str] = None,
        status: Optional[OutboundRequestStatus] = None,
        offset: int = 0,
        limit: int = 100,
    ) -> List[CcmOutboundRequest]:
        """
        Return only the most recent outbound request per unique
        ``(provider_bpn, certified_bpn, certificate_type)`` combination.

        This gives a deduplicated "current state" view — one row per
        certificate of interest — while the full history is preserved in
        the database and accessible via ``find_all_filtered()``.

        Args:
            provider_bpn: Optional filter by provider BPNL.
            certified_bpn: Optional filter by certified entity BPNL.
            certificate_type: Optional filter by certificate type.
            status: Optional filter by OutboundRequestStatus.
            offset: Pagination offset.
            limit: Maximum number of records to return.

        Returns:
            List of the newest CcmOutboundRequest per combination,
            ordered by ``requested_at`` descending.
        """
        # Subquery: max(id) per combo key — id is monotonically increasing,
        # so max(id) equals the most recently inserted row per group.
        latest_ids = (
            select(func.max(CcmOutboundRequest.id).label("max_id"))
            .group_by(
                CcmOutboundRequest.provider_bpn,
                CcmOutboundRequest.certified_bpn,
                CcmOutboundRequest.certificate_type,
            )
            .subquery()
        )
        stmt = select(CcmOutboundRequest).where(
            CcmOutboundRequest.id.in_(select(latest_ids.c.max_id))
        )
        if provider_bpn:
            stmt = stmt.where(CcmOutboundRequest.provider_bpn == provider_bpn)
        if certified_bpn:
            stmt = stmt.where(CcmOutboundRequest.certified_bpn == certified_bpn)
        if certificate_type:
            stmt = stmt.where(CcmOutboundRequest.certificate_type == certificate_type)
        if status:
            stmt = stmt.where(CcmOutboundRequest.status == status)
        stmt = stmt.order_by(desc(CcmOutboundRequest.requested_at)).offset(offset).limit(limit)
        return list(self._session.scalars(stmt).all())

    def update_status(
        self,
        request_id: int,
        new_status: OutboundRequestStatus,
        document_id: Optional[str] = None,
    ) -> Optional[CcmOutboundRequest]:
        """
        Update the status of an outbound request.

        Args:
            request_id: Primary key of the record to update.
            new_status: New OutboundRequestStatus value.
            document_id: Optional provider document ID to store for correlation.

        Returns:
            The updated record, or None if not found.
        """
        record = self._session.get(CcmOutboundRequest, request_id)
        if record is None:
            return None
        record.status = new_status
        record.updated_at = datetime.now(timezone.utc)
        if document_id is not None:
            record.document_id = document_id
        self._session.add(record)
        return record

    def find_pending_by_match(
        self,
        provider_bpn: str,
        certified_bpn: str,
        certificate_type: str,
    ) -> List[CcmOutboundRequest]:
        """
        Return all Pending outbound requests for the given
        (provider_bpn, certified_bpn, certificate_type) combination.

        Used to correlate an incoming PUSH notification with the request(s)
        that originally triggered it, so their status can be advanced to
        Found atomically when the certificate is stored.
        """
        stmt = (
            select(CcmOutboundRequest)
            .where(CcmOutboundRequest.provider_bpn == provider_bpn)
            .where(CcmOutboundRequest.certified_bpn == certified_bpn)
            .where(CcmOutboundRequest.certificate_type == certificate_type)
            .where(CcmOutboundRequest.status == OutboundRequestStatus.Pending)
            .order_by(desc(CcmOutboundRequest.requested_at))
        )
        return list(self._session.scalars(stmt).all())

    def find_active_by_provider_and_type(
        self,
        provider_bpn: str,
        certificate_type: str,
        certified_bpn: Optional[str] = None,
    ) -> List[CcmOutboundRequest]:
        """
        Return all Pending and NotFound outbound requests for the given
        (provider_bpn, certificate_type) combination.

        Used when the provider sends a Certificate Available notification
        (PULL mechanism) so the consumer can advance those requests to
        Found and store the documentId.  Both statuses are included because
        the provider may have initially responded with "NotFound" and only
        later published the certificate.

        Args:
            provider_bpn: BPNL of the remote provider.
            certificate_type: Certificate type identifier.
            certified_bpn: Optional BPNL of the certified entity.  When
                provided the query is narrowed to an exact match on all
                three natural-key columns.

        Returns:
            List of matching CcmOutboundRequest records, newest first.
        """
        stmt = (
            select(CcmOutboundRequest)
            .where(CcmOutboundRequest.provider_bpn == provider_bpn)
            .where(CcmOutboundRequest.certificate_type == certificate_type)
        )
        if certified_bpn is not None:
            stmt = stmt.where(
                CcmOutboundRequest.certified_bpn == certified_bpn
            )
        stmt = (
            stmt
            .where(
                or_(
                    CcmOutboundRequest.status.in_(
                        [OutboundRequestStatus.Pending, OutboundRequestStatus.NotFound]
                    ),
                    # Also update Found records that are missing a documentId
                    # (e.g. request was correlated via push response but no
                    # documentId was recorded; the Available notification fills it in)
                    and_(
                        CcmOutboundRequest.status == OutboundRequestStatus.Found,
                        CcmOutboundRequest.document_id.is_(None),
                    ),
                )
            )
            .order_by(desc(CcmOutboundRequest.requested_at))
        )
        return list(self._session.scalars(stmt).all())


# ---------------------------------------------------------------------------
# Inbound certificate request repository (provider-side)
# ---------------------------------------------------------------------------

class CcmInboundRequestRepository(BaseRepository[CcmInboundRequest]):
    """
    Repository for CcmInboundRequest entities — certificate requests received
    by this node from external consumers.
    """

    def create_new(
        self,
        consumer_bpn: str,
        certified_bpn: str,
        certificate_type: str,
        status: InboundRequestStatus,
        **kwargs,
    ) -> CcmInboundRequest:
        """
        Persist a new inbound-request record.

        Args:
            consumer_bpn: BPNL of the requesting consumer.
            certified_bpn: BPNL of the legal entity whose certificate was requested.
            certificate_type: Certificate type identifier.
            status: Initial InboundRequestStatus.
            **kwargs: Optional fields (location_bpns, certificate_id, notification_id).

        Returns:
            The staged CcmInboundRequest instance.
        """
        record = CcmInboundRequest(
            consumer_bpn=consumer_bpn,
            certified_bpn=certified_bpn,
            certificate_type=certificate_type,
            status=status,
            **kwargs,
        )
        self.create(record)
        return record

    def find_by_id(self, request_id: int) -> Optional[CcmInboundRequest]:
        """Return a single inbound request by primary key."""
        return self._session.get(CcmInboundRequest, request_id)

    def find_all_filtered(
        self,
        consumer_bpn: Optional[str] = None,
        certified_bpn: Optional[str] = None,
        certificate_type: Optional[str] = None,
        status: Optional[InboundRequestStatus] = None,
        offset: int = 0,
        limit: int = 100,
    ) -> List[CcmInboundRequest]:
        """
        Return inbound requests with optional filters, newest first.

        Args:
            consumer_bpn: Filter by consumer BPNL.
            certified_bpn: Filter by certified entity BPNL.
            certificate_type: Filter by certificate type.
            status: Filter by InboundRequestStatus.
            offset: Pagination offset.
            limit: Maximum records to return.

        Returns:
            List of matching CcmInboundRequest records.
        """
        stmt = select(CcmInboundRequest)
        if consumer_bpn:
            stmt = stmt.where(CcmInboundRequest.consumer_bpn == consumer_bpn)
        if certified_bpn:
            stmt = stmt.where(CcmInboundRequest.certified_bpn == certified_bpn)
        if certificate_type:
            stmt = stmt.where(CcmInboundRequest.certificate_type == certificate_type)
        if status:
            stmt = stmt.where(CcmInboundRequest.status == status)
        stmt = stmt.order_by(desc(CcmInboundRequest.received_at)).offset(offset).limit(limit)
        return list(self._session.scalars(stmt).all())

    def find_latest_per_combo(
        self,
        consumer_bpn: Optional[str] = None,
        certified_bpn: Optional[str] = None,
        certificate_type: Optional[str] = None,
        status: Optional[InboundRequestStatus] = None,
        offset: int = 0,
        limit: int = 100,
    ) -> List[CcmInboundRequest]:
        """
        Return only the most recent inbound request per unique
        ``(consumer_bpn, certified_bpn, certificate_type)`` combination.

        This gives a deduplicated "current state" view — one row per
        consumer-certificate pair — while the full history is preserved
        in the database and accessible via ``find_all_filtered()``.

        Args:
            consumer_bpn: Optional filter by consumer BPNL.
            certified_bpn: Optional filter by certified entity BPNL.
            certificate_type: Optional filter by certificate type.
            status: Optional filter by InboundRequestStatus.
            offset: Pagination offset.
            limit: Maximum number of records to return.

        Returns:
            List of the newest CcmInboundRequest per combination,
            ordered by ``received_at`` descending.
        """
        latest_ids = (
            select(func.max(CcmInboundRequest.id).label("max_id"))
            .group_by(
                CcmInboundRequest.consumer_bpn,
                CcmInboundRequest.certified_bpn,
                CcmInboundRequest.certificate_type,
            )
            .subquery()
        )
        stmt = select(CcmInboundRequest).where(
            CcmInboundRequest.id.in_(select(latest_ids.c.max_id))
        )
        if consumer_bpn:
            stmt = stmt.where(CcmInboundRequest.consumer_bpn == consumer_bpn)
        if certified_bpn:
            stmt = stmt.where(CcmInboundRequest.certified_bpn == certified_bpn)
        if certificate_type:
            stmt = stmt.where(CcmInboundRequest.certificate_type == certificate_type)
        if status:
            stmt = stmt.where(CcmInboundRequest.status == status)
        stmt = stmt.order_by(desc(CcmInboundRequest.received_at)).offset(offset).limit(limit)
        return list(self._session.scalars(stmt).all())

    def update_status(
        self,
        request_id: int,
        new_status: InboundRequestStatus,
        certificate_id: Optional[int] = None,
    ) -> Optional[CcmInboundRequest]:
        """
        Update the status (and optionally resolve the certificate FK) on an
        inbound request.

        Args:
            request_id: Primary key of the record to update.
            new_status: New InboundRequestStatus value.
            certificate_id: FK to the certificate, if now resolved.

        Returns:
            The updated record, or None if not found.
        """
        record = self._session.get(CcmInboundRequest, request_id)
        if record is None:
            return None
        record.status = new_status
        record.updated_at = datetime.now(timezone.utc)
        if certificate_id is not None:
            record.certificate_id = certificate_id
        self._session.add(record)
        return record

    def advance_status_for_consumer(
        self,
        consumer_bpn: str,
        certified_bpn: str,
        certificate_type: str,
        certificate_id: int,
        new_status: InboundRequestStatus,
        skip_statuses: Optional[List[InboundRequestStatus]] = None,
    ) -> List[CcmInboundRequest]:
        """
        Bulk-update inbound request records for a given consumer + certificate
        to a new status.

        Used when the provider sends a PUSH or Available notification to a
        consumer so that all related inbound request records reflect the action
        taken.

        Matches on ``consumer_bpn + certified_bpn + certificate_type`` — the
        natural certificate key — rather than ``certificate_id`` alone, because
        "NotFound" inbound records have ``certificate_id = NULL`` until a cert
        is actually created.  The ``certificate_id`` FK is stamped on every
        matched record so it is always resolved after this call.

        Args:
            consumer_bpn: BPNL of the consumer.
            certified_bpn: BPNL of the certified entity (cert holder).
            certificate_type: Certificate type identifier.
            certificate_id: FK of the certificate (set on all matched records).
            new_status: New status to set (Available or Pushed).
            skip_statuses: Records already in these statuses are left untouched.
                Defaults to ``[Pushed]`` when not specified.  Pass
                ``[Pushed, Available]`` for the Push flow so that records already
                delivered via the PULL (Available) path are not overridden by a
                Push notification triggered by a *different* consumer request.

        Returns:
            List of updated records.
        """
        if skip_statuses is None:
            skip_statuses = [InboundRequestStatus.Pushed]
        stmt = (
            select(CcmInboundRequest)
            .where(CcmInboundRequest.consumer_bpn == consumer_bpn)
            .where(CcmInboundRequest.certified_bpn == certified_bpn)
            .where(CcmInboundRequest.certificate_type == certificate_type)
            .where(CcmInboundRequest.status.not_in(skip_statuses))
        )
        records = list(self._session.scalars(stmt).all())
        now = datetime.now(timezone.utc)
        for r in records:
            r.status = new_status
            r.certificate_id = certificate_id
            r.updated_at = now
            self._session.add(r)
        return records
