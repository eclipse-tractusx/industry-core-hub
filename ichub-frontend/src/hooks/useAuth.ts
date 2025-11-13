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

import { useState, useEffect } from 'react';
import authService, { AuthState } from '../services/AuthService';

/**
 * Custom hook to manage authentication state in React components
 */
export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>(authService.getAuthState());

  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = authService.subscribe(setAuthState);
    
    // Cleanup subscription on unmount
    return unsubscribe;
  }, []);

  return {
    // State
    isAuthenticated: authState.isAuthenticated,
    isLoading: authState.isLoading,
    user: authState.user,
    tokens: authState.tokens,
    error: authState.error,
    
    // Actions
    login: () => authService.login(),
    logout: () => authService.logout(),
    
    // Utility methods
    hasRole: (role: string) => authService.hasRole(role),
    hasPermission: (permission: string) => authService.hasPermission(permission),
    getAccessToken: () => authService.getAccessToken(),
    getAuthHeaders: () => authService.getAuthHeaders(),
  };
}

export default useAuth;