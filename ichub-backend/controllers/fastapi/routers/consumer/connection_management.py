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

from fastapi import APIRouter, Body, Header

from services.provider.sharing_service import SharingService
from models.services.consumer.connection_management import (
    ConnectionDetails,
    StartConnection,
    ForgetConnection,
    PossibleConnections,
    ConnectionDescription
)

from typing import Optional, List
from tools.exceptions import exception_responses
router = APIRouter(prefix="/connection", tags=["Open Connection Management"])
connection_service = SharingService()

@router.post("/search/dtrs", response_model=PossibleConnections, responses=exception_responses)
async def search_connections(connection_details: ConnectionDetails) -> PossibleConnections:
    return connection_service.search_connections(connection_details=connection_details)

@router.post("/connect", responses={
    201: {"description": "Connection established successfully"},
    400: {"description": "Bad request, connection could not be established"},
    404: {"description": "Connection not found"},
    **exception_responses
})
async def connect_to_service(
    connection_details: StartConnection
) -> None:
    return connection_service.connect_to_service(connection_details=connection_details)


@router.get("/connections", response_model=List[ConnectionDescription], responses=exception_responses)
async def get_connections(
    service_type: Optional[str] = Header(None, description="Filter by service type")
) -> List[ConnectionDescription]:
    return connection_service.get_connections(service_type=service_type)

@router.post("/forget", responses={
    201: {"description": "Connection established successfully"},
    400: {"description": "Bad request, connection could not be established"},
    404: {"description": "Connection not found"},
    **exception_responses
})
async def connect_to_service(
    connection_details: ForgetConnection
) -> None:
    return connection_service.forget_connection(connection_details=connection_details)