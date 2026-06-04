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
 * License for the specific language governing permissions and limitations
 * under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 ********************************************************************************/

/**
 * pcfDataExtractors.ts
 *
 * Centralized helpers for extracting individual fields from a nested
 * Catena-X PCF v9.0.0 submodel (PcfNestedData).
 *
 * All functions are null-safe: they return `null` when the target path
 * does not exist in the data, so callers can render "N/A" gracefully.
 *
 * Path conventions (Catena-X aspect model):
 *   Every top-level property is an array → always access [0].
 */

import type {
  PcfNestedData,
  ProductionStageEntity,
  DataSourcesAndQualityEntity,
  GeographyEntity,
  TimeEntity,
  IdAndVersionEntity,
  ScopeOfPcfFormEntity,
  ProductInformationEntity,
  CompanyInformationEntity,
  CarbonContentEntity,
  DistributionStageEntity,
} from '../types/pcfNestedData';

// ---------------------------------------------------------------------------
// Private accessors (raw nested path navigation)
// ---------------------------------------------------------------------------

const productionStage = (d: PcfNestedData): ProductionStageEntity | null =>
  d.productLifeCycleStagesAndEmissions?.[0]?.productionStage?.[0] ?? null;

const dataQuality = (d: PcfNestedData): DataSourcesAndQualityEntity | null =>
  d.pcfAssessmentAndMethodology?.[0]?.dataSourcesAndQuality?.[0] ?? null;

const geography = (d: PcfNestedData): GeographyEntity | null =>
  d.pcfAssessmentAndMethodology?.[0]?.pcfAssessmentInformation?.[0]?.geography?.[0] ?? null;

const time = (d: PcfNestedData): TimeEntity | null =>
  d.pcfAssessmentAndMethodology?.[0]?.pcfAssessmentInformation?.[0]?.time?.[0] ?? null;

const idAndVersion = (d: PcfNestedData): IdAndVersionEntity | null =>
  d.pcfAssessmentAndMethodology?.[0]?.pcfAssessmentInformation?.[0]?.idAndVersion?.[0] ?? null;

const scopeForm = (d: PcfNestedData): ScopeOfPcfFormEntity | null =>
  d.scopeOfPcfForm?.[0] ?? null;

const productInfo = (d: PcfNestedData): ProductInformationEntity | null =>
  d.companyAndProductInformation?.[0]?.productInformation?.[0] ?? null;

const companyInfo = (d: PcfNestedData): CompanyInformationEntity | null =>
  d.companyAndProductInformation?.[0]?.companyInformation?.[0] ?? null;

const carbonContent = (d: PcfNestedData): CarbonContentEntity | null =>
  d.carbonContent?.[0] ?? null;

const distributionStage = (d: PcfNestedData): DistributionStageEntity | null =>
  d.productLifeCycleStagesAndEmissions?.[0]?.distributionStage?.[0] ?? null;

// ---------------------------------------------------------------------------
// === TIER 1: The 6 KPIs for the main PCF Data block ===
// ---------------------------------------------------------------------------

/**
 * PCF total excluding biogenic uptake (kg CO₂e / declared unit) — THE main value.
 * Required by schema. Represents the production-stage carbon footprint (0/0 approach).
 */
export const getPcfExcludingBiogenic = (d: PcfNestedData): number | null =>
  productionStage(d)?.pcfExcludingBiogenicUptake ?? null;

/**
 * PCF total including biogenic uptake (kg CO₂e / declared unit).
 * Required by schema. May be negative (net carbon sink). (-1/+1 approach).
 */
export const getPcfIncludingBiogenic = (d: PcfNestedData): number | null =>
  productionStage(d)?.pcfIncludingBiogenicUptake ?? null;

/**
 * Declared unit: amount + measurement unit of the declared functional unit.
 * e.g. { amount: 1, unit: 'piece' } → renders as "1 piece"
 * Required by schema. Critical for interpreting the PCF value.
 */
export const getDeclaredUnit = (d: PcfNestedData): { amount: number; unit: string } | null => {
  const info = productInfo(d);
  if (!info) return null;
  return { amount: info.declaredUnitAmount, unit: info.declaredUnitOfMeasurement };
};

/**
 * PCF scope: 'Cradle-to-gate' | 'Cradle-to-grave'.
 * Required by schema. Without this, the numeric PCF value has no context.
 */
export const getPcfScope = (d: PcfNestedData): 'Cradle-to-gate' | 'Cradle-to-grave' | null =>
  scopeForm(d)?.partialFullPcf ?? null;

/**
 * Reference period (data collection window).
 * Required by schema. Both start and end are required.
 */
export const getReferencePeriod = (d: PcfNestedData): { start: string; end: string } | null => {
  const t = time(d);
  if (!t?.referencePeriodStart || !t?.referencePeriodEnd) return null;
  return { start: t.referencePeriodStart, end: t.referencePeriodEnd };
};

/**
 * Primary data share (0–100 %).
 * Quality indicator: what fraction of the PCF is based on measured/primary data.
 * Optional in schema but highly significant for data trust assessment.
 */
export const getPrimaryDataShare = (d: PcfNestedData): number | null =>
  dataQuality(d)?.primaryDataShare ?? null;

/**
 * PCF status from the idAndVersion block: 'Active' | 'Deprecated'.
 * Note: the frontend maps this to 'PUBLISHED' | 'DRAFT' for UI display.
 */
export const getPcfStatus = (d: PcfNestedData): 'Active' | 'Deprecated' | null =>
  idAndVersion(d)?.status ?? null;

/**
 * PCF type: retrospective vs prospective.
 * e.g. 'Retrospective PCF', 'Prospective PCF without forerunner', etc.
 */
export const getPcfType = (d: PcfNestedData): string | null =>
  idAndVersion(d)?.retroOrProspectivePcfType ?? null;

// ---------------------------------------------------------------------------
// === TIER 2: Fields for PcfDetailsDialog / PcfDetailsPage ===
// ---------------------------------------------------------------------------

/** Validity period end — when this PCF declaration expires. */
export const getValidityPeriodEnd = (d: PcfNestedData): string | null =>
  time(d)?.validityPeriodEnd ?? null;

/** Validity period start. */
export const getValidityPeriodStart = (d: PcfNestedData): string | null =>
  time(d)?.validityPeriodStart ?? null;

/** PCF creation timestamp (when the PCF was declared). */
export const getPcfCreated = (d: PcfNestedData): string | null =>
  time(d)?.created ?? null;

/** PCF spec version (data model version), e.g. "9.0.0". */
export const getSpecVersion = (d: PcfNestedData): string | null =>
  scopeForm(d)?.specVersion ?? null;

/** UUID identifier of this PCF record. */
export const getPcfId = (d: PcfNestedData): string | null =>
  (idAndVersion(d)?.id ?? (d as Record<string, unknown>).id as string) ?? null;

/** PCF version number (integer). */
export const getPcfVersion = (d: PcfNestedData): number | null =>
  idAndVersion(d)?.version ?? null;

/** Company name of the PCF data owner. */
export const getCompanyName = (d: PcfNestedData): string | null =>
  companyInfo(d)?.companyName ?? (d as Record<string, unknown>).companyName as string ?? null;

/** Company BPN (first companyId, or root-level fallback). */
export const getCompanyBpn = (d: PcfNestedData): string | null => {
  const ids = companyInfo(d)?.companyIds;
  if (ids && ids.length > 0) return ids[0];
  return (d as Record<string, unknown>).companyBpn as string ?? null;
};

/** Product name as declared by the company. */
export const getProductName = (d: PcfNestedData): string | null =>
  productInfo(d)?.productNameCompany ?? (d as Record<string, unknown>).productName as string ?? null;

/** Product description. */
export const getProductDescription = (d: PcfNestedData): string | null =>
  productInfo(d)?.productDescription ?? (d as Record<string, unknown>).productDescription as string ?? null;

/** Product mass per declared unit (kg). */
export const getProductMass = (d: PcfNestedData): number | null =>
  productInfo(d)?.productMassPerDeclaredUnit ?? null;

/** Geography country code (ISO 3166-1 alpha-2), e.g. 'DE'. */
export const getGeographyCountry = (d: PcfNestedData): string | null =>
  geography(d)?.geographyCountry ?? null;

/** Geography region or subregion, e.g. 'Europe', 'Western Europe'. */
export const getGeographyRegion = (d: PcfNestedData): string | null =>
  geography(d)?.geographyRegionOrSubregion ?? null;

/** Geography country subdivision (ISO 3166-2), e.g. 'DE-BY'. */
export const getGeographySubdivision = (d: PcfNestedData): string | null =>
  geography(d)?.geographyCountrySubdivision ?? null;

// ---------------------------------------------------------------------------
// === Production Stage — emission breakdown ===
// ---------------------------------------------------------------------------

/** Fossil GHG emissions (position A). */
export const getFossilGhgEmissions = (d: PcfNestedData): number | null =>
  productionStage(d)?.fossilGhgEmissions ?? null;

/** Biogenic non-CO₂ emissions (position C). */
export const getBiogenicNonCO2Emissions = (d: PcfNestedData): number | null =>
  productionStage(d)?.biogenicNonCO2Emissions ?? null;

/** Biogenic CO₂ uptake — negative value (position D). */
export const getBiogenicCO2Uptake = (d: PcfNestedData): number | null =>
  productionStage(d)?.biogenicCO2Uptake ?? null;

/** Land use change GHG emissions (position E). */
export const getLandUseChangeEmissions = (d: PcfNestedData): number | null =>
  productionStage(d)?.landUseChangeGhgEmissions ?? null;

/** Aircraft GHG emissions (position H). */
export const getAircraftGhgEmissions = (d: PcfNestedData): number | null =>
  productionStage(d)?.aircraftGhgEmissions ?? null;

// ---------------------------------------------------------------------------
// === Carbon Content ===
// ---------------------------------------------------------------------------

/** Total carbon content of the product. */
export const getCarbonContentTotal = (d: PcfNestedData): number | null =>
  carbonContent(d)?.carbonContentTotal ?? null;

/** Fossil carbon content. */
export const getFossilCarbonContent = (d: PcfNestedData): number | null =>
  carbonContent(d)?.fossilCarbonContent ?? null;

/** Biogenic carbon content. */
export const getBiogenicCarbonContent = (d: PcfNestedData): number | null =>
  carbonContent(d)?.biogenicCarbonContent ?? null;

/** Recycled carbon content. */
export const getRecycledCarbonContent = (d: PcfNestedData): number | null =>
  carbonContent(d)?.recycledCarbonContent ?? null;

// ---------------------------------------------------------------------------
// === Data Quality Ratings (DQR 1–5, lower = better) ===
// ---------------------------------------------------------------------------

/** Technological Data Quality Rating (1–5). */
export const getTechnologicalDQR = (d: PcfNestedData): number | null =>
  dataQuality(d)?.technologicalDQR ?? null;

/** Temporal Data Quality Rating (1–5). */
export const getTemporalDQR = (d: PcfNestedData): number | null =>
  dataQuality(d)?.temporalDQR ?? null;

/** Geographical Data Quality Rating (1–5). */
export const getGeographicalDQR = (d: PcfNestedData): number | null =>
  dataQuality(d)?.geographicalDQR ?? null;

// ---------------------------------------------------------------------------
// === Distribution Stage ===
// ---------------------------------------------------------------------------

/** Whether distribution stage emissions are included in the system boundary. */
export const isDistributionStageIncluded = (d: PcfNestedData): boolean | null =>
  distributionStage(d)?.distributionStageIncluded ?? null;

/** Distribution stage PCF excluding biogenic uptake. */
export const getDistributionPcfExcludingBiogenic = (d: PcfNestedData): number | null =>
  distributionStage(d)?.distributionStagePcfExcludingBiogenicUptake ?? null;

/** Distribution stage PCF including biogenic uptake. */
export const getDistributionPcfIncludingBiogenic = (d: PcfNestedData): number | null =>
  distributionStage(d)?.distributionStagePcfIncludingBiogenicUptake ?? null;

// ---------------------------------------------------------------------------
// === General ===
// ---------------------------------------------------------------------------

/** Free-text comment about the PCF calculation. */
export const getPcfComment = (d: PcfNestedData): string | null =>
  d.general?.[0]?.comment ?? null;

/** Legal statement associated with the PCF. */
export const getPcfLegalStatement = (d: PcfNestedData): string | null =>
  d.general?.[0]?.pcfLegalStatement ?? null;

// ---------------------------------------------------------------------------
// === Formatting helpers ===
// ---------------------------------------------------------------------------

/**
 * Formats a PCF emission value for display.
 * Adds up to 4 significant decimals, respects locale.
 * e.g. 158.5 → "158.5"  |  0.00123 → "0.0012"  |  null → "N/A"
 */
export const formatEmissionValue = (value: number | null, decimals = 4): string => {
  if (value === null || value === undefined) return 'N/A';
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
};

/**
 * Formats the declared unit for display next to a PCF value.
 * e.g. { amount: 1, unit: 'piece' } → "/ piece"
 *      { amount: 2300, unit: 'kilogram' } → "/ 2300 kg"
 */
export const formatDeclaredUnit = (unit: { amount: number; unit: string } | null): string => {
  if (!unit) return '/ unit';
  const abbreviations: Record<string, string> = {
    kilogram: 'kg',
    liter: 'L',
    'cubic meter': 'm³',
    'kilowatt hour': 'kWh',
    megajoule: 'MJ',
    'ton kilometer': 'tkm',
    'square meter': 'm²',
    piece: 'piece',
    hour: 'h',
    megabit: 'Mbit',
    second: 's',
  };
  const abbr = abbreviations[unit.unit] ?? unit.unit;
  const amountStr = unit.amount === 1 ? '' : `${unit.amount} `;
  return `/ ${amountStr}${abbr}`;
};

/**
 * Formats a date string for display (short format: "Jan 2024").
 */
export const formatDateShort = (iso: string | null): string => {
  if (!iso) return 'N/A';
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short' });
};

/**
 * Formats a date string with day precision: "Jan 1, 2024".
 */
export const formatDate = (iso: string | null): string => {
  if (!iso) return 'N/A';
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

/**
 * Formats a full ISO datetime: "Jan 1, 2024 · 10:30".
 */
export const formatDateTime = (iso: string | null): string => {
  if (!iso) return 'N/A';
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

/**
 * Formats the reference period as a compact range: "Jan 2024 – Dec 2024".
 */
export const formatReferencePeriod = (period: { start: string; end: string } | null): string => {
  if (!period) return 'N/A';
  return `${formatDateShort(period.start)} – ${formatDateShort(period.end)}`;
};

/**
 * Maps the schema status ('Active' | 'Deprecated') to the UI status ('PUBLISHED' | 'DRAFT').
 */
export const mapPcfStatus = (status: 'Active' | 'Deprecated' | null): 'PUBLISHED' | 'DRAFT' => {
  if (status === 'Active') return 'PUBLISHED';
  return 'DRAFT';
};

/**
 * Returns a compact label for the PCF type.
 * e.g. 'Retrospective PCF' → 'Retrospective'
 *      'Prospective PCF without forerunner' → 'Prospective'
 */
export const formatPcfType = (type: string | null): string => {
  if (!type) return 'N/A';
  if (type.startsWith('Retrospective')) return 'Retrospective';
  if (type.startsWith('Prospective') || type.startsWith('Progressive')) return 'Prospective';
  return type;
};

/**
 * Returns a color for a DQR score (1 = best = green, 5 = worst = red).
 * Used to color-code quality indicators.
 */
export const getDqrColor = (dqr: number | null): string => {
  if (dqr === null) return 'rgba(255,255,255,0.3)';
  if (dqr <= 2) return '#10b981'; // green
  if (dqr <= 3) return '#f59e0b'; // amber
  return '#ef4444';               // red
};

/**
 * Returns a color for the primary data share percentage.
 * High share (≥70%) = green; medium (40-69%) = amber; low (<40%) = red.
 */
export const getPrimaryDataShareColor = (share: number | null): string => {
  if (share === null) return 'rgba(255,255,255,0.3)';
  if (share >= 70) return '#10b981';
  if (share >= 40) return '#f59e0b';
  return '#ef4444';
};
