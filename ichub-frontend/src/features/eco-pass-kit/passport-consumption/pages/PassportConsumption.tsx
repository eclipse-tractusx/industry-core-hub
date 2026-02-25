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

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  Alert,
  IconButton
} from '@mui/material';
import {
  QrCodeScanner,
  Search,
  Close as CloseIcon,
  CheckCircle,
  RadioButtonUnchecked,
  Downloading,
  Security,
  VerifiedUser,
  Storage
} from '@mui/icons-material';
import { PassportTypeRegistry } from '../passport-types';

interface LoadingStep {
  id: string;
  label: string;
  icon: React.ElementType;
  description: string;
}

const LOADING_STEPS: LoadingStep[] = [
  { id: 'lookup', label: 'Looking up Asset', icon: Search, description: 'Searching in the dataspace registry' },
  { id: 'retrieve', label: 'Retrieving Data', icon: Downloading, description: 'Fetching passport from provider' },
  { id: 'verify', label: 'Verifying Data', icon: Security, description: 'Validating digital signatures' },
  { id: 'parse', label: 'Parsing Content', icon: Storage, description: 'Processing passport structure' },
  { id: 'complete', label: 'Ready', icon: VerifiedUser, description: 'Passport loaded successfully' }
];

const PassportConsumption: React.FC = () => {
  const [passportId, setPassportId] = useState('');
  const [showVisualization, setShowVisualization] = useState(false);
  const [passportData, setPassportData] = useState<Record<string, unknown> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const params = useParams();
  const navigate = useNavigate();

  // Validate Discovery ID format: CX:<manufacturerPartId>:<partInstanceId>
  const isValidDiscoveryId = (id: string): boolean => {
    const pattern = /^CX:[^:]+:[^:]+$/;
    return pattern.test(id.trim());
  };

  const handleSearch = async () => {
    const trimmedId = passportId.trim();
    if (!trimmedId) {
      setValidationError('Please enter a Discovery ID');
      return;
    }
    
    if (!isValidDiscoveryId(trimmedId)) {
      setValidationError('Invalid format. Expected: CX:<manufacturerPartId>:<partInstanceId>');
      return;
    }
    
    setValidationError(null);
    // Navigate immediately to passport route, loading will happen there
    navigate(`/passport/${encodeURIComponent(trimmedId)}`);
  };

  const handleBack = () => {
    // Clear visualized data and navigate back to search page
    setShowVisualization(false);
    setPassportData(null);
    setPassportId('');
    setIsLoading(false);
    setCurrentStep(0);
    setLoadingError(null);
    navigate('/passport');
  };

  // Mock data fetcher - replace with actual API call
  const fetchMockPassportData = async (id: string): Promise<Record<string, unknown>> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Get generic passport mock data
    const genericConfig = PassportTypeRegistry.get('generic');
    if (!genericConfig || !genericConfig.mockData) {
      throw new Error('No mock data available');
    }
    
    return {
      ...genericConfig.mockData,
      metadata: {
        ...(genericConfig.mockData.metadata as Record<string, unknown>),
        passportIdentifier: id // Use the scanned/searched ID
      }
    };
  };

  const handleOpenScanner = () => {
    // Navigate to the scanner page
    navigate('/passport/scan');
  };

  // If route contains :id, automatically load that passport
  useEffect(() => {
    const id = params?.id as string | undefined;
    if (id) {
      // Reset state for new passport
      setPassportId(id);
      setPassportData(null);
      setShowVisualization(false);
      setIsLoading(true);
      setLoadingError(null);
      setCurrentStep(0);
      
      const loadPassport = async () => {
        try {
          // Simulate step-by-step loading (replace with actual API calls)
          for (let step = 0; step < LOADING_STEPS.length - 1; step++) {
            setCurrentStep(step);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay
            
            // In production, check API status here:
            // const status = await checkPassportStatus(id);
            // if (status.error) throw new Error(status.error);
          }

          // Fetch passport data
          const mockData = await fetchMockPassportData(id);
          
          // Show final step
          setCurrentStep(LOADING_STEPS.length - 1);
          await new Promise(resolve => setTimeout(resolve, 500));
          
          setPassportData(mockData);
          setIsLoading(false);
          setShowVisualization(true);
        } catch (error) {
          setLoadingError(error instanceof Error ? error.message : 'Failed to load passport');
          setIsLoading(false);
        }
      };
      
      loadPassport();
    }
  }, [params?.id]);

  // Show visualization if data is loaded
  if (showVisualization && passportData) {
    // Detect passport type from data
    const passportConfig = PassportTypeRegistry.detectType(passportData);
    
    if (!passportConfig) {
      return (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="error">
            Unable to determine passport type. Please check the data format.
          </Typography>
          <Button onClick={handleBack} sx={{ mt: 2 }}>
            Go Back
          </Button>
        </Box>
      );
    }
    
    const VisualizationComponent = passportConfig.VisualizationComponent;
    
    return (
      <VisualizationComponent
        schema={passportConfig.schema}
        data={passportData}
        passportId={passportId}
        onBack={handleBack}
      />
    );
  }

  // Show loading state
  if (isLoading) {
    return (
      <Box 
        sx={{ 
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          px: { xs: 2, sm: 3, md: 4 }
        }}
      >
        <Card
          sx={{
            maxWidth: '600px',
            width: '100%',
            background: 'linear-gradient(135deg, rgba(30, 30, 30, 0.95) 0%, rgba(20, 20, 20, 0.95) 100%)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: { xs: '16px', md: '20px' },
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
          }}
        >
          <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
            {/* Header */}
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Typography variant="h5" sx={{ color: '#fff', fontWeight: 600, mb: 1 }}>
                Loading Passport
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', fontFamily: 'monospace' }}>
                {passportId}
              </Typography>
            </Box>

            {/* Progress Steps - Horizontal */}
            <Box sx={{ mb: 4 }}>
              {/* Step Icons Row */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                {LOADING_STEPS.map((step, index) => {
                  const Icon = step.icon;
                  const isActive = index === currentStep;
                  const isCompleted = index < currentStep;
                  const isPending = index > currentStep;

                  return (
                    <React.Fragment key={step.id}>
                      {/* Step Icon */}
                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          flex: 1,
                          position: 'relative',
                          transition: 'all 0.3s ease',
                          opacity: isPending ? 0.4 : 1
                        }}
                      >
                        <Box
                          sx={{
                            width: { xs: 36, sm: 44 },
                            height: { xs: 36, sm: 44 },
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: isCompleted
                              ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                              : isActive
                              ? 'rgba(102, 126, 234, 0.2)'
                              : 'rgba(255, 255, 255, 0.05)',
                            border: isActive ? '2px solid #667eea' : 'none',
                            transition: 'all 0.3s ease',
                            position: 'relative',
                            zIndex: 2,
                            ...(isActive && {
                              animation: 'pulse 2s ease-in-out infinite',
                              '@keyframes pulse': {
                                '0%, 100%': { boxShadow: '0 0 0 0 rgba(102, 126, 234, 0.4)' },
                                '50%': { boxShadow: '0 0 0 8px rgba(102, 126, 234, 0)' }
                              }
                            })
                          }}
                        >
                          {isCompleted ? (
                            <CheckCircle sx={{ fontSize: { xs: 20, sm: 24 }, color: '#fff' }} />
                          ) : isActive ? (
                            <Icon sx={{ fontSize: { xs: 20, sm: 24 }, color: '#667eea' }} />
                          ) : (
                            <RadioButtonUnchecked sx={{ fontSize: { xs: 20, sm: 24 }, color: 'rgba(255, 255, 255, 0.3)' }} />
                          )}
                        </Box>
                        
                        {/* Step Label */}
                        <Typography
                          variant="caption"
                          sx={{
                            color: isActive || isCompleted ? '#fff' : 'rgba(255, 255, 255, 0.5)',
                            fontWeight: isActive ? 600 : 500,
                            fontSize: { xs: '0.65rem', sm: '0.75rem' },
                            mt: 1,
                            textAlign: 'center',
                            transition: 'all 0.3s ease',
                            display: { xs: 'none', sm: 'block' }
                          }}
                        >
                          {step.label}
                        </Typography>
                      </Box>

                      {/* Connector Line */}
                      {index < LOADING_STEPS.length - 1 && (
                        <Box
                          sx={{
                            height: 2,
                            flex: 1,
                            mx: { xs: 0.5, sm: 1 },
                            background: isCompleted
                              ? 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)'
                              : 'rgba(255, 255, 255, 0.1)',
                            transition: 'all 0.5s ease',
                            position: 'relative',
                            top: { xs: -18, sm: -22 }
                          }}
                        />
                      )}
                    </React.Fragment>
                  );
                })}
              </Box>

              {/* Active Step Description */}
              {LOADING_STEPS[currentStep] && (
                <Box
                  sx={{
                    textAlign: 'center',
                    p: 2,
                    borderRadius: '10px',
                    background: 'rgba(102, 126, 234, 0.1)',
                    border: '1px solid rgba(102, 126, 234, 0.2)'
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      color: '#fff',
                      fontWeight: 600,
                      mb: 0.5,
                      fontSize: { xs: '0.85rem', sm: '0.9rem' }
                    }}
                  >
                    {LOADING_STEPS[currentStep].label}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'rgba(255, 255, 255, 0.6)',
                      fontSize: { xs: '0.75rem', sm: '0.8rem' }
                    }}
                  >
                    {LOADING_STEPS[currentStep].description}
                  </Typography>
                </Box>
              )}
            </Box>

            {/* Cancel Button */}
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Button
                variant="outlined"
                onClick={handleBack}
                sx={{
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                  color: 'rgba(255, 255, 255, 0.7)',
                  textTransform: 'none',
                  px: 3,
                  py: 1,
                  borderRadius: '10px',
                  '&:hover': {
                    borderColor: 'rgba(255, 255, 255, 0.4)',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)'
                  }
                }}
              >
                Cancel
              </Button>
            </Box>

            {/* Error Display */}
            {loadingError && (
              <Alert
                severity="error"
                sx={{
                  mt: 3,
                  backgroundColor: 'rgba(244, 67, 54, 0.1)',
                  border: '1px solid rgba(244, 67, 54, 0.3)',
                  borderRadius: '10px',
                  '& .MuiAlert-icon': { color: '#f44336' },
                  '& .MuiAlert-message': { color: '#fff' }
                }}
              >
                {loadingError}
              </Alert>
            )}
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box 
      sx={{ 
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: { xs: 2, sm: 3, md: 4 },
        overflow: 'hidden'
      }}
    >
      <Box sx={{ width: '100%', maxWidth: '700px', textAlign: 'center' }}>
        {/* Header with Icon */}
        <Box sx={{ mb: { xs: 3, sm: 4, md: 5 } }}>
          <Box
            sx={{
              width: { xs: 48, sm: 56, md: 64 },
              height: { xs: 48, sm: 56, md: 64 },
              borderRadius: { xs: '12px', md: '16px' },
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto',
              mb: { xs: 1.5, md: 2 },
              boxShadow: '0 8px 24px rgba(102, 126, 234, 0.3)'
            }}
          >
            <QrCodeScanner sx={{ fontSize: { xs: 28, sm: 32, md: 36 }, color: '#fff' }} />
          </Box>
          <Typography
            variant="h3"
            sx={{
              color: '#fff',
              fontWeight: 700,
              letterSpacing: '-0.5px',
              mb: { xs: 0.5, md: 1 },
              fontSize: { xs: '1.75rem', sm: '2.25rem', md: '3rem' }
            }}
          >
            Digital Product Passport
          </Typography>
          <Typography 
            variant="body1" 
            sx={{ 
              color: 'rgba(255, 255, 255, 0.6)',
              fontSize: { xs: '0.875rem', sm: '1rem' },
              px: { xs: 2, sm: 0 }
            }}
          >
            Retrieve and visualize product passports from the dataspace
          </Typography>
        </Box>

        {/* Search Component */}
        <Card
          sx={{
            background: 'linear-gradient(135deg, rgba(30, 30, 30, 0.95) 0%, rgba(20, 20, 20, 0.95) 100%)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: { xs: '16px', md: '20px' },
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
            transition: 'all 0.3s ease',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5)'
            }
          }}
        >
          <CardContent sx={{ p: { xs: 2.5, sm: 3, md: 4 } }}>
            {/* Search Input */}
            <Box sx={{ position: 'relative', mb: 2 }}>
              <TextField
                fullWidth
                placeholder="CX:XYZ78901:BAT-XYZ789"
                value={passportId}
                onChange={(e) => {
                  setPassportId(e.target.value);
                  if (validationError) setValidationError(null);
                }}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                error={!!validationError}
                helperText={validationError}
                InputProps={{
                  startAdornment: (
                    <Search sx={{ 
                      mr: { xs: 1, sm: 1.5 }, 
                      color: 'rgba(255, 255, 255, 0.4)', 
                      fontSize: { xs: 20, sm: 24 }
                    }} />
                  ),
                  endAdornment: passportId && (
                    <IconButton
                      size="small"
                      onClick={() => {
                        setPassportId('');
                        setValidationError(null);
                      }}
                      sx={{ color: 'rgba(255, 255, 255, 0.4)' }}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  )
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    color: '#fff',
                    fontSize: { xs: '14px', sm: '16px' },
                    fontWeight: 500,
                    borderRadius: { xs: '10px', md: '12px' },
                    transition: 'all 0.2s ease',
                    '& fieldset': {
                      borderColor: validationError ? 'rgba(244, 67, 54, 0.5)' : 'rgba(255, 255, 255, 0.1)',
                      borderWidth: '2px'
                    },
                    '&:hover fieldset': {
                      borderColor: validationError ? 'rgba(244, 67, 54, 0.7)' : 'rgba(102, 126, 234, 0.5)'
                    },
                    '&.Mui-focused': {
                      backgroundColor: 'rgba(255, 255, 255, 0.08)',
                      '& fieldset': {
                        borderColor: validationError ? '#f44336' : '#667eea',
                        borderWidth: '2px'
                      }
                    }
                  },
                  '& .MuiOutlinedInput-input': {
                    padding: { xs: '14px 12px', sm: '16px 14px' },
                    '&::placeholder': {
                      color: 'rgba(255, 255, 255, 0.4)',
                      opacity: 1
                    }
                  },
                  '& .MuiFormHelperText-root': {
                    color: '#f44336',
                    marginLeft: 0,
                    marginTop: '8px',
                    fontSize: '0.75rem'
                  }
                }}
              />
            </Box>

            {/* Action Buttons */}
            <Box sx={{ display: 'flex', gap: { xs: 1.5, sm: 2 } }}>
              <Button
                variant="contained"
                fullWidth
                onClick={handleSearch}
                disabled={!passportId.trim()}
                sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: '#fff',
                  py: { xs: 1.5, sm: 1.8 },
                  borderRadius: { xs: '10px', md: '12px' },
                  fontSize: { xs: '14px', sm: '15px' },
                  fontWeight: 600,
                  textTransform: 'none',
                  boxShadow: '0 4px 16px rgba(102, 126, 234, 0.3)',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
                    boxShadow: '0 6px 24px rgba(102, 126, 234, 0.4)',
                    transform: 'translateY(-1px)'
                  },
                  '&:disabled': {
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: 'rgba(255, 255, 255, 0.3)'
                  }
                }}
              >
                Search
              </Button>
              <Button
                variant="outlined"
                onClick={handleOpenScanner}
                sx={{
                  minWidth: 'auto',
                  width: { xs: '48px', sm: '56px' },
                  height: { xs: '48px', sm: '56px' },
                  p: 0,
                  borderRadius: { xs: '10px', md: '12px' },
                  borderColor: 'rgba(255, 255, 255, 0.1)',
                  borderWidth: '2px',
                  color: '#fff',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    borderWidth: '2px'
                  },
                  '& .MuiSvgIcon-root': {
                    color: '#fff'
                  }
                }}
              >
                <QrCodeScanner sx={{ fontSize: { xs: 24, sm: 28 }, color: '#fff !important' }} />
              </Button>
            </Box>

            {/* Info Section */}
            <Box
              sx={{
                mt: { xs: 2.5, sm: 3 },
                pt: { xs: 2.5, sm: 3 },
                borderTop: '1px solid rgba(255, 255, 255, 0.06)'
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  color: 'rgba(255, 255, 255, 0.5)',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: { xs: 0.5, sm: 1 },
                  fontSize: { xs: '0.8rem', sm: '0.875rem' }
                }}
              >
                <Box
                  component="span"
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255, 255, 255, 0.3)',
                    display: { xs: 'none', sm: 'inline-block' }
                  }}
                />
                <Box component="span">
                  Want to find out more? Take a look at all our{' '}
                  <Box
                    component="a"
                    href="/kit-features/eco-pass"
                    sx={{ color: '#667eea', cursor: 'pointer', fontWeight: 500, textDecoration: 'none' }}
                  >
                    Eco Pass KIT Features
                  </Box>
                </Box>
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default PassportConsumption;
