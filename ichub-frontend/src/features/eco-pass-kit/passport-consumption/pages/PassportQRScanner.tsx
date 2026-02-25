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
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Alert,
  MenuItem,
  Select,
  FormControl,
  InputLabel
} from '@mui/material';
import {
  Close as CloseIcon,
  Videocam as VideocamIcon
} from '@mui/icons-material';
import { Scanner } from '@yudiel/react-qr-scanner';

const PassportQRScanner: React.FC = () => {
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const navigate = useNavigate();

  // Validate CX format: CX:<placeholder>:<placeholder>
  const isValidCXFormat = (text: string): boolean => {
    // Reject URLs
    if (text.startsWith('http://') || text.startsWith('https://') || text.startsWith('www.')) {
      return false;
    }
    
    // Check CX format: CX:something:something
    const cxPattern = /^CX:[^:]+:[^:]+$/;
    return cxPattern.test(text);
  };

  const handleCloseScanner = () => {
    navigate('/passport');
  };

  const handleScan = (result: any) => {
    if (result && result[0]?.rawValue) {
      const decodedText = result[0].rawValue;
      
      // Validate format
      if (!isValidCXFormat(decodedText)) {
        setScannerError('Invalid format. Only CX:<manufacturerPartId>:<partInstanceId> format is allowed, not URLs.');
        return;
      }
      
      // Navigate to passport route with encoded ID
      const encodedId = encodeURIComponent(decodedText);
      navigate(`/passport/${encodedId}`);
    }
  };

  const handleError = (error: any) => {
    console.error('QR Scanner Error:', error);
    if (error?.message && !error.message.includes('No QR code found')) {
      setScannerError('Failed to access camera. Please grant camera permissions.');
    }
  };

  // Get available cameras
  useEffect(() => {
    const getCameras = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        setCameras(videoDevices);
        if (videoDevices.length > 0 && !selectedCamera) {
          setSelectedCamera(videoDevices[0].deviceId);
        }
      } catch (error) {
        console.error('Failed to enumerate devices:', error);
      }
    };
    getCameras();
  }, [selectedCamera]);

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
      <Box sx={{ width: '100%', maxWidth: '700px' }}>
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
                    backgroundColor: 'rgba(244, 67, 54, 0.15)',
                    borderWidth: '2px'
                  },
                  '& .MuiSvgIcon-root': {
                    color: '#f44336'
                  }
                }}
              >
                <CloseIcon sx={{ fontSize: { xs: 20, sm: 24 } }} />
              </Button>
            </Box>

            {/* Camera Selector - Show when cameras available */}
            {cameras.length > 0 && (
              <Box sx={{ mb: { xs: 2, sm: 3 }, position: 'relative', zIndex: 100 }}>
                <FormControl 
                  fullWidth
                  size="small"
                  sx={{ 
                    position: 'relative',
                    zIndex: 100,
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
                    value={selectedCamera}
                    onChange={(e) => setSelectedCamera(e.target.value)}
                    label="Camera"
                    MenuProps={{
                      PaperProps: {
                        sx: {
                          backgroundColor: 'rgba(30, 30, 30, 0.98)',
                          backdropFilter: 'blur(10px)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: { xs: '10px', sm: '12px' },
                          mt: 1,
                          zIndex: 99999,
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
                    },
                      style: { zIndex: 99999 }
                    }}
                  >
                    {cameras.map((camera, index) => (
                      <MenuItem key={camera.deviceId} value={camera.deviceId}>
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
                height: { xs: '280px', sm: '350px', md: '400px' },
                '& video': {
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }
              }}
            >
              <Scanner
                key={selectedCamera}
                onScan={handleScan}
                onError={handleError}
                constraints={{
                  deviceId: selectedCamera || undefined
                }}
                components={{
                  audio: false,
                  finder: true
                }}
                styles={{
                  container: {
                    width: '100%',
                    height: '100%'
                  },
                  video: {
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }
                }}
                allowMultiple={false}
                scanDelay={500}
              />
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

            {/* Info Text */}
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
                  fontSize: { xs: '0.75rem', sm: '0.8rem' }
                }}
              >
                Only QR codes with format <Box component="code" sx={{ 
                  backgroundColor: 'rgba(102, 126, 234, 0.2)', 
                  px: 1, 
                  py: 0.5, 
                  borderRadius: '4px',
                  color: '#667eea',
                  fontFamily: 'monospace'
                }}>CX:&lt;manufacturerPartId&gt;:&lt;partInstanceId&gt;</Box> are accepted
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default PassportQRScanner;
