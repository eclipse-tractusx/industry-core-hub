#################################################################################
# Eclipse Tractus-X - Industry Core Hub Backend
#
# Copyright (c) 2025 LKS Next
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

from sqlalchemy import case
from sqlmodel import SQLModel, Session, select, desc
from sqlalchemy.orm import selectinload, aliased
from typing import TypeVar, Type, List, Optional, Generic
from uuid import UUID, uuid4
from datetime import datetime, timezone

from models.metadata_database.provider.models import (
    ConnectorControlPlane,
    BusinessPartner,
    TwinRegistry,
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
    DataExchangeAgreement
)


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
    def get_by_name(self, name: str,
        join_legal_entity: bool = False,
        join_connector_control_plane: bool = False,
        join_twin_registry: bool = False) -> Optional[EnablementServiceStack]:
        
        stmt = select(EnablementServiceStack).where(
            EnablementServiceStack.name == name)  # type: ignore
        
        if join_connector_control_plane or join_legal_entity:
            stmt = stmt.join(ConnectorControlPlane, ConnectorControlPlane.id == EnablementServiceStack.connector_control_plane_id)

        if join_legal_entity:
            stmt = stmt.join(LegalEntity, LegalEntity.id == ConnectorControlPlane.legal_entity_id)

        if join_twin_registry:
            stmt = stmt.join(TwinRegistry, TwinRegistry.id == EnablementServiceStack.twin_registry_id)

        return self._session.scalars(stmt).first()
    
    def find_by_legal_entity_bpnl(self, legal_entity_bpnl: str) -> List[EnablementServiceStack]:
        stmt = select(EnablementServiceStack)
        stmt = stmt.join(ConnectorControlPlane, ConnectorControlPlane.id == EnablementServiceStack.connector_control_plane_id)
        stmt = stmt.join(LegalEntity, LegalEntity.id == ConnectorControlPlane.legal_entity_id).where(
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
    
    def find_by_global_id(self, global_id: UUID, include_registrations: bool = False) -> Optional[Twin]:
        stmt = select(Twin).where(
            Twin.global_id == global_id)
        
        if include_registrations:
            stmt = stmt.options(selectinload(Twin.twin_registrations))
        
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
        )
        self.create(twin_aspect)
        return twin_aspect


class TwinAspectRegistrationRepository(BaseRepository[TwinAspectRegistration]):
    def get_by_twin_aspect_id_twin_registry_id(
        self, twin_aspect_id: int, twin_registry_id: int
    ) -> Optional[TwinAspectRegistration]:
        """Retrieve a TwinAspectRegistration by twin_aspect_id and twin_registry_id."""
        stmt = select(TwinAspectRegistration).where(
            TwinAspectRegistration.twin_aspect_id == twin_aspect_id
        ).where(
            TwinAspectRegistration.twin_registry_id == twin_registry_id
        )
        return self._session.scalars(stmt).first()

    def create_new(
        self,
        twin_aspect_id: int,
        twin_registry_id: int,
        connector_control_plane_id: int,
        status: int = 0,
        registration_mode: int = 0,
    ) -> TwinAspectRegistration:
        """Create a new TwinAspectRegistration instance."""
        twin_aspect_registration = TwinAspectRegistration(
            twin_aspect_id=twin_aspect_id,
            twin_registry_id=twin_registry_id,
            connector_control_plane_id=connector_control_plane_id,
            status=status,
            registration_mode=registration_mode,
            created_date=datetime.now(timezone.utc),
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
    def get_by_twin_id_twin_registry_id(self, twin_id: int, twin_registry_id: int) -> Optional[TwinRegistration]:
        stmt = select(TwinRegistration).where(
            TwinRegistration.twin_id == twin_id).where(
            TwinRegistration.twin_registry_id == twin_registry_id)
        return self._session.scalars(stmt).first()

    def create_new(self, twin_id: int, twin_registry_id: int, dtr_registered: bool = False) -> TwinRegistration:
        twin_registration = TwinRegistration(
            twin_id=twin_id,
            twin_registry_id=twin_registry_id,
            dtr_registered=dtr_registered
        )
        self.create(twin_registration)
        return twin_registration

class ConnectorControlPlaneRepository(BaseRepository[ConnectorControlPlane]):
    def get_by_id(self, id: int, join_legal_entity: bool = False) -> Optional[ConnectorControlPlane]:
        stmt = select(ConnectorControlPlane).where(ConnectorControlPlane.id == id)
        if join_legal_entity:   
            stmt = stmt.join(LegalEntity, LegalEntity.id == ConnectorControlPlane.legal_entity_id)
        return self._session.scalars(stmt).first()

    def get_by_name(self, name: str, join_legal_entity: bool = False) -> Optional[ConnectorControlPlane]:
        stmt = select(ConnectorControlPlane).where(ConnectorControlPlane.name == name)
        if join_legal_entity:   
            stmt = stmt.join(LegalEntity, LegalEntity.id == ConnectorControlPlane.legal_entity_id)
        return self._session.scalars(stmt).first()
    
    def get_default(self, join_legal_entity: bool = False) -> Optional[ConnectorControlPlane]:
        stmt = select(ConnectorControlPlane).where(ConnectorControlPlane.is_default == True)
        if join_legal_entity:   
            stmt = stmt.join(LegalEntity, LegalEntity.id == ConnectorControlPlane.legal_entity_id)
        return self._session.scalars(stmt).first()

class TwinRegistryRepository(BaseRepository[TwinRegistry]):
    def get_by_name(self, name: str) -> Optional[TwinRegistry]:
        stmt = select(TwinRegistry).where(TwinRegistry.name == name)
        return self._session.scalars(stmt).first()
    
    def get_default(self) -> Optional[TwinRegistry]:
        stmt = select(TwinRegistry).where(TwinRegistry.is_default == True)
        return self._session.scalars(stmt).first()
