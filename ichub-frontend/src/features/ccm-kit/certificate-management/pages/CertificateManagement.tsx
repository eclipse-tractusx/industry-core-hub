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

import { getParticipantId } from '@/services/EnvironmentService';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Button, Alert, Snackbar } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import {
  Certificate,
  CertificateStats,
  CertificateFilter,
  CertificateStatus,
} from '../types/types';
import { fetchAllCertificates, createCertificate, deleteCertificate, shareCertificate, updateCertificateDocument } from '../api';
import { CertificateTable } from '../components/certificate-list/CertificateTable';
import { CertificateCardGrid } from '../components/certificate-list/CertificateCardGrid';
import { SummaryStatsBar } from '../components/summary/SummaryStatsBar';
import { SearchFilterBar } from '../components/filters/SearchFilterBar';
import { UploadCertificateDialog } from '../components/dialogs/UploadCertificateDialog';
import { ShareCertificateDialog } from '../components/dialogs/ShareCertificateDialog';
import { DeleteCertificateDialog } from '../components/dialogs/DeleteCertificateDialog';
import { UpdatePdfDialog } from '../components/dialogs/UpdatePdfDialog';
import { CertificatePDFViewer } from '../components/dialogs/CertificatePDFViewer';
import { CertificateInfoPanel } from '../components/dialogs/CertificateInfoPanel';
import { DiscoverPartnerDialog } from '../components/dialogs/DiscoverPartnerDialog';
import PageSectionHeader from '@/components/common/PageSectionHeader';
import { kitThemes } from '@/theme/colors';
import LoadingSpinner from '@/components/general/LoadingSpinner';

// Backend model to frontend model mapper
const mapBackendToFrontendCertificate = (backendCert: any): Certificate => {
  const today = new Date();
  const validUntil = new Date(backendCert.validUntil);
  const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

  let status: CertificateStatus = 'valid';
  if (validUntil <= today) status = 'expired';
  else if (validUntil <= thirtyDaysFromNow) status = 'expiring';

  return {
    id: backendCert.certificateId,
    name: backendCert.certificateName ?? '',
    bpn: backendCert.bpnl,
    type: backendCert.certificateType,
    issuer: backendCert.issuer,
    validFrom: backendCert.validFrom,
    validUntil: backendCert.validUntil ?? '',
    status,
    certificateIdentifier: backendCert.registrationNumber ?? undefined,
    enclosedSitesBpn: (backendCert.sites ?? []).map((s: any) => s.siteBpn),
    description: backendCert.description ?? undefined,
    trustLevel: backendCert.trustLevel ?? undefined,
    areaOfApplication: backendCert.areaOfApplication ?? undefined,
    validator: backendCert.validator ?? undefined,
    uploaderBpnl: backendCert.uploaderBpnl ?? undefined,
    createdAt: backendCert.createdAt ?? '',
    updatedAt: backendCert.updatedAt ?? '',
    dtrStatus: 'not_registered' as const,
    sharedCount: 0,
  };
};

const calculateStats = (certs: Certificate[]): CertificateStats => {
  const today = new Date();
  const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
  return certs.reduce(
    (acc, cert) => {
      const validUntil = new Date(cert.validUntil);
      acc.total++;
      if (validUntil <= today) acc.expired++;
      else if (validUntil <= thirtyDaysFromNow) acc.expiring++;
      else acc.valid++;
      return acc;
    },
    { total: 0, valid: 0, expiring: 0, expired: 0 },
  );
};

const CertificateManagement = () => {
  const { t } = useTranslation('certificateManagement');

  // Data
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [stats, setStats] = useState<CertificateStats>({ total: 0, valid: 0, expiring: 0, expired: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters: text/type/status from SearchFilterBar + status from SummaryStatsBar
  const [filters, setFilters] = useState<CertificateFilter>({ search: '', type: '', status: '', shared: '' });
  const [statusQuickFilter, setStatusQuickFilter] = useState<CertificateStatus | ''>('');

  // View mode
  const [viewMode, setViewMode] = useState<'list' | 'card'>('list');

  // Dialog states
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [discoverDialogOpen, setDiscoverDialogOpen] = useState(false);
  const [updatePdfDialogOpen, setUpdatePdfDialogOpen] = useState(false);
  const [infoPanelOpen, setInfoPanelOpen] = useState(false);
  const [selectedCertificate, setSelectedCertificate] = useState<Certificate | null>(null);
  const [selectedInfoCertificate, setSelectedInfoCertificate] = useState<Certificate | null>(null);

  // Snackbar
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success',
  });

  // Data loading from real API
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Retrieve user's BPN from global variable in index.html
      // If not available, use fallback test value
      const currentBpn = getParticipantId() || 'BPNL00000003CRHK';

      // Call backend with required query parameters
      const rawData = await fetchAllCertificates({
        bpnl: currentBpn,
        certificateType: filters.type || null,
        offset: 0,
        limit: 100,
      });

      // Transform data through mapper before storing in state
      const mappedCertificates = rawData.map(mapBackendToFrontendCertificate);

      setCertificates(mappedCertificates);
      setStats(calculateStats(mappedCertificates));
    } catch (err) {
      console.error('Error loading certificates:', err);
      setError(t('messages.loadFailed'));
    } finally {
      setIsLoading(false);
    }
    // Add filters.type as dependency to re-query API when type changes
  }, [t, filters.type]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Filtering Local (Solo Búsqueda por Texto y Estado de los Botones) ─────
  const filteredCertificates = useMemo(() => {
    return certificates.filter((cert) => {
      // 1. Filtro por caja de texto (Search)
      if (filters.search) {
        const q = filters.search.toLowerCase();
        if (
          !cert.name.toLowerCase().includes(q) &&
          !cert.bpn.toLowerCase().includes(q) &&
          !cert.issuer.toLowerCase().includes(q)
        )
          return false;
      }
      
      // NOTE: Type filter (filters.type) is now resolved directly by the backend API

      // 2. Filtro por Estado (Calculado localmente)
      const effectiveStatus = statusQuickFilter || filters.status;
      if (effectiveStatus && cert.status !== effectiveStatus) return false;
      
      return true;
    });
  }, [certificates, filters.search, filters.status, statusQuickFilter]);

  const handleStatFilterChange = (status: CertificateStatus | '') => {
    setStatusQuickFilter(status);
    setFilters((prev) => ({ ...prev, status: status }));
  };

  const handleFilterBarChange = (newFilters: CertificateFilter) => {
    setFilters(newFilters);
    if (newFilters.status !== statusQuickFilter) {
      setStatusQuickFilter(newFilters.status as CertificateStatus | '');
    }
  };

  // ── Action handlers ───────────────────────────────────────────────────────

  const handleUploadCertificate = async (data: FormData) => {
    try {
      await createCertificate(data);
      setSnackbar({ open: true, message: t('messages.uploadSuccess'), severity: 'success' });
      setUploadDialogOpen(false);
      loadData();
    } catch (err) {
      console.error('Error uploading certificate:', err);
      setSnackbar({ open: true, message: t('messages.uploadFailed'), severity: 'error' });
      throw err;
    }
  };

  const handleShareCertificate = async (certificateId: string, partnerBpn: string, method: 'PULL' | 'PUSH') => {
    try {
      await shareCertificate(certificateId, partnerBpn, method);
      setSnackbar({ open: true, message: t('messages.shareSuccess'), severity: 'success' });
      setShareDialogOpen(false);
      loadData();
    } catch (err) {
      console.error('Error sharing certificate:', err);
      setSnackbar({ open: true, message: t('messages.shareFailed'), severity: 'error' });
    }
  };

  const handleDeleteCertificate = async (certificateId: string) => {
    try {
      await deleteCertificate(certificateId);
      setSnackbar({ open: true, message: t('messages.deleteSuccess'), severity: 'success' });
      setDeleteDialogOpen(false);
      loadData();
    } catch (err) {
      console.error('Error deleting certificate:', err);
      setSnackbar({ open: true, message: t('messages.deleteFailed'), severity: 'error' });
      setDeleteDialogOpen(false);
    }
  };

  const handleView = (certificate: Certificate) => {
    setSelectedCertificate(certificate);
    setPdfViewerOpen(true);
  };

  const handleInfo = (certificate: Certificate) => {
    setSelectedInfoCertificate(certificate);
    setInfoPanelOpen(true);
  };

  const handleShare = (certificate: Certificate) => {
    setSelectedCertificate(certificate);
    setShareDialogOpen(true);
  };

  const handleDelete = (certificate: Certificate) => {
    setSelectedCertificate(certificate);
    setDeleteDialogOpen(true);
  };

  const handleUpdate = (certificate: Certificate) => {
    setSelectedCertificate(certificate);
    setUpdatePdfDialogOpen(true);
  };

  const handleConfirmUpdate = async (certificateId: string, newDocument: File, notifyPartnerBpns: string[]) => {
    try {
      await updateCertificateDocument(certificateId, newDocument);
      if (notifyPartnerBpns.length > 0) {
        await Promise.all(
          notifyPartnerBpns.map((bpn) => shareCertificate(certificateId, bpn, 'PUSH'))
        );
      }
      setSnackbar({ open: true, message: 'PDF updated successfully.', severity: 'success' });
      void loadData();
    } catch (err) {
      console.error('Error updating PDF:', err);
      setSnackbar({ open: true, message: 'Failed to update PDF.', severity: 'error' });
      throw err;
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (isLoading) return <LoadingSpinner />;

  return (
    <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
      {/* Page header */}
      <Box sx={{ mb: 4 }}>
        <PageSectionHeader
          icon={<WorkspacePremiumIcon />}
          title={t('page.title')}
          subtitle={t('page.subtitle')}
          kitTheme={kitThemes.ccm}
          actions={
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
              <Button
                variant="outlined"
                startIcon={<SearchIcon />}
                onClick={() => setDiscoverDialogOpen(true)}
                sx={{
                  borderColor: kitThemes.ccm.gradientEnd,
                  color: kitThemes.ccm.gradientEnd,
                  borderRadius: { xs: '10px', md: '12px' },
                  fontWeight: 600,
                  textTransform: 'none',
                  '&:hover': {
                    borderColor: kitThemes.ccm.gradientEnd,
                    color: kitThemes.ccm.gradientEnd,
                    backgroundColor: 'rgba(245, 158, 11, 0.06)',
                  },
                }}
              >
                Discover Partners
              </Button>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setUploadDialogOpen(true)}
                sx={{
                  background: `linear-gradient(135deg, ${kitThemes.ccm.gradientStart} 0%, ${kitThemes.ccm.gradientEnd} 100%)`,
                  color: '#fff',
                  borderRadius: { xs: '10px', md: '12px' },
                  fontWeight: 600,
                  textTransform: 'none',
                  boxShadow: `0 4px 16px ${kitThemes.ccm.shadowColor}`,
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    filter: 'brightness(1.1)',
                    boxShadow: `0 6px 24px ${kitThemes.ccm.shadowColor}`,
                    transform: 'translateY(-1px)',
                  },
                }}
              >
                {t('page.uploadCertificate')}
              </Button>
            </Box>
          }
        />
      </Box>

      {/* Stats summary */}
      <SummaryStatsBar
        stats={stats}
        activeStatusFilter={statusQuickFilter}
        onFilterByStatus={handleStatFilterChange}
      />

      {/* Search & filters */}
      <SearchFilterBar
        filters={filters}
        onChange={handleFilterBarChange}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* Error banner */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Certificate list / card grid */}
      {viewMode === 'list' ? (
        <CertificateTable
          certificates={filteredCertificates}
          onView={handleView}
          onShare={handleShare}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          onInfo={handleInfo}
        />
      ) : (
        <CertificateCardGrid
          certificates={filteredCertificates}
          onView={handleView}
          onShare={handleShare}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          onInfo={handleInfo}
        />
      )}

      {/* ── Dialogs ────────────────────────────────────────────────────────── */}
      <UploadCertificateDialog
        open={uploadDialogOpen}
        onClose={() => setUploadDialogOpen(false)}
        onSave={handleUploadCertificate}
      />

      <CertificatePDFViewer
        open={pdfViewerOpen}
        certificate={selectedCertificate}
        onClose={() => setPdfViewerOpen(false)}
        onShare={handleShare}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onInfo={handleInfo}
      />

      <CertificateInfoPanel
        open={infoPanelOpen}
        certificate={selectedInfoCertificate}
        onClose={() => setInfoPanelOpen(false)}
      />

      <ShareCertificateDialog
        open={shareDialogOpen}
        onClose={() => setShareDialogOpen(false)}
        certificate={selectedCertificate}
        onShare={handleShareCertificate}
      />

      <DeleteCertificateDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        certificate={selectedCertificate}
        onConfirm={handleDeleteCertificate}
      />

      <DiscoverPartnerDialog
        open={discoverDialogOpen}
        onClose={() => setDiscoverDialogOpen(false)}
        certificates={certificates}
      />

      <UpdatePdfDialog
        open={updatePdfDialogOpen}
        onClose={() => setUpdatePdfDialogOpen(false)}
        certificate={selectedCertificate}
        onUpdate={handleConfirmUpdate}
      />

      {/* Global snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CertificateManagement;