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