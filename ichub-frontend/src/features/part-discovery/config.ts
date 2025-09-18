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

import { 
  getGovernanceConfig, 
  getDtrPoliciesConfig,
  GovernanceConfig,
  GovernancePolicy 
} from '../../services/EnvironmentService';
import { configUtils } from '../../config';

/**
 * Part Discovery specific API endpoints
 */
export const partDiscoveryApiEndpoints = {
  CATALOG_PART_MANAGEMENT: '/part-management/catalog-part',
  SHARE_CATALOG_PART: '/share/catalog-part',
  TWIN_MANAGEMENT: '/twin-management/catalog-part-twin',
  SHELL_DISCOVERY: '/discover/shells',
} as const;

/**
 * Part Discovery governance configuration
 */
export const partDiscoveryGovernanceConfig = {
  /**
   * Get governance configuration for part discovery
   */
  getGovernanceConfig: (): GovernanceConfig[] => {
    return getGovernanceConfig();
  },

  /**
   * Get DTR policies configuration for part discovery
   */
  getDtrPoliciesConfig: (): GovernancePolicy[] => {
    return getDtrPoliciesConfig();
  },

  /**
   * Default DTR policy for part discovery
   */
  getDefaultDtrPolicy: (): GovernancePolicy => {
    return {
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
            rightOperand: 'cx.core.digitalTwinRegistry:1'
          }
        ]
      },
      prohibition: [],
      obligation: []
    };
  },
};

/**
 * Part Discovery specific configuration
 */
export const partDiscoveryConfig = {
  // API configuration
  api: {
    endpoints: partDiscoveryApiEndpoints,
    buildUrl: (endpoint: keyof typeof partDiscoveryApiEndpoints) => {
      return configUtils.buildApiUrl(partDiscoveryApiEndpoints[endpoint]);
    },
  },

  // Governance configuration
  governance: partDiscoveryGovernanceConfig,

  // Cache configuration
  cache: {
    defaultTtl: 5 * 60 * 1000, // 5 minutes
    policyTtl: 10 * 60 * 1000, // 10 minutes
  },

  // Pagination configuration
  pagination: {
    defaultPageSize: 50,
    maxPageSize: 200,
  },
};
