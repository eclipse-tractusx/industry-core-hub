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

import { VersionedSubmodelAddon } from '../shared/types';
import {
  CarbonFootprintBattery,
  BATTERY_PASS_CARBON_FOOTPRINT_NAMESPACE,
  BATTERY_PASS_CARBON_FOOTPRINT_MODEL_NAME,
  BATTERY_PASS_CARBON_FOOTPRINT_SEMANTIC_ID,
  isCarbonFootprintBattery,
} from './types';
import { CarbonFootprintBatteryViewer } from '.';

export const batteryPassCarbonFootprintAddon: VersionedSubmodelAddon<CarbonFootprintBattery> = {
  id: 'battery-pass-carbon-footprint',
  name: 'Battery Pass Carbon Footprint',
  description: 'Specialized visualization for IDTA BatteryPass Carbon Footprint submodels including CO₂ equivalent values, life cycle phases, and calculation methods.',
  namespace: BATTERY_PASS_CARBON_FOOTPRINT_NAMESPACE,
  modelName: BATTERY_PASS_CARBON_FOOTPRINT_MODEL_NAME,
  supportedSemanticIds: [BATTERY_PASS_CARBON_FOOTPRINT_SEMANTIC_ID],
  priority: 10,
  isValidData: isCarbonFootprintBattery,
  component: CarbonFootprintBatteryViewer,
};
