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

import { getIchubBackendUrl, getBpn } from '../services/EnvironmentService';
import { BaseConfig, ApiEndpoints } from './types';

/**
 * Base application configuration used across all features
 */
export const baseConfig: BaseConfig = {
  apiUrl: getIchubBackendUrl(),
  participantId: getBpn(),
};

/**
 * Shared API endpoints used by multiple features
 */
export const sharedApiEndpoints: ApiEndpoints = {
  // Base paths used by multiple features
  BASE_API: '/api/v1',
  HEALTH: '/health',
  AUTH: '/auth',
};

/**
 * CORS and security configuration
 */
export const securityConfig = {
  requireHttps: () => {
    try {
      return import.meta.env.VITE_REQUIRE_HTTPS_URL_PATTERN !== 'false';
    } catch {
      return true; // Default to secure
    }
  },
};

/**
 * Common configuration utilities
 */
export const configUtils = {
  /**
   * Build full API URL
   */
  buildApiUrl: (endpoint: string): string => {
    return `${baseConfig.apiUrl}${endpoint}`;
  },

  /**
   * Check if feature is enabled
   */
  isFeatureEnabled: (feature: string): boolean => {
    const envVar = `VITE_FEATURE_${feature.toUpperCase()}_ENABLED`;
    return import.meta.env[envVar] !== 'false';
  },
};
