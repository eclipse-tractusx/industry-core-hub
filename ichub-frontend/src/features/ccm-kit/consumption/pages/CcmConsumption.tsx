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
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Snackbar,
  Table,
  TableBody,
  TableContainer,
  TableHead,
  Tooltip,
  Typography,
} from '@mui/material';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import AddIcon from '@mui/icons-material/Add';
import HistoryIcon from '@mui/icons-material/History';
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
import DownloadIcon from '@mui/icons-material/Download';
import VisibilityIcon from '@mui/icons-material/Visibility';
import RateReviewIcon from '@mui/icons-material/RateReview';

import PageSectionHeader from '@/components/common/PageSectionHeader';
import LoadingSpinner from '@/components/general/LoadingSpinner';
import { kitThemes } from '@/theme/colors';

import {
  fetchReceived,
  fetchReceivedDetail,
  fetchRequests,
  pullCertificate,
} from '../api';
import { CCM_POLICY_GOVERNANCE, ccmSharedConfig } from '../config';
import {
  CertificateStatusValue,
  OutboundRequestItem,
  OutboundRequestStatus,
  ReceivedCertificateDetail,
  ReceivedLocalStatus,
} from '../types/types';
import { usePartners } from '@/contexts/PartnerContext';
import { useNotifications } from '@/features/notifications/contexts/NotificationContext';
import type { Certificate } from '../../certificate-management/types/types';
import { CertificatePDFViewer } from '../../certificate-management/components/dialogs/CertificatePDFViewer';
import { CertificateInfoPanel } from '../../certificate-management/components/dialogs/CertificateInfoPanel';
import RequestCertificateDialog from '../components/dialogs/RequestCertificateDialog';
import SendStatusDialog from '../components/dialogs/SendStatusDialog';
import RequestHistoryDialog from '../components/dialogs/RequestHistoryDialog';
import OutboundRequestDetailDialog from '../components/dialogs/OutboundRequestDetailDialog';

const ROWS_PER_PAGE_OPTIONS = [5, 10, 25];

const typeLabel = (value: string) =>
  ccmSharedConfig.certificateTypes.find((t) => t.value === value)?.label ?? value;

const certTypeOptions = ccmSharedConfig.certificateTypes.map((t) => ({ value: t.value, label: t.label }));

const buildConsumptionFilterDefs = (t: (key: string) => string): FilterDef[] => [
  {
    key: 'status',
    allLabel: t('consumptionPage.filterAllStatuses'),
    options: [
      { value: 'Pending', label: t('consumptionPage.statusValues.Pending') },
      { value: 'Found', label: t('consumptionPage.statusValues.Found') },
      { value: 'NotFound', label: t('consumptionPage.statusValues.NotFound') },
      { value: 'Failed', label: t('consumptionPage.statusValues.Failed') },
    ],
  },
  { key: 'type', allLabel: t('consumptionPage.filterAllTypes'), options: certTypeOptions, minWidth: 160 },
];

// Action icon buttons sit on the dark-blue table background — give them a light
// foreground for contrast (the default primary color is too dark to read here).
const actionIconSx = {
  minWidth: 0,
  px: 1,
  color: 'rgba(255,255,255,0.75)',
  '&:hover': { backgroundColor: 'rgba(255,255,255,0.08)', color: '#fff' },
  '&.Mui-disabled': { color: 'rgba(255,255,255,0.25)' },
} as const;

const statusChipSx = (status: OutboundRequestStatus) => {
  switch (status) {
    case 'Found':
      return { backgroundColor: 'rgba(76,175,80,0.15)', color: '#81c784', border: '1px solid rgba(76,175,80,0.3)' };
    case 'Pending':
      return { backgroundColor: 'rgba(157,111,212,0.15)', color: '#B399D3', border: '1px solid rgba(157,111,212,0.3)' };
    case 'Failed':
      return { backgroundColor: 'rgba(244,67,54,0.15)', color: '#e57373', border: '1px solid rgba(244,67,54,0.3)' };
    default:
      return { backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.15)' };
  }
};

const localStatusChipSx = (status: 'Pending' | 'Accepted' | 'Rejected') => {
  switch (status) {
    case 'Accepted':
      return { backgroundColor: 'rgba(76,175,80,0.15)', color: '#81c784', border: '1px solid rgba(76,175,80,0.3)' };
    case 'Rejected':
      return { backgroundColor: 'rgba(244,67,54,0.15)', color: '#e57373', border: '1px solid rgba(244,67,54,0.3)' };
    default:
      return { backgroundColor: 'rgba(157,111,212,0.15)', color: '#B399D3', border: '1px solid rgba(157,111,212,0.3)' };
  }
};

const computeCertStatus = (validUntil?: string | null): 'valid' | 'expiring' | 'expired' => {
  if (!validUntil) return 'valid';
  const d = new Date(validUntil);
  if (isNaN(d.getTime())) return 'valid';
  const now = Date.now();
  if (d.getTime() <= now) return 'expired';
  if (d.getTime() <= now + 30 * 24 * 60 * 60 * 1000) return 'expiring';
  return 'valid';
};

const buildCertificate = (req: OutboundRequestItem, detail?: ReceivedCertificateDetail | null): Certificate => ({
  id: req.documentId ?? String(req.id),
  name: typeLabel(req.certificateType),
  type: req.certificateType as Certificate['type'],
  bpn: req.certifiedBpn,
  issuer: detail?.issuerName ?? '—',
  validFrom: detail?.validFrom ?? '',
  validUntil: detail?.validUntil ?? '',
  status: computeCertStatus(detail?.validUntil),
  dtrStatus: 'registered',
  sharedCount: 0,
  trustLevel: detail?.trustLevel ?? undefined,
  certificateIdentifier: detail?.registrationNumber ?? undefined,
  areaOfApplication: detail?.areaOfApplication ?? undefined,
  uploaderBpnl: detail?.uploaderBpn ?? undefined,
  createdAt: req.requestedAt,
  updatedAt: req.updatedAt,
});

const CcmConsumption = () => {
  const { t } = useTranslation('certificateManagement');
  const consumptionFilterDefs = buildConsumptionFilterDefs(t);
  const { getContactName } = usePartners();
  const { ccmRefreshToken } = useNotifications();
  const [requests, setRequests] = useState<OutboundRequestItem[]>([]);
  const [receivedMap, setReceivedMap] = useState<Map<string, ReceivedLocalStatus>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [busyRowId, setBusyRowId] = useState<number | null>(null);

  // Search + filter state.
  const [search, setSearch] = useState('');
  const [filterValues, setFilterValues] = useState<Record<string, string>>({ status: '', type: '' });

  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [statusDialogRequest, setStatusDialogRequest] = useState<OutboundRequestItem | null>(null);
  const [historyRequest, setHistoryRequest] = useState<OutboundRequestItem | null>(null);
  const [detailRequest, setDetailRequest] = useState<OutboundRequestItem | null>(null);
  const [viewer, setViewer] = useState<{ open: boolean; base64: string | null; certificate: Certificate | null }>({
    open: false,
    base64: null,
    certificate: null,
  });
  const [infoPanelOpen, setInfoPanelOpen] = useState(false);
  const [infoCertificate, setInfoCertificate] = useState<Certificate | null>(null);
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
      const [reqs, received] = await Promise.all([fetchRequests(), fetchReceived()]);
      setRequests(reqs);
      setReceivedMap(new Map(received.map((r) => [r.documentId, r.localStatus])));
    } catch {
      setError(t('consumptionPage.messages.loadFailed'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Reload when a new CCM notification arrives or user navigates here from the notification panel
  const isFirstRenderRef = useRef(true);
  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }
    void loadData();
  }, [ccmRefreshToken, loadData]);

  const filteredRequests = useMemo(() => {
    const s = search.trim().toLowerCase();
    return requests.filter((r) => {
      const matchesSearch =
        !s ||
        [r.providerBpn, getContactName(r.providerBpn), r.certifiedBpn, typeLabel(r.certificateType), r.status].some((v) =>
          v?.toLowerCase().includes(s),
        );
      const matchesStatus = !filterValues.status || r.status === filterValues.status;
      const matchesType = !filterValues.type || r.certificateType === filterValues.type;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [requests, search, filterValues, getContactName]);

  const visibleRows = useMemo(
    () => filteredRequests.slice(page * rowsPerPage, (page + 1) * rowsPerPage),
    [filteredRequests, page, rowsPerPage],
  );

  const handleSearch = (v: string) => {
    setSearch(v);
    setPage(0);
  };
  const handleFilter = (key: string, value: string) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
    setPage(0);
  };
  const handleClearFilters = () => {
    setSearch('');
    setFilterValues({ status: '', type: '' });
    setPage(0);
  };

  // PULL or VIEW depending on whether the document was already downloaded.
  const handlePullOrView = async (req: OutboundRequestItem) => {
    if (!req.documentId) return;
    setBusyRowId(req.id);
    try {
      const alreadyReceived = receivedMap.has(req.documentId);
      if (!alreadyReceived) {
        await pullCertificate({
          providerBpn: req.providerBpn,
          documentId: req.documentId,
          governance: CCM_POLICY_GOVERNANCE,
        });
        setReceivedMap((prev) => new Map(prev).set(req.documentId!, 'Pending'));
        notify(t('consumptionPage.messages.pullSuccess'));
      }
      const detail = await fetchReceivedDetail(req.documentId, req.providerBpn);
      const certificate = buildCertificate(req, detail);
      setViewer({ open: true, base64: detail?.documentBase64 ?? null, certificate });
    } catch {
      notify(t('consumptionPage.messages.pullFailed'), 'error');
    } finally {
      setBusyRowId(null);
    }
  };

  const handleViewerInfo = (certificate: Certificate) => {
    setInfoCertificate(certificate);
    setInfoPanelOpen(true);
  };

  const handleStatusSuccess = (status: CertificateStatusValue) => {
    setStatusDialogRequest(null);
    notify(t('consumptionPage.messages.feedbackSent', { status }));
    void loadData();
  };

  const handleRequestSuccess = (messageId?: string | null) => {
    setRequestDialogOpen(false);
    notify(messageId ? t('consumptionPage.messages.requestSent', { messageId }) : t('consumptionPage.messages.requestSentSimple'));
    void loadData();
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: { xs: 2, sm: 3, md: 4 } }}>
      <Box sx={{ mb: 4 }}>
        <PageSectionHeader
          icon={<ShoppingCartIcon />}
          title={t('consumptionPage.title')}
          subtitle={t('consumptionPage.subtitle')}
          kitTheme={kitThemes.ccm}
          actions={
            <>
              <RefreshButton onClick={() => void loadData()} loading={isLoading} />
              <PrimaryActionButton startIcon={<AddIcon />} onClick={() => setRequestDialogOpen(true)}>
                {t('consumptionPage.newRequest')}
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

      <CcmFilterBar
        search={search}
        onSearchChange={handleSearch}
        searchPlaceholder={t('consumptionPage.searchPlaceholder')}
        filters={consumptionFilterDefs}
        values={filterValues}
        onFilterChange={handleFilter}
        onClear={handleClearFilters}
      />

      <CcmTablePaper sx={{ flex: 1, minHeight: 0 }}>
        {filteredRequests.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)' }}>
              {requests.length === 0
                ? t('consumptionPage.empty.noRequests')
                : t('consumptionPage.empty.noMatch')}
            </Typography>
          </Box>
        ) : (
          <>
            <TableContainer sx={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
              <Table size="small">
                <TableHead>
                  <CcmHeaderRow>
                    {([
                      t('consumptionPage.columns.provider'),
                      t('consumptionPage.columns.certifiedBpn'),
                      t('consumptionPage.columns.type'),
                      t('consumptionPage.columns.locations'),
                      t('consumptionPage.columns.status'),
                      t('consumptionPage.columns.response'),
                      t('consumptionPage.columns.updated'),
                      t('consumptionPage.columns.actions'),
                    ]).map((h) => (
                      <CcmHeaderCell key={h}>{h}</CcmHeaderCell>
                    ))}
                  </CcmHeaderRow>
                </TableHead>
                <TableBody>
                  {visibleRows.map((req) => {
                    const isFound = req.status === 'Found' && !!req.documentId;
                    const alreadyReceived = !!req.documentId && receivedMap.has(req.documentId);
                    const receivedStatus = req.documentId ? receivedMap.get(req.documentId) : undefined;
                    const feedbackAllowed = isFound && receivedStatus !== 'Accepted' && receivedStatus !== 'Rejected';
                    const rowBusy = busyRowId === req.id;
                    return (
                      <CcmBodyRow key={req.id} onClick={() => setDetailRequest(req)}>
                        <CcmBodyCell onClick={(e) => e.stopPropagation()}>
                          <BpnlContactCell bpnl={req.providerBpn} mode="name" />
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
                            {req.locationBpns?.length ? t('consumptionPage.locations', { count: req.locationBpns.length }) : '—'}
                          </Typography>
                        </CcmBodyCell>
                        <CcmBodyCell>
                          <Chip label={req.status} size="small" sx={{ fontWeight: 600, fontSize: '0.7rem', ...statusChipSx(req.status) }} />
                        </CcmBodyCell>
                        <CcmBodyCell>
                          {receivedStatus ? (
                            <Chip
                              label={receivedStatus}
                              size="small"
                              sx={{ fontWeight: 600, fontSize: '0.7rem', ...localStatusChipSx(receivedStatus) }}
                            />
                          ) : (
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.3)' }}>—</Typography>
                          )}
                        </CcmBodyCell>
                        <CcmBodyCell>
                          <RelativeDate value={req.updatedAt} />
                        </CcmBodyCell>
                        <CcmBodyCell onClick={(e) => e.stopPropagation()}>
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <Tooltip title={t('consumptionPage.tooltips.viewHistory')}>
                              <span>
                                <Button size="small" sx={actionIconSx} onClick={() => setHistoryRequest(req)}>
                                  <HistoryIcon fontSize="small" />
                                </Button>
                              </span>
                            </Tooltip>
                            <Tooltip title={alreadyReceived ? t('consumptionPage.tooltips.viewCertificate') : t('consumptionPage.tooltips.pullCertificate')}>
                              <span>
                                <Button
                                  size="small"
                                  sx={actionIconSx}
                                  disabled={!isFound || rowBusy}
                                  onClick={() => void handlePullOrView(req)}
                                >
                                  {rowBusy ? (
                                    <CircularProgress size={16} sx={{ color: 'rgba(255,255,255,0.8)' }} />
                                  ) : alreadyReceived ? (
                                    <VisibilityIcon fontSize="small" />
                                  ) : (
                                    <DownloadIcon fontSize="small" />
                                  )}
                                </Button>
                              </span>
                            </Tooltip>
                            <Tooltip title={t('consumptionPage.tooltips.sendFeedback')}>
                              <span>
                                <Button
                                  size="small"
                                  sx={actionIconSx}
                                  disabled={!feedbackAllowed}
                                  onClick={() => setStatusDialogRequest(req)}
                                >
                                  <RateReviewIcon fontSize="small" />
                                </Button>
                              </span>
                            </Tooltip>
                          </Box>
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
              count={filteredRequests.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={(_, p) => setPage(p)}
              onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
            />
          </>
        )}
      </CcmTablePaper>

      <RequestCertificateDialog
        open={requestDialogOpen}
        onClose={() => setRequestDialogOpen(false)}
        onSuccess={handleRequestSuccess}
      />

      <SendStatusDialog
        open={!!statusDialogRequest}
        request={statusDialogRequest}
        onClose={() => setStatusDialogRequest(null)}
        onSuccess={handleStatusSuccess}
      />

      <RequestHistoryDialog
        open={!!historyRequest}
        request={historyRequest}
        onClose={() => setHistoryRequest(null)}
      />

      <OutboundRequestDetailDialog
        open={!!detailRequest}
        request={detailRequest}
        onClose={() => setDetailRequest(null)}
        alreadyReceived={!!detailRequest?.documentId && receivedMap.has(detailRequest.documentId)}
        localStatus={detailRequest?.documentId ? receivedMap.get(detailRequest.documentId) : undefined}
        pullBusy={detailRequest !== null && busyRowId === detailRequest.id}
        onPullOrView={(req) => void handlePullOrView(req)}
        onHistory={(req) => setHistoryRequest(req)}
        onFeedback={(req) => setStatusDialogRequest(req)}
      />

      <CertificatePDFViewer
        open={viewer.open}
        certificate={viewer.certificate}
        pdfBase64Override={viewer.base64}
        onClose={() => setViewer((v) => ({ ...v, open: false }))}
        onInfo={handleViewerInfo}
      />

      <CertificateInfoPanel
        open={infoPanelOpen}
        certificate={infoCertificate}
        onClose={() => setInfoPanelOpen(false)}
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

export default CcmConsumption;
