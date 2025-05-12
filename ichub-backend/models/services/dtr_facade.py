#################################################################################
# Eclipse Tractus-X - Industry Core Hub Backend
#
# Copyright (c) 2025 DRÄXLMAIER Group
# (represented by Lisa Dräxlmaier GmbH)
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

from typing import Any, Dict, List, Optional
from uuid import UUID
from pydantic import BaseModel, Field


class DtrPagingMetadata(BaseModel):
    """DTR Paging Metadata Model."""

    cursor: Optional[str] = Field(
        description="The cursor for the next page of results.", default=None)

class DtrPagingResponseBase(BaseModel):
    """DTR Paging Response Base Model."""

    paging_metadata: Optional[DtrPagingMetadata] = Field(
        description="The paging metadata for the response.", default=None)


class DtrPagingDictResponse(DtrPagingResponseBase):
    """DTR Paging Response Model."""

    result: List[Dict[str,
                      Any]] = Field(description="The result of the DTR query.",
                                    default=[])


class DtrPagingStrResponse(DtrPagingResponseBase):
    """DTR Paging Response Model."""

    result: List[str] = Field(description="The result of the DTR query.",
                                    default=[])
