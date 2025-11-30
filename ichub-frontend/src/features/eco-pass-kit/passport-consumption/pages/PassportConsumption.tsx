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

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  Alert,
  IconButton,
  MenuItem,
  Select,
  FormControl,
  InputLabel
} from '@mui/material';
import {
  QrCodeScanner,
  Search,
  Close as CloseIcon,
  Videocam as VideocamIcon,
  CheckCircle,
  RadioButtonUnchecked,
  Downloading,
  Security,
  VerifiedUser,
  Storage
} from '@mui/icons-material';
import { Html5Qrcode } from 'html5-qrcode';
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
  const [scannerMode, setScannerMode] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [showVisualization, setShowVisualization] = useState(false);
  const [passportData, setPassportData] = useState<Record<string, unknown> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [loadingError, setLoadingError] = useState<string | null>(null);

  const params = useParams();
  const navigate = useNavigate();

  const handleSearch = async () => {
    if (passportId.trim()) {
      // Stop scanner if active
      if (scannerMode && scannerRef.current && isScanning) {
        try {
          await scannerRef.current.stop();
          setIsScanning(false);
          setScannerMode(false);
        } catch (error) {
          console.error('Error stopping scanner:', error);
        }
      }

      // Start loading sequence
      setIsLoading(true);
      setLoadingError(null);
      setCurrentStep(0);

      try {
        // Simulate step-by-step loading (replace with actual API calls)
        for (let step = 0; step < LOADING_STEPS.length; step++) {
          setCurrentStep(step);
          await new Promise(resolve => setTimeout(resolve, 800)); // Simulate API delay
          
          // In production, check API status here:
          // const status = await checkPassportStatus(passportId);
          // if (status.error) throw new Error(status.error);
        }

        // Fetch passport data
        const mockData = await fetchMockPassportData(passportId);
        setPassportData(mockData);
        setIsLoading(false);
        
        // Navigate to passport route after successful load
        navigate(`/passport/${encodeURIComponent(passportId)}`);
      } catch (error) {
        setLoadingError(error instanceof Error ? error.message : 'Failed to load passport');
        setIsLoading(false);
      }
    }
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
        ...genericConfig.mockData.metadata,
        passportIdentifier: id // Use the scanned/searched ID
      }
    };
  };

  const handleOpenScanner = async () => {
    setScannerMode(true);
    setScannerError(null);
    
    // Get cameras when opening scanner (request permission)
    try {
      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length > 0) {
        const mappedCameras = devices.map(d => ({ id: d.id, label: d.label }));
        setCameras(mappedCameras);
        setSelectedCameraId(mappedCameras[0].id); // Default to first camera
      } else {
        setScannerError('No cameras found on this device.');
      }
    } catch {
      setScannerError('Failed to access camera. Please grant camera permissions.');
    }
  };

  const handleCloseScanner = async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch {
        // Ignore errors
      }
    }
    setScannerMode(false);
    setIsScanning(false);
    setScannerError(null);
  };

  const startScanning = async (cameraId: string) => {
    if (!cameraId) {
      return;
    }

    // Wait for the DOM element to be available
    const qrReaderElement = document.getElementById('qr-reader');
    if (!qrReaderElement) {
      // Retry after a short delay
      setTimeout(() => startScanning(cameraId), 100);
      return;
    }

    try {
      const html5QrCode = new Html5Qrcode('qr-reader');
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        cameraId,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        },
        async (decodedText) => {
          setPassportId(decodedText);
          // Navigate to route which will load the passport
          navigate(`/passport/${encodeURIComponent(decodedText)}`);
          handleCloseScanner();
        },
        () => {
          // Ignore scan errors (happens when no QR code in view)
        }
      );
      setIsScanning(true);
      setScannerError(null);
    } catch (err) {
      setScannerError(`Failed to start scanner: ${err}`);
    }
  };

  const handleCameraChange = async (cameraId: string) => {
    setSelectedCameraId(cameraId);
    
    // Stop current scanner first
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
        scannerRef.current = null;
      } catch {
        // Ignore stop errors
      }
      setIsScanning(false);
    }

    // Small delay before starting with new camera
    setTimeout(() => {
      startScanning(cameraId);
    }, 300);
  };

  // Start scanning when cameras are loaded and scanner mode is active
  useEffect(() => {
    if (scannerMode && !isScanning && selectedCameraId) {
      // Small delay to ensure element is rendered
      const timer = setTimeout(() => {
        startScanning(selectedCameraId);
      }, 100);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scannerMode]);

  // If route contains :id, automatically load that passport
  useEffect(() => {
    const id = params?.id as string | undefined;
    if (id && !isLoading && !showVisualization) {
      setPassportId(id);
      // Trigger the search which will show loading state
      setTimeout(() => handleSearch(), 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
            Digital Product Pass
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
            {!scannerMode ? (
              <>
                {/* Search Input */}
                <Box sx={{ position: 'relative', mb: 2 }}>
                  <TextField
                    fullWidth
                    placeholder="CX:XYZ78901:BAT-XYZ789"
                    value={passportId}
                    onChange={(e) => setPassportId(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
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
                          onClick={() => setPassportId('')}
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
                          borderColor: 'rgba(255, 255, 255, 0.1)',
                          borderWidth: '2px'
                        },
                        '&:hover fieldset': {
                          borderColor: 'rgba(102, 126, 234, 0.5)'
                        },
                        '&.Mui-focused': {
                          backgroundColor: 'rgba(255, 255, 255, 0.08)',
                          '& fieldset': {
                            borderColor: '#667eea',
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
                        backgroundColor: 'rgba(255, 255, 255, 0.3)',
                        display: { xs: 'none', sm: 'inline-block' }
                      }}
                    />
                    <Box component="span">
                      Want to find out more? Read our{' '}
                      <Box component="span" sx={{ color: '#667eea', cursor: 'pointer', fontWeight: 500 }}>
                        Get Started Guide
                      </Box>
                    </Box>
                  </Typography>
                </Box>
              </>
            ) : (
              <>
                {/* QR Scanner Header */}
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: { xs: 'flex-start', sm: 'center' },
                  mb: { xs: 2, sm: 3 },
                  flexDirection: { xs: 'column', sm: 'row' },
                  gap: { xs: 2, sm: 0 }
                }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography 
                      variant="h6" 
                      sx={{ 
                        color: '#fff', 
                        fontWeight: 600, 
                        mb: 0.5,
                        fontSize: { xs: '1rem', sm: '1.25rem' }
                      }}
                    >
                      Scan QR Code
                    </Typography>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: 'rgba(255, 255, 255, 0.6)',
                        fontSize: { xs: '0.8rem', sm: '0.875rem' }
                      }}
                    >
                      Position the QR code within the frame
                    </Typography>
                  </Box>
                  <Button
                    variant="outlined"
                    onClick={handleCloseScanner}
                    sx={{
                      minWidth: 'auto',
                      width: { xs: '36px', sm: '40px' },
                      height: { xs: '36px', sm: '40px' },
                      p: 0,
                      borderRadius: { xs: '8px', sm: '10px' },
                      borderColor: 'rgba(244, 67, 54, 0.3)',
                      borderWidth: '2px',
                      color: '#f44336',
                      transition: 'all 0.2s ease',
                      alignSelf: { xs: 'flex-end', sm: 'center' },
                      '&:hover': {
                        borderColor: '#f44336',
                        backgroundColor: 'rgba(244, 67, 54, 0.1)',
                        borderWidth: '2px'
                      }
                    }}
                  >
                    <CloseIcon sx={{ fontSize: { xs: 20, sm: 24 } }} />
                  </Button>
                </Box>

                {/* Camera Selector - Show when multiple cameras available */}
                {cameras.length > 1 && (
                  <Box sx={{ mb: { xs: 2, sm: 3 } }}>
                    <FormControl 
                      fullWidth
                      size="small"
                      sx={{ 
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: 'rgba(255, 255, 255, 0.05)',
                          color: '#fff',
                          borderRadius: { xs: '8px', sm: '10px' },
                          '& fieldset': {
                            borderColor: 'rgba(255, 255, 255, 0.2)'
                          },
                          '&:hover fieldset': {
                            borderColor: 'rgba(255, 255, 255, 0.3)'
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: '#667eea'
                          }
                        },
                        '& .MuiInputLabel-root': {
                          color: 'rgba(255, 255, 255, 0.6)',
                          fontSize: { xs: '13px', sm: '14px' },
                          '&.Mui-focused': {
                            color: '#667eea'
                          }
                        },
                        '& .MuiSelect-icon': {
                          color: 'rgba(255, 255, 255, 0.6)'
                        }
                      }}
                    >
                      <InputLabel>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <VideocamIcon sx={{ fontSize: { xs: 14, sm: 16 } }} />
                          <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Camera</Box>
                          <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>Cam</Box>
                        </Box>
                      </InputLabel>
                      <Select
                        value={selectedCameraId}
                        onChange={(e) => handleCameraChange(e.target.value)}
                        label="Camera"
                        MenuProps={{
                          PaperProps: {
                            sx: {
                              backgroundColor: 'rgba(30, 30, 30, 0.98)',
                              backdropFilter: 'blur(10px)',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              borderRadius: { xs: '10px', sm: '12px' },
                              mt: 1,
                              '& .MuiMenuItem-root': {
                                color: '#fff',
                                fontSize: { xs: '13px', sm: '14px' },
                                '&:hover': {
                                  backgroundColor: 'rgba(102, 126, 234, 0.2)'
                                },
                                '&.Mui-selected': {
                                  backgroundColor: 'rgba(102, 126, 234, 0.3)',
                                  '&:hover': {
                                    backgroundColor: 'rgba(102, 126, 234, 0.4)'
                                  }
                                }
                              }
                            }
                          }
                        }}
                      >
                        {cameras.map((camera, index) => (
                          <MenuItem key={camera.id} value={camera.id}>
                            {camera.label || `Camera ${index + 1}`}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>
                )}

                {/* QR Scanner Feed */}
                <Box
                  sx={{
                    position: 'relative',
                    backgroundColor: '#000',
                    borderRadius: { xs: '12px', sm: '14px', md: '16px' },
                    overflow: 'hidden',
                    border: '2px solid rgba(102, 126, 234, 0.3)',
                    minHeight: { xs: '280px', sm: '350px', md: '400px' },
                    aspectRatio: { xs: '1', sm: 'auto' }
                  }}
                >
                  <div id="qr-reader" style={{ width: '100%' }} />
                </Box>

                {scannerError && (
                  <Alert
                    severity="error"
                    sx={{
                      mt: { xs: 1.5, sm: 2 },
                      backgroundColor: 'rgba(244, 67, 54, 0.1)',
                      border: '1px solid rgba(244, 67, 54, 0.3)',
                      borderRadius: { xs: '10px', sm: '12px' },
                      fontSize: { xs: '0.8rem', sm: '0.875rem' },
                      '& .MuiAlert-icon': {
                        color: '#f44336',
                        fontSize: { xs: '20px', sm: '22px' }
                      },
                      '& .MuiAlert-message': {
                        color: '#fff'
                      }
                    }}
                  >
                    {scannerError}
                  </Alert>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default PassportConsumption;
