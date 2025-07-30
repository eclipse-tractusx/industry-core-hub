from typing import List, Optional
from models.services.provider.system_management import (
    DtrServiceCreate,
    DtrServiceRead,
    DtrServiceUpdate,
    EdcServiceCreate,
    EdcServiceRead,
    EdcServiceUpdate,
    EnablementServiceStackCreate,
    EnablementServiceStackRead,
    EnablementServiceStackUpdate,
    LegalEntityCreate,
    LegalEntityRead,
    LegalEntityUpdate,
)
from managers.metadata_database.manager import RepositoryManagerFactory
from models.metadata_database.provider.models import (
    DtrService,
    EdcService,
    EnablementServiceStack,
    LegalEntity
)

class SystemManagementService:
    """
    Service class for managing EnablementServiceStack entities.
    """
    def create_enablement_service_stack(self, stack_create: EnablementServiceStackCreate) -> EnablementServiceStackRead:
        with RepositoryManagerFactory.create() as repo:
            db_stack = EnablementServiceStack(**stack_create.model_dump(by_alias=False))
            repo.enablement_service_stack_repository.create(db_stack)
            repo.commit()
            return EnablementServiceStackRead.model_validate(db_stack)

    def get_enablement_service_stack(self, stack_id: int) -> Optional[EnablementServiceStackRead]:
        with RepositoryManagerFactory.create() as repo:
            db_stack = repo.enablement_service_stack_repository.find_by_id(stack_id)
            if db_stack:
                return EnablementServiceStackRead.model_validate(db_stack)
            return None

    def get_enablement_service_stacks(self) -> List[EnablementServiceStackRead]:
        with RepositoryManagerFactory.create() as repo:
            db_stacks = repo.enablement_service_stack_repository.find_all()
            return [EnablementServiceStackRead.model_validate(stack) for stack in db_stacks]

    def update_enablement_service_stack(self, stack_id: int, stack_update: EnablementServiceStackUpdate) -> Optional[EnablementServiceStackRead]:
        with RepositoryManagerFactory.create() as repo:
            db_stack = repo.enablement_service_stack_repository.find_by_id(stack_id)
            if not db_stack:
                return None
            for field, value in stack_update.model_dump(exclude_unset=True).items():
                setattr(db_stack, field, value)
            repo.commit()
            return EnablementServiceStackRead.model_validate(db_stack)

    def delete_enablement_service_stack(self, stack_id: int) -> bool:
        with RepositoryManagerFactory.create() as repo:
            try:
                repo.enablement_service_stack_repository.delete(stack_id)
                repo.commit()
                return True
            except ValueError:
                return False

    def create_edc_service(self, edc_create: EdcServiceCreate) -> EdcServiceRead:
        with RepositoryManagerFactory.create() as repo:
            legal_entity = repo.legal_entity_repository.get_by_bpnl(edc_create.bpnl)
            if not legal_entity or legal_entity.id is None:
                raise ValueError("LegalEntity with given BPNL not found or has no ID")
            db_edc = EdcService(
                name=edc_create.name,
                connection_settings=edc_create.connection_settings,
                legal_entity_id=legal_entity.id
            )
            repo.edc_service_repository.create(db_edc)
            repo.commit()
            return EdcServiceRead(
                name=db_edc.name,
                connection_settings=db_edc.connection_settings,
                legalEntity=LegalEntityRead(bpnl=legal_entity.bpnl)
            )

    def get_edc_service(self, edc_id: int) -> Optional[EdcServiceRead]:
        with RepositoryManagerFactory.create() as repo:
            db_edc = repo.edc_service_repository.find_by_id(edc_id)
            if db_edc:
                legal_entity = repo.legal_entity_repository.find_by_id(db_edc.legal_entity_id)
                if legal_entity:
                    return EdcServiceRead(
                        name=db_edc.name,
                        connection_settings=db_edc.connection_settings,
                        legalEntity=LegalEntityRead(bpnl=legal_entity.bpnl)
                    )
            return None

    def get_edc_services(self) -> List[EdcServiceRead]:
        with RepositoryManagerFactory.create() as repo:
            db_edcs = repo.edc_service_repository.find_all()
            result = []
            for edc in db_edcs:
                legal_entity = repo.legal_entity_repository.find_by_id(edc.legal_entity_id)
                if legal_entity:
                    result.append(EdcServiceRead(
                        name=edc.name,
                        connection_settings=edc.connection_settings,
                        legalEntity=LegalEntityRead(bpnl=legal_entity.bpnl)
                    ))
            return result

    def update_edc_service(self, edc_id: int, edc_update: EdcServiceUpdate) -> Optional[EdcServiceRead]:
        with RepositoryManagerFactory.create() as repo:
            db_edc = repo.edc_service_repository.find_by_id(edc_id)
            if not db_edc:
                return None
            for field, value in edc_update.model_dump(exclude_unset=True).items():
                setattr(db_edc, field, value)
            repo.commit()
            legal_entity = repo.legal_entity_repository.find_by_id(db_edc.legal_entity_id)
            if legal_entity:
                return EdcServiceRead(
                    name=db_edc.name,
                    connection_settings=db_edc.connection_settings,
                    legalEntity=LegalEntityRead(bpnl=legal_entity.bpnl)
                )
            return None

    def delete_edc_service(self, edc_id: int) -> bool:
        with RepositoryManagerFactory.create() as repo:
            try:
                repo.edc_service_repository.delete(edc_id)
                repo.commit()
                return True
            except ValueError:
                return False

    def create_dtr_service(self, dtr_create: DtrServiceCreate) -> DtrServiceRead:
        with RepositoryManagerFactory.create() as repo:
            db_dtr = DtrService(**dtr_create.model_dump(by_alias=False))
            repo.dtr_service_repository.create(db_dtr)
            repo.commit()
            return DtrServiceRead.model_validate(db_dtr)

    def get_dtr_service(self, dtr_id: int) -> Optional[DtrServiceRead]:
        with RepositoryManagerFactory.create() as repo:
            db_dtr = repo.dtr_service_repository.find_by_id(dtr_id)
            if db_dtr:
                return DtrServiceRead.model_validate(db_dtr)
            return None

    def get_dtr_services(self) -> List[DtrServiceRead]:
        with RepositoryManagerFactory.create() as repo:
            db_dtrs = repo.dtr_service_repository.find_all()
            return [DtrServiceRead.model_validate(dtr) for dtr in db_dtrs]

    def update_dtr_service(self, dtr_id: int, dtr_update: DtrServiceUpdate) -> Optional[DtrServiceRead]:
        with RepositoryManagerFactory.create() as repo:
            db_dtr = repo.dtr_service_repository.find_by_id(dtr_id)
            if not db_dtr:
                return None
            for field, value in dtr_update.model_dump(exclude_unset=True).items():
                setattr(db_dtr, field, value)
            repo.commit()
            return DtrServiceRead.model_validate(db_dtr)

    def delete_dtr_service(self, dtr_id: int) -> bool:
        with RepositoryManagerFactory.create() as repo:
            try:
                repo.dtr_service_repository.delete(dtr_id)
                repo.commit()
                return True
            except ValueError:
                return False

    def create_legal_entity(self, legal_entity_create: LegalEntityCreate) -> LegalEntityRead:
        with RepositoryManagerFactory.create() as repo:
            db_legal_entity = LegalEntity(**legal_entity_create.model_dump(by_alias=False))
            repo.legal_entity_repository.create(db_legal_entity)
            repo.commit()
            return LegalEntityRead(bpnl=db_legal_entity.bpnl)

    def get_legal_entity(self, legal_entity_id: int) -> Optional[LegalEntityRead]:
        with RepositoryManagerFactory.create() as repo:
            db_legal_entity = repo.legal_entity_repository.find_by_id(legal_entity_id)
            if db_legal_entity:
                return LegalEntityRead(bpnl=db_legal_entity.bpnl)
            return None

    def get_legal_entities(self) -> List[LegalEntityRead]:
        with RepositoryManagerFactory.create() as repo:
            db_legal_entities = repo.legal_entity_repository.find_all()
            return [LegalEntityRead(bpnl=le.bpnl) for le in db_legal_entities]

    def update_legal_entity(self, legal_entity_id: int, legal_entity_update: LegalEntityUpdate) -> Optional[LegalEntityRead]:
        with RepositoryManagerFactory.create() as repo:
            db_legal_entity = repo.legal_entity_repository.find_by_id(legal_entity_id)
            if not db_legal_entity:
                return None
            for field, value in legal_entity_update.model_dump(exclude_unset=True).items():
                setattr(db_legal_entity, field, value)
            repo.commit()
            return LegalEntityRead(bpnl=db_legal_entity.bpnl)

    def delete_legal_entity(self, legal_entity_id: int) -> bool:
        with RepositoryManagerFactory.create() as repo:
            try:
                repo.legal_entity_repository.delete(legal_entity_id)
                repo.commit()
                return True
            except ValueError:
                return False
