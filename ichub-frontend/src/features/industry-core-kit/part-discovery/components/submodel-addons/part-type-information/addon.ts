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

import { VersionedSubmodelAddon } from '../shared/types';
import {
  PartTypeInformation,
  PART_TYPE_INFORMATION_NAMESPACE,
  PART_TYPE_INFORMATION_MODEL_NAME,
  PART_TYPE_INFORMATION_SEMANTIC_IDS,
  isPartTypeInformation,
} from './types';
import { PartTypeInformationViewer } from '.';

export const partTypeInformationAddon: VersionedSubmodelAddon<PartTypeInformation> = {
  id: 'part-type-information',
  name: 'Part Type Information',
  description: 'Specialized visualization for Part Type Information submodels, showing part identity, manufacturer details, and production sites.',
  namespace: PART_TYPE_INFORMATION_NAMESPACE,
  modelName: PART_TYPE_INFORMATION_MODEL_NAME,
  supportedSemanticIds: Object.values(PART_TYPE_INFORMATION_SEMANTIC_IDS),
  priority: 10,
  isValidData: isPartTypeInformation,
  component: PartTypeInformationViewer,
};
