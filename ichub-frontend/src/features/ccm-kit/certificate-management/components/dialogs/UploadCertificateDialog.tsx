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
import { useTranslation } from 'react-i18next';
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
import { BpnsInput } from '@/features/ccm-kit/shared-components';

// Shared certificate type list (full CX-0135 set) — reused across all CCM
// type selectors so the options stay consistent.
const CERTIFICATE_TYPES = certificateManagementConfig.certificateTypes;


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
  const { t } = useTranslation('certificateManagement');
  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState<Partial<Record<keyof typeof initialFormData, string>>>({});
  const [fileError, setFileError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = !!certificateData;
  const [activeStep, setActiveStep] = useState(0);
  const STEPS = [
    t('uploadDialog.steps.certDetails'),
    t('uploadDialog.steps.validityScope'),
    t('uploadDialog.steps.certFile'),
  ];

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
      setFileError(t('uploadDialog.errors.invalidFileType'));
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setFileError(t('uploadDialog.errors.fileTooLarge'));
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
      if (!formData.certificateType) newErrors.certificateType = t('uploadDialog.errors.certTypeRequired');
      if (!formData.issuer.trim()) newErrors.issuer = t('uploadDialog.errors.issuerRequired');
    }
    if (step === 1) {
      if (!formData.validFrom) newErrors.validFrom = t('uploadDialog.errors.validFromRequired');
      if (formData.validFrom && formData.validUntil && new Date(formData.validFrom) >= new Date(formData.validUntil)) {
        newErrors.validUntil = t('uploadDialog.errors.validUntilAfterFrom');
      }
    }
    if (step === 2) {
      if (!formData.file && !isEditing) newErrors.file = t('uploadDialog.errors.fileRequired');
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
              {isEditing ? t('uploadDialog.editTitle') : t('uploadDialog.title')}
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
                  {t('uploadDialog.sections.coreDetails')}
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
                    label={t('uploadDialog.fields.certType')}
                    error={!!errors.certificateType}
                    helperText={errors.certificateType ?? t('uploadDialog.fields.certTypeHelper')}
                    required
                  />
                )}
              />
            </Grid2>
            <Grid2 size={12}>
              <TextField
                fullWidth
                label={t('uploadDialog.fields.certName')}
                value={formData.certificateName}
                onChange={handleChange('certificateName')}
                placeholder={t('uploadDialog.fields.certNamePlaceholder')}
              />
            </Grid2>
            <Grid2 size={12}>
              <TextField
                fullWidth
                label={t('uploadDialog.fields.issuer')}
                value={formData.issuer}
                onChange={handleChange('issuer')}
                error={!!errors.issuer}
                helperText={errors.issuer}
                required
                placeholder={t('uploadDialog.fields.issuerPlaceholder')}
              />
            </Grid2>
            <Grid2 size={12}>
              <TextField
                fullWidth
                label={t('uploadDialog.fields.description')}
                value={formData.description}
                onChange={handleChange('description')}
                multiline
                rows={2}
                placeholder={t('uploadDialog.fields.descriptionPlaceholder')}
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
                  {t('uploadDialog.sections.validityContext')}
                </Typography>
              </Box>
            </Grid2>
            
            {/* Informative Field for Holder (Your Own BPNL) */}
            <Grid2 size={12}>
              <TextField
                fullWidth
                label={t('uploadDialog.fields.orgBpnl')}
                value={userBpn}
                disabled
                helperText={t('uploadDialog.fields.orgBpnlHelper')}
              />
            </Grid2>

            <Grid2 size={6}>
              <TextField
                fullWidth
                type="date"
                label={t('uploadDialog.fields.validFrom')}
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
                label={t('uploadDialog.fields.validUntil')}
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
                label={t('uploadDialog.fields.trustLevel')}
                value={formData.trustLevel}
                onChange={(e) => handleSelectChange('trustLevel')(e as SelectChangeEvent)}
              >
                {(['none', 'low', 'high', 'trusted'] as const).map((value) => (
                  <MenuItem key={value} value={value}>
                    {t(`uploadDialog.fields.trust${value.charAt(0).toUpperCase()}${value.slice(1)}`)}
                  </MenuItem>
                ))}
              </TextField>
            </Grid2>
            <Grid2 size={6}>
              <TextField
                fullWidth
                label={t('uploadDialog.fields.regNumber')}
                placeholder={t('uploadDialog.fields.regNumberPlaceholder')}
                value={formData.registrationNumber}
                onChange={handleChange('registrationNumber')}
              />
            </Grid2>

            <Grid2 size={6}>
              <TextField
                fullWidth
                label={t('uploadDialog.fields.areaOfApplication')}
                placeholder={t('uploadDialog.fields.areaOfApplicationPlaceholder')}
                value={formData.areaOfApplication}
                onChange={handleChange('areaOfApplication')}
                helperText={t('uploadDialog.fields.areaOfApplicationHelper')}
              />
            </Grid2>
            <Grid2 size={6}>
              <TextField
                fullWidth
                label={t('uploadDialog.fields.validatorName')}
                placeholder={t('uploadDialog.fields.validatorPlaceholder')}
                value={formData.validator}
                onChange={handleChange('validator')}
                helperText={t('uploadDialog.fields.validatorHelper')}
              />
            </Grid2>

            {/* Site management (BPNS) */}
            <Grid2 size={12}>
              <BpnsInput
                value={formData.enclosedSitesBpn}
                onChange={(next) => setFormData((prev) => ({ ...prev, enclosedSitesBpn: next }))}
                label={t('uploadDialog.fields.associatedSites')}
              />
            </Grid2>
          </Grid2>
        )}

        {/* Step 2 — Certificate File */}
        {activeStep === 2 && (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <FileUploadOutlinedIcon sx={{ color: 'primary.main', fontSize: 20 }} />
              <Typography variant="subtitle2" fontWeight={600} color="text.secondary">
                {t('uploadDialog.steps.certFile')} {!isEditing && <span style={{ color: '#d32f2f' }}>*</span>}
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
                {formData.file ? formData.file.name : t('uploadDialog.fileZone.dragDrop')}
              </Typography>
              <Typography variant="caption" color="text.secondary" align="center">
                {t('uploadDialog.fileZone.format')}
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
          {activeStep === 0 ? t('common.cancel') : t('common.back')}
        </Button>
        <Box sx={{ flex: 1 }} />
        {activeStep < STEPS.length - 1 ? (
          <Button
            variant="contained"
            onClick={handleNext}
            disabled={!isStepComplete(activeStep)}
            sx={{ textTransform: 'none', minWidth: 100, fontWeight: 600 }}
          >
            {t('common.next')}
          </Button>
        ) : (
          <Button
            onClick={() => void handleSubmit()}
            variant="contained"
            disabled={!isFormValid || isSubmitting}
            sx={{ textTransform: 'none', minWidth: 120, fontWeight: 600 }}
          >
            {isSubmitting ? <CircularProgress size={20} color="inherit" /> : (isEditing ? t('common.saveChanges') : t('common.upload'))}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};
