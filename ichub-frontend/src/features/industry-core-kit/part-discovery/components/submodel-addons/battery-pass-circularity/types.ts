/********************************************************************************
 * Eclipse Tractus-X - Industry Core Hub Frontend
 *
 * Copyright (c) 2026 Capgemini Deutschland GmbH
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

/**
 * Type definitions for IDTA BatteryPass Circularity submodel
 * Semantic Model: urn:samm:io.admin-shell.idta.batterypass.circularity:1.0.0#Circularity
 */

export const BATTERY_PASS_CIRCULARITY_NAMESPACE =
  'io.admin-shell.idta.batterypass.circularity';
export const BATTERY_PASS_CIRCULARITY_MODEL_NAME = 'Circularity';

export const BATTERY_PASS_CIRCULARITY_SEMANTIC_ID =
  `urn:samm:${BATTERY_PASS_CIRCULARITY_NAMESPACE}:1.0.0#${BATTERY_PASS_CIRCULARITY_MODEL_NAME}`;

import type { MultiLangEntry } from '../battery-pass-shared/types';
export type { MultiLangEntry };
export { getMultiLangValue } from '../battery-pass-shared/types';

export interface PostalAddress {
  NationalCode: MultiLangEntry[];
  PostalCode: MultiLangEntry[];
  Street: MultiLangEntry[];
}

export interface EmailEntity {
  EmailAddress: string;
  TypeOfEmailAddress?: string;
}

export interface SparePartComponent {
  PartName: string;
  PartNumber: string;
}

export interface SparePartSupplier {
  NameOfSupplier: MultiLangEntry[];
  AddressOfSupplier: PostalAddress;
  EmailAddressOfSupplier: EmailEntity;
  SupplierWebAddress: string;
  Components: SparePartComponent[];
}

export interface RecycledContent {
  PreConsumerShare: number;
  RecycledMaterial: string;
  PostConsumerShare: number;
}

export interface SafetyMeasures {
  SafetyInstructions: string[];
  ExtinguishingAgents: string[];
}

export interface EndOfLifeInformation {
  WastePrevention: string[];
  SeparateCollection: string[];
  InformationOnCollection: string[];
}

export interface Circularity {
  DismantlingAndRemovalInformation: string[];
  SparePartSources: SparePartSupplier[];
  RecycledContentInformation: RecycledContent[];
  SafetyMeasures: SafetyMeasures;
  EndOfLifeInformation: EndOfLifeInformation;
  RenewableContent: number;
}

export function isCircularity(
  _semanticId: string,
  data: unknown
): data is Circularity {
  const obj = Array.isArray(data) ? data[0] : data;
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'DismantlingAndRemovalInformation' in obj &&
    'SafetyMeasures' in obj &&
    'EndOfLifeInformation' in obj
  );
}

