/********************************************************************************
 * Eclipse Tractus-X - Industry Core Hub Frontend
 *
 * Copyright (c) 2025 Contributors to the Eclipse Foundation
 *
 * See the NOTICE file(s) distributed with this work for additional
 * information regarding copyright ownership.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Apache License, Version 2.0 which is available at
 * https://www.apache.org/licenses/LICENSE-2.0.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND,
 * either express or implied. See the
 * License for the specific language govern in permissions and limitations
 * under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 ********************************************************************************/

export interface UploadCertificateDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (certificate: CertificateFormData) => void | Promise<void>;
  certificateData?: CertificateFormData;
}

/**
 * Form data for uploading a certificate
 * Maps to BusinessPartnerCertificate v3.1.0 metadata fields
 */
export interface CertificateFormData {
  name: string;  // Certificate Name
  type: string;  // Certificate Type (ISO 9001, IATF 16949, ISO 14001, etc.)
  bpn: string;   // BPN-L of the certificate holder
  issuer: string;  // Issuer / Certification Body
  validFrom: string;  // Valid From date
  validUntil: string;  // Valid Until date
  description?: string;  // Optional description
  document?: File;  // PDF file (will be converted to BASE64)
}

export interface ShareCertificateDialogProps {
  open: boolean;
  onClose: () => void;
  certificate: {
    id: string;
    name: string;
  } | null;
  onShare: (certificateId: string, partnerBpn: string, method: 'PULL' | 'PUSH') => void;
}

export interface ViewCertificateDialogProps {
  open: boolean;
  onClose: () => void;
  certificate: {
    id: string;
    name: string;
    type: string;
    bpn: string;
    issuer: string;
    validFrom: string;
    validUntil: string;
    status: string;
    sharedCount: number;
    documentUrl?: string;
  } | null;
}

export interface DeleteCertificateDialogProps {
  open: boolean;
  onClose: () => void;
  certificate: {
    id: string;
    name: string;
  } | null;
  onConfirm: (certificateId: string) => void;
}
