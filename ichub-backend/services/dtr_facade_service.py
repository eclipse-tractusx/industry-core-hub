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

from typing import Any, Dict, List, Optional
from uuid import UUID
from base64 import b64decode
from urllib.parse import quote

from services.twin_management_service import TwinManagementService
from managers.metadata_database.manager import RepositoryManagerFactory
from tools.submodel_type_util import SubmodelType, get_submodel_type

class TwinNotFoundError(ValueError):
    """
    Exception raised when a requested twin is not found in the database.
    """

class NotAuthorizedError(ValueError):
    """
    Exception raised when a requested twin is not authorized for the specified business partner.
    """

class DTRFacadeService:
    """
    Service class for managing DTR facade operations.
    """
    
    def __init__(self, control_plane_url: str = "https://control.plane.url", data_plane_url: str = "https://data.plane.url"):
        self.twin_management_service = TwinManagementService()
        self.control_plane_url = control_plane_url
        self.data_plane_url = data_plane_url

    def get_shell_descriptor(self, aas_id_b64: str, edc_bpn: Optional[str] = None) -> Dict[str, Any]:
        """
        Get the shell descriptor for a given AAS ID.
        """
        # Decode the base64-encoded AAS ID
        aas_id = UUID(b64decode(aas_id_b64).decode('utf-8'))

        result = {
            "id": aas_id.urn,
            "assetType": "AssetType"
        }

        specific_asset_ids: List[Dict[str, Any]] = []

        with RepositoryManagerFactory.create() as repos:
            db_twin = repos.twin_repository.find_by_dtr_aas_id(aas_id, include_aspects=True)
            
            if db_twin is None:
                raise TwinNotFoundError(f"Shell descriptor {aas_id} not found.")
            
            result["globalAssetId"] = db_twin.global_id.urn

            db_catalog_part = repos.catalog_part_repository.get_by_twin_id(db_twin.id)
            if db_catalog_part:

                # Called from a partner => check if the catalog part is shared with the partner
                if edc_bpn:
                    db_partner_catalog_part = db_catalog_part.find_partner_catalog_part_by_bpnl(edc_bpn)

                    # Not found => then the partner has no access to the twin
                    if not db_partner_catalog_part:
                        raise NotAuthorizedError(f"Catalog part with AAS ID {aas_id} not shared with business partner {edc_bpn}.")
                    
                    db_partner_catalog_parts = [db_partner_catalog_part]
                else:
                    db_partner_catalog_parts = db_catalog_part.partner_catalog_parts

                
                result["assetKind"] = "Type"
                self._add_specific_asset_id(
                    specific_asset_ids,
                    "manufacturerPartId",
                    db_catalog_part.manufacturer_part_id,
                    "PUBLIC_READABLE"
                )
                
                for db_partner_catalog_part in db_partner_catalog_parts:
                    self._add_specific_asset_id(
                        specific_asset_ids,
                        "digitalTwinType",
                        "PartType",
                        db_partner_catalog_part.business_partner.bpnl
                    )
                    
                    self._add_specific_asset_id(
                        specific_asset_ids,
                        "manufacturerId",
                        db_catalog_part.legal_entity.bpnl,
                        db_partner_catalog_part.business_partner.bpnl
                    )

                    self._add_specific_asset_id(
                        specific_asset_ids,
                        "customerPartId",
                        db_partner_catalog_part.customer_part_id,
                        db_partner_catalog_part.business_partner.bpnl
                    )

                submodel_descriptors: List[Dict[str, Any]] = []
                for db_twin_aspect in db_twin.twin_aspects:
                    semandic_id = db_twin_aspect.semantic_id
                    submodel_type_data = get_submodel_type(semandic_id)
                    asset_id = self._generate_asset_id(db_twin, db_twin_aspect)

                    entry = {
                        "id": db_twin_aspect.submodel_id.urn,
                        "idShort": submodel_type_data.id_short,
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
                                "href": f"{self.data_plane_url}/api/public/{quote(semandic_id)}/{str(db_twin.global_id)}/submodel",
                                "endpointProtocol": "HTTP",
                                "endpointProtocolVersion": [
                                "1.1"
                                ],
                                "subprotocol": "DSP",
                                "subprotocolBody": f"id={asset_id};dspEndpoint={self.control_plane_url}",
                                "subprotocolBodyEncoding": "plain",
                                "securityAttributes": [
                                {
                                    "type": "NONE",
                                    "key": "NONE",
                                    "value": "NONE"
                                }
                                ]
                            }
                            }
                        ],                        
                    }
                                            
                    submodel_descriptors.append(entry)
                

                result["specificAssetIds"] = specific_asset_ids
                if submodel_descriptors:
                    result["submodelDescriptors"] = submodel_descriptors


        return result

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
        
        entry = {
            "supplementalSemanticIds": [],
            "name": name,
            "value": value
        }
        if external_subject_id:
            entry["externalSubjectId"] = {
                "type": "ExternalReference",
                "keys": [
                    {
                        "type": "GlobalReference",
                        "value": external_subject_id
                    }
                ]
            }

        specific_asset_ids.append(entry)