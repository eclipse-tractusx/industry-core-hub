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
 * TypeScript interfaces modelling the Catena-X PCF v9.0.0 nested JSON structure
 * as returned by the backend GET /provider/pcfs/{manufacturerPartId}.
 *
 * The hierarchy mirrors the actual sample data structure (verified against
 * ichub-backend/data/submodels/.../839f63bb-...json).
 */

// ---------------------------------------------------------------------------
// Leaf-level interfaces (most deeply nested)
// ---------------------------------------------------------------------------

export interface ScopeOfPcfFormEntity {
  specVersion: string;
  partialFullPcf: 'Cradle-to-gate' | 'Cradle-to-grave';
}

export interface CompanyInformationEntity {
  companyName: string;
  companyIds: string[];
}

export interface ProductInformationEntity {
  productNameCompany: string;
  productIds: string[];
  declaredUnitOfMeasurement:
    | 'liter'
    | 'kilogram'
    | 'cubic meter'
    | 'kilowatt hour'
    | 'megajoule'
    | 'ton kilometer'
    | 'square meter'
    | 'piece'
    | 'hour'
    | 'megabit'
    | 'second';
  declaredUnitAmount: number;
  productMassPerDeclaredUnit: number;
  productClassifications?: string[];
  productDescription?: string;
}

export interface CompanyAndProductInformationEntity {
  companyInformation: CompanyInformationEntity[];
  productInformation: ProductInformationEntity[];
}

export interface DataSourcesAndQualityEntity {
  primaryDataShare?: number;
  secondaryEmissionFactorSources?: string[];
  technologicalDQR?: number;
  temporalDQR?: number;
  geographicalDQR?: number;
}

export interface TechnologyEntity {
  ccsTechnologicalCO2CaptureIncluded: boolean;
  boundaryProcessesDescription?: string;
}

export interface IdAndVersionEntity {
  id: string;
  version: number;
  status: 'Active' | 'Deprecated';
  retroOrProspectivePcfType?: string;
  precedingPfIds?: object[];
}

export interface BoundarySpecificationsEntity {
  exemptedEmissionsPercent: number;
  exemptedEmissionsDescription?: string;
}

export interface GeographyEntity {
  geographyRegionOrSubregion: string;
  geographyCountrySubdivision?: string;
  geographyCountry?: string;
}

export interface TimeEntity {
  referencePeriodStart: string;
  referencePeriodEnd: string;
  created: string;
  validityPeriodEnd: string;
  validityPeriodStart?: string;
}

export interface PcfAssessmentInformationEntity {
  technology?: TechnologyEntity[];
  idAndVersion?: IdAndVersionEntity[];
  boundarySpecifications?: BoundarySpecificationsEntity[];
  geography?: GeographyEntity[];
  time?: TimeEntity[];
}

export interface VerificationEntity {
  programCertificationShare?: number;
  productVerificationShare3rdParty?: number;
  productVerificationShare2ndParty?: number;
  productVerificationShare1stParty?: number;
}

export interface MassBalancingInformationEntity {
  massBalancingUsed: boolean;
  freeAttributionInMassBalancing?: string;
  massBalancingCertificateScheme?: string;
}

export interface StandardsEntity {
  crossSectoralStandards?: string[];
  productOrSectorSpecificRules?: string[];
}

export interface GwpCharacterizationFactorDetailsEntity {
  ipccCharacterizationFactors?: 'AR4' | 'AR5' | 'AR6' | 'unspecified';
}

export interface AllocationInForegroundEntity {
  allocationWasteIncineration?: 'cut-off' | 'reverse cut-off' | 'system expansion' | 'polluter pays principle';
  allocationRulesDescription?: string;
  allocationRecycledCarbon?: string;
}

export interface PcfMethodologyEntity {
  massBalancingInformation?: MassBalancingInformationEntity[];
  standards?: StandardsEntity[];
  gwpCharacterizationFactorDetails?: GwpCharacterizationFactorDetailsEntity[];
  allocationInForeground?: AllocationInForegroundEntity[];
}

export interface PcfAssessmentAndMethodologyEntity {
  dataSourcesAndQuality?: DataSourcesAndQualityEntity[];
  pcfAssessmentInformation?: PcfAssessmentInformationEntity[];
  verificationAndCertificationShares?: VerificationEntity[];
  pcfMethodology?: PcfMethodologyEntity[];
}

export interface GeneralEntity {
  comment?: string;
  pcfLegalStatement?: string;
}

export interface CarbonContentEntity {
  carbonContentTotal?: number;
  fossilCarbonContent?: number;
  biogenicCarbonContent?: number;
  packagingBiogenicCarbonContent?: number;
  recycledCarbonContent?: number;
}

export interface ProductionStageEntity {
  pcfIncludingBiogenicUptake: number;
  pcfExcludingBiogenicUptake: number;
  fossilGhgEmissions?: number;
  biogenicNonCO2Emissions?: number;
  biogenicCO2Uptake?: number;
  landUseChangeGhgEmissions?: number;
  landManagementBiogenicCO2Emissions?: number;
  packagingLandManagementBiogenicCO2Emissions?: number;
  landManagementBiogenicCO2Removals?: number;
  aircraftGhgEmissions?: number;
}

export interface DistributionStageEntity {
  distributionStageIncluded: boolean;
  distributionStagePcfIncludingBiogenicUptake?: number;
  distributionStagePcfExcludingBiogenicUptake?: number;
  distributionStageFossilGhgEmissions?: number;
  distributionStageBiogenicNonCO2Emissions?: number;
  distributionStageBiogenicCO2Uptake?: number;
  distributionStageLandUseChangeGhgEmissions?: number;
  distributionStageLandManagementBiogenicCO2Emissions?: number;
  distributionStageLandManagementBiogenicCO2Removals?: number;
  distributionStageAircraftGhgEmissions?: number;
}

export interface PackagingStageEntity {
  packagingEmissionsIncluded: boolean;
  packagingPcfIncludingBiogenicUptake?: number | null;
  packagingPcfExcludingBiogenicUptake?: number | null;
  packagingFossilGhgEmissions?: number | null;
  packagingBiogenicNonCO2Emissions?: number | null;
  packagingBiogenicCO2Uptake?: number | null;
  packagingLandUseChangeGhgEmissions?: number | null;
  packagingLandManagementBiogenicCO2Emissions?: number | null;
  packagingLandManagementBiogenicCO2Removals?: number | null;
  packagingAircraftGhgEmissions?: number | null;
}

export interface ProductLifeCycleStagesAndEmissionsEntity {
  productionStage?: ProductionStageEntity[];
  distributionStage?: DistributionStageEntity[];
  packagingStage?: PackagingStageEntity[];
}

export interface AttestationOfConformanceEntity {
  attestationType: string;
  standardName: string;
  attestationStandard: string;
  attestationOfConformanceId: string;
  providerName: string;
  attestationOfConformanceLink?: string;
  providerId?: string;
  completedAt?: string;
}

// ---------------------------------------------------------------------------
// Root interface
// ---------------------------------------------------------------------------

/**
 * Root structure of a PCF as returned by the backend.
 * All top-level properties are arrays (Catena-X aspect model convention).
 */
export interface PcfNestedData {
  scopeOfPcfForm: ScopeOfPcfFormEntity[];
  companyAndProductInformation: CompanyAndProductInformationEntity[];
  pcfAssessmentAndMethodology: PcfAssessmentAndMethodologyEntity[];
  general: GeneralEntity[];
  carbonContent: CarbonContentEntity[];
  productLifeCycleStagesAndEmissions: ProductLifeCycleStagesAndEmissionsEntity[];
  attestationOfConformance?: AttestationOfConformanceEntity[];
  // Backend may also return metadata fields at root level
  id?: string;
  partCatenaXId?: string;
  companyName?: string;
  companyBpn?: string;
  productName?: string;
  productDescription?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ---------------------------------------------------------------------------
// PCF v7.0.0 — FLAT structure
// ---------------------------------------------------------------------------

/**
 * CarbonFootprint nested object within PCF v7 flat data.
 * Corresponds to the `pcf` property in the v7 root object.
 */
export interface PcfCarbonFootprintV7 {
  declaredUnit: string;
  unitaryProductAmount: number;
  productMassPerDeclaredUnit?: number;
  exemptedEmissionsPercent: number;
  exemptedEmissionsDescription?: string;
  pcfExcludingBiogenic: number;
  pcfIncludingBiogenic: number;
  fossilGhgEmissions?: number;
  fossilCarbonContent?: number;
  biogenicCarbonContentInProduct?: number;
  biogenicCarbonContentInPackaging?: number;
  characterizationFactors: string;
  crossSectoralStandardsUsed: Array<{ crossSectoralStandard: string }>;
  productOrSectorSpecificRules?: Array<{
    extWBCSD_operator: string;
    productOrSectorSpecificRules: Array<{ ruleName: string }>;
    extWBCSD_otherOperatorName?: string;
  }>;
  boundaryProcessesDescription?: string;
  referencePeriodStart: string;
  referencePeriodEnd: string;
  geographyCountrySubdivision?: string;
  geographyCountry?: string;
  geographyRegionOrSubregion?: string;
  secondaryEmissionFactorSources?: Array<{ secondaryEmissionFactorSource: string }>;
  primaryDataShare?: number;
  dqiLegalStatement?: string;
  biogenicAccountingMethodology?: string;
  allocationRulesDescription?: string;
  allocationWasteIncineration?: string;
  pcfLegalStatement?: string;
  distributionStageGhgEmissions?: number;
  distributionStagePcfIncludingBiogenic?: number;
  distributionStagePcfExcludingBiogenic?: number;
  carbonContentTotal?: number;
}

/**
 * Root structure of a PCF v7.0.0 as a flat object.
 * All fields are at the root level — no nested collection arrays.
 */
export interface PcfFlatDataV7 {
  id: string;
  specVersion: string;
  partialFullPcf: 'Cradle-to-gate' | 'Cradle-to-grave';
  precedingPfIds?: Array<{ id: string }>;
  version: number;
  created: string;
  extWBCSD_pfStatus: 'Active' | 'Deprecated';
  validityPeriodStart?: string;
  validityPeriodEnd?: string;
  comment?: string;
  companyName: string;
  companyIds: string[];
  productDescription?: string;
  productIds: string[];
  extWBCSD_productCodeCpc?: string;
  productName: string;
  pcf: PcfCarbonFootprintV7;
  pcfLegalStatement?: string;
}

/** Union type for any supported PCF data format */
export type PcfAnyVersion = PcfNestedData | PcfFlatDataV7;

// ---------------------------------------------------------------------------
