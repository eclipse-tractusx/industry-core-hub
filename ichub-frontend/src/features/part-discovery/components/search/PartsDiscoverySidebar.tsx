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
import {
  Box,
  Typography,
  Radio,
  RadioGroup,
  FormControlLabel,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip
} from '@mui/material';

interface PartsDiscoverySidebarProps {
  partType: string;
  onPartTypeChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  pageLimit: number;
  onPageLimitChange: (limit: number) => void;
  customLimit: string;
  onCustomLimitChange: (limit: string) => void;
  isCustomLimit: boolean;
  onIsCustomLimitChange: (isCustom: boolean) => void;
  customerPartId: string;
  onCustomerPartIdChange: (id: string) => void;
  manufacturerPartId: string;
  onManufacturerPartIdChange: (id: string) => void;
  globalAssetId: string;
  onGlobalAssetIdChange: (id: string) => void;
  partInstanceId: string;
  onPartInstanceIdChange: (id: string) => void;
}

const PartsDiscoverySidebar: React.FC<PartsDiscoverySidebarProps> = ({
  partType,
  onPartTypeChange,
  pageLimit,
  onPageLimitChange,
  customLimit,
  onCustomLimitChange,
  isCustomLimit,
  onIsCustomLimitChange,
  customerPartId,
  onCustomerPartIdChange,
  manufacturerPartId,
  onManufacturerPartIdChange,
  globalAssetId,
  onGlobalAssetIdChange,
  partInstanceId,
  onPartInstanceIdChange
}) => {
  const sidebarStyles = {
    textField: {
      '& .MuiOutlinedInput-root': {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 2,
        border: '1px solid rgba(255, 255, 255, 0.2)',
        color: 'white',
        '& input::placeholder': {
          fontSize: '0.75rem',
          color: 'rgba(255, 255, 255, 0.5)'
        },
        '&:hover': {
          backgroundColor: 'rgba(255, 255, 255, 0.12)',
          borderColor: 'rgba(255, 255, 255, 0.3)'
        },
        '&.Mui-focused': {
          backgroundColor: 'rgba(255, 255, 255, 0.15)',
          borderColor: '#60a5fa'
        }
      },
      '& .MuiInputLabel-root': {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: '0.875rem',
        '&.Mui-focused': {
          color: '#bfdbfe'
        }
      },
      '& .MuiFormHelperText-root': {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: '0.75rem'
      }
    },
    sectionTitle: {
      fontWeight: '600',
      color: 'white',
      mb: 2,
      fontSize: '0.85rem',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.3px',
      borderBottom: '1px solid rgba(255, 255, 255, 0.15)',
      pb: 1
    }
  };

  return (
    <>
      {/* Digital Twin Type Section */}
      <Box sx={{ p: 2 }}>
        <Typography variant="subtitle2" sx={sidebarStyles.sectionTitle}>
          Digital Twin Type
        </Typography>
        <RadioGroup 
          value={partType} 
          onChange={onPartTypeChange}
          sx={{
            '& .MuiFormControlLabel-root': {
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              margin: '4px 0',
              borderRadius: 2,
              padding: '8px 12px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              transition: 'all 0.2s ease',
              color: 'white',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.12)',
                borderColor: 'rgba(255, 255, 255, 0.3)'
              }
            },
            '& .MuiFormControlLabel-label': {
              fontWeight: '400',
              fontSize: '0.875rem',
              color: 'white'
            },
            '& .MuiRadio-root': {
              color: 'rgba(255, 255, 255, 0.6)',
              padding: '6px',
              '&.Mui-checked': {
                color: '#60a5fa'
              }
            },
            '& .Mui-checked + .MuiFormControlLabel-label': {
              fontWeight: '500',
              color: '#bfdbfe'
            }
          }}
        >
          <FormControlLabel value="Catalog" control={<Radio />} label="Part Type (Catalog)" />
          <FormControlLabel value="Serialized" control={<Radio />} label="Part Instance (Serialized)" />
        </RadioGroup>
      </Box>

      {/* Results per Page Section */}
      <Box sx={{ p: 2 }}>
        <Typography variant="subtitle2" sx={sidebarStyles.sectionTitle}>
          Results per Page
        </Typography>
        <FormControl fullWidth size="small" sx={{ mt: 1, ...sidebarStyles.textField }}>
          <InputLabel>Results per Page</InputLabel>
          <Select
            value={isCustomLimit ? 'custom' : pageLimit}
            label="Results per Page"
            onChange={(e) => {
              const value = e.target.value;
              if (value === 'custom') {
                onIsCustomLimitChange(true);
                onPageLimitChange(parseInt(customLimit) || 10);
              } else {
                onIsCustomLimitChange(false);
                onPageLimitChange(value as number);
              }
            }}
            sx={{
              '& .MuiSelect-icon': {
                color: 'rgba(255, 255, 255, 0.7)'
              }
            }}
          >
            <MenuItem value={5}>5</MenuItem>
            <MenuItem value={10}>10</MenuItem>
            <MenuItem value={20}>20</MenuItem>
            <MenuItem value={50}>50</MenuItem>
            <MenuItem value={100}>100</MenuItem>
            <MenuItem value="custom">Custom</MenuItem>
            <MenuItem value={0}>No Limit</MenuItem>
          </Select>
        </FormControl>

        {isCustomLimit && (
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              size="small"
              label="Custom Limit"
              placeholder="Enter number of results per page"
              type="number"
              value={customLimit}
              onChange={(e) => onCustomLimitChange(e.target.value)}
              inputProps={{ min: 1, max: 1000 }}
              helperText={
                customLimit && (isNaN(parseInt(customLimit)) || parseInt(customLimit) < 1 || parseInt(customLimit) > 1000)
                  ? "Please enter a valid number between 1 and 1000"
                  : "Enter a number between 1 and 1000"
              }
              error={customLimit !== '' && (isNaN(parseInt(customLimit)) || parseInt(customLimit) < 1 || parseInt(customLimit) > 1000)}
              sx={sidebarStyles.textField}
            />
            
            <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              <Typography variant="caption" sx={{ width: '100%', mb: 0.5, color: 'rgba(255, 255, 255, 0.8)', fontWeight: '500', fontSize: '0.7rem' }}>
                Quick select:
              </Typography>
              {[25, 75, 150, 200, 500].map((value) => (
                <Chip
                  key={value}
                  label={value}
                  size="small"
                  onClick={() => {
                    onCustomLimitChange(value.toString());
                    onPageLimitChange(value);
                  }}
                  sx={{ 
                    cursor: 'pointer',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    color: 'white',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    fontSize: '0.7rem',
                    height: '24px',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      borderColor: '#60a5fa'
                    }
                  }}
                />
              ))}
            </Box>
          </Box>
        )}
      </Box>

      {/* Advanced Options Section */}
      <Box sx={{ p: 2 }}>
        <Typography variant="subtitle2" sx={sidebarStyles.sectionTitle}>
          Advanced Options
        </Typography>
        
        <TextField
          fullWidth
          size="small"
          label="Customer Part ID (Optional)"
          placeholder="Enter Customer Part ID"
          value={customerPartId}
          onChange={(e) => onCustomerPartIdChange(e.target.value)}
          sx={{ mb: 2, ...sidebarStyles.textField }}
          helperText="Search by specific Customer Part identifier"
        />
        
        <TextField
          fullWidth
          size="small"
          label="Manufacturer Part ID (Optional)"
          placeholder="Enter Manufacturer Part ID"
          value={manufacturerPartId}
          onChange={(e) => onManufacturerPartIdChange(e.target.value)}
          sx={{ mb: 2, ...sidebarStyles.textField }}
          helperText="Search by specific Manufacturer Part identifier"
        />
        
        <TextField
          fullWidth
          size="small"
          label="Global Asset ID (Optional)"
          placeholder="Enter Global Asset ID"
          value={globalAssetId}
          onChange={(e) => onGlobalAssetIdChange(e.target.value)}
          sx={{ mb: 2, ...sidebarStyles.textField }}
          helperText="Global Asset ID of the Digital Twin"
        />
        
        {/* Part Instance ID - Only shown when Part Instance is selected */}
        {partType === 'Serialized' && (
          <TextField
            fullWidth
            size="small"
            label="Part Instance ID (Optional)"
            placeholder="Enter Part Instance identifier"
            value={partInstanceId}
            onChange={(e) => onPartInstanceIdChange(e.target.value)}
            sx={{ mb: 2, ...sidebarStyles.textField }}
            helperText="Search by specific Part Instance identifier"
          />
        )}
      </Box>
    </>
  );
};

export default PartsDiscoverySidebar;
