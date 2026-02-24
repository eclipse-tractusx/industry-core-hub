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

/**
 * Certificate validity status - computed from dates
 * Valid: Valid Until > today + 30 days
 * Expiring: Valid Until ≤ today + 30 days AND > today
 * Expired: Valid Until ≤ today
 */
export type CertificateStatus = 'valid' | 'expiring' | 'expired';

/**
 * Certificate types as per CX-0135 BusinessPartnerCertificate v3.1.0
 */
export type CertificateType = 
  | 'ISO9001'
  | 'ISO14001'
  | 'ISO45001'
  | 'IATF16949'
  | 'ISO27001'
  | 'OTHER';

/**
 * Sharing record status for EDC workflow
 */
export type ShareStatus = 'Active' | 'Pending' | 'Revoked';

/**
 * Sharing record for a certificate
 * Stores EDC sharing workflow data
 */
export interface SharingRecord {
  id: string;
  partnerBpn: string;
  partnerName?: string;
  sharedDate: string;
  method: 'PULL' | 'PUSH';
  edcContractId: string;
  status: ShareStatus;
}

/**
 * Certificate entity following CX-0135 BusinessPartnerCertificate v3.1.0 model
 */
export interface Certificate {
  id: string;
  name: string;
  type: CertificateType;
  bpn: string;  // BPN-L of the certificate holder
  issuer: string;  // Certification Body
  validFrom: string;
  validUntil: string;
  description?: string;  // Optional description
  status: CertificateStatus;  // Computed from dates
  sharedCount: number;  // Number of active shares
  sharingRecords?: SharingRecord[];  // List of sharing records
  documentBase64?: string;  // BASE64-encoded document (CX-0135)
  documentUrl?: string;  // Download link for PDF
  createdAt: string;
  updatedAt: string;
}

/**
 * Certificate detail with full sharing history
 */
export interface CertificateDetail extends Certificate {
  sharingHistory: SharingRecord[];
  documentBase64: string;
}

export interface CertificateStats {
  total: number;
  valid: number;
  expiring: number;
  expired: number;
  shared?: number;  // Total shared certificates
}

/**
 * Filter parameters for certificate list
 */
export interface CertificateFilter {
  search: string;  // Text search across name, issuer, BPN
  type: CertificateType | '';
  status: CertificateStatus | '';
  shared?: boolean | '';  // Filter by shared or not shared
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page: number;
  pageSize: number;
}

/**
 * Sorting parameters
 */
export interface SortParams {
  sortBy: 'name' | 'type' | 'validUntil' | 'sharedDate';
  sortOrder: 'asc' | 'desc';
}

/**
 * Paginated response from API
 */
export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

/**
 * Shared certificate record
 */
export interface SharedCertificate {
  id: string;
  certificateId: string;
  certificateName: string;
  partnerBpn: string;
  partnerName?: string;
  sharedAt: string;
  method: 'PULL' | 'PUSH';
  edcContractId: string;
  status: ShareStatus;
}
