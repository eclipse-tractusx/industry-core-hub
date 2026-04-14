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

# ================ CONSTANTS =========================
TYPE = "@type"
JSON_EXTENSION = ".json"
INTERNAL_SERVER_ERROR = "Internal server error"
SEM_ID_NOTIFICATION = "urn:samm:io.tractusx.industry-core-hub.notifications:1.0.0#Notification"

# ================= CONTEXTS =========================
# Jupiter / EDC v0.8-0.10 (legacy DSP HTTP) ODRL contexts
ODRL_CONTEXT = "http://www.w3.org/ns/odrl/2/"
CX_POLICY_CONTEXT = "https://w3id.org/catenax/policy/"

# Saturn / EDC v0.11+ (DSP 2025-1) ODRL contexts
SATURN_ODRL_CONTEXT_URL = "https://w3id.org/catenax/2025/9/policy/odrl.jsonld"
SATURN_CX_CONTEXT_URL = "https://w3id.org/catenax/2025/9/policy/context.jsonld"
EDC_VOCAB_NS = "https://w3id.org/edc/v0.0.1/ns/"

# =============== DATASPACE VERSIONS =================
DATASPACE_VERSION_JUPITER = "jupiter"
DATASPACE_VERSION_SATURN = "saturn"

# DCAT / ODRL catalog keys by version
# Jupiter uses JSON-LD prefixed keys; Saturn uses unprefixed keys (@vocab expansion)
JUPITER_DCAT_DATASET_KEY = "dcat:dataset"
JUPITER_ODRL_HAS_POLICY_KEY = "odrl:hasPolicy"
SATURN_DCAT_DATASET_KEY = "dataset"
SATURN_ODRL_HAS_POLICY_KEY = "hasPolicy"

# ==================== DESCRIPTIONS =========================
TWIN_ID_DESCRIPTION = "The ID of the associated twin."
BUSINESS_PARTNER_ID_DESCRIPTION = "The ID of the associated business partner."
PARENT_ORDER_NUMBER_DESCRIPTION = "The parent order number of the JIS part."
VAN_DESCRIPTION = "The optional VAN (Vehicle Assembly Number) of the serialized part."

# ==================== API VERSIONS =========================
API_V1 = "v1"

# ==================== USE CASE =========================
CCM = "CCM"
TRACEABILITY = "Traceability"
INDUSTRY_CORE_HUB = "Industry Core Hub"
PCF = "PCF"
