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

import { configUtils } from '../../config';

/**
 * Catalog Management specific API endpoints
 */
export const catalogManagementApiEndpoints = {
  CATALOG_PARTS: '/part-management/catalog-part',
  PART_TYPES: '/part-management/catalog-part-types',
  BULK_OPERATIONS: '/part-management/catalog-part/bulk',
  SHARE_CATALOG_PART: '/share/catalog-part',
  TWIN_MANAGEMENT: '/twin-management/catalog-part-twin',
} as const;

/**
 * Catalog Management specific configuration
 */
export const catalogManagementConfig = {
  // API configuration
  api: {
    endpoints: catalogManagementApiEndpoints,
    buildUrl: (endpoint: keyof typeof catalogManagementApiEndpoints) => {
      return configUtils.buildApiUrl(catalogManagementApiEndpoints[endpoint]);
    },
  },

  // Form validation configuration
  validation: {
    partNumber: {
      minLength: 1,
      maxLength: 50,
      pattern: /^[A-Za-z0-9\-_.]+$/, // Alphanumeric, dash, underscore, dot
    },
    manufacturerPartId: {
      minLength: 1,
      maxLength: 100,
    },
    description: {
      maxLength: 500,
    },
  },

  // Table configuration
  table: {
    defaultPageSize: 25,
    availablePageSizes: [10, 25, 50, 100],
  },

  // File upload configuration
  upload: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['.csv', '.xlsx', '.json'],
  },
};
