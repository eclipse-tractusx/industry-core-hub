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

import { createRoot } from 'react-dom/client'
import { theme } from './theme/theme.ts'
import { ThemeProvider } from '@mui/material/styles';
import AuthProvider from './components/auth/AuthProvider.tsx'
import environmentService from './services/EnvironmentService';

import App from './App.tsx'

// Check if authentication is enabled
const isAuthEnabled = environmentService.isAuthEnabled();

// Debug logging
if (window.ENV && window.ENV.ENABLE_DEV_TOOLS === 'true') {
  try {
    console.log('=== Authentication Configuration Debug ===');
    console.log('window.ENV:', window.ENV);
    console.log('isAuthEnabled:', isAuthEnabled);
    console.log('authProvider:', environmentService.getAuthProvider());
    if (isAuthEnabled) {
      try {
        const keycloakConfig = environmentService.getKeycloakConfig();
        console.log('Keycloak Config:', keycloakConfig);
      } catch (e) {
        console.error('Failed to get Keycloak config:', e);
      }
    }
    console.log('==========================================');
  } catch (e) {
    // ignore logging errors
  }
}

createRoot(document.getElementById('root')!).render(
  <ThemeProvider theme={theme}>
    {isAuthEnabled ? (
      <AuthProvider>
        <App />
      </AuthProvider>
    ) : (
      <App />
    )}
  </ThemeProvider>,
)
