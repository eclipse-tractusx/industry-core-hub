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

import { useState, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton,
  Stepper,
  Step,
  StepLabel,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Alert,
  Chip,
  CircularProgress,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import CloseIcon from '@mui/icons-material/Close';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import { UpdatePdfDialogProps } from '../../types/dialog-types';

const STEPS = ['Upload New PDF', 'Notify Partners'];

export const UpdatePdfDialog = ({
  open,
  onClose,
  certificate,
  onUpdate,
}: UpdatePdfDialogProps) => {
  const [activeStep, setActiveStep] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedBpns, setSelectedBpns] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activePartners =
    certificate?.sharingRecords?.filter((r) => r.status === 'Active') ?? [];
  const hasPartners = activePartners.length > 0;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setError('Only PDF files are accepted.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be under 10 MB.');
      return;
    }
    setError('');
    setSelectedFile(file);
  };

  const handleToggleBpn = (bpn: string) => {
    setSelectedBpns((prev) =>
      prev.includes(bpn) ? prev.filter((b) => b !== bpn) : [...prev, bpn]
    );
  };

  const handleSelectAll = () => {
    if (selectedBpns.length === activePartners.length) {
      setSelectedBpns([]);
    } else {
      setSelectedBpns(activePartners.map((p) => p.partnerBpn));
    }
  };

  const handleNext = () => {
    if (activeStep === 0 && !selectedFile) {
      setError('Please select a PDF file.');
      return;
    }
    if (!hasPartners) {
      handleConfirm();
      return;
    }
    setActiveStep(1);
  };

  const handleConfirm = async () => {
    if (!certificate || !selectedFile) return;
    setIsSubmitting(true);
    try {
      await onUpdate(certificate.id, selectedFile, selectedBpns);
      handleClose();
    } catch {
      setError('Failed to update the PDF. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setActiveStep(0);
    setSelectedFile(null);
    setSelectedBpns([]);
    setError('');
    setIsSubmitting(false);
    onClose();
  };

  if (!certificate) return null;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle
        sx={{
          backgroundColor: 'primary.main',
          color: 'primary.contrastText',
          px: 3,
          py: 2,
          pr: 6,
          position: 'relative',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <RefreshIcon sx={{ fontSize: 22, color: 'inherit' }} />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600, color: 'inherit', lineHeight: 1.2 }}>
              Update PDF
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.75)' }}>
              {certificate.name}
            </Typography>
          </Box>
        </Box>
        <IconButton
          size="small"
          onClick={handleClose}
          aria-label="close"
          sx={{
            position: 'absolute',
            right: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'primary.contrastText',
            '&:hover': { backgroundColor: 'rgba(255,255,255,0.15)' },
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ backgroundColor: 'background.paper', px: 3, pt: 3, pb: 2 }}>
        {hasPartners && (
          <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
            {STEPS.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        )}

        {/* ── Step 0: Upload ── */}
        {activeStep === 0 && (
          <Box>
            <Alert severity="warning" sx={{ mb: 2.5 }}>
              This will replace the current PDF document. This action cannot be undone.
            </Alert>

            <Box
              onClick={() => fileInputRef.current?.click()}
              sx={{
                border: '2px dashed',
                borderColor: selectedFile ? 'success.main' : 'rgba(255,255,255,0.2)',
                borderRadius: 2,
                p: 3,
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
                '&:hover': { borderColor: 'primary.main', backgroundColor: 'rgba(255,255,255,0.03)' },
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              {selectedFile ? (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                  <PictureAsPdfIcon sx={{ color: 'success.main', fontSize: 28 }} />
                  <Box sx={{ textAlign: 'left' }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {selectedFile.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {(selectedFile.size / 1024).toFixed(0)} KB — click to change
                    </Typography>
                  </Box>
                </Box>
              ) : (
                <>
                  <UploadFileIcon sx={{ fontSize: 36, color: 'rgba(255,255,255,0.3)', mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    Click to select a PDF file
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    PDF only, max 10 MB
                  </Typography>
                </>
              )}
            </Box>

            {error && (
              <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
                {error}
              </Typography>
            )}
          </Box>
        )}

        {/* ── Step 1: Notify Partners ── */}
        {activeStep === 1 && (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <NotificationsNoneIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
              <Typography variant="body2" color="text.secondary">
                Select which partners should be notified about the updated PDF.
              </Typography>
            </Box>

            <Box
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                overflow: 'hidden',
                mb: 1,
              }}
            >
              <Box
                sx={{
                  px: 2,
                  py: 1,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  backgroundColor: 'rgba(255,255,255,0.03)',
                }}
              >
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={selectedBpns.length === activePartners.length && activePartners.length > 0}
                      indeterminate={selectedBpns.length > 0 && selectedBpns.length < activePartners.length}
                      onChange={handleSelectAll}
                    />
                  }
                  label={
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      Select all ({activePartners.length} partners)
                    </Typography>
                  }
                />
              </Box>
              <FormGroup sx={{ px: 2, py: 1 }}>
                {activePartners.map((partner) => (
                  <FormControlLabel
                    key={partner.partnerBpn}
                    control={
                      <Checkbox
                        size="small"
                        checked={selectedBpns.includes(partner.partnerBpn)}
                        onChange={() => handleToggleBpn(partner.partnerBpn)}
                      />
                    }
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2">
                          {partner.partnerName ?? partner.partnerBpn}
                        </Typography>
                        <Chip
                          label={partner.partnerBpn}
                          size="small"
                          sx={{ fontFamily: 'monospace', fontSize: '0.65rem', height: 18 }}
                        />
                      </Box>
                    }
                  />
                ))}
              </FormGroup>
            </Box>

            <Typography variant="caption" color="text.secondary">
              {selectedBpns.length === 0
                ? 'No partners will be notified.'
                : `${selectedBpns.length} partner${selectedBpns.length > 1 ? 's' : ''} will receive a notification.`}
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions
        sx={{
          px: 3,
          py: 2,
          borderTop: '1px solid',
          borderColor: 'divider',
          backgroundColor: 'grey.50',
          gap: 1,
        }}
      >
        <Button onClick={handleClose} variant="outlined" sx={{ textTransform: 'none' }}>
          Cancel
        </Button>
        {activeStep === 1 && (
          <Button onClick={() => setActiveStep(0)} variant="outlined" sx={{ textTransform: 'none' }}>
            Back
          </Button>
        )}
        <Button
          onClick={activeStep === 0 ? handleNext : handleConfirm}
          variant="contained"
          disabled={isSubmitting || (activeStep === 0 && !selectedFile)}
          startIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : undefined}
          sx={{ textTransform: 'none', fontWeight: 600 }}
        >
          {activeStep === 0
            ? hasPartners
              ? 'Next'
              : 'Confirm Update'
            : 'Confirm Update'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
