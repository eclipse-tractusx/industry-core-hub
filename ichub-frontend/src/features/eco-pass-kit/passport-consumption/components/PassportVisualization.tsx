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
  Button,
  Paper,
  Tab,
  Tabs,
  Grid2,
  Card,
  CircularProgress,
  Chip,
  Snackbar,
  Select,
  MenuItem,
  FormControl
} from '@mui/material';
import { ArrowBack, Info, Download, ContentCopy } from '@mui/icons-material';
import { JsonSchema } from '../types';
import { SchemaParser } from '../utils/schemaParser';
import { DynamicRenderer } from './DynamicRenderer';
import { CompositionChart } from './CompositionChart';
import { getCategoryIcon } from '../utils/iconMapper';

interface PassportVisualizationProps {
  schema: JsonSchema;
  data: Record<string, unknown>;
  passportId: string;
  onBack: () => void;
}

export const PassportVisualization: React.FC<PassportVisualizationProps> = ({
  schema,
  data,
  passportId,
  onBack
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  
  // Parse schema and data
  const parser = useMemo(() => new SchemaParser(schema), [schema]);
  const tabs = useMemo(() => parser.generateTabs(data), [parser, data]);
  const metrics = useMemo(() => parser.extractMetrics(data), [parser, data]);
  
  // Extract composition data for visualization - use materialComposition from Materials tab
  const compositionData = useMemo(() => {
    const items: Array<{ name: string; value: number; unit: string }> = [];
    let additionalInfo: any = null;
    
    // Try to extract from materials.materialComposition first (matches the Materials tab)
    if (data.materials && typeof data.materials === 'object') {
      const materials = data.materials as Record<string, unknown>;
      
      // Check for materialComposition with renewable, recycled, concentration
      if (materials.materialComposition && typeof materials.materialComposition === 'object') {
        const matComp = materials.materialComposition as Record<string, unknown>;
        if (matComp.content && Array.isArray(matComp.content)) {
          matComp.content.forEach((item: any) => {
            // Store additional info for display
            if (!additionalInfo) {
              additionalInfo = {
                unit: item.unit,
                critical: item.critical,
                id: item.id,
                documentation: item.documentation
              };
            }
            
            // Extract renewable, recycled, and concentration values
            if (item.renewable !== undefined && item.renewable > 0) {
              items.push({
                name: 'Renewable',
                value: Number(item.renewable),
                unit: '%'
              });
            }
            if (item.recycled !== undefined && item.recycled > 0) {
              items.push({
                name: 'Recycled',
                value: Number(item.recycled),
                unit: '%'
              });
            }
            if (item.concentration !== undefined && item.concentration > 0) {
              items.push({
                name: 'Concentration',
                value: Number(item.concentration),
                unit: '%'
              });
            }
          });
        }
      }
      
      // Fallback to criticalRawMaterials if materialComposition not available
      if (items.length === 0 && materials.criticalRawMaterials && Array.isArray(materials.criticalRawMaterials)) {
        materials.criticalRawMaterials.forEach((item: any) => {
          if (item.name && item.percentage) {
            items.push({
              name: String(item.name),
              value: Number(item.percentage),
              unit: '%'
            });
          }
        });
      }
    }
    
    return { items, additionalInfo };
  }, [data]);

  // Handle copy to clipboard
  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setSnackbarMessage(`${label} copied to clipboard`);
      setSnackbarOpen(true);
    }).catch(() => {
      setSnackbarMessage('Failed to copy');
      setSnackbarOpen(true);
    });
  };

  // Handle download passport as JSON
  const handleDownload = () => {
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `passport-${passportId}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Group metrics by category
  const metricsByCategory = useMemo(() => {
    const grouped: Record<string, Array<{ value: string; label: string }>> = {};
    metrics.forEach(metric => {
      if (!grouped[metric.category]) {
        grouped[metric.category] = [];
      }
      grouped[metric.category].push({ value: metric.value, label: metric.label });
    });
    return grouped;
  }, [metrics]);

  if (tabs.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box 
      sx={{ 
        minHeight: { xs: '100vh', sm: '100vh' },
        height: { xs: 'auto', sm: '100vh' },
        width: '100%',
        maxWidth: '100%',
        display: 'flex', 
        flexDirection: 'column', 
        background: '#0d0d0d',
        backgroundColor: '#0d0d0d',
        overflow: { xs: 'visible', sm: 'hidden' },
        overflowX: 'hidden',
        position: 'relative'
      }}
    >
      {/* Header */}
      <Paper
        elevation={0}
        sx={{
          background: '#1a1a1a',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 0,
          p: { xs: 2, sm: 3 },
          flexShrink: 0,
          maxWidth: '100%',
          overflowX: 'hidden'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: { xs: 2, sm: 3 }, flexWrap: 'wrap', gap: { xs: 1.5, sm: 2 } }}>
          <Button
            startIcon={<ArrowBack sx={{ fontSize: { xs: 18, sm: 20 } }} />}
            onClick={onBack}
            sx={{
              color: '#4a90e2',
              textTransform: 'none',
              fontWeight: 500,
              fontSize: { xs: '0.85rem', sm: '0.95rem' },
              p: { xs: '6px 12px', sm: '8px 16px' },
              '&:hover': {
                background: 'rgba(74, 144, 226, 0.1)'
              }
            }}
          >
            Back
          </Button>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, flex: '1 1 auto', minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
              <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: { xs: '0.7rem', sm: '0.75rem' }, fontWeight: 500 }}>
                ID:
              </Typography>
              <Chip
                label={passportId}
                sx={{
                  backgroundColor: 'rgba(102, 126, 234, 0.2)',
                  color: '#fff',
                  fontSize: { xs: '0.75rem', sm: '0.85rem' },
                  fontWeight: 600,
                  height: { xs: 24, sm: 28 },
                  fontFamily: 'monospace',
                  borderRadius: 1.5,
                  '& .MuiChip-label': { 
                    px: { xs: 1.5, sm: 2 },
                    py: 0
                  }
                }}
              />
            </Box>
            {schema['x-samm-aspect-model-urn'] && (
              <Typography
                variant="caption"
                sx={{
                  color: 'rgba(255, 255, 255, 0.5)',
                  fontSize: { xs: '0.65rem', sm: '0.7rem' },
                  fontFamily: 'monospace',
                  textAlign: 'center',
                  wordBreak: 'break-all',
                  maxWidth: '100%',
                  px: { xs: 1, sm: 2 }
                }}
              >
                {schema['x-samm-aspect-model-urn']}
              </Typography>
            )}
            <Box sx={{ display: 'flex', gap: { xs: 0.75, sm: 1 }, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center', mt: 1 }}>
              <Chip
                icon={<ContentCopy sx={{ fontSize: { xs: '0.7rem', sm: '0.8rem' } }} />}
                label={`AAS ID: ${(data.metadata as any)?.passportIdentifier || 'N/A'}`}
                onClick={() => handleCopy((data.metadata as any)?.passportIdentifier || 'N/A', 'AAS ID')}
                sx={{
                  backgroundColor: 'rgba(74, 144, 226, 0.15)',
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontSize: { xs: '0.65rem', sm: '0.7rem' },
                  height: { xs: '22px', sm: '24px' },
                  cursor: 'pointer',
                  maxWidth: '100%',
                  '& .MuiChip-label': {
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    px: { xs: 1, sm: 1.5 }
                  },
                  '&:hover': {
                    backgroundColor: 'rgba(74, 144, 226, 0.25)'
                  },
                  '& .MuiChip-icon': {
                    color: 'rgba(255, 255, 255, 0.6)'
                  }
                }}
              />
              <Chip
                icon={<ContentCopy sx={{ fontSize: { xs: '0.7rem', sm: '0.8rem' } }} />}
                label={`Global Asset ID: ${passportId}`}
                onClick={() => handleCopy(passportId, 'Global Asset ID')}
                sx={{
                  backgroundColor: 'rgba(74, 144, 226, 0.15)',
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontSize: { xs: '0.65rem', sm: '0.7rem' },
                  height: { xs: '22px', sm: '24px' },
                  cursor: 'pointer',
                  maxWidth: '100%',
                  '& .MuiChip-label': {
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    px: { xs: 1, sm: 1.5 }
                  },
                  '&:hover': {
                    backgroundColor: 'rgba(74, 144, 226, 0.25)'
                  },
                  '& .MuiChip-icon': {
                    color: 'rgba(255, 255, 255, 0.6)'
                  }
                }}
              />
            </Box>
          </Box>
          <Button
            startIcon={<Download sx={{ fontSize: { xs: 18, sm: 20 } }} />}
            onClick={handleDownload}
            sx={{
              color: '#4a90e2',
              textTransform: 'none',
              fontWeight: 500,
              fontSize: { xs: '0.85rem', sm: '0.95rem' },
              p: { xs: '6px 12px', sm: '8px 16px' },
              '&:hover': {
                background: 'rgba(74, 144, 226, 0.1)'
              }
            }}
          >
            Download
          </Button>
        </Box>

        {/* Metrics Cards */}
        <Grid2 container spacing={{ xs: 1.5, sm: 2 }}>
          {Object.entries(metricsByCategory).map(([category, categoryMetrics]) => {
            const Icon = getCategoryIcon(category);
            return (
              <Grid2 key={category} size={{ xs: 12, sm: 6, md: 6, lg: 3 }}>
                <Card
                  sx={{
                    background: '#252525',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: 2,
                    p: { xs: 1.5, sm: 2.5 },
                    height: '100%'
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.75, sm: 1 }, mb: { xs: 1.5, sm: 2 } }}>
                    <Icon sx={{ fontSize: { xs: 16, sm: 18 }, color: 'rgba(255, 255, 255, 0.6)' }} />
                    <Typography
                      variant="overline"
                      sx={{
                        color: 'rgba(255, 255, 255, 0.6)',
                        fontWeight: 500,
                        fontSize: { xs: '0.65rem', sm: '0.7rem' },
                        letterSpacing: { xs: '0.3px', sm: '0.5px' }
                      }}
                    >
                      {category}
                    </Typography>
                  </Box>
                  {categoryMetrics.map((metric, idx) => (
                    <Box key={idx} sx={{ mb: idx < categoryMetrics.length - 1 ? { xs: 1, sm: 1.25 } : 0 }}>
                      <Typography
                        variant="caption"
                        sx={{ color: 'rgba(255, 255, 255, 0.6)', display: 'block', mb: 0.25, fontSize: { xs: '0.65rem', sm: '0.7rem' } }}
                      >
                        {metric.label}
                      </Typography>
                      <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600, fontSize: { xs: '0.85rem', sm: '0.95rem' } }}>
                        {metric.value}
                      </Typography>
                    </Box>
                  ))}
                </Card>
              </Grid2>
            );
          })}
          
          {/* Composition Visualization */}
          {compositionData.items.length > 0 && (
            <Grid2 size={{ xs: 12, sm: 6, md: 6, lg: 3 }}>
              <Card
                sx={{
                  background: '#252525',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 2,
                  p: { xs: 1.5, sm: 2.5 },
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                <CompositionChart 
                  title="Materials" 
                  items={compositionData.items}
                  compact
                />
              </Card>
            </Grid2>
          )}
        </Grid2>
      </Paper>

      {/* Tabs Navigation */}
      <Paper
        elevation={0}
        sx={{
          background: '#1a1a1a',
          border: 'none',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 0,
          mx: 0,
          mb: 0,
          overflow: 'hidden',
          flexShrink: 0
        }}
      >
        {/* Mobile Dropdown */}
        <Box sx={{ display: { xs: 'block', sm: 'none' }, p: 1.5 }}>
          <FormControl fullWidth size="small">
            <Select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value as number)}
              renderValue={(value) => {
                const selectedTab = tabs[value as number];
                const Icon = selectedTab.icon;
                return (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Icon sx={{ fontSize: 16, color: '#fff' }} />
                    <Typography sx={{ color: '#fff', fontWeight: 500, fontSize: '0.85rem' }}>
                      {selectedTab.label}
                    </Typography>
                  </Box>
                );
              }}
              sx={{
                color: '#fff',
                backgroundColor: '#252525',
                borderRadius: 1.5,
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(255, 255, 255, 0.1)'
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(74, 144, 226, 0.5)'
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#4a90e2'
                },
                '& .MuiSvgIcon-root': {
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontSize: '1.2rem'
                },
                '& .MuiSelect-select': {
                  py: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }
              }}
              MenuProps={{
                PaperProps: {
                  sx: {
                    backgroundColor: '#252525',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: 1.5,
                    mt: 0.5,
                    '& .MuiMenuItem-root': {
                      color: 'rgba(255, 255, 255, 0.8)',
                      fontSize: '0.8rem',
                      py: 1,
                      minHeight: 'auto',
                      '&:hover': {
                        backgroundColor: 'rgba(74, 144, 226, 0.1)'
                      },
                      '&.Mui-selected': {
                        backgroundColor: 'rgba(74, 144, 226, 0.2)',
                        color: '#4a90e2',
                        '&:hover': {
                          backgroundColor: 'rgba(74, 144, 226, 0.25)'
                        }
                      }
                    }
                  }
                }
              }}
            >
              {tabs.map((tab, index) => {
                const Icon = tab.icon;
                return (
                  <MenuItem key={tab.id} value={index}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Icon sx={{ fontSize: 16, color: index === activeTab ? '#4a90e2' : 'rgba(255, 255, 255, 0.6)' }} />
                      <Typography sx={{ fontWeight: index === activeTab ? 600 : 400, fontSize: '0.8rem' }}>
                        {tab.label}
                      </Typography>
                    </Box>
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>
        </Box>

        {/* Desktop Tabs */}
        <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
          <Tabs
            value={activeTab}
            onChange={(_, newValue) => setActiveTab(newValue)}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            sx={{
              px: 3,
              '& .MuiTab-root': {
                color: 'rgba(255, 255, 255, 0.5)',
                textTransform: 'none',
                fontSize: '0.875rem',
                fontWeight: 500,
                minHeight: 42,
                px: 2,
                py: 1,
                minWidth: 100,
                '&.Mui-selected': {
                  color: '#4a90e2'
                },
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.05)'
                },
                '& .MuiTouchRipple-root': {
                  color: 'rgba(74, 144, 226, 0.3)'
                }
              },
              '& .MuiTabs-indicator': {
                backgroundColor: '#4a90e2',
                height: 2
              },
              '& .MuiTabs-scrollButtons': {
                color: 'rgba(255, 255, 255, 0.7)',
                '&.Mui-disabled': {
                  opacity: 0.3
                },
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)'
                }
              },
              '& .MuiTabScrollButton-root': {
                color: 'rgba(255, 255, 255, 0.7)',
                opacity: 1,
                '&.Mui-disabled': {
                  opacity: 0.3,
                  color: 'rgba(255, 255, 255, 0.3)'
                }
              }
            }}
          >
            {tabs.map((tab) => (
              <Tab
                key={tab.id}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <tab.icon sx={{ fontSize: 16 }} />
                    {tab.label}
                  </Box>
                }
              />
            ))}
          </Tabs>
        </Box>
      </Paper>

      {/* Tab Content */}
      <Box 
        sx={{ 
          flex: 1,
          overflow: { xs: 'visible', sm: 'auto' },
          overflowY: { xs: 'visible', sm: 'auto' },
          WebkitOverflowScrolling: 'touch',
          background: '#0d0d0d',
          backgroundColor: '#0d0d0d',
          p: { xs: 2, sm: 3 },
          minHeight: { xs: 'auto', sm: 0 },
          position: 'relative'
        }}
      >
        <Box 
          key={activeTab} 
          sx={{ 
            background: '#0d0d0d', 
            backgroundColor: '#0d0d0d',
            minHeight: '100%',
            width: '100%'
          }}
        >
          {tabs[activeTab] && tabs[activeTab].properties.length > 0 ? (
            <DynamicRenderer key={tabs[activeTab].id} properties={tabs[activeTab].properties} rawData={data} />
          ) : (
          <Paper
            sx={{
              p: { xs: 3, sm: 4 },
              textAlign: 'center',
              background: '#1a1a1a',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
          >
            <Info sx={{ fontSize: { xs: 40, sm: 48 }, color: 'rgba(255, 255, 255, 0.3)', mb: 2 }} />
            <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: { xs: '0.9rem', sm: '1rem' } }}>
              No data available for this section
            </Typography>
          </Paper>
        )}
        </Box>
      </Box>

      {/* Snackbar for copy feedback */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={2000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{
          '& .MuiSnackbarContent-root': {
            backgroundColor: 'rgba(74, 144, 226, 0.9)',
            color: '#fff'
          }
        }}
      />
    </Box>
  );
};
