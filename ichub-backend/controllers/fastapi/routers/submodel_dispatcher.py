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
from fastapi.responses import JSONResponse
from typing import Any, Dict, Optional
from uuid import UUID

from services.submodel_dispatcher_service import SubmodelDispatcherService, SubmodelNotSharedWithBusinessPartnerError
from tools.submodel_type_util import InvalidSemanticIdError
from tools import InvalidUUIDError

router = APIRouter(prefix="/submodel-dispatcher", tags=["Submodel Dispatcher"])
submodel_dispatcher_service = SubmodelDispatcherService()

@router.get("/{semantic_id}/{global_id}/submodel/$value", response_model=Dict[str, Any])
@router.get("/{semantic_id}/{global_id}/submodel", response_model=Dict[str, Any])
@router.get("/{semantic_id}/{global_id}", response_model=Dict[str, Any])
async def submodel_dispatcher_get_submodel_content_submodel_value(
    semantic_id: str,
    global_id: UUID,
    edc_bpn: Optional[str] = Header(default=None, alias="Edc-Bpn", description="The BPN of the consumer delivered by the EDC Data Plane"),
    edc_contract_agreement_id: Optional[str] = Header(default=None, alias="Edc-Contract-Agreement-Id", description="The contract agreement id of the consumer delivered by the EDC Data Plane")
    ) -> Dict[str, Any]:

    return submodel_dispatcher_service.get_submodel_content(edc_bpn, edc_contract_agreement_id, semantic_id, global_id)


@router.post("/{semantic_id}/{global_id}/submodel", status_code=204)
async def submodel_dispatcher_upload_submodel(
    semantic_id: str,
    global_id: UUID,
    submodel_payload: Dict[str, Any] = Body(..., description="The submodel JSON payload")
) -> None:
    return submodel_dispatcher_service.upload_submodel( global_id, semantic_id, submodel_payload)

@router.delete("/{semantic_id}/{global_id}/submodel", status_code=204)
async def submodel_dispatcher_delete_submodel(
    semantic_id: str,
    global_id: UUID
) -> None:
    return submodel_dispatcher_service.delete_submodel(global_id, semantic_id)