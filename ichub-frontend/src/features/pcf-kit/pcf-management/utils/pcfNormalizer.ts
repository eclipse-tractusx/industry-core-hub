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
 * pcfNormalizer.ts
 *
 * Converts a PCF v7.0.0 flat data object into the PCF v9.0.0 nested structure
 * (PcfNestedData). This allows all downstream components, extractors, header cards
 * and visualizations to work exclusively with the v9 canonical model.
 *
 * The mapping is based on the SAMM aspect model field correspondence between
 * urn:samm:io.catenax.pcf:7.0.0 and urn:samm:io.catenax.pcf:9.0.0.
 */

import type { PcfNestedData, PcfFlatDataV7 } from '../types/pcfNestedData';
import { detectPcfVersion } from './pcfVersionDetector';

/**
 * Normalizes any supported PCF data format into the canonical PcfNestedData (v9).
 * If the data is already v9 it is returned as-is (no copy).
 * If the data is v7 flat it is mapped to the v9 nested structure.
 */
export function normalizePcfData(data: unknown): PcfNestedData {
  const version = detectPcfVersion(data);

  if (version === '9.0.0') {
    return data as PcfNestedData;
  }

  return normalizePcfV7toV9(data as PcfFlatDataV7);
}

// ---------------------------------------------------------------------------
// Internal: v7 flat → v9 nested mapping
// ---------------------------------------------------------------------------

function normalizePcfV7toV9(d: PcfFlatDataV7): PcfNestedData {
  const pcf = d.pcf ?? {};

  // Infer distribution stage inclusion from presence of distribution data
  const hasDistribution =
    pcf.distributionStageGhgEmissions != null ||
    pcf.distributionStagePcfIncludingBiogenic != null ||
    pcf.distributionStagePcfExcludingBiogenic != null;

  return {
    // ── scopeOfPcfForm ─────────────────────────────────────────────────────
    scopeOfPcfForm: [
      {
        specVersion: d.specVersion ?? '',
        partialFullPcf: d.partialFullPcf ?? 'Cradle-to-gate',
      },
    ],

    // ── companyAndProductInformation ───────────────────────────────────────
    companyAndProductInformation: [
      {
        companyInformation: [
          {
            companyName: d.companyName ?? '',
            companyIds: d.companyIds ?? [],
          },
        ],
        productInformation: [
          {
            productNameCompany: d.productName ?? '',
            productIds: d.productIds ?? [],
            declaredUnitOfMeasurement: pcf.declaredUnit as PcfNestedData['companyAndProductInformation'][0]['productInformation'][0]['declaredUnitOfMeasurement'] ?? 'piece',
            declaredUnitAmount: pcf.unitaryProductAmount ?? 1,
            productMassPerDeclaredUnit: pcf.productMassPerDeclaredUnit ?? 0,
            productDescription: d.productDescription,
          },
        ],
      },
    ],

    // ── pcfAssessmentAndMethodology ────────────────────────────────────────
    pcfAssessmentAndMethodology: [
      {
        dataSourcesAndQuality: [
          {
            primaryDataShare: pcf.primaryDataShare,
            secondaryEmissionFactorSources: pcf.secondaryEmissionFactorSources?.map(
              (s) => s.secondaryEmissionFactorSource,
            ),
          },
        ],
        pcfAssessmentInformation: [
          {
            idAndVersion: [
              {
                id: d.id ?? '',
                version: d.version ?? 0,
                status: d.extWBCSD_pfStatus === 'Deprecated' ? 'Deprecated' : 'Active',
                precedingPfIds: d.precedingPfIds,
              },
            ],
            geography: [
              {
                geographyRegionOrSubregion: pcf.geographyRegionOrSubregion ?? 'Global',
                geographyCountrySubdivision: pcf.geographyCountrySubdivision,
                geographyCountry: pcf.geographyCountry,
              },
            ],
            time: [
              {
                referencePeriodStart: pcf.referencePeriodStart ?? '',
                referencePeriodEnd: pcf.referencePeriodEnd ?? '',
                created: d.created ?? '',
                validityPeriodEnd: d.validityPeriodEnd ?? '',
                validityPeriodStart: d.validityPeriodStart,
              },
            ],
            technology: undefined,
            boundarySpecifications: [
              {
                exemptedEmissionsPercent: pcf.exemptedEmissionsPercent ?? 0,
                exemptedEmissionsDescription: pcf.exemptedEmissionsDescription,
              },
            ],
          },
        ],
        pcfMethodology: [
          {
            standards: [
              {
                crossSectoralStandards: pcf.crossSectoralStandardsUsed?.map(
                  (s) => s.crossSectoralStandard,
                ),
                productOrSectorSpecificRules: pcf.productOrSectorSpecificRules?.map(
                  (r) => r.productOrSectorSpecificRules?.[0]?.ruleName ?? '',
                ),
              },
            ],
            gwpCharacterizationFactorDetails: pcf.characterizationFactors
              ? [
                  {
                    ipccCharacterizationFactors: pcf.characterizationFactors as 'AR4' | 'AR5' | 'AR6' | 'unspecified',
                  },
                ]
              : undefined,
            allocationInForeground: pcf.allocationWasteIncineration
              ? [
                  {
                    allocationWasteIncineration: pcf.allocationWasteIncineration as 'cut-off' | 'reverse cut-off' | 'system expansion' | 'polluter pays principle',
                    allocationRulesDescription: pcf.allocationRulesDescription,
                  },
                ]
              : undefined,
          },
        ],
      },
    ],

    // ── general ────────────────────────────────────────────────────────────
    general: [
      {
        comment: d.comment,
        pcfLegalStatement: d.pcfLegalStatement ?? pcf.pcfLegalStatement,
      },
    ],

    // ── carbonContent ──────────────────────────────────────────────────────
    carbonContent: [
      {
        carbonContentTotal: pcf.carbonContentTotal,
        fossilCarbonContent: pcf.fossilCarbonContent,
        biogenicCarbonContent: pcf.biogenicCarbonContentInProduct,
        packagingBiogenicCarbonContent: pcf.biogenicCarbonContentInPackaging,
      },
    ],

    // ── productLifeCycleStagesAndEmissions ─────────────────────────────────
    productLifeCycleStagesAndEmissions: [
      {
        productionStage: [
          {
            pcfIncludingBiogenicUptake: pcf.pcfIncludingBiogenic ?? 0,
            pcfExcludingBiogenicUptake: pcf.pcfExcludingBiogenic ?? 0,
            fossilGhgEmissions: pcf.fossilGhgEmissions,
          },
        ],
        distributionStage: hasDistribution
          ? [
              {
                distributionStageIncluded: true,
                distributionStagePcfIncludingBiogenicUptake: pcf.distributionStagePcfIncludingBiogenic,
                distributionStagePcfExcludingBiogenicUptake: pcf.distributionStagePcfExcludingBiogenic,
                distributionStageFossilGhgEmissions: pcf.distributionStageGhgEmissions,
              },
            ]
          : [{ distributionStageIncluded: false }],
      },
    ],

    // Root-level metadata passthrough (used by some extractors as fallback)
    id: d.id,
    companyName: d.companyName,
    productName: d.productName,
    productDescription: d.productDescription,
  };
}
