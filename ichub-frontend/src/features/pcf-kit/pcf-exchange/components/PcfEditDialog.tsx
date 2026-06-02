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

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  TextField,
  MenuItem,
  alpha
} from '@mui/material';
import { Close, Edit, Save } from '@mui/icons-material';
import { ManagedPart } from '../api/pcfExchangeApi';
import type { PcfNestedData } from '../../pcf-management/types/pcfNestedData';
import {
  getPcfExcludingBiogenic,
  getPcfIncludingBiogenic,
  getPrimaryDataShare,
  getGeographyCountry,
  formatDeclaredUnit,
  getDeclaredUnit,
} from '../../pcf-management/utils/pcfDataExtractors';

// PCF Green Theme
const PCF_PRIMARY = '#10b981';
const PCF_SECONDARY = '#059669';

interface PcfEditDialogProps {
  open: boolean;
  onClose: () => void;
  /** Receives the updated nested PCF structure to send to the backend. */
  onSave: (data: Record<string, unknown>) => Promise<void>;
  pcfData: PcfNestedData | null;
  part: ManagedPart | null;
}

const COUNTRIES = [
  'DE', 'US', 'CN', 'JP', 'KR', 'FR', 'GB', 'IT', 'ES', 'NL', 'BE', 'AT', 'CH', 'PL', 'CZ'
];

const PcfEditDialog: React.FC<PcfEditDialogProps> = ({
  open,
  onClose,
  onSave,
  pcfData,
  part
}) => {  const { t } = useTranslation('pcf');  const [formData, setFormData] = useState({
    pcfExcludingBiogenic: 0,
    pcfIncludingBiogenic: 0,
    primaryDataShare: 0,
    geographyCountry: 'DE',
  });
  const [isSaving, setIsSaving] = useState(false);

  // Populate form with current values from the nested PCF structure
  useEffect(() => {
    if (pcfData) {
      setFormData({
        pcfExcludingBiogenic: getPcfExcludingBiogenic(pcfData) ?? 0,
        pcfIncludingBiogenic: getPcfIncludingBiogenic(pcfData) ?? 0,
        primaryDataShare: getPrimaryDataShare(pcfData) ?? 0,
        geographyCountry: getGeographyCountry(pcfData) ?? 'DE',
      });
    }
  }, [pcfData]);

  const handleChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.type === 'number' ? parseFloat(event.target.value) : event.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  /**
   * Build the nested Catena-X 9.0.0 structure by deep-merging the edited fields
   * into the original PCF data. This preserves all unedited fields.
   */
  const buildUpdatedNestedPcf = (): Record<string, unknown> => {
    if (!pcfData) return {};

    // Deep-clone the original to avoid mutating state
    const updated = JSON.parse(JSON.stringify(pcfData)) as Record<string, unknown[]>;

    // Update productionStage PCF values
    const lifecycle = (updated.productLifeCycleStagesAndEmissions as Record<string, unknown[]>[])?.[0];
    if (lifecycle) {
      const productionStage = (lifecycle.productionStage as Record<string, unknown>[])?.[0];
      if (productionStage) {
        productionStage.pcfExcludingBiogenicUptake = formData.pcfExcludingBiogenic;
        productionStage.pcfIncludingBiogenicUptake = formData.pcfIncludingBiogenic;
      }
    }

    // Update primaryDataShare
    const methodology = (updated.pcfAssessmentAndMethodology as Record<string, unknown[]>[])?.[0];
    if (methodology) {
      const dataQuality = (methodology.dataSourcesAndQuality as Record<string, unknown>[])?.[0];
      if (dataQuality) {
        dataQuality.primaryDataShare = formData.primaryDataShare;
      }
      // Update geography country
      const assessmentInfo = (methodology.pcfAssessmentInformation as Record<string, unknown[]>[])?.[0];
      if (assessmentInfo) {
        const geography = (assessmentInfo.geography as Record<string, unknown>[])?.[0];
        if (geography) {
          geography.geographyCountry = formData.geographyCountry;
        }
      }
    }

    return updated;
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(buildUpdatedNestedPcf());
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  if (!pcfData || !part) return null;

  const declaredUnit = getDeclaredUnit(pcfData);
  const unitLabel = formatDeclaredUnit(declaredUnit);

  const textFieldSx = {
    '& .MuiOutlinedInput-root': {
      color: '#fff',
      backgroundColor: 'rgba(255,255,255,0.03)',
      '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' },
      '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.25)' },
      '&.Mui-focused fieldset': { borderColor: PCF_PRIMARY },
      '& input': { color: '#fff' },
      '& input[type=number]': {
        MozAppearance: 'textfield',
        '&::-webkit-outer-spin-button, &::-webkit-inner-spin-button': { WebkitAppearance: 'none', margin: 0 },
      },
    },
    '& .MuiInputLabel-root': {
      color: 'rgba(255,255,255,0.6)',
      '&.Mui-focused': { color: PCF_PRIMARY },
    },
    '& .MuiSelect-icon': { color: 'rgba(255,255,255,0.5)' },
    '& .MuiSelect-select': { color: '#fff' },
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: 'rgba(25,25,25,0.98)',
          backgroundImage: 'none',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '16px',
          minHeight: '500px',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pb: 2,
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              p: 1.5,
              borderRadius: '12px',
              background: `linear-gradient(135deg, ${PCF_PRIMARY} 0%, ${PCF_SECONDARY} 100%)`,
            }}
          >
            <Edit sx={{ color: '#fff', fontSize: 28 }} />
          </Box>
          <Box>
            <Typography variant="h5" sx={{ color: '#fff', fontWeight: 700 }}>
              Update PCF Data
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', mt: 0.5 }}>
              Editing carbon footprint for{' '}
              <span style={{ color: PCF_PRIMARY, fontWeight: 600 }}>{part.manufacturerPartId}</span>
            </Typography>
          </Box>
        </Box>
        <IconButton
          onClick={onClose}
          size="small"
          sx={{ color: 'rgba(255,255,255,0.5)', '&:hover': { color: '#fff' } }}
        >
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 4, py: 4 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>

          {/* Carbon Footprint Values */}
          <Box>
            <Typography
              variant="subtitle2"
              sx={{ color: 'rgba(255,255,255,0.5)', mb: 2, textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.75rem' }}
            >
              Carbon Footprint Values
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 3 }}>
              <TextField
                label={t('exchange.editDialog.pcfExcludingBiogenic')}
                type="number"
                value={formData.pcfExcludingBiogenic}
                onChange={handleChange('pcfExcludingBiogenic')}
                helperText={`kg CO₂e ${unitLabel}`}
                sx={{
                  ...textFieldSx,
                  '& .MuiFormHelperText-root': { color: 'rgba(255,255,255,0.35)' },
                }}
                fullWidth
              />
              <TextField
                label={t('exchange.editDialog.pcfIncludingBiogenic')}
                type="number"
                value={formData.pcfIncludingBiogenic}
                onChange={handleChange('pcfIncludingBiogenic')}
                helperText={`kg CO₂e ${unitLabel} — may be negative (net sink)`}
                sx={{
                  ...textFieldSx,
                  '& .MuiFormHelperText-root': { color: 'rgba(255,255,255,0.35)' },
                }}
                fullWidth
              />
            </Box>
          </Box>

          {/* Data Quality */}
          <Box>
            <Typography
              variant="subtitle2"
              sx={{ color: 'rgba(255,255,255,0.5)', mb: 2, textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.75rem' }}
            >
              Data Quality
            </Typography>
            <TextField
              label={t('exchange.editDialog.primaryDataShare')}
              type="number"
              value={formData.primaryDataShare}
              onChange={handleChange('primaryDataShare')}
              InputProps={{ inputProps: { min: 0, max: 100 } }}
              helperText="Share of primary (measured) data in the PCF calculation (0–100 %)"
              sx={{
                ...textFieldSx,
                '& .MuiFormHelperText-root': { color: 'rgba(255,255,255,0.35)' },
              }}
              fullWidth
            />
          </Box>

          {/* Geography */}
          <Box>
            <Typography
              variant="subtitle2"
              sx={{ color: 'rgba(255,255,255,0.5)', mb: 2, textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.75rem' }}
            >
              Geographic Information
            </Typography>
            <TextField
              select
              label={t('exchange.editDialog.manufacturingCountry')}
              value={formData.geographyCountry}
              onChange={handleChange('geographyCountry')}
              sx={textFieldSx}
              fullWidth
              SelectProps={{
                MenuProps: {
                  PaperProps: {
                    sx: {
                      backgroundColor: 'rgba(30,30,30,0.98)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      '& .MuiMenuItem-root': {
                        color: '#fff',
                        '&:hover': { backgroundColor: 'rgba(255,255,255,0.08)' },
                        '&.Mui-selected': {
                          backgroundColor: alpha(PCF_PRIMARY, 0.15),
                          '&:hover': { backgroundColor: alpha(PCF_PRIMARY, 0.2) },
                        },
                      },
                    },
                  },
                },
              }}
            >
              {COUNTRIES.map(code => (
                <MenuItem key={code} value={code}>{code}</MenuItem>
              ))}
            </TextField>
          </Box>

        </Box>
      </DialogContent>

      <DialogActions
        sx={{ px: 4, pb: 4, pt: 2, borderTop: '1px solid rgba(255,255,255,0.08)', gap: 2 }}
      >
        <Button
          variant="outlined"
          onClick={onClose}
          disabled={isSaving}
          sx={{
            px: 4,
            py: 1.25,
            borderColor: 'rgba(255,255,255,0.2)',
            color: 'rgba(255,255,255,0.7)',
            textTransform: 'none',
            borderRadius: '10px',
            fontWeight: 600,
            '&:hover': { borderColor: 'rgba(255,255,255,0.4)', color: '#fff' },
          }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={isSaving}
          startIcon={<Save />}
          sx={{
            px: 4,
            py: 1.25,
            textTransform: 'none',
            borderRadius: '10px',
            fontWeight: 600,
            background: `linear-gradient(135deg, ${PCF_PRIMARY} 0%, ${PCF_SECONDARY} 100%)`,
            '&:hover': { background: `linear-gradient(135deg, ${PCF_SECONDARY} 0%, ${PCF_PRIMARY} 100%)` },
            '&.Mui-disabled': { background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.3)' },
          }}
        >
          {isSaving ? 'Saving…' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PcfEditDialog;
