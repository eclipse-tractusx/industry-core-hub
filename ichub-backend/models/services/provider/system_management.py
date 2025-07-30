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

class EdcServiceBase(BaseModel):
    name: str = Field(..., description="Name of the EDC service")
    connection_settings: Optional[Dict[str, Any]] = Field(None, description="Connection settings as JSON")

class EdcServiceCreate(EdcServiceBase, BpnlBase):
    pass

class EdcServiceUpdate(BaseModel):
    name: Optional[str] = Field(None, description="Name of the EDC service")
    connection_settings: Optional[Dict[str, Any]] = Field(None, description="Connection settings as JSON")

class EdcServiceRead(EdcServiceBase):
    legal_entity: LegalEntityRead = Field(alias="legalEntity", description="The legal entity associated with the EDC service")

class DtrServiceBase(BaseModel):
    name: str = Field(..., description="Name of the DTR service")
    connection_settings: Optional[Dict[str, Any]] = Field(None, description="Connection settings as JSON")

class DtrServiceCreate(DtrServiceBase):
    pass

class DtrServiceUpdate(BaseModel):
    name: Optional[str] = Field(None, description="Name of the DTR service")
    connection_settings: Optional[Dict[str, Any]] = Field(None, description="Connection settings as JSON")

class DtrServiceRead(DtrServiceBase):
    pass

class EnablementServiceStackBase(BaseModel):
    name: str = Field(..., description="Name of the enablement service stack")
    settings: Optional[Dict[str, Any]] = Field(None, description="Settings for the enablement service stack as JSON")

class EnablementServiceStackCreate(EnablementServiceStackBase):
    edc_name: str = Field(alias="edcName", description="Name of the EDC service associated with the stack")
    dtr_name: str = Field(alias="dtrName", description="Name of the DTR service associated with the stack")

class EnablementServiceStackUpdate(BaseModel):
    name: Optional[str] = Field(None, description="Name of the enablement service stack")
    # Add other updatable fields as needed

class EnablementServiceStackRead(EnablementServiceStackBase):
    edc_service: EdcServiceRead = Field(alias="edcService", description="The EDC service associated with the stack")
    dtr_service: DtrServiceRead = Field(alias="dtrService", description="The DTR service associated with the stack")