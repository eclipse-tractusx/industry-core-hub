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

import { getParticipantId } from '@/services/EnvironmentService';

import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Autocomplete,
  Grid2,
  Typography,
  Box,
  SelectChangeEvent,
  IconButton,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import FileUploadOutlinedIcon from '@mui/icons-material/FileUploadOutlined';
import VerifiedUserOutlinedIcon from '@mui/icons-material/VerifiedUserOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import { UploadCertificateDialogProps } from '../../types/dialog-types';
import { certificateManagementConfig } from '../../config';

// Shared certificate type list (full CX-0135 set) — reused across all CCM
// type selectors so the options stay consistent.
const CERTIFICATE_TYPES = certificateManagementConfig.certificateTypes;

// Trust levels mirror the backend TrustLevelEnum (none/low/high/trusted).
const TRUST_LEVELS = [
  { value: 'none', label: 'None' },
  { value: 'low', label: 'Low' },
  { value: 'high', label: 'High' },
  { value: 'trusted', label: 'Trusted' },
];

const initialFormData = {
  certificateType: '',
  certificateName: '',
  issuer: '',
  validFrom: '',
  validUntil: '',
  trustLevel: 'none',
  registrationNumber: '',
  areaOfApplication: '',
  validator: '',
  description: '',
  enclosedSitesBpn: [] as string[],
  file: undefined as File | undefined,
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_FILE_TYPES = ['application/pdf'];

export const UploadCertificateDialog = ({
  open,
  onClose,
  onSave,
  certificateData
}: UploadCertificateDialogProps) => {
  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState<Partial<Record<keyof typeof initialFormData, string>>>({});
  const [fileError, setFileError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bpnsInputValue, setBpnsInputValue] = useState('');
  const [bpnsInputError, setBpnsInputError] = useState<string | null>(null);
  
  const isEditing = !!certificateData;
  const [activeStep, setActiveStep] = useState(0);
  const STEPS = ['Certificate Details', 'Validity & Scope', 'Certificate File'];

  const userBpn = getParticipantId() || 'BPNL00000003CRHK';

  useEffect(() => {
    if (certificateData) {
      setFormData({
        certificateType: certificateData.type || '',
        certificateName: certificateData.name || '',
        issuer: certificateData.issuer || '',
        validFrom: certificateData.validFrom || '',
        validUntil: certificateData.validUntil || '',
        trustLevel: certificateData.trustLevel || 'none',
        registrationNumber: certificateData.certificateIdentifier || '',
        areaOfApplication: certificateData.areaOfApplication || '',
        validator: certificateData.validator || '',
        description: certificateData.description || '',
        enclosedSitesBpn: certificateData.enclosedSitesBpn || [],
        file: undefined,
      });
    } else {
      setFormData(initialFormData);
    }
    setErrors({});
    setFileError(null);
    setIsSubmitting(false);
  }, [certificateData, open]);

  const isFormValid = useMemo(() => {
    const hasRequiredFields = 
      formData.certificateType.trim() !== '' &&
      formData.issuer.trim() !== '' &&
      formData.validFrom !== '';
    
    const hasValidFile = isEditing || formData.file !== undefined;
    const hasNoFileError = !fileError;
    
    return hasRequiredFields && hasValidFile && hasNoFileError;
  }, [formData, fileError, isEditing]);

  const handleChange = (field: keyof typeof initialFormData) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData(prev => ({ ...prev, [field]: event.target.value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSelectChange = (field: keyof typeof initialFormData) => (
    event: SelectChangeEvent
  ) => {
    setFormData(prev => ({ ...prev, [field]: event.target.value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const processFile = (file: File | undefined) => {
    setFileError(null);
    if (!file) return;

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      setFileError('Invalid file type. Only PDF certificates are allowed.');
      return;
    }
    
    if (file.size > MAX_FILE_SIZE) {
      setFileError('File size exceeds the maximum 10MB limit.');
      return;
    }
    
    setFormData(prev => ({ ...prev, file: file }));
    if (errors.file) {
      setErrors(prev => ({ ...prev, file: undefined }));
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    processFile(event.target.files?.[0]);
  };

  const handleDragOver = (event: React.DragEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDrop = (event: React.DragEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    processFile(event.dataTransfer.files?.[0]);
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Partial<Record<keyof typeof initialFormData, string>> = {};
    
    if (step === 0) {
      if (!formData.certificateType) newErrors.certificateType = 'Certificate type is required';
      if (!formData.issuer.trim()) newErrors.issuer = 'Issuer is required';
    }
    if (step === 1) {
      if (!formData.validFrom) newErrors.validFrom = 'Valid from date is required';
      if (formData.validFrom && formData.validUntil && new Date(formData.validFrom) >= new Date(formData.validUntil)) {
        newErrors.validUntil = 'Valid until must be after valid from';
      }
    }
    if (step === 2) {
      if (!formData.file && !isEditing) newErrors.file = 'Certificate file is required';
    }
    
    setErrors(prev => ({ ...prev, ...newErrors }));
    return Object.keys(newErrors).length === 0;
  };

  const isStepComplete = (step: number): boolean => {
    if (step === 0) return !!(formData.certificateType && formData.issuer.trim());
    if (step === 1) return !!formData.validFrom;
    if (step === 2) return isEditing || !!formData.file;
    return true;
  };

  const handleNext = () => {
    if (validateStep(activeStep)) setActiveStep(s => s + 1);
  };

  const handleBack = () => setActiveStep(s => s - 1);

  const handleSubmit = async () => {
    if (!validateStep(2) || fileError) return;

    setIsSubmitting(true);
    try {
      const submitPayload = new FormData();

      submitPayload.append('file', formData.file!);
      submitPayload.append('bpnl', userBpn);
      submitPayload.append('certificateType', formData.certificateType);
      submitPayload.append('issuer', formData.issuer);
      submitPayload.append('validFrom', formData.validFrom);
      submitPayload.append('certificateName', formData.certificateName.trim());
      if (formData.validUntil) {
        submitPayload.append('validUntil', formData.validUntil);
      }
      submitPayload.append('trustLevel', formData.trustLevel);
      submitPayload.append('registrationNumber', formData.registrationNumber.trim());
      submitPayload.append('areaOfApplication', formData.areaOfApplication.trim());
      submitPayload.append('validator', formData.validator.trim());
      submitPayload.append('description', formData.description.trim());
      if (formData.enclosedSitesBpn.length > 0) {
        submitPayload.append('sites', formData.enclosedSitesBpn.join(','));
      }

      await onSave(submitPayload);
      setFormData(initialFormData);
      setFileError(null);
    } catch (error) {
      console.error('Failed to upload certificate via Dialog:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setFormData(initialFormData);
    setErrors({});
    setFileError(null);
    setActiveStep(0);
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{ sx: { borderRadius: 4, minWidth: { xs: '90%', sm: 640 } } }}
    >
      <DialogTitle sx={{ px: 3, py: 2, pr: 6, backgroundColor: 'primary.main', color: 'white' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <VerifiedUserOutlinedIcon sx={{ fontSize: 24, color: 'white' }} />
          <Box>
            <Typography variant="h6" component="span" fontWeight={600} sx={{ color: 'white', lineHeight: 1.2 }}>
              {isEditing ? 'Edit Certificate' : 'Upload Certificate'}
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.75)', display: 'block' }}>
              {STEPS[activeStep]}
            </Typography>
          </Box>
        </Box>
        <IconButton 
          onClick={handleClose} 
          size="medium"
          aria-label="close"
          sx={{ position: 'absolute', right: 12, top: 12, color: 'primary.contrastText', '&:hover': { backgroundColor: 'rgba(255,255,255,0.15)' } }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ backgroundColor: 'background.paper', px: 3, py: 3 }}>
        <Stepper activeStep={activeStep} sx={{ mt: 3, mb: 4 }}>
          {STEPS.map((label) => (
            <Step key={label}><StepLabel>{label}</StepLabel></Step>
          ))}
        </Stepper>

        {/* Step 0 — Certificate details */}
        {activeStep === 0 && (
          <Grid2 container spacing={2.5}>
            <Grid2 size={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <DescriptionOutlinedIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                <Typography variant="subtitle2" fontWeight={600} color="text.secondary">
                  Certificate Core Details
                </Typography>
              </Box>
            </Grid2>
            <Grid2 size={12}>
              <Autocomplete
                freeSolo
                autoSelect
                fullWidth
                options={CERTIFICATE_TYPES}
                value={
                  CERTIFICATE_TYPES.find((t) => t.value === formData.certificateType) ??
                  (formData.certificateType || null)
                }
                getOptionLabel={(option) =>
                  typeof option === 'string'
                    ? CERTIFICATE_TYPES.find((t) => t.value === option)?.label ?? option
                    : option.label
                }
                isOptionEqualToValue={(option, value) =>
                  option.value === (typeof value === 'string' ? value : value.value)
                }
                onChange={(_, newValue) => {
                  const v =
                    newValue == null
                      ? ''
                      : typeof newValue === 'string'
                        ? newValue.trim()
                        : newValue.value;
                  setFormData((prev) => ({ ...prev, certificateType: v }));
                  if (errors.certificateType) {
                    setErrors((prev) => ({ ...prev, certificateType: undefined }));
                  }
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Certificate Type"
                    error={!!errors.certificateType}
                    helperText={errors.certificateType ?? 'Search or type a certificate type'}
                    required
                  />
                )}
              />
            </Grid2>
            <Grid2 size={12}>
              <TextField
                fullWidth
                label="Certificate Name"
                value={formData.certificateName}
                onChange={handleChange('certificateName')}
                placeholder="e.g. Quality Management System Certificate"
              />
            </Grid2>
            <Grid2 size={12}>
              <TextField
                fullWidth
                label="Issuer / Certification Body"
                value={formData.issuer}
                onChange={handleChange('issuer')}
                error={!!errors.issuer}
                helperText={errors.issuer}
                required
                placeholder="e.g. DEKRA, TÜV SÜD"
              />
            </Grid2>
            <Grid2 size={12}>
              <TextField
                fullWidth
                label="Description"
                value={formData.description}
                onChange={handleChange('description')}
                multiline
                rows={2}
                placeholder="Optional description or notes about the scope"
              />
            </Grid2>
          </Grid2>
        )}

        {/* Step 1 — Validity & Scope */}
        {activeStep === 1 && (
          <Grid2 container spacing={2.5}>
            <Grid2 size={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <BusinessOutlinedIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                <Typography variant="subtitle2" fontWeight={600} color="text.secondary">
                  Validity, Trust & Application Context
                </Typography>
              </Box>
            </Grid2>
            
            {/* Informative Field for Holder (Your Own BPNL) */}
            <Grid2 size={12}>
              <TextField
                fullWidth
                label="Organization BPNL (Holder)"
                value={userBpn}
                disabled
                helperText="This certificate will be registered under your organization ID"
              />
            </Grid2>

            <Grid2 size={6}>
              <TextField
                fullWidth
                type="date"
                label="Valid From"
                value={formData.validFrom}
                onChange={handleChange('validFrom')}
                error={!!errors.validFrom}
                helperText={errors.validFrom}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid2>
            <Grid2 size={6}>
              <TextField
                fullWidth
                type="date"
                label="Valid Until"
                value={formData.validUntil}
                onChange={handleChange('validUntil')}
                error={!!errors.validUntil}
                helperText={errors.validUntil}
                InputLabelProps={{ shrink: true }}
              />
            </Grid2>

            <Grid2 size={6}>
              <TextField
                select
                fullWidth
                label="Trust Level"
                value={formData.trustLevel}
                onChange={(e) => handleSelectChange('trustLevel')(e as SelectChangeEvent)}
              >
                {TRUST_LEVELS.map(level => (
                  <MenuItem key={level.value} value={level.value}>{level.label}</MenuItem>
                ))}
              </TextField>
            </Grid2>
            <Grid2 size={6}>
              <TextField
                fullWidth
                label="Registration Number"
                placeholder="e.g. REG-123456-XYZ"
                value={formData.registrationNumber}
                onChange={handleChange('registrationNumber')}
              />
            </Grid2>

            <Grid2 size={6}>
              <TextField
                fullWidth
                label="Area of Application"
                placeholder="e.g. Powertrain Plant, Procurement Dept"
                value={formData.areaOfApplication}
                onChange={handleChange('areaOfApplication')}
                helperText="Target department, context or facility"
              />
            </Grid2>
            <Grid2 size={6}>
              <TextField
                fullWidth
                label="Validator Name"
                placeholder="e.g. Lead Auditor John Doe"
                value={formData.validator}
                onChange={handleChange('validator')}
                helperText="Auditor or verifying entity officer"
              />
            </Grid2>

            {/* Site management (BPNS) */}
            <Grid2 size={12}>
              <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2 }}>
                <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                  Associated Sites Scope (Optional)
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                  Type a specific facility BPNS value and press Enter to link it.
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="e.g. BPNS0000000000XY"
                  value={bpnsInputValue}
                  onChange={(e) => {
                    setBpnsInputValue(e.target.value);
                    setBpnsInputError(null);
                  }}
                  error={!!bpnsInputError}
                  helperText={bpnsInputError}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const val = bpnsInputValue.trim().toUpperCase();
                      if (!val) return;
                      const bpnsPattern = /^BPNS[A-Z0-9]{12}$/;
                      if (!bpnsPattern.test(val)) {
                        setBpnsInputError('Invalid BPNS format. Expected: BPNS followed by 12 alphanumeric characters.');
                        return;
                      }
                      if (formData.enclosedSitesBpn.includes(val)) {
                        setBpnsInputError('This BPNS has already been added.');
                        return;
                      }
                      setFormData(prev => ({
                        ...prev,
                        enclosedSitesBpn: [...prev.enclosedSitesBpn, val],
                      }));
                      setBpnsInputValue('');
                    }
                  }}
                />
                {formData.enclosedSitesBpn.length > 0 && (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                    {formData.enclosedSitesBpn.map((bpns) => (
                      <Box
                        key={bpns}
                        sx={{
                          display: 'inline-flex', alignItems: 'center', gap: 0.5,
                          bgcolor: 'action.selected', border: '1px solid', borderColor: 'divider',
                          borderRadius: 1, px: 1, py: 0.25, fontSize: '0.75rem', fontFamily: 'monospace',
                        }}
                      >
                        {bpns}
                        <Box
                          component="span"
                          sx={{ cursor: 'pointer', ml: 0.5, color: 'text.secondary', '&:hover': { color: 'error.main' } }}
                          onClick={() => setFormData(prev => ({
                            ...prev,
                            enclosedSitesBpn: prev.enclosedSitesBpn.filter(b => b !== bpns),
                          }))}
                        >
                          ×
                        </Box>
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>
            </Grid2>
          </Grid2>
        )}

        {/* Step 2 — Certificate File */}
        {activeStep === 2 && (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <FileUploadOutlinedIcon sx={{ color: 'primary.main', fontSize: 20 }} />
              <Typography variant="subtitle2" fontWeight={600} color="text.secondary">
                Certificate Document {!isEditing && <span style={{ color: '#d32f2f' }}>*</span>}
              </Typography>
            </Box>
            <Box
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              sx={{
                border: (fileError || errors.file) ? '2px dashed #d32f2f' : '2px dashed #bbdefb',
                borderRadius: 3, py: 4, px: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                background: (fileError || errors.file) ? 'linear-gradient(180deg, #fff5f5 0%, #ffffff 100%)' : 'linear-gradient(180deg, #f5f9ff 0%, #ffffff 100%)',
                opacity: isSubmitting ? 0.6 : 1, transition: 'all 0.2s ease',
                '&:hover': {
                  borderColor: (fileError || errors.file) ? '#d32f2f' : '#90caf9',
                  transform: isSubmitting ? 'none' : 'translateY(-2px)',
                  boxShadow: isSubmitting ? 'none' : '0 4px 12px rgba(25,118,210,0.1)',
                },
              }}
              component="label"
            >
              <input type="file" hidden accept=".pdf" onChange={handleFileChange} disabled={isSubmitting} />
              <Box sx={{ width: 56, height: 56, borderRadius: '50%', backgroundColor: (fileError || errors.file) ? '#ffebee' : '#e3f2fd', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1.5 }}>
                <FileUploadOutlinedIcon sx={{ fontSize: 28, color: (fileError || errors.file) ? '#d32f2f' : '#1976d2' }} />
              </Box>
              <Typography variant="body1" fontWeight={600} sx={{ mb: 0.5 }} align="center">
                {formData.file ? formData.file.name : 'Drag & drop or click to browse'}
              </Typography>
              <Typography variant="caption" color="text.secondary" align="center">
                Supported format: PDF only (max 10MB)
              </Typography>
              {(fileError || errors.file) && (
                <Typography variant="caption" color="error" display="block" sx={{ mt: 1, fontWeight: 500 }} align="center">
                  {fileError || errors.file}
                </Typography>
              )}
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid', borderColor: 'divider', backgroundColor: 'grey.50', gap: 1 }}>
        <Button onClick={activeStep === 0 ? handleClose : handleBack} variant="outlined" disabled={isSubmitting} sx={{ textTransform: 'none', minWidth: 100 }}>
          {activeStep === 0 ? 'Cancel' : 'Back'}
        </Button>
        <Box sx={{ flex: 1 }} />
        {activeStep < STEPS.length - 1 ? (
          <Button
            variant="contained"
            onClick={handleNext}
            disabled={!isStepComplete(activeStep)}
            sx={{ textTransform: 'none', minWidth: 100, fontWeight: 600 }}
          >
            Next
          </Button>
        ) : (
          <Button
            onClick={() => void handleSubmit()}
            variant="contained"
            disabled={!isFormValid || isSubmitting}
            sx={{ textTransform: 'none', minWidth: 120, fontWeight: 600 }}
          >
            {isSubmitting ? <CircularProgress size={20} color="inherit" /> : (isEditing ? 'Save Changes' : 'Upload')}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};
