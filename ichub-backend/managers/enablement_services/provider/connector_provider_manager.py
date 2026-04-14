#################################################################################
# Eclipse Tractus-X - Industry Core Hub Backend
#
# Copyright (c) 2026 LKS Next
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
from tractusx_sdk.industry.services.notifications import NotificationService
from managers.config.log_manager import LoggingManager
from tools.exceptions import NotFoundError
from tools.constants import (
    ODRL_CONTEXT, CX_POLICY_CONTEXT, TYPE,
    SATURN_ODRL_CONTEXT_URL, SATURN_CX_CONTEXT_URL, EDC_VOCAB_NS,
    DATASPACE_VERSION_JUPITER, DATASPACE_VERSION_SATURN,
)
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
                 path_submodel_dispatcher: str = "/submodel-dispatcher",
                 authorization: bool = False,
                 backend_api_key: str = "X-Api-Key",
                 backend_api_key_value: str = "",
                 dataspace_version: str = DATASPACE_VERSION_JUPITER,
                 submodel_mode: str = "filesystem",
                 submodel_asset_headers: dict = None):

        self.ichub_url = ichub_url  # base URL of the submodel service (local or external)
        self.path_submodel_dispatcher = path_submodel_dispatcher
        self.agreements = agreements
        self.backend_submodel_dispatcher = self.ichub_url + self.path_submodel_dispatcher

        # "filesystem" = local ICHub backend serves submodels directly
        # "http"       = an external submodel service is used; EDC asset data-address
        #                must carry that service's own auth header
        self.submodel_mode = submodel_mode

        # Pre-built headers to inject into the EDC data-address for submodel assets.
        # Built by the caller (connector.py / run_asset_sync.py) based on mode and
        # auth config; None means no auth header is added (filesystem mode or auth disabled).
        self.submodel_asset_headers = submodel_asset_headers

        # Initialize authorization attributes from parameters
        self.authorization = authorization
        self.backend_api_key = backend_api_key
        self.backend_api_key_value = backend_api_key_value

        # Track the active dataspace version ("jupiter" or "saturn") so that
        # policy context defaults are generated in the correct format.
        self.dataspace_version = dataspace_version
        self.empty_policy = self.get_empty_policy_config()
        self.connector_service = connector_provider_service
        self.notification_service = NotificationService(connector_provider_service)

    def get_empty_policy_config(self) -> dict:
        """
        Returns an empty policy template whose context matches the active
        dataspace version:

        * **Jupiter** — uses prefixed ODRL keys (``odrl:`` / ``cx-policy:``
          namespaces declared in the ``context`` dict).
        * **Saturn** — uses unprefixed keys with ``@vocab`` pointing to the
          EDC namespace; the SDK's PolicyModel auto-prepends the required
          CX ODRL JSON-LD context URLs.
        """
        if self.dataspace_version == DATASPACE_VERSION_SATURN:
            return {
                "context": [
                    "https://w3id.org/catenax/2025/9/policy/odrl.jsonld",
                    "https://w3id.org/catenax/2025/9/policy/context.jsonld",
                    {
                        "@vocab": EDC_VOCAB_NS
                    },
                ],
                "permission": [],
                "prohibition": [],
                "obligation": []
            }
        # Default: Jupiter (legacy DSP HTTP)
        return {
            "context": {
                "odrl": ODRL_CONTEXT,
                "cx-policy": CX_POLICY_CONTEXT
            },
            "odrl:permission": [],
            "odrl:prohibition": [],
            "odrl:obligation": []
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
            policy_config=dtr_policy_config,
            qualifier="dtr"
        )
        
        return asset_id, usage_policy_id, access_policy_id, contract_id
    
    def get_or_create_contract_with_policies(self, asset_id:str, policy_config:dict, qualifier: str = "") -> tuple[str, str, str]:
        usage_policy_id, access_policy_id = self.get_or_create_usage_and_access_policies(policy_config=policy_config, qualifier=qualifier)
        contract_id = self.get_or_create_contract(
            asset_id=asset_id,
            usage_policy_id=usage_policy_id,
            access_policy_id=access_policy_id
        )
        return usage_policy_id, access_policy_id, contract_id
    
    def get_or_create_usage_and_access_policies(self, policy_config:dict, qualifier: str = "") -> tuple[str, str]:
        """
        Creates or retrieves usage and access policies from the given policy config.
        
        The policy config is expected to contain 'usage' and 'access' sub-dicts with
        'permissions', 'prohibitions', and 'obligations' arrays (plural, as used in the
        YAML configuration) in the native ODRL format expected by the connector SDK for
        the configured dataspace version. Singular forms are accepted as a fallback for
        backwards compatibility.
        
        An optional ``qualifier`` (e.g. ``"dtr"``) is forwarded to
        :meth:`get_or_create_policy` so the generated IDs carry a meaningful
        segment (e.g. ``ichub:policy:dtr:HASH``).
        
        For Jupiter: rules use ODRL prefixes (e.g. 'odrl:action', 'odrl:constraint',
        '@id' wrappers for operands).
        For Saturn: rules use plain keys (e.g. 'action', 'constraint', no '@id' wrappers).
        """
        usage_policy = policy_config.get("usage", self.empty_policy)
        access_policy = policy_config.get("access", self.empty_policy)
        
        # The YAML config uses the plural form ("permissions", "prohibitions",
        # "obligations"). Fall back to singular form for backwards compatibility.
        # Context falls back to the version-appropriate default from self.empty_policy
        # when not supplied by the caller.
        default_context = self.empty_policy.get("context")
        usage_policy_id = self.get_or_create_policy(
            usage_policy.get("context", default_context),
            permissions=usage_policy.get("permissions", usage_policy.get("permission", [])),
            obligations=usage_policy.get("obligations", usage_policy.get("obligation", [])),
            prohibitions=usage_policy.get("prohibitions", usage_policy.get("prohibition", [])),
            qualifier=qualifier
        )

        access_policy_id = self.get_or_create_policy(
            access_policy.get("context", default_context),
            permissions=access_policy.get("permissions", access_policy.get("permission", [])),
            obligations=access_policy.get("obligations", access_policy.get("obligation", [])),
            prohibitions=access_policy.get("prohibitions", access_policy.get("prohibition", [])),
            qualifier=qualifier
        )
        
        return usage_policy_id, access_policy_id
        
    def register_submodel_bundle_circular_offer(self, semantic_id: str, headers: dict = None) -> tuple[str, str, str, str]:
        # Use the pre-configured submodel auth headers when the caller does not
        # supply explicit ones (covers the normal startup/sync code paths).
        if headers is None:
            headers = self.submodel_asset_headers

        ## step 1: Create the submodel bundle asset
        asset_id = self.get_or_create_circular_submodel_asset(semantic_id, headers=headers)

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

        try:
            contract_response = self.connector_service.create_contract(
                contract_id=contract_id,
                usage_policy_id=usage_policy_id,
                access_policy_id=access_policy_id,
                asset_id=asset_id
            )
        except ValueError as e:
            logger.error(
                f"Failed to register contract with ID {contract_id} for asset '{asset_id}' "
                f"(usage_policy='{usage_policy_id}', access_policy='{access_policy_id}'). "
                f"Error: {e}"
            )
            raise
        logger.info(f"Successfully registered contract with ID {contract_id} for asset '{asset_id}'.")
        return contract_response.get("@id", contract_id)


    def generate_policy_id(self, context: dict | list[dict] = {}, permissions: dict | list[dict] = [], prohibitions: dict | list[dict] = [], obligations: dict | list[dict] = [], qualifier: str = "") -> str:
        """Generate a unique policy ID based on the provided context and rules.
        
        An optional ``qualifier`` (e.g. ``"dtr"``) is inserted between the
        ``ichub:policy:`` prefix and the content hash so that policies for
        different asset types remain clearly distinguishable in the EDC catalog
        (e.g. ``ichub:policy:dtr:HASH`` vs ``ichub:policy:HASH``).
        """
        # Convert the context and rules to a JSON string
        context_str = json.dumps(context, sort_keys=True)
        permissions_str = json.dumps(permissions, sort_keys=True)
        prohibitions_str = json.dumps(prohibitions, sort_keys=True)
        obligations_str = json.dumps(obligations, sort_keys=True)
        
        # Build prefix: "ichub:policy:<qualifier>:" when qualifier is set
        prefix = f"ichub:policy:{qualifier}:" if qualifier else "ichub:policy:"
        return prefix + blake2b_128bit(
            context_str + permissions_str + prohibitions_str + obligations_str
        )
    
    def get_or_create_policy(self, context: dict | list[dict] = {}, permissions: dict | list[dict] = [], prohibitions: dict | list[dict] = [], obligations: dict | list[dict] = [], qualifier: str = "") -> str:
        
        policy_id = self.generate_policy_id(
            context=context,
            permissions=permissions,
            prohibitions=prohibitions,
            obligations=obligations,
            qualifier=qualifier
        )
        
        """Get or create a policy in the EDC, returning the policy ID."""
        # Check if the policy already exists
        existing_policy = self.connector_service.policies.get_by_id(oid=policy_id)
        if existing_policy.status_code == 200:
            logger.debug(f"Policy with ID {policy_id} already exists.")
            return policy_id

        try:
            policy_response = self.connector_service.create_policy(
                policy_id=policy_id,
                context=context,
                permissions=permissions,
                prohibitions=prohibitions,
                obligations=obligations
            )
        except ValueError as e:
            logger.error(
                f"Failed to register policy with ID {policy_id}. "
                f"Permissions: {permissions}, Prohibitions: {prohibitions}, Obligations: {obligations}. "
                f"Error: {e}"
            )
            raise
        logger.info(f"Successfully registered policy with ID {policy_id}.")
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
        try:
            asset = self.create_dtr_asset(asset_id=existing_asset_id, dtr_url=dtr_url, dct_type=dct_type, version=version, headers=headers)
        except ValueError as e:
            logger.error(f"[DTR] Failed to register asset with ID {existing_asset_id} for URL '{dtr_url}'. Error: {e}")
            raise
        logger.info(f"[DTR] Successfully registered asset with ID {existing_asset_id}.")
        return asset.get("@id", existing_asset_id)
    
    def get_or_create_circular_submodel_asset(self, semantic_id: str, headers: dict = None) -> str:
        """Get or create a circular submodel asset."""
        standard_asset_id = self.generate_asset_id(semantic_id=semantic_id)

        # Check if the asset already exists
        existing_asset = self.connector_service.assets.get_by_id(oid=standard_asset_id)
        if existing_asset.status_code == 200:
            logger.debug(f"Asset with ID {standard_asset_id} already exists.")
            return standard_asset_id

        # If it doesn't exist, create it
        logger.info(f"Creating new asset with ID {standard_asset_id}.")
        try:
            asset = self.create_circular_submodel_asset(semantic_id, headers=headers)
        except ValueError as e:
            logger.error(f"Failed to register submodel bundle asset with ID {standard_asset_id} for semantic ID '{semantic_id}'. Error: {e}")
            raise
        logger.info(f"Successfully registered submodel bundle asset with ID {standard_asset_id}.")
        return asset.get("@id", standard_asset_id)
    
    def build_dispatcher_url(self, semantic_id: str):
        return self.backend_submodel_dispatcher + "/" + quote(semantic_id, safe="")
    
    def generate_asset_id(self, semantic_id: str):
        # Include the submodel mode in the hash so that a "filesystem" asset and
        # an "http" asset for the same semantic ID produce distinct EDC asset IDs,
        # even if the resolved dispatcher URLs happen to collide.
        return "ichub:asset:" + blake2b_128bit(
            self.submodel_mode + self.build_dispatcher_url(semantic_id=semantic_id)
        )
    
    def generate_dtr_asset_id(self, dtr_url:str):
        return "ichub:asset:dtr:"+blake2b_128bit(dtr_url)
    
    def create_circular_submodel_asset(self, semantic_id: str, headers: dict = None):
        """Create a SubmodelBundle asset in the EDC.

        The ``headers`` dict is forwarded verbatim into the data-address
        ``header:*`` properties so the EDC data-plane can authenticate against
        the submodel service.  Pass the headers from the caller; this method
        does not inspect configuration itself.
        """
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
    
    def register_digital_twin_event_offer(
        self,
        digital_twin_event_url: str,
        digital_twin_event_policy_config: dict = None,
        existing_asset_id: str = None,
        version: str = "3.0",
        headers: dict = None
    ) -> tuple[str, str, str, str]:
        """
        Register a digital twin event asset, create policies and contract for it.
        Returns a tuple: (asset_id, usage_policy_id, access_policy_id, contract_id)
        """
        # Step 1: Create or get the digital twin event asset
        asset_id = self.get_or_create_digital_twin_event_asset(
            digital_twin_event_url=digital_twin_event_url,
            existing_asset_id=existing_asset_id,
            version=version,
            headers=headers
        )

        # Step 2: Create or get policies and contract
        policy_config = digital_twin_event_policy_config or self.empty_policy
        usage_policy_id, access_policy_id, contract_id = self.get_or_create_contract_with_policies(
            asset_id=asset_id,
            policy_config=policy_config
        )

        return asset_id, usage_policy_id, access_policy_id, contract_id

    def get_or_create_digital_twin_event_asset(
        self,
        digital_twin_event_url: str,
        existing_asset_id: str = None,
        headers: dict = None,
        version: str = "3.0"
    ) -> str:
        """
        Get or create a digital twin event asset.
        """
        if not existing_asset_id:
            existing_asset_id = self.generate_digital_twin_event_asset_id(digital_twin_event_url=digital_twin_event_url)
        # Check if the asset already exists
        existing_asset = self.connector_service.assets.get_by_id(oid=existing_asset_id)
        if existing_asset.status_code == 200:
            logger.debug(f"[DigitalTwinEvent] Asset with ID {existing_asset_id} already exists.")
            return existing_asset_id
        # If it doesn't exist, create it
        logger.info(f"[DigitalTwinEvent] Creating new asset with ID {existing_asset_id}.")
        try:
            asset = self.create_digital_twin_event_asset(
                asset_id=existing_asset_id,
                notification_endpoint_url=digital_twin_event_url,
                version=version,
                headers=headers
            )
        except ValueError as e:
            logger.error(f"[DigitalTwinEvent] Failed to register asset with ID {existing_asset_id} for URL '{digital_twin_event_url}'. Error: {e}")
            raise
        logger.info(f"[DigitalTwinEvent] Successfully registered asset with ID {existing_asset_id}.")
        return asset.get("@id", existing_asset_id)

    def generate_digital_twin_event_asset_id(self, digital_twin_event_url: str) -> str:
        """
        Generate a unique asset ID for a digital twin event asset.
        """
        return "ichub:asset:digitaltwin-event:" + blake2b_128bit(digital_twin_event_url)

    def create_digital_twin_event_asset(
        self,
        asset_id: str,
        notification_endpoint_url: str,
        version: str = "3.0",
        headers: dict = None
    ):
        """
        Create the digital twin event asset using the notification service.
        """
        return self.notification_service.ensure_notification_asset_exists(
            asset_id=asset_id,
            notification_endpoint_url=notification_endpoint_url,
            version=version,
            headers=headers
        )
