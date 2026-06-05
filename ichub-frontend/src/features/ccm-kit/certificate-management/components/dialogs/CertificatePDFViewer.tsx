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

import { useState, useEffect } from 'react';
import {
  Dialog,
  Box,
  Typography,
  IconButton,
  Button,
  Chip,
  Divider,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PublishIcon from '@mui/icons-material/Publish';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { Certificate } from '../../types/types';
import { certificateManagementConfig } from '../../config';
import { fetchCertificateDetail } from '../../api';

interface CertificatePDFViewerProps {
  open: boolean;
  certificate: Certificate | null;
  onClose: () => void;
  onPublish: (certificate: Certificate) => void;
  onUpdate: (certificate: Certificate) => void;
  onDelete: (certificate: Certificate) => void;
  onInfo: (certificate: Certificate) => void;
}

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

const getStatusColor = (status: string) => {
  const config =
    certificateManagementConfig.statusConfig[
      status as keyof typeof certificateManagementConfig.statusConfig
    ];
  return config?.color || '#888';
};

export const CertificatePDFViewer = ({
  open,
  certificate,
  onClose,
  onPublish,
  onUpdate,
  onDelete,
  onInfo,
}: CertificatePDFViewerProps) => {
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);

  useEffect(() => {
    if (!open || !certificate) return;
    setIsLoadingPdf(true);
    setPdfBase64(null);
    fetchCertificateDetail(certificate.id)
      .then((detail) => {
        setPdfBase64(detail?.document?.documentContent ?? null);
      })
      .catch(() => setPdfBase64(null))
      .finally(() => setIsLoadingPdf(false));
  }, [open, certificate?.id]);

  if (!certificate) return null;

  const statusColor = getStatusColor(certificate.status);
  const typeLabel =
    certificateManagementConfig.certificateTypes.find((t) => t.value === certificate.type)
      ?.label ?? certificate.type;

  const pdfSrc = pdfBase64 ? `data:application/pdf;base64,${pdfBase64}` : null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen
      PaperProps={{
        sx: {
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 0,
        },
      }}
    >
      {/* ── Header bar ───────────────────────────────────────────────────── */}
      <Box
        sx={{
          flexShrink: 0,
          backgroundColor: 'primary.main',
          px: { xs: 2, md: 3 },
          py: 1.5,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
        }}
      >
        {/* Info button */}
        <Tooltip title="Certificate details">
          <IconButton
            size="small"
            onClick={() => onInfo(certificate)}
            sx={{ color: 'rgba(255,255,255,0.7)', flexShrink: 0, '&:hover': { color: '#fff', backgroundColor: 'rgba(255,255,255,0.12)' } }}
          >
            <InfoOutlinedIcon />
          </IconButton>
        </Tooltip>

        {/* Certificate info */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <PictureAsPdfIcon sx={{ color: 'rgba(255,255,255,0.8)', fontSize: 20 }} />
            <Typography
              variant="h6"
              sx={{
                color: '#fff',
                fontWeight: 700,
                fontSize: { xs: '0.95rem', md: '1.05rem' },
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: { xs: 160, md: 380 },
              }}
            >
              {certificate.name}
            </Typography>
            <Chip
              label={typeLabel}
              size="small"
              sx={{ backgroundColor: 'rgba(255,255,255,0.2)', color: '#fff', fontWeight: 600, fontSize: '0.7rem' }}
            />
            <Chip
              label={certificate.status}
              size="small"
              sx={{
                backgroundColor: `${statusColor}33`,
                color: '#fff',
                border: `1px solid ${statusColor}66`,
                fontWeight: 600,
                textTransform: 'capitalize',
                fontSize: '0.7rem',
              }}
            />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 0.25, flexWrap: 'wrap' }}>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
              {certificate.issuer}
            </Typography>
            <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255,255,255,0.25)', my: 0.25 }} />
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.65)' }}>
              {formatDate(certificate.validFrom)} – {formatDate(certificate.validUntil)}
            </Typography>
            {certificate.certificateIdentifier && (
              <>
                <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255,255,255,0.25)', my: 0.25 }} />
                <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'rgba(255,255,255,0.55)' }}>
                  {certificate.certificateIdentifier}
                </Typography>
              </>
            )}
          </Box>
        </Box>

        {/* Actions */}
        <Box sx={{ display: 'flex', gap: 1.5, flexShrink: 0, alignItems: 'center' }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<PublishIcon fontSize="small" />}
            disabled={certificate.status === 'expired'}
            onClick={() => onPublish(certificate)}
            sx={{
              borderColor: 'rgba(255,255,255,0.5)',
              color: '#fff',
              textTransform: 'none',
              fontWeight: 500,
              borderRadius: 1.5,
              '&:hover': { borderColor: '#fff', backgroundColor: 'rgba(255,255,255,0.12)' },
              '&.Mui-disabled': { borderColor: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.3)' },
            }}
          >
            Publish
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<RefreshIcon fontSize="small" />}
            onClick={() => onUpdate(certificate)}
            sx={{
              borderColor: 'rgba(129,199,132,0.5)',
              color: '#81c784',
              textTransform: 'none',
              fontWeight: 500,
              borderRadius: 1.5,
              '&:hover': { borderColor: '#81c784', backgroundColor: 'rgba(129,199,132,0.12)', color: '#fff' },
            }}
          >
            Update PDF
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<DeleteOutlineIcon fontSize="small" />}
            onClick={() => onDelete(certificate)}
            sx={{
              borderColor: 'rgba(244,67,54,0.6)',
              color: '#ef9a9a',
              textTransform: 'none',
              fontWeight: 500,
              borderRadius: 1.5,
              '&:hover': { borderColor: '#f44336', backgroundColor: 'rgba(244,67,54,0.12)', color: '#fff' },
            }}
          >
            Delete
          </Button>
          <IconButton
            size="small"
            onClick={onClose}
            sx={{ ml: 0.5, color: '#fff', '&:hover': { backgroundColor: 'rgba(255,255,255,0.15)' } }}
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </Box>

      {/* ── PDF body ─────────────────────────────────────────────────────── */}
      <Box sx={{ flex: 1, overflow: 'hidden', position: 'relative', backgroundColor: '#0f1624' }}>
        {isLoadingPdf ? (
          <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CircularProgress size={48} sx={{ color: 'rgba(255,255,255,0.4)' }} />
          </Box>
        ) : pdfSrc ? (
          <Box
            component="iframe"
            src={pdfSrc}
            title={certificate.name}
            sx={{
              width: '100%',
              height: '100%',
              border: 'none',
              display: 'block',
            }}
          />
        ) : (
          <Box
            sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
            }}
          >
            <PictureAsPdfIcon sx={{ fontSize: 64, color: 'rgba(255,255,255,0.12)' }} />
            <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>
              No PDF attached
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.25)', maxWidth: 360, textAlign: 'center' }}>
              This certificate does not have a PDF document linked. You can still share or manage
              it using the buttons above.
            </Typography>
            {/* Metadata summary */}
            <Box
              sx={{
                mt: 2,
                p: 3,
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.08)',
                backgroundColor: 'rgba(255,255,255,0.03)',
                minWidth: 320,
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
              }}
            >
              {[
                { label: 'Name', value: certificate.name },
                { label: 'Type', value: typeLabel },
                { label: 'Issuer', value: certificate.issuer },
                { label: 'BPN', value: certificate.bpn },
                { label: 'Valid From', value: formatDate(certificate.validFrom) },
                { label: 'Valid Until', value: formatDate(certificate.validUntil) },
                ...(certificate.certificateIdentifier
                  ? [{ label: 'Certificate ID', value: certificate.certificateIdentifier }]
                  : []),
              ].map(({ label, value }) => (
                <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0 }}>
                    {label}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.75)', textAlign: 'right' }}>
                    {value}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </Box>
    </Dialog>
  );
};
