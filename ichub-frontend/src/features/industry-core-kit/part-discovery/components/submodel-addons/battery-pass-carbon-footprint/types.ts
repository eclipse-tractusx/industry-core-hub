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
 * Type definitions for IDTA BatteryPass Carbon Footprint submodel
 * Semantic Model: urn:samm:io.admin-shell.idta.batterypass.carbon_footprint:1.0.0#CarbonFootprintBattery
 */

export const BATTERY_PASS_CARBON_FOOTPRINT_NAMESPACE =
  'io.admin-shell.idta.batterypass.carbon_footprint';
export const BATTERY_PASS_CARBON_FOOTPRINT_MODEL_NAME = 'CarbonFootprintBattery';

export const BATTERY_PASS_CARBON_FOOTPRINT_SEMANTIC_ID =
  `urn:samm:${BATTERY_PASS_CARBON_FOOTPRINT_NAMESPACE}:1.0.0#${BATTERY_PASS_CARBON_FOOTPRINT_MODEL_NAME}`;

export type ReferenceImpactUnit = 'g' | 'kg' | 't' | 'ml' | 'l' | 'cbm' | 'qm' | 'piece' | 'kwH';

export interface ProductCarbonFootprint {
  PcfCalculationMethods: string[];
  PcfCo2eq: number;
  ReferenceImpactUnitForCalculation: ReferenceImpactUnit;
  QuantityOfMeasureForCalculation: number;
  LifeCyclePhases: string[];
  PerformanceClass: string;
  WebLinkToPublicCarbonFootprintStudy: string[];
}

export interface CarbonFootprintBattery {
  ProductCarbonFootprints: ProductCarbonFootprint[];
}

export function isCarbonFootprintBattery(
  _semanticId: string,
  data: unknown
): data is CarbonFootprintBattery {
  const obj = Array.isArray(data) ? data[0] : data;
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'ProductCarbonFootprints' in obj &&
    Array.isArray((obj as CarbonFootprintBattery).ProductCarbonFootprints)
  );
}
