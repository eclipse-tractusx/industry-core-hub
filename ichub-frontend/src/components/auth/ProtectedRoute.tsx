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

import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import useAuth from '../../hooks/useAuth';
import ErrorPage from '../common/ErrorPage';

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requireRoles?: string[];
  requirePermissions?: string[];
}

/**
 * Component that protects routes and content based on authentication status and roles/permissions
 */
export function ProtectedRoute({ 
  children, 
  fallback, 
  requireRoles = [], 
  requirePermissions = [] 
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user, hasRole, hasPermission, error } = useAuth();

  // Show loading state FIRST - don't mount children until auth is ready
  // This prevents pages from mounting and showing their own loading states
  // while authentication is still being checked
  if (isLoading) {
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
          Authenticating...
        </Typography>
      </Box>
    );
  }

  // Show error if authentication failed
  if (error) {
    return (
      <ErrorPage
        title="Authentication Error"
        message={error}
        causes={[
          'Session expired or invalid',
          'Authentication service unavailable',
          'Permission denied'
        ]}
        showRefreshButton={true}
        helpText="Please try refreshing the page or contact support if the problem persists."
      />
    );
  }

  // If not authenticated and not loading, Keycloak will redirect to login page
  // This is handled by the AuthService initialization with onLoad: 'login-required'
  if (!isAuthenticated) {
    return fallback || (
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
          Redirecting to login...
        </Typography>
      </Box>
    );
  }

  // Check role requirements
  if (requireRoles.length > 0) {
    const hasRequiredRole = requireRoles.some(role => hasRole(role));
    if (!hasRequiredRole) {
      return (
        <ErrorPage
          title="Access Denied"
          message="You don't have the required role to access this content."
          causes={[
            `Required roles: ${requireRoles.join(', ')}`,
            `Your roles: ${user?.roles.join(', ') || 'None'}`
          ]}
          showRefreshButton={false}
          helpText="Please contact your administrator if you believe you should have access to this content."
        />
      );
    }
  }

  // Check permission requirements
  if (requirePermissions.length > 0) {
    const hasRequiredPermission = requirePermissions.some(permission => hasPermission(permission));
    if (!hasRequiredPermission) {
      return (
        <ErrorPage
          title="Access Denied"
          message="You don't have the required permissions to access this content."
          causes={[
            `Required permissions: ${requirePermissions.join(', ')}`,
            `Your permissions: ${user?.permissions.join(', ') || 'None'}`
          ]}
          showRefreshButton={false}
          helpText="Please contact your administrator if you believe you should have access to this content."
        />
      );
    }
  }

  // User is authenticated and has required roles/permissions
  return <>{children}</>;
}

export default ProtectedRoute;