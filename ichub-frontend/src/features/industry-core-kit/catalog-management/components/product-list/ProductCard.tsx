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

import IosShare from "@mui/icons-material/IosShare";
import Fingerprint from '@mui/icons-material/Fingerprint';
import CheckCircle from '@mui/icons-material/CheckCircle';
import MoreVert from "@mui/icons-material/MoreVert";
import Launch from "@mui/icons-material/Launch";
import CloudQueueIcon from '@mui/icons-material/CloudQueue';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { Box, Typography, IconButton, Button, Tooltip } from "@mui/material";
import Menu from '@mui/material/Menu';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import { CardChip } from "./CardChip";
import { StatusVariants } from "@/features/industry-core-kit/catalog-management/types/types";
import { ErrorNotFound } from '@/components/general/ErrorNotFound';
import LoadingSpinner from '@/components/general/LoadingSpinner';

import { useEffect, useState } from 'react';
import { fetchCatalogPartTwinDetails } from '@/features/industry-core-kit/catalog-management/api';

export interface AppContent {
  id?: string;
  manufacturerId: string;
  manufacturerPartId: string;
  name?: string;
  category?: string;
  status?: StatusVariants;
  shellId?: string; // AAS ID
}

export interface CardDecisionProps {
  onClick: (productId: string) => void;
  onShare: (manufacturerId: string, manufacturerPartId: string) => void;
  onMore: (manufacturerId: string, manufacturerPartId: string) => void;
  onRegisterClick: (manufacturerId: string, manufacturerPartId: string) => void;
  items: AppContent[];
  isLoading: boolean
}

export enum ButtonEvents {
  SHARE,
  MORE,
  REGISTER, 
}

export const ProductCard = ({
  items,
  onShare,
  onMore,
  onClick,
  onRegisterClick, 
  isLoading,
}: CardDecisionProps) => {

  const handleDecision = (
    e: React.SyntheticEvent,
    manufacturerId: string,
    manufacturerPartId: string,
    type: ButtonEvents
  ) => {
    e.stopPropagation();
    if (type === ButtonEvents.SHARE) {
      return onShare(manufacturerId, manufacturerPartId);
    } else if (type === ButtonEvents.MORE) {
      return onMore(manufacturerId, manufacturerPartId);
    } else if (type === ButtonEvents.REGISTER) {
      if (onRegisterClick) {
        onRegisterClick(manufacturerId, manufacturerPartId);
      }
    }
  };

  // State for AAS IDs and copy feedback
  const [aasIds, setAasIds] = useState<{ [key: string]: string }>({});
  const [copySuccess, setCopySuccess] = useState<{ [key: string]: boolean }>({});
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const openMenu = Boolean(anchorEl);

  useEffect(() => {
    // Fetch AAS IDs for all items
    const fetchAasIds = async () => {
      const updates: { [key: string]: string } = {};
      await Promise.all(items.map(async (item) => {
        if (!item.manufacturerId || !item.manufacturerPartId) return;
        const key = item.manufacturerId + '/' + item.manufacturerPartId;
        try {
          const details = await fetchCatalogPartTwinDetails(item.manufacturerId, item.manufacturerPartId);
          if (details && details.dtrAasId) {
            updates[key] = details.dtrAasId;
          }
        } catch (err) {
          // Optionally log error
        }
      }));
      setAasIds(updates);
    };
    fetchAasIds();
  }, [items]);

  const handleCopyAasId = async (key: string) => {
    let aasId = aasIds[key];
    if (aasId) {
      if (!aasId.startsWith('urn:uuid:')) {
        aasId = `urn:uuid:${aasId}`;
      }
      try {
        await navigator.clipboard.writeText(aasId);
        setCopySuccess((prev) => ({ ...prev, [key]: true }));
        setTimeout(() => {
          setCopySuccess((prev) => ({ ...prev, [key]: false }));
        }, 1500);
        // Optionally close menu after feedback
        setTimeout(() => {
          setAnchorEl(null);
          setSelectedProductId(null);
        }, 1700);
      } catch {}
    }
  };

  return (
    <Box className="custom-cards-list">
      {isLoading && <LoadingSpinner />}
      {!isLoading && items.length === 0 && (
        <ErrorNotFound icon={ReportProblemIcon} message="No catalog parts available, please check your ichub-backend connection/configuration"/>
      )}
      {items.map((item) => {
        const name = item.name ?? "";
        const productId = item.manufacturerId + "/" + item.manufacturerPartId;
        const aasId = aasIds[productId];
        return (
          <Box key={productId} className="custom-card-box">
            <Box
              className="custom-card"
              sx={{ height: "240px" }}
              onClick={() => { onClick(productId); }}
            >
              <Box className="custom-card-header" sx={{ alignItems: 'center', display: 'flex', gap: 1 }}>
                <CardChip status={item.status} statusText={item.status} />
                <Box className="custom-card-header-buttons">                  
                    {/* Register and Share icon buttons in header */}
                    {(item.status === StatusVariants.draft || item.status === StatusVariants.pending) && (
                      <Tooltip title="Register part" arrow>
                        <span> 
                          <IconButton
                            onClick={(e) => {
                              handleDecision(e, item.manufacturerId, item.manufacturerPartId, ButtonEvents.REGISTER);
                            }}
                          >
                            {item.status === StatusVariants.draft ? (
                              <CloudUploadIcon className="register-btn"/>
                            ) : (
                              <CloudQueueIcon sx={{ color: "rgba(255, 255, 255, 0.5)" }} />
                            )}
                          </IconButton>
                        </span>
                      </Tooltip>
                    )}
                    {item.status !== StatusVariants.draft && item.status !== StatusVariants.pending && (
                      <Tooltip title="Share part" arrow>
                        <IconButton
                          onClick={(e) => {
                            handleDecision(e, item.manufacturerId, item.manufacturerPartId, ButtonEvents.SHARE);
                          }}
                        >
                          <IosShare sx={{ color: "white"}} />
                        </IconButton>
                      </Tooltip>
                    )}
                  <Tooltip title="More options" arrow>
                    <IconButton
                      onClick={(e) => {
                        e.stopPropagation();
                        setAnchorEl(e.currentTarget);
                        setSelectedProductId(productId);
                      }}
                    >
                      <MoreVert sx={{ color: "rgba(255, 255, 255, 0.68)" }} />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
              <Box className="custom-card-content" sx={{ overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <Tooltip title={name} arrow placement="top">
                  <Typography variant="h5" sx={{ mb: 0.5, wordBreak: 'break-word', overflowWrap: 'break-word', hyphens: 'auto', cursor: 'help' }}>
                   {(() => {
                        // Smart truncation for very long product names
                        const productName = name;
                        if (productName.length <= 80) return productName;
                        // Show first 40 characters and last 35 for better recognition
                        const startLength = 20;
                        const endLength = 20;
                        return `${productName.substring(0, startLength)}...${productName.substring(productName.length - endLength)}`;
                    })()}
                  </Typography>
                </Tooltip>
                {/* Identifier labels below name, styled like CatalogPartsDiscovery */}
                <Box sx={{ mt: 0.5, flex: 1, minHeight: 0 }}>
                  <Typography 
                    sx={{ 
                      fontSize: '0.65rem', 
                      color: 'rgba(255,255,255,0.45)', 
                      fontWeight: 500, 
                      textTransform: 'uppercase', 
                      letterSpacing: '0.8px', 
                      mb: '0px',
                      display: 'block'
                    }}
                  >
                    Manufacturer Part ID
                  </Typography>
                  <Tooltip title={item.manufacturerPartId} arrow placement="top">
                    <Typography 
                      sx={{ 
                        fontFamily: 'Monaco, "Lucida Console", monospace',
                        fontSize: '0.76rem',
                        color: 'rgba(255,255,255,0.87)',
                        lineHeight: 1.1,
                        fontWeight: 500,
                        letterSpacing: '0.1px',
                        display: 'block',
                        mb: '0px',
                        maxWidth: '100%',
                        cursor: 'help'
                      }}
                    >
                      {(() => {
                        // Smart truncation showing beginning and end, like category
                        const manufacturerPartId = item.manufacturerPartId;
                        if (manufacturerPartId.length <= 30) return manufacturerPartId;
                        // Show first 15 characters and last 12 for better recognition
                        const startLength = 15;
                        const endLength = 12;
                        return `${manufacturerPartId.substring(0, startLength)}...${manufacturerPartId.substring(manufacturerPartId.length - endLength)}`;
                      })()}
                    </Typography>
                  </Tooltip>
                </Box>
              </Box>
              <Box className="custom-card-button-box" sx={{ pb: "0!important" }}>
                {/* Category Banner above VIEW button */}
                {item.category && item.category.trim() && (
                  <Box 
                    sx={{ 
                      mb: 0, // No distance to button
                      mx: 0, // Same width as card
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
                    <Tooltip title={`Category: ${item.category}`} arrow placement="top">
                      <Typography
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
                          // Smart truncation showing beginning and end, like manufacturer ID
                          const category = item.category;
                          if (category.length <= 30) return category;
                          // Show first 15 characters and last 12 for better recognition
                          const startLength = 15;
                          const endLength = 12;
                          return `${category.substring(0, startLength)}...${category.substring(category.length - endLength)}`;
                        })()}
                      </Typography>
                    </Tooltip>
                  </Box>
                )}
                <Button variant="contained" size="small" endIcon={<Launch />}>
                  View
                </Button>
              </Box>
            </Box>
          </Box>
        );
      })}
      {/* More options menu for copy AAS ID */}
      <Menu
        anchorEl={anchorEl}
        open={openMenu}
        onClose={() => { setAnchorEl(null); setSelectedProductId(null); }}
        MenuListProps={{ 'aria-labelledby': 'more-options-button' }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{ sx: { backgroundColor: 'white !important' } }}
      >
        {/* Dropdown options: Register, Share, Copy AAS ID */}
        {selectedProductId && (
          <>
            {/* Register option (only for draft/pending) */}
            {(items.find(i => (i.manufacturerId + '/' + i.manufacturerPartId) === selectedProductId)?.status === StatusVariants.draft ||
              items.find(i => (i.manufacturerId + '/' + i.manufacturerPartId) === selectedProductId)?.status === StatusVariants.pending) && (
              <Box
                onClick={() => {
                  const item = items.find(i => (i.manufacturerId + '/' + i.manufacturerPartId) === selectedProductId);
                  if (item) {
                    handleDecision(
                      { stopPropagation: () => {} } as React.SyntheticEvent,
                      item.manufacturerId,
                      item.manufacturerPartId,
                      ButtonEvents.REGISTER
                    );
                    setAnchorEl(null);
                    setSelectedProductId(null);
                  }
                }}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px 16px',
                  cursor: 'pointer',
                  '&:hover': { backgroundColor: '#f5f5f5' }
                }}
              >
                <CloudUploadIcon fontSize="small" sx={{ marginRight: 1, color: '#000000 !important', fill: '#000000 !important' }} />
                <Box component="span" sx={{ fontSize: '0.875rem', color: 'black' }}>Register part</Box>
              </Box>
            )}
            {/* Share option (always) */}
            <Box
              onClick={() => {
                const item = items.find(i => (i.manufacturerId + '/' + i.manufacturerPartId) === selectedProductId);
                if (item) {
                  handleDecision(
                    { stopPropagation: () => {} } as React.SyntheticEvent,
                    item.manufacturerId,
                    item.manufacturerPartId,
                    ButtonEvents.SHARE
                  );
                  setAnchorEl(null);
                  setSelectedProductId(null);
                }
              }}
              sx={{
                display: 'flex',
                alignItems: 'center',
                padding: '4px 16px',
                cursor: 'pointer',
                '&:hover': { backgroundColor: '#f5f5f5' }
              }}
            >
              <IosShare fontSize="small" sx={{ marginRight: 1, color: '#000000 !important', fill: '#000000 !important' }} />
              <Box component="span" sx={{ fontSize: '0.875rem', color: 'black' }}>Share part</Box>
            </Box>
            {/* Copy AAS ID option (if available) */}
            {aasIds[selectedProductId] && (
              <Box
                onClick={() => handleCopyAasId(selectedProductId)}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '4px 16px',
                  cursor: 'pointer',
                  backgroundColor: copySuccess[selectedProductId] ? '#4caf50 !important' : 'transparent',
                  transition: 'background-color 0.3s ease',
                  '&:hover': {
                    backgroundColor: copySuccess[selectedProductId] ? '#4caf50 !important' : '#f5f5f5'
                  }
                }}
              >
               {copySuccess[selectedProductId] ? (
                  <CheckCircle 
                    fontSize="small" 
                    sx={{ color: 'white !important', fill: 'white !important', marginRight: 1 }} 
                  />
                ) : (
                  <Fingerprint 
                    fontSize="small" 
                    sx={{ color: '#000000 !important', fill: '#000000 !important', marginRight: 1 }} 
                  />
                )}
                <Box component="span" sx={{ 
                  fontSize: '0.875rem', 
                  color: copySuccess[selectedProductId] ? 'white' : 'black',
                  transition: 'color 0.3s ease'
                }}>
                  {copySuccess[selectedProductId] ? 'Copied!' : `Copy AAS ID`}
                </Box>
              </Box>
            )}
          </>
        )}
      </Menu>
    </Box>
  );
};
