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
# WITHOUT WARRANTIES OR CONDITIONS,
# either express or implied. See the
# License for the specific language govern in permissions and limitations
# under the License.
#
# SPDX-License-Identifier: Apache-2.0
#################################################################################

from typing import Dict, Any, Optional
from uuid import UUID
from tools.exceptions import InvalidError

SEM_ID_PART_TYPE_INFORMATION_V1 = "urn:samm:io.catenax.part_type_information:1.0.0#PartTypeInformation"


class SubmodelDocumentGenerator:
    """Class to generate submodel documents."""

    def __init__(self):
        pass

    def generate_document(self, semantic_id, data: Dict[str, Any]) -> Dict[str, Any]:
        if semantic_id == SEM_ID_PART_TYPE_INFORMATION_V1:
            return self.generate_part_type_information_v1(**data)
        raise InvalidError(f"Unsupported semantic ID: {semantic_id}")
    
    def generate_part_type_information_v1(self,
        global_id: UUID,
        manufacturer_part_id: str,
        name: str = None,
        bpns: Optional[str] = None) -> Dict[str, Any]:
        """Generate part type information for version 1."""
        
        result = {
            "catenaXId": str(global_id),
            "partTypeInformation": {
                "manufacturerPartId" : manufacturer_part_id,
                "nameAtManufacturer" : name
            }
        }

        if bpns:
            result['partSitesInformationAsPlanned'] = [
                {
                    "catenaXsiteId" : bpns,
                    "function" : "production" # not nice because hardcoded; question is in general if in the future we want to store this in the metdata DB
                }
            ]
        return result