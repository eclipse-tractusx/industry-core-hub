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

from base64 import b64encode, b64decode
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from uuid import UUID
from urllib.parse import quote

from pydantic import BaseModel

from services.twin_management_service import TwinManagementService
from managers.metadata_database.manager import RepositoryManagerFactory, RepositoryManager
from models.services.dtr_facade import DtrPagingDictResponse, DtrPagingStrResponse, DtrPagingMetadata
from models.metadata_database.models import Twin
from tools.submodel_type_util import SubmodelType, get_submodel_type

class TwinNotFoundError(ValueError):
    """
    Exception raised when a requested twin is not found in the database.
    """

class NotAuthorizedError(ValueError):
    """
    Exception raised when a requested twin is not authorized for the specified business partner.
    """

class NotValidTwinError(ValueError):
    """
    Exception raised when a requested twin is not valid (i.e. it is not attached to any part)
    """


class CursorTypeEnum(Enum):
    """
    Enum for cursor types.
    """
    CP = 1
    SP = 2
    JIS = 3
    BATCH = 4


class DtrPagingCursor(BaseModel):
    """
    Helper for parsing and serializing the cursor of paged operations.
    """
    type: CursorTypeEnum
    timestamp: Optional[datetime]

    def to_base64_json(self) -> str:
        """
        Convert the cursor to a base64-encoded JSON string.
        """
        json_str = self.model_dump_json()
        json_bytes = json_str.encode("utf-8")
        base64_bytes = b64encode(json_bytes)
        return base64_bytes.decode("utf-8")

    @staticmethod
    def from_base64_json(base64_str: str) -> "DtrPagingCursor":
        """
        Create a DtrPagingCursor instance from a base64-encoded JSON string.
        """
        json_bytes = b64decode(base64_str.encode("utf-8"))
        json_str = json_bytes.decode("utf-8")
        print(json_str)
        return DtrPagingCursor.model_validate_json(json_str)


class DTRFacadeService:
    """
    Service class for managing DTR facade operations.
    """

    def __init__(self,
                 control_plane_url: str = "https://control.plane.url",
                 data_plane_url: str = "https://data.plane.url"):
        self.twin_management_service = TwinManagementService()
        self.control_plane_url = control_plane_url
        self.data_plane_url = data_plane_url

    def get_all_asset_administration_shell_descriptors(
            self,
            enablement_service_stack_id: int,
            edc_bpn: Optional[str] = None,
            limit: int = 50,
            cursor_str: Optional[str] = None) -> DtrPagingDictResponse:
        """
        Get shell descriptors for a given enablement service stack ID.
        """
        result: List[Dict[str, Any]] = []
        cursor: Optional[DtrPagingCursor] = DtrPagingCursor.from_base64_json(
            cursor_str) if cursor_str else None

        last_twin_created_date = None

        with RepositoryManagerFactory.create() as repos:
            ##########################
            ### Catalog Part Twins ###
            ##########################
            last_twin_created_date = None

            if not cursor or cursor.type == CursorTypeEnum.CP:
                db_twins = repos.twin_repository.find_catalog_part_twins(
                    enablement_service_stack_id=enablement_service_stack_id,
                    business_partner_number=edc_bpn,
                    include_aspects=True,
                    max_excl_created_date=cursor.timestamp if cursor else None,
                    limit=limit)
                # Reduce the (remaining) limit by the number of twins already fetched

                if db_twins:
                    limit = limit - len(db_twins)

                    for db_twin in db_twins:
                        shell_descriptor = {
                            "id": db_twin.aas_id.urn,
                            "assetType": "AssetType"
                        }
                        self._fill_shell_descriptor(repos, db_twin,
                                                    shell_descriptor, edc_bpn)

                        result.append(shell_descriptor)
                        last_twin_created_date = db_twin.created_date

                    if limit <= 0:
                        cursor = DtrPagingCursor(type=CursorTypeEnum.CP,
                                                timestamp=last_twin_created_date)

                        return DtrPagingDictResponse(
                            paging_metadata=DtrPagingMetadata(
                                cursor=cursor.to_base64_json()),
                            result=result)

            ###########################
            ### Serlized Part Twins ###
            ###########################
            # TODO: Implement the logic for serialized part twins (and later others)

            return DtrPagingDictResponse(
                paging_metadata=DtrPagingMetadata(), result=result)

    def get_asset_administration_shell_descriptor_by_id(self,
                             enablement_service_stack_id: int,
                             aas_id: UUID,
                             edc_bpn: Optional[str] = None) -> Dict[str, Any]:
        """
        Get the shell descriptor for a given AAS ID.
        """
        result = {"id": aas_id.urn, "assetType": "AssetType"}

        with RepositoryManagerFactory.create() as repos:
            db_twin = repos.twin_repository.find_by_dtr_aas_id(
                aas_id, include_aspects=True, include_registrations=True)

            if db_twin is None or not db_twin.has_registration(
                    enablement_service_stack_id):
                raise TwinNotFoundError(
                    f"Shell descriptor {aas_id} not found.")

            self._fill_shell_descriptor(repos, db_twin, result, edc_bpn)

        return result

    def get_all_asset_administration_shell_ids_by_asset_link(self,
                      enablement_service_stack_id: int,
                      search_params: Dict[str, Any],
                      edc_bpn: Optional[str] = None,
                      limit: int = 50,
                      cursor_str: Optional[str] = None) -> DtrPagingStrResponse:
        """
        Lookup shells based on the provided search parameters.
        """
        # Without search parameters, return an empty result
        if not search_params:
            return DtrPagingStrResponse(
                paging_metadata=DtrPagingMetadata(), result=[])

        cursor: Optional[DtrPagingCursor] = DtrPagingCursor.from_base64_json(
            cursor_str) if cursor_str else None

        search_catalog_parts = True
        search_serilized_parts = True
        search_jis_parts = True
        search_batches = True

        global_id = None
        manufacturer_id = None
        manufacturer_part_id = None
        customer_part_id = None
        intrinsic_id = None
        batch_id = None
        part_instance_id = None
        van = None
        jis_number = None
        parent_order_number = None
        jis_call_date = None

        for name, value in search_params.items():
            if name == "globalAssetId":
                global_id = UUID(value)
            elif name == "manufacturerId":
                manufacturer_id = value
            elif name == "manufacturerPartId":
                manufacturer_part_id = value
            elif name == "customerPartId":
                customer_part_id = value
            elif name == "intrinsicId":
                intrinsic_id = value
            elif name == "batchId":
                search_catalog_parts = False
                search_jis_parts = False
                search_serilized_parts = False
                batch_id = value
            elif name == "partInstanceId":
                search_batches = False
                search_catalog_parts = False
                search_jis_parts = False
                part_instance_id = value
            elif name == "van":
                search_batches = False
                search_catalog_parts = False
                search_jis_parts = False
                van = value
            elif name == "jisNumber":
                search_batches = False
                search_catalog_parts = False
                search_serilized_parts = False
                jis_number = value
            elif name == "parentOrderNumber":
                search_batches = False
                search_catalog_parts = False
                search_serilized_parts = False
                parent_order_number = value
            elif name == "jisCallDate":
                search_batches = False
                search_catalog_parts = False
                search_serilized_parts = False
                jis_call_date = value

        last_twin_created_date = None
        result: List[str] = []
        with RepositoryManagerFactory.create() as repos:
            if search_catalog_parts and (not cursor or cursor.type == CursorTypeEnum.CP):
                db_twins = repos.twin_repository.find_catalog_part_twins(
                    enablement_service_stack_id=enablement_service_stack_id,
                    business_partner_number=edc_bpn,
                    customer_part_id=customer_part_id,
                    manufacturer_id=manufacturer_id,
                    manufacturer_part_id=manufacturer_part_id,
                    global_id=global_id,
                    max_excl_created_date=cursor.timestamp if cursor else None,
                    limit=limit)

                if db_twins:
                    limit = limit - len(db_twins)
                    for db_twin in db_twins:
                        last_twin_created_date = db_twin.created_date
                        result.append(db_twin.aas_id.urn)

                    if limit <= 0:
                        cursor = DtrPagingCursor(type=CursorTypeEnum.CP,
                                                timestamp=last_twin_created_date)
                        return DtrPagingStrResponse(
                            paging_metadata=DtrPagingMetadata(
                                cursor=cursor.to_base64_json()),
                            result=result)
                    


        return DtrPagingStrResponse(
            paging_metadata=DtrPagingMetadata(), result=result)

    def get_all_asset_links_by_id(self,
                             enablement_service_stack_id: int,
                             aas_id: UUID,
                             edc_bpn: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Returns a list of specific Asset identifiers based on an Asset Administration Shell id to edit discoverable content.
        """
        shell_descriptor = {}
        with RepositoryManagerFactory.create() as repos:
            db_twin = repos.twin_repository.find_by_dtr_aas_id(
                aas_id, include_aspects=True, include_registrations=True)

            if db_twin is None or not db_twin.has_registration(
                    enablement_service_stack_id):
                raise TwinNotFoundError(
                    f"Shell descriptor {aas_id} not found.")

            self._fill_shell_descriptor(repos, db_twin, shell_descriptor, edc_bpn)

        return shell_descriptor["specificAssetIds"]
        
        

    def _fill_shell_descriptor(self,
                               repos: RepositoryManager,
                               db_twin: Twin,
                               shell_descriptor: Dict[str, Any],
                               edc_bpn: Optional[str] = None,
                               include_submodel_descriptors: bool = False) -> None:
        shell_descriptor["globalAssetId"] = db_twin.global_id.urn
        specific_asset_ids: List[Dict[str, Any]] = []

        # Get a potential catalog part either from the twin entity or load it from the database
        if db_twin.catalog_part:
            db_catalog_part = db_twin.catalog_part
        else:
            db_catalog_part = repos.catalog_part_repository.get_by_twin_id(
                db_twin.id)
        if db_catalog_part:

            # Called from a partner => check if the catalog part is shared with the partner
            if edc_bpn:
                db_partner_catalog_part = db_catalog_part.find_partner_catalog_part_by_bpnl(
                    edc_bpn)

                # Not found => then the partner has no access to the twin
                if not db_partner_catalog_part:
                    raise NotAuthorizedError(
                        f"Catalog part with AAS ID {db_twin.aas_id} not shared with business partner {edc_bpn}."
                    )

                db_partner_catalog_parts = [db_partner_catalog_part]
            else:
                db_partner_catalog_parts = db_catalog_part.partner_catalog_parts

            shell_descriptor["assetKind"] = "Type"
            self._add_specific_asset_id(specific_asset_ids,
                                        "manufacturerPartId",
                                        db_catalog_part.manufacturer_part_id,
                                        "PUBLIC_READABLE")

            for db_partner_catalog_part in db_partner_catalog_parts:
                self._add_specific_asset_id(
                    specific_asset_ids, "digitalTwinType", "PartType",
                    db_partner_catalog_part.business_partner.bpnl)

                self._add_specific_asset_id(
                    specific_asset_ids, "manufacturerId",
                    db_catalog_part.legal_entity.bpnl,
                    db_partner_catalog_part.business_partner.bpnl)

                self._add_specific_asset_id(
                    specific_asset_ids, "customerPartId",
                    db_partner_catalog_part.customer_part_id,
                    db_partner_catalog_part.business_partner.bpnl)

            submodel_descriptors: List[Dict[str, Any]] = []
            if include_submodel_descriptors:
                for db_twin_aspect in db_twin.twin_aspects:
                    semandic_id = db_twin_aspect.semantic_id
                    submodel_type_data = get_submodel_type(semandic_id)
                    asset_id = self._generate_asset_id(db_twin, db_twin_aspect)

                    entry = {
                        "id":
                        db_twin_aspect.submodel_id.urn,
                        "idShort":
                        submodel_type_data.id_short,
                        "semanticId": {
                            "type": "ExternalReference",
                            "keys": [{
                                "type": "GlobalReference",
                                "value": semandic_id
                            }]
                        },
                        "supplementalSemanticId": [],
                        "description": [],
                        "displayName": [],
                        "endpoints": [{
                            "interface": "SUBMODEL-3.0",
                            "protocolInformation": {
                                "href":
                                f"{self.data_plane_url}/api/public/{quote(semandic_id)}/{str(db_twin.global_id)}/submodel",
                                "endpointProtocol":
                                "HTTP",
                                "endpointProtocolVersion": ["1.1"],
                                "subprotocol":
                                "DSP",
                                "subprotocolBody":
                                f"id={asset_id};dspEndpoint={self.control_plane_url}",
                                "subprotocolBodyEncoding":
                                "plain",
                                "securityAttributes": [{
                                    "type": "NONE",
                                    "key": "NONE",
                                    "value": "NONE"
                                }]
                            }
                        }],
                    }

                    submodel_descriptors.append(entry)
        else:
            raise NotValidTwinError(
                f"Shell descriptor {db_twin.aas_id} is not attached to a part."
            )

        shell_descriptor["specificAssetIds"] = specific_asset_ids
        if submodel_descriptors:
            shell_descriptor["submodelDescriptors"] = submodel_descriptors

    def _generate_asset_id(self, db_twin, db_twin_aspect) -> str:
        """
        Generate an asset ID based on the twin and aspect information.
        """
        return "dummy:asset:id"  # Placeholder for actual asset ID generation logic

    def _add_specific_asset_id(
            self,
            specific_asset_ids: List[Dict[str, Any]],
            name: str,
            value: str,
            external_subject_id: Optional[str] = None) -> None:

        entry = {"supplementalSemanticIds": [], "name": name, "value": value}
        if external_subject_id:
            entry["externalSubjectId"] = {
                "type": "ExternalReference",
                "keys": [{
                    "type": "GlobalReference",
                    "value": external_subject_id
                }]
            }

        specific_asset_ids.append(entry)
