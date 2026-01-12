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

import axios from 'axios'; // only for isAxiosError checks
import httpClient from '@/services/HttpClient';
import { getIchubBackendUrl } from '@/services/EnvironmentService';
import { SerializedPart, AddSerializedPartRequest } from './types';
import { SerializedPartTwinCreateType, SerializedPartTwinShareCreateType, SerializedPartTwinUnshareCreateType, TwinReadType, SerializedPartTwinRead } from './types/twin-types';

const SERIALIZED_PART_READ_BASE_PATH = '/part-management/serialized-part';
const SERIALIZED_PART_TWIN_BASE_PATH = '/twin-management/serialized-part-twin';
const backendUrl = getIchubBackendUrl();

// Track if twin endpoint is available to avoid repeated 404 calls
let twinEndpointUnavailable = false;

// For cached GET requests we just pass a Cache-Control header per request instead of a separate instance

export const fetchAllSerializedParts = async (): Promise<SerializedPart[]> => {
  try {
    if (!backendUrl) {
      console.warn('Backend URL not configured, returning empty serialized parts list');
      return [];
    }
  const response = await httpClient.get<SerializedPart[]>(`${backendUrl}${SERIALIZED_PART_READ_BASE_PATH}`);
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error('Failed to fetch serialized parts:', error);
    return []; // Return empty array instead of throwing
  }
}

export const fetchSerializedParts = async (manufacturerId: string, manufacturerPartId: string ): Promise<SerializedPart[]> => {
  try {
    if (!backendUrl) {
      console.warn('Backend URL not configured, returning empty serialized parts list');
      return [];
    }
    const response = await httpClient.post<SerializedPart[]>(
      `${backendUrl}${SERIALIZED_PART_READ_BASE_PATH}/query`,
      {
        manufacturerId,
        manufacturerPartId,
      }
    );
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error('Failed to fetch serialized parts:', error);
    return []; // Return empty array instead of throwing
  }
};

export const addSerializedPart = async (payload: AddSerializedPartRequest, autoGenerate: boolean = false) => {
  try {
    if (!backendUrl) {
      throw new Error('Backend URL not configured');
    }
    const response = await httpClient.post<SerializedPart>(
      `${backendUrl}${SERIALIZED_PART_READ_BASE_PATH}?autoGenerateCatalogPart=${autoGenerate}`, 
      payload
    );
    return response;
  } catch (error) {
    console.error('Failed to add serialized part:', error);
    throw error; // Re-throw for user feedback
  }
};

// Twin Management API Functions

export const createSerializedPartTwin = async (
  twinData: SerializedPartTwinCreateType
): Promise<TwinReadType> => {
  try {
    if (!backendUrl) {
      throw new Error('Backend URL not configured');
    }
    const response = await httpClient.post<TwinReadType>(
      `${backendUrl}${SERIALIZED_PART_TWIN_BASE_PATH}?include_data_exchange_agreements=true`,
      twinData
    );
    return response.data;
  } catch (error) {
    console.error('Failed to create serialized part twin:', error);
    throw error; // Re-throw for user feedback
  }
};

export const shareSerializedPartTwin = async (
  shareData: SerializedPartTwinShareCreateType
): Promise<void> => {
  try {
    if (!backendUrl) {
      throw new Error('Backend URL not configured');
    }
    await httpClient.post(
      `${backendUrl}${SERIALIZED_PART_TWIN_BASE_PATH}/share`,
      shareData
    );
  } catch (error) {
    console.error('Failed to share serialized part twin:', error);
    throw error; // Re-throw for user feedback
  }
};

export const fetchAllSerializedPartTwins = async (): Promise<SerializedPartTwinRead[]> => {
  try {
    if (!backendUrl) {
      console.warn('Backend URL not configured, returning empty twins list');
      return [];
    }

    // If we already know the endpoint is unavailable, don't make the request
    if (twinEndpointUnavailable) {
      
      return [];
    }
    
    // Fetch all twins without any filters using browser caching
    const params = new URLSearchParams();
    params.append('include_data_exchange_agreements', 'true');
    const response = await httpClient.get<SerializedPartTwinRead[]>(
      `${backendUrl}${SERIALIZED_PART_TWIN_BASE_PATH}?${params.toString()}`,
      { headers: { 'Cache-Control': 'max-age=300' } }
    );
    
    return Array.isArray(response.data) ? response.data : [];
  } catch (error: unknown) {
    // Handle 404 specifically - endpoint might not be available
    if (axios.isAxiosError(error) && error?.response?.status === 404) {
      console.warn('Twin management endpoint not found (404). This feature may not be available in this backend version.');
      twinEndpointUnavailable = true; // Remember that this endpoint is not available
      return [];
    }
    
    // Handle other 4xx errors
    if (axios.isAxiosError(error) && error?.response?.status && error.response.status >= 400 && error.response.status < 500) {
      console.warn(`Twin management endpoint returned ${error.response.status}. Feature may not be available.`);
      twinEndpointUnavailable = true; // Remember that this endpoint is not available
      return [];
    }
    
    console.error('Failed to fetch serialized part twins:', error);
    return []; // Return empty array instead of throwing
  }
};

export const fetchSerializedPartTwinsForCatalogPart = async (
  manufacturerId: string,
  manufacturerPartId: string
): Promise<SerializedPartTwinRead[]> => {
  // Build query parameters to filter by catalog part using browser caching
  const params = new URLSearchParams();
  params.append('include_data_exchange_agreements', 'true');
  params.append('manufacturerId', manufacturerId);
  params.append('manufacturerPartId', manufacturerPartId);
  const response = await httpClient.get<SerializedPartTwinRead[]>(
    `${backendUrl}${SERIALIZED_PART_TWIN_BASE_PATH}?${params.toString()}`,
    { headers: { 'Cache-Control': 'max-age=300' } }
  );
  
  return response.data;
};

export const unshareSerializedPartTwin = async (
  unshareData: SerializedPartTwinUnshareCreateType
): Promise<void> => {
  await httpClient.post(
    `${backendUrl}${SERIALIZED_PART_TWIN_BASE_PATH}/unshare`,
    unshareData
  );
};

export const deleteSerializedPart = async (
  partnerCatalogPartId: number,
  partInstanceId: string
): Promise<void> => {
  
  const url = `${backendUrl}${SERIALIZED_PART_READ_BASE_PATH}/${partnerCatalogPartId}/${partInstanceId}`;
  
  
  try {
  const response = await httpClient.delete(url);
    
  } catch (error) {
    console.error("Delete API error:", error);
    throw error;
  }
};