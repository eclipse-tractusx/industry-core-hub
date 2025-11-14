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
# Unless required by applicable law or agreed in writing, software
# distributed under the License is distributed on an "AS IS" BASIS
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND,
# either express or implied. See the
# License for the specific language govern in permissions and limitations
# under the License.
#
# SPDX-License-Identifier: Apache-2.0
#################################################################################

from fastapi import APIRouter
from connector import connector_consumer_manager

from fastapi.responses import Response
from tractusx_sdk.dataspace.tools.http_tools import HttpTools
#from services.consumer import ConnectionService
from models.services.consumer.connection_management import (
    DoGetParams,
    DoPostParams
)


router = APIRouter(prefix="/connection", tags=["Open Connection Management"])
#connection_service = ConnectionService()

# Create universal async wrapper - works with any manager

"""
# TODO: The following endpoints are not yet implemented but are planned for future development
# Uncomment and implement when connection service is ready

# Search for available DTRS (Digital Twin Registry Service) connections
@router.post("/search/dtrs", response_model=PossibleConnections, responses=exception_responses)
async def search_connections(connection_details: ConnectionDetails) -> PossibleConnections:
    '''
    Search for possible connections to Digital Twin Registry Services based on connection details.
    Returns a list of available connections that match the search criteria.
    '''
    # Delegate to the connection service to perform the actual search
    return connection_service.search_connections(connection_details=connection_details)

# Establish a new connection to a service
@router.post("/connect", responses={
    201: {"description": "Connection established successfully"},
    400: {"description": "Bad request, connection could not be established"},
    404: {"description": "Connection not found"},
    **exception_responses
})
async def connect_to_service(
    connection_details: StartConnection
) -> None:
    '''
    Establish a connection to a specified service using the provided connection details.
    This creates an active connection that can be used for data exchange.
    '''
    # Create a new connection using the provided connection details
    return connection_service.connect_to_service(connection_details=connection_details)


# Retrieve all active connections with optional filtering by service type
@router.get("/connections", response_model=List[ConnectionDescription], responses=exception_responses)
async def get_connections(
    service_type: Optional[str] = Header(None, description="Filter by service type")
) -> List[ConnectionDescription]:
    '''
    Get a list of all active connections. Can be filtered by service type using the header parameter.
    Returns connection descriptions including metadata about each active connection.
    '''
    # Fetch all connections, optionally filtered by service type from header
    return connection_service.get_connections(service_type=service_type)

# Remove/forget an existing connection
@router.post("/forget", responses={
    201: {"description": "Connection forgotten successfully"},
    400: {"description": "Bad request, connection could not be forgotten"},
    404: {"description": "Connection not found"},
    **exception_responses
})
async def forget_connection(
    connection_details: ForgetConnection
) -> None:
    '''
    Remove/forget an existing connection to a service. This will terminate the connection
    and remove it from the active connections list.
    '''
    # Remove the specified connection from active connections
    return connection_service.forget_connection(connection_details=connection_details)
"""


@router.post("/data/get")
async def data_get(get_request: DoGetParams) -> Response:
    ## Check if the api key is present and if it is authenticated
    return HttpTools.proxy(connector_consumer_manager.connector_service.do_get(
        counter_party_id=get_request.counter_party_id,
        counter_party_address=get_request.counter_party_address,
        filter_expression=get_request.filter_expression,
        path=get_request.path,
        policies=get_request.policies,
        params=get_request.params,
        verify=get_request.verify,
        timeout=get_request.timeout,
        allow_redirects=get_request.allow_redirects,
        headers=get_request.headers
    ))

@router.post("/data/post")
async def data_post(post_request: DoPostParams) -> Response:
    ## Check if the api key is present and if it is authenticated
    return HttpTools.proxy(connector_consumer_manager.connector_service.do_post(
        counter_party_id=post_request.counter_party_id,
        counter_party_address=post_request.counter_party_address,
        filter_expression=post_request.filter_expression,
        path=post_request.path,
        policies=post_request.policies,
        verify=post_request.verify,
        timeout=post_request.timeout,
        allow_redirects=post_request.allow_redirects,
        headers=post_request.headers,
        body=post_request.body,
        content_type=post_request.content_type
    ))

