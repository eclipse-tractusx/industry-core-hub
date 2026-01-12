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

import type { GovernanceConfig, GovernanceConstraint, GovernanceRule } from '@/services/EnvironmentService';

// ODRL constraint interface for API compatibility
export interface OdrlConstraint {
  "odrl:leftOperand": { "@id": string };
  "odrl:operator": { "@id": string };
  "odrl:rightOperand": string;
}

// ODRL rule interface for API compatibility
export interface OdrlRule {
  "odrl:action": { "@id": string };
  "odrl:constraint"?: {
    "odrl:and"?: OdrlConstraint[];
    "odrl:or"?: OdrlConstraint[];
  } | OdrlConstraint; // Single constraint or logical constraint group
}

// ODRL policy interface for API compatibility
export interface OdrlPolicy {
  "odrl:permission": OdrlRule;
  "odrl:prohibition": OdrlRule[];
  "odrl:obligation": OdrlRule[];
}

/**
 * Convert governance constraint to ODRL format
 */
function convertToOdrlConstraint(constraint: GovernanceConstraint): OdrlConstraint {
  return {
    "odrl:leftOperand": { "@id": constraint.leftOperand },
    "odrl:operator": { "@id": constraint.operator },
    "odrl:rightOperand": constraint.rightOperand
  };
}

/**
 * Generate all permutations of an array
 */
function generatePermutations<T>(arr: T[]): T[][] {
  if (arr.length <= 1) return [arr];
  
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i++) {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
    const perms = generatePermutations(rest);
    for (const perm of perms) {
      result.push([arr[i], ...perm]);
    }
  }
  return result;
}

/**
 * Generate all combinations (subsets) of constraints
 */
function generateCombinations<T>(arr: T[]): T[][] {
  const result: T[][] = [];
  
  // Generate all possible combinations (1 to n elements)
  for (let size = 1; size <= arr.length; size++) {
    const combinations = getCombinationsOfSize(arr, size);
    result.push(...combinations);
  }
  
  return result;
}

/**
 * Get all combinations of a specific size
 */
function getCombinationsOfSize<T>(arr: T[], size: number): T[][] {
  if (size === 1) return arr.map(item => [item]);
  if (size === arr.length) return [arr];
  
  const result: T[][] = [];
  
  for (let i = 0; i <= arr.length - size; i++) {
    const smallerCombinations = getCombinationsOfSize(arr.slice(i + 1), size - 1);
    for (const combination of smallerCombinations) {
      result.push([arr[i], ...combination]);
    }
  }
  
  return result;
}

/**
 * Generate all permutations of all combinations
 */
function generateAllVariants<T>(arr: T[]): T[][] {
  const combinations = generateCombinations(arr);
  const result: T[][] = [];
  
  for (const combination of combinations) {
    const permutations = generatePermutations(combination);
    result.push(...permutations);
  }
  
  return result;
}

/**
 * Create ODRL constraint structure based on logical constraint type and constraints
 */
function createOdrlConstraintStructure(
  odrlConstraints: OdrlConstraint[],
  logicalConstraint?: string
): OdrlRule["odrl:constraint"] {
  // Single constraint - no logical wrapper needed
  if (odrlConstraints.length === 1) {
    return odrlConstraints[0];
  }

  // Multiple constraints - use logical constraint (default to AND)
  const logic = logicalConstraint?.toLowerCase() === 'odrl:or' ? 'odrl:or' : 'odrl:and';
  
  if (logic === 'odrl:or') {
    return { "odrl:or": odrlConstraints };
  } else {
    return { "odrl:and": odrlConstraints };
  }
}

/**
 * Process rules (permission, prohibition, or obligation) and generate ODRL constraints
 */
function processRules(
  rules: GovernanceRule[],
  ruleType: 'permission' | 'prohibition' | 'obligation',
  isStrict: boolean
): OdrlPolicy[] {
  if (!rules || rules.length === 0) {
    return [];
  }

  const result: OdrlPolicy[] = [];
  
  for (const rule of rules) {
    if (!rule.constraints || rule.constraints.length === 0) {
      continue;
    }

    // Convert constraints to ODRL format
    const odrlConstraints = rule.constraints.map(convertToOdrlConstraint);

    if (isStrict) {
      // Strict mode: use exact order as configured
      const odrlRule: OdrlRule = {
        "odrl:action": { "@id": rule.action },
        "odrl:constraint": createOdrlConstraintStructure(odrlConstraints, rule.LogicalConstraint)
      };

      const policy: OdrlPolicy = {
        "odrl:permission": ruleType === 'permission' ? odrlRule : { "odrl:action": { "@id": "odrl:use" } },
        "odrl:prohibition": ruleType === 'prohibition' ? [odrlRule] : [],
        "odrl:obligation": ruleType === 'obligation' ? [odrlRule] : []
      };

      result.push(policy);
    } else {
      // Non-strict mode: generate all permutations of all combinations
      const variants = generateAllVariants(odrlConstraints);
      
      for (const variant of variants) {
        const odrlRule: OdrlRule = {
          "odrl:action": { "@id": rule.action },
          "odrl:constraint": createOdrlConstraintStructure(variant, rule.LogicalConstraint)
        };

        const policy: OdrlPolicy = {
          "odrl:permission": ruleType === 'permission' ? odrlRule : { "odrl:action": { "@id": "odrl:use" } },
          "odrl:prohibition": ruleType === 'prohibition' ? [odrlRule] : [],
          "odrl:obligation": ruleType === 'obligation' ? [odrlRule] : []
        };

        result.push(policy);
      }
    }
  }

  return result;
}

/**
 * Convert governance policy to ODRL policies with permutations
 */
export function generateOdrlPolicies(
  governanceConfig: GovernanceConfig[],
  semanticId?: string
): OdrlPolicy[] {
  // Find the matching governance config
  const config = semanticId 
    ? governanceConfig.find(c => c.semanticid === semanticId)
    : governanceConfig[0]; // Use first if no semantic ID specified
  
  if (!config || !config.policies || config.policies.length === 0) {
    return [];
  }

  const result: OdrlPolicy[] = [];

  for (const policy of config.policies) {
    // Process permissions
    const permissionRules = Array.isArray(policy.permission) ? policy.permission : [policy.permission];
    const permissionPolicies = processRules(permissionRules, 'permission', policy.strict);
    result.push(...permissionPolicies);

    // Process prohibitions  
    const prohibitionRules = Array.isArray(policy.prohibition) ? policy.prohibition : [policy.prohibition];
    const prohibitionPolicies = processRules(prohibitionRules, 'prohibition', policy.strict);
    result.push(...prohibitionPolicies);

    // Process obligations
    const obligationRules = Array.isArray(policy.obligation) ? policy.obligation : [policy.obligation];
    const obligationPolicies = processRules(obligationRules, 'obligation', policy.strict);
    result.push(...obligationPolicies);
  }

  return result;
}

/**
 * Get governance policy for a specific semantic ID
 */
export function getGovernancePolicyForSemanticId(
  governanceConfig: GovernanceConfig[],
  semanticId: string
): OdrlPolicy[] {
  return generateOdrlPolicies(governanceConfig, semanticId);
}

/**
 * Get default governance policy (first configuration)
 */
export function getDefaultGovernancePolicy(
  governanceConfig: GovernanceConfig[]
): OdrlPolicy[] {
  return generateOdrlPolicies(governanceConfig);
}
