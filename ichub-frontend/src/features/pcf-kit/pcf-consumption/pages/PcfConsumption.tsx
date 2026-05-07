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
import { useTranslation } from 'react-i18next';
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
  Storage,
  Co2 as Co2Icon
} from '@mui/icons-material';
import { PCFData } from '../api/pcfConsumptionApi';
import PcfVisualization from '../components/PcfVisualization';

interface LoadingStep {
  id: string;
  label: string;
  icon: React.ElementType;
  description: string;
}

const LOADING_STEPS: LoadingStep[] = [
  { id: 'lookup', label: 'Looking up PCF', icon: Search, description: 'Searching in the dataspace registry' },
  { id: 'retrieve', label: 'Retrieving Data', icon: Downloading, description: 'Fetching PCF from provider' },
  { id: 'verify', label: 'Verifying Data', icon: Security, description: 'Validating data integrity' },
  { id: 'parse', label: 'Parsing Content', icon: Storage, description: 'Processing PCF structure' },
  { id: 'complete', label: 'Ready', icon: VerifiedUser, description: 'PCF loaded successfully' }
];

const PcfConsumption: React.FC = () => {
  const { t } = useTranslation(['pcfConsumption', 'common']);
  const [discoveryId, setDiscoveryId] = useState('');
  const [showVisualization, setShowVisualization] = useState(false);
  const [pcfData, setPcfData] = useState<PCFData | null>(null);
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
    const trimmedId = discoveryId.trim();
    if (!trimmedId) {
      setValidationError(t('page.validationRequired', 'Please enter a Discovery ID'));
      return;
    }
    
    if (!isValidDiscoveryId(trimmedId)) {
      setValidationError(t('page.validationFormat', 'Invalid format. Expected: CX:<manufacturerPartId>:<partInstanceId>'));
      return;
    }
    
    setValidationError(null);
    navigate(`/pcf/consume/${encodeURIComponent(trimmedId)}`);
  };

  const handleBack = () => {
    setShowVisualization(false);
    setPcfData(null);
    setDiscoveryId('');
    setIsLoading(false);
    setCurrentStep(0);
    setLoadingError(null);
    navigate('/pcf/consume');
  };

  const handleOpenScanner = () => {
    navigate('/pcf/consume/scan');
  };

  // Mock data for demo purposes
  const fetchMockPCFData = async (id: string): Promise<PCFData> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const [_, manufacturerPartId, partInstanceId] = id.split(':');
    
    return {
      id: `pcf-${Date.now()}`,
      specVersion: '2.2.0',
      version: 1,
      created: new Date().toISOString(),
      status: 'Active',
      companyName: 'Example Manufacturer GmbH',
      companyIds: ['BPNL00000001CRHK'],
      productDescription: 'Electric Vehicle Battery Module',
      productIds: [`urn:example:${manufacturerPartId}:${partInstanceId}`],
      productCategoryCpc: '43911',
      productNameCompany: 'EV Battery Module Type A',
      pcfExcludingBiogenic: 125.5,
      pcfIncludingBiogenic: 118.2,
      fossilGhgEmissions: 98.3,
      fossilCarbonContent: 12.5,
      biogenicCarbonContent: 7.3,
      aircraftGhgEmissions: 5.2,
      packagingGhgEmissions: 3.8,
      referencePeriodStart: '2024-01-01T00:00:00Z',
      referencePeriodEnd: '2024-12-31T23:59:59Z',
      geographyCountry: 'DE',
      characterizationFactors: 'AR6',
      primaryDataShare: 68.5,
      dqi: {
        coveragePercent: 95,
        technologicalDQR: 1.5,
        temporalDQR: 1.2,
        geographicalDQR: 1.3,
        completenessDQR: 1.4,
        reliabilityDQR: 1.1
      },
      assurance: {
        coverage: 'PCF system',
        level: 'limited',
        boundary: 'Cradle-to-Gate',
        providerName: 'TÜV Rheinland',
        completedAt: '2024-06-15T00:00:00Z',
        standardName: 'ISO 14064-3'
      }
    };
  };

  // Load PCF when route contains id
  useEffect(() => {
    const id = params?.id as string | undefined;
    if (id) {
      setDiscoveryId(id);
      setPcfData(null);
      setShowVisualization(false);
      setIsLoading(true);
      setLoadingError(null);
      setCurrentStep(0);
      
      const loadPCF = async () => {
        try {
          for (let step = 0; step < LOADING_STEPS.length - 1; step++) {
            setCurrentStep(step);
            await new Promise(resolve => setTimeout(resolve, 1000));
          }

          const data = await fetchMockPCFData(id);
          
          setCurrentStep(LOADING_STEPS.length - 1);
          await new Promise(resolve => setTimeout(resolve, 500));
          
          setPcfData(data);
          setIsLoading(false);
          setShowVisualization(true);
        } catch (error) {
          setLoadingError(error instanceof Error ? error.message : t('errors.loadFailed', 'Failed to load PCF data'));
          setIsLoading(false);
        }
      };
      
      loadPCF();
    }
  }, [params?.id, t]);

  // Show visualization if data is loaded
  if (showVisualization && pcfData) {
    return (
      <PcfVisualization
        data={pcfData}
        discoveryId={discoveryId}
        onBack={handleBack}
      />
    );
  }

  // Show loading state
  if (isLoading) {
    return (
      <Box 
        sx={{ 
          minHeight: 'calc(100vh - 64px)',
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
                {t('loading.title', 'Loading PCF Data')}
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', fontFamily: 'monospace' }}>
                {discoveryId}
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
                              ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                              : isActive
                              ? 'rgba(16, 185, 129, 0.2)'
                              : 'rgba(255, 255, 255, 0.05)',
                            border: isActive ? '2px solid #10b981' : 'none',
                            transition: 'all 0.3s ease',
                            position: 'relative',
                            zIndex: 2,
                            ...(isActive && {
                              animation: 'pulse 2s ease-in-out infinite',
                              '@keyframes pulse': {
                                '0%, 100%': { boxShadow: '0 0 0 0 rgba(16, 185, 129, 0.4)' },
                                '50%': { boxShadow: '0 0 0 8px rgba(16, 185, 129, 0)' }
                              }
                            })
                          }}
                        >
                          {isCompleted ? (
                            <CheckCircle sx={{ fontSize: { xs: 20, sm: 24 }, color: '#fff' }} />
                          ) : isActive ? (
                            <Icon sx={{ fontSize: { xs: 20, sm: 24 }, color: '#10b981' }} />
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
                              ? 'linear-gradient(90deg, #10b981 0%, #059669 100%)'
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
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.2)'
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
                {t('common:actions.cancel', 'Cancel')}
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

  // Main Search Page
  return (
    <Box 
      sx={{ 
        minHeight: 'calc(100vh - 64px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: { xs: 2, sm: 3, md: 4 }
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
              background: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto',
              mb: { xs: 1.5, md: 2 },
              boxShadow: '0 8px 32px rgba(16, 185, 129, 0.4), 0 0 60px rgba(16, 185, 129, 0.15)'
            }}
          >
            <Co2Icon sx={{ fontSize: { xs: 28, sm: 32, md: 36 }, color: '#fff' }} />
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
            {t('page.title', 'PCF Consumption')}
          </Typography>
          <Typography 
            variant="body1" 
            sx={{ 
              color: 'rgba(255, 255, 255, 0.6)',
              fontSize: { xs: '0.875rem', sm: '1rem' },
              px: { xs: 2, sm: 0 }
            }}
          >
            {t('page.subtitle', 'Search and retrieve Product Carbon Footprint data from your dataspace partners')}
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
                placeholder={t('page.searchPlaceholder', 'CX:manufacturerPartId:partInstanceId')}
                value={discoveryId}
                onChange={(e) => {
                  setDiscoveryId(e.target.value);
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
                  endAdornment: discoveryId && (
                    <IconButton
                      size="small"
                      onClick={() => {
                        setDiscoveryId('');
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
                      borderColor: validationError ? 'rgba(244, 67, 54, 0.7)' : 'rgba(16, 185, 129, 0.5)'
                    },
                    '&.Mui-focused': {
                      backgroundColor: 'rgba(255, 255, 255, 0.08)',
                      '& fieldset': {
                        borderColor: validationError ? '#f44336' : '#10b981',
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
                disabled={!discoveryId.trim()}
                sx={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)',
                  color: '#fff',
                  py: { xs: 1.5, sm: 1.8 },
                  borderRadius: { xs: '10px', md: '12px' },
                  fontSize: { xs: '14px', sm: '15px' },
                  fontWeight: 700,
                  textTransform: 'none',
                  boxShadow: '0 4px 20px rgba(16, 185, 129, 0.4), 0 0 40px rgba(16, 185, 129, 0.15)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #059669 0%, #047857 50%, #065f46 100%)',
                    boxShadow: '0 8px 32px rgba(16, 185, 129, 0.5), 0 0 60px rgba(16, 185, 129, 0.2)',
                    transform: 'translateY(-2px) scale(1.01)'
                  },
                  '&:active': {
                    transform: 'translateY(0px) scale(0.99)'
                  },
                  '&:disabled': {
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
                    color: 'rgba(255, 255, 255, 0.3)',
                    boxShadow: 'none'
                  }
                }}
              >
                {t('common:actions.search', 'Search')}
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
                  borderColor: 'rgba(16, 185, 129, 0.4)',
                  borderWidth: '2px',
                  color: '#10b981',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.15)',
                    borderWidth: '2px',
                    boxShadow: '0 4px 16px rgba(16, 185, 129, 0.25)'
                  },
                  '& .MuiSvgIcon-root': {
                    color: '#10b981'
                  }
                }}
              >
                <QrCodeScanner sx={{ fontSize: { xs: 24, sm: 28 } }} />
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
                    backgroundColor: 'rgba(16, 185, 129, 0.5)',
                    display: { xs: 'none', sm: 'inline-block' }
                  }}
                />
                <Box component="span">
                  {t('page.learnMore', 'Learn more about')}{' '}
                  <Box
                    component="a"
                    href="/kit-features/pcf"
                    sx={{ 
                      color: '#10b981', 
                      cursor: 'pointer', 
                      fontWeight: 600, 
                      textDecoration: 'none',
                      '&:hover': {
                        color: '#34d399'
                      }
                    }}
                  >
                    {t('page.pcfFeatures', 'PCF KIT Features')}
                  </Box>
                </Box>
              </Typography>
            </Box>

            {/* Example Format Hint */}
            <Box
              sx={{
                mt: 3,
                p: 2,
                borderRadius: '12px',
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.2)'
              }}
            >
              <Typography 
                variant="caption" 
                sx={{ 
                  color: 'rgba(255, 255, 255, 0.5)', 
                  display: 'block', 
                  mb: 0.5 
                }}
              >
                {t('page.exampleFormat', 'Example Discovery ID format:')}
              </Typography>
              <Typography
                variant="body2"
                sx={{ 
                  fontFamily: 'monospace', 
                  color: '#34d399',
                  fontWeight: 600
                }}
              >
                CX:PART-001:SERIAL-12345
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default PcfConsumption;
