/********************************************************************************
 * Eclipse Tractus-X - Industry Core Hub Frontend
 *
 * Copyright (c) 2026 Contributors to the Eclipse Foundation
 * Copyright (c) 2026 LKS Next
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

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Box, CircularProgress, Alert, Fab, Tooltip } from '@mui/material';
import { Edit } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { BasePassportVisualization } from '@/features/eco-pass-kit/passport-consumption/passport-types/base/BasePassportVisualization';
import { JsonSchema } from '@/features/eco-pass-kit/passport-consumption/types';
import { getPcfByManufacturerPartId } from '../../services/pcfApi';
import { PcfNestedData } from '../types/pcfNestedData';
import { PcfSummaryCard } from '../components/header-cards/PcfSummaryCard';
import { PcfCompanyCard } from '../components/header-cards/PcfCompanyCard';
import { PcfPeriodCard } from '../components/header-cards/PcfPeriodCard';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import PcfSchema from '@/schemas/catena-x/Pcf-schema-v9.0.0.json';
import './PcfDetailsPage.scss';

/**
 * Full-screen details view for a PCF (Product Carbon Footprint).
 *
 * Reuses BasePassportVisualization (same pattern as Passport Provisioning details)
 * to render all 7 sections of the PCF schema in auto-generated tabs with
 * collapsible header summary cards.
 *
 * Accessible from PcfManagementPage via navigate('/pcf/management/details/:manufacturerPartId').
 * An Edit FAB allows navigating directly to the Update page.
 */
const PcfDetailsPage: React.FC = () => {
  const { manufacturerPartId } = useParams<{ manufacturerPartId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation('pcf');

  const [pcfData, setPcfData] = useState<PcfNestedData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!manufacturerPartId) return;

    const loadPcf = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const raw = await getPcfByManufacturerPartId(manufacturerPartId);
        if (!raw) {
          setError(t('error.pcfNotFound', 'PCF data not found for this part.'));
          return;
        }
        setPcfData(raw as unknown as PcfNestedData);
      } catch (err) {
        const message = err instanceof Error ? err.message : t('error.failedToLoadPcf');
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    loadPcf();
  }, [manufacturerPartId, t]);

  if (isLoading) {
    return (
      <Box className="pcf-details-page__loading">
        <CircularProgress sx={{ color: '#10b981' }} size={48} />
      </Box>
    );
  }

  if (error || !pcfData) {
    return (
      <Box className="pcf-details-page__error">
        <Alert severity="error" sx={{ maxWidth: 520 }}>
          {error ?? t('error.generic', 'An unexpected error occurred.')}
        </Alert>
      </Box>
    );
  }

  // Extract display names from the nested structure
  const productName =
    pcfData.companyAndProductInformation?.[0]?.productInformation?.[0]?.productNameCompany ??
    (pcfData.productName as string | undefined) ??
    manufacturerPartId;

  const specVersion = pcfData.scopeOfPcfForm?.[0]?.specVersion;

  return (
    // Relative container so the FAB can be positioned fixed without layout issues
    <Box className="pcf-details-page">
      <BasePassportVisualization
        schema={PcfSchema as unknown as JsonSchema}
        data={pcfData as unknown as Record<string, unknown>}
        passportId={manufacturerPartId ?? ''}
        onBack={() => navigate(-1)}
        passportName={productName}
        passportVersion={specVersion}
        config={{
          headerCards: [PcfSummaryCard, PcfCompanyCard, PcfPeriodCard],
          hideActionButtons: ['dataContract', 'exportPdf'],
        }}
      />

      {/* FAB — Edit button, visible in bottom-right corner over the visualization */}
      <Tooltip title={t('management.update', 'Update PCF')} placement="left">
        <Fab
          className="pcf-details-page__edit-fab"
          onClick={() =>
            navigate(`/pcf/management/edit/${encodeURIComponent(manufacturerPartId ?? '')}`)
          }
          aria-label={t('management.update', 'Update PCF')}
        >
          <Edit />
        </Fab>
      </Tooltip>
    </Box>
  );
};

export default PcfDetailsPage;
