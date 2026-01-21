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

import httpClient from '../../services/HttpClient';
import { getIchubBackendUrl } from '../../services/EnvironmentService';
import { PartnerInstance } from './types/types';

const PARTNER_MANAGEMENT_BASE_PATH = '/partner-management/business-partner';
const backendUrl = getIchubBackendUrl();

export const fetchPartners = async (): Promise<PartnerInstance[]> => {
  try {
    if (!backendUrl) {
      console.warn('Backend URL not configured, returning empty partners list');
      return [];
    }
    
  const response = await httpClient.get<PartnerInstance[]>(`${backendUrl}${PARTNER_MANAGEMENT_BASE_PATH}`);
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error('Failed to fetch partners:', error);
    return []; // Return empty array instead of throwing
  }
};

export const createPartner = async (partnerData: { name: string; bpnl: string }): Promise<PartnerInstance> => {
  const response = await httpClient.post<PartnerInstance>(`${backendUrl}${PARTNER_MANAGEMENT_BASE_PATH}`, partnerData);
  return response.data; 
};


