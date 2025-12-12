/********************************************************************************
* Eclipse Tractus-X - Industry Core Hub Frontend
*
* Copyright (c) 2025 LKS Next
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
  private initializing = false;
  private authState: AuthState = {
    isAuthenticated: false,
    isLoading: true,
    user: null,
    tokens: null,
    error: null,
  };
  private listeners: ((state: AuthState) => void)[] = [];
 
  async initialize(): Promise<void> {
    if (this.initialized) {
      if (window.ENV && window.ENV.ENABLE_DEV_TOOLS === 'true') try { console.log('🔐 AuthService already initialized, skipping'); } catch(e) {}
      return;
    }
 
    if (this.initializing) {
      if (window.ENV && window.ENV.ENABLE_DEV_TOOLS === 'true') try { console.log('🔐 AuthService initialization already in progress, skipping'); } catch(e) {}
      return;
    }
 
    this.initializing = true;
 
    try {
      if (window.ENV && window.ENV.ENABLE_DEV_TOOLS === 'true') try {
        console.log('🔐 AuthService.initialize() called');
        console.log('  - isAuthEnabled:', environmentService.isAuthEnabled());
        console.log('  - authProvider:', environmentService.getAuthProvider());
        console.log('  - isKeycloakEnabled:', environmentService.isKeycloakEnabled());
      } catch(e) {}
      
      if (!environmentService.isAuthEnabled()) {
        console.log('  ⚠️ Auth is disabled, skipping initialization');
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
 
      if (environmentService.isKeycloakEnabled()) {
        if (window.ENV && window.ENV.ENABLE_DEV_TOOLS === 'true') try { console.log('  ✅ Keycloak is enabled, initializing...'); } catch(e) {}
        await this.initializeKeycloak();
      } else {
        if (window.ENV && window.ENV.ENABLE_DEV_TOOLS === 'true') try { console.log('  ⚠️ Keycloak is not enabled'); } catch(e) {}
      }
 
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize authentication:', error);
      this.setAuthState({
        ...this.authState,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Authentication initialization failed',
      });
    } finally {
      this.initializing = false;
    }
  }
 
  private async initializeKeycloak(): Promise<void> {
    const keycloakConfig = environmentService.getKeycloakConfig();
    const initOptions = environmentService.getKeycloakInitOptions();
 
    if (window.ENV && window.ENV.ENABLE_DEV_TOOLS === 'true') try {
      console.log('🔐 Initializing Keycloak with config:', {
        url: keycloakConfig.url,
        realm: keycloakConfig.realm,
        clientId: keycloakConfig.clientId,
        onLoad: initOptions.onLoad
      });
      console.log('📍 Current URL:', window.location.href);
      console.log('🔗 URL has code:', window.location.href.includes('code='));
      console.log('🔗 URL has state:', window.location.href.includes('state='));
    } catch(e) {}
 
    this.keycloak = new Keycloak({
      url: keycloakConfig.url,
      realm: keycloakConfig.realm,
      clientId: keycloakConfig.clientId
    });
 
    try {
      if (window.ENV && window.ENV.ENABLE_DEV_TOOLS === 'true') try { console.log('⏳ Calling keycloak.init()...'); } catch(e) {}
      
      // Add timeout to prevent infinite hanging
      const initPromise = this.keycloak.init({
        onLoad: initOptions.onLoad,
        checkLoginIframe: initOptions.checkLoginIframe,
        pkceMethod: initOptions.pkceMethod as 'S256',
        enableLogging: initOptions.enableLogging
      });
 
      const timeoutPromise = new Promise<boolean>((_, reject) => {
        setTimeout(() => reject(new Error('Keycloak initialization timeout')), 30000); // 30 second timeout
      });
 
      const authenticated = await Promise.race([initPromise, timeoutPromise]);
 
      if (window.ENV && window.ENV.ENABLE_DEV_TOOLS === 'true') try { console.log('✅ Keycloak init completed. Authenticated:', authenticated); } catch(e) {}
      
      if (window.ENV && window.ENV.ENABLE_DEV_TOOLS === 'true') try {
        if (this.keycloak && this.keycloak.token) {
          console.log('🎫 Token received: (truncated)');
        } else {
          console.log('⚠️ No token available');
        }
      } catch(e) {}
 
      if (authenticated) {
        console.log('✅ User is authenticated, loading profile...');
        
        // Clean up OAuth callback parameters from URL to prevent re-processing
        if (window.location.search.includes('state=') || window.location.search.includes('code=')) {
          if (window.ENV && window.ENV.ENABLE_DEV_TOOLS === 'true') try { console.log('🧹 Cleaning up OAuth callback parameters from URL'); } catch(e) {}
          const cleanUrl = window.location.origin + window.location.pathname;
          window.history.replaceState({}, document.title, cleanUrl);
        }
        
        await this.handleAuthenticationSuccess();
      } else {
        console.log('⚠️ User is not authenticated after init, redirecting to login...');
        // With check-sso, if not authenticated, we need to manually trigger login
        await this.keycloak.login({
          redirectUri: window.location.origin + window.location.pathname
        });
        // Note: login() will redirect, so code after this won't execute
      }
 
      this.setupTokenRefresh();
      this.setupKeycloakEvents();
 
    } catch (error) {
      console.error('❌ Keycloak initialization failed:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        error
      });
      this.setAuthState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        tokens: null,
        error: error instanceof Error ? error.message : 'Keycloak initialization failed',
      });
    }
  }
 
  private async handleAuthenticationSuccess(): Promise<void> {
    if (!this.keycloak) return;
 
    try {
      // Get token details
      const tokenParsed = this.keycloak.tokenParsed;
      const token = this.keycloak.token;
      const refreshToken = this.keycloak.refreshToken;
      const idToken = this.keycloak.idToken;
 
      if (!token || !tokenParsed) {
        throw new Error('Invalid token received');
      }

      if (window.ENV && window.ENV.ENABLE_DEV_TOOLS === 'true') try { console.log('📋 Token parsed: (redacted)'); } catch(e) {}
 
      // Extract user info from token claims (avoid loadUserProfile which has CORS issues)
      const user: AuthUser = {
        id: tokenParsed.sub || '',
        username: tokenParsed.preferred_username || '',
        email: tokenParsed.email,
        firstName: tokenParsed.given_name,
        lastName: tokenParsed.family_name,
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