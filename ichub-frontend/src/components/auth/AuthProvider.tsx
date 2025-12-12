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
 
import React, { useEffect, useState } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import authService from '../../services/AuthService';
import environmentService from '../../services/EnvironmentService';
import ErrorPage from '../common/ErrorPage';
 
interface AuthProviderProps {
  children: React.ReactNode;
}
 
/**
* Component that initializes authentication and provides auth context to the entire app
*/
export function AuthProvider({ children }: AuthProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
 
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        if (!environmentService.isAuthEnabled()) {
          setIsInitialized(true);
          return;
        }
 
        await authService.initialize();
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize authentication:', error);
        setInitError(error instanceof Error ? error.message : 'Authentication initialization failed');
        setIsInitialized(true);
      }
    };
 
    initializeAuth();
  }, []);
 
  // Show loading screen while initializing
  if (!isInitialized) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        gap={3}
        sx={{
          background: 'white',
          color: 'black'
        }}
      >
        <CircularProgress size={80} sx={{ color: 'black' }} />
        <Typography variant="h4" fontWeight="bold">
          Industry Core Hub
        </Typography>
        <Typography variant="h6">
          Initializing authentication...
        </Typography>
      </Box>
    );
  }
 
  // Show error screen if initialization failed
  if (initError) {
    return (
      <ErrorPage
        title="Authentication Failed"
        message={initError}
        causes={[
          'Invalid credentials or user not authorized',
          'Keycloak service is not running or misconfigured',
          'Network connectivity issues'
        ]}
        showRefreshButton={true}
        helpText="If the problem persists, please contact your system administrator"
      />
    );
  }
 
  // Authentication initialized successfully, render the app
  return <>{children}</>;
}
 
export default AuthProvider;
 