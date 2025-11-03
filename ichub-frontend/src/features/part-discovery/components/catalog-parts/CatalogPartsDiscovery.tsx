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

import MoreVert from "@mui/icons-material/MoreVert";
import Launch from "@mui/icons-material/Launch";
import ContentCopy from '@mui/icons-material/ContentCopy';
import Download from '@mui/icons-material/Download';
import CheckCircle from '@mui/icons-material/CheckCircle';
import { Box, Typography, IconButton, Button, Tooltip, Menu } from "@mui/material";
import { useState } from "react";
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import { DiscoveryCardChip } from "./DiscoveryCardChip";
import { ErrorNotFound } from "../../../../components/general/ErrorNotFound";
import LoadingSpinner from "../../../../components/general/LoadingSpinner";
import { AASData } from "../../utils/utils";

export interface AppContent {
  id?: string;
  manufacturerId: string;
  manufacturerPartId: string;
  name?: string;
  category?: string;
  dtrIndex?: number; // DTR index for display
  shellId?: string; // Shell ID (AAS ID) for display
  idShort?: string; // idShort for display
  rawTwinData?: AASData; // Raw AAS/shell data for download
}

export interface CardDecisionProps {
  items: AppContent[];
  onClick: (e: string) => void;
  onRegisterClick?: (manufacturerId: string, manufacturerPartId: string) => void; 
  isLoading: boolean;
}

export const CatalogPartsDiscovery = ({
  items,
  onClick,
  isLoading
}: CardDecisionProps) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedItem, setSelectedItem] = useState<AppContent | null>(null);
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  const open = Boolean(anchorEl);

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, item: AppContent) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedItem(item);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedItem(null);
  };

    const handleCopyShellId = async () => {
    if (selectedItem?.shellId) {
      try {
        await navigator.clipboard.writeText(selectedItem.shellId);
        
        setCopySuccess(true);
        
        // Close menu after showing feedback for 1.5 seconds
        setTimeout(() => {
          handleMenuClose();
          // Reset success state after menu closes
          setTimeout(() => {
            setCopySuccess(false);
          }, 300);
        }, 1500);
      } catch (err) {
        console.error('Failed to copy Shell ID:', err);
        handleMenuClose();
      }
    } else {
      handleMenuClose();
    }
  };

  const handleDownloadTwinData = () => {
    if (selectedItem?.rawTwinData) {
      try {
        const jsonString = JSON.stringify(selectedItem.rawTwinData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `twin-${selectedItem.manufacturerPartId || selectedItem.shellId || 'data'}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        
      } catch (err) {
        console.error('Failed to download twin data:', err);
      }
    }
    handleMenuClose();
  };

  return (
    <>
      <Box className="catalog-parts-cards-list">
      {isLoading && (
        <LoadingSpinner />
      )}
      {!isLoading && items.length === 0 && (
        <ErrorNotFound icon={ReportProblemIcon} message="No catalog parts available, please check your ichub-backend connection/configuration"/>
      )}
      {items.map((item) => {
        const name = item.name ?? "";
        const productId = item.manufacturerId + "/" + item.manufacturerPartId;
        return (
          <Box key={productId} className="catalog-parts-card-box">
            <Box
              className="catalog-parts-card"
              onClick={() => onClick(productId)}
              sx={{ position: 'relative' }}
            >
              <Box className="catalog-parts-card-header">
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flex: 1, minWidth: 0 }}>
                  <Box sx={{ flexShrink: 0 }}>
                    <DiscoveryCardChip
                      dtrIndex={item.dtrIndex}
                    />
                  </Box>
                  {/* Shell ID display with truncation and tooltip */}
                  {item.shellId && (
                    <Tooltip title={`${item.shellId}`} arrow placement="top">
                      <Typography
                        variant="caption"
                        sx={{
                          fontFamily: 'Monaco, "Lucida Console", monospace',
                          fontSize: '0.68rem',
                          color: 'rgba(255, 255, 255, 0.65)',
                          backgroundColor: 'rgba(255, 255, 255, 0.08)',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          cursor: 'help',
                          minWidth: 0,
                          flex: 1,
                          overflow: 'hidden',
                          whiteSpace: 'nowrap',
                          letterSpacing: '0.05px',
                          fontWeight: 400,
                          maxWidth: '180px',
                          textAlign: 'center',
                        }}
                      >
                        {(() => {
                          // Extended truncation for header display with wider cards
                          const shellId = item.shellId;
                          if (shellId.length <= 28) return shellId;
                          // Show first 18 characters and last 8 for better UUID recognition
                          return `${shellId.substring(0, 16)}...${shellId.substring(shellId.length - 8)}`;
                        })()}
                      </Typography>
                    </Tooltip>
                  )}
                </Box>

                <Box className="catalog-parts-card-header-buttons">                  
                  {item.rawTwinData && (
                    <Tooltip title="Download Twin Data" arrow>
                      <IconButton
                        onClick={(e) => {
                          e.stopPropagation();
                          if (item.rawTwinData) {
                            try {
                              const jsonString = JSON.stringify(item.rawTwinData, null, 2);
                              const blob = new Blob([jsonString], { type: 'application/json' });
                              const url = URL.createObjectURL(blob);
                              
                              const link = document.createElement('a');
                              link.href = url;
                              link.download = `twin-${item.manufacturerPartId || item.shellId || 'data'}.json`;
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                              URL.revokeObjectURL(url);
                              
                              
                            } catch (err) {
                              console.error('Failed to download twin data:', err);
                            }
                          }
                        }}
                      >
                        <Download sx={{ color: "white"}} />
                      </IconButton>
                    </Tooltip>
                  )}
                  <Tooltip title="More options" arrow>
                    <IconButton
                      onClick={(e) => handleMenuClick(e, item)}
                    >
                      <MoreVert sx={{ color: "rgba(255, 255, 255, 0.68)" }} />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
              <Box className="catalog-parts-card-content">
                {/* Title Section */}
                <Typography variant="h5" sx={{ lineHeight: 1.2, minHeight: '40px', display: 'flex', alignItems: 'flex-start' }}>
                  {(() => {
                    // Try to get displayName from rawTwinData first
                    if (item.rawTwinData?.displayName && Array.isArray(item.rawTwinData.displayName) && item.rawTwinData.displayName.length > 0) {
                      // Check if displayName is an array of objects with text property
                      const displayNameEntry = item.rawTwinData.displayName[0];
                      if (typeof displayNameEntry === 'object' && displayNameEntry !== null && 'text' in displayNameEntry) {
                        return (displayNameEntry as { text: string }).text;
                      }
                      // Otherwise treat as simple string
                      return displayNameEntry as string;
                    }
                    // Fallback to current name logic
                    return name;
                  })()}
                </Typography>

                {/* Identifiers Section with Optimized Layout */}
                <Box className="id-section" sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 0 }}>
                  {(() => {
                    // Smart truncation optimized for wider card
                    const truncateId = (id: string, maxLength: number = 40) => {
                      if (!id || id.length <= maxLength) return id;
                      const startLength = Math.floor((maxLength - 3) / 2);
                      const endLength = maxLength - 3 - startLength;
                      return `${id.substring(0, startLength)}...${id.substring(id.length - endLength)}`;
                    };

                    // Collect all identifiers to display with improved logic
                    const identifiers = [];

                    // ID Short - primary technical identifier
                    if (item.idShort) {
                      identifiers.push({
                        label: "ID Short",
                        value: item.idShort,
                        priority: 1
                      });
                    }

                    // Manufacturer Part ID (high priority business identifier)
                    if (item.manufacturerPartId) {
                      identifiers.push({
                        label: "Manufacturer Part ID",
                        value: item.manufacturerPartId,
                        priority: 2
                      });
                    }

                    // Customer Part ID (high priority business identifier)
                    if (item.category) {
                      identifiers.push({
                        label: "Customer Part ID",
                        value: item.category,
                        priority: 3
                      });
                    }

                    // ID Short (from rawTwinData or direct property) - Show after Customer Part ID
                    const idShort = item.idShort || item.rawTwinData?.idShort;
                    if (idShort) {
                      identifiers.push({
                        label: "ID Short",
                        value: idShort,
                        priority: 4 // Lower priority than Customer Part ID
                      });
                    }

                    // Sort by priority and ensure top 3 are shown
                    const displayIdentifiers = identifiers
                      .sort((a, b) => a.priority - b.priority)
                      .slice(0, 3); // Show max 3 to fit in compact space

                    return (
                      <>
                        {displayIdentifiers.map((identifier, index) => (
                          <Box key={`${identifier.label}-${index}`} sx={{ minHeight: '36px' }}>
                            <Typography 
                              className="info-label"
                              sx={{ 
                                fontSize: '0.65rem',
                                color: 'rgba(255, 255, 255, 0.45)',
                                fontWeight: 500,
                                textTransform: 'uppercase',
                                letterSpacing: '0.8px',
                                marginBottom: '3px',
                                display: 'block'
                              }}
                            >
                              {identifier.label}
                            </Typography>
                            <Typography 
                              variant="caption" 
                              sx={{ 
                                fontFamily: 'Monaco, "Lucida Console", monospace',
                                fontSize: identifier.priority <= 2 ? '0.76rem' : '0.74rem',
                                color: identifier.priority <= 2 ? 'rgba(255, 255, 255, 0.87)' : 'rgba(255, 255, 255, 0.75)',
                                lineHeight: 1.3,
                                fontWeight: identifier.priority <= 2 ? 500 : 400,
                                letterSpacing: '0.1px',
                                cursor: 'help',
                                wordBreak: 'break-word',
                                display: 'block'
                              }}
                              title={`${identifier.label}: ${identifier.value}`}
                            >
                              {truncateId(identifier.value)}
                            </Typography>
                          </Box>
                        ))}

                        {/* Fallback if no identifiers */}
                        {displayIdentifiers.length === 0 && (
                          <Box sx={{ minHeight: '36px' }}>
                            <Typography className="info-label">
                              Identifier
                            </Typography>
                            <Typography 
                              variant="caption" 
                              sx={{ 
                                fontSize: '0.72rem',
                                color: 'rgba(255, 255, 255, 0.4)',
                                fontStyle: 'italic',
                                lineHeight: 1.4,
                                display: 'block'
                              }}
                            >
                              Not available
                            </Typography>
                          </Box>
                        )}
                      </>
                    );
                  })()}
                </Box>
              </Box>
              <Box className="catalog-parts-card-button-box" sx={{ pb: "0!important" }}>
                {/* Asset Type Banner above VIEW button */}
                {(() => {
                  const assetType = item.rawTwinData?.assetType
                  return assetType ? (
                    <Box 
                      sx={{ 
                        mb: 0, // No distance to button
                        mx: -2, // Extend beyond card padding to reach edges
                        display: 'flex', 
                        justifyContent: 'center',
                        alignItems: 'center',
                        background: 'linear-gradient(90deg, rgba(79, 172, 254, 0.15) 0%, rgba(79, 172, 254, 0.08) 100%)',
                        borderTop: '1px solid rgba(79, 172, 254, 0.2)',
                        borderBottom: '1px solid rgba(79, 172, 254, 0.2)',
                        py: 0.8,
                        position: 'relative'
                      }}
                    >
                      <Tooltip title={`Asset Type: ${assetType}`} arrow placement="top">
                        <Typography
                          variant="caption"
                          sx={{
                            fontSize: '0.65rem',
                            color: 'rgba(79, 172, 254, 0.9)',
                            fontWeight: 600,
                            letterSpacing: '0.4px',
                            textTransform: 'uppercase',
                            lineHeight: 1.2,
                            cursor: 'help',
                            textAlign: 'center',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: '280px'
                          }}
                        >
                          {(() => {
                            // Smart truncation for full-width banner
                            if (assetType.length <= 30) return assetType;
                            return `${assetType.substring(0, 27)}...`;
                          })()}
                        </Typography>
                      </Tooltip>
                    </Box>
                  ) : null;
                })()}
                <Button 
                  variant="contained" 
                  size="small" 
                  endIcon={<Launch />}
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent card click
                    onClick(productId);
                  }}
                >
                  View
                </Button>
              </Box>
            </Box>
          </Box>
        );
      })}
      
      {/* More options menu */}
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleMenuClose}
        MenuListProps={{
          'aria-labelledby': 'more-options-button',
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{
          sx: {
            backgroundColor: 'white !important'
          }
        }}
      >
        {selectedItem?.shellId && (
          <Box
            onClick={handleCopyShellId}
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '4px 16px',
              cursor: 'pointer',
              backgroundColor: copySuccess ? '#4caf50 !important' : 'transparent',
              transition: 'background-color 0.3s ease',
              '&:hover': {
                backgroundColor: copySuccess ? '#4caf50 !important' : '#f5f5f5'
              }
            }}
          >
            <Box component="span" sx={{ 
              fontSize: '0.875rem', 
              color: copySuccess ? 'white' : 'black',
              transition: 'color 0.3s ease'
            }}>
              {copySuccess ? 'Copied!' : 'Copy Shell ID'}
            </Box>
            {copySuccess ? (
              <CheckCircle 
                fontSize="small" 
                sx={{ 
                  color: 'white !important', 
                  fill: 'white !important',
                  marginLeft: 2 
                }} 
              />
            ) : (
              <ContentCopy 
                fontSize="small" 
                sx={{ 
                  color: '#000000 !important', 
                  fill: '#000000 !important',
                  marginLeft: 2 
                }} 
              />
            )}
          </Box>
        )}
        {selectedItem?.rawTwinData && (
          <Box
            onClick={handleDownloadTwinData}
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '4px 16px',
              cursor: 'pointer',
              '&:hover': {
                backgroundColor: '#f5f5f5'
              }
            }}
          >
            <Box component="span" sx={{ fontSize: '0.875rem', color: 'black' }}>
              Download Twin Data
            </Box>
            <Download 
              fontSize="small" 
              sx={{ 
                color: '#000000 !important', 
                fill: '#000000 !important',
                marginLeft: 2 
              }} 
            />
          </Box>
        )}
      </Menu>
    </Box>
    </>
  );
};
