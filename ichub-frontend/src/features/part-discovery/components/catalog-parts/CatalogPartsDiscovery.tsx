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
        console.log('Shell ID copied to clipboard:', selectedItem.shellId);
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
        
        console.log('Twin data downloaded successfully');
      } catch (err) {
        console.error('Failed to download twin data:', err);
      }
    }
    handleMenuClose();
  };

  return (
    <>
      <Box className="custom-cards-list">
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
          <Box key={productId} className="custom-card-box">
            <Box
              className="custom-card"
              sx={{
                height: "220px"
              }}
            >
              <Box className="custom-card-header">
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                  <DiscoveryCardChip
                    dtrIndex={item.dtrIndex}
                  />
                </Box>

                <Box className="custom-card-header-buttons">                  
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
                              
                              console.log('Twin data downloaded successfully');
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
              <Box className="custom-card-content">
                <Typography variant="h5">
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
                {(item.rawTwinData?.assetType || item.idShort || item.shellId) && (
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      fontFamily: 'monospace', 
                      fontSize: '0.7rem',
                      color: 'rgba(255, 255, 255, 0.6)',
                      display: 'block',
                      mt: 0.5,
                      mb: 0.5,
                      wordBreak: 'break-all',
                      lineHeight: 1.1,
                      maxHeight: '15px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {item.rawTwinData?.assetType || item.idShort || item.shellId}
                  </Typography>
                )}
                {(item.rawTwinData?.idShort) && (
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      fontFamily: 'monospace', 
                      fontSize: '0.7rem',
                      color: 'rgba(255, 255, 255, 0.6)',
                      display: 'block',
                      mt: 0.5,
                      mb: 0.5,
                      wordBreak: 'break-all',
                      lineHeight: 1.1,
                      maxHeight: '15px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {item.rawTwinData.idShort}
                  </Typography>
                )}
                <br></br>
                <Typography variant="label2">
                  {item.category}
                </Typography>
              </Box>
              <Box className="custom-card-button-box">
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
              padding: '8px 16px',
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
              padding: '8px 16px',
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
