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

/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Core application
  readonly VITE_APP_ENVIRONMENT: 'development' | 'staging' | 'production'
  readonly VITE_APP_VERSION: string
  readonly VITE_BUILD_TIME: string
  
  // API configuration
  readonly VITE_ICHUB_BACKEND_URL: string
  readonly VITE_API_TIMEOUT: string
  readonly VITE_API_RETRY_ATTEMPTS: string
  readonly VITE_REQUIRE_HTTPS_URL_PATTERN: string
  
  // API key configuration
  readonly VITE_API_KEY: string
  readonly VITE_API_KEY_HEADER: string
  readonly VITE_ENABLE_API_KEY_ROTATION: string
  readonly VITE_API_KEY_EXPIRY_WARNING_DAYS: string
  
  // Authentication configuration
  readonly VITE_AUTH_ENABLED: string
  readonly VITE_AUTH_PROVIDER: 'keycloak' | 'none'
  
  // Keycloak configuration
  readonly VITE_KEYCLOAK_URL: string
  readonly VITE_KEYCLOAK_REALM: string
  readonly VITE_KEYCLOAK_CLIENT_ID: string
  readonly VITE_KEYCLOAK_ON_LOAD: 'login-required' | 'check-sso'
  readonly VITE_KEYCLOAK_CHECK_LOGIN_IFRAME: string
  readonly VITE_KEYCLOAK_SILENT_CHECK_SSO_REDIRECT_URI: string
  readonly VITE_KEYCLOAK_PKCE_METHOD: 'S256' | 'plain'
  readonly VITE_KEYCLOAK_ENABLE_LOGGING: string
  readonly VITE_KEYCLOAK_MIN_VALIDITY: string
  readonly VITE_KEYCLOAK_CHECK_LOGIN_IFRAME_INTERVAL: string
  readonly VITE_KEYCLOAK_FLOW: 'standard' | 'implicit' | 'hybrid'
  
  // Session management
  readonly VITE_AUTH_SESSION_TIMEOUT: string
  readonly VITE_AUTH_RENEW_TOKEN_MIN_VALIDITY: string
  readonly VITE_AUTH_LOGOUT_REDIRECT_URI: string
  
  // Participant configuration
  readonly VITE_PARTICIPANT_ID: string
  readonly VITE_BPN_VALIDATION_PATTERN: string
  
  // Governance and policies
  readonly VITE_GOVERNANCE_CONFIG: string
  readonly VITE_DTR_POLICIES_CONFIG: string
  
  // Feature flags
  readonly VITE_ENABLE_ADVANCED_LOGGING: string
  readonly VITE_ENABLE_PERFORMANCE_MONITORING: string
  readonly VITE_ENABLE_DEV_TOOLS: string
  
  // UI configuration
  readonly VITE_UI_THEME: 'light' | 'dark' | 'auto'
  readonly VITE_UI_LOCALE: string
  readonly VITE_UI_COMPACT_MODE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Global build-time constants
declare const __APP_VERSION__: string;
declare const __BUILD_TIME__: string;
declare const __BUILD_MODE__: string;

declare global {
  interface Window {
    ENV?: {
      // Core application
      APP_ENVIRONMENT?: string;
      APP_VERSION?: string;
      
      // API configuration
      ICHUB_BACKEND_URL?: string;
      API_TIMEOUT?: string;
      API_RETRY_ATTEMPTS?: string;
      REQUIRE_HTTPS_URL_PATTERN?: string;
      
      // API key configuration
      API_KEY?: string;
      API_KEY_HEADER?: string;
      ENABLE_API_KEY_ROTATION?: string;
      API_KEY_EXPIRY_WARNING_DAYS?: string;
      
      // Authentication configuration
      AUTH_ENABLED?: string;
      AUTH_PROVIDER?: string;
      
      // Keycloak configuration
      KEYCLOAK_URL?: string;
      KEYCLOAK_REALM?: string;
      KEYCLOAK_CLIENT_ID?: string;
      KEYCLOAK_ON_LOAD?: string;
      KEYCLOAK_CHECK_LOGIN_IFRAME?: string;
      KEYCLOAK_SILENT_CHECK_SSO_REDIRECT_URI?: string;
      KEYCLOAK_PKCE_METHOD?: string;
      KEYCLOAK_ENABLE_LOGGING?: string;
      KEYCLOAK_MIN_VALIDITY?: string;
      KEYCLOAK_CHECK_LOGIN_IFRAME_INTERVAL?: string;
      KEYCLOAK_FLOW?: string;
      
      // Session management
      AUTH_SESSION_TIMEOUT?: string;
      AUTH_RENEW_TOKEN_MIN_VALIDITY?: string;
      AUTH_LOGOUT_REDIRECT_URI?: string;
      
      // Participant configuration
      PARTICIPANT_ID?: string;
      BPN_VALIDATION_PATTERN?: string;
      
      // Governance and policies
      GOVERNANCE_CONFIG?: string | object[];
      DTR_POLICIES_CONFIG?: string | object[];
      GOVERNANCE_STRICT_MODE?: string;
      
      // Feature flags
      ENABLE_ADVANCED_LOGGING?: string;
      ENABLE_PERFORMANCE_MONITORING?: string;
      ENABLE_DEV_TOOLS?: string;
      
      // UI configuration
      UI_THEME?: string;
      UI_LOCALE?: string;
      UI_COMPACT_MODE?: string;
    }
  }
}

export {};
