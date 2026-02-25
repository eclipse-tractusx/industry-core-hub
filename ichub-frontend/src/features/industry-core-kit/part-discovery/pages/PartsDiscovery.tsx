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

/** Created using an LLM (Github Copilot) review by a human committer */

import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Grid2,
  Typography,
  TextField,
  Button,
  useTheme,
  useMediaQuery,
  IconButton,
  Alert,
  CircularProgress,
  Card,
  Chip
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import SearchLoading from '@/features/industry-core-kit/part-discovery/components/search/SearchLoading';
import { CatalogPartsDiscovery } from '@/features/industry-core-kit/part-discovery/components/catalog-parts/CatalogPartsDiscovery';
import PartsDiscoverySidebar from '@/features/industry-core-kit/part-discovery/components/search/PartsDiscoverySidebar';
import SerializedPartsTable from '@/features/industry-core-kit/part-discovery/components/serialized-parts/SerializedPartsTable';
import { SingleTwinResult } from '@/features/industry-core-kit/part-discovery/components/single-twin/SingleTwinResult';
import { useAdditionalSidebar } from '@/hooks/useAdditionalSidebar';
import { 
  discoverShellsWithCustomQuery,
  discoverSingleShell,
  ShellDiscoveryPaginator,
  SingleShellDiscoveryResponse 
} from '@/features/industry-core-kit/part-discovery/api';
import { 
  ShellDiscoveryResponse, 
  AASData,
  getAASDataSummary
} from '@/features/industry-core-kit/part-discovery/utils/utils';
import { fetchPartners } from '@/features/business-partner-kit/partner-management/api';
import { PartnerInstance } from '@/features/business-partner-kit/partner-management/types/types';
import { PartnerAutocomplete } from '@/features/business-partner-kit/partner-management/components';

interface PartCardData {
  id: string;
  manufacturerId: string;
  manufacturerPartId: string;
  customerPartId?: string;
  name?: string;
  category?: string;
  digitalTwinType: string;
  globalAssetId: string;
  submodelCount: number;
  dtrIndex?: number; // DTR index for display
  idShort?: string; // Optional idShort from AAS data
  rawTwinData?: AASData; // Raw AAS/shell data for download
}

interface SerializedPartData {
  id: string;
  globalAssetId: string;
  aasId: string; // AAS Shell ID
  manufacturerId: string;
  manufacturerPartId: string;
  customerPartId?: string;
  partInstanceId?: string; // Part Instance ID
  digitalTwinType: string;
  submodelCount: number;
  dtrIndex?: number; // DTR index for display
  idShort?: string; // Optional idShort from AAS data
  rawTwinData?: AASData; // Raw AAS/shell data for download
}

// Helper function to create a map from shell ID to DTR index
const createShellToDtrMap = (dtrs: Array<Record<string, unknown> & { shells?: string[] }>): Map<string, number> => {
  const shellToDtrMap = new Map<string, number>();
  dtrs.forEach((dtr, dtrIndex) => {
    if (dtr.shells && Array.isArray(dtr.shells)) {
      dtr.shells.forEach((shellId: string) => {
        shellToDtrMap.set(shellId, dtrIndex);
      });
    }
  });
  return shellToDtrMap;
};

// Helper function to get consistent colors for DTR identifiers
const getDtrColor = (dtrIndex: number) => {
  const baseColors = [
    { bg: 'rgba(76, 175, 80, 0.9)', color: 'white', light: 'rgba(76, 175, 80, 0.1)', border: 'rgba(76, 175, 80, 0.3)' }, // Green
    { bg: 'rgba(33, 150, 243, 0.9)', color: 'white', light: 'rgba(33, 150, 243, 0.1)', border: 'rgba(33, 150, 243, 0.3)' }, // Blue
    { bg: 'rgba(255, 152, 0, 0.9)', color: 'white', light: 'rgba(255, 152, 0, 0.1)', border: 'rgba(255, 152, 0, 0.3)' }, // Orange
    { bg: 'rgba(156, 39, 176, 0.9)', color: 'white', light: 'rgba(156, 39, 176, 0.1)', border: 'rgba(156, 39, 176, 0.3)' }, // Purple
    { bg: 'rgba(244, 67, 54, 0.9)', color: 'white', light: 'rgba(244, 67, 54, 0.1)', border: 'rgba(244, 67, 54, 0.3)' }, // Red
    { bg: 'rgba(0, 188, 212, 0.9)', color: 'white', light: 'rgba(0, 188, 212, 0.1)', border: 'rgba(0, 188, 212, 0.3)' }, // Cyan
    { bg: 'rgba(139, 195, 74, 0.9)', color: 'white', light: 'rgba(139, 195, 74, 0.1)', border: 'rgba(139, 195, 74, 0.3)' }, // Light Green
    { bg: 'rgba(121, 85, 72, 0.9)', color: 'white', light: 'rgba(121, 85, 72, 0.1)', border: 'rgba(121, 85, 72, 0.3)' }, // Brown
  ];
  
  const colorIndex = dtrIndex % baseColors.length;
  const variation = Math.floor(dtrIndex / baseColors.length);
  
  // For DTRs beyond 8, add opacity variations to distinguish them
  const baseColor = baseColors[colorIndex];
  const opacity = Math.max(0.7, 1 - (variation * 0.1)); // Gradually reduce opacity
  
  return {
    bg: baseColor.bg.replace('0.9)', `${opacity})`),
    color: baseColor.color,
    light: baseColor.light,
    border: baseColor.border
  };
};

const PartsDiscovery = () => {
  const { showSidebar, hideSidebar, isVisible } = useAdditionalSidebar();
  
  // Ref to prevent duplicate API calls in React StrictMode
  const partnersLoadedRef = useRef(false);
  
  const [partType, setPartType] = useState('Catalog');
  const [bpnl, setBpnl] = useState('');
  const [selectedPartner, setSelectedPartner] = useState<PartnerInstance | null>(null);
  const [availablePartners, setAvailablePartners] = useState<PartnerInstance[]>([]);
  const [isLoadingPartners, setIsLoadingPartners] = useState(false);
  const [partnersError, setPartnersError] = useState<string | null>(null);
  const [globalAssetId, setGlobalAssetId] = useState('');
  const [customerPartId, setCustomerPartId] = useState('');
  const [manufacturerPartId, setManufacturerPartId] = useState('');
  const [partInstanceId, setPartInstanceId] = useState('');
  const [pageLimit, setPageLimit] = useState<number>(10);
  const [customLimit, setCustomLimit] = useState<string>('');
  const [isCustomLimit, setIsCustomLimit] = useState<boolean>(false);
  
  // Single Twin Search Mode
  const [searchMode, setSearchMode] = useState<'discovery' | 'single' | 'view'>('discovery');
  const [singleTwinAasId, setSingleTwinAasId] = useState('');
  const [singleTwinResult, setSingleTwinResult] = useState<SingleShellDiscoveryResponse | null>(null);
  
  // Twin View Mode (for viewing existing twin data)
  const [viewingTwin, setViewingTwin] = useState<SingleShellDiscoveryResponse | null>(null);
  
  // DTR Section Visibility
  const [dtrSectionVisible, setDtrSectionVisible] = useState(false);
  
  // DTR carousel state
  const [dtrCarouselIndex, setDtrCarouselIndex] = useState(0);
  
  // DTR copy states
  const [copiedAssetId, setCopiedAssetId] = useState<string | null>(null);
  const [copiedConnectorUrl, setCopiedConnectorUrl] = useState<string | null>(null);
  
  // Results and pagination
  const [partTypeCards, setPartTypeCards] = useState<PartCardData[]>([]);
  const [serializedParts, setSerializedParts] = useState<SerializedPartData[]>([]);
  const [currentResponse, setCurrentResponse] = useState<ShellDiscoveryResponse | null>(null);
  const [paginator, setPaginator] = useState<ShellDiscoveryPaginator | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  
  // Loading and error states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearchCompleted, setIsSearchCompleted] = useState<boolean>(false);
  const [showSearchLoading, setShowSearchLoading] = useState<boolean>(false);
  const [searchKey, setSearchKey] = useState<number>(0); // Force SearchLoading component reset
  const completionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // AbortController for cancelling requests
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Cleanup timeout and abort controller on component unmount
  useEffect(() => {
    const abortController = abortControllerRef.current;
    return () => {
      if (completionTimeoutRef.current) {
        clearTimeout(completionTimeoutRef.current);
      }
      if (abortController) {
        abortController.abort();
      }
    };
  }, []);
  
  // Pagination loading states
  const [isLoadingNext, setIsLoadingNext] = useState(false);
  const [isLoadingPrevious, setIsLoadingPrevious] = useState(false);

  // Responsive design hooks
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // DTR carousel configuration
  const dtrItemsPerSlide = isMobile ? 1 : 2;
  const isSingleDtr = currentResponse?.dtrs.length === 1;
  
  // DTR carousel navigation functions
  const handleDtrPrevious = () => {
    setDtrCarouselIndex(prev => Math.max(0, prev - dtrItemsPerSlide));
  };

  const handleDtrNext = () => {
    if (currentResponse?.dtrs) {
      const maxIndex = Math.max(0, currentResponse.dtrs.length - dtrItemsPerSlide);
      setDtrCarouselIndex(prev => Math.min(maxIndex, prev + dtrItemsPerSlide));
    }
  };

  // Reset DTR carousel when DTRs change
  useEffect(() => {
    setDtrCarouselIndex(0);
  }, [currentResponse?.dtrs]);

  // Copy functions for DTR data
  const handleCopyAssetId = async (assetId: string, dtrIndex: number) => {
    try {
      await navigator.clipboard.writeText(assetId);
      setCopiedAssetId(`${dtrIndex}-${assetId}`);
      setTimeout(() => setCopiedAssetId(null), 2000);
    } catch (err) {
      console.error('Failed to copy asset ID:', err);
    }
  };

  const handleCopyConnectorUrl = async (connectorUrl: string, dtrIndex: number) => {
    try {
      await navigator.clipboard.writeText(connectorUrl);
      setCopiedConnectorUrl(`${dtrIndex}-${connectorUrl}`);
      setTimeout(() => setCopiedConnectorUrl(null), 2000);
    } catch (err) {
      console.error('Failed to copy connector URL:', err);
    }
  };

  // Show sidebar when in discovery mode and not searched
  useEffect(() => {
    if (searchMode === 'discovery' && !hasSearched) {
      showSidebar(
        <PartsDiscoverySidebar
          partType={partType}
          onPartTypeChange={handlePartTypeChange}
          pageLimit={pageLimit}
          onPageLimitChange={setPageLimit}
          customLimit={customLimit}
          onCustomLimitChange={setCustomLimit}
          isCustomLimit={isCustomLimit}
          onIsCustomLimitChange={setIsCustomLimit}
          customerPartId={customerPartId}
          onCustomerPartIdChange={setCustomerPartId}
          manufacturerPartId={manufacturerPartId}
          onManufacturerPartIdChange={setManufacturerPartId}
          globalAssetId={globalAssetId}
          onGlobalAssetIdChange={setGlobalAssetId}
          partInstanceId={partInstanceId}
          onPartInstanceIdChange={setPartInstanceId}
        />
      );
    } else {
      hideSidebar();
    }
  }, [searchMode, hasSearched, partType, pageLimit, customLimit, isCustomLimit, customerPartId, manufacturerPartId, globalAssetId, partInstanceId, showSidebar, hideSidebar]);

  // Cleanup: Hide sidebar when component unmounts (navigation away from PartsDiscovery)
  useEffect(() => {
    return () => {
      hideSidebar();
    };
  }, [hideSidebar]);

  // Load available partners on component mount
  useEffect(() => {
    const loadPartners = async () => {
      // Prevent duplicate calls in React StrictMode
      if (partnersLoadedRef.current) {
        return;
      }
      partnersLoadedRef.current = true;
      
      try {
        setIsLoadingPartners(true);
        setPartnersError(null);
        const partners = await fetchPartners();
        setAvailablePartners(partners);
      } catch (err) {
        console.error('Error loading partners:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to load partners. Backend may be unavailable.';
        setPartnersError(errorMessage);
        // Set empty array to ensure component remains functional even when backend is down
        setAvailablePartners([]);
        // Reset the ref on error so it can be retried
        partnersLoadedRef.current = false;
      } finally {
        setIsLoadingPartners(false);
      }
    };

    loadPartners();
  }, []);

  // Helper function to get company name from BPNL
  const getCompanyName = (bpnlValue: string): string => {
    const partner = availablePartners.find(p => p.bpnl === bpnlValue);
    return partner?.name || bpnlValue;
  };

  // Handle part type change and clear Part Instance ID when switching to Part
  const handlePartTypeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newPartType = event.target.value;
    setPartType(newPartType);
    
    // Clear Part Instance ID when switching to Part Type
    if (newPartType === 'Catalog') {
      setPartInstanceId('');
    }
  };

  // Retry loading partners
  const retryLoadPartners = async () => {
    partnersLoadedRef.current = false;
    setPartnersError(null);
    
    try {
      setIsLoadingPartners(true);
      const partners = await fetchPartners();
      setAvailablePartners(partners);
      partnersLoadedRef.current = true;
    } catch (err) {
      console.error('Error retrying partners load:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load partners. Backend may be unavailable.';
      setPartnersError(errorMessage);
      setAvailablePartners([]);
    } finally {
      setIsLoadingPartners(false);
    }
  };

  // Function to start loading state
  const startLoadingProgress = () => {
    
    
    // Clear any existing completion timeout
    if (completionTimeoutRef.current) {
      
      clearTimeout(completionTimeoutRef.current);
      completionTimeoutRef.current = null;
    }
    
    setSearchKey(prev => prev + 1); // Force SearchLoading component to reset
    setIsLoading(true);
    setShowSearchLoading(true);
    setIsSearchCompleted(false);
    
    // Return completion function that handles successful or failed completion
    return (isError: boolean = false) => {
      if (isError) {
        
        // For errors, reset immediately without showing completion
        setIsLoading(false);
        setShowSearchLoading(false);
        setIsSearchCompleted(false);
      } else {
        
        // For successful completion, show completion state briefly before changing view
        setIsLoading(false); // Hide button spinner immediately
        setIsSearchCompleted(true);
        
        // Show completion animation for 200ms, then change to results view
        completionTimeoutRef.current = setTimeout(() => {
          
          setHasSearched(true); // This triggers the view change to show results
          setShowSearchLoading(false);
          // Reset completion state after component is hidden
          setTimeout(() => {
            setIsSearchCompleted(false);
          }, 100);
          completionTimeoutRef.current = null;
        }, 200); // Show completion state for 200ms before view change
      }
    };
  };

  // Function to cancel ongoing search
  const handleCancelSearch = () => {
    
    
    // Abort the ongoing request
    if (abortControllerRef.current) {
      
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    // Clear completion timeout
    if (completionTimeoutRef.current) {
      clearTimeout(completionTimeoutRef.current);
      completionTimeoutRef.current = null;
    }
    
    // Reset all loading states
    setIsLoading(false);
    setShowSearchLoading(false);
    setIsSearchCompleted(false);
  };

  // Helper function to display filters sidebar
  const handleDisplayFilters = () => {
    showSidebar(
      <PartsDiscoverySidebar
        partType={partType}
        onPartTypeChange={handlePartTypeChange}
        pageLimit={pageLimit}
        onPageLimitChange={setPageLimit}
        customLimit={customLimit}
        onCustomLimitChange={setCustomLimit}
        isCustomLimit={isCustomLimit}
        onIsCustomLimitChange={setIsCustomLimit}
        customerPartId={customerPartId}
        onCustomerPartIdChange={setCustomerPartId}
        manufacturerPartId={manufacturerPartId}
        onManufacturerPartIdChange={setManufacturerPartId}
        globalAssetId={globalAssetId}
        onGlobalAssetIdChange={setGlobalAssetId}
        partInstanceId={partInstanceId}
        onPartInstanceIdChange={setPartInstanceId}
      />
    );
  };

  // Handle single twin search
  const handleSingleTwinSearch = async () => {
    if (!bpnl.trim()) {
      setError('Please enter a partner BPNL');
      return;
    }
    
    if (!singleTwinAasId.trim()) {
      setError('Please enter an AAS ID');
      return;
    }

    setError(null);
    setSingleTwinResult(null);
    
    try {
      // Start loading progress and make API call
      const stopProgress = startLoadingProgress();
      
      // Create AbortController for this request
      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      
      try {
        const response = await discoverSingleShell(bpnl, singleTwinAasId.trim(), abortController.signal);
        
        
        setSingleTwinResult(response);
        // Success - trigger completion animation and then view change
        stopProgress();
      } catch (searchError) {
        console.error('❌ Single twin search error:', searchError);
        
        // Check if the error is due to cancellation
        if (searchError instanceof Error && searchError.name === 'AbortError') {
          
          return; // Don't show error or reset state for cancelled requests
        }
        
        // Error - reset immediately
        stopProgress(true);
        throw searchError; // Re-throw to be caught by outer catch
      } finally {
        // Clear the abort controller reference when request completes
        if (abortControllerRef.current === abortController) {
          abortControllerRef.current = null;
        }
      }
    } catch (err) {
      // Check if the error is due to request cancellation
      if (err instanceof Error && err.name === 'AbortError') {
        
        return; // Don't show error for cancelled requests
      }
      
      let errorMessage = 'Failed to discover digital twin';
      
      if (err instanceof Error) {
        errorMessage = `Single twin search failed: ${err.message}`;
      } else if (typeof err === 'string') {
        errorMessage = `Single twin search failed: ${err}`;
      } else if (err && typeof err === 'object') {
        if ('response' in err && err.response && typeof err.response === 'object' && 'data' in err.response) {
          const responseData = err.response.data as Record<string, unknown>;
          if (typeof responseData.message === 'string') {
            errorMessage = `Single twin search failed: ${responseData.message}`;
          }
        } else if ('message' in err) {
          const errWithMessage = err as { message: string };
          errorMessage = `Single twin search failed: ${errWithMessage.message}`;
        }
      }
      
      setError(errorMessage);
      // Note: stopProgress(true) was already called in the try-catch above
    } finally {
      // Note: setIsLoading and setShowSearchLoading are now handled by stopProgress
    }
  };

  // Helper function to generate active filter chips - scalable for future filters
  const getActiveFilterChips = () => {
    const filters = [
      {
        value: customerPartId,
        label: 'Customer Part ID',
        tooltip: 'Customer Part ID'
      },
      {
        value: manufacturerPartId,
        label: 'Manufacturer Part ID',
        tooltip: 'Manufacturer Part ID'
      },
      {
        value: globalAssetId,
        label: 'Global Asset ID',
        tooltip: 'Global Asset ID'
      },
      // Only show Part Instance ID filter when Part Instance is selected
      ...(partType === 'Serialized' ? [{
        value: partInstanceId,
        label: 'Part Instance ID',
        tooltip: 'Part Instance Identifier'
      }] : [])
      // Future filters can be easily added here:
      // {
      //   value: someNewFilter,
      //   label: 'New Filter Name',
      //   tooltip: 'New Filter Description'
      // }
    ];

    return filters
      .filter(filter => filter.value && filter.value.trim())
      .map((filter, index) => {
        return (
          <Chip 
            key={`filter-${filter.label}-${index}`}
            label={
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography component="span" sx={{ fontSize: 'inherit', color: 'inherit' }}>
                  {filter.label}: 
                </Typography>
                <Typography component="span" sx={{ fontSize: 'inherit', fontWeight: '700', ml: 0.5, color: 'inherit' }}>
                  {filter.value}
                </Typography>
              </Box>
            } 
            size="medium" 
            color="primary" 
            variant="filled"
            title={`${filter.tooltip}: ${filter.value}`}
            sx={{
              backgroundColor: 'rgba(25, 118, 210, 0.1)',
              color: '#1976d2',
              border: '1px solid rgba(25, 118, 210, 0.3)',
              borderRadius: '20px',
              fontSize: '0.85rem',
              fontWeight: '500',
              px: 2,
              py: 0.5,
              height: 'auto',
              minHeight: '32px',
              maxWidth: '100%',
              '& .MuiChip-label': {
                px: 1,
                py: 0.5,
                whiteSpace: 'nowrap',
                overflow: 'visible',
                textOverflow: 'unset'
              },
              '&:hover': {
                backgroundColor: 'rgba(25, 118, 210, 0.15)',
                borderColor: 'rgba(25, 118, 210, 0.5)',
                transform: 'translateY(-1px)',
                boxShadow: '0 4px 12px rgba(25, 118, 210, 0.2)'
              },
              transition: 'all 0.2s ease-in-out'
            }}
          />
        );
      });
  };

  // Convert AAS data to card format
  const convertToPartCards = (shells: AASData[], shellToDtrMap?: Map<string, number>): PartCardData[] => {
    return shells.map(shell => {
      const summary = getAASDataSummary(shell);
      const dtrIndex = shellToDtrMap?.get(shell.id);
      return {
        id: shell.id,
        manufacturerId: summary.manufacturerId || 'Unknown',
        manufacturerPartId: summary.manufacturerPartId || 'Unknown',
        customerPartId: summary.customerPartId || undefined,
        name: `${summary.manufacturerPartId}`,
        category: summary.customerPartId || undefined,
        digitalTwinType: summary.digitalTwinType || 'Unknown',
        globalAssetId: shell.globalAssetId,
        submodelCount: summary.submodelCount,
        dtrIndex,
        idShort: shell.idShort, // Include idShort from AAS data
        rawTwinData: shell
      };
    });
  };

  // Convert AAS data to serialized parts format
  const convertToSerializedParts = (shells: AASData[], shellToDtrMap?: Map<string, number>): SerializedPartData[] => {
    return shells.map(shell => {
      const summary = getAASDataSummary(shell);
      const dtrIndex = shellToDtrMap?.get(shell.id);
      return {
        id: shell.id,
        globalAssetId: shell.globalAssetId,
        aasId: shell.id, // AAS Shell ID
        manufacturerId: summary.manufacturerId || 'Unknown',
        manufacturerPartId: summary.manufacturerPartId || 'Unknown',
        customerPartId: summary.customerPartId || undefined,
        partInstanceId: summary.partInstanceId || undefined,
        digitalTwinType: summary.digitalTwinType || 'Unknown',
        submodelCount: summary.submodelCount,
        dtrIndex,
        idShort: shell.idShort, // Include idShort from AAS data
        rawTwinData: shell
      };
    });
  };

  const handleGoBack = () => {
    setHasSearched(false);
    setCurrentResponse(null);
    setPaginator(null);
    setPartTypeCards([]);
    setSerializedParts([]);
    setCurrentPage(1);
    setTotalPages(0);
    setError(null);
    // Reset pagination loading states
    setIsLoadingNext(false);
    setIsLoadingPrevious(false);
    // Reset search fields
    setBpnl('');
    setSelectedPartner(null);
    setCustomerPartId('');
    setManufacturerPartId('');
  };

  const handleSearch = async () => {
    if (!bpnl.trim()) {
      setError('Please enter a partner BPNL');
      return;
    }

    // Validate custom limit
    if (isCustomLimit) {
      if (!customLimit.trim()) {
        setError('Please enter a custom limit or select a predefined option');
        return;
      }
      const customLimitNum = parseInt(customLimit);
      if (isNaN(customLimitNum) || customLimitNum < 1 || customLimitNum > 1000) {
        setError('Custom limit must be a number between 1 and 1000');
        return;
      }
    }

    setError(null);
    // Reset pagination loading states for new search
    setIsLoadingNext(false);
    setIsLoadingPrevious(false);
    
    try {
      // Calculate the correct limit based on whether custom limit is being used
      let limit: number | undefined;
      if (isCustomLimit) {
        const customLimitNum = parseInt(customLimit);
        limit = customLimitNum;
      } else {
        limit = pageLimit === 0 ? undefined : pageLimit; // No limit if pageLimit is 0
      }
      
      // Build custom query with all provided parameters
      const querySpec: Array<{ name: string; value: string }> = [];
      
      // Add digitalTwinType based on part type selection
      querySpec.push({
        name: 'digitalTwinType',
        value: partType === 'Catalog' ? 'PartType' : 'PartInstance'
      });
      
      // Add all provided search parameters
      if (customerPartId.trim()) {
        querySpec.push({
          name: 'customerPartId',
          value: customerPartId.trim()
        });
      }
      
      if (manufacturerPartId.trim()) {
        querySpec.push({
          name: 'manufacturerPartId',
          value: manufacturerPartId.trim()
        });
      }
      
      if (globalAssetId.trim()) {
        querySpec.push({
          name: 'globalAssetId',
          value: globalAssetId.trim()
        });
      }
      
      // Only add partInstanceId if part type is Serialized (PartInstance)
      if (partType === 'Serialized' && partInstanceId.trim()) {
        querySpec.push({
          name: 'partInstanceId',
          value: partInstanceId.trim()
        });
      }

      // Start loading progress and make API call
      const stopProgress = startLoadingProgress();
      
      // Create AbortController for this request
      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      
      let response;
      try {
        response = await discoverShellsWithCustomQuery(bpnl, querySpec, limit, undefined, abortController.signal);
      } catch (apiError) {
        console.error('❌ Search API error:', apiError);
        
        // Check if the error is due to cancellation
        if (apiError instanceof Error && apiError.name === 'AbortError') {
          
          return; // Don't show error or reset state for cancelled requests
        }
        
        // Error - reset immediately
        stopProgress(true);
        throw apiError; // Re-throw to be caught by outer catch
      } finally {
        // Clear the abort controller reference when request completes
        if (abortControllerRef.current === abortController) {
          abortControllerRef.current = null;
        }
      }

      setCurrentResponse(response);      // Log the full response for debugging
      
      
      // Check for any error-like fields in the response object
      const responseObj = response as unknown as Record<string, unknown>;
      const errorFields = Object.keys(responseObj).filter(key => 
        key.toLowerCase().includes('error') || 
        key.toLowerCase().includes('warning') ||
        key.toLowerCase().includes('message')
      );
      
      if (errorFields.length > 0) {
        const errorValues = errorFields
          .map(field => ({ field, value: responseObj[field] }))
          .filter(({ value }) => value && typeof value === 'string' && value.trim() !== '');
        
        if (errorValues.length > 0) {
          console.warn('Additional error fields found in response:', errorValues);
          // Log but don't automatically show these as errors unless they're critical
        }
      }
      
      // Check if the API returned an error in the response
      if (response.error) {
        // Handle specific error cases with user-friendly messages
        if (response.error.toLowerCase().includes('no dtrs found')) {
          setError(`No Digital Twin Registries found for partner "${bpnl}". Please verify the BPNL is correct and if the partner has a Connector (with a reachable DTR) connected in the same dataspace as you.`);
        } else {
          setError(`Search failed: ${response.error}`);
        }
        stopProgress(true);
        setIsLoading(false);
        return;
      }
      
      // Check if no shell descriptors were found
      if (!response.shellDescriptors || response.shellDescriptors.length === 0) {
        setError('No digital twins found for the specified criteria. Please try different search parameters.');
        stopProgress(true);
        setIsLoading(false);
        return;
      }
      
      // Check for errors in DTR statuses
      if (response.dtrs && response.dtrs.length > 0) {
        const errorDtrs = response.dtrs.filter(dtr => 
          dtr.status && (
            dtr.status.toLowerCase().includes('error') ||
            dtr.status.toLowerCase().includes('failed') ||
            dtr.status.toLowerCase().includes('timeout') ||
            dtr.status.toLowerCase().includes('unavailable')
          )
        );
        if (errorDtrs.length > 0) {
          console.warn('DTR errors found:', errorDtrs);
          const errorMessages = errorDtrs.map(dtr => `DTR ${dtr.connectorUrl}: ${dtr.status}`);
          setError(`DTR issues detected: ${errorMessages.join(', ')}`);
          // Don't return here - continue processing in case there are still valid results
        }
      }
      
      // Create paginator
      const digitalTwinType = partType === 'Catalog' ? 'PartType' : 'PartInstance';
      const newPaginator = new ShellDiscoveryPaginator(
        response,
        bpnl,
        digitalTwinType,
        limit
      );
      setPaginator(newPaginator);

      // Create DTR mapping if DTRs are available
      const shellToDtrMap = response.dtrs ? createShellToDtrMap(response.dtrs as unknown as Array<Record<string, unknown> & { shells?: string[] }>) : undefined;

      // Process results based on part type
      if (partType === 'Catalog') {
        const cards = convertToPartCards(response.shellDescriptors, shellToDtrMap);
        setPartTypeCards(cards);
        setSerializedParts([]);
      } else {
        const serialized = convertToSerializedParts(response.shellDescriptors, shellToDtrMap);
        setSerializedParts(serialized);
        setPartTypeCards([]);
      }

      setCurrentPage(response.pagination?.page || 1);
      // Calculate total pages (this would ideally come from the API)
      if (limit === undefined) {
        setTotalPages(1); // No pagination when no limit is set
      } else {
        setTotalPages(Math.ceil(response.shellsFound / limit));
      }

      // Success - trigger completion animation and then view change
      stopProgress();

    } catch (err) {
      console.error('Search error:', err);
      
      // Check if the error is due to request cancellation
      if (err instanceof Error && err.name === 'AbortError') {
        
        return; // Don't show error for cancelled requests
      }
      
      // Extract meaningful error message from different error types
      let errorMessage = 'Error searching for parts. Please try again.';
      
      if (err instanceof Error) {
        // Handle standard Error objects
        errorMessage = `Search failed: ${err.message}`;
      } else if (typeof err === 'string') {
        // Handle string errors
        errorMessage = `Search failed: ${err}`;
      } else if (err && typeof err === 'object') {
        // Handle axios or other structured errors
        if ('response' in err && err.response) {
          // Axios error with response
          const axiosErr = err as { response: { data?: { error?: string; message?: string }; status: number; statusText: string } };
          if (axiosErr.response.data?.error) {
            errorMessage = `API Error: ${axiosErr.response.data.error}`;
          } else if (axiosErr.response.data?.message) {
            errorMessage = `API Error: ${axiosErr.response.data.message}`;
          } else if (axiosErr.response.statusText) {
            errorMessage = `HTTP ${axiosErr.response.status}: ${axiosErr.response.statusText}`;
          } else {
            errorMessage = `HTTP Error ${axiosErr.response.status}`;
          }
        } else if ('message' in err) {
          // Object with message property
          const errWithMessage = err as { message: string };
          errorMessage = `Search failed: ${errWithMessage.message}`;
        }
      }
      
      setError(errorMessage);
      // Note: stopProgress(true) was already called in the API error handler above
    } finally {
      // Note: setIsLoading and setShowSearchLoading are now handled by stopProgress
    }
  };

  const handlePageChange = async (_: React.ChangeEvent<unknown>, page: number) => {
    if (!paginator || page === currentPage) return;

    // Determine direction and set appropriate loading state
    const isNext = page === currentPage + 1;
    const isPrevious = page === currentPage - 1;
    
    if (isNext) {
      setIsLoadingNext(true);
    } else if (isPrevious) {
      setIsLoadingPrevious(true);
    }
    
    setError(null);
    
    try {
      let newResponse: ShellDiscoveryResponse | null = null;

      // Handle sequential navigation (most common case)
      if (page === currentPage + 1 && paginator.hasNext()) {
        newResponse = await paginator.next();
      } else if (page === currentPage - 1 && paginator.hasPrevious()) {
        newResponse = await paginator.previous();
      } else {
        // For non-sequential navigation, show a helpful message
        // Cursor-based pagination doesn't support random page access efficiently
        setError(`Direct navigation to page ${page} is not supported. Please use next/previous navigation.`);
        return;
      }

      if (newResponse) {
        // Check if the pagination response contains an error
        if (newResponse.error) {
          if (newResponse.error.toLowerCase().includes('no dtrs found')) {
            setError(`No Digital Twin Registries found for partner "${bpnl}" on page ${page}. Please verify the BPNL is correct and the partner has registered digital twins.`);
          } else {
            setError(`Pagination failed: ${newResponse.error}`);
          }
          return;
        }
        
        setCurrentResponse(newResponse);
        setCurrentPage(newResponse.pagination?.page || currentPage);

        // Create DTR mapping if DTRs are available
        const shellToDtrMap = newResponse.dtrs ? createShellToDtrMap(newResponse.dtrs as unknown as Array<Record<string, unknown> & { shells?: string[] }>) : undefined;

        // Update results based on part type
        if (partType === 'Catalog') {
          const cards = convertToPartCards(newResponse.shellDescriptors, shellToDtrMap);
          setPartTypeCards(cards);
        } else {
          const serialized = convertToSerializedParts(newResponse.shellDescriptors, shellToDtrMap);
          setSerializedParts(serialized);
        }
      } else {
        setError('No more pages available in that direction.');
      }
    } catch (err) {
      console.error('Pagination error:', err);
      
      // Extract meaningful error message from pagination errors
      let errorMessage = 'Error loading page. Please try again.';
      
      if (err instanceof Error) {
        errorMessage = `Pagination failed: ${err.message}`;
      } else if (typeof err === 'string') {
        errorMessage = `Pagination failed: ${err}`;
      } else if (err && typeof err === 'object') {
        if ('response' in err && err.response) {
          const axiosErr = err as { response: { data?: { error?: string; message?: string }; status: number; statusText: string } };
          if (axiosErr.response.data?.error) {
            errorMessage = `Pagination API Error: ${axiosErr.response.data.error}`;
          } else if (axiosErr.response.data?.message) {
            errorMessage = `Pagination API Error: ${axiosErr.response.data.message}`;
          } else {
            errorMessage = `Pagination HTTP ${axiosErr.response.status}: ${axiosErr.response.statusText}`;
          }
        } else if ('message' in err) {
          const errWithMessage = err as { message: string };
          errorMessage = `Pagination failed: ${errWithMessage.message}`;
        }
      }
      
      setError(errorMessage);
    } finally {
      // Clean up pagination loading states
      setIsLoadingNext(false);
      setIsLoadingPrevious(false);
    }
  };

  const handleCardClick = (partId: string) => {
    
    
    // Find the card data to get the raw twin data
    const card = partTypeCards.find(c => c.id === partId || `${c.manufacturerId}/${c.manufacturerPartId}` === partId);
    if (card && card.rawTwinData) {
      // Get DTR information if available
      let dtrInfo = undefined;
      if (currentResponse?.dtrs && card.dtrIndex !== undefined && currentResponse.dtrs[card.dtrIndex]) {
        const dtr = currentResponse.dtrs[card.dtrIndex];
        dtrInfo = {
          connectorUrl: dtr.connectorUrl || 'Unknown',
          assetId: dtr.assetId || card.id
        };
      }
      
      // Convert the raw twin data to the format expected by SingleTwinResult
      const twinResult: SingleShellDiscoveryResponse = {
        shell_descriptor: {
          ...card.rawTwinData,
          idShort: card.rawTwinData.idShort || card.rawTwinData.id, // Use actual idShort if available, otherwise fallback to AAS ID
        },
        dtr: dtrInfo || {
          connectorUrl: 'Local Discovery',
          assetId: card.id
        }
      };
      
      setViewingTwin(twinResult);
      setSearchMode('view');
    }
  };

  const handleSerializedPartView = (part: SerializedPartData) => {
    
    
    if (part.rawTwinData) {
      // Get DTR information if available
      let dtrInfo = undefined;
      if (currentResponse?.dtrs && part.dtrIndex !== undefined && currentResponse.dtrs[part.dtrIndex]) {
        const dtr = currentResponse.dtrs[part.dtrIndex];
        dtrInfo = {
          connectorUrl: dtr.connectorUrl || 'Unknown',
          assetId: dtr.assetId || part.aasId
        };
      }
      
      // Convert the raw twin data to the format expected by SingleTwinResult
      const twinResult: SingleShellDiscoveryResponse = {
        shell_descriptor: {
          ...part.rawTwinData,
          idShort: part.rawTwinData.idShort || part.rawTwinData.id, // Use actual idShort if available, otherwise fallback to AAS ID
        },
        dtr: dtrInfo || {
          connectorUrl: 'Local Discovery',
          assetId: part.aasId
        }
      };
      
      setViewingTwin(twinResult);
      setSearchMode('view');
    }
  };

  const handleRegisterClick = (manufacturerId: string, manufacturerPartId: string) => {
    
    // Implement registration functionality
  };

  return (
    <Box sx={{ 
      height: '100%', // Use full available height from parent
      display: 'flex', 
      flexDirection: 'column',
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      backgroundAttachment: 'fixed',
      overflow: 'hidden'
    }}>
      
      {/* Compact Header - shown when search results are displayed */}
      {hasSearched && (
        <Box 
          sx={{ 
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
            py: 2,
            px: 4,
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            position: 'sticky',
            top: 0,
            zIndex: 1000
          }}
        >
          <Grid2 container alignItems="center" justifyContent="space-between">
            <Grid2 size={3}>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                {searchMode === 'view' ? (
                  <Button
                    variant="outlined"
                    onClick={() => {
                      setViewingTwin(null);
                      setSearchMode('discovery');
                    }}
                    startIcon={<ArrowBackIcon />}
                    size="small"
                    sx={{
                      borderColor: 'success.main',
                      color: 'success.main',
                      '&:hover': {
                        backgroundColor: 'success.main',
                        color: 'white',
                        borderColor: 'success.main'
                      }
                    }}
                  >
                    Back to Results
                  </Button>
                ) : (
                  <Button
                    variant="outlined"
                    onClick={handleGoBack}
                    startIcon={<ArrowBackIcon />}
                    size="small"
                    sx={{
                      borderColor: 'primary.main',
                      color: 'primary.main',
                      '&:hover': {
                        backgroundColor: 'primary.main',
                        color: 'white',
                        borderColor: 'primary.main'
                      }
                    }}
                  >
                    New Search
                  </Button>
                )}
              </Box>
            </Grid2>
            <Grid2 size={6}>
              <Typography 
                variant="h6" 
                sx={{ 
                  fontWeight: '600', 
                  color: 'primary.main',
                  textAlign: 'center'
                }}
              >
                Dataspace Discovery
              </Typography>
            </Grid2>
            <Grid2 size={3}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1, 
                flexWrap: 'wrap',
                justifyContent: 'flex-end',
                minHeight: '32px'
              }}>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="body2" sx={{ fontWeight: '500', color: 'primary.main', fontSize: '0.875rem' }}>
                    {getCompanyName(bpnl)}
                  </Typography>
                  <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.75rem', display: 'block' }}>
                    {bpnl}
                  </Typography>
                </Box>
              </Box>
            </Grid2>
          </Grid2>
        </Box>
      )}

      {/* Main Content Container */}
      <Box sx={{ 
        flex: 1, 
        display: 'flex',
        height: hasSearched ? 'calc(100% - 72px)' : '100%',
        overflow: 'hidden'
      }}>
        {/* Search Mode Toggle */}
        {!hasSearched && (
          <Box 
            sx={{ 
              position: 'absolute',
              top: '80px',
              right: '20px',
              zIndex: 1001,
              display: 'flex',
              alignItems: 'center',
              gap: 3,
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
              borderRadius: '20px',
              padding: '8px 16px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}
          >
            {/* Display Filters Button - Only show in Discovery mode when sidebar should be available but is hidden */}
            {searchMode === 'discovery' && !isVisible && (
              <Button
                onClick={handleDisplayFilters}
                size="small"
                startIcon={<VisibilityIcon />}
                sx={{
                  color: 'rgba(25, 118, 210, 0.8)',
                  fontSize: '0.8rem',
                  textTransform: 'none',
                  fontWeight: 500,
                  py: 0.3,
                  px: 0.8,
                  minHeight: '22px',
                  '&:hover': {
                    backgroundColor: 'rgba(25, 118, 210, 0.08)',
                    color: '#1976d2'
                  },
                  '& .MuiButton-startIcon': {
                    marginRight: '4px',
                    '& > svg': {
                      fontSize: '14px'
                    }
                  }
                }}
              >
                Display Filters
              </Button>
            )}

            {/* Hide Filters Button - Only show in Discovery mode when sidebar is visible */}
            {searchMode === 'discovery' && isVisible && (
              <Button
                onClick={hideSidebar}
                size="small"
                startIcon={<VisibilityOffIcon />}
                sx={{
                  color: 'rgba(25, 118, 210, 0.8)',
                  fontSize: '0.8rem',
                  textTransform: 'none',
                  fontWeight: 500,
                  py: 0.3,
                  px: 0.8,
                  minHeight: '22px',
                  '&:hover': {
                    backgroundColor: 'rgba(25, 118, 210, 0.08)',
                    color: '#1976d2'
                  },
                  '& .MuiButton-startIcon': {
                    marginRight: '4px',
                    '& > svg': {
                      fontSize: '14px'
                    }
                  }
                }}
              >
                Hide Filters
              </Button>
            )}

            {/* Mode Toggle */}
            <Box display="flex" alignItems="center" gap={1}>
              <Typography 
                variant="caption" 
                sx={{ 
                  fontWeight: '500', 
                  color: searchMode === 'discovery' ? '#1976d2' : '#666',
                  cursor: 'pointer',
                  fontSize: '0.8rem'
                }}
                onClick={() => setSearchMode('discovery')}
              >
              Discovery Mode
            </Typography>
            <Box
              sx={{
                width: '40px',
                height: '20px',
                backgroundColor: searchMode === 'single' ? '#1976d2' : '#ddd',
                borderRadius: '10px',
                position: 'relative',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onClick={() => setSearchMode(searchMode === 'discovery' ? 'single' : 'discovery')}
            >
              <Box
                sx={{
                  width: '16px',
                  height: '16px',
                  backgroundColor: 'white',
                  borderRadius: '50%',
                  position: 'absolute',
                  top: '2px',
                  left: searchMode === 'single' ? '22px' : '2px',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}
              />
            </Box>
            <Typography 
              variant="caption" 
              sx={{ 
                fontWeight: '500', 
                color: searchMode === 'single' ? '#1976d2' : '#666',
                cursor: 'pointer',
                fontSize: '0.8rem'
              }}
              onClick={() => setSearchMode('single')}
            >
              Single Twin
            </Typography>
            </Box>
          </Box>
        )}

        {/* Main Content */}
        <Box 
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: hasSearched ? 'flex-start' : 'center',
            alignItems: 'center',
            height: '100%',
            overflow: hasSearched ? 'auto' : 'hidden',
            p: hasSearched ? 0 : 4,
            pt: searchMode === 'single' && !hasSearched ? 4 : (hasSearched ? 0 : 4)
          }}
        >
            {/* Centered Welcome Screen - only shown when no search has been performed and in discovery mode */}
            {!hasSearched && searchMode === 'discovery' && (
              <Box 
                sx={{ 
                  textAlign: 'center',
                  maxWidth: '700px',
                  width: '100%',
                  transform: 'translateY(-8vh)' // Slightly above center
                }}
              >
                <Typography 
                  variant="h2" 
                  sx={{ 
                    fontWeight: '700', 
                    background: 'linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    mb: 2,
                    fontSize: { xs: '2.5rem', md: '3.5rem' },
                    textShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}
                >
                  Dataspace Discovery
                </Typography>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    color: '#5f6368',
                    mb: 6,
                    fontWeight: '400',
                    fontSize: { xs: '1.1rem', md: '1.3rem' },
                    lineHeight: 1.6,
                    maxWidth: '600px',
                    mx: 'auto'
                  }}
                >
                  Discover and explore digital twin parts in a Tractus-X network
                </Typography>

                {/* Centered Search Card */}
                <Card
                  sx={{ 
                    p: 5,
                    background: 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(20px)',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.1), 0 8px 25px rgba(0,0,0,0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    borderRadius: 4,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 25px 70px rgba(0,0,0,0.15), 0 10px 30px rgba(0,0,0,0.08)'
                    }
                  }}
                >
                  {/* Show loading component or search form */}
                  {showSearchLoading ? (
                    <SearchLoading 
                      key={searchKey}
                      isLoading={isLoading}
                      isCompleted={isSearchCompleted}
                      onCancel={handleCancelSearch}
                    />                  ) : (
                    <Box display="flex" flexDirection="column" gap={4}>
                      {/* Partners Loading Error Alert */}
                      {partnersError && (
                        <Alert 
                          severity="warning" 
                          action={
                            <Button 
                              color="inherit" 
                              size="small" 
                              onClick={retryLoadPartners}
                              disabled={isLoadingPartners}
                            >
                              Retry
                            </Button>
                          }
                          sx={{ mb: 2 }}
                        >
                          <Typography variant="body2">
                            Unable to load partner list from backend. You can still enter a custom BPNL manually.
                          </Typography>
                        </Alert>
                      )}
                      
                      <PartnerAutocomplete
                        value={bpnl}
                        availablePartners={availablePartners}
                        selectedPartner={selectedPartner}
                        isLoadingPartners={isLoadingPartners}
                        partnersError={!!partnersError}
                        hasError={!!error}
                        showSearchIcon={true}
                        onBpnlChange={setBpnl}
                        onPartnerChange={setSelectedPartner}
                        onRetryLoadPartners={retryLoadPartners}
                        onSearchClick={handleSearch}
                      />
                    
                    <Button
                      variant="contained"
                      size="large"
                      fullWidth
                      onClick={handleSearch}
                      disabled={isLoading || !bpnl.trim()}
                      startIcon={isLoading ? <CircularProgress size={24} color="inherit" /> : <SearchIcon />}
                      sx={{
                        py: 2,
                        borderRadius: 3,
                        fontSize: '1.2rem',
                        fontWeight: '600',
                        textTransform: 'none',
                        background: 'linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)',
                        boxShadow: '0 8px 25px rgba(25, 118, 210, 0.3)',
                        '&:hover': {
                          background: 'linear-gradient(45deg, #1565c0 30%, #2196f3 90%)',
                          boxShadow: '0 12px 35px rgba(25, 118, 210, 0.4)',
                          transform: 'translateY(-1px)'
                        },
                        '&:disabled': {
                          background: '#e0e0e0',
                          boxShadow: 'none'
                        }
                      }}
                    >
                      {isLoading ? 'Searching...' : 'Start Discovery'}
                    </Button>
                    </Box>
                  )}
                </Card>
              </Box>
            )}

            {/* Single Twin Search Screen - only shown when no search has been performed and in single mode */}
            {!hasSearched && searchMode === 'single' && (
              <Box 
                sx={{ 
                  textAlign: 'center',
                  maxWidth: '700px',
                  width: '100%',
                  mx: 'auto',
                  transform: 'translateY(-8vh)' // Slightly above center to match discovery mode
                }}
              >
                <Typography 
                  variant="h2" 
                  sx={{ 
                    fontWeight: '700', 
                    background: 'linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    mb: 2,
                    fontSize: { xs: '2.5rem', md: '3.5rem' },
                    textShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}
                >
                  Single Digital Twin
                </Typography>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    color: '#5f6368',
                    mb: 6,
                    fontWeight: '400',
                    fontSize: { xs: '1.1rem', md: '1.3rem' },
                    lineHeight: 1.6,
                    maxWidth: '600px',
                    mx: 'auto'
                  }}
                >
                  Search for a specific digital twin by providing its Asset Administration Shell (AAS) ID
                </Typography>

                {/* Centered Search Card */}
                <Card 
                  sx={{ 
                    p: 5,
                    background: 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(20px)',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.1), 0 8px 25px rgba(0,0,0,0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    borderRadius: 4,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 25px 70px rgba(0,0,0,0.15), 0 10px 30px rgba(0,0,0,0.08)'
                    }
                  }}
                >
                  {/* Show loading component or search form */}
                  {showSearchLoading ? (
                    <SearchLoading 
                      key={searchKey}
                      isLoading={isLoading}
                      isCompleted={isSearchCompleted}
                      onCancel={handleCancelSearch}
                    />                  ) : (
                    <Box display="flex" flexDirection="column" gap={4}>
                      {/* Partners Loading Error Alert */}
                      {partnersError && (
                        <Alert 
                          severity="warning" 
                          action={
                            <Button 
                              color="inherit" 
                              size="small" 
                              onClick={retryLoadPartners}
                              disabled={isLoadingPartners}
                            >
                              Retry
                            </Button>
                          }
                          sx={{ mb: 2 }}
                        >
                          <Typography variant="body2">
                            Unable to load partner list from backend. You can still enter a custom BPNL manually.
                          </Typography>
                        </Alert>
                      )}
                      
                      <PartnerAutocomplete
                        value={bpnl}
                        availablePartners={availablePartners}
                        selectedPartner={selectedPartner}
                        isLoadingPartners={isLoadingPartners}
                        partnersError={!!partnersError}
                        hasError={!!error}
                        showSearchIcon={false}
                        onBpnlChange={setBpnl}
                        onPartnerChange={setSelectedPartner}
                        onRetryLoadPartners={retryLoadPartners}
                      />

                    {/* AAS ID Field */}
                    <TextField
                      fullWidth
                      label="Asset Administration Shell ID *"
                      placeholder="Enter AAS ID (e.g., urn:uuid:35bb3960-70f8-4ff4-bd9f-0670f3beb39d)"
                      variant="outlined"
                      value={singleTwinAasId}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSingleTwinAasId(e.target.value)}
                      error={!!error && !singleTwinAasId.trim()}
                      helperText={
                        !!error && !singleTwinAasId.trim() 
                          ? 'AAS ID is required' 
                          : 'Enter the unique identifier for the Asset Administration Shell'
                      }
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 3,
                          fontSize: '1.1rem',
                          backgroundColor: 'rgba(255, 255, 255, 0.8)',
                          '&:hover': {
                            backgroundColor: 'rgba(255, 255, 255, 0.9)'
                          },
                          '&.Mui-focused': {
                            backgroundColor: 'white'
                          }
                        },
                        '& .MuiInputLabel-root': {
                          fontSize: '1.1rem'
                        }
                      }}
                    />

                    
                    <Button
                      variant="contained"
                      size="large"
                      fullWidth
                      onClick={handleSingleTwinSearch}
                      disabled={isLoading || !bpnl.trim() || !singleTwinAasId.trim()}
                      startIcon={isLoading ? <CircularProgress size={24} color="inherit" /> : <SearchIcon />}
                      sx={{
                        py: 2,
                        borderRadius: 3,
                        fontSize: '1.2rem',
                        fontWeight: '600',
                        textTransform: 'none',
                        background: 'linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)',
                        boxShadow: '0 8px 25px rgba(25, 118, 210, 0.3)',
                        '&:hover': {
                          background: 'linear-gradient(45deg, #1565c0 30%, #2196f3 90%)',
                          boxShadow: '0 12px 35px rgba(25, 118, 210, 0.4)',
                          transform: 'translateY(-1px)'
                        },
                        '&:disabled': {
                          background: '#e0e0e0',
                          boxShadow: 'none'
                        }
                      }}
                    >
                      {isLoading ? 'Searching...' : 'Search Digital Twin'}
                    </Button>
                    </Box>
                  )}
                </Card>
              </Box>
            )}

            {/* Error Alert */}
            {error && (
              <Box display="flex" justifyContent="center" mb={3} sx={{ width: '100%' }}>
                <Alert severity="error" onClose={() => setError(null)} sx={{ maxWidth: '600px' }}>
                  {error}
                </Alert>
              </Box>
            )}
        
            {/* Results Section - shown when search has been performed */}
            {hasSearched && (
              <Box sx={{ 
                width: '100%', 
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                overflow: searchMode === 'single' ? 'auto' : 'hidden',
                pt: 3 // Add top padding to create space from the header
              }}>
                {/* Single Twin Mode Results - Outside Results Display to avoid padding inheritance */}
                {singleTwinResult && searchMode === 'single' && (
                  <SingleTwinResult 
                    counterPartyId={selectedPartner?.bpnl || ''} 
                    singleTwinResult={singleTwinResult} 
                  />
                )}
                
                {/* View Twin Mode Results - For viewing twins from catalog */}
                {viewingTwin && searchMode === 'view' && (
                  <Box sx={{ width: '100%', p: 2 }}>
                    <SingleTwinResult 
                      counterPartyId={selectedPartner?.bpnl || ''} 
                      singleTwinResult={viewingTwin} 
                    />
                  </Box>
                )}
                {/* Discovery Mode Results */}
                {currentResponse && searchMode === 'discovery' && (
                  <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ px: 2, flexShrink: 0 }}>
                    {/* Left Side - Part Type Indicator + Active Filters */}
                    <Box 
                      display="flex" 
                      alignItems="center" 
                      gap={1.5} 
                      flexWrap="wrap"
                    >
                      {/* Part Type - Always shown */}
                      <Box
                        sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          px: 2,
                          py: 0.5,
                          borderRadius: '16px',
                          backgroundColor: 'rgba(76, 175, 80, 0.08)',
                          border: '1px solid rgba(76, 175, 80, 0.2)',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                        }}
                      >
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            fontWeight: '600', 
                            color: '#4caf50', 
                            fontSize: '0.75rem',
                            letterSpacing: '0.02em'
                          }}
                        >
                          {partType === 'Catalog' ? 'Catalog Parts' : 'Serialized Parts'}
                        </Typography>
                      </Box>

                      {/* Active Filters - Only shown when there are filters */}
                      {getActiveFilterChips().length > 0 && (
                        <>
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              fontWeight: '600', 
                              color: '#666', 
                              fontSize: '0.75rem',
                              letterSpacing: '0.02em'
                            }}
                          >
                            Active Filters:
                          </Typography>
                          {getActiveFilterChips()}
                        </>
                      )}
                    </Box>

                    {/* Results Count - Right Side */}
                    <Box display="flex" alignItems="center" gap={1}>
                      {/* Results Count */}
                      <Box
                        sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          px: 2,
                          py: 0.5,
                          borderRadius: '16px',
                          backgroundColor: 'rgba(25, 118, 210, 0.08)',
                          border: '1px solid rgba(25, 118, 210, 0.2)',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                        }}
                      >
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            fontWeight: '600', 
                            color: '#1976d2', 
                            fontSize: '0.8rem',
                            letterSpacing: '0.02em'
                          }}
                        >
                          {currentResponse.shellsFound}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                )}

                {/* Remove the duplicate simple results count section since we now handle both cases above */}

                {/* DTR Information Section - Discovery Mode */}
                {currentResponse && currentResponse.dtrs && searchMode === 'discovery' && (
                  <Box sx={{ px: 2, mb: 3, mt: 2, flexShrink: 0 }}>
                    <Box 
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        '&:hover': {
                          backgroundColor: 'rgba(0,0,0,0.02)'
                        },
                        p: 1,
                        borderRadius: 1,
                        transition: 'background-color 0.2s ease'
                      }}
                      onClick={() => setDtrSectionVisible(!dtrSectionVisible)}
                    >
                      <Typography 
                        variant="subtitle2" 
                        sx={{ 
                          fontWeight: '600', 
                          color: 'text.primary',
                          fontSize: '0.9rem'
                        }}
                      >
                        Digital Twin Registries ({currentResponse.dtrs.length})
                      </Typography>
                      <IconButton size="small" sx={{ color: 'text.secondary' }}>
                        {dtrSectionVisible ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      </IconButton>
                    </Box>
                    
                    {dtrSectionVisible && (
                      <Box sx={{ mt: 2 }}>
                        {/* DTR Carousel */}
                        {currentResponse.dtrs.length > 0 && (
                          <Box>
                            {/* Carousel Navigation Header */}
                            {currentResponse.dtrs.length > dtrItemsPerSlide && (
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                  {Math.floor(dtrCarouselIndex / dtrItemsPerSlide) + 1} of {Math.ceil(currentResponse.dtrs.length / dtrItemsPerSlide)} • {currentResponse.dtrs.length} total
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                  <IconButton
                                    size="small"
                                    onClick={handleDtrPrevious}
                                    disabled={dtrCarouselIndex === 0}
                                    sx={{ 
                                      color: dtrCarouselIndex === 0 ? 'text.disabled' : 'primary.main',
                                      '&:hover': { backgroundColor: 'primary.light' }
                                    }}
                                  >
                                    <ChevronLeftIcon />
                                  </IconButton>
                                  <IconButton
                                    size="small"
                                    onClick={handleDtrNext}
                                    disabled={dtrCarouselIndex >= currentResponse.dtrs.length - dtrItemsPerSlide}
                                    sx={{ 
                                      color: dtrCarouselIndex >= currentResponse.dtrs.length - dtrItemsPerSlide ? 'text.disabled' : 'primary.main',
                                      '&:hover': { backgroundColor: 'primary.light' }
                                    }}
                                  >
                                    <ChevronRightIcon />
                                  </IconButton>
                                </Box>
                              </Box>
                            )}
                            
                            {/* DTR Cards Grid */}
                            <Box sx={{ 
                              display: 'grid', 
                              gridTemplateColumns: isSingleDtr ? '1fr' : (isMobile ? '1fr' : 'repeat(2, 1fr)'),
                              gap: 1.5,
                              overflow: 'hidden'
                            }}>
                              {currentResponse.dtrs
                                .slice(dtrCarouselIndex, dtrCarouselIndex + dtrItemsPerSlide)
                                .map((dtr, relativeIndex) => {
                                  const actualIndex = dtrCarouselIndex + relativeIndex;
                                  const dtrColor = getDtrColor(actualIndex);
                                  return (
                                    <Card
                                      key={actualIndex}
                                      sx={{
                                        p: 2,
                                        border: `2px solid ${dtrColor.border}`,
                                        borderRadius: 2,
                                        backgroundColor: dtr.status === 'success' || dtr.status?.toLowerCase() === 'connected'
                                          ? dtrColor.light 
                                          : 'rgba(244, 67, 54, 0.02)',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                                        transition: 'all 0.3s ease',
                                        position: 'relative',
                                        '&:hover': {
                                          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                                          borderColor: dtrColor.bg.replace('0.9)', '1)'),
                                          backgroundColor: dtr.status === 'success' || dtr.status?.toLowerCase() === 'connected'
                                            ? dtrColor.light.replace('0.1)', '0.15)')
                                            : 'rgba(244, 67, 54, 0.05)'
                                        }
                                      }}
                                    >
                                      {/* DTR Header */}
                                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                                        <Box sx={{ flex: 1 }}>
                                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                            <Chip
                                              label={`DTR ${actualIndex + 1}`}
                                              size="small"
                                              sx={{
                                                backgroundColor: dtrColor.bg,
                                                color: dtrColor.color,
                                                fontWeight: '700',
                                                fontSize: '0.75rem',
                                                height: '24px',
                                                borderRadius: '6px'
                                              }}
                                            />
                                            <Chip
                                              label={dtr.status}
                                              size="small"
                                              color={dtr.status === 'success' || dtr.status?.toLowerCase() === 'connected' ? 'success' : 'error'}
                                              sx={{ 
                                                textTransform: 'capitalize',
                                                fontWeight: '600',
                                                fontSize: '0.7rem',
                                                height: '24px'
                                              }}
                                            />
                                          </Box>
                                        </Box>
                                        
                                        {/* Shells Found - Top Right Corner */}
                                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                          <Typography variant="caption" sx={{ fontWeight: '600', color: 'text.secondary', fontSize: '0.65rem', mb: 0.3 }}>
                                            Shells Found
                                          </Typography>
                                          <Chip
                                            label={dtr.shellsFound}
                                            size="small"
                                            color="primary"
                                            variant="outlined"
                                            sx={{ 
                                              fontSize: '0.65rem', 
                                              height: '20px',
                                              fontWeight: '600'
                                            }}
                                          />
                                        </Box>
                                      </Box>
                                      
                                      {/* Connector URL and Asset ID Grid */}
                                      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 1.5, mb: 1.5 }}>
                                        <Box>
                                          <Typography variant="caption" sx={{ fontWeight: '600', color: 'text.secondary', fontSize: '0.65rem', mb: 0.3, display: 'block' }}>
                                            Connector URL:
                                          </Typography>
                                          <Box sx={{ 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            backgroundColor: 'rgba(0,0,0,0.04)',
                                            borderRadius: 1,
                                            p: 1,
                                            gap: 1
                                          }}>
                                            <Typography 
                                              variant="body2" 
                                              sx={{ 
                                                fontFamily: 'monospace', 
                                                fontSize: '0.7rem', 
                                                color: 'text.secondary',
                                                wordBreak: 'break-all',
                                                lineHeight: 1.2,
                                                flex: 1
                                              }}
                                            >
                                              {dtr.connectorUrl}
                                            </Typography>
                                            <IconButton
                                              size="small"
                                              onClick={() => handleCopyConnectorUrl(dtr.connectorUrl, actualIndex)}
                                              sx={{ 
                                                p: 0.5,
                                                minWidth: 'auto',
                                                '&:hover': { backgroundColor: 'rgba(0,0,0,0.1)' }
                                              }}
                                            >
                                              {copiedConnectorUrl === `${actualIndex}-${dtr.connectorUrl}` ? 
                                                <CheckIcon sx={{ fontSize: 14, color: 'success.main' }} /> : 
                                                <ContentCopyIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                                              }
                                            </IconButton>
                                          </Box>
                                        </Box>
                                        
                                        <Box>
                                          <Typography variant="caption" sx={{ fontWeight: '600', color: 'text.secondary', fontSize: '0.65rem', mb: 0.3, display: 'block' }}>
                                            Asset ID:
                                          </Typography>
                                          <Box sx={{ 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            backgroundColor: 'rgba(0,0,0,0.04)',
                                            borderRadius: 1,
                                            p: 1,
                                            gap: 1
                                          }}>
                                            <Typography 
                                              variant="body2" 
                                              sx={{ 
                                                fontFamily: 'monospace', 
                                                fontSize: '0.65rem',
                                                wordBreak: 'break-all',
                                                lineHeight: 1.2,
                                                flex: 1
                                              }}
                                            >
                                              {dtr.assetId}
                                            </Typography>
                                            <IconButton
                                              size="small"
                                              onClick={() => handleCopyAssetId(dtr.assetId, actualIndex)}
                                              sx={{ 
                                                p: 0.5,
                                                minWidth: 'auto',
                                                '&:hover': { backgroundColor: 'rgba(0,0,0,0.1)' }
                                              }}
                                            >
                                              {copiedAssetId === `${actualIndex}-${dtr.assetId}` ? 
                                                <CheckIcon sx={{ fontSize: 14, color: 'success.main' }} /> : 
                                                <ContentCopyIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                                              }
                                            </IconButton>
                                          </Box>
                                        </Box>
                                      </Box>
                                    </Card>
                                  );
                                })}
                            </Box>
                            
                            {/* Carousel Indicators */}
                            {currentResponse.dtrs.length > dtrItemsPerSlide && (
                              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2, gap: 0.5 }}>
                                {Array.from({ length: Math.ceil(currentResponse.dtrs.length / dtrItemsPerSlide) }).map((_, pageIndex) => {
                                  const isActive = Math.floor(dtrCarouselIndex / dtrItemsPerSlide) === pageIndex;
                                  return (
                                    <Box
                                      key={pageIndex}
                                      onClick={() => setDtrCarouselIndex(pageIndex * dtrItemsPerSlide)}
                                      sx={{
                                        width: 8,
                                        height: 8,
                                        borderRadius: '50%',
                                        backgroundColor: isActive ? 'primary.main' : 'grey.300',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        '&:hover': {
                                          backgroundColor: isActive ? 'primary.dark' : 'grey.400'
                                        }
                                      }}
                                    />
                                  );
                                })}
                              </Box>
                            )}
                          </Box>
                        )}
                      </Box>
                    )}
                  </Box>
                )}

                {/* Results Display */}
                {searchMode === 'discovery' && (
                  <Box sx={{ 
                    px: { xs: 2, md: 4 }, 
                    flex: 1,
                    overflow: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%' // Ensure it takes full available height
                  }}>
                    {partType === 'Serialized' ? (
                      <>
                        {serializedParts.length > 0 ? (
                          <SerializedPartsTable parts={serializedParts} onView={handleSerializedPartView} />
                        ) : !isLoading && currentResponse ? (
                          <Box textAlign="center" py={4}>
                            <Typography color="textSecondary">No serialized parts found</Typography>
                          </Box>
                        ) : null}
                      </>
                    ) : (
                      <>
                        {partTypeCards.length > 0 ? (
                          <CatalogPartsDiscovery
                            onClick={handleCardClick}
                            onRegisterClick={handleRegisterClick}
                            items={partTypeCards.map(card => ({
                              id: card.id,
                              manufacturerId: card.manufacturerId,
                              manufacturerPartId: card.manufacturerPartId,
                              name: card.name,
                              category: card.category,
                              dtrIndex: card.dtrIndex,
                              shellId: card.id, // The shell ID is the same as the card ID (AAS ID)
                              rawTwinData: card.rawTwinData
                            }))}
                            isLoading={isLoading}
                          />
                        ) : !isLoading && currentResponse ? (
                          <Box textAlign="center" py={4}>
                            <Typography color="textSecondary">No catalog parts found</Typography>
                          </Box>
                        ) : null}
                      </>
                    )}
                  </Box>
                )}


                {/* Pagination */}
                {currentResponse && !isLoading && pageLimit > 0 && searchMode === 'discovery' && (
                  <Box display="flex" justifyContent="center" alignItems="center" gap={2} sx={{ mt: 2, mb: 3, px: 2, flexShrink: 0 }}>
                    {paginator?.hasPrevious() && (
                      <Button
                        variant="outlined"
                        onClick={() => handlePageChange({} as React.ChangeEvent<unknown>, currentPage - 1)}
                        disabled={isLoadingPrevious}
                        startIcon={isLoadingPrevious ? (
                          <CircularProgress 
                            size={16} 
                            sx={{ 
                              color: isLoadingPrevious ? 'currentColor' : 'primary.main',
                              '& .MuiCircularProgress-circle': {
                                strokeLinecap: 'round'
                              }
                            }} 
                          />
                        ) : <ArrowBackIcon />}
                        size="small"
                        sx={{ 
                          borderColor: 'primary.main',
                          color: 'primary.main',
                          borderRadius: 2,
                          px: 2,
                          py: 0.5,
                          fontSize: '0.8rem',
                          textTransform: 'none',
                          '&:hover': {
                            backgroundColor: 'primary.main',
                            color: 'white'
                          },
                          '&:disabled': {
                            borderColor: 'action.disabled',
                            color: 'action.disabled',
                            backgroundColor: 'transparent',
                            '&:hover': {
                              backgroundColor: 'transparent'
                            }
                          }
                        }}
                      >
                        Previous
                      </Button>
                    )}
                    
                    <Box 
                      display="flex" 
                      alignItems="center" 
                      gap={0.5}
                      sx={{
                        px: 2,
                        py: 0.5,
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: 'primary.main',
                        backgroundColor: 'background.paper'
                      }}
                    >
                      <Typography variant="body2" sx={{ color: 'primary.main', fontWeight: '500', fontSize: '0.8rem' }}>
                        Page {currentPage}
                      </Typography>
                      {totalPages > 1 && (
                        <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
                          of {totalPages}
                        </Typography>
                      )}
                    </Box>
                    
                    {paginator?.hasNext() && (
                      <Button
                        variant="contained"
                        onClick={() => handlePageChange({} as React.ChangeEvent<unknown>, currentPage + 1)}
                        disabled={isLoadingNext}
                        endIcon={isLoadingNext ? (
                          <CircularProgress 
                            size={16} 
                            sx={{ 
                              color: 'white',
                              '& .MuiCircularProgress-circle': {
                                strokeLinecap: 'round'
                              }
                            }} 
                          />
                        ) : <ArrowForwardIcon />}
                        size="small"
                        sx={{ 
                          backgroundColor: 'primary.main',
                          borderRadius: 2,
                          px: 2,
                          py: 0.5,
                          fontSize: '0.8rem',
                          textTransform: 'none',
                          '&:hover': {
                            backgroundColor: 'primary.dark'
                          },
                          '&:disabled': {
                            backgroundColor: 'action.disabled'
                          }
                        }}
                      >
                        Next
                      </Button>
                    )}
                  </Box>
                )}
                
              </Box>
            )}
        </Box>
      </Box>
    </Box>
  );
};

export default PartsDiscovery;