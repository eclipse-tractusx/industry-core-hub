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
 * Type definitions for IDTA BatteryPass Material Composition submodel
 * Semantic Model: urn:samm:io.admin-shell.idta.batterypass.material_composition:1.0.0#MaterialComposition
 */

export const BATTERY_PASS_MATERIAL_COMPOSITION_NAMESPACE =
  'io.admin-shell.idta.batterypass.material_composition';
export const BATTERY_PASS_MATERIAL_COMPOSITION_MODEL_NAME = 'MaterialComposition';

export const BATTERY_PASS_MATERIAL_COMPOSITION_SEMANTIC_ID =
  `urn:samm:${BATTERY_PASS_MATERIAL_COMPOSITION_NAMESPACE}:1.0.0#${BATTERY_PASS_MATERIAL_COMPOSITION_MODEL_NAME}`;

export type HazardousSubstanceClass =
  | 'AcuteToxicity'
  | 'SkinCorrosionOrIrritation'
  | 'EyeDamageOrIrritation';

export interface BatteryChemistry {
  ShortName: string;
  ClearName: string;
}

export interface BatteryLocation {
  ComponentName?: string;
  ComponentId?: string;
}

export interface BatteryMaterial {
  BatteryMaterialLocation: BatteryLocation;
  BatteryMaterialIdentifier: string;
  BatteryMaterialName: string;
  BatteryMaterialMass: number;
  IsCriticalRawMaterial: boolean;
}

export interface HazardousSubstance {
  HazardousSubstanceClass: HazardousSubstanceClass;
  HazardousSubstanceName: string;
  HazardousSubstanceConcentration: number;
  HazardousSubstanceImpact: string[];
  HazardousSubstanceLocation: BatteryLocation;
  HazardousSubstanceIdentifier: string;
}

export interface MaterialComposition {
  BatteryChemistry: BatteryChemistry;
  BatteryMaterials: BatteryMaterial[];
  HazardousSubstances: HazardousSubstance[];
}

export function isMaterialComposition(
  _semanticId: string,
  data: unknown
): data is MaterialComposition {
  const obj = Array.isArray(data) ? data[0] : data;
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'BatteryChemistry' in obj &&
    'BatteryMaterials' in obj &&
    'HazardousSubstances' in obj
  );
}
