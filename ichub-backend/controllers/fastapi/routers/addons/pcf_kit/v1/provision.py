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

from fastapi import APIRouter, Depends, HTTPException, Path, Query
from fastapi.responses import JSONResponse

from controllers.fastapi.routers.authentication.auth_api import get_authentication_dependency
from managers.addons_service.pcf_kit.v1 import provision_manager
from models.services.addons.pcf_kit.v1.management import SendOrUpdatePcfResponseModel
from models.services.addons.pcf_kit.v1.models import PcfExchangeModel


router = APIRouter(
    prefix="/provider",
    tags=["PCF KIT Microservices"],
    dependencies=[Depends(get_authentication_dependency())],
)


@router.put("/responses/{requestId}", deprecated=True)
async def send_or_update_pcf_response(
    body: SendOrUpdatePcfResponseModel,
    request_id: str = Path(..., alias="requestId"),
):
    """
    Send or update a PCF response as a data provider.

    Responds to PCF data requests from data consumers. Supports both initial
    responses (201) and updates to previously shared data (200).
    """
    try:
        result = provision_manager.send_or_update_pcf_response(
            request_id=request_id,
            responding_bpn=body.responding_bpn,
            status=body.status.value if body.status else "delivered",
            message=body.message,
            list_policies=body.list_policies,
        )
        status_code = 200 if result.get("isUpdate") else 201
        return JSONResponse(status_code=status_code, content=result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Bad Request: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error sending/updating PCF response: {str(e)}")


def _not_implemented() -> None:
    raise HTTPException(status_code=501, detail="NotImplemented")


@router.get("/parts")
async def provider_parts_management_and_search() -> Dict[str, Any]:
    _not_implemented()


@router.post("/pcfs/{manufacturerPartId}", status_code=201)
async def upload_new_pcf(
    manufacturer_part_id: str = Path(..., alias="manufacturerPartId"),
    pcf_data: Dict[str, Any] = None
) -> Dict[str, Any]:
    try:
        result = provision_manager.upload_new_pcf(manufacturer_part_id, pcf_data)
        return JSONResponse(status_code=201, content=result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Bad Request: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error uploading new PCF data: {str(e)}")


@router.get("/pcfs/{manufacturerPartId}")
async def view_existing_pcf(manufacturer_part_id: str = Path(..., alias="manufacturerPartId")) -> Dict[str, Any]:
    try:
        result = provision_manager.view_existing_pcf(manufacturer_part_id)
        return JSONResponse(status_code=200, content=result)
    except ValueError as e: 
        raise HTTPException(status_code=400, detail=f"Bad Request: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error viewing existing PCF data: {str(e)}")


@router.put("/pcfs/{manufacturerPartId}")
async def update_pcf_and_get_participants(
    manufacturer_part_id: str = Path(..., alias="manufacturerPartId"),
    pcf_data: Dict[str, Any] = None
) -> List[str]:
    try:
        result = provision_manager.update_pcf_and_get_participants(manufacturer_part_id, pcf_data)
        return JSONResponse(status_code=200, content=result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Bad Request: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating PCF data and retrieving participants: {str(e)}")


@router.post("/pcfs/{manufacturerPartId}/notify-update")
async def confirm_and_send_update_to_participants(
    manufacturer_part_id: str = Path(..., alias="manufacturerPartId"),
    list_bpns: List[str] = [],
    list_policies: List[Dict] = None
) -> Dict[str, Any]:
    try:
        result = provision_manager.confirm_and_send_update_to_participants(
            manufacturer_part_id=manufacturer_part_id,
            list_bpns=list_bpns,
            list_policies=list_policies
        )
        return JSONResponse(status_code=200, content=result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Bad Request: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error confirming and sending update to participants: {str(e)}")


@router.get("/requests")
async def list_provider_notifications(
    status: Optional[str] = Query(None, description="Filter by request status (e.g., PENDING, DELIVERED)"),
    offset: int = Query(0, description="Pagination offset"),
    limit: int = Query(100, description="Pagination limit")
) -> List[PcfExchangeModel]:
    try:
        result = provision_manager.list_provider_notifications(status=status, offset=offset, limit=limit)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Bad Request: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing provider notifications: {str(e)}")


@router.post("/requests/{requestId}/accept")
async def accept_request_and_send_response(
    request_id: str = Path(..., alias="requestId"),
    list_policies: List[Dict] = None
) -> Dict[str, Any]:
    try:
        result = provision_manager.accept_request_and_send_response(request_id=request_id, list_policies=list_policies)
        return JSONResponse(status_code=200, content=result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Bad Request: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error accepting request and sending response: {str(e)}")


@router.get("/requests/{requestId}/refresh-pcf")
async def refresh_pcf_data_for_request(request_id: str = Path(..., alias="requestId")) -> PcfExchangeModel:
    try:
        result = provision_manager.refresh_pcf_data_for_request(request_id=request_id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Bad Request: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error refreshing PCF data for request: {str(e)}")

@router.post("/requests/{requestId}/reject")
async def reject_request(request_id: str = Path(..., alias="requestId")) -> Dict[str, Any]:
    _ = request_id
    _not_implemented()


@router.get("/requests/{requestId}/response")
async def consult_sent_pcf_response(
    request_id: str = Path(..., alias="requestId"),
) -> Dict[str, Any]:
    _ = request_id
    _not_implemented()


@router.post("/requests/{requestId}/response/retry")
async def retry_response_sending(
    request_id: str = Path(..., alias="requestId"),
    list_policies: List[Dict] = None
) -> Dict[str, Any]:
    try:
        result = provision_manager.accept_request_and_send_response(request_id=request_id, list_policies=list_policies)
        return JSONResponse(status_code=200, content=result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Bad Request: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error accepting request and sending response: {str(e)}")
