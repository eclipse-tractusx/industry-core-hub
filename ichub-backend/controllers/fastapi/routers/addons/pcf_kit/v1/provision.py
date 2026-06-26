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

"""PCF Provision API - Data Provider endpoints for responding to PCF requests."""

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Path, Query
from fastapi.responses import JSONResponse

from controllers.fastapi.routers.authentication.auth_api import get_authentication_dependency
from managers.addons_service.pcf_kit.v1 import provision_manager
from managers.config.log_manager import LoggingManager
from models.metadata_database.pcf import PcfExchangeStatus
from models.services.addons.pcf_kit.v1.management import GovernanceBodyModel, NotifyUpdateModel
from models.services.addons.pcf_kit.v1.models import PcfExchangeModel
from tools.exceptions import NotFoundError, PcfVersionGateError
from utils.log_utils import sanitize_log_value as _s
from utils.pcf_utils import DEFAULT_PCF_VERSION, SUPPORTED_PCF_VERSIONS
from tools.constants import INTERNAL_SERVER_ERROR

logger = LoggingManager.get_logger(__name__)


router = APIRouter(
    prefix="/provider",
    tags=["PCF KIT Microservices"],
    dependencies=[Depends(get_authentication_dependency())],
)


@router.post("/pcfs/{manufacturerPartId}", status_code=201)
async def upload_new_pcf(
    manufacturer_part_id: str = Path(..., alias="manufacturerPartId"),
    pcf_data: Dict[str, Any] = Body(...),
    version: str = Query(
        DEFAULT_PCF_VERSION,
        description="PCF schema version (e.g. v7.0.0, v9.0.0)",
    ),
) -> Dict[str, Any]:
    try:
        if version not in SUPPORTED_PCF_VERSIONS:
            raise ValueError(
                f"Unsupported PCF version '{version}'. "
                f"Supported versions: {sorted(SUPPORTED_PCF_VERSIONS)}"
            )
        result = provision_manager.upload_new_pcf(manufacturer_part_id, pcf_data, version=version)
        return JSONResponse(status_code=201, content=result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except NotFoundError:
        raise
    except Exception as e:
        logger.error(f"Error uploading new PCF data: {_s(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=INTERNAL_SERVER_ERROR)


@router.get("/pcfs/{manufacturerPartId}")
async def view_existing_pcf(
    manufacturer_part_id: str = Path(..., alias="manufacturerPartId"),
    version: str = Query(
        DEFAULT_PCF_VERSION,
        description="PCF schema version to retrieve (e.g. v7.0.0, v9.0.0)",
    ),
) -> Dict[str, Any]:
    try:
        if version not in SUPPORTED_PCF_VERSIONS:
            raise ValueError(
                f"Unsupported PCF version '{version}'. "
                f"Supported versions: {sorted(SUPPORTED_PCF_VERSIONS)}"
            )
        result = provision_manager.view_existing_pcf(manufacturer_part_id, version=version)
        return JSONResponse(status_code=200, content=result)
    except ValueError as e: 
        raise HTTPException(status_code=400, detail=str(e))
    except NotFoundError:
        raise
    except Exception as e:
        logger.error(f"Error viewing existing PCF data: {_s(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=INTERNAL_SERVER_ERROR)


@router.put("/pcfs/{manufacturerPartId}")
async def update_pcf_and_get_participants(
    manufacturer_part_id: str = Path(..., alias="manufacturerPartId"),
    pcf_data: Dict[str, Any] = Body(...),
    version: str = Query(
        DEFAULT_PCF_VERSION,
        description="PCF schema version (e.g. v7.0.0, v9.0.0)",
    ),
) -> List[str]:
    try:
        if version not in SUPPORTED_PCF_VERSIONS:
            raise ValueError(
                f"Unsupported PCF version '{version}'. "
                f"Supported versions: {sorted(SUPPORTED_PCF_VERSIONS)}"
            )
        result = provision_manager.update_pcf_and_get_participants(manufacturer_part_id, pcf_data, version=version)
        return JSONResponse(status_code=200, content=result)
    except PcfVersionGateError as e:
        raise HTTPException(status_code=409, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except NotFoundError:
        raise
    except Exception as e:
        logger.error(f"Error updating PCF data and retrieving participants: {_s(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=INTERNAL_SERVER_ERROR)


@router.post("/pcfs/{manufacturerPartId}/notify-update")
async def confirm_and_send_update_to_participants(
    manufacturer_part_id: str = Path(..., alias="manufacturerPartId"),
    body: NotifyUpdateModel = None
) -> Dict[str, Any]:
    try:
        result = provision_manager.confirm_and_send_update_to_participants(
            manufacturer_part_id=manufacturer_part_id,
            list_bpns=body.list_bpns if body else [],
            list_policies=body.governance if body else None
        )
        return JSONResponse(status_code=200, content=result)
    except PcfVersionGateError as e:
        raise HTTPException(status_code=409, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except NotFoundError:
        raise
    except Exception as e:
        logger.error(f"Error confirming and sending update to participants: {_s(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=INTERNAL_SERVER_ERROR)


@router.get("/requests", response_model=List[PcfExchangeModel], response_model_by_alias=True)
async def list_provider_notifications(
    status: Optional[PcfExchangeStatus] = Query(None, description="Filter by request status (e.g., pending, delivered)"),
    version: Optional[str] = Query(None, description="Filter by PCF schema version (e.g. v7.0.0, v9.0.0)"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    limit: int = Query(100, ge=1, le=1000, description="Pagination limit")
) -> List[PcfExchangeModel]:
    try:
        if version is not None and version not in SUPPORTED_PCF_VERSIONS:
            raise ValueError(
                f"Unsupported PCF version '{version}'. "
                f"Supported versions: {sorted(SUPPORTED_PCF_VERSIONS)}"
            )
        result = provision_manager.list_provider_notifications(status=status, version=version, offset=offset, limit=limit)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except NotFoundError:
        raise
    except Exception as e:
        logger.error(f"Error listing provider notifications: {_s(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=INTERNAL_SERVER_ERROR)


@router.post("/requests/{requestId}/accept")
async def accept_request_and_send_response(
    request_id: str = Path(..., alias="requestId"),
    body: GovernanceBodyModel = None
) -> Dict[str, Any]:
    try:
        result = provision_manager.accept_request_and_send_response(request_id=request_id, list_policies=body.governance if body else None)
        return JSONResponse(status_code=200, content=result)
    except PcfVersionGateError as e:
        raise HTTPException(status_code=409, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except NotFoundError:
        raise
    except Exception as e:
        logger.error(f"Error accepting request and sending response: {_s(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=INTERNAL_SERVER_ERROR)


@router.get("/requests/{requestId}/refresh-pcf", response_model=PcfExchangeModel, response_model_by_alias=True)
async def refresh_pcf_data_for_request(request_id: str = Path(..., alias="requestId")) -> PcfExchangeModel:
    try:
        result = provision_manager.refresh_pcf_data_for_request(request_id=request_id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except NotFoundError:
        raise
    except Exception as e:
        logger.error(f"Error refreshing PCF data for request: {_s(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=INTERNAL_SERVER_ERROR)

@router.post("/requests/{requestId}/response/retry")
async def retry_response_sending(
    request_id: str = Path(..., alias="requestId"),
    body: GovernanceBodyModel = None
) -> Dict[str, Any]:
    try:
        result = provision_manager.accept_request_and_send_response(request_id=request_id, list_policies=body.governance if body else None)
        return JSONResponse(status_code=200, content=result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except NotFoundError:
        raise
    except Exception as e:
        logger.error(f"Error retrying response sending: {_s(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=INTERNAL_SERVER_ERROR)
