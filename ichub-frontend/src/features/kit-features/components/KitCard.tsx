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

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Stack,
  Switch,
  IconButton,
  Tooltip,
  Collapse
} from '@mui/material';
import { 
  Schedule,
  CheckCircle,
  Settings,
  InfoOutlined,
  ExpandMore,
  ExpandLess,
  Lock
} from '@mui/icons-material';
import { KitFeature, KitFeatureItem } from '../types';

interface KitCardProps {
  kit: KitFeature;
  onFeatureToggle: (kitId: string, featureId: string, enabled: boolean) => void;
  isCenter?: boolean;
}

const KitCard: React.FC<KitCardProps> = ({ kit, onFeatureToggle, isCenter = false }) => {
  const [showFeatures, setShowFeatures] = useState(false);

  // Close features when card is no longer centered
  useEffect(() => {
    if (!isCenter && showFeatures) {
      setShowFeatures(false);
    }
  }, [isCenter, showFeatures]);

  const handleFeatureToggle = (featureId: string, enabled: boolean) => {
    onFeatureToggle(kit.id, featureId, enabled);
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: 'primary' | 'secondary' | 'success' | 'warning' | 'error' } = {
      core: 'primary',
      sustainability: 'success',
      quality: 'warning',
      traceability: 'secondary',
      collaboration: 'error'
    };
    return colors[category] || 'primary';
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      available: '#00aa44',
      'coming-soon': '#ff6600', 
      beta: '#1976d2'
    };
    return colors[status] || '#0f71cb';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available':
        return <CheckCircle sx={{ fontSize: '1rem' }} />;
      case 'coming-soon':
        return <Schedule sx={{ fontSize: '1rem' }} />;
      case 'beta':
        return <Settings sx={{ fontSize: '1rem' }} />;
      default:
        return <CheckCircle sx={{ fontSize: '1rem' }} />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'available':
        return 'Available';
      case 'coming-soon':
        return 'Coming Soon';
      case 'beta':
        return 'Beta';
      default:
        return 'Available';
    }
  };

  const isKitAvailable = kit.status === 'available' || kit.status === 'beta';
  const enabledFeaturesCount = kit.features.filter(f => f.enabled).length;

  return (
    <Card 
      className="kit-card"
      sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: isCenter ? 'translateY(-8px)' : 'translateY(-4px)', // More lift for center card
          boxShadow: isCenter 
            ? '0 16px 56px rgba(66, 165, 245, 0.5)' 
            : '0 8px 32px rgba(0, 0, 0, 0.3)',
          border: isCenter 
            ? '2px solid rgba(66, 165, 245, 0.9)' 
            : '2px solid rgba(66, 165, 245, 0.5)'
        },
        opacity: kit.status === 'coming-soon' ? 0.8 : 1,
        overflow: 'visible', // Allow content to extend beyond card bounds
        position: 'relative',
        border: isCenter 
          ? '2px solid rgba(66, 165, 245, 0.6)' 
          : '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: 3,
        backgroundColor: 'rgb(26, 26, 26)', // Dark card background
        color: '#ffffff',
        boxShadow: isCenter 
          ? '0 12px 48px rgba(66, 165, 245, 0.4)' 
          : '0 4px 16px rgba(0, 0, 0, 0.3)',
        zIndex: isCenter ? 100 : 10 // Ensure center card is always on top
      }}
    >
      {/* Contenido principal */}
      <CardContent sx={{ 
        flexGrow: 1, 
        pb: 2, 
        pt: 2, 
        px: 2,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: '100%' // Use full card height
      }}>
        <Box>
          {/* Header con título y estado */}
          <Box mb={1.5} display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" component="h3" sx={{ 
              fontSize: '1.1rem', 
              fontWeight: 600,
              color: '#ffffff',
              flex: 1
            }}>
              {kit.name}
            </Typography>
            
            {/* Status indicator - circular light */}
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                backgroundColor: getStatusColor(kit.status),
                boxShadow: `0 0 6px ${getStatusColor(kit.status)}40`,
                ml: 2
              }}
            />
          </Box>

          {/* Kit Image/Icon centered */}
          <Box display="flex" justifyContent="center" mb={1.5}>
            {kit.image ? (
              <Box
                component="img"
                src={kit.image}
                alt={kit.name}
                sx={{ 
                  width: showFeatures ? 80 : 140, // Larger by default, smaller when features shown
                  height: showFeatures ? 80 : 140,
                  objectFit: 'contain',
                  transition: 'all 0.3s ease' // Smooth transition
                }}
              />
            ) : (
              <Box sx={{ 
                fontSize: showFeatures ? '3.5rem' : '5.5rem', // Larger by default, smaller when features shown
                color: getStatusColor(kit.status),
                transition: 'all 0.3s ease', // Smooth transition
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {kit.icon}
              </Box>
            )}
          </Box>
          
          {/* Description - Hide when features are shown */}
          <Collapse in={!showFeatures}>
            <Typography 
              variant="body2" 
              sx={{ 
                fontSize: '0.8rem', // Slightly smaller text
                lineHeight: 1.3,
                textAlign: 'center',
                mb: 1.5, // Reduced margin
                color: 'rgba(255, 255, 255, 0.7)'
              }}
            >
              {kit.description}
            </Typography>
          </Collapse>
        </Box>

        {/* View Features Button and Collapsible Features */}
        {isKitAvailable ? (
          <Box>
            <Button
              onClick={() => setShowFeatures(!showFeatures)}
              fullWidth
              variant="outlined"
              endIcon={showFeatures ? <ExpandLess /> : <ExpandMore />}
              sx={{
                mb: 1, // Reduced margin bottom from 2 to 1
                py: 0.5, // Reduced vertical padding
                minHeight: '32px', // Set a smaller minimum height
                fontSize: '0.875rem', // Slightly smaller font
                borderColor: 'rgba(255, 255, 255, 0.3)',
                color: '#ffffff',
                backgroundColor: 'transparent',
                '&:hover': {
                  borderColor: 'rgba(66, 165, 245, 0.8) !important',
                  backgroundColor: 'rgba(66, 165, 245, 0.15) !important',
                  color: '#ffffff !important'
                }
              }}
            >
              {showFeatures ? 'Hide Features' : 'View Features'} ({kit.features.length})
            </Button>
            
            <Collapse in={showFeatures}>
              <Stack spacing={1}>
                {kit.features.map((feature) => (
                  <Box
                    key={feature.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      py: 0.5,
                      px: 1,
                      borderRadius: 1,
                      backgroundColor: feature.enabled ? 'rgba(66, 165, 245, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                      border: `1px solid ${feature.enabled ? 'rgba(66, 165, 245, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        backgroundColor: feature.enabled ? 'rgba(66, 165, 245, 0.15)' : 'rgba(255, 255, 255, 0.1)'
                      }
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          fontSize: '0.8rem',
                          fontWeight: feature.enabled ? 500 : 400,
                          color: feature.enabled ? '#ffffff' : 'rgba(255, 255, 255, 0.7)',
                          mr: 0.5
                        }}
                      >
                        {feature.name}
                      </Typography>
                      <Tooltip 
                        title={feature.description} 
                        placement="top"
                        arrow
                      >
                        <IconButton 
                          size="small" 
                          sx={{ 
                            p: 0.25, 
                            color: 'rgba(255, 255, 255, 0.5)',
                            '&:hover': {
                              color: '#42a5f5'
                            }
                          }}
                        >
                          <InfoOutlined sx={{ fontSize: '0.9rem' }} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {kit.id === 'industry-core' && (
                        <Lock sx={{ 
                          fontSize: '0.75rem', 
                          color: 'rgba(66, 165, 245, 0.7)',
                          opacity: 0.8
                        }} />
                      )}
                      <Switch
                        checked={feature.enabled}
                        onChange={(e) => handleFeatureToggle(feature.id, e.target.checked)}
                        disabled={kit.id === 'industry-core'}
                        size="small"
                        sx={{
                        '& .MuiSwitch-track': {
                          backgroundColor: feature.enabled ? '#42a5f5' : 'rgba(120, 120, 120, 0.9) !important', // Darker interior when disabled
                          border: feature.enabled ? '1px solid #42a5f5' : '1px solid rgba(255, 255, 255, 0.4)', // Thinner border
                          opacity: '1 !important' // Force full opacity
                        },
                        '& .MuiSwitch-thumb': {
                          color: feature.enabled ? '#ffffff' : 'rgba(255, 255, 255, 0.9)', // More visible thumb when disabled
                          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)' // Added shadow for better visibility
                        },
                        '&.Mui-checked': {
                          '& .MuiSwitch-thumb': {
                            color: '#ffffff',
                            boxShadow: '0 2px 6px rgba(66, 165, 245, 0.4)' // Blue shadow when enabled
                          },
                          '& + .MuiSwitch-track': {
                            backgroundColor: '#42a5f5 !important',
                            border: '1px solid #42a5f5 !important',
                            opacity: '1 !important'
                          }
                        },
                        '&.Mui-disabled': {
                          '& .MuiSwitch-thumb': {
                            color: 'rgba(255, 255, 255, 0.5)',
                          },
                          '&.Mui-checked': {
                            '& .MuiSwitch-thumb': {
                              color: 'rgba(66, 165, 245, 0.7)',
                            },
                            '& + .MuiSwitch-track': {
                              backgroundColor: 'rgba(66, 165, 245, 0.4) !important',
                              border: '1px solid rgba(66, 165, 245, 0.3) !important',
                            }
                          }
                        }
                      }}
                    />
                    </Box>
                  </Box>
                ))}
              </Stack>
            </Collapse>
          </Box>
        ) : (
          /* Coming Soon - show disabled VIEW FEATURES button */
          <Box>
            <Button
              fullWidth
              variant="outlined"
              disabled
              endIcon={<Schedule />}
              sx={{
                mb: 1, // Reduced margin bottom from 2 to 1
                py: 0.5, // Reduced vertical padding
                minHeight: '32px', // Set a smaller minimum height
                fontSize: '0.875rem', // Slightly smaller font
                borderColor: 'rgba(255, 255, 255, 0.2)',
                color: 'rgba(255, 255, 255, 0.5)',
                '&.Mui-disabled': {
                  borderColor: 'rgba(255, 165, 0, 0.3)',
                  color: 'rgba(255, 165, 0, 0.7)'
                }
              }}
            >
              Coming Soon (0)
            </Button>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default KitCard;
