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
import { ApiPartData } from '../../types/product';
import { CatalogPartTwinCreateType, TwinReadType } from '../../types/twin';

const CATALOG_PART_MANAGEMENT_BASE_PATH = '/part-management/catalog-part';
const SHARE_CATALOG_PART_BASE_PATH = '/share/catalog-part';
const TWIN_MANAGEMENT_BASE_PATH = '/twin-management/catalog-part-twin';
const backendUrl = getIchubBackendUrl();

export const fetchCatalogParts = async (): Promise<ApiPartData[]> => {
  const response = await axios.get<ApiPartData[]>(`${backendUrl}${CATALOG_PART_MANAGEMENT_BASE_PATH}`);
  return response.data;
};

export const fetchCatalogPart = async (
  manufacturerId: string ,
  manufacturerPartId: string
): Promise<ApiPartData> => {
  const response = await axios.get<ApiPartData>(
    `${backendUrl}${CATALOG_PART_MANAGEMENT_BASE_PATH}/${manufacturerId}/${manufacturerPartId}`
  );
  return response.data;
};

export const shareCatalogPart = async (
  manufacturerId: string,
  manufacturerPartId: string,
  businessPartnerNumber: string
): Promise<ApiPartData> => {
  const response = await axios.post<ApiPartData>(
    `${backendUrl}${SHARE_CATALOG_PART_BASE_PATH}`,
    {
      manufacturerId,
      manufacturerPartId,
      businessPartnerNumber,
    }
  );
  return response.data;
};

export const registerCatalogPartTwin = async (
  twinData: CatalogPartTwinCreateType
): Promise<TwinReadType> => {
  const response = await axios.post<TwinReadType>(
    `${backendUrl}${TWIN_MANAGEMENT_BASE_PATH}`,
    twinData
  );
  return response.data;
};
