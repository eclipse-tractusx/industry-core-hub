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
import {
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Stack,
  Switch,
  IconButton,
  Tooltip
} from '@mui/material';
import { 
  Schedule,
  CheckCircle,
  Settings,
  InfoOutlined
} from '@mui/icons-material';
import { KitFeature, KitFeatureItem } from '../types';

interface KitCardProps {
  kit: KitFeature;
  onFeatureToggle: (kitId: string, featureId: string, enabled: boolean) => void;
}

const KitCard: React.FC<KitCardProps> = ({ kit, onFeatureToggle }) => {

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
          transform: 'translateY(-4px)',
          boxShadow: 6
        },
        opacity: kit.status === 'coming-soon' ? 0.8 : 1,
        overflow: 'hidden',
        position: 'relative',
        border: '1px solid #e0e0e0',
        borderRadius: 3,
        backgroundColor: '#ffffff'
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
        minHeight: '400px'
      }}>
        <Box>
          {/* Header con título y estado */}
          <Box mb={2} display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" component="h3" sx={{ 
              fontSize: '1.1rem', 
              fontWeight: 600,
              color: 'text.primary',
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
          <Box display="flex" justifyContent="center" mb={2}>
            {kit.image ? (
              <Box
                component="img"
                src={kit.image}
                alt={kit.name}
                sx={{ 
                  width: 120,
                  height: 120,
                  objectFit: 'contain'
                }}
              />
            ) : (
              <Box sx={{ 
                fontSize: '6rem', 
                color: getStatusColor(kit.status),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {kit.icon}
              </Box>
            )}
          </Box>
          
          {/* Description */}
          <Typography 
            variant="body2" 
            color="text.secondary" 
            sx={{ 
              fontSize: '0.85rem',
              lineHeight: 1.4,
              textAlign: 'center',
              mb: 2
            }}
          >
            {kit.description}
          </Typography>
        </Box>

        {/* Features list with toggle controls */}
        {isKitAvailable ? (
          <Box>
            <Typography variant="overline" sx={{ 
              mb: 1.5, 
              display: 'block',
              textAlign: 'center',
              color: 'text.secondary',
              fontWeight: 500,
              fontSize: '0.75rem'
            }}>
              Features
            </Typography>
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
                    backgroundColor: feature.enabled ? `${getStatusColor(kit.status)}05` : 'transparent',
                    border: `1px solid ${feature.enabled ? getStatusColor(kit.status) + '20' : 'transparent'}`,
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      backgroundColor: feature.enabled ? `${getStatusColor(kit.status)}08` : '#f5f5f5'
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontSize: '0.8rem',
                        fontWeight: feature.enabled ? 500 : 400,
                        color: feature.enabled ? 'text.primary' : 'text.secondary',
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
                          color: 'text.secondary',
                          '&:hover': {
                            color: 'primary.main'
                          }
                        }}
                      >
                        <InfoOutlined sx={{ fontSize: '0.9rem' }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <Switch
                    checked={feature.enabled}
                    onChange={(e) => handleFeatureToggle(feature.id, e.target.checked)}
                    size="small"
                    sx={{
                      '& .MuiSwitch-track': {
                        backgroundColor: feature.enabled ? '#1565c0' : undefined
                      },
                      '& .MuiSwitch-thumb': {
                        color: feature.enabled ? '#42a5f5' : undefined
                      },
                      '&.Mui-checked': {
                        '& .MuiSwitch-thumb': {
                          color: '#42a5f5'
                        },
                        '& + .MuiSwitch-track': {
                          backgroundColor: '#1565c0'
                        }
                      }
                    }}
                  />
                </Box>
              ))}
            </Stack>
          </Box>
        ) : (
          /* Coming soon message - more centered */
          <Box 
            sx={{ 
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '120px',
              py: 2
            }}
          >
            <Schedule sx={{ fontSize: 32, color: '#ff9800', mb: 1 }} />
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, fontSize: '0.85rem', mb: 0.5 }}>
              Coming Soon
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
              This KIT will be available soon
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default KitCard;
