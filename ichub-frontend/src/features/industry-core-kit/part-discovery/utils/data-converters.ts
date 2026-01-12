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

import { AASData, getAASDataSummary } from './utils';
import { PartCardData, SerializedPartData } from '@/features/industry-core-kit/part-discovery/types/types';

/**
 * Converts AAS data to Part Card format for catalog view
 */
export const convertToPartCards = (
  shells: AASData[], 
  shellToDtrMap?: Map<string, number>
): PartCardData[] => {
  return shells.map(shell => {
    const summary = getAASDataSummary(shell);
    const dtrIndex = shellToDtrMap?.get(shell.id);
    return {
      id: shell.id,
      manufacturerId: summary.manufacturerId || 'Unknown',
      manufacturerPartId: summary.manufacturerPartId || 'Unknown',
      customerPartId: summary.customerPartId || undefined,
      name: `${summary.manufacturerPartId}`,
      category: summary.customerPartId || undefined,
      digitalTwinType: summary.digitalTwinType || 'Unknown',
      globalAssetId: shell.globalAssetId,
      submodelCount: summary.submodelCount,
      dtrIndex,
      idShort: shell.idShort, // Include idShort from AAS data
      rawTwinData: shell
    };
  });
};

/**
 * Converts AAS data to Serialized Parts format for instance view
 */
export const convertToSerializedParts = (
  shells: AASData[], 
  shellToDtrMap?: Map<string, number>
): SerializedPartData[] => {
  return shells.map(shell => {
    const summary = getAASDataSummary(shell);
    const dtrIndex = shellToDtrMap?.get(shell.id);
    return {
      id: shell.id,
      globalAssetId: shell.globalAssetId,
      aasId: shell.id, // AAS Shell ID
      manufacturerId: summary.manufacturerId || 'Unknown',
      manufacturerPartId: summary.manufacturerPartId || 'Unknown',
      customerPartId: summary.customerPartId || undefined,
      partInstanceId: summary.partInstanceId || undefined,
      digitalTwinType: summary.digitalTwinType || 'Unknown',
      submodelCount: summary.submodelCount,
      dtrIndex,
      idShort: shell.idShort, // Include idShort from AAS data
      rawTwinData: shell
    };
  });
};
