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

import axios from 'axios';
import { getIchubBackendUrl } from '../../services/EnvironmentService';
import { ApiPartData } from './types/types';
import { CatalogPartTwinCreateType, TwinReadType, CatalogPartTwinDetailsRead } from './types/twin-types';
import { catalogManagementConfig } from './config';

interface SubmodelContent {
  [key: string]: unknown;
}

const backendUrl = getIchubBackendUrl();

export const fetchCatalogParts = async (): Promise<ApiPartData[]> => {
  const response = await axios.get<ApiPartData[]>(`${backendUrl}${catalogManagementConfig.api.endpoints.CATALOG_PARTS}`);
  return response.data;
};

export const fetchCatalogPart = async (
  manufacturerId: string ,
  manufacturerPartId: string
): Promise<ApiPartData> => {
  const response = await axios.get<ApiPartData>(
    `${backendUrl}${catalogManagementConfig.api.endpoints.CATALOG_PARTS}/${manufacturerId}/${manufacturerPartId}`
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

  const response = await axios.post<ApiPartData>(
    `${backendUrl}${catalogManagementConfig.api.endpoints.SHARE_CATALOG_PART}`,
    requestBody
  );
  return response.data;
};

export const registerCatalogPartTwin = async (
  twinData: CatalogPartTwinCreateType
): Promise<TwinReadType> => {
  const response = await axios.post<TwinReadType>(
    `${backendUrl}${catalogManagementConfig.api.endpoints.TWIN_MANAGEMENT}`,
    twinData
  );
  return response.data;
};

export const createCatalogPart = async (catalogPartData: ApiPartData): Promise<ApiPartData> => {
  const response = await axios.post<ApiPartData>(`${backendUrl}${catalogManagementConfig.api.endpoints.CATALOG_PARTS}`, catalogPartData);
  return response.data;
};

export const fetchCatalogPartTwinDetails = async (
  manufacturerId: string,
  manufacturerPartId: string
): Promise<CatalogPartTwinDetailsRead | null> => {
  try {
    
    const response = await axios.get<CatalogPartTwinDetailsRead>(
      `${backendUrl}/twin-management/catalog-part-twin/${manufacturerId}/${manufacturerPartId}`
    );
    
    return response.data;
  } catch (error) {
    console.error('Error fetching catalog part twin details:', error);
    // If the twin doesn't exist, return null instead of throwing an error
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return null;
    }
    throw error;
  }
};

export const fetchSubmodelContent = async (semanticId: string, submodelId: string): Promise<SubmodelContent> => {
  try {
    const encodedSemanticId = encodeURIComponent(semanticId);
    const response = await axios.get(
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