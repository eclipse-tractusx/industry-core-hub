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
  IconButton,
  Chip,
  CircularProgress,
  alpha
} from '@mui/material';
import {
  Close,
  Cancel,
  Warning
} from '@mui/icons-material';

interface RejectDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
  notificationId: string;
  requesterName: string;
  partName: string;
}

const RejectDialog: React.FC<RejectDialogProps> = ({
  open,
  onClose,
  onConfirm,
  notificationId: _notificationId,
  requesterName,
  partName
}) => {
  const { t } = useTranslation('pcf');
  const { t: tCommon } = useTranslation('common');
  const QUICK_REASONS = [
    t('rejectDialog.quickReasons.noBusinessRelation'),
    t('rejectDialog.quickReasons.dataNotAvailable'),
    t('rejectDialog.quickReasons.accessNotAuthorized'),
    t('rejectDialog.quickReasons.incorrectPartRef'),
    t('rejectDialog.quickReasons.alreadyProcessed'),
  ];
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleClose = () => {
    if (!isSubmitting) {
      setReason('');
      setError('');
      onClose();
    }
  };

  const handleConfirm = async () => {
    if (!reason.trim()) {
      setError(t('rejectDialog.reasonRequired'));
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await onConfirm(reason.trim());
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('rejectDialog.failedToReject'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickReason = (quickReason: string) => {
    setReason(quickReason);
    setError('');
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
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
              background: alpha('#ef4444', 0.15)
            }}
          >
            <Cancel sx={{ color: '#ef4444', fontSize: 28 }} />
          </Box>
          <Box>
            <Typography variant="h5" sx={{ color: '#fff', fontWeight: 700 }}>
              {t('rejectDialog.title')}
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
              {t('rejectDialog.subtitle')}
            </Typography>
          </Box>
        </Box>
        <IconButton
          onClick={handleClose}
          disabled={isSubmitting}
          sx={{ 
            color: 'rgba(255, 255, 255, 0.5)',
            '&:hover': { color: '#fff' }
          }}
        >
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 4 }}>
        {/* Two-column layout on desktop */}
        <Box sx={{ display: 'flex', gap: 4 }}>
          {/* Left column - Request Info */}
          <Box sx={{ flex: '0 0 280px' }}>
            <Typography variant="subtitle2" sx={{ color: 'rgba(255, 255, 255, 0.5)', mb: 2, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.75rem' }}>
              {t('rejectDialog.requestDetails')}
            </Typography>
            <Box
              sx={{
                p: 3,
                borderRadius: '16px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.06)'
              }}
            >
              <Box sx={{ mb: 3 }}>
                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.4)', display: 'block', mb: 0.5 }}>
                  {t('rejectDialog.requester')}
                </Typography>
                <Typography variant="body1" sx={{ color: '#fff', fontWeight: 600 }}>
                  {requesterName}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.4)', display: 'block', mb: 0.5 }}>
                  {t('rejectDialog.part')}
                </Typography>
                <Typography variant="body1" sx={{ color: '#fff', fontWeight: 600, fontFamily: 'monospace' }}>
                  {partName}
                </Typography>
              </Box>
            </Box>

            {/* Warning */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 1.5,
                p: 2,
                mt: 2,
                borderRadius: '12px',
                background: alpha('#eab308', 0.1),
                border: `1px solid ${alpha('#eab308', 0.2)}`
              }}
            >
              <Warning sx={{ color: '#eab308', fontSize: 20, mt: 0.25 }} />
              <Box>
                <Typography variant="body2" sx={{ color: '#eab308', fontWeight: 600, mb: 0.5 }}>
                  {t('rejectDialog.cannotBeUndone')}
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                  {t('rejectDialog.requesterNotified')}
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Right column - Rejection Form */}
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2" sx={{ color: 'rgba(255, 255, 255, 0.5)', mb: 2, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.75rem' }}>
              {t('rejectDialog.rejectionReason')}
            </Typography>

            {/* Quick Reasons */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', mb: 1.5 }}>
                {t('rejectDialog.selectOrWrite')}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {QUICK_REASONS.map((quickReason) => (
                  <Chip
                    key={quickReason}
                    label={quickReason}
                    onClick={() => handleQuickReason(quickReason)}
                    sx={{
                      cursor: 'pointer',
                      py: 0.5,
                      height: 'auto',
                      backgroundColor:
                        reason === quickReason
                          ? alpha('#ef4444', 0.2)
                          : 'rgba(255, 255, 255, 0.05)',
                      color:
                        reason === quickReason
                          ? '#ef4444'
                          : 'rgba(255, 255, 255, 0.7)',
                      border:
                        reason === quickReason
                          ? `1px solid ${alpha('#ef4444', 0.3)}`
                          : '1px solid rgba(255, 255, 255, 0.1)',
                      fontWeight: reason === quickReason ? 600 : 400,
                      '&:hover': {
                        backgroundColor: alpha('#ef4444', 0.15),
                        borderColor: alpha('#ef4444', 0.2)
                      }
                    }}
                  />
                ))}
              </Box>
            </Box>

            {/* Reason Input */}
            <TextField
              fullWidth
              multiline
              rows={5}
              label={t('rejectDialog.rejectionReason')}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setError('');
              }}
              placeholder={t('rejectDialog.reasonPlaceholder')}
              error={!!error}
              helperText={error || t('rejectDialog.reasonHelper')}
              disabled={isSubmitting}
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '12px',
                  '& fieldset': {
                    borderColor: error
                      ? '#ef4444'
                      : 'rgba(255, 255, 255, 0.1)'
                  },
                  '&:hover fieldset': {
                    borderColor: error
                      ? '#ef4444'
                      : 'rgba(255, 255, 255, 0.2)'
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: error ? '#ef4444' : '#ef4444'
                  }
                },
                '& .MuiInputLabel-root': {
                  color: 'rgba(255, 255, 255, 0.5)'
                },
                '& .MuiInputBase-input': {
                  color: '#fff'
                },
                '& .MuiFormHelperText-root': {
                  color: error ? '#ef4444' : 'rgba(255, 255, 255, 0.4)'
                }
              }}
            />
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 4, pt: 2, gap: 2, borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <Button
          onClick={handleClose}
          disabled={isSubmitting}
          sx={{
            color: 'rgba(255, 255, 255, 0.7)',
            textTransform: 'none',
            fontWeight: 500,
            px: 3,
            '&:hover': { color: '#fff', backgroundColor: 'rgba(255, 255, 255, 0.05)' }
          }}
        >
          {tCommon('cancel')}
        </Button>
        <Button
          variant="contained"
          onClick={handleConfirm}
          disabled={isSubmitting || !reason.trim()}
          startIcon={
            isSubmitting ? (
              <CircularProgress size={18} color="inherit" />
            ) : (
              <Cancel />
            )
          }
          sx={{
            px: 4,
            py: 1.5,
            borderRadius: '12px',
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '1rem',
            backgroundColor: '#ef4444',
            '&:hover': {
              backgroundColor: '#dc2626'
            },
            '&.Mui-disabled': {
              background: 'rgba(255, 255, 255, 0.1)',
              color: 'rgba(255, 255, 255, 0.3)'
            }
          }}
        >
          {isSubmitting ? t('rejectDialog.rejecting') : t('rejectDialog.rejectRequest')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RejectDialog;
