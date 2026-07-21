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

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Chip,
  Divider,
  Grid2,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Tooltip,
  IconButton,
  Alert,
  Snackbar,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import BlockIcon from '@mui/icons-material/Block';
import ShareIcon from '@mui/icons-material/Share';
import RefreshIcon from '@mui/icons-material/Refresh';
import { Certificate, SharingRecord } from '../../types/types';
import { certificateManagementConfig } from '../../config';
import { revokeShare } from '../../api';

interface CertificateDetailDialogProps {
  open: boolean;
  onClose: () => void;
  certificate: Certificate | null;
  onShare: (certificate: Certificate) => void;
  onUpdate: (certificate: Certificate) => void;
  onRefresh: () => void;
}

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

const getStatusColor = (status: string) => {
  const config = certificateManagementConfig.statusConfig[status as keyof typeof certificateManagementConfig.statusConfig];
  return config?.color || '#888';
};

const getCertTypeLabel = (type: string) =>
  certificateManagementConfig.certificateTypes.find((t) => t.value === type)?.label ?? type;

const ShareStatusChip = ({ status }: { status: SharingRecord['status'] }) => {
  const map: Record<SharingRecord['status'], { color: 'success' | 'warning' | 'default' }> = {
    Active: { color: 'success' },
    Pending: { color: 'warning' },
    Revoked: { color: 'default' },
  };
  return <Chip label={status} color={map[status].color} size="small" />;
};

export const CertificateDetailDialog = ({
  open,
  onClose,
  certificate,
  onShare,
  onUpdate,
  onRefresh,
}: CertificateDetailDialogProps) => {
  const { t } = useTranslation('certificateManagement');
  const [revokingIds, setRevokingIds] = useState<Set<string>>(new Set());
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  if (!certificate) return null;

  const statusColor = getStatusColor(certificate.status);

  const handleRevoke = async (record: SharingRecord) => {
    setRevokingIds((prev) => new Set(prev).add(record.id));
    try {
      await revokeShare(certificate.id, record.id);
      setSnackbar({ open: true, message: t('detailDialog.revokeSuccess', { partner: record.partnerName ?? record.partnerBpn }), severity: 'success' });
      onRefresh();
    } catch {
      setSnackbar({ open: true, message: t('detailDialog.revokeFailed'), severity: 'error' });
    } finally {
      setRevokingIds((prev) => {
        const next = new Set(prev);
        next.delete(record.id);
        return next;
      });
    }
  };

  const sharingRecords = certificate.sharingRecords ?? [];

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <DialogTitle sx={{ pb: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
              <Typography variant="h6" noWrap>
                {certificate.name}
              </Typography>
              <Chip
                label={certificate.status}
                size="small"
                sx={{
                  backgroundColor: `${statusColor}22`,
                  color: statusColor,
                  fontWeight: 600,
                  textTransform: 'capitalize',
                  flexShrink: 0,
                }}
              />
            </Box>
            <IconButton size="small" onClick={onClose}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent dividers sx={{ p: 3 }}>
          {/* ── Section: Certificate Information ───────────────────────── */}
          <Typography
            variant="caption"
            sx={{ textTransform: 'uppercase', letterSpacing: '0.08em', color: 'text.secondary', fontWeight: 600 }}
          >
            {t('detailDialog.certInfo')}
          </Typography>

          <Grid2 container spacing={2} sx={{ mt: 1, mb: 3 }}>
            <Grid2 size={{ xs: 12, sm: 6 }}>
              <InfoRow label={t('detailDialog.type')} value={getCertTypeLabel(certificate.type)} />
            </Grid2>
            <Grid2 size={{ xs: 12, sm: 6 }}>
              <InfoRow label={t('detailDialog.issuer')} value={certificate.issuer} />
            </Grid2>
            <Grid2 size={{ xs: 12, sm: 6 }}>
              <InfoRow label={t('detailDialog.validFrom')} value={formatDate(certificate.validFrom)} />
            </Grid2>
            <Grid2 size={{ xs: 12, sm: 6 }}>
              <InfoRow
                label={t('detailDialog.validUntil')}
                value={formatDate(certificate.validUntil)}
                valueColor={certificate.status === 'expired' ? '#f44336' : certificate.status === 'expiring' ? '#ed8936' : undefined}
              />
            </Grid2>
            <Grid2 size={{ xs: 12, sm: 6 }}>
              <InfoRow label={t('detailDialog.businessPartner')} value={certificate.bpn} mono />
            </Grid2>
            <Grid2 size={{ xs: 12, sm: 6 }}>
              <InfoRow
                label={t('detailDialog.certificateId')}
                value={certificate.certificateIdentifier ?? '—'}
                mono={!!certificate.certificateIdentifier}
              />
            </Grid2>
            <Grid2 size={{ xs: 12, sm: 6 }}>
              <InfoRow label={t('detailDialog.scope')} value={certificate.enclosedSitesBpn?.length ? t('detailDialog.scopeSite') : t('detailDialog.scopeEntity')} />
            </Grid2>
            {certificate.enclosedSitesBpn && certificate.enclosedSitesBpn.length > 0 && (
              <Grid2 size={12}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                  {t('detailDialog.enclosedSites')}
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                  {certificate.enclosedSitesBpn.map((bpns) => (
                    <Chip key={bpns} label={bpns} size="small" variant="outlined" sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }} />
                  ))}
                </Box>
              </Grid2>
            )}
            {certificate.description && (
              <Grid2 size={12}>
                <InfoRow label={t('detailDialog.description')} value={certificate.description} />
              </Grid2>
            )}
          </Grid2>

          <Divider sx={{ mb: 3 }} />

          {/* ── Section: Sharing History ────────────────────────────────── */}
          <Typography
            variant="caption"
            sx={{ textTransform: 'uppercase', letterSpacing: '0.08em', color: 'text.secondary', fontWeight: 600, display: 'block', mb: 1.5 }}
          >
            {t('detailDialog.sharingHistory', { count: sharingRecords.length })}
          </Typography>

          {sharingRecords.length === 0 ? (
            <Box
              sx={{
                py: 3,
                px: 2,
                borderRadius: '8px',
                backgroundColor: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                textAlign: 'center',
              }}
            >
              <Typography variant="body2" color="text.secondary">
                {t('detailDialog.noSharingRecords')}
              </Typography>
            </Box>
          ) : (
            <TableContainer sx={{ borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t('detailDialog.columns.partner')}</TableCell>
                    <TableCell>{t('detailDialog.columns.method')}</TableCell>
                    <TableCell>{t('detailDialog.columns.sharedOn')}</TableCell>
                    <TableCell>{t('detailDialog.columns.edcContract')}</TableCell>
                    <TableCell>{t('detailDialog.columns.status')}</TableCell>
                    <TableCell>{t('detailDialog.columns.action')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sharingRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <Typography variant="body2">{record.partnerName ?? '—'}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                          {record.partnerBpn}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={record.method}
                          size="small"
                          variant="outlined"
                          color={record.method === 'PUSH' ? 'secondary' : 'primary'}
                        />
                      </TableCell>
                      <TableCell>{formatDate(record.sharedDate)}</TableCell>
                      <TableCell>
                        <Tooltip title={record.edcContractId}>
                          <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                            {record.edcContractId.slice(0, 16)}…
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <ShareStatusChip status={record.status} />
                      </TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          startIcon={
                            revokingIds.has(record.id) ? (
                              <CircularProgress size={12} />
                            ) : (
                              <BlockIcon fontSize="small" />
                            )
                          }
                          disabled={record.status !== 'Active' || revokingIds.has(record.id)}
                          onClick={() => handleRevoke(record)}
                          sx={{ textTransform: 'none' }}
                        >
                          {t('common.revoke')}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
          <Button onClick={onClose} sx={{ textTransform: 'none' }}>
            {t('common.close')}
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => {
              onClose();
              onUpdate(certificate);
            }}
            sx={{ textTransform: 'none' }}
          >
            {t('detailDialog.updatePdf')}
          </Button>
          <Button
            variant="contained"
            startIcon={<ShareIcon />}
            disabled={certificate.status === 'expired'}
            onClick={() => {
              onClose();
              onShare(certificate);
            }}
            sx={{ textTransform: 'none' }}
          >
            {t('detailDialog.shareCertificate')}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

// ── Helper ─────────────────────────────────────────────────────────────────

interface InfoRowProps {
  label: string;
  value: string;
  mono?: boolean;
  valueColor?: string;
}

const InfoRow = ({ label, value, mono, valueColor }: InfoRowProps) => (
  <Box>
    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>
      {label}
    </Typography>
    <Typography
      variant="body2"
      sx={{
        fontWeight: 500,
        fontFamily: mono ? 'monospace' : undefined,
        color: valueColor,
      }}
    >
      {value}
    </Typography>
  </Box>
);
