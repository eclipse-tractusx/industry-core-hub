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
import { Box, Typography, Grid2, Paper, Tooltip, Collapse, IconButton, Chip, ClickAwayListener } from '@mui/material';
import { ExpandMore, ExpandLess, InfoOutlined } from '@mui/icons-material';
import { ParsedProperty } from '../types';
import { getIconForProperty } from '../utils/iconMapper';
import { formatValue } from '../utils/dataFormatter';
import { MetricProgress } from './MetricProgress';

interface DynamicRendererProps {
  properties: ParsedProperty[];
  level?: number;
  rawData?: Record<string, unknown>;
  customRenderers?: Record<string, React.ComponentType<{ data: any; rawData: Record<string, unknown> }>>;
}

// Helper to detect if property represents a metric with progress
const isMetricProgress = (property: ParsedProperty): boolean => {
  if (property.type !== 'number' && property.type !== 'integer') return false;
  
  const keywords = ['cycles', 'capacity', 'health', 'level', 'count', 'usage'];
  return keywords.some(keyword => 
    property.key.toLowerCase().includes(keyword) || 
    property.label.toLowerCase().includes(keyword)
  );
};

// Component for rendering expandable arrays/complex objects
const ExpandableProperty: React.FC<{ 
  property: ParsedProperty; 
  level: number; 
  rawData?: Record<string, unknown>;
  customRenderers?: Record<string, React.ComponentType<{ data: any; rawData: Record<string, unknown> }>>;
}> = ({ property, level, rawData, customRenderers }) => {
  const [expanded, setExpanded] = useState(level === 0);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const Icon = getIconForProperty(property.key);
  
  if (!property.children || property.children.length === 0) return null;
  
  // Check if children are simple (no nested children)
  const hasOnlyPrimitives = property.children.every(child => !child.children || child.children.length === 0);
  const itemCount = property.children.length;
  
  return (
    <Grid2 size={{ xs: 12 }}>
      <Paper
        elevation={0}
        sx={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 2,
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <Box
          sx={{
            p: { xs: 1.5, sm: 2 },
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            transition: 'background 0.2s',
            '&:hover': {
              background: 'rgba(255, 255, 255, 0.03)'
            }
          }}
          onClick={() => setExpanded(!expanded)}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 1.5 }, flex: 1 }}>
            <Box
              sx={{
                p: { xs: 0.75, sm: 1 },
                borderRadius: 1.5,
                background: 'rgba(102, 126, 234, 0.15)',
                color: '#667eea',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Icon sx={{ fontSize: { xs: 18, sm: 20 } }} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography
                  variant="subtitle1"
                  sx={{
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: { xs: '0.85rem', sm: '0.95rem' }
                  }}
                >
                  {property.label}
                </Typography>
                <Chip
                  label={property.key}
                  size="small"
                  sx={{
                    backgroundColor: 'rgba(102, 126, 234, 0.15)',
                    color: '#667eea',
                    fontSize: '0.65rem',
                    height: 20,
                    fontFamily: 'monospace',
                    '& .MuiChip-label': { px: 1, py: 0 }
                  }}
                />
                {property.description && (
                  <ClickAwayListener onClickAway={() => setTooltipOpen(false)}>
                    <Tooltip
                      title={property.description}
                      arrow
                      placement="top"
                      open={tooltipOpen}
                      disableHoverListener
                      disableFocusListener
                      slotProps={{
                        tooltip: {
                          sx: {
                            backgroundColor: 'rgba(30, 30, 30, 0.95)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: 2,
                            padding: 2,
                            fontSize: '0.8rem',
                            maxWidth: 300
                          }
                        },
                        arrow: {
                          sx: {
                            color: 'rgba(30, 30, 30, 0.95)',
                            '&::before': {
                              border: '1px solid rgba(255, 255, 255, 0.1)'
                            }
                          }
                        }
                      }}
                    >
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          setTooltipOpen(!tooltipOpen);
                        }}
                        sx={{
                          p: 0.5,
                          color: 'rgba(102, 126, 234, 0.7)',
                          '&:hover': {
                            color: '#667eea',
                            backgroundColor: 'rgba(102, 126, 234, 0.1)'
                          }
                        }}
                      >
                        <InfoOutlined sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                  </ClickAwayListener>
                )}
              </Box>
              <Typography
                variant="caption"
                sx={{
                  color: 'rgba(255, 255, 255, 0.5)',
                  fontSize: { xs: '0.7rem', sm: '0.75rem' },
                  display: 'block',
                  mt: 0.5
                }}
              >
                {hasOnlyPrimitives ? `${itemCount} field${itemCount !== 1 ? 's' : ''}` : `${itemCount} item${itemCount !== 1 ? 's' : ''}`}
              </Typography>
              {property.semanticId && (
                <Typography
                  variant="caption"
                  sx={{
                    color: 'rgba(255, 255, 255, 0.4)',
                    fontSize: { xs: '0.6rem', sm: '0.65rem' },
                    display: { xs: 'none', sm: 'block' },
                    mt: 0.5,
                    fontFamily: 'monospace',
                    wordBreak: 'break-all'
                  }}
                >
                  {property.semanticId}
                </Typography>
              )}
            </Box>
            <Chip
              label={expanded ? 'Collapse' : 'Expand'}
              size="small"
              sx={{
                display: { xs: 'none', sm: 'flex' },
                backgroundColor: 'rgba(102, 126, 234, 0.15)',
                color: '#667eea',
                fontSize: '0.7rem',
                height: 24,
                '& .MuiChip-label': { px: 1.5 }
              }}
            />
          </Box>
          <IconButton
            size="small"
            sx={{
              color: 'rgba(255, 255, 255, 0.5)',
              ml: { xs: 0.5, sm: 1 },
              p: { xs: 0.5, sm: 1 },
              transform: expanded ? 'rotate(0deg)' : 'rotate(0deg)',
              transition: 'transform 0.3s'
            }}
          >
            {expanded ? <ExpandLess sx={{ fontSize: { xs: 20, sm: 24 } }} /> : <ExpandMore sx={{ fontSize: { xs: 20, sm: 24 } }} />}
          </IconButton>
        </Box>
        
        {/* Expandable Content */}
        <Collapse in={expanded}>
          <Box sx={{ p: { xs: 1.5, sm: 2 }, pt: 0, borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
            {hasOnlyPrimitives ? (
              <Grid2 container spacing={{ xs: 1.5, sm: 2 }} sx={{ mt: 0.5 }}>
                {property.children.map((child, idx) => {
                  const ChildIcon = getIconForProperty(child.key);
                  
                  return (
                    <ChildPropertyItem
                      key={`${child.key}-${idx}`}
                      child={child}
                      ChildIcon={ChildIcon}
                    />
                  );
                })}
              </Grid2>
            ) : (
              <Box sx={{ mt: 1 }}>
                <DynamicRenderer properties={property.children} level={level + 1} rawData={rawData} customRenderers={customRenderers} />
              </Box>
            )}
          </Box>
        </Collapse>
      </Paper>
    </Grid2>
  );
};

// Separate component for child properties to avoid hooks in loops
const ChildPropertyItem: React.FC<{ child: ParsedProperty; ChildIcon: React.ElementType }> = ({ child, ChildIcon }) => {
  const [tooltipOpen, setTooltipOpen] = useState(false);
  
  return (
    <Grid2 size={{ xs: 12, sm: 6, md: 4 }}>
      <Paper
                        elevation={0}
                        sx={{
                          p: { xs: 1.5, sm: 2 },
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: 1.5,
                          height: '100%',
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            background: 'rgba(255, 255, 255, 0.05)',
                            borderColor: 'rgba(102, 126, 234, 0.2)'
                          }
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: { xs: 0.75, sm: 1 }, mb: 0.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.75, sm: 1 }, flex: 1, flexWrap: 'wrap' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.75, sm: 1 } }}>
                              <ChildIcon sx={{ fontSize: { xs: 14, sm: 16 }, color: 'rgba(255, 255, 255, 0.4)' }} />
                              <Typography
                                variant="caption"
                                sx={{
                                  color: 'rgba(255, 255, 255, 0.5)',
                                  fontSize: { xs: '0.65rem', sm: '0.7rem' },
                                  fontWeight: 500,
                                  textTransform: 'uppercase',
                                  letterSpacing: { xs: '0.3px', sm: '0.5px' }
                                }}
                              >
                                {child.label}
                              </Typography>
                            </Box>
                            <Chip
                              label={child.key}
                              size="small"
                              sx={{
                                backgroundColor: 'rgba(102, 126, 234, 0.15)',
                                color: '#667eea',
                                fontSize: '0.6rem',
                                height: 18,
                                fontFamily: 'monospace',
                                '& .MuiChip-label': { px: 0.75, py: 0 }
                              }}
                            />
                          </Box>
                          {child.description && (
                            <ClickAwayListener onClickAway={() => setTooltipOpen(false)}>
                              <Tooltip
                                title={child.description}
                                arrow
                                placement="top"
                                open={tooltipOpen}
                                disableHoverListener
                                disableFocusListener
                                slotProps={{
                                  tooltip: {
                                    sx: {
                                      backgroundColor: 'rgba(30, 30, 30, 0.95)',
                                      border: '1px solid rgba(255, 255, 255, 0.1)',
                                      borderRadius: 2,
                                      padding: 2,
                                      fontSize: '0.8rem',
                                      maxWidth: 300
                                    }
                                  },
                                  arrow: {
                                    sx: {
                                      color: 'rgba(30, 30, 30, 0.95)',
                                      '&::before': {
                                        border: '1px solid rgba(255, 255, 255, 0.1)'
                                      }
                                    }
                                  }
                                }}
                              >
                                <IconButton
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setTooltipOpen(!tooltipOpen);
                                  }}
                                  sx={{
                                    p: 0.5,
                                    color: 'rgba(102, 126, 234, 0.7)',
                                    '&:hover': {
                                      color: '#667eea',
                                      backgroundColor: 'rgba(102, 126, 234, 0.1)'
                                    }
                                  }}
                                >
                                  <InfoOutlined sx={{ fontSize: 16 }} />
                                </IconButton>
                              </Tooltip>
                            </ClickAwayListener>
                          )}
                        </Box>
                        <Typography
                          variant="body2"
                          sx={{
                            color: '#fff',
                            fontWeight: 500,
                            fontSize: '0.875rem',
                            wordBreak: 'break-word',
                            mt: 0.5
                          }}
                        >
                          {formatValue(child.value, child.type)}
                        </Typography>
                        {child.semanticId && (
                          <Typography
                            variant="caption"
                            sx={{
                              color: 'rgba(255, 255, 255, 0.4)',
                              fontSize: { xs: '0.6rem', sm: '0.65rem' },
                              display: { xs: 'none', sm: 'block' },
                              mt: 0.5,
                              fontFamily: 'monospace',
                              wordBreak: 'break-all'
                            }}
                          >
                            {child.semanticId}
                          </Typography>
                        )}
                      </Paper>
                    </Grid2>
  );
};

export const DynamicRenderer: React.FC<DynamicRendererProps> = ({ properties, level = 0, rawData, customRenderers }) => {
  const renderProperty = (property: ParsedProperty) => {
    const Icon = getIconForProperty(property.key);
    
    // Check for custom renderer first
    if (customRenderers && rawData) {
      const renderer = customRenderers[property.key] || customRenderers[property.key.toLowerCase()];
      if (renderer) {
        const CustomRenderer = renderer;
        return (
          <Grid2 key={property.key} size={{ xs: 12 }}>
            <CustomRenderer data={property} rawData={rawData} />
          </Grid2>
        );
      }
    }
    
    // Render metric with progress bar
    if (isMetricProgress(property) && typeof property.value === 'number') {
      // Try to find max value from schema or estimate
      const max = property.key.includes('cycles') ? 5000 : 
                  property.key.includes('capacity') || property.key.includes('health') ? 100 : 
                  0;
      
      if (max > 0) {
        return (
          <Grid2 key={property.key} size={{ xs: 12, sm: 6 }}>
            <MetricProgress
              label={property.label}
              value={property.value}
              max={max}
              unit={property.key.includes('percentage') || property.key.includes('health') ? '%' : ''}
              color={property.value / max > 0.8 ? 'warning' : 'primary'}
              description={property.description}
            />
          </Grid2>
        );
      }
    }
    
    // Render nested objects/arrays with expandable component
    if (property.children && property.children.length > 0) {
      return <ExpandableProperty key={property.key} property={property} level={level} rawData={rawData} customRenderers={customRenderers} />;
    }

    // Render simple property
    return <SimpleProperty key={property.key} property={property} Icon={Icon} />;
  };

  return (
    <Grid2 container spacing={{ xs: 1.5, sm: 2 }} sx={{ background: 'transparent' }}>
      {properties.map(renderProperty)}
    </Grid2>
  );
};

// Separate component for simple properties to avoid hooks in loops
const SimpleProperty: React.FC<{ property: ParsedProperty; Icon: React.ElementType }> = ({ property, Icon }) => {
  const [simpleTooltipOpen, setSimpleTooltipOpen] = useState(false);
  
  return (
    <Grid2 size={{ xs: 12, sm: 6, md: 4 }}>
      <Paper
          elevation={0}
          sx={{
            p: { xs: 1.5, sm: 2 },
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 2,
            height: '100%',
            transition: 'all 0.2s ease',
            '&:hover': {
              background: 'rgba(255, 255, 255, 0.05)',
              borderColor: 'rgba(102, 126, 234, 0.3)'
            }
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: { xs: 1, sm: 1.5 } }}>
            <Box
              sx={{
                p: { xs: 0.75, sm: 1 },
                borderRadius: 1.5,
                background: 'rgba(102, 126, 234, 0.15)',
                color: '#667eea',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Icon sx={{ fontSize: { xs: 18, sm: 20 } }} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, mb: 0.5 }}>
                <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'rgba(255, 255, 255, 0.5)',
                      textTransform: 'uppercase',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      letterSpacing: '0.5px'
                    }}
                  >
                    {property.label}
                  </Typography>
                  <Chip
                    label={property.key}
                    size="small"
                    sx={{
                      backgroundColor: 'rgba(102, 126, 234, 0.15)',
                      color: '#667eea',
                      fontSize: '0.6rem',
                      height: 18,
                      fontFamily: 'monospace',
                      '& .MuiChip-label': { px: 0.75, py: 0 }
                    }}
                  />
                </Box>
                {property.description && (
                  <ClickAwayListener onClickAway={() => setSimpleTooltipOpen(false)}>
                    <Tooltip
                      title={property.description}
                      arrow
                      placement="top"
                      open={simpleTooltipOpen}
                      disableHoverListener
                      disableFocusListener
                      slotProps={{
                        tooltip: {
                          sx: {
                            backgroundColor: 'rgba(30, 30, 30, 0.95)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: 2,
                            padding: 2,
                            fontSize: '0.8rem',
                            maxWidth: 300
                          }
                        },
                        arrow: {
                          sx: {
                            color: 'rgba(30, 30, 30, 0.95)',
                            '&::before': {
                              border: '1px solid rgba(255, 255, 255, 0.1)'
                            }
                          }
                        }
                      }}
                    >
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSimpleTooltipOpen(!simpleTooltipOpen);
                        }}
                        sx={{
                          p: 0.5,
                          color: 'rgba(102, 126, 234, 0.7)',
                          '&:hover': {
                            color: '#667eea',
                            backgroundColor: 'rgba(102, 126, 234, 0.1)'
                          }
                        }}
                      >
                        <InfoOutlined sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                  </ClickAwayListener>
                )}
              </Box>
              <Typography
                variant="body1"
                sx={{
                  color: '#fff',
                  fontWeight: 500,
                  fontSize: { xs: '0.85rem', sm: '0.95rem' },
                  wordBreak: 'break-word'
                }}
              >
                {formatValue(property.value, property.type)}
              </Typography>
              {property.semanticId && (
                <Typography
                  variant="caption"
                  sx={{
                    color: 'rgba(255, 255, 255, 0.4)',
                    fontSize: { xs: '0.6rem', sm: '0.65rem' },
                    display: { xs: 'none', sm: 'block' },
                    mt: 0.5,
                    fontFamily: 'monospace',
                    wordBreak: 'break-all'
                  }}
                >
                  {property.semanticId}
                </Typography>
              )}
            </Box>
          </Box>
        </Paper>
      </Grid2>
  );
};
