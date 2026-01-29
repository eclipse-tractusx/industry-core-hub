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

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel

from services.provider.twin_management_service import TwinManagementService
from managers.metadata_database.manager import RepositoryManagerFactory, RepositoryManager
from models.services.dtr_facade import DtrPagingStrResponse
from models.services.provider.twin_management import TwinAspectRegistrationStatus
from models.metadata_database.provider.models import Twin, TwinAspect

from tools.exceptions import NotAuthorizedError, NotFoundError, ValidationError
from tools.submodel_type_util import get_submodel_type
from tools.crypt_tools import decode_url_base64, encode_url_base64

from tractusx_sdk.industry.models.aas.v3 import (
    AssetKind,
    Endpoint,
    GetAllShellDescriptorsResponse,
    GetSubmodelDescriptorsByAssResponse,
    PagingMetadata,
    ProtocolInformation,
    ProtocolInformationSecurityAttributes,
    ProtocolInformationSecurityAttributesTypes,
    Reference,
    ReferenceKey,
    ReferenceKeyTypes,
    ReferenceTypes,
    ShellDescriptor,
    SpecificAssetId,
    SubModelDescriptor,
)


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
        return encode_url_base64(self.model_dump_json())

    @staticmethod
    def from_base64_json(base64_str: str) -> "DtrPagingCursor":
        """
        Create a DtrPagingCursor instance from a base64-encoded JSON string.
        """
        return DtrPagingCursor.model_validate_json(decode_url_base64(base64_str))


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
            asset_kind: Optional[AssetKind] = None,
            asset_type: Optional[str] = None,
            limit: int = 50,
            cursor_str: Optional[str] = None) -> GetAllShellDescriptorsResponse:
        """
        Get shell descriptors for a given enablement service stack ID.
        """
        if asset_type is not None and asset_type != "AssetType":
            return GetAllShellDescriptorsResponse(result=[])

        result: List[ShellDescriptor] = []
        cursor: Optional[DtrPagingCursor] = DtrPagingCursor.from_base64_json(
            cursor_str) if cursor_str else None

        last_twin_created_date = None

        with RepositoryManagerFactory.create() as repos:
            ##########################
            ### Catalog Part Twins ###
            ##########################
            last_twin_created_date = None

            if (cursor is None or cursor.type == CursorTypeEnum.CP) and (asset_kind is None or asset_kind == AssetKind.TYPE):
                db_twins = repos.twin_repository.find_catalog_part_twins(
                    enablement_service_stack_id=enablement_service_stack_id,
                    dtr_registered=True,
                    business_partner_number=edc_bpn,
                    include_aspects=True,
                    max_excl_created_date=cursor.timestamp if cursor else None,
                    limit=limit)
    
                # Reset the given cursor => this will allow to process other parts after all catalog parts
                # have been processed
                cursor = None 

                if db_twins:
                    # Reduce the (remaining) limit by the number of twins already fetched
                    limit = limit - len(db_twins)

                    for db_twin in db_twins:
                        shell_descriptor = ShellDescriptor(
                            id=db_twin.aas_id.urn,
                            assetType="AssetType"
                        )
                        self._fill_shell_descriptor(repos,
                                                    db_twin,
                                                    enablement_service_stack_id,
                                                    shell_descriptor,
                                                    edc_bpn,
                                                    include_specific_asset_ids=True,
                                                    include_submodel_descriptors=True)

                        result.append(shell_descriptor)
                        last_twin_created_date = db_twin.created_date

                    if limit <= 0:
                        cursor = DtrPagingCursor(type=CursorTypeEnum.CP,
                                                timestamp=last_twin_created_date)

                        return GetAllShellDescriptorsResponse(
                            paging_metadata=PagingMetadata(
                                cursor=cursor.to_base64_json()),
                            result=result)


            ###########################
            ### Serlized Part Twins ###
            ###########################
            if (cursor is None or cursor.type == CursorTypeEnum.SP) and (asset_kind is None or asset_kind == AssetKind.INSTANCE):

                db_twins = repos.twin_repository.find_serialized_part_twins(
                    enablement_service_stack_id=enablement_service_stack_id,
                    dtr_registered=True,
                    business_partner_number=edc_bpn,
                    include_aspects=True,
                    max_excl_created_date=cursor.timestamp if cursor else None,
                    limit=limit)

                # Reset the given cursor => this will allow to process other parts after all catalog parts
                # have been processed
                cursor = None 

                if db_twins:
                    # Reduce the (remaining) limit by the number of twins already fetched
                    limit = limit - len(db_twins)

                    for db_twin in db_twins:
                        shell_descriptor = ShellDescriptor(
                            id=db_twin.aas_id.urn,
                            assetType="AssetType"
                        )
                        self._fill_shell_descriptor(repos,
                                                    db_twin,
                                                    enablement_service_stack_id,
                                                    shell_descriptor,
                                                    edc_bpn,
                                                    include_specific_asset_ids=True,
                                                    include_submodel_descriptors=True)

                        result.append(shell_descriptor)
                        last_twin_created_date = db_twin.created_date

                    if limit <= 0:
                        cursor = DtrPagingCursor(type=CursorTypeEnum.CP,
                                                timestamp=last_twin_created_date)

                        return GetAllShellDescriptorsResponse(
                            paging_metadata=PagingMetadata(
                                cursor=cursor.to_base64_json()),
                            result=result)

            return GetAllShellDescriptorsResponse(result=result)

    def get_asset_administration_shell_descriptor_by_id(self,
                             enablement_service_stack_id: int,
                             aas_id: UUID,
                             edc_bpn: Optional[str] = None) -> ShellDescriptor:
        """
        Get the shell descriptor for a given AAS ID.
        """
        shell_descriptor = ShellDescriptor(
            id=aas_id.urn,
            assetType="AssetType",
        )

        with RepositoryManagerFactory.create() as repos:
            db_twin = repos.twin_repository.find_by_aas_id(
                aas_id, include_aspects=True, include_registrations=True)

            if db_twin is None or not db_twin.has_registration(
                    enablement_service_stack_id):
                raise NotFoundError(
                    f"Shell descriptor {aas_id} not found.")

            self._fill_shell_descriptor(
                repos,
                db_twin,
                enablement_service_stack_id,
                shell_descriptor,
                edc_bpn,
                include_specific_asset_ids=True,
                include_submodel_descriptors=True)

        return shell_descriptor

    def get_all_submodel_descriptors_through_superpath(
            self,
            enablement_service_stack_id: int,
            aas_id: UUID,
            edc_bpn: Optional[str] = None,
            limit: Optional[int] = None,
            cursor_str: Optional[str] = None) -> GetSubmodelDescriptorsByAssResponse:
        """
        Get all submodel descriptors for a given AAS ID.
        """
        with RepositoryManagerFactory.create() as repos:
            db_twin = repos.twin_repository.find_by_aas_id(aas_id, include_registrations=True)
            if not db_twin or not db_twin.has_registration(enablement_service_stack_id):
                raise NotFoundError(f"Shell descriptor {aas_id} not found.")

            shell_descriptor = ShellDescriptor(id=aas_id.urn)
            self._fill_shell_descriptor(
                repos,
                db_twin,
                enablement_service_stack_id,
                shell_descriptor,
                edc_bpn,
                include_specific_asset_ids=False,
                include_submodel_descriptors=True)
        
        submodel_descriptors = shell_descriptor.submodel_descriptors
        if not submodel_descriptors:
            return GetSubmodelDescriptorsByAssResponse(result=[])
        
        ## Implementation of paging based on the result list ##
        # (maybe this should be extracted to a generic utility function??)

        # Consistency check for cursor_str
        if cursor_str:
            try:
                start = int(cursor_str)
                if start < 0 or start > len(submodel_descriptors):
                    return GetSubmodelDescriptorsByAssResponse(result=[])
            except (ValueError, TypeError):
                return GetSubmodelDescriptorsByAssResponse(result=[])
        else:
            start = 0

        end = start + limit if limit else len(submodel_descriptors)
        paged_descriptors = submodel_descriptors[start:end]

        paging_metadata = None
        if end < len(submodel_descriptors):
            paging_metadata = PagingMetadata(cursor=str(end))

        return GetSubmodelDescriptorsByAssResponse(
            result=paged_descriptors,
            paging_metadata=paging_metadata
        )

    #GetSubmodelDescriptorByIdThroughSuperpath
    def get_submodel_descriptor_by_id_through_superpath(self,
            enablement_service_stack_id: int,
            aas_id: UUID,
            submodel_id: UUID,
            edc_bpn: Optional[str] = None) -> SubModelDescriptor:
        """
        Get the submodel descriptor for a given AAS ID and submodel ID.
        """
        shell_descriptor = ShellDescriptor(id=aas_id.urn)
        with RepositoryManagerFactory.create() as repos:
            db_twin = repos.twin_repository.find_by_aas_id(
                aas_id, include_aspects=False, include_registrations=True)

            if db_twin is None or not db_twin.has_registration(
                    enablement_service_stack_id):
                raise NotFoundError(
                    f"Shell descriptor {aas_id} not found.")

            self._fill_shell_descriptor(
                repos,
                db_twin,
                enablement_service_stack_id,
                shell_descriptor,
                edc_bpn,
                include_specific_asset_ids=False,
                include_explicit_submodel_descriptor=submodel_id)

        if len(shell_descriptor.submodel_descriptors):
            return shell_descriptor.submodel_descriptors[0]

        raise NotFoundError(f"Submodel descriptor {submodel_id} not found.")

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
            return DtrPagingStrResponse(result=[])

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
            else:
                # Unknown search parameter
                return DtrPagingStrResponse(result=[])

        last_twin_created_date = None
        result: List[str] = []
        with RepositoryManagerFactory.create() as repos:
            
            ##### Catalog part search #####
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

                # Reset the given cursor => this will allow to process other parts after all catalog parts
                cursor = None

                if db_twins:
                    limit = limit - len(db_twins)
                    for db_twin in db_twins:
                        last_twin_created_date = db_twin.created_date
                        result.append(db_twin.aas_id.urn)

                    if limit <= 0:
                        cursor = DtrPagingCursor(type=CursorTypeEnum.CP,
                                                timestamp=last_twin_created_date)
                        return DtrPagingStrResponse(
                            paging_metadata=PagingMetadata(
                                cursor=cursor.to_base64_json()),
                            result=result)

            ##### Serialized part search #####
            if search_serilized_parts and (not cursor or cursor.type == CursorTypeEnum.SP):
                db_twins = repos.twin_repository.find_serialized_part_twins(
                    enablement_service_stack_id=enablement_service_stack_id,
                    business_partner_number=edc_bpn,
                    customer_part_id=customer_part_id,
                    manufacturer_id=manufacturer_id,
                    manufacturer_part_id=manufacturer_part_id,
                    part_instance_id=part_instance_id,
                    van=van,
                    global_id=global_id,
                    max_excl_created_date=cursor.timestamp if cursor else None,
                    limit=limit)

                # Reset the given cursor => this will allow to process other parts after all catalog parts
                cursor = None

                if db_twins:
                    limit = limit - len(db_twins)
                    for db_twin in db_twins:
                        last_twin_created_date = db_twin.created_date
                        result.append(db_twin.aas_id.urn)

                    if limit <= 0:
                        cursor = DtrPagingCursor(type=CursorTypeEnum.SP,
                                                timestamp=last_twin_created_date)
                        return DtrPagingStrResponse(
                            paging_metadata=PagingMetadata(
                                cursor=cursor.to_base64_json()),
                            result=result)

        return DtrPagingStrResponse(result=result)

    def get_all_asset_links_by_id(self,
                             enablement_service_stack_id: int,
                             aas_id: UUID,
                             edc_bpn: Optional[str] = None) -> List[SpecificAssetId]:
        """
        Returns a list of specific Asset identifiers based on an Asset Administration Shell id to edit discoverable content.
        """
        shell_descriptor = ShellDescriptor(id=aas_id.urn)
        with RepositoryManagerFactory.create() as repos:
            db_twin = repos.twin_repository.find_by_aas_id(
                aas_id, include_aspects=True, include_registrations=True)

            if db_twin is None or not db_twin.has_registration(
                    enablement_service_stack_id):
                raise NotFoundError(
                    f"Shell descriptor {aas_id} not found.")

            self._fill_shell_descriptor(
                repos,
                db_twin,
                enablement_service_stack_id,
                shell_descriptor,
                edc_bpn,
                include_specific_asset_ids=True)

        return shell_descriptor.specific_asset_ids
    
    def _fill_shell_descriptor(self,
                               repos: RepositoryManager,
                               db_twin: Twin,
                               enablement_service_stack_id: int,
                               shell_descriptor: ShellDescriptor,
                               edc_bpn: Optional[str] = None,
                               include_specific_asset_ids: bool = False,
                               include_submodel_descriptors: bool = False,
                               include_explicit_submodel_descriptor: Optional[UUID] = None) -> None:
        
        shell_descriptor.global_asset_id = db_twin.global_id.urn
        specific_asset_ids: List[SpecificAssetId] = []

        ####################################
        ### Logic for catalog part twins ###
        ####################################
        # Get a potential catalog part either from the twin entity or load it from the database
        if db_twin.catalog_part:
            db_catalog_part = db_twin.catalog_part
        else:
            db_catalog_part = repos.catalog_part_repository.get_by_twin_id(
                db_twin.id)
            # TODO: For some reason this is never called; maybe sqlmodel does lazy loading here
            # if not: partner catalog part details are not loaded

        if db_catalog_part:
            shell_descriptor.asset_kind = AssetKind.TYPE

            # Step 1: deal with partner mappings: when called from partner, indlude only it's data
            # Called from a partner => check if the catalog part is shared with the partner
            if edc_bpn:
                db_partner_catalog_part = db_catalog_part.find_partner_catalog_part_by_bpnl(
                    edc_bpn)

                # Not found => then the partner has no access to the twin
                if not db_partner_catalog_part:
                    raise NotAuthorizedError(
                        f"Part with AAS ID {db_twin.aas_id} not shared with business partner {edc_bpn}."
                    )

                db_partner_catalog_parts = [db_partner_catalog_part]
            else:
                db_partner_catalog_parts = db_catalog_part.partner_catalog_parts

            # Step 2: fill the specific asset IDs
            if include_specific_asset_ids:
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

                    shell_descriptor.specific_asset_ids = specific_asset_ids
     
        #######################################
        ### Logic for serialized part twins ###
        #######################################
        # Get a potential catalog part either from the twin entity or load it from the database
        if db_twin.serialized_part:
            db_serialized_part = db_twin.serialized_part
        else:
            db_serialized_part = repos.serialized_part_repository.get_by_twin_id(
                twin_id=db_twin.id,
                join_partner_catalog_part=True,
                join_legal_entity=True)
            # TODO: For some reason this is never called; maybe sqlmodel does lazy loading here
            # if not: partner catalog part details are not loaded

        if db_serialized_part:
            shell_descriptor.asset_kind = AssetKind.INSTANCE

            db_partner_catalog_part = db_serialized_part.partner_catalog_part
            db_catalog_part = db_partner_catalog_part.catalog_part

            # Step 1: deal with partner mappings: when called from partner, indlude only it's data
            # Called from a partner => check if the catalog part is shared with the partner
            if edc_bpn:
                # Not found => then the partner has no access to the twin
                if db_partner_catalog_part.business_partner.bpnl != edc_bpn:
                    raise NotAuthorizedError(
                        f"Part with AAS ID {db_twin.aas_id} not shared with business partner {edc_bpn}."
                    )

            # Step 2: fill the specific asset IDs
            if include_specific_asset_ids:
                self._add_specific_asset_id(specific_asset_ids,
                                            "manufacturerPartId",
                                            db_catalog_part.manufacturer_part_id,
                                            "PUBLIC_READABLE")

                self._add_specific_asset_id(
                    specific_asset_ids, "digitalTwinType", "PartInstance",
                    db_partner_catalog_part.business_partner.bpnl)

                self._add_specific_asset_id(
                    specific_asset_ids, "manufacturerId",
                    db_catalog_part.legal_entity.bpnl,
                    db_partner_catalog_part.business_partner.bpnl)

                self._add_specific_asset_id(
                    specific_asset_ids, "customerPartId",
                    db_partner_catalog_part.customer_part_id,
                    db_partner_catalog_part.business_partner.bpnl)

                self._add_specific_asset_id(
                    specific_asset_ids, "partInstanceId",
                    db_serialized_part.part_instance_id,
                    db_partner_catalog_part.business_partner.bpnl)

                if db_serialized_part.van:
                    self._add_specific_asset_id(
                        specific_asset_ids, "van",
                        db_serialized_part.van,
                        db_partner_catalog_part.business_partner.bpnl)

                shell_descriptor.specific_asset_ids = specific_asset_ids

        # Check if ANY part was found
        if shell_descriptor.asset_kind is None:
            raise ValidationError(
                f"Shell descriptor {db_twin.aas_id} is not attached to a part."
            )

        #######################################################
        ### Sumobdel descriptors (independent of part type) ###
        #######################################################
        db_twin_aspects: List[TwinAspect] = []
        
        # Case 1: include ALL submodel descriptors
        # (here it is assume that the twin entity already contains all twin aspects)
        if include_submodel_descriptors:
            for db_twin_aspect in db_twin.twin_aspects:
                if self._check_twin_aspect_registration(enablement_service_stack_id, db_twin_aspect):
                    db_twin_aspects.append(db_twin_aspect)
        
        # Case 2: include only a single submodel descriptor
        # (here we explicitly load that single one)
        elif include_explicit_submodel_descriptor is not None:
            db_twin_aspect = repos.twin_aspect_repository.get_by_twin_id_submodel_id(
                twin_id=db_twin.id,
                submodel_id=include_explicit_submodel_descriptor,
                include_registrations=True)
            if self._check_twin_aspect_registration(enablement_service_stack_id, db_twin_aspect):
                db_twin_aspects.append(db_twin_aspect)
            else:
                raise NotFoundError(
                    f"Submodel descriptor {include_explicit_submodel_descriptor} not found."
                )

        # If valid twin aspects were collected above, add them to the shell descriptor
        if db_twin_aspects:
            shell_descriptor.submodel_descriptors = [self._create_submodel_descriptor(
                db_twin, db_twin_aspect) for db_twin_aspect in db_twin_aspects]

    def _generate_asset_id(self, db_twin: Twin, db_twin_aspect: TwinAspect) -> str:
        """
        Generate an asset ID based on the twin and aspect information.
        """
        return "dummy:asset:id"  # Placeholder for actual asset ID generation logic

    @staticmethod
    def _add_specific_asset_id(
            specific_asset_ids: List[SpecificAssetId],
            name: str,
            value: str,
            external_subject_id: Optional[str] = None) -> None:

        specific_asset_id = SpecificAssetId(
            name=name,
            value=value,
        )
        if external_subject_id:
            specific_asset_id.external_subject_id = Reference(
                type=ReferenceTypes.EXTERNAL_REFERENCE,
                keys=[ReferenceKey(
                    type=ReferenceKeyTypes.GLOBAL_REFERENCE,
                    value=external_subject_id
                )]
            )
        specific_asset_ids.append(specific_asset_id)

    @staticmethod
    def _check_twin_aspect_registration(enablement_service_stack_id: int, db_twin_aspect: Optional[TwinAspect]) -> bool:
        if not db_twin_aspect:
            return False
        
        db_twin_aspect_registration = db_twin_aspect.find_registration_by_stack_id(enablement_service_stack_id)
        return db_twin_aspect_registration is not None and db_twin_aspect_registration.status == TwinAspectRegistrationStatus.DTR_REGISTERED.value

    def _create_submodel_descriptor(self, db_twin: Twin, db_twin_aspect: TwinAspect) -> SubModelDescriptor:
        semandic_id = db_twin_aspect.semantic_id
        submodel_type_data = get_submodel_type(semandic_id)
        asset_id = self._generate_asset_id(db_twin, db_twin_aspect)

        endpoint = Endpoint(
            interface="SUBMODEL-3.0",
            protocolInformation=ProtocolInformation(
                href=f"{self.data_plane_url}/api/public/{str(db_twin.global_id)}/submodel",
                endpointProtocol="HTTP",
                endpointProtocolVersion=["1.1"],
                subprotocol="DSP",
                subprotocolBody=f"id={asset_id};dspEndpoint={self.control_plane_url}",
                subprotocolBodyEncoding="plain",
                securityAttributes=[
                    ProtocolInformationSecurityAttributes(
                        type=ProtocolInformationSecurityAttributesTypes.NONE,
                        key="NONE",
                        value="NONE"
                    )]
            )
        )

        return SubModelDescriptor(
            id=db_twin_aspect.submodel_id.urn,
            idShort=submodel_type_data.id_short,
            semanticId=Reference(
                type=ReferenceTypes.EXTERNAL_REFERENCE,
                keys=[ReferenceKey(
                    type=ReferenceKeyTypes.GLOBAL_REFERENCE,
                    value=semandic_id
                )]
            ),
            endpoints=[endpoint],
        )
