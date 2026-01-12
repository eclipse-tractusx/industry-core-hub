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

import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Tooltip,
  Tabs,
  Tab,
  useTheme,
  Paper
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import InfoIcon from '@mui/icons-material/Info';
import SecurityIcon from '@mui/icons-material/Security';
import DataObjectIcon from '@mui/icons-material/DataObject';
import DescriptionIcon from '@mui/icons-material/Description';
import DownloadIcon from '@mui/icons-material/Download';
import { downloadJson } from '@/utils/downloadJson';
import EmailIcon from '@mui/icons-material/Email';
import CheckIcon from '@mui/icons-material/Check';
import RefreshIcon from '@mui/icons-material/Refresh';
import { fetchSubmodel, SubmodelDiscoveryResponse } from '../../api';
import { submodelAddonRegistry } from '../submodel-addons/shared/registry';
import { usTariffInformationAddon } from '../submodel-addons/us-tariff-information/addon';

interface SubmodelViewerProps {
  open: boolean;
  onClose: () => void;
  counterPartyId: string;
  shellId: string;
  dtrConnectorUrl?: string;
  submodel: {
    id: string;
    idShort: string;
    semanticId: {
      type: string;
      keys: Array<{
        type: string;
        value: string;
      }>;
    };
  };
}

const JsonViewer: React.FC<{ data: Record<string, unknown>; filename?: string }> = ({ data, filename = 'submodel.json' }) => {
  const [copySuccess, setCopySuccess] = useState(false);

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 5)).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  // Format JSON with line numbers and higher indentation
  const jsonString = JSON.stringify(data, null, 4); // Increased indentation to 4 spaces
  const lines = jsonString.split('\n');

  const formatJsonWithLineNumbers = () => {
    // Calculate the width needed for line numbers based on total lines
    const totalLines = lines.length;
    const lineNumberWidth = Math.max(50, (totalLines.toString().length * 8) + 16); // 8px per digit + 16px padding
    
    return lines.map((line, index) => {
      const lineNumber = index + 1;
      return (
        <Box key={index} sx={{ display: 'flex', minHeight: '1.5rem' }}>
          <Box
            sx={{
              width: `${lineNumberWidth}px`,
              textAlign: 'right',
              pr: 2,
              color: '#858585', // VS Code line number color
              fontSize: '13px',
              fontFamily: 'Consolas',
              letterSpacing: '0.5px',
              userSelect: 'none',
              borderRight: '1px solid #3E3E3E', // VS Code border color
              backgroundColor: '#252526', // VS Code line number background
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              minHeight: '18px', // VS Code line height
              lineHeight: '18px',
              flexShrink: 0 // Prevent shrinking when content is wide
            }}
          >
            {lineNumber}
          </Box>
          <Box
            sx={{
              flex: 1,
              pl: 2,
              fontFamily: 'Consolas',
              fontSize: '13px',
              letterSpacing: '0.5px',
              whiteSpace: 'pre',
              color: '#D4D4D4',
              display: 'flex',
              alignItems: 'center',
              minHeight: '18px', // VS Code line height
              lineHeight: '18px'
            }}
          >
            <span dangerouslySetInnerHTML={{ __html: highlightJson(line) }} />
          </Box>
        </Box>
      );
    });
  };

  const highlightJson = (line: string): string => {
    let highlightedLine = line;
    
    // Escape HTML first
    highlightedLine = highlightedLine
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    
    // Property names (keys) - strings followed by colon
    highlightedLine = highlightedLine.replace(
      /("(?:[^"\\]|\\.)*")\s*:/g, 
      '<span style="color: #9CDCFE;">$1</span>:'
    );
    
    // String values after colon (object values)
    highlightedLine = highlightedLine.replace(
      /:\s*("(?:[^"\\]|\\.)*")/g, 
      ': <span style="color: #CE9178;">$1</span>'
    );
    
    // String values in arrays (after [ or , but not after :)
    highlightedLine = highlightedLine.replace(
      /(\[\s*|,\s*)("(?:[^"\\]|\\.)*")/g, 
      '$1<span style="color: #CE9178;">$2</span>'
    );
    
    // Numbers after colon (object values)
    highlightedLine = highlightedLine.replace(
      /:\s*(-?\d+\.?\d*)/g, 
      ': <span style="color: #B5CEA8;">$1</span>'
    );
    
    // Numbers in arrays (after [ or , but not after :)
    highlightedLine = highlightedLine.replace(
      /(\[\s*|,\s*)(-?\d+\.?\d*)/g, 
      '$1<span style="color: #B5CEA8;">$2</span>'
    );
    
    // Booleans after colon
    highlightedLine = highlightedLine.replace(
      /:\s*(true|false)/g, 
      ': <span style="color: #569CD6;">$1</span>'
    );
    
    // Booleans in arrays
    highlightedLine = highlightedLine.replace(
      /(\[\s*|,\s*)(true|false)/g, 
      '$1<span style="color: #569CD6;">$2</span>'
    );
    
    // null after colon
    highlightedLine = highlightedLine.replace(
      /:\s*(null)/g, 
      ': <span style="color: #569CD6;">$1</span>'
    );
    
    // null in arrays
    highlightedLine = highlightedLine.replace(
      /(\[\s*|,\s*)(null)/g, 
      '$1<span style="color: #569CD6;">$2</span>'
    );
    
    // Brackets and braces
    highlightedLine = highlightedLine.replace(
      /([{}[\]])/g, 
      '<span style="color: #FFD700;">$1</span>'
    );
    
    // Commas
    highlightedLine = highlightedLine.replace(
      /(,)/g, 
      '<span style="color: #D4D4D4;">$1</span>'
    );
    
    return highlightedLine;
  };

  return (
    <Box sx={{ position: 'relative', height: '100%' }}>
      {/* VS Code-like tab header */}
      <Box
        sx={{
          height: '35px',
          backgroundColor: '#2D2D30',
          borderBottom: '1px solid #3E3E3E',
          display: 'flex',
          alignItems: 'center',
          px: 2,
          fontSize: '13px',
          fontFamily: '"Segoe UI", "Helvetica Neue", Arial, sans-serif',
          color: '#CCCCCC'
        }}
      >
        <DataObjectIcon sx={{ fontSize: '16px', mr: 1, color: '#FFD700' }} />
        {filename}
        <Box sx={{ ml: 'auto' }}>
          <Tooltip title={copySuccess ? "Copied!" : "Copy JSON"}>
            <IconButton
              size="small"
              onClick={handleCopyJson}
              sx={{
                color: copySuccess ? '#4CAF50' : '#CCCCCC', // Green when copied
                backgroundColor: copySuccess ? 'rgba(76, 175, 80, 0.1)' : 'transparent',
                '&:hover': {
                  backgroundColor: copySuccess 
                    ? 'rgba(76, 175, 80, 0.2)' 
                    : 'rgba(255, 255, 255, 0.1)'
                },
                transition: 'all 0.2s ease-in-out'
              }}
            >
              {copySuccess ? <CheckIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      
      <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}>
      </Box>
      <Paper
        sx={{
          width: '100%',
          height: 'calc(100% - 35px)', // Account for header
          backgroundColor: '#1E1E1E', // VS Code dark background
          border: '1px solid #3E3E3E', // VS Code border color
          borderTop: 'none', // No top border since we have the header
          borderRadius: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'Consolas',
        }}
      >
        <Box
          sx={{
            maxHeight: '100%',
            overflow: 'auto',
            '&::-webkit-scrollbar': {
              width: '14px',
              height: '14px'
            },
            '&::-webkit-scrollbar-track': {
              backgroundColor: '#1E1E1E' // Match editor background
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: '#424242', // VS Code scrollbar thumb
              borderRadius: '0px',
              border: '1px solid #1E1E1E'
            },
            '&::-webkit-scrollbar-thumb:hover': {
              backgroundColor: '#4F4F4F' // Lighter on hover
            },
            '&::-webkit-scrollbar-corner': {
              backgroundColor: '#1E1E1E'
            }
          }}
        >
          {formatJsonWithLineNumbers()}
        </Box>
      </Paper>
    </Box>
  );
};

export const SubmodelViewer: React.FC<SubmodelViewerProps> = ({
  open,
  onClose,
  counterPartyId,
  shellId,
  dtrConnectorUrl,
  submodel
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submodelData, setSubmodelData] = useState<SubmodelDiscoveryResponse | null>(null);
  const [rightPanelTab, setRightPanelTab] = useState(0); // Separate state for right panel tabs
  const [lastLoadedSubmodelId, setLastLoadedSubmodelId] = useState<string | null>(null);
  const isFetching = useRef(false);
  const theme = useTheme();

  const semanticIdValue = submodel.semanticId?.keys?.[0]?.value || '';

  // Register addons on component mount
  useEffect(() => {
    // Register US Tariff Information addon if not already registered
    if (!submodelAddonRegistry.getAddon('us-tariff-information')) {
      submodelAddonRegistry.register(usTariffInformationAddon as unknown as import('../submodel-addons/shared/types').VersionedSubmodelAddon);
      
    }
  }, []);

  // Check if there's a specialized addon for this submodel
  const getSpecializedAddon = useCallback(() => {
    if (!submodelData?.submodel || !semanticIdValue) {
      return null;
    }

    try {
      const resolution = submodelAddonRegistry.resolve(semanticIdValue, submodelData.submodel);
      return resolution;
    } catch (error) {
      console.warn('Error resolving addon for semantic ID:', semanticIdValue, error);
      return null;
    }
  }, [submodelData?.submodel, semanticIdValue]);

  const fetchSubmodelData = useCallback(async (forceRefresh = false) => {
    // Prevent multiple calls for the same submodel or if already fetching, unless it's a forced refresh
    if (!forceRefresh && (lastLoadedSubmodelId === submodel.id || isFetching.current)) {
      
      return;
    }

    
    isFetching.current = true;
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetchSubmodel(
        counterPartyId,
        shellId,
        submodel.id,
        semanticIdValue
      );
      
      // Check if the API response contains a structured error
      if (response.status === "error" && response.error) {
        setError(response.error);
        setSubmodelData(null);
        setLastLoadedSubmodelId(submodel.id);
        return;
      }
      
      setSubmodelData(response);
      setLastLoadedSubmodelId(submodel.id);
      
    } catch (err) {
      // Don't show error for cancelled requests
      if (axios.isCancel(err)) {
        
        return;
      }
      console.error('Error fetching submodel:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch submodel data');
    } finally {
      setLoading(false);
      isFetching.current = false;
    }
  }, [counterPartyId, shellId, submodel.id, semanticIdValue, lastLoadedSubmodelId]);

  useEffect(() => {
    if (open && submodel.id && counterPartyId && shellId) {
      fetchSubmodelData();
    }
  }, [open, submodel.id, counterPartyId, shellId, fetchSubmodelData]);

  // Reset data when submodel changes
  useEffect(() => {
    if (submodel.id !== lastLoadedSubmodelId) {
      setSubmodelData(null);
      setError(null);
    }
  }, [submodel.id, lastLoadedSubmodelId]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setRightPanelTab(0);
      setError(null);
      isFetching.current = false;
    }
  }, [open]);

  const handleRightPanelTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setRightPanelTab(newValue);
  };

  const getRightPanelTabs = () => {
    const tabs = [];
    const hasSpecializedAddon = getSpecializedAddon();
    
    if (hasSpecializedAddon) {
      tabs.push(
        <Tab 
          key="specialized"
          label={hasSpecializedAddon.addon.name}
          icon={<InfoIcon />} 
          iconPosition="start"
          sx={{ minHeight: 'auto', padding: 0, py: 1, textTransform: 'none', fontWeight: 600 }}
        />
      );
    }
    
    tabs.push(
      <Tab 
        key="json"
        label="JSON Data" 
        icon={<DataObjectIcon />} 
        iconPosition="start"
        sx={{ minHeight: 'auto', py: 1, textTransform: 'none', fontWeight: 600 }}
      />
    );
    
    return tabs;
  };

  const getRightPanelContent = () => {
    const hasSpecializedAddon = getSpecializedAddon();
    
    if (hasSpecializedAddon && rightPanelTab === 0) {
      return renderSpecializedView();
    } else if (hasSpecializedAddon && rightPanelTab === 1) {
      return renderJsonData();
    } else if (!hasSpecializedAddon && rightPanelTab === 0) {
      return renderJsonData();
    }
    
    return renderJsonData(); // fallback
  };

  const handleRefresh = () => {
    fetchSubmodelData(true);
  };

  const handleDownloadJson = () => {
    if (submodelData?.submodel) {
      const filename = `submodel-${submodel.id}-${submodel.idShort || 'data'}.json`;
      downloadJson(submodelData.submodel, filename);
    }
  };

  const handleShareEmail = () => {
    if (submodelData?.submodel) {
      const jsonString = JSON.stringify(submodelData.submodel, null, 2);
      const subject = encodeURIComponent(`Submodel Data: ${submodel.idShort || 'Digital Twin Data'}`);
      const body = encodeURIComponent(`Hello,

I'm sharing submodel data with you:

Digital Twin ID: ${shellId}
Business Partner Number (BPN): ${counterPartyId}
DTR Endpoint: ${dtrConnectorUrl || 'N/A'}
Submodel ID: ${submodelData.submodelDescriptor.submodelId}
Semantic ID: ${submodelData.submodelDescriptor.semanticId}
Status: ${submodelData.submodelDescriptor.status}

JSON Data:
${jsonString}

Best regards`);
      
      const mailtoLink = `mailto:?subject=${subject}&body=${body}`;
      window.open(mailtoLink, '_blank');
    }
  };

  const renderSubmodelInfo = () => {
    if (!submodelData) return null;

    return (
      <Box>
        <Card sx={{ mb: 2, borderRadius: 0 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: '600', color: 'primary.main' }}>
                Submodel Information
              </Typography>
              <Chip
                label={submodelData.submodelDescriptor.status}
                color={submodelData.submodelDescriptor.status === 'success' ? 'success' : 'error'}
                size="small"
                sx={{
                  fontWeight: '600',
                  '& .MuiChip-label': {
                    fontSize: '0.75rem'
                  }
                }}
              />
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: '600', color: 'text.secondary', mb: 0.5 }}>
                  Submodel ID:
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip
                    icon={<InfoIcon />}
                    label={submodelData.submodelDescriptor.submodelId}
                    variant="outlined"
                    size="small"
                    sx={{
                      maxWidth: '100%',
                      '& .MuiChip-label': {
                        fontFamily: 'monospace',
                        fontSize: '0.75rem'
                      },
                      '& .MuiChip-icon': {
                        color: 'primary.main'
                      }
                    }}
                  />
                  <Tooltip title="Copy Submodel ID">
                    <IconButton
                      size="small"
                      onClick={() => navigator.clipboard.writeText(submodelData.submodelDescriptor.submodelId)}
                      sx={{
                        color: 'text.secondary',
                        '&:hover': {
                          color: 'success.main',
                          backgroundColor: 'rgba(76, 175, 80, 0.1)'
                        }
                      }}
                    >
                      <ContentCopyIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: '600', color: 'text.secondary', mb: 0.5 }}>
                  Semantic ID:
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip
                    icon={<DataObjectIcon />}
                    label={submodelData.submodelDescriptor.semanticId}
                    variant="outlined"
                    size="small"
                    sx={{
                      maxWidth: '100%',
                      '& .MuiChip-label': {
                        fontFamily: 'monospace',
                        fontSize: '0.75rem'
                      },
                      '& .MuiChip-icon': {
                        color: 'secondary.main'
                      }
                    }}
                  />
                  <Tooltip title="Copy Semantic ID">
                    <IconButton
                      size="small"
                      onClick={() => navigator.clipboard.writeText(submodelData.submodelDescriptor.semanticId)}
                      sx={{
                        color: 'text.secondary',
                        '&:hover': {
                          color: 'success.main',
                          backgroundColor: 'rgba(76, 175, 80, 0.1)'
                        }
                      }}
                    >
                      <ContentCopyIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: '600', color: 'text.secondary', mb: 0.5 }}>
                  Asset ID:
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip
                    icon={<SecurityIcon />}
                    label={submodelData.submodelDescriptor.assetId}
                    variant="outlined"
                    size="small"
                    sx={{
                      maxWidth: '100%',
                      '& .MuiChip-label': {
                        fontFamily: 'monospace',
                        fontSize: '0.75rem'
                      },
                      '& .MuiChip-icon': {
                        color: 'warning.main'
                      }
                    }}
                  />
                  <Tooltip title="Copy Asset ID">
                    <IconButton
                      size="small"
                      onClick={() => navigator.clipboard.writeText(submodelData.submodelDescriptor.assetId)}
                      sx={{
                        color: 'text.secondary',
                        '&:hover': {
                          color: 'success.main',
                          backgroundColor: 'rgba(76, 175, 80, 0.1)'
                        }
                      }}
                    >
                      <ContentCopyIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: '600', color: 'text.secondary', mb: 0.5 }}>
                  Connector URL:
                </Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all', fontSize: '0.8rem' }}>
                  {submodelData.submodelDescriptor.connectorUrl}
                </Typography>
              </Box>
              {submodelData.submodelDescriptor.error && (
                <Box>
                  <Alert severity="error" sx={{ mt: 1, borderRadius: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: '600', mb: 0.5 }}>
                      Error Details:
                    </Typography>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                      {submodelData.submodelDescriptor.error}
                    </Typography>
                  </Alert>
                </Box>
              )}
            </Box>
          </CardContent>
        </Card>

        {submodelData.dtr && (
          <Card sx={{ borderRadius: 0 }}>
            <CardContent>
              <Typography variant="subtitle1" sx={{ fontWeight: '600', color: 'primary.main', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <SecurityIcon color="primary" />
                DTR Information
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: '600', color: 'text.secondary', mb: 0.5 }}>
                    Connector URL:
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all', fontSize: '0.8rem' }}>
                    {submodelData.dtr.connectorUrl}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: '600', color: 'text.secondary', mb: 0.5 }}>
                    Asset ID:
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip
                      icon={<SecurityIcon />}
                      label={submodelData.dtr.assetId}
                      variant="outlined"
                      size="small"
                      sx={{
                        maxWidth: '100%',
                        '& .MuiChip-label': {
                          fontFamily: 'monospace',
                          fontSize: '0.75rem'
                        },
                        '& .MuiChip-icon': {
                          color: 'warning.main'
                        }
                      }}
                    />
                    <Tooltip title="Copy DTR Asset ID">
                      <IconButton
                        size="small"
                        onClick={() => navigator.clipboard.writeText(submodelData.dtr!.assetId)}
                        sx={{
                          color: 'text.secondary',
                          '&:hover': {
                            color: 'success.main',
                            backgroundColor: 'rgba(76, 175, 80, 0.1)'
                          }
                        }}
                      >
                        <ContentCopyIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              </Box>
            </CardContent>
          </Card>
        )}
      </Box>
    );
  };

  const renderJsonData = () => {
    if (!submodelData?.submodel || Object.keys(submodelData.submodel).length === 0) {
      return (
        <Alert severity="info">
          No submodel data available or data could not be retrieved.
        </Alert>
      );
    }

    // Generate the same filename as the download function
    const filename = `submodel-${submodel.id}-${submodel.idShort || 'data'}.json`;
    
    return <JsonViewer data={submodelData.submodel} filename={filename} />;
  };

  const renderSpecializedView = () => {
    if (!submodelData?.submodel) {
      return (
        <Alert severity="info">
          No submodel data available.
        </Alert>
      );
    }

    const addonResolution = getSpecializedAddon();
    if (!addonResolution) {
      return (
        <Alert severity="warning">
          No specialized viewer found for this semantic ID.
        </Alert>
      );
    }

    const { addon } = addonResolution;
    const AddonComponent = addon.component;

    try {
      return (
        <AddonComponent
          semanticId={semanticIdValue}
          data={submodelData.submodel}
          metadata={{
            source: 'submodel-viewer',
            lastUpdated: new Date(),
          }}
        />
      );
    } catch (error) {
      console.error('Error rendering specialized addon:', error);
      return (
        <Alert severity="error">
          Error rendering specialized view: {error instanceof Error ? error.message : 'Unknown error'}
        </Alert>
      );
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen
      PaperProps={{
        sx: {
          background: theme.palette.background.default,
          borderRadius: 0
        }
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pl: 3, pr:3, pt: 3 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Submodel Viewer
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
            {submodel.idShort}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title="Refresh Submodel Data">
            <IconButton
              onClick={handleRefresh}
              disabled={loading}
              sx={{
                color: loading ? 'text.disabled' : 'primary.main',
                backgroundColor: 'transparent',
                '&:hover': {
                  backgroundColor: 'rgba(25, 118, 210, 0.1)'
                },
                transition: 'all 0.2s ease-in-out'
              }}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 0, overflow: 'hidden' }}>
        <Box sx={{ display: 'flex', height: '100%', position: 'relative' }}>
          {/* Right side - Tabs for Specialized/JSON Views - Full Height */}
          <Box sx={{ width: '70%', height: '100%', display: 'flex', flexDirection: 'column', position: 'absolute', right: 0, top: 0, zIndex: 1 }}>
            <Box sx={{ borderBottom: `1px solid ${theme.palette.divider}`, backgroundColor: theme.palette.background.paper, flexShrink: 0 }}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', pl: 0, pr: 2, pt: 0, pb: 0.25 }}>
                <Tabs
                  value={rightPanelTab}
                  onChange={handleRightPanelTabChange}
                  sx={{ 
                    minHeight: 'auto',
                    '& .MuiTabs-indicator': {
                      height: 2,
                      borderRadius: 1,
                      backgroundColor: theme.palette.primary.main,
                    },
                    '& .MuiTabs-flexContainer': {
                      gap: 0.5,
                    },
                    '& .MuiTab-root': {
                      minHeight: 40,
                      minWidth: 'auto',
                      padding: '8px 20px',
                      textTransform: 'none',
                      fontWeight: 500,
                      fontSize: '0.875rem',
                      borderRadius: 2,
                      color: theme.palette.text.secondary,
                      transition: 'all 0.2s ease-in-out',
                      '&:first-of-type': {
                        marginLeft: 1, // Add left margin only to first tab
                      },
                      '&.Mui-selected': {
                        color: theme.palette.primary.main,
                        fontWeight: 600,
                        backgroundColor: theme.palette.primary.light + '15',
                      },
                      '&:hover': {
                        backgroundColor: theme.palette.action.hover,
                        color: theme.palette.text.primary,
                      }
                    }
                  }}
                >
                  {getRightPanelTabs()}
                </Tabs>
              </Box>
            </Box>

            <Box sx={{ flex: 1, overflow: 'hidden', backgroundColor: theme.palette.background.default, display: 'flex', flexDirection: 'column' }}>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : error ? (
                <Alert severity="error" sx={{ borderRadius: 0, m: 2 }}>
                  {error}
                </Alert>
              ) : (
                <Box sx={{ 
                  flex: 1, 
                  overflow: 'hidden', 
                  p: getSpecializedAddon() && rightPanelTab === 0 ? 0 : 0.5,
                  pt: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  width: '100%',
                  height: '100%'
                }}>
                  {getRightPanelContent()}
                </Box>
              )}
            </Box>
          </Box>

          {/* Left Panel - Submodel Information - Positioned lower */}
          <Box sx={{ width: '30%', height: 'calc(100% - 60px)', marginTop: '60px', borderRight: `1px solid ${theme.palette.divider}`, display: 'flex', flexDirection: 'column', backgroundColor: theme.palette.background.paper }}>
            <Box sx={{ borderBottom: `1px solid ${theme.palette.divider}`, backgroundColor: theme.palette.background.paper, flexShrink: 0, px: 3, py: 1.5 }}>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 600 }}>
                <DescriptionIcon color="primary" />
                Submodel Information
              </Typography>
            </Box>

            <Box sx={{ flex: 1, overflow: 'auto', backgroundColor: theme.palette.background.default, p: 3 }}>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : error ? (
                <Alert severity="error" sx={{ borderRadius: 0 }}>
                  {error}
                </Alert>
              ) : (
                renderSubmodelInfo()
              )}
            </Box>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ borderRadius: 0, borderTop: `1px solid ${theme.palette.divider}`, p: 2, gap: 1 }}>
        <Button 
          onClick={onClose} 
          variant="outlined" 
          sx={{
            borderRadius: 2,
            textTransform: 'none',
            px: 2,
            py: 1,
            fontSize: '0.85rem',
            fontWeight: '500'
          }}
        >
          Close
        </Button>
        <Box sx={{ display: 'flex', gap: 0.5, ml: 'auto' }}>
          <Button 
            onClick={handleShareEmail}
            startIcon={<EmailIcon />}
            variant="outlined"
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              py: 1,
              fontSize: '0.85rem',
              fontWeight: '500'
            }}
            disabled={!submodelData?.submodel || Object.keys(submodelData?.submodel || {}).length === 0}
          >
            Share via Email
          </Button>
          <Button 
            onClick={handleDownloadJson}
            startIcon={<DownloadIcon />}
            variant="contained"
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              py: 1,
              fontSize: '0.85rem',
              fontWeight: '500'
            }}
            disabled={!submodelData?.submodel || Object.keys(submodelData?.submodel || {}).length === 0}
          >
            Download JSON
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};
