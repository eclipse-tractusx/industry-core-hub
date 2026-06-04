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
import { getIchubBackendUrl } from '@/services/EnvironmentService';
import { 
  Certificate, 
  CertificateDetail,
  SharedCertificate, 
  CertificateFilter,
  PaginationParams,
  SortParams,
  PaginatedResponse,
  PartnerCertificateSearchResult,
  IncomingCertificateNotification,
  NegotiationStatus,
} from './types/types';
import { CertificateFormData } from './types/dialog-types';
import {
  mockFetchCertificates,
  mockFetchCertificateDetail,
  mockFetchSharingRecords,
  mockFetchIncomingNotifications,
  mockSearchPartnerCertificates,
  mockInitiateNegotiation,
  mockCheckNegotiationStatus,
  mockFetchTransferredCertificate,
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
 * Upload a new certificate
 * POST /api/ccm/certificates
 */
export const createCertificate = async (certificateData: CertificateFormData): Promise<Certificate> => {
  const formData = new FormData();
  formData.append('name', certificateData.name);
  formData.append('type', certificateData.type);
  formData.append('bpn', certificateData.bpn);
  formData.append('issuer', certificateData.issuer);
  formData.append('validFrom', certificateData.validFrom);
  formData.append('validUntil', certificateData.validUntil);
  
  if (certificateData.certificateIdentifier) {
    formData.append('certificateIdentifier', certificateData.certificateIdentifier);
  }

  if (certificateData.certificateScope) {
    formData.append('certificateScope', certificateData.certificateScope);
  }

  if (certificateData.enclosedSitesBpn?.length) {
    formData.append('enclosedSitesBpn', JSON.stringify(certificateData.enclosedSitesBpn));
  }

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
 * Share a certificate with a partner via EDC
 * POST /api/ccm/certificates/{id}/share
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
 */
export const revokeShare = async (certificateId: string, shareId: string): Promise<void> => {
  await httpClient.delete(
    `${backendUrl}${CCM_BASE_PATH}/certificates/${certificateId}/share/${shareId}`
  );
};

// ─── Sharing Outbox ───────────────────────────────────────────────────────────

/**
 * Fetch all sharing records (outbox) across all certificates.
 * GET /api/ccm/certificates/shares
 */
export const fetchSharingRecords = async (): Promise<SharedCertificate[]> => {
  try {
    if (!backendUrl) {
      console.warn('[CCM] Backend URL not configured — using mock sharing records');
      return mockFetchSharingRecords();
    }
    const response = await httpClient.get<SharedCertificate[]>(
      `${backendUrl}${CCM_BASE_PATH}/certificates/shares`
    );
    return response.data;
  } catch (error) {
    console.warn('[CCM] Sharing records API unavailable — using mock data', error);
    return mockFetchSharingRecords();
  }
};

// ─── DTR Registration ─────────────────────────────────────────────────────────

/**
 * Trigger DTR registration for a certificate.
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

// ─── Consumer / Discovery ─────────────────────────────────────────────────────

/**
 * Search for a partner's certificates by BPN.
 */
export const searchPartnerCertificates = async (
  partnerBpn: string,
): Promise<PartnerCertificateSearchResult> => {
  if (!backendUrl) {
    console.warn('[CCM] Backend URL not configured — using mock partner search');
    return mockSearchPartnerCertificates(partnerBpn);
  }
  const response = await httpClient.post<PartnerCertificateSearchResult>(
    `${backendUrl}${CCM_BASE_PATH}/consumer/search`,
    { partnerBpn }
  );
  return response.data;
};

/**
 * Initiate EDC contract negotiation to access a partner certificate.
 */
export const initiateNegotiation = async (
  partnerBpn: string,
  edcAssetId: string,
): Promise<{ negotiationId: string }> => {
  if (!backendUrl) {
    console.warn('[CCM] Backend URL not configured — using mock negotiation');
    return mockInitiateNegotiation(partnerBpn, edcAssetId);
  }
  const response = await httpClient.post<{ negotiationId: string }>(
    `${backendUrl}${CCM_BASE_PATH}/consumer/negotiate`,
    { partnerBpn, edcAssetId }
  );
  return response.data;
};

/**
 * Poll the status of an ongoing EDC contract negotiation.
 */
export const checkNegotiationStatus = async (
  negotiationId: string,
  callCount: number = 0,
): Promise<{ status: NegotiationStatus; transferId?: string }> => {
  if (!backendUrl) {
    return mockCheckNegotiationStatus(negotiationId, callCount);
  }
  const response = await httpClient.get<{ status: NegotiationStatus; transferId?: string }>(
    `${backendUrl}${CCM_BASE_PATH}/consumer/negotiate/${negotiationId}/status`
  );
  return response.data;
};

/**
 * Fetch the certificate payload retrieved after a successful EDC transfer.
 */
export const fetchTransferredCertificate = async (
  transferId: string,
): Promise<Record<string, unknown>> => {
  if (!backendUrl) {
    console.warn('[CCM] Backend URL not configured — using mock transferred certificate');
    return mockFetchTransferredCertificate(transferId);
  }
  const response = await httpClient.get<Record<string, unknown>>(
    `${backendUrl}${CCM_BASE_PATH}/consumer/transfer/${transferId}`
  );
  return response.data;
};

// ─── Incoming Notifications ───────────────────────────────────────────────────

/**
 * Fetch all incoming certificate push notifications.
 */
export const fetchIncomingNotifications = async (): Promise<IncomingCertificateNotification[]> => {
  try {
    if (!backendUrl) {
      console.warn('[CCM] Backend URL not configured — using mock incoming notifications');
      return mockFetchIncomingNotifications();
    }
    const response = await httpClient.get<IncomingCertificateNotification[]>(
      `${backendUrl}${CCM_BASE_PATH}/notifications/incoming`
    );
    return response.data;
  } catch (error) {
    console.warn('[CCM] Notifications API unavailable — using mock data', error);
    return mockFetchIncomingNotifications();
  }
};

/**
 * Acknowledge an incoming certificate notification.
 */
export const acknowledgeNotification = async (notificationId: string): Promise<void> => {
  if (!backendUrl) {
    console.warn('[CCM] Backend URL not configured — mock acknowledge');
    return;
  }
  await httpClient.post(`${backendUrl}${CCM_BASE_PATH}/notifications/incoming/${notificationId}/acknowledge`);
};

/**
 * Reject an incoming certificate notification.
 */
export const rejectNotification = async (notificationId: string): Promise<void> => {
  if (!backendUrl) {
    console.warn('[CCM] Backend URL not configured — mock reject');
    return;
  }
  await httpClient.post(`${backendUrl}${CCM_BASE_PATH}/notifications/incoming/${notificationId}/reject`);
};