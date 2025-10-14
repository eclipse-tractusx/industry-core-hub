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
# Unless required by routerlicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND,
# either express or implied. See the
# License for the specific language govern in permissions and limitations
# under the License.
#
# SPDX-License-Identifier: Apache-2.0
#################################################################################

from fastapi import APIRouter
from typing import Optional, List

from services.provider.partner_management_service import PartnerManagementService
from models.services.provider.partner_management import BusinessPartnerRead, BusinessPartnerCreate, DataExchangeAgreementRead
from tools.exceptions import exception_responses
from utils.async_utils import AsyncManagerWrapper

router = APIRouter(prefix="/partner-management", tags=["Partner Management"])
partner_management_service = PartnerManagementService()

# Create universal async wrapper - works with any service/manager!
async_partner_service = AsyncManagerWrapper(partner_management_service, "PartnerManagement")

@router.get("/business-partner", response_model=List[BusinessPartnerRead], responses=exception_responses)
async def partner_management_get_business_partners() -> List[BusinessPartnerRead]:
    # Clean, simple async call - no manual thread pool management needed!
    return await async_partner_service.list_business_partners()

@router.get("/business-partner/{business_partner_number}", response_model=Optional[BusinessPartnerRead], responses=exception_responses)
async def partner_management_get_business_partner(business_partner_number: str) -> Optional[BusinessPartnerRead]:
    # Clean, simple async call - no manual thread pool management needed!
    return await async_partner_service.get_business_partner(business_partner_number)

@router.post("/business-partner", response_model=BusinessPartnerRead, responses=exception_responses)
async def partner_management_create_business_partner(business_partner_create: BusinessPartnerCreate) -> BusinessPartnerRead:
    # Clean, simple async call - no manual thread pool management needed!
    return await async_partner_service.create_business_partner(business_partner_create)

@router.get("/business-partner/{business_partner_number}/data-exchange-agreement", response_model=List[DataExchangeAgreementRead], responses=exception_responses)
async def partner_management_get_data_exchange_agreements(business_partner_number: str) -> List[DataExchangeAgreementRead]:
    # Clean, simple async call - no manual thread pool management needed!
    return await async_partner_service.get_data_exchange_agreements(business_partner_number)
