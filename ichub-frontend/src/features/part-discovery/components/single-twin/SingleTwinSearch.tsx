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
import { Grid2, TextField, Button, CircularProgress } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

interface SingleTwinSearchProps {
  singleTwinAasId: string;
  onSingleTwinAasIdChange: (value: string) => void;
  onSearch: () => void;
  isLoading: boolean;
}

export const SingleTwinSearch: React.FC<SingleTwinSearchProps> = ({
  singleTwinAasId,
  onSingleTwinAasIdChange,
  onSearch,
  isLoading
}) => {
  return (
    <Grid2 container spacing={2} alignItems="end">
      <Grid2 size={8}>
        <TextField
          label="AAS ID"
          placeholder="Enter Asset Administration Shell ID"
          variant="outlined"
          fullWidth
          value={singleTwinAasId}
          onChange={(e) => onSingleTwinAasIdChange(e.target.value)}
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
      </Grid2>
      <Grid2 size={4}>
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
          Search Twin
        </Button>
      </Grid2>
    </Grid2>
  );
};
