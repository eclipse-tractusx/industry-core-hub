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

import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import RefreshIcon from '@mui/icons-material/Refresh';

interface ErrorPageProps {
  title?: string;
  message: string;
  causes?: string[];
  showRefreshButton?: boolean;
  onRefresh?: () => void;
  helpText?: string;
}

/**
 * Reusable error page component with professional styling
 */
export function ErrorPage({
  title = 'An Error Occurred',
  message,
  causes,
  showRefreshButton = true,
  onRefresh,
  helpText = 'If the problem persists, please contact your system administrator'
}: ErrorPageProps) {
  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    } else {
      window.location.reload();
    }
  };

  return (
    <Box
      display="flex"
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      gap={3}
      sx={{
        background: 'linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%)',
        padding: 4
      }}
    >
      <WarningAmberIcon 
        sx={{ 
          fontSize: 120, 
          color: '#ff9800',
          filter: 'drop-shadow(0px 4px 8px rgba(255, 152, 0, 0.3))'
        }} 
      />
      
      <Typography 
        variant="h3" 
        fontWeight="bold"
        sx={{ 
          color: '#d32f2f',
          textAlign: 'center'
        }}
      >
        {title}
      </Typography>
      
      <Typography 
        variant="h6" 
        textAlign="center" 
        maxWidth="600px"
        sx={{ 
          color: '#424242',
          lineHeight: 1.6
        }}
      >
        {message}
      </Typography>
      
      {causes && causes.length > 0 && (
        <Box
          sx={{
            backgroundColor: '#fff3cd',
            border: '1px solid #ffc107',
            borderRadius: 2,
            padding: 3,
            maxWidth: '600px',
            marginTop: 2
          }}
        >
          <Typography variant="body1" sx={{ color: '#856404', marginBottom: 1 }}>
            <strong>Possible causes:</strong>
          </Typography>
          {causes.map((cause, index) => (
            <Typography key={index} variant="body2" sx={{ color: '#856404', marginLeft: 2 }}>
              • {cause}
            </Typography>
          ))}
        </Box>
      )}

      {showRefreshButton && (
        <Button
          variant="contained"
          size="large"
          startIcon={<RefreshIcon />}
          onClick={handleRefresh}
          sx={{
            marginTop: 3,
            paddingX: 4,
            paddingY: 1.5,
            backgroundColor: '#1976d2',
            '&:hover': {
              backgroundColor: '#1565c0',
            },
            textTransform: 'none',
            fontSize: '1.1rem',
            fontWeight: 600,
            boxShadow: 3
          }}
        >
          Retry
        </Button>
      )}

      <Typography 
        variant="body2" 
        sx={{ 
          color: '#757575',
          marginTop: 2,
          textAlign: 'center',
          maxWidth: '600px'
        }}
      >
        {helpText}
      </Typography>
    </Box>
  );
}

export default ErrorPage;
