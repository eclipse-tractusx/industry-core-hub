/********************************************************************************
 * Eclipse Tractus-X - Industry Core Hub Frontend
 *
 * Copyright (c) 2026 Contributors to the Eclipse Foundation
 * Copyright (c) 2026 LKS
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

import axios from 'axios';

import { getIchubBackendUrl, getApiHeaders } from '@/services/EnvironmentService';
import authService from '@/services/AuthService';
import {
  Certificate,
  CertificateDetail,
  CertificateFilter,
  PaginationParams,
  SortParams,
  PaginatedResponse,
} from './types/types';
import {
  mockFetchCertificates,
  mockFetchCertificateDetail,
  mockRegisterInDtr,
} from './mocks/mockData';

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
 * Fetch certificates from CCM Addon Kit Endpoint
 * GET /addons/ccm-kit/certificates/
 * * Query parameters mapping:
 * - bpnl: Business Partner Number of the context user (Mandatory)
 * - certificateType: Type filtering parameter (Optional)
 * - offset: Pagination offset parameter
 * - limit: Pagination limitation size
 */
export const fetchAllCertificates = async (params: {
  bpnl: string;
  certificateType: string | null;
  offset: number;
  limit: number;
}): Promise<any[]> => {
  try {
    if (!backendUrl) {
      console.warn('[CCM] Backend URL not configured — using mock certificates fallback');
      return mockFetchCertificates();
    }
    
    const response = await httpClient.get<any[]>(
      `${backendUrl}/addons/ccm-kit/certificates/`,
      {
        params: {
          bpnl: params.bpnl,
          certificateType: params.certificateType,
          offset: params.offset,
          limit: params.limit,
        },
      }
    );
    return response.data || [];
  } catch (error) {
    console.error('[CCM] Error fetching certificates from backend endpoint:', error);
    // Propagamos el error al componente padre para evitar fallos de renderizado silenciosos
    throw error; 
  }
};

/**
 * Fetch certificate detail by ID
 * GET /api/ccm/certificates/{id}
 */
export const fetchCertificateById = async (certificateId: string): Promise<CertificateDetail | null> => {
  try {
    if (!backendUrl) {
      console.warn('[CCM] Backend URL not configured — using mock certificate detail');
      return mockFetchCertificateDetail(certificateId);
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
 * Upload a new certificate to the CCM Addon Kit
 * POST /addons/ccm-kit/certificates/
 *
 * Payload (Multipart Form Data):
 * - file *: PDF file (max 10MB)
 * - bpnl *: Current user's BPNL
 * - certificateType *: ISO9001, ISO14001, etc.
 * - issuer *: Certification Body name
 * - validFrom *: Start date (YYYY-MM-DD)
 * - certificateName: Optional name
 * - validUntil: Optional end date (YYYY-MM-DD)
 * - trustLevel: e.g., 'none'
 * - registrationNumber: Physical ID
 * - areaOfApplication: Context/Department
 * - validator: Verifying body
 * - sites: JSON array string of sites
 * - description: Optional text
 */
/**
 * Upload a new certificate to the CCM Addon Kit
 * POST /addons/ccm-kit/certificates/
 * * Envío forzado mediante Axios Nativo para garantizar formato Form Data (Multipart)
 */
export const createCertificate = async (certificateData: FormData): Promise<any> => {
  if (!backendUrl) {
    throw new Error('[CCM] Backend URL not configured');
  }

  // Merge API key + auth headers but drop Content-Type so the browser can set
  // the correct multipart/form-data boundary automatically.
  const { 'Content-Type': _dropped, ...headersWithoutContentType } = {
    ...getApiHeaders(),
    ...authService.getAuthHeaders(),
  };

  const response = await axios.post<any>(
    `${backendUrl}/addons/ccm-kit/certificates/`,
    certificateData,
    {
      headers: {
        ...headersWithoutContentType,
        'Accept': 'application/json',
      },
    }
  );

  return response.data;
};

/**
 * Update certificate metadata (all fields optional, PDF is immutable).
 * PUT /addons/ccm-kit/certificates/{certificate_id}
 * Request is multipart/form-data — only provided fields are written.
 */
export const updateCertificate = async (certificateId: string, formData: FormData): Promise<any> => {
  if (!backendUrl) {
    throw new Error('[CCM] Backend URL not configured');
  }
  const { 'Content-Type': _dropped, ...headersWithoutContentType } = {
    ...getApiHeaders(),
    ...authService.getAuthHeaders(),
  };
  const response = await axios.put<any>(
    `${backendUrl}/addons/ccm-kit/certificates/${certificateId}`,
    formData,
    {
      headers: {
        ...headersWithoutContentType,
        'Accept': 'application/json',
      },
    }
  );
  return response.data;
};

/**
 * Fetch full certificate detail including the base64-encoded PDF document.
 * GET /addons/ccm-kit/certificates/{certificate_id}
 * Response includes document.documentContent (base64 PDF), sharing history, and all metadata.
 */
export const fetchCertificateDetail = async (certificateId: string): Promise<any> => {
  if (!backendUrl) {
    throw new Error('[CCM] Backend URL not configured');
  }
  const response = await httpClient.get(
    `${backendUrl}/addons/ccm-kit/certificates/${certificateId}`
  );
  return response.data;
};

/**
 * Delete a certificate from the CCM Addon Kit
 * DELETE /addons/ccm-kit/certificates/{certificate_id}
 * Returns 204 No Content on success.
 */
export const deleteCertificate = async (certificateId: string): Promise<void> => {
  if (!backendUrl) {
    throw new Error('[CCM] Backend URL not configured');
  }
  await httpClient.delete(`${backendUrl}/addons/ccm-kit/certificates/${certificateId}`);
};

/**
 * Replace the PDF document of an existing certificate.
 * PUT /api/ccm/certificates/{id}/document
 */
export const updateCertificateDocument = async (
  certificateId: string,
  document: File,
): Promise<void> => {
  if (!backendUrl) {
    console.warn('[CCM] Backend URL not configured — mock update document');
    return;
  }
  const formData = new FormData();
  formData.append('document', document);
  await httpClient.put(
    `${backendUrl}${CCM_BASE_PATH}/certificates/${certificateId}/document`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
};

/**
 * Revoke shared access to a certificate
 * DELETE /api/ccm/certificates/{id}/share/{shareId}
 */
export const revokeShare = async (certificateId: string, shareId: string): Promise<void> => {
  await httpClient.delete(
    `${backendUrl}${CCM_BASE_PATH}/certificates/${certificateId}/share/${shareId}`
  );
};

// ─── Publish to EDC ────────────────────────────────────────────────────────────

/**
 * Publish a certificate as an EDC asset via the CCM provider endpoint.
 * POST /addons/ccm-kit/provider/publish
 * Returns the documentId (EDC asset ID) assigned to the certificate.
 */
export const publishCertificateAsset = async (
  certificateId: string,
): Promise<{ documentId: string; assetId: string; certificateId: number }> => {
  if (!backendUrl) {
    throw new Error('[CCM] Backend URL not configured');
  }
  const response = await httpClient.post<{ documentId: string; assetId: string; certificateId: number }>(
    `${backendUrl}/addons/ccm-kit/provider/publish`,
    { certificateId: Number(certificateId) },
  );
  return response.data;
};

// ─── DTR Registration (legacy — kept for backward compatibility) ───────────────

/**
 * @deprecated Use publishCertificateAsset instead.
 */
export const registerCertificateInDtr = async (
  certificateId: string,
): Promise<{ dtrStatus: 'registered'; edcAssetId: string }> => {
  if (!backendUrl) {
    console.warn('[CCM] Backend URL not configured — using mock DTR registration');
    return mockRegisterInDtr(certificateId);
  }
  const response = await httpClient.post<{ dtrStatus: 'registered'; edcAssetId: string }>(
    `${backendUrl}${CCM_BASE_PATH}/certificates/${certificateId}/register-dtr`
  );
  return response.data;
};


