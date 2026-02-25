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

import axios, { AxiosError, AxiosInstance } from 'axios';
import authService from './AuthService';
import environmentService, { getIchubBackendUrl } from './EnvironmentService';

const httpClient: AxiosInstance = axios.create({
  timeout: environmentService.getApiConfig().timeout || 30000,
});

/**
 * Wait for authentication to be ready before making API requests.
 * This prevents 401 errors from requests made before the token is available.
 */
const waitForAuth = async (maxWaitMs: number = 5000): Promise<void> => {
  if (!environmentService.isAuthEnabled()) {
    return; // No auth needed
  }

  const startTime = Date.now();
  while (Date.now() - startTime < maxWaitMs) {
    const authState = authService.getAuthState();
    
    // If authenticated, proceed with the request
    if (authState.isAuthenticated) {
      return;
    }
    
    // If there's an error or not loading anymore, stop waiting to avoid blocking forever
    if (authState.error || !authState.isLoading) {
      return;
    }
    
    // Wait a bit before checking again
    await new Promise(resolve => setTimeout(resolve, 50));
  }
};

httpClient.interceptors.request.use(async (config) => {
  // Wait for authentication to be ready before making the request
  await waitForAuth();
  
  const envHeaders = environmentService.getApiHeaders();
  const authHeaders = authService.getAuthHeaders();
  config.headers = {
    ...(config.headers || {}),
    ...envHeaders,
    ...authHeaders,
  } as any;
  const backendUrl = getIchubBackendUrl();
  if (backendUrl && config.url && config.url.startsWith('/')) {
    config.url = `${backendUrl}${config.url}`;
  }
  return config;
});

httpClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      try { await authService.logout(); } catch {}
    }
    return Promise.reject(error);
  }
);

export default httpClient;
