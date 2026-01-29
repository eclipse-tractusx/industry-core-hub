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

from fastapi import APIRouter, Header, Query, Path
from typing import List, Optional

from services.provider.dtr_facade_service import DTRFacadeService
from models.services.dtr_facade import DtrPagingStrResponse

from tools.crypt_tools import decode_url_base64
from tools.fastapi_util import parse_json_list_parameter, parse_base64_url_uuid

from tractusx_sdk.industry.models.aas.v3 import AssetKind, GetAllShellDescriptorsResponse, GetSubmodelDescriptorsByAssResponse, ShellDescriptor, SpecificAssetId, SubModelDescriptor

router = APIRouter(prefix="/dtr-facade", tags=["Digital Twin Registry Facade"])
dtr_facade_service = DTRFacadeService()

@router.get("/{enablement_service_stack_id}/shell-descriptors",
    operation_id="GetAllAssetAdministrationShellDescriptors",
    description="Returns all Asset Administration Shell Descriptors",
    response_model=GetAllShellDescriptorsResponse)
async def dtr_facade_get_all_asset_administration_shell_descriptors(
    enablement_service_stack_id: int,
    edc_bpn: str = Header(alias="Edc-Bpn", description="The BPN of the consumer delivered by the EDC Data Plane", default=None),
    limit: Optional[int] = Query(ge=1, le=100, description="The maximum number of elements in the response array", default=10),
    cursor: Optional[str] = Query(description="A server-generated identifier retrieved from pagingMetadata that specifies from which position the result listing should continue", default=None),
    asset_kind: Optional[AssetKind] = Query(
        alias="assetKind",
        description="The Asset's kind (Instance or Type)",
        default=None
    ),
    asset_type: Optional[str] = Query(
        alias="assetType",
        description="The Asset's type (UTF8-BASE64-URL-encoded)",
        regex="^[\\x09\\x0A\\x0D\\x20-\\uD7FF\\uE000-\\uFFFD\\U00010000-\\U0010FFFF]*$",
        default=None
    ),
) -> GetAllShellDescriptorsResponse:

    return dtr_facade_service.get_all_asset_administration_shell_descriptors(
        enablement_service_stack_id,
        edc_bpn=edc_bpn,
        asset_kind=asset_kind,
        asset_type=decode_url_base64(asset_type) if asset_type else None,
        limit=limit,
        cursor_str=cursor)

@router.get("/{enablement_service_stack_id}/shell-descriptors/{aasIdentifier}",
    operation_id="GetAssetAdministrationShellDescriptorById",
    description="Returns a specific Asset Administration Shell Descriptor",
    response_model=ShellDescriptor)
async def dtr_facade_get_asset_administration_shell_descriptor_by_id(
    enablement_service_stack_id: int,
    aasIdentifier: str = Path(description="The Asset Administration Shell's unique id (UTF8-BASE64-URL-encoded)"),
    edc_bpn: str = Header(alias="Edc-Bpn", description="The BPN of the consumer delivered by the EDC Data Plane", default=None),
) -> ShellDescriptor:

    return dtr_facade_service.get_asset_administration_shell_descriptor_by_id(enablement_service_stack_id, parse_base64_url_uuid(aasIdentifier), edc_bpn)

@router.get("/{enablement_service_stack_id}/shell-descriptors/{aasIdentifier}/submodel-descriptors",
    operation_id="GetAllSubmodelDescriptorsThroughSuperpath",
    description="Returns all Submodel Descriptors",
    response_model=GetSubmodelDescriptorsByAssResponse)
async def dtr_facade_get_all_submodel_descriptors_through_superpath(
    enablement_service_stack_id: int,
    aasIdentifier: str = Path(description="The Asset Administration Shell's unique id (UTF8-BASE64-URL-encoded)"),
    edc_bpn: str = Header(alias="Edc-Bpn", description="The BPN of the consumer delivered by the EDC Data Plane", default=None),
    limit: Optional[int] = Query(ge=1, le=100, description="The maximum number of elements in the response array", default=10),
    cursor: Optional[str] = Query(description="A server-generated identifier retrieved from pagingMetadata that specifies from which position the result listing should continue", default=None),
) -> GetSubmodelDescriptorsByAssResponse:

    return dtr_facade_service.get_all_submodel_descriptors_through_superpath(
        enablement_service_stack_id=enablement_service_stack_id,
        aas_id=parse_base64_url_uuid(aasIdentifier),
        edc_bpn=edc_bpn,
        limit=limit,
        cursor_str=cursor)

@router.get("/{enablement_service_stack_id}/shell-descriptors/{aasIdentifier}/submodel-descriptors/{submodelIdentifier}",
    operation_id="GetSubmodelDescriptorByIdThroughSuperpath",
    description="Returns a specific Submodel Descriptor",
    response_model=SubModelDescriptor)
async def get_submodel_descriptor_by_id_through_superpath(
    enablement_service_stack_id: int,
    aasIdentifier: str = Path(description="The Asset Administration Shell's unique id (UTF8-BASE64-URL-encoded)"),
    submodelIdentifier: str = Path(description="The Submodel’s unique id (UTF8-BASE64-URL-encoded)"),
    edc_bpn: str = Header(alias="Edc-Bpn", description="The BPN of the consumer delivered by the EDC Data Plane", default=None)       
) -> SubModelDescriptor:
    
    return dtr_facade_service.get_submodel_descriptor_by_id_through_superpath(
        enablement_service_stack_id=enablement_service_stack_id,
        aas_id=parse_base64_url_uuid(aasIdentifier),
        submodel_id=parse_base64_url_uuid(submodelIdentifier),
        edc_bpn=edc_bpn)

@router.get("/{enablement_service_stack_id}/lookup/shells",
    operation_id="GetAllAssetAdministrationShellIdsByAssetLink",
    description="Returns a list of Asset Administration Shell ids linked to specific Asset identifiers",
    response_model=DtrPagingStrResponse)
async def dtr_facade_get_all_asset_administration_shell_ids_by_asset_link(
    enablement_service_stack_id: int,
    asset_ids: Optional[List[str]] = Query(alias="assetIds", description="A list of specific Asset identifiers", default=None),
    edc_bpn: str = Header(alias="Edc-Bpn", description="The BPN of the consumer delivered by the EDC Data Plane", default=None),
    limit: Optional[int] = Query(ge=1, le=100, description="The maximum number of elements in the response array", default=10),
    cursor: Optional[str] = Query(description="A server-generated identifier retrieved from pagingMetadata that specifies from which position the result listing should continue", default=None),
) -> DtrPagingStrResponse:

    return dtr_facade_service.get_all_asset_administration_shell_ids_by_asset_link(
        enablement_service_stack_id=enablement_service_stack_id,
        search_params=parse_json_list_parameter(asset_ids),
        edc_bpn=edc_bpn,
        limit=limit,
        cursor_str=cursor)

@router.get("/{enablement_service_stack_id}/lookup/shells/{aasIdentifier}",
    operation_id="GetAllAssetLinksById",
    description="Returns a list of specific Asset identifiers based on an Asset Administration Shell id to edit discoverable content",
    response_model=List[SpecificAssetId])
async def dtr_facade_get_all_asset_links_by_id(
    enablement_service_stack_id: int,
    aasIdentifier: str = Path(description="The Asset Administration Shell's unique id (UTF8-BASE64-URL-encoded)"),
    edc_bpn: str = Header(alias="Edc-Bpn", description="The BPN of the consumer delivered by the EDC Data Plane", default=None),
) -> List[SpecificAssetId]:
    
    return dtr_facade_service.get_all_asset_links_by_id(
        enablement_service_stack_id=enablement_service_stack_id,
        aas_id=parse_base64_url_uuid(aasIdentifier),
        edc_bpn=edc_bpn)
