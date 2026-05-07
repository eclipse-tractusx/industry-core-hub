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
  Info
} from '@mui/icons-material';
import { PcfDataRecord, ManagedPart } from '../api/pcfExchangeApi';

// PCF Green Theme
const PCF_PRIMARY = '#10b981';
const PCF_SECONDARY = '#059669';

interface PcfDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  pcfData: PcfDataRecord | null;
  part: ManagedPart | null;
}

const PcfDetailsDialog: React.FC<PcfDetailsDialogProps> = ({
  open,
  onClose,
  pcfData,
  part
}) => {
  if (!pcfData || !part) return null;

  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString([], {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isPublished = pcfData.status === 'PUBLISHED';

  const InfoRow: React.FC<{ label: string; value: string | number; icon?: React.ReactNode; highlight?: boolean }> = ({ label, value, icon, highlight }) => (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.5, borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {icon && <Box sx={{ color: 'rgba(255, 255, 255, 0.4)' }}>{icon}</Box>}
        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>{label}</Typography>
      </Box>
      <Typography variant="body2" sx={{ color: highlight ? PCF_PRIMARY : '#fff', fontWeight: highlight ? 600 : 500, fontFamily: typeof value === 'number' ? 'monospace' : 'inherit' }}>
        {value}
      </Typography>
    </Box>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: 'rgba(30, 30, 30, 0.98)',
          backgroundImage: 'none',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px'
        }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              p: 1,
              borderRadius: '10px',
              background: `linear-gradient(135deg, ${PCF_PRIMARY} 0%, ${PCF_SECONDARY} 100%)`
            }}
          >
            <Co2 sx={{ color: '#fff', fontSize: 24 }} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600 }}>
              PCF Details
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
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
              '& .MuiChip-icon': { color: isPublished ? PCF_PRIMARY : '#eab308' }
            }}
          />
          <IconButton onClick={onClose} size="small" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ px: 3 }}>
        {/* Carbon Footprint Values */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ color: 'rgba(255, 255, 255, 0.5)', mb: 2, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.7rem' }}>
            Carbon Footprint Values
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
            <Box sx={{ p: 2, borderRadius: '12px', background: alpha(PCF_PRIMARY, 0.08), border: `1px solid ${alpha(PCF_PRIMARY, 0.15)}` }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                <Co2 sx={{ fontSize: 16, color: PCF_PRIMARY }} />
                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>PCF (excl. biogenic)</Typography>
              </Box>
              <Typography variant="h5" sx={{ color: '#fff', fontWeight: 700 }}>
                {pcfData.pcfExcludingBiogenic.toFixed(2)}
                <Typography component="span" variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)', ml: 0.5 }}>kg CO2e</Typography>
              </Typography>
            </Box>
            <Box sx={{ p: 2, borderRadius: '12px', background: alpha('#3b82f6', 0.08), border: `1px solid ${alpha('#3b82f6', 0.15)}` }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                <Co2 sx={{ fontSize: 16, color: '#3b82f6' }} />
                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>PCF (incl. biogenic)</Typography>
              </Box>
              <Typography variant="h5" sx={{ color: '#fff', fontWeight: 700 }}>
                {pcfData.pcfIncludingBiogenic.toFixed(2)}
                <Typography component="span" variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)', ml: 0.5 }}>kg CO2e</Typography>
              </Typography>
            </Box>
          </Box>
        </Box>

        <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.08)', my: 2 }} />

        {/* Primary Data Share */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ color: 'rgba(255, 255, 255, 0.5)', mb: 2, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.7rem' }}>
            Data Quality
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Speed sx={{ color: '#a855f7' }} />
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>Primary Data Share</Typography>
                <Typography variant="body2" sx={{ color: '#fff', fontWeight: 600 }}>{pcfData.primaryDataShare.toFixed(0)}%</Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={pcfData.primaryDataShare}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 4,
                    backgroundColor: pcfData.primaryDataShare >= 70 ? PCF_PRIMARY : pcfData.primaryDataShare >= 50 ? '#eab308' : '#ef4444'
                  }
                }}
              />
            </Box>
          </Box>
        </Box>

        <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.08)', my: 2 }} />

        {/* Metadata */}
        <Box>
          <Typography variant="subtitle2" sx={{ color: 'rgba(255, 255, 255, 0.5)', mb: 1, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.7rem' }}>
            Metadata
          </Typography>
          <InfoRow label="Geography" value={pcfData.geographyCountry} icon={<Public sx={{ fontSize: 16 }} />} />
          <InfoRow label="Spec Version" value={pcfData.specVersion} icon={<Info sx={{ fontSize: 16 }} />} />
          <InfoRow label="PCF Version" value={pcfData.version} />
          <InfoRow label="Reference Period" value={`${formatDate(pcfData.referencePeriodStart)} - ${formatDate(pcfData.referencePeriodEnd)}`} icon={<CalendarMonth sx={{ fontSize: 16 }} />} />
          <InfoRow label="Created" value={formatDate(pcfData.created)} />
          <InfoRow label="Last Updated" value={formatDate(pcfData.updated)} />
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button
          variant="outlined"
          onClick={onClose}
          sx={{
            borderColor: 'rgba(255, 255, 255, 0.2)',
            color: 'rgba(255, 255, 255, 0.7)',
            textTransform: 'none',
            borderRadius: '8px',
            '&:hover': { borderColor: 'rgba(255, 255, 255, 0.4)', color: '#fff' }
          }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PcfDetailsDialog;
