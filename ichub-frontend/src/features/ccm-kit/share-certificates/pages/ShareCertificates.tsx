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

import { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Chip,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  TablePagination,
  Tooltip,
  CircularProgress,
  Alert,
  Snackbar,
  Paper,
} from '@mui/material';
import Grid2 from '@mui/material/Grid2';
import SendIcon from '@mui/icons-material/Send';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import CancelIcon from '@mui/icons-material/Cancel';
import MarkunreadMailboxIcon from '@mui/icons-material/MarkunreadMailbox';

import {
  IncomingCertificateNotification,
  SharedCertificate,
} from '../../certificate-management/types/types';
import {
  fetchSharingRecords,
  fetchIncomingNotifications,
  rejectNotification,
  revokeShare,
} from '../../certificate-management/api';
import { certificateManagementConfig } from '../../certificate-management/config';
import PageSectionHeader from '@/components/common/PageSectionHeader';
import { kitThemes } from '@/theme/colors';
import LoadingSpinner from '@/components/general/LoadingSpinner';
import { SendCertificateDialog } from '../components/dialogs/SendCertificateDialog';

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

const ShareCertificates = () => {
  const [sharingRecords, setSharingRecords] = useState<SharedCertificate[]>([]);
  const [notifications, setNotifications] = useState<IncomingCertificateNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [revokingIds, setRevokingIds] = useState<Set<string>>(new Set());
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [outboxPage, setOutboxPage] = useState(0);
  const [inboxPage, setInboxPage] = useState(0);
  const ROWS_PER_PAGE = 10;
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [records, notifs] = await Promise.all([
        fetchSharingRecords(),
        fetchIncomingNotifications(),
      ]);
      setSharingRecords(records);
      setNotifications(notifs);
    } catch {
      setSnackbar({ open: true, message: 'Failed to load sharing data.', severity: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleRevoke = async (record: SharedCertificate) => {
    setRevokingIds((prev) => new Set(prev).add(record.id));
    try {
      await revokeShare(record.certificateId, record.id);
      setSnackbar({
        open: true,
        message: `Access revoked for ${record.partnerName ?? record.partnerBpn}.`,
        severity: 'success',
      });
      void loadData();
    } catch {
      setSnackbar({ open: true, message: 'Failed to revoke sharing record.', severity: 'error' });
    } finally {
      setRevokingIds((prev) => {
        const next = new Set(prev);
        next.delete(record.id);
        return next;
      });
    }
  };

  const handleReject = async (notif: IncomingCertificateNotification) => {
    try {
      await rejectNotification(notif.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, status: 'rejected' as const } : n))
      );
      setSnackbar({ open: true, message: 'Notification rejected.', severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: 'Failed to reject notification.', severity: 'error' });
    }
  };

  const pendingCount = notifications.filter((n) => n.status === 'pending').length;
  const visibleOutboxRows = sharingRecords.slice(outboxPage * ROWS_PER_PAGE, (outboxPage + 1) * ROWS_PER_PAGE);
  const visibleInboxRows = notifications.slice(inboxPage * ROWS_PER_PAGE, (inboxPage + 1) * ROWS_PER_PAGE);

  if (isLoading) return <LoadingSpinner />;

  return (
    <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
      {/* Page header */}
      <Box sx={{ mb: 4 }}>
        <PageSectionHeader
          icon={<MarkunreadMailboxIcon />}
          title="Share Certificates"
          subtitle="Manage outgoing certificate shares and incoming notifications from your Catena-X partners."
          kitTheme={kitThemes.ccm}
          actions={
            <Button
              variant="contained"
              startIcon={<SendIcon />}
              onClick={() => setSendDialogOpen(true)}
              sx={{
                background: `linear-gradient(135deg, ${kitThemes.ccm.gradientStart} 0%, ${kitThemes.ccm.gradientEnd} 100%)`,
                color: '#fff',
                borderRadius: { xs: '10px', md: '12px' },
                fontWeight: 600,
                textTransform: 'none',
                boxShadow: `0 4px 16px ${kitThemes.ccm.shadowColor}`,
                '&:hover': {
                  filter: 'brightness(1.1)',
                  boxShadow: `0 6px 24px ${kitThemes.ccm.shadowColor}`,
                  transform: 'translateY(-1px)',
                },
              }}
            >
              Send Certificate
            </Button>
          }
        />
      </Box>

      {/* ── Dual-column layout ───────────────────────────────────────────── */}
      <Grid2 container spacing={3}>

        {/* ── Left column: Outbox ─────────────────────────────────────────── */}
        <Grid2 size={{ xs: 12, md: 6 }}>
          <Paper sx={{ backgroundColor: '#1a2332', borderRadius: 3, overflow: 'hidden' }}>
            {/* Section header */}
            <Box sx={{ px: 2.5, py: 1.5, borderBottom: '1px solid', borderColor: 'rgba(255,255,255,0.1)', backgroundColor: '#1e2d3d', display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <ArrowUpwardIcon sx={{ color: '#64b5f6', fontSize: 20 }} />
              <Typography variant="subtitle1" fontWeight={700} sx={{ flex: 1, color: '#e8eaf6' }}>
                Sharing Outbox
              </Typography>
              <Chip label={sharingRecords.length} size="small" sx={{ fontFamily: 'monospace', fontWeight: 600, backgroundColor: 'rgba(100,181,246,0.15)', color: '#64b5f6', border: '1px solid rgba(100,181,246,0.3)' }} />
            </Box>
            <Box sx={{ px: 2.5, py: 1.5 }}>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.55)' }}>
                All certificates you have shared with partners. Revoke access to stop a partner from accessing your certificate.
              </Typography>
            </Box>
            {sharingRecords.length === 0 ? (
              <Box sx={{ py: 4, textAlign: 'center' }}>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.35)' }}>
                  No sharing records yet. Use "Send Certificate" to share.
                </Typography>
              </Box>
            ) : (
              <>
                <TableContainer sx={{ maxHeight: 'calc(50vh - 120px)', overflow: 'auto' }}>
                  <Table size="small" stickyHeader sx={{ '& .MuiTableCell-root': { borderColor: 'rgba(255,255,255,0.08)' } }}>
                    <TableHead>
                      <TableRow>
                        {['Certificate', 'Partner', 'Shared On', 'Status'].map((h) => (
                          <TableCell key={h} sx={{ fontWeight: 600, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(255,255,255,0.5)', backgroundColor: '#1e2d3d' }}>
                            {h}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {visibleOutboxRows.map((record) => (
                        <TableRow key={record.id} sx={{ '&:last-child td': { border: 0 }, '&:hover': { backgroundColor: 'rgba(255,255,255,0.04)' } }}>
                          <TableCell>
                            <Typography variant="body2" fontWeight={500} sx={{ color: 'rgba(255,255,255,0.87)' }}>{record.certificateName}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.87)' }}>{record.partnerName ?? '—'}</Typography>
                            <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'rgba(255,255,255,0.4)' }}>{record.partnerBpn}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>{formatDate(record.sharedAt)}</Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={record.status}
                              size="small"
                              sx={{
                                fontWeight: 600,
                                fontSize: '0.7rem',
                                ...(record.status === 'Active' && { backgroundColor: 'rgba(76,175,80,0.15)', color: '#81c784', border: '1px solid rgba(76,175,80,0.3)' }),
                                ...(record.status === 'Pending' && { backgroundColor: 'rgba(157,111,212,0.15)', color: '#B399D3', border: '1px solid rgba(157,111,212,0.3)' }),
                                ...(record.status !== 'Active' && record.status !== 'Pending' && { backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.15)' }),
                              }}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                <TablePagination
                  rowsPerPageOptions={[]}
                  component="div"
                  count={sharingRecords.length}
                  rowsPerPage={ROWS_PER_PAGE}
                  page={outboxPage}
                  onPageChange={(_, p) => setOutboxPage(p)}
                  sx={{ color: 'rgba(255,255,255,0.6)', borderTop: '1px solid rgba(255,255,255,0.08)', '& .MuiIconButton-root': { color: 'rgba(255,255,255,0.6)' }, '& .MuiIconButton-root.Mui-disabled': { color: 'rgba(255,255,255,0.2)' } }}
                />
              </>
            )}
          </Paper>
        </Grid2>

        {/* ── Right column: Incoming ───────────────────────────────────────── */}
        <Grid2 size={{ xs: 12, md: 6 }}>
          <Paper sx={{ backgroundColor: '#1a2332', borderRadius: 3, overflow: 'hidden' }}>
            {/* Section header */}
            <Box sx={{ px: 2.5, py: 1.5, borderBottom: '1px solid', borderColor: 'rgba(255,255,255,0.1)', backgroundColor: '#1e2d3d', display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <ArrowDownwardIcon sx={{ color: '#64b5f6', fontSize: 20 }} />
              <Typography variant="subtitle1" fontWeight={700} sx={{ flex: 1, color: '#e8eaf6' }}>
                Incoming Certificate Shares
              </Typography>
              {pendingCount > 0 && (
                <Chip label={`${pendingCount} pending`} size="small" sx={{ fontWeight: 600, fontSize: '0.7rem', backgroundColor: 'rgba(157,111,212,0.15)', color: '#B399D3', border: '1px solid rgba(157,111,212,0.3)' }} />
              )}
            </Box>
            <Box sx={{ px: 2.5, py: 1.5 }}>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.55)' }}>
                Certificates pushed to you by partners via the EDC notification mechanism.
              </Typography>
            </Box>
            {notifications.length === 0 ? (
              <Box sx={{ py: 4, textAlign: 'center' }}>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.35)' }}>
                  No incoming certificate notifications yet.
                </Typography>
              </Box>
            ) : (
              <>
                <TableContainer sx={{ maxHeight: 'calc(50vh - 120px)', overflow: 'auto' }}>
                  <Table size="small" stickyHeader sx={{ '& .MuiTableCell-root': { borderColor: 'rgba(255,255,255,0.08)' } }}>
                    <TableHead>
                      <TableRow>
                        {['Sender', 'Certificate Type', 'Received', 'Status'].map((h) => (
                          <TableCell key={h} sx={{ fontWeight: 600, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(255,255,255,0.5)', backgroundColor: '#1e2d3d' }}>
                            {h}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {visibleInboxRows.map((notif) => (
                        <TableRow key={notif.id} sx={{ '&:last-child td': { border: 0 }, '&:hover': { backgroundColor: 'rgba(255,255,255,0.04)' } }}>
                          <TableCell>
                            <Typography variant="body2" fontWeight={500} sx={{ color: 'rgba(255,255,255,0.87)' }}>{notif.senderName ?? '—'}</Typography>
                            <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'rgba(255,255,255,0.4)' }}>{notif.senderBpn}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.87)' }}>
                              {certificateManagementConfig.certificateTypes.find((t) => t.value === notif.certificateType)?.label ?? notif.certificateType}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>{formatDate(notif.receivedAt)}</Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={notif.status}
                              size="small"
                              sx={{
                                fontWeight: 600,
                                fontSize: '0.7rem',
                                textTransform: 'capitalize',
                                ...(notif.status === 'acknowledged' && { backgroundColor: 'rgba(76,175,80,0.15)', color: '#81c784', border: '1px solid rgba(76,175,80,0.3)' }),
                                ...(notif.status === 'pending' && { backgroundColor: 'rgba(157,111,212,0.15)', color: '#B399D3', border: '1px solid rgba(157,111,212,0.3)' }),
                                ...(notif.status !== 'acknowledged' && notif.status !== 'pending' && { backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.15)' }),
                              }}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                <TablePagination
                  rowsPerPageOptions={[]}
                  component="div"
                  count={notifications.length}
                  rowsPerPage={ROWS_PER_PAGE}
                  page={inboxPage}
                  onPageChange={(_, p) => setInboxPage(p)}
                  sx={{ color: 'rgba(255,255,255,0.6)', borderTop: '1px solid rgba(255,255,255,0.08)', '& .MuiIconButton-root': { color: 'rgba(255,255,255,0.6)' }, '& .MuiIconButton-root.Mui-disabled': { color: 'rgba(255,255,255,0.2)' } }}
                />
              </>
            )}
          </Paper>
        </Grid2>
      </Grid2>

      <SendCertificateDialog
        open={sendDialogOpen}
        onClose={() => setSendDialogOpen(false)}
        onSuccess={() => void loadData()}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar((p) => ({ ...p, open: false }))}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((p) => ({ ...p, open: false }))}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ShareCertificates;
