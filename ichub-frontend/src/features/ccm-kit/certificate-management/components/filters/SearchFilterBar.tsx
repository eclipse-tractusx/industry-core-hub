/********************************************************************************
 * Eclipse Tractus-X - Industry Core Hub Frontend
 *
 * Copyright (c) 2026 Contributors to the Eclipse Foundation
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
 * License for the specific language governing permissions and limitations
 * under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 ********************************************************************************/

import { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Select,
  MenuItem,
  Button,
  InputAdornment,
  IconButton,
  Tooltip,
  SelectChangeEvent,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import TableRowsIcon from '@mui/icons-material/TableRows';
import { CertificateFilter } from '../../types/types';
import { certificateManagementConfig } from '../../config';

interface SearchFilterBarProps {
  filters: CertificateFilter;
  onChange: (filters: CertificateFilter) => void;
  viewMode: 'list' | 'card';
  onViewModeChange: (mode: 'list' | 'card') => void;
}

export const SearchFilterBar = ({ filters, onChange, viewMode, onViewModeChange }: SearchFilterBarProps) => {
  const [searchDraft, setSearchDraft] = useState(filters.search);

  useEffect(() => {
    if (filters.search === '' && searchDraft !== '') {
      setSearchDraft('');
    }
  }, [filters.search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchDraft !== filters.search) {
        onChange({ ...filters, search: searchDraft });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchDraft]);

  const hasActiveFilters = Boolean(filters.search || filters.type);

  const handleClear = () => {
    setSearchDraft('');
    onChange({ search: '', type: '', status: '', shared: '' });
  };

  const darkInput = {
    '& .MuiOutlinedInput-root': {
      backgroundColor: 'rgba(255,255,255,0.05)',
      color: 'rgba(255,255,255,0.85)',
      borderRadius: '10px',
      transition: 'all 0.2s ease',
      '& fieldset': { borderColor: 'rgba(255,255,255,0.1)', borderWidth: '1px' },
      '&:hover fieldset': { borderColor: 'rgba(157,111,212,0.45)' },
      '&.Mui-focused fieldset': { borderColor: '#9D6FD4', borderWidth: '1.5px' },
    },
  };

  const darkMenuProps = {
    PaperProps: {
      sx: {
        backgroundColor: 'rgba(28,28,32,0.98)',
        backgroundImage: 'none',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '10px',
        mt: 0.5,
        '& .MuiMenuItem-root': {
          color: 'rgba(255,255,255,0.87)',
          fontSize: '0.875rem',
          '&:hover': { backgroundColor: 'rgba(255,255,255,0.07)' },
          '&.Mui-selected': {
            backgroundColor: 'rgba(245,158,11,0.15)',
            '&:hover': { backgroundColor: 'rgba(245,158,11,0.22)' },
          },
        },
      },
    },
  };

  const toggleBtnSx = (active: boolean) => ({
    width: 36,
    height: 36,
    borderRadius: '8px',
    color: active ? '#fff' : 'rgba(255,255,255,0.45)',
    backgroundColor: active ? 'rgba(102,126,234,1)' : 'transparent',
    transition: 'all 0.2s ease',
    '&:hover': {
      backgroundColor: active ? 'rgba(102,126,234,1)' : 'rgba(255,255,255,0.08)',
      color: '#fff',
    },
  });

  return (
    <Box sx={{ display: 'flex', gap: 1.5, mb: 2.5, flexWrap: 'wrap', alignItems: 'center' }}>
      {/* Search */}
      <TextField
        size="small"
        placeholder="Search by name, issuer or BPN…"
        value={searchDraft}
        onChange={(e) => setSearchDraft(e.target.value)}
        sx={{
          flex: '1 1 220px',
          minWidth: 180,
          ...darkInput,
          '& input': { color: '#fff' },
          '& input::placeholder': { color: 'rgba(255,255,255,0.35)', opacity: 1 },
        }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={{ fontSize: 18, color: 'rgba(255,255,255,0.4)' }} />
            </InputAdornment>
          ),
        }}
      />

      {/* Type — rebuilt from scratch with centered text, no floating label */}
      <Select
        size="small"
        displayEmpty
        value={filters.type}
        onChange={(e: SelectChangeEvent) =>
          onChange({ ...filters, type: e.target.value as CertificateFilter['type'] })
        }
        MenuProps={darkMenuProps}
        renderValue={(v) => (v ? certificateManagementConfig.certificateTypes.find((t) => t.value === v)?.label ?? v : 'All Types')}
        sx={{
          minWidth: 150,
          borderRadius: '10px',
          backgroundColor: 'rgba(255,255,255,0.05)',
          color: filters.type ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.45)',
          '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.1)' },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(245,158,11,0.45)' },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#9D6FD4', borderWidth: '1.5px' },
          '& .MuiSelect-select': { textAlign: 'center', py: '8.5px' },
          '& .MuiSelect-icon': { color: 'rgba(255,255,255,0.4)' },
        }}
      >
        <MenuItem value="">All Types</MenuItem>
        {certificateManagementConfig.certificateTypes.map((t) => (
          <MenuItem key={t.value} value={t.value}>
            {t.label}
          </MenuItem>
        ))}
      </Select>

      {hasActiveFilters && (
        <Button
          variant="text"
          size="small"
          startIcon={<ClearIcon fontSize="small" />}
          onClick={handleClear}
          sx={{ textTransform: 'none', color: 'rgba(255,255,255,0.45)', whiteSpace: 'nowrap', '&:hover': { color: 'rgba(255,255,255,0.7)' } }}
        >
          Clear
        </Button>
      )}

      {/* List / Card view toggle */}
      <Box
        sx={{
          display: 'flex',
          backgroundColor: 'rgba(255,255,255,0.05)',
          borderRadius: '10px',
          padding: '3px',
          border: '1px solid rgba(255,255,255,0.1)',
          gap: '2px',
        }}
      >
        <Tooltip title="List view" arrow>
          <IconButton size="small" onClick={() => onViewModeChange('list')} sx={toggleBtnSx(viewMode === 'list')}>
            <TableRowsIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Card view" arrow>
          <IconButton size="small" onClick={() => onViewModeChange('card')} sx={toggleBtnSx(viewMode === 'card')}>
            <ViewModuleIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
};
