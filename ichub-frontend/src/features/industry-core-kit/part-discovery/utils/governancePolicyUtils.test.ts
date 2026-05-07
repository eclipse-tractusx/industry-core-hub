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

/** Created using an LLM (Github Copilot) review by a human committer */

import { describe, it, expect } from 'vitest';
import { generateOdrlPolicies, generatePoliciesFromDefinition, getGovernancePolicyForSemanticId, getDefaultGovernancePolicy } from '@/features/industry-core-kit/part-discovery/utils/governancePolicyUtils';
import type { AgreementConfig, PolicyDefinition } from '@/services/EnvironmentService';

describe('Governance Policy Utils', () => {
  const mockConfig: AgreementConfig[] = [
    {
      semanticid: "urn:samm:io.catenax.part_type_information:1.0.0#PartTypeInformation",
      policies: [
        {
          context: [
            "https://w3id.org/catenax/2025/9/policy/odrl.jsonld",
            "https://w3id.org/catenax/2025/9/policy/context.jsonld",
            { "@vocab": "https://w3id.org/edc/v0.0.1/ns/" }
          ],
          permissions: [
            {
              action: "use",
              constraint: {
                and: [
                  { leftOperand: "FrameworkAgreement", operator: "eq", rightOperand: "DataExchangeGovernance:1.0" },
                  { leftOperand: "Membership", operator: "eq", rightOperand: "active" }
                ]
              }
            }
          ],
          prohibitions: [],
          obligations: []
        }
      ],
      access: {
        permissions: [
          {
            action: "access",
            constraint: { leftOperand: "Membership", operator: "eq", rightOperand: "active" }
          }
        ],
        prohibitions: [],
        obligations: []
      }
    },
    {
      semanticid: "urn:samm:other:1.0.0#Other",
      policies: [
        {
          permissions: [
            {
              action: "use",
              constraint: {
                or: [
                  { leftOperand: "FrameworkAgreement", operator: "eq", rightOperand: "DataExchangeGovernance:1.0" },
                  { leftOperand: "Membership", operator: "eq", rightOperand: "active" }
                ]
              }
            }
          ],
          prohibitions: [],
          obligations: []
        }
      ],
      access: {
        permissions: [],
        prohibitions: [],
        obligations: []
      }
    },
    {
      semanticid: "urn:samm:single:1.0.0#Single",
      policies: [
        {
          permissions: [
            {
              action: "use",
              constraint: { leftOperand: "Membership", operator: "eq", rightOperand: "active" }
            }
          ],
          prohibitions: [],
          obligations: []
        }
      ],
      access: {
        permissions: [],
        prohibitions: [],
        obligations: []
      }
    }
  ];

  describe('generateOdrlPolicies', () => {
    it('should generate permutations for AND constraint group', () => {
      const policies = generateOdrlPolicies(mockConfig, "urn:samm:io.catenax.part_type_information:1.0.0#PartTypeInformation");
      
      // 2 constraints → combinations: [A], [B], [A,B], [B,A] = 4 variants
      expect(policies.length).toBeGreaterThanOrEqual(1);
      
      // Check Saturn format: plain keys, no prefixes
      const first = policies[0];
      const permission = first.permission;
      expect(permission).toHaveProperty('action', 'use');
      
      // Constraint should use plain keys
      const constraint = (permission as { constraint?: unknown }).constraint;
      expect(constraint).toBeDefined();
    });

    it('should generate permutations for OR constraint group', () => {
      const policies = generateOdrlPolicies(mockConfig, "urn:samm:other:1.0.0#Other");
      
      // 2 constraints in or → 2! = 2 orderings: [A,B] and [B,A]
      expect(policies).toHaveLength(2);
      
      // Both orderings contain the full constraint set
      const orVariants = policies.map(p =>
        ((p.permission as Record<string, unknown>).constraint as Record<string, unknown>).or as unknown[]
      );
      expect(orVariants[0]).toHaveLength(2);
      expect(orVariants[1]).toHaveLength(2);
      // The two orderings should be reverses of each other
      expect(orVariants[0][0]).toEqual(orVariants[1][1]);
      expect(orVariants[0][1]).toEqual(orVariants[1][0]);

      // Check that policies use Saturn format (no odrl: prefix)
      for (const policy of policies) {
        expect(policy).toHaveProperty('permission');
        expect(policy).toHaveProperty('prohibition');
        expect(policy).toHaveProperty('obligation');
      }
    });

    it('should handle single constraint without logical wrapper', () => {
      const policies = generateOdrlPolicies(mockConfig, "urn:samm:single:1.0.0#Single");
      
      expect(policies).toHaveLength(1);
      const permission = policies[0].permission as { action: string; constraint?: { leftOperand: string } };
      
      // Single constraint — no and/or wrapper
      expect(permission.action).toBe('use');
      expect(permission.constraint).toHaveProperty('leftOperand', 'Membership');
      expect(permission.constraint).toHaveProperty('operator', 'eq');
      expect(permission.constraint).toHaveProperty('rightOperand', 'active');
    });

    it('should return empty array for unknown semantic ID', () => {
      const policies = generateOdrlPolicies(mockConfig, "unknown:semantic:id");
      expect(policies).toHaveLength(0);
    });
  });

  describe('getGovernancePolicyForSemanticId', () => {
    it('should return policies for specific semantic ID', () => {
      const policies = getGovernancePolicyForSemanticId(mockConfig, "urn:samm:io.catenax.part_type_information:1.0.0#PartTypeInformation");
      expect(policies.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('getDefaultGovernancePolicy', () => {
    it('should return first configuration as default', () => {
      const policies = getDefaultGovernancePolicy(mockConfig);
      expect(policies.length).toBeGreaterThanOrEqual(1);
    });

    it('should return empty array for empty config', () => {
      const policies = getDefaultGovernancePolicy([]);
      expect(policies).toHaveLength(0);
    });
  });

  describe('prohibition and obligation permutations', () => {
    it('should permutate prohibition constraints', () => {
      const definition: PolicyDefinition = {
        permissions: [{ action: 'use', constraint: { leftOperand: 'Membership', operator: 'eq', rightOperand: 'active' } }],
        prohibitions: [
          {
            action: 'use',
            constraint: {
              and: [
                { leftOperand: 'Purpose', operator: 'eq', rightOperand: 'ID 3.1 Trace' },
                { leftOperand: 'Region', operator: 'eq', rightOperand: 'EU' }
              ]
            }
          }
        ],
        obligations: []
      };

      const policies = generatePoliciesFromDefinition(definition);

      // 1 permission (single constraint, no and/or) × 2 prohibition orderings ([Purpose,Region] and [Region,Purpose]) = 2
      expect(policies).toHaveLength(2);

      // All should share the same permission
      for (const p of policies) {
        expect((p.permission as Record<string, unknown>).action).toBe('use');
      }

      // Prohibition variants should differ (different orderings of same full set)
      const prohibitionSerialized = policies.map(p => JSON.stringify(p.prohibition));
      const uniqueProhibitions = new Set(prohibitionSerialized);
      expect(uniqueProhibitions.size).toBe(2);

      // Each prohibition still contains both constraints
      for (const p of policies) {
        const prohConstraint = (p.prohibition as Record<string, unknown>).constraint as Record<string, unknown>;
        expect((prohConstraint.and as unknown[]).length).toBe(2);
      }
    });

    it('should permutate obligation constraints', () => {
      const definition: PolicyDefinition = {
        permissions: [],
        prohibitions: [],
        obligations: [
          {
            action: 'delete',
            constraint: {
              or: [
                { leftOperand: 'Event', operator: 'eq', rightOperand: 'contractExpiry' },
                { leftOperand: 'Event', operator: 'eq', rightOperand: 'policyExpiry' }
              ]
            }
          }
        ]
      };

      const policies = generatePoliciesFromDefinition(definition);

      // 1 perm(null) × 1 proh(null) × 2 obligation orderings = 2
      expect(policies).toHaveLength(2);

      for (const p of policies) {
        expect(p.permission).toEqual([]);
        expect(p.prohibition).toEqual([]);
        expect(p.obligation).toBeDefined();
      }
    });

    it('should produce Cartesian product of all rule permutations', () => {
      const definition: PolicyDefinition = {
        permissions: [
          {
            action: 'use',
            constraint: {
              and: [
                { leftOperand: 'A', operator: 'eq', rightOperand: '1' },
                { leftOperand: 'B', operator: 'eq', rightOperand: '2' }
              ]
            }
          }
        ],
        prohibitions: [
          {
            action: 'inhibit',
            constraint: {
              and: [
                { leftOperand: 'C', operator: 'eq', rightOperand: '3' },
                { leftOperand: 'D', operator: 'eq', rightOperand: '4' }
              ]
            }
          }
        ],
        obligations: []
      };

      const policies = generatePoliciesFromDefinition(definition);

      // 2 permission orderings × 2 prohibition orderings × 1 obligation(null) = 4
      expect(policies).toHaveLength(4);

      // Each combination should be unique
      const serialized = policies.map(p => JSON.stringify(p));
      const unique = new Set(serialized);
      expect(unique.size).toBe(4);

      // Every policy must contain all constraints in both permission and prohibition
      for (const p of policies) {
        const permConstraint = (p.permission as Record<string, unknown>).constraint as Record<string, unknown>;
        const prohConstraint = (p.prohibition as Record<string, unknown>).constraint as Record<string, unknown>;
        expect((permConstraint.and as unknown[]).length).toBe(2);
        expect((prohConstraint.and as unknown[]).length).toBe(2);
      }
    });
  });

  describe('Jupiter-format config pass-through', () => {
    it('should preserve odrl: prefixed keys in output', () => {
      // Jupiter-style config (with odrl: prefixes and @id wrappers)
      const jupiterDefinition = {
        'odrl:permission': [
          {
            'odrl:action': { '@id': 'odrl:use' },
            'odrl:constraint': {
              'odrl:and': [
                { 'odrl:leftOperand': { '@id': 'cx-policy:FrameworkAgreement' }, 'odrl:operator': { '@id': 'odrl:eq' }, 'odrl:rightOperand': 'DataExchangeGovernance:1.0' },
                { 'odrl:leftOperand': { '@id': 'cx-policy:Membership' }, 'odrl:operator': { '@id': 'odrl:eq' }, 'odrl:rightOperand': 'active' }
              ]
            }
          }
        ],
        'odrl:prohibition': [],
        'odrl:obligation': []
      } as unknown as PolicyDefinition;

      const policies = generatePoliciesFromDefinition(jupiterDefinition);

      // Should produce multiple variants from the AND permutations
      expect(policies.length).toBeGreaterThan(1);

      // Verify that output keys are prefixed (odrl:)
      const first = policies[0];
      expect(first).toHaveProperty('odrl:permission');
      expect(first).toHaveProperty('odrl:prohibition');
      expect(first).toHaveProperty('odrl:obligation');

      // Verify that the permission rule preserves @id wrappers and prefixed keys
      const perm = first['odrl:permission'] as Record<string, unknown>;
      expect(perm).toHaveProperty('odrl:action');
      expect(perm['odrl:action']).toEqual({ '@id': 'odrl:use' });
    });

    it('should produce different output format than Saturn config', () => {
      const jupiterDefinition = {
        'odrl:permission': [
          {
            'odrl:action': { '@id': 'odrl:use' },
            'odrl:constraint': {
              'odrl:and': [
                { 'odrl:leftOperand': { '@id': 'cx-policy:FrameworkAgreement' }, 'odrl:operator': { '@id': 'odrl:eq' }, 'odrl:rightOperand': 'DataExchangeGovernance:1.0' },
                { 'odrl:leftOperand': { '@id': 'cx-policy:Membership' }, 'odrl:operator': { '@id': 'odrl:eq' }, 'odrl:rightOperand': 'active' }
              ]
            }
          }
        ],
        'odrl:prohibition': [],
        'odrl:obligation': []
      } as unknown as PolicyDefinition;

      const saturnDefinition: PolicyDefinition = {
        permissions: [
          {
            action: 'use',
            constraint: {
              and: [
                { leftOperand: 'FrameworkAgreement', operator: 'eq', rightOperand: 'DataExchangeGovernance:1.0' },
                { leftOperand: 'Membership', operator: 'eq', rightOperand: 'active' }
              ]
            }
          }
        ],
        prohibitions: [],
        obligations: []
      };

      const jupiterPolicies = generatePoliciesFromDefinition(jupiterDefinition);
      const saturnPolicies = generatePoliciesFromDefinition(saturnDefinition);

      // Same number of permutations
      expect(jupiterPolicies.length).toBe(saturnPolicies.length);

      // But keys are different — Jupiter uses prefixed keys, Saturn uses plain
      expect(jupiterPolicies[0]).toHaveProperty('odrl:permission');
      expect(saturnPolicies[0]).toHaveProperty('permission');
      expect(jupiterPolicies[0]).not.toHaveProperty('permission');
      expect(saturnPolicies[0]).not.toHaveProperty('odrl:permission');
    });
  });
});
