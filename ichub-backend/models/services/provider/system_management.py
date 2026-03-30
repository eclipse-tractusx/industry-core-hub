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

from typing import Optional, Dict, Any
from pydantic import BaseModel, Field

class BpnlBase(BaseModel):
    bpnl: str = Field(..., description="The BPNL (Business Partner Number) of the legal entity.")

class LegalEntityBase(BpnlBase):
    pass

class LegalEntityCreate(LegalEntityBase):
    pass

class LegalEntityUpdate(BaseModel):
    bpnl: Optional[str] = Field(None, description="The BPNL of the legal entity.")

class LegalEntityRead(LegalEntityBase):
    pass

class ConnectorControlPlaneBase(BaseModel):
    name: str = Field(..., description="Name of the Connector service")
    connection_settings: Optional[Dict[str, Any]] = Field(None, description="Connection settings as JSON")

class ConnectorControlPlaneCreate(ConnectorControlPlaneBase, BpnlBase):
    pass

class ConnectorControlPlaneUpdate(BaseModel):
    name: Optional[str] = Field(None, description="Name of the Connector service")
    connection_settings: Optional[Dict[str, Any]] = Field(None, description="Connection settings as JSON")

class ConnectorControlPlaneRead(ConnectorControlPlaneBase):
    legal_entity: LegalEntityRead = Field(alias="legalEntity", description="The legal entity associated with the Connector service")

class TwinRegistryBase(BaseModel):
    name: str = Field(..., description="Name of the Twin Registry")
    connection_settings: Optional[Dict[str, Any]] = Field(None, description="Connection settings as JSON")

class TwinRegistryCreate(TwinRegistryBase):
    pass

class TwinRegistryUpdate(BaseModel):
    name: Optional[str] = Field(None, description="Name of the Twin Registry")
    connection_settings: Optional[Dict[str, Any]] = Field(None, description="Connection settings as JSON")

class TwinRegistryRead(TwinRegistryBase):
    pass

class EnablementServiceStackBase(BaseModel):
    name: str = Field(..., description="Name of the enablement service stack")
    settings: Optional[Dict[str, Any]] = Field(None, description="Settings for the enablement service stack as JSON")

class EnablementServiceStackCreate(EnablementServiceStackBase):
    connector_name: str = Field(alias="connectorControlPlaneName", description="Name of the Connector Control Plane associated with the stack")
    twin_registry_name: str = Field(alias="twinRegistryName", description="Name of the Twin Registry associated with the stack")

class EnablementServiceStackUpdate(BaseModel):
    name: Optional[str] = Field(None, description="Name of the enablement service stack")
    # Add other updatable fields as needed

class EnablementServiceStackRead(EnablementServiceStackBase):
    connector_control_plane: ConnectorControlPlaneRead = Field(alias="connectorControlPlane", description="The Connector service associated with the stack")
    twin_registry: TwinRegistryRead = Field(alias="twinRegistry", description="The Twin Registry associated with the stack")