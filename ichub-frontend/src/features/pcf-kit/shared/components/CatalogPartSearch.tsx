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
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  InputAdornment,
  IconButton,
  CircularProgress,
  Paper,
  alpha,
  Button,
  ClickAwayListener,
  Popper,
  Chip
} from '@mui/material';
import {
  Search,
  Close as CloseIcon,
  Category,
  DraftsOutlined
} from '@mui/icons-material';
import { fetchCatalogParts, CatalogPart } from '../../../industry-core-kit/catalog-management/api';

// PCF Green Theme
const PCF_PRIMARY = '#10b981';
const PCF_SECONDARY = '#059669';

export interface CatalogPartSearchResult {
  manufacturerId: string;
  manufacturerPartId: string;
  partName: string;
  description?: string;
  category?: string;
  status?: 'Draft' | 'Registered';
}

interface CatalogPartSearchProps {
  /**
   * Icon component to display in the header
   */
  icon: React.ReactNode;
  /**
   * Title text for the search page
   */
  title: string;
  /**
   * Subtitle text describing the feature
   */
  subtitle: string;
  /**
   * Callback when a part is selected
   */
  onPartSelect: (part: CatalogPartSearchResult) => void;
  /**
   * Placeholder text for the search input
   */
  searchPlaceholder?: string;
  /**
   * Button text for the search action
   */
  searchButtonText?: string;
}

/**
 * Reusable Catalog Part Search component for PCF features.
 * Displays a centered search card with autocomplete dropdown.
 * 
 * Fixed z-index issue: dropdown now uses Popper component to render
 * outside the card container, ensuring it appears above all other elements.
 */
export const CatalogPartSearch: React.FC<CatalogPartSearchProps> = ({
  icon,
  title,
  subtitle,
  onPartSelect,
  searchPlaceholder,
  searchButtonText
}) => {
  const { t } = useTranslation('pcf');
  const [searchTerm, setSearchTerm] = useState('');
  const [allParts, setAllParts] = useState<CatalogPartSearchResult[]>([]);
  const [filteredResults, setFilteredResults] = useState<CatalogPartSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);

  // Load all parts from backend on first focus
  const loadAllParts = async () => {
    if (allParts.length > 0) return; // Already loaded

    setIsInitialLoading(true);
    try {
      const catalogParts = await fetchCatalogParts();
      const mapped = catalogParts.map(part => ({
        manufacturerId: part.manufacturerId || '',
        manufacturerPartId: part.manufacturerPartId,
        partName: part.name,
        description: part.description,
        category: part.category,
        status: (part.status === 'Draft' ? 'Draft' : 'Registered') as 'Draft' | 'Registered'
      }));
      setAllParts(mapped);
    } catch (err) {
      console.error('Failed to load parts:', err);
    } finally {
      setIsInitialLoading(false);
    }
  };

  // Filter results based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredResults(allParts);
    } else {
      const query = searchTerm.toLowerCase();
      const filtered = allParts.filter(part =>
        part.manufacturerPartId.toLowerCase().includes(query) ||
        part.partName.toLowerCase().includes(query)
      );
      setFilteredResults(filtered);
    }
  }, [searchTerm, allParts]);

  // Handle focus - load parts and show dropdown
  const handleFocus = async () => {
    await loadAllParts();
    setShowDropdown(true);
    setFilteredResults(searchTerm.trim() ? filteredResults : allParts);
  };

  // Handle selecting a search result
  const handleSelectPart = (part: CatalogPartSearchResult) => {
    setShowDropdown(false);
    setSearchTerm('');
    onPartSelect(part);
  };

  // Handle search submission
  const handleSearchSubmit = () => {
    if (searchTerm.trim()) {
      // If there are results, select the first one
      if (filteredResults.length > 0) {
        handleSelectPart(filteredResults[0]);
      } else {
        // Create a basic result from the search term
        onPartSelect({
          manufacturerId: '',
          manufacturerPartId: searchTerm.trim(),
          partName: `Product ${searchTerm.trim()}`
        });
      }
    }
  };

  const handleClickAway = () => {
    setShowDropdown(false);
  };

  return (
    <Box sx={{ minHeight: 'calc(100vh - 68.8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', px: { xs: 2, sm: 3, md: 4 } }}>
      <Box sx={{ width: '100%', maxWidth: '700px', textAlign: 'center' }}>
        {/* Header */}
        <Box sx={{ mb: 5 }}>
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: '16px',
              background: `linear-gradient(135deg, ${PCF_PRIMARY} 0%, ${PCF_SECONDARY} 50%, #047857 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto',
              mb: 2,
              boxShadow: `0 8px 32px ${alpha(PCF_PRIMARY, 0.4)}`
            }}
          >
            {icon}
          </Box>
          <Typography variant="h4" sx={{ color: '#fff', fontWeight: 700, mb: 1 }}>
            {title}
          </Typography>
          <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.6)', maxWidth: '500px', margin: '0 auto' }}>
            {subtitle}
          </Typography>
        </Box>

        {/* Search Card */}
        <Card
          sx={{
            background: 'linear-gradient(135deg, rgba(30, 30, 30, 0.95) 0%, rgba(20, 20, 20, 0.95) 100%)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '20px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
            overflow: 'visible' // Important: allow dropdown to overflow
          }}
        >
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h6" sx={{ color: '#fff', mb: 0.5, fontWeight: 600 }}>
              {t('search.title')}
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.5)', mb: 3 }}>
              {t('search.subtitle')}
            </Typography>

            <ClickAwayListener onClickAway={handleClickAway}>
              <Box sx={{ position: 'relative' }} ref={anchorRef}>
                <TextField
                  fullWidth
                  placeholder={searchPlaceholder || t('search.defaultPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit()}
                  onFocus={handleFocus}
                  inputProps={{ autoComplete: 'off' }}
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><Search sx={{ color: 'rgba(255, 255, 255, 0.4)' }} /></InputAdornment>,
                    endAdornment: (searchTerm || isInitialLoading) && (
                      <InputAdornment position="end">
                        {isInitialLoading ? <CircularProgress size={20} sx={{ color: PCF_PRIMARY }} /> : (
                          <IconButton size="small" onClick={() => setSearchTerm('')} sx={{ color: 'rgba(255, 255, 255, 0.4)' }}>
                            <CloseIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                        )}
                      </InputAdornment>
                    )
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      background: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '12px',
                      '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.1)' },
                      '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                      '&.Mui-focused fieldset': { borderColor: PCF_PRIMARY }
                    },
                    '& .MuiInputBase-input': { color: '#fff' }
                  }}
                />

                {/* Dropdown using Popper for proper z-index */}
                <Popper
                  open={showDropdown && (filteredResults.length > 0 || isInitialLoading)}
                  anchorEl={anchorRef.current}
                  placement="bottom-start"
                  style={{ zIndex: 1400, width: anchorRef.current?.offsetWidth }}
                  modifiers={[
                    {
                      name: 'offset',
                      options: {
                        offset: [0, 8],
                      },
                    },
                  ]}
                >
                  <Paper
                    sx={{
                      maxHeight: 300,
                      overflow: 'auto',
                      background: 'rgba(30, 30, 30, 0.98)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
                      // Custom scrollbar
                      '&::-webkit-scrollbar': { width: 6 },
                      '&::-webkit-scrollbar-track': { background: 'transparent' },
                      '&::-webkit-scrollbar-thumb': {
                        background: 'rgba(255,255,255,0.15)',
                        borderRadius: 3,
                      },
                      '&::-webkit-scrollbar-thumb:hover': {
                        background: 'rgba(16,185,129,0.5)',
                      },
                      scrollbarWidth: 'thin',
                      scrollbarColor: 'rgba(255,255,255,0.15) transparent',
                    }}
                  >
                    {isInitialLoading ? (
                      <Box sx={{ p: 3, textAlign: 'center' }}>
                        <CircularProgress size={24} sx={{ color: PCF_PRIMARY }} />
                        <Typography variant="caption" sx={{ display: 'block', color: 'rgba(255, 255, 255, 0.5)', mt: 1 }}>
                          {t('search.loadingParts')}
                        </Typography>
                      </Box>
                    ) : filteredResults.length === 0 ? (
                      <Box sx={{ p: 3, textAlign: 'center' }}>
                        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                          {t('search.noMatchingParts')}
                        </Typography>
                      </Box>
                    ) : (
                      filteredResults.map((result) => (
                        <Box
                          key={`${result.manufacturerPartId}-${result.partName}`}
                          onClick={() => handleSelectPart(result)}
                          sx={{
                            p: 2,
                            cursor: 'pointer',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 2,
                            '&:hover': { background: alpha(PCF_PRIMARY, 0.1) },
                            '&:last-child': { borderBottom: 'none' }
                          }}
                        >
                          <Box sx={{ 
                            width: 36, 
                            height: 36, 
                            borderRadius: '8px', 
                            background: result.status === 'Draft' ? 'rgba(234, 179, 8, 0.15)' : alpha(PCF_PRIMARY, 0.15), 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center' 
                          }}>
                            {result.status === 'Draft' ? (
                              <DraftsOutlined sx={{ fontSize: 18, color: '#eab308' }} />
                            ) : (
                              <Category sx={{ fontSize: 18, color: PCF_PRIMARY }} />
                            )}
                          </Box>
                          <Box sx={{ flex: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body2" sx={{ color: '#fff', fontWeight: 600 }}>{result.manufacturerPartId}</Typography>
                              {result.status && (
                                <Chip 
                                  label={result.status} 
                                  size="small" 
                                  sx={{ 
                                    height: 18, 
                                    fontSize: '0.65rem', 
                                    fontWeight: 600,
                                    backgroundColor: result.status === 'Draft' ? 'rgba(234, 179, 8, 0.15)' : alpha(PCF_PRIMARY, 0.15),
                                    color: result.status === 'Draft' ? '#eab308' : PCF_PRIMARY,
                                    border: `1px solid ${result.status === 'Draft' ? 'rgba(234, 179, 8, 0.3)' : alpha(PCF_PRIMARY, 0.3)}`
                                  }} 
                                />
                              )}
                            </Box>
                            <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                              {result.partName}{result.category && ` • ${result.category}`}
                            </Typography>
                          </Box>
                        </Box>
                      ))
                    )}
                  </Paper>
                </Popper>
              </Box>
            </ClickAwayListener>

            <Button
              fullWidth
              variant="contained"
              onClick={handleSearchSubmit}
              disabled={!searchTerm.trim()}
              sx={{
                mt: 3,
                py: 1.5,
                background: `linear-gradient(135deg, ${PCF_PRIMARY} 0%, ${PCF_SECONDARY} 100%)`,
                borderRadius: '12px',
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '1rem',
                '&:disabled': { background: 'rgba(255, 255, 255, 0.1)', color: 'rgba(255, 255, 255, 0.3)' }
              }}
            >
              {searchButtonText || t('search.defaultButtonText')}
            </Button>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default CatalogPartSearch;
