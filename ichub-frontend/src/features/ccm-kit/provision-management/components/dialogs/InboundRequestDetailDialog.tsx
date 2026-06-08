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

import { useTranslation } from 'react-i18next';
import { Box, Button, Chip, Divider, Typography } from '@mui/material';
import InboxIcon from '@mui/icons-material/Inbox';
import { CcmDialog } from '@/features/ccm-kit/shared-components';

import { ccmSharedConfig } from '../../config';
import { InboundRequestItem, InboundRequestStatus } from '../../types/types';

interface InboundRequestDetailDialogProps {
  open: boolean;
  request: InboundRequestItem | null;
  onClose: () => void;
  onProvide: (request: InboundRequestItem) => void;
}

const typeLabel = (value: string) =>
  ccmSharedConfig.certificateTypes.find((t) => t.value === value)?.label ?? value;

const statusChipSx = (status: InboundRequestStatus) => {
  switch (status) {
    case 'Available':
    case 'Pushed':
      return { backgroundColor: 'rgba(76,175,80,0.12)', color: '#2e7d32', border: '1px solid rgba(76,175,80,0.35)' };
    case 'Registered':
      return { backgroundColor: 'rgba(157,111,212,0.12)', color: '#6a1b9a', border: '1px solid rgba(157,111,212,0.35)' };
    default:
      return {};
  }
};

const formatDate = (d?: string | null) =>
  d ? new Date(d).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '—';

const parseLocationBpns = (raw?: string | null): string[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
};

const InfoField = ({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) => (
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

const InboundRequestDetailDialog = ({
  open,
  request,
  onClose,
  onProvide,
}: InboundRequestDetailDialogProps) => {
  const { t } = useTranslation('certificateManagement');
  if (!request) return null;

  const locationBpns = parseLocationBpns(request.locationBpns);
  const canProvide = request.status !== 'Pushed';

  return (
    <CcmDialog
      open={open}
      onClose={onClose}
      title={t('inboundDetailDialog.title')}
      subtitle={`#${request.requestId} · ${typeLabel(request.certificateType)}`}
      icon={<InboxIcon />}
      maxWidth="md"
      fullWidth
      actions={
        <>
          <Button onClick={onClose} variant="outlined" sx={{ textTransform: 'none' }}>
            {t('common.close')}
          </Button>
          {canProvide && (
            <Button
              variant="contained"
              onClick={() => {
                onClose();
                onProvide(request);
              }}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              {t('inboundDetailDialog.provideCertificate')}
            </Button>
          )}
        </>
      }
    >
      <Box sx={{ p: 3 }}>
        {/* Status row */}
        <Box sx={{ display: 'flex', gap: 1.5, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
          <Chip label={request.status} size="small" sx={{ fontWeight: 600, ...statusChipSx(request.status) }} />
          {request.consumerStatus && (
            <Chip
              label={`${t('inboundDetailDialog.consumerPrefix')}${request.consumerStatus}`}
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.72rem' }}
            />
          )}
        </Box>

        {/* Main info grid */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2.5, mb: 3 }}>
          <InfoField label={t('inboundDetailDialog.consumerBpn')} value={request.consumerBpn} mono />
          <InfoField label={t('inboundDetailDialog.certifiedBpn')} value={request.certifiedBpn} mono />
          <InfoField label={t('inboundDetailDialog.certType')} value={typeLabel(request.certificateType)} />
          <InfoField label={t('inboundDetailDialog.certificateId')} value={request.certificateId != null ? String(request.certificateId) : '—'} />
          <InfoField label={t('inboundDetailDialog.received')} value={formatDate(request.receivedAt)} />
          <InfoField label={t('inboundDetailDialog.updated')} value={formatDate(request.updatedAt)} />
        </Box>

        {request.notificationId && (
          <>
            <Divider sx={{ mb: 2.5 }} />
            <InfoField label={t('inboundDetailDialog.notificationId')} value={request.notificationId} mono />
          </>
        )}

        {locationBpns.length > 0 && (
          <>
            <Divider sx={{ my: 2.5 }} />
            <Box>
              <Typography
                variant="caption"
                sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.65rem', fontWeight: 600, display: 'block', mb: 1 }}
              >
                {t('inboundDetailDialog.requestedSites', { count: locationBpns.length })}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {locationBpns.map((bpn) => (
                  <Chip key={bpn} label={bpn} size="small" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }} />
                ))}
              </Box>
            </Box>
          </>
        )}
      </Box>
    </CcmDialog>
  );
};

export default InboundRequestDetailDialog;
