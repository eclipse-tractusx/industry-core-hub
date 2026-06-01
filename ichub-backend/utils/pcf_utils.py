#################################################################################
# Eclipse Tractus-X - Industry Core Hub Backend
#
# Copyright (c) 2026 LKS Next
# Copyright (c) 2026 Contributors to the Eclipse Foundation
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

"""Shared utilities for PCF Kit operations."""

from uuid import UUID, NAMESPACE_URL, uuid5

# PCF semantic ID constant (Catena-X PCF aspect model v9.0.0 - async exchange use case)
PCF_SEMANTIC_ID = "urn:samm:io.catenax.pcf:9.0.0#PcfExchangeAsync"

# Asset type used to identify PCF exchange assets in EDC catalogs (CX-0136)
PCF_EXCHANGE_ASSET_TYPE = "https://w3id.org/catenax/taxonomy#PcfExchange"


def pcf_submodel_id(manufacturer_part_id: str) -> UUID:
    """Derive a deterministic UUID for a manufacturer part ID.

    Uses UUID5 with NAMESPACE_URL so the same part always maps to the
    same submodel document in the submodel service.
    """
    return uuid5(NAMESPACE_URL, manufacturer_part_id)
