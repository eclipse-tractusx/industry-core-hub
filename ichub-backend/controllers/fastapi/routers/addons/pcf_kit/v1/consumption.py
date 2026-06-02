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

"""PCF Consumption API - Data Consumer endpoints for requesting PCF data."""

from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, Path
from fastapi.responses import JSONResponse

from controllers.fastapi.routers.authentication.auth_api import get_authentication_dependency
from managers.addons_service.pcf_kit.v1 import consumption_manager
from managers.config.log_manager import LoggingManager
from models.services.addons.pcf_kit.v1.management import GovernanceBodyModel
from models.services.addons.pcf_kit.v1.models import PcfSubPartModel, PcfRelationshipModel, PcfExchangeModel, PcfSpecificStateModel
from tools.exceptions import NotFoundError
from utils.log_utils import sanitize_log_value as _s
from tools.constants import INTERNAL_SERVER_ERROR

logger = LoggingManager.get_logger(__name__)


router = APIRouter(
    prefix="/consumption",
    tags=["PCF KIT Microservices"],
    dependencies=[Depends(get_authentication_dependency())],
)


@router.get("/parts/{manufacturerPartId}/subparts")
async def search_own_parts_by_manufacturer_part_id(
    manufacturer_part_id: str = Path(..., alias="manufacturerPartId")
) -> PcfRelationshipModel:
    try:
        result = consumption_manager.search_own_parts_by_manufacturer_part_id(manufacturer_part_id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except NotFoundError:
        raise
    except Exception as e:
        logger.error(f"Error searching own parts: {_s(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=INTERNAL_SERVER_ERROR)


@router.post("/parts/{manufacturerPartId}/subparts", status_code=201)
async def add_subpart_and_create_request(
    manufacturer_part_id: str = Path(..., alias="manufacturerPartId"),
    body: PcfSubPartModel = None
) -> PcfRelationshipModel:
    if body is None:
        raise HTTPException(status_code=400, detail="Request body is required")
    try:
        result = consumption_manager.add_subpart_and_create_request(
            main_manufacturer_part_id=manufacturer_part_id,
            sub_manufacturer_part_id=body.manufacturer_part_id,
            responding_bpn=body.bpn
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except NotFoundError:
        raise
    except Exception as e:
        logger.error(f"Error adding subpart and creating request: {_s(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=INTERNAL_SERVER_ERROR)


@router.post("/requests/{requestId}/send")
async def send_pcf_request_to_participant(
    request_id: str = Path(..., alias="requestId"),
    body: GovernanceBodyModel = None) -> Dict[str, Any]:
    """
    Send a new PCF request to a data provider.

    Initiates a PCF data exchange as a data consumer. At least one of
    manufacturerPartId or customerPartId must be provided.
    """
    try:
        result = consumption_manager.send_pcf_request_to_participant(request_id=request_id, list_policies=body.governance if body else None)
        return JSONResponse(status_code=201, content=result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except NotFoundError:
        raise
    except Exception as e:
        logger.error(f"Error creating PCF request: {_s(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=INTERNAL_SERVER_ERROR)


@router.get("/requests/{requestId}/response")
async def consult_pcf_response(request_id: str = Path(..., alias="requestId")) -> PcfExchangeModel:
    try:
        result = consumption_manager.consult_pcf_response(request_id=request_id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except NotFoundError:
        raise
    except Exception as e:
        logger.error(f"Error consulting PCF response: {_s(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=INTERNAL_SERVER_ERROR)

@router.post("/requests/{requestId}/retry")
async def retry_pcf_request_sending(
    request_id: str = Path(..., alias="requestId"),
    body: GovernanceBodyModel = None) -> Dict[str, Any]:
    """
    Retry sending a PCF request to a data provider.

    This method is intended to be called when a previous attempt to send a PCF request has failed. It will retry the request using the provided governance policies.

    Args:
        request_id: The ID of the PCF request to retry.
        body: Optional body containing governance policies to apply when retrying the request.
    Raises:
        ValueError: If the request does not exist, is not in a retryable status, or if the retry fails.
    """
    try:
        result = consumption_manager.send_pcf_request_to_participant(request_id=request_id, list_policies=body.governance if body else None)
        return JSONResponse(status_code=201, content=result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except NotFoundError:
        raise
    except Exception as e:
        logger.error(f"Error retrying PCF request: {_s(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=INTERNAL_SERVER_ERROR)


@router.get("/parts/{manufacturerPartId}/pcf-status")
async def consult_global_assembly_progress(
    manufacturer_part_id: str = Path(..., alias="manufacturerPartId"),
) -> PcfSpecificStateModel:
    try:
        result = consumption_manager.consult_global_assembly_progress(manufacturer_part_id=manufacturer_part_id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except NotFoundError:
        raise
    except Exception as e:
        logger.error(f"Error consulting global assembly progress: {_s(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=INTERNAL_SERVER_ERROR)


@router.get("/parts/{manufacturerPartId}/pcf-data/download")
async def download_consolidated_pcf_data(
    manufacturer_part_id: str = Path(..., alias="manufacturerPartId"),
) -> Dict[str, Any]:
    try:
        result = consumption_manager.download_pcf_data(manufacturer_part_id=manufacturer_part_id)
        return JSONResponse(status_code=200, content=[item.model_dump(by_alias=True) for item in result])
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except NotFoundError:
        raise
    except Exception as e:
        logger.error(f"Error downloading PCF data: {_s(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=INTERNAL_SERVER_ERROR)
