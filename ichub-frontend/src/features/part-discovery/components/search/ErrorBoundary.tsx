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

import { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Typography, Button, Alert, AlertTitle } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import BugReportIcon from '@mui/icons-material/BugReport';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  handleRefresh = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            p: 4,
            textAlign: 'center',
            background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
          }}
        >
          <BugReportIcon 
            sx={{ 
              fontSize: 80, 
              color: 'error.main', 
              mb: 3 
            }} 
          />
          
          <Alert 
            severity="error" 
            sx={{ 
              maxWidth: 600, 
              width: '100%', 
              mb: 4,
              textAlign: 'left'
            }}
          >
            <AlertTitle>
              <Typography variant="h6" component="div">
                Oops! Something went wrong
              </Typography>
            </AlertTitle>
            <Typography variant="body2" sx={{ mb: 2 }}>
              The application encountered an unexpected error. This might be due to:
            </Typography>
            <Box component="ul" sx={{ pl: 2, mb: 2 }}>
              <Typography component="li" variant="body2">
                Backend service unavailable
              </Typography>
              <Typography component="li" variant="body2">
                Network connectivity issues
              </Typography>
              <Typography component="li" variant="body2">
                Invalid data format
              </Typography>
            </Box>
            {this.state.error && (
              <Typography 
                variant="caption" 
                sx={{ 
                  display: 'block',
                  fontFamily: 'monospace',
                  backgroundColor: 'rgba(0,0,0,0.1)',
                  p: 1,
                  borderRadius: 1,
                  mt: 2
                }}
              >
                {this.state.error.message}
              </Typography>
            )}
          </Alert>

          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Button
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={this.handleRefresh}
              sx={{
                background: 'linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #1565c0 30%, #2196f3 90%)',
                }
              }}
            >
              Refresh Page
            </Button>
            <Button
              variant="outlined"
              onClick={() => window.location.href = '/'}
              sx={{ borderColor: '#1976d2', color: '#1976d2' }}
            >
              Go to Home
            </Button>
          </Box>

          <Typography 
            variant="caption" 
            color="textSecondary" 
            sx={{ mt: 4, maxWidth: 500 }}
          >
            If this problem persists, please contact your system administrator or check if the backend services are running.
          </Typography>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
