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

import base64
from datetime import datetime

from managers.config.log_manager import LoggingManager
from managers.metadata_database.manager import RepositoryManagerFactory
from models.services.addons.ccm_kit.v1 import (
    BusinessPartnerCertificate,
    CertificateDocument,
    UploadCertificateRequest,
    UploadCertificateResponse,
)

logger = LoggingManager.get_logger(__name__)


class CertificatesManager:
    """
    Manages Business Partner Certificate operations for Company Certificate Management (CCM).
    
    This manager handles the upload, conversion, and management of business partner 
    certificates according to the BusinessPartnerCertificate v3.1.0 data model and 
    CX-0135 specification.
    
    Uses the CcmRepository to persist certificate data to the metadata database.
    """

    def __init__(self) -> None:
        """Initialize the Certificates Manager."""
        pass

    def upload_certificate(
        self, 
        file_content: bytes,
        file_name: str,
        metadata: UploadCertificateRequest
    ) -> UploadCertificateResponse:
        """
        Upload a certificate with its PDF document and metadata.
        
        This method:
        1. Converts the PDF file to BASE64 encoding
        2. Persists the certificate to the database using CcmRepository
        3. Creates a BusinessPartnerCertificate response object with embedded document
        
        Args:
            file_content: The binary content of the PDF file
            file_name: The original name of the PDF file
            metadata: The certificate metadata (type, name, issuer, validity, etc.)
            
        Returns:
            UploadCertificateResponse: Response containing the certificate ID and full certificate object
            
        Raises:
            ValueError: If the file is not a valid PDF or metadata is invalid
            Exception: If there's an error processing the certificate
        """
        try:
            # Validate file is PDF
            if not file_name.lower().endswith('.pdf'):
                raise ValueError("Only PDF files are accepted for certificates")
            
            logger.info(f"Processing certificate PDF (size: {len(file_content)} bytes)")
            
            # Persist to database using repository pattern
            # Store binary content directly (BYTEA in PostgreSQL)
            with RepositoryManagerFactory.create() as repo:
                # Create new CCM record in database
                # The binary document goes in the 'doc' field as bytes
                ccm_record = repo.ccm_repository.create_new(
                    certificate_type=metadata.certificate_type,
                    certificate_name=metadata.certificate_name,
                    issuer_or_certification=metadata.issuer,
                    valid_from=metadata.valid_from,
                    valid_to=metadata.valid_until,
                    bpn=metadata.bpnl,
                    description=metadata.description or "",
                    doc=file_content  # Binary PDF document (stored as BYTEA)
                )
                
                # Commit to get the generated ID
                repo.commit()
                repo.refresh(ccm_record)
                
                certificate_id = str(ccm_record.id)
                
                logger.info(
                    f"Persisted certificate {certificate_id} to database for BPN-L {metadata.bpnl} "
                    f"(Type: {metadata.certificate_type})"
                )
            
            # Convert to BASE64 for the JSON response (CX-0135 requires base64 in JSON)
            base64_content = self._convert_to_base64(file_content)
            
            # Create certificate document object as per CX-0135 for the response
            certificate_document = CertificateDocument(
                documentTitle=file_name,
                documentType="application/pdf",
                documentContent=base64_content
            )
            
            # Get current timestamp for response
            current_timestamp = datetime.utcnow().isoformat() + "Z"
            
            # Create BusinessPartnerCertificate response object
            certificate = BusinessPartnerCertificate(
                certificateId=certificate_id,
                certificateType=metadata.certificate_type,
                certificateName=metadata.certificate_name,
                issuer=metadata.issuer,
                validFrom=metadata.valid_from,
                validUntil=metadata.valid_until,
                bpnl=metadata.bpnl,
                description=metadata.description,
                document=certificate_document,
                createdAt=current_timestamp,
                updatedAt=current_timestamp
            )
            
            # Create response
            response = UploadCertificateResponse(
                certificateId=certificate_id,
                message="Certificate uploaded successfully",
                certificate=certificate
            )
            
            return response
            
        except ValueError as e:
            logger.error(f"Validation error uploading certificate: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Error uploading certificate: {str(e)}")
            raise Exception(f"Failed to upload certificate: {str(e)}")

    def _convert_to_base64(self, file_content: bytes) -> str:
        """
        Convert binary file content to BASE64 encoded string.
        
        Args:
            file_content: The binary content to encode
            
        Returns:
            str: BASE64 encoded string
        """
        return base64.b64encode(file_content).decode('utf-8')


# Singleton instance for use in controllers
certificates_manager = CertificatesManager()
