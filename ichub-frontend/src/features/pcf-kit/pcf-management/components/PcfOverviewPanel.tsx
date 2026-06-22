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
 * PcfOverviewPanel
 *
 * The top "combined" block of the PCF Management visualization.
 *
 * Surfaces the most representative carbon-footprint information shared by the
 * two PCF submodel versions (v9.0.0 + v7.0.0) and renders it visually:
 *   - Headline KPIs (PCF excl./incl. biogenic, declared unit, scope, period…)
 *   - Emissions breakdown chart (production-stage positions A–H)
 *   - Lifecycle-stage comparison chart (production / distribution / packaging)
 *   - Cross-version consistency chart (v9 vs v7 headline value)
 *   - Data-quality indicators (primary data share + DQR gauges)
 *
 * Both raw version payloads are normalized to the canonical v9 nested model
 * (via normalizePcfData) so a single set of extractors drives every figure.
 */

import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Typography, Chip, Tooltip, alpha } from '@mui/material';
import {
  Co2,
  Category,
  CalendarMonth,
  Public,
  Speed,
  Insights,
  CompareArrows,
  Factory,
  CheckCircle,
  ErrorOutline,
} from '@mui/icons-material';
import { BarChart } from '@mui/x-charts/BarChart';
import { Gauge, gaugeClasses } from '@mui/x-charts/Gauge';
import type { PcfNestedData } from '../types/pcfNestedData';
import { normalizePcfData } from '../utils/pcfNormalizer';
import {
  getPcfExcludingBiogenic,
  getPcfIncludingBiogenic,
  getDeclaredUnit,
  getPcfScope,
  getReferencePeriod,
  getPrimaryDataShare,
  getGeographyRegion,
  getGeographyCountry,
  getFossilGhgEmissions,
  getBiogenicNonCO2Emissions,
  getBiogenicCO2Uptake,
  getLandUseChangeEmissions,
  getAircraftGhgEmissions,
  getDistributionPcfExcludingBiogenic,
  getTechnologicalDQR,
  getTemporalDQR,
  getGeographicalDQR,
  formatEmissionValue,
  formatDeclaredUnit,
  formatReferencePeriod,
  getDqrColor,
  getPrimaryDataShareColor,
} from '../utils/pcfDataExtractors';

const PCF_PRIMARY = '#10b981';
const V9_COLOR = '#10b981';
const V7_COLOR = '#3b82f6';

interface PcfOverviewPanelProps {
  /** Raw v9.0.0 payload from the backend (canonical nested shape) or null. */
  v9Raw: Record<string, unknown> | null;
  /** Raw v7.0.0 payload from the backend (flat shape) or null. */
  v7Raw: Record<string, unknown> | null;
}

/** A surface card used for each sub-panel inside the overview. */
const Panel: React.FC<{ children: React.ReactNode; sx?: object }> = ({ children, sx }) => (
  <Box
    sx={{
      p: 2,
      borderRadius: '12px',
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.07)',
      ...sx,
    }}
  >
    {children}
  </Box>
);

const PanelTitle: React.FC<{ icon: React.ReactNode; label: string }> = ({ icon, label }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.5 }}>
    {icon}
    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', fontSize: '0.66rem' }}>
      {label}
    </Typography>
  </Box>
);

// Shared styling that recolors x-charts text for the dark theme. The default
// MUI x-charts text fill is near-black, which is invisible on the dark
// background — recolor every text node (tick labels, axis titles, legend).
const chartTextSx = {
  '& text': { fill: 'rgba(255,255,255,0.7) !important' },
  '& .MuiChartsAxis-tickLabel': { fill: 'rgba(255,255,255,0.6) !important' },
  '& .MuiChartsAxis-label': { fill: 'rgba(255,255,255,0.75) !important' },
  '& .MuiChartsAxis-line': { stroke: 'rgba(255,255,255,0.15) !important' },
  '& .MuiChartsAxis-tick': { stroke: 'rgba(255,255,255,0.15) !important' },
  '& .MuiChartsLegend-series text': { fill: 'rgba(255,255,255,0.7) !important' },
};

const PcfOverviewPanel: React.FC<PcfOverviewPanelProps> = ({ v9Raw, v7Raw }) => {
  const { t } = useTranslation('pcf');

  // Normalize each present version to the canonical v9 nested model.
  const v9 = useMemo<PcfNestedData | null>(() => (v9Raw ? normalizePcfData(v9Raw) : null), [v9Raw]);
  const v7 = useMemo<PcfNestedData | null>(() => (v7Raw ? normalizePcfData(v7Raw) : null), [v7Raw]);

  // Canonical record used for the headline values — prefer v9, fall back to v7.
  const canonical = v9 ?? v7;
  if (!canonical) return null;

  // ── Headline KPIs ────────────────────────────────────────────────────────
  const pcfExcl = getPcfExcludingBiogenic(canonical);
  const pcfIncl = getPcfIncludingBiogenic(canonical);
  const declaredUnit = getDeclaredUnit(canonical);
  const unitLabel = formatDeclaredUnit(declaredUnit);
  const scope = getPcfScope(canonical);
  const period = getReferencePeriod(canonical);
  const primaryShare = getPrimaryDataShare(canonical);
  const region = getGeographyRegion(canonical);
  const country = getGeographyCountry(canonical);

  // ── Emissions breakdown (production-stage positions A–H) ──────────────────
  const breakdown = [
    { key: 'fossil', label: t('overview.emissions.fossil'), value: getFossilGhgEmissions(canonical), color: '#ef4444' },
    { key: 'biogenicNonCo2', label: t('overview.emissions.biogenicNonCo2'), value: getBiogenicNonCO2Emissions(canonical), color: '#f59e0b' },
    { key: 'biogenicUptake', label: t('overview.emissions.biogenicUptake'), value: getBiogenicCO2Uptake(canonical), color: '#22c55e' },
    { key: 'luc', label: t('overview.emissions.luc'), value: getLandUseChangeEmissions(canonical), color: '#a855f7' },
    { key: 'aircraft', label: t('overview.emissions.aircraft'), value: getAircraftGhgEmissions(canonical), color: '#06b6d4' },
  ].filter((e) => e.value !== null && e.value !== undefined);

  // ── Lifecycle-stage comparison (production / distribution / packaging) ────
  const distributionExcl = getDistributionPcfExcludingBiogenic(canonical);
  const packagingExcl =
    canonical.productLifeCycleStagesAndEmissions?.[0]?.packagingStage?.[0]?.packagingPcfExcludingBiogenicUptake ?? null;
  const stages = [
    { label: t('overview.stages.production'), value: pcfExcl },
    { label: t('overview.stages.distribution'), value: distributionExcl },
    { label: t('overview.stages.packaging'), value: packagingExcl },
  ].filter((s) => s.value !== null && s.value !== undefined) as { label: string; value: number }[];

  // ── Cross-version consistency (v9 vs v7 headline value) ───────────────────
  const v9Excl = v9 ? getPcfExcludingBiogenic(v9) : null;
  const v7Excl = v7 ? getPcfExcludingBiogenic(v7) : null;
  const bothPresent = v9Excl !== null && v7Excl !== null;
  // Consistent when the two headline values match within a small tolerance.
  const consistent =
    bothPresent && Math.abs((v9Excl as number) - (v7Excl as number)) <= Math.max(1e-6, Math.abs(v9Excl as number) * 0.001);

  // ── Data-quality DQR gauges ───────────────────────────────────────────────
  const dqrs = [
    { label: t('overview.dqr.tech'), value: getTechnologicalDQR(canonical) },
    { label: t('overview.dqr.temporal'), value: getTemporalDQR(canonical) },
    { label: t('overview.dqr.geo'), value: getGeographicalDQR(canonical) },
  ];
  const hasDqr = dqrs.some((d) => d.value !== null && d.value !== undefined);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* ── Header row: section title + cross-version consistency badge ── */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ p: 1, borderRadius: '8px', background: alpha(PCF_PRIMARY, 0.15) }}>
            <Insights sx={{ color: PCF_PRIMARY }} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600 }}>
              {t('overview.title')}
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
              {t('overview.subtitle')}
            </Typography>
          </Box>
        </Box>
        {bothPresent && (
          <Chip
            icon={consistent ? <CheckCircle sx={{ fontSize: 15 }} /> : <ErrorOutline sx={{ fontSize: 15 }} />}
            label={consistent ? t('overview.consistent') : t('overview.inconsistent')}
            size="small"
            sx={{
              backgroundColor: consistent ? alpha(PCF_PRIMARY, 0.15) : alpha('#f59e0b', 0.15),
              color: consistent ? PCF_PRIMARY : '#f59e0b',
              border: `1px solid ${alpha(consistent ? PCF_PRIMARY : '#f59e0b', 0.3)}`,
              fontWeight: 600,
              '& .MuiChip-icon': { color: consistent ? PCF_PRIMARY : '#f59e0b' },
            }}
          />
        )}
      </Box>

      {/* ── Headline KPI strip ── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 2 }}>
        {/* PCF excl. biogenic — the canonical number */}
        <Box sx={{ p: 2, borderRadius: '12px', background: alpha(PCF_PRIMARY, 0.08), border: `1px solid ${alpha(PCF_PRIMARY, 0.22)}` }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
            <Co2 sx={{ fontSize: 15, color: PCF_PRIMARY }} />
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.55)', fontWeight: 500 }}>
              {t('management.panes.pcfExclBiogenic')}
            </Typography>
          </Box>
          <Typography variant="h4" sx={{ color: '#fff', fontWeight: 800, lineHeight: 1.1 }}>
            {formatEmissionValue(pcfExcl)}
          </Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.45)' }}>
            kg CO₂e {unitLabel}
          </Typography>
        </Box>

        {/* PCF incl. biogenic */}
        <Box sx={{ p: 2, borderRadius: '12px', background: alpha(V7_COLOR, 0.08), border: `1px solid ${alpha(V7_COLOR, 0.22)}` }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
            <Co2 sx={{ fontSize: 15, color: V7_COLOR }} />
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.55)', fontWeight: 500 }}>
              {t('management.panes.pcfInclBiogenic')}
            </Typography>
          </Box>
          <Typography variant="h4" sx={{ color: '#fff', fontWeight: 800, lineHeight: 1.1 }}>
            {formatEmissionValue(pcfIncl)}
          </Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.45)' }}>
            kg CO₂e {unitLabel}
          </Typography>
        </Box>

        {/* Scope + reference period */}
        <Box sx={{ p: 2, borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.75 }}>
            <Category sx={{ fontSize: 14, color: '#a855f7' }} />
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.68rem' }}>
              {t('management.panes.scope')}
            </Typography>
          </Box>
          <Chip
            label={scope ?? 'N/A'}
            size="small"
            sx={{
              backgroundColor: scope === 'Cradle-to-gate' ? alpha('#10b981', 0.15) : alpha('#f59e0b', 0.15),
              color: scope === 'Cradle-to-gate' ? '#10b981' : '#f59e0b',
              border: `1px solid ${alpha(scope === 'Cradle-to-gate' ? '#10b981' : '#f59e0b', 0.3)}`,
              fontWeight: 600, fontSize: '0.7rem', height: 22, mb: 1,
            }}
          />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <CalendarMonth sx={{ fontSize: 13, color: '#f59e0b' }} />
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)', fontWeight: 600, fontSize: '0.74rem' }}>
              {formatReferencePeriod(period)}
            </Typography>
          </Box>
        </Box>

        {/* Geography + primary data share */}
        <Box sx={{ p: 2, borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.75 }}>
            <Public sx={{ fontSize: 14, color: '#06b6d4' }} />
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.68rem' }}>
              {t('management.panes.geography')}
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)', fontWeight: 600, fontSize: '0.8rem', mb: 1 }}>
            {[region, country].filter(Boolean).join(' · ') || 'N/A'}
          </Typography>
          {primaryShare !== null && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Speed sx={{ fontSize: 13, color: getPrimaryDataShareColor(primaryShare) }} />
              <Typography variant="caption" sx={{ color: getPrimaryDataShareColor(primaryShare), fontWeight: 700, fontSize: '0.74rem' }}>
                {primaryShare.toFixed(0)}% {t('management.panes.primaryDataShare')}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>

      {/* ── Charts row ── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: bothPresent ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)' }, gap: 2 }}>
        {/* Emissions breakdown */}
        {breakdown.length > 0 && (
          <Panel>
            <PanelTitle icon={<Factory sx={{ fontSize: 16, color: '#ef4444' }} />} label={t('overview.emissions.title')} />
            <BarChart
              height={220}
              layout="horizontal"
              margin={{ left: 8, right: 16, top: 8, bottom: 24 }}
              yAxis={[{ scaleType: 'band', data: breakdown.map((b) => b.label) }]}
              xAxis={[{ label: 'kg CO₂e' }]}
              series={[{ data: breakdown.map((b) => b.value as number), label: 'kg CO₂e' }]}
              colors={breakdown.map((b) => b.color)}
              slotProps={{ legend: { hidden: true } as never }}
              sx={chartTextSx}
            />
          </Panel>
        )}

        {/* Lifecycle stages */}
        {stages.length > 0 && (
          <Panel>
            <PanelTitle icon={<Insights sx={{ fontSize: 16, color: PCF_PRIMARY }} />} label={t('overview.stages.title')} />
            <BarChart
              height={220}
              margin={{ left: 8, right: 16, top: 8, bottom: 24 }}
              xAxis={[{ scaleType: 'band', data: stages.map((s) => s.label) }]}
              series={[{ data: stages.map((s) => s.value), label: t('management.panes.pcfExclBiogenic') }]}
              colors={[PCF_PRIMARY]}
              slotProps={{ legend: { hidden: true } as never }}
              sx={chartTextSx}
            />
          </Panel>
        )}

        {/* Cross-version consistency */}
        {bothPresent && (
          <Panel>
            <PanelTitle icon={<CompareArrows sx={{ fontSize: 16, color: V7_COLOR }} />} label={t('overview.compare.title')} />
            <BarChart
              height={220}
              margin={{ left: 8, right: 16, top: 8, bottom: 24 }}
              xAxis={[{ scaleType: 'band', data: ['v9.0.0', 'v7.0.0'] }]}
              series={[{ data: [v9Excl as number, v7Excl as number], label: t('management.panes.pcfExclBiogenic') }]}
              colors={[V9_COLOR]}
              slotProps={{ legend: { hidden: true } as never }}
              sx={{
                ...chartTextSx,
                // Color the two bars differently via the rect children.
                '& .MuiBarElement-root:nth-of-type(2)': { fill: V7_COLOR },
              }}
            />
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', display: 'block', mt: 0.5, textAlign: 'center' }}>
              {consistent ? t('overview.compare.match') : t('overview.compare.mismatch')}
            </Typography>
          </Panel>
        )}
      </Box>

      {/* ── Data-quality gauges ── */}
      {(hasDqr || primaryShare !== null) && (
        <Panel>
          <PanelTitle icon={<Speed sx={{ fontSize: 16, color: '#9333ea' }} />} label={t('overview.quality.title')} />
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, alignItems: 'center', justifyContent: 'space-around' }}>
            {primaryShare !== null && (
              <Box sx={{ textAlign: 'center' }}>
                <Gauge
                  width={120}
                  height={120}
                  value={primaryShare}
                  valueMax={100}
                  text={({ value }) => `${value?.toFixed(0)}%`}
                  sx={{
                    [`& .${gaugeClasses.valueText}`]: { fill: '#fff', fontSize: 20, fontWeight: 700 },
                    [`& .${gaugeClasses.valueArc}`]: { fill: getPrimaryDataShareColor(primaryShare) },
                    [`& .${gaugeClasses.referenceArc}`]: { fill: 'rgba(255,255,255,0.08)' },
                  }}
                />
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', display: 'block' }}>
                  {t('management.panes.primaryDataShare')}
                </Typography>
              </Box>
            )}
            {dqrs
              .filter((d) => d.value !== null && d.value !== undefined)
              .map((d) => (
                <Tooltip key={d.label} title={t('overview.dqr.hint')} arrow>
                  <Box sx={{ textAlign: 'center' }}>
                    <Gauge
                      width={110}
                      height={110}
                      value={d.value as number}
                      valueMax={5}
                      text={({ value }) => `${value}`}
                      sx={{
                        [`& .${gaugeClasses.valueText}`]: { fill: '#fff', fontSize: 18, fontWeight: 700 },
                        [`& .${gaugeClasses.valueArc}`]: { fill: getDqrColor(d.value) },
                        [`& .${gaugeClasses.referenceArc}`]: { fill: 'rgba(255,255,255,0.08)' },
                      }}
                    />
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', display: 'block' }}>
                      {d.label}
                    </Typography>
                  </Box>
                </Tooltip>
              ))}
          </Box>
        </Panel>
      )}
    </Box>
  );
};

export default PcfOverviewPanel;
