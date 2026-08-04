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
 * License for the specific language governing permissions and limitations
 * under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 ********************************************************************************/

/**
 * PcfVersionBlock
 *
 * One of the two per-version blocks shown below the combined overview on the
 * PCF Management page. Each block represents a single PCF submodel version
 * (v9.0.0 or v7.0.0) and exposes its own "View Details" and "Update" actions.
 *
 * When the version is not yet stored on the backend (data === null) the block
 * renders a "does not exist" state with a single call-to-action.
 */

import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Typography, Chip, Button, alpha } from '@mui/material';
import {
  Co2,
  Visibility,
  Edit,
  CheckCircle,
  CalendarMonth,
  Speed,
  AddCircleOutline,
  ErrorOutline,
} from '@mui/icons-material';
import type { PcfNestedData } from '../types/pcfNestedData';
import { normalizePcfData } from '../utils/pcfNormalizer';
import {
  getPcfExcludingBiogenic,
  getPcfIncludingBiogenic,
  getDeclaredUnit,
  getReferencePeriod,
  getPrimaryDataShare,
  getSpecVersion,
  formatEmissionValue,
  formatDeclaredUnit,
  formatReferencePeriod,
  getPrimaryDataShareColor,
} from '../utils/pcfDataExtractors';

const V9_COLOR = '#10b981';
const V7_COLOR = '#3b82f6';

export type PcfVersionKey = 'v9.0.0' | 'v7.0.0';

interface PcfVersionBlockProps {
  version: PcfVersionKey;
  /** Raw backend payload for this version, or null when it doesn't exist yet. */
  data: Record<string, unknown> | null;
  onViewDetails: () => void;
  onUpdate: () => void;
  /** CTA used when the version doesn't exist yet (create / complete). */
  onCreate: () => void;
  busy?: boolean;
}

const PcfVersionBlock: React.FC<PcfVersionBlockProps> = ({
  version,
  data,
  onViewDetails,
  onUpdate,
  onCreate,
  busy = false,
}) => {
  const { t } = useTranslation('pcf');
  const accent = version === 'v9.0.0' ? V9_COLOR : V7_COLOR;
  const exists = data !== null;

  const normalized = useMemo<PcfNestedData | null>(
    () => (data ? normalizePcfData(data) : null),
    [data],
  );

  const pcfExcl = normalized ? getPcfExcludingBiogenic(normalized) : null;
  const pcfIncl = normalized ? getPcfIncludingBiogenic(normalized) : null;
  const declaredUnit = normalized ? getDeclaredUnit(normalized) : null;
  const unitLabel = formatDeclaredUnit(declaredUnit);
  const period = normalized ? getReferencePeriod(normalized) : null;
  const primaryShare = normalized ? getPrimaryDataShare(normalized) : null;
  const specVersion = normalized ? getSpecVersion(normalized) : null;

  return (
    <Box
      sx={{
        p: 2.5,
        borderRadius: '14px',
        background: alpha(accent, 0.05),
        border: `1px solid ${alpha(accent, 0.25)}`,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        height: '100%',
      }}
    >
      {/* Header: version badge + status */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ p: 0.75, borderRadius: '8px', background: alpha(accent, 0.15) }}>
            <Co2 sx={{ color: accent, fontSize: 20 }} />
          </Box>
          <Box>
            <Typography variant="subtitle1" sx={{ color: '#fff', fontWeight: 700, lineHeight: 1.1 }}>
              PCF {version}
            </Typography>
            {specVersion && (
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.45)' }}>
                {t('management.specVersion')}: {specVersion}
              </Typography>
            )}
          </Box>
        </Box>
        <Chip
          icon={exists ? <CheckCircle sx={{ fontSize: 14 }} /> : <ErrorOutline sx={{ fontSize: 14 }} />}
          label={exists ? t('dualWizard.versionState.SUBIDO') : t('dualWizard.versionState.NO_EXISTE')}
          size="small"
          sx={{
            backgroundColor: exists ? alpha(accent, 0.15) : alpha('#94a3b8', 0.15),
            color: exists ? accent : '#94a3b8',
            border: `1px solid ${alpha(exists ? accent : '#94a3b8', 0.3)}`,
            fontWeight: 600,
            '& .MuiChip-icon': { color: exists ? accent : '#94a3b8' },
          }}
        />
      </Box>

      {exists ? (
        <>
          {/* KPI values */}
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
            <Box sx={{ p: 1.5, borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.66rem' }}>
                {t('management.panes.pcfExclBiogenic')}
              </Typography>
              <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700, lineHeight: 1.15 }}>
                {formatEmissionValue(pcfExcl)}
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.62rem' }}>
                kg CO₂e {unitLabel}
              </Typography>
            </Box>
            <Box sx={{ p: 1.5, borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.66rem' }}>
                {t('management.panes.pcfInclBiogenic')}
              </Typography>
              <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700, lineHeight: 1.15 }}>
                {formatEmissionValue(pcfIncl)}
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.62rem' }}>
                kg CO₂e {unitLabel}
              </Typography>
            </Box>
          </Box>

          {/* Reference period + primary data share */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <CalendarMonth sx={{ fontSize: 13, color: '#f59e0b' }} />
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.72rem' }}>
                {formatReferencePeriod(period)}
              </Typography>
            </Box>
            {primaryShare !== null && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Speed sx={{ fontSize: 13, color: getPrimaryDataShareColor(primaryShare) }} />
                <Typography variant="caption" sx={{ color: getPrimaryDataShareColor(primaryShare), fontWeight: 700, fontSize: '0.72rem' }}>
                  {primaryShare.toFixed(0)}%
                </Typography>
              </Box>
            )}
          </Box>

          {/* Actions */}
          <Box sx={{ display: 'flex', gap: 1.5, mt: 'auto' }}>
            <Button
              variant="outlined"
              startIcon={<Visibility />}
              onClick={onViewDetails}
              sx={{
                flex: 1, py: 1, borderRadius: '10px', textTransform: 'none', fontWeight: 600,
                borderColor: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.8)',
                '&:hover': { borderColor: accent, backgroundColor: alpha(accent, 0.1), color: '#fff', '& .MuiSvgIcon-root': { color: accent } },
              }}
            >
              {t('management.viewDetails')}
            </Button>
            <Button
              variant="outlined"
              startIcon={<Edit />}
              onClick={onUpdate}
              disabled={busy}
              sx={{
                flex: 1, py: 1, borderRadius: '10px', textTransform: 'none', fontWeight: 600,
                borderColor: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.8)',
                '&:hover': { borderColor: accent, backgroundColor: alpha(accent, 0.1), color: '#fff', '& .MuiSvgIcon-root': { color: accent } },
              }}
            >
              {t('management.update')}
            </Button>
          </Box>
        </>
      ) : (
        /* Does-not-exist state */
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 1.5, py: 2, mt: 'auto' }}>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)' }}>
            {t('management.versionMissing', { version })}
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddCircleOutline />}
            onClick={onCreate}
            disabled={busy}
            sx={{
              py: 1, px: 3, borderRadius: '10px', textTransform: 'none', fontWeight: 600,
              background: `linear-gradient(135deg, ${accent} 0%, ${alpha(accent, 0.7)} 100%)`,
            }}
          >
            {t('management.createVersion')}
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default PcfVersionBlock;
