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
 * Certificate Management specific API endpoints
 */
export const certificateManagementApiEndpoints = {
  CERTIFICATES: '/certificate-management/certificates',
  SHARED: '/certificate-management/shared',
  INCOMING: '/certificate-management/incoming',
  STATS: '/certificate-management/stats',
} as const;

/**
 * Certificate Management specific configuration
 */
export const certificateManagementConfig = {
  // API configuration
  api: {
    endpoints: certificateManagementApiEndpoints,
    buildUrl: (endpoint: keyof typeof certificateManagementApiEndpoints) => {
      return configUtils.buildApiUrl(certificateManagementApiEndpoints[endpoint]);
    },
  },

  // Validation configuration
  validation: {
    bpn: {
      pattern: /^BPN[LSA][A-Z0-9]{10}[A-Z0-9]{2}/,
      errorMessage: 'BPN must follow format BPNL followed by 10 alphanumeric characters and 2 checksum characters.',
    },
    certificateName: {
      minLength: 3,
      maxLength: 100,
      errorMessage: 'Certificate name must be between 3 and 100 characters.',
    },
  },

  // Certificate types
  certificateTypes: [
    { value: 'ISO9001', label: 'ISO 9001 - Quality Management' },
    { value: 'ISO14001', label: 'ISO 14001 - Environmental Management' },
    { value: 'ISO45001', label: 'ISO 45001 - Occupational Health & Safety' },
    { value: 'IATF16949', label: 'IATF 16949 - Automotive Quality' },
    { value: 'ISO27001', label: 'ISO 27001 - Information Security' },
    { value: 'OTHER', label: 'Other' },
  ],

  // Status configuration
  statusConfig: {
    valid: {
      color: '#4caf50',
      label: 'Valid',
    },
    expiring: {
      color: '#ff9800',
      label: 'Expiring',
    },
    expired: {
      color: '#f44336',
      label: 'Expired',
    },
  },

  // Expiring threshold (days before expiration to show as "expiring")
  expiringThresholdDays: 30,
};
