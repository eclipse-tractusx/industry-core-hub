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

import React, { useState, useMemo } from 'react';
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
  Switch
} from '@mui/material';
import { 
  Close,
  ExpandMore,
  ExpandLess
} from '@mui/icons-material';
import { kits } from '@/features/main';
import { useFeatures } from '@/contexts/FeatureContext';

interface FeaturesPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onFeatureToggle: (kitId: string, featureId: string, enabled: boolean) => void;
}

const FeaturesPanel: React.FC<FeaturesPanelProps> = ({ isOpen, onClose, onFeatureToggle }) => {
  const [expandedKits, setExpandedKits] = useState<string[]>([]);
  const { featureStates } = useFeatures();

  // Filter kits to show only those that have non-default features or are coming-soon
  const availableKits = useMemo(() => 
    kits.filter(kit => {
      // Show coming-soon kits
      if (kit.status === 'coming-soon') return true;
      
      // Show kits that have at least one non-default feature
      return kit.features.some(feature => !feature.default);
    }),
    []
  );

  const handleKitToggle = (kitId: string) => {
    setExpandedKits(prev => {
      // If the KIT is already expanded, close it
      if (prev.includes(kitId)) {
        return [];
      }
      // If not expanded, close all others and open this one
      return [kitId];
    });
  };

  const handleFeatureToggle = (kitId: string, featureId: string) => {
    // Find the feature to check if it's a default feature
    const kit = availableKits.find(k => k.id === kitId);
    const feature = kit?.features.find(f => f.id === featureId);
    
    // Don't allow toggling default features
    if (feature?.default) {
      return;
    }
    
    const newState = !featureStates[featureId];
    onFeatureToggle(kitId, featureId, newState);
  };

  if (!isOpen) return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        left: '72px', // Position next to the fixed-width sidebar
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
        {availableKits.map((kit, kitIndex) => {
          const isExpanded = expandedKits.includes(kit.id);
          const isComingSoon = kit.status === 'coming-soon';
          const hasFeatures = kit.features && kit.features.length > 0;
          const canExpand = !isComingSoon && hasFeatures;
          
          return (
            <React.Fragment key={kit.id}>
              {/* KIT Header */}
              <ListItem
                onClick={() => canExpand && handleKitToggle(kit.id)}
                sx={{
                  borderRadius: '8px',
                  margin: '4px 0',
                  cursor: canExpand ? 'pointer' : 'default',
                  transition: 'all 0.3s ease',
                  backgroundColor: isExpanded ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                  padding: isComingSoon ? '8px 12px' : '12px 16px',
                  opacity: isComingSoon ? 0.7 : 1,
                  '&:hover': {
                    backgroundColor: canExpand ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                    transform: canExpand ? 'translateX(2px)' : 'none'
                  }
                }}
              >
                <ListItemIcon
                  sx={{
                    color: isComingSoon ? '#90caf9' : '#64b5f6',
                    minWidth: isComingSoon ? '32px' : '40px',
                    '& svg': {
                      fontSize: isComingSoon ? '1.2rem' : '1.5rem'
                    }
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
                          fontWeight: isComingSoon ? 500 : 600,
                          fontSize: isComingSoon ? '0.85rem' : '0.95rem'
                        }}
                      >
                        {kit.name}
                      </Typography>
                      <Chip
                        label={kit.status === 'available' ? 'Available' : kit.status === 'coming-soon' ? 'Coming Soon' : 'Beta'}
                        size="small"
                        sx={{
                          height: isComingSoon ? '16px' : '18px',
                          fontSize: isComingSoon ? '0.6rem' : '0.65rem',
                          backgroundColor: kit.status === 'available' 
                            ? 'rgba(76, 175, 80, 0.3)' 
                            : kit.status === 'beta' 
                            ? 'rgba(255, 152, 0, 0.3)'
                            : 'rgba(66, 165, 245, 0.3)',
                          color: kit.status === 'available' 
                            ? '#4caf50' 
                            : kit.status === 'beta'
                            ? '#ff9800'
                            : '#42a5f5',
                          border: `1px solid ${kit.status === 'available' ? '#4caf50' : kit.status === 'beta' ? '#ff9800' : '#42a5f5'}`
                        }}
                      />
                    </Box>
                  }
                  secondary={
                    !isComingSoon && (
                      <Typography
                        sx={{
                          color: 'rgba(255, 255, 255, 0.7)',
                          fontSize: '0.75rem',
                          lineHeight: 1.3
                        }}
                      >
                        {kit.description}
                      </Typography>
                    )
                  }
                />
                {canExpand && (
                  <IconButton
                    sx={{
                      color: 'rgba(255, 255, 255, 0.7)',
                      padding: '4px',
                      transition: 'transform 0.3s ease'
                    }}
                  >
                    {isExpanded ? <ExpandLess /> : <ExpandMore />}
                  </IconButton>
                )}
              </ListItem>

              {/* Features List (Collapsible) - Only show if kit can expand */}
              {canExpand && (
                <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                <List sx={{ paddingLeft: '20px', paddingTop: 0, paddingBottom: 0 }}>
                  {kit.features.filter(feature => !feature.default).map((feature) => {
                    const isDefaultFeature = feature.default === true;
                    const isFeatureEnabled = featureStates[feature.id];
                    
                    return (
                      <ListItem
                        key={feature.id}
                        onClick={() => !isDefaultFeature && handleFeatureToggle(kit.id, feature.id)}
                        sx={{
                          borderRadius: '6px',
                          margin: '2px 0',
                          padding: '8px 12px',
                          cursor: isDefaultFeature ? 'default' : 'pointer',
                          transition: 'all 0.3s ease',
                          opacity: isDefaultFeature ? 0.7 : 1,
                          '&:hover': {
                            backgroundColor: isDefaultFeature ? 'transparent' : 'rgba(255, 255, 255, 0.05)'
                          }
                        }}
                      >
                        {feature.icon && (
                          <ListItemIcon
                            sx={{
                              color: isFeatureEnabled ? '#4caf50' : 'rgba(255, 255, 255, 0.5)',
                              minWidth: '32px',
                              '& svg': {
                                fontSize: '1.1rem'
                              },
                              transition: 'color 0.3s ease'
                            }}
                          >
                            {feature.icon}
                          </ListItemIcon>
                        )}
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Typography
                                sx={{
                                  color: 'white',
                                  fontWeight: 400,
                                  fontSize: '0.85rem'
                                }}
                              >
                                {feature.name}
                              </Typography>
                              {isDefaultFeature && (
                                <Chip
                                  label="Default"
                                  size="small"
                                  sx={{
                                    height: '16px',
                                    fontSize: '0.6rem',
                                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                    color: 'rgba(255, 255, 255, 0.7)',
                                    border: '1px solid rgba(255, 255, 255, 0.3)'
                                  }}
                                />
                              )}
                            </Box>
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
                          checked={isFeatureEnabled}
                          disabled={isDefaultFeature}
                          onChange={(e) => {
                            e.stopPropagation();
                            if (!isDefaultFeature) {
                              handleFeatureToggle(kit.id, feature.id);
                            }
                          }}
                          size="small"
                          sx={{
                            '& .MuiSwitch-switchBase.Mui-checked': {
                              color: '#4caf50',
                            },
                            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                              backgroundColor: '#4caf50',
                            },
                            '& .MuiSwitch-switchBase.Mui-disabled': {
                              color: 'rgba(255, 255, 255, 0.3)',
                            },
                          }}
                        />
                      </ListItem>
                    );
                  })}
                </List>
              </Collapse>
              )}

              {kitIndex < availableKits.length - 1 && (
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