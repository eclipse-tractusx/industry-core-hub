/********************************************************************************
 * Eclipse Tractus-X - Industry Core Hub Frontend
 *
 * Copyright (c) 2026 LKS Next
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

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
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

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterDef {
  /** Key used in the `values` map and `onFilterChange` callback. */
  key: string;
  /** Label shown when no option is selected (e.g. "All Statuses"). */
  allLabel: string;
  options: FilterOption[];
  /** Optional min width for the dropdown. */
  minWidth?: number;
}

interface CcmFilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  filters?: FilterDef[];
  /** Current selected value per filter key. */
  values?: Record<string, string>;
  onFilterChange?: (key: string, value: string) => void;
  onClear: () => void;
  /** Optional list/card view toggle (used by Certificate Management). */
  viewMode?: 'list' | 'card';
  onViewModeChange?: (mode: 'list' | 'card') => void;
}

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
          backgroundColor: 'rgba(157,111,212,0.15)',
          '&:hover': { backgroundColor: 'rgba(157,111,212,0.22)' },
        },
      },
    },
  },
};

const selectSx = (hasValue: boolean, minWidth: number) => ({
  minWidth,
  borderRadius: '10px',
  backgroundColor: 'rgba(255,255,255,0.05)',
  color: hasValue ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.45)',
  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.1)' },
  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(157,111,212,0.45)' },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#9D6FD4', borderWidth: '1.5px' },
  '& .MuiSelect-select': { textAlign: 'center', py: '8.5px' },
  '& .MuiSelect-icon': { color: 'rgba(255,255,255,0.4)' },
});

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

/**
 * Config-driven search + filter bar shared across all CCM screens.
 * Renders a debounced search field, one dark dropdown per FilterDef, a Clear
 * button (when any filter is active) and an optional list/card view toggle.
 */
const CcmFilterBar = ({
  search,
  onSearchChange,
  searchPlaceholder = 'Search…',
  filters = [],
  values = {},
  onFilterChange,
  onClear,
  viewMode,
  onViewModeChange,
}: CcmFilterBarProps) => {
  const { t } = useTranslation('certificateManagement');
  const [searchDraft, setSearchDraft] = useState(search);

  // Keep local draft in sync when the parent clears the search externally.
  useEffect(() => {
    if (search === '' && searchDraft !== '') {
      setSearchDraft('');
    }
  }, [search]);

  // Debounce search propagation (300ms), matching SearchFilterBar.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchDraft !== search) {
        onSearchChange(searchDraft);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchDraft]);

  const hasActiveFilters =
    Boolean(searchDraft) || filters.some((f) => Boolean(values[f.key]));

  const handleClear = () => {
    setSearchDraft('');
    onClear();
  };

  return (
    <Box sx={{ display: 'flex', gap: 1.5, mb: 2.5, flexWrap: 'wrap', alignItems: 'center' }}>
      {/* Search */}
      <TextField
        size="small"
        placeholder={searchPlaceholder}
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

      {/* Dropdown filters */}
      {filters.map((f) => {
        const value = values[f.key] ?? '';
        return (
          <Select
            key={f.key}
            size="small"
            displayEmpty
            value={value}
            onChange={(e: SelectChangeEvent) => onFilterChange?.(f.key, e.target.value)}
            MenuProps={darkMenuProps}
            renderValue={(v) =>
              v ? f.options.find((o) => o.value === v)?.label ?? v : f.allLabel
            }
            sx={selectSx(Boolean(value), f.minWidth ?? 150)}
          >
            <MenuItem value="">{f.allLabel}</MenuItem>
            {f.options.map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
          </Select>
        );
      })}

      {hasActiveFilters && (
        <Button
          variant="text"
          size="small"
          startIcon={<ClearIcon fontSize="small" />}
          onClick={handleClear}
          sx={{
            textTransform: 'none',
            color: 'rgba(255,255,255,0.45)',
            whiteSpace: 'nowrap',
            '&:hover': { color: 'rgba(255,255,255,0.7)' },
          }}
        >
          {t('filterBar.clear')}
        </Button>
      )}

      {/* Optional list / card view toggle */}
      {viewMode && onViewModeChange && (
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
          <Tooltip title={t('filterBar.listView')} arrow>
            <IconButton size="small" onClick={() => onViewModeChange('list')} sx={toggleBtnSx(viewMode === 'list')}>
              <TableRowsIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title={t('filterBar.cardView')} arrow>
            <IconButton size="small" onClick={() => onViewModeChange('card')} sx={toggleBtnSx(viewMode === 'card')}>
              <ViewModuleIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        </Box>
      )}
    </Box>
  );
};

export default CcmFilterBar;
