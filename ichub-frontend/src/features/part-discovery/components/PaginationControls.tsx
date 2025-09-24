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
import { Box, Button, Typography, CircularProgress } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { ShellDiscoveryPaginator } from '../api';

interface PaginationControlsProps {
  paginator: ShellDiscoveryPaginator | null;
  currentPage: number;
  totalPages: number;
  pageLimit: number;
  isLoading: boolean;
  isLoadingNext: boolean;
  isLoadingPrevious: boolean;
  onPageChange: (page: number) => void;
}

export const PaginationControls: React.FC<PaginationControlsProps> = ({
  paginator,
  currentPage,
  totalPages,
  pageLimit,
  isLoading,
  isLoadingNext,
  isLoadingPrevious,
  onPageChange
}) => {
  if (!paginator || isLoading || pageLimit === 0) {
    return null;
  }

  return (
    <Box display="flex" justifyContent="center" alignItems="center" gap={2} sx={{ mt: 2, mb: 3, px: 2, flexShrink: 0 }}>
      {paginator.hasPrevious() && (
        <Button
          variant="outlined"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={isLoadingPrevious}
          startIcon={isLoadingPrevious ? (
            <CircularProgress 
              size={16} 
              sx={{ 
                color: 'currentColor',
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
      
      {paginator.hasNext() && (
        <Button
          variant="contained"
          onClick={() => onPageChange(currentPage + 1)}
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
  );
};
