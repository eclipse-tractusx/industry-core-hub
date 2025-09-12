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
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND,
 * either express or implied. See the
 * License for the specific language govern in permissions and limitations
 * under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 ********************************************************************************/

import axios from 'axios';
import { 
  getIchubBackendUrl, 
  getGovernanceConfig, 
  getDtrPoliciesConfig,
  GovernanceConfig,
  GovernanceConstraint,
  GovernanceRule,
  GovernancePolicy
} from '../../services/EnvironmentService';
import { ApiPartData } from '../../types/product';
import { CatalogPartTwinCreateType, TwinReadType } from '../../types/twin';
import { ShellDiscoveryResponse, getNextPageCursor, getPreviousPageCursor, hasNextPage, hasPreviousPage } from './utils';

const CATALOG_PART_MANAGEMENT_BASE_PATH = '/part-management/catalog-part';
const SHARE_CATALOG_PART_BASE_PATH = '/share/catalog-part';
const TWIN_MANAGEMENT_BASE_PATH = '/twin-management/catalog-part-twin';
const SHELL_DISCOVERY_BASE_PATH = '/discover/shells';
const backendUrl = getIchubBackendUrl();

// Cache system with configuration change detection
interface PolicyCache {
  configHash: string;
  policies: OdrlPolicy[];
}

let dtrGovernancePoliciesCache: PolicyCache | null = null;
const governancePoliciesCache: Map<string, PolicyCache> = new Map();
let defaultGovernancePolicyCache: PolicyCache | null = null;

/**
 * Generate a SHA-256 hash from an object for cache invalidation
 */
const generateConfigHash = async (config: unknown): Promise<string> => {
  const configString = JSON.stringify(config, null, 0);
  const encoder = new TextEncoder();
  const data = encoder.encode(configString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Generate DTR policies with all constraint permutations
 */
const generateDtrPoliciesWithPermutations = (dtrPolicies: GovernancePolicy[]): OdrlPolicy[] => {
  const allPolicyPermutations: OdrlPolicy[] = [];
  
  for (const policy of dtrPolicies) {
    // Generate permutations for each rule type
    const permissionPermutations = generateRulesPermutations(policy.permission);
    const prohibitionPermutations = generateRulesPermutations(policy.prohibition);
    const obligationPermutations = generateRulesPermutations(policy.obligation);
    
    // Create cartesian product of all rule permutations
    for (const permission of permissionPermutations) {
      for (const prohibition of prohibitionPermutations) {
        for (const obligation of obligationPermutations) {
          allPolicyPermutations.push({
            "odrl:permission": convertRulesToOdrl(permission),
            "odrl:prohibition": convertRulesToOdrl(prohibition),
            "odrl:obligation": convertRulesToOdrl(obligation)
          });
        }
      }
    }
  }
  
  return allPolicyPermutations;
};

/**
 * Generate governance policies with permutations for a specific semantic ID
 */
const generateGovernancePoliciesWithPermutations = async (semanticId: string, config: GovernanceConfig[]): Promise<OdrlPolicy[]> => {
  // First, try to find a specific configuration for the semantic ID
  const relevantConfig = config.find(cfg => cfg.semanticid === semanticId);
  
  if (relevantConfig) {
    // Found specific configuration, use it
    return generateDtrPoliciesWithPermutations(relevantConfig.policies);
  }
  
  // No specific configuration found, use default policies as fallback
  console.log(`No specific governance configuration found for semantic ID: ${semanticId}, using default policies`);
  return await getCachedDefaultGovernancePolicies();
};

/**
 * Generate default governance policy permutations
 */
const generateDefaultGovernancePolicyPermutations = (): OdrlPolicy[] => {
  // Default policies with constraints that need permutations
  const defaultPolicy: GovernancePolicy = {
    strict: false,
    permission: {
      action: 'odrl:use',
      LogicalConstraint: 'odrl:and',
      constraints: [
        {
          leftOperand: 'cx-policy:FrameworkAgreement',
          operator: 'odrl:eq',
          rightOperand: 'DataExchangeGovernance:1.0'
        },
        {
          leftOperand: 'cx-policy:Membership',
          operator: 'odrl:eq',
          rightOperand: 'active'
        },
        {
          leftOperand: 'cx-policy:UsagePurpose',
          operator: 'odrl:eq',
          rightOperand: 'cx.core.industrycore:1'
        }
      ]
    },
    prohibition: [],
    obligation: []
  };
  
  return generateDtrPoliciesWithPermutations([defaultPolicy]);
};

/**
 * Get cached DTR governance policies with configuration change detection
 */
const getCachedDtrGovernancePolicies = async (): Promise<OdrlPolicy[]> => {
  const currentConfig = getDtrPoliciesConfig();
  const currentHash = await generateConfigHash(currentConfig);
  
  // Check if cache is valid
  if (dtrGovernancePoliciesCache && dtrGovernancePoliciesCache.configHash === currentHash) {
    return dtrGovernancePoliciesCache.policies;
  }
  
  // Cache is invalid or doesn't exist, regenerate
  console.log('DTR governance policies cache invalidated, regenerating...');
  const newPolicies = generateDtrPoliciesWithPermutations(currentConfig);
  
  dtrGovernancePoliciesCache = {
    configHash: currentHash,
    policies: newPolicies
  };
  
  return newPolicies;
};

/**
 * Get cached governance policies for a specific semantic ID
 */
const getCachedGovernancePolicies = async (semanticId: string): Promise<OdrlPolicy[]> => {
  const currentConfig = getGovernanceConfig();
  const currentHash = await generateConfigHash(currentConfig);
  
  // Check if cache is valid for this semantic ID
  const cached = governancePoliciesCache.get(semanticId);
  if (cached && cached.configHash === currentHash) {
    return cached.policies;
  }
  
  // Cache is invalid or doesn't exist, regenerate
  console.log(`Governance policies cache invalidated for semantic ID: ${semanticId}, regenerating...`);
  const newPolicies = await generateGovernancePoliciesWithPermutations(semanticId, currentConfig);
  
  governancePoliciesCache.set(semanticId, {
    configHash: currentHash,
    policies: newPolicies
  });
  
  return newPolicies;
};

/**
 * Get cached default governance policies
 */
const getCachedDefaultGovernancePolicies = async (): Promise<OdrlPolicy[]> => {
  // Default policies don't depend on configuration, but we still cache them
  // Use a static hash since default policies don't change based on config
  const staticHash = 'default_v1';
  
  if (defaultGovernancePolicyCache && defaultGovernancePolicyCache.configHash === staticHash) {
    return defaultGovernancePolicyCache.policies;
  }
  
  console.log('Default governance policies cache invalidated, regenerating...');
  const newPolicies = generateDefaultGovernancePolicyPermutations();
  
  defaultGovernancePolicyCache = {
    configHash: staticHash,
    policies: newPolicies
  };
  
  return newPolicies;
};

// Types for ODRL policies with flexible structure
interface OdrlConstraint {
  "odrl:leftOperand": { "@id": string };
  "odrl:operator": { "@id": string };
  "odrl:rightOperand": string;
}

// Support for logical operators: "and", "or", or single constraint
interface OdrlRule {
  "odrl:action": { "@id": string };
  "odrl:constraint"?: 
    | { "odrl:and": OdrlConstraint[] }     // Multiple constraints with AND logic
    | { "odrl:or": OdrlConstraint[] }      // Multiple constraints with OR logic  
    | OdrlConstraint;                      // Single constraint without logical operator
}

interface OdrlPolicy {
  "odrl:permission": OdrlRule | OdrlRule[];  // Single object when 1 rule, array when multiple
  "odrl:prohibition": OdrlRule | OdrlRule[]; // Single object when 1 rule, array when multiple
  "odrl:obligation": OdrlRule | OdrlRule[];  // Single object when 1 rule, array when multiple
}

// Types for Shell Discovery API requests
export interface QuerySpecItem {
  name: string;
  value: string;
}

export interface ShellDiscoveryRequest {
  counterPartyId: string;
  querySpec: QuerySpecItem[];
  limit?: number;
  cursor?: string;
  dtrGovernance?: OdrlPolicy[];
}

export const fetchCatalogParts = async (): Promise<ApiPartData[]> => {
  const response = await axios.get<ApiPartData[]>(`${backendUrl}${CATALOG_PART_MANAGEMENT_BASE_PATH}`);
  return response.data;
};

export const fetchCatalogPart = async (
  manufacturerId: string ,
  manufacturerPartId: string
): Promise<ApiPartData> => {
  const response = await axios.get<ApiPartData>(
    `${backendUrl}${CATALOG_PART_MANAGEMENT_BASE_PATH}/${manufacturerId}/${manufacturerPartId}`
  );
  return response.data;
};

export const shareCatalogPart = async (
  manufacturerId: string,
  manufacturerPartId: string,
  businessPartnerNumber: string,
  customerPartId?: string
): Promise<ApiPartData> => {
  const requestBody: {
    manufacturerId: string;
    manufacturerPartId: string;
    businessPartnerNumber: string;
    customerPartId?: string;
  } = {
    manufacturerId,
    manufacturerPartId,
    businessPartnerNumber,
    customerPartId: customerPartId && customerPartId.trim() ? customerPartId.trim() : undefined,
  };

  const response = await axios.post<ApiPartData>(
    `${backendUrl}${SHARE_CATALOG_PART_BASE_PATH}`,
    requestBody
  );
  return response.data;
};

export const registerCatalogPartTwin = async (
  twinData: CatalogPartTwinCreateType
): Promise<TwinReadType> => {
  const response = await axios.post<TwinReadType>(
    `${backendUrl}${TWIN_MANAGEMENT_BASE_PATH}`,
    twinData
  );
  return response.data;
};

// Shell Discovery API Functions

/**
 * Discover shells based on query specifications
 */
export const discoverShells = async (
  request: ShellDiscoveryRequest,
  signal?: AbortSignal
): Promise<ShellDiscoveryResponse> => {
  const response = await axios.post<ShellDiscoveryResponse>(
    `${backendUrl}${SHELL_DISCOVERY_BASE_PATH}`,
    request,
    { signal }
  );
  return response.data;
};

/**
 * Discover shells for a specific counter party and digital twin type
 */
export const discoverShellsByType = async (
  counterPartyId: string,
  digitalTwinType: string,
  limit?: number,
  cursor?: string
): Promise<ShellDiscoveryResponse> => {
  const dtrPolicies = await convertDtrPoliciesToOdrl();
  
  const request: ShellDiscoveryRequest = {
    counterPartyId,
    querySpec: [
      {
        name: 'digitalTwinType',
        value: digitalTwinType
      }
    ],
    dtrGovernance: dtrPolicies,
    ...(limit && { limit }),
    ...(cursor && { cursor })
  };

  return discoverShells(request);
};

export const discoverShellsByCustomerPartId = async (
  counterPartyId: string,
  customerPartId: string,
  limit?: number,
  cursor?: string
): Promise<ShellDiscoveryResponse> => {
  const dtrPolicies = await convertDtrPoliciesToOdrl();
  
  const request: ShellDiscoveryRequest = {
    counterPartyId,
    querySpec: [
      {
        name: 'customerPartId',
        value: customerPartId
      }
    ],
    dtrGovernance: dtrPolicies,
    ...(limit && { limit }),
    ...(cursor && { cursor })
  };

  return discoverShells(request);
};

/**
 * Discover PartType shells for a specific counter party
 */
export const discoverPartTypeShells = async (
  counterPartyId: string,
  limit?: number,
  cursor?: string
): Promise<ShellDiscoveryResponse> => {
  return discoverShellsByType(counterPartyId, 'PartType', limit, cursor);
};

export const discoverPartInstanceShells = async (
  counterPartyId: string,
  limit?: number,
  cursor?: string
): Promise<ShellDiscoveryResponse> => {
  return discoverShellsByType(counterPartyId, 'PartInstance', limit, cursor);
};

/**
 * Get next page of shell discovery results
 */
export const getNextShellsPage = async (
  counterPartyId: string,
  digitalTwinType: string,
  nextCursor: string,
  limit?: number
): Promise<ShellDiscoveryResponse> => {
  return discoverShellsByType(counterPartyId, digitalTwinType, limit, nextCursor);
};

/**
 * Get previous page of shell discovery results
 */
export const getPreviousShellsPage = async (
  counterPartyId: string,
  digitalTwinType: string,
  previousCursor: string,
  limit?: number
): Promise<ShellDiscoveryResponse> => {
  return discoverShellsByType(counterPartyId, digitalTwinType, limit, previousCursor);
};

/**
 * Discover shells with custom query specifications
 */
export const discoverShellsWithCustomQuery = async (
  counterPartyId: string,
  querySpec: QuerySpecItem[],
  limit?: number,
  cursor?: string,
  signal?: AbortSignal
): Promise<ShellDiscoveryResponse> => {
  const dtrPolicies = await convertDtrPoliciesToOdrl();
  
  const request: ShellDiscoveryRequest = {
    counterPartyId,
    querySpec,
    dtrGovernance: dtrPolicies,
    ...(limit && { limit }),
    ...(cursor && { cursor })
  };

  return discoverShells(request, signal);
};

// Types for Single Shell Discovery
export interface SingleShellDiscoveryRequest {
  counterPartyId: string;
  id: string;
  dtrGovernance?: OdrlPolicy[];
}

export interface SingleShellDiscoveryResponse {
  shell_descriptor: {
    description: unknown[];
    displayName: unknown[];
    globalAssetId: string;
    id: string;
    idShort: string;
    specificAssetIds: Array<{
      supplementalSemanticIds: unknown[];
      name: string;
      value: string;
      externalSubjectId: {
        type: string;
        keys: Array<{
          type: string;
          value: string;
        }>;
      };
    }>;
    submodelDescriptors: Array<{
      endpoints: Array<{
        interface: string;
        protocolInformation: {
          href: string;
          endpointProtocol: string;
          endpointProtocolVersion: string[];
          subprotocol: string;
          subprotocolBody: string;
          subprotocolBodyEncoding: string;
          securityAttributes: Array<{
            type: string;
            key: string;
            value: string;
          }>;
        };
      }>;
      idShort: string;
      id: string;
      semanticId: {
        type: string;
        keys: Array<{
          type: string;
          value: string;
        }>;
      };
      supplementalSemanticId: unknown[];
      description: unknown[];
      displayName: unknown[];
    }>;
  };
  dtr: {
    connectorUrl: string;
    assetId: string;
  };
}

/**
 * Discover a single shell by AAS ID
 */
export const discoverSingleShell = async (
  counterPartyId: string,
  aasId: string,
  signal?: AbortSignal
): Promise<SingleShellDiscoveryResponse> => {
  const dtrPolicies = await convertDtrPoliciesToOdrl();
  
  const request: SingleShellDiscoveryRequest = {
    counterPartyId,
    id: aasId,
    dtrGovernance: dtrPolicies
  };

  const response = await axios.post<SingleShellDiscoveryResponse | { status: number; error: string }>(
    `${backendUrl}/discover/shell`,
    request,
    { signal }
  );
  
  // Check if the response contains error fields instead of valid data
  const data = response.data;
  if (data && typeof data === 'object' && 'status' in data && 'error' in data) {
    const errorResponse = data as { status: number; error: string };
    throw new Error(errorResponse.error || `Error ${errorResponse.status}: Failed to find digital twin`);
  }
  
  // Validate that we have a proper shell descriptor
  const validData = data as SingleShellDiscoveryResponse;
  if (!validData || !validData.shell_descriptor || !validData.shell_descriptor.submodelDescriptors) {
    throw new Error('Invalid response format: Missing shell descriptor data');
  }
  
  return validData;
};

// Enhanced pagination functions that automatically extract cursors

/**
 * Get the next page of results using the current response
 */
export const getNextPageFromResponse = async (
  currentResponse: ShellDiscoveryResponse,
  counterPartyId: string,
  digitalTwinType: string,
  limit?: number
): Promise<ShellDiscoveryResponse | null> => {
  const nextCursor = getNextPageCursor(currentResponse);
  if (!nextCursor) {
    return null; // No more pages
  }
  
  return discoverShellsByType(counterPartyId, digitalTwinType, limit, nextCursor);
};

/**
 * Get the previous page of results using the current response
 */
export const getPreviousPageFromResponse = async (
  currentResponse: ShellDiscoveryResponse,
  counterPartyId: string,
  digitalTwinType: string,
  limit?: number
): Promise<ShellDiscoveryResponse | null> => {
  const previousCursor = getPreviousPageCursor(currentResponse);
  if (!previousCursor) {
    return null; // No previous pages
  }
  
  return discoverShellsByType(counterPartyId, digitalTwinType, limit, previousCursor);
};

/**
 * Get next page for custom query results
 */
export const getNextPageFromCustomQuery = async (
  currentResponse: ShellDiscoveryResponse,
  counterPartyId: string,
  querySpec: QuerySpecItem[],
  limit?: number,
  signal?: AbortSignal
): Promise<ShellDiscoveryResponse | null> => {
  const nextCursor = getNextPageCursor(currentResponse);
  if (!nextCursor) {
    return null;
  }
  
  return discoverShellsWithCustomQuery(counterPartyId, querySpec, limit, nextCursor, signal);
};

/**
 * Get previous page for custom query results
 */
export const getPreviousPageFromCustomQuery = async (
  currentResponse: ShellDiscoveryResponse,
  counterPartyId: string,
  querySpec: QuerySpecItem[],
  limit?: number,
  signal?: AbortSignal
): Promise<ShellDiscoveryResponse | null> => {
  const previousCursor = getPreviousPageCursor(currentResponse);
  if (!previousCursor) {
    return null;
  }
  
  return discoverShellsWithCustomQuery(counterPartyId, querySpec, limit, previousCursor, signal);
};

/**
 * Pagination helper that provides easy navigation methods
 */
export class ShellDiscoveryPaginator {
  private currentResponse: ShellDiscoveryResponse;
  private counterPartyId: string;
  private digitalTwinType?: string;
  private querySpec?: QuerySpecItem[];
  private limit?: number;

  constructor(
    currentResponse: ShellDiscoveryResponse,
    counterPartyId: string,
    digitalTwinTypeOrQuerySpec?: string | QuerySpecItem[],
    limit?: number
  ) {
    this.currentResponse = currentResponse;
    this.counterPartyId = counterPartyId;
    this.limit = limit;

    if (typeof digitalTwinTypeOrQuerySpec === 'string') {
      this.digitalTwinType = digitalTwinTypeOrQuerySpec;
    } else if (Array.isArray(digitalTwinTypeOrQuerySpec)) {
      this.querySpec = digitalTwinTypeOrQuerySpec;
    }
  }

  /**
   * Check if next page is available
   */
  hasNext(): boolean {
    return hasNextPage(this.currentResponse);
  }

  /**
   * Check if previous page is available
   */
  hasPrevious(): boolean {
    return hasPreviousPage(this.currentResponse);
  }

  /**
   * Get next page and update current response
   */
  async next(): Promise<ShellDiscoveryResponse | null> {
    let nextResponse: ShellDiscoveryResponse | null = null;

    if (this.digitalTwinType) {
      nextResponse = await getNextPageFromResponse(
        this.currentResponse,
        this.counterPartyId,
        this.digitalTwinType,
        this.limit
      );
    } else if (this.querySpec) {
      nextResponse = await getNextPageFromCustomQuery(
        this.currentResponse,
        this.counterPartyId,
        this.querySpec,
        this.limit
      );
    }

    if (nextResponse) {
      this.currentResponse = nextResponse;
    }

    return nextResponse;
  }

  /**
   * Get previous page and update current response
   */
  async previous(): Promise<ShellDiscoveryResponse | null> {
    let previousResponse: ShellDiscoveryResponse | null = null;

    if (this.digitalTwinType) {
      previousResponse = await getPreviousPageFromResponse(
        this.currentResponse,
        this.counterPartyId,
        this.digitalTwinType,
        this.limit
      );
    } else if (this.querySpec) {
      previousResponse = await getPreviousPageFromCustomQuery(
        this.currentResponse,
        this.counterPartyId,
        this.querySpec,
        this.limit
      );
    }

    if (previousResponse) {
      this.currentResponse = previousResponse;
    }

    return previousResponse;
  }

  /**
   * Get current response
   */
  getCurrentResponse(): ShellDiscoveryResponse {
    return this.currentResponse;
  }

  /**
   * Get pagination info
   */
  getPaginationInfo() {
    return {
      currentPage: this.currentResponse.pagination.page,
      shellsFound: this.currentResponse.shellsFound,
      hasNext: this.hasNext(),
      hasPrevious: this.hasPrevious()
    };
  }
}

// Submodel Discovery API Functions

export interface SubmodelDiscoveryRequest {
  counterPartyId: string;
  id: string;
  submodelId: string;
  dtrGovernance?: OdrlPolicy[];
  governance: OdrlPolicy[];
}

export interface SubmodelDiscoveryResponse {
  submodelDescriptor: {
    submodelId: string;
    semanticId: string;
    semanticIdKeys: string;
    assetId: string;
    connectorUrl: string;
    href: string;
    status: string;
    error?: string;
  };
  submodel: Record<string, unknown>;
  dtr: {
    connectorUrl: string;
    assetId: string;
  } | null;
  status?: string;
  error?: string;
}

/**
 * Convert constraint to ODRL format
 */
const convertConstraintToOdrl = (constraint: GovernanceConstraint): OdrlConstraint => ({
  "odrl:leftOperand": {
    "@id": constraint.leftOperand
  },
  "odrl:operator": {
    "@id": constraint.operator
  },
  "odrl:rightOperand": constraint.rightOperand
});

/**
 * Generate all permutations of an array
 */
const generatePermutations = <T>(arr: T[]): T[][] => {
  if (arr.length <= 1) return [arr];
  
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i++) {
    const current = arr[i];
    const remaining = [...arr.slice(0, i), ...arr.slice(i + 1)];
    const perms = generatePermutations(remaining);
    
    for (const perm of perms) {
      result.push([current, ...perm]);
    }
  }
  
  return result;
};

/**
 * Generate all permutations of constraints within a rule, creating separate policies for each ordering
 */
const generateRulePermutations = (rule: GovernanceRule): GovernanceRule[] => {
  if (!rule.constraints || rule.constraints.length <= 1) {
    return [rule];
  }

  const constraintPermutations = generatePermutations(rule.constraints);
  
  return constraintPermutations.map(permutedConstraints => ({
    ...rule,
    constraints: permutedConstraints
  }));
};

/**
 * Generate all permutations of rules (permission, prohibition, obligation)
 */
const generateRulesPermutations = (rules: GovernanceRule | GovernanceRule[]): (GovernanceRule | GovernanceRule[])[] => {
  if (Array.isArray(rules)) {
    if (rules.length === 0) return [rules];
    
    // For array of rules, generate permutations for each rule
    const rulePermutations = rules.map(generateRulePermutations);
    
    // Generate cartesian product of all rule permutations
    const result: GovernanceRule[][] = [[]];
    for (const permutations of rulePermutations) {
      const newResult: GovernanceRule[][] = [];
      for (const existing of result) {
        for (const perm of permutations) {
          newResult.push([...existing, perm]);
        }
      }
      result.length = 0;
      result.push(...newResult);
    }
    
    return result;
  } else {
    // Single rule - generate permutations for its constraints
    return generateRulePermutations(rules);
  }
};

/**
 * Create constraint structure based on logical operator and constraints
 */
const createConstraintStructure = (
  constraints: GovernanceConstraint[], 
  logicalOperator?: string
): OdrlConstraint | { "odrl:and": OdrlConstraint[] } | { "odrl:or": OdrlConstraint[] } => {
  const odrlConstraints = constraints.map(convertConstraintToOdrl);
  
  // Single constraint without logical operator
  if (odrlConstraints.length === 1 && !logicalOperator) {
    return odrlConstraints[0];
  }
  
  // Multiple constraints with logical operators
  if (logicalOperator === "odrl:or" || logicalOperator === "or") {
    return { "odrl:or": odrlConstraints };
  }
  
  // Default to "and" for multiple constraints
  return { "odrl:and": odrlConstraints };
};

/**
 * Convert rule (permission, prohibition, obligation) to ODRL format
 */
const convertRuleToOdrl = (
  rule: { action: string; constraints: GovernanceConstraint[]; LogicalConstraint?: string }
): OdrlRule => {
  const odrlRule: OdrlRule = {
    "odrl:action": {
      "@id": rule.action
    }
  };

  if (rule.constraints && rule.constraints.length > 0) {
    odrlRule["odrl:constraint"] = createConstraintStructure(
      rule.constraints, 
      rule.LogicalConstraint
    );
  }

  return odrlRule;
};

/**
 * Convert governance rule(s) to ODRL format
 * - Single rule -> single OdrlRule object
 * - Multiple rules -> array of OdrlRule objects
 */
const convertRulesToOdrl = (rules: GovernanceRule | GovernanceRule[]): OdrlRule | OdrlRule[] => {
  if (Array.isArray(rules)) {
    // If it's an array, check the length
    if (rules.length === 1) {
      // Single item in array -> return as single object
      return convertRuleToOdrl(rules[0]);
    } else {
      // Multiple items -> return as array
      return rules.map(convertRuleToOdrl);
    }
  } else {
    // Single object -> return as single object
    return convertRuleToOdrl(rules);
  }
};

/**
 * Convert governance configuration to ODRL format
 * 
 * @param config - The governance configuration from environment variables
 * @returns Array of ODRL policies
 */
/**
 * Convert governance rule(s) to ODRL format
 * - Single rule -> single OdrlRule object
 * - Multiple rules -> array of OdrlRule objects
 */

/**
 * Convert DTR policies from environment config to ODRL format with all possible constraint orderings.
 * 
 * For each policy, this generates separate complete policies for each possible ordering of constraints.
 * This ensures DTR matching succeeds regardless of constraint order by providing all permutations
 * as separate policy entries in the array.
 * 
 * Uses caching to avoid recalculating permutations on every request.
 */
const convertDtrPoliciesToOdrl = async (): Promise<OdrlPolicy[]> => {
  return await getCachedDtrGovernancePolicies();
};

/**
 * Get governance policy based on semantic ID from environment configuration
 */
const getGovernancePolicyForSemanticId = async (semanticId: string): Promise<OdrlPolicy[]> => {
  return await getCachedGovernancePolicies(semanticId);
};

/**
 * Fetch a specific submodel data with request cancellation and concurrency control
 */
export const fetchSubmodel = async (
  counterPartyId: string,
  shellId: string,
  submodelId: string,
  semanticId?: string
): Promise<SubmodelDiscoveryResponse> => {
  // Get governance policies:
  // - If semanticId provided: try to find specific config, fallback to default if not found
  // - If no semanticId: use default policies
  const governance = semanticId ? 
    await getGovernancePolicyForSemanticId(semanticId) : 
    await getCachedDefaultGovernancePolicies();
  
  const dtrPolicies = await convertDtrPoliciesToOdrl();

  // Debug logging to check governance policies
  console.log('Submodel request governance policies:', {
    semanticId,
    governanceCount: governance?.length || 0,
    governance: governance
  });

  const request: SubmodelDiscoveryRequest = {
    counterPartyId,
    id: shellId,
    submodelId,
    dtrGovernance: dtrPolicies,
    governance
  };

  const response = await axios.post<SubmodelDiscoveryResponse>(
    `${backendUrl}/discover/shell/submodel`,
    request
  );
  
  return response.data;
};
