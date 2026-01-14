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

from fastapi import APIRouter, Depends, HTTPException, status

from controllers.fastapi.routers.authentication.auth_api import get_authentication_dependency
from managers.config.log_manager import LoggingManager
from managers.addons_service.ecopass_kit.v1.provision import provision_manager
from tools.exceptions import DppNotFoundError, DppShareError
from models.services.addons.ecopass_kit.v1 import ShareDppRequest, ShareDppResponse

logger = LoggingManager.get_logger(__name__)

router = APIRouter(
    prefix="/provision",
    dependencies=[Depends(get_authentication_dependency())]
)


@router.post("/share", response_model=ShareDppResponse, status_code=status.HTTP_200_OK)
async def share_dpp(request: ShareDppRequest):
    """
    Share a Digital Product Passport (catalog or serialized part twin) with a single business partner.

    This endpoint:
    1. Validates the DPP exists and is associated with a catalog or serialized part twin
    2. Shares the twin using the appropriate sharing logic
    3. Registers the manufacturer part ID in BPN Discovery

    Args:
        request: ShareDppRequest containing DPP ID and target BPNL

    Returns:
        ShareDppResponse with sharing status

    Raises:
        HTTPException: If the DPP is not found or sharing fails
    """
    try:
        # Share the DPP using the provision manager
        result = provision_manager.share_dpp(
            dpp_id=request.dpp_id,
            business_partner_number=request.business_partner_number,
        )

        # Register in BPN Discovery
        bpn_registered = provision_manager.register_in_bpn_discovery(
            result["twin_data"]["manufacturer_part_id"]
        )

        return ShareDppResponse(
            dppId=request.dpp_id,
            businessPartnerNumber=request.business_partner_number,
            bpnDiscoveryRegistered=bpn_registered,
        )

    except DppNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=e.message,
        )
    except DppShareError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=e.message,
        )
    except Exception as e:
        logger.error(f"Error sharing DPP {request.dpp_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to share DPP: {str(e)}",
        )
