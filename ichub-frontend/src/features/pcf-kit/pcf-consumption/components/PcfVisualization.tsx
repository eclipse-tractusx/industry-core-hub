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

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Tab,
  Tabs,
  Chip,
  Snackbar,
  Alert,
  Grid2,
  Card,
  LinearProgress,
  Tooltip
} from '@mui/material';
import {
  ArrowBack,
  Download,
  ContentCopy,
  Co2,
  Business,
  Inventory,
  CalendarMonth,
  Public,
  QueryStats,
  Assignment,
  LocalFireDepartment,
  Spa,
  FlightTakeoff,
  Warehouse,
  EnergySavingsLeaf,
  PrecisionManufacturing,
  Timeline,
  VerifiedUser,
  Percent,
  Science,
  Settings,
  Assessment
} from '@mui/icons-material';
import { PCFData } from '../api/pcfConsumptionApi';
import { QRCodeSVG } from 'qrcode.react';

// PCF Green Theme
const PCF_PRIMARY = '#10b981';
const PCF_SECONDARY = '#059669';
const PCF_BG = 'rgba(16, 185, 129, 0.1)';
const PCF_BORDER = 'rgba(16, 185, 129, 0.2)';

interface PcfVisualizationProps {
  data: PCFData;
  discoveryId: string;
  onBack: () => void;
}

const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  } catch {
    return dateString;
  }
};

const formatNumber = (value: number | undefined, decimals: number = 2): string => {
  if (value === undefined || value === null) return 'N/A';
  return value.toFixed(decimals);
};

const getEmissionColor = (value: number): string => {
  if (value < 1) return '#22c55e';
  if (value < 5) return '#eab308';
  if (value < 10) return '#f97316';
  return '#ef4444';
};

// Reusable Info Box Component
interface InfoBoxProps {
  label: string;
  value: string | number;
  color?: string;
  fontFamily?: string;
  size?: 'small' | 'medium' | 'large';
}

const InfoBox: React.FC<InfoBoxProps> = ({ label, value, color = PCF_PRIMARY, fontFamily, size = 'medium' }) => {
  const fontSize = size === 'small' ? '0.85rem' : size === 'large' ? '1.3rem' : '1rem';
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: size === 'small' ? 1 : 1.5,
        borderRadius: '10px',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        border: '1px solid rgba(16, 185, 129, 0.2)',
        minWidth: 70,
        flex: 1
      }}
    >
      <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.6rem', textAlign: 'center', mb: 0.25, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
        {label}
      </Typography>
      <Typography variant="h6" sx={{ color, fontWeight: 700, fontSize, fontFamily, textAlign: 'center', lineHeight: 1.2 }}>
        {value}
      </Typography>
    </Box>
  );
};

// Field Display Component
const FieldDisplay: React.FC<{ label: string; value: string | number; icon?: React.ReactNode; mono?: boolean }> = ({ label, value, icon, mono }) => (
  <Box sx={{ mb: 1.5 }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.25 }}>
      {icon}
      <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
        {label}
      </Typography>
    </Box>
    <Typography variant="body2" sx={{ color: '#fff', fontWeight: 500, fontSize: '0.85rem', fontFamily: mono ? 'monospace' : 'inherit', wordBreak: 'break-word' }}>
      {value}
    </Typography>
  </Box>
);

const PcfVisualization: React.FC<PcfVisualizationProps> = ({ data, discoveryId, onBack }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const emissionColor = getEmissionColor(data.pcfExcludingBiogenic);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setSnackbarMessage(`${label} copied to clipboard`);
      setSnackbarOpen(true);
    });
  };

  const handleDownload = () => {
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pcf-${data.id}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Define tabs for PCF data
  const tabs = [
    { label: 'Carbon Footprint', icon: <Co2 sx={{ fontSize: 18 }} /> },
    { label: 'Company & Product', icon: <Business sx={{ fontSize: 18 }} /> },
    { label: 'Data Quality', icon: <QueryStats sx={{ fontSize: 18 }} /> },
    { label: 'Assurance', icon: <VerifiedUser sx={{ fontSize: 18 }} /> },
  ];

  // Emission data for breakdown
  const emissions = [
    { label: 'Fossil GHG', value: data.fossilGhgEmissions, icon: LocalFireDepartment, color: '#ef4444' },
    { label: 'Aircraft GHG', value: data.aircraftGhgEmissions, icon: FlightTakeoff, color: '#f97316' },
    { label: 'Packaging GHG', value: data.packagingGhgEmissions, icon: Warehouse, color: '#eab308' },
    { label: 'DLUC GHG', value: data.dlucGhgEmissions, icon: Spa, color: '#22c55e' },
    { label: 'LU GHG', value: data.luGhgEmissions, icon: Spa, color: '#10b981' },
  ];

  const maxEmission = Math.max(...emissions.filter(e => e.value).map(e => e.value || 0), 1);

  return (
    <Box sx={{ minHeight: 'calc(100vh - 64px)', height: '100%', width: '100%', display: 'flex', flexDirection: 'column', background: '#0d0d0d', overflow: 'hidden' }}>
      {/* Sticky Header */}
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 1100,
          background: '#1a1a1a',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          flexShrink: 0
        }}
      >
        <Paper elevation={0} sx={{ background: 'transparent', px: { xs: 2, sm: 3, md: 4 }, py: { xs: 1.5, sm: 2 } }}>
          <Grid2 container spacing={2} alignItems="center" justifyContent="space-between">
            {/* Left: Back button & Title */}
            <Grid2 size={{ xs: 12, md: 8 }}>
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: 1.5 }}>
                <Button
                  startIcon={<ArrowBack />}
                  onClick={onBack}
                  variant="outlined"
                  sx={{
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                    color: 'rgba(255, 255, 255, 0.8)',
                    minWidth: 'auto',
                    px: 2,
                    py: 0.75,
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    textTransform: 'none',
                    borderRadius: '8px',
                    '&:hover': { borderColor: PCF_PRIMARY, backgroundColor: 'rgba(16, 185, 129, 0.05)', color: '#fff' }
                  }}
                >
                  Back
                </Button>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600, fontSize: '1.15rem' }}>
                      Product Carbon Footprint
                    </Typography>
                    <Chip
                      label={data.specVersion}
                      size="small"
                      sx={{
                        backgroundColor: 'rgba(16, 185, 129, 0.2)',
                        color: PCF_PRIMARY,
                        border: `1px solid ${PCF_BORDER}`,
                        height: 22,
                        fontSize: '0.7rem',
                        fontWeight: 600
                      }}
                    />
                    <Chip
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'rgba(255, 255, 255, 0.7)' }}>ID:</Typography>
                          <Typography variant="caption" sx={{ fontFamily: 'monospace', fontSize: '0.65rem', color: '#fff', fontWeight: 600 }}>
                            {discoveryId.length > 30 ? `${discoveryId.substring(0, 30)}...` : discoveryId}
                          </Typography>
                        </Box>
                      }
                      deleteIcon={<ContentCopy sx={{ fontSize: 12 }} />}
                      onDelete={() => handleCopy(discoveryId, 'Discovery ID')}
                      size="small"
                      sx={{
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        color: '#fff',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        height: 24,
                        '& .MuiChip-deleteIcon': { color: 'rgba(255, 255, 255, 0.6)', '&:hover': { color: '#fff' } }
                      }}
                    />
                  </Box>
                  <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.7rem' }}>
                    {data.productNameCompany} • {data.companyName}
                  </Typography>
                </Box>
              </Box>
            </Grid2>

            {/* Right: Action buttons */}
            <Grid2 size={{ xs: 12, md: 4 }}>
              <Box sx={{ display: 'flex', gap: 1, justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
                <Button
                  size="small"
                  startIcon={<Download sx={{ fontSize: 16 }} />}
                  onClick={handleDownload}
                  sx={{
                    background: `linear-gradient(135deg, ${PCF_PRIMARY} 0%, ${PCF_SECONDARY} 100%)`,
                    color: '#fff',
                    textTransform: 'none',
                    fontSize: '0.8rem',
                    px: 2,
                    py: 0.75,
                    fontWeight: 600,
                    borderRadius: '8px',
                    '&:hover': { boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)' }
                  }}
                >
                  Download JSON
                </Button>
              </Box>
            </Grid2>
          </Grid2>
        </Paper>

        {/* Tabs */}
        <Box sx={{ px: { xs: 2, sm: 3, md: 4 }, borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <Tabs
            value={activeTab}
            onChange={(_, newValue) => setActiveTab(newValue)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              '& .MuiTab-root': {
                color: 'rgba(255, 255, 255, 0.5)',
                textTransform: 'none',
                fontWeight: 500,
                fontSize: '0.85rem',
                minHeight: 48,
                '&.Mui-selected': { color: PCF_PRIMARY }
              },
              '& .MuiTabs-indicator': { backgroundColor: PCF_PRIMARY }
            }}
          >
            {tabs.map((tab, index) => (
              <Tab key={index} icon={tab.icon} iconPosition="start" label={tab.label} />
            ))}
          </Tabs>
        </Box>
      </Box>

      {/* Header Cards - Same layout as EcoPass */}
      <Box sx={{ px: { xs: 2, sm: 3, md: 4 }, py: 2, background: '#0d0d0d', flexShrink: 0 }}>
        <Grid2 container spacing={2}>
          {/* Carbon Footprint Card */}
          <Grid2 size={{ xs: 12, md: 6, lg: 3 }}>
            <Card elevation={0} sx={{ background: `linear-gradient(135deg, ${PCF_BG} 0%, rgba(5, 150, 105, 0.1) 100%)`, border: `1px solid ${PCF_BORDER}`, borderRadius: '12px', p: 2.5, height: '100%', transition: 'all 0.2s ease', '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 8px 24px rgba(16, 185, 129, 0.2)` } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <Box sx={{ p: 1, borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)' }}>
                  <Co2 sx={{ fontSize: 24, color: PCF_PRIMARY }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.6rem', textTransform: 'uppercase' }}>Carbon Footprint</Typography>
                </Box>
                <Box sx={{ p: 0.75, borderRadius: '6px', background: 'rgba(255, 255, 255, 0.95)', border: `1px solid ${PCF_BORDER}` }}>
                  <QRCodeSVG value={discoveryId} size={45} level="M" includeMargin={false} />
                </Box>
              </Box>
              <Box sx={{ p: 2, borderRadius: '10px', background: 'rgba(0, 0, 0, 0.2)', border: `1px solid ${PCF_BORDER}`, textAlign: 'center', mb: 2 }}>
                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.65rem', display: 'block', mb: 0.5 }}>
                  PCF Excluding Biogenic
                </Typography>
                <Typography variant="h3" sx={{ color: emissionColor, fontWeight: 800, fontSize: '2.2rem', textShadow: `0 0 20px ${emissionColor}40` }}>
                  {formatNumber(data.pcfExcludingBiogenic)}
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.75rem' }}>
                  kg CO₂ equivalent
                </Typography>
              </Box>
              <Grid2 container spacing={1}>
                <Grid2 size={6}>
                  <InfoBox label="Including Biogenic" value={`${formatNumber(data.pcfIncludingBiogenic)} kg`} size="small" />
                </Grid2>
                <Grid2 size={6}>
                  <InfoBox label="Status" value={data.status} size="small" />
                </Grid2>
              </Grid2>
            </Card>
          </Grid2>

          {/* Company & Product Card */}
          <Grid2 size={{ xs: 12, md: 6, lg: 3 }}>
            <Card elevation={0} sx={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.1) 100%)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '12px', p: 2.5, height: '100%', transition: 'all 0.2s ease', '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 8px 24px rgba(59, 130, 246, 0.2)' } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <Box sx={{ p: 1, borderRadius: '8px', background: 'rgba(59, 130, 246, 0.15)' }}>
                  <Inventory sx={{ fontSize: 20, color: '#3b82f6' }} />
                </Box>
                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.6rem', textTransform: 'uppercase' }}>Company & Product</Typography>
              </Box>
              <FieldDisplay label="Company Name" value={data.companyName} icon={<Business sx={{ fontSize: 14, color: '#3b82f6' }} />} />
              <FieldDisplay label="BPN" value={data.companyIds?.join(', ') || 'N/A'} icon={<Assignment sx={{ fontSize: 14, color: '#3b82f6' }} />} mono />
              <FieldDisplay label="Product Name" value={data.productNameCompany} icon={<Inventory sx={{ fontSize: 14, color: '#3b82f6' }} />} />
              <InfoBox label="CPC Category" value={data.productCategoryCpc || 'N/A'} color="#3b82f6" size="small" />
            </Card>
          </Grid2>

          {/* Emissions Breakdown Card */}
          <Grid2 size={{ xs: 12, md: 6, lg: 3 }}>
            <Card elevation={0} sx={{ background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(249, 115, 22, 0.08) 100%)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '12px', p: 2.5, height: '100%', transition: 'all 0.2s ease', '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 8px 24px rgba(239, 68, 68, 0.15)' } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <Box sx={{ p: 1, borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)' }}>
                  <LocalFireDepartment sx={{ fontSize: 20, color: '#ef4444' }} />
                </Box>
                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.6rem', textTransform: 'uppercase' }}>Emissions Breakdown</Typography>
              </Box>
              {emissions.filter(e => e.value !== undefined && e.value !== null).slice(0, 4).map((emission, idx) => (
                <Box key={idx} sx={{ mb: 1.25 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <emission.icon sx={{ fontSize: 14, color: emission.color }} />
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
                        <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.55rem' }}>{emission.label}</Typography>
                        <Typography variant="caption" sx={{ color: '#fff', fontSize: '0.6rem', fontWeight: 600 }}>{formatNumber(emission.value)} kg CO₂e</Typography>
                      </Box>
                      <LinearProgress variant="determinate" value={Math.min((emission.value! / maxEmission) * 100, 100)} sx={{ height: 4, borderRadius: 2, backgroundColor: 'rgba(255, 255, 255, 0.1)', '& .MuiLinearProgress-bar': { backgroundColor: emission.color, borderRadius: 2 } }} />
                    </Box>
                  </Box>
                </Box>
              ))}
              <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <Grid2 container spacing={1}>
                  <Grid2 size={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <LocalFireDepartment sx={{ fontSize: 12, color: '#64748b' }} />
                      <Box>
                        <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.5rem', display: 'block' }}>Fossil Carbon</Typography>
                        <Typography variant="body2" sx={{ color: '#fff', fontSize: '0.7rem', fontWeight: 600 }}>{formatNumber(data.fossilCarbonContent)} kg</Typography>
                      </Box>
                    </Box>
                  </Grid2>
                  <Grid2 size={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <EnergySavingsLeaf sx={{ fontSize: 12, color: '#22c55e' }} />
                      <Box>
                        <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.5rem', display: 'block' }}>Biogenic Carbon</Typography>
                        <Typography variant="body2" sx={{ color: '#fff', fontSize: '0.7rem', fontWeight: 600 }}>{formatNumber(data.biogenicCarbonContent)} kg</Typography>
                      </Box>
                    </Box>
                  </Grid2>
                </Grid2>
              </Box>
            </Card>
          </Grid2>

          {/* Data Quality Card */}
          <Grid2 size={{ xs: 12, md: 6, lg: 3 }}>
            <Card elevation={0} sx={{ background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.1) 0%, rgba(124, 58, 237, 0.1) 100%)', border: '1px solid rgba(147, 51, 234, 0.2)', borderRadius: '12px', p: 2.5, height: '100%', transition: 'all 0.2s ease', '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 8px 24px rgba(147, 51, 234, 0.2)' } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <Box sx={{ p: 1, borderRadius: '8px', background: 'rgba(147, 51, 234, 0.15)' }}>
                  <QueryStats sx={{ fontSize: 20, color: '#9333ea' }} />
                </Box>
                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.6rem', textTransform: 'uppercase' }}>Data Quality & Time</Typography>
              </Box>
              <Box sx={{ p: 1.5, borderRadius: '8px', background: 'rgba(147, 51, 234, 0.1)', border: '1px solid rgba(147, 51, 234, 0.2)', textAlign: 'center', mb: 2 }}>
                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.55rem', display: 'block', mb: 0.25 }}>Primary Data Share</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                  <Percent sx={{ fontSize: 16, color: '#9333ea' }} />
                  <Typography variant="h5" sx={{ color: '#9333ea', fontWeight: 700 }}>{formatNumber(data.primaryDataShare, 0)}%</Typography>
                </Box>
              </Box>
              {data.dqi && (
                <Grid2 container spacing={0.75} sx={{ mb: 1.5 }}>
                  {[
                    { label: 'Tech', value: data.dqi.technologicalDQR, icon: PrecisionManufacturing },
                    { label: 'Time', value: data.dqi.temporalDQR, icon: Timeline },
                    { label: 'Geo', value: data.dqi.geographicalDQR, icon: Public },
                  ].map((metric, idx) => {
                    const getDqrColor = (v?: number) => !v ? '#64748b' : v <= 2 ? '#22c55e' : v <= 3 ? '#eab308' : '#ef4444';
                    return (
                      <Grid2 key={idx} size={4}>
                        <Tooltip title={`DQR Scale: 1 (Best) - 5 (Worst)`} arrow>
                          <Box sx={{ p: 0.75, borderRadius: '6px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', textAlign: 'center' }}>
                            <metric.icon sx={{ fontSize: 12, color: getDqrColor(metric.value), mb: 0.25 }} />
                            <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.4rem', display: 'block' }}>{metric.label}</Typography>
                            <Typography variant="body2" sx={{ color: getDqrColor(metric.value), fontWeight: 700, fontSize: '0.75rem' }}>{metric.value?.toFixed(1) || 'N/A'}</Typography>
                          </Box>
                        </Tooltip>
                      </Grid2>
                    );
                  })}
                </Grid2>
              )}
              <FieldDisplay label="Reference Period" value={`${formatDate(data.referencePeriodStart)} - ${formatDate(data.referencePeriodEnd)}`} icon={<CalendarMonth sx={{ fontSize: 14, color: '#9333ea' }} />} />
              <FieldDisplay label="Created" value={formatDate(data.created)} icon={<VerifiedUser sx={{ fontSize: 14, color: '#9333ea' }} />} />
            </Card>
          </Grid2>
        </Grid2>
      </Box>

      {/* Tab Content */}
      <Box sx={{ flex: 1, overflow: 'auto', px: { xs: 2, sm: 3, md: 4 }, pb: 3 }}>
        {/* Tab 0: Carbon Footprint Details */}
        {activeTab === 0 && (
          <Grid2 container spacing={2}>
            <Grid2 size={{ xs: 12, md: 6 }}>
              <Card elevation={0} sx={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', p: 3 }}>
                <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600, mb: 2, fontSize: '1rem' }}>PCF Values</Typography>
                <FieldDisplay label="PCF Excluding Biogenic" value={`${formatNumber(data.pcfExcludingBiogenic)} kg CO₂e`} icon={<Co2 sx={{ fontSize: 14, color: PCF_PRIMARY }} />} />
                <FieldDisplay label="PCF Including Biogenic" value={`${formatNumber(data.pcfIncludingBiogenic)} kg CO₂e`} icon={<Co2 sx={{ fontSize: 14, color: PCF_PRIMARY }} />} />
                <FieldDisplay label="Characterization Factors" value={data.characterizationFactors || 'N/A'} icon={<Science sx={{ fontSize: 14, color: PCF_PRIMARY }} />} />
              </Card>
            </Grid2>
            <Grid2 size={{ xs: 12, md: 6 }}>
              <Card elevation={0} sx={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', p: 3 }}>
                <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600, mb: 2, fontSize: '1rem' }}>Geography</Typography>
                <FieldDisplay label="Country" value={data.geographyCountry || 'N/A'} icon={<Public sx={{ fontSize: 14, color: PCF_PRIMARY }} />} />
                <FieldDisplay label="Country Subdivision" value={data.geographyCountrySubdivision || 'N/A'} icon={<Public sx={{ fontSize: 14, color: PCF_PRIMARY }} />} />
                <FieldDisplay label="Region" value={data.geographyRegionOrSubregion || 'N/A'} icon={<Public sx={{ fontSize: 14, color: PCF_PRIMARY }} />} />
              </Card>
            </Grid2>
          </Grid2>
        )}

        {/* Tab 1: Company & Product */}
        {activeTab === 1 && (
          <Grid2 container spacing={2}>
            <Grid2 size={{ xs: 12, md: 6 }}>
              <Card elevation={0} sx={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', p: 3 }}>
                <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600, mb: 2, fontSize: '1rem' }}>Company Information</Typography>
                <FieldDisplay label="Company Name" value={data.companyName} icon={<Business sx={{ fontSize: 14, color: '#3b82f6' }} />} />
                <FieldDisplay label="Company IDs (BPN)" value={data.companyIds?.join(', ') || 'N/A'} icon={<Assignment sx={{ fontSize: 14, color: '#3b82f6' }} />} mono />
              </Card>
            </Grid2>
            <Grid2 size={{ xs: 12, md: 6 }}>
              <Card elevation={0} sx={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', p: 3 }}>
                <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600, mb: 2, fontSize: '1rem' }}>Product Information</Typography>
                <FieldDisplay label="Product Name" value={data.productNameCompany} icon={<Inventory sx={{ fontSize: 14, color: '#3b82f6' }} />} />
                <FieldDisplay label="Product Description" value={data.productDescription || 'N/A'} icon={<Inventory sx={{ fontSize: 14, color: '#3b82f6' }} />} />
                <FieldDisplay label="Product IDs" value={data.productIds?.join(', ') || 'N/A'} icon={<Assignment sx={{ fontSize: 14, color: '#3b82f6' }} />} mono />
                <FieldDisplay label="CPC Category" value={data.productCategoryCpc || 'N/A'} icon={<Assignment sx={{ fontSize: 14, color: '#3b82f6' }} />} />
              </Card>
            </Grid2>
          </Grid2>
        )}

        {/* Tab 2: Data Quality */}
        {activeTab === 2 && (
          <Grid2 container spacing={2}>
            <Grid2 size={{ xs: 12, md: 6 }}>
              <Card elevation={0} sx={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', p: 3 }}>
                <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600, mb: 2, fontSize: '1rem' }}>Data Quality Indicators (DQI)</Typography>
                {data.dqi ? (
                  <>
                    <FieldDisplay label="Coverage Percent" value={`${formatNumber(data.dqi.coveragePercent, 0)}%`} icon={<Percent sx={{ fontSize: 14, color: '#9333ea' }} />} />
                    <FieldDisplay label="Technological DQR" value={formatNumber(data.dqi.technologicalDQR, 1)} icon={<PrecisionManufacturing sx={{ fontSize: 14, color: '#9333ea' }} />} />
                    <FieldDisplay label="Temporal DQR" value={formatNumber(data.dqi.temporalDQR, 1)} icon={<Timeline sx={{ fontSize: 14, color: '#9333ea' }} />} />
                    <FieldDisplay label="Geographical DQR" value={formatNumber(data.dqi.geographicalDQR, 1)} icon={<Public sx={{ fontSize: 14, color: '#9333ea' }} />} />
                    <FieldDisplay label="Completeness DQR" value={formatNumber(data.dqi.completenessDQR, 1)} icon={<Assessment sx={{ fontSize: 14, color: '#9333ea' }} />} />
                    <FieldDisplay label="Reliability DQR" value={formatNumber(data.dqi.reliabilityDQR, 1)} icon={<VerifiedUser sx={{ fontSize: 14, color: '#9333ea' }} />} />
                  </>
                ) : (
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>No DQI data available</Typography>
                )}
              </Card>
            </Grid2>
            <Grid2 size={{ xs: 12, md: 6 }}>
              <Card elevation={0} sx={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', p: 3 }}>
                <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600, mb: 2, fontSize: '1rem' }}>Time & Period</Typography>
                <FieldDisplay label="Reference Period Start" value={formatDate(data.referencePeriodStart)} icon={<CalendarMonth sx={{ fontSize: 14, color: '#9333ea' }} />} />
                <FieldDisplay label="Reference Period End" value={formatDate(data.referencePeriodEnd)} icon={<CalendarMonth sx={{ fontSize: 14, color: '#9333ea' }} />} />
                <FieldDisplay label="Created" value={formatDate(data.created)} icon={<CalendarMonth sx={{ fontSize: 14, color: '#9333ea' }} />} />
                {data.updated && <FieldDisplay label="Updated" value={formatDate(data.updated)} icon={<CalendarMonth sx={{ fontSize: 14, color: '#9333ea' }} />} />}
              </Card>
            </Grid2>
          </Grid2>
        )}

        {/* Tab 3: Assurance */}
        {activeTab === 3 && (
          <Grid2 container spacing={2}>
            <Grid2 size={{ xs: 12, md: 6 }}>
              <Card elevation={0} sx={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', p: 3 }}>
                <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600, mb: 2, fontSize: '1rem' }}>Assurance Details</Typography>
                {data.assurance ? (
                  <>
                    <FieldDisplay label="Provider" value={data.assurance.providerName || 'N/A'} icon={<Business sx={{ fontSize: 14, color: PCF_PRIMARY }} />} />
                    <FieldDisplay label="Coverage" value={data.assurance.coverage || 'N/A'} icon={<VerifiedUser sx={{ fontSize: 14, color: PCF_PRIMARY }} />} />
                    <FieldDisplay label="Level" value={data.assurance.level || 'N/A'} icon={<VerifiedUser sx={{ fontSize: 14, color: PCF_PRIMARY }} />} />
                    <FieldDisplay label="Boundary" value={data.assurance.boundary || 'N/A'} icon={<Settings sx={{ fontSize: 14, color: PCF_PRIMARY }} />} />
                    <FieldDisplay label="Standard" value={data.assurance.standardName || 'N/A'} icon={<VerifiedUser sx={{ fontSize: 14, color: PCF_PRIMARY }} />} />
                    <FieldDisplay label="Completed At" value={data.assurance.completedAt ? formatDate(data.assurance.completedAt) : 'N/A'} icon={<CalendarMonth sx={{ fontSize: 14, color: PCF_PRIMARY }} />} />
                    {data.assurance.comments && <FieldDisplay label="Comments" value={data.assurance.comments} icon={<Assignment sx={{ fontSize: 14, color: PCF_PRIMARY }} />} />}
                  </>
                ) : (
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>No assurance data available</Typography>
                )}
              </Card>
            </Grid2>
            <Grid2 size={{ xs: 12, md: 6 }}>
              <Card elevation={0} sx={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', p: 3 }}>
                <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600, mb: 2, fontSize: '1rem' }}>Version & Status</Typography>
                <FieldDisplay label="Spec Version" value={data.specVersion} icon={<Assignment sx={{ fontSize: 14, color: PCF_PRIMARY }} />} />
                <FieldDisplay label="Data Version" value={String(data.version)} icon={<Assignment sx={{ fontSize: 14, color: PCF_PRIMARY }} />} />
                <FieldDisplay label="Status" value={data.status} icon={<VerifiedUser sx={{ fontSize: 14, color: PCF_PRIMARY }} />} />
                <FieldDisplay label="PCF ID" value={data.id} icon={<Assignment sx={{ fontSize: 14, color: PCF_PRIMARY }} />} mono />
              </Card>
            </Grid2>
          </Grid2>
        )}
      </Box>

      {/* Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackbarOpen(false)} severity="success" sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default PcfVisualization;
