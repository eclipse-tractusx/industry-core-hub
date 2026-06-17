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
  HandoverDocumentation,
  BATTERY_PASS_HANDOVER_DOCUMENTATION_NAMESPACE,
  BATTERY_PASS_HANDOVER_DOCUMENTATION_MODEL_NAME,
  BATTERY_PASS_HANDOVER_DOCUMENTATION_SEMANTIC_ID,
  isHandoverDocumentation,
} from './types';
import { HandoverDocumentationBatteryViewer } from '.';

export const batteryPassHandoverDocumentationAddon: VersionedSubmodelAddon<HandoverDocumentation> = {
  id: 'battery-pass-handover-documentation',
  name: 'Battery Pass Handover Documentation',
  description: 'Specialized visualization for IDTA BatteryPass Handover Documentation submodels including document versions, classifications, and digital files.',
  namespace: BATTERY_PASS_HANDOVER_DOCUMENTATION_NAMESPACE,
  modelName: BATTERY_PASS_HANDOVER_DOCUMENTATION_MODEL_NAME,
  supportedSemanticIds: [BATTERY_PASS_HANDOVER_DOCUMENTATION_SEMANTIC_ID],
  priority: 10,
  isValidData: isHandoverDocumentation,
  component: HandoverDocumentationBatteryViewer,
};
