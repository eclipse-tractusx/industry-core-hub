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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  Snackbar,
  Table,
  TableBody,
  TableContainer,
  TableHead,
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
  CcmTablePaper,
  CcmHeaderRow,
  CcmHeaderCell,
  CcmBodyRow,
  CcmBodyCell,
  CcmTablePagination,
} from '@/features/ccm-kit/shared-components';
import type { FilterDef } from '@/features/ccm-kit/shared-components';

import { fetchInboundRequests, fetchShares } from '../api';
import { ccmSharedConfig } from '../config';
import { InboundRequestItem, InboundRequestStatus, ShareItem, ShareStatus } from '../types/types';
import { usePartners } from '@/contexts/PartnerContext';
import { useNotifications } from '@/features/notifications/contexts/NotificationContext';
import ProvideCertificateDialog, { ProvideMode } from '../components/dialogs/ProvideCertificateDialog';
import PushCertificateDialog from '../components/dialogs/PushCertificateDialog';
import InboundRequestDetailDialog from '../components/dialogs/InboundRequestDetailDialog';
import ShareDetailDialog from '../components/dialogs/ShareDetailDialog';

const ROWS_PER_PAGE_OPTIONS = [5, 10, 25];

const typeLabel = (value: string) =>
  ccmSharedConfig.certificateTypes.find((t) => t.value === value)?.label ?? value;

const certTypeOptions = ccmSharedConfig.certificateTypes.map((t) => ({ value: t.value, label: t.label }));

const buildInboundFilterDefs = (t: (key: string) => string): FilterDef[] => [
  {
    key: 'status',
    allLabel: t('provisionPage.filterAllStatuses'),
    options: [
      { value: 'Registered', label: t('provisionPage.inboundStatusValues.Registered') },
      { value: 'Available', label: t('provisionPage.inboundStatusValues.Available') },
      { value: 'Pushed', label: t('provisionPage.inboundStatusValues.Pushed') },
      { value: 'NotFound', label: t('provisionPage.inboundStatusValues.NotFound') },
    ],
  },
  {
    key: 'consumerStatus',
    allLabel: t('provisionPage.filterAllConsumerStatuses'),
    minWidth: 180,
    options: [
      { value: 'RECEIVED', label: t('provisionPage.consumerStatusValues.RECEIVED') },
      { value: 'ACCEPTED', label: t('provisionPage.consumerStatusValues.ACCEPTED') },
      { value: 'REJECTED', label: t('provisionPage.consumerStatusValues.REJECTED') },
    ],
  },
  { key: 'type', allLabel: t('provisionPage.filterAllTypes'), options: certTypeOptions, minWidth: 160 },
];

const buildSharesFilterDefs = (t: (key: string) => string): FilterDef[] => [
  {
    key: 'status',
    allLabel: t('provisionPage.filterAllStatuses'),
    options: [
      { value: 'Active', label: t('provisionPage.sharesStatusValues.Active') },
      { value: 'Pending', label: t('provisionPage.sharesStatusValues.Pending') },
      { value: 'Revoked', label: t('provisionPage.sharesStatusValues.Revoked') },
    ],
  },
  { key: 'type', allLabel: t('provisionPage.filterAllTypes'), options: certTypeOptions, minWidth: 160 },
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
  const { t } = useTranslation('certificateManagement');
  const inboundFilterDefs = buildInboundFilterDefs(t);
  const sharesFilterDefs = buildSharesFilterDefs(t);
  const { getContactName } = usePartners();
  const { ccmRefreshToken } = useNotifications();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'shares' ? 1 : 0;
  const [tab, setTab] = useState(initialTab);
  const [inbound, setInbound] = useState<InboundRequestItem[]>([]);
  const [shares, setShares] = useState<ShareItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inboundPage, setInboundPage] = useState(0);
  const [inboundRowsPerPage, setInboundRowsPerPage] = useState(10);
  const [sharesPage, setSharesPage] = useState(0);
  const [sharesRowsPerPage, setSharesRowsPerPage] = useState(10);

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
      setError(t('provisionPage.messages.loadFailed'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Sync active tab when URL searchParams change (e.g. navigating from notification panel)
  useEffect(() => {
    setTab(searchParams.get('tab') === 'shares' ? 1 : 0);
  }, [searchParams]);

  // Reload data when a new CCM notification arrives or user navigates here from the notification panel
  const isFirstRenderRef = useRef(true);
  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }
    void loadData();
  }, [ccmRefreshToken, loadData]);

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
    () => filteredInbound.slice(inboundPage * inboundRowsPerPage, (inboundPage + 1) * inboundRowsPerPage),
    [filteredInbound, inboundPage, inboundRowsPerPage],
  );
  const visibleShares = useMemo(
    () => filteredShares.slice(sharesPage * sharesRowsPerPage, (sharesPage + 1) * sharesRowsPerPage),
    [filteredShares, sharesPage, sharesRowsPerPage],
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
    notify(mode === 'AVAILABLE' ? t('provisionPage.messages.availabilitySent') : t('provisionPage.messages.certificatePushed'));
    void loadData();
  };

  const handlePushSuccess = () => {
    setPushOpen(false);
    notify(t('provisionPage.messages.certificatePushed'));
    void loadData();
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: { xs: 2, sm: 3, md: 4 } }}>
      <Box sx={{ mb: 4 }}>
        <PageSectionHeader
          icon={<InboxIcon />}
          title={t('provisionPage.title')}
          subtitle={t('provisionPage.subtitle')}
          kitTheme={kitThemes.ccm}
          actions={
            <>
              <RefreshButton onClick={() => void loadData()} loading={isLoading} />
              <PrimaryActionButton startIcon={<SendIcon />} onClick={() => setPushOpen(true)}>
                {t('provisionPage.pushCertificate')}
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
          { label: t('provisionPage.tabs.inboundRequests'), count: filteredInbound.length, icon: <CallReceivedIcon sx={{ fontSize: '1.1rem' }} /> },
          { label: t('provisionPage.tabs.shares'), count: filteredShares.length, icon: <IosShareIcon sx={{ fontSize: '1.1rem' }} /> },
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
          searchPlaceholder={t('provisionPage.inboundSearch')}
          filters={inboundFilterDefs}
          values={inboundFilterValues}
          onFilterChange={handleInboundFilter}
          onClear={handleInboundClear}
        />
      ) : (
        <CcmFilterBar
          search={sharesSearch}
          onSearchChange={handleSharesSearch}
          searchPlaceholder={t('provisionPage.sharesSearch')}
          filters={sharesFilterDefs}
          values={sharesFilterValues}
          onFilterChange={handleSharesFilter}
          onClear={handleSharesClear}
        />
      )}

      {/* ── Inbound Requests ─────────────────────────────────────────────── */}
      {tab === 0 && (
        <CcmTablePaper sx={{ flex: 1, minHeight: 0 }}>
          {filteredInbound.length === 0 ? (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)' }}>
                {inbound.length === 0 ? t('provisionPage.inbound.empty') : t('provisionPage.inbound.noMatch')}
              </Typography>
            </Box>
          ) : (
            <>
              <TableContainer sx={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
                <Table size="small">
                  <TableHead>
                    <CcmHeaderRow>
                      {([
                        t('provisionPage.inboundColumns.consumer'),
                        t('provisionPage.inboundColumns.certifiedBpn'),
                        t('provisionPage.inboundColumns.type'),
                        t('provisionPage.inboundColumns.locations'),
                        t('provisionPage.inboundColumns.status'),
                        t('provisionPage.inboundColumns.consumerStatus'),
                        t('provisionPage.inboundColumns.updated'),
                        t('provisionPage.inboundColumns.actions'),
                      ]).map((h) => (
                        <CcmHeaderCell key={h}>{h}</CcmHeaderCell>
                      ))}
                    </CcmHeaderRow>
                  </TableHead>
                  <TableBody>
                    {visibleInbound.map((req) => {
                      const locCount = countLocations(req.locationBpns);
                      return (
                        <CcmBodyRow key={req.requestId} onClick={() => setDetailInbound(req)}>
                          <CcmBodyCell onClick={(e) => e.stopPropagation()}>
                            <BpnlContactCell bpnl={req.consumerBpn} mode="name" />
                          </CcmBodyCell>
                          <CcmBodyCell onClick={(e) => e.stopPropagation()}>
                            <BpnlContactCell bpnl={req.certifiedBpn} mode="bpn" />
                          </CcmBodyCell>
                          <CcmBodyCell>
                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.87)' }}>
                              {typeLabel(req.certificateType)}
                            </Typography>
                          </CcmBodyCell>
                          <CcmBodyCell>
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                              {locCount ? t('provisionPage.locations', { count: locCount }) : '—'}
                            </Typography>
                          </CcmBodyCell>
                          <CcmBodyCell>
                            <Chip label={req.status} size="small" sx={{ fontWeight: 600, fontSize: '0.7rem', ...inboundStatusSx(req.status) }} />
                          </CcmBodyCell>
                          <CcmBodyCell>
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                              {req.consumerStatus ?? '—'}
                            </Typography>
                          </CcmBodyCell>
                          <CcmBodyCell>
                            <RelativeDate value={req.updatedAt} />
                          </CcmBodyCell>
                          <CcmBodyCell onClick={(e) => e.stopPropagation()}>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => setProvideRequest(req)}
                              startIcon={<OpenInNewIcon sx={{ fontSize: '0.85rem !important' }} />}
                              sx={provideButtonSx}
                            >
                              {t('provisionPage.provide')}
                            </Button>
                          </CcmBodyCell>
                        </CcmBodyRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
              <CcmTablePagination
                rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
                component="div"
                count={filteredInbound.length}
                rowsPerPage={inboundRowsPerPage}
                page={inboundPage}
                onPageChange={(_, p) => setInboundPage(p)}
                onRowsPerPageChange={(e) => { setInboundRowsPerPage(parseInt(e.target.value, 10)); setInboundPage(0); }}
              />
            </>
          )}
        </CcmTablePaper>
      )}

      {/* ── Shares (outbox) ──────────────────────────────────────────────── */}
      {tab === 1 && (
        <CcmTablePaper sx={{ flex: 1, minHeight: 0 }}>
          {filteredShares.length === 0 ? (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)' }}>
                {shares.length === 0
                  ? t('provisionPage.shares.empty')
                  : t('provisionPage.shares.noMatch')}
              </Typography>
            </Box>
          ) : (
            <>
              <TableContainer sx={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
                <Table size="small">
                  <TableHead>
                    <CcmHeaderRow>
                      {([
                        t('provisionPage.sharesColumns.type'),
                        t('provisionPage.sharesColumns.consumer'),
                        t('provisionPage.sharesColumns.status'),
                        t('provisionPage.sharesColumns.lastShared'),
                      ]).map((h) => (
                        <CcmHeaderCell key={h}>{h}</CcmHeaderCell>
                      ))}
                    </CcmHeaderRow>
                  </TableHead>
                  <TableBody>
                    {visibleShares.map((share) => (
                      <CcmBodyRow key={share.shareId} onClick={() => setDetailShare(share)}>
                        <CcmBodyCell>
                          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.87)' }}>
                            {typeLabel(share.certificateType)}
                          </Typography>
                        </CcmBodyCell>
                        <CcmBodyCell onClick={(e) => e.stopPropagation()}>
                          <BpnlContactCell bpnl={share.consumerBpnl} mode="name" />
                        </CcmBodyCell>
                        <CcmBodyCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip
                              label={share.status}
                              size="small"
                              sx={{ fontWeight: 600, fontSize: '0.7rem', ...shareStatusSx(share.status) }}
                            />
                            {share.rejectionReason && (
                              <Tooltip title={t('provisionPage.shares.rejectionIcon')}>
                                <ErrorOutlineIcon sx={{ fontSize: '0.9rem', color: '#e57373' }} />
                              </Tooltip>
                            )}
                          </Box>
                        </CcmBodyCell>
                        <CcmBodyCell>
                          <RelativeDate value={share.lastSharedDate} />
                        </CcmBodyCell>
                      </CcmBodyRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <CcmTablePagination
                rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
                component="div"
                count={filteredShares.length}
                rowsPerPage={sharesRowsPerPage}
                page={sharesPage}
                onPageChange={(_, p) => setSharesPage(p)}
                onRowsPerPageChange={(e) => { setSharesRowsPerPage(parseInt(e.target.value, 10)); setSharesPage(0); }}
              />
            </>
          )}
        </CcmTablePaper>
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
