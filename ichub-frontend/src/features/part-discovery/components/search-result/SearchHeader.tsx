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
import { Box, Grid2, Button, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { FilterChips } from './FilterChips';
import { SearchFilters, PartType } from '../../types/types';

interface SearchHeaderProps {
  bpnl: string;
  companyName: string;
  filters: SearchFilters;
  partType: PartType;
  onGoBack: () => void;
}

export const SearchHeader: React.FC<SearchHeaderProps> = ({
  bpnl,
  companyName,
  filters,
  partType,
  onGoBack
}) => {
  return (
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
          <Button
            variant="outlined"
            onClick={onGoBack}
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
            <FilterChips filters={filters} partType={partType} />
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="body2" sx={{ fontWeight: '500', color: 'primary.main', fontSize: '0.875rem' }}>
                {companyName}
              </Typography>
              <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.75rem', display: 'block' }}>
                {bpnl}
              </Typography>
            </Box>
          </Box>
        </Grid2>
      </Grid2>
    </Box>
  );
};
