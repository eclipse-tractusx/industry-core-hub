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

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Card, Chip, Typography } from '@mui/material';
import { Co2 } from '@mui/icons-material';
import { HeaderCardProps } from '@/features/eco-pass-kit/passport-consumption/passport-types/base/BasePassportVisualization';
import { PcfNestedData } from '../../types/pcfNestedData';
import './PcfSummaryCard.scss';

const PCF_PRIMARY = '#10b981';
const PCF_SECONDARY = '#059669';

/**
 * Header card displaying the main carbon footprint values (kg CO2e/unit).
 * Shows both the PCF including and excluding biogenic uptake from the
 * first production stage entry.
 */
export const PcfSummaryCard: React.FC<HeaderCardProps> = ({ data }) => {
  const { t } = useTranslation('pcf');
  const pcf = data as unknown as PcfNestedData;
  const productionStage = pcf.productLifeCycleStagesAndEmissions?.[0]?.productionStage?.[0];
  const scope = pcf.scopeOfPcfForm?.[0];

  const pcfExcluding = productionStage?.pcfExcludingBiogenicUptake;
  const pcfIncluding = productionStage?.pcfIncludingBiogenicUptake;

  const formatValue = (v: number | undefined): string =>
    v !== undefined ? v.toLocaleString('en-US', { maximumFractionDigits: 4 }) : 'N/A';

  return (
    <Card className="pcf-summary-card">
      <Box className="pcf-summary-card__icon-row">
        <Box className="pcf-summary-card__icon-wrapper">
          <Co2 sx={{ fontSize: 28, color: PCF_PRIMARY }} />
        </Box>
        {scope?.partialFullPcf && (
          <Chip
            label={scope.partialFullPcf}
            size="small"
            className="pcf-summary-card__scope-chip"
          />
        )}
      </Box>

      <Typography className="pcf-summary-card__title">
        {t('headerCards.summary.title')}
      </Typography>

      <Box className="pcf-summary-card__values">
        <Box className="pcf-summary-card__value-item">
          <Typography className="pcf-summary-card__value-label">
            {t('headerCards.summary.exclBiogenic')}
          </Typography>
          <Typography
            className="pcf-summary-card__value-number"
            sx={{ color: PCF_PRIMARY }}
          >
            {formatValue(pcfExcluding)}
          </Typography>
          <Typography className="pcf-summary-card__value-unit">
            {t('headerCards.summary.unit')}
          </Typography>
        </Box>

        <Box className="pcf-summary-card__divider" />

        <Box className="pcf-summary-card__value-item">
          <Typography className="pcf-summary-card__value-label">
            {t('headerCards.summary.inclBiogenic')}
          </Typography>
          <Typography
            className="pcf-summary-card__value-number"
            sx={{ color: PCF_SECONDARY }}
          >
            {formatValue(pcfIncluding)}
          </Typography>
          <Typography className="pcf-summary-card__value-unit">
            {t('headerCards.summary.unit')}
          </Typography>
        </Box>
      </Box>
    </Card>
  );
};
