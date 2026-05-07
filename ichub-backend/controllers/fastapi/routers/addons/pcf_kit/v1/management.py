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

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Path, Query

from controllers.fastapi.routers.authentication.auth_api import get_authentication_dependency
from managers.addons_service.pcf_kit.v1 import management_manager
from models.services.addons.pcf_kit.v1.management import UploadPcfDataModel


router = APIRouter(
    tags=["PCF KIT Microservices"],
    dependencies=[Depends(get_authentication_dependency())],
)


@router.get("/management/incoming", deprecated=True)
async def get_all_incoming_exchanges(
    status: Optional[str] = Query(None, description="Filter by exchange status (e.g., PENDING, DELIVERED)"),
    manufacturer_part_id: Optional[str] = Query(None, alias="manufacturerPartId", description="Filter by manufacturer part ID"),
    customer_part_id: Optional[str] = Query(None, alias="customerPartId", description="Filter by customer part ID"),
    requesting_bpn: Optional[str] = Query(None, alias="requestingBpn", description="Filter by the BPN of the party requesting data from us"),
    limit: int = Query(100, description="Maximum number of results to return"),
    offset: int = Query(0, description="Number of results to skip"),
):
    """Retrieve all incoming PCF exchanges (requests received from other parties)."""
    try:
        return management_manager.get_all_incoming(
            status=status,
            manufacturer_part_id=manufacturer_part_id,
            customer_part_id=customer_part_id,
            requesting_bpn=requesting_bpn,
            limit=limit,
            offset=offset,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving incoming PCF exchanges: {str(e)}")


@router.get("/management/outgoing", deprecated=True)
async def get_all_outgoing_exchanges(
    status: Optional[str] = Query(None, description="Filter by exchange status (e.g., PENDING, DELIVERED)"),
    manufacturer_part_id: Optional[str] = Query(None, alias="manufacturerPartId", description="Filter by manufacturer part ID"),
    customer_part_id: Optional[str] = Query(None, alias="customerPartId", description="Filter by customer part ID"),
    responding_bpn: Optional[str] = Query(None, alias="respondingBpn", description="Filter by the BPN of the party we requested data from"),
    limit: int = Query(100, description="Maximum number of results to return"),
    offset: int = Query(0, description="Number of results to skip"),
):
    """Retrieve all outgoing PCF exchanges (requests we sent to other parties)."""
    try:
        return management_manager.get_all_outgoing(
            status=status,
            manufacturer_part_id=manufacturer_part_id,
            customer_part_id=customer_part_id,
            responding_bpn=responding_bpn,
            limit=limit,
            offset=offset,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving outgoing PCF exchanges: {str(e)}")


@router.get("/management/threads", deprecated=True)
async def get_all_exchange_threads(
    status: Optional[str] = Query(None, description="Filter threads containing exchanges with this status"),
    limit: int = Query(100, description="Maximum number of threads to return"),
    offset: int = Query(0, description="Number of threads to skip"),
):
    """Retrieve all PCF exchange threads grouped by correlation_id, ordered by most recent activity."""
    try:
        return management_manager.get_all_exchange_threads(
            status=status,
            limit=limit,
            offset=offset,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving PCF exchange threads: {str(e)}")


@router.get("/management/exchanges/{requestId}", deprecated=True)
async def get_pcf_exchange_by_id(request_id: str = Path(..., alias="requestId")):
    """Retrieve a single PCF exchange by ID, including PCF data if available."""
    try:
        exchange_data = management_manager.get_pcf_exchange(request_id)
        if not exchange_data:
            raise HTTPException(status_code=404, detail=f"PCF exchange '{request_id}' not found")
        return exchange_data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving PCF exchange: {str(e)}")


@router.get("/management/exchanges/{requestId}/thread", deprecated=True)
async def get_pcf_exchange_thread(request_id: str = Path(..., alias="requestId")):
    """Retrieve all related PCF exchanges grouped by direction (incoming/outgoing) for a given request ID."""
    try:
        return management_manager.get_exchange_thread(request_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving PCF exchange thread: {str(e)}")


@router.post("/management/pcf/{manufacturerPartId}", status_code=201, deprecated=True)
async def upload_pcf_data(
    body: UploadPcfDataModel,
    manufacturer_part_id: str = Path(..., alias="manufacturerPartId"),
):
    """Upload PCF data for a product identified by manufacturerPartId."""
    try:
        return management_manager.upload_pcf_data(
            manufacturer_part_id=manufacturer_part_id,
            pcf_data=body.pcf_data,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error uploading PCF data: {str(e)}")


@router.put("/management/pcf/{manufacturerPartId}", deprecated=True)
async def update_pcf_data(
    body: UploadPcfDataModel,
    manufacturer_part_id: str = Path(..., alias="manufacturerPartId"),
):
    """Update existing PCF data for a product identified by manufacturerPartId."""
    try:
        return management_manager.update_pcf_data(
            manufacturer_part_id=manufacturer_part_id,
            pcf_data=body.pcf_data,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating PCF data: {str(e)}")
