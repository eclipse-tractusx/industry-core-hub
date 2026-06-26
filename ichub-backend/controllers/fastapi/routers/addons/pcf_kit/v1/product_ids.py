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

"""PCF Exchange API - Legacy v1.1.1 ``/productIds`` endpoints (CX-0136 backward compatibility).

These endpoints are served behind the v1.1.1 EDC asset and always operate
with PCF schema version v7.0.0.  The version is implicit from the asset
negotiated — no version query parameter is exposed.

Key differences from the v1.2.0 ``/footprintExchange`` endpoints:

* Path parameter is ``productId`` (= manufacturerPartId), **not** ``requestId``.
* ``requestId`` is a **query** parameter, not a path parameter.
"""

from typing import Optional
from fastapi import APIRouter, Depends, Header, Query, HTTPException, Path, Body
from fastapi.responses import JSONResponse

from controllers.fastapi.routers.authentication.auth_api import get_authentication_dependency
from managers.addons_service.pcf_kit.v1 import exchange_manager
from managers.config.log_manager import LoggingManager
from tools.exceptions import NotFoundError, PcfVersionGateError
from utils.log_utils import sanitize_log_value as _s
from tools.constants import INTERNAL_SERVER_ERROR

logger = LoggingManager.get_logger(__name__)

router = APIRouter(
    prefix="/productIds",
    tags=["PCF KIT Microservices"],
    dependencies=[Depends(get_authentication_dependency())]
)

logger.info("[PCF ProductIds] Router initialized")


# PCF schema version used by the v1.1.1 /productIds endpoints
_PCF_VERSION = "v7.0.0"

EDC_BPN_DESCRIPTION = "The caller's Catena-X BusinessPartnerNumber"
MESSAGE_DESCRIPTION = "URL encoded, max 250 chars"


@router.put("/{productId}")
async def put_pcf_legacy(
    product_id: str = Path(..., alias="productId"),
    body: dict = Body(...),
    request_id: str = Query(..., alias="requestId", description="ID of the PCF exchange request"),
    edc_bpn: Optional[str] = Header(None, alias="edc-bpn", description=EDC_BPN_DESCRIPTION),
    message: Optional[str] = Query(None, max_length=250, description=MESSAGE_DESCRIPTION),
    update: bool = Query(False, description="Whether this is an update to an existing request"),
):
    """
    Legacy PCF Response / Update endpoint (v1.1.1 API shape).

    Accepts PCF data as a response to an open request or as an update. The PCF
    data should match the Catena-X aspect model ``urn:samm:io.catenax.pcf:7.0.0#Pcf``.

    Args:
        product_id: The manufacturer part ID (path parameter in v1.1.1 API)
        body: PCF data matching the Catena-X PCF aspect model (7.0.0)
        request_id: The ID of the footprint request or response (query parameter)
        edc_bpn: The caller's Catena-X BusinessPartnerNumber (automatically set by EDC)
        message: Optional URL encoded message (max 250 chars)
        update: Whether this is an update to an existing request (default: False)

    Returns:
        JSONResponse with status code 200 for success

    Raises:
        HTTPException: 400 for bad request
    """
    logger.info(
        f"[PCF ProductIds PUT] Incoming request: productId={_s(product_id)}, "
        f"requestId={_s(request_id)}, edc_bpn={_s(edc_bpn)}, "
        f"update={_s(update)}, message={_s(message)}"
    )

    if not edc_bpn:
        logger.error("[PCF ProductIds PUT] Missing edc-bpn header")
        raise HTTPException(
            status_code=400,
            detail="Missing required header: edc-bpn"
        )

    try:
        logger.debug("[PCF ProductIds PUT] Delegating to exchange_manager.submit_pcf_response()")
        result = exchange_manager.submit_pcf_response(
            request_id=request_id,
            pcf_data=body,
            edc_bpn=edc_bpn,
            is_update=update,
            message=message,
            version=_PCF_VERSION,
        )

        logger.info(f"[PCF ProductIds PUT] Response processed successfully: requestId={_s(request_id)}")
        return JSONResponse(status_code=200, content=result)
    except PcfVersionGateError as e:
        logger.warning(f"[PCF ProductIds PUT] Version gate blocked: {_s(e)}")
        raise HTTPException(status_code=409, detail=str(e))
    except ValueError as e:
        logger.error(f"[PCF ProductIds PUT] ValueError: {_s(e)}", exc_info=True)
        raise HTTPException(status_code=400, detail=str(e))
    except NotFoundError:
        raise
    except Exception as e:
        logger.error(f"[PCF ProductIds PUT] Unexpected exception: {_s(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=INTERNAL_SERVER_ERROR)


@router.get("/{productId}")
async def request_pcf_legacy(
    product_id: str = Path(..., alias="productId"),
    request_id: str = Query(..., alias="requestId", description="ID of the PCF exchange request"),
    edc_bpn: Optional[str] = Header(None, alias="edc-bpn", description=EDC_BPN_DESCRIPTION),
    message: Optional[str] = Query(None, max_length=250, description=MESSAGE_DESCRIPTION),
):
    """
    Legacy PCF Request endpoint (v1.1.1 API shape).

    Request a footprint for a product identified by ``productId``
    (= manufacturerPartId).

    Args:
        product_id: The manufacturer part ID (path parameter in v1.1.1 API)
        request_id: Unique identifier for the PCF request (query parameter)
        edc_bpn: The caller's Catena-X BusinessPartnerNumber (automatically set by EDC)
        message: Optional URL encoded message (max 250 chars)

    Returns:
        JSONResponse with status code 202 for accepted

    Raises:
        HTTPException: 400 for missing edc-bpn, 404 if not found
    """
    logger.info(
        f"[PCF ProductIds GET] Incoming request: productId={_s(product_id)}, "
        f"requestId={_s(request_id)}, edc_bpn={_s(edc_bpn)}, message={_s(message)}"
    )

    if not edc_bpn:
        logger.error("[PCF ProductIds GET] Missing edc-bpn header")
        raise HTTPException(
            status_code=400,
            detail="Missing required header: edc-bpn"
        )

    try:
        logger.debug("[PCF ProductIds GET] Delegating to exchange_manager.request_pcf()")
        result = exchange_manager.request_pcf(
            request_id=request_id,
            edc_bpn=edc_bpn,
            manufacturer_part_id=product_id,
            customer_part_id=None,
            message=message,
            version=_PCF_VERSION,
        )

        logger.info(f"[PCF ProductIds GET] Request processed successfully: requestId={_s(request_id)}")
        return JSONResponse(status_code=202, content=result)
    except ValueError as e:
        logger.error(f"[PCF ProductIds GET] ValueError: {_s(e)}", exc_info=True)
        raise HTTPException(status_code=400, detail=str(e))
    except NotFoundError:
        raise
    except Exception as e:
        logger.error(f"[PCF ProductIds GET] Unexpected exception: {_s(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=INTERNAL_SERVER_ERROR)
