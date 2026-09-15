/********************************************************************************
 * Eclipse Tractus-X - Industry Core Hub Frontend
 *
 * Copyright (c) 2026 LKS Next
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

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import { CcmDialog } from '@/features/ccm-kit/shared-components';

import PartnerAutocomplete from '@/features/business-partner-kit/partner-management/components/general/PartnerAutocomplete';
import { fetchPartners } from '@/features/business-partner-kit/partner-management/api';
import { PartnerInstance } from '@/features/business-partner-kit/partner-management/types/types';
import { getParticipantId } from '@/services/EnvironmentService';

import { fetchAllCertificates } from '../../../certificate-management/api';
import { fetchPublished, publishCertificate, sendAvailable } from '../../api';
import { CCM_POLICY_GOVERNANCE, ccmSharedConfig } from '../../config';

interface SendAvailableDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface OwnCertificate {
  certificateId: string;
  certificateName?: string;
  certificateType: string;
  bpnl: string;
  validUntil?: string;
}

const BPN_PATTERN = ccmSharedConfig.validation.bpn.pattern;
const typeLabel = (value: string) =>
  ccmSharedConfig.certificateTypes.find((t) => t.value === value)?.label ?? value;

const SendAvailableDialog = ({ open, onClose, onSuccess }: SendAvailableDialogProps) => {
  const { t } = useTranslation('certificateManagement');
  const [certificateId, setCertificateId] = useState('');
  const [certificates, setCertificates] = useState<OwnCertificate[]>([]);
  const [published, setPublished] = useState<Set<number>>(new Set());
  const [consumerBpn, setConsumerBpn] = useState('');
  const [selectedPartner, setSelectedPartner] = useState<PartnerInstance | null>(null);
  const [partners, setPartners] = useState<PartnerInstance[]>([]);
  const [loading, setLoading] = useState(false);
  const [partnersError, setPartnersError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setPartnersError(false);
    try {
      const [certs, publishedList, p] = await Promise.all([
        fetchAllCertificates({ bpnl: getParticipantId(), certificateType: null, offset: 0, limit: 200 }),
        fetchPublished(),
        fetchPartners().catch(() => {
          setPartnersError(true);
          return [] as PartnerInstance[];
        }),
      ]);
      setCertificates(certs as OwnCertificate[]);
      setPublished(new Set(publishedList.map((p) => p.certificateId)));
      setPartners(p);
    } catch {
      setError(t('sendAvailableDialog.errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (open) {
      void loadData();
    } else {
      setCertificateId('');
      setConsumerBpn('');
      setSelectedPartner(null);
      setError(null);
    }
  }, [open, loadData]);

  const consumerValid = BPN_PATTERN.test(consumerBpn);
  const canSubmit = useMemo(
    () => !!certificateId && consumerValid && !submitting,
    [certificateId, consumerValid, submitting],
  );

  const isPublished = certificateId ? published.has(Number(certificateId)) : false;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const certId = Number(certificateId);

      // Auto-publish the certificate as an EDC asset if not yet published.
      if (!published.has(certId)) {
        await publishCertificate(certId);
      }

      const result = await sendAvailable({
        senderBpn: getParticipantId(),
        certificateId: certId,
        consumerBpn,
        governance: CCM_POLICY_GOVERNANCE,
        // Proactive / unsolicited notification: no relatedMessageId.
      });

      if (!result.success) {
        setError(result.error ?? t('sendAvailableDialog.errors.sendFailed'));
        return;
      }
      onSuccess();
    } catch {
      setError(t('sendAvailableDialog.errors.sendFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <CcmDialog
      open={open}
      onClose={onClose}
      title={t('sendAvailableDialog.title')}
      subtitle={t('sendAvailableDialog.subtitle')}
      icon={<NotificationsActiveIcon />}
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
            startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <NotificationsActiveIcon />}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            {t('sendAvailableDialog.sendAvailability')}
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
            <Typography variant="body2" color="text.secondary">
              {t('sendAvailableDialog.description')}
            </Typography>

            <TextField
              label={t('sendAvailableDialog.certSelect')}
              value={certificateId}
              onChange={(e) => setCertificateId(e.target.value)}
              select
              fullWidth
              required
              helperText={
                certificates.length === 0
                  ? t('sendAvailableDialog.noCerts')
                  : !isPublished && certificateId
                  ? t('sendAvailableDialog.willPublish')
                  : ' '
              }
            >
              {certificates.map((c) => (
                <MenuItem key={c.certificateId} value={c.certificateId}>
                  {c.certificateName || typeLabel(c.certificateType)}
                  {c.validUntil ? ` · until ${new Date(c.validUntil).toLocaleDateString('en-US')}` : ''}
                </MenuItem>
              ))}
            </TextField>

            <PartnerAutocomplete
              value={consumerBpn}
              availablePartners={partners}
              selectedPartner={selectedPartner}
              isLoadingPartners={loading}
              partnersError={partnersError}
              onBpnlChange={setConsumerBpn}
              onPartnerChange={setSelectedPartner}
              onRetryLoadPartners={loadData}
              label={t('sendAvailableDialog.recipientBpn')}
              placeholder={t('sendAvailableDialog.recipientPlaceholder')}
            />

            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        )}
      </Box>
    </CcmDialog>
  );
};

export default SendAvailableDialog;
