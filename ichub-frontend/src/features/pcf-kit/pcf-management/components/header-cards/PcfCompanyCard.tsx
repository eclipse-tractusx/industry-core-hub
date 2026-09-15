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
import { Box, Card, Typography } from '@mui/material';
import { Business } from '@mui/icons-material';
import { HeaderCardProps } from '@/features/eco-pass-kit/passport-consumption/passport-types/base/BasePassportVisualization';
import { PcfNestedData } from '../../types/pcfNestedData';
import './PcfCompanyCard.scss';

/**
 * Header card showing company name, BPN and product information.
 * Extracted from companyAndProductInformation section.
 */
export const PcfCompanyCard: React.FC<HeaderCardProps> = ({ data }) => {
  const { t } = useTranslation('pcf');
  const pcf = data as unknown as PcfNestedData;
  const companyInfo = pcf.companyAndProductInformation?.[0]?.companyInformation?.[0];
  const productInfo = pcf.companyAndProductInformation?.[0]?.productInformation?.[0];

  // Backend may also surface these at root level
  const companyName = companyInfo?.companyName ?? (pcf.companyName as string | undefined);
  const bpn = pcf.companyBpn as string | undefined;
  const productName = productInfo?.productNameCompany ?? (pcf.productName as string | undefined);

  const truncate = (s: string | undefined, max = 22): string =>
    s ? (s.length > max ? `${s.slice(0, max)}…` : s) : 'N/A';

  return (
    <Card className="pcf-company-card">
      <Box className="pcf-company-card__icon-row">
        <Box className="pcf-company-card__icon-wrapper">
          <Business sx={{ fontSize: 26, color: '#667eea' }} />
        </Box>
      </Box>

      <Typography className="pcf-company-card__title">
        {t('headerCards.company.title')}
      </Typography>

      <Box className="pcf-company-card__rows">
        <Box className="pcf-company-card__row">
          <Typography className="pcf-company-card__label">{t('headerCards.company.company')}</Typography>
          <Typography className="pcf-company-card__value" title={companyName}>
            {truncate(companyName)}
          </Typography>
        </Box>

        {bpn && (
          <Box className="pcf-company-card__row">
            <Typography className="pcf-company-card__label">{t('headerCards.company.bpn')}</Typography>
            <Typography className="pcf-company-card__value pcf-company-card__value--mono" title={bpn}>
              {truncate(bpn, 20)}
            </Typography>
          </Box>
        )}

        <Box className="pcf-company-card__row">
          <Typography className="pcf-company-card__label">{t('headerCards.company.product')}</Typography>
          <Typography className="pcf-company-card__value" title={productName}>
            {truncate(productName)}
          </Typography>
        </Box>

        {productInfo?.declaredUnitOfMeasurement && (
          <Box className="pcf-company-card__row">
            <Typography className="pcf-company-card__label">{t('headerCards.company.unit')}</Typography>
            <Typography className="pcf-company-card__value">
              {productInfo.declaredUnitAmount} {productInfo.declaredUnitOfMeasurement}
            </Typography>
          </Box>
        )}
      </Box>
    </Card>
  );
};
