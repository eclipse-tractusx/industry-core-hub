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
import { TextField, Button, Autocomplete, CircularProgress } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { PartnerInstance } from '../../../types/partner';

interface PartnerSearchProps {
  bpnl: string;
  onBpnlChange: (value: string) => void;
  selectedPartner: PartnerInstance | null;
  onSelectedPartnerChange: (partner: PartnerInstance | null) => void;
  availablePartners: PartnerInstance[];
  isLoadingPartners: boolean;
  onSearch: () => void;
  isLoading: boolean;
}

export const PartnerSearch: React.FC<PartnerSearchProps> = ({
  bpnl,
  onBpnlChange,
  selectedPartner,
  onSelectedPartnerChange,
  availablePartners,
  isLoadingPartners,
  onSearch,
  isLoading
}) => {
  return (
    <>
      <Autocomplete
        value={selectedPartner}
        onChange={(_, newValue) => {
          onSelectedPartnerChange(newValue);
          if (newValue) {
            onBpnlChange(newValue.bpnl);
          }
        }}
        inputValue={bpnl}
        onInputChange={(_, newInputValue) => {
          onBpnlChange(newInputValue);
          if (!newInputValue) {
            onSelectedPartnerChange(null);
          }
        }}
        options={availablePartners}
        getOptionLabel={(option) => option.bpnl}
        loading={isLoadingPartners}
        renderOption={(props, option) => (
          <li {...props} key={option.bpnl}>
            <div>
              <div style={{ fontWeight: 500 }}>{option.name}</div>
              <div style={{ fontSize: '0.875rem', color: 'text.secondary' }}>{option.bpnl}</div>
            </div>
          </li>
        )}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Partner BPNL"
            placeholder="Select from available partners or enter a custom Business Partner Number Legal Entity"
            variant="outlined"
            fullWidth
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {isLoadingPartners ? <CircularProgress color="inherit" size={20} /> : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                borderRadius: 3,
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 1)',
                },
                '&.Mui-focused': {
                  backgroundColor: 'rgba(255, 255, 255, 1)',
                  boxShadow: '0 0 0 3px rgba(25, 118, 210, 0.1)',
                }
              }
            }}
          />
        )}
        sx={{ mb: 3 }}
      />

      <Button
        variant="contained"
        onClick={onSearch}
        disabled={isLoading}
        startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <SearchIcon />}
        size="large"
        fullWidth
        sx={{
          py: 1.5,
          borderRadius: 3,
          fontSize: '1rem',
          fontWeight: '600',
          textTransform: 'none',
          background: 'linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)',
          boxShadow: '0 8px 32px rgba(25, 118, 210, 0.3)',
          '&:hover': {
            background: 'linear-gradient(45deg, #1565c0 30%, #1976d2 90%)',
            boxShadow: '0 12px 40px rgba(25, 118, 210, 0.4)',
            transform: 'translateY(-2px)'
          },
          '&:disabled': {
            background: 'rgba(0, 0, 0, 0.12)',
            boxShadow: 'none',
            transform: 'none'
          },
          transition: 'all 0.3s ease'
        }}
      >
        Start Discovery
      </Button>
    </>
  );
};
