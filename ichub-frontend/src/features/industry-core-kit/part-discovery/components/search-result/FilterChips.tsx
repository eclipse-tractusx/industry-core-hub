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
import { Box, Chip, Typography } from '@mui/material';
import { SearchFilters, PartType } from '@/features/industry-core-kit/part-discovery/types/types';

interface FilterChipsProps {
  filters: SearchFilters;
  partType: PartType;
}

export const FilterChips: React.FC<FilterChipsProps> = ({ filters, partType }) => {
  const getActiveFilterChips = () => {
    const filterList = [
      {
        value: filters.customerPartId,
        label: 'Customer Part ID',
        tooltip: 'Customer Part ID'
      },
      {
        value: filters.manufacturerPartId,
        label: 'Manufacturer Part ID',
        tooltip: 'Manufacturer Part ID'
      },
      {
        value: filters.globalAssetId,
        label: 'Global Asset ID',
        tooltip: 'Global Asset ID'
      },
      // Only show Part Instance ID filter when Part Instance is selected
      ...(partType === 'Serialized' ? [{
        value: filters.partInstanceId,
        label: 'Part Instance ID',
        tooltip: 'Part Instance Identifier'
      }] : [])
    ];

    return filterList
      .filter(filter => filter.value && filter.value.trim())
      .map((filter, index) => (
        <Chip 
          key={`filter-${filter.label}-${index}`}
          className="filter-chip"
          label={
            <Box className="filter-chip-content">
              <Typography component="span" className="filter-chip-label">
                {filter.label}: 
              </Typography>
              <Typography component="span" className="filter-chip-value">
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
      ));
  };

  const chips = getActiveFilterChips();

  if (chips.length === 0) {
    return null;
  }

  return (
    <Box className="filter-chips-container">
      <Box className="filter-chips-row">
        {chips}
      </Box>
    </Box>
  );
};
