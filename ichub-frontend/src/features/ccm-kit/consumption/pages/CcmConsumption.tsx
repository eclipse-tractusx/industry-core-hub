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
  CircularProgress,
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
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import AddIcon from '@mui/icons-material/Add';
import HistoryIcon from '@mui/icons-material/History';
import { RefreshButton, PrimaryActionButton } from '@/features/ccm-kit/shared-components';
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
} from '../types/types';
import RequestCertificateDialog from '../components/dialogs/RequestCertificateDialog';
import SendStatusDialog from '../components/dialogs/SendStatusDialog';
import ReceivedCertificateViewerDialog from '../components/dialogs/ReceivedCertificateViewerDialog';
import RequestHistoryDialog from '../components/dialogs/RequestHistoryDialog';

const ROWS_PER_PAGE = 10;

const formatDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

const typeLabel = (value: string) =>
  ccmSharedConfig.certificateTypes.find((t) => t.value === value)?.label ?? value;

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

/** Best-effort extraction of the base64 PDF from a pulled certificate payload. */
const extractBase64 = (data: Record<string, unknown> | null | undefined): string | null => {
  if (!data) return null;
  const doc = (data as { document?: Record<string, unknown> }).document;
  return (
    (doc?.contentBase64 as string | undefined) ??
    (doc?.documentContent as string | undefined) ??
    ((data as { documentBase64?: string }).documentBase64) ??
    null
  );
};

const CcmConsumption = () => {
  const [requests, setRequests] = useState<OutboundRequestItem[]>([]);
  const [receivedDocIds, setReceivedDocIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [busyRowId, setBusyRowId] = useState<number | null>(null);

  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [statusDialogRequest, setStatusDialogRequest] = useState<OutboundRequestItem | null>(null);
  const [historyRequest, setHistoryRequest] = useState<OutboundRequestItem | null>(null);
  const [viewer, setViewer] = useState<{ open: boolean; base64: string | null; req: OutboundRequestItem | null }>({
    open: false,
    base64: null,
    req: null,
  });
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
      setReceivedDocIds(new Set(received.map((r) => r.documentId)));
    } catch {
      setError('Failed to load certificate requests.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const visibleRows = useMemo(
    () => requests.slice(page * ROWS_PER_PAGE, (page + 1) * ROWS_PER_PAGE),
    [requests, page],
  );

  const openViewer = (req: OutboundRequestItem, base64: string | null) =>
    setViewer({ open: true, base64, req });

  // PULL or VIEW depending on whether the document was already downloaded.
  const handlePullOrView = async (req: OutboundRequestItem) => {
    if (!req.documentId) return;
    setBusyRowId(req.id);
    try {
      const alreadyReceived = receivedDocIds.has(req.documentId);
      if (alreadyReceived) {
        const detail = await fetchReceivedDetail(req.documentId, req.providerBpn);
        openViewer(req, detail?.documentBase64 ?? null);
        return;
      }
      const pulled = await pullCertificate({
        providerBpn: req.providerBpn,
        documentId: req.documentId,
        governance: CCM_POLICY_GOVERNANCE,
      });
      setReceivedDocIds((prev) => new Set(prev).add(req.documentId!));
      openViewer(req, extractBase64(pulled.certificateData));
      notify('Certificate pulled successfully.');
    } catch {
      notify('Failed to pull the certificate.', 'error');
    } finally {
      setBusyRowId(null);
    }
  };

  const handleStatusSuccess = (status: CertificateStatusValue) => {
    setStatusDialogRequest(null);
    notify(`Feedback "${status}" sent to the provider.`);
    void loadData();
  };

  const handleRequestSuccess = (messageId?: string | null) => {
    setRequestDialogOpen(false);
    notify(messageId ? `Request sent (messageId: ${messageId}).` : 'Request sent.');
    void loadData();
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: { xs: 2, sm: 3, md: 4 } }}>
      <Box sx={{ mb: 4 }}>
        <PageSectionHeader
          icon={<ShoppingCartIcon />}
          title="CCM Consumption"
          subtitle="Request, track, download and review compliance certificates from your Catena-X partners."
          kitTheme={kitThemes.ccm}
          actions={
            <>
              <RefreshButton onClick={() => void loadData()} loading={isLoading} />
              <PrimaryActionButton startIcon={<AddIcon />} onClick={() => setRequestDialogOpen(true)}>
                New Request
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

      <Paper sx={{ display: 'flex', flexDirection: 'column', backgroundColor: '#1a2332', borderRadius: 3, overflow: 'hidden', flex: 1 }}>
        {requests.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)' }}>
              No certificate requests yet. Use "New Request" to ask a provider for a certificate.
            </Typography>
          </Box>
        ) : (
          <>
            <TableContainer sx={{ flex: 1, overflow: 'auto' }}>
              <Table size="small" stickyHeader sx={{ '& .MuiTableCell-root': { borderColor: 'rgba(255,255,255,0.08)' } }}>
                <TableHead>
                  <TableRow>
                    {['Provider', 'Certified BPN', 'Type', 'Locations', 'Status', 'Updated', 'Actions'].map((h) => (
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
                  {visibleRows.map((req) => {
                    const isFound = req.status === 'Found' && !!req.documentId;
                    const alreadyReceived = !!req.documentId && receivedDocIds.has(req.documentId);
                    const rowBusy = busyRowId === req.id;
                    return (
                      <TableRow key={req.id} sx={{ '&:hover': { backgroundColor: 'rgba(255,255,255,0.04)' } }}>
                        <TableCell>
                          <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'rgba(255,255,255,0.7)' }}>
                            {req.providerBpn}
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
                            {req.locationBpns?.length ? `${req.locationBpns.length} site(s)` : '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={req.status} size="small" sx={{ fontWeight: 600, fontSize: '0.7rem', ...statusChipSx(req.status) }} />
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                            {formatDate(req.updatedAt)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <Tooltip title="View history">
                              <span>
                                <Button size="small" sx={actionIconSx} onClick={() => setHistoryRequest(req)}>
                                  <HistoryIcon fontSize="small" />
                                </Button>
                              </span>
                            </Tooltip>
                            <Tooltip title={alreadyReceived ? 'View certificate' : 'Pull certificate'}>
                              <span>
                                <Button
                                  size="small"
                                  sx={actionIconSx}
                                  disabled={!isFound || rowBusy}
                                  onClick={() => void handlePullOrView(req)}
                                >
                                  {rowBusy ? (
                                    <CircularProgress size={16} />
                                  ) : alreadyReceived ? (
                                    <VisibilityIcon fontSize="small" />
                                  ) : (
                                    <DownloadIcon fontSize="small" />
                                  )}
                                </Button>
                              </span>
                            </Tooltip>
                            <Tooltip title="Send feedback">
                              <span>
                                <Button
                                  size="small"
                                  sx={actionIconSx}
                                  disabled={!isFound}
                                  onClick={() => setStatusDialogRequest(req)}
                                >
                                  <RateReviewIcon fontSize="small" />
                                </Button>
                              </span>
                            </Tooltip>
                          </Box>
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
              count={requests.length}
              rowsPerPage={ROWS_PER_PAGE}
              page={page}
              onPageChange={(_, p) => setPage(p)}
              sx={{ color: 'rgba(255,255,255,0.9)', borderTop: '1px solid rgba(255,255,255,0.08)', '& .MuiTablePagination-displayedRows': { color: 'rgba(255,255,255,0.9)' }, '& .MuiIconButton-root': { color: 'rgba(255,255,255,0.9)' }, '& .MuiIconButton-root.Mui-disabled': { color: 'rgba(255,255,255,0.2)' } }}
            />
          </>
        )}
      </Paper>

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

      <ReceivedCertificateViewerDialog
        open={viewer.open}
        request={viewer.req}
        documentBase64={viewer.base64}
        onClose={() => setViewer((v) => ({ ...v, open: false }))}
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
