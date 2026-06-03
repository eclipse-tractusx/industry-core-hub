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

# ==================== CCM NOTIFICATION CONTEXTS (CX-0135) =========================
CCM_CONTEXT_REQUEST = "CompanyCertificateManagement-CCMAPI-Request:1.0.0"
CCM_CONTEXT_STATUS = "CompanyCertificateManagement-CCMAPI-Status:1.0.0"
CCM_CONTEXT_PUSH = "CompanyCertificateManagement-CCMAPI-Push:1.0.0"
CCM_CONTEXT_AVAILABLE = "CompanyCertificateManagement-CCMAPI-Available:1.0.0"

# DCT type that CCM notification assets are registered under in the EDC catalog
CCM_DCT_TYPE = "https://w3id.org/catenax/taxonomy#CompanyCertificateManagementNotificationApi"

# Endpoint paths for CCM notification API (appended to the data-plane URL)
CCM_ENDPOINT_REQUEST = "/companycertificate/request"
CCM_ENDPOINT_STATUS = "/companycertificate/status"
CCM_ENDPOINT_PUSH = "/companycertificate/push"
CCM_ENDPOINT_AVAILABLE = "/companycertificate/available"

# ==================== BPN FORMAT PATTERNS (CX-0018) =======================
# Legal-entity BPN — exactly 12 alphanumeric chars after the BPNL prefix.
BPNL_PATTERN = r"^BPNL[a-zA-Z0-9]{12}$"
# Site (BPNS) or address (BPNA) BPN — same length constraint.
BPN_SITE_PATTERN = r"^BPN[SA][a-zA-Z0-9]{12}$"

# ==================== CCM PULL MECHANISM (CX-0135) =========================
# DCT type for individual certificate assets published via the PULL mechanism
CCM_CERTIFICATE_DCT_TYPE = "https://w3id.org/catenax/taxonomy#CompanyCertificate"

# Semantic ID referencing the SAMM BusinessPartnerCertificate v3.1.0 aspect model
CCM_CERTIFICATE_SEMANTIC_ID = (
    "urn:samm:io.catenax.business_partner_certificate:3.1.0#BusinessPartnerCertificate"
)
