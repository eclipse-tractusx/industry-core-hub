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
    MultiLanguage,
    AssetKind,
)
from typing import Dict, Optional
from uuid import UUID
from urllib import parse

from tools.aspect_id_tools import extract_aspect_id_name_from_urn_camelcase
from tools.exceptions import ExternalAPIError, InvalidError
from urllib.parse import urljoin

import logging
import re
logger = logging.getLogger(__name__)

class DtrProviderManager:
    def __init__(
        self,
        dtr_url: str,
        dtr_lookup_url: str,
        api_path: str
    ):
        self.dtr_url = dtr_url
        self.dtr_lookup_url = dtr_lookup_url
        self.aas_service = AasService(
            base_url=dtr_url,
            base_lookup_url=dtr_lookup_url,
            api_path=api_path,
        )
        
    @staticmethod
    def get_dtr_url(base_dtr_url: str = '', uri: str = '', api_path: str = '') -> str:
        base_dtr_url = base_dtr_url or ''
        uri = uri or ''
        api_path = api_path or ''

        base_plus_uri = urljoin(base_dtr_url.rstrip('/') + '/', uri.lstrip('/'))
        full_url = urljoin(base_plus_uri.rstrip('/') + '/', api_path.lstrip('/'))
        return full_url

    @staticmethod
    def _sanitize_id_short(value: str) -> str:
        """
        Sanitize an idShort according to AAS constraints:
        - allowed chars: letters, digits, underscore
        - must start with a letter
        - max length: 128
        - spaces -> underscore; collapse repeated underscores
        """
        if value is None:
            return value
        s = str(value).strip()
        # Replace spaces with underscores first
        s = s.replace(" ", "_")
        # Replace any disallowed characters with underscore
        s = re.sub(r"[^A-Za-z0-9_]+", "_", s)
        # Collapse multiple underscores
        s = re.sub(r"_+", "_", s)
        # Remove leading underscores
        s = s.lstrip("_")
        # Ensure it starts with a letter; if not, prefix with 'A'
        if not s or not re.match(r"[A-Za-z]", s[0]):
            s = "A" + s
        # Enforce max length 128
        if len(s) > 128:
            s = s[:128]
        return s
    
    def _reference_from_bpn_list(self, bpn_list:list[str], fallback_id=None):
        """
        Creates a Reference object from a list of BPNs (Business Partner Numbers).
        If the list is empty and a fallback ID is provided, uses the fallback ID instead.

        Args:
            bpn_list (list): A list of BPNs to include in the Reference.
            fallback_id (str, optional): A fallback identifier to use if the BPN list is empty.

        Returns:
            Reference: A Reference object containing the specified keys.
        """
        keys = []
        if bpn_list:
            # Create ReferenceKeys from BPNs if list is provided
            keys = [
                ReferenceKey(type=ReferenceKeyTypes.GLOBAL_REFERENCE, value=bpn)
                for bpn in bpn_list
            ]
        elif fallback_id:
            # Use fallback_id if BPN list is empty
            keys = [ReferenceKey(type=ReferenceKeyTypes.GLOBAL_REFERENCE, value=fallback_id)]
        # Return a Reference object containing the constructed keys
        return Reference(
            type=ReferenceTypes.EXTERNAL_REFERENCE,
            keys=keys,
        )

    def _add_or_update_asset_id(self, name:str, value:str, bpn_list:list[str], fallback_id=None, supplemental_semantic_ids=None):
        """
        Creates a SpecificAssetId using the given name and value, associated with a Reference
        built from a list of BPNs or a fallback ID.

        Args:
            name (str): The name of the asset ID.
            value (str): The value of the asset ID.
            bpn_list (list): List of BPNs to associate with the asset.
            fallback_id (str, optional): Fallback identifier if BPN list is empty.

        Returns:
            SpecificAssetId: The constructed asset ID object.
        """
        # Generate a Reference from BPN list or fallback
        ref = self._reference_from_bpn_list(bpn_list, fallback_id=fallback_id)
        # Create a new SpecificAssetId object with the Reference
        return SpecificAssetId(name=name, value=value, externalSubjectId=ref, supplementalSemanticIds=supplemental_semantic_ids)
    
    def upsert_asset_id(self, manufacturer_id:str, name:str, value:str, bpn_keys:list, specific_asset_ids:list[SpecificAssetId], supplemental_semantic_ids=None) -> list[SpecificAssetId]:
        """
        Updates an existing SpecificAssetId in the list with new BPN references if it exists,
        or appends a new one if it does not.

        Args:
            manufacturer_id (str): Manufacturer BPN to be included if needed.
            name (str): Name of the asset ID.
            value (str): Value of the asset ID.
            bpn_keys (list): List of BPN keys to include in the reference.
            specific_asset_ids (list[SpecificAssetId]): Existing list of asset IDs.

        Returns:
            list[SpecificAssetId]: Updated list of asset IDs.
        """
        for sa_id in specific_asset_ids:
            # Find existing asset ID with matching name and value
            if sa_id.name == name and sa_id.value == value:
                self._update_existing_asset_id_bpn_keys(bpn_keys, sa_id)
                # Return updated list after modification
                return specific_asset_ids
        # Append a new SpecificAssetId if not already in the list
        specific_asset_ids.append(SpecificAssetId(
            name=name,
            value=value,
            externalSubjectId=Reference(
                type=ReferenceTypes.EXTERNAL_REFERENCE,
                keys=[ReferenceKey(type=ReferenceKeyTypes.GLOBAL_REFERENCE, value=bpn) for bpn in bpn_keys] or
                    [ReferenceKey(type=ReferenceKeyTypes.GLOBAL_REFERENCE, value=manufacturer_id)]
            ),
            supplementalSemanticIds=supplemental_semantic_ids
        ))
        return specific_asset_ids

    @staticmethod
    def _update_existing_asset_id_bpn_keys(bpn_keys, sa_id):
        """
        Updates the `external_subject_id` of the given `sa_id` by adding new BPN keys from `bpn_keys` that are not already present.

        If `external_subject_id` is missing, it initializes it as a `Reference` with an empty list of keys.
        If `supplemental_semantic_ids` is empty, it sets it to `None`.
        For each BPN key in `bpn_keys`, if it does not already exist in `external_subject_id.keys`, it appends a new `ReferenceKey` of type `GLOBAL_REFERENCE` with the BPN value.
        """
        # Initialize Reference if missing
        if not sa_id.external_subject_id:
            sa_id.external_subject_id = Reference(type=ReferenceTypes.EXTERNAL_REFERENCE, keys=[])
        # Get existing BPN key values for comparison
        existing_key_values = {k.value for k in sa_id.external_subject_id.keys}
        # Normalize supplementalSemanticIds if empty
        if len(sa_id.supplemental_semantic_ids) == 0:
            sa_id.supplemental_semantic_ids = None
        # Add new BPN keys that are not already present
        for bpn in bpn_keys:
            if bpn not in existing_key_values:
                sa_id.external_subject_id.keys.append(
                    ReferenceKey(type=ReferenceKeyTypes.GLOBAL_REFERENCE, value=bpn)
                )

    def create_or_update_shell_descriptor(self,
        aas_id: UUID,
        global_id: UUID,
        manufacturer_id: str,
        manufacturer_part_id: str,
        customer_part_ids: Dict[str, str] | None,
        digital_twin_type: str,
        asset_type: Optional[str] = None,
        asset_kind: Optional[str] = None,
        id_short: Optional[str] = None,
        part_instance_id: Optional[str] = None,
        van: Optional[str] = None,
        description: Optional[str] = None,
        display_name: Optional[str] = None,
    ) -> ShellDescriptor:
        """
        Registers or updates a twin in the DTR.
        """
        # Flag to indicate whether the shell already exists in the DTR
        exists = False

        # Prepare containers for asset IDs and key lookup
        specific_asset_ids = []
        existing_keys = {}
        res = None

        # Try retrieving an existing shell descriptor using the AAS ID and manufacturer BPN
        existing_shell:ShellDescriptor = self.aas_service.get_asset_administration_shell_descriptor_by_id(
            aas_identifier=aas_id.urn, bpn=manufacturer_id
        )
        if not isinstance(existing_shell, Result):
            # If shell exists, set flag and extract existing specific asset IDs
            exists = True
            logger.info(f"Shell with ID {aas_id} already exists, the information will be updated.")
            specific_asset_ids = existing_shell.specific_asset_ids or []
            # Build a set of (name, value) pairs for quick lookup of existing asset IDs
            existing_keys = {(id.name, id.value) for id in specific_asset_ids}
        
        _display_name_obj = None
        if display_name:
            _display_name_obj = [MultiLanguage(
                language="en",
                text=display_name
            )]
        
        _description_obj = None
        if description:
            _description_obj = [MultiLanguage(
                language="en",
                text=description
            )]
            
        # Convert asset_kind string to enum if provided
        asset_kind_enum = None
        if asset_kind:
            try:
                # AssetKind enum values are in proper case (Instance, Type, NotApplicable)
                # First try the exact value, then try title case
                if asset_kind in [e.value for e in AssetKind]:
                    asset_kind_enum = AssetKind(asset_kind)
                else:
                    # Try title case for common variations
                    asset_kind_title = asset_kind.title()
                    asset_kind_enum = AssetKind(asset_kind_title)
            except ValueError:
                logger.warning(f"Invalid asset_kind value: {asset_kind}. Valid values are: {[e.value for e in AssetKind]}")
        
        # Construct the BPN list from customer_part_ids and ensure manufacturer_id is included
        bpn_list = list(customer_part_ids.values()) if customer_part_ids else []
        bpn_list.append(manufacturer_id)  # Ensure manufacturer_id is always included

        # Determine BPN keys for reference association (used for upsert)
        bpn_keys = bpn_list or [manufacturer_id]

        # Add or update specific asset IDs for manufacturerId, digitalTwinType, manufacturerPartId
        if manufacturer_id:
            # Upsert manufacturerId asset ID with relevant BPN keys
            specific_asset_ids = self.upsert_asset_id(manufacturer_id, "manufacturerId", manufacturer_id, bpn_keys, specific_asset_ids)
        if digital_twin_type:
            # Upsert digitalTwinType asset ID with relevant BPN keys
            specific_asset_ids = self.upsert_asset_id(manufacturer_id, "digitalTwinType", digital_twin_type, bpn_keys, specific_asset_ids)
        if manufacturer_part_id:
            # Upsert manufacturerPartId asset ID with relevant BPN keys
            specific_asset_ids = self.upsert_asset_id(manufacturer_id, "manufacturerPartId", manufacturer_part_id, bpn_keys, specific_asset_ids)

        if part_instance_id:
            # Upsert partInstanceId asset ID with relevant BPN keys
            specific_asset_ids = self.upsert_asset_id(manufacturer_id, "partInstanceId", part_instance_id, bpn_keys, specific_asset_ids)
        
        if van:
            # Upsert van asset ID with relevant BPN keys
            specific_asset_ids = self.upsert_asset_id(manufacturer_id, "van", van, bpn_keys, specific_asset_ids)
        
        # Add or update customer part IDs
        if customer_part_ids:
            specific_asset_ids = self._update_or_append_customer_part_ids(specific_asset_ids, customer_part_ids, existing_keys)
        
        if id_short:
            id_short = self._sanitize_id_short(id_short)
        
        if not exists:
            # If shell did not exist, create a new one with the constructed asset IDs
            shell = ShellDescriptor(
                id=aas_id.urn,
                idShort=id_short,
                displayName=_display_name_obj,
                description=_description_obj,
                assetType=asset_type,
                assetKind=asset_kind_enum,
                globalAssetId=global_id.urn,
                specificAssetIds=specific_asset_ids,
            )
            logger.info(f"Creating new twin with id {aas_id.urn}!")
            res = self.aas_service.create_asset_administration_shell_descriptor(shell_descriptor=shell)
            if isinstance(res, Result):
                raise ExternalAPIError("Error creating or updating shell descriptor: " + "\n" + res.to_json_string())
            return res
        
        # If shell existed, update it in the DTR with new asset IDs and BPNs
        existing_shell.specific_asset_ids = specific_asset_ids
        if id_short:
            existing_shell.id_short = id_short
        
        if _description_obj:
            existing_shell.description = _description_obj
        
        if _display_name_obj:
            existing_shell.display_name = _display_name_obj
        
        if asset_type:
            existing_shell.asset_type = asset_type
        
        if asset_kind_enum:
            existing_shell.asset_kind = asset_kind_enum
        
        logger.info(f"Sharing Asset Administration Shell [{aas_id.urn}] with {bpn_list}")
        try:
            res = self.aas_service.update_asset_administration_shell_descriptor(
                shell_descriptor=existing_shell, aas_identifier=aas_id.urn, bpn=manufacturer_id
            )
            logger.info(f"Successfully updated the AAS with id {aas_id.urn}!")
        except Exception as e:
            logger.error(f"Failed to update AAS {aas_id.urn}: {e}")

        # Raise exception if service returned an error
        if isinstance(res, Result):
            raise ExternalAPIError("Error creating or updating shell descriptor: " + "\n" + res.to_json_string())

        return res
        
    def create_submodel_descriptor(
        self,
        aas_id: UUID|str,
        submodel_id: UUID|str,
        semantic_id: str,
        connector_asset_id: str,
        dsp_endpoint_url: str,
        href_url: str
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
        
        parsed_href_url = parse.urlparse(f"{href_url}/{submodel_id.urn}/submodel")
        if not (parsed_href_url.scheme == "https" and parsed_href_url.netloc):
            raise InvalidError(f"Generated href URL is malformed: {href_url}")


        parsed_dsp_endpoint_url = parse.urlparse(dsp_endpoint_url)
        if not (
            parsed_dsp_endpoint_url.scheme == "https" and parsed_dsp_endpoint_url.netloc
        ):
            raise InvalidError(
                f"Generated DSP endpoint URL for subprotocolBody is malformed: {dsp_endpoint_url}"
            )

        subprotocol_body_str = f"id={connector_asset_id};dspEndpoint={dsp_endpoint_url}"

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
            raise ExternalAPIError("Error creating submodels descriptor: " + "\n" +res.to_json_string())
        return res

    def get_shell_descriptor_by_id(self, aas_id: UUID) -> ShellDescriptor:
        """
        Retrieves a shell descriptor from the DTR.
        """
        res = self.aas_service.get_asset_administration_shell_descriptor_by_id(
            aas_id.urn
        )
        if isinstance(res, Result):
            raise ExternalAPIError("Error retrieving shell descriptor: " + "\n" + res.to_json_string())
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
            raise ExternalAPIError(
                "Error retrieving submodel descriptor: " + "\n" + res.to_json_string()
            )
        return res

    def delete_shell_descriptor(self, aas_id: UUID) -> None:
        """
        Deletes a shell descriptor in the DTR.
        """
        res = self.aas_service.delete_asset_administration_shell_descriptor(aas_id.urn)
        if isinstance(res, Result):
            raise ExternalAPIError("Error deleting shell descriptor: " + "\n" + res.to_json_string())

    def delete_submodel_descriptor(self, aas_id: UUID, submodel_id: UUID) -> None:
        """
        Deletes a submodel descriptor in the DTR.
        """
        res = self.aas_service.delete_submodel_descriptor(aas_id.urn, submodel_id.urn)
        if isinstance(res, Result):
            raise ExternalAPIError("Error deleting submodel descriptor: " + "\n" + res.to_json_string())


    def _update_or_append_customer_part_ids(
        self,
        specific_asset_ids: list[SpecificAssetId],
        customer_part_ids: Dict[str, str],
        existing_keys: set,
        supplemental_semantic_ids=None
    ) -> list[SpecificAssetId]:
        """
        Updates or appends customer part ID entries into specific_asset_ids with proper BPN references.
        """
        for customer_part_id, bpn in customer_part_ids.items():
            if not customer_part_id:
                continue
            key = ("customerPartId", customer_part_id)
            if key in existing_keys:
                # If asset ID already exists, update its BPN reference if needed
                specific_asset_ids = self._handle_existing_customer_part_id(specific_asset_ids, customer_part_id, bpn)
            else:
                # Create a new SpecificAssetId for this customerPartId
                specific_customer_part_asset_id = SpecificAssetId(
                    name="customerPartId",
                    value=customer_part_id,
                    externalSubjectId=self._reference_from_bpn_list([bpn]),
                    supplemental_semantic_ids=supplemental_semantic_ids
                )
                specific_asset_ids.append(specific_customer_part_asset_id)
        return specific_asset_ids

    def _handle_existing_customer_part_id(
        self,
        specific_asset_ids: list[SpecificAssetId],
        customer_part_id: str,
        bpn: str
    ) -> list[SpecificAssetId]:
        """
        Handles the logic for updating or appending BPN references to an existing customerPartId asset.
        """
        for sa_id in specific_asset_ids:
            if sa_id.name != "customerPartId":
                continue
            if sa_id.value != customer_part_id:
                continue
            # Get BPNs already associated with this customerPartId
            existing_bpn_values = {k.value for k in sa_id.external_subject_id.keys} if sa_id.external_subject_id else set()
            if bpn in existing_bpn_values:
                # If BPN already present, skip update and log warning
                logger.warning(f"Customer part ID '{customer_part_id}' already shared with BPN '{bpn}'. Skipping update.")
                continue
            if len(sa_id.supplemental_semantic_ids) == 0:
                sa_id.supplemental_semantic_ids = None
            # Append new BPN to existing reference
            sa_id.external_subject_id.keys.append(
                ReferenceKey(type=ReferenceKeyTypes.GLOBAL_REFERENCE, value=bpn)
            )
        return specific_asset_ids
