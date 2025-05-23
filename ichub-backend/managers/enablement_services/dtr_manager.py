#################################################################################
# Eclipse Tractus-X - Industry Core Hub Backend
#
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

from tractusx_sdk.industry.services import AasService
from tractusx_sdk.industry.models.aas.v3 import (
    Endpoint,
    ShellDescriptor,
    SubModelDescriptor,
    SpecificAssetId,
    Reference,
    ReferenceTypes,
    ReferenceKeyTypes,
    ReferenceKey,
    Result,
    ProtocolInformationSecurityAttributesTypes,
    ProtocolInformation,
    ProtocolInformationSecurityAttributes,
)
from typing import Dict, Optional
from uuid import UUID
from urllib import parse

from managers.config.config_manager import ConfigManager
from tools.aspect_id_tools import extract_aspect_id_name_from_urn_camelcase
from urllib.parse import urljoin

import json
import logging
logger = logging.getLogger(__name__)

class DTRManager:
    def __init__(
        self,
        dtr_url: str,
        dtr_lookup_url: str,
        api_path: str,
    ):
        self.dtr_url = dtr_url
        self.dtr_lookup_url = dtr_lookup_url
        self.aas_service = AasService(
            base_url=dtr_url,
            base_lookup_url=dtr_lookup_url,
            api_path=api_path,
        )
        self.edc_controlplane_hostname = ConfigManager.get_config(
             "edc.controlplane.hostname"
         )
        self.edc_controlplane_catalog_path = ConfigManager.get_config(
            "edc.controlplane.protocolPath"
        )
        self.edc_dataplane_hostname = ConfigManager.get_config("edc.dataplane.hostname")
        self.edc_dataplane_public_path = ConfigManager.get_config(
            "edc.dataplane.publicPath"
        )
        
    @staticmethod
    def get_dtr_url(base_dtr_url: str = '', uri: str = '', api_path: str = '') -> str:
        base_dtr_url = base_dtr_url or ''
        uri = uri or ''
        api_path = api_path or ''

        base_plus_uri = urljoin(base_dtr_url.rstrip('/') + '/', uri.lstrip('/'))
        full_url = urljoin(base_plus_uri.rstrip('/') + '/', api_path.lstrip('/'))
        return full_url
    
    def _reference_from_bpn_list(self, bpn_list, fallback_id=None):
            keys = []
            if bpn_list:
                keys = [
                    ReferenceKey(type=ReferenceKeyTypes.GLOBAL_REFERENCE, value=bpn)
                    for bpn in bpn_list
                ]
            elif fallback_id:
                keys = [ReferenceKey(type=ReferenceKeyTypes.GLOBAL_REFERENCE, value=fallback_id)]
            return Reference(
                type=ReferenceTypes.EXTERNAL_REFERENCE,
                keys=keys,
            )

    def _add_or_update_asset_id(self, name, value, bpn_list, fallback_id=None):
            ref = self._reference_from_bpn_list(bpn_list, fallback_id=fallback_id)
            return SpecificAssetId(name=name, value=value, externalSubjectId=ref)
    def create_or_update_shell_descriptor(self,
        aas_id: UUID,
        global_id: UUID,
        manufacturer_id: str,
        manufacturer_part_id: str,
        customer_part_ids: Dict[str, str] | None,
        part_category: str,
        digital_twin_type: str,
    ) -> ShellDescriptor:
        """
        Registers or updates a twin in the DTR.
        """
        try:
            existing_shell = self.aas_service.get_asset_administration_shell_descriptor_by_id(aas_id.urn)
            logger.info(f"Shell with ID {aas_id} already exists and will be updated.")
            specific_asset_ids = existing_shell.specificAssetIds or []
            existing_keys = {(id.name, id.value) for id in specific_asset_ids}
        except Exception:
            existing_shell = None
            specific_asset_ids = []
            existing_keys = set()

        bpn_list = list(customer_part_ids.values()) if customer_part_ids else []

        if manufacturer_id and ("manufacturerId", manufacturer_id) not in existing_keys:
            specific_asset_ids.append(self._add_or_update_asset_id("manufacturerId", manufacturer_id, bpn_list, fallback_id=manufacturer_id))

        if digital_twin_type and ("digitalTwinType", digital_twin_type) not in existing_keys:
            specific_asset_ids.append(self._add_or_update_asset_id("digitalTwinType", digital_twin_type, bpn_list, fallback_id=manufacturer_id))

        if manufacturer_part_id:
            specific_manufacturer_part_asset_id = SpecificAssetId(
                name="manufacturerPartId",
                value=manufacturer_part_id,
                externalSubjectId=Reference(
                    type=ReferenceTypes.EXTERNAL_REFERENCE,
                    keys=[
                        ReferenceKey(
                            type=ReferenceKeyTypes.GLOBAL_REFERENCE, value="PUBLIC_READABLE"
                        ),
                    ],
                ),
            )  # type: ignore
            specific_asset_ids.append(specific_manufacturer_part_asset_id)

        if customer_part_ids:
            for customer_part_id, bpn in customer_part_ids.items():
                if not customer_part_id:
                    continue
                key = ("customerPartId", customer_part_id)
                if key not in existing_keys:
                    specific_customer_part_asset_id = SpecificAssetId(
                        name="customerPartId",
                        value=customer_part_id,
                        externalSubjectId=self._reference_from_bpn_list([bpn]),
                    )
                    specific_asset_ids.append(specific_customer_part_asset_id)

        shell = ShellDescriptor(
            id=aas_id.urn,
            globalAssetId=global_id.urn,
            specificAssetIds=specific_asset_ids,
        )

        if existing_shell:
            res = self.aas_service.update_asset_administration_shell_descriptor(shell, bpn=manufacturer_id)
        else:
            res = self.aas_service.create_asset_administration_shell_descriptor(shell)

        if isinstance(res, Result):
            raise Exception("Error creating or updating shell descriptor", res.to_json_string())

        return res
        
    
    def create_shell_descriptor(
        self,
        aas_id: UUID,
        global_id: UUID,
        manufacturer_id: str,
        manufacturer_part_id: str,
        customer_part_ids: Dict[str, str] | None,
        part_category: str,
        digital_twin_type: str,
    ) -> ShellDescriptor:
        """
        Registers a twin in the DTR.
        """
        specific_asset_ids = []
        # Prepare BPN list from customer_part_ids, if present
        bpn_list = list(customer_part_ids.values()) if customer_part_ids else []

        # manufacturerId
        if manufacturer_id:
            ref_keys = (
                [ReferenceKey(type=ReferenceKeyTypes.GLOBAL_REFERENCE, value=bpn) for bpn in bpn_list]
                if bpn_list else
                [ReferenceKey(type=ReferenceKeyTypes.GLOBAL_REFERENCE, value=manufacturer_id)]
            )
            specific_manufacturer_asset_id = SpecificAssetId(
                name="manufacturerId",
                value=manufacturer_id,
                externalSubjectId=Reference(
                    type=ReferenceTypes.EXTERNAL_REFERENCE,
                    keys=ref_keys,
                ),
            )  # type: ignore
            specific_asset_ids.append(specific_manufacturer_asset_id)

        # digitalTwinType
        if digital_twin_type:
            ref_keys = (
                [ReferenceKey(type=ReferenceKeyTypes.GLOBAL_REFERENCE, value=bpn) for bpn in bpn_list]
                if bpn_list else
                [ReferenceKey(type=ReferenceKeyTypes.GLOBAL_REFERENCE, value=manufacturer_id)]
            )
            digital_twin_asset_id = SpecificAssetId(
                name="digitalTwinType",
                value=digital_twin_type,
                externalSubjectId=Reference(
                    type=ReferenceTypes.EXTERNAL_REFERENCE,
                    keys=ref_keys,
                ),
            )  # type: ignore
            specific_asset_ids.append(digital_twin_asset_id)

        # manufacturerPartId
        if manufacturer_part_id:
            specific_manufacturer_part_asset_id = SpecificAssetId(
                name="manufacturerPartId",
                value=manufacturer_part_id,
                externalSubjectId=Reference(
                    type=ReferenceTypes.EXTERNAL_REFERENCE,
                    keys=[
                        ReferenceKey(
                            type=ReferenceKeyTypes.GLOBAL_REFERENCE, value="PUBLIC_READABLE"
                        ),
                    ],
                ),
            )  # type: ignore
            specific_asset_ids.append(specific_manufacturer_part_asset_id)

        # customerPartId(s)
        if customer_part_ids is not None and customer_part_ids != {}:
            for customer_part_id, bpn in customer_part_ids.items():
                if not customer_part_id:
                    continue
                ref_keys = (
                    [ReferenceKey(type=ReferenceKeyTypes.GLOBAL_REFERENCE, value=bpn)]
                    if bpn else
                    ([ReferenceKey(type=ReferenceKeyTypes.GLOBAL_REFERENCE, value=manufacturer_id)] if manufacturer_id else [])
                )
                specific_customer_part_asset_id = SpecificAssetId(
                    name="customerPartId",
                    value=customer_part_id,
                    externalSubjectId=Reference(
                        type=ReferenceTypes.EXTERNAL_REFERENCE,
                        keys=ref_keys,
                    ),
                )  # type: ignore
                specific_asset_ids.append(specific_customer_part_asset_id)

        shell = ShellDescriptor(
            id=aas_id.urn,
            globalAssetId=global_id.urn,
            specificAssetIds=specific_asset_ids,
        )  # type: ignore

        res = self.aas_service.create_asset_administration_shell_descriptor(shell)
        if isinstance(res, Result):
            raise Exception("Error creating shell descriptor", res.to_json_string())
        return res

    def create_or_update_shell_descriptor_serialized_part(self,
        aas_id: UUID,
        global_id: UUID,
        manufacturer_id: str,
        manufacturer_part_id: str,
        customer_part_id: str,
        part_instance_id: str,
        van: Optional[str],
        business_partner_number: str,
        part_category: str) -> ShellDescriptor:
        """
        Registers or updates a serialized part twin in the DTR.
        """
        try:
            existing_shell = self.aas_service.get_asset_administration_shell_descriptor_by_id(aas_id.urn)
            logger.info(f"Shell with ID {aas_id} already exists and will be updated.")
            specific_asset_ids = existing_shell.specificAssetIds or []
            existing_keys = {(id.name, id.value) for id in specific_asset_ids}
        except Exception:
            existing_shell = None
            specific_asset_ids = []
            existing_keys = set()

        if manufacturer_id and ("manufacturerId", manufacturer_id) not in existing_keys:
            specific_asset_ids.append(self._add_or_update_asset_id("manufacturerId", manufacturer_id, [business_partner_number], fallback_id=manufacturer_id))

        specific_asset_ids.append(self._add_or_update_asset_id("digitalTwinType", 'Instance', [business_partner_number], fallback_id=manufacturer_id))

        if manufacturer_part_id:
            specific_manufacturer_part_asset_id = SpecificAssetId(
                name="manufacturerPartId",
                value=manufacturer_part_id,
                externalSubjectId=Reference(
                    type=ReferenceTypes.EXTERNAL_REFERENCE,
                    keys=[
                        ReferenceKey(
                            type=ReferenceKeyTypes.GLOBAL_REFERENCE, value="PUBLIC_READABLE"
                        ),
                    ],
                ),
            )  # type: ignore
            specific_asset_ids.append(specific_manufacturer_part_asset_id)

        key = ("customerPartId", customer_part_id)
        if key not in existing_keys:
            specific_customer_part_asset_id = SpecificAssetId(
                name="customerPartId",
                value=customer_part_id,
                externalSubjectId=self._reference_from_bpn_list([business_partner_number]),
            )
            specific_asset_ids.append(specific_customer_part_asset_id)

        specific_asset_ids.append(self._add_or_update_asset_id("partInstanceId", part_instance_id, [business_partner_number], fallback_id=manufacturer_id))
        
        if van and ("van", van) not in existing_keys:
            specific_asset_ids.append(self._add_or_update_asset_id("van", van, [business_partner_number], fallback_id=manufacturer_id))

        shell = ShellDescriptor(
            id=aas_id.urn,
            globalAssetId=global_id.urn,
            specificAssetIds=specific_asset_ids,
        )

        if existing_shell:
            res = self.aas_service.update_asset_administration_shell_descriptor(shell)
        else:
            res = self.aas_service.create_asset_administration_shell_descriptor(shell)

        if isinstance(res, Result):
            raise Exception("Error creating or updating shell descriptor", res.to_json_string())

        return res

    def create_submodel_descriptor(
        self,
        aas_id: UUID|str,
        submodel_id: UUID|str,
        semantic_id: str,
        edc_asset_id: str,
    ) -> SubModelDescriptor:
        """
        Creates a submodel descriptor in the DTR.
        """
        aspect_id_name = extract_aspect_id_name_from_urn_camelcase(semantic_id)

        # semantic_id must be added to the submodel descriptor (CX-00002)
        semantic_id_reference = Reference(
            type=ReferenceTypes.EXTERNAL_REFERENCE,
            keys=[
                ReferenceKey(type=ReferenceKeyTypes.GLOBAL_REFERENCE, value=semantic_id)
            ],
        )
        if(isinstance(aas_id, str)):
            aas_id = UUID(aas_id)
        if(isinstance(submodel_id, str)):
            submodel_id = UUID(submodel_id)
        # Check that href and DSP URLs are valid
        
        href_url = f"{self.edc_dataplane_hostname}{self.edc_dataplane_public_path}/{submodel_id.urn}/submodel"

        parsed_href_url = parse.urlparse(href_url)
        if not (parsed_href_url.scheme == "https" and parsed_href_url.netloc):
            raise Exception(f"Generated href URL is malformed: {href_url}")

        dsp_endpoint_url = (
            f"{self.edc_controlplane_hostname}{self.edc_controlplane_catalog_path}"
        )
        parsed_dsp_endpoint_url = parse.urlparse(dsp_endpoint_url)
        if not (
            parsed_dsp_endpoint_url.scheme == "https" and parsed_dsp_endpoint_url.netloc
        ):
            raise Exception(
                f"Generated DSP endpoint URL for subprotocolBody is malformed: {dsp_endpoint_url}"
            )

        subprotocol_body_str = f"id={edc_asset_id};dspEndpoint={dsp_endpoint_url}"

        endpoint = Endpoint(
            interface="SUBMODEL-3.0",
            protocolInformation=ProtocolInformation(
                href=href_url,
                endpointProtocol="HTTP",
                endpointProtocolVersion=["1.1"],
                subprotocol="DSP",
                subprotocolBody=subprotocol_body_str,
                subprotocolBodyEncoding="plain",
                securityAttributes=[
                    ProtocolInformationSecurityAttributes(
                        type=ProtocolInformationSecurityAttributesTypes.NONE,
                        key="NONE",
                        value="NONE",
                    )
                ],  # type: ignore
            ),  # type: ignore
        )
        submodel = SubModelDescriptor(
            id=submodel_id.urn,
            idShort=aspect_id_name,
            semanticId=semantic_id_reference,
            endpoints=[endpoint],
        )  # type: ignore
        
        res = self.aas_service.create_submodel_descriptor(aas_id.urn, submodel)
        if isinstance(res, Result):
            raise Exception("Error creating submodels descriptor", res.to_json_string())
        return res

    def get_shell_descriptor_by_id(self, aas_id: UUID) -> ShellDescriptor:
        """
        Retrieves a shell descriptor from the DTR.
        """
        res = self.aas_service.get_asset_administration_shell_descriptor_by_id(
            aas_id.urn
        )
        if isinstance(res, Result):
            raise Exception("Error retrieving shell descriptor", res.to_json_string())
        return res

    def get_submodel_descriptor_by_id(
        self, aas_id: UUID, submodel_id: UUID
    ) -> SubModelDescriptor:
        """
        Retrieves a submodel descriptor from the DTR.
        """
        res = self.aas_service.get_submodel_descriptor_by_ass_and_submodel_id(
            aas_id.urn, submodel_id.urn
        )
        if isinstance(res, Result):
            raise Exception(
                "Error retrieving submodel descriptor", res.to_json_string()
            )
        return res

    def delete_shell_descriptor(self, aas_id: UUID) -> None:
        """
        Deletes a shell descriptor in the DTR.
        """
        res = self.aas_service.delete_asset_administration_shell_descriptor(aas_id.urn)
        if isinstance(res, Result):
            raise Exception("Error deleting shell descriptor", res.to_json_string())

    def delete_submodel_descriptor(self, aas_id: UUID, submodel_id: UUID) -> None:
        """
        Deletes a submodel descriptor in the DTR.
        """
        res = self.aas_service.delete_submodel_descriptor(aas_id.urn, submodel_id.urn)
        if isinstance(res, Result):
            raise Exception("Error deleting submodel descriptor", res.to_json_string())
