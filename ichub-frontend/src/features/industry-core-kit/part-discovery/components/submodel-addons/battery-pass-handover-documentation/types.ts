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
 * Type definitions for IDTA BatteryPass Handover Documentation submodel
 * Semantic Model: urn:samm:io.admin-shell.idta.batterypass.handover_documentation:1.0.0#HandoverDocumentation
 */

export const BATTERY_PASS_HANDOVER_DOCUMENTATION_NAMESPACE =
  'io.admin-shell.idta.batterypass.handover_documentation';
export const BATTERY_PASS_HANDOVER_DOCUMENTATION_MODEL_NAME = 'HandoverDocumentation';

export const BATTERY_PASS_HANDOVER_DOCUMENTATION_SEMANTIC_ID =
  `urn:samm:${BATTERY_PASS_HANDOVER_DOCUMENTATION_NAMESPACE}:1.0.0#${BATTERY_PASS_HANDOVER_DOCUMENTATION_MODEL_NAME}`;

import type { MultiLangEntry } from '../battery-pass-shared/types';
export type { MultiLangEntry };
export { getMultiLangValue } from '../battery-pass-shared/types';

export interface DocumentId {
  DocumentDomainId: string;
  DocumentIdentifier: string;
  DocumentIsPrimary?: boolean;
}

export interface DocumentClassification {
  ClassId: string;
  ClassName: MultiLangEntry[];
  ClassificationSystem: string;
}

export interface DigitalFile {
  value: string;
  contentType: string;
}

export interface DocumentVersion {
  Language: string[];
  Version?: string;
  Title: MultiLangEntry[];
  Subtitle?: MultiLangEntry[];
  Description?: MultiLangEntry[];
  DigitalFiles: DigitalFile[];
}

export interface HandoverDocument {
  DocumentIds: DocumentId[];
  DocumentClassifications: DocumentClassification[];
  DocumentVersions: DocumentVersion[];
}

export interface HandoverDocumentation {
  Documents: HandoverDocument[];
}

export function isHandoverDocumentation(
  _semanticId: string,
  data: unknown
): data is HandoverDocumentation {
  const obj = Array.isArray(data) ? data[0] : data;
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'Documents' in obj &&
    Array.isArray((obj as HandoverDocumentation).Documents)
  );
}

