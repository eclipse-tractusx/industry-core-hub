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
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND,
 * either express or implied. See the
 * License for the specific language govern in permissions and limitations
 * under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 ********************************************************************************/

/**
 * PCF Kit API Service
 * 
 * This service provides functions to interact with the PCF Kit backend endpoints.
 * It covers Provider (data provider) and Consumption (data consumer) APIs.
 */

import httpClient from '@/services/HttpClient';
import { getIchubBackendUrl } from '@/services/EnvironmentService';

// =============================================================================
// API Configuration
// =============================================================================

const PCF_KIT_BASE_PATH = '/addons/pcf-kit';

const getBaseUrl = () => `${getIchubBackendUrl()}${PCF_KIT_BASE_PATH}`;

// =============================================================================
// Types
// =============================================================================

/**
 * PCF Exchange status
 */
export type PcfExchangeStatus = 
  | 'pending'
  | 'delivered'
  | 'updated'
  | 'rejected'
  | 'failed'
  | 'error';

/**
 * PCF Exchange Model - represents a PCF exchange/request
 */
export interface PcfExchangeModel {
  requestId: string;
  manufacturerPartId?: string;
  customerPartId?: string;
  requestingBpn: string;
  targetBpn: string;
  status: string;
  type: string;
  message?: string;
  pcfLocation?: string;
  pcfData?: Record<string, unknown>;
}

/**
 * PCF Relationship Model - represents relationships between main parts and sub-parts
 */
export interface PcfRelationshipModel {
  mainManufacturerPartId: string;
  listSubManufacturerPartIds: PcfExchangeModel[];
}

/**
 * PCF SubPart Model - for adding subpart relations
 */
export interface PcfSubPartModel {
  manufacturerPartId: string;
  bpn: string;
}

/**
 * PCF Specific State Model - global state of PCF exchanges for a part
 */
export interface PcfSpecificStateModel {
  manufacturerPartId: string;
  totalSubParts: number;
  respondedSubParts: number;
  progressPercentage: number;
  overallStatus: string;
}

/**
 * ODRL Policy for PCF requests
 */
export interface OdrlPolicy {
  'odrl:permission': {
    'odrl:action': { '@id': string };
    'odrl:constraint': {
      'odrl:and'?: Array<{
        'odrl:leftOperand': { '@id': string };
        'odrl:operator': { '@id': string };
        'odrl:rightOperand': string;
      }>;
      'odrl:leftOperand'?: { '@id': string };
      'odrl:operator'?: { '@id': string };
      'odrl:rightOperand'?: string;
    };
  };
  'odrl:prohibition': unknown[];
  'odrl:obligation': unknown[];
}

/**
 * Provider request (notification) for PCF data
 */
export interface ProviderRequest extends PcfExchangeModel {
  // Additional fields for UI convenience
  requesterName?: string;
  partName?: string;
  requestDate?: string;
  responseDate?: string;
  priority?: 'LOW' | 'NORMAL' | 'HIGH';
}

// =============================================================================
// Default ODRL Policies for PCF Requests
// =============================================================================

/**
 * Default ODRL policies for PCF data exchange
 * These follow the Catena-X PCF standard policies
 */
export const DEFAULT_PCF_POLICIES: OdrlPolicy[] = [
  {
    'odrl:permission': {
      'odrl:action': { '@id': 'odrl:use' },
      'odrl:constraint': {
        'odrl:and': [
          { 'odrl:leftOperand': { '@id': 'cx-policy:FrameworkAgreement' }, 'odrl:operator': { '@id': 'odrl:eq' }, 'odrl:rightOperand': 'DataExchangeGovernance:1.0' },
          { 'odrl:leftOperand': { '@id': 'cx-policy:Membership' }, 'odrl:operator': { '@id': 'odrl:eq' }, 'odrl:rightOperand': 'active' },
          { 'odrl:leftOperand': { '@id': 'cx-policy:UsagePurpose' }, 'odrl:operator': { '@id': 'odrl:eq' }, 'odrl:rightOperand': 'cx.pcf.base:1' }
        ]
      }
    },
    'odrl:prohibition': [],
    'odrl:obligation': []
  },
  {
    'odrl:permission': {
      'odrl:action': { '@id': 'odrl:use' },
      'odrl:constraint': {
        'odrl:leftOperand': { '@id': 'cx-policy:UsagePurpose' },
        'odrl:operator': { '@id': 'odrl:eq' },
        'odrl:rightOperand': 'cx.pcf.base:1'
      }
    },
    'odrl:prohibition': [],
    'odrl:obligation': []
  }
];

// =============================================================================
// Provider APIs (Data Provider endpoints)
// =============================================================================

/**
 * Get PCF data for a catalog part by manufacturer part ID
 */
export async function getPcfByManufacturerPartId(
  manufacturerPartId: string
): Promise<Record<string, unknown> | null> {
  try {
    const response = await httpClient.get<Record<string, unknown>>(
      `${getBaseUrl()}/provider/pcfs/${encodeURIComponent(manufacturerPartId)}`
    );
    return response.data;
  } catch (error: unknown) {
    // Return null if PCF not found (404)
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response?: { status?: number } };
      if (axiosError.response?.status === 404 || axiosError.response?.status === 400) {
        return null;
      }
    }
    throw error;
  }
}

/**
 * Upload new PCF data for a catalog part
 */
export async function uploadPcf(
  manufacturerPartId: string,
  pcfData: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const response = await httpClient.post<Record<string, unknown>>(
    `${getBaseUrl()}/provider/pcfs/${encodeURIComponent(manufacturerPartId)}`,
    pcfData
  );
  return response.data;
}

/**
 * Update PCF data and get list of participants who have received this PCF
 * Returns list of BPNs that have been shared with this part's PCF
 */
export async function updatePcfAndGetParticipants(
  manufacturerPartId: string,
  pcfData: Record<string, unknown>
): Promise<string[]> {
  const response = await httpClient.put<string[]>(
    `${getBaseUrl()}/provider/pcfs/${encodeURIComponent(manufacturerPartId)}`,
    pcfData
  );
  return response.data;
}

/**
 * Confirm and send PCF update to selected participants
 */
export async function notifyParticipants(
  manufacturerPartId: string,
  bpns: string[],
  policies?: OdrlPolicy[]
): Promise<Record<string, unknown>> {
  const response = await httpClient.post<Record<string, unknown>>(
    `${getBaseUrl()}/provider/pcfs/${encodeURIComponent(manufacturerPartId)}/notify-update`,
    {
      list_bpns: bpns,
      list_policies: policies || DEFAULT_PCF_POLICIES
    }
  );
  return response.data;
}

/**
 * Get list of provider notifications (PCF requests received)
 */
export async function getProviderRequests(
  status?: string,
  limit: number = 100,
  offset: number = 0
): Promise<PcfExchangeModel[]> {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  params.append('limit', limit.toString());
  params.append('offset', offset.toString());

  const response = await httpClient.get<PcfExchangeModel[]>(
    `${getBaseUrl()}/provider/requests?${params.toString()}`
  );
  return response.data;
}

/**
 * Accept a PCF request and send the response
 */
export async function acceptRequest(
  requestId: string,
  policies?: OdrlPolicy[]
): Promise<Record<string, unknown>> {
  const response = await httpClient.post<Record<string, unknown>>(
    `${getBaseUrl()}/provider/requests/${encodeURIComponent(requestId)}/accept`,
    policies || DEFAULT_PCF_POLICIES
  );
  return response.data;
}

/**
 * Refresh PCF data for a specific request
 */
export async function refreshPcfForRequest(
  requestId: string
): Promise<PcfExchangeModel> {
  const response = await httpClient.get<PcfExchangeModel>(
    `${getBaseUrl()}/provider/requests/${encodeURIComponent(requestId)}/refresh-pcf`
  );
  return response.data;
}

/**
 * Retry sending response for a request
 */
export async function retryResponseSending(
  requestId: string,
  policies?: OdrlPolicy[]
): Promise<Record<string, unknown>> {
  const response = await httpClient.post<Record<string, unknown>>(
    `${getBaseUrl()}/provider/requests/${encodeURIComponent(requestId)}/response/retry`,
    policies || DEFAULT_PCF_POLICIES
  );
  return response.data;
}

// =============================================================================
// Consumption APIs (Data Consumer endpoints)
// =============================================================================

/**
 * Get subparts linked to a main part
 */
export async function getSubparts(
  manufacturerPartId: string
): Promise<PcfRelationshipModel> {
  const response = await httpClient.get<PcfRelationshipModel>(
    `${getBaseUrl()}/consumption/parts/${encodeURIComponent(manufacturerPartId)}/subparts`
  );
  return response.data;
}

/**
 * Add a subpart relation and create a PCF request
 */
export async function addSubpart(
  mainManufacturerPartId: string,
  subpart: PcfSubPartModel
): Promise<PcfRelationshipModel> {
  const response = await httpClient.post<PcfRelationshipModel>(
    `${getBaseUrl()}/consumption/parts/${encodeURIComponent(mainManufacturerPartId)}/subparts`,
    subpart
  );
  return response.data;
}

/**
 * Send PCF request to a participant for a specific request
 */
export async function sendPcfRequest(
  requestId: string,
  policies?: OdrlPolicy[]
): Promise<Record<string, unknown>> {
  const response = await httpClient.post<Record<string, unknown>>(
    `${getBaseUrl()}/consumption/requests/${encodeURIComponent(requestId)}/send`,
    policies || DEFAULT_PCF_POLICIES
  );
  return response.data;
}

/**
 * Retry sending a PCF request
 */
export async function retrySendPcfRequest(
  requestId: string,
  policies?: OdrlPolicy[]
): Promise<Record<string, unknown>> {
  const response = await httpClient.post<Record<string, unknown>>(
    `${getBaseUrl()}/consumption/requests/${encodeURIComponent(requestId)}/retry`,
    policies || DEFAULT_PCF_POLICIES
  );
  return response.data;
}

/**
 * Consult the PCF response for a request
 */
export async function consultPcfResponse(
  requestId: string
): Promise<PcfExchangeModel> {
  const response = await httpClient.get<PcfExchangeModel>(
    `${getBaseUrl()}/consumption/requests/${encodeURIComponent(requestId)}/response`
  );
  return response.data;
}

/**
 * Get the global PCF assembly progress for a part
 */
export async function getPcfStatus(
  manufacturerPartId: string
): Promise<PcfSpecificStateModel> {
  const response = await httpClient.get<PcfSpecificStateModel>(
    `${getBaseUrl()}/consumption/parts/${encodeURIComponent(manufacturerPartId)}/pcf-status`
  );
  return response.data;
}

/**
 * Download consolidated PCF data for a part
 */
export async function downloadPcfData(
  manufacturerPartId: string
): Promise<PcfExchangeModel[]> {
  const response = await httpClient.get<PcfExchangeModel[]>(
    `${getBaseUrl()}/consumption/parts/${encodeURIComponent(manufacturerPartId)}/pcf-data/download`
  );
  return response.data;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Transform backend PcfExchangeModel to frontend ProviderRequest format
 * Adds UI-friendly fields
 */
export function transformToProviderRequest(
  exchange: PcfExchangeModel,
  additionalInfo?: {
    requesterName?: string;
    partName?: string;
    priority?: 'LOW' | 'NORMAL' | 'HIGH';
  }
): ProviderRequest {
  return {
    ...exchange,
    requesterName: additionalInfo?.requesterName || exchange.requestingBpn,
    partName: additionalInfo?.partName || exchange.manufacturerPartId || 'Unknown Part',
    priority: additionalInfo?.priority || 'NORMAL'
  };
}

/**
 * Request status types used in UI (compatible with backend statuses)
 */
export type PcfRequestStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'DELIVERED' | 'FAILED';

/**
 * Convert API status to UI status
 */
export function mapStatusToUi(status: string): PcfRequestStatus {
  const statusMap: Record<string, PcfRequestStatus> = {
    'pending': 'PENDING',
    'delivered': 'DELIVERED',
    'accepted': 'ACCEPTED',
    'rejected': 'REJECTED',
    'failed': 'FAILED',
    'error': 'FAILED'
  };
  return statusMap[status.toLowerCase()] || 'PENDING';
}

/**
 * UI-friendly notification model (compatible with PcfNotification from pcfExchangeApi)
 */
export interface UiNotification {
  id: string;
  partCatenaXId: string;
  manufacturerPartId: string;
  partInstanceId: string;
  partName?: string;
  requesterId: string;
  requesterName: string;
  requestDate: string;
  status: PcfRequestStatus;
  responseDate?: string;
  rejectReason?: string;
  message?: string;
  priority?: 'LOW' | 'NORMAL' | 'HIGH';
  pcfData?: Record<string, unknown>;
}

/**
 * Convert PcfExchangeModel to UI notification format
 */
export function toUiNotification(model: PcfExchangeModel): UiNotification {
  return {
    id: model.requestId,
    partCatenaXId: '', // Will be resolved if needed
    manufacturerPartId: model.manufacturerPartId || model.customerPartId || 'Unknown',
    partInstanceId: 'CATALOG',
    partName: model.manufacturerPartId,
    requesterId: model.requestingBpn,
    requesterName: model.requestingBpn, // Could be resolved to company name
    requestDate: new Date().toISOString(), // API should provide this
    status: mapStatusToUi(model.status),
    message: model.message,
    pcfData: model.pcfData
  };
}

/**
 * Group provider requests by status for UI display
 */
export function groupRequestsByStatus(
  requests: PcfExchangeModel[]
): Record<string, PcfExchangeModel[]> {
  const groups: Record<string, PcfExchangeModel[]> = {
    pending: [],
    delivered: [],
    accepted: [],
    rejected: [],
    failed: []
  };

  for (const request of requests) {
    const status = request.status.toLowerCase();
    if (groups[status]) {
      groups[status].push(request);
    } else {
      // Default to pending for unknown statuses
      groups.pending.push(request);
    }
  }

  return groups;
}

/**
 * Count requests by status
 */
export function countRequestsByStatus(
  requests: PcfExchangeModel[]
): Record<string, number> {
  const counts: Record<string, number> = {
    pending: 0,
    delivered: 0,
    accepted: 0,
    rejected: 0,
    failed: 0,
    all: requests.length
  };

  for (const request of requests) {
    const status = request.status.toLowerCase();
    if (counts[status] !== undefined) {
      counts[status]++;
    }
  }

  return counts;
}
