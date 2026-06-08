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

import { Box, Button, Chip, Divider, Typography } from '@mui/material';
import ArticleIcon from '@mui/icons-material/Article';
import { CcmDialog } from '@/features/ccm-kit/shared-components';

import { ccmSharedConfig } from '../../config';
import { OutboundRequestItem, OutboundRequestStatus } from '../../types/types';

interface ReceivedCertificateViewerDialogProps {
  open: boolean;
  onClose: () => void;
  /** Base64-encoded PDF content (without the data: prefix). */
  documentBase64: string | null;
  /** The outbound request that was fulfilled — provides metadata for the header. */
  request: OutboundRequestItem | null;
}

const typeLabel = (value: string) =>
  ccmSharedConfig.certificateTypes.find((t) => t.value === value)?.label ?? value;

const statusColor = (status: OutboundRequestStatus): 'success' | 'warning' | 'error' | 'default' => {
  if (status === 'Found') return 'success';
  if (status === 'Pending') return 'warning';
  if (status === 'Failed') return 'error';
  return 'default';
};

const MetaField = ({ label, value }: { label: string; value: string }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
    <Typography
      variant="caption"
      sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.65rem', fontWeight: 600 }}
    >
      {label}
    </Typography>
    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem', wordBreak: 'break-all' }}>
      {value}
    </Typography>
  </Box>
);

const ReceivedCertificateViewerDialog = ({
  open,
  onClose,
  documentBase64,
  request,
}: ReceivedCertificateViewerDialogProps) => {
  const certType = request ? typeLabel(request.certificateType) : 'Certificate';

  return (
    <CcmDialog
      open={open}
      onClose={onClose}
      title={certType}
      subtitle={request ? `Certified: ${request.certifiedBpn}` : undefined}
      icon={<ArticleIcon />}
      maxWidth="lg"
      fullWidth
      actions={
        <Button onClick={onClose} variant="outlined" sx={{ textTransform: 'none' }}>
          Close
        </Button>
      }
    >
      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
        {/* ── Metadata strip ──────────────────────────────────────────── */}
        {request && (
          <>
            <Box
              sx={{
                px: 3,
                py: 2,
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 2.5,
                backgroundColor: 'grey.50',
                alignItems: 'start',
              }}
            >
              <MetaField label="Provider BPN" value={request.providerBpn} />
              <MetaField label="Certified BPN" value={request.certifiedBpn} />
              {request.documentId && (
                <MetaField label="Document ID" value={request.documentId} />
              )}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                <Typography
                  variant="caption"
                  sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.65rem', fontWeight: 600 }}
                >
                  Status
                </Typography>
                <Chip
                  label={request.status}
                  size="small"
                  color={statusColor(request.status)}
                  sx={{ fontWeight: 600, width: 'fit-content' }}
                />
              </Box>
            </Box>
            <Divider />
          </>
        )}

        {/* ── PDF viewer ──────────────────────────────────────────────── */}
        <Box sx={{ height: '70vh' }}>
          {documentBase64 ? (
            <Box
              component="iframe"
              title={certType}
              src={`data:application/pdf;base64,${documentBase64}`}
              sx={{ width: '100%', height: '100%', border: 'none' }}
            />
          ) : (
            <Box
              sx={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography variant="body2" color="text.secondary">
                No document content available for this certificate.
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </CcmDialog>
  );
};

export default ReceivedCertificateViewerDialog;
