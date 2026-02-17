/********************************************************************************
 * Eclipse Tractus-X - Industry Core Hub Frontend
 *
 * Copyright (c) 2025 Contributors to the Eclipse Foundation
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
 * License for the specific language govern in permissions and limitations
 * under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 ********************************************************************************/

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Chip,
  Paper,
  Grid2,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  Snackbar
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DownloadIcon from '@mui/icons-material/Download';
import ShareIcon from '@mui/icons-material/Share';
import SendIcon from '@mui/icons-material/Send';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import { Certificate, SharingRecord } from '../types/types';
import { fetchCertificateById, revokeShare } from '../api';
import { certificateManagementConfig } from '../config';
import { ShareCertificateDialog } from '../components/dialogs/ShareCertificateDialog';
import { DeleteCertificateDialog } from '../components/dialogs/DeleteCertificateDialog';
import LoadingSpinner from '@/components/general/LoadingSpinner';

/**
 * Certificate Detail Page
 * Displays full certificate information, attached file, and sharing history
 */
const CertificateDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // State
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog states
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareMethod, setShareMethod] = useState<'PULL' | 'PUSH'>('PULL');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Snackbar state
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });

  /**
   * Load certificate data
   */
  const loadCertificate = useCallback(async () => {
    if (!id) return;

    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchCertificateById(id);
      if (data) {
        setCertificate(data);
      } else {
        setError('Certificate not found');
      }
    } catch (err) {
      console.error('Error loading certificate:', err);
      setError('Failed to load certificate details');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadCertificate();
  }, [loadCertificate]);

  /**
   * Get status chip color
   */
  const getStatusColor = (status: string) => {
    const config = certificateManagementConfig.statusConfig[status as keyof typeof certificateManagementConfig.statusConfig];
    return config?.color || '#666';
  };

  /**
   * Get certificate type label
   */
  const getCertificateTypeLabel = (type: string) => {
    const typeConfig = certificateManagementConfig.certificateTypes.find(t => t.value === type);
    return typeConfig?.label || type;
  };

  /**
   * Format date for display
   */
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  /**
   * Handle back navigation
   */
  const handleBack = () => {
    navigate('/certificates');
  };

  /**
   * Handle download document
   */
  const handleDownload = () => {
    if (certificate?.documentUrl) {
      window.open(certificate.documentUrl, '_blank');
    } else if (certificate?.documentBase64) {
      // Create download from base64
      const link = document.createElement('a');
      link.href = `data:application/pdf;base64,${certificate.documentBase64}`;
      link.download = `${certificate.name}.pdf`;
      link.click();
    } else {
      setSnackbar({ open: true, message: 'No document available for download', severity: 'error' });
    }
  };

  /**
   * Handle share certificate (Pull method)
   */
  const handleSharePull = () => {
    setShareMethod('PULL');
    setShareDialogOpen(true);
  };

  /**
   * Handle send certificate (Push method)
   */
  const handleSendPush = () => {
    setShareMethod('PUSH');
    setShareDialogOpen(true);
  };

  /**
   * Handle share submission
   */
  const handleShareSubmit = async (_certificateId: string, _partnerBpn: string, _method: 'PULL' | 'PUSH') => {
    // TODO: Implement share logic
    setSnackbar({ open: true, message: 'Certificate shared successfully!', severity: 'success' });
    setShareDialogOpen(false);
    loadCertificate();
  };

  /**
   * Handle delete certificate
   */
  const handleDelete = () => {
    setDeleteDialogOpen(true);
  };

  /**
   * Handle delete confirmation
   */
  const handleDeleteConfirm = async (_certificateId: string) => {
    // TODO: Implement delete logic
    setSnackbar({ open: true, message: 'Delete functionality not yet available.', severity: 'error' });
    setDeleteDialogOpen(false);
  };

  /**
   * Handle revoke share
   */
  const handleRevokeShare = async (shareId: string) => {
    if (!certificate) return;

    try {
      await revokeShare(certificate.id, shareId);
      setSnackbar({ open: true, message: 'Share revoked successfully!', severity: 'success' });
      loadCertificate();
    } catch (err) {
      console.error('Error revoking share:', err);
      setSnackbar({ open: true, message: 'Failed to revoke share.', severity: 'error' });
    }
  };

  /**
   * Get method chip color
   */
  const getMethodColor = (method: 'PULL' | 'PUSH') => {
    return method === 'PULL' ? '#2196f3' : '#ff9800';
  };

  /**
   * Get share status chip color
   */
  const getShareStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return '#4caf50';
      case 'Pending': return '#ff9800';
      case 'Revoked': return '#f44336';
      default: return '#666';
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error || !certificate) {
    return (
      <Box sx={{ p: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
          sx={{ mb: 2, textTransform: 'none' }}
        >
          Back to list
        </Button>
        <Alert severity="error">{error || 'Certificate not found'}</Alert>
      </Box>
    );
  }

  return (
    <Box className="certificate-detail" sx={{ p: 3 }}>
      {/* Back Link */}
      <Button
        variant="text"
        startIcon={<ArrowBackIcon />}
        onClick={handleBack}
        sx={{ mb: 3, textTransform: 'none', color: 'info.main' }}
      >
        Back to list
      </Button>

      {/* Header: Certificate Name + Status */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Typography variant="h5" fontWeight={500} sx={{ color: 'white' }}>
          {certificate.name}
        </Typography>
        <Chip
          label={certificate.status.charAt(0).toUpperCase() + certificate.status.slice(1)}
          size="medium"
          sx={{
            backgroundColor: getStatusColor(certificate.status),
            color: 'white',
            fontWeight: 600,
            borderRadius: 1,
            px: 1
          }}
        />
      </Box>

      {/* Main Content: Two Columns */}
      <Grid2 container spacing={3}>
        {/* Left Column: Certificate Information */}
        <Grid2 size={{ xs: 12, md: 7 }}>
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>
              Certificate Information
            </Typography>

            <Grid2 container spacing={2.5}>
              <Grid2 size={3}>
                <Typography variant="body2" color="text.secondary">Type:</Typography>
              </Grid2>
              <Grid2 size={9}>
                <Typography variant="body2">{getCertificateTypeLabel(certificate.type)}</Typography>
              </Grid2>

              <Grid2 size={3}>
                <Typography variant="body2" color="text.secondary">Issuer:</Typography>
              </Grid2>
              <Grid2 size={9}>
                <Typography variant="body2">{certificate.issuer}</Typography>
              </Grid2>

              <Grid2 size={3}>
                <Typography variant="body2" color="text.secondary">BPN:</Typography>
              </Grid2>
              <Grid2 size={9}>
                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{certificate.bpn}</Typography>
              </Grid2>

              <Grid2 size={3}>
                <Typography variant="body2" color="text.secondary">Valid From:</Typography>
              </Grid2>
              <Grid2 size={9}>
                <Typography variant="body2">{formatDate(certificate.validFrom)}</Typography>
              </Grid2>

              <Grid2 size={3}>
                <Typography variant="body2" color="text.secondary">Valid Until:</Typography>
              </Grid2>
              <Grid2 size={9}>
                <Typography variant="body2">{formatDate(certificate.validUntil)}</Typography>
              </Grid2>

              <Grid2 size={3}>
                <Typography variant="body2" color="text.secondary">Description:</Typography>
              </Grid2>
              <Grid2 size={9}>
                <Typography variant="body2" sx={{ color: certificate.description ? 'text.primary' : 'text.disabled' }}>
                  {certificate.description || 'No description provided'}
                </Typography>
              </Grid2>
            </Grid2>
          </Paper>
        </Grid2>

        {/* Right Column: Attached File + Actions */}
        <Grid2 size={{ xs: 12, md: 5 }}>
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>
              Attached File
            </Typography>

            <Grid2 container spacing={2}>
              {/* File Preview */}
              <Grid2 size={7}>
                <Box
                  sx={{
                    backgroundColor: '#f5f5f5',
                    borderRadius: 2,
                    p: 4,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: 180
                  }}
                >
                  <DescriptionOutlinedIcon sx={{ fontSize: 48, color: '#90caf9', mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    certificate.pdf
                  </Typography>
                </Box>
              </Grid2>

              {/* Action Buttons */}
              <Grid2 size={5}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Button
                    variant="outlined"
                    startIcon={<DownloadIcon />}
                    onClick={handleDownload}
                    fullWidth
                    sx={{ textTransform: 'none', justifyContent: 'flex-start' }}
                  >
                    Download
                  </Button>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<ShareIcon />}
                    onClick={handleSharePull}
                    fullWidth
                    sx={{ textTransform: 'none', justifyContent: 'flex-start' }}
                  >
                    Share (Pull)
                  </Button>
                  <Button
                    variant="contained"
                    color="warning"
                    startIcon={<SendIcon />}
                    onClick={handleSendPush}
                    fullWidth
                    sx={{ textTransform: 'none', justifyContent: 'flex-start' }}
                  >
                    Send (Push)
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<DeleteOutlineIcon />}
                    onClick={handleDelete}
                    fullWidth
                    sx={{ textTransform: 'none', justifyContent: 'flex-start' }}
                  >
                    Delete
                  </Button>
                </Box>
              </Grid2>
            </Grid2>
          </Paper>
        </Grid2>
      </Grid2>

      {/* Sharing History Table */}
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, mt: 3 }}>
        <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>
          Sharing History
        </Typography>

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f9ff' }}>
                <TableCell sx={{ fontWeight: 600, color: 'primary.main' }}>Shared With (BPN)</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'primary.main' }}>Company Name</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'primary.main' }}>Shared Date</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'primary.main' }}>Method</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'primary.main' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'primary.main' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {certificate.sharingRecords && certificate.sharingRecords.length > 0 ? (
                certificate.sharingRecords.map((record: SharingRecord) => (
                  <TableRow key={record.id} hover>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                      {record.partnerBpn}
                    </TableCell>
                    <TableCell>{record.partnerName || '-'}</TableCell>
                    <TableCell>{formatDate(record.sharedDate)}</TableCell>
                    <TableCell>
                      <Chip
                        label={record.method}
                        size="small"
                        sx={{
                          backgroundColor: `${getMethodColor(record.method)}20`,
                          color: getMethodColor(record.method),
                          fontWeight: 500,
                          fontSize: '0.75rem'
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={record.status}
                        size="small"
                        sx={{
                          backgroundColor: `${getShareStatusColor(record.status)}20`,
                          color: getShareStatusColor(record.status),
                          fontWeight: 500,
                          fontSize: '0.75rem'
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      {record.status === 'Active' && (
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          onClick={() => handleRevokeShare(record.id)}
                          sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                        >
                          Revoke
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    This certificate has not been shared yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Dialogs */}
      <ShareCertificateDialog
        open={shareDialogOpen}
        onClose={() => setShareDialogOpen(false)}
        certificate={certificate}
        onShare={handleShareSubmit}
        defaultMethod={shareMethod}
      />

      <DeleteCertificateDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        certificate={certificate}
        onConfirm={handleDeleteConfirm}
      />

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CertificateDetail;
