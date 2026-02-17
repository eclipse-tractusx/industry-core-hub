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
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND,
# either express or implied. See the
# License for the specific language govern in permissions and limitations
# under the License.
#
# SPDX-License-Identifier: Apache-2.0
#################################################################################

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from typing import Optional

from controllers.fastapi.routers.authentication.auth_api import get_authentication_dependency
from managers.addons_service.ccm_kit.v1 import certificates_manager
from models.services.addons.ccm_kit.v1 import UploadCertificateRequest, UploadCertificateResponse


router = APIRouter(
    prefix="/certificates",
    dependencies=[Depends(get_authentication_dependency())]
)

@router.get("/")
async def get_funct():
    return {"message": "This endpoint is for uploading certificates. Please use POST method with multipart/form-data."}


@router.post("/", status_code=status.HTTP_200_OK, response_model=UploadCertificateResponse)
async def upload_certificates(
    file: UploadFile = File(..., description="PDF certificate file"),
    certificate_type: str = Form(..., description="Type of certificate (e.g., ISO 9001, IATF 16949, ISO 14001)"),
    certificate_name: str = Form(..., description="Name of the certificate"),
    issuer: str = Form(..., description="Certification body or authority that issued the certificate"),
    valid_from: str = Form(..., description="Start date of certificate validity (ISO 8601 format: YYYY-MM-DD)"),
    valid_until: str = Form(..., description="End date of certificate validity (ISO 8601 format: YYYY-MM-DD)"),
    bpnl: str = Form(..., description="Business Partner Number Legal Entity (BPN-L) of the certificate holder"),
    description: Optional[str] = Form(None, description="Optional description or additional information")
) -> UploadCertificateResponse:
    """
    Upload a business partner certificate with PDF document.
    
    This endpoint accepts a multipart request with:
    - PDF file: The certificate document
    - Metadata fields: Certificate information mapped to BusinessPartnerCertificate v3.1.0
    
    The PDF file is converted to BASE64 and embedded in the JSON payload as per CX-0135.
    
    Args:
        file: PDF certificate file
        certificate_type: Type of certificate (e.g., ISO 9001, IATF 16949, ISO 14001)
        certificate_name: Name of the certificate
        issuer: Certification body or authority
        valid_from: Start date of validity (ISO 8601: YYYY-MM-DD)
        valid_until: End date of validity (ISO 8601: YYYY-MM-DD)
        bpnl: Business Partner Number Legal Entity (BPN-L)
        description: Optional description
    
    Returns:
        UploadCertificateResponse: Contains the certificate ID and complete certificate object
                                   with BASE64-encoded document
    
    Raises:
        HTTPException: If there's an error uploading or processing the certificate
    """
    try:
        # Validate file type
        if not file.filename or not file.filename.lower().endswith('.pdf'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only PDF files are accepted for certificates"
            )
        
        # Read file content
        file_content = await file.read()
        
        # Create metadata request object
        metadata = UploadCertificateRequest(
            certificateType=certificate_type,
            certificateName=certificate_name,
            issuer=issuer,
            validFrom=valid_from,
            validUntil=valid_until,
            bpnl=bpnl,
            description=description
        )
        
        # Upload certificate with manager
        response = certificates_manager.upload_certificate(
            file_content=file_content,
            file_name=file.filename,
            metadata=metadata
        )
        
        return response
        
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error uploading certificate: {str(e)}"
        )

