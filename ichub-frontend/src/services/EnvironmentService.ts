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

import { ConfigFactory } from '../config/ConfigFactory';
import { AppConfig } from '../config/schema';

// Re-export types for backward compatibility
export type { AuthUser, AuthTokens } from '../config/schema';

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
  strict?: boolean; // Made optional to handle missing values
  permission: GovernanceRule | GovernanceRule[];
  prohibition: GovernanceRule | GovernanceRule[];
  obligation: GovernanceRule | GovernanceRule[];
}

export interface GovernanceConfig {
  semanticid: string;
  policies: GovernancePolicy[];
}

// =================================================================
// REUSABLE CONFIGURATION UTILITIES
// =================================================================

/**
 * Generic configuration parser that handles runtime injection and build-time configs
 */
const parseConfig = <T>(
  runtimeKey: string,
  buildTimeKey: string,
  defaultValue: T
): T => {
  try {
    // Try runtime injection first (window.ENV)
    const runtimeValue = window?.ENV?.[runtimeKey as keyof typeof window.ENV];
    if (runtimeValue !== undefined && runtimeValue !== null) {
      // If it's already parsed (object/array), return it
      if (typeof runtimeValue === 'object') {
        return runtimeValue as T;
      }
      // If it's a string, parse it
      if (typeof runtimeValue === 'string') {
        return JSON.parse(runtimeValue) as T;
      }
    }

    // Fallback to build-time environment variable
    const buildTimeValue = import.meta.env[buildTimeKey];
    if (buildTimeValue) {
      return JSON.parse(buildTimeValue) as T;
    }

    return defaultValue;
  } catch (error) {
    console.warn(`Failed to parse configuration for ${runtimeKey}:`, error);
    return defaultValue;
  }
};



class EnvironmentService {
  private config: AppConfig;
  private configLoadTime: number;

  constructor() {
    this.config = ConfigFactory.create();
    this.configLoadTime = Date.now();
  }

  // Configuration getters with type safety
  getConfig(): Readonly<AppConfig> {
    return this.config;
  }

  getAppConfig() {
    return this.config.app;
  }

  getApiConfig() {
    return this.config.api;
  }

  getParticipantConfig() {
    return this.config.participant;
  }

  getGovernanceConfig() {
    return this.config.governance;
  }

  getFeatureFlags() {
    return this.config.features;
  }

  getUiConfig() {
    return this.config.ui;
  }

  // Authentication configuration methods
  getAuthConfig() {
    return this.config.auth;
  }

  isAuthEnabled(): boolean {
    return this.config.auth.enabled;
  }

  getAuthProvider(): string {
    return this.config.auth.provider;
  }

  isKeycloakEnabled(): boolean {
    return this.config.auth.enabled && this.config.auth.provider === 'keycloak';
  }

  getKeycloakConfig() {
    if (!this.isKeycloakEnabled()) {
      throw new Error('Keycloak is not enabled');
    }
    return this.config.auth.keycloak!;
  }

  // Keycloak-specific getters
  getKeycloakUrl(): string {
    return this.getKeycloakConfig().url;
  }

  getKeycloakRealm(): string {
    return this.getKeycloakConfig().realm;
  }

  getKeycloakClientId(): string {
    return this.getKeycloakConfig().clientId;
  }

  getKeycloakInitOptions() {
    const keycloakConfig = this.getKeycloakConfig();
    return {
      onLoad: keycloakConfig.onLoad || 'check-sso',
      checkLoginIframe: keycloakConfig.checkLoginIframe !== false,
      silentCheckSsoRedirectUri: keycloakConfig.silentCheckSsoRedirectUri,
      pkceMethod: keycloakConfig.pkceMethod || 'S256',
      enableLogging: keycloakConfig.enableLogging || false,
      minValidity: keycloakConfig.minValidity || 30,
      checkLoginIframeInterval: keycloakConfig.checkLoginIframeInterval || 5,
      flow: keycloakConfig.flow || 'standard',
    };
  }

  // Session management
  getSessionTimeout(): number {
    return this.config.auth.sessionTimeout;
  }

  getRenewTokenMinValidity(): number {
    return this.config.auth.renewTokenMinValidity;
  }

  getLogoutRedirectUri(): string | undefined {
    return this.config.auth.logoutRedirectUri;
  }

  // Environment utilities
  isDevelopment(): boolean {
    return this.config.app.environment === 'development';
  }

  isProduction(): boolean {
    return this.config.app.environment === 'production';
  }

  isStaging(): boolean {
    return this.config.app.environment === 'staging';
  }

  // Feature flag helpers
  isFeatureEnabled(feature: keyof AppConfig['features']): boolean {
    return this.config.features[feature];
  }

  // API methods
  getApiHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add API key if configured
    const apiKey = this.config.api.apiKey;
    if (apiKey) {
      headers[this.config.api.apiKeyHeader] = apiKey;
    }

    return headers;
  }

  // Backward compatibility methods (deprecated)
  /** @deprecated Use getApiConfig().requireHttpsUrlPattern */
  isRequireHttpsUrlPattern(): boolean {
    return this.config.api.requireHttpsUrlPattern;
  }

  /** @deprecated Use getApiConfig().ichubBackendUrl */
  getIchubBackendUrl(): string {
    return this.config.api.ichubBackendUrl;
  }

  /** @deprecated Use getParticipantConfig().id */
  getParticipantId(): string {
    return this.config.participant.id;
  }

  /** @deprecated Use getGovernanceConfig().config */
  getGovernanceConfigLegacy(): GovernanceConfig[] {
    return this.config.governance.config;
  }

  /** @deprecated Use getGovernanceConfig().dtrPolicies */
  getDtrPoliciesConfig(): GovernancePolicy[] {
    return this.config.governance.dtrPolicies;
  }

  // Configuration management
  reloadConfiguration(): void {
    this.config = ConfigFactory.reload();
    this.configLoadTime = Date.now();
  }

  getConfigurationAge(): number {
    return Date.now() - this.configLoadTime;
  }

  // Enhanced configuration summary
  getConfigurationSummary() {
    const baseConfig = {
      environment: this.config.app.environment,
      version: this.config.app.version,
      participantId: this.config.participant.id,
      backendUrl: this.config.api.ichubBackendUrl,
      loadTime: this.configLoadTime,
      age: this.getConfigurationAge(),
      features: Object.entries(this.config.features).filter(([, enabled]) => enabled).map(([name]) => name),
    };

    // Add authentication status (without exposing sensitive data)
    const authStatus = {
      enabled: this.config.auth.enabled,
      provider: this.config.auth.provider,
      keycloakConfigured: this.config.auth.keycloak ? {
        url: this.config.auth.keycloak.url,
        realm: this.config.auth.keycloak.realm,
        clientId: this.config.auth.keycloak.clientId,
      } : null,
      hasApiKey: !!this.config.api.apiKey,
      apiKeyHeader: this.config.api.apiKeyHeader,
    };

    return { ...baseConfig, auth: authStatus };
  }

  validateConfiguration(): { isValid: boolean; errors: string[] } {
    try {
      ConfigFactory.create();
      return { isValid: true, errors: [] };
    } catch (error) {
      return {
        isValid: false,
        errors: error instanceof Error ? [error.message] : ['Unknown configuration error']
      };
    }
  }
}

/**
 * Gets BPN with priority: token -> env -> 'CX-Operator'
 */
export const getBpn = (): string => {
  try {
    const authService = (window as any).__authService;
    if (authService) {
      const user = authService.getUser();
      if (user?.attributes?.bpn) {
        return user.attributes.bpn;
      }
    }
  } catch (error) {
    console.warn('Failed to retrieve BPN from token:', error);
  }

  const envBpn = window?.ENV?.PARTICIPANT_ID ?? import.meta.env.VITE_PARTICIPANT_ID;
  if (envBpn) return envBpn;

  return 'CX-Operator';
};

// Legacy function exports for backward compatibility
export const isRequireHttpsUrlPattern = () =>
  import.meta.env.VITE_REQUIRE_HTTPS_URL_PATTERN !== 'false';

export const getIchubBackendUrl = () => window?.ENV?.ICHUB_BACKEND_URL ?? import.meta.env.VITE_ICHUB_BACKEND_URL ?? '';

/** @deprecated Use getBpn() instead */
export const getParticipantId = () => window?.ENV?.PARTICIPANT_ID ?? import.meta.env.VITE_PARTICIPANT_ID ?? '';

export const getGovernanceConfig = (): GovernanceConfig[] => {
  return parseConfig<GovernanceConfig[]>(
    'GOVERNANCE_CONFIG',
    'VITE_GOVERNANCE_CONFIG',
    []
  );
};

export const getDtrPoliciesConfig = (): GovernancePolicy[] => {
  return parseConfig<GovernancePolicy[]>(
    'DTR_POLICIES_CONFIG',
    'VITE_DTR_POLICIES_CONFIG',
    []
  );
};

// New enhanced service exports
export const isAuthEnabled = () => {
  const service = new EnvironmentService();
  return service.isAuthEnabled();
};

export const isKeycloakEnabled = () => {
  const service = new EnvironmentService();
  return service.isKeycloakEnabled();
};

export const getKeycloakConfig = () => {
  const service = new EnvironmentService();
  return service.getKeycloakConfig();
};

export const getApiHeaders = () => {
  const service = new EnvironmentService();
  return service.getApiHeaders();
};

// Create singleton instance
const environmentService = new EnvironmentService();

export default environmentService;
export { EnvironmentService };