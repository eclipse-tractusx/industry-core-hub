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

import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  LinearProgress,
  Tooltip,
  Alert,
  alpha
} from '@mui/material';
import {
  CloudUpload,
  Edit,
  Visibility,
  CheckCircle,
  Co2,
  CalendarMonth,
  Speed,
  Publish,
  DraftsOutlined,
  Category,
  Timeline,
} from '@mui/icons-material';
import { ManagedPart } from '../api/pcfExchangeApi';
import type { PcfNestedData } from '../../pcf-management/types/pcfNestedData';
import {
  getPcfExcludingBiogenic,
  getPcfIncludingBiogenic,
  getDeclaredUnit,
  getPcfScope,
  getReferencePeriod,
  getPrimaryDataShare,
  getPcfStatus,
  getPcfType,
  formatEmissionValue,
  formatDeclaredUnit,
  formatReferencePeriod,
  mapPcfStatus,
  formatPcfType,
  getPrimaryDataShareColor,
} from '../../pcf-management/utils/pcfDataExtractors';

// PCF Green Theme
const PCF_PRIMARY = '#10b981';
const PCF_SECONDARY = '#059669';

interface PcfManagementSectionProps {
  part: ManagedPart;
  pcfData: PcfNestedData | null;
  onUpload: () => void;
  onEdit: () => void;
  onVisualize: () => void;
  onPublish: () => void;
  isLoading?: boolean;
  /** When true, renders only the KPI content without Card wrapper, header, or duplicate states */
  contentOnly?: boolean;
}

const PcfManagementSection: React.FC<PcfManagementSectionProps> = ({
  part,
  pcfData,
  onUpload,
  onEdit,
  onVisualize,
  onPublish,
  isLoading = false,
  contentOnly = false
}) => {
  const { t } = useTranslation('pcf');

  const hasPcf = part.hasPcf && pcfData;

  // Derived values from the nested PCF structure
  const pcfExcl = pcfData ? getPcfExcludingBiogenic(pcfData) : null;
  const pcfIncl = pcfData ? getPcfIncludingBiogenic(pcfData) : null;
  const declaredUnit = pcfData ? getDeclaredUnit(pcfData) : null;
  const scope = pcfData ? getPcfScope(pcfData) : null;
  const period = pcfData ? getReferencePeriod(pcfData) : null;
  const primaryShare = pcfData ? getPrimaryDataShare(pcfData) : null;
  const rawStatus = pcfData ? getPcfStatus(pcfData) : null;
  const uiStatus = mapPcfStatus(rawStatus);
  const pcfType = pcfData ? getPcfType(pcfData) : null;

  const isDraft = uiStatus === 'DRAFT';
  const isPublished = uiStatus === 'PUBLISHED';

  const unitLabel = formatDeclaredUnit(declaredUnit);
  const shareColor = getPrimaryDataShareColor(primaryShare);

  // PCF Values display — the 6 key KPIs from the real nested PCF data
  const renderPcfValues = () => {
    if (!pcfData) return null;

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

        {/* ── Row 1: The two main PCF values (large, prominent) ── */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 2,
          }}
        >
          {/* KPI 1 — PCF excl. biogenic (THE main value) */}
          <Box
            sx={{
              p: 2,
              borderRadius: '12px',
              background: alpha(PCF_PRIMARY, 0.08),
              border: `1px solid ${alpha(PCF_PRIMARY, 0.2)}`,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.75 }}>
              <Co2 sx={{ fontSize: 14, color: PCF_PRIMARY }} />
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.55)', fontWeight: 500 }}>
                {t('management.panes.pcfExclBiogenic')}
              </Typography>
            </Box>
            <Typography variant="h5" sx={{ color: '#fff', fontWeight: 700, lineHeight: 1.1 }}>
              {formatEmissionValue(pcfExcl)}
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.45)' }}>
              kg CO₂e {unitLabel}
            </Typography>
          </Box>

          {/* KPI 2 — PCF incl. biogenic */}
          <Box
            sx={{
              p: 2,
              borderRadius: '12px',
              background: alpha('#3b82f6', 0.08),
              border: `1px solid ${alpha('#3b82f6', 0.2)}`,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.75 }}>
              <Co2 sx={{ fontSize: 14, color: '#3b82f6' }} />
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.55)', fontWeight: 500 }}>
                {t('management.panes.pcfInclBiogenic')}
              </Typography>
            </Box>
            <Typography variant="h5" sx={{ color: '#fff', fontWeight: 700, lineHeight: 1.1 }}>
              {formatEmissionValue(pcfIncl)}
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.45)' }}>
              kg CO₂e {unitLabel}
            </Typography>
          </Box>
        </Box>

        {/* ── Row 2: Scope + Reference Period + Primary Data Share ── */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'auto 1fr auto',
            gap: 2,
            p: 2,
            borderRadius: '12px',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            alignItems: 'center',
          }}
        >
          {/* KPI 3 — Scope chip */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Category sx={{ fontSize: 13, color: '#a855f7' }} />
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.68rem' }}>
                {t('management.panes.scope')}
              </Typography>
            </Box>
            <Chip
              label={scope ?? 'N/A'}
              size="small"
              sx={{
                backgroundColor: scope === 'Cradle-to-gate'
                  ? alpha('#10b981', 0.15)
                  : alpha('#f59e0b', 0.15),
                color: scope === 'Cradle-to-gate' ? '#10b981' : '#f59e0b',
                border: `1px solid ${alpha(scope === 'Cradle-to-gate' ? '#10b981' : '#f59e0b', 0.3)}`,
                fontWeight: 600,
                fontSize: '0.7rem',
                height: 22,
              }}
            />
          </Box>

          {/* KPI 4 — Reference Period */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, px: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <CalendarMonth sx={{ fontSize: 13, color: '#f59e0b' }} />
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.68rem' }}>
                {t('management.panes.referencePeriod')}
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)', fontWeight: 600, fontSize: '0.82rem' }}>
              {formatReferencePeriod(period)}
            </Typography>
          </Box>

          {/* KPI 6 — PCF Type badge */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'flex-end' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Timeline sx={{ fontSize: 13, color: '#64748b' }} />
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.68rem' }}>
                {t('management.panes.type')}
              </Typography>
            </Box>
            <Tooltip title={pcfType ?? 'N/A'} arrow>
              <Typography
                variant="caption"
                sx={{
                  color: 'rgba(255,255,255,0.6)',
                  fontWeight: 500,
                  fontSize: '0.75rem',
                  cursor: 'default',
                  maxWidth: 110,
                  textAlign: 'right',
                  lineHeight: 1.2,
                }}
              >
                {formatPcfType(pcfType)}
              </Typography>
            </Tooltip>
          </Box>
        </Box>

        {/* ── Row 3: Primary Data Share (quality indicator) ── */}
        {primaryShare !== null && (
          <Box
            sx={{
              p: 2,
              borderRadius: '12px',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Speed sx={{ fontSize: 13, color: shareColor }} />
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.55)', fontWeight: 500 }}>
                  {t('management.panes.primaryDataShare')}
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ color: shareColor, fontWeight: 700, fontSize: '0.85rem' }}>
                {primaryShare.toFixed(0)}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={primaryShare}
              sx={{
                height: 6,
                borderRadius: 3,
                backgroundColor: 'rgba(255,255,255,0.08)',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 3,
                  backgroundColor: shareColor,
                },
              }}
            />
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.35)', mt: 0.5, display: 'block' }}>
              {primaryShare >= 70 ? t('management.quality.high') :
               primaryShare >= 40 ? t('management.quality.medium') :
               t('management.quality.low')}
            </Typography>
          </Box>
        )}

      </Box>
    );
  };

  // contentOnly mode: render just the KPI content (used when already inside an outer Card)
  if (contentOnly) {
    if (isLoading) return null;
    if (!hasPcf) return null;
    return (
      <>
        {renderPcfValues()}

        {/* Draft Alert */}
        {isDraft && (
          <Alert
            severity="warning"
            icon={<DraftsOutlined />}
            sx={{
              mt: 2,
              borderRadius: '10px',
              backgroundColor: alpha('#eab308', 0.1),
              border: `1px solid ${alpha('#eab308', 0.2)}`,
              '& .MuiAlert-icon': { color: '#eab308' },
              '& .MuiAlert-message': { color: '#eab308' }
            }}
          >
            <Typography variant="body2" sx={{ color: '#eab308' }}>
              {t('management.draftAlert')}
            </Typography>
          </Alert>
        )}

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 1.5, mt: 3 }}>
          <Button
            variant="outlined"
            startIcon={<Visibility />}
            onClick={onVisualize}
            sx={{
              flex: 1, py: 1.25, borderRadius: '10px', textTransform: 'none', fontWeight: 600,
              borderColor: 'rgba(255, 255, 255, 0.2)', color: 'rgba(255, 255, 255, 0.8)',
              '&:hover': { borderColor: PCF_PRIMARY, backgroundColor: alpha(PCF_PRIMARY, 0.1), color: '#fff', '& .MuiSvgIcon-root': { color: PCF_PRIMARY } }
            }}
          >
            {t('management.viewDetails')}
          </Button>
          <Button
            variant="outlined"
            startIcon={<Edit />}
            onClick={onEdit}
            sx={{
              flex: 1, py: 1.25, borderRadius: '10px', textTransform: 'none', fontWeight: 600,
              borderColor: 'rgba(255, 255, 255, 0.2)', color: 'rgba(255, 255, 255, 0.8)',
              '&:hover': { borderColor: '#3b82f6', backgroundColor: alpha('#3b82f6', 0.1), color: '#fff', '& .MuiSvgIcon-root': { color: '#3b82f6' } }
            }}
          >
            {t('management.update')}
          </Button>
          {isDraft && (
            <Button
              variant="contained"
              startIcon={<Publish />}
              onClick={onPublish}
              sx={{
                flex: 1, py: 1.25, borderRadius: '10px', textTransform: 'none', fontWeight: 600,
                background: `linear-gradient(135deg, ${PCF_PRIMARY} 0%, ${PCF_SECONDARY} 100%)`,
                '&:hover': { background: `linear-gradient(135deg, ${PCF_SECONDARY} 0%, ${PCF_PRIMARY} 100%)` }
              }}
            >
              {t('management.publish')}
            </Button>
          )}
        </Box>
      </>
    );
  }

  return (
    <Card
      sx={{
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '16px',
        mb: 3
      }}
    >
      <CardContent sx={{ p: 3 }}>
        {/* Section Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                p: 1,
                borderRadius: '8px',
                background: alpha(PCF_PRIMARY, 0.15)
              }}
            >
              <Co2 sx={{ color: PCF_PRIMARY }} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600 }}>
                {t('management.sectionTitle')}
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                {t('management.sectionSubtitle')}
              </Typography>
            </Box>
          </Box>

          {/* Status Badge */}
          {hasPcf && (
            <Chip
              icon={
                isPublished ? (
                  <CheckCircle sx={{ fontSize: 14 }} />
                ) : (
                  <DraftsOutlined sx={{ fontSize: 14 }} />
                )
              }
              label={isPublished ? t('common.published') : t('common.draft')}
              size="small"
              sx={{
                backgroundColor: isPublished
                  ? alpha(PCF_PRIMARY, 0.15)
                  : alpha('#eab308', 0.15),
                color: isPublished ? PCF_PRIMARY : '#eab308',
                border: `1px solid ${alpha(isPublished ? PCF_PRIMARY : '#eab308', 0.3)}`,
                fontWeight: 600,
                '& .MuiChip-icon': {
                  color: isPublished ? PCF_PRIMARY : '#eab308'
                }
              }}
            />
          )}
        </Box>

        {/* Loading State */}
        {isLoading && (
          <Box sx={{ mb: 3 }}>
            <LinearProgress
              sx={{
                borderRadius: 2,
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                '& .MuiLinearProgress-bar': {
                  backgroundColor: PCF_PRIMARY
                }
              }}
            />
          </Box>
        )}

        {/* No PCF Data */}
        {!hasPcf && !isLoading && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 2
              }}
            >
              <CloudUpload sx={{ fontSize: 28, color: 'rgba(255, 255, 255, 0.3)' }} />
            </Box>
            <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 1 }}>
              {t('management.noPcfData')}
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.4)', display: 'block', mb: 3 }}>
              {t('management.noPcfDataHint')}
            </Typography>
            <Button
              variant="contained"
              startIcon={<CloudUpload />}
              onClick={onUpload}
              sx={{
                px: 4,
                py: 1.5,
                borderRadius: '10px',
                textTransform: 'none',
                fontWeight: 600,
                background: `linear-gradient(135deg, ${PCF_PRIMARY} 0%, ${PCF_SECONDARY} 100%)`,
                '&:hover': {
                  background: `linear-gradient(135deg, ${PCF_SECONDARY} 0%, ${PCF_PRIMARY} 100%)`
                }
              }}
            >
              {t('management.uploadPcfData')}
            </Button>
          </Box>
        )}

        {/* Has PCF Data */}
        {hasPcf && !isLoading && (
          <>
            {/* PCF Values — 6 KPIs */}
            {renderPcfValues()}

            {/* Draft Alert */}
            {isDraft && (
              <Alert
                severity="warning"
                icon={<DraftsOutlined />}
                sx={{
                  mt: 2,
                  borderRadius: '10px',
                  backgroundColor: alpha('#eab308', 0.1),
                  border: `1px solid ${alpha('#eab308', 0.2)}`,
                  '& .MuiAlert-icon': {
                    color: '#eab308'
                  },
                  '& .MuiAlert-message': {
                    color: '#eab308'
                  }
                }}
              >
                <Typography variant="body2" sx={{ color: '#eab308' }}>
                  {t('management.draftAlert')}
                </Typography>
              </Alert>
            )}

            {/* Action Buttons */}
            <Box sx={{ display: 'flex', gap: 1.5, mt: 3 }}>
              <Button
                variant="outlined"
                startIcon={<Visibility />}
                onClick={onVisualize}
                sx={{
                  flex: 1,
                  py: 1.25,
                  borderRadius: '10px',
                  textTransform: 'none',
                  fontWeight: 600,
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                  color: 'rgba(255, 255, 255, 0.8)',
                  '&:hover': {
                    borderColor: PCF_PRIMARY,
                    backgroundColor: alpha(PCF_PRIMARY, 0.1),
                    color: '#fff',
                    '& .MuiSvgIcon-root': { color: PCF_PRIMARY }
                  }
                }}
              >
                {t('management.viewDetails')}
              </Button>
              <Button
                variant="outlined"
                startIcon={<Edit />}
                onClick={onEdit}
                sx={{
                  flex: 1,
                  py: 1.25,
                  borderRadius: '10px',
                  textTransform: 'none',
                  fontWeight: 600,
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                  color: 'rgba(255, 255, 255, 0.8)',
                  '&:hover': {
                    borderColor: '#3b82f6',
                    backgroundColor: alpha('#3b82f6', 0.1),
                    color: '#fff',
                    '& .MuiSvgIcon-root': { color: '#3b82f6' }
                  }
                }}
              >
                {t('management.update')}
              </Button>
              {isDraft && (
                <Button
                  variant="contained"
                  startIcon={<Publish />}
                  onClick={onPublish}
                  sx={{
                    flex: 1,
                    py: 1.25,
                    borderRadius: '10px',
                    textTransform: 'none',
                    fontWeight: 600,
                    background: `linear-gradient(135deg, ${PCF_PRIMARY} 0%, ${PCF_SECONDARY} 100%)`,
                    '&:hover': {
                      background: `linear-gradient(135deg, ${PCF_SECONDARY} 0%, ${PCF_PRIMARY} 100%)`
                    }
                  }}
                >
                  {t('management.publish')}
                </Button>
              )}
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default PcfManagementSection;
