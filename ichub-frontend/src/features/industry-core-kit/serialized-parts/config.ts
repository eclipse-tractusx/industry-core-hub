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
 * Serialized Parts specific API endpoints
 */
export const serializedPartsApiEndpoints = {
  SERIALIZED_PARTS: '/part-management/serialized-parts',
  BATCHES: '/part-management/batches',
  JIS_PARTS: '/part-management/jis-parts',
  TRACKING: '/part-management/serialized-parts/tracking',
} as const;

/**
 * Serialized Parts specific configuration
 */
export const serializedPartsConfig = {
  // API configuration
  api: {
    endpoints: serializedPartsApiEndpoints,
    buildUrl: (endpoint: keyof typeof serializedPartsApiEndpoints) => {
      return configUtils.buildApiUrl(serializedPartsApiEndpoints[endpoint]);
    },
  },

  // Validation configuration
  validation: {
    serialNumber: {
      minLength: 1,
      maxLength: 50,
      pattern: /^[A-Za-z0-9\-_]+$/, // Alphanumeric, dash, underscore
    },
    batchNumber: {
      minLength: 1,
      maxLength: 30,
    },
    qualityStatus: {
      allowedValues: ['OK', 'NOK', 'UNKNOWN', 'SCRAP'],
    },
  },

  // Table configuration
  table: {
    defaultPageSize: 30,
    availablePageSizes: [15, 30, 50, 100],
  },

  // Tracking configuration
  tracking: {
    refreshInterval: 30000, // 30 seconds
    maxHistoryEntries: 100,
  },
};
