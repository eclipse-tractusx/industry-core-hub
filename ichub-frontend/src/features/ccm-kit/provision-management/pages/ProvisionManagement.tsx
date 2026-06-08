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
import { useSearchParams } from 'react-router-dom';
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
  Tooltip,
  Typography,
} from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import InboxIcon from '@mui/icons-material/Inbox';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import SendIcon from '@mui/icons-material/Send';
import CallReceivedIcon from '@mui/icons-material/CallReceived';
import IosShareIcon from '@mui/icons-material/IosShare';

import PageSectionHeader from '@/components/common/PageSectionHeader';
import LoadingSpinner from '@/components/general/LoadingSpinner';
import { kitThemes } from '@/theme/colors';
import {
  RefreshButton,
  PrimaryActionButton,
  CcmFilterBar,
  RelativeDate,
  BpnlContactCell,
} from '@/features/ccm-kit/shared-components';
import type { FilterDef } from '@/features/ccm-kit/shared-components';

import { fetchInboundRequests, fetchShares } from '../api';
import { ccmSharedConfig } from '../config';
import { InboundRequestItem, InboundRequestStatus, ShareItem, ShareStatus } from '../types/types';
import { usePartners } from '@/contexts/PartnerContext';
import ProvideCertificateDialog, { ProvideMode } from '../components/dialogs/ProvideCertificateDialog';
import PushCertificateDialog from '../components/dialogs/PushCertificateDialog';
import InboundRequestDetailDialog from '../components/dialogs/InboundRequestDetailDialog';
import ShareDetailDialog from '../components/dialogs/ShareDetailDialog';

const ROWS_PER_PAGE = 10;

const typeLabel = (value: string) =>
  ccmSharedConfig.certificateTypes.find((t) => t.value === value)?.label ?? value;

const certTypeOptions = ccmSharedConfig.certificateTypes.map((t) => ({ value: t.value, label: t.label }));

const inboundFilterDefs: FilterDef[] = [
  {
    key: 'status',
    allLabel: 'All Statuses',
    options: [
      { value: 'Registered', label: 'Registered' },
      { value: 'Available', label: 'Available' },
      { value: 'Pushed', label: 'Pushed' },
      { value: 'NotFound', label: 'Not Found' },
    ],
  },
  {
    key: 'consumerStatus',
    allLabel: 'All Consumer Statuses',
    minWidth: 180,
    options: [
      { value: 'RECEIVED', label: 'Received' },
      { value: 'ACCEPTED', label: 'Accepted' },
      { value: 'REJECTED', label: 'Rejected' },
    ],
  },
  { key: 'type', allLabel: 'All Types', options: certTypeOptions, minWidth: 160 },
];

const sharesFilterDefs: FilterDef[] = [
  {
    key: 'status',
    allLabel: 'All Statuses',
    options: [
      { value: 'Active', label: 'Active' },
      { value: 'Pending', label: 'Pending' },
      { value: 'Revoked', label: 'Revoked' },
    ],
  },
  { key: 'type', allLabel: 'All Types', options: certTypeOptions, minWidth: 160 },
];

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

const shareStatusSx = (status: ShareStatus) => {
  switch (status) {
    case 'Active':
      return { backgroundColor: 'rgba(76,175,80,0.15)', color: '#81c784', border: '1px solid rgba(76,175,80,0.3)' };
    case 'Pending':
      return { backgroundColor: 'rgba(157,111,212,0.15)', color: '#B399D3', border: '1px solid rgba(157,111,212,0.3)' };
    case 'Revoked':
      return { backgroundColor: 'rgba(244,67,54,0.15)', color: '#e57373', border: '1px solid rgba(244,67,54,0.3)' };
    default:
      return { backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.15)' };
  }
};

// Outlined button style that reads well on the dark-blue table background.
const provideButtonSx = {
  color: 'rgba(255,255,255,0.8)',
  borderColor: 'rgba(255,255,255,0.25)',
  textTransform: 'none',
  fontWeight: 600,
  fontSize: '0.72rem',
  borderRadius: 1.5,
  py: 0.5,
  px: 1.5,
  '&:hover': {
    borderColor: 'rgba(255,255,255,0.65)',
    color: '#fff',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
} as const;

const ProvisionManagement = () => {
  const { getContactName } = usePartners();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'shares' ? 1 : 0;
  const [tab, setTab] = useState(initialTab);
  const [inbound, setInbound] = useState<InboundRequestItem[]>([]);
  const [shares, setShares] = useState<ShareItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inboundPage, setInboundPage] = useState(0);
  const [sharesPage, setSharesPage] = useState(0);

  // Search + filter state (separate per table).
  const [inboundSearch, setInboundSearch] = useState('');
  const [inboundFilterValues, setInboundFilterValues] = useState<Record<string, string>>({
    status: '',
    consumerStatus: '',
    type: '',
  });
  const [sharesSearch, setSharesSearch] = useState('');
  const [sharesFilterValues, setSharesFilterValues] = useState<Record<string, string>>({
    status: '',
    type: '',
  });

  const [provideRequest, setProvideRequest] = useState<InboundRequestItem | null>(null);
  const [pushOpen, setPushOpen] = useState(false);
  const [detailInbound, setDetailInbound] = useState<InboundRequestItem | null>(null);
  const [detailShare, setDetailShare] = useState<ShareItem | null>(null);
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

  const filteredInbound = useMemo(() => {
    const s = inboundSearch.trim().toLowerCase();
    return inbound.filter((r) => {
      const matchesSearch =
        !s ||
        [r.consumerBpn, getContactName(r.consumerBpn), r.certifiedBpn, typeLabel(r.certificateType), r.status, r.consumerStatus ?? '']
          .some((v) => v?.toLowerCase().includes(s));
      const matchesStatus = !inboundFilterValues.status || r.status === inboundFilterValues.status;
      const matchesConsumerStatus =
        !inboundFilterValues.consumerStatus || r.consumerStatus === inboundFilterValues.consumerStatus;
      const matchesType = !inboundFilterValues.type || r.certificateType === inboundFilterValues.type;
      return matchesSearch && matchesStatus && matchesConsumerStatus && matchesType;
    });
  }, [inbound, inboundSearch, inboundFilterValues, getContactName]);

  const filteredShares = useMemo(() => {
    const s = sharesSearch.trim().toLowerCase();
    return shares.filter((sh) => {
      const matchesSearch =
        !s ||
        [sh.consumerBpnl, getContactName(sh.consumerBpnl), typeLabel(sh.certificateType), sh.status].some((v) => v?.toLowerCase().includes(s));
      const matchesStatus = !sharesFilterValues.status || sh.status === sharesFilterValues.status;
      const matchesType = !sharesFilterValues.type || sh.certificateType === sharesFilterValues.type;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [shares, sharesSearch, sharesFilterValues, getContactName]);

  const visibleInbound = useMemo(
    () => filteredInbound.slice(inboundPage * ROWS_PER_PAGE, (inboundPage + 1) * ROWS_PER_PAGE),
    [filteredInbound, inboundPage],
  );
  const visibleShares = useMemo(
    () => filteredShares.slice(sharesPage * ROWS_PER_PAGE, (sharesPage + 1) * ROWS_PER_PAGE),
    [filteredShares, sharesPage],
  );

  // Handlers that reset pagination when the result set changes.
  const handleInboundSearch = (v: string) => {
    setInboundSearch(v);
    setInboundPage(0);
  };
  const handleInboundFilter = (key: string, value: string) => {
    setInboundFilterValues((prev) => ({ ...prev, [key]: value }));
    setInboundPage(0);
  };
  const handleInboundClear = () => {
    setInboundSearch('');
    setInboundFilterValues({ status: '', consumerStatus: '', type: '' });
    setInboundPage(0);
  };
  const handleSharesSearch = (v: string) => {
    setSharesSearch(v);
    setSharesPage(0);
  };
  const handleSharesFilter = (key: string, value: string) => {
    setSharesFilterValues((prev) => ({ ...prev, [key]: value }));
    setSharesPage(0);
  };
  const handleSharesClear = () => {
    setSharesSearch('');
    setSharesFilterValues({ status: '', type: '' });
    setSharesPage(0);
  };

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
      <Box sx={{ display: 'flex', gap: 1.5, mb: 2.5 }}>
        {[
          { label: 'Inbound Requests', count: filteredInbound.length, icon: <CallReceivedIcon sx={{ fontSize: '1.1rem' }} /> },
          { label: 'Shares', count: filteredShares.length, icon: <IosShareIcon sx={{ fontSize: '1.1rem' }} /> },
        ].map(({ label, count, icon }, idx) => {
          const active = tab === idx;
          return (
            <Box
              key={idx}
              onClick={() => setTab(idx)}
              sx={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
                px: 2.5,
                py: 1.25,
                borderRadius: 2.5,
                cursor: 'pointer',
                transition: 'all 0.25s ease',
                background: active
                  ? `linear-gradient(135deg, ${kitThemes.ccm.gradientStart} 0%, ${kitThemes.ccm.gradientEnd} 100%)`
                  : 'rgba(255,255,255,0.04)',
                border: active ? '1px solid transparent' : '1px solid rgba(255,255,255,0.08)',
                boxShadow: active ? `0 6px 18px ${kitThemes.ccm.shadowColor}` : 'none',
                transform: active ? 'translateY(-1px)' : 'none',
                '&:hover': {
                  background: active
                    ? `linear-gradient(135deg, ${kitThemes.ccm.gradientStart} 0%, ${kitThemes.ccm.gradientEnd} 100%)`
                    : 'rgba(255,255,255,0.09)',
                  borderColor: active ? 'transparent' : 'rgba(157,111,212,0.4)',
                },
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  color: active ? '#fff' : 'rgba(255,255,255,0.5)',
                  transition: 'color 0.25s ease',
                }}
              >
                {icon}
              </Box>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: active ? 700 : 500,
                  color: active ? '#fff' : 'rgba(255,255,255,0.6)',
                  transition: 'color 0.25s ease',
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
                  backgroundColor: active ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)',
                  color: active ? '#fff' : 'rgba(255,255,255,0.5)',
                  border: 'none',
                  transition: 'all 0.25s ease',
                }}
              />
            </Box>
          );
        })}
      </Box>

      {/* ── Search + filters (per active section) ────────────────────────── */}
      {tab === 0 ? (
        <CcmFilterBar
          search={inboundSearch}
          onSearchChange={handleInboundSearch}
          searchPlaceholder="Search by BPN, type or status…"
          filters={inboundFilterDefs}
          values={inboundFilterValues}
          onFilterChange={handleInboundFilter}
          onClear={handleInboundClear}
        />
      ) : (
        <CcmFilterBar
          search={sharesSearch}
          onSearchChange={handleSharesSearch}
          searchPlaceholder="Search by consumer, type or status…"
          filters={sharesFilterDefs}
          values={sharesFilterValues}
          onFilterChange={handleSharesFilter}
          onClear={handleSharesClear}
        />
      )}

      {/* ── Inbound Requests ─────────────────────────────────────────────── */}
      {tab === 0 && (
        <Paper sx={{ display: 'flex', flexDirection: 'column', backgroundColor: '#1a2332', borderRadius: 3, overflow: 'hidden', flex: 1 }}>
          {filteredInbound.length === 0 ? (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)' }}>
                {inbound.length === 0 ? 'No inbound certificate requests yet.' : 'No requests match your filters.'}
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
                        <Tooltip key={req.requestId} title="Click to view full details" placement="left" arrow>
                          <TableRow
                            onClick={() => setDetailInbound(req)}
                            sx={{ cursor: 'pointer', '&:hover': { backgroundColor: 'rgba(255,255,255,0.06)' } }}
                          >
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <BpnlContactCell bpnl={req.consumerBpn} mode="name" />
                            </TableCell>
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <BpnlContactCell bpnl={req.certifiedBpn} mode="bpn" />
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
                              <RelativeDate value={req.updatedAt} />
                            </TableCell>
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() => setProvideRequest(req)}
                                startIcon={<OpenInNewIcon sx={{ fontSize: '0.85rem !important' }} />}
                                sx={provideButtonSx}
                              >
                                Provide
                              </Button>
                            </TableCell>
                          </TableRow>
                        </Tooltip>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                rowsPerPageOptions={[]}
                component="div"
                count={filteredInbound.length}
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
          {filteredShares.length === 0 ? (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)' }}>
                {shares.length === 0
                  ? 'No certificates shared yet. Use "Push Certificate" or respond to an inbound request.'
                  : 'No shares match your filters.'}
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
                      <Tooltip key={share.shareId} title="Click to view full details" placement="left" arrow>
                        <TableRow
                          onClick={() => setDetailShare(share)}
                          sx={{ cursor: 'pointer', '&:hover': { backgroundColor: 'rgba(255,255,255,0.06)' } }}
                        >
                          <TableCell>
                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.87)' }}>
                              {typeLabel(share.certificateType)}
                            </Typography>
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <BpnlContactCell bpnl={share.consumerBpnl} mode="name" />
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Chip
                                label={share.status}
                                size="small"
                                sx={{ fontWeight: 600, fontSize: '0.7rem', ...shareStatusSx(share.status) }}
                              />
                              {share.rejectionReason && (
                                <Tooltip title="Has rejection reason — click row to view">
                                  <ErrorOutlineIcon sx={{ fontSize: '0.9rem', color: '#e57373' }} />
                                </Tooltip>
                              )}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <RelativeDate value={share.lastSharedDate} />
                          </TableCell>
                        </TableRow>
                      </Tooltip>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                rowsPerPageOptions={[]}
                component="div"
                count={filteredShares.length}
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

      <InboundRequestDetailDialog
        open={!!detailInbound}
        request={detailInbound}
        onClose={() => setDetailInbound(null)}
        onProvide={(req) => setProvideRequest(req)}
      />

      <ShareDetailDialog
        open={!!detailShare}
        share={detailShare}
        onClose={() => setDetailShare(null)}
      />

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
