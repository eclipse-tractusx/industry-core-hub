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
import { CalendarMonth } from '@mui/icons-material';
import { HeaderCardProps } from '@/features/eco-pass-kit/passport-consumption/passport-types/base/BasePassportVisualization';
import { PcfNestedData } from '../../types/pcfNestedData';
import { normalizePcfData } from '../../utils/pcfNormalizer';
import './PcfPeriodCard.scss';

/**
 * Header card showing the reference period, validity dates and spec version.
 * Extracted from pcfAssessmentAndMethodology.pcfAssessmentInformation.time.
 */
export const PcfPeriodCard: React.FC<HeaderCardProps> = ({ data }) => {
  const { t } = useTranslation('pcf');
  const pcf = normalizePcfData(data) as unknown as PcfNestedData;
  const time =
    pcf.pcfAssessmentAndMethodology?.[0]?.pcfAssessmentInformation?.[0]?.time?.[0];
  const scope = pcf.scopeOfPcfForm?.[0];

  const formatDate = (iso: string | undefined): string => {
    if (!iso) return 'N/A';
    try {
      return new Date(iso).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return iso;
    }
  };

  const idAndVersion =
    pcf.pcfAssessmentAndMethodology?.[0]?.pcfAssessmentInformation?.[0]?.idAndVersion?.[0];

  return (
    <Card className="pcf-period-card">
      <Box className="pcf-period-card__icon-row">
        <Box className="pcf-period-card__icon-wrapper">
          <CalendarMonth sx={{ fontSize: 26, color: '#f59e0b' }} />
        </Box>
        {idAndVersion?.status && (
          <Chip
            label={idAndVersion.status}
            size="small"
            className={`pcf-period-card__status-chip pcf-period-card__status-chip--${idAndVersion.status.toLowerCase()}`}
          />
        )}
      </Box>

      <Typography className="pcf-period-card__title">
        {t('headerCards.period.title')}
      </Typography>

      <Box className="pcf-period-card__rows">
        <Box className="pcf-period-card__row">
          <Typography className="pcf-period-card__label">{t('headerCards.period.start')}</Typography>
          <Typography className="pcf-period-card__value">
            {formatDate(time?.referencePeriodStart)}
          </Typography>
        </Box>

        <Box className="pcf-period-card__row">
          <Typography className="pcf-period-card__label">{t('headerCards.period.end')}</Typography>
          <Typography className="pcf-period-card__value">
            {formatDate(time?.referencePeriodEnd)}
          </Typography>
        </Box>

        <Box className="pcf-period-card__row">
          <Typography className="pcf-period-card__label">{t('headerCards.period.validUntil')}</Typography>
          <Typography className="pcf-period-card__value">
            {formatDate(time?.validityPeriodEnd)}
          </Typography>
        </Box>

        {scope?.specVersion && (
          <Box className="pcf-period-card__row">
            <Typography className="pcf-period-card__label">{t('headerCards.period.spec')}</Typography>
            <Typography className="pcf-period-card__value pcf-period-card__value--mono">
              {scope.specVersion}
            </Typography>
          </Box>
        )}
      </Box>
    </Card>
  );
};
