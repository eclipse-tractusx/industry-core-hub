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
  BatteryPassDigitalNameplate,
  BATTERY_PASS_DIGITAL_NAMEPLATE_NAMESPACE,
  BATTERY_PASS_DIGITAL_NAMEPLATE_MODEL_NAME,
  BATTERY_PASS_DIGITAL_NAMEPLATE_SEMANTIC_ID,
  isBatteryPassDigitalNameplate,
} from './types';
import { BatteryPassDigitalNameplateViewer } from '.';

export const batteryPassDigitalNameplateAddon: VersionedSubmodelAddon<BatteryPassDigitalNameplate> = {
  id: 'battery-pass-digital-nameplate',
  name: 'Battery Pass Digital Nameplate',
  description: 'Specialized visualization for IDTA BatteryPass Digital Nameplate submodels including product identification, lifecycle status, manufacturer details, and compliance information.',
  namespace: BATTERY_PASS_DIGITAL_NAMEPLATE_NAMESPACE,
  modelName: BATTERY_PASS_DIGITAL_NAMEPLATE_MODEL_NAME,
  supportedSemanticIds: [BATTERY_PASS_DIGITAL_NAMEPLATE_SEMANTIC_ID],
  priority: 10,
  isValidData: isBatteryPassDigitalNameplate,
  component: BatteryPassDigitalNameplateViewer,
};
