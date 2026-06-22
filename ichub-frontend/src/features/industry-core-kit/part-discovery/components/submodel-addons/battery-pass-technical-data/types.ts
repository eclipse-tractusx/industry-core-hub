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
 * Type definitions for IDTA BatteryPass Technical Data submodel
 * Semantic Model: urn:samm:io.admin-shell.idta.batterypass.technical_data:1.0.0#TechnicalData
 */

export const BATTERY_PASS_TECHNICAL_DATA_NAMESPACE =
  'io.admin-shell.idta.batterypass.technical_data';
export const BATTERY_PASS_TECHNICAL_DATA_MODEL_NAME = 'TechnicalData';

export const BATTERY_PASS_TECHNICAL_DATA_SEMANTIC_ID =
  `urn:samm:${BATTERY_PASS_TECHNICAL_DATA_NAMESPACE}:1.0.0#${BATTERY_PASS_TECHNICAL_DATA_MODEL_NAME}`;

import type { MultiLangEntry } from '../battery-pass-shared/types';
export type { MultiLangEntry };
export { getMultiLangValue } from '../battery-pass-shared/types';

export type BatteryCategory = 'lmt' | 'ev' | 'industrial' | 'stationary';

export interface GeneralInformation {
  ManufacturerName: string;
  CompanyLogo?: string;
  ManufacturerProductDesignation: MultiLangEntry[];
  ManufacturerArticleNumber: string;
  ManufacturerOrderCode: string;
  ManufacturerIdentifier: string;
  WarrantyPeriod: string;
  BatteryCategory: BatteryCategory;
  BatteryMass: number;
}

export interface PowerCapabilityAt {
  atSoC: number;
  powerCapabilityAt: number;
}

export interface CapacityEnergyVoltage {
  NominalVoltage: number;
  MinVoltage: number;
  MaxVoltage: number;
  RatedCapacity: number;
  CapacityFade?: number;
  CertifiedUsableBatteryEnergy?: number;
}

export interface RoundTripEnergyEfficiency {
  InitialRoundTripEnergyEfficiency: number;
  RoundTripEnergyEfficiencyAt50PercentOfCycleLife: number;
  EnergyRoundTripEfficiencyFade?: number;
  InitialSelfDischargingRate?: number;
}

export interface Resistance {
  InitialInternalResistanceAtBatteryCellLevel: number;
  InitialInternalResistanceAtBatteryPackLevel: number;
  InitialInternalResistanceAtBatteryModuleLevel?: number;
  InternalResistanceIncreaseAtBatteryCellLevel?: number;
  InternalResistanceIncreaseAtBatteryPackLevel: number;
  InternalResistanceIncreaseAtBatteryModuleLevel?: number;
}

export interface PowerCapability {
  MaximumPermittedBatteryPower: number;
  PowerFade: number;
  RatioNominalBatteryPowerAndBatteryEnergy: number;
  OriginalPowerCapability: PowerCapabilityAt[];
}

export interface Temperature {
  TemperatureRangeIdleState_LowerBoundary: number;
  TemperatureRangeIdleState_UpperBoundary: number;
}

export interface Lifetime {
  ExpectedLifetimeInCalendarYears: number;
  ExpectedNumberOfCycles: number;
  CapacityThresholdExhaustion: number;
  CycleLifeReferenceTest: string[];
  CrateOfRelevantCycleLifeTest: number;
}

export interface TechnicalAttributes {
  CapacityEnergyVoltage: CapacityEnergyVoltage;
  RoundTripEnergyEfficiency: RoundTripEnergyEfficiency;
  Resistance: Resistance;
  PowerCapability: PowerCapability;
  Temperature: Temperature;
  Lifetime: Lifetime;
}

export interface TechnicalData {
  GeneralInformation: GeneralInformation;
  TechnicalPropertyAreas: TechnicalAttributes;
}

export function isTechnicalData(
  _semanticId: string,
  data: unknown
): data is TechnicalData {
  const obj = Array.isArray(data) ? data[0] : data;
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'GeneralInformation' in obj &&
    'TechnicalPropertyAreas' in obj
  );
}

