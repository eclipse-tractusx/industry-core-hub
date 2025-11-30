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
  Snackbar,
  Alert,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Chip
} from '@mui/material';
import { ArrowBack, Download, ContentCopy, KeyboardArrowDown, Visibility, Description, Info } from '@mui/icons-material';
import { PassportVisualizationProps } from '../types';
import { SchemaParser } from '../../utils/schemaParser';
import { DynamicRenderer } from '../../components/DynamicRenderer';
import { getCategoryIcon } from '../../utils/iconMapper';

/**
 * Props for custom header card components
 */
export interface HeaderCardProps {
  data: Record<string, unknown>;
  passportId: string;
}

/**
 * Configuration for base passport visualization
 */
export interface BasePassportConfig {
  /**
   * Custom header cards to display above tabs
   * These are rendered in a grid layout at the top of the passport
   */
  headerCards?: React.ComponentType<HeaderCardProps>[];
  
  /**
   * Custom renderers for specific data paths
   * Key is the dot-notation path (e.g., "materials.materialComposition")
   * Value is a component to render that section
   */
  customRenderers?: Record<string, React.ComponentType<{ data: any; rawData: Record<string, unknown> }>>;
}

/**
 * Base passport visualization component
 * This provides the skeleton for all passport types and can be customized
 */
export const BasePassportVisualization: React.FC<PassportVisualizationProps & { 
  config?: BasePassportConfig;
  passportName?: string;
  passportVersion?: string;
}> = ({
  schema,
  data,
  passportId,
  onBack,
  config = {},
  passportName = 'Digital Product Passport',
  passportVersion
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [tabMenuAnchor, setTabMenuAnchor] = useState<null | HTMLElement>(null);
  
  // Parse schema and data
  const parser = useMemo(() => new SchemaParser(schema), [schema]);
  const tabs = useMemo(() => parser.generateTabs(data), [parser, data]);
  
  // Extract metadata
  const metadata = data.metadata as Record<string, any> | undefined;
  const semanticId = metadata?.['x-samm-aspect-model-urn'] || metadata?.specVersion || 'N/A';
  const aasId = metadata?.backupReference || 'N/A';
  const globalAssetId = metadata?.passportIdentifier || passportId;

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

  return (
    <Box 
      sx={{ 
        minHeight: '100vh',
        height: '100vh',
        width: '100%',
        maxWidth: '100%',
        display: 'flex', 
        flexDirection: 'column', 
        background: '#0d0d0d',
        overflow: 'auto',
        position: 'relative'
      }}
    >
      {/* Header - Sticky Container */}
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          background: '#1a1a1a',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
        }}
      >
        {/* Header */}
        <Paper
          elevation={0}
          sx={{
            background: 'transparent',
            borderBottom: 'none',
            px: { xs: 2, sm: 3, md: 4 },
            py: { xs: 1.5, sm: 2 }
          }}
        >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
          {/* Left side - Back button and title */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1.5, sm: 2 } }}>
            <Button
              startIcon={<ArrowBack />}
              onClick={onBack}
              variant="outlined"
              sx={{
                borderColor: 'rgba(255, 255, 255, 0.2)',
                color: 'rgba(255, 255, 255, 0.8)',
                minWidth: { xs: 'auto', sm: 'auto' },
                px: { xs: 1.5, sm: 2 },
                py: { xs: 0.75, sm: 1 },
                fontSize: { xs: '0.8rem', sm: '0.875rem' },
                fontWeight: 500,
                textTransform: 'none',
                borderRadius: '8px',
                '&:hover': {
                  borderColor: 'rgba(255, 255, 255, 0.4)',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)'
                },
                '& .MuiButton-startIcon': {
                  marginRight: { xs: 0, sm: 1 }
                },
                '& .MuiButton-startIcon > svg': {
                  fontSize: { xs: '18px', sm: '20px' }
                }
              }}
            >
              <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                Back
              </Box>
            </Button>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography 
                variant="h6" 
                sx={{ 
                  color: '#fff', 
                  fontWeight: 600,
                  fontSize: { xs: '1rem', sm: '1.15rem', md: '1.25rem' },
                  whiteSpace: 'nowrap'
                }}
              >
                {passportName}
              </Typography>
              {passportVersion && (
                <Chip
                  label={passportVersion}
                  size="small"
                  sx={{
                    backgroundColor: 'rgba(102, 126, 234, 0.2)',
                    color: 'rgba(255, 255, 255, 0.9)',
                    border: '1px solid rgba(102, 126, 234, 0.4)',
                    height: 22,
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    '& .MuiChip-label': {
                      px: 1,
                      py: 0
                    }
                  }}
                />
              )}
            </Box>
          </Box>

          {/* Center - IDs as chips */}
          <Box sx={{ 
            display: { xs: 'none', md: 'flex' }, 
            alignItems: 'center', 
            gap: 1,
            flex: 1,
            justifyContent: 'center',
            minWidth: 0,
            px: 2
          }}>
            <Chip
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                    Global:
                  </Typography>
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      fontFamily: 'monospace',
                      fontSize: '0.7rem',
                      overflow: 'visible',
                      whiteSpace: 'nowrap',
                      color: '#fff'
                    }}
                  >
                    {globalAssetId}
                  </Typography>
                </Box>
              }
              deleteIcon={<ContentCopy sx={{ fontSize: 14 }} />}
              onDelete={() => handleCopy(globalAssetId, 'Global Asset ID')}
              size="small"
              sx={{
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                color: '#fff',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                height: 26,
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                '& .MuiChip-deleteIcon': {
                  color: 'rgba(255, 255, 255, 0.7)',
                  '&:hover': {
                    color: '#fff'
                  }
                },
                '& .MuiChip-label': {
                  px: 1.5,
                  py: 0
                }
              }}
            />
            <Chip
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                    AAS:
                  </Typography>
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      fontFamily: 'monospace',
                      fontSize: '0.7rem',
                      overflow: 'visible',
                      whiteSpace: 'nowrap',
                      color: '#fff'
                    }}
                  >
                    {aasId}
                  </Typography>
                </Box>
              }
              deleteIcon={<ContentCopy sx={{ fontSize: 14 }} />}
              onDelete={() => handleCopy(aasId, 'AAS ID')}
              size="small"
              sx={{
                display: { xs: 'none', lg: 'flex' },
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                color: '#fff',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                height: 26,
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                '& .MuiChip-deleteIcon': {
                  color: 'rgba(255, 255, 255, 0.7)',
                  '&:hover': {
                    color: '#fff'
                  }
                },
                '& .MuiChip-label': {
                  px: 1.5,
                  py: 0
                }
              }}
            />
            <Chip
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                    Semantic:
                  </Typography>
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      fontFamily: 'monospace',
                      fontSize: '0.7rem',
                      overflow: 'visible',
                      whiteSpace: 'nowrap',
                      color: '#fff'
                    }}
                  >
                    {semanticId}
                  </Typography>
                </Box>
              }
              deleteIcon={<ContentCopy sx={{ fontSize: 14 }} />}
              onDelete={() => handleCopy(semanticId, 'Semantic ID')}
              size="small"
              sx={{
                display: { xs: 'none', xl: 'flex' },
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                color: '#fff',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                height: 26,
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                '& .MuiChip-deleteIcon': {
                  color: 'rgba(255, 255, 255, 0.7)',
                  '&:hover': {
                    color: '#fff'
                  }
                },
                '& .MuiChip-label': {
                  px: 1.5,
                  py: 0
                }
              }}
            />
          </Box>

          {/* Right side - Action buttons */}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              size="small"
              startIcon={<Visibility sx={{ fontSize: { xs: 16, sm: 18 } }} />}
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: '#fff',
                textTransform: 'none',
                fontSize: { xs: '0.75rem', sm: '0.8rem' },
                px: { xs: 1.5, sm: 2 },
                py: { xs: 0.75, sm: 1 },
                fontWeight: 600,
                borderRadius: '8px',
                '&:hover': { 
                  background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
                  boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
                },
                display: { xs: 'none', sm: 'inline-flex' }
              }}
            >
              Show Digital Twin
            </Button>
            <Button
              size="small"
              startIcon={<Description sx={{ fontSize: { xs: 16, sm: 18 } }} />}
              disabled
              sx={{
                color: 'rgba(255, 255, 255, 0.3)',
                textTransform: 'none',
                fontSize: { xs: '0.75rem', sm: '0.8rem' },
                px: { xs: 1.5, sm: 2 },
                py: { xs: 0.75, sm: 1 },
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                '&.Mui-disabled': {
                  color: 'rgba(255, 255, 255, 0.3)',
                  borderColor: 'rgba(255, 255, 255, 0.1)'
                },
                display: { xs: 'none', md: 'inline-flex' }
              }}
            >
              Data Contract Info
            </Button>
            <Button
              size="small"
              startIcon={<ContentCopy sx={{ fontSize: { xs: 16, sm: 18 } }} />}
              onClick={() => handleCopy(passportId, 'Passport ID')}
              sx={{
                color: 'rgba(255, 255, 255, 0.7)',
                textTransform: 'none',
                fontSize: { xs: '0.75rem', sm: '0.8rem' },
                px: { xs: 1, sm: 1.5 },
                py: { xs: 0.5, sm: 0.75 },
                minWidth: 'auto',
                '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.05)' },
                display: { xs: 'none', sm: 'inline-flex' }
              }}
            >
              Copy ID
            </Button>
            <Button
              size="small"
              startIcon={<Download sx={{ fontSize: { xs: 16, sm: 18 } }} />}
              onClick={handleDownload}
              sx={{
                color: 'rgba(255, 255, 255, 0.7)',
                textTransform: 'none',
                fontSize: { xs: '0.75rem', sm: '0.8rem' },
                px: { xs: 1, sm: 1.5 },
                py: { xs: 0.5, sm: 0.75 },
                minWidth: 'auto',
                '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.05)' }
              }}
            >
              <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                Download
              </Box>
            </Button>
          </Box>
        </Box>
        </Paper>
      </Box>

      {/* Header Cards - Custom components per passport type */}
      {config.headerCards && config.headerCards.length > 0 && (
        <Box sx={{ px: { xs: 2, sm: 3, md: 4 }, pt: { xs: 2, sm: 3 }, pb: { xs: 2, sm: 3 } }}>
          <Grid2 container spacing={{ xs: 1.5, sm: 2, md: 2.5, lg: 3 }}>
            {config.headerCards.map((HeaderCard, index) => (
              <Grid2 key={index} size={{ xs: 12, sm: 6, lg: 3 }}>
                <HeaderCard data={data} passportId={passportId} />
              </Grid2>
            ))}
          </Grid2>
        </Box>
      )}

      {/* Sticky Tab Bar Container */}
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 90,
          background: '#0d0d0d',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
        }}
      >
        {/* Divider */}
        <Box 
          sx={{ 
            height: '1px', 
            background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.1) 50%, transparent 100%)',
            mx: { xs: 2, sm: 3, md: 4 }
          }} 
        />

        {/* Tabs - Desktop (Hidden on mobile) */}
        <Box sx={{ px: { xs: 2, sm: 3, md: 4 }, mt: { xs: 1, sm: 1.5 }, pb: { xs: 1, sm: 1.5 }, display: { xs: 'none', md: 'block' } }}>
          <Tabs
            value={activeTab}
            onChange={(_, newValue) => setActiveTab(newValue)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              minHeight: 42,
              '& .MuiTabs-indicator': {
                backgroundColor: '#667eea',
                height: 3,
                borderRadius: '3px 3px 0 0'
              },
              '& .MuiTab-root': {
                color: 'rgba(255, 255, 255, 0.6)',
                textTransform: 'none',
                fontWeight: 500,
                fontSize: '0.875rem',
                minHeight: 42,
                px: 2,
                py: 1,
                transition: 'all 0.2s ease',
                '&:hover': {
                  color: 'rgba(255, 255, 255, 0.9)',
                  backgroundColor: 'rgba(255, 255, 255, 0.03)'
                },
                '&.Mui-selected': {
                  color: '#fff',
                  fontWeight: 600
                }
              },
              '& .MuiTabs-scrollButtons': {
                color: 'rgba(255, 255, 255, 0.5)',
                '&.Mui-disabled': {
                  opacity: 0.3
                }
              }
            }}
          >
            {tabs.map((tab, index) => {
              const Icon = getCategoryIcon(tab.category);
              return (
                <Tab
                  key={tab.category || `tab-${index}`}
                  icon={<Icon sx={{ fontSize: 18, mb: 0.5 }} />}
                  iconPosition="start"
                  label={tab.label}
                />
              );
            })}
          </Tabs>
        </Box>

        {/* Tab Dropdown - Mobile (Hidden on desktop) */}
        <Box sx={{ px: 2, py: { xs: 1, sm: 1.5 }, display: { xs: 'block', md: 'none' } }}>
          <Button
            fullWidth
            variant="outlined"
            onClick={(e) => setTabMenuAnchor(e.currentTarget)}
            endIcon={<KeyboardArrowDown />}
            startIcon={(() => {
              const Icon = getCategoryIcon(tabs[activeTab]?.category);
              return <Icon sx={{ fontSize: 20 }} />;
            })()}
            sx={{
              justifyContent: 'space-between',
              textTransform: 'none',
              borderColor: 'rgba(255, 255, 255, 0.2)',
              color: '#fff',
              py: 1.5,
              px: 2,
              borderRadius: '10px',
              fontWeight: 600,
              fontSize: '0.9rem',
              '&:hover': {
                borderColor: 'rgba(102, 126, 234, 0.5)',
                backgroundColor: 'rgba(255, 255, 255, 0.03)'
              }
            }}
          >
            {tabs[activeTab]?.label || 'Select Section'}
          </Button>
        <Menu
          anchorEl={tabMenuAnchor}
          open={Boolean(tabMenuAnchor)}
          onClose={() => setTabMenuAnchor(null)}
          PaperProps={{
            sx: {
              mt: 1,
              background: 'rgba(30, 30, 30, 0.98)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              minWidth: 250,
              maxHeight: '70vh',
              '& .MuiMenuItem-root': {
                px: 2,
                py: 1.5,
                color: 'rgba(255, 255, 255, 0.7)',
                transition: 'all 0.2s ease',
                '&:hover': {
                  backgroundColor: 'rgba(102, 126, 234, 0.15)',
                  color: '#fff'
                },
                '&.Mui-selected': {
                  backgroundColor: 'rgba(102, 126, 234, 0.25)',
                  color: '#fff',
                  fontWeight: 600,
                  '&:hover': {
                    backgroundColor: 'rgba(102, 126, 234, 0.3)'
                  }
                }
              }
            }
          }}
        >
          {tabs.map((tab, index) => {
            const Icon = getCategoryIcon(tab.category);
            return (
              <MenuItem
                key={tab.category || `tab-${index}`}
                selected={activeTab === index}
                onClick={() => {
                  setActiveTab(index);
                  setTabMenuAnchor(null);
                }}
              >
                <ListItemIcon sx={{ color: activeTab === index ? '#667eea' : 'rgba(255, 255, 255, 0.5)' }}>
                  <Icon sx={{ fontSize: 20 }} />
                </ListItemIcon>
                <ListItemText 
                  primary={tab.label}
                  primaryTypographyProps={{
                    fontSize: '0.9rem',
                    fontWeight: activeTab === index ? 600 : 500
                  }}
                />
              </MenuItem>
            );
          })}
        </Menu>
        </Box>
      </Box>

      {/* Tab Content */}
      <Box 
        sx={{ 
          flex: 1,
          px: { xs: 2, sm: 3, md: 4 },
          py: { xs: 2, sm: 3 },
          overflow: 'visible'
        }}
      >
        {tabs[activeTab] && (
          <Box>
            <DynamicRenderer 
              properties={tabs[activeTab].properties} 
              rawData={data}
              customRenderers={config.customRenderers}
            />
          </Box>
        )}
      </Box>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity="success"
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};
