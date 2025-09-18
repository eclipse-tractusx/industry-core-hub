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

import { describe, it, expect } from 'vitest';
import { generateOdrlPolicies, getGovernancePolicyForSemanticId, getDefaultGovernancePolicy } from '../utils/governancePolicyUtils';
import type { GovernanceConfig } from '../../../services/EnvironmentService';

describe('Governance Policy Utils', () => {
  const mockConfig: GovernanceConfig[] = [
    {
      semanticid: "urn:samm:io.catenax.part_type_information:1.0.0#PartTypeInformation",
      policies: [
        {
          strict: true,
          permission: [
            {
              action: "odrl:use",
              LogicalConstraint: "odrl:and",
              constraints: [
                {
                  leftOperand: "cx-policy:FrameworkAgreement",
                  operator: "odrl:eq",
                  rightOperand: "DataExchangeGovernance:1.0"
                },
                {
                  leftOperand: "cx-policy:Membership", 
                  operator: "odrl:eq",
                  rightOperand: "active"
                }
              ]
            }
          ],
          prohibition: [],
          obligation: []
        }
      ]
    },
    {
      semanticid: "urn:samm:other:1.0.0#Other",
      policies: [
        {
          strict: false,
          permission: [
            {
              action: "odrl:use",
              LogicalConstraint: "odrl:or", // Test OR logic
              constraints: [
                {
                  leftOperand: "cx-policy:FrameworkAgreement",
                  operator: "odrl:eq", 
                  rightOperand: "DataExchangeGovernance:1.0"
                },
                {
                  leftOperand: "cx-policy:Membership",
                  operator: "odrl:eq",
                  rightOperand: "active"
                }
              ]
            }
          ],
          prohibition: [],
          obligation: []
        }
      ]
    },
    {
      semanticid: "urn:samm:single:1.0.0#Single",
      policies: [
        {
          strict: true,
          permission: [
            {
              action: "odrl:use",
              // No LogicalConstraint - single constraint
              constraints: [
                {
                  leftOperand: "cx-policy:Membership",
                  operator: "odrl:eq",
                  rightOperand: "active"
                }
              ]
            }
          ],
          prohibition: [],
          obligation: []
        }
      ]
    }
  ];

  describe('generateOdrlPolicies', () => {
    it('should generate single policy in strict mode with AND logic', () => {
      const policies = generateOdrlPolicies(mockConfig, "urn:samm:io.catenax.part_type_information:1.0.0#PartTypeInformation");
      
      expect(policies).toHaveLength(1);
      const constraint = policies[0]["odrl:permission"]["odrl:constraint"];
      
      // Should be a logical constraint with AND
      expect(constraint).toHaveProperty("odrl:and");
      if ('odrl:and' in constraint!) {
        expect(constraint["odrl:and"]).toHaveLength(2);
        expect(constraint["odrl:and"]![0]["odrl:leftOperand"]["@id"]).toBe("cx-policy:FrameworkAgreement");
      }
    });

    it('should generate multiple policies in non-strict mode with OR logic', () => {
      const policies = generateOdrlPolicies(mockConfig, "urn:samm:other:1.0.0#Other");
      
      // Should generate multiple policies due to non-strict mode
      expect(policies.length).toBeGreaterThan(1);
      
      // Check that OR logic is preserved in each policy
      for (const policy of policies) {
        const constraint = policy["odrl:permission"]["odrl:constraint"];
        if (constraint && typeof constraint === 'object' && 'odrl:or' in constraint) {
          expect(constraint["odrl:or"]).toBeDefined();
        }
      }
    });

    it('should handle single constraint without logical wrapper', () => {
      const policies = generateOdrlPolicies(mockConfig, "urn:samm:single:1.0.0#Single");
      
      expect(policies).toHaveLength(1);
      const constraint = policies[0]["odrl:permission"]["odrl:constraint"];
      
      // Should be a single constraint, not wrapped in logical operator
      expect(constraint).toHaveProperty("odrl:leftOperand");
      if ('odrl:leftOperand' in constraint!) {
        expect(constraint["odrl:leftOperand"]["@id"]).toBe("cx-policy:Membership");
      }
    });

    it('should return empty array for unknown semantic ID', () => {
      const policies = generateOdrlPolicies(mockConfig, "unknown:semantic:id");
      expect(policies).toHaveLength(0);
    });
  });

  describe('getGovernancePolicyForSemanticId', () => {
    it('should return policies for specific semantic ID', () => {
      const policies = getGovernancePolicyForSemanticId(mockConfig, "urn:samm:io.catenax.part_type_information:1.0.0#PartTypeInformation");
      expect(policies).toHaveLength(1);
    });
  });

  describe('getDefaultGovernancePolicy', () => {
    it('should return first configuration as default', () => {
      const policies = getDefaultGovernancePolicy(mockConfig);
      expect(policies).toHaveLength(1);
    });

    it('should return empty array for empty config', () => {
      const policies = getDefaultGovernancePolicy([]);
      expect(policies).toHaveLength(0);
    });
  });
});
