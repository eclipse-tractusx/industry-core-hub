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

import {
  DPPListItem,
} from '../types';
import httpClient from '@/services/HttpClient';

const API_BASE_URL = '/addons/ecopass-kit';


/**
 * Fetch all DPPs created by current user
 */
export const fetchUserDPPs = async (): Promise<DPPListItem[]> => {
  try {
    const response = await httpClient.get<{
      id: string;
      passportId: string;
      name: string;
      version: string;
      semanticId: string;
      status: string;
      twinAssociation?: {
        twinId: string;
        aasId?: string;
        manufacturerPartId: string;
        partInstanceId: string;
        twinName?: string;
        assetId?: string;
      };
      submodelId?: string;
      partType?: string;
      manufacturerPartId?: string;
      partInstanceId?: string;
      createdAt: string;
      updatedAt: string;
      issueDate?: string;
      expirationDate?: string;
    }[]>(`${API_BASE_URL}/passports`);
    
    const data = response.data;

    // DEBUG: Log raw backend response
    console.log('[SHARE DEBUG] Raw passports response:', JSON.stringify(data.slice(0, 2), null, 2));
    
    // Transform backend response to frontend format
    return data.map((dpp) => ({
      id: dpp.id,
      name: dpp.name,
      version: dpp.version,
      semanticId: dpp.semanticId,
      status: dpp.status.toLowerCase() as DPPListItem['status'],
      twinId: dpp.twinAssociation?.twinId,
      submodelId: dpp.submodelId,
      partType: (dpp.partType || dpp.twinAssociation ? 'serialized' : undefined) as DPPListItem['partType'],
      manufacturerPartId: dpp.manufacturerPartId || dpp.twinAssociation?.manufacturerPartId,
      partInstanceId: dpp.partInstanceId || dpp.twinAssociation?.partInstanceId,
      createdAt: dpp.createdAt,
      shareCount: 0,
      passportIdentifier: dpp.passportId,
      issueDate: dpp.issueDate,
      expirationDate: dpp.expirationDate
    }));
  } catch (error) {
    console.error('Error fetching DPPs from backend:', error);
    throw error;
  }
};

/**
 * Get DPP by ID with full details
 */
export const getDPPById = async (id: string): Promise<Record<string, unknown> | null> => {
  try {
    const response = await httpClient.get<Record<string, unknown>>(`${API_BASE_URL}/passports/${id}`);
    return response.data;
  } catch (error) {
    if ((error as { response?: { status?: number } }).response?.status === 404) {
      return null;
    }
    console.error('Error fetching DPP by ID:', error);
    throw error;
  }
};

/**
 * Delete a DPP
 */
export const deleteDPP = async (id: string): Promise<void> => {
  try {
    await httpClient.delete(`${API_BASE_URL}/passports/${id}`);
  } catch (error) {
    console.error('Error deleting DPP:', error);
    throw error;
  }
};

/**
 * Share a DPP with a partner
 */
export const shareDPP = async (
  dppId: string,
  partnerBpnl: string,
  customPartId?: string
): Promise<void> => {
  try {
    const payload = {
      dppId: dppId,
      businessPartnerNumber: partnerBpnl,
    };

    const url = `${API_BASE_URL}/provision/share`;

    // DEBUG: Log request details
    console.log('[SHARE DEBUG] === Share DPP Request ===' );
    console.log('[SHARE DEBUG] URL:', url);
    console.log('[SHARE DEBUG] Payload:', JSON.stringify(payload, null, 2));
    console.log('[SHARE DEBUG] dppId:', dppId);
    console.log('[SHARE DEBUG] partnerBpnl:', partnerBpnl);
    if (customPartId) console.log('[SHARE DEBUG] customPartId (not sent):', customPartId);

    const response = await httpClient.post(
      url,
      payload,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    // DEBUG: Log response
    console.log('[SHARE DEBUG] === Share DPP Response ===' );
    console.log('[SHARE DEBUG] Status:', response.status);
    console.log('[SHARE DEBUG] Data:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    // DEBUG: Log error details
    console.error('[SHARE DEBUG] === Share DPP Error ===' );
    console.error('[SHARE DEBUG] Error:', error);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const axiosErr = error as any;
    if (axiosErr?.response) {
      console.error('[SHARE DEBUG] Status:', axiosErr.response.status);
      console.error('[SHARE DEBUG] Response Data:', JSON.stringify(axiosErr.response.data, null, 2));
      console.error('[SHARE DEBUG] Response Headers:', JSON.stringify(axiosErr.response.headers, null, 2));
    }
    if (axiosErr?.config) {
      console.error('[SHARE DEBUG] Request URL:', axiosErr.config.url);
      console.error('[SHARE DEBUG] Request Method:', axiosErr.config.method);
      console.error('[SHARE DEBUG] Request Data:', axiosErr.config.data);
    }
    throw error;
  }
};

/**
 * Fetch submodel data from submodel-dispatcher
 */
export const fetchSubmodelData = async (
  semanticId: string,
  submodelId: string
): Promise<Record<string, unknown>> => {
  try {
    const encodedSemanticId = encodeURIComponent(semanticId);
    const response = await httpClient.get<Record<string, unknown>>(
      `/submodel-dispatcher/${encodedSemanticId}/${submodelId}`
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching submodel data:', error);
    throw error;
  }
};
