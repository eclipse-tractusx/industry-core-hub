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

import { configUtils } from '@/config';

/**
 * Partner Management specific API endpoints
 */
export const partnerManagementApiEndpoints = {
  PARTNERS: '/partner-management/business-partners',
  AGREEMENTS: '/partner-management/data-exchange-agreements',
  CONTRACTS: '/partner-management/contracts',
} as const;

/**
 * Partner Management specific configuration
 */
export const partnerManagementConfig = {
  // API configuration
  api: {
    endpoints: partnerManagementApiEndpoints,
    buildUrl: (endpoint: keyof typeof partnerManagementApiEndpoints) => {
      return configUtils.buildApiUrl(partnerManagementApiEndpoints[endpoint]);
    },
  },

  // Validation configuration
  validation: {
    bpn: {
      pattern: /^BPN[LSA][A-Z0-9]{10}[A-Z0-9]{2}/, // Business Partner Number Legal Entity pattern
      errorMessage: 'BPN must follow format BPNL followed by 10 alphanumeric characters and 2 checksum characters.',
    },
    companyName: {
      minLength: 2,
      maxLength: 100,
    }
  },

  // Table configuration
  table: {
    defaultPageSize: 20,
    availablePageSizes: [10, 20, 50, 100],
  },
};
