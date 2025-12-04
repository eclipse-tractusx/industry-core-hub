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

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Chip,
  IconButton,
  Grid2,
  TextField,
  InputAdornment,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Badge as MuiBadge,
  Tooltip,
  Menu,
  MenuItem
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Visibility as VisibilityIcon,
  Share as ShareIcon,
  PictureAsPdf as PictureAsPdfIcon,
  Delete as DeleteIcon,
  PostAdd as PostAddIcon,
  Description as DescriptionIcon,
  CloudUpload as CloudUploadIcon,
  CloudQueue as CloudQueueIcon,
  MoreVert as MoreVertIcon,
  Launch as LaunchIcon,
  IosShare as IosShareIcon,
  ContentCopy as ContentCopyIcon,
  CheckCircle as CheckCircleIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  GridView as GridViewIcon,
  Close as CloseIcon,
  ViewModule as ViewModuleIcon,
  TableRows as TableRowsIcon
} from '@mui/icons-material';
import { DPPListItem } from '../types';
import { fetchUserDPPs, deleteDPP, getDPPById, fetchSubmodelData, shareDPP } from '../api/provisionApi';
import { darkCardStyles } from '../styles/cardStyles';
import { formatShortDate, generateCXId } from '../utils/formatters';
import { CardChip } from '../components/CardChip';
import { getParticipantId } from '@/services/EnvironmentService';
import { exportPassportToPDF } from '../../utils/pdfExport';
import { QRCodeSVG } from 'qrcode.react';

const getPassportType = (semanticId: string): string => {
  if (!semanticId) return 'Unknown';
  
  // Extract the last part after the last # or /
  const parts = semanticId.split(/[#\/]/);
  const lastPart = parts[parts.length - 1];
  
  // Convert from camelCase or PascalCase to readable format
  const readable = lastPart
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
  
  return readable || 'Digital Product Passport';
};

const getVersionDisplay = (version: string | undefined): string => {
  if (!version) return '1.0.0';
  
  // If version contains non-numeric/dot characters, try to extract just the version number
  // e.g., "urn:something:6.1.0#type" -> "6.1.0"
  const versionMatch = version.match(/(\d+\.\d+\.\d+)/);
  if (versionMatch) {
    return versionMatch[1];
  }
  
  return version;
};

const getStatusLabel = (status: string): string => {
  const statusMap: Record<string, string> = {
    'draft': 'Draft',
    'active': 'Registered',
    'shared': 'Shared',
    'pending': 'Pending'
  };
  return statusMap[status.toLowerCase()] || status;
};

const getPassportTypeLabel = (dpp: DPPListItem): 'Type' | 'Instance' => {
  // Catalog parts are "Type" passports, serialized parts are "Instance" passports
  return dpp.partType === 'serialized' ? 'Instance' : 'Type';
};

const PassportProvisionList: React.FC = () => {
  const navigate = useNavigate();
  const [dpps, setDpps] = useState<DPPListItem[]>([]);
  const [filteredDpps, setFilteredDpps] = useState<DPPListItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [dppToDelete, setDppToDelete] = useState<DPPListItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedDppForMenu, setSelectedDppForMenu] = useState<DPPListItem | null>(null);
  const openMenu = Boolean(anchorEl);
  const [copySuccess, setCopySuccess] = useState<{ [key: string]: boolean }>({});
  const [seeAllDialogOpen, setSeeAllDialogOpen] = useState(false);
  const [dialogViewMode, setDialogViewMode] = useState<'cards' | 'grid'>('cards');
  const carouselRef = useRef<HTMLDivElement>(null);
  const [showCarouselControls, setShowCarouselControls] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(0);
  const [sharedDpps, setSharedDpps] = useState<Set<string>>(new Set());
  const [sharingInProgress, setSharingInProgress] = useState<Set<string>>(new Set());
  
  const checkCarouselOverflow = () => {
    if (carouselRef.current) {
      const { scrollWidth, clientWidth, scrollLeft } = carouselRef.current;
      const hasOverflow = scrollWidth > clientWidth;
      setShowCarouselControls(hasOverflow);
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
      
      // Calculate active card index based on scroll position
      const cardWidth = 352; // 320px card + 32px gap
      const currentIndex = Math.round(scrollLeft / cardWidth);
      setActiveCardIndex(currentIndex);
      
      // Calculate total pages based on how many cards fit in viewport
      const cardsPerPage = Math.floor(clientWidth / cardWidth);
      const pages = Math.ceil(filteredDpps.length / cardsPerPage);
      setTotalPages(pages);
      setCurrentPage(Math.floor(currentIndex / cardsPerPage));
    }
  };

  const scrollCarousel = (direction: 'left' | 'right') => {
    if (carouselRef.current) {
      const cardWidth = 340; // 320px card + 20px padding
      const scrollAmount = direction === 'left' ? -cardWidth : cardWidth;
      carouselRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      setTimeout(checkCarouselOverflow, 300);
    }
  };

  useEffect(() => {
    loadDPPs();
  }, []);

  useEffect(() => {
    filterDPPs();
  }, [searchQuery, dpps]);

  useEffect(() => {
    checkCarouselOverflow();
    window.addEventListener('resize', checkCarouselOverflow);
    return () => window.removeEventListener('resize', checkCarouselOverflow);
  }, [filteredDpps]);

  const loadDPPs = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchUserDPPs();
      setDpps(data);
      setFilteredDpps(data);
    } catch (err) {
      setError('Failed to load digital product passports');
    } finally {
      setIsLoading(false);
    }
  };

  const filterDPPs = () => {
    if (!searchQuery.trim()) {
      setFilteredDpps(dpps);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = dpps.filter(dpp =>
      dpp.name.toLowerCase().includes(query) ||
      (dpp.manufacturerPartId?.toLowerCase() || '').includes(query) ||
      (dpp.partInstanceId?.toLowerCase() || '').includes(query) ||
      dpp.version.includes(query)
    );
    setFilteredDpps(filtered);
  };

  const handleCreateNew = () => {
    navigate('/passport/provision/create');
  };

  const handleView = async (passportDiscoveryId: string) => {
    console.log('handleView called with:', passportDiscoveryId);
    
    // Find the DPP to get semanticId and submodelId
    const dpp = dpps.find(d => {
      const discoveryId = d.manufacturerPartId && d.partInstanceId 
        ? `CX:${d.manufacturerPartId}:${d.partInstanceId}`
        : null;
      return discoveryId === passportDiscoveryId;
    });

    console.log('Found DPP:', dpp);

    if (!dpp) {
      console.error('DPP not found for discovery ID:', passportDiscoveryId);
      return;
    }

    if (!dpp.semanticId) {
      console.error('DPP missing semanticId:', dpp);
      return;
    }

    // Use submodelId from the backend response
    const submodelId = dpp.submodelId;
    if (!submodelId) {
      console.error('DPP missing submodelId:', dpp);
      return;
    }

    try {
      console.log('Fetching submodel for semanticId:', dpp.semanticId, 'submodelId:', submodelId);
      
      // Use the proper API function
      const submodelData = await fetchSubmodelData(dpp.semanticId, submodelId);
      
      console.log('Submodel data received, navigating with preloaded data');
      
      // Navigate directly to visualizer with submodel data, bypassing stepper
      navigate(`/passport/provision/${passportDiscoveryId}`, {
        state: {
          submodelContent: submodelData,
          semanticId: dpp.semanticId,
          skipStepper: true,
          directToVisualizer: true
        }
      });
    } catch (error) {
      console.error('Error fetching submodel data:', error);
      // Navigate with DPP metadata so the detail page can try to load it
      navigate(`/passport/provision/${passportDiscoveryId}`, {
        state: {
          dppData: dpp
        }
      });
    }
  };

  const handleShare = async (dppId: string) => {
    const dpp = dpps.find(d => d.id === dppId);
    if (!dpp) return;

    // Use passport discovery ID (CX:manufacturerPartId:partInstanceId) for sharing
    const passportDiscoveryId = dpp.manufacturerPartId && dpp.partInstanceId 
      ? `CX:${dpp.manufacturerPartId}:${dpp.partInstanceId}`
      : dpp.id; // Fallback to internal ID if discovery ID not available

    // Add to sharing in progress
    setSharingInProgress(prev => new Set(prev).add(dppId));

    try {
      // TODO: Replace with actual BPNL from user input or configuration
      const defaultBpnl = 'BPNL000000000000'; // Placeholder BPNL
      
      await shareDPP(passportDiscoveryId, defaultBpnl);
      
      // Mark as shared
      setSharedDpps(prev => new Set(prev).add(dppId));
      
      // Show success message
      console.log(`Successfully shared DPP: ${dpp.name}`);
    } catch (error) {
      console.error('Failed to share DPP:', error);
      // TODO: Add error notification
    } finally {
      // Remove from sharing in progress
      setSharingInProgress(prev => {
        const newSet = new Set(prev);
        newSet.delete(dppId);
        return newSet;
      });
    }
  };

  const handleUnshare = async (dppId: string) => {
    const dpp = dpps.find(d => d.id === dppId);
    if (!dpp) return;

    // Add to sharing in progress
    setSharingInProgress(prev => new Set(prev).add(dppId));

    try {
      // TODO: Implement unshare API call
      console.log(`Unsharing DPP: ${dpp.name}`);
      
      // Remove from shared
      setSharedDpps(prev => {
        const newSet = new Set(prev);
        newSet.delete(dppId);
        return newSet;
      });
      
      console.log(`Successfully unshared DPP: ${dpp.name}`);
    } catch (error) {
      console.error('Failed to unshare DPP:', error);
      // TODO: Add error notification
    } finally {
      // Remove from sharing in progress
      setSharingInProgress(prev => {
        const newSet = new Set(prev);
        newSet.delete(dppId);
        return newSet;
      });
    }
  };

  const handleExportPDF = async (dpp: DPPListItem) => {
    await exportPassportToPDF({
      name: dpp.name,
      status: dpp.status,
      version: dpp.version,
      manufacturerPartId: dpp.manufacturerPartId,
      serialNumber: dpp.partInstanceId,
      passportIdentifier: dpp.passportIdentifier,
      twinId: dpp.twinId,
      semanticId: dpp.semanticId,
      manufacturerBPN: getParticipantId()
    });
  };

  const handleDeleteClick = (dpp: DPPListItem) => {
    setDppToDelete(dpp);
    setDeleteDialogOpen(true);
  };

  const handleCopyPassportId = async (dppId: string) => {
    const dpp = dpps.find(d => d.id === dppId);
    if (!dpp || !dpp.manufacturerPartId || !dpp.partInstanceId) return;
    
    const passportId = `CX:${dpp.manufacturerPartId}:${dpp.partInstanceId}`;
    try {
      await navigator.clipboard.writeText(passportId);
      setCopySuccess({ ...copySuccess, [dppId]: true });
      setTimeout(() => {
        setCopySuccess(prev => ({ ...prev, [dppId]: false }));
        setAnchorEl(null);
        setSelectedDppForMenu(null);
      }, 2000);
    } catch (error) {
      console.error('Failed to copy passport ID:', error);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!dppToDelete) return;

    try {
      setIsDeleting(true);
      await deleteDPP(dppToDelete.id);
      setDpps(prev => prev.filter(d => d.id !== dppToDelete.id));
      setDeleteDialogOpen(false);
      setDppToDelete(null);
    } catch (err) {
      setError('Failed to delete passport');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress sx={{ color: '#667eea' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Box
            sx={{
              width: { xs: 48, sm: 56 },
              height: { xs: 48, sm: 56 },
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(102, 126, 234, 0.3)'
            }}
          >
            <PostAddIcon sx={{ fontSize: { xs: 28, sm: 32 }, color: '#fff' }} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography
              variant="h4"
              sx={{
                color: '#fff',
                fontWeight: 700,
                fontSize: { xs: '1.5rem', sm: '2rem', md: '2.25rem' }
              }}
            >
              Digital Product Passports
            </Typography>
            <Typography
              variant="body1"
              sx={{
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: { xs: '0.875rem', sm: '1rem' }
              }}
            >
              Manage and share your product passports
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateNew}
            sx={{
              ...darkCardStyles.button.primary,
              display: { xs: 'none', sm: 'flex' },
              px: 3,
              py: 1.5
            }}
          >
            Create Passport
          </Button>
        </Box>

        {/* Mobile Create Button */}
        <Button
          variant="contained"
          fullWidth
          startIcon={<AddIcon />}
          onClick={handleCreateNew}
          sx={{
            ...darkCardStyles.button.primary,
            display: { xs: 'flex', sm: 'none' },
            py: 1.5,
            mb: 2
          }}
        >
          Create Passport
        </Button>
      </Box>

      {/* Sticky Search Bar */}
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          backgroundColor: 'rgba(10, 10, 15, 0.95)',
          backdropFilter: 'blur(10px)',
          py: 2,
          mb: 2,
          mx: -2,
          px: 2,
          borderBottom: '1px solid rgba(102, 126, 234, 0.1)',
        }}
      >
        <TextField
          fullWidth
          placeholder="Search by name, manufacturer part ID, or instance ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: 'rgba(255, 255, 255, 0.4)' }} />
              </InputAdornment>
            )
          }}
          sx={darkCardStyles.textField}
        />
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert
          severity="error"
          onClose={() => setError(null)}
          sx={{
            mb: 3,
            backgroundColor: 'rgba(244, 67, 54, 0.1)',
            border: '1px solid rgba(244, 67, 54, 0.3)',
            borderRadius: '12px',
            '& .MuiAlert-icon': { color: '#f44336' },
            '& .MuiAlert-message': { color: '#fff' }
          }}
        >
          {error}
        </Alert>
      )}

      {/* DPP Cards */}
      <Box 
        sx={{ 
          position: 'relative', 
          width: '100%',
          mb: 2,
        }}
      >
        {/* Left blur gradient */}
        {showCarouselControls && canScrollLeft && (
          <Box
            sx={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: '120px',
              background: 'linear-gradient(to right, rgba(10, 10, 15, 0.95) 0%, rgba(10, 10, 15, 0.7) 40%, transparent 100%)',
              zIndex: 5,
              pointerEvents: 'none',
            }}
          />
        )}

        {/* Right blur gradient */}
        {showCarouselControls && canScrollRight && (
          <Box
            sx={{
              position: 'absolute',
              right: 0,
              top: 0,
              bottom: 0,
              width: '120px',
              background: 'linear-gradient(to left, rgba(10, 10, 15, 0.95) 0%, rgba(10, 10, 15, 0.7) 40%, transparent 100%)',
              zIndex: 5,
              pointerEvents: 'none',
            }}
          />
        )}

        {showCarouselControls && canScrollLeft && (
          <IconButton
            onClick={() => scrollCarousel('left')}
            sx={{
              position: 'absolute',
              left: -16,
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 10,
              width: 48,
              height: 48,
              backgroundColor: 'rgba(0, 0, 0, 0.85)',
              backdropFilter: 'blur(12px)',
              color: '#fff',
              border: '1px solid rgba(102, 126, 234, 0.4)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                backgroundColor: 'rgba(102, 126, 234, 0.95)',
                borderColor: 'rgba(102, 126, 234, 0.8)',
                transform: 'translateY(-50%) scale(1.15)',
                boxShadow: '0 12px 32px rgba(102, 126, 234, 0.5)',
              },
              '&:active': {
                transform: 'translateY(-50%) scale(0.95)',
              },
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)'
            }}
          >
            <ChevronLeftIcon sx={{ fontSize: 32 }} />
          </IconButton>
        )}
        
        {showCarouselControls && canScrollRight && (
          <IconButton
            onClick={() => scrollCarousel('right')}
            sx={{
              position: 'absolute',
              right: -16,
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 10,
              width: 48,
              height: 48,
              backgroundColor: 'rgba(0, 0, 0, 0.85)',
              backdropFilter: 'blur(12px)',
              color: '#fff',
              border: '1px solid rgba(102, 126, 234, 0.4)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                backgroundColor: 'rgba(102, 126, 234, 0.95)',
                borderColor: 'rgba(102, 126, 234, 0.8)',
                transform: 'translateY(-50%) scale(1.15)',
                boxShadow: '0 12px 32px rgba(102, 126, 234, 0.5)',
              },
              '&:active': {
                transform: 'translateY(-50%) scale(0.95)',
              },
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)'
            }}
          >
            <ChevronRightIcon sx={{ fontSize: 32 }} />
          </IconButton>
        )}

        <Box
          ref={carouselRef}
          onScroll={checkCarouselOverflow}
          className="custom-cards-list"
          sx={{
            display: 'flex !important',
            overflowX: 'auto',
            overflowY: 'visible',
            scrollSnapType: 'x mandatory',
            scrollBehavior: 'smooth',
            pb: 2,
            pt: 1,
            WebkitOverflowScrolling: 'touch',
            flexWrap: 'nowrap !important',
            '&::-webkit-scrollbar': {
              display: 'none',
            },
            msOverflowStyle: 'none',
            scrollbarWidth: 'none',
          }}
        >
          {filteredDpps.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8, width: '100%' }}>
              <DescriptionIcon sx={{ fontSize: 64, color: 'rgba(255, 255, 255, 0.3)', mb: 2 }} />
              <Typography variant="h6" sx={{ color: '#fff', mb: 1 }}>
                {searchQuery ? 'No passports found' : 'No passports yet'}
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', mb: 3 }}>
                {searchQuery
                  ? 'Try adjusting your search criteria'
                  : 'Create your first digital product passport to get started'}
              </Typography>
              {!searchQuery && (
                <Button
                  variant="contained"
                  startIcon={<PostAddIcon />}
                  onClick={handleCreateNew}
                  sx={{
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#fff',
                    borderRadius: { xs: '10px', md: '12px' },
                    fontWeight: 600,
                    fontSize: { xs: '1rem', md: '1.125rem' },
                    padding: { xs: '12px 32px', md: '14px 40px' },
                    minWidth: { xs: '200px', md: '240px' },
                    textTransform: 'none' as const,
                    boxShadow: '0 8px 24px rgba(16, 185, 129, 0.4)',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                      boxShadow: '0 12px 32px rgba(16, 185, 129, 0.5)',
                      transform: 'translateY(-2px) scale(1.02)'
                    }
                  }}
                >
                  Get Started
                </Button>
              )}
            </Box>
          ) : (
            filteredDpps.map((dpp) => (
            <Box 
              key={dpp.id}
              className="custom-card-box"
              sx={{
                scrollSnapAlign: 'start',
                flexShrink: 0,
              }}
            >
              <Box
                className="custom-card"
                sx={{ 
                  height: 400,
                  cursor: 'default',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 12px 32px rgba(102, 126, 234, 0.3)',
                  }
                }}
              >
                <Box className="custom-card-header" sx={{ alignItems: 'center', display: 'flex', gap: 1 }}>
                  <CardChip status={dpp.status} statusText={getStatusLabel(dpp.status)} />
                  <Chip
                    label={getPassportTypeLabel(dpp)}
                    size="small"
                    sx={{
                      backgroundColor: getPassportTypeLabel(dpp) === 'Type' ? 'rgba(156, 39, 176, 0.2)' : 'rgba(33, 150, 243, 0.2)',
                      color: getPassportTypeLabel(dpp) === 'Type' ? '#ce93d8' : '#64b5f6',
                      border: `1px solid ${getPassportTypeLabel(dpp) === 'Type' ? 'rgba(156, 39, 176, 0.4)' : 'rgba(33, 150, 243, 0.4)'}`,
                      fontWeight: 600,
                      fontSize: '0.7rem',
                      height: '24px'
                    }}
                  />
                  <Box className="custom-card-header-buttons">
                    {dpp.status === 'pending' && (
                      <Tooltip title="Register passport" arrow>
                        <span>
                          <IconButton
                            onClick={(e) => {
                              e.stopPropagation();
                              // Register functionality placeholder
                              console.log('Register DPP:', dpp.id);
                            }}
                          >
                            <CloudQueueIcon sx={{ color: 'rgba(255, 255, 255, 0.5)' }} />
                          </IconButton>
                        </span>
                      </Tooltip>
                    )}
                    {(dpp.status === 'active' || dpp.status === 'shared') && (
                      <Tooltip title="Share passport" arrow>
                        <IconButton
                          onClick={(e) => {
                            e.stopPropagation();
                            handleShare(dpp.id);
                          }}
                        >
                          <IosShareIcon sx={{ color: 'white' }} />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title="More options" arrow>
                      <IconButton
                        onClick={(e) => {
                          e.stopPropagation();
                          setAnchorEl(e.currentTarget);
                          setSelectedDppForMenu(dpp);
                        }}
                      >
                        <MoreVertIcon sx={{ color: 'rgba(255, 255, 255, 0.68)' }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
                <Box className="custom-card-content" sx={{ overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', mb: 1 }}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Tooltip title={dpp.name} arrow placement="top">
                        <Typography variant="h5" sx={{ mb: 0.5, wordBreak: 'break-word', overflowWrap: 'break-word', hyphens: 'auto', cursor: 'help' }}>
                          {(() => {
                            const passportName = dpp.name;
                            if (passportName.length <= 55) return passportName;
                            const startLength = 15;
                            const endLength = 15;
                            return `${passportName.substring(0, startLength)}...${passportName.substring(passportName.length - endLength)}`;
                          })()}
                        </Typography>
                      </Tooltip>
                    </Box>
                    {dpp.manufacturerPartId && dpp.partInstanceId && (
                      <Box 
                        sx={{ 
                          flexShrink: 0,
                          backgroundColor: '#fff',
                          padding: '6px',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
                        }}
                      >
                        <QRCodeSVG 
                          value={`CX:${dpp.manufacturerPartId}:${dpp.partInstanceId}`}
                          size={70}
                          level="M"
                          includeMargin={false}
                        />
                      </Box>
                    )}
                  </Box>
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
                      Passport Discovery ID
                    </Typography>
                    <Tooltip title={dpp.manufacturerPartId && dpp.partInstanceId ? `CX:${dpp.manufacturerPartId}:${dpp.partInstanceId}` : 'N/A'} arrow placement="top">
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
                          if (!dpp.manufacturerPartId || !dpp.partInstanceId) return 'N/A';
                          const passportId = `CX:${dpp.manufacturerPartId}:${dpp.partInstanceId}`;
                          if (passportId.length <= 30) return passportId;
                          const startLength = 15;
                          const endLength = 12;
                          return `${passportId.substring(0, startLength)}...${passportId.substring(passportId.length - endLength)}`;
                      })()}
                    </Typography>
                  </Tooltip>
                  {dpp.passportIdentifier && (
                    <Box sx={{ mt: 1 }}>
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
                        Passport ID
                      </Typography>
                      <Tooltip title={dpp.passportIdentifier} arrow placement="top">
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
                            const passportId = dpp.passportIdentifier;
                            if (passportId.length <= 30) return passportId;
                            const startLength = 15;
                            const endLength = 12;
                            return `${passportId.substring(0, startLength)}...${passportId.substring(passportId.length - endLength)}`;
                          })()}
                        </Typography>
                      </Tooltip>
                    </Box>
                  )}
                  <Box sx={{ mt: 1.5, display: 'flex', gap: 2 }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography 
                        sx={{ 
                          fontSize: '0.65rem', 
                          color: 'rgba(255,255,255,0.45)', 
                          fontWeight: 500, 
                          textTransform: 'uppercase', 
                          letterSpacing: '0.8px', 
                          mb: '2px'
                        }}
                      >
                        Passport Type
                      </Typography>
                      <Typography 
                        sx={{ 
                          fontSize: '0.76rem',
                          color: 'rgba(255,255,255,0.87)',
                          fontWeight: 500,
                          letterSpacing: '0.1px'
                        }}
                      >
                        {getPassportType(dpp.semanticId)}
                      </Typography>
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography 
                        sx={{ 
                          fontSize: '0.65rem', 
                          color: 'rgba(255,255,255,0.45)', 
                          fontWeight: 500, 
                          textTransform: 'uppercase', 
                          letterSpacing: '0.8px', 
                          mb: '2px'
                        }}
                      >
                        Expiration
                      </Typography>
                      <Typography 
                        sx={{ 
                          fontSize: '0.76rem',
                          color: dpp.expirationDate ? 'rgba(255,255,255,0.87)' : 'rgba(255,255,255,0.5)',
                          fontWeight: 500,
                          letterSpacing: '0.1px'
                        }}
                      >
                        {dpp.expirationDate ? formatShortDate(dpp.expirationDate) : 'No Expiration'}
                      </Typography>
                    </Box>
                  </Box>
                  </Box>
                </Box>
                <Box className="custom-card-button-box" sx={{ pb: "0!important" }}>
                  <Box 
                    sx={{ 
                      mb: 0,
                      mx: 0,
                      display: 'flex', 
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: 'linear-gradient(90deg, rgba(79, 172, 254, 0.15) 0%, rgba(79, 172, 254, 0.08) 100%)',
                      borderTop: '1px solid rgba(79, 172, 254, 0.2)',
                      borderBottom: '1px solid rgba(79, 172, 254, 0.2)',
                      py: 0.8,
                      px: 2,
                      position: 'relative'
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: '0.65rem',
                        color: 'rgba(79, 172, 254, 0.9)',
                        fontWeight: 600,
                        letterSpacing: '0.4px',
                        textTransform: 'uppercase'
                      }}
                    >
                      Version {getVersionDisplay(dpp.version)}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: '0.65rem',
                        color: 'rgba(255, 255, 255, 0.5)'
                      }}
                    >
                      {formatShortDate(dpp.createdAt)}
                    </Typography>
                  </Box>
                  <Button 
                    variant="contained" 
                    size="small" 
                    endIcon={<LaunchIcon />}
                    onClick={() => handleView(`CX:${dpp.manufacturerPartId}:${dpp.partInstanceId}`)}
                  >
                    View
                  </Button>
                </Box>
              </Box>
            </Box>
          ))
        )}
        </Box>
      </Box>

      {/* Carousel Indicators & See All Button */}
      {filteredDpps.length > 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, mt: 2 }}>
          {/* Dot Indicators */}
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              {Array.from({ length: totalPages }).map((_, index) => (
                <Box
                  key={index}
                  sx={{
                    width: index === currentPage ? 24 : 8,
                    height: 8,
                    borderRadius: index === currentPage ? '4px' : '50%',
                    backgroundColor: index === currentPage 
                      ? 'rgba(102, 126, 234, 1)' 
                      : 'rgba(102, 126, 234, 0.3)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: index === currentPage 
                        ? 'rgba(102, 126, 234, 1)' 
                        : 'rgba(102, 126, 234, 0.6)',
                      transform: index === currentPage ? 'scale(1.1)' : 'scale(1.2)',
                    }
                  }}
                  onClick={() => {
                    const clientWidth = carouselRef.current?.clientWidth || 0;
                    const cardWidth = 352;
                    const cardsPerPage = Math.floor(clientWidth / cardWidth);
                    const scrollPosition = index * cardsPerPage * cardWidth;
                    carouselRef.current?.scrollTo({
                      left: scrollPosition,
                      behavior: 'smooth'
                    });
                  }}
                />
              ))}
            </Box>
          )}
          
          {/* See All Button */}
          <Button
            variant="outlined"
            startIcon={<GridViewIcon />}
            onClick={() => setSeeAllDialogOpen(true)}
            sx={{
              ...darkCardStyles.button.outlined,
              px: 4,
              py: 1.5,
              color: '#fff',
              '&:hover': {
                color: '#fff',
                borderColor: 'rgba(102, 126, 234, 0.8)',
              }
            }}
          >
            See All ({filteredDpps.length})
          </Button>
        </Box>
      )}

      {/* See All Dialog */}
      <Dialog
        open={seeAllDialogOpen}
        onClose={() => setSeeAllDialogOpen(false)}
        fullScreen
        PaperProps={{
          sx: {
            ...darkCardStyles.card,
            m: 0,
          }
        }}
      >
        <DialogTitle 
          sx={{ 
            color: '#fff', 
            fontWeight: 600,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            pb: 2,
            pt: 3,
            px: 4,
            background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.05) 100%)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <GridViewIcon sx={{ fontSize: 32, color: '#fff' }} />
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5, color: '#fff' }}>
                All Digital Product Passports
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                {filteredDpps.length} passport{filteredDpps.length !== 1 ? 's' : ''} available
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* View Mode Toggle */}
            <Box 
              sx={{ 
                display: 'flex',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '12px',
                padding: '4px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <Tooltip title="Card View" arrow>
                <IconButton
                  onClick={() => setDialogViewMode('cards')}
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: '8px',
                    color: dialogViewMode === 'cards' ? '#fff' : 'rgba(255, 255, 255, 0.5)',
                    backgroundColor: dialogViewMode === 'cards' ? 'rgba(102, 126, 234, 1)' : 'transparent',
                    transition: 'all 0.3s ease',
                    opacity: dialogViewMode === 'cards' ? 1 : 0.7,
                    '&:hover': {
                      backgroundColor: dialogViewMode === 'cards' 
                        ? 'rgba(102, 126, 234, 1)' 
                        : 'rgba(255, 255, 255, 0.1)',
                      color: '#fff',
                      opacity: 1,
                    }
                  }}
                >
                  <ViewModuleIcon sx={{ fontSize: 20, color: 'white' }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Table View" arrow>
                <IconButton
                  onClick={() => setDialogViewMode('grid')}
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: '8px',
                    color: dialogViewMode === 'grid' ? '#fff' : 'rgba(255, 255, 255, 0.5)',
                    backgroundColor: dialogViewMode === 'grid' ? 'rgba(102, 126, 234, 1)' : 'transparent',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      backgroundColor: dialogViewMode === 'grid' 
                        ? 'rgba(102, 126, 234, 1)' 
                        : 'rgba(255, 255, 255, 0.1)',
                      color: '#fff',
                      opacity: 1,
                    }
                  }}
                >
                  <TableRowsIcon sx={{ fontSize: 20, color: 'white' }} />
                </IconButton>
              </Tooltip>
            </Box>
            <IconButton
              onClick={() => setSeeAllDialogOpen(false)}
              sx={{ 
                color: 'rgba(255, 255, 255, 0.7)', 
                width: 48,
                height: 48,
                '&:hover': { 
                  color: '#fff',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                } 
              }}
            >
              <CloseIcon sx={{ fontSize: 28 }} />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 0, overflow: 'auto', backgroundColor: 'rgba(0, 0, 0, 0.2)' }}>
          {/* Sticky Search Filter */}
          <Box 
            sx={{ 
              position: 'sticky',
              top: 0,
              zIndex: 10,
              backgroundColor: 'rgba(10, 10, 20, 0.95)',
              backdropFilter: 'blur(12px)',
              borderBottom: '1px solid rgba(102, 126, 234, 0.2)',
              py: 3,
              px: 4,
            }}
          >
            <Box sx={{ maxWidth: '1600px', mx: 'auto' }}>
              <TextField
                fullWidth
                placeholder="Search by name, ID, or discovery ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: 'rgba(255, 255, 255, 0.5)' }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  ...darkCardStyles.input,
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '12px',
                    '& fieldset': {
                      borderColor: 'rgba(102, 126, 234, 0.3)',
                    },
                    '&:hover fieldset': {
                      borderColor: 'rgba(102, 126, 234, 0.5)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: 'rgba(102, 126, 234, 0.8)',
                    },
                  },
                  '& .MuiInputBase-input': {
                    color: '#fff',
                    fontSize: '0.95rem',
                  },
                }}
              />
            </Box>
          </Box>

          <Box sx={{ p: 4 }}>
          {dialogViewMode === 'cards' ? (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: 3,
                maxWidth: '1600px',
                mx: 'auto',
              }}
            >
            {filteredDpps.map((dpp) => (
              <Box 
                key={dpp.id}
                sx={{
                  background: 'linear-gradient(135deg, rgba(30, 30, 40, 0.95) 0%, rgba(20, 20, 30, 0.98) 100%)',
                  borderRadius: '16px',
                  border: '1px solid rgba(102, 126, 234, 0.2)',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    transform: 'translateY(-8px) scale(1.02)',
                    boxShadow: '0 20px 40px rgba(102, 126, 234, 0.3)',
                    borderColor: 'rgba(102, 126, 234, 0.5)',
                  }
                }}
                onClick={() => {
                  setSeeAllDialogOpen(false);
                  handleView(`CX:${dpp.manufacturerPartId}:${dpp.partInstanceId}`);
                }}
              >
                {/* Compact Header */}
                <Box sx={{ 
                  p: 2, 
                  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'linear-gradient(90deg, rgba(102, 126, 234, 0.08) 0%, transparent 100%)',
                }}>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <CardChip status={dpp.status} statusText={getStatusLabel(dpp.status)} />
                    <Chip
                      label={getPassportTypeLabel(dpp)}
                      size="small"
                      sx={{
                        backgroundColor: getPassportTypeLabel(dpp) === 'Type' ? 'rgba(156, 39, 176, 0.2)' : 'rgba(33, 150, 243, 0.2)',
                        color: getPassportTypeLabel(dpp) === 'Type' ? '#ce93d8' : '#64b5f6',
                        border: `1px solid ${getPassportTypeLabel(dpp) === 'Type' ? 'rgba(156, 39, 176, 0.4)' : 'rgba(33, 150, 243, 0.4)'}`,
                        fontWeight: 600,
                        fontSize: '0.7rem',
                        height: '24px'
                      }}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                    {(dpp.status === 'draft' || dpp.status === 'pending') && (
                      <Tooltip title="Register" arrow>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            console.log('Register DPP:', dpp.id);
                          }}
                          sx={{ width: 32, height: 32 }}
                        >
                          {dpp.status === 'draft' ? (
                            <CloudUploadIcon sx={{ fontSize: 18, color: 'rgba(79, 172, 254, 0.9)' }} />
                          ) : (
                            <CloudQueueIcon sx={{ fontSize: 18, color: 'rgba(255, 255, 255, 0.5)' }} />
                          )}
                        </IconButton>
                      </Tooltip>
                    )}
                    {(dpp.status === 'active' || dpp.status === 'shared') && (
                      <Tooltip title="Share" arrow>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleShare(dpp.id);
                          }}
                          sx={{ width: 32, height: 32 }}
                        >
                          <IosShareIcon sx={{ fontSize: 18, color: 'white' }} />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title="More options" arrow>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          setAnchorEl(e.currentTarget);
                          setSelectedDppForMenu(dpp);
                        }}
                        sx={{ width: 32, height: 32 }}
                      >
                        <MoreVertIcon sx={{ fontSize: 18, color: 'rgba(255, 255, 255, 0.68)' }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>

                {/* QR Code & Name Section */}
                <Box sx={{ p: 2.5, textAlign: 'center' }}>
                  {dpp.manufacturerPartId && dpp.partInstanceId && (
                    <Box 
                      sx={{ 
                        display: 'inline-flex',
                        backgroundColor: '#fff',
                        padding: '12px',
                        borderRadius: '12px',
                        mb: 2,
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
                      }}
                    >
                      <QRCodeSVG 
                        value={`CX:${dpp.manufacturerPartId}:${dpp.partInstanceId}`}
                        size={120}
                        level="M"
                        includeMargin={false}
                      />
                    </Box>
                  )}
                  
                  <Tooltip title={dpp.name} arrow placement="top">
                    <Typography 
                      variant="h6" 
                      sx={{ 
                        fontWeight: 600,
                        color: '#fff',
                        mb: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        cursor: 'help'
                      }}
                    >
                      {dpp.name}
                    </Typography>
                  </Tooltip>

                  <Box sx={{ 
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    borderRadius: '8px',
                    p: 1.5,
                    mb: 1.5,
                  }}>
                    <Typography 
                      sx={{ 
                        fontSize: '0.65rem', 
                        color: 'rgba(255,255,255,0.5)', 
                        fontWeight: 600, 
                        textTransform: 'uppercase', 
                        letterSpacing: '1px', 
                        mb: 0.5,
                      }}
                    >
                      Discovery ID
                    </Typography>
                    <Tooltip title={dpp.manufacturerPartId && dpp.partInstanceId ? `CX:${dpp.manufacturerPartId}:${dpp.partInstanceId}` : 'N/A'} arrow>
                      <Typography 
                        sx={{ 
                          fontFamily: 'Monaco, "Lucida Console", monospace',
                          fontSize: '0.7rem',
                          color: 'rgba(102, 126, 234, 1)',
                          fontWeight: 600,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          cursor: 'help'
                        }}
                      >
                        {dpp.manufacturerPartId && dpp.partInstanceId 
                          ? `CX:${dpp.manufacturerPartId}:${dpp.partInstanceId}`
                          : 'N/A'
                        }
                      </Typography>
                    </Tooltip>
                  </Box>

                  {dpp.passportIdentifier && (
                    <Box 
                      sx={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '8px',
                        p: 1.5,
                        mb: 1.5,
                      }}
                    >
                      <Typography 
                        sx={{ 
                          fontSize: '0.65rem', 
                          color: 'rgba(255,255,255,0.5)', 
                          fontWeight: 600, 
                          textTransform: 'uppercase', 
                          letterSpacing: '1px', 
                          mb: 0.5,
                        }}
                      >
                        Passport ID
                      </Typography>
                      <Tooltip title={dpp.passportIdentifier} arrow>
                        <Typography 
                          sx={{ 
                            fontFamily: 'Monaco, "Lucida Console", monospace',
                            fontSize: '0.7rem',
                            color: 'rgba(255, 255, 255, 0.8)',
                            fontWeight: 500,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            cursor: 'help'
                          }}
                        >
                          {dpp.passportIdentifier}
                        </Typography>
                      </Tooltip>
                    </Box>
                  )}

                  {/* Passport Type and Expiration */}
                  <Box sx={{ display: 'flex', gap: 1.5 }}>
                    <Box 
                      sx={{ 
                        flex: 1,
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '8px',
                        p: 1.5,
                      }}
                    >
                      <Typography 
                        sx={{ 
                          fontSize: '0.65rem', 
                          color: 'rgba(255,255,255,0.5)', 
                          fontWeight: 600, 
                          textTransform: 'uppercase', 
                          letterSpacing: '1px', 
                          mb: 0.5,
                        }}
                      >
                        Type
                      </Typography>
                      <Tooltip title={getPassportType(dpp.semanticId)} arrow>
                        <Typography 
                          sx={{ 
                            fontSize: '0.7rem',
                            color: 'rgba(255, 255, 255, 0.8)',
                            fontWeight: 500,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            cursor: 'help'
                          }}
                        >
                          {getPassportType(dpp.semanticId)}
                        </Typography>
                      </Tooltip>
                    </Box>
                    <Box 
                      sx={{ 
                        flex: 1,
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '8px',
                        p: 1.5,
                      }}
                    >
                      <Typography 
                        sx={{ 
                          fontSize: '0.65rem', 
                          color: 'rgba(255,255,255,0.5)', 
                          fontWeight: 600, 
                          textTransform: 'uppercase', 
                          letterSpacing: '1px', 
                          mb: 0.5,
                        }}
                      >
                        Expires
                      </Typography>
                      <Typography 
                        sx={{ 
                          fontSize: '0.7rem',
                          color: dpp.expirationDate ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.5)',
                          fontWeight: 500,
                        }}
                      >
                        {dpp.expirationDate ? formatShortDate(dpp.expirationDate) : 'No Expiration'}
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                {/* Compact Footer */}
                <Box 
                  sx={{ 
                    px: 2.5,
                    py: 1.5,
                    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                    display: 'flex', 
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'rgba(0, 0, 0, 0.2)',
                  }}
                >
                  <Box>
                    <Typography
                      sx={{
                        fontSize: '0.7rem',
                        color: 'rgba(79, 172, 254, 0.9)',
                        fontWeight: 600,
                        letterSpacing: '0.5px',
                      }}
                    >
                      v{getVersionDisplay(dpp.version)}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: '0.65rem',
                        color: 'rgba(255, 255, 255, 0.4)'
                      }}
                    >
                      {formatShortDate(dpp.createdAt)}
                    </Typography>
                  </Box>
                  <Button 
                    variant="contained" 
                    size="small" 
                    endIcon={<LaunchIcon sx={{ fontSize: 14 }} />}
                    sx={{
                      fontSize: '0.75rem',
                      py: 0.5,
                      px: 2,
                      background: 'linear-gradient(135deg, rgba(102, 126, 234, 1) 0%, rgba(118, 75, 162, 0.9) 100%)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.9) 0%, rgba(118, 75, 162, 1) 100%)',
                      }
                    }}
                  >
                    Open
                  </Button>
                </Box>
              </Box>
            ))}
            </Box>
          ) : (
            /* Table View */
            <Box sx={{ maxWidth: '1600px', mx: 'auto' }}>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                }}
              >
                {filteredDpps.map((dpp) => (
                  <Box
                    key={dpp.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 3,
                      p: 2.5,
                      background: 'linear-gradient(135deg, rgba(30, 30, 40, 0.95) 0%, rgba(20, 20, 30, 0.98) 100%)',
                      borderRadius: '12px',
                      border: '1px solid rgba(102, 126, 234, 0.2)',
                      cursor: 'pointer',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: '0 8px 24px rgba(102, 126, 234, 0.3)',
                        borderColor: 'rgba(102, 126, 234, 0.5)',
                      }
                    }}
                    onClick={() => {
                      setSeeAllDialogOpen(false);
                      handleView(`CX:${dpp.manufacturerPartId}:${dpp.partInstanceId}`);
                    }}
                  >
                    {/* QR Code */}
                    {dpp.manufacturerPartId && dpp.partInstanceId && (
                      <Box 
                        sx={{ 
                          flexShrink: 0,
                          backgroundColor: '#fff',
                          padding: '8px',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
                        }}
                      >
                        <QRCodeSVG 
                          value={`CX:${dpp.manufacturerPartId}:${dpp.partInstanceId}`}
                          size={60}
                          level="M"
                          includeMargin={false}
                        />
                      </Box>
                    )}

                    {/* Main Info */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                        <Typography 
                          variant="h6" 
                          sx={{ 
                            fontWeight: 600,
                            color: '#fff',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {dpp.name}
                        </Typography>
                        <CardChip status={dpp.status} statusText={getStatusLabel(dpp.status)} />
                        <Chip
                          label={getPassportTypeLabel(dpp)}
                          size="small"
                          sx={{
                            backgroundColor: getPassportTypeLabel(dpp) === 'Type' ? 'rgba(156, 39, 176, 0.2)' : 'rgba(33, 150, 243, 0.2)',
                            color: getPassportTypeLabel(dpp) === 'Type' ? '#ce93d8' : '#64b5f6',
                            border: `1px solid ${getPassportTypeLabel(dpp) === 'Type' ? 'rgba(156, 39, 176, 0.4)' : 'rgba(33, 150, 243, 0.4)'}`,
                            fontWeight: 600,
                            fontSize: '0.65rem',
                            height: '22px'
                          }}
                        />
                      </Box>
                      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                        <Box>
                          <Typography 
                            sx={{ 
                              fontSize: '0.65rem', 
                              color: 'rgba(255,255,255,0.5)', 
                              fontWeight: 600, 
                              textTransform: 'uppercase', 
                              letterSpacing: '1px', 
                              mb: 0.3,
                            }}
                          >
                            Discovery ID
                          </Typography>
                          <Typography 
                            sx={{ 
                              fontFamily: 'Monaco, "Lucida Console", monospace',
                              fontSize: '0.75rem',
                              color: 'rgba(102, 126, 234, 1)',
                              fontWeight: 600,
                            }}
                          >
                            {dpp.manufacturerPartId && dpp.partInstanceId 
                              ? `CX:${dpp.manufacturerPartId}:${dpp.partInstanceId}`
                              : 'N/A'
                            }
                          </Typography>
                        </Box>
                        {dpp.passportIdentifier && (
                          <Box>
                            <Typography 
                              sx={{ 
                                fontSize: '0.65rem', 
                                color: 'rgba(255,255,255,0.5)', 
                                fontWeight: 600, 
                                textTransform: 'uppercase', 
                                letterSpacing: '1px', 
                                mb: 0.3,
                              }}
                            >
                              Passport ID
                            </Typography>
                            <Typography 
                              sx={{ 
                                fontFamily: 'Monaco, "Lucida Console", monospace',
                                fontSize: '0.75rem',
                                color: 'rgba(255, 255, 255, 0.8)',
                                fontWeight: 500,
                              }}
                            >
                              {dpp.passportIdentifier}
                            </Typography>
                          </Box>
                        )}
                        <Box>
                          <Typography 
                            sx={{ 
                              fontSize: '0.65rem', 
                              color: 'rgba(255,255,255,0.5)', 
                              fontWeight: 600, 
                              textTransform: 'uppercase', 
                              letterSpacing: '1px', 
                              mb: 0.3,
                            }}
                          >
                            Version
                          </Typography>
                          <Typography 
                            sx={{ 
                              fontSize: '0.75rem',
                              color: 'rgba(79, 172, 254, 0.9)',
                              fontWeight: 600,
                            }}
                          >
                            v{getVersionDisplay(dpp.version)}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography 
                            sx={{ 
                              fontSize: '0.65rem', 
                              color: 'rgba(255,255,255,0.5)', 
                              fontWeight: 600, 
                              textTransform: 'uppercase', 
                              letterSpacing: '1px', 
                              mb: 0.3,
                            }}
                          >
                            Created
                          </Typography>
                          <Typography 
                            sx={{ 
                              fontSize: '0.75rem',
                              color: 'rgba(255, 255, 255, 0.7)',
                            }}
                          >
                            {formatShortDate(dpp.createdAt)}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>

                    {/* Actions */}
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexShrink: 0 }}>
                      {(dpp.status === 'draft' || dpp.status === 'pending') && (
                        <Tooltip title="Register" arrow>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              console.log('Register DPP:', dpp.id);
                            }}
                            sx={{ width: 36, height: 36 }}
                          >
                            {dpp.status === 'draft' ? (
                              <CloudUploadIcon sx={{ fontSize: 20, color: 'rgba(79, 172, 254, 0.9)' }} />
                            ) : (
                              <CloudQueueIcon sx={{ fontSize: 20, color: 'rgba(255, 255, 255, 0.5)' }} />
                            )}
                          </IconButton>
                        </Tooltip>
                      )}
                      {dpp.status !== 'draft' && dpp.status !== 'pending' && (
                        <Tooltip title="Share" arrow>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleShare(dpp.id);
                            }}
                            sx={{ width: 36, height: 36 }}
                          >
                            <IosShareIcon sx={{ fontSize: 20, color: 'white' }} />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="More options" arrow>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            setAnchorEl(e.currentTarget);
                            setSelectedDppForMenu(dpp);
                          }}
                          sx={{ width: 36, height: 36 }}
                        >
                          <MoreVertIcon sx={{ fontSize: 20, color: 'rgba(255, 255, 255, 0.68)' }} />
                        </IconButton>
                      </Tooltip>
                      <Button 
                        variant="contained" 
                        size="small" 
                        endIcon={<LaunchIcon sx={{ fontSize: 14 }} />}
                        sx={{
                          fontSize: '0.75rem',
                          py: 0.75,
                          px: 2.5,
                          ml: 1,
                          background: 'linear-gradient(135deg, rgba(102, 126, 234, 1) 0%, rgba(118, 75, 162, 0.9) 100%)',
                          '&:hover': {
                            background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.9) 0%, rgba(118, 75, 162, 1) 100%)',
                          }
                        }}
                      >
                        Open
                      </Button>
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
          )}
          </Box>
        </DialogContent>
      </Dialog>

      {/* More Options Menu */}
      <Menu
        anchorEl={anchorEl}
        open={openMenu}
        onClose={() => {
          setAnchorEl(null);
          setSelectedDppForMenu(null);
        }}
        MenuListProps={{ 'aria-labelledby': 'more-options-button' }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{ sx: { backgroundColor: 'white !important' } }}
      >
        {selectedDppForMenu && (
          <>
            <MenuItem
              onClick={() => {
                if (sharedDpps.has(selectedDppForMenu.id)) {
                  handleUnshare(selectedDppForMenu.id);
                } else {
                  handleShare(selectedDppForMenu.id);
                }
                setAnchorEl(null);
                setSelectedDppForMenu(null);
              }}
              disabled={sharingInProgress.has(selectedDppForMenu.id)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                padding: '4px 16px',
                '&:hover': { backgroundColor: '#f5f5f5' }
              }}
            >
              {sharingInProgress.has(selectedDppForMenu.id) ? (
                <CircularProgress size={16} sx={{ marginRight: 1 }} />
              ) : sharedDpps.has(selectedDppForMenu.id) ? (
                <ShareIcon fontSize="small" sx={{ marginRight: 1, color: '#000000 !important', fill: '#000000 !important' }} />
              ) : (
                <IosShareIcon fontSize="small" sx={{ marginRight: 1, color: '#000000 !important', fill: '#000000 !important' }} />
              )}
              <Box component="span" sx={{ fontSize: '0.875rem', color: 'black' }}>
                {sharingInProgress.has(selectedDppForMenu.id) 
                  ? 'Processing...' 
                  : sharedDpps.has(selectedDppForMenu.id) 
                  ? 'Unshare passport' 
                  : 'Share passport'}
              </Box>
            </MenuItem>
            <MenuItem
              onClick={() => {
                handleCopyPassportId(selectedDppForMenu.id);
              }}
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '4px 16px',
                cursor: 'pointer',
                backgroundColor: copySuccess[selectedDppForMenu.id] ? '#4caf50 !important' : 'transparent',
                transition: 'background-color 0.3s ease',
                '&:hover': {
                  backgroundColor: copySuccess[selectedDppForMenu.id] ? '#4caf50 !important' : '#f5f5f5'
                }
              }}
            >
              {copySuccess[selectedDppForMenu.id] ? (
                <CheckCircleIcon
                  fontSize="small"
                  sx={{ color: 'white !important', fill: 'white !important', marginRight: 1 }}
                />
              ) : (
                <ContentCopyIcon
                  fontSize="small"
                  sx={{ marginRight: 1, color: '#000000 !important', fill: '#000000 !important' }}
                />
              )}
              <Box component="span" sx={{
                fontSize: '0.875rem',
                color: copySuccess[selectedDppForMenu.id] ? 'white' : 'black',
                transition: 'color 0.3s ease'
              }}>
                {copySuccess[selectedDppForMenu.id] ? 'Copied!' : 'Copy Discovery ID'}
              </Box>
            </MenuItem>
            <MenuItem
              onClick={async () => {
                await handleExportPDF(selectedDppForMenu);
                setAnchorEl(null);
                setSelectedDppForMenu(null);
              }}
              sx={{
                display: 'flex',
                alignItems: 'center',
                padding: '4px 16px',
                '&:hover': { backgroundColor: '#f5f5f5' }
              }}
            >
              <PictureAsPdfIcon fontSize="small" sx={{ marginRight: 1, color: '#000000 !important', fill: '#000000 !important' }} />
              <Box component="span" sx={{ fontSize: '0.875rem', color: 'black' }}>
                Export PDF
              </Box>
            </MenuItem>
            <MenuItem
              onClick={() => {
                handleDeleteClick(selectedDppForMenu);
                setAnchorEl(null);
                setSelectedDppForMenu(null);
              }}
              sx={{
                display: 'flex',
                alignItems: 'center',
                padding: '4px 16px',
                '&:hover': { backgroundColor: '#f5f5f5' }
              }}
            >
              <DeleteIcon fontSize="small" sx={{ marginRight: 1, color: '#000000 !important', fill: '#000000 !important' }} />
              <Box component="span" sx={{ fontSize: '0.875rem', color: 'black' }}>
                Delete passport
              </Box>
            </MenuItem>
          </>
        )}
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => !isDeleting && setDeleteDialogOpen(false)}
        PaperProps={{
          sx: {
            ...darkCardStyles.card,
            maxWidth: '400px'
          }
        }}
      >
        <DialogTitle sx={{ color: '#fff', fontWeight: 600 }}>
          Delete Digital Product Passport
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
            Are you sure you want to delete "{dppToDelete?.name}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button
            onClick={() => setDeleteDialogOpen(false)}
            disabled={isDeleting}
            sx={darkCardStyles.button.outlined}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            disabled={isDeleting}
            sx={{
              ...darkCardStyles.button.primary,
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)'
              }
            }}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default PassportProvisionList;
