from typing import List, Optional
from models.services.provider.system_management import (
    ConnectorServiceCreate,
    ConnectorServiceRead,
    ConnectorServiceUpdate,
    DtrServiceCreate,
    DtrServiceRead,
    DtrServiceUpdate,
    EnablementServiceStackCreate,
    EnablementServiceStackRead,
    EnablementServiceStackUpdate,
    LegalEntityCreate,
    LegalEntityRead,
    LegalEntityUpdate,
)
from managers.metadata_database.manager import RepositoryManagerFactory
from models.metadata_database.provider.models import (
    ConnectorService,
    DtrService,
    EnablementServiceStack,
    LegalEntity
)
from managers.enablement_services.dtr_manager import DTRManager
from managers.enablement_services.connector_manager import ConnectorManager
from managers.config.config_manager import ConfigManager

class SystemManagementService:
    """
    Service class for managing EnablementServiceStack entities.
    """
    def create_enablement_service_stack(self, stack_create: EnablementServiceStackCreate) -> EnablementServiceStackRead:
        with RepositoryManagerFactory.create() as repo:
            db_enablement_service_stacks = repo.enablement_service_stack_repository.get_by_name(stack_create.name)
            if db_enablement_service_stacks:
                raise ValueError(f"EnablementServiceStack with name {stack_create.name} already exists.")
            
            db_connector_service = repo.connector_service_repository.get_by_name(stack_create.connector_name)
            if not db_connector_service:
                raise ValueError(f"ConnectorService with name {stack_create.connector_name} not found.")
            
            db_dtr_service = repo.dtr_service_repository.get_by_name(stack_create.dtr_name)
            if not db_dtr_service:
                raise ValueError(f"DtrService with name {stack_create.dtr_name} not found.")

            db_stack = EnablementServiceStack(
                name=stack_create.name,
                connector_service_id=db_connector_service.id,
                dtr_service_id=db_dtr_service.id,
                settings=stack_create.settings)
            
            repo.enablement_service_stack_repository.create(db_stack)
            repo.commit()
        
            ## Create a asset in the connector for the digital twin registry.
            # TODO: will all customers want to have that? Maybe introduce a parameter for that?
            edc_manager = self.create_connector_manager(db_connector_service)
            
            dtr_config = db_dtr_service.connection_settings # Get the DTR connection settings from the DB
            asset_config = dtr_config.get("asset_config")
            
            dtr_asset_id, _, _, _ = edc_manager.register_dtr_offer(
                base_dtr_url=dtr_config.get("hostname"),
                uri=dtr_config.get("uri"),
                api_path=dtr_config.get("apiPath"),
                dtr_policy_config=dtr_config.get("policy"),
                dct_type=asset_config.get("dct_type"),
                existing_asset_id=asset_config.get("existing_asset_id", None)
            )

            # Update the Connector connection settings with the generated asset id for the DTR
            db_connector_service.connection_settings["dtr_asset_id"] = dtr_asset_id
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

    def create_connector_service(self, connector_create: ConnectorServiceCreate) -> ConnectorServiceRead:
        with RepositoryManagerFactory.create() as repo:
            legal_entity = repo.legal_entity_repository.get_by_bpnl(connector_create.bpnl)
            if not legal_entity or legal_entity.id is None:
                raise ValueError("LegalEntity with given BPNL not found or has no ID")
            db_connector = ConnectorService(
                name=connector_create.name,
                connection_settings=connector_create.connection_settings,
                legal_entity_id=legal_entity.id
            )
            repo.connector_service_repository.create(db_connector)
            repo.commit()
            return ConnectorServiceRead(
                name=db_connector.name,
                connection_settings=db_connector.connection_settings,
                legalEntity=LegalEntityRead(bpnl=legal_entity.bpnl)
            )

    def get_connector_service(self, connector_id: int) -> Optional[ConnectorServiceRead]:
        with RepositoryManagerFactory.create() as repo:
            db_connector = repo.connector_service_repository.find_by_id(connector_id)
            if db_connector:
                legal_entity = repo.legal_entity_repository.find_by_id(db_connector.legal_entity_id)
                if legal_entity:
                    return ConnectorServiceRead(
                        name=db_connector.name,
                        connection_settings=db_connector.connection_settings,
                        legalEntity=LegalEntityRead(bpnl=legal_entity.bpnl)
                    )
            return None

    def get_connector_services(self) -> List[ConnectorServiceRead]:
        with RepositoryManagerFactory.create() as repo:
            db_connectors = repo.connector_service_repository.find_all()
            result = []
            for connector in db_connectors:
                legal_entity = repo.legal_entity_repository.find_by_id(connector.legal_entity_id)
                if legal_entity:
                    result.append(ConnectorServiceRead(
                        name=connector.name,
                        connection_settings=connector.connection_settings,
                        legalEntity=LegalEntityRead(bpnl=legal_entity.bpnl)
                    ))
            return result

    def update_connector_service(self, connector_id: int, connector_update: ConnectorServiceUpdate) -> Optional[ConnectorServiceRead]:
        with RepositoryManagerFactory.create() as repo:
            db_connector = repo.connector_service_repository.find_by_id(connector_id)
            if not db_connector:
                return None
            for field, value in connector_update.model_dump(exclude_unset=True).items():
                setattr(db_connector, field, value)
            repo.commit()
            legal_entity = repo.legal_entity_repository.find_by_id(db_connector.legal_entity_id)
            if legal_entity:
                return ConnectorServiceRead(
                    name=db_connector.name,
                    connection_settings=db_connector.connection_settings,
                    legalEntity=LegalEntityRead(bpnl=legal_entity.bpnl)
                )
            return None

    def delete_connector_service(self, connector_id: int) -> bool:
        with RepositoryManagerFactory.create() as repo:
            try:
                repo.connector_service_repository.delete(connector_id)
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

    @staticmethod
    def create_dtr_manager(db_dtr_service: DtrService) -> DTRManager:
        """
        Create a new instance of the DTRManager class.
        """
        dtr_connection_settings = db_dtr_service.connection_settings

        # TODO: remove the fallback
        dtr_hostname = dtr_connection_settings.get('hostname') or ConfigManager.get_config('digitalTwinRegistry.hostname')
        dtr_uri = dtr_connection_settings.get('uri') or ConfigManager.get_config('digitalTwinRegistry.uri')
        dtr_lookup_uri = dtr_connection_settings.get('lookupUri') or ConfigManager.get_config('digitalTwinRegistry.lookupUri')
        dtr_api_path = dtr_connection_settings.get('apiPath') or ConfigManager.get_config('digitalTwinRegistry.apiPath')
        dtr_url = f"{dtr_hostname}{dtr_uri}"
        dtr_lookup_url = f"{dtr_hostname}{dtr_lookup_uri}"

        # TODO: implement caching

        return DTRManager(
            dtr_url=dtr_url, dtr_lookup_url=dtr_lookup_url,
            api_path=str(dtr_api_path))

    @staticmethod
    def create_connector_manager(db_connector_service: ConnectorService) -> ConnectorManager:
        """
        Create a new instance of the EDCManager class.
        """
        # TODO: later we can configure the manager via the connection settings from the DB here

        # TODO: implement caching

        return ConnectorManager()