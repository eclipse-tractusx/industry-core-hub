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
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Chip,
  Alert, 
  Grid2
} from '@mui/material';
import { ArrowBack, Schedule, CheckCircle, Settings, OpenInNew } from '@mui/icons-material';
import { kits as kitsData } from '../../main';
import { KitFeature } from '../types';
import FeatureCard from '../components/FeatureCard';
import { useFeatures } from '@/contexts/FeatureContext';

const KitDetailPage: React.FC = () => {
  const { kitId } = useParams<{ kitId: string }>();
  const navigate = useNavigate();
  const [kit, setKit] = useState<KitFeature | null>(null);
  const { toggleFeature, featureStates } = useFeatures();

  useEffect(() => {
    const foundKit = kitsData.find(k => k.id === kitId);
    if (foundKit) {
      // Update feature enabled states from context
      const updatedKit = {
        ...foundKit,
        features: foundKit.features.map(feature => ({
          ...feature,
          enabled: featureStates[feature.id] ?? feature.enabled
        }))
      };
      setKit(updatedKit);
    }
  }, [kitId, featureStates]);

  const handleFeatureToggle = (featureId: string, enabled: boolean) => {
    if (!kit) return;
    toggleFeature(kit.id, featureId, enabled);
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

  if (!kit) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error">KIT not found</Alert>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/kit-features')}
          sx={{ mt: 2 }}
        >
          Back to KIT Features
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ height: { xs: 'auto', md: '100vh' }, minHeight: { xs: '100vh', md: 'auto' }, width: '100%', overflow: { xs: 'auto', md: 'hidden' } }}>
      <Grid2 container sx={{ height: '100%', width: '100%', maxWidth: '100%' }}>
        {/* Left Side: KIT Information */}
        <Grid2 size={{ xs: 12, md: 4, lg: 3 }} sx={{ display: 'flex', flexDirection: 'column', height: { xs: 'auto', md: '100%' } }}>
          <Box
            sx={{
              height: { xs: 'auto', md: '100%' },
              p: 4,
              borderRight: { xs: 'none', md: '1px solid rgba(255, 255, 255, 0.1)' },
              borderBottom: { xs: '1px solid rgba(255, 255, 255, 0.1)', md: 'none' },
              background: 'linear-gradient(135deg, rgb(20, 20, 20) 0%, rgb(30, 30, 30) 100%)',
              display: 'flex',
              flexDirection: 'column',
              gap: 3,
              overflowY: { xs: 'visible', md: 'auto' }
            }}
          >
              {/* Back Button */}
              <Button
                startIcon={<ArrowBack />}
                onClick={() => navigate('/kit-features', { state: { fromKitId: kit.id } })}
                sx={{
                  color: 'rgba(255, 255, 255, 0.7)',
                  justifyContent: 'flex-start',
                  borderRadius: 1,
                  '&:hover': {
                    color: '#ffffff',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)'
                  }
                }}
              >
                Back to KIT Features
              </Button>

              {/* KIT Logo */}
              <Box sx={{ display: 'flex', justifyContent: 'center'}}>
                {kit.image ? (
                  <Box
                    component="img"
                    src={kit.image}
                    alt={kit.name}
                    sx={{ width: 200, height: 200, objectFit: 'contain' }}
                  />
                ) : (
                  <Box sx={{ fontSize: '8rem', color: getStatusColor(kit.status) }}>
                    {kit.icon}
                  </Box>
                )}
              </Box>

              {/* KIT Name */}
              <Typography variant="h2" sx={{ color: '#ffffff', fontWeight: 700, textAlign: 'center' }}>
                {kit.name}
              </Typography>
              {/* Status, Version, and Domain Chips */}
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Chip
                  label={getStatusLabel(kit.status)}
                  icon={getStatusIcon(kit.status)}
                  sx={{
                    backgroundColor: getStatusColor(kit.status) + '20',
                    color: getStatusColor(kit.status),
                    border: `1px solid ${getStatusColor(kit.status)}40`,
                    fontWeight: 600
                  }}
                />
                {kit.version && (
                  <Chip
                    label={`v${kit.version}`}
                    sx={{
                      backgroundColor: 'rgba(66, 165, 245, 0.2)',
                      color: '#42a5f5',
                      border: '1px solid rgba(66, 165, 245, 0.4)',
                      fontWeight: 600
                    }}
                  />
                )}
                {kit.domain && (
                  <Chip
                    label={kit.domain.replace(/-/g, ' ')}
                    sx={{
                      backgroundColor: 'rgba(156, 39, 176, 0.2)',
                      color: '#ab47bc',
                      border: '1px solid rgba(156, 39, 176, 0.4)',
                      fontWeight: 600,
                      textTransform: 'capitalize'
                    }}
                  />
                )}
            </Box>
            <Box
            sx={{
                textAlign: 'center',
                p: 2,
                borderRadius: 2,
                backgroundColor: 'rgb(25, 25, 25)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 8px 24px rgba(66, 165, 245, 0.2)'
                }
            }}
            >
            <Typography variant="h2" sx={{ color: '#42a5f5', fontWeight: 700 }}>
                {kit.features.length}
            </Typography>
            <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.7)', mt: 1 }}>
                {kit.features.length === 1 ? 'Feature' : 'Features'}
            </Typography>
            </Box>
              {/* Number of Features */}

              {/* Description */}
              <Box
                sx={{
                  p: 2,
                  borderRadius: 1,
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  alignContent: 'between',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)'
                  }
                }}
              >
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)', lineHeight: 1.5, fontSize: '0.875rem' }}>
                  {kit.description}
                </Typography>
              </Box>

              {/* Created At & Last Updated - Modern Cards */}
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', justifyContent: 'center' }}>
                {kit.createdAt && (
                  <Box 
                    sx={{ 
                      flex: 1,
                      p: 1.5,
                      borderRadius: 1,
                      backgroundColor: 'rgba(66, 165, 245, 0.08)',
                      border: '1px solid rgba(66, 165, 245, 0.2)',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        backgroundColor: 'rgba(66, 165, 245, 0.12)',
                        borderColor: 'rgba(66, 165, 245, 0.3)',
                        transform: 'translateY(-4px)',
                        boxShadow: '0 8px 24px rgba(66, 165, 245, 0.3)'
                      }
                    }}
                  >
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        color: 'rgba(66, 165, 245, 0.7)', 
                        display: 'block', 
                        mb: 0.5, 
                        fontSize: '0.688rem', 
                        textTransform: 'uppercase', 
                        letterSpacing: '0.8px',
                        fontWeight: 600,
                        textAlign: 'center'
                      }}
                    >
                      Created
                    </Typography>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: '#ffffff', 
                        fontWeight: 600, 
                        fontSize: '0.875rem',
                        letterSpacing: '0.3px',
                        textAlign: 'center'
                      }}
                    >
                      {new Date(kit.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </Typography>
                  </Box>
                )}
                {kit.lastUpdated && (
                  <Box 
                    sx={{ 
                      flex: 1,
                      p: 1.5,
                      borderRadius: 1,
                      backgroundColor: 'rgba(156, 39, 176, 0.08)',
                      border: '1px solid rgba(156, 39, 176, 0.2)',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        backgroundColor: 'rgba(156, 39, 176, 0.12)',
                        borderColor: 'rgba(156, 39, 176, 0.3)',
                        transform: 'translateY(-4px)',
                        boxShadow: '0 8px 24px rgba(156, 39, 176, 0.3)'
                      }
                    }}
                  >
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        color: 'rgba(156, 39, 176, 0.7)', 
                        display: 'block', 
                        mb: 0.5, 
                        fontSize: '0.688rem', 
                        textTransform: 'uppercase', 
                        letterSpacing: '0.8px',
                        fontWeight: 600,
                        textAlign: 'center'
                      }}
                    >
                      Updated
                    </Typography>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: '#ffffff', 
                        fontWeight: 600, 
                        fontSize: '0.875rem',
                        letterSpacing: '0.3px',
                        textAlign: 'center'
                      }}
                    >
                      {new Date(kit.lastUpdated).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </Typography>
                  </Box>
                )}
              </Box>

              {/* Go to KIT Button */}
              <Button
                variant="contained"
                fullWidth
                component="a"
                href={kit.documentation}
                target="_blank"
                rel="noopener noreferrer"
                disabled={!kit.documentation}
                endIcon={<OpenInNew />}
                sx={{
                  mt: 'auto',
                  backgroundColor: '#42a5f5',
                  color: '#ffffff',
                  fontWeight: 600,
                  py: 1.5,
                  borderRadius: 1,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    backgroundColor: '#1976d2',
                    boxShadow: '0 8px 24px rgba(66, 165, 245, 0.4)',
                    transform: 'translateY(-4px)'
                  },
                  '&.Mui-disabled': {
                    backgroundColor: 'rgba(255, 255, 255, 0.12)',
                    color: 'rgba(255, 255, 255, 0.3)'
                  }
                }}
              >
                Go to KIT Documentation
              </Button>
          </Box>
        </Grid2>

        {/* Right Side: Features Grid */}
        <Grid2 size={{ xs: 12, md: 8, lg: 9 }} sx={{ display: 'flex', flexDirection: 'column', maxWidth: '100%', height: { xs: 'auto', md: '100%' } }}>
          <Box sx={{ p: 4, width: '100%', maxWidth: '100%', height: '100%', overflowY: 'auto' }}>
              <Grid2 container spacing={3} sx={{ width: '100%', maxWidth: '100%', margin: 0 }}>
                {kit.features.map((feature) => (
                  <Grid2 size={{ xs: 12, sm: 6, lg: 4 }} key={feature.id} sx={{ maxWidth: '100%' }}>
                    <FeatureCard feature={feature} onToggle={handleFeatureToggle} />
                  </Grid2>
                ))}
            </Grid2>
          </Box>
        </Grid2>
      </Grid2>
    </Box>
  );
};

export default KitDetailPage;
