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

from typing import Annotated, List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from fastapi.responses import JSONResponse

from controllers.fastapi.routers.authentication.auth_api import get_authentication_dependency
from managers.addons_service.ccm_kit.v1.certificates import certificates_manager
from managers.config.config_manager import ConfigManager
from models.services.addons.ccm_kit.v1 import (
    CertificateDetail,
    CertificateListItem,
    CertificateUpdate,
    UploadCertificateRequest,
    UploadCertificateResponse,
)
from tools.exceptions import exception_responses

router = APIRouter(
    prefix="/certificates",
    tags=["Company Certificate Management"],
    dependencies=[Depends(get_authentication_dependency())],
)

@router.get(
    "/",
    response_model=List[CertificateListItem],
    responses=exception_responses,
    summary="List certificates",
    description=(
        "Return a paginated list of certificates stored by this data-provider instance. "
        "Optionally filter by BPNL or certificate type.  "
        "Binary document content is NOT included in list responses -- "
        "use GET /{id} for the full detail."
    ),
)
async def list_certificates(
    bpnl: Optional[str] = Query(
        default=None,
        description="Filter by Business Partner Number Legal (exact match)."
    ),
    certificate_type: Optional[str] = Query(
        default=None,
        alias="certificateType",
        description="Filter by certificate type (e.g. ISO9001, IATF16949)."
    ),
    offset: int = Query(default=0, ge=0, description="Pagination offset."),
    limit: int = Query(default=100, ge=1, le=1000, description="Maximum records to return."),
) -> List[CertificateListItem]:
    return certificates_manager.list_certificates(
        bpnl=bpnl,
        certificate_type=certificate_type,
        offset=offset,
        limit=limit,
    )

@router.get(
    "/{certificate_id}",
    response_model=CertificateDetail,
    responses=exception_responses,
    summary="Get certificate detail",
    description=(
        "Return full certificate detail including the Base64-encoded PDF document "
        "and the complete sharing history for the requested certificate."
    ),
)
async def get_certificate(certificate_id: int) -> CertificateDetail:
    return certificates_manager.get_certificate(certificate_id)

@router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    response_model=UploadCertificateResponse,
    responses=exception_responses,
    summary="Upload a new certificate",
    description=(
        "Upload a business partner certificate as a multipart/form-data request. "
        "The PDF file is stored as raw bytes (BYTEA) in the database; "
        "Base64 encoding is applied only in the JSON response.  "
        "Supply BPNS/BPNA site identifiers as a comma-separated string in the "
        "sites field."
    ),
)
async def upload_certificate(
    file: Annotated[UploadFile, File(description="PDF certificate file (max 10 MB).")],
    metadata: Annotated[UploadCertificateRequest, Form()],
) -> UploadCertificateResponse:
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No file provided.",
        )

    # Guard against oversized uploads before reading the full body into memory.
    max_size = int(
        ConfigManager.get_config(
            "ccm.upload.max_pdf_size_bytes", default=10 * 1024 * 1024
        )
    )
    file_content = await file.read(max_size + 1)
    if len(file_content) > max_size:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds the {max_size // (1024 * 1024)} MB size limit.",
        )

    return certificates_manager.upload_certificate(
        file_content=file_content,
        file_name=file.filename,
        metadata=metadata,
    )

@router.put(
    "/{certificate_id}",
    response_model=CertificateDetail,
    responses=exception_responses,
    summary="Update certificate metadata",
    description=(
        "Partially update the metadata of an existing certificate. "
        "Only explicitly provided (non-null) form fields are written.  "
        "The PDF document and BPNL are immutable after initial upload.  "
        "Supplying sites replaces the full site list for this certificate."
    ),
)
async def update_certificate(
    certificate_id: int,
    update_data: Annotated[CertificateUpdate, Form()],
) -> CertificateDetail:
    return certificates_manager.update_certificate(certificate_id, update_data)

@router.delete(
    "/{certificate_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    responses=exception_responses,
    summary="Delete a certificate",
    description=(
        "Permanently delete a certificate and all its associated site entries "
        "and sharing-history records."
    ),
)
async def delete_certificate(certificate_id: int) -> JSONResponse:
    certificates_manager.delete_certificate(certificate_id)
    return JSONResponse(status_code=status.HTTP_204_NO_CONTENT, content=None)
