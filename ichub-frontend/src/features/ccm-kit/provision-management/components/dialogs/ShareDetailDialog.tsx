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

import { Box, Button, Chip, Divider, Paper, Stack, Typography } from '@mui/material';
import ShareIcon from '@mui/icons-material/Share';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import { CcmDialog } from '@/features/ccm-kit/shared-components';

import { ccmSharedConfig } from '../../config';
import { ShareItem, ShareStatus } from '../../types/types';

interface ShareDetailDialogProps {
  open: boolean;
  share: ShareItem | null;
  onClose: () => void;
}

interface ParsedRejectionReason {
  certificateErrors?: string[];
  locationErrors?: Array<Record<string, string[]>>;
}

const parseRejectionReason = (raw?: string | null): ParsedRejectionReason | null => {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ParsedRejectionReason;
  } catch {
    return null;
  }
};

const typeLabel = (value: string) =>
  ccmSharedConfig.certificateTypes.find((t) => t.value === value)?.label ?? value;

const statusChipSx = (status: ShareStatus) => {
  switch (status) {
    case 'Active':
      return { backgroundColor: 'rgba(76,175,80,0.12)', color: '#2e7d32', border: '1px solid rgba(76,175,80,0.35)' };
    case 'Revoked':
      return { backgroundColor: 'rgba(244,67,54,0.12)', color: '#c62828', border: '1px solid rgba(244,67,54,0.35)' };
    case 'Pending':
      return { backgroundColor: 'rgba(157,111,212,0.12)', color: '#6a1b9a', border: '1px solid rgba(157,111,212,0.35)' };
    default:
      return {};
  }
};

const formatDate = (d?: string | null) =>
  d ? new Date(d).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

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

const ShareDetailDialog = ({ open, share, onClose }: ShareDetailDialogProps) => {
  if (!share) return null;

  const rejection = parseRejectionReason(share.rejectionReason);
  const hasCertErrors = rejection?.certificateErrors && rejection.certificateErrors.length > 0;
  const hasLocErrors = rejection?.locationErrors && rejection.locationErrors.length > 0;

  return (
    <CcmDialog
      open={open}
      onClose={onClose}
      title="Share Details"
      subtitle={`Share #${share.shareId} · ${typeLabel(share.certificateType)}`}
      icon={<ShareIcon />}
      maxWidth="md"
      fullWidth
      actions={
        <Button onClick={onClose} variant="outlined" sx={{ textTransform: 'none' }}>
          Close
        </Button>
      }
    >
      <Box sx={{ p: 3 }}>
        {/* Status */}
        <Box sx={{ mb: 3 }}>
          <Chip label={share.status} sx={{ fontWeight: 600, ...statusChipSx(share.status) }} />
        </Box>

        {/* Main info grid */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2.5, mb: 3 }}>
          <InfoField label="Provider BPN" value={share.providerBpnl} mono />
          <InfoField label="Consumer BPN" value={share.consumerBpnl} mono />
          <InfoField label="Certificate Type" value={typeLabel(share.certificateType)} />
          <InfoField label="Certificate ID" value={String(share.certificateId)} />
          <InfoField label="Last Shared" value={formatDate(share.lastSharedDate)} />
          <InfoField label="Created" value={formatDate(share.createdAt)} />
        </Box>

        {/* Rejection reason — shown when present */}
        {(hasCertErrors || hasLocErrors || (share.rejectionReason && !rejection)) && (
          <>
            <Divider sx={{ mb: 3 }} />

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 2.5, color: 'error.main' }}>
              <ErrorOutlineIcon fontSize="small" />
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Rejection Reason
              </Typography>
            </Box>

            {hasCertErrors && (
              <Box sx={{ mb: 2.5 }}>
                <Typography
                  variant="caption"
                  sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.65rem', fontWeight: 600, display: 'block', mb: 1 }}
                >
                  Certificate Errors
                </Typography>
                <Paper variant="outlined" sx={{ borderColor: 'error.light', overflow: 'hidden' }}>
                  {rejection!.certificateErrors!.map((err, idx) => (
                    <Box
                      key={idx}
                      sx={{
                        px: 2,
                        py: 1.25,
                        '&:not(:last-child)': { borderBottom: '1px solid', borderColor: 'divider' },
                      }}
                    >
                      <Typography variant="body2" color="error.dark">
                        {err}
                      </Typography>
                    </Box>
                  ))}
                </Paper>
              </Box>
            )}

            {hasLocErrors && (
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                  <LocationOnIcon sx={{ fontSize: '0.85rem', color: 'text.secondary' }} />
                  <Typography
                    variant="caption"
                    sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.65rem', fontWeight: 600 }}
                  >
                    Location Errors
                  </Typography>
                </Box>
                <Stack spacing={1}>
                  {rejection!.locationErrors!.map((locEntry, idx) => {
                    const entries = Object.entries(locEntry);
                    const [bpn, errors] = entries[0] ?? ['', []];
                    return (
                      <Paper key={idx} variant="outlined" sx={{ borderColor: 'warning.light', overflow: 'hidden' }}>
                        <Box
                          sx={{
                            px: 2,
                            py: 1,
                            backgroundColor: 'rgba(255,152,0,0.06)',
                            borderBottom: '1px solid',
                            borderColor: 'warning.light',
                          }}
                        >
                          <Typography
                            variant="caption"
                            sx={{ fontFamily: 'monospace', fontWeight: 700, color: 'warning.dark' }}
                          >
                            {bpn || '—'}
                          </Typography>
                        </Box>
                        {(errors ?? []).map((err: string, eIdx: number) => (
                          <Box
                            key={eIdx}
                            sx={{
                              px: 2,
                              py: 1,
                              '&:not(:last-child)': { borderBottom: '1px solid', borderColor: 'divider' },
                            }}
                          >
                            <Typography variant="body2">{err}</Typography>
                          </Box>
                        ))}
                      </Paper>
                    );
                  })}
                </Stack>
              </Box>
            )}

            {/* Raw fallback if JSON parse failed */}
            {share.rejectionReason && !rejection && (
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                  Raw payload
                </Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all', fontSize: '0.78rem' }}>
                  {share.rejectionReason}
                </Typography>
              </Box>
            )}
          </>
        )}
      </Box>
    </CcmDialog>
  );
};

export default ShareDetailDialog;
