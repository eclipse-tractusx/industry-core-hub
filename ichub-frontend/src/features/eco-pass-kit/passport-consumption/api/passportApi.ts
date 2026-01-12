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

/**
 * API service for fetching passport data and discovery
 */

export interface PassportResponse {
  data: Record<string, unknown>;
  semanticId?: string;
  digitalTwin?: {
    shell_descriptor: {
      id: string;
      idShort?: string;
      globalAssetId: string;
      assetKind: string;
      assetType: string;
      description?: Array<{ language: string; text: string }>;
      displayName?: Array<{ language: string; text: string }>;
      submodelDescriptors: Array<{
        endpoints: Array<{
          interface: string;
          protocolInformation: {
            href: string;
            endpointProtocol: string;
            endpointProtocolVersion: string[];
            subprotocol: string;
            subprotocolBody: string;
            subprotocolBodyEncoding: string;
            securityAttributes: Array<{
              type: string;
              key: string;
              value: string;
            }>;
          };
        }>;
        idShort: string;
        id: string;
        semanticId: {
          type: string;
          keys: Array<{
            type: string;
            value: string;
          }>;
        };
        supplementalSemanticId: unknown[];
        description: unknown[];
        displayName: unknown[];
      }>;
      specificAssetIds: Array<{
        name: string;
        value: string;
      }>;
    };
    dtr?: {
      connectorUrl: string;
      assetId: string;
    };
  };
  counterPartyId?: string;
}

/**
 * Discovery API types and functions
 */

export interface DiscoveryStatus {
  status: 'in_progress' | 'completed' | 'failed';
  step: 'parsing' | 'discovering_bpn' | 'retrieving_twin' | 'looking_up_submodel' | 'consuming_data' | 'complete' | 'error';
  message: string;
  progress: number;
}

export interface DiscoveryResponse {
  taskId: string;
  status: DiscoveryStatus;
  digitalTwin?: Record<string, unknown>;
  data?: Record<string, unknown>;
}

export interface DiscoverRequest {
  id: string;
  semanticId: string;
  dtrPolicies?: Array<Record<string, unknown>>;
  governance?: Record<string, unknown>;
}

const API_BASE_URL = '/addons/ecopass-kit';

/**
 * Initiates a discovery request to find and retrieve a DPP
 * @param request - Discovery request with id and semanticId
 * @returns Promise with task ID and initial status
 */
export const initiateDiscovery = async (request: DiscoverRequest): Promise<DiscoveryResponse> => {
  try {
    const response = await httpClient.post<DiscoveryResponse>(`${API_BASE_URL}/discover`, request);
    return response.data;
  } catch (error) {
    const errorMsg = (error as { response?: { data?: { detail?: string } } }).response?.data?.detail || 'Discovery request failed';
    throw new Error(errorMsg);
  }
};

/**
 * Polls the discovery status endpoint
 * @param taskId - The task ID from initiateDiscovery
 * @returns Promise with current discovery status and results (if completed)
 */
export const getDiscoveryStatus = async (taskId: string): Promise<DiscoveryResponse> => {
  try {
    const response = await httpClient.get<DiscoveryResponse>(`${API_BASE_URL}/discover/${taskId}/status`);
    return response.data;
  } catch (error) {
    const errorMsg = (error as { response?: { data?: { detail?: string } } }).response?.data?.detail || 'Status check failed';
    throw new Error(errorMsg);
  }
};

/**
 * Discovers a passport using the backend discovery API with polling
 * @param id - The identifier in format 'CX:<manufacturerPartId>:<partInstanceId>'
 * @param semanticId - The semantic ID of the submodel
 * @param onProgress - Callback function for progress updates
 * @param dtrPolicies - Optional policies for DTR access
 * @param governance - Optional governance policies for submodel consumption
 * @returns Promise with final passport data
 */
export const discoverPassport = async (
  id: string,
  semanticId: string,
  onProgress?: (status: DiscoveryStatus) => void,
  dtrPolicies?: Array<Record<string, unknown>>,
  governance?: Record<string, unknown>
): Promise<PassportResponse> => {
  // Initiate discovery
  const initialResponse = await initiateDiscovery({ 
    id, 
    semanticId,
    dtrPolicies,
    governance
  });
  const taskId = initialResponse.taskId;

  // Poll for status updates
  while (true) {
    await new Promise(resolve => setTimeout(resolve, 1000)); // Poll every second

    const statusResponse = await getDiscoveryStatus(taskId);

    // Notify progress callback
    if (onProgress) {
      onProgress(statusResponse.status);
    }

    // Check if completed
    if (statusResponse.status.status === 'completed') {
      if (!statusResponse.digitalTwin || !statusResponse.data) {
        throw new Error('Discovery completed but no data was returned');
      }

      return {
        data: statusResponse.data,
        semanticId: semanticId,
        digitalTwin: statusResponse.digitalTwin as PassportResponse['digitalTwin']
      };
    }

    // Check if failed
    if (statusResponse.status.status === 'failed') {
      throw new Error(statusResponse.status.message || 'Discovery failed');
    }

    // Continue polling if still in progress
  }
};
