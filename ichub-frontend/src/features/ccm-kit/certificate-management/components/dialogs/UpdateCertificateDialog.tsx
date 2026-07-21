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

import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
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
import EditNoteIcon from '@mui/icons-material/EditNote';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import { UpdateCertificateDialogProps } from '../../types/dialog-types';

const CERTIFICATE_TYPES = [
  { value: 'ISO9001', label: 'ISO 9001' },
  { value: 'ISO14001', label: 'ISO 14001' },
  { value: 'ISO45001', label: 'ISO 45001' },
  { value: 'IATF16949', label: 'IATF 16949' },
  { value: 'ISO27001', label: 'ISO 27001' },
  { value: 'ISO50001', label: 'ISO 50001' },
  { value: 'ISO22301', label: 'ISO 22301' },
  { value: 'ISO20000', label: 'ISO 20000' },
  { value: 'VDA6.4', label: 'VDA 6.4' },
  { value: 'OTHER', label: 'Other' },
];

const TRUST_LEVELS = [
  { value: 'none', label: 'None' },
  { value: 'low', label: 'Low' },
  { value: 'high', label: 'High' },
  { value: 'trusted', label: 'Trusted' },
];

const STEPS = ['Certificate Details', 'Validity & Scope'];

const buildInitialState = (cert: UpdateCertificateDialogProps['certificate']) => ({
  certificateType: cert?.type ?? '',
  certificateName: cert?.name ?? '',
  issuer: cert?.issuer ?? '',
  validFrom: cert?.validFrom ?? '',
  validUntil: cert?.validUntil ?? '',
  trustLevel: cert?.trustLevel ?? 'none',
  registrationNumber: cert?.certificateIdentifier ?? '',
  areaOfApplication: cert?.areaOfApplication ?? '',
  validator: cert?.validator ?? '',
  description: cert?.description ?? '',
  enclosedSitesBpn: cert?.enclosedSitesBpn ?? [],
});

export const UpdateCertificateDialog = ({
  open,
  onClose,
  certificate,
  onSave,
}: UpdateCertificateDialogProps) => {
  const [formData, setFormData] = useState(buildInitialState(certificate));
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [bpnsInputValue, setBpnsInputValue] = useState('');
  const [bpnsInputError, setBpnsInputError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setFormData(buildInitialState(certificate));
      setErrors({});
      setActiveStep(0);
      setIsSubmitting(false);
      setBpnsInputValue('');
      setBpnsInputError(null);
    }
  }, [open, certificate]);

  const isFormValid = useMemo(() => {
    return (
      formData.certificateType.trim() !== '' &&
      formData.issuer.trim() !== '' &&
      formData.validFrom !== ''
    );
  }, [formData]);

  const handleChange = (field: string) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({ ...prev, [field]: event.target.value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSelectChange = (field: string) => (event: SelectChangeEvent) => {
    setFormData((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};
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
    setErrors((prev) => ({ ...prev, ...newErrors }));
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(activeStep)) setActiveStep((s) => s + 1);
  };

  const handleBack = () => setActiveStep((s) => s - 1);

  const handleSubmit = async () => {
    if (!validateStep(1) || !certificate) return;
    setIsSubmitting(true);
    try {
      const payload = new FormData();
      payload.append('certificateType', formData.certificateType);
      payload.append('certificateName', formData.certificateName.trim());
      payload.append('issuer', formData.issuer.trim());
      payload.append('validFrom', formData.validFrom);
      if (formData.validUntil) payload.append('validUntil', formData.validUntil);
      payload.append('trustLevel', formData.trustLevel);
      if (formData.registrationNumber.trim()) payload.append('registrationNumber', formData.registrationNumber.trim());
      if (formData.areaOfApplication.trim()) payload.append('areaOfApplication', formData.areaOfApplication.trim());
      if (formData.validator.trim()) payload.append('validator', formData.validator.trim());
      if (formData.description.trim()) payload.append('description', formData.description.trim());
      if (formData.enclosedSitesBpn.length > 0) {
        payload.append('sites', formData.enclosedSitesBpn.join(','));
      }
      await onSave(certificate.id, payload);
    } catch {
      // error handled by parent
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
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
          <EditNoteIcon sx={{ fontSize: 24, color: 'white' }} />
          <Box>
            <Typography variant="h6" component="span" fontWeight={600} sx={{ color: 'white', lineHeight: 1.2 }}>
              Update Certificate
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

        {/* Step 0 — Certificate Details */}
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
              <TextField
                select
                fullWidth
                label="Certificate Type"
                value={formData.certificateType}
                onChange={(e) => handleSelectChange('certificateType')(e as SelectChangeEvent)}
                error={!!errors.certificateType}
                helperText={errors.certificateType}
                required
              >
                {CERTIFICATE_TYPES.map((t) => (
                  <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
                ))}
              </TextField>
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
                {TRUST_LEVELS.map((l) => (
                  <MenuItem key={l.value} value={l.value}>{l.label}</MenuItem>
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
                placeholder="e.g. Powertrain Plant"
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

            {/* Sites management */}
            <Grid2 size={12}>
              <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2 }}>
                <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                  Associated Sites Scope (Optional)
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                  Type a BPNS value and press Enter to link it. Saving will replace the current site list.
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="e.g. BPNS0000000000XY"
                  value={bpnsInputValue}
                  onChange={(e) => { setBpnsInputValue(e.target.value); setBpnsInputError(null); }}
                  error={!!bpnsInputError}
                  helperText={bpnsInputError}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const val = bpnsInputValue.trim().toUpperCase();
                      if (!val) return;
                      if (!/^BPNS[A-Z0-9]{12}$/.test(val)) {
                        setBpnsInputError('Invalid BPNS format. Expected: BPNS followed by 12 alphanumeric characters.');
                        return;
                      }
                      if (formData.enclosedSitesBpn.includes(val)) {
                        setBpnsInputError('This BPNS has already been added.');
                        return;
                      }
                      setFormData((prev) => ({ ...prev, enclosedSitesBpn: [...prev.enclosedSitesBpn, val] }));
                      setBpnsInputValue('');
                    }
                  }}
                />
                {formData.enclosedSitesBpn.length > 0 && (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                    {formData.enclosedSitesBpn.map((bpn) => (
                      <Box
                        key={bpn}
                        sx={{
                          display: 'inline-flex', alignItems: 'center', gap: 0.5,
                          bgcolor: 'action.selected', border: '1px solid', borderColor: 'divider',
                          borderRadius: 1, px: 1, py: 0.25, fontSize: '0.75rem', fontFamily: 'monospace',
                        }}
                      >
                        {bpn}
                        <Box
                          component="span"
                          sx={{ cursor: 'pointer', ml: 0.5, color: 'text.secondary', '&:hover': { color: 'error.main' } }}
                          onClick={() => setFormData((prev) => ({
                            ...prev,
                            enclosedSitesBpn: prev.enclosedSitesBpn.filter((b) => b !== bpn),
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
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid', borderColor: 'divider', backgroundColor: 'grey.50', gap: 1 }}>
        <Button
          onClick={activeStep === 0 ? handleClose : handleBack}
          variant="outlined"
          disabled={isSubmitting}
          sx={{ textTransform: 'none', minWidth: 100 }}
        >
          {activeStep === 0 ? 'Cancel' : 'Back'}
        </Button>
        <Box sx={{ flex: 1 }} />
        {activeStep < STEPS.length - 1 ? (
          <Button
            variant="contained"
            onClick={handleNext}
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
            {isSubmitting ? <CircularProgress size={20} color="inherit" /> : 'Save Changes'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};
