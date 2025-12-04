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

import { Box, Grid2, Typography, Alert, CircularProgress } from '@mui/material';
import { useState, useEffect, useCallback } from 'react';
import { fetchAllSerializedParts } from '@/features/industry-core-kit/serialized-parts/api';
import SerializedPartsTable from '@/features/industry-core-kit/serialized-parts/components/SerializedPartsTable';
import { SerializedPart } from '@/features/industry-core-kit/serialized-parts/types';

const SerializedParts = () => {
  const [serializedParts, setSerializedParts] = useState<SerializedPart[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState<boolean>(false);

  const loadData = useCallback(async (isRetry: boolean = false) => {
    try {
      if (isRetry) {
        setIsRetrying(true);
      } else {
        setIsLoading(true);
      }
      setError(null);
      
      // Add timeout to prevent infinite loading
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout after 30 seconds')), 30000);
      });
      
      const data = await Promise.race([
        fetchAllSerializedParts(),
        timeoutPromise
      ]);
      
      setSerializedParts(data || []);
      
      // If we got empty data, show a warning but don't treat it as an error
      if (!data || data.length === 0) {
        console.warn('No serialized parts returned from backend');
      }
    } catch (error) {
      console.error("Error fetching serialized parts:", error);
      setError(
        error instanceof Error 
          ? error.message 
          : 'Failed to load serialized parts. Please check backend connectivity.'
      );
      setSerializedParts([]); // Ensure we have an empty array
    } finally {
      // Always clear loading states, even on error
      setIsLoading(false);
      setIsRetrying(false);
    }
  }, []); // No dependencies - this function should be stable

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = useCallback(() => {
    
    loadData(true);
  }, [loadData]);

  return (
    <Grid2 container direction="row">
      <Box sx={{ p: 3, mx: 'auto',  color: 'white'}} className="product-catalog title">
        <Typography className="text">Serialized Parts</Typography>
      </Box>
      <Box sx={{ p: 3, width: '100%', color: 'white'}}>
        {/* Error State */}
        {error && (
          <Alert 
            severity="error" 
            sx={{ mb: 2, backgroundColor: 'rgba(244, 67, 54, 0.1)', color: 'white' }}
            action={
              <button 
                onClick={() => loadData(true)} 
                disabled={isRetrying}
                style={{ 
                  background: 'none', 
                  border: '1px solid white', 
                  color: 'white', 
                  padding: '4px 8px', 
                  borderRadius: '4px',
                  cursor: isRetrying ? 'not-allowed' : 'pointer',
                  opacity: isRetrying ? 0.6 : 1
                }}
              >
                {isRetrying ? 'Retrying...' : 'Retry'}
              </button>
            }
          >
            {error}
          </Alert>
        )}

        {/* Loading State */}
        {isLoading && !error && (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
            <CircularProgress sx={{ color: 'white' }} />
            <Typography sx={{ ml: 2, color: 'white' }}>Loading serialized parts...</Typography>
          </Box>
        )}

        {/* Data State */}
        {!isLoading && !error && (
          <SerializedPartsTable 
            parts={serializedParts} 
            onView={(part) => {
              
            }}
            onRefresh={handleRefresh}
          />
        )}
      </Box>
    </Grid2>
  );
};

export default SerializedParts;