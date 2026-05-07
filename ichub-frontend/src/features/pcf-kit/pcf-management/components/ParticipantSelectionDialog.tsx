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
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Checkbox,
  FormControlLabel,
  FormGroup,
  CircularProgress,
  alpha,
  Chip,
  Divider,
  Alert,
  IconButton,
} from '@mui/material';
import {
  Send as SendIcon,
  Close as CloseIcon,
  Group as GroupIcon,
  Business as BusinessIcon,
} from '@mui/icons-material';

// PCF theme colors
const PCF_PRIMARY = '#10b981';
const PCF_SECONDARY = '#059669';

interface ParticipantSelectionDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (selectedParticipants: string[]) => Promise<void>;
  participants: string[];
  manufacturerPartId: string;
  isLoading?: boolean;
}

/**
 * Dialog component for selecting BPN participants to notify about PCF updates.
 * Appears after updating PCF data when there are interested parties.
 */
const ParticipantSelectionDialog: React.FC<ParticipantSelectionDialogProps> = ({
  open,
  onClose,
  onConfirm,
  participants,
  manufacturerPartId,
  isLoading: externalLoading = false,
}) => {
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset selection when dialog opens
  useEffect(() => {
    if (open) {
      // Pre-select all participants
      setSelectedParticipants([...participants]);
      setError(null);
    }
  }, [open, participants]);

  const handleToggleParticipant = (bpn: string) => {
    setSelectedParticipants((prev) =>
      prev.includes(bpn) ? prev.filter((p) => p !== bpn) : [...prev, bpn]
    );
  };

  const handleSelectAll = () => {
    if (selectedParticipants.length === participants.length) {
      setSelectedParticipants([]);
    } else {
      setSelectedParticipants([...participants]);
    }
  };

  const handleConfirm = async () => {
    if (selectedParticipants.length === 0) {
      onClose();
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onConfirm(selectedParticipants);
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to notify participants';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = externalLoading || isSubmitting;

  return (
    <Dialog
      open={open}
      onClose={isLoading ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          borderRadius: 3,
          border: `1px solid ${alpha(PCF_PRIMARY, 0.2)}`,
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pb: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              background: `linear-gradient(135deg, ${PCF_PRIMARY} 0%, ${PCF_SECONDARY} 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <GroupIcon sx={{ color: '#fff', fontSize: 22 }} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Notify Participants
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Select participants to notify about PCF update
            </Typography>
          </Box>
        </Box>
        {!isLoading && (
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        )}
      </DialogTitle>

      <DialogContent>
        <Box sx={{ pt: 1 }}>
          <Box
            sx={{
              p: 2,
              mb: 2,
              borderRadius: 2,
              bgcolor: alpha(PCF_PRIMARY, 0.08),
              border: `1px solid ${alpha(PCF_PRIMARY, 0.15)}`,
            }}
          >
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.5 }}>
              Part ID
            </Typography>
            <Typography
              variant="body1"
              sx={{
                fontWeight: 500,
                fontFamily: 'monospace',
                color: PCF_PRIMARY,
              }}
            >
              {manufacturerPartId}
            </Typography>
          </Box>

          {error && (
            <Alert
              severity="error"
              sx={{ mb: 2 }}
              onClose={() => setError(null)}
            >
              {error}
            </Alert>
          )}

          {participants.length === 0 ? (
            <Alert severity="info" sx={{ mb: 2 }}>
              No participants have requested PCF data for this part. The update
              will be saved but no notifications will be sent.
            </Alert>
          ) : (
            <>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  mb: 2,
                }}
              >
                <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
                  {participants.length} participant{participants.length !== 1 ? 's' : ''}{' '}
                  interested in this PCF data
                </Typography>
                <Button
                  size="small"
                  onClick={handleSelectAll}
                  disabled={isLoading}
                  sx={{ color: PCF_PRIMARY }}
                >
                  {selectedParticipants.length === participants.length
                    ? 'Deselect All'
                    : 'Select All'}
                </Button>
              </Box>

              <Divider sx={{ mb: 2 }} />

              <FormGroup>
                {participants.map((bpn) => (
                  <Box
                    key={bpn}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      p: 1.5,
                      mb: 1,
                      borderRadius: 2,
                      bgcolor: selectedParticipants.includes(bpn)
                        ? alpha(PCF_PRIMARY, 0.1)
                        : alpha('#fff', 0.02),
                      border: `1px solid ${
                        selectedParticipants.includes(bpn)
                          ? alpha(PCF_PRIMARY, 0.3)
                          : alpha('#fff', 0.05)
                      }`,
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        bgcolor: alpha(PCF_PRIMARY, 0.08),
                      },
                    }}
                  >
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={selectedParticipants.includes(bpn)}
                          onChange={() => handleToggleParticipant(bpn)}
                          disabled={isLoading}
                          sx={{
                            color: alpha('#fff', 0.3),
                            '&.Mui-checked': {
                              color: PCF_PRIMARY,
                            },
                          }}
                        />
                      }
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <BusinessIcon
                            sx={{ fontSize: 18, color: 'text.secondary' }}
                          />
                          <Typography
                            sx={{
                              fontFamily: 'monospace',
                              fontSize: '0.875rem',
                            }}
                          >
                            {bpn}
                          </Typography>
                        </Box>
                      }
                      sx={{ flex: 1, m: 0 }}
                    />
                  </Box>
                ))}
              </FormGroup>

              <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                <Chip
                  size="small"
                  label={`${selectedParticipants.length} selected`}
                  sx={{
                    bgcolor: alpha(PCF_PRIMARY, 0.15),
                    color: PCF_PRIMARY,
                    fontWeight: 500,
                  }}
                />
              </Box>
            </>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} disabled={isLoading} color="inherit">
          {participants.length === 0 ? 'Close' : 'Skip'}
        </Button>
        {participants.length > 0 && (
          <Button
            onClick={handleConfirm}
            disabled={isLoading || selectedParticipants.length === 0}
            variant="contained"
            startIcon={
              isLoading ? (
                <CircularProgress size={18} sx={{ color: 'inherit' }} />
              ) : (
                <SendIcon />
              )
            }
            sx={{
              background: `linear-gradient(135deg, ${PCF_PRIMARY} 0%, ${PCF_SECONDARY} 100%)`,
              '&:hover': {
                background: `linear-gradient(135deg, ${PCF_SECONDARY} 0%, ${PCF_PRIMARY} 100%)`,
              },
            }}
          >
            {isLoading ? 'Sending...' : 'Send Notifications'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ParticipantSelectionDialog;
