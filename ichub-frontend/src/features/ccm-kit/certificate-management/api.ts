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

import httpClient from '@/services/HttpClient';
import { getIchubBackendUrl } from '@/services/EnvironmentService';
import { 
  Certificate, 
  CertificateDetail,
  SharedCertificate, 
  CertificateFilter,
  PaginationParams,
  SortParams,
  PaginatedResponse
} from './types/types';
import { CertificateFormData } from './types/dialog-types';

/**
 * CCM API base path following CX-0135 standard
 */
const CCM_BASE_PATH = '/api/ccm';
const backendUrl = getIchubBackendUrl();

/**
 * Build query string from filter, pagination and sort parameters
 */
const buildQueryString = (
  filter?: Partial<CertificateFilter>,
  pagination?: PaginationParams,
  sort?: SortParams
): string => {
  const params = new URLSearchParams();
  
  if (filter) {
    if (filter.search) params.append('search', filter.search);
    if (filter.type) params.append('type', filter.type);
    if (filter.status) params.append('status', filter.status);
    if (filter.shared !== undefined && filter.shared !== '') {
      params.append('shared', String(filter.shared));
    }
  }
  
  if (pagination) {
    params.append('page', String(pagination.page));
    params.append('page_size', String(pagination.pageSize));
  }
  
  if (sort) {
    params.append('sort_by', sort.sortBy);
    params.append('sort_order', sort.sortOrder);
  }
  
  const queryString = params.toString();
  return queryString ? `?${queryString}` : '';
};

/**
 * Fetch paginated list of certificates
 * GET /api/ccm/certificates
 * 
 * Query parameters for filtering:
 * - type: filter by certificate type
 * - status: filter by validity status (valid/expiring/expired)
 * - shared: filter by shared or not shared
 * - search: text search across name, issuer, BPN
 * 
 * Pagination: page, page_size
 * Sorting: sort_by (name, type, valid_until, shared_date), sort_order (asc, desc)
 */
export const fetchCertificates = async (
  filter?: Partial<CertificateFilter>,
  pagination?: PaginationParams,
  sort?: SortParams
): Promise<PaginatedResponse<Certificate>> => {
  try {
    if (!backendUrl) {
      console.warn('Backend URL not configured, returning empty certificates list');
      return { data: [], page: 0, pageSize: 10, totalCount: 0, totalPages: 0 };
    }
    
    const queryString = buildQueryString(filter, pagination, sort);
    const response = await httpClient.get<PaginatedResponse<Certificate>>(
      `${backendUrl}${CCM_BASE_PATH}/certificates${queryString}`
    );
    return response.data;
  } catch (error) {
    console.error('Failed to fetch certificates:', error);
    return { data: [], page: 0, pageSize: 10, totalCount: 0, totalPages: 0 };
  }
};

/**
 * Fetch all certificates (non-paginated, for backward compatibility)
 */
export const fetchAllCertificates = async (): Promise<Certificate[]> => {
  try {
    if (!backendUrl) {
      console.warn('Backend URL not configured, returning empty certificates list');
      return [];
    }
    
    const response = await httpClient.get<PaginatedResponse<Certificate>>(
      `${backendUrl}${CCM_BASE_PATH}/certificates?page_size=1000`
    );
    return response.data.data || [];
  } catch (error) {
    console.error('Failed to fetch certificates:', error);
    return [];
  }
};

/**
 * Fetch certificate detail by ID
 * GET /api/ccm/certificates/{id}
 * 
 * Returns full certificate detail including:
 * - All metadata fields
 * - Sharing history (all partners shared with, dates, statuses, methods)
 * - BASE64 content (or download link for the PDF file)
 */
export const fetchCertificateById = async (certificateId: string): Promise<CertificateDetail | null> => {
  try {
    if (!backendUrl) {
      console.warn('Backend URL not configured');
      return null;
    }
    
    const response = await httpClient.get<CertificateDetail>(
      `${backendUrl}${CCM_BASE_PATH}/certificates/${certificateId}`
    );
    return response.data;
  } catch (error) {
    console.error('Failed to fetch certificate detail:', error);
    return null;
  }
};

/**
 * Upload a new certificate
 * POST /api/ccm/certificates
 * 
 * Accepts multipart request with PDF file + metadata
 * PDF file is converted to BASE64 encoded string
 * 
 * Metadata fields mapped to BusinessPartnerCertificate v3.1.0:
 * - Certificate Type (e.g., ISO 9001, IATF 16949, ISO 14001)
 * - Certificate Name
 * - Issuer / Certification Body
 * - Valid From / Valid Until
 * - BPN-L of the certificate holder
 * - Description (optional)
 * 
 * Validation:
 * - File type validation (PDF only or PDF/PNG/JPG)
 * - File size limit (max 10MB)
 * - Required fields validation (type, name, issuer, dates)
 * - Date consistency (Valid From < Valid Until)
 */
export const createCertificate = async (certificateData: CertificateFormData): Promise<Certificate> => {
  const formData = new FormData();
  formData.append('name', certificateData.name);
  formData.append('type', certificateData.type);
  formData.append('bpn', certificateData.bpn);
  formData.append('issuer', certificateData.issuer);
  formData.append('validFrom', certificateData.validFrom);
  formData.append('validUntil', certificateData.validUntil);
  
  if (certificateData.description) {
    formData.append('description', certificateData.description);
  }
  
  if (certificateData.document) {
    formData.append('document', certificateData.document);
  }
  
  const response = await httpClient.post<Certificate>(
    `${backendUrl}${CCM_BASE_PATH}/certificates`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );
  return response.data;
};

/**
 * Share a certificate with a partner via EDC
 * POST /api/ccm/certificates/{id}/share
 * 
 * Triggers EDC sharing workflow:
 * - Creates an EDC Data Asset for the certificate using CX-0135 data model
 * - Configures Access Policy and Usage Policy as specified in CX-0135
 * - Registers the asset with the EDC connector for the target partner's BPN
 * 
 * Stores sharing record in database:
 * - Target Partner BPN
 * - Shared Date
 * - EDC Contract ID
 * - Status (Active/Pending/Revoked)
 * 
 * @param certificateId - ID of the certificate to share
 * @param partnerBpn - BPN of the target partner
 * @param method - Sharing method: 'PULL' (EDC data offer) or 'PUSH' (notification)
 */
export const shareCertificate = async (
  certificateId: string,
  partnerBpn: string,
  method: 'PULL' | 'PUSH'
): Promise<SharedCertificate> => {
  const response = await httpClient.post<SharedCertificate>(
    `${backendUrl}${CCM_BASE_PATH}/certificates/${certificateId}/share`,
    { partnerBpn, method }
  );
  return response.data;
};

/**
 * Revoke shared access to a certificate
 * DELETE /api/ccm/certificates/{id}/share/{shareId}
 * 
 * Revokes the EDC contract and updates sharing record status to 'Revoked'
 */
export const revokeShare = async (certificateId: string, shareId: string): Promise<void> => {
  await httpClient.delete(
    `${backendUrl}${CCM_BASE_PATH}/certificates/${certificateId}/share/${shareId}`
  );
};
