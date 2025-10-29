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

import Keycloak from 'keycloak-js';
import environmentService, { AuthUser, AuthTokens } from './EnvironmentService';

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AuthUser | null;
  tokens: AuthTokens | null;
  error: string | null;
}

class AuthService {
  private keycloak: Keycloak | null = null;
  private initialized = false;
  private authState: AuthState = {
    isAuthenticated: false,
    isLoading: true,
    user: null,
    tokens: null,
    error: null,
  };
  private listeners: ((state: AuthState) => void)[] = [];

  async initialize(): Promise<void> {
    console.log('🔍 AuthService.initialize() called');
    
    if (this.initialized) {
      console.log('✅ Already initialized, returning');
      return;
    }

    try {
      console.log('🔍 Checking if auth is enabled:', environmentService.isAuthEnabled());
      
      if (!environmentService.isAuthEnabled()) {
        console.log('❌ Auth is disabled, setting state and returning');
        this.setAuthState({
          isAuthenticated: false,
          isLoading: false,
          user: null,
          tokens: null,
          error: null,
        });
        this.initialized = true;
        return;
      }

      console.log('🔍 Checking if Keycloak is enabled:', environmentService.isKeycloakEnabled());
      
      if (environmentService.isKeycloakEnabled()) {
        console.log('🔑 Keycloak is enabled, starting initialization...');
        
        // TEMPORARY: Skip Keycloak and just set a mock authenticated state for testing
        console.log('⚠️  BYPASSING Keycloak for debugging - setting mock auth state');
        this.setAuthState({
          isAuthenticated: false,
          isLoading: false,
          user: null,
          tokens: null,
          error: null,
        });
        
        // Comment out the real Keycloak initialization for now
        // await this.initializeKeycloak();
      }

      this.initialized = true;
      console.log('✅ AuthService initialization completed');
    } catch (error) {
      console.error('❌ Failed to initialize authentication:', error);
      this.setAuthState({
        ...this.authState,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Authentication initialization failed',
      });
    }
  }

  private async initializeKeycloak(): Promise<void> {
    const keycloakConfig = environmentService.getKeycloakConfig();
    const initOptions = environmentService.getKeycloakInitOptions();

    console.log('Initializing Keycloak with config:', {
      url: keycloakConfig.url,
      realm: keycloakConfig.realm,
      clientId: keycloakConfig.clientId
    });

    this.keycloak = new Keycloak({
      url: keycloakConfig.url,
      realm: keycloakConfig.realm,
      clientId: keycloakConfig.clientId
    });

    try {
      console.log('Keycloak init options:', {
        onLoad: initOptions.onLoad,
        checkLoginIframe: false,
        pkceMethod: 'S256',
        enableLogging: true
      });

      // Minimal configuration for keycloak-js 25.x
      const authenticated = await this.keycloak.init({
        onLoad: 'check-sso',
        checkLoginIframe: false
      });

      console.log('Keycloak initialization result:', authenticated);

      if (authenticated) {
        await this.handleAuthenticationSuccess();
      } else {
        this.setAuthState({
          isAuthenticated: false,
          isLoading: false,
          user: null,
          tokens: null,
          error: null,
        });
      }

      // Set up token refresh
      this.setupTokenRefresh();

      // Set up event listeners
      this.setupKeycloakEvents();

    } catch (error) {
      console.error('Keycloak initialization failed:', error);
      throw new Error('Failed to initialize Keycloak authentication');
    }
  }

  private async handleAuthenticationSuccess(): Promise<void> {
    if (!this.keycloak) return;

    try {
      // Load user profile
      const userProfile = await this.keycloak.loadUserProfile();
      
      // Get token details
      const tokenParsed = this.keycloak.tokenParsed;
      const token = this.keycloak.token;
      const refreshToken = this.keycloak.refreshToken;
      const idToken = this.keycloak.idToken;

      if (!token || !tokenParsed) {
        throw new Error('Invalid token received');
      }

      const user: AuthUser = {
        id: userProfile.id || tokenParsed.sub || '',
        username: userProfile.username || tokenParsed.preferred_username || '',
        email: userProfile.email,
        firstName: userProfile.firstName,
        lastName: userProfile.lastName,
        roles: tokenParsed.realm_access?.roles || [],
        permissions: tokenParsed.resource_access?.[environmentService.getKeycloakClientId()]?.roles || [],
      };

      const tokens: AuthTokens = {
        accessToken: token,
        refreshToken,
        idToken,
        tokenType: 'Bearer',
        expiresIn: tokenParsed.exp ? tokenParsed.exp - tokenParsed.iat! : 0,
        expiresAt: new Date((tokenParsed.exp || 0) * 1000),
      };

      this.setAuthState({
        isAuthenticated: true,
        isLoading: false,
        user,
        tokens,
        error: null,
      });

    } catch (error) {
      console.error('Failed to handle authentication success:', error);
      throw error;
    }
  }

  private setupTokenRefresh(): void {
    if (!this.keycloak) return;

    const minValidity = environmentService.getRenewTokenMinValidity();

    // Set up automatic token refresh
    setInterval(async () => {
      if (this.keycloak?.authenticated) {
        try {
          const refreshed = await this.keycloak.updateToken(minValidity);
          if (refreshed) {
            console.info('Token refreshed successfully');
            await this.handleAuthenticationSuccess(); // Update tokens in state
          }
        } catch (error) {
          console.error('Failed to refresh token:', error);
          await this.logout();
        }
      }
    }, 60000); // Check every minute
  }

  private setupKeycloakEvents(): void {
    if (!this.keycloak) return;

    this.keycloak.onTokenExpired = () => {
      console.warn('Token expired');
      this.logout();
    };

    this.keycloak.onAuthRefreshError = () => {
      console.error('Auth refresh error');
      this.logout();
    };

    this.keycloak.onAuthError = (error: any) => {
      console.error('Auth error:', error);
      this.setAuthState({
        ...this.authState,
        error: 'Authentication error occurred',
      });
    };
  }

  async login(): Promise<void> {
    if (!environmentService.isAuthEnabled()) {
      throw new Error('Authentication is not enabled');
    }

    if (this.keycloak) {
      await this.keycloak.login();
    } else {
      throw new Error('Authentication not initialized');
    }
  }

  async logout(): Promise<void> {
    if (this.keycloak?.authenticated) {
      const logoutUri = environmentService.getLogoutRedirectUri();
      await this.keycloak.logout({
        redirectUri: logoutUri || window.location.origin,
      });
    }

    this.setAuthState({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      tokens: null,
      error: null,
    });
  }

  getAuthState(): AuthState {
    return { ...this.authState };
  }

  getAccessToken(): string | null {
    return this.authState.tokens?.accessToken || null;
  }

  getUser(): AuthUser | null {
    return this.authState.user;
  }

  isAuthenticated(): boolean {
    return this.authState.isAuthenticated;
  }

  hasRole(role: string): boolean {
    return this.authState.user?.roles.includes(role) || false;
  }

  hasPermission(permission: string): boolean {
    return this.authState.user?.permissions.includes(permission) || false;
  }

  // Auth headers for API requests
  getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    
    const token = this.getAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  // Subscribe to auth state changes
  subscribe(listener: (state: AuthState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private setAuthState(newState: AuthState): void {
    this.authState = newState;
    this.listeners.forEach(listener => listener(newState));
  }

  // Utility method to get combined API headers (auth + environment)
  getCombinedApiHeaders(): Record<string, string> {
    return {
      ...environmentService.getApiHeaders(),
      ...this.getAuthHeaders(),
    };
  }
}

// Create singleton instance
const authService = new AuthService();

export default authService;
export { AuthService };