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
  Chip,
  Paper,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Typography,
} from '@mui/material';
import InboxIcon from '@mui/icons-material/Inbox';
import SendIcon from '@mui/icons-material/Send';

import PageSectionHeader from '@/components/common/PageSectionHeader';
import LoadingSpinner from '@/components/general/LoadingSpinner';
import { kitThemes } from '@/theme/colors';
import { RefreshButton, PrimaryActionButton } from '@/features/ccm-kit/shared-components';

import { fetchInboundRequests, fetchShares } from '../api';
import { ccmSharedConfig } from '../config';
import { InboundRequestItem, InboundRequestStatus, ShareItem } from '../types/types';
import ProvideCertificateDialog, { ProvideMode } from '../components/dialogs/ProvideCertificateDialog';
import PushCertificateDialog from '../components/dialogs/PushCertificateDialog';

const ROWS_PER_PAGE = 10;

const formatDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

const typeLabel = (value: string) =>
  ccmSharedConfig.certificateTypes.find((t) => t.value === value)?.label ?? value;

const countLocations = (raw?: string | null): number => {
  if (!raw) return 0;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
};

const inboundStatusSx = (status: InboundRequestStatus) => {
  switch (status) {
    case 'Available':
    case 'Pushed':
      return { backgroundColor: 'rgba(76,175,80,0.15)', color: '#81c784', border: '1px solid rgba(76,175,80,0.3)' };
    case 'Registered':
      return { backgroundColor: 'rgba(157,111,212,0.15)', color: '#B399D3', border: '1px solid rgba(157,111,212,0.3)' };
    default:
      return { backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.15)' };
  }
};

const ProvisionManagement = () => {
  const [tab, setTab] = useState(0);
  const [inbound, setInbound] = useState<InboundRequestItem[]>([]);
  const [shares, setShares] = useState<ShareItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inboundPage, setInboundPage] = useState(0);
  const [sharesPage, setSharesPage] = useState(0);

  const [provideRequest, setProvideRequest] = useState<InboundRequestItem | null>(null);
  const [pushOpen, setPushOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const notify = (message: string, severity: 'success' | 'error' = 'success') =>
    setSnackbar({ open: true, message, severity });

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [reqs, shareList] = await Promise.all([fetchInboundRequests(), fetchShares()]);
      setInbound(reqs);
      setShares(shareList);
    } catch {
      setError('Failed to load provisioning data.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const visibleInbound = useMemo(
    () => inbound.slice(inboundPage * ROWS_PER_PAGE, (inboundPage + 1) * ROWS_PER_PAGE),
    [inbound, inboundPage],
  );
  const visibleShares = useMemo(
    () => shares.slice(sharesPage * ROWS_PER_PAGE, (sharesPage + 1) * ROWS_PER_PAGE),
    [shares, sharesPage],
  );

  const handleProvideSuccess = (mode: ProvideMode) => {
    setProvideRequest(null);
    notify(mode === 'AVAILABLE' ? 'Availability notification sent.' : 'Certificate pushed to consumer.');
    void loadData();
  };

  const handlePushSuccess = () => {
    setPushOpen(false);
    notify('Certificate pushed to consumer.');
    void loadData();
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: { xs: 2, sm: 3, md: 4 } }}>
      <Box sx={{ mb: 4 }}>
        <PageSectionHeader
          icon={<InboxIcon />}
          title="CCM Provision Management"
          subtitle="Handle incoming certificate requests and provide certificates to your Catena-X partners."
          kitTheme={kitThemes.ccm}
          actions={
            <>
              <RefreshButton onClick={() => void loadData()} loading={isLoading} />
              <PrimaryActionButton startIcon={<SendIcon />} onClick={() => setPushOpen(true)}>
                Push Certificate
              </PrimaryActionButton>
            </>
          }
        />
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* ── Section selector ─────────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        {[
          { label: 'Inbound Requests', count: inbound.length },
          { label: 'Shares', count: shares.length },
        ].map(({ label, count }, idx) => {
          const active = tab === idx;
          return (
            <Box
              key={idx}
              onClick={() => setTab(idx)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: 2.5,
                py: 1,
                borderRadius: 2,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                backgroundColor: active ? 'primary.main' : 'rgba(255,255,255,0.05)',
                border: active ? '1px solid transparent' : '1px solid rgba(255,255,255,0.1)',
                '&:hover': {
                  backgroundColor: active ? 'primary.main' : 'rgba(255,255,255,0.1)',
                },
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  fontWeight: active ? 700 : 500,
                  color: active ? '#fff' : 'rgba(255,255,255,0.6)',
                  transition: 'color 0.2s ease',
                }}
              >
                {label}
              </Typography>
              <Chip
                label={count}
                size="small"
                sx={{
                  height: 20,
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  fontFamily: 'monospace',
                  backgroundColor: active ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)',
                  color: active ? '#fff' : 'rgba(255,255,255,0.5)',
                  border: 'none',
                }}
              />
            </Box>
          );
        })}
      </Box>

      {/* ── Inbound Requests ─────────────────────────────────────────────── */}
      {tab === 0 && (
        <Paper sx={{ display: 'flex', flexDirection: 'column', backgroundColor: '#1a2332', borderRadius: 3, overflow: 'hidden', flex: 1 }}>
          {inbound.length === 0 ? (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)' }}>
                No inbound certificate requests yet.
              </Typography>
            </Box>
          ) : (
            <>
              <TableContainer sx={{ flex: 1, overflow: 'auto' }}>
                <Table size="small" stickyHeader sx={{ '& .MuiTableCell-root': { borderColor: 'rgba(255,255,255,0.08)' } }}>
                  <TableHead>
                    <TableRow>
                      {['Consumer', 'Certified BPN', 'Type', 'Locations', 'Status', 'Consumer Status', 'Updated', 'Actions'].map((h) => (
                        <TableCell
                          key={h}
                          sx={{ fontWeight: 600, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(255,255,255,0.5)', backgroundColor: '#1e2d3d' }}
                        >
                          {h}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {visibleInbound.map((req) => {
                      const locCount = countLocations(req.locationBpns);
                      return (
                        <TableRow key={req.requestId} sx={{ '&:hover': { backgroundColor: 'rgba(255,255,255,0.04)' } }}>
                          <TableCell>
                            <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'rgba(255,255,255,0.7)' }}>
                              {req.consumerBpn}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'rgba(255,255,255,0.7)' }}>
                              {req.certifiedBpn}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.87)' }}>
                              {typeLabel(req.certificateType)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                              {locCount ? `${locCount} site(s)` : '—'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip label={req.status} size="small" sx={{ fontWeight: 600, fontSize: '0.7rem', ...inboundStatusSx(req.status) }} />
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                              {req.consumerStatus ?? '—'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                              {formatDate(req.updatedAt)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Button size="small" variant="outlined" onClick={() => setProvideRequest(req)}>
                              Provide
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                rowsPerPageOptions={[]}
                component="div"
                count={inbound.length}
                rowsPerPage={ROWS_PER_PAGE}
                page={inboundPage}
                onPageChange={(_, p) => setInboundPage(p)}
                sx={{ color: 'rgba(255,255,255,0.9)', borderTop: '1px solid rgba(255,255,255,0.08)', '& .MuiTablePagination-displayedRows': { color: 'rgba(255,255,255,0.9)' }, '& .MuiIconButton-root': { color: 'rgba(255,255,255,0.9)' }, '& .MuiIconButton-root.Mui-disabled': { color: 'rgba(255,255,255,0.2)' } }}
              />
            </>
          )}
        </Paper>
      )}

      {/* ── Shares (outbox) ──────────────────────────────────────────────── */}
      {tab === 1 && (
        <Paper sx={{ display: 'flex', flexDirection: 'column', backgroundColor: '#1a2332', borderRadius: 3, overflow: 'hidden', flex: 1 }}>
          {shares.length === 0 ? (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)' }}>
                No certificates shared yet. Use "Push Certificate" or respond to an inbound request.
              </Typography>
            </Box>
          ) : (
            <>
              <TableContainer sx={{ flex: 1, overflow: 'auto' }}>
                <Table size="small" stickyHeader sx={{ '& .MuiTableCell-root': { borderColor: 'rgba(255,255,255,0.08)' } }}>
                  <TableHead>
                    <TableRow>
                      {['Type', 'Consumer', 'Status', 'Last Shared'].map((h) => (
                        <TableCell
                          key={h}
                          sx={{ fontWeight: 600, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(255,255,255,0.5)', backgroundColor: '#1e2d3d' }}
                        >
                          {h}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {visibleShares.map((share) => (
                      <TableRow key={share.shareId} sx={{ '&:hover': { backgroundColor: 'rgba(255,255,255,0.04)' } }}>
                        <TableCell>
                          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.87)' }}>
                            {typeLabel(share.certificateType)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'rgba(255,255,255,0.7)' }}>
                            {share.consumerBpnl}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={share.status}
                            size="small"
                            sx={{
                              fontWeight: 600,
                              fontSize: '0.7rem',
                              ...(share.status === 'Active' && { backgroundColor: 'rgba(76,175,80,0.15)', color: '#81c784', border: '1px solid rgba(76,175,80,0.3)' }),
                              ...(share.status === 'Pending' && { backgroundColor: 'rgba(157,111,212,0.15)', color: '#B399D3', border: '1px solid rgba(157,111,212,0.3)' }),
                              ...(share.status === 'Revoked' && { backgroundColor: 'rgba(244,67,54,0.15)', color: '#e57373', border: '1px solid rgba(244,67,54,0.3)' }),
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                            {formatDate(share.lastSharedDate)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                rowsPerPageOptions={[]}
                component="div"
                count={shares.length}
                rowsPerPage={ROWS_PER_PAGE}
                page={sharesPage}
                onPageChange={(_, p) => setSharesPage(p)}
                sx={{ color: 'rgba(255,255,255,0.9)', borderTop: '1px solid rgba(255,255,255,0.08)', '& .MuiTablePagination-displayedRows': { color: 'rgba(255,255,255,0.9)' }, '& .MuiIconButton-root': { color: 'rgba(255,255,255,0.9)' }, '& .MuiIconButton-root.Mui-disabled': { color: 'rgba(255,255,255,0.2)' } }}
              />
            </>
          )}
        </Paper>
      )}

      <ProvideCertificateDialog
        open={!!provideRequest}
        request={provideRequest}
        onClose={() => setProvideRequest(null)}
        onSuccess={handleProvideSuccess}
      />

      <PushCertificateDialog open={pushOpen} onClose={() => setPushOpen(false)} onSuccess={handlePushSuccess} />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar((p) => ({ ...p, open: false }))}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((p) => ({ ...p, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ProvisionManagement;
