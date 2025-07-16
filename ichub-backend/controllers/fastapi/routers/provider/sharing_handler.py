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
from models.services.provider.sharing_management import (
    SharedPartBase,
    ShareCatalogPart,
    SharedPartner
)
from typing import Optional, List
from tools.exceptions import exception_responses
router = APIRouter(prefix="/share", tags=["Sharing Functionality"])
part_sharing_service = SharingService()

@router.post("/catalog-part", response_model=SharedPartBase, responses=exception_responses)
async def share_catalog_part(catalog_part_to_share: ShareCatalogPart) -> SharedPartBase:
    return part_sharing_service.share_catalog_part(
        catalog_part_to_share=catalog_part_to_share
    )