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

import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

import { fetchRequestsHistory } from '../../api';
import { OutboundRequestItem } from '../../types/types';

interface RequestHistoryDialogProps {
  open: boolean;
  request: OutboundRequestItem | null;
  onClose: () => void;
}

const formatDateTime = (d?: string | null) =>
  d ? new Date(d).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

const RequestHistoryDialog = ({ open, request, onClose }: RequestHistoryDialogProps) => {
  const [history, setHistory] = useState<OutboundRequestItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !request) return;
    let active = true;
    setLoading(true);
    setError(null);
    fetchRequestsHistory({
      providerBpn: request.providerBpn,
      certifiedBpn: request.certifiedBpn,
      certificateType: request.certificateType,
    })
      .then((items) => active && setHistory(items))
      .catch(() => active && setError('Failed to load request history.'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [open, request]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        Request History
        <IconButton onClick={onClose} aria-label="close">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {request && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {request.certificateType} · provider{' '}
            <Box component="span" sx={{ fontFamily: 'monospace' }}>
              {request.providerBpn}
            </Box>{' '}
            · certified{' '}
            <Box component="span" sx={{ fontFamily: 'monospace' }}>
              {request.certifiedBpn}
            </Box>
          </Typography>
        )}

        {loading ? (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <CircularProgress size={28} />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : history.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
            No history records found.
          </Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                {['Status', 'Notification ID', 'Document ID', 'Requested', 'Updated'].map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 600 }}>
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {history.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.status}</TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                    {item.notificationId ?? '—'}
                  </TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                    {item.documentId ?? '—'}
                  </TableCell>
                  <TableCell>{formatDateTime(item.requestedAt)}</TableCell>
                  <TableCell>{formatDateTime(item.updatedAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default RequestHistoryDialog;
