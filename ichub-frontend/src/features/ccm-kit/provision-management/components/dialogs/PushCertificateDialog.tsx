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

import { useCallback, useEffect, useMemo, useState } from 'react';
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
import SendIcon from '@mui/icons-material/Send';
import { CcmDialog } from '@/features/ccm-kit/shared-components';

import PartnerAutocomplete from '@/features/business-partner-kit/partner-management/components/general/PartnerAutocomplete';
import { fetchPartners } from '@/features/business-partner-kit/partner-management/api';
import { PartnerInstance } from '@/features/business-partner-kit/partner-management/types/types';
import { getParticipantId } from '@/services/EnvironmentService';

import { fetchAllCertificates } from '../../../certificate-management/api';
import { pushCertificate } from '../../api';
import { CCM_POLICY_GOVERNANCE, ccmSharedConfig } from '../../config';

interface PushCertificateDialogProps {
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

const PushCertificateDialog = ({ open, onClose, onSuccess }: PushCertificateDialogProps) => {
  const [certificateId, setCertificateId] = useState('');
  const [certificates, setCertificates] = useState<OwnCertificate[]>([]);
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
      const [certs, p] = await Promise.all([
        fetchAllCertificates({ bpnl: getParticipantId(), certificateType: null, offset: 0, limit: 200 }),
        fetchPartners().catch(() => {
          setPartnersError(true);
          return [] as PartnerInstance[];
        }),
      ]);
      setCertificates(certs as OwnCertificate[]);
      setPartners(p);
    } catch {
      setError('Failed to load certificates.');
    } finally {
      setLoading(false);
    }
  }, []);

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

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await pushCertificate({
        senderBpn: getParticipantId(),
        certificateId: Number(certificateId),
        consumerBpn,
        governance: CCM_POLICY_GOVERNANCE,
        // Proactive push: no related request, relatedMessageId omitted.
      });
      if (!result.success) {
        setError(result.error ?? 'Failed to push the certificate.');
        return;
      }
      onSuccess();
    } catch {
      setError('Failed to push the certificate.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <CcmDialog
      open={open}
      onClose={onClose}
      title="Push Certificate"
      subtitle="Send a certificate directly to a partner without a prior request"
      icon={<SendIcon />}
      maxWidth="sm"
      fullWidth
      actions={
        <>
          <Button onClick={onClose} variant="outlined" disabled={submitting} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={!canSubmit}
            startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Push Certificate
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
              Send one of your certificates directly to a partner, without a prior request.
            </Typography>

            <TextField
              label="Certificate to push"
              value={certificateId}
              onChange={(e) => setCertificateId(e.target.value)}
              select
              fullWidth
              required
              helperText={certificates.length === 0 ? 'No certificates available.' : ' '}
            >
              {certificates.map((c) => (
                <MenuItem key={c.certificateId} value={c.certificateId}>
                  {(c.certificateName || typeLabel(c.certificateType))}
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
              label="Recipient (Consumer BPN)"
              placeholder="Select or type the recipient's BPNL"
            />

            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        )}
      </Box>
    </CcmDialog>
  );
};

export default PushCertificateDialog;
