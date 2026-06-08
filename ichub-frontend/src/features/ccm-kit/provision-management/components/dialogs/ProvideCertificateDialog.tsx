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

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  MenuItem,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import FileUploadOutlinedIcon from '@mui/icons-material/FileUploadOutlined';
import { CcmDialog } from '@/features/ccm-kit/shared-components';

import { getParticipantId } from '@/services/EnvironmentService';
import { fetchAllCertificates, createCertificate } from '../../../certificate-management/api';
import { UploadCertificateDialog } from '../../../certificate-management/components/dialogs/UploadCertificateDialog';

import {
  fetchInboundRequestsHistory,
  fetchPublished,
  publishCertificate,
  sendAvailable,
  pushCertificate,
} from '../../api';
import { CCM_POLICY_GOVERNANCE, ccmSharedConfig } from '../../config';
import { InboundRequestItem } from '../../types/types';

interface ProvideCertificateDialogProps {
  open: boolean;
  request: InboundRequestItem | null;
  onClose: () => void;
  onSuccess: (mode: ProvideMode) => void;
}

type ProvideMode = 'AVAILABLE' | 'PUSH';

interface OwnCertificate {
  certificateId: string;
  certificateName?: string;
  certificateType: string;
  bpnl: string;
  validUntil?: string;
}

const typeLabel = (value: string) =>
  ccmSharedConfig.certificateTypes.find((t) => t.value === value)?.label ?? value;

const ProvideCertificateDialog = ({ open, request, onClose, onSuccess }: ProvideCertificateDialogProps) => {
  const { t } = useTranslation('certificateManagement');
  const [mode, setMode] = useState<ProvideMode>('AVAILABLE');
  const [certificates, setCertificates] = useState<OwnCertificate[]>([]);
  const [certificateId, setCertificateId] = useState<string>('');
  const [published, setPublished] = useState<Set<number>>(new Set());
  const [history, setHistory] = useState<InboundRequestItem[]>([]);
  const [relatedMessageId, setRelatedMessageId] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  const loadData = useCallback(async () => {
    if (!request) return;
    setLoading(true);
    setError(null);
    try {
      const [certs, publishedList, hist] = await Promise.all([
        fetchAllCertificates({
          bpnl: request.certifiedBpn,
          certificateType: request.certificateType,
          offset: 0,
          limit: 200,
        }),
        fetchPublished(),
        fetchInboundRequestsHistory({
          consumerBpn: request.consumerBpn,
          certifiedBpn: request.certifiedBpn,
          certificateType: request.certificateType,
        }),
      ]);

      setCertificates(certs as OwnCertificate[]);
      setPublished(new Set(publishedList.map((p) => p.certificateId)));
      setHistory(hist);

      // Preselect the already-matched certificate when present.
      const preselect = request.certificateId != null ? String(request.certificateId) : '';
      setCertificateId(preselect || (certs[0]?.certificateId ?? ''));

      // relatedMessageId resolution: auto when a single history record exists.
      if (hist.length === 1) {
        setRelatedMessageId(hist[0].notificationId ?? '');
      } else {
        setRelatedMessageId('');
      }
    } catch {
      setError(t('provideDialog.errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    if (open) {
      setMode('AVAILABLE');
      void loadData();
    }
  }, [open, loadData]);

  const needsExplicitRelated = history.length >= 2;

  const canSubmit = useMemo(() => {
    if (!certificateId || certificateId === '__upload__' || submitting) return false;
    // With ≥2 history records the user must pick which request to respond to.
    if (needsExplicitRelated && !relatedMessageId) return false;
    return true;
  }, [certificateId, submitting, needsExplicitRelated, relatedMessageId]);

  const handleSubmit = async () => {
    if (!canSubmit || !request) return;
    const certId = Number(certificateId);
    if (!Number.isFinite(certId)) {
      setError(t('provideDialog.invalidCert'));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        senderBpn: getParticipantId(),
        certificateId: certId,
        consumerBpn: request.consumerBpn,
        governance: CCM_POLICY_GOVERNANCE,
        relatedMessageId: relatedMessageId || undefined,
      };

      if (mode === 'AVAILABLE') {
        // Ensure the certificate is published before announcing availability.
        if (!published.has(certId)) {
          await publishCertificate(certId);
        }
        const result = await sendAvailable(payload);
        if (!result.success) {
          setError(result.error ?? t('provideDialog.errors.sendAvailFailed'));
          return;
        }
      } else {
        const result = await pushCertificate(payload);
        if (!result.success) {
          setError(result.error ?? t('provideDialog.errors.pushFailed'));
          return;
        }
      }
      onSuccess(mode);
    } catch {
      setError(mode === 'AVAILABLE' ? t('provideDialog.errors.availFailed') : t('provideDialog.errors.pushFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <CcmDialog
      open={open}
      onClose={onClose}
      title={t('provideDialog.title')}
      subtitle={t('provideDialog.subtitle')}
      icon={<TaskAltIcon />}
      fullWidth
      actions={
        <>
          <Button onClick={onClose} variant="outlined" disabled={submitting} sx={{ textTransform: 'none' }}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={!canSubmit}
            startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : undefined}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            {mode === 'AVAILABLE' ? t('provideDialog.sendAvailability') : t('pushDialog.pushCertificate')}
          </Button>
        </>
      }
    >
      <Box sx={{ p: 3 }}>
        {loading ? (
          <Box sx={{ py: 5, textAlign: 'center' }}>
            <CircularProgress size={28} />
          </Box>
        ) : (
          <Stack spacing={2.5}>
            {request && (
              <Typography variant="body2" color="text.secondary">
                {t('provideDialog.description', { consumer: request.consumerBpn, type: typeLabel(request.certificateType) })}{' '}
                <Box component="span" sx={{ fontFamily: 'monospace' }}>
                  {request.certifiedBpn}
                </Box>
                .
              </Typography>
            )}

            <ToggleButtonGroup
              value={mode}
              exclusive
              onChange={(_, value) => value && setMode(value as ProvideMode)}
              fullWidth
            >
              <ToggleButton value="AVAILABLE">{t('provideDialog.modeAvailable')}</ToggleButton>
              <ToggleButton value="PUSH">{t('provideDialog.modePush')}</ToggleButton>
            </ToggleButtonGroup>

            {/* Certificate picker — empty state or dropdown */}
            {certificates.length === 0 ? (
              <Paper
                variant="outlined"
                sx={{ p: 2.5, borderColor: 'warning.light', backgroundColor: 'rgba(255,152,0,0.04)', borderRadius: 2 }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, color: 'warning.dark' }}>
                  <WarningAmberIcon fontSize="small" />
                  <Typography variant="subtitle2" fontWeight={700}>
                    {t('provideDialog.noCertsTitle')}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {t('provideDialog.noCertsDescription', { type: typeLabel(request?.certificateType ?? '') })}{' '}
                  <Box component="span" sx={{ fontFamily: 'monospace', fontSize: '0.85em' }}>
                    {request?.certifiedBpn}
                  </Box>
                  .
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<FileUploadOutlinedIcon fontSize="small" />}
                  onClick={() => setUploadOpen(true)}
                  sx={{ textTransform: 'none' }}
                >
                  {t('provideDialog.noCertsUpload')}
                </Button>
              </Paper>
            ) : (
              <TextField
                label={t('provideDialog.certSelect')}
                value={certificateId}
                onChange={(e) => {
                  if (e.target.value === '__upload__') {
                    setUploadOpen(true);
                  } else {
                    setCertificateId(e.target.value);
                  }
                }}
                select
                fullWidth
                required
              >
                {certificates.map((c) => (
                  <MenuItem key={c.certificateId} value={c.certificateId}>
                    {c.certificateName || typeLabel(c.certificateType)}
                    {c.validUntil ? ` · until ${new Date(c.validUntil).toLocaleDateString('en-US')}` : ''}
                  </MenuItem>
                ))}
                <Divider />
                <MenuItem value="__upload__" sx={{ color: 'primary.main', fontStyle: 'italic' }}>
                  <FileUploadOutlinedIcon fontSize="small" sx={{ mr: 1 }} />
                  {t('provideDialog.uploadOther')}
                </MenuItem>
              </TextField>
            )}

            {mode === 'AVAILABLE' && certificateId && !published.has(Number(certificateId)) && (
              <Alert severity="info">
                {t('provideDialog.notPublishedAlert')}
              </Alert>
            )}

            {/* relatedMessageId resolution */}
            {needsExplicitRelated ? (
              <TextField
                label={t('provideDialog.respondTo')}
                value={relatedMessageId}
                onChange={(e) => setRelatedMessageId(e.target.value)}
                select
                fullWidth
                required
                helperText={t('provideDialog.respondToHelper')}
              >
                {history.map((h) => (
                  <MenuItem key={h.requestId} value={h.notificationId ?? ''} disabled={!h.notificationId}>
                    {(h.notificationId ?? 'no notification id')} · {h.status} ·{' '}
                    {new Date(h.receivedAt).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}
                  </MenuItem>
                ))}
              </TextField>
            ) : (
              relatedMessageId && (
                <Typography variant="caption" color="text.secondary">
                  {t('provideDialog.respondingTo')}{' '}
                  <Box component="span" sx={{ fontFamily: 'monospace' }}>
                    {relatedMessageId}
                  </Box>
                </Typography>
              )
            )}

            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        )}
      </Box>

      {/* Upload Certificate dialog — pre-filled with known request fields */}
      <UploadCertificateDialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onSave={async (formData) => {
          await createCertificate(formData);
          setUploadOpen(false);
          await loadData();
        }}
        certificateData={
          request
            ? {
                type: request.certificateType,
                bpn: request?.certifiedBpn ?? '',
                name: '',
                issuer: request?.certifiedBpn ?? '',
                validFrom: '',
                validUntil: '',
                certificateScope: 'BPNL',
                enclosedSitesBpn: [],
              }
            : undefined
        }
      />
    </CcmDialog>
  );
};

export default ProvideCertificateDialog;
export type { ProvideMode };
