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
      dppId: string;
      name: string;
      version: string;
      semanticId: string;
      status: string;
      twinId?: string;
      submodelId?: string;
      partType?: string;
      manufacturerPartId?: string;
      partInstanceId?: string;
      createdAt: string;
      shareCount?: number;
      passportId?: string;
      issueDate?: string;
      expirationDate?: string;
    }[]>(`${API_BASE_URL}/passports`);
    
    const data = response.data;
    
    // Transform backend response to frontend format
    return data.map((dpp: {
      dppId: string;
      name: string;
      version: string;
      semanticId: string;
      status: string;
      twinId?: string;
      submodelId?: string;
      partType?: string;
      manufacturerPartId?: string;
      partInstanceId?: string;
      createdAt: string;
      shareCount?: number;
      passportId?: string;
      issueDate?: string;
      expirationDate?: string;
    }) => ({
      id: dpp.dppId,
      name: dpp.name,
      version: dpp.version,
      semanticId: dpp.semanticId,
      status: dpp.status.toLowerCase() as DPPListItem['status'],
      twinId: dpp.twinId,
      submodelId: dpp.submodelId,
      partType: dpp.partType as DPPListItem['partType'],
      manufacturerPartId: dpp.manufacturerPartId,
      partInstanceId: dpp.partInstanceId,
      createdAt: dpp.createdAt,
      shareCount: dpp.shareCount || 0,
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
      ...(customPartId && { customPartId: customPartId })
    };

    console.log('Sharing DPP with payload:', JSON.stringify(payload));

    await httpClient.post(
      `${API_BASE_URL}/twin-management/serialized-part-twin/share?include_data_exchange_agreements=true`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (error) {
    console.error('Error sharing DPP:', error);
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
