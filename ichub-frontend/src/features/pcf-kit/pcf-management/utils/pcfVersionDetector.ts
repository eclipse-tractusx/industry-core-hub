/********************************************************************************
 * Eclipse Tractus-X - Industry Core Hub Frontend
 *
 * Copyright (c) 2026 Contributors to the Eclipse Foundation
 * Copyright (c) 2026 LKS Next
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
 * pcfVersionDetector.ts
 *
 * Detects the PCF schema version from a raw PCF data object returned by the
 * backend. Detection is based on the **shape** of the object, not on a
 * version string field, because:
 *
 *  - PCF v7.0.0 — FLAT structure: all fields at root level
 *    (id, specVersion, companyName, companyIds, pcf: { … }, …)
 *
 *  - PCF v9.0.0 — NESTED/HIERARCHICAL structure: fields grouped in
 *    typed collection arrays
 *    (scopeOfPcfForm[], companyAndProductInformation[], …)
 */

export type PcfVersion = '7.0.0' | '9.0.0';

const PCF_DEFAULT_VERSION: PcfVersion = '9.0.0';

/**
 * Detects the PCF version from a raw data object.
 * Returns the version string if detected, or the default ('9.0.0') if unknown.
 */
export function detectPcfVersion(data: unknown): PcfVersion {
  if (!data || typeof data !== 'object') return PCF_DEFAULT_VERSION;

  const d = data as Record<string, unknown>;

  // v9 signature: has top-level collection arrays specific to the nested model
  if (Array.isArray(d['scopeOfPcfForm']) || Array.isArray(d['companyAndProductInformation'])) {
    return '9.0.0';
  }

  // v7 signature: flat object with root-level 'pcf' object (CarbonFootprint entity)
  // and mandatory root fields like 'companyName', 'specVersion', 'extWBCSD_pfStatus'
  if (
    typeof d['companyName'] === 'string' ||
    typeof d['extWBCSD_pfStatus'] === 'string' ||
    (d['pcf'] !== null && typeof d['pcf'] === 'object' && !Array.isArray(d['pcf']))
  ) {
    return '7.0.0';
  }

  return PCF_DEFAULT_VERSION;
}
