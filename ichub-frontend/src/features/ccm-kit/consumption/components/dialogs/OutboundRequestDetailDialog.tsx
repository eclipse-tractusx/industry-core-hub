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

import { useTranslation } from 'react-i18next';
import { Box, Button, Chip, CircularProgress, Divider, Typography } from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import DownloadIcon from '@mui/icons-material/Download';
import VisibilityIcon from '@mui/icons-material/Visibility';
import RateReviewIcon from '@mui/icons-material/RateReview';
import AssignmentIcon from '@mui/icons-material/Assignment';
import { CcmDialog } from '@/features/ccm-kit/shared-components';

import { ccmSharedConfig } from '../../config';
import { OutboundRequestItem, OutboundRequestStatus, ReceivedLocalStatus } from '../../types/types';

interface OutboundRequestDetailDialogProps {
  open: boolean;
  request: OutboundRequestItem | null;
  onClose: () => void;
  alreadyReceived?: boolean;
  localStatus?: ReceivedLocalStatus;
  pullBusy?: boolean;
  onPullOrView: (req: OutboundRequestItem) => void;
  onHistory: (req: OutboundRequestItem) => void;
  onFeedback: (req: OutboundRequestItem) => void;
}

const typeLabel = (value: string) =>
  ccmSharedConfig.certificateTypes.find((t) => t.value === value)?.label ?? value;

const formatDate = (d?: string | null) =>
  d ? new Date(d).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '—';

const statusChipSx = (status: OutboundRequestStatus) => {
  switch (status) {
    case 'Found':
      return { backgroundColor: 'rgba(76,175,80,0.12)', color: '#2e7d32', border: '1px solid rgba(76,175,80,0.35)' };
    case 'Pending':
      return { backgroundColor: 'rgba(157,111,212,0.12)', color: '#6a1b9a', border: '1px solid rgba(157,111,212,0.35)' };
    case 'Failed':
      return { backgroundColor: 'rgba(244,67,54,0.12)', color: '#c62828', border: '1px solid rgba(244,67,54,0.35)' };
    default:
      return { backgroundColor: 'rgba(0,0,0,0.06)', color: 'text.secondary' };
  }
};

const InfoField = ({ label, value, mono = false }: { label: string; value?: string | null; mono?: boolean }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
    <Typography
      variant="caption"
      sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.65rem', fontWeight: 600 }}
    >
      {label}
    </Typography>
    <Typography variant="body2" sx={{ fontFamily: mono ? 'monospace' : undefined, wordBreak: 'break-all' }}>
      {value || '—'}
    </Typography>
  </Box>
);

const OutboundRequestDetailDialog = ({
  open,
  request,
  onClose,
  alreadyReceived,
  localStatus,
  pullBusy,
  onPullOrView,
  onHistory,
  onFeedback,
}: OutboundRequestDetailDialogProps) => {
  const { t } = useTranslation('certificateManagement');
  if (!request) return null;

  const isFound = request.status === 'Found' && !!request.documentId;
  const feedbackAllowed = isFound && localStatus !== 'Accepted' && localStatus !== 'Rejected';

  const handlePullOrView = () => {
    onClose();
    onPullOrView(request);
  };

  const handleHistory = () => {
    onClose();
    onHistory(request);
  };

  const handleFeedback = () => {
    onClose();
    onFeedback(request);
  };

  return (
    <CcmDialog
      open={open}
      onClose={onClose}
      title={t('requestDetailDialog.title')}
      subtitle={`${typeLabel(request.certificateType)} · #${request.id}`}
      icon={<AssignmentIcon />}
      maxWidth="md"
      fullWidth
      actions={
        <Box sx={{ display: 'flex', gap: 1, width: '100%', justifyContent: 'space-evenly', alignItems: 'center' }}>
          <Button
            variant="outlined"
            color="primary"
            size="small"
            startIcon={<HistoryIcon fontSize="small" />}
            onClick={handleHistory}
            sx={{ textTransform: 'none', flex: 1 }}
          >
            {t('requestDetailDialog.history')}
          </Button>
          <Button
            variant="outlined"
            color="primary"
            size="small"
            startIcon={<RateReviewIcon fontSize="small" />}
            disabled={!feedbackAllowed}
            onClick={handleFeedback}
            sx={{ textTransform: 'none', flex: 1 }}
          >
            {t('requestDetailDialog.sendFeedback')}
          </Button>
          <Button
            variant="outlined"
            color="primary"
            size="small"
            startIcon={
              pullBusy
                ? <CircularProgress size={14} color="inherit" />
                : alreadyReceived
                  ? <VisibilityIcon fontSize="small" />
                  : <DownloadIcon fontSize="small" />
            }
            disabled={!isFound || pullBusy}
            onClick={handlePullOrView}
            sx={{ textTransform: 'none', fontWeight: 600, flex: 1 }}
          >
            {alreadyReceived ? t('requestDetailDialog.viewCertificate') : t('requestDetailDialog.pullCertificate')}
          </Button>
        </Box>
      }
    >
      <Box sx={{ p: 3 }}>
        {/* Status */}
        <Box sx={{ mb: 3 }}>
          <Chip
            label={request.status}
            size="small"
            sx={{ fontWeight: 600, ...statusChipSx(request.status) }}
          />
        </Box>

        {/* Main info grid */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2.5, mb: 3 }}>
          <InfoField label={t('requestDetailDialog.providerBpn')} value={request.providerBpn} mono />
          <InfoField label={t('requestDetailDialog.certifiedBpn')} value={request.certifiedBpn} mono />
          <InfoField label={t('requestDetailDialog.certType')} value={typeLabel(request.certificateType)} />
          <InfoField label={t('requestDetailDialog.documentId')} value={request.documentId} mono />
          <InfoField label={t('requestDetailDialog.requested')} value={formatDate(request.requestedAt)} />
          <InfoField label={t('requestDetailDialog.updated')} value={formatDate(request.updatedAt)} />
          {localStatus && <InfoField label={t('requestDetailDialog.localStatus')} value={localStatus} />}
        </Box>

        {/* Location BPNs */}
        {request.locationBpns && request.locationBpns.length > 0 && (
          <>
            <Divider sx={{ mb: 2.5 }} />
            <Box>
              <Typography
                variant="caption"
                sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.65rem', fontWeight: 600, display: 'block', mb: 1 }}
              >
                {t('requestDetailDialog.requestedSites', { count: request.locationBpns.length })}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {request.locationBpns.map((bpn) => (
                  <Chip key={bpn} label={bpn} size="small" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }} />
                ))}
              </Box>
            </Box>
          </>
        )}

        {/* Notification ID */}
        {request.notificationId && (
          <>
            <Divider sx={{ my: 2.5 }} />
            <InfoField label={t('requestDetailDialog.notificationId')} value={request.notificationId} mono />
          </>
        )}
      </Box>
    </CcmDialog>
  );
};

export default OutboundRequestDetailDialog;
