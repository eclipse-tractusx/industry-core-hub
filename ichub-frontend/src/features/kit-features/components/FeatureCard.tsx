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
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Switch,
  Chip,
  Tooltip,
  Button
} from '@mui/material';
import { Lock, Visibility } from '@mui/icons-material';
import { useFeatures } from '@/contexts/FeatureContext';

interface Feature {
  id: string;
  name: string;
  description: string;
  icon?: React.ReactNode;
  enabled: boolean;
  default?: boolean;
  module?: { navigationPath?: string };
}

interface FeatureCardProps {
  feature: Feature;
  onToggle: (featureId: string, enabled: boolean) => void;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ feature, onToggle }) => {
  const navigate = useNavigate();

  const handleGoToView = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (feature.module?.navigationPath) {
      navigate(feature.module.navigationPath);
    }
  };

  return (
    <Card
      sx={{
        height: '100%',
        backgroundColor: 'transparent',
        backgroundImage: 'none',
        border: `1px solid ${feature.enabled ? 'rgba(66, 165, 245, 0.5)' : 'rgba(255, 255, 255, 0.15)'}`,
        transition: 'all 0.3s ease',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
        overflow: 'visible',
        '&:hover': {
          backgroundColor: 'rgba(10, 10, 10, 0.5)',
          transform: 'translateY(-4px)',
          boxShadow: feature.enabled ? '0 8px 24px rgba(66, 165, 245, 0.3)' : '0 8px 24px rgba(128, 128, 128, 0.2)',
          borderColor: feature.enabled ? 'rgba(66, 165, 245, 0.7)' : 'rgba(255, 255, 255, 0.25)',
          '& .icon-glow::before': feature.enabled ? {
            content: '""',
            position: 'absolute',
            inset: '-200px',
            background: 'radial-gradient(circle, rgba(66, 165, 245, 0.25) 0%, rgba(66, 165, 245, 0.15) 20%, rgba(66, 165, 245, 0.05) 35%, transparent 45%)',
            zIndex: -1,
            pointerEvents: 'none'
          } : {
            content: '""',
            position: 'absolute',
            inset: '-200px',
            background: 'radial-gradient(circle, rgba(128, 128, 128, 0.15) 0%, rgba(128, 128, 128, 0.08) 20%, rgba(128, 128, 128, 0.03) 35%, transparent 45%)',
            zIndex: -1,
            pointerEvents: 'none'
          }
        }
      }}
    >
      <CardContent sx={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        p: 3, 
        backgroundColor: 'transparent !important', 
        backgroundImage: 'none !important',
        background: 'none !important',
        overflow: 'visible'
      }}>
        {/* Icon at the top - large */}
        {feature.icon && (
          <Box
            className="icon-glow"
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              mb: 3,
              fontSize: '5rem',
              position: 'relative',
              transition: 'all 0.15s linear',
              backgroundColor: 'transparent !important',
              '&::before': {
                content: '""',
                position: 'absolute',
                inset: '-200px',
                background: 'transparent',
                zIndex: -1,
                pointerEvents: 'none',
                transition: 'background 0.15s linear'
              },
              '& > *': {
                fontSize: 'inherit',
                position: 'relative',
                zIndex: 1,
                filter: feature.enabled 
                  ? 'drop-shadow(0 4px 20px rgba(66, 165, 245, 0.4))'
                  : 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.3))',
                color: feature.enabled ? '#42a5f5' : 'rgba(255, 255, 255, 0.4)',
                transition: 'all 0.15s ease-in'
              }
            }}
          >
            {feature.icon}
          </Box>
        )}

        {/* Feature Name */}
        <Typography
          variant="h6"
          sx={{
            color: feature.enabled ? '#ffffff' : 'rgba(255, 255, 255, 0.7)',
            fontWeight: 600,
            fontSize: '1.1rem',
            textAlign: 'center',
            mb: 2,
            backgroundColor: 'transparent !important',
            backgroundImage: 'none !important',
            background: 'none !important',
            position: 'relative',
            zIndex: 1
          }}
        >
          {feature.name}
        </Typography>

        {/* Feature Description */}
        <Typography
          variant="body2"
          sx={{
            color: 'rgba(255, 255, 255, 0.6)',
            lineHeight: 1.6,
            textAlign: 'center',
            mb: 3,
            flex: 1,
            backgroundColor: 'transparent !important',
            backgroundImage: 'none !important',
            background: 'none !important',
            position: 'relative',
            zIndex: 1
          }}
        >
          {feature.description}
        </Typography>

        {/* Bottom section with chip and toggle */}
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1, mt: 'auto' ,backgroundColor: 'transparent !important',
            backgroundImage: 'none !important',
            background: 'none !important',
            position: 'relative',
            zIndex: 1}}>
          {feature.default && (
            <Chip
              label="Default"
              size="small"
              sx={{
                height: 24,
                fontSize: '0.75rem',
                backgroundColor: 'rgba(66, 165, 245, 0.2)',
                color: '#42a5f5',
                border: '1px solid rgba(66, 165, 245, 0.3)'
              }}
            />
          )}
          <Tooltip 
            title={feature.default ? "Default features cannot be disabled" : ""} 
            arrow
            disableHoverListener={!feature.default}
          >
            <Box sx={{ display: 'inline-flex' }}>
              <Switch
                checked={feature.enabled}
                onChange={(e) => onToggle(feature.id, e.target.checked)}
                disabled={feature.default}
                sx={{
                  '& .MuiSwitch-track': {
                    backgroundColor: feature.enabled 
                      ? (feature.default ? '#42a5f5 !important' : '#4caf50 !important') 
                      : 'rgba(120, 120, 120, 0.9) !important',
                    border: feature.enabled 
                      ? (feature.default ? '1px solid #42a5f5' : '1px solid #4caf50') 
                      : '1px solid rgba(255, 255, 255, 0.4)',
                    opacity: '1 !important'
                  },
                  '& .MuiSwitch-thumb': {
                    color: feature.enabled ? '#ffffff' : 'rgba(255, 255, 255, 0.9)',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
                  }
                }}
              />
            </Box>
          </Tooltip>
          {feature.default && (
            <Tooltip title="Default features cannot be disabled" arrow>
              <Box sx={{ display: 'flex', alignItems: 'center', color: '#42a5f5' }}>
                <Lock sx={{ fontSize: '1.2rem' }} />
              </Box>
            </Tooltip>
          )}
        </Box>

        {/* Go to View Button - only shown when enabled */}
        {feature.enabled && feature.module?.navigationPath && (
          <Button
            variant="contained"
            fullWidth
            size="small"
            endIcon={<Visibility />}
            onClick={handleGoToView}
            sx={{
              mt: 2,
              backgroundColor: feature.default ? '#42a5f5' : '#4caf50',
              color: '#ffffff',
              fontWeight: 500,
              py: 0.75,
              fontSize: '0.875rem',
              borderRadius: 1,
              textTransform: 'none',
              '&:hover': {
                backgroundColor: feature.default ? '#1976d2' : '#388e3c'
              }
            }}
          >
            View
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default FeatureCard;
