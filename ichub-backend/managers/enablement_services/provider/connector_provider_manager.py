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

from urllib.parse import quote
from tractusx_sdk.dataspace.services.connector import BaseConnectorProviderService
from managers.config.log_manager import LoggingManager
from tools.exceptions import NotFoundError
from tools.constants import ODRL_CONTEXT, CX_POLICY_CONTEXT, TYPE
import json

from .dtr_provider_manager import DtrProviderManager

logger = LoggingManager.get_logger(__name__)
from tools.crypt_tools import blake2b_128bit
class ConnectorProviderManager:
    """Manager for handling EDC (Eclipse Data Space Components Connector) related operations."""

    connector_provider_service: BaseConnectorProviderService

    def __init__(self, 
                 connector_provider_service: BaseConnectorProviderService,
                 ichub_url: str,
                 agreements: list,
                 connector_controlplane_hostname: str,
                 connector_controlplane_catalog_path: str,
                 connector_dataplane_hostname: str,
                 connector_dataplane_public_path: str,
                 path_submodel_dispatcher: str = "/submodel-dispatcher",
                 authorization: bool = False,
                 backend_api_key: str = "X-Api-Key",
                 backend_api_key_value: str = ""):

        self.ichub_url = ichub_url  # for the circular submodel bundles.
        self.path_submodel_dispatcher = path_submodel_dispatcher
        self.agreements = agreements
        self.backend_submodel_dispatcher = self.ichub_url + self.path_submodel_dispatcher

        self.connector_controlplane_hostname = connector_controlplane_hostname
        self.connector_controlplane_catalog_path = connector_controlplane_catalog_path
        self.connector_dataplane_hostname = connector_dataplane_hostname
        self.connector_dataplane_public_path = connector_dataplane_public_path

        # Initialize authorization attributes from parameters
        self.authorization = authorization
        self.backend_api_key = backend_api_key
        self.backend_api_key_value = backend_api_key_value

        self.empty_policy = self.get_empty_policy_config()
        self.connector_service = connector_provider_service

    def get_empty_policy_config(self) -> dict:
        """Returns an empty policy template."""
        return {
            "context": {
                "odrl": ODRL_CONTEXT,
                "cx-policy": CX_POLICY_CONTEXT
            },
            "permission": [],
            "prohibition": [],
            "obligation": []
        }
        
    @staticmethod
    def build_rules(rules: list) -> list:
        """
        Converts a list of policy rules into ODRL-compliant format.

        Each rule may contain constraints and a logical operator, and this method
        wraps the constraints appropriately as either a single Constraint or a LogicalConstraint.
        It also formats the ODRL action and constraint fields as required by the ODRL specification.
        """
        formatted = []
        for rule in rules:
            # Extract constraints and logical operator from the rule
            constraints = rule.get("constraints", [])
            if not constraints:
                continue  # Skip rules with no constraints
            logical_operator = str(rule.get("LogicalConstraint", "")).lower().replace("odrl:", "")
            

            # Determine how to wrap the constraints:
            # - If no logical operator and only one constraint, use a simple Constraint.
            # - Otherwise, use a LogicalConstraint and wrap constraints in the appropriate logic (and/or/xone).
            if logical_operator == "" and len(constraints) == 1:
                # Single constraint, wrap as a Constraint type
                wrapped_constraints = {
                    TYPE: "Constraint",
                    # Format the leftOperand as an ODRL field with @id
                    "odrl:leftOperand": {"@id": constraints[0]["leftOperand"]},
                    # Format the operator as an ODRL field with @id
                    "odrl:operator": {"@id": constraints[0]["operator"]},
                    # Format the rightOperand as an ODRL field (literal value)
                    "odrl:rightOperand": constraints[0]["rightOperand"]
                }
            else:
                ## Here we have a logic operator and multiple constraints, but if the logic operator is not valid, we default to "and"
                # If logical operator is not valid, default to "and" for multiple constraints, else empty
                if logical_operator not in {"and", "or", "xone"}:
                    logical_operator = "and" if len(constraints) > 1 else ""
                # Wrap constraints as a LogicalConstraint with the specified logical operator
                wrapped_constraints = {
                    TYPE: "LogicalConstraint",
                    f"odrl:{logical_operator}": [
                        {
                            TYPE: "Constraint",
                            # Format the leftOperand as an ODRL field with @id
                            "odrl:leftOperand": {"@id": c["leftOperand"]},
                            # Format the operator as an ODRL field with @id
                            "odrl:operator": {"@id": c["operator"]},
                            # Format the rightOperand as an ODRL field (literal value)
                            "odrl:rightOperand": c["rightOperand"]
                        } for c in constraints
                    ]
                }
            # Build the ODRL-compliant rule dict:
            # - "odrl:action" is formatted as an ODRL action with @id.
            # - "odrl:constraint" contains the wrapped constraints (Constraint or LogicalConstraint).
            formatted.append({
                "odrl:action": {"@id": rule.get("action")},
                "odrl:constraint": wrapped_constraints
            })
        return formatted

    def parse_policy_entry_to_odrl(self, entry: dict) -> dict:
        """Parses a policy entry from configuration into ODRL-style format."""
        return {
            "@context": entry.get("context", {
                "odrl": ODRL_CONTEXT,
                "cx-policy": CX_POLICY_CONTEXT
            }),
            TYPE: "PolicyDefinitionRequestDto",
            "policy": {
                TYPE: "odrl:Set",
                "odrl:permission": self.build_rules(entry.get("permission", [])),
                "odrl:prohibition": self.build_rules(entry.get("prohibition", [])),
                "odrl:obligation": self.build_rules(entry.get("obligation", []))
            }
        }

    
    def register_dtr_offer(self, 
                           base_dtr_url:str, 
                           uri:str, 
                           api_path:str, 
                           dtr_policy_config=dict, 
                           dct_type:str="https://w3id.org/catenax/taxonomy#DigitalTwinRegistry", 
                           existing_asset_id:str=None,
                           version="3.0",
                           headers:dict=None) -> tuple[str, str, str, str]:
        
        dtr_url = DtrProviderManager.get_dtr_url(base_dtr_url=base_dtr_url, uri=uri, api_path=api_path)
        ## step 1: Create the submodel bundle asset
        asset_id = self.get_or_create_dtr_asset(dtr_url=dtr_url, dct_type=dct_type, existing_asset_id=existing_asset_id, version=version, headers=headers)

        usage_policy_id, access_policy_id, contract_id = self.get_or_create_contract_with_policies(
            asset_id=asset_id,
            policy_config=dtr_policy_config
        )
        
        return asset_id, usage_policy_id, access_policy_id, contract_id
    
    def get_or_create_contract_with_policies(self, asset_id:str, policy_config:dict) -> tuple[str, str, str]:
        usage_policy_id, access_policy_id = self.get_or_create_usage_and_access_policies(policy_config=policy_config)
        contract_id = self.get_or_create_contract(
            asset_id=asset_id,
            usage_policy_id=usage_policy_id,
            access_policy_id=access_policy_id
        )
        return usage_policy_id, access_policy_id, contract_id
    
    def get_or_create_usage_and_access_policies(self, policy_config:dict) -> tuple[str, str]:
        usage_policy = policy_config.get("usage", self.empty_policy)
        access_policy = policy_config.get("access", self.empty_policy)
        
        usage_policy_id=self.get_or_create_policy(
            usage_policy.get("context", {
                "odrl": ODRL_CONTEXT,
                "cx-policy": CX_POLICY_CONTEXT
            }), 
            permissions=self.build_rules(usage_policy.get("permission", [])),
            obligations=self.build_rules(usage_policy.get("obligations", [])),
            prohibitions=self.build_rules(usage_policy.get("prohibitions", []))
            )
        
        access_policy_id = self.get_or_create_policy(
            access_policy.get("context", {
                "odrl": ODRL_CONTEXT,
                "cx-policy": CX_POLICY_CONTEXT
            }), 
            permissions=self.build_rules(access_policy.get("permission", [])),
            obligations=self.build_rules(access_policy.get("obligations", [])),
            prohibitions=self.build_rules(access_policy.get("prohibitions", []))
            )
        
        return usage_policy_id, access_policy_id
        
    def register_submodel_bundle_circular_offer(self, semantic_id: str) -> tuple[str, str, str, str]:
        ## step 1: Create the submodel bundle asset
        asset_id = self.get_or_create_circular_submodel_asset(semantic_id)

        ## step 2: Lookup corresponding policy configuration
        policy_entry = next((entry for entry in self.agreements if entry.get("semanticid") == semantic_id), None)
        
        if not policy_entry:
            raise NotFoundError(f"No agreement found for semantic ID: {semantic_id}")
        
        usage_policy_id, access_policy_id, contract_id = self.get_or_create_contract_with_policies(
            asset_id=asset_id,
            policy_config=policy_entry
        )
        
        return asset_id, usage_policy_id, access_policy_id, contract_id

    def generate_contract_id(self, asset_id:str, usage_policy_id:str, access_policy_id:str) -> str:
        return "ichub:contract:"+blake2b_128bit(
            asset_id + usage_policy_id + access_policy_id
        )

    def get_or_create_contract(self, asset_id:str, usage_policy_id:str, access_policy_id:str) -> str:
        contract_id:str = self.generate_contract_id(asset_id=asset_id, usage_policy_id=usage_policy_id, access_policy_id=access_policy_id)
        existing_contract = self.connector_service.contract_definitions.get_by_id(oid=contract_id)
        if existing_contract.status_code == 200:
            logger.debug(f"Contract with ID {contract_id} already exists.")
            return contract_id

        contract_response = self.connector_service.create_contract(
            contract_id=contract_id,
            usage_policy_id=usage_policy_id,
            access_policy_id=access_policy_id,
            asset_id=asset_id
        )
        return contract_response.get("@id", contract_id)


    def generate_policy_id(self, context: dict | list[dict] = {}, permissions: dict | list[dict] = [], prohibitions: dict | list[dict] = [], obligations: dict | list[dict] = []) -> str:
        """Generate a unique policy ID based on the provided context and rules."""
        # Convert the context and rules to a JSON string
        context_str = json.dumps(context, sort_keys=True)
        permissions_str = json.dumps(permissions, sort_keys=True)
        prohibitions_str = json.dumps(prohibitions, sort_keys=True)
        obligations_str = json.dumps(obligations, sort_keys=True)
        
        # Create a unique ID by hashing the concatenated strings
        return "ichub:policy:"+blake2b_128bit(
            context_str + permissions_str + prohibitions_str + obligations_str
        )
    
    def get_or_create_policy(self, context: dict | list[dict] = {}, permissions: dict | list[dict] = [], prohibitions: dict | list[dict] = [], obligations: dict | list[dict] = []) -> str:
        
        policy_id = self.generate_policy_id(
            context=context,
            permissions=permissions,
            prohibitions=prohibitions,
            obligations=obligations
        )
        
        """Get or create a policy in the EDC, returning the policy ID."""
        # Check if the policy already exists
        existing_policy = self.connector_service.policies.get_by_id(oid=policy_id)
        if existing_policy.status_code == 200:
            logger.debug(f"Policy with ID {policy_id} already exists.")
            return policy_id

        policy_response = self.connector_service.create_policy(
            policy_id=policy_id,
            context=context,
            permissions=permissions,
            prohibitions=prohibitions,
            obligations=obligations
        )
        return policy_response.get("@id", policy_id)
    
    
    def get_or_create_dtr_asset(self, dtr_url:str, dct_type:str, existing_asset_id:str=None, headers:dict=None, version:str="3.0") -> str:
        
        if(not existing_asset_id):
            existing_asset_id = self.generate_dtr_asset_id(dtr_url=dtr_url)
        """Get or create a circular submodel asset."""
        # Check if the asset already exists
        existing_asset = self.connector_service.assets.get_by_id(oid=existing_asset_id)
        
        if existing_asset.status_code == 200:
            logger.debug(f"[DTR] Asset with ID {existing_asset_id} already exists.")
            return existing_asset_id
        
        # If it doesn't exist, create it
        logger.info(f"[DTR] Creating new asset with ID {existing_asset_id}.")
        asset = self.create_dtr_asset(asset_id=existing_asset_id, dtr_url=dtr_url, dct_type=dct_type, version=version, headers=headers)
        return asset.get("@id", existing_asset_id)
    
    def get_or_create_circular_submodel_asset(self, semantic_id:str) -> str:
        
        standard_asset_id = self.generate_asset_id(semantic_id=semantic_id)
        """Get or create a circular submodel asset."""
        # Check if the asset already exists
        existing_asset = self.connector_service.assets.get_by_id(oid=standard_asset_id)
        
        if existing_asset.status_code == 200:
            logger.debug(f"Asset with ID {standard_asset_id} already exists.")
            return standard_asset_id
        
        # If it doesn't exist, create it
        logger.info(f"Creating new asset with ID {standard_asset_id}.")
        asset = self.create_circular_submodel_asset(semantic_id)
        return asset.get("@id", standard_asset_id)
    
    def build_dispatcher_url(self, semantic_id: str):
        return self.backend_submodel_dispatcher + "/" + quote(semantic_id, safe="")
    
    def generate_asset_id(self, semantic_id: str):
        return "ichub:asset:"+blake2b_128bit(self.build_dispatcher_url(semantic_id=semantic_id))
    
    def generate_dtr_asset_id(self, dtr_url:str):
        return "ichub:asset:dtr:"+blake2b_128bit(dtr_url)
    
    def create_circular_submodel_asset(self, semantic_id: str):
        headers = None
        
        # In case the authorization is enabled, we need to add the backend API key to the headers
        if(self.authorization):
            headers = {
                self.backend_api_key: self.backend_api_key_value
            }
        
        submodel_dispatcher_url = self.build_dispatcher_url(semantic_id=semantic_id)
            
        return self.create_submodel_bundle_asset(
            asset_id=self.generate_asset_id(semantic_id=semantic_id),
            base_url=submodel_dispatcher_url,
            semantic_id=semantic_id,
            headers=headers
        )
        
        
    def create_submodel_bundle_asset(self, asset_id: str, base_url: str, semantic_id: str, headers: dict = None):           
        # Create the submodel bundle asset
        return self.connector_service.create_asset(
            asset_id=asset_id,
            base_url=base_url,
            dct_type="cx-taxo:SubmodelBundle",
            version="3.0",
            semantic_id=semantic_id,
            headers=headers
        )
    
    def create_dtr_asset(self, asset_id: str, dtr_url: str, dct_type:str, version:str="3.0", headers: dict = None):           
        # Create the submodel bundle asset
        return self.connector_service.create_asset(
            asset_id=asset_id,
            base_url=dtr_url,
            dct_type=dct_type,
            version=version,
            headers=headers,
            proxy_params={ 
                "proxyQueryParams": "true",
                "proxyPath": "true",
                "proxyMethod": "true",
                "proxyBody": "true"
            }
        )