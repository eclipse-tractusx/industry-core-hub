/********************************************************************************
 * Eclipse Tractus-X - Industry Core Hub Frontend
 *
 * Copyright (c) 2026 Contributors to the Eclipse Foundation
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

import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

import { getParticipantId } from '@/services/EnvironmentService';
import { sendStatus } from '../../api';
import { CCM_POLICY_GOVERNANCE } from '../../config';
import {
  CertificateStatusValue,
  LocationErrorDetail,
  OutboundRequestItem,
} from '../../types/types';

interface SendStatusDialogProps {
  open: boolean;
  request: OutboundRequestItem | null;
  onClose: () => void;
  onSuccess: (status: CertificateStatusValue) => void;
}

interface LocationErrorRow {
  bpn: string;
  message: string;
}

const SendStatusDialog = ({ open, request, onClose, onSuccess }: SendStatusDialogProps) => {
  const [status, setStatus] = useState<CertificateStatusValue | null>(null);
  const [certificateErrors, setCertificateErrors] = useState<string[]>(['']);
  const [locationErrors, setLocationErrors] = useState<LocationErrorRow[]>([{ bpn: '', message: '' }]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setStatus(null);
      setCertificateErrors(['']);
      setLocationErrors([{ bpn: '', message: '' }]);
      setSubmitError(null);
    }
  }, [open]);

  const locationOptions = request?.locationBpns ?? [];

  // ── certificate error rows ──
  const updateCertError = (idx: number, value: string) =>
    setCertificateErrors((prev) => prev.map((m, i) => (i === idx ? value : m)));
  const addCertError = () => setCertificateErrors((prev) => [...prev, '']);
  const removeCertError = (idx: number) =>
    setCertificateErrors((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== idx)));

  // ── location error rows ──
  const updateLocError = (idx: number, patch: Partial<LocationErrorRow>) =>
    setLocationErrors((prev) => prev.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  const addLocError = () => setLocationErrors((prev) => [...prev, { bpn: '', message: '' }]);
  const removeLocError = (idx: number) =>
    setLocationErrors((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== idx)));

  const isRejected = status === 'REJECTED';

  const cleanedCertErrors = useMemo(
    () => certificateErrors.map((m) => m.trim()).filter(Boolean),
    [certificateErrors],
  );
  const cleanedLocErrors = useMemo(
    () => locationErrors.filter((r) => r.bpn.trim() && r.message.trim()),
    [locationErrors],
  );

  const canSubmit = useMemo(() => {
    if (!status || submitting) return false;
    if (isRejected) {
      // Validation: REJECTED requires at least one certificate error AND one location error.
      return cleanedCertErrors.length > 0 && cleanedLocErrors.length > 0;
    }
    return true;
  }, [status, submitting, isRejected, cleanedCertErrors, cleanedLocErrors]);

  const handleSubmit = async () => {
    if (!canSubmit || !request || !status || !request.documentId) return;
    setSubmitting(true);
    setSubmitError(null);

    // Group location error rows by BPN into the backend's LocationErrorDetail shape.
    let groupedLocationErrors: LocationErrorDetail[] | undefined;
    if (isRejected) {
      const byBpn = new Map<string, string[]>();
      cleanedLocErrors.forEach(({ bpn, message }) => {
        const list = byBpn.get(bpn) ?? [];
        list.push(message.trim());
        byBpn.set(bpn, list);
      });
      groupedLocationErrors = Array.from(byBpn.entries()).map(([bpn, messages]) => ({
        bpn,
        locationErrors: messages.map((message) => ({ message })),
      }));
    }

    try {
      const result = await sendStatus({
        senderBpn: getParticipantId(),
        providerBpn: request.providerBpn,
        documentId: request.documentId,
        certificateStatus: status,
        relatedMessageId: request.notificationId ?? undefined,
        locationBpns: request.locationBpns ?? undefined,
        certificateErrors: isRejected ? cleanedCertErrors.map((message) => ({ message })) : undefined,
        locationErrors: groupedLocationErrors,
        governance: CCM_POLICY_GOVERNANCE,
      });
      if (!result.success) {
        setSubmitError(result.error ?? 'Failed to send the status feedback.');
        return;
      }
      onSuccess(status);
    } catch {
      setSubmitError('Failed to send the status feedback.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Certificate Feedback</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Notify the provider about the outcome of your evaluation for document{' '}
            <Box component="span" sx={{ fontFamily: 'monospace' }}>
              {request?.documentId ?? '—'}
            </Box>
            .
          </Typography>

          <ToggleButtonGroup
            value={status}
            exclusive
            onChange={(_, value) => value && setStatus(value as CertificateStatusValue)}
            fullWidth
          >
            <ToggleButton value="RECEIVED" color="primary">
              Received
            </ToggleButton>
            <ToggleButton value="ACCEPTED" color="success">
              Accepted
            </ToggleButton>
            <ToggleButton value="REJECTED" color="error">
              Rejected
            </ToggleButton>
          </ToggleButtonGroup>

          {isRejected && (
            <>
              <Divider />

              {/* Certificate-level errors */}
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="subtitle2">Certificate errors *</Typography>
                  <Button size="small" startIcon={<AddIcon />} onClick={addCertError}>
                    Add error
                  </Button>
                </Box>
                <Stack spacing={1}>
                  {certificateErrors.map((message, idx) => (
                    <Box key={idx} sx={{ display: 'flex', gap: 1 }}>
                      <TextField
                        value={message}
                        onChange={(e) => updateCertError(idx, e.target.value)}
                        placeholder="e.g. Certificate expired"
                        size="small"
                        fullWidth
                      />
                      <IconButton
                        onClick={() => removeCertError(idx)}
                        disabled={certificateErrors.length === 1}
                        aria-label="remove certificate error"
                      >
                        <DeleteOutlineIcon />
                      </IconButton>
                    </Box>
                  ))}
                </Stack>
              </Box>

              {/* Per-location errors */}
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="subtitle2">Location errors *</Typography>
                  <Button size="small" startIcon={<AddIcon />} onClick={addLocError}>
                    Add error
                  </Button>
                </Box>
                <Stack spacing={1}>
                  {locationErrors.map((row, idx) => (
                    <Box key={idx} sx={{ display: 'flex', gap: 1 }}>
                      <TextField
                        label="BPN"
                        value={row.bpn}
                        onChange={(e) => updateLocError(idx, { bpn: e.target.value.toUpperCase() })}
                        select={locationOptions.length > 0}
                        size="small"
                        sx={{ minWidth: 180 }}
                      >
                        {locationOptions.map((bpn) => (
                          <MenuItem key={bpn} value={bpn}>
                            {bpn}
                          </MenuItem>
                        ))}
                      </TextField>
                      <TextField
                        label="Error message"
                        value={row.message}
                        onChange={(e) => updateLocError(idx, { message: e.target.value })}
                        size="small"
                        fullWidth
                      />
                      <IconButton
                        onClick={() => removeLocError(idx)}
                        disabled={locationErrors.length === 1}
                        aria-label="remove location error"
                      >
                        <DeleteOutlineIcon />
                      </IconButton>
                    </Box>
                  ))}
                </Stack>
              </Box>

              <Alert severity="info">
                A rejection requires at least one certificate error and one location error.
              </Alert>
            </>
          )}

          {submitError && <Alert severity="error">{submitError}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color={isRejected ? 'error' : 'primary'}
          onClick={handleSubmit}
          disabled={!canSubmit}
          startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          Send Feedback
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SendStatusDialog;
