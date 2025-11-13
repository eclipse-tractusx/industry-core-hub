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

  // Show loading spinner while authentication is being initialized
  if (isLoading) {
    return fallback || (
      <Box 
        display="flex" 
        flexDirection="column"
        justifyContent="center" 
        alignItems="center" 
        minHeight="100vh"
        gap={3}
        sx={{ 
          background: 'black',
          color: 'white'
        }}
      >
        <CircularProgress size={80} sx={{ color: 'white' }} />
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
      <Box 
        display="flex" 
        flexDirection="column"
        justifyContent="center" 
        alignItems="center" 
        minHeight="60vh"
        gap={2}
      >
        <Typography variant="h5" color="error">
          Authentication Error
        </Typography>
        <Typography variant="body1" color="textSecondary" textAlign="center">
          {error}
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Please try refreshing the page or contact support if the problem persists.
        </Typography>
      </Box>
    );
  }

  // If not authenticated, Keycloak will redirect to login page
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
          background: 'black',
          color: 'white'
        }}
      >
        <CircularProgress size={80} sx={{ color: 'white' }} />
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
        <Box 
          display="flex" 
          flexDirection="column"
          justifyContent="center" 
          alignItems="center" 
          minHeight="60vh"
          gap={2}
        >
          <Typography variant="h5" color="warning.main">
            Access Denied
          </Typography>
          <Typography variant="body1" color="textSecondary" textAlign="center">
            You don't have the required role to access this content.
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Required roles: {requireRoles.join(', ')}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Your roles: {user?.roles.join(', ') || 'None'}
          </Typography>
        </Box>
      );
    }
  }

  // Check permission requirements
  if (requirePermissions.length > 0) {
    const hasRequiredPermission = requirePermissions.some(permission => hasPermission(permission));
    if (!hasRequiredPermission) {
      return (
        <Box 
          display="flex" 
          flexDirection="column"
          justifyContent="center" 
          alignItems="center" 
          minHeight="60vh"
          gap={2}
        >
          <Typography variant="h5" color="warning.main">
            Access Denied
          </Typography>
          <Typography variant="body1" color="textSecondary" textAlign="center">
            You don't have the required permissions to access this content.
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Required permissions: {requirePermissions.join(', ')}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Your permissions: {user?.permissions.join(', ') || 'None'}
          </Typography>
        </Box>
      );
    }
  }

  // User is authenticated and has required roles/permissions
  return <>{children}</>;
}

export default ProtectedRoute;