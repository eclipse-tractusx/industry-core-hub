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
 * Type definitions for Serial Part submodel
 * Semantic Model: urn:samm:io.catenax.serial_part:3.0.0#SerialPart
 */

import { createSemanticId } from '../shared/utils';

export const SERIAL_PART_NAMESPACE = 'serial_part';
export const SERIAL_PART_MODEL_NAME = 'SerialPart';

export const SERIAL_PART_SEMANTIC_IDS = {
  V3_0_0: createSemanticId(SERIAL_PART_NAMESPACE, '3.0.0', SERIAL_PART_MODEL_NAME),
} as const;

export interface LocalIdentifier {
  key: string;
  value: string;
}

export interface SerialPartTypeInformation {
  manufacturerPartId: string;
  nameAtManufacturer?: string;
  customerPartId?: string;
  nameAtCustomer?: string;
}

export interface ManufacturingSite {
  catenaXsiteId: string;
  function: string;
}

export interface ManufacturingInformation {
  date?: string;
  country?: string;
  sites?: ManufacturingSite[];
}

/**
 * Serial Part submodel (v3.0.0)
 */
export interface SerialPart {
  catenaXId?: string;
  localIdentifiers?: LocalIdentifier[];
  partTypeInformation?: SerialPartTypeInformation;
  manufacturingInformation?: ManufacturingInformation;
}

/**
 * Type guard: accepts both plain object and array-wrapped responses.
 */
export function isSerialPart(_semanticId: string, data: unknown): data is SerialPart {
  const obj = Array.isArray(data) ? data[0] : data;
  return (
    typeof obj === 'object' &&
    obj !== null &&
    (
      'localIdentifiers' in obj ||
      ('partTypeInformation' in obj && 'catenaXId' in obj) ||
      'manufacturingInformation' in obj
    )
  );
}
