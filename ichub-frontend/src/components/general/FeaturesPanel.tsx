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

import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText, 
  Chip,
  IconButton,
  Divider,
  Collapse,
  Switch,
  FormControlLabel
} from '@mui/material';
import { 
  Close,
  Science,
  Timeline,
  ExpandMore,
  ExpandLess
} from '@mui/icons-material';

interface FeaturesPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onFeatureToggle: (kitId: string, featureId: string, enabled: boolean) => void;
}

const FeaturesPanel: React.FC<FeaturesPanelProps> = ({ isOpen, onClose, onFeatureToggle }) => {
  const [expandedKits, setExpandedKits] = useState<string[]>([]);
  const [featureStates, setFeatureStates] = useState<{[key: string]: boolean}>({
    // PCF KIT features (por defecto deshabilitadas)
    'carbon-calculation': false,
    'lifecycle-assessment': false,
    'emission-tracking': false,
    'sustainability-reports': false,
    // Traceability KIT features (por defecto deshabilitadas)
    'part-tracking': false,
    'supply-chain-visibility': false,
    'origin-verification': false,
    'recall-management': false,
  });

  // Solo KITs "Ready" con sus features (basado en el mock)
  const readyKits = [
    {
      id: 'pcf',
      name: 'PCF KIT',
      description: 'Product Carbon Footprint calculation and lifecycle assessment',
      icon: <Science />,
      features: [
        { id: 'carbon-calculation', name: 'Carbon Calculation', description: 'Calculate product carbon footprints' },
        { id: 'lifecycle-assessment', name: 'Lifecycle Assessment', description: 'Perform comprehensive LCA analysis' },
        { id: 'emission-tracking', name: 'Emission Tracking', description: 'Track and monitor emissions' },
        { id: 'sustainability-reports', name: 'Sustainability Reports', description: 'Generate detailed sustainability reports' }
      ]
    },
    {
      id: 'traceability',
      name: 'Traceability KIT',
      description: 'End-to-end traceability of parts and components',
      icon: <Timeline />,
      features: [
        { id: 'part-tracking', name: 'Part Tracking', description: 'Track parts through supply chain' },
        { id: 'supply-chain-visibility', name: 'Supply Chain Visibility', description: 'Full supply chain visibility' },
        { id: 'origin-verification', name: 'Origin Verification', description: 'Verify part origins' },
        { id: 'recall-management', name: 'Recall Management', description: 'Manage product recalls' }
      ]
    }
  ];

  const handleKitToggle = (kitId: string) => {
    setExpandedKits(prev => {
      // Si el KIT ya está expandido, lo cerramos
      if (prev.includes(kitId)) {
        return [];
      }
      // Si no está expandido, cerramos todos los demás y abrimos este
      return [kitId];
    });
  };

  const handleFeatureToggle = (kitId: string, featureId: string) => {
    const newState = !featureStates[featureId];
    setFeatureStates(prev => ({
      ...prev,
      [featureId]: newState
    }));
    onFeatureToggle(kitId, featureId, newState);
  };

  if (!isOpen) return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        left: '100px', // Posicionado al lado del sidebar
        top: '50%',
        transform: 'translateY(-50%)',
        width: '320px',
        backgroundColor: 'rgba(0, 42, 126, 0.95)',
        backdropFilter: 'blur(10px)',
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        zIndex: 1000001,
        animation: 'slideInRight 0.3s ease-out',
        overflow: 'hidden'
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.15)',
          background: 'linear-gradient(135deg, rgba(66, 165, 245, 0.2) 0%, rgba(25, 118, 210, 0.2) 100%)'
        }}
      >
        <Typography
          variant="h6"
          sx={{
            color: 'white',
            fontWeight: 600,
            fontSize: '1.1rem'
          }}
        >
          Available Features
        </Typography>
        <IconButton
          onClick={onClose}
          sx={{
            color: 'rgba(255, 255, 255, 0.8)',
            '&:hover': {
              color: 'white',
              backgroundColor: 'rgba(255, 255, 255, 0.1)'
            }
          }}
        >
          <Close />
        </IconButton>
      </Box>

      {/* KITs List */}
      <List sx={{ padding: '8px' }}>
        {readyKits.map((kit, kitIndex) => {
          const isExpanded = expandedKits.includes(kit.id);
          
          return (
            <React.Fragment key={kit.id}>
              {/* KIT Header */}
              <ListItem
                onClick={() => handleKitToggle(kit.id)}
                sx={{
                  borderRadius: '8px',
                  margin: '4px 0',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  backgroundColor: isExpanded ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                    transform: 'translateX(2px)'
                  }
                }}
              >
                <ListItemIcon
                  sx={{
                    color: '#64b5f6',
                    minWidth: '40px'
                  }}
                >
                  {kit.icon}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography
                        sx={{
                          color: 'white',
                          fontWeight: 600,
                          fontSize: '0.95rem'
                        }}
                      >
                        {kit.name}
                      </Typography>
                      <Chip
                        label="Ready"
                        size="small"
                        sx={{
                          height: '18px',
                          fontSize: '0.65rem',
                          backgroundColor: 'rgba(76, 175, 80, 0.3)',
                          color: '#4caf50',
                          border: '1px solid #4caf50'
                        }}
                      />
                    </Box>
                  }
                  secondary={
                    <Typography
                      sx={{
                        color: 'rgba(255, 255, 255, 0.7)',
                        fontSize: '0.75rem',
                        lineHeight: 1.3
                      }}
                    >
                      {kit.description}
                    </Typography>
                  }
                />
                <IconButton
                  sx={{
                    color: 'rgba(255, 255, 255, 0.7)',
                    padding: '4px',
                    transition: 'transform 0.3s ease'
                  }}
                >
                  {isExpanded ? <ExpandLess /> : <ExpandMore />}
                </IconButton>
              </ListItem>

              {/* Features List (Collapsible) */}
              <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                <List sx={{ paddingLeft: '20px', paddingTop: 0, paddingBottom: 0 }}>
                  {kit.features.map((feature, featureIndex) => (
                    <ListItem
                      key={feature.id}
                      onClick={() => handleFeatureToggle(kit.id, feature.id)}
                      sx={{
                        borderRadius: '6px',
                        margin: '2px 0',
                        padding: '8px 12px',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          backgroundColor: 'rgba(255, 255, 255, 0.05)'
                        }
                      }}
                    >
                      <ListItemText
                        primary={
                          <Typography
                            sx={{
                              color: 'white',
                              fontWeight: 400,
                              fontSize: '0.85rem'
                            }}
                          >
                            {feature.name}
                          </Typography>
                        }
                        secondary={
                          <Typography
                            sx={{
                              color: 'rgba(255, 255, 255, 0.6)',
                              fontSize: '0.7rem',
                              lineHeight: 1.2
                            }}
                          >
                            {feature.description}
                          </Typography>
                        }
                      />
                      <Switch
                        checked={featureStates[feature.id]}
                        onChange={(e) => {
                          e.stopPropagation(); // Evitar que se dispare el onClick del ListItem
                          handleFeatureToggle(kit.id, feature.id);
                        }}
                        size="small"
                        sx={{
                          '& .MuiSwitch-switchBase.Mui-checked': {
                            color: '#4caf50',
                          },
                          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                            backgroundColor: '#4caf50',
                          },
                        }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Collapse>

              {kitIndex < readyKits.length - 1 && (
                <Divider sx={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', margin: '8px 16px' }} />
              )}
            </React.Fragment>
          );
        })}
      </List>

      {/* Footer */}
      <Box
        sx={{
          padding: '12px 20px',
          borderTop: '1px solid rgba(255, 255, 255, 0.15)',
          backgroundColor: 'rgba(0, 0, 0, 0.2)'
        }}
      >
        <Typography
          sx={{
            color: 'rgba(255, 255, 255, 0.6)',
            fontSize: '0.75rem',
            textAlign: 'center'
          }}
        >
          Expand KITs to enable/disable features
        </Typography>
      </Box>

      <style>
        {`
          @keyframes slideInRight {
            from {
              opacity: 0;
              transform: translateY(-50%) translateX(-20px);
            }
            to {
              opacity: 1;
              transform: translateY(-50%) translateX(0);
            }
          }
        `}
      </style>
    </Box>
  );
};

export default FeaturesPanel;