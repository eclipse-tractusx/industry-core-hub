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

/**
 * Type definitions for US Tariff Information submodel
 * Semantic Model: urn:samm:io.catenax.us_tariff_information:1.0.0#UsTariffInformation
 */

import { isSemanticIdForModel, createSemanticId } from '../shared/utils';

// Constants for US Tariff Information semantic model
export const US_TARIFF_INFORMATION_NAMESPACE = 'us_tariff_information';
export const US_TARIFF_INFORMATION_MODEL_NAME = 'UsTariffInformation';

/**
 * Supported semantic IDs for US Tariff Information submodel
 */
export const US_TARIFF_INFORMATION_SEMANTIC_IDS = {
  V1_0_0: createSemanticId(US_TARIFF_INFORMATION_NAMESPACE, '1.0.0', US_TARIFF_INFORMATION_MODEL_NAME),
  // Future versions will be added here as they become available:
  // V1_1_0: createSemanticId(US_TARIFF_INFORMATION_NAMESPACE, '1.1.0', US_TARIFF_INFORMATION_MODEL_NAME),
  // V2_0_0: createSemanticId(US_TARIFF_INFORMATION_NAMESPACE, '2.0.0', US_TARIFF_INFORMATION_MODEL_NAME),
} as const;

export interface Weight {
  value: number;
  unit: string;
}

export interface Currency {
  value: number;
  currency: string;
}

export interface PartUsage {
  vehicleSystem: string;
  vehicleSubassembly: string;
  oemPartRef: string[];
}

export interface TariffInfo {
  htsCode: string;
  htsCodingSystem: string;
  htsDescription: string;
  countryOfImport: string;
  declaredCustomsValue: Currency;
  incoterms: string;
  countryOfExport: string;
  dutyRateNote?: string;
}

export interface MaterialClassification {
  classificationType: string;
  classificationId: string;
  materialName: string;
}

export interface Origin {
  originCountry: string;
  valuePercentage: number;
  originWeight: Weight;
}

export interface Processing {
  processingCountry: string;
  processingId: number;
  processingType: string;
  successor?: Array<{ successorId: number }>;
  certificateId?: string;
}

export interface SurfaceTreatment {
  type: string;
  standard: string;
  hexavalentChromiumFree: boolean;
}

export interface Material {
  material: MaterialClassification;
  referenceNumber: string;
  origin: Origin[];
  processing: Processing[];
  surfaceTreatment?: SurfaceTreatment[];
  currency: string;
  value: number;
}

export interface Compliance {
  rohs: {
    compliant: boolean;
    exemptions: string[];
  };
  reach: {
    svhcContentWppm: number;
  };
  isoCertificates: string[];
}

export interface SupplyChain {
  manufacturer: string;
  finalAssembly: string;
  batchNumber: string;
  traceability: {
    lotCodeMarking: string;
    dateCodeFormat: string;
  };
}

export interface TotalsCheck {
  sumOfMaterialWeights_g: number;
  sumOfOriginValuePercentages: number;
}

// Version 1.0.0 types for UsTariffInformation
export interface UsTariffInformationV1_0_0 {
  partId: string;
  partName: string;
  partDescription: string;
  partWeight: {
    value: number;
    unit: string;
  };
  partUsage: {
    vehicleSystem: string;
    vehicleSubassembly: string;
    oemPartRef: string[];
  };
  tariff: {
    htsCode: string;
    htsCodingSystem: string;
    htsDescription: string;
    countryOfImport: string;
    declaredCustomsValue: {
      value: number;
      currency: string;
    };
    incoterms: string;
    countryOfExport: string;
    dutyRateNote: string;
  };
  materialList: Array<{
    material: {
      classificationType: string;
      classificationId: string;
      materialName: string;
    };
    referenceNumber: string;
    origin: Array<{
      originCountry: string;
      valuePercentage: number;
      originWeight: {
        value: number;
        unit: string;
      };
    }>;
    processing: Array<{
      processingCountry: string;
      processingId: number;
      processingType: string;
      successor?: Array<{
        successorId: number;
      }>;
      certificateId?: string;
    }>;
    surfaceTreatment?: Array<{
      type: string;
      standard: string;
      hexavalentChromiumFree: boolean;
    }>;
    currency: string;
    value: number;
  }>;
  compliance: {
    rohs: {
      compliant: boolean;
      exemptions: string[];
    };
    reach: {
      svhcContentWppm: number;
    };
    isoCertificates: string[];
  };
  supplyChain: {
    manufacturer: string;
    finalAssembly: string;
    batchNumber: string;
    traceability: {
      lotCodeMarking: string;
      dateCodeFormat: string;
    };
  };
  totalsCheck: {
    sumOfMaterialWeights_g: number;
    sumOfOriginValuePercentages: number;
  };
  notes: string[];
}

// Union type for all supported versions (currently only 1.0.0)
export type UsTariffInformation = UsTariffInformationV1_0_0;

// When new versions are released, add them here:
// export type UsTariffInformation = 
//   | UsTariffInformationV1_0_0 
//   | UsTariffInformationV1_1_0 
//   | UsTariffInformationV2_0_0;

/**
 * Type guards for US Tariff Information submodel versions
 */

/**
 * Type guard for US Tariff Information v1.0.0
 * 
 * @param semanticId - The semantic ID to validate
 * @param data - The data to validate
 * @returns True if data matches UsTariffInformationV1_0_0 structure
 */
export function isUsTariffInformationV1_0_0(semanticId: string, data: unknown): data is UsTariffInformationV1_0_0 {
  return (
    semanticId === US_TARIFF_INFORMATION_SEMANTIC_IDS.V1_0_0 &&
    typeof data === 'object' &&
    data !== null &&
    'partId' in data &&
    typeof (data as Record<string, unknown>).partId === 'string' &&
    'partName' in data &&
    typeof (data as Record<string, unknown>).partName === 'string' &&
    'partDescription' in data &&
    typeof (data as Record<string, unknown>).partDescription === 'string' &&
    'partWeight' in data &&
    typeof (data as Record<string, unknown>).partWeight === 'object' &&
    'materialList' in data &&
    Array.isArray((data as Record<string, unknown>).materialList) &&
    'tariff' in data &&
    typeof (data as Record<string, unknown>).tariff === 'object'
  );
}

/**
 * Generic type guard for any supported US Tariff Information version
 * 
 * @param semanticId - The semantic ID to validate
 * @param data - The data to validate
 * @returns True if data matches any supported UsTariffInformation version
 */
export function isUsTariffInformation(semanticId: string, data: unknown): data is UsTariffInformation {
  return isUsTariffInformationV1_0_0(semanticId, data);
  // When new versions are added, extend this logic:
  // return isUsTariffInformationV1_0_0(semanticId, data) || 
  //        isUsTariffInformationV1_1_0(semanticId, data) || 
  //        isUsTariffInformationV2_0_0(semanticId, data);
}

/**
 * Checks if a semantic ID is for US Tariff Information (any version)
 * 
 * @param semanticId - The semantic ID to check
 * @returns True if the semantic ID is for US Tariff Information
 */
export function isUsTariffInformationSemanticId(semanticId: string): boolean {
  return isSemanticIdForModel(semanticId, US_TARIFF_INFORMATION_NAMESPACE, US_TARIFF_INFORMATION_MODEL_NAME);
}
