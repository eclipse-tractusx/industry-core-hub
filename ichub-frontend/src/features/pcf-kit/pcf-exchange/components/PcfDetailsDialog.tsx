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
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  Divider,
  Chip,
  LinearProgress,
  Tooltip,
  alpha
} from '@mui/material';
import {
  Close,
  Co2,
  CalendarMonth,
  Public,
  Speed,
  CheckCircle,
  DraftsOutlined,
  Business,
  Inventory,
  Category,
  Science,
  Timeline,
  Event,
  ForestOutlined,
  LocalFireDepartment,
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
  getPcfVersion,
  getSpecVersion,
  getValidityPeriodEnd,
  getPcfCreated,
  getCompanyName,
  getCompanyBpn,
  getProductName,
  getProductDescription,
  getProductMass,
  getGeographyCountry,
  getGeographyRegion,
  getGeographySubdivision,
  getFossilGhgEmissions,
  getBiogenicCO2Uptake,
  getLandUseChangeEmissions,
  getCarbonContentTotal,
  getFossilCarbonContent,
  getBiogenicCarbonContent,
  getRecycledCarbonContent,
  getTechnologicalDQR,
  getTemporalDQR,
  getGeographicalDQR,
  isDistributionStageIncluded,
  getDistributionPcfExcludingBiogenic,
  formatEmissionValue,
  formatDeclaredUnit,
  formatReferencePeriod,
  formatDate,
  formatDateTime,
  mapPcfStatus,
  formatPcfType,
  getPrimaryDataShareColor,
  getDqrColor,
} from '../../pcf-management/utils/pcfDataExtractors';

// PCF Green Theme
const PCF_PRIMARY = '#10b981';
const PCF_SECONDARY = '#059669';

interface PcfDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  pcfData: PcfNestedData | null;
  part: ManagedPart | null;
}

// ── Reusable row component ──────────────────────────────────────────────────
const InfoRow: React.FC<{
  label: string;
  value: string | number | null;
  icon?: React.ReactNode;
  mono?: boolean;
  valueColor?: string;
  last?: boolean;
}> = ({ label, value, icon, mono, valueColor, last }) => (
  <Box
    sx={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      py: 1.25,
      borderBottom: last ? 'none' : '1px solid rgba(255,255,255,0.05)',
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {icon && <Box sx={{ color: 'rgba(255,255,255,0.35)', display: 'flex' }}>{icon}</Box>}
      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.55)' }}>{label}</Typography>
    </Box>
    <Typography
      variant="body2"
      sx={{
        color: valueColor ?? (value === null || value === undefined ? 'rgba(255,255,255,0.3)' : '#fff'),
        fontWeight: 500,
        fontFamily: mono ? 'monospace' : 'inherit',
        fontSize: mono ? '0.8rem' : undefined,
        maxWidth: 240,
        textAlign: 'right',
      }}
    >
      {value === null || value === undefined ? 'N/A' : value}
    </Typography>
  </Box>
);

// ── DQR Score badge ─────────────────────────────────────────────────────────
const DqrBadge: React.FC<{ label: string; value: number | null }> = ({ label, value }) => {
  const color = getDqrColor(value);
  return (
    <Tooltip title={`${label}: ${value ?? 'N/A'} (1=best, 5=worst)`} arrow>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          p: 1.25,
          borderRadius: '10px',
          background: value !== null ? alpha(color, 0.1) : 'rgba(255,255,255,0.03)',
          border: `1px solid ${value !== null ? alpha(color, 0.25) : 'rgba(255,255,255,0.06)'}`,
          minWidth: 68,
        }}
      >
        <Typography variant="h6" sx={{ color, fontWeight: 700, lineHeight: 1 }}>
          {value?.toFixed(1) ?? '—'}
        </Typography>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.65rem', mt: 0.25, textAlign: 'center' }}>
          {label}
        </Typography>
      </Box>
    </Tooltip>
  );
};

// ── Section title ────────────────────────────────────────────────────────────
const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Typography
    variant="caption"
    sx={{
      color: 'rgba(255,255,255,0.4)',
      textTransform: 'uppercase',
      letterSpacing: 1,
      fontSize: '0.65rem',
      fontWeight: 600,
      display: 'block',
      mb: 1.5,
    }}
  >
    {children}
  </Typography>
);

// ── Main Dialog ──────────────────────────────────────────────────────────────
const PcfDetailsDialog: React.FC<PcfDetailsDialogProps> = ({ open, onClose, pcfData, part }) => {
  if (!pcfData || !part) return null;

  // Extract all values using the centralized helpers
  const pcfExcl = getPcfExcludingBiogenic(pcfData);
  const pcfIncl = getPcfIncludingBiogenic(pcfData);
  const declaredUnit = getDeclaredUnit(pcfData);
  const scope = getPcfScope(pcfData);
  const period = getReferencePeriod(pcfData);
  const primaryShare = getPrimaryDataShare(pcfData);
  const rawStatus = getPcfStatus(pcfData);
  const uiStatus = mapPcfStatus(rawStatus);
  const pcfType = getPcfType(pcfData);
  const version = getPcfVersion(pcfData);
  const specVersion = getSpecVersion(pcfData);
  const validityEnd = getValidityPeriodEnd(pcfData);
  const created = getPcfCreated(pcfData);
  const companyName = getCompanyName(pcfData);
  const companyBpn = getCompanyBpn(pcfData);
  const productName = getProductName(pcfData);
  const productDesc = getProductDescription(pcfData);
  const productMass = getProductMass(pcfData);
  const country = getGeographyCountry(pcfData);
  const region = getGeographyRegion(pcfData);
  const subdivision = getGeographySubdivision(pcfData);
  const fossilGhg = getFossilGhgEmissions(pcfData);
  const bioCO2Uptake = getBiogenicCO2Uptake(pcfData);
  const landUse = getLandUseChangeEmissions(pcfData);
  const carbonTotal = getCarbonContentTotal(pcfData);
  const fossilCarbon = getFossilCarbonContent(pcfData);
  const bioCarbon = getBiogenicCarbonContent(pcfData);
  const recycledCarbon = getRecycledCarbonContent(pcfData);
  const techDqr = getTechnologicalDQR(pcfData);
  const tempDqr = getTemporalDQR(pcfData);
  const geoDqr = getGeographicalDQR(pcfData);
  const distIncluded = isDistributionStageIncluded(pcfData);
  const distPcfExcl = getDistributionPcfExcludingBiogenic(pcfData);

  const isPublished = uiStatus === 'PUBLISHED';
  const shareColor = getPrimaryDataShareColor(primaryShare);
  const unitLabel = formatDeclaredUnit(declaredUnit);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: 'rgba(22, 22, 26, 0.99)',
          backgroundImage: 'none',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '16px',
        },
      }}
    >
      {/* ── Header ── */}
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              p: 1,
              borderRadius: '10px',
              background: `linear-gradient(135deg, ${PCF_PRIMARY} 0%, ${PCF_SECONDARY} 100%)`,
            }}
          >
            <Co2 sx={{ color: '#fff', fontSize: 24 }} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600 }}>
              PCF Details
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.45)' }}>
              {part.manufacturerPartId}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            icon={isPublished ? <CheckCircle sx={{ fontSize: 14 }} /> : <DraftsOutlined sx={{ fontSize: 14 }} />}
            label={isPublished ? 'Published' : 'Draft'}
            size="small"
            sx={{
              backgroundColor: isPublished ? alpha(PCF_PRIMARY, 0.15) : alpha('#eab308', 0.15),
              color: isPublished ? PCF_PRIMARY : '#eab308',
              border: `1px solid ${alpha(isPublished ? PCF_PRIMARY : '#eab308', 0.3)}`,
              fontWeight: 600,
              '& .MuiChip-icon': { color: isPublished ? PCF_PRIMARY : '#eab308' },
            }}
          />
          <IconButton onClick={onClose} size="small" sx={{ color: 'rgba(255,255,255,0.45)' }}>
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ px: 3, pb: 1 }}>

        {/* ── Section 1: Main PCF values ── */}
        <Box sx={{ mb: 3 }}>
          <SectionTitle>Carbon Footprint Values</SectionTitle>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <Box
              sx={{
                p: 2,
                borderRadius: '12px',
                background: alpha(PCF_PRIMARY, 0.08),
                border: `1px solid ${alpha(PCF_PRIMARY, 0.2)}`,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.75 }}>
                <Co2 sx={{ fontSize: 15, color: PCF_PRIMARY }} />
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                  PCF excl. biogenic
                </Typography>
              </Box>
              <Typography variant="h5" sx={{ color: '#fff', fontWeight: 700 }}>
                {formatEmissionValue(pcfExcl)}
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)' }}>
                kg CO₂e {unitLabel}
              </Typography>
            </Box>

            <Box
              sx={{
                p: 2,
                borderRadius: '12px',
                background: alpha('#3b82f6', 0.08),
                border: `1px solid ${alpha('#3b82f6', 0.2)}`,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.75 }}>
                <Co2 sx={{ fontSize: 15, color: '#3b82f6' }} />
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                  PCF incl. biogenic
                </Typography>
              </Box>
              <Typography variant="h5" sx={{ color: '#fff', fontWeight: 700 }}>
                {formatEmissionValue(pcfIncl)}
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)' }}>
                kg CO₂e {unitLabel}
              </Typography>
            </Box>
          </Box>

          {/* Scope + Type pills */}
          <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
            {scope && (
              <Chip
                icon={<Category sx={{ fontSize: 13 }} />}
                label={scope}
                size="small"
                sx={{
                  backgroundColor: scope === 'Cradle-to-gate' ? alpha('#10b981', 0.15) : alpha('#f59e0b', 0.15),
                  color: scope === 'Cradle-to-gate' ? '#10b981' : '#f59e0b',
                  border: `1px solid ${alpha(scope === 'Cradle-to-gate' ? '#10b981' : '#f59e0b', 0.3)}`,
                  fontWeight: 600, fontSize: '0.7rem',
                  '& .MuiChip-icon': { color: 'inherit' },
                }}
              />
            )}
            {pcfType && (
              <Chip
                icon={<Timeline sx={{ fontSize: 13 }} />}
                label={formatPcfType(pcfType)}
                size="small"
                sx={{
                  backgroundColor: alpha('#6366f1', 0.12),
                  color: '#818cf8',
                  border: `1px solid ${alpha('#6366f1', 0.25)}`,
                  fontWeight: 600, fontSize: '0.7rem',
                  '& .MuiChip-icon': { color: 'inherit' },
                }}
              />
            )}
          </Box>
        </Box>

        <Divider sx={{ borderColor: 'rgba(255,255,255,0.07)', my: 2 }} />

        {/* ── Section 2: Emission breakdown ── */}
        {(fossilGhg !== null || bioCO2Uptake !== null || landUse !== null) && (
          <>
            <Box sx={{ mb: 3 }}>
              <SectionTitle>Production Stage Breakdown</SectionTitle>
              <InfoRow label="Fossil GHG Emissions (A)" value={fossilGhg !== null ? `${formatEmissionValue(fossilGhg)} kg CO₂e` : null} icon={<LocalFireDepartment sx={{ fontSize: 15 }} />} />
              <InfoRow label="Biogenic CO₂ Uptake (D)" value={bioCO2Uptake !== null ? `${formatEmissionValue(bioCO2Uptake)} kg CO₂e` : null} icon={<ForestOutlined sx={{ fontSize: 15 }} />} valueColor={bioCO2Uptake !== null && bioCO2Uptake < 0 ? '#10b981' : undefined} />
              <InfoRow label="Land Use Change (E)" value={landUse !== null ? `${formatEmissionValue(landUse)} kg CO₂e` : null} last />
            </Box>
            <Divider sx={{ borderColor: 'rgba(255,255,255,0.07)', my: 2 }} />
          </>
        )}

        {/* ── Section 3: Carbon Content ── */}
        {(carbonTotal !== null || fossilCarbon !== null || bioCarbon !== null || recycledCarbon !== null) && (
          <>
            <Box sx={{ mb: 3 }}>
              <SectionTitle>Carbon Content</SectionTitle>
              {carbonTotal !== null && <InfoRow label="Total Carbon Content" value={`${formatEmissionValue(carbonTotal)} kg CO₂e`} />}
              {fossilCarbon !== null && <InfoRow label="Fossil Carbon" value={`${formatEmissionValue(fossilCarbon)} kg CO₂e`} />}
              {bioCarbon !== null && <InfoRow label="Biogenic Carbon" value={`${formatEmissionValue(bioCarbon)} kg CO₂e`} />}
              {recycledCarbon !== null && <InfoRow label="Recycled Carbon" value={`${formatEmissionValue(recycledCarbon)} kg CO₂e`} last />}
            </Box>
            <Divider sx={{ borderColor: 'rgba(255,255,255,0.07)', my: 2 }} />
          </>
        )}

        {/* ── Section 4: Data Quality ── */}
        <Box sx={{ mb: 3 }}>
          <SectionTitle>Data Quality</SectionTitle>
          {/* Primary data share bar */}
          {primaryShare !== null && (
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <Speed sx={{ fontSize: 15, color: shareColor }} />
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)' }}>Primary Data Share</Typography>
                </Box>
                <Typography variant="body2" sx={{ color: shareColor, fontWeight: 700 }}>{primaryShare.toFixed(0)}%</Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={primaryShare}
                sx={{
                  height: 7,
                  borderRadius: 4,
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  '& .MuiLinearProgress-bar': { borderRadius: 4, backgroundColor: shareColor },
                }}
              />
            </Box>
          )}
          {/* DQR scores */}
          {(techDqr !== null || tempDqr !== null || geoDqr !== null) && (
            <Box sx={{ display: 'flex', gap: 1.5, mt: 1.5 }}>
              <DqrBadge label="Technological" value={techDqr} />
              <DqrBadge label="Temporal" value={tempDqr} />
              <DqrBadge label="Geographical" value={geoDqr} />
            </Box>
          )}
        </Box>

        <Divider sx={{ borderColor: 'rgba(255,255,255,0.07)', my: 2 }} />

        {/* ── Section 5: Geography ── */}
        <Box sx={{ mb: 3 }}>
          <SectionTitle>Geography</SectionTitle>
          <InfoRow label="Country" value={country} icon={<Public sx={{ fontSize: 15 }} />} />
          <InfoRow label="Region" value={region} />
          <InfoRow label="Subdivision" value={subdivision} mono last />
        </Box>

        <Divider sx={{ borderColor: 'rgba(255,255,255,0.07)', my: 2 }} />

        {/* ── Section 6: Time & Validity ── */}
        <Box sx={{ mb: 3 }}>
          <SectionTitle>Time & Validity</SectionTitle>
          <InfoRow label="Reference Period" value={formatReferencePeriod(period)} icon={<CalendarMonth sx={{ fontSize: 15 }} />} />
          <InfoRow label="PCF Created" value={formatDateTime(created)} icon={<Event sx={{ fontSize: 15 }} />} />
          <InfoRow label="Validity Period End" value={formatDate(validityEnd)} last />
        </Box>

        {/* ── Section 7: Distribution Stage (if present) ── */}
        {distIncluded !== null && (
          <>
            <Divider sx={{ borderColor: 'rgba(255,255,255,0.07)', my: 2 }} />
            <Box sx={{ mb: 3 }}>
              <SectionTitle>Distribution Stage</SectionTitle>
              <InfoRow label="Included in boundary" value={distIncluded ? 'Yes' : 'No'} valueColor={distIncluded ? PCF_PRIMARY : 'rgba(255,255,255,0.5)'} />
              {distPcfExcl !== null && (
                <InfoRow label="Distribution PCF excl. biogenic" value={`${formatEmissionValue(distPcfExcl)} kg CO₂e ${unitLabel}`} last />
              )}
            </Box>
          </>
        )}

        <Divider sx={{ borderColor: 'rgba(255,255,255,0.07)', my: 2 }} />

        {/* ── Section 8: Product & Company ── */}
        <Box sx={{ mb: 1 }}>
          <SectionTitle>Product & Company</SectionTitle>
          <InfoRow label="Product Name" value={productName} icon={<Inventory sx={{ fontSize: 15 }} />} />
          <InfoRow label="Company" value={companyName} icon={<Business sx={{ fontSize: 15 }} />} />
          <InfoRow label="Company BPN" value={companyBpn} mono />
          {productMass !== null && (
            <InfoRow label="Product Mass / Declared Unit" value={`${productMass} kg`} />
          )}
          {productDesc && <InfoRow label="Description" value={productDesc} last />}
        </Box>

        <Divider sx={{ borderColor: 'rgba(255,255,255,0.07)', my: 2 }} />

        {/* ── Section 9: PCF Metadata ── */}
        <Box sx={{ mb: 1 }}>
          <SectionTitle>PCF Metadata</SectionTitle>
          <InfoRow label="Spec Version" value={specVersion} icon={<Science sx={{ fontSize: 15 }} />} />
          <InfoRow label="PCF Version" value={version} />
          <InfoRow label="Type" value={pcfType} last />
        </Box>

      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, pt: 1 }}>
        <Button
          variant="outlined"
          onClick={onClose}
          sx={{
            borderColor: 'rgba(255,255,255,0.2)',
            color: 'rgba(255,255,255,0.7)',
            textTransform: 'none',
            borderRadius: '8px',
            '&:hover': { borderColor: 'rgba(255,255,255,0.4)', color: '#fff' },
          }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PcfDetailsDialog;

