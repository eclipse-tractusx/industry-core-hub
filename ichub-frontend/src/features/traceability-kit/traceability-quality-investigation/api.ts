/********************************************************************************
 * Eclipse Tractus-X - Industry Core Hub Frontend
 *
 * Copyright (c) 2026 Contributors to the Eclipse Foundation
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
import { getIchubBackendUrl } from '@/services/EnvironmentService';
import { BOM_AS_BUILT_SEMANTIC_ID } from './utils/bomAsBuilt';

export interface BomAsBuiltSubmodelContent {
  [key: string]: unknown;
}

const backendUrl = getIchubBackendUrl();

/**
 * Fetch only BoMAsBuilt submodel content for a known submodel ID.
 *
 * Required endpoint pattern for this feature:
 * /v1/v1/submodel-dispatcher/{semantic_id}/{submodel_id}/submodel
 * (first /v1 usually comes from backend base URL, second from dispatcher path).
 */
export const fetchBomAsBuiltSubmodelContent = async (submodelId: string): Promise<BomAsBuiltSubmodelContent> => {
  const encodedSemanticId = encodeURIComponent(BOM_AS_BUILT_SEMANTIC_ID);
  const encodedSubmodelId = encodeURIComponent(submodelId);

  const response = await httpClient.get<BomAsBuiltSubmodelContent>(
    `${backendUrl}/v1/submodel-dispatcher/${encodedSemanticId}/${encodedSubmodelId}/submodel`
  );

  if (!response.data) {
    throw new Error(`Failed to fetch BoMAsBuilt submodel content for submodel ${submodelId}.`);
  }

  return response.data;
};
