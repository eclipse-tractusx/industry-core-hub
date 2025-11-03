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

from typing import List
from pydantic import BaseModel, Field, field_validator

def validate_bpnl(bpnl: str, field_name: str) -> str:
    """Validates the BPNL format."""
    if len(bpnl) != 16 or not bpnl.isalnum():
        raise ValueError(f"{field_name} must be exactly 16 alphanumeric characters.")
    if bpnl[0:4] != "BPNL":
        raise ValueError(f"{field_name} must start with 'BPNL'.")
    
    return bpnl

class BusinessPartnerRead(BaseModel):
    """Represents a partner with a validated name field."""
    
    name: str = Field(description="The unique name of the business partner.")
    bpnl: str = Field(description="The Catena-X Business Partner Number (BPNL) of the business partner.")

class BusinessPartnerCreateInput(BaseModel):
    bpnl: str = Field(description="The Catena-X Business Partner Number (BPNL) of the business partner.")

    @field_validator("bpnl")
    @staticmethod
    def validate_bpnl(bpnl: str) -> str:
        """Validates the BPNL format."""
        return validate_bpnl(bpnl, "bpnl")


class BusinessPartnerCreate(BusinessPartnerRead, BusinessPartnerCreateInput):
    pass

class DataExchangeContractRead(BaseModel):
    """Represents document type specific contract terms belonging to a data exchange agreement."""

    semantic_id: str = Field(alias="semanticId", description="The semantic ID of the data exchange contract applies to.")
    edc_usage_policy_id: str = Field(alias="edcUsagePolicyId", description="The ID of the EDC usage policy for the background generated EDC contract negotion")

class DataExchangeAgreementRead(BaseModel):
    """Represents a data exchange agreement between two business partners."""

    business_partner: BusinessPartnerRead = Field(alias="businessPartner", description="The business partner to whom the data exchange agreement applies.")
    name: str = Field(description="The unique name of the data exchange agreement with the given business partner.")
    contracts: List[DataExchangeContractRead] = Field(description="The list of data exchange contracts that are part of the agreement.", default=[])

class DataExchangeAgreementCreate(BaseModel):
    business_partner_name: str = Field(alias="businessPartnerName", description="The unique name of the business partner to whom the data exchange contract applies.")
    data_exchange_agreement_name: str = Field(alias="dataExchangeAgreementName", description="The unique name of the data exchange agreement with the given business partner.")

class DataExchangeContractCreate(DataExchangeAgreementCreate):
    """Represents document type specific contract terms belonging to a data exchange agreement."""

    semantic_id: str = Field(alias="semanticId", description="The semantic ID of the data exchange contract applies to.")
    edc_usage_policy_id: str = Field(alias="edcUsagePolicyId", description="The ID of the EDC usage policy for the background generated EDC contract negotion")