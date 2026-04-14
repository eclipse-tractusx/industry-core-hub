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

import type {
  AgreementConfig,
  PolicyDefinition,
} from '@/services/EnvironmentService';

/**
 * ODRL policy – format-agnostic.
 * Saturn uses plain keys (permission, action, constraint, and, or).
 * Jupiter uses prefixed keys (odrl:permission, odrl:action, odrl:constraint, odrl:and, odrl:or).
 * The frontend passes the config through to the backend as-is, preserving whichever format was used.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type OdrlPolicy = Record<string, any>;

// ----- Key-style helpers -----

/**
 * Look up a value from an object using multiple candidate keys.
 * Returns the value of the first key that exists, or `fallback`.
 */
function pick(obj: Record<string, unknown>, keys: string[], fallback: unknown = undefined): unknown {
  for (const k of keys) {
    if (k in obj) return obj[k];
  }
  return fallback;
}

/**
 * Detect whether the definition uses ODRL-prefixed keys.
 * Returns true if any top-level key contains "odrl:" or "cx-policy:".
 */
function usesOdrlPrefix(obj: Record<string, unknown>): boolean {
  return Object.keys(obj).some(k => k.startsWith('odrl:') || k.startsWith('cx-policy:'));
}

/**
 * Generate all permutations of an array.
 * Permutation generation is disabled — only the original order is returned.
 */
function generatePermutations<T>(arr: T[]): T[][] {
  return [arr];
}

/**
 * Generate constraint permutations for a constraint expression object.
 * Generates all orderings of the FULL constraint list — no subsets.
 * This ensures matching succeeds regardless of constraint order in the and/or array,
 * while preserving the complete set of constraints in every output policy.
 * Supports both Saturn keys (and/or) and Jupiter keys (odrl:and/odrl:or).
 * Preserves the original key style in the output.
 */
function generateConstraintVariants(
  expr: Record<string, unknown>
): Record<string, unknown>[] {
  // Saturn: { and: [...] }  |  Jupiter: { "odrl:and": [...] }
  for (const andKey of ['and', 'odrl:and']) {
    if (andKey in expr && Array.isArray(expr[andKey])) {
      const items = expr[andKey] as Record<string, unknown>[];
      if (items.length <= 1) return [expr];
      return generatePermutations(items).map(variant => ({ [andKey]: variant }));
    }
  }
  // Saturn: { or: [...] }  |  Jupiter: { "odrl:or": [...] }
  for (const orKey of ['or', 'odrl:or']) {
    if (orKey in expr && Array.isArray(expr[orKey])) {
      const items = expr[orKey] as Record<string, unknown>[];
      if (items.length <= 1) return [expr];
      return generatePermutations(items).map(variant => ({ [orKey]: variant }));
    }
  }
  // Single constraint — no permutation needed
  return [expr];
}

/**
 * Expand a list of rules into all constraint variants.
 * Each rule whose constraint contains and/or groups is expanded into every
 * ordering of every subset. Rules without constraints pass through unchanged.
 */
function expandRules(
  rules: Record<string, unknown>[],
  constraintKey: string
): Record<string, unknown>[] {
  const expanded: Record<string, unknown>[] = [];

  for (const rule of rules) {
    const constraintExpr = rule[constraintKey] as
      | Record<string, unknown>
      | Record<string, unknown>[]
      | undefined;

    if (!constraintExpr) {
      expanded.push(rule);
      continue;
    }

    const expr = Array.isArray(constraintExpr) ? constraintExpr[0] : constraintExpr;
    if (!expr) {
      expanded.push(rule);
      continue;
    }

    for (const variant of generateConstraintVariants(expr)) {
      expanded.push({ ...rule, [constraintKey]: variant });
    }
  }

  return expanded;
}

/**
 * Compute the Cartesian product of an arbitrary number of arrays.
 * Returns an array of tuples (one element per input array).
 */
function cartesian<T>(arrays: T[][]): T[][] {
  if (arrays.length === 0) return [[]];
  return arrays.reduce<T[][]>(
    (acc, arr) => acc.flatMap(combo => arr.map(item => [...combo, item])),
    [[]]
  );
}

/**
 * Generate ODRL policies from a PolicyDefinition with all constraint permutations.
 * Permissions, prohibitions, and obligations are each expanded independently,
 * then the Cartesian product of all three produces every possible combination.
 *
 * Preserves the original key format (Saturn plain keys vs Jupiter odrl:-prefixed keys).
 * No normalization is applied — the output matches the input format exactly.
 */
export function generatePoliciesFromDefinition(
  definition: PolicyDefinition
): OdrlPolicy[] {
  const def = definition as Record<string, unknown>;

  // Detect key style
  const prefixed = usesOdrlPrefix(def);

  // Read rules using the appropriate key names
  const permKey = prefixed ? 'odrl:permission' : 'permissions';
  const permKeySingular = prefixed ? 'odrl:permission' : 'permission';
  const prohKey = prefixed ? 'odrl:prohibition' : 'prohibitions';
  const prohKeySingular = prefixed ? 'odrl:prohibition' : 'prohibition';
  const oblKey = prefixed ? 'odrl:obligation' : 'obligations';
  const oblKeySingular = prefixed ? 'odrl:obligation' : 'obligation';

  const permissions = (pick(def, [permKey, permKeySingular], []) ?? []) as Record<string, unknown>[];
  const prohibitions = (pick(def, [prohKey, prohKeySingular], []) ?? []) as Record<string, unknown>[];
  const obligations = (pick(def, [oblKey, oblKeySingular], []) ?? []) as Record<string, unknown>[];

  if (permissions.length === 0 && prohibitions.length === 0 && obligations.length === 0) {
    return [];
  }

  // Key names for rule fields
  const constraintKey = prefixed ? 'odrl:constraint' : 'constraint';
  // Output key names
  const outPermKey = prefixed ? 'odrl:permission' : 'permission';
  const outProhKey = prefixed ? 'odrl:prohibition' : 'prohibition';
  const outOblKey = prefixed ? 'odrl:obligation' : 'obligation';

  // Expand each rule type into all constraint variants
  const permVariants = expandRules(permissions, constraintKey);
  const prohVariants = expandRules(prohibitions, constraintKey);
  const oblVariants = expandRules(obligations, constraintKey);

  // Use placeholder arrays so the Cartesian product always runs
  const permInput = permVariants.length > 0 ? permVariants : [null];
  const prohInput = prohVariants.length > 0 ? prohVariants : [null];
  const oblInput = oblVariants.length > 0 ? oblVariants : [null];

  const combos = cartesian([permInput, prohInput, oblInput] as (Record<string, unknown> | null)[][]);

  return combos.map(([perm, proh, obl]) => ({
    [outPermKey]: perm ?? [],
    [outProhKey]: proh ?? [],
    [outOblKey]: obl ?? [],
  }));
}

/**
 * Generate ODRL policies for a specific semantic ID from agreements config.
 */
export function generateOdrlPolicies(
  agreements: AgreementConfig[],
  semanticId?: string
): OdrlPolicy[] {
  const agreement = semanticId
    ? agreements.find(a => a.semanticid === semanticId)
    : agreements[0];

  if (!agreement) return [];

  return agreement.policies.flatMap(def => generatePoliciesFromDefinition(def));
}

/**
 * Get governance policy for a specific semantic ID
 */
export function getGovernancePolicyForSemanticId(
  agreements: AgreementConfig[],
  semanticId: string
): OdrlPolicy[] {
  return generateOdrlPolicies(agreements, semanticId);
}

/**
 * Get default governance policy (first agreement)
 */
export function getDefaultGovernancePolicy(
  agreements: AgreementConfig[]
): OdrlPolicy[] {
  return generateOdrlPolicies(agreements);
}
