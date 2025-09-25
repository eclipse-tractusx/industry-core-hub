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

// Types for governance configuration
export interface GovernanceConstraint {
  leftOperand: string;
  operator: string;
  rightOperand: string;
}

export interface GovernanceRule {
  action: string;
  LogicalConstraint?: string;
  constraints: GovernanceConstraint[];
}

export interface GovernancePolicy {
  strict: boolean;
  permission: GovernanceRule | GovernanceRule[];
  prohibition: GovernanceRule | GovernanceRule[];
  obligation: GovernanceRule | GovernanceRule[];
}

export interface GovernanceConfig {
  semanticid: string;
  policies: GovernancePolicy[];
}

// Authentication types
export interface AuthUser {
  id: string;
  username: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  roles: string[];
  permissions: string[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  tokenType: string;
  expiresIn: number;
  expiresAt: Date;
}

// Main application configuration schema
export interface AppConfig {
  // Core application settings
  app: {
    environment: 'development' | 'staging' | 'production';
    version: string;
    buildTime: string;
  };
  
  // API and backend configuration
  api: {
    ichubBackendUrl: string;
    timeout: number;
    retryAttempts: number;
    requireHttpsUrlPattern: boolean;
    // API key configuration
    apiKey?: string;
    apiKeyHeader: string;
    enableApiKeyRotation: boolean;
    apiKeyExpiryWarningDays: number;
  };
  
  // Authentication configuration
  auth: {
    enabled: boolean;
    provider: 'keycloak' | 'none';
    keycloak?: {
      url: string;
      realm: string;
      clientId: string;
      // Optional Keycloak configurations
      onLoad?: 'login-required' | 'check-sso';
      checkLoginIframe?: boolean;
      silentCheckSsoRedirectUri?: string;
      pkceMethod?: 'S256' | 'plain';
      enableLogging?: boolean;
      // Token configuration
      minValidity?: number;
      checkLoginIframeInterval?: number;
      // Flow configuration
      flow?: 'standard' | 'implicit' | 'hybrid';
    };
    // Session management
    sessionTimeout: number;
    renewTokenMinValidity: number;
    logoutRedirectUri?: string;
  };
  
  // Participant configuration
  participant: {
    id: string;
    bpnValidationPattern?: string;
  };
  
  // Governance and policies
  governance: {
    config: GovernanceConfig[];
    dtrPolicies: GovernancePolicy[];
  };
  
  // Feature flags
  features: {
    enableAdvancedLogging: boolean;
    enablePerformanceMonitoring: boolean;
    enableDevTools: boolean;
  };
  
  // UI and theming
  ui: {
    theme: 'light' | 'dark' | 'auto';
    locale: string;
    compactMode: boolean;
  };
}

// Raw environment configuration interface
export interface RawEnvironmentConfig {
  // Core application
  VITE_APP_ENVIRONMENT?: string;
  VITE_APP_VERSION?: string;
  
  // API configuration
  VITE_ICHUB_BACKEND_URL?: string;
  VITE_API_TIMEOUT?: string;
  VITE_API_RETRY_ATTEMPTS?: string;
  VITE_REQUIRE_HTTPS_URL_PATTERN?: string;
  
  // API key configuration
  VITE_API_KEY?: string;
  VITE_API_KEY_HEADER?: string;
  VITE_ENABLE_API_KEY_ROTATION?: string;
  VITE_API_KEY_EXPIRY_WARNING_DAYS?: string;
  
  // Authentication configuration
  VITE_AUTH_ENABLED?: string;
  VITE_AUTH_PROVIDER?: string;
  
  // Keycloak configuration
  VITE_KEYCLOAK_URL?: string;
  VITE_KEYCLOAK_REALM?: string;
  VITE_KEYCLOAK_CLIENT_ID?: string;
  VITE_KEYCLOAK_ON_LOAD?: string;
  VITE_KEYCLOAK_CHECK_LOGIN_IFRAME?: string;
  VITE_KEYCLOAK_SILENT_CHECK_SSO_REDIRECT_URI?: string;
  VITE_KEYCLOAK_PKCE_METHOD?: string;
  VITE_KEYCLOAK_ENABLE_LOGGING?: string;
  VITE_KEYCLOAK_MIN_VALIDITY?: string;
  VITE_KEYCLOAK_CHECK_LOGIN_IFRAME_INTERVAL?: string;
  VITE_KEYCLOAK_FLOW?: string;
  
  // Session management
  VITE_AUTH_SESSION_TIMEOUT?: string;
  VITE_AUTH_RENEW_TOKEN_MIN_VALIDITY?: string;
  VITE_AUTH_LOGOUT_REDIRECT_URI?: string;
  
  // Participant configuration
  VITE_PARTICIPANT_ID?: string;
  VITE_BPN_VALIDATION_PATTERN?: string;
  
  // Governance and policies
  VITE_GOVERNANCE_CONFIG?: string;
  VITE_DTR_POLICIES_CONFIG?: string;
  
  // Feature flags
  VITE_ENABLE_ADVANCED_LOGGING?: string;
  VITE_ENABLE_PERFORMANCE_MONITORING?: string;
  VITE_ENABLE_DEV_TOOLS?: string;
  
  // UI configuration
  VITE_UI_THEME?: string;
  VITE_UI_LOCALE?: string;
  VITE_UI_COMPACT_MODE?: string;
}

// Configuration error class
export class ConfigurationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}