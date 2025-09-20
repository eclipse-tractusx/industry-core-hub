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
from datetime import datetime
from tools.exceptions import InvalidError

SEM_ID_PART_TYPE_INFORMATION_V1 = "urn:samm:io.catenax.part_type_information:1.0.0#PartTypeInformation"
SEM_ID_SERIAL_PART_V3 = "urn:samm:io.catenax.serial_part:3.0.0#SerialPart"


class SubmodelDocumentGenerator:
    """Class to generate submodel documents."""

    def __init__(self):
        pass

    def generate_document(self, semantic_id, data: Dict[str, Any]) -> Dict[str, Any]:
        if semantic_id == SEM_ID_PART_TYPE_INFORMATION_V1:
            return self.generate_part_type_information_v1(**data)
        elif semantic_id == SEM_ID_SERIAL_PART_V3:
            return self.generate_serial_part_v3(**data)
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

    def generate_serial_part_v3(self,
        global_id: UUID,
        manufacturer_id: str,
        manufacturer_part_id: str,
        customer_part_id: Optional[str] = None,
        name: Optional[str] = None,
        part_instance_id: Optional[str] = None,
        van: Optional[str] = None,
        bpns: Optional[str] = None,
        manufacturing_date: Optional[datetime] = None,
        manufacturing_country: Optional[str] = None) -> Dict[str, Any]:
        """Generate serial part information for version 1."""
        
        result = {
            "catenaXId": str(global_id),
            "localIdentifiers": [
                {
                    "value": manufacturer_id,
                    "key": "manufacturerId"
                },
                {
                    "value": part_instance_id,
                    "key": "partInstanceId"
                }
            ],
            "partTypeInformation": {
                "manufacturerPartId": manufacturer_part_id,
                "nameAtManufacturer": name
            }
        }

        # Add customer part ID to part type information if provided
        if customer_part_id:
            result["partTypeInformation"]["customerPartId"] = customer_part_id
            result["partTypeInformation"]["nameAtCustomer"] = name  # Could be different, but using same for now

        # Add VAN to local identifiers if provided
        if van:
            result["localIdentifiers"].append({
                "value": van,
                "key": "van"
            })

        # Add manufacturing information if provided
        if manufacturing_date or manufacturing_country or bpns:
            manufacturing_info = {}
            
            if manufacturing_date:
                manufacturing_info["date"] = manufacturing_date.isoformat()
            
            if manufacturing_country:
                manufacturing_info["country"] = manufacturing_country
            
            if bpns:
                manufacturing_info["sites"] = [
                    {
                        "catenaXsiteId": bpns,
                        "function": "production"
                    }
                ]
            
            result["manufacturingInformation"] = manufacturing_info

        return result