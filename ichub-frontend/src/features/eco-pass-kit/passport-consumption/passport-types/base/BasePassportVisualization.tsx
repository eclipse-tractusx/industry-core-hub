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
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  ThemeProvider,
  createTheme,
  GlobalStyles,
  Collapse
} from '@mui/material';
import { ArrowBack, Download, ContentCopy, KeyboardArrowDown, Description, Close as CloseIcon, ViewInAr, ExpandLess, ExpandMore, PictureAsPdf } from '@mui/icons-material';
import { PassportVisualizationProps } from '../types';
import { SchemaParser } from '../../utils/schemaParser';
import { DynamicRenderer } from '../../components/DynamicRenderer';
import { getCategoryIcon } from '../../utils/iconMapper';
import { SingleTwinResult } from '../../../../industry-core-kit/part-discovery/components/single-twin/SingleTwinResult';
import { getParticipantId } from '@/services/EnvironmentService';
import { exportPassportToPDF } from '../../../utils/pdfExport';

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
  passportVersion,
  digitalTwinData,
  counterPartyId
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [tabMenuAnchor, setTabMenuAnchor] = useState<null | HTMLElement>(null);
  const [digitalTwinModalOpen, setDigitalTwinModalOpen] = useState(false);
  const [headerCardsVisible, setHeaderCardsVisible] = useState(true);
  
  // Parse schema and data
  const parser = useMemo(() => new SchemaParser(schema), [schema]);
  const tabs = useMemo(() => parser.generateTabs(data), [parser, data]);
  
  // Extract semanticId from schema first, then fallback to metadata
  const schemaSemanticId = (schema as any)['x-samm-aspect-model-urn'];
  const metadata = data.metadata as Record<string, any> | undefined;
  const semanticId = schemaSemanticId || metadata?.['x-samm-aspect-model-urn'] || metadata?.specVersion || 'N/A';

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

  // Handle export to PDF
  const handleExportPDF = async () => {
    try {
      // Try to extract from digital twin first
      let manufacturerPartId = '';
      let serialNumber = '';
      let twinId = '';
      let bpn = counterPartyId || getParticipantId();
      let extractedPassportId = passportId;
      
      if (digitalTwinData?.shell_descriptor) {
        const specificAssetIds = digitalTwinData.shell_descriptor.specificAssetIds || [];
        
        // Extract manufacturerPartId
        const partIdAsset = specificAssetIds.find(asset => 
          asset.name === 'manufacturerPartId' || asset.name === 'partTypeId'
        );
        if (partIdAsset) {
          manufacturerPartId = partIdAsset.value;
        }
        
        // Extract serialNumber (partInstanceId)
        const serialAsset = specificAssetIds.find(asset => 
          asset.name === 'partInstanceId' || asset.name === 'serialNumber'
        );
        if (serialAsset) {
          serialNumber = serialAsset.value;
        }
        
        // Extract manufacturerId (BPN)
        const manufacturerIdAsset = specificAssetIds.find(asset => 
          asset.name === 'manufacturerId'
        );
        if (manufacturerIdAsset && !counterPartyId) {
          bpn = manufacturerIdAsset.value;
        }
        
        // Extract twin ID
        twinId = digitalTwinData.shell_descriptor.id || '';
        
        // Try to extract passport ID from globalAssetId
        const globalAssetId = digitalTwinData.shell_descriptor.globalAssetId;
        if (globalAssetId) {
          extractedPassportId = globalAssetId;
        }
      }
      
      // Fallback to data fields if not found in twin
      if (!manufacturerPartId) {
        manufacturerPartId = (data as any)?.typology?.manufacturerPartId 
          || (data as any)?.identification?.manufacturerPartId
          || (data as any)?.manufacturerPartId
          || '';
      }
      
      if (!serialNumber) {
        serialNumber = (data as any)?.serialization?.manufacturerSerialNumber 
          || (data as any)?.serialization?.serialNumber
          || (data as any)?.identification?.serialNumber
          || (data as any)?.serialNumber
          || '';
      }
      
      const productName = (data as any)?.identification?.productName || passportName;
      
      await exportPassportToPDF({
        name: productName,
        version: passportVersion,
        manufacturerPartId,
        serialNumber,
        passportIdentifier: extractedPassportId,
        twinId: twinId || undefined,
        semanticId: semanticId !== 'N/A' ? semanticId : undefined,
        manufacturerBPN: bpn,
        discoveryId: passportId // Use passportId as discovery ID for QR code generation
      });
      
      setSnackbarMessage('PDF exported successfully');
      setSnackbarOpen(true);
    } catch (error) {
      setSnackbarMessage('Failed to export PDF');
      setSnackbarOpen(true);
    }
  };

  // Handle show digital twin
  const handleShowDigitalTwin = () => {
    if (digitalTwinData) {
      setDigitalTwinModalOpen(true);
    } else {
      setSnackbarMessage('No digital twin data available');
      setSnackbarOpen(true);
    }
  };

  // Create dark theme for the digital twin modal
  const darkTheme = createTheme({
    palette: {
      mode: 'dark',
      primary: {
        main: '#667eea',
        light: '#8b9aef',
        dark: '#4a5fc7'
      },
      secondary: {
        main: '#764ba2',
        light: '#9b6ec7',
        dark: '#5a3880'
      },
      success: {
        main: '#4caf50',
        light: '#81c784',
        dark: '#388e3c'
      },
      warning: {
        main: '#ff9800',
        light: '#ffb74d',
        dark: '#f57c00'
      },
      background: {
        default: '#0d0d0d',
        paper: '#1a1a1a'
      },
      text: {
        primary: '#ffffff',
        secondary: 'rgba(255, 255, 255, 0.7)'
      }
    },
    components: {
      MuiDialog: {
        styleOverrides: {
          paper: {
            background: '#0d0d0d',
            backgroundImage: 'none'
          }
        }
      },
      MuiDialogTitle: {
        styleOverrides: {
          root: {
            background: '#1a1a1a',
            color: '#667eea',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
          }
        }
      },
      MuiDialogContent: {
        styleOverrides: {
          root: {
            background: '#0d0d0d'
          }
        }
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundColor: '#1a1a1a',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            '&:hover': {
              boxShadow: '0 4px 16px rgba(102, 126, 234, 0.3)'
            }
          }
        }
      },
      MuiButton: {
        styleOverrides: {
          root: {
            color: '#667eea'
          }
        }
      }
    }
  });

  return (
    <Box 
      sx={{ 
        height: '100%',
        width: '100%',
        display: 'flex', 
        flexDirection: 'column', 
        background: '#0d0d0d'
      }}
    >
      {/* Header - Sticky Container */}
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 1100,
          background: '#1a1a1a',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          flexShrink: 0
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
        <Grid2 container spacing={{ xs: 2, md: 3 }} alignItems="center" justifyContent="space-between">
          {/* Left side - Back button, title, semantic + passport ID */}
          <Grid2 xs={12} md={8}>
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                alignItems: { xs: 'flex-start', sm: 'center' },
                gap: { xs: 1.25, sm: 1.75 },
                flexWrap: 'wrap'
              }}
            >
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
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    color: '#fff'
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
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
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
                  <Chip
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                          ID:
                        </Typography>
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            fontFamily: 'monospace',
                            fontSize: '0.7rem',
                            color: '#fff',
                            fontWeight: 600
                          }}
                        >
                          {passportId}
                        </Typography>
                      </Box>
                    }
                    deleteIcon={<ContentCopy sx={{ fontSize: 14 }} />}
                    onDelete={() => handleCopy(passportId, 'Passport ID')}
                    size="small"
                    sx={{
                      backgroundColor: 'rgba(255, 255, 255, 0.15)',
                      backdropFilter: 'blur(10px)',
                      WebkitBackdropFilter: 'blur(10px)',
                      color: '#fff',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      height: 24,
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
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      color: 'rgba(255, 255, 255, 0.5)',
                      fontSize: '0.7rem'
                    }}
                  >
                    Semantic ID:
                  </Typography>
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      fontFamily: 'monospace',
                      fontSize: '0.7rem',
                      color: 'rgba(255, 255, 255, 0.7)'
                    }}
                  >
                    {semanticId}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => handleCopy(semanticId, 'Semantic ID')}
                    sx={{
                      padding: '2px',
                      color: 'rgba(255, 255, 255, 0.5)',
                      '&:hover': {
                        color: 'rgba(255, 255, 255, 0.8)',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)'
                      }
                    }}
                  >
                    <ContentCopy sx={{ fontSize: 12 }} />
                  </IconButton>
                </Box>
              </Box>
            </Box>
          </Grid2>

          {/* Right side - Action buttons */}
          <Grid2 xs={12} md={4}>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
              <Button
                size="small"
                startIcon={<ViewInAr sx={{ fontSize: { xs: 16, sm: 18 } }} />}
                onClick={handleShowDigitalTwin}
                disabled={!digitalTwinData}
                sx={{
                  background: digitalTwinData ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'rgba(255, 255, 255, 0.05)',
                  color: digitalTwinData ? '#fff' : 'rgba(255, 255, 255, 0.3)',
                  textTransform: 'none',
                  fontSize: { xs: '0.75rem', sm: '0.8rem' },
                  px: { xs: 1.5, sm: 2 },
                  py: { xs: 0.75, sm: 1 },
                  fontWeight: 600,
                  borderRadius: '8px',
                  '&:hover': digitalTwinData ? { 
                    background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
                    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
                  } : {},
                  '&.Mui-disabled': {
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: 'rgba(255, 255, 255, 0.3)'
                  },
                  display: 'inline-flex'
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
                  display: 'inline-flex'
                }}
              >
                Data Contract Info
              </Button>
              <Button
                size="small"
                startIcon={<PictureAsPdf sx={{ fontSize: { xs: 18, sm: 20 } }} />}
                onClick={handleExportPDF}
                sx={{
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  color: '#fff',
                  textTransform: 'none',
                  fontSize: { xs: '0.75rem', sm: '0.8rem' },
                  px: { xs: 1.5, sm: 2 },
                  py: { xs: 0.75, sm: 1 },
                  fontWeight: 600,
                  borderRadius: '8px',
                  boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)',
                  transition: 'all 0.2s ease',
                  '&:hover': { 
                    background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)',
                    transform: 'translateY(-1px)'
                  },
                  display: 'inline-flex'
                }}
              >
                <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                  Export PDF
                </Box>
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
          </Grid2>
        </Grid2>
        </Paper>
      </Box>

      {/* Header Cards - Custom components per passport type */}
      {config.headerCards && config.headerCards.length > 0 && (
        <Box sx={{ flexShrink: 0 }}>
          {/* Collapsible Header Cards with Animation */}
          <Collapse in={headerCardsVisible} timeout={400}>
            <Box sx={{ px: { xs: 2, sm: 3, md: 4 }, pt: { xs: 2, sm: 3 }, pb: { xs: 1.5, sm: 2 } }}>
              <Grid2 container spacing={{ xs: 1.5, sm: 2, md: 2.5, lg: 3 }}>
                {config.headerCards.map((HeaderCard, index) => (
                  <Grid2 key={index} size={{ xs: 12, sm: 6, lg: 3 }}>
                    <HeaderCard data={data} passportId={passportId} />
                  </Grid2>
                ))}
              </Grid2>
            </Box>
          </Collapse>
          
          {/* Toggle Button - Below Cards, Centered */}
          <Box 
            sx={{ 
              px: { xs: 2, sm: 3, md: 4 }, 
              pt: { xs: 1, sm: 1.5 },
              pb: { xs: 1.5, sm: 2 },
              display: 'flex',
              justifyContent: 'center'
            }}
          >
            <Button
              size="small"
              onClick={() => setHeaderCardsVisible(!headerCardsVisible)}
              startIcon={headerCardsVisible ? <ExpandLess /> : <ExpandMore />}
              sx={{
                color: 'rgba(255, 255, 255, 0.8)',
                textTransform: 'none',
                fontSize: '0.75rem',
                fontWeight: 500,
                px: 2,
                py: 0.75,
                borderRadius: '20px',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                backdropFilter: 'blur(10px)',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                transition: 'all 0.2s ease',
                '&:hover': { 
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  borderColor: 'rgba(255, 255, 255, 0.25)',
                  color: '#fff',
                  transform: 'translateY(-1px)',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
                },
                '& .MuiButton-startIcon': {
                  marginRight: 0.5
                }
              }}
            >
              {headerCardsVisible ? 'Hide' : 'Show'} Header Cards
            </Button>
          </Box>
        </Box>
      )}

      {/* Sticky Tab Bar Container */}
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 1000,
          background: '#0d0d0d',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
        }}
      >
        {/* Tabs - Desktop (Hidden on mobile) */}
        <Box sx={{ display: { xs: 'none', md: 'block' } }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          variant="scrollable"
          scrollButtons
          allowScrollButtonsMobile
          sx={{
            pt: { xs: 1, sm: 1.5 },
            pb: { xs: 1, sm: 1.5 },
            px: { xs: 2, sm: 3, md: 4 },
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
                color: 'rgba(255, 255, 255, 0.7)',
                width: 40,
                '&.Mui-disabled': {
                  opacity: 0.3
                },
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)'
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
              color: '#fff !important',
              py: 1.5,
              px: 2,
              borderRadius: '10px',
              fontWeight: 600,
              fontSize: '0.9rem',
              '&:hover': {
                borderColor: 'rgba(102, 126, 234, 0.5)',
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                color: '#fff !important'
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
                color: '#fff !important',
                transition: 'all 0.2s ease',
                '&:hover': {
                  backgroundColor: 'rgba(102, 126, 234, 0.15)',
                  color: '#fff !important'
                },
                '&.Mui-selected': {
                  backgroundColor: 'rgba(102, 126, 234, 0.25)',
                  color: '#fff !important',
                  fontWeight: 600,
                  '&:hover': {
                    backgroundColor: 'rgba(102, 126, 234, 0.3)',
                    color: '#fff !important'
                  }
                }
              },
              '& .MuiListItemText-primary': {
                color: '#fff !important'
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
                    fontWeight: activeTab === index ? 600 : 500,
                    color: '#fff !important'
                  }}
                />
              </MenuItem>
            );
          })}
        </Menu>
        </Box>
      </Box>

      {/* Tab Content - Scrollable */}
      <Box 
        sx={{ 
          flex: 1,
          px: { xs: 2, sm: 3, md: 4 },
          py: { xs: 2, sm: 3 },
          overflow: 'auto',
          minHeight: 0,
          '&::-webkit-scrollbar': {
            width: '8px'
          },
          '&::-webkit-scrollbar-track': {
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '4px'
          },
          '&::-webkit-scrollbar-thumb': {
            background: 'rgba(255, 255, 255, 0.2)',
            borderRadius: '4px',
            '&:hover': {
              background: 'rgba(255, 255, 255, 0.3)'
            }
          }
        }}
      >
        {tabs[activeTab] && (() => {
          // Check if there's a custom renderer for this entire tab/category
          const tabKey = tabs[activeTab].category || tabs[activeTab].id;
          const customRenderer = config.customRenderers?.[tabKey] || config.customRenderers?.[tabKey.toLowerCase()];
          
          if (customRenderer) {
            const CustomRenderer = customRenderer;
            return (
              <CustomRenderer 
                data={tabs[activeTab]} 
                rawData={data}
              />
            );
          }
          
          // Default rendering with DynamicRenderer
          return (
            <Box>
              <DynamicRenderer 
                properties={tabs[activeTab].properties} 
                rawData={data}
                customRenderers={config.customRenderers}
              />
            </Box>
          );
        })()}
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

      {/* Digital Twin Modal */}
      <ThemeProvider theme={darkTheme}>
        <GlobalStyles styles={{
          '.MuiDialog-root .MuiCard-root': {
            backgroundColor: '#1a1a1a !important',
            border: '1px solid rgba(255, 255, 255, 0.08) !important',
            backgroundImage: 'none !important',
          },
          '.MuiDialog-root .MuiCard-root:hover': {
            boxShadow: '0 4px 16px rgba(102, 126, 234, 0.3) !important'
          },
          '.MuiDialog-root .MuiButton-root': {
            color: '#ffffff !important'
          },
          '.MuiDialog-root .MuiChip-root .MuiChip-icon': {
            color: '#ffffff !important'
          },
          '.MuiDialog-root .MuiChip-root .MuiChip-icon svg': {
            color: '#ffffff !important'
          }
        }} />
        <Dialog
          open={digitalTwinModalOpen}
          onClose={() => setDigitalTwinModalOpen(false)}
          maxWidth={false}
          fullScreen
          PaperProps={{
            sx: {
              background: '#0d0d0d'
            }
          }}
        >
          <DialogTitle sx={{ 
            fontWeight: '600', 
            color: '#667eea',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            pb: 2,
            px: 3,
            pt: 3,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#1a1a1a'
          }}>
            <Typography variant="h5" sx={{ fontWeight: '600', color: '#667eea' }}>
              Digital Twin Details
            </Typography>
            <IconButton
              onClick={() => setDigitalTwinModalOpen(false)}
              sx={{
                color: 'rgba(255, 255, 255, 0.7)',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.08)'
                }
              }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ 
            p: 3,
            height: '100%', 
            overflow: 'auto', 
            background: '#0d0d0d',
            '& .MuiChip-icon': {
              color: '#ffffff !important'
            },
            '& .MuiSvgIcon-root': {
              color: 'rgba(255, 255, 255, 0.7)'
            },
            '& .MuiSvgIcon-colorSuccess': {
              color: '#4caf50 !important'
            },
            // Force dark mode for all nested cards
            '& .MuiCard-root': {
              backgroundColor: '#1a1a1a !important',
              border: '1px solid rgba(255, 255, 255, 0.08) !important',
              backgroundImage: 'none !important',
              '&:hover': {
                boxShadow: '0 4px 16px rgba(102, 126, 234, 0.3) !important'
              }
            }
          }}>
            {digitalTwinData && counterPartyId && (
              <div style={{ paddingTop: "40px" }}>
              <SingleTwinResult
                counterPartyId={counterPartyId}
                singleTwinResult={digitalTwinData}
              />
              </div>
            )}
          </DialogContent>
        </Dialog>
      </ThemeProvider>
    </Box>
  );
};
