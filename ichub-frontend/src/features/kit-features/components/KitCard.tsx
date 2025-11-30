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
  Box
} from '@mui/material';
import { 
  Schedule,
  Pageview
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { KitFeature } from '../types';

interface KitCardProps {
  kit: KitFeature;
  isCenter?: boolean;
}

const KitCard: React.FC<KitCardProps> = ({ kit, isCenter = false }) => {
  const navigate = useNavigate();

  const handleViewFeatures = () => {
    navigate(`/kit-features/${kit.id}`);
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      available: '#00aa44',
      'coming-soon': '#ff6600', 
      beta: '#1976d2'
    };
    return colors[status] || '#0f71cb';
  };

  const isKitAvailable = kit.status === 'available' || kit.status === 'beta';

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
                  width: 140,
                  height: 140,
                  objectFit: 'contain'
                }}
              />
            ) : (
              <Box sx={{ 
                fontSize: '5.5rem',
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
            sx={{ 
              fontSize: '0.8rem',
              lineHeight: 1.3,
              textAlign: 'center',
              mb: 1.5,
              color: 'rgba(255, 255, 255, 0.7)'
            }}
          >
            {kit.description}
          </Typography>
        </Box>

        {/* View Features Button and Collapsible Features */}
        {isKitAvailable ? (
          <Box>
            <Button
              onClick={handleViewFeatures}
              fullWidth
              variant="outlined"
              endIcon={<Pageview />}
              sx={{
                py: 0.5,
                minHeight: '32px',
                fontSize: '0.875rem',
                borderRadius: 1,
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
              View Features ({kit.features.length})
            </Button>
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
                py: 0.5,
                minHeight: '32px',
                fontSize: '0.875rem',
                borderRadius: 1,
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
