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

import React from 'react';
import { Box, Button, Chip } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { SearchMode } from '../../types/types';

interface SearchModeToggleProps {
  searchMode: SearchMode;
  onSearchModeChange: (mode: SearchMode) => void;
  isVisible: boolean;
  onDisplayFilters: () => void;
  onHideFilters: () => void;
}

export const SearchModeToggle: React.FC<SearchModeToggleProps> = ({
  searchMode,
  onSearchModeChange,
  isVisible,
  onDisplayFilters,
  onHideFilters
}) => {
  return (
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
          onClick={onDisplayFilters}
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
          onClick={onHideFilters}
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

      {/* Search Mode Toggle */}
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        <Chip
          label="Discovery"
          clickable
          onClick={() => onSearchModeChange('discovery')}
          color={searchMode === 'discovery' ? 'primary' : 'default'}
          size="small"
          sx={{
            fontSize: '0.75rem',
            fontWeight: 500,
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              transform: 'translateY(-1px)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
            }
          }}
        />
        <Chip
          label="Single Twin"
          clickable
          onClick={() => onSearchModeChange('single')}
          color={searchMode === 'single' ? 'primary' : 'default'}
          size="small"
          sx={{
            fontSize: '0.75rem',
            fontWeight: 500,
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              transform: 'translateY(-1px)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
            }
          }}
        />
      </Box>
    </Box>
  );
};
