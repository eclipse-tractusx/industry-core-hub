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

import { AppConfig, RawEnvironmentConfig, ConfigurationError, GovernancePolicy } from './schema';

export class ConfigFactory {
  private static instance: AppConfig | null = null;
  private static readonly CACHE_KEY = 'app_config_cache';
  private static readonly CACHE_VERSION = '1.0.0';

  static create(): AppConfig {
    if (this.instance) {
      return this.instance;
    }

    // Try to load from cache first (for performance)
    const cached = this.loadFromCache();
    if (cached) {
      this.instance = cached;
      return cached;
    }

    // Build fresh configuration
    const rawConfig = this.getRawEnvironmentConfig();
    const config = this.buildConfig(rawConfig);
    
    // Validate configuration
    this.validateConfig(config);
    
    // Cache for subsequent calls
    this.saveToCache(config);
    this.instance = config;
    
    return config;
  }

  private static getRawEnvironmentConfig(): RawEnvironmentConfig {
    // Priority: window.ENV (runtime) > import.meta.env (build-time) > defaults
    const windowEnv = (window as any)?.ENV || {};
    const viteEnv = (import.meta as any).env || {};
    
    return {
      // Core application
      VITE_APP_ENVIRONMENT: windowEnv.APP_ENVIRONMENT || viteEnv.VITE_APP_ENVIRONMENT,
      VITE_APP_VERSION: windowEnv.APP_VERSION || viteEnv.VITE_APP_VERSION,
      
      // API configuration
      VITE_ICHUB_BACKEND_URL: windowEnv.ICHUB_BACKEND_URL || viteEnv.VITE_ICHUB_BACKEND_URL,
      VITE_API_TIMEOUT: windowEnv.API_TIMEOUT || viteEnv.VITE_API_TIMEOUT,
      VITE_API_RETRY_ATTEMPTS: windowEnv.API_RETRY_ATTEMPTS || viteEnv.VITE_API_RETRY_ATTEMPTS,
      VITE_REQUIRE_HTTPS_URL_PATTERN: windowEnv.REQUIRE_HTTPS_URL_PATTERN || viteEnv.VITE_REQUIRE_HTTPS_URL_PATTERN,
      
      // API key configuration
      VITE_API_KEY: windowEnv.API_KEY || viteEnv.VITE_API_KEY,
      VITE_API_KEY_HEADER: windowEnv.API_KEY_HEADER || viteEnv.VITE_API_KEY_HEADER,
      VITE_ENABLE_API_KEY_ROTATION: windowEnv.ENABLE_API_KEY_ROTATION || viteEnv.VITE_ENABLE_API_KEY_ROTATION,
      VITE_API_KEY_EXPIRY_WARNING_DAYS: windowEnv.API_KEY_EXPIRY_WARNING_DAYS || viteEnv.VITE_API_KEY_EXPIRY_WARNING_DAYS,
      
      // Authentication configuration
      VITE_AUTH_ENABLED: windowEnv.AUTH_ENABLED || viteEnv.VITE_AUTH_ENABLED,
      VITE_AUTH_PROVIDER: windowEnv.AUTH_PROVIDER || viteEnv.VITE_AUTH_PROVIDER,
      
      // Keycloak configuration
      VITE_KEYCLOAK_URL: windowEnv.KEYCLOAK_URL || viteEnv.VITE_KEYCLOAK_URL,
      VITE_KEYCLOAK_REALM: windowEnv.KEYCLOAK_REALM || viteEnv.VITE_KEYCLOAK_REALM,
      VITE_KEYCLOAK_CLIENT_ID: windowEnv.KEYCLOAK_CLIENT_ID || viteEnv.VITE_KEYCLOAK_CLIENT_ID,
      VITE_KEYCLOAK_ON_LOAD: windowEnv.KEYCLOAK_ON_LOAD || viteEnv.VITE_KEYCLOAK_ON_LOAD,
      VITE_KEYCLOAK_CHECK_LOGIN_IFRAME: windowEnv.KEYCLOAK_CHECK_LOGIN_IFRAME || viteEnv.VITE_KEYCLOAK_CHECK_LOGIN_IFRAME,
      VITE_KEYCLOAK_SILENT_CHECK_SSO_REDIRECT_URI: windowEnv.KEYCLOAK_SILENT_CHECK_SSO_REDIRECT_URI || viteEnv.VITE_KEYCLOAK_SILENT_CHECK_SSO_REDIRECT_URI,
      VITE_KEYCLOAK_PKCE_METHOD: windowEnv.KEYCLOAK_PKCE_METHOD || viteEnv.VITE_KEYCLOAK_PKCE_METHOD,
      VITE_KEYCLOAK_ENABLE_LOGGING: windowEnv.KEYCLOAK_ENABLE_LOGGING || viteEnv.VITE_KEYCLOAK_ENABLE_LOGGING,
      VITE_KEYCLOAK_MIN_VALIDITY: windowEnv.KEYCLOAK_MIN_VALIDITY || viteEnv.VITE_KEYCLOAK_MIN_VALIDITY,
      VITE_KEYCLOAK_CHECK_LOGIN_IFRAME_INTERVAL: windowEnv.KEYCLOAK_CHECK_LOGIN_IFRAME_INTERVAL || viteEnv.VITE_KEYCLOAK_CHECK_LOGIN_IFRAME_INTERVAL,
      VITE_KEYCLOAK_FLOW: windowEnv.KEYCLOAK_FLOW || viteEnv.VITE_KEYCLOAK_FLOW,
      
      // Session management
      VITE_AUTH_SESSION_TIMEOUT: windowEnv.AUTH_SESSION_TIMEOUT || viteEnv.VITE_AUTH_SESSION_TIMEOUT,
      VITE_AUTH_RENEW_TOKEN_MIN_VALIDITY: windowEnv.AUTH_RENEW_TOKEN_MIN_VALIDITY || viteEnv.VITE_AUTH_RENEW_TOKEN_MIN_VALIDITY,
      VITE_AUTH_LOGOUT_REDIRECT_URI: windowEnv.AUTH_LOGOUT_REDIRECT_URI || viteEnv.VITE_AUTH_LOGOUT_REDIRECT_URI,
      
      // Participant configuration
      VITE_PARTICIPANT_ID: windowEnv.PARTICIPANT_ID || viteEnv.VITE_PARTICIPANT_ID,
      VITE_BPN_VALIDATION_PATTERN: windowEnv.BPN_VALIDATION_PATTERN || viteEnv.VITE_BPN_VALIDATION_PATTERN,
      
      // Governance and policies
      VITE_GOVERNANCE_CONFIG: windowEnv.GOVERNANCE_CONFIG || viteEnv.VITE_GOVERNANCE_CONFIG,
      VITE_DTR_POLICIES_CONFIG: windowEnv.DTR_POLICIES_CONFIG || viteEnv.VITE_DTR_POLICIES_CONFIG,
      VITE_GOVERNANCE_STRICT_MODE: windowEnv.GOVERNANCE_STRICT_MODE || viteEnv.VITE_GOVERNANCE_STRICT_MODE,
      
      // Feature flags
      VITE_ENABLE_ADVANCED_LOGGING: windowEnv.ENABLE_ADVANCED_LOGGING || viteEnv.VITE_ENABLE_ADVANCED_LOGGING,
      VITE_ENABLE_PERFORMANCE_MONITORING: windowEnv.ENABLE_PERFORMANCE_MONITORING || viteEnv.VITE_ENABLE_PERFORMANCE_MONITORING,
      VITE_ENABLE_DEV_TOOLS: windowEnv.ENABLE_DEV_TOOLS || viteEnv.VITE_ENABLE_DEV_TOOLS,
      
      // UI configuration
      VITE_UI_THEME: windowEnv.UI_THEME || viteEnv.VITE_UI_THEME,
      VITE_UI_LOCALE: windowEnv.UI_LOCALE || viteEnv.VITE_UI_LOCALE,
      VITE_UI_COMPACT_MODE: windowEnv.UI_COMPACT_MODE || viteEnv.VITE_UI_COMPACT_MODE,
    };
  }

  private static buildConfig(raw: RawEnvironmentConfig): AppConfig {
    const isDevelopment = raw.VITE_APP_ENVIRONMENT === 'development';
    
    return {
      app: {
        environment: (raw.VITE_APP_ENVIRONMENT as 'development' | 'staging' | 'production') || 'development',
        version: raw.VITE_APP_VERSION || '1.0.0',
        buildTime: (import.meta as any)?.env?.VITE_BUILD_TIME || new Date().toISOString(),
      },
      
      api: {
        ichubBackendUrl: raw.VITE_ICHUB_BACKEND_URL || (isDevelopment ? 'http://localhost:9000/v1' : ''),
        timeout: parseInt(raw.VITE_API_TIMEOUT || '30000', 10),
        retryAttempts: parseInt(raw.VITE_API_RETRY_ATTEMPTS || '3', 10),
        requireHttpsUrlPattern: raw.VITE_REQUIRE_HTTPS_URL_PATTERN !== 'false',
        
        // API key configuration
        apiKey: raw.VITE_API_KEY,
        apiKeyHeader: raw.VITE_API_KEY_HEADER || 'X-API-Key',
        enableApiKeyRotation: raw.VITE_ENABLE_API_KEY_ROTATION === 'true',
        apiKeyExpiryWarningDays: parseInt(raw.VITE_API_KEY_EXPIRY_WARNING_DAYS || '7', 10),
      },
      
      // Authentication configuration
      auth: {
        enabled: raw.VITE_AUTH_ENABLED === 'true',
        provider: (raw.VITE_AUTH_PROVIDER as 'keycloak' | 'none') || 'none',
        
        // Keycloak configuration (only if auth is enabled and provider is keycloak)
        keycloak: raw.VITE_AUTH_ENABLED === 'true' && raw.VITE_AUTH_PROVIDER === 'keycloak' ? {
          url: raw.VITE_KEYCLOAK_URL || '',
          realm: raw.VITE_KEYCLOAK_REALM || '',
          clientId: raw.VITE_KEYCLOAK_CLIENT_ID || '',
          onLoad: (raw.VITE_KEYCLOAK_ON_LOAD as 'login-required' | 'check-sso') || 'check-sso',
          checkLoginIframe: raw.VITE_KEYCLOAK_CHECK_LOGIN_IFRAME !== 'false',
          silentCheckSsoRedirectUri: raw.VITE_KEYCLOAK_SILENT_CHECK_SSO_REDIRECT_URI,
          pkceMethod: (raw.VITE_KEYCLOAK_PKCE_METHOD as 'S256' | 'plain') || 'S256',
          enableLogging: raw.VITE_KEYCLOAK_ENABLE_LOGGING === 'true' || isDevelopment,
          minValidity: parseInt(raw.VITE_KEYCLOAK_MIN_VALIDITY || '30', 10),
          checkLoginIframeInterval: parseInt(raw.VITE_KEYCLOAK_CHECK_LOGIN_IFRAME_INTERVAL || '5', 10),
          flow: (raw.VITE_KEYCLOAK_FLOW as 'standard' | 'implicit' | 'hybrid') || 'standard',
        } : undefined,
        
        // Session management
        sessionTimeout: parseInt(raw.VITE_AUTH_SESSION_TIMEOUT || '3600000', 10), // 1 hour default
        renewTokenMinValidity: parseInt(raw.VITE_AUTH_RENEW_TOKEN_MIN_VALIDITY || '300', 10), // 5 minutes default
        logoutRedirectUri: raw.VITE_AUTH_LOGOUT_REDIRECT_URI,
      },
      
      participant: {
        id: raw.VITE_PARTICIPANT_ID || 'BPNL0000000093Q7',
        bpnValidationPattern: raw.VITE_BPN_VALIDATION_PATTERN,
      },
      
      governance: {
        config: this.parseJsonConfig(raw.VITE_GOVERNANCE_CONFIG, []),
        dtrPolicies: this.parseJsonConfig(raw.VITE_DTR_POLICIES_CONFIG, this.getDefaultDtrPolicies()),
        strictMode: raw.VITE_GOVERNANCE_STRICT_MODE === 'true',
      },
      
      features: {
        enableAdvancedLogging: raw.VITE_ENABLE_ADVANCED_LOGGING === 'true' || isDevelopment,
        enablePerformanceMonitoring: raw.VITE_ENABLE_PERFORMANCE_MONITORING === 'true',
        enableDevTools: raw.VITE_ENABLE_DEV_TOOLS === 'true' || isDevelopment,
      },
      
      ui: {
        theme: (raw.VITE_UI_THEME as 'light' | 'dark' | 'auto') || 'auto',
        locale: raw.VITE_UI_LOCALE || 'en',
        compactMode: raw.VITE_UI_COMPACT_MODE === 'true',
      },
    };
  }

  private static parseJsonConfig<T>(jsonString: string | undefined, defaultValue: T): T {
    if (!jsonString) return defaultValue;
    
    try {
      return JSON.parse(jsonString) as T;
    } catch (error) {
      console.warn(`Failed to parse JSON configuration: ${error}`);
      return defaultValue;
    }
  }

  private static validateConfig(config: AppConfig): void {
    const errors: string[] = [];
    
    // Validate required fields
    if (!config.api.ichubBackendUrl) {
      errors.push('Backend URL is required');
    }
    
    if (!config.participant.id) {
      errors.push('Participant ID is required');
    }
    
    // Validate URL patterns
    if (config.api.ichubBackendUrl && !this.isValidUrl(config.api.ichubBackendUrl)) {
      errors.push('Invalid backend URL format');
    }
    
    // Validate participant ID format (BPN pattern)
    if (config.participant.id && !this.isValidBpn(config.participant.id)) {
      errors.push('Invalid participant ID format (must be valid BPN)');
    }
    
    // Validate numeric ranges
    if (config.api.timeout < 1000 || config.api.timeout > 300000) {
      errors.push('API timeout must be between 1000ms and 300000ms');
    }
    
    if (config.api.retryAttempts < 0 || config.api.retryAttempts > 10) {
      errors.push('API retry attempts must be between 0 and 10');
    }
    
    // API key validation
    if (config.app.environment === 'production' && !config.api.apiKey) {
      console.warn('API key is not configured for production environment');
    }
    
    if (config.api.apiKey && config.api.apiKey.length < 32) {
      errors.push('API key must be at least 32 characters long');
    }
    
    if (config.api.apiKeyExpiryWarningDays < 1 || config.api.apiKeyExpiryWarningDays > 365) {
      errors.push('API key expiry warning days must be between 1 and 365');
    }
    
    // Authentication validation
    if (config.auth.enabled) {
      if (config.auth.provider === 'keycloak') {
        if (!config.auth.keycloak) {
          errors.push('Keycloak configuration is required when auth provider is keycloak');
        } else {
          if (!config.auth.keycloak.url) {
            errors.push('Keycloak URL is required');
          }
          if (!config.auth.keycloak.realm) {
            errors.push('Keycloak realm is required');
          }
          if (!config.auth.keycloak.clientId) {
            errors.push('Keycloak client ID is required');
          }
          
          // Validate Keycloak URL format
          if (config.auth.keycloak.url && !this.isValidUrl(config.auth.keycloak.url)) {
            errors.push('Invalid Keycloak URL format');
          }
        }
      }
      
      // Validate session timeout
      if (config.auth.sessionTimeout < 60000) { // Minimum 1 minute
        errors.push('Session timeout must be at least 60 seconds');
      }
      
      // Validate token renewal settings
      if (config.auth.renewTokenMinValidity < 30) { // Minimum 30 seconds
        errors.push('Token renewal min validity must be at least 30 seconds');
      }
    }
    
    if (errors.length > 0) {
      throw new ConfigurationError(`Configuration validation failed: ${errors.join(', ')}`);
    }
  }

  private static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private static isValidBpn(bpn: string): boolean {
    // BPN format: BPNL followed by 10 alphanumeric characters
    const bpnPattern = /^BPN[LAS]\d{10}[a-zA-Z0-9]{2}$/;
    return bpnPattern.test(bpn);
  }

  // Cache management for performance
  private static loadFromCache(): AppConfig | null {
    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      if (!cached) return null;
      
      const parsed = JSON.parse(cached);
      if (parsed.version !== this.CACHE_VERSION) return null;
      
      return parsed.config as AppConfig;
    } catch {
      return null;
    }
  }

  private static saveToCache(config: AppConfig): void {
    try {
      const cacheData = {
        version: this.CACHE_VERSION,
        timestamp: Date.now(),
        config,
      };
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(cacheData));
    } catch {
      // Ignore cache errors
    }
  }

  static clearCache(): void {
    localStorage.removeItem(this.CACHE_KEY);
    this.instance = null;
  }

  static reload(): AppConfig {
    this.clearCache();
    return this.create();
  }

  private static getDefaultDtrPolicies(): GovernancePolicy[] {
    return [{
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
    }];
  }
}