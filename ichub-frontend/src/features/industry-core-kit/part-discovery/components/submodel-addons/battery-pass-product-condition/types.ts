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
 * Type definitions for IDTA BatteryPass Product Condition submodel
 * Semantic Model: urn:samm:io.admin-shell.idta.batterypass.product_condition:1.0.0#ProductCondition
 */

export const BATTERY_PASS_PRODUCT_CONDITION_NAMESPACE =
  'io.admin-shell.idta.batterypass.product_condition';
export const BATTERY_PASS_PRODUCT_CONDITION_MODEL_NAME = 'ProductCondition';

export const BATTERY_PASS_PRODUCT_CONDITION_SEMANTIC_ID =
  `urn:samm:${BATTERY_PASS_PRODUCT_CONDITION_NAMESPACE}:1.0.0#${BATTERY_PASS_PRODUCT_CONDITION_MODEL_NAME}`;

export interface NegativeEvent {
  NegativeEventValue: string;
  LastUpdate: string;
}

export interface TemperatureInformation {
  TimeExtremeHighTemp?: number;
  TimeExtremeLowTemp?: number;
  TimeExtremeHighTempCharging?: number;
  TimeExtremeLowTempCharging?: number;
  LastUpdate: string;
}

export interface ProductCondition {
  EnergyThroughput?: { EnergyThroughputValue: number; LastUpdate: string };
  CapacityThroughput?: { CapacityThroughputValue: number; LastUpdate: string };
  NumberOfFullCycles: { NumberOfFullCyclesValue: number; LastUpdate: string };
  StateOfCertifiedEnergy?: { StateOfCertifiedEnergyValue: number; LastUpdate: string };
  RemainingEnergy?: { RemainingEnergyValue: number; LastUpdate: string };
  RemainingCapacity?: { RemainingCapacityValue: number; LastUpdate: string };
  NegativeEvents?: NegativeEvent[];
  InformationOnAccidents: string[];
  TemperatureInformation: TemperatureInformation;
  RemainingPowerCapability?: { RemainingPowerCapabilityValue: Record<string, unknown>; LastUpdate: string };
  EvolutionOfSelfDischarge?: { EvolutionOfSelfDischargeValue: number; LastUpdate: string };
  CurrentSelfDischargingRate?: { CurrentSelfDischargingRateValue: number; LastUpdate: string };
  RemainingRoundTripEnergyEfficiency?: { RemainingRoundTripEnergyEfficiencyValue: number; LastUpdate: string };
  StateOfCharge: { StateOfChargeValue: number; LastUpdate: string };
}

export function isProductCondition(
  _semanticId: string,
  data: unknown
): data is ProductCondition {
  const obj = Array.isArray(data) ? data[0] : data;
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'NumberOfFullCycles' in obj &&
    'StateOfCharge' in obj &&
    'TemperatureInformation' in obj
  );
}
