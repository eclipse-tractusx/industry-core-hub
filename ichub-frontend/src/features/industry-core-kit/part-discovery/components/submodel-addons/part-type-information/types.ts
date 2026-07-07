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

/**
 * Type definitions for Part Type Information submodel
 * Semantic Model: urn:samm:io.catenax.part_type_information:1.0.0#PartTypeInformation
 */

import { createSemanticId } from '../shared/utils';

export const PART_TYPE_INFORMATION_NAMESPACE = 'part_type_information';
export const PART_TYPE_INFORMATION_MODEL_NAME = 'PartTypeInformation';

export const PART_TYPE_INFORMATION_SEMANTIC_IDS = {
  V1_0_0: createSemanticId(PART_TYPE_INFORMATION_NAMESPACE, '1.0.0', PART_TYPE_INFORMATION_MODEL_NAME),
} as const;

export interface PartSiteInformation {
  catenaXsiteId: string;
  function: string;
}

export interface PartTypeInformationBlock {
  manufacturerPartId: string;
  nameAtManufacturer?: string;
  customerPartId?: string;
  nameAtCustomer?: string;
}

/**
 * Part Type Information submodel (v1.0.0)
 */
export interface PartTypeInformation {
  catenaXId?: string;
  partTypeInformation: PartTypeInformationBlock;
  partSitesInformationAsPlanned?: PartSiteInformation[];
}

/**
 * Type guard: accepts both plain object and array-wrapped responses.
 */
export function isPartTypeInformation(_semanticId: string, data: unknown): data is PartTypeInformation {
  const obj = Array.isArray(data) ? data[0] : data;
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'partTypeInformation' in obj &&
    typeof (obj as Record<string, unknown>).partTypeInformation === 'object'
  );
}
