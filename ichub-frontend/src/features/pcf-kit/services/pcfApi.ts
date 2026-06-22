/********************************************************************************
 * Eclipse Tractus-X - Industry Core Hub Frontend
 *
 * Copyright (c) 2026 Contributors to the Eclipse Foundation
 * Copyright (c) 2026 LKS Next
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
import { getIchubBackendUrl, getPcfExchangePoliciesConfig } from '@/services/EnvironmentService';
import { generatePoliciesFromDefinition } from '@/features/industry-core-kit/part-discovery/utils/governancePolicyUtils';

// =============================================================================
// API Configuration
// =============================================================================

const PCF_KIT_BASE_PATH = '/addons/pcf-kit';

const getBaseUrl = () => `${getIchubBackendUrl()}${PCF_KIT_BASE_PATH}`;

/**
 * Supported PCF schema versions, matching the backend's `SUPPORTED_PCF_VERSIONS`.
 * The backend stores each version in its own submodel slot keyed by
 * `(manufacturerPartId, version)`, so they can be queried and persisted
 * independently.
 */
export const PCF_VERSIONS = ['v9.0.0', 'v7.0.0'] as const;
export type PcfVersion = (typeof PCF_VERSIONS)[number];

/** Per-version PCF payload map (null when that version has no stored data). */
export type PcfVersionDataMap = Record<PcfVersion, Record<string, unknown> | null>;

/**
 * Normalizes an unknown (axios or generic) error into a `{ status, message }`
 * pair, extracting the backend's `detail`/`message` field when present so the
 * UI can surface the real cause (e.g. schema validation or "already exists").
 */
export function extractApiErrorDetail(error: unknown): { status?: number; message: string } {
  if (error && typeof error === 'object' && 'response' in error) {
    const ax = error as { response?: { status?: number; data?: unknown }; message?: string };
    const status = ax.response?.status;
    const data = ax.response?.data;
    let detail: string | undefined;
    if (typeof data === 'string') {
      detail = data;
    } else if (data && typeof data === 'object') {
      const d = data as Record<string, unknown>;
      if (typeof d.detail === 'string') detail = d.detail;
      else if (typeof d.message === 'string') detail = d.message;
      else detail = JSON.stringify(d);
    }
    return { status, message: detail || ax.message || 'Request failed' };
  }
  if (error instanceof Error) return { message: error.message };
  return { message: String(error) };
}

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
  createdAt?: string;
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
/**
 * Returns the configured PCF Exchange policies from the environment (values.yaml → PCF_EXCHANGE_POLICIES_CONFIG).
 * Falls back to DEFAULT_PCF_POLICIES if no configuration is provided.
 */
const getDefaultPcfPolicies = (): object[] => {
  const configured = getPcfExchangePoliciesConfig();
  if (configured.length > 0) {
    return configured.flatMap(def => generatePoliciesFromDefinition(def));
  }
  return DEFAULT_PCF_POLICIES;
};

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
 * Get PCF data for a catalog part by manufacturer part ID.
 *
 * @param version - optional PCF schema version (e.g. 'v9.0.0' or 'v7.0.0').
 *                  When provided it is sent as a `?version=` query param so the
 *                  backend returns that specific versioned submodel slot. When
 *                  omitted the backend falls back to its default version.
 * @returns the PCF payload, or `null` when that version has no stored data
 *          (the backend answers 400/404 for a missing slot).
 */
export async function getPcfByManufacturerPartId(
  manufacturerPartId: string,
  version?: PcfVersion
): Promise<Record<string, unknown> | null> {
  try {
    const base = `${getBaseUrl()}/provider/pcfs/${encodeURIComponent(manufacturerPartId)}`;
    const url = version ? `${base}?version=${encodeURIComponent(version)}` : base;
    const response = await httpClient.get<Record<string, unknown>>(url);
    return response.data;
  } catch (error: unknown) {
    // Return null if PCF not found (the backend answers 400 or 404 for a missing slot)
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
 * Fetch the stored PCF payload for every supported version of a part in
 * parallel. The result lets the UI know, per version, whether data exists
 * (`SUBIDO`) or not (`NO EXISTE`) and compare it against locally edited data
 * to decide between upload / update / skip on save.
 */
export async function getPcfVersionStatus(
  manufacturerPartId: string
): Promise<PcfVersionDataMap> {
  const entries = await Promise.all(
    PCF_VERSIONS.map(async (version) => {
      const data = await getPcfByManufacturerPartId(manufacturerPartId, version);
      return [version, data] as const;
    })
  );
  return Object.fromEntries(entries) as PcfVersionDataMap;
}

/**
 * Upload new PCF data for a catalog part.
 * @param version - optional PCF schema version (e.g. 'v9.0.0' or 'v7.0.0') sent as a query
 *                  param so the backend can route to the correct versioned submodel slot.
 */
export async function uploadPcf(
  manufacturerPartId: string,
  pcfData: Record<string, unknown>,
  version?: string
): Promise<Record<string, unknown>> {
  const base = `${getBaseUrl()}/provider/pcfs/${encodeURIComponent(manufacturerPartId)}`;
  const url = version ? `${base}?version=${encodeURIComponent(version)}` : base;
  const response = await httpClient.post<Record<string, unknown>>(url, pcfData);
  return response.data;
}

/**
 * Response from the PUT /provider/pcfs/{manufacturerPartId} endpoint.
 * The backend returns a status object that includes `sharedWithBpns` —
 * the list of BPNs that have previously received this PCF and can be
 * notified of the update.
 */
export interface PcfUpdateResponse {
  manufacturerPartId: string;
  pcfLocation: string;
  status: string;
  sharedWithBpns: string[];
}

/**
 * Update PCF data and get list of participants who have received this PCF.
 * Returns the `sharedWithBpns` array from the backend response — BPNs
 * that have been shared this part's PCF and can be notified of changes.
 */
export async function updatePcfAndGetParticipants(
  manufacturerPartId: string,
  pcfData: Record<string, unknown>,
  version?: PcfVersion
): Promise<string[]> {
  const base = `${getBaseUrl()}/provider/pcfs/${encodeURIComponent(manufacturerPartId)}`;
  const url = version ? `${base}?version=${encodeURIComponent(version)}` : base;
  const response = await httpClient.put<PcfUpdateResponse>(url, pcfData);
  // Extract `sharedWithBpns` from the response object.
  // The API returns { manufacturerPartId, pcfLocation, status, sharedWithBpns },
  // not a bare string array.
  return response.data.sharedWithBpns ?? [];
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
      governance: policies || getDefaultPcfPolicies()
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
    { governance: policies || getDefaultPcfPolicies() }
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
    { governance: policies || getDefaultPcfPolicies() }
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
    { governance: policies || getDefaultPcfPolicies() }
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
    { governance: policies || getDefaultPcfPolicies() }
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
export type PcfRequestStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'DELIVERED' | 'UPDATED' | 'FAILED';

/**
 * Convert API status to UI status
 */
export function mapStatusToUi(status: string): PcfRequestStatus {
  const statusMap: Record<string, PcfRequestStatus> = {
    'pending': 'PENDING',
    'delivered': 'DELIVERED',
    'accepted': 'ACCEPTED',
    'rejected': 'REJECTED',
    'updated': 'UPDATED',
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
    updated: [],
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
    updated: 0,
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
