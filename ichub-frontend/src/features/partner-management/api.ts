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

import axios from 'axios';
import { getIchubBackendUrl } from '../../services/EnvironmentService';
import { PartnerInstance } from '../../types/partner';
import { ApiPartData } from '../../types/product';

const PARTNER_MANAGEMENT_BASE_PATH = '/partner-management/business-partner';
const PART_MANAGEMENT_BASE_PATH = '/part-management/catalog-part'; // New base path
const backendUrl = getIchubBackendUrl();

export const fetchPartners = async (): Promise<PartnerInstance[]> => {
  const response = await axios.get<PartnerInstance[]>(`${backendUrl}${PARTNER_MANAGEMENT_BASE_PATH}`);
  return response.data;
};

export const createPartner = async (partnerData: { name: string; bpnl: string }): Promise<PartnerInstance> => {
  const response = await axios.post<PartnerInstance>(`${backendUrl}${PARTNER_MANAGEMENT_BASE_PATH}`, partnerData);
  return response.data; 
};

export const createCatalogPart = async (catalogPartData: ApiPartData): Promise<ApiPartData> => {
  const response = await axios.post<ApiPartData>(`${backendUrl}${PART_MANAGEMENT_BASE_PATH}`, catalogPartData);
  return response.data;
};

