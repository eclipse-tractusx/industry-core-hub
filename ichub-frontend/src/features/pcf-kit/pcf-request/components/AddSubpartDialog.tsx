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

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  TextField,
  Button,
  InputAdornment,
  CircularProgress,
  alpha,
  IconButton,
  FormHelperText,
  Autocomplete
} from '@mui/material';
import {
  Inventory,
  Close,
  LinkOutlined,
  OpenInNew
} from '@mui/icons-material';
import { AddSubpartFormData } from '../api/pcfRequestApi';
import { fetchPartners } from '@/features/business-partner-kit/partner-management/api';
import { PartnerInstance } from '@/features/business-partner-kit/partner-management/types/types';

// PCF Green Theme
const PCF_PRIMARY = '#10b981';
const PCF_SECONDARY = '#059669';

interface AddSubpartDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: AddSubpartFormData) => Promise<void>;
  parentManufacturerPartId: string;
}

const AddSubpartDialog: React.FC<AddSubpartDialogProps> = ({
  open,
  onClose,
  onSubmit,
  parentManufacturerPartId
}) => {
  const { t } = useTranslation('pcf');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Partners for BPN autocomplete
  const [partners, setPartners] = useState<PartnerInstance[]>([]);
  const [isLoadingPartners, setIsLoadingPartners] = useState(false);

  // Form state
  const [supplierBpn, setSupplierBpn] = useState('');
  const [manufacturerPartId, setManufacturerPartId] = useState('');

  // Load partners when dialog opens
  useEffect(() => {
    if (!open) return;
    setIsLoadingPartners(true);
    fetchPartners()
      .then(data => setPartners(data))
      .catch(() => { /* silently ignore; no partners will be shown in dropdown */ })
      .finally(() => setIsLoadingPartners(false));
  }, [open]);

  // Validation errors
  const [bpnError, setBpnError] = useState('');
  const [partIdError, setPartIdError] = useState('');

  const resetForm = () => {
    setSupplierBpn('');
    setManufacturerPartId('');
    setBpnError('');
    setPartIdError('');
    setIsSubmitting(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const validateBpn = (bpn: string): boolean => {
    // Basic BPN validation: BPNL or BPNS followed by 12 alphanumeric characters (case-insensitive)
    const pattern = /^BPN[LS][0-9A-Z]{12}$/i;
    return pattern.test(bpn.trim());
  };

  const validateForm = (): boolean => {
    let isValid = true;

    // Validate BPN
    if (!supplierBpn.trim()) {
      setBpnError(t('addSubpartDialog.bpnRequired'));
      isValid = false;
    } else if (!validateBpn(supplierBpn)) {
      setBpnError(t('addSubpartDialog.bpnInvalidFormat'));
      isValid = false;
    } else {
      setBpnError('');
    }

    // Validate Manufacturer Part ID
    if (!manufacturerPartId.trim()) {
      setPartIdError(t('addSubpartDialog.partIdRequired'));
      isValid = false;
    } else {
      setPartIdError('');
    }

    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Close dialog immediately and let parent handle loading
    const formData = {
      supplierBpn: supplierBpn.trim().toUpperCase(),
      manufacturerPartId: manufacturerPartId.trim()
    };
    
    handleClose();
    
    // Call onSubmit after closing (parent will show loading state)
    await onSubmit(formData);
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      disableRestoreFocus
      PaperProps={{
        sx: {
          backgroundColor: '#1a1a1a',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '20px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
        }
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          py: 2.5,
          px: 4
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              p: 1.5,
              borderRadius: '12px',
              background: alpha(PCF_PRIMARY, 0.15)
            }}
          >
            <LinkOutlined sx={{ color: PCF_PRIMARY, fontSize: 28 }} />
          </Box>
          <Box>
            <Typography variant="h5" sx={{ color: '#fff', fontWeight: 700 }}>
              {t('addSubpartDialog.title')}
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
              {t('addSubpartDialog.parentPart')} <Box component="span" sx={{ fontFamily: 'monospace', color: PCF_PRIMARY }}>{parentManufacturerPartId}</Box>
            </Typography>
          </Box>
        </Box>
        <IconButton 
          onClick={handleClose} 
          sx={{ 
            color: 'rgba(255, 255, 255, 0.5)',
            '&:hover': { color: '#fff' }
          }}
        >
          <Close />
        </IconButton>
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ p: 4 }}>
          <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', mb: 4 }}>
            {t('addSubpartDialog.description')}
          </Typography>

          {/* Vertical form layout: BPN on top, Part ID below */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

            {/* Supplier BPN — inline dark-themed Autocomplete */}
            <Box>
              <Typography variant="subtitle2" sx={{ color: '#fff', mb: 1.5, fontWeight: 600 }}>
                {t('addSubpartDialog.supplierBpn')} *
              </Typography>
              <Autocomplete<PartnerInstance, false, boolean, true>
                freeSolo
                disableClearable={!supplierBpn}
                options={partners}
                loading={isLoadingPartners}
                getOptionLabel={(option) =>
                  typeof option === 'string' ? option : option.bpnl
                }
                value={supplierBpn}
                onChange={(_, newValue) => {
                  if (typeof newValue === 'string') {
                    setSupplierBpn(newValue);
                  } else if (newValue) {
                    setSupplierBpn(newValue.bpnl);
                  } else {
                    setSupplierBpn('');
                  }
                  setBpnError('');
                }}
                onInputChange={(_, newInputValue) => {
                  setSupplierBpn(newInputValue || '');
                  setBpnError('');
                }}
                renderOption={(props, option) => {
                  // Destructure key to avoid React warning about spreading key as a prop
                  const { key, ...optionProps } = props as typeof props & { key: React.Key };
                  return (
                    <Box
                      key={key}
                      component="li"
                      {...optionProps}
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start !important',
                        py: '10px !important',
                        px: '16px !important',
                        cursor: 'pointer',
                        '&:hover': { background: `${alpha(PCF_PRIMARY, 0.12)} !important` },
                        '&[aria-selected="true"]': { background: `${alpha(PCF_PRIMARY, 0.2)} !important` },
                      }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#fff' }}>
                        {option.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}>
                        {option.bpnl}
                      </Typography>
                    </Box>
                  );
                }}
                slotProps={{
                  paper: {
                    sx: {
                      background: '#1e1e2e',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      mt: 0.5,
                      '& .MuiAutocomplete-listbox': { p: 0.5 },
                      '& .MuiAutocomplete-noOptions': { color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem' },
                      '& .MuiAutocomplete-loading': { color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem' },
                    }
                  },
                  clearIndicator: { sx: { color: 'rgba(255,255,255,0.4)', background: 'none !important', '&:hover': { background: 'none !important', color: '#fff' } } },
                  popupIndicator: { sx: { color: 'rgba(255,255,255,0.4)', background: 'none !important', '&:hover': { background: 'none !important', color: '#fff' } } },
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder={t('addSubpartDialog.supplierBpnPlaceholder')}
                    error={!!bpnError}
                    slotProps={{
                      input: {
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {isLoadingPartners && <CircularProgress size={16} sx={{ color: PCF_PRIMARY, mr: 0.5 }} />}
                            {params.InputProps.endAdornment}
                          </>
                        )
                      }
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        background: 'rgba(255,255,255,0.05)',
                        borderRadius: '12px',
                        '& fieldset': { borderColor: bpnError ? '#ef4444' : 'rgba(255,255,255,0.1)' },
                        '&:hover fieldset': { borderColor: bpnError ? '#ef4444' : 'rgba(255,255,255,0.2)' },
                        '&.Mui-focused fieldset': { borderColor: bpnError ? '#ef4444' : PCF_PRIMARY },
                      },
                      '& .MuiInputBase-input': {
                        color: '#fff',
                        fontFamily: 'monospace',
                        '&::placeholder': { color: 'rgba(255,255,255,0.3)' }
                      },
                    }}
                  />
                )}
              />
              {bpnError && (
                <FormHelperText sx={{ color: '#ef4444', mt: 0.5 }}>
                  {bpnError}
                </FormHelperText>
              )}
              <FormHelperText sx={{ color: 'rgba(255,255,255,0.4)', mt: 0.5 }}>
                {t('addSubpartDialog.supplierBpnHelper')}
              </FormHelperText>
              {/* Link to Contact List — inline with label */}
              <Box sx={{ mt: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)' }}>
                  {t('addSubpartDialog.contactNotFound')}
                </Typography>
                <Button
                  size="small"
                  endIcon={<OpenInNew sx={{ fontSize: 12 }} />}
                  onClick={() => window.open('/partners', '_blank')}
                  sx={{
                    p: 0,
                    minWidth: 0,
                    color: PCF_PRIMARY,
                    fontSize: '0.75rem',
                    textTransform: 'none',
                    lineHeight: 1.5,
                    '&:hover': { background: 'none', textDecoration: 'underline' }
                  }}
                >
                  {t('addSubpartDialog.createInContactList')}
                </Button>
              </Box>
            </Box>

            {/* Manufacturer Part ID Field */}
            <Box>
              <Typography variant="subtitle2" sx={{ color: '#fff', mb: 1.5, fontWeight: 600 }}>
                {t('addSubpartDialog.manufacturerPartId')} *
              </Typography>
              <TextField
                fullWidth
                placeholder={t('addSubpartDialog.manufacturerPartIdPlaceholder')}
                value={manufacturerPartId}
                onChange={(e) => {
                  setManufacturerPartId(e.target.value);
                  setPartIdError('');
                }}
                error={!!partIdError}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Inventory sx={{ color: 'rgba(255, 255, 255, 0.4)' }} />
                    </InputAdornment>
                  ),
                  endAdornment: manufacturerPartId ? (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => { setManufacturerPartId(''); setPartIdError(''); }}
                        sx={{
                          color: 'rgba(255,255,255,0.4)',
                          background: 'none',
                          '&:hover': { background: 'none', color: '#fff' }
                        }}
                      >
                        <Close sx={{ fontSize: 16 }} />
                      </IconButton>
                    </InputAdornment>
                  ) : undefined
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '12px',
                    '& fieldset': { borderColor: partIdError ? '#ef4444' : 'rgba(255,255,255,0.1)' },
                    '&:hover fieldset': { borderColor: partIdError ? '#ef4444' : 'rgba(255,255,255,0.2)' },
                    '&.Mui-focused fieldset': { borderColor: partIdError ? '#ef4444' : PCF_PRIMARY },
                  },
                  '& .MuiInputBase-input': {
                    color: '#fff',
                    '&::placeholder': { color: 'rgba(255,255,255,0.3)' }
                  }
                }}
              />
              {partIdError && (
                <FormHelperText sx={{ color: '#ef4444', mt: 0.5 }}>
                  {partIdError}
                </FormHelperText>
              )}
              <FormHelperText sx={{ color: 'rgba(255,255,255,0.4)', mt: 0.5 }}>
                {t('addSubpartDialog.manufacturerPartIdHelper')}
              </FormHelperText>
            </Box>

          </Box>
        </DialogContent>

        <DialogActions
          sx={{
            px: 4,
            pb: 4,
            pt: 2,
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            gap: 2
          }}
        >
          <Button
            onClick={handleClose}
            disabled={isSubmitting}
            sx={{
              color: 'rgba(255, 255, 255, 0.7)',
              textTransform: 'none',
              borderRadius: '12px',
              px: 4,
              fontWeight: 500,
              '&:hover': {
                background: 'rgba(255, 255, 255, 0.05)'
              }
            }}
          >
            {t('common.cancel')}
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isSubmitting || !supplierBpn.trim() || !manufacturerPartId.trim()}
            startIcon={isSubmitting ? <CircularProgress size={18} color="inherit" /> : <LinkOutlined />}
            sx={{
              background: `linear-gradient(135deg, ${PCF_PRIMARY} 0%, ${PCF_SECONDARY} 100%)`,
              textTransform: 'none',
              borderRadius: '12px',
              px: 4,
              py: 1.5,
              fontWeight: 600,
              fontSize: '1rem',
              '&:hover': {
                background: `linear-gradient(135deg, ${PCF_SECONDARY} 0%, #047857 100%)`
              },
              '&.Mui-disabled': {
                background: 'rgba(255, 255, 255, 0.1)',
                color: 'rgba(255, 255, 255, 0.3)'
              }
            }}
          >
            {isSubmitting ? t('addSubpartDialog.adding') : t('addSubpartDialog.addSubpartRelation')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default AddSubpartDialog;
