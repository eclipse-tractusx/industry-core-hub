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

from typing import Optional
from pydantic import BaseModel, Field


class TwinAssociation(BaseModel):
    """Association between DPP and Digital Twin"""
    twin_id: str = Field(alias="twinId")
    aas_id: Optional[str] = Field(alias="aasId", default=None)
    manufacturer_part_id: str = Field(alias="manufacturerPartId")
    part_instance_id: str = Field(alias="partInstanceId")
    twin_name: Optional[str] = Field(alias="twinName", default=None)
    asset_id: Optional[str] = Field(alias="assetId", default=None)

    class Config:
        populate_by_name = True


class DigitalProductPassport(BaseModel):
    """Digital Product Passport model"""
    id: str
    passport_id: str = Field(alias="passportId")  # UUID from metadata.passportId
    manufacturer_part_id: Optional[str] = Field(alias="manufacturerPartId", default=None)  # For BPN Discovery
    part_instance_id: Optional[str] = Field(alias="partInstanceId", default=None)  # Part Instance ID
    part_type: Optional[str] = Field(alias="partType", default=None)  # "catalog" or "serialized"
    name: str
    version: str
    semantic_id: str = Field(alias="semanticId")
    status: str
    issue_date: Optional[str] = Field(alias="issueDate", default=None)  # Issue date from DPP
    expiration_date: Optional[str] = Field(alias="expirationDate", default=None)  # Expiration date from DPP
    twin_association: Optional[TwinAssociation] = Field(alias="twinAssociation", default=None)
    submodel_id: str = Field(alias="submodelId")
    created_at: str = Field(alias="createdAt")
    updated_at: str = Field(alias="updatedAt")

    class Config:
        populate_by_name = True
