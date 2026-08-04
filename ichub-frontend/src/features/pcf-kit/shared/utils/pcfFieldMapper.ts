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
 * pcfFieldMapper.ts
 *
 * Bidirectional field mapping between the two supported PCF schema versions:
 *   - PCF v9.0.0 — nested/hierarchical structure (typed collection arrays)
 *   - PCF v7.0.0 — flat structure with a nested `pcf` (CarbonFootprint) object
 *
 * The {@link PCF_CROSS_VERSION_FIELD_MAP} describes every field that exists in
 * BOTH versions, so values can be:
 *   - auto-filled from one version into the other (extractV7/V9CompatibleFields)
 *   - compared to surface inconsistencies during reconciliation
 *     (findCrossVersionDifferences)
 *
 * Paths use a simple dot/bracket notation, e.g.
 *   `pcfAssessmentAndMethodology[0].pcfAssessmentInformation[0].idAndVersion[0].id`
 *   `pcf.declaredUnit`
 */

/** Optional numeric range constraints that differ between versions. */
export interface CrossVersionConstraint {
  v7?: { min?: number; max?: number };
  v9?: { min?: number; max?: number };
}

/** A single bidirectional field mapping entry. */
export interface CrossVersionFieldMapEntry {
  /** Dot/bracket path within a v9 (nested) PCF object. */
  v9: string;
  /** Dot/bracket path within a v7 (flat) PCF object. */
  v7: string;
  /** Human-readable label for UI display. */
  label: string;
  /** Optional per-version numeric range constraints (for reconciliation warnings). */
  constraints?: CrossVersionConstraint;
  /**
   * Optional semantic-equivalence predicate. When provided and it returns
   * `true`, the two raw values are treated as the SAME choice even if they are
   * spelled differently (so the field is not flagged as a difference to
   * reconcile). Used for enums whose versions encode the same concept with
   * different wording.
   */
  equivalent?: (v9Value: unknown, v7Value: unknown) => boolean;
  /**
   * Optional value coercion. Converts a chosen value into the spelling that is
   * valid for the target version (e.g. v9's "polluter pays principle" → v7's
   * "reverse cut-off"). Returns the value unchanged when no mapping applies.
   */
  coerce?: (value: unknown, target: 'v9' | 'v7') => unknown;
}

// ---------------------------------------------------------------------------
// Allocation Waste Incineration — cross-version enum equivalence
// ---------------------------------------------------------------------------
//
// v7.0.0 enum: "cut-off", "reverse cut-off", "system expansion"
// v9.0.0 enum: adds "polluter pays principle", which the v9 SAMM schema
// explicitly defines as equivalent to the "reverse cut-off" approach.
//
// We canonicalize values to a case/space/hyphen-insensitive token and treat
// "polluter pays principle" as the same choice as "reverse cut-off", so each
// version can keep its own valid spelling without being reported as a conflict.

/** Lowercase, trim and collapse spaces/hyphens/underscores into single spaces. */
function normalizeAllocationToken(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const norm = value.trim().toLowerCase().replace(/[\s_-]+/g, ' ').trim();
  return norm.length > 0 ? norm : undefined;
}

/** Synonyms folded onto a single canonical token (space form). */
const ALLOCATION_SYNONYMS: Record<string, string> = {
  'polluter pays principle': 'reverse cut off',
};

/** Returns the canonical token for an Allocation Waste Incineration value. */
export function canonicalAllocationWaste(value: unknown): string | undefined {
  const n = normalizeAllocationToken(value);
  if (n === undefined) return undefined;
  return ALLOCATION_SYNONYMS[n] ?? n;
}

/** Canonical token → the valid enum spelling for each version. */
const ALLOCATION_CANON_TO_V7: Record<string, string> = {
  'cut off': 'cut-off',
  'reverse cut off': 'reverse cut-off',
  'system expansion': 'system expansion',
};
const ALLOCATION_CANON_TO_V9: Record<string, string> = {
  'cut off': 'cut-off',
  'reverse cut off': 'reverse cut-off',
  'system expansion': 'system expansion',
};

/**
 * Coerces an Allocation Waste Incineration value to the spelling that is valid
 * for the target version. Unknown values are returned unchanged so custom
 * input is never silently dropped.
 */
export function coerceAllocationWaste(value: unknown, target: 'v9' | 'v7'): unknown {
  const canon = canonicalAllocationWaste(value);
  if (canon === undefined) return value;
  const table = target === 'v7' ? ALLOCATION_CANON_TO_V7 : ALLOCATION_CANON_TO_V9;
  return table[canon] ?? value;
}

function allocationWasteEquivalent(a: unknown, b: unknown): boolean {
  const ca = canonicalAllocationWaste(a);
  const cb = canonicalAllocationWaste(b);
  return ca !== undefined && ca === cb;
}

// ---------------------------------------------------------------------------
// Standards / rules / emission sources — structural cross-version coercion
// ---------------------------------------------------------------------------
//
// These fields hold the SAME information in both versions but with different
// shapes:
//   crossSectoralStandards         v9: string[]              v7: [{ crossSectoralStandard }]
//   productOrSectorSpecificRules   v9: string[]              v7: [{ extWBCSD_operator, productOrSectorSpecificRules: [{ ruleName }] }]
//   secondaryEmissionFactorSources v9: string[]              v7: [{ secondaryEmissionFactorSource }]
//
// Copying them 1:1 across versions (auto-fill / reconciliation) produced data
// that failed the other version's schema. These coercers convert to the exact
// shape required by the target version and tolerate legacy/partial inputs
// (plain strings, urn-fragment keys like `operator`/`ruleNames`, etc.).

function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === '') return [];
  return [value];
}

function toStringValue(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return undefined;
}

/** crossSectoralStandards (v9 string[]) ↔ crossSectoralStandardsUsed (v7 [{crossSectoralStandard}]). */
function coerceCrossSectoral(value: unknown, target: 'v9' | 'v7'): unknown {
  const items = asArray(value);
  if (target === 'v7') {
    return items
      .map((item) => {
        if (item && typeof item === 'object') {
          const o = item as Record<string, unknown>;
          const s = toStringValue(o.crossSectoralStandard) ?? toStringValue(o.value) ?? toStringValue(o.name);
          return { crossSectoralStandard: s ?? '' };
        }
        return { crossSectoralStandard: toStringValue(item) ?? '' };
      })
      .filter((o) => o.crossSectoralStandard !== '');
  }
  return items
    .map((item) => {
      if (item && typeof item === 'object') {
        const o = item as Record<string, unknown>;
        return toStringValue(o.crossSectoralStandard) ?? toStringValue(o.value) ?? '';
      }
      return toStringValue(item) ?? '';
    })
    .filter((s) => s !== '');
}

/** Flatten any rule representation into plain rule-name strings. */
function extractRuleNameStrings(item: unknown): string[] {
  const s = toStringValue(item);
  if (s !== undefined) return [s];
  if (item && typeof item === 'object') {
    const o = item as Record<string, unknown>;
    if (typeof o.ruleName === 'string') return [o.ruleName];
    const inner = o.productOrSectorSpecificRules ?? o.ruleNames;
    if (Array.isArray(inner)) return inner.flatMap(extractRuleNameStrings);
  }
  return [];
}

/** productOrSectorSpecificRules (v9 string[]) ↔ v7 [{extWBCSD_operator, productOrSectorSpecificRules:[{ruleName}]}]. */
function coerceRules(value: unknown, target: 'v9' | 'v7'): unknown {
  const ruleStrings = asArray(value).flatMap(extractRuleNameStrings).filter((s) => s !== '');
  if (target === 'v9') return ruleStrings;
  if (ruleStrings.length === 0) return [];
  // v9 carries no operator concept — group all rules under the Catena-X default "Other".
  return [
    {
      extWBCSD_operator: 'Other',
      productOrSectorSpecificRules: ruleStrings.map((name) => ({ ruleName: name })),
    },
  ];
}

/** secondaryEmissionFactorSources (v9 string[]) ↔ v7 [{secondaryEmissionFactorSource}]. */
function coerceEmissionSources(value: unknown, target: 'v9' | 'v7'): unknown {
  const items = asArray(value);
  if (target === 'v7') {
    return items
      .map((item) => {
        if (item && typeof item === 'object') {
          const o = item as Record<string, unknown>;
          return { secondaryEmissionFactorSource: toStringValue(o.secondaryEmissionFactorSource) ?? toStringValue(o.value) ?? '' };
        }
        return { secondaryEmissionFactorSource: toStringValue(item) ?? '' };
      })
      .filter((o) => o.secondaryEmissionFactorSource !== '');
  }
  return items
    .map((item) => {
      if (item && typeof item === 'object') {
        const o = item as Record<string, unknown>;
        return toStringValue(o.secondaryEmissionFactorSource) ?? '';
      }
      return toStringValue(item) ?? '';
    })
    .filter((s) => s !== '');
}

/** Equivalence for structurally-different list fields: compare their v9 (string-list)
 *  projections as sorted sets, so the same content in different shapes is not flagged. */
function listEquivalent(toV9: (v: unknown) => unknown): (a: unknown, b: unknown) => boolean {
  const canon = (v: unknown): string => {
    const arr = toV9(v);
    const list = Array.isArray(arr) ? [...arr].map((x) => JSON.stringify(x)).sort() : [JSON.stringify(arr)];
    return JSON.stringify(list);
  };
  return (a, b) => canon(a) === canon(b);
}

const crossSectoralEquivalent = listEquivalent((v) => coerceCrossSectoral(v, 'v9'));
const rulesEquivalent = listEquivalent((v) => coerceRules(v, 'v9'));
const emissionSourcesEquivalent = listEquivalent((v) => coerceEmissionSources(v, 'v9'));

/**
 * A single field whose v9 and v7 values diverge and must be reconciled before
 * both submodels can be saved.
 */
export interface FieldDifference {
  /** Stable key for this difference (the v9 path is used — unique per field). */
  fieldKey: string;
  /** Human-readable label. */
  label: string;
  /** Dot/bracket path in the v9 object. */
  v9Path: string;
  /** Dot/bracket path in the v7 object. */
  v7Path: string;
  /** Value extracted from the v9 data. */
  v9Value: unknown;
  /** Value extracted from the v7 data. */
  v7Value: unknown;
  /** Optional per-version numeric range constraints. */
  constraints?: CrossVersionConstraint;
  /** Resolved value, once the user has chosen one (undefined = unresolved). */
  resolvedValue?: unknown;
  /** Which side (or manual entry) the resolution came from. */
  chosenVersion?: 'v9' | 'v7' | 'manual';
  /** The value typed in when chosenVersion === 'manual'. */
  manualValue?: unknown;
}

/**
 * Cross-version field correspondence table. Each entry maps a single shared
 * field between the v9 and v7 PCF schemas. Fields that exist in only one
 * version are intentionally omitted (they have no counterpart to reconcile).
 */
export const PCF_CROSS_VERSION_FIELD_MAP: CrossVersionFieldMapEntry[] = [
  // ── Identity ──────────────────────────────────────────────────────────────
  { v9: 'pcfAssessmentAndMethodology[0].pcfAssessmentInformation[0].idAndVersion[0].id', v7: 'id', label: 'PCF ID' },
  { v9: 'pcfAssessmentAndMethodology[0].pcfAssessmentInformation[0].idAndVersion[0].version', v7: 'version', label: 'Version' },
  { v9: 'pcfAssessmentAndMethodology[0].pcfAssessmentInformation[0].idAndVersion[0].status', v7: 'extWBCSD_pfStatus', label: 'Status' },
  { v9: 'scopeOfPcfForm[0].specVersion', v7: 'specVersion', label: 'Spec Version' },
  { v9: 'scopeOfPcfForm[0].partialFullPcf', v7: 'partialFullPcf', label: 'Partial/Full PCF' },

  // ── Company & product ───────────────────────────────────────────────────────
  { v9: 'companyAndProductInformation[0].companyInformation[0].companyName', v7: 'companyName', label: 'Company Name' },
  { v9: 'companyAndProductInformation[0].companyInformation[0].companyIds', v7: 'companyIds', label: 'Company IDs' },
  { v9: 'companyAndProductInformation[0].productInformation[0].productNameCompany', v7: 'productName', label: 'Product Name' },
  { v9: 'companyAndProductInformation[0].productInformation[0].productIds', v7: 'productIds', label: 'Product IDs' },
  { v9: 'companyAndProductInformation[0].productInformation[0].productDescription', v7: 'productDescription', label: 'Product Description' },
  { v9: 'companyAndProductInformation[0].productInformation[0].declaredUnitOfMeasurement', v7: 'pcf.declaredUnit', label: 'Declared Unit' },
  { v9: 'companyAndProductInformation[0].productInformation[0].declaredUnitAmount', v7: 'pcf.unitaryProductAmount', label: 'Unit Amount' },
  { v9: 'companyAndProductInformation[0].productInformation[0].productMassPerDeclaredUnit', v7: 'pcf.productMassPerDeclaredUnit', label: 'Product Mass/Unit' },

  // ── Boundaries ──────────────────────────────────────────────────────────────
  { v9: 'pcfAssessmentAndMethodology[0].pcfAssessmentInformation[0].boundarySpecifications[0].exemptedEmissionsPercent', v7: 'pcf.exemptedEmissionsPercent', label: 'Exempted Emissions %', constraints: { v7: { max: 5.0 }, v9: { max: 10.0 } } },
  { v9: 'pcfAssessmentAndMethodology[0].pcfAssessmentInformation[0].boundarySpecifications[0].exemptedEmissionsDescription', v7: 'pcf.exemptedEmissionsDescription', label: 'Exempted Emissions Description' },

  // ── Geography ─────────────────────────────────────────────────────────────
  { v9: 'pcfAssessmentAndMethodology[0].pcfAssessmentInformation[0].geography[0].geographyRegionOrSubregion', v7: 'pcf.geographyRegionOrSubregion', label: 'Region' },
  { v9: 'pcfAssessmentAndMethodology[0].pcfAssessmentInformation[0].geography[0].geographyCountry', v7: 'pcf.geographyCountry', label: 'Country' },
  { v9: 'pcfAssessmentAndMethodology[0].pcfAssessmentInformation[0].geography[0].geographyCountrySubdivision', v7: 'pcf.geographyCountrySubdivision', label: 'Country Subdivision' },

  // ── Time ────────────────────────────────────────────────────────────────────
  { v9: 'pcfAssessmentAndMethodology[0].pcfAssessmentInformation[0].time[0].referencePeriodStart', v7: 'pcf.referencePeriodStart', label: 'Reference Period Start' },
  { v9: 'pcfAssessmentAndMethodology[0].pcfAssessmentInformation[0].time[0].referencePeriodEnd', v7: 'pcf.referencePeriodEnd', label: 'Reference Period End' },
  { v9: 'pcfAssessmentAndMethodology[0].pcfAssessmentInformation[0].time[0].created', v7: 'created', label: 'Created' },
  { v9: 'pcfAssessmentAndMethodology[0].pcfAssessmentInformation[0].time[0].validityPeriodStart', v7: 'validityPeriodStart', label: 'Validity Period Start' },
  { v9: 'pcfAssessmentAndMethodology[0].pcfAssessmentInformation[0].time[0].validityPeriodEnd', v7: 'validityPeriodEnd', label: 'Validity Period End' },

  // ── Production emissions ────────────────────────────────────────────────────
  { v9: 'productLifeCycleStagesAndEmissions[0].productionStage[0].pcfExcludingBiogenicUptake', v7: 'pcf.pcfExcludingBiogenic', label: 'PCF Excl. Biogenic' },
  { v9: 'productLifeCycleStagesAndEmissions[0].productionStage[0].pcfIncludingBiogenicUptake', v7: 'pcf.pcfIncludingBiogenic', label: 'PCF Incl. Biogenic' },
  { v9: 'productLifeCycleStagesAndEmissions[0].productionStage[0].fossilGhgEmissions', v7: 'pcf.fossilGhgEmissions', label: 'Fossil GHG Emissions' },
  { v9: 'productLifeCycleStagesAndEmissions[0].productionStage[0].biogenicNonCO2Emissions', v7: 'pcf.biogenicCarbonEmissionsOtherThanCO2', label: 'Biogenic non-CO2 Emissions' },
  { v9: 'productLifeCycleStagesAndEmissions[0].productionStage[0].biogenicCO2Uptake', v7: 'pcf.biogenicCarbonWithdrawal', label: 'Biogenic CO2 Withdrawal' },
  { v9: 'productLifeCycleStagesAndEmissions[0].productionStage[0].landUseChangeGhgEmissions', v7: 'pcf.dlucGhgEmissions', label: 'dLUC GHG Emissions' },
  { v9: 'productLifeCycleStagesAndEmissions[0].productionStage[0].aircraftGhgEmissions', v7: 'pcf.aircraftGhgEmissions', label: 'Aircraft GHG Emissions' },

  // ── Distribution emissions ──────────────────────────────────────────────────
  { v9: 'productLifeCycleStagesAndEmissions[0].distributionStage[0].distributionStagePcfExcludingBiogenicUptake', v7: 'pcf.distributionStagePcfExcludingBiogenic', label: 'Distribution PCF Excl. Biogenic' },
  { v9: 'productLifeCycleStagesAndEmissions[0].distributionStage[0].distributionStagePcfIncludingBiogenicUptake', v7: 'pcf.distributionStagePcfIncludingBiogenic', label: 'Distribution PCF Incl. Biogenic' },
  { v9: 'productLifeCycleStagesAndEmissions[0].distributionStage[0].distributionStageFossilGhgEmissions', v7: 'pcf.distributionStageFossilGhgEmissions', label: 'Distribution Fossil GHG' },

  // ── Data quality ────────────────────────────────────────────────────────────
  { v9: 'pcfAssessmentAndMethodology[0].dataSourcesAndQuality[0].primaryDataShare', v7: 'pcf.primaryDataShare', label: 'Primary Data Share' },
  { v9: 'pcfAssessmentAndMethodology[0].dataSourcesAndQuality[0].technologicalDQR', v7: 'pcf.dataQualityRating.technologicalDQR', label: 'Technological DQR', constraints: { v7: { min: 1, max: 3 }, v9: { min: 1, max: 5 } } },
  { v9: 'pcfAssessmentAndMethodology[0].dataSourcesAndQuality[0].temporalDQR', v7: 'pcf.dataQualityRating.temporalDQR', label: 'Temporal DQR', constraints: { v7: { min: 1, max: 3 }, v9: { min: 1, max: 5 } } },
  { v9: 'pcfAssessmentAndMethodology[0].dataSourcesAndQuality[0].geographicalDQR', v7: 'pcf.dataQualityRating.geographicalDQR', label: 'Geographical DQR', constraints: { v7: { min: 1, max: 3 }, v9: { min: 1, max: 5 } } },
  { v9: 'pcfAssessmentAndMethodology[0].dataSourcesAndQuality[0].secondaryEmissionFactorSources', v7: 'pcf.secondaryEmissionFactorSources', label: 'Secondary Emission Factor Sources', equivalent: emissionSourcesEquivalent, coerce: coerceEmissionSources },

  // ── Methodology ─────────────────────────────────────────────────────────────
  { v9: 'pcfAssessmentAndMethodology[0].pcfMethodology[0].standards[0].crossSectoralStandards', v7: 'pcf.crossSectoralStandardsUsed', label: 'Cross-Sectoral Standards', equivalent: crossSectoralEquivalent, coerce: coerceCrossSectoral },
  { v9: 'pcfAssessmentAndMethodology[0].pcfMethodology[0].standards[0].productOrSectorSpecificRules', v7: 'pcf.productOrSectorSpecificRules', label: 'Product/Sector Rules', equivalent: rulesEquivalent, coerce: coerceRules },
  { v9: 'pcfAssessmentAndMethodology[0].pcfMethodology[0].gwpCharacterizationFactorDetails[0].ipccCharacterizationFactors', v7: 'pcf.extWBCSD_characterizationFactors', label: 'Characterization Factors' },
  { v9: 'pcfAssessmentAndMethodology[0].pcfMethodology[0].allocationInForeground[0].allocationWasteIncineration', v7: 'pcf.extTFS_allocationWasteIncineration', label: 'Allocation Waste Incineration', equivalent: allocationWasteEquivalent, coerce: coerceAllocationWaste },
  { v9: 'pcfAssessmentAndMethodology[0].pcfMethodology[0].allocationInForeground[0].allocationRulesDescription', v7: 'pcf.extWBCSD_allocationRulesDescription', label: 'Allocation Rules' },

  // ── General ─────────────────────────────────────────────────────────────────
  { v9: 'general[0].comment', v7: 'comment', label: 'Comment' },
  { v9: 'general[0].pcfLegalStatement', v7: 'pcfLegalStatement', label: 'Legal Statement' },

  // ── Packaging ─────────────────────────────────────────────────────────────
  { v9: 'productLifeCycleStagesAndEmissions[0].packagingStage[0].packagingEmissionsIncluded', v7: 'pcf.extWBCSD_packagingEmissionsIncluded', label: 'Packaging Emissions Included' },
  { v9: 'productLifeCycleStagesAndEmissions[0].packagingStage[0].packagingPcfExcludingBiogenicUptake', v7: 'pcf.extWBCSD_packagingGhgEmissions', label: 'Packaging GHG Emissions' },

  // ── Carbon content (partial — v9 has additional fields) ────────────────────
  { v9: 'carbonContent[0].carbonContentTotal', v7: 'pcf.carbonContentTotal', label: 'Carbon Content Total' },
  { v9: 'carbonContent[0].fossilCarbonContent', v7: 'pcf.extWBCSD_fossilCarbonContent', label: 'Fossil Carbon Content' },
  { v9: 'carbonContent[0].biogenicCarbonContent', v7: 'pcf.carbonContentBiogenic', label: 'Biogenic Carbon Content' },
];

// ---------------------------------------------------------------------------
// Path access helpers
// ---------------------------------------------------------------------------

/**
 * Tokenizes a dot/bracket path into individual keys.
 * `a[0].b.c` → ['a', '0', 'b', 'c']
 */
function tokenizePath(path: string): string[] {
  return path
    .replace(/\[(\d+)\]/g, '.$1')
    .split('.')
    .filter((segment) => segment.length > 0);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Reads a value from an object using a path like `a[0].b.c`.
 * Returns `undefined` if any segment along the path is missing.
 */
export function getNestedValue(obj: unknown, path: string): unknown {
  const tokens = tokenizePath(path);
  let current: unknown = obj;

  for (const token of tokens) {
    if (current == null) return undefined;
    if (Array.isArray(current)) {
      const index = Number(token);
      if (!Number.isInteger(index)) return undefined;
      current = current[index];
    } else if (isRecord(current)) {
      current = current[token];
    } else {
      return undefined;
    }
  }

  return current;
}

/**
 * Writes a value into an object at a path like `a[0].b.c`, immutably.
 * Intermediate containers are created as needed: a numeric segment produces an
 * array, anything else produces a plain object. Returns a new root object.
 */
export function setNestedValue(
  obj: Record<string, unknown>,
  path: string,
  value: unknown,
): Record<string, unknown> {
  const tokens = tokenizePath(path);
  if (tokens.length === 0) return obj;

  const root: Record<string, unknown> | unknown[] = Array.isArray(obj)
    ? [...obj]
    : { ...obj };

  let cursor: Record<string, unknown> | unknown[] = root;

  for (let i = 0; i < tokens.length - 1; i++) {
    const token = tokens[i];
    const nextToken = tokens[i + 1];
    const nextIsIndex = /^\d+$/.test(nextToken);

    if (Array.isArray(cursor)) {
      const index = Number(token);
      const existing = cursor[index];
      const clone = Array.isArray(existing)
        ? [...existing]
        : isRecord(existing)
        ? { ...existing }
        : nextIsIndex
        ? []
        : {};
      cursor[index] = clone;
      cursor = clone as Record<string, unknown> | unknown[];
    } else {
      const existing = (cursor as Record<string, unknown>)[token];
      const clone = Array.isArray(existing)
        ? [...existing]
        : isRecord(existing)
        ? { ...existing }
        : nextIsIndex
        ? []
        : {};
      (cursor as Record<string, unknown>)[token] = clone;
      cursor = clone as Record<string, unknown> | unknown[];
    }
  }

  const lastToken = tokens[tokens.length - 1];
  if (Array.isArray(cursor)) {
    cursor[Number(lastToken)] = value;
  } else {
    (cursor as Record<string, unknown>)[lastToken] = value;
  }

  return root as Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Cross-version extraction
// ---------------------------------------------------------------------------

/**
 * Builds a partial v7 object from v9 data, using {@link PCF_CROSS_VERSION_FIELD_MAP}.
 * Only fields that actually carry a value in the v9 data are written.
 */
export function extractV7CompatibleFields(
  v9Data: Record<string, unknown>,
): Record<string, unknown> {
  let result: Record<string, unknown> = {};
  for (const entry of PCF_CROSS_VERSION_FIELD_MAP) {
    const raw = getNestedValue(v9Data, entry.v9);
    if (raw !== undefined) {
      const value = entry.coerce ? entry.coerce(raw, 'v7') : raw;
      result = setNestedValue(result, entry.v7, value);
    }
  }
  return result;
}

/**
 * Builds a partial v9 object from v7 data, using {@link PCF_CROSS_VERSION_FIELD_MAP}.
 * Only fields that actually carry a value in the v7 data are written.
 */
export function extractV9CompatibleFields(
  v7Data: Record<string, unknown>,
): Record<string, unknown> {
  let result: Record<string, unknown> = {};
  for (const entry of PCF_CROSS_VERSION_FIELD_MAP) {
    const raw = getNestedValue(v7Data, entry.v7);
    if (raw !== undefined) {
      const value = entry.coerce ? entry.coerce(raw, 'v9') : raw;
      result = setNestedValue(result, entry.v9, value);
    }
  }
  return result;
}

/**
 * Coerces a resolved value to the spelling valid for the target version, using
 * the field's `coerce` hook (keyed by its v9 path). Returns the value unchanged
 * when the field has no coercion rule. Used when applying a reconciliation
 * choice to both versions so each one stores a valid representation.
 */
export function coerceCrossVersionValue(
  fieldKey: string,
  value: unknown,
  target: 'v9' | 'v7',
): unknown {
  const entry = PCF_CROSS_VERSION_FIELD_MAP.find((e) => e.v9 === fieldKey);
  return entry?.coerce ? entry.coerce(value, target) : value;
}

// ---------------------------------------------------------------------------
// Difference detection
// ---------------------------------------------------------------------------

/** Deep value equality based on stable JSON serialization. */
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Treats `undefined`, `null` and empty string as "no value provided". */
function isEmpty(value: unknown): boolean {
  return value === undefined || value === null || value === '';
}

/**
 * Compares v9 and v7 data across every shared field and returns the entries
 * whose values diverge. A field is only reported when the values differ AND at
 * least one side carries a non-empty value (so an unset field on both sides is
 * never flagged).
 */
export function findCrossVersionDifferences(
  v9Data: Record<string, unknown>,
  v7Data: Record<string, unknown>,
): FieldDifference[] {
  const differences: FieldDifference[] = [];

  for (const entry of PCF_CROSS_VERSION_FIELD_MAP) {
    const v9Value = getNestedValue(v9Data, entry.v9);
    const v7Value = getNestedValue(v7Data, entry.v7);

    if (isEmpty(v9Value) && isEmpty(v7Value)) continue;
    if (deepEqual(v9Value, v7Value)) continue;
    // Cross-version synonyms (e.g. Allocation Waste Incineration) are the same
    // choice spelled differently — not a difference to reconcile.
    if (entry.equivalent?.(v9Value, v7Value)) continue;

    differences.push({
      fieldKey: entry.v9,
      label: entry.label,
      v9Path: entry.v9,
      v7Path: entry.v7,
      v9Value,
      v7Value,
      constraints: entry.constraints,
    });
  }

  return differences;
}

// ---------------------------------------------------------------------------
// Constraint warnings
// ---------------------------------------------------------------------------

/** Result of validating a resolved value against per-version constraints. */
export interface ConstraintWarning {
  /** True when the value falls outside the v7 allowed range. */
  outOfV7Range: boolean;
  /** True when the value falls outside the v9 allowed range. */
  outOfV9Range: boolean;
}

/**
 * Checks a numeric value against the v7 and v9 constraints of a field.
 * Returns which version's range (if any) the value violates. Non-numeric values
 * and fields without constraints never produce a warning.
 */
export function getConstraintWarning(
  value: unknown,
  constraints?: CrossVersionConstraint,
): ConstraintWarning {
  const result: ConstraintWarning = { outOfV7Range: false, outOfV9Range: false };
  if (!constraints || typeof value !== 'number' || Number.isNaN(value)) {
    return result;
  }

  if (constraints.v7) {
    const { min, max } = constraints.v7;
    if ((min !== undefined && value < min) || (max !== undefined && value > max)) {
      result.outOfV7Range = true;
    }
  }
  if (constraints.v9) {
    const { min, max } = constraints.v9;
    if ((min !== undefined && value < min) || (max !== undefined && value > max)) {
      result.outOfV9Range = true;
    }
  }

  return result;
}
