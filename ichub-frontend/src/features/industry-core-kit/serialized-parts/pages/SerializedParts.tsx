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

import { Box, Typography, Alert, CircularProgress, Button } from '@mui/material';
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import PageSectionHeader from '@/components/common/PageSectionHeader';
import { kitThemes } from '@/theme/colors';
import { fetchAllSerializedParts } from '@/features/industry-core-kit/serialized-parts/api';
import SerializedPartsTable from '@/features/industry-core-kit/serialized-parts/components/SerializedPartsTable';
import { SerializedPart } from '@/features/industry-core-kit/serialized-parts/types';

const SerializedParts = () => {
  const { t } = useTranslation(['serializedParts', 'common']);
  const [serializedParts, setSerializedParts] = useState<SerializedPart[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState<boolean>(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState<boolean>(false);

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
    <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
      <Box sx={{ mb: 4 }}>
        <PageSectionHeader
          icon={<DashboardIcon />}
          title={t('page.title')}
          subtitle={t('page.subtitle')}
          kitTheme={kitThemes.industryCore}
          actions={
            <>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setIsAddDialogOpen(true)}
                sx={{
                  background: `linear-gradient(135deg, ${kitThemes.industryCore.gradientStart} 0%, ${kitThemes.industryCore.gradientEnd} 100%)`,
                  color: '#fff',
                  borderRadius: { xs: '10px', md: '12px' },
                  fontWeight: 600,
                  textTransform: 'none',
                  boxShadow: `0 4px 16px ${kitThemes.industryCore.shadowColor}`,
                  transition: 'all 0.2s ease',
                  '&:hover': { filter: 'brightness(1.1)', boxShadow: `0 6px 24px ${kitThemes.industryCore.shadowColor}`, transform: 'translateY(-1px)' }
                }}
              >
                {t('table.addSerializedPart')}
              </Button>
              <Button
                variant="contained"
                startIcon={isRetrying ? <CircularProgress size={16} color="inherit" /> : <RefreshIcon />}
                onClick={handleRefresh}
                disabled={isRetrying}
                sx={{
                  background: `linear-gradient(135deg, ${kitThemes.industryCore.gradientStart} 0%, ${kitThemes.industryCore.gradientEnd} 100%)`,
                  color: '#fff',
                  borderRadius: { xs: '10px', md: '12px' },
                  fontWeight: 600,
                  textTransform: 'none',
                  boxShadow: `0 4px 16px ${kitThemes.industryCore.shadowColor}`,
                  transition: 'all 0.2s ease',
                  '&:hover': { filter: 'brightness(1.1)', boxShadow: `0 6px 24px ${kitThemes.industryCore.shadowColor}`, transform: 'translateY(-1px)' }
                }}
              >
                {isRetrying ? t('common:actions.retrying') : t('common:actions.refresh')}
              </Button>
            </>
          }
        />
      </Box>
      <Box sx={{ color: 'white' }}>
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
                {isRetrying ? t('common:actions.retrying') : t('common:actions.retry')}
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
            <Typography sx={{ ml: 2, color: 'white' }}>{t('page.loading')}</Typography>
          </Box>
        )}

        {/* Data State */}
        {!isLoading && !error && (
          <SerializedPartsTable 
            parts={serializedParts} 
            onView={(part) => {
              
            }}
            onRefresh={handleRefresh}
            isAddDialogOpen={isAddDialogOpen}
            onAddDialogClose={() => setIsAddDialogOpen(false)}
          />
        )}
      </Box>
    </Box>
  );
};

export default SerializedParts;