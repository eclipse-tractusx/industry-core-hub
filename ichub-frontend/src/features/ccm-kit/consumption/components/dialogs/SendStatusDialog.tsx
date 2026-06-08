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
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import RateReviewIcon from '@mui/icons-material/RateReview';
import { CcmDialog } from '@/features/ccm-kit/shared-components';

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
  const { t } = useTranslation('certificateManagement');
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
        setSubmitError(result.error ?? t('feedbackDialog.submitError'));
        return;
      }
      onSuccess(status);
    } catch {
      setSubmitError(t('feedbackDialog.submitError'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <CcmDialog
      open={open}
      onClose={onClose}
      title={t('feedbackDialog.title')}
      subtitle={t('feedbackDialog.subtitle')}
      icon={<RateReviewIcon />}
      maxWidth="md"
      fullWidth
      actions={
        <>
          <Button onClick={onClose} variant="outlined" disabled={submitting} sx={{ textTransform: 'none' }}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="contained"
            color={isRejected ? 'error' : 'primary'}
            onClick={handleSubmit}
            disabled={!canSubmit}
            startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : undefined}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            {t('feedbackDialog.sendFeedback')}
          </Button>
        </>
      }
    >
      <Box sx={{ p: 3 }}>
        <Stack spacing={2.5}>
          <Typography variant="body2" color="text.secondary">
            {t('feedbackDialog.description')}{' '}
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
              {t('feedbackDialog.statusReceived')}
            </ToggleButton>
            <ToggleButton value="ACCEPTED" color="success">
              {t('feedbackDialog.statusAccepted')}
            </ToggleButton>
            <ToggleButton value="REJECTED" color="error">
              {t('feedbackDialog.statusRejected')}
            </ToggleButton>
          </ToggleButtonGroup>

          {isRejected && (
            <>
              <Divider />

              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3, alignItems: 'start' }}>
                {/* Certificate-level errors */}
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{t('feedbackDialog.certErrors.title')}</Typography>
                      <Typography variant="caption" color="text.secondary">{t('feedbackDialog.certErrors.helper')}</Typography>
                    </Box>
                    <Button size="small" startIcon={<AddIcon />} onClick={addCertError} sx={{ textTransform: 'none', flexShrink: 0 }}>
                      {t('common.add')}
                    </Button>
                  </Box>
                  <Stack spacing={1}>
                    {certificateErrors.map((message, idx) => (
                      <Paper key={idx} variant="outlined" sx={{ p: 1.5, display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                        <TextField
                          value={message}
                          onChange={(e) => updateCertError(idx, e.target.value)}
                          placeholder={t('feedbackDialog.certErrors.placeholder')}
                          size="small"
                          fullWidth
                          multiline
                          maxRows={3}
                        />
                        <IconButton
                          size="small"
                          onClick={() => removeCertError(idx)}
                          disabled={certificateErrors.length === 1}
                          aria-label="remove certificate error"
                          sx={{ mt: 0.25 }}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Paper>
                    ))}
                  </Stack>
                </Box>

                {/* Per-location errors */}
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{t('feedbackDialog.locErrors.title')}</Typography>
                      <Typography variant="caption" color="text.secondary">{t('feedbackDialog.locErrors.helper')}</Typography>
                    </Box>
                    <Button size="small" startIcon={<AddIcon />} onClick={addLocError} sx={{ textTransform: 'none', flexShrink: 0 }}>
                      {t('common.add')}
                    </Button>
                  </Box>
                  <Stack spacing={1}>
                    {locationErrors.map((row, idx) => (
                      <Paper key={idx} variant="outlined" sx={{ p: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <TextField
                            label={t('feedbackDialog.locErrors.siteBpn')}
                            value={row.bpn}
                            onChange={(e) => updateLocError(idx, { bpn: e.target.value.toUpperCase() })}
                            select={locationOptions.length > 0}
                            size="small"
                            fullWidth
                          >
                            {locationOptions.map((bpn) => (
                              <MenuItem key={bpn} value={bpn}>
                                {bpn}
                              </MenuItem>
                            ))}
                          </TextField>
                          <IconButton
                            size="small"
                            onClick={() => removeLocError(idx)}
                            disabled={locationErrors.length === 1}
                            aria-label="remove location error"
                          >
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </Box>
                        <TextField
                          label={t('feedbackDialog.locErrors.errorMessage')}
                          value={row.message}
                          onChange={(e) => updateLocError(idx, { message: e.target.value })}
                          size="small"
                          fullWidth
                          multiline
                          maxRows={3}
                        />
                      </Paper>
                    ))}
                  </Stack>
                </Box>
              </Box>

              <Alert severity="info">
                {t('feedbackDialog.rejectionAlert')}
              </Alert>
            </>
          )}

          {submitError && <Alert severity="error">{submitError}</Alert>}
        </Stack>
      </Box>
    </CcmDialog>
  );
};

export default SendStatusDialog;
