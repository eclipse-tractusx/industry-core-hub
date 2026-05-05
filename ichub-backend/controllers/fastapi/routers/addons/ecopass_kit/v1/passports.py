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

from typing import List
from fastapi import APIRouter, Depends, HTTPException

from controllers.fastapi.routers.authentication.auth_api import get_authentication_dependency
from managers.addons_service.ecopass_kit.v1 import passports_manager
from models.services.addons.ecopass_kit.v1 import DigitalProductPassport

router = APIRouter(
    prefix="/passports",
    dependencies=[Depends(get_authentication_dependency())]
)


@router.get("", response_model=List[DigitalProductPassport])
async def get_all_passports():
    """
    Retrieve all Digital Product Passports (DPPs) from the system.

    This endpoint fetches all twins that have DPP aspects (digital_product_passport semantic ID)
    and returns them in the standardized DPP format.

    Returns:
        List[DigitalProductPassport]: A list of all Digital Product Passports in the system

    Raises:
        HTTPException: If there's an error retrieving the passports
    """
    try:
        return passports_manager.get_all_passports()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving DPPs: {str(e)}")

