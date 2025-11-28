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

import httpClient from '../../services/HttpClient';
import axios from 'axios'; // Only used for isAxiosError type guard
import { getIchubBackendUrl } from '../../services/EnvironmentService';
import { ApiPartData } from './types/types';
import { CatalogPartTwinCreateType, TwinReadType, CatalogPartTwinDetailsRead } from './types/twin-types';
import { catalogManagementConfig } from './config';

interface SubmodelContent {
  [key: string]: unknown;
}

const backendUrl = getIchubBackendUrl();

export const fetchCatalogParts = async (): Promise<ApiPartData[]> => {
  const response = await httpClient.get<ApiPartData[]>(`${backendUrl}${catalogManagementConfig.api.endpoints.CATALOG_PARTS}`);
  return response.data;
};

export const fetchCatalogPart = async (
  manufacturerId: string ,
  manufacturerPartId: string
): Promise<ApiPartData> => {
  const response = await httpClient.get<ApiPartData>(
    `${backendUrl}${catalogManagementConfig.api.endpoints.CATALOG_PARTS}/${manufacturerId}/${encodeURIComponent(manufacturerPartId)}`
  );
  return response.data;
};

export const shareCatalogPart = async (
  manufacturerId: string,
  manufacturerPartId: string,
  businessPartnerNumber: string,
  customerPartId?: string
): Promise<ApiPartData> => {
  const requestBody: {
    manufacturerId: string;
    manufacturerPartId: string;
    businessPartnerNumber: string;
    customerPartId?: string;
  } = {
    manufacturerId,
    manufacturerPartId,
    businessPartnerNumber,
    customerPartId: customerPartId?.trim() || undefined
  };

  const response = await httpClient.post<ApiPartData>(
    `${backendUrl}${catalogManagementConfig.api.endpoints.SHARE_CATALOG_PART}`,
    requestBody
  );
  return response.data;
};

export const registerCatalogPartTwin = async (
  twinData: CatalogPartTwinCreateType
): Promise<TwinReadType> => {
  const response = await httpClient.post<TwinReadType>(
    `${backendUrl}${catalogManagementConfig.api.endpoints.TWIN_MANAGEMENT}`,
    twinData
  );
  return response.data;
};

export const createCatalogPart = async (catalogPartData: ApiPartData): Promise<ApiPartData> => {
  const response = await httpClient.post<ApiPartData>(`${backendUrl}${catalogManagementConfig.api.endpoints.CATALOG_PARTS}`, catalogPartData);
  return response.data;
};

export const fetchCatalogPartTwinDetails = async (
  manufacturerId: string,
  manufacturerPartId: string
): Promise<CatalogPartTwinDetailsRead | null> => {
  try {
    
    const response = await httpClient.get<CatalogPartTwinDetailsRead>(
      `${backendUrl}/twin-management/catalog-part-twin/${manufacturerId}/${encodeURIComponent(manufacturerPartId)}`
    );
    
    return response.data;
  } catch (error) {
    console.error('Error fetching catalog part twin details:', error);
    // If the twin doesn't exist, return null instead of throwing an error
    if (axios.isAxiosError?.(error) && error.response?.status === 404) {
      return null;
    }
    throw error;
  }
};

export const fetchSubmodelContent = async (semanticId: string, submodelId: string): Promise<SubmodelContent> => {
  try {
    const encodedSemanticId = encodeURIComponent(semanticId);
    const response = await httpClient.get(
      `${backendUrl}/submodel-dispatcher/${encodedSemanticId}/${submodelId}/submodel`
    );
    if (!response.data) {
      throw new Error(`Failed to fetch submodel content! {${semanticId}, ${submodelId}}`);
    }
    return response.data;
  } catch (error) {
    console.error('Error fetching submodel content:', error);
    throw error;
  }
};

/**
 * Create a new submodel aspect for a digital twin
 */
export const createTwinAspect = async (
  globalId: string,
  semanticId: string,
  payload: any,
  submodelId?: string
): Promise<{ success: boolean; submodelId?: string; message?: string }> => {
  try {
    const requestBody: {
      globalId: string;
      semanticId: string;
      payload: any;
      submodelId?: string;
    } = {
      globalId,
      semanticId,
      payload
    };

    // Only include submodelId if it's provided
    if (submodelId) {
      requestBody.submodelId = submodelId;
    }

    const response = await httpClient.post(
      `${backendUrl}/twin-management/twin-aspect`,
      requestBody
    );
    
    return {
      success: true,
      submodelId: response.data.submodelId,
      message: 'Twin aspect created successfully'
    };
  } catch (error) {
    console.error('Error creating twin aspect:', error);
    
    if (axios.isAxiosError(error)) {
      return {
        success: false,
        message: error.response?.data?.message || error.response?.data?.detail || 'Failed to create twin aspect'
      };
    }
    
    return {
      success: false,
      message: 'An unexpected error occurred while creating the twin aspect'
    };
  }
};

/**
 * Create a new submodel for a catalog part (deprecated - use createTwinAspect)
 */
export const createCatalogPartSubmodel = async (
  manufacturerId: string,
  manufacturerPartId: string,
  submodelData: {
    semanticId: string;
    schemaKey: string;
    data: any;
  }
): Promise<{ success: boolean; submodelId?: string; message?: string }> => {
  try {
    // TODO: Replace with actual API endpoint when backend is ready
    // For now, this is a placeholder that simulates the API call
    console.log('Creating submodel with data:', {
      manufacturerId,
      manufacturerPartId,
      submodelData
    });

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Simulate success response
    const mockSubmodelId = `submodel-${Date.now()}`;
    
    return {
      success: true,
      submodelId: mockSubmodelId,
      message: 'Submodel created successfully'
    };

    /* 
    // This is what the actual API call would look like:
    const response = await axios.post(
      `${backendUrl}${catalogManagementConfig.api.endpoints.CATALOG_PARTS}/${manufacturerId}/${manufacturerPartId}/submodels`,
      {
        semanticId: submodelData.semanticId,
        schemaVersion: submodelData.schemaKey,
        content: submodelData.data
      }
    );
    
    return {
      success: true,
      submodelId: response.data.submodelId,
      message: response.data.message
    };
    */
  } catch (error) {
    console.error('Error creating submodel:', error);
    
    if (axios.isAxiosError(error)) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to create submodel'
      };
    }
    
    return {
      success: false,
      message: 'An unexpected error occurred while creating the submodel'
    };
  }
};
