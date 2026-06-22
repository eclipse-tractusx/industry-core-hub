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
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Box, CircularProgress, Alert, Fab, Tooltip } from '@mui/material';
import { Edit } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { BasePassportVisualization } from '@/features/eco-pass-kit/passport-consumption/passport-types/base/BasePassportVisualization';
import { JsonSchema } from '@/features/eco-pass-kit/passport-consumption/types';
import { getPcfByManufacturerPartId, type PcfVersion } from '../../services/pcfApi';
import { PcfNestedData } from '../types/pcfNestedData';
import { PcfSummaryCard } from '../components/header-cards/PcfSummaryCard';
import { PcfCompanyCard } from '../components/header-cards/PcfCompanyCard';
import { PcfPeriodCard } from '../components/header-cards/PcfPeriodCard';
import { normalizePcfData } from '../utils/pcfNormalizer';
import { detectPcfVersion } from '../utils/pcfVersionDetector';
import { getSchemaByNamespaceAndVersion } from '@/schemas';
import type { SchemaDefinition } from '@/schemas';
import './PcfDetailsPage.scss';

const PCF_NAMESPACE = 'io.catenax.pcf';

/** Normalize a `?version=` query value to the API's PcfVersion key, or null. */
const toPcfVersionKey = (raw: string | null): PcfVersion | null => {
  if (!raw) return null;
  const v = raw.startsWith('v') ? raw : `v${raw}`;
  return v === 'v9.0.0' || v === 'v7.0.0' ? (v as PcfVersion) : null;
};

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
  const [searchParams] = useSearchParams();
  const { t } = useTranslation('pcf');

  // Requested version from the ?version= query param (e.g. "9.0.0" / "7.0.0").
  const requestedVersion = toPcfVersionKey(searchParams.get('version'));

  // The data passed to BasePassportVisualization. For v9 it is the canonical
  // nested model; for v7 it is the raw flat payload (rendered against the v7
  // schema directly, so the v7 structure is shown faithfully — not normalized).
  const [pcfData, setPcfData] = useState<Record<string, unknown> | null>(null);
  const [pcfSchema, setPcfSchema] = useState<SchemaDefinition | null>(null);
  // Whether the rendered data is in the canonical v9 nested shape (drives the
  // v9-specific header cards, which assume the nested structure).
  const [isV9Shape, setIsV9Shape] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!manufacturerPartId) return;

    const loadPcf = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const raw = await getPcfByManufacturerPartId(
          manufacturerPartId,
          requestedVersion ?? undefined,
        );
        if (!raw) {
          setError(t('error.pcfNotFound', 'PCF data not found for this part.'));
          return;
        }
        // Resolve the effective version: the explicit query param wins, else
        // fall back to shape-based detection ("9.0.0" | "7.0.0").
        const detected = detectPcfVersion(raw);
        const effective = requestedVersion
          ? requestedVersion.replace(/^v/, '')
          : detected;

        if (effective === '7.0.0') {
          // v7: render the raw flat payload against the v7 schema so the v7
          // structure is shown as-is. Fall back to v9 (normalized) only if the
          // v7 schema is somehow unavailable.
          const v7Schema = getSchemaByNamespaceAndVersion(PCF_NAMESPACE, '7.0.0');
          if (v7Schema) {
            setPcfData(raw);
            setPcfSchema(v7Schema);
            setIsV9Shape(false);
            return;
          }
        }

        // v9 (or fallback): normalize to the canonical nested model + v9 schema.
        const normalized = normalizePcfData(raw) as unknown as Record<string, unknown>;
        const schema =
          getSchemaByNamespaceAndVersion(PCF_NAMESPACE, '9.0.0') ??
          getSchemaByNamespaceAndVersion(PCF_NAMESPACE, detected);
        setPcfData(normalized);
        setPcfSchema(schema ?? null);
        setIsV9Shape(true);
      } catch (err) {
        const message = err instanceof Error ? err.message : t('error.failedToLoadPcf');
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    loadPcf();
  }, [manufacturerPartId, requestedVersion, t]);

  if (isLoading) {
    return (
      <Box className="pcf-details-page__loading">
        <CircularProgress sx={{ color: '#10b981' }} size={48} />
      </Box>
    );
  }

  if (error || !pcfData || !pcfSchema) {
    return (
      <Box className="pcf-details-page__error">
        <Alert severity="error" sx={{ maxWidth: 520 }}>
          {error ?? t('error.generic', 'An unexpected error occurred.')}
        </Alert>
      </Box>
    );
  }

  // Extract display names — handle both the v9 nested shape and the v7 flat shape.
  const nested = isV9Shape ? (pcfData as unknown as PcfNestedData) : null;
  const productName =
    nested?.companyAndProductInformation?.[0]?.productInformation?.[0]?.productNameCompany ??
    (pcfData.productName as string | undefined) ??
    manufacturerPartId;

  const specVersion = isV9Shape
    ? nested?.scopeOfPcfForm?.[0]?.specVersion
    : (pcfData.specVersion as string | undefined);

  // The version label shown in the header / edit link.
  const versionLabel = isV9Shape ? '9.0.0' : '7.0.0';

  return (
    // Relative container so the FAB can be positioned fixed without layout issues
    <Box className="pcf-details-page">
      <BasePassportVisualization
        schema={pcfSchema.rawSchema as unknown as JsonSchema}
        data={pcfData}
        passportId={manufacturerPartId ?? ''}
        onBack={() => navigate(-1)}
        passportName={productName}
        passportVersion={specVersion}
        config={{
          // The header cards normalize their input internally, so the same
          // representative summary renders for both the v9 nested shape and the
          // raw v7 flat shape (which is shown faithfully in the tabs below).
          headerCards: [PcfSummaryCard, PcfCompanyCard, PcfPeriodCard],
          hideActionButtons: ['dataContract', 'exportPdf'],
        }}
      />

      {/* FAB — Edit button, visible in bottom-right corner over the visualization */}
      <Tooltip title={t('management.update', 'Update PCF')} placement="left">
        <Fab
          className="pcf-details-page__edit-fab"
          onClick={() =>
            navigate(
              `/pcf/management/edit/${encodeURIComponent(manufacturerPartId ?? '')}?version=${versionLabel}`,
            )
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
