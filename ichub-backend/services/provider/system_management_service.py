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

from typing import List, Optional

from connector import connector_manager
from dtr import dtr_provider_manager
from managers.config.config_manager import ConfigManager
from managers.enablement_services.provider.dtr_provider_manager import DtrProviderManager
from managers.enablement_services.provider.connector_provider_manager import ConnectorProviderManager

from models.services.provider.system_management import (
    ConnectorControlPlaneCreate,
    ConnectorControlPlaneRead,
    ConnectorControlPlaneUpdate,
    TwinRegistryCreate,
    TwinRegistryRead,
    TwinRegistryUpdate,
    EnablementServiceStackCreate,
    EnablementServiceStackRead,
    EnablementServiceStackUpdate,
    LegalEntityCreate,
    LegalEntityRead,
    LegalEntityUpdate,
)
from managers.metadata_database.manager import RepositoryManagerFactory
from models.metadata_database.provider.models import (
    ConnectorControlPlane,
    TwinRegistry,
    EnablementServiceStack,
    LegalEntity
)

from tools.exceptions import NotAvailableError

class SystemManagementService:
    """
    Service class for managing EnablementServiceStack entities.
    """
    def create_enablement_service_stack(self, stack_create: EnablementServiceStackCreate) -> EnablementServiceStackRead:
        with RepositoryManagerFactory.create() as repo:
            db_enablement_service_stacks = repo.enablement_service_stack_repository.get_by_name(stack_create.name)
            if db_enablement_service_stacks:
                raise ValueError(f"EnablementServiceStack with name {stack_create.name} already exists.")

            db_connector_control_plane = repo.connector_control_plane_repository.get_by_name(stack_create.connector_name)
            if not db_connector_control_plane:
                raise ValueError(f"ConnectorControlPlane with name {stack_create.connector_name} not found.")

            db_twin_registry = repo.twin_registry_repository.get_by_name(stack_create.dtr_name)
            if not db_twin_registry:
                raise ValueError(f"TwinRegistry with name {stack_create.dtr_name} not found.")

            db_stack = EnablementServiceStack(
                name=stack_create.name,
                connector_control_plane_id=db_connector_control_plane.id,
                twin_registry_id=db_twin_registry.id,
                settings=stack_create.settings)
            
            repo.enablement_service_stack_repository.create(db_stack)
            repo.commit()
        
            ## Create a asset in the connector for the digital twin registry.
            # TODO: will all customers want to have that? Maybe introduce a parameter for that?
            edc_manager = self.get_connector_manager(db_connector_control_plane)

            dtr_config = db_twin_registry.connection_settings # Get the DTR connection settings from the DB
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
            db_connector_control_plane.connection_settings["dtr_asset_id"] = dtr_asset_id
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

    def create_connector_control_plane(self, connector_create: ConnectorControlPlaneCreate) -> ConnectorControlPlaneRead:
        with RepositoryManagerFactory.create() as repo:
            legal_entity = repo.legal_entity_repository.get_by_bpnl(connector_create.bpnl)
            if not legal_entity or legal_entity.id is None:
                raise ValueError("LegalEntity with given BPNL not found or has no ID")
            db_connector = ConnectorControlPlane(
                name=connector_create.name,
                connection_settings=connector_create.connection_settings,
                legal_entity_id=legal_entity.id
            )
            repo.connector_control_plane_repository.create(db_connector)
            repo.commit()
            return ConnectorControlPlaneRead(
                name=db_connector.name,
                connection_settings=db_connector.connection_settings,
                legalEntity=LegalEntityRead(bpnl=legal_entity.bpnl)
            )

    def get_connector_control_plane(self, connector_id: int) -> Optional[ConnectorControlPlaneRead]:
        with RepositoryManagerFactory.create() as repo:
            db_connector = repo.connector_control_plane_repository.find_by_id(connector_id)
            if db_connector:
                legal_entity = repo.legal_entity_repository.find_by_id(db_connector.legal_entity_id)
                if legal_entity:
                    return ConnectorControlPlaneRead(
                        name=db_connector.name,
                        connection_settings=db_connector.connection_settings,
                        legalEntity=LegalEntityRead(bpnl=legal_entity.bpnl)
                    )
            return None

    def retrieve_connector_control_planes(self) -> List[ConnectorControlPlaneRead]:
        with RepositoryManagerFactory.create() as repo:
            db_connectors = repo.connector_control_plane_repository.find_all()
            result = []
            for connector in db_connectors:
                legal_entity = repo.legal_entity_repository.find_by_id(connector.legal_entity_id)
                if legal_entity:
                    result.append(ConnectorControlPlaneRead(
                        name=connector.name,
                        connection_settings=connector.connection_settings,
                        legalEntity=LegalEntityRead(bpnl=legal_entity.bpnl)
                    ))
            return result

    def update_connector_control_plane(self, connector_id: int, connector_update: ConnectorControlPlaneUpdate) -> Optional[ConnectorControlPlaneRead]:
        with RepositoryManagerFactory.create() as repo:
            db_connector = repo.connector_control_plane_repository.find_by_id(connector_id)
            if not db_connector:
                return None
            for field, value in connector_update.model_dump(exclude_unset=True).items():
                setattr(db_connector, field, value)
            repo.commit()
            legal_entity = repo.legal_entity_repository.find_by_id(db_connector.legal_entity_id)
            if legal_entity:
                return ConnectorControlPlaneRead(
                    name=db_connector.name,
                    connection_settings=db_connector.connection_settings,
                    legalEntity=LegalEntityRead(bpnl=legal_entity.bpnl)
                )
            return None

    def delete_connector_control_plane(self, connector_id: int) -> bool:
        with RepositoryManagerFactory.create() as repo:
            try:
                repo.connector_control_plane_repository.delete(connector_id)
                repo.commit()
                return True
            except ValueError:
                return False

    def create_twin_registry(self, dtr_create: TwinRegistryCreate) -> TwinRegistryRead:
        with RepositoryManagerFactory.create() as repo:
            db_dtr = TwinRegistry(**dtr_create.model_dump(by_alias=False))
            repo.twin_registry_repository.create(db_dtr)
            repo.commit()
            return TwinRegistryRead.model_validate(db_dtr)

    def get_twin_registry(self, dtr_id: int) -> Optional[TwinRegistryRead]:
        with RepositoryManagerFactory.create() as repo:
            db_dtr = repo.twin_registry_repository.find_by_id(dtr_id)
            if db_dtr:
                return TwinRegistryRead.model_validate(db_dtr)
            return None

    def get_twin_registries(self) -> List[TwinRegistryRead]:
        with RepositoryManagerFactory.create() as repo:
            db_dtrs = repo.twin_registry_repository.find_all()
            return [TwinRegistryRead.model_validate(dtr) for dtr in db_dtrs]

    def update_twin_registry(self, dtr_id: int, dtr_update: TwinRegistryUpdate) -> Optional[TwinRegistryRead]:
        with RepositoryManagerFactory.create() as repo:
            db_dtr = repo.twin_registry_repository.find_by_id(dtr_id)
            if not db_dtr:
                return None
            for field, value in dtr_update.model_dump(exclude_unset=True).items():
                setattr(db_dtr, field, value)
            repo.commit()
            return TwinRegistryRead.model_validate(db_dtr)

    def delete_twin_registry(self, dtr_id: int) -> bool:
        with RepositoryManagerFactory.create() as repo:
            try:
                repo.twin_registry_repository.delete(dtr_id)
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
    def get_dtr_manager(db_twin_registry: TwinRegistry) -> DtrProviderManager:
        """
        Get the DtrProviderManager.
        """
        if db_twin_registry is None:
            raise NotAvailableError("TwinRegistry is None, cannot create DtrProviderManager.")  
        
        if db_twin_registry.is_default:
            return dtr_provider_manager
        
        # TODO: create connection based on config in the database
        raise NotAvailableError("DtrProviderManager for the given TwinRegistry is not available.")

    @staticmethod
    def get_connector_manager(db_connector_control_plane: ConnectorControlPlane) -> ConnectorProviderManager:
        """
        Get the ConnectorManager.
        """
        if db_connector_control_plane is None:
            raise NotAvailableError("ConnectorControlPlane is None, cannot create ConnectorProviderManager.")
        
        if db_connector_control_plane.is_default:
            return connector_manager.provider
        
        # TODO: later we can configure the manager via the connection settings from the DB here
        # TODO: implement caching
        raise NotAvailableError("ConnectorProviderManager for the given ConnectorControlPlane is not available.")
    
    @staticmethod
    def ensure_dtr_asset_registration() -> None:
        """
        Ensure that the Digital Twin Registry asset is registered.
        TODO: have a discussion when a DTR asset should be registered in a certain Control Plane. Basically it's a decision of each participant.
        """
        dtr_config = ConfigManager.get_config("provider.digitalTwinRegistry")
        asset_config = dtr_config.get("asset_config")
        dtr_asset_id, _, _, _ = connector_manager.provider.register_dtr_offer(
            base_dtr_url=dtr_config.get("hostname"),
            uri=dtr_config.get("uri"),
            api_path=dtr_config.get("apiPath"),
            dtr_policy_config=dtr_config.get("policy"),
            dct_type=asset_config.get("dct_type"),
            existing_asset_id=asset_config.get("existing_asset_id", None)
        )
        if not dtr_asset_id:
            raise NotAvailableError("The Digital Twin Registry was not able to be registered, or was not found in the Connector!")
