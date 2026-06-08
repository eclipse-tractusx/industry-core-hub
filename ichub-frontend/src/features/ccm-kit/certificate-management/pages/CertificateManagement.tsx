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
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import { RefreshButton, CcmFilterBar } from '@/features/ccm-kit/shared-components';
import type { FilterDef } from '@/features/ccm-kit/shared-components';
import {
  Certificate,
  CertificateStats,
  CertificateFilter,
  CertificateStatus,
} from '../types/types';
import { certificateManagementConfig } from '../config';
import { fetchAllCertificates, createCertificate, deleteCertificate, updateCertificate, publishCertificateAsset, fetchCertificatePublishedStatus } from '../api';
import { CertificateTable } from '../components/certificate-list/CertificateTable';
import { CertificateCardGrid } from '../components/certificate-list/CertificateCardGrid';
import { SummaryStatsBar } from '../components/summary/SummaryStatsBar';
import { UploadCertificateDialog } from '../components/dialogs/UploadCertificateDialog';
import { PublishCertificateDialog } from '../components/dialogs/PublishCertificateDialog';
import { DeleteCertificateDialog } from '../components/dialogs/DeleteCertificateDialog';
import { UpdateCertificateDialog } from '../components/dialogs/UpdateCertificateDialog';
import { CertificatePDFViewer } from '../components/dialogs/CertificatePDFViewer';
import { CertificateInfoPanel } from '../components/dialogs/CertificateInfoPanel';
import PageSectionHeader from '@/components/common/PageSectionHeader';
import { kitThemes } from '@/theme/colors';
import LoadingSpinner from '@/components/general/LoadingSpinner';

// Safe parse of a "valid until" date: returns null when the value is absent,
// empty or unparseable. This avoids `new Date(null)` collapsing to the epoch
// (1970-01-01), which would wrongly flag certificates without an expiry as
// expired.
const parseValidUntil = (raw?: string | null): Date | null => {
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
};

// Compute the display status from validUntil. When there is no valid expiry
// date the certificate is never "expired" — it stays "valid".
const computeStatus = (validUntilRaw?: string | null): CertificateStatus => {
  const validUntil = parseValidUntil(validUntilRaw);
  if (!validUntil) return 'valid';
  const today = new Date();
  const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
  if (validUntil <= today) return 'expired';
  if (validUntil <= thirtyDaysFromNow) return 'expiring';
  return 'valid';
};

// Backend model to frontend model mapper
const mapBackendToFrontendCertificate = (backendCert: any): Certificate => {
  const status: CertificateStatus = computeStatus(backendCert.validUntil);

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
  return certs.reduce(
    (acc, cert) => {
      acc.total++;
      const status = computeStatus(cert.validUntil);
      if (status === 'expired') acc.expired++;
      else if (status === 'expiring') acc.expiring++;
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
  const [publishedIds, setPublishedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters: text/type/status from SearchFilterBar + status from SummaryStatsBar
  const [filters, setFilters] = useState<CertificateFilter>({ search: '', type: '', status: '', shared: '' });
  const [statusQuickFilter, setStatusQuickFilter] = useState<CertificateStatus | ''>('');

  // View mode
  const [viewMode, setViewMode] = useState<'list' | 'card'>('list');

  // Dialog states
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
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

      // Fire published-status checks for all certs in parallel (started here,
      // awaited below so the loading spinner covers both operations).
      const statusChecks = Promise.allSettled(
        mappedCertificates.map((cert) => fetchCertificatePublishedStatus(cert.id)),
      );

      setCertificates(mappedCertificates);
      setStats(calculateStats(mappedCertificates));

      // Resolve published-status results and build the id set
      const statusResults = await statusChecks;
      const published = new Set<string>();
      statusResults.forEach((result, idx) => {
        if (result.status === 'fulfilled' && result.value) {
          published.add(mappedCertificates[idx].id);
        }
      });
      setPublishedIds(published);
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

  // ── CcmFilterBar wiring (search + certificate type) ───────────────────────
  const certTypeFilterDefs: FilterDef[] = [
    {
      key: 'type',
      allLabel: 'All Types',
      minWidth: 160,
      options: certificateManagementConfig.certificateTypes.map((t) => ({ value: t.value, label: t.label })),
    },
  ];

  const handleSearchChange = (value: string) => {
    setFilters((prev) => ({ ...prev, search: value }));
  };

  const handleTypeFilterChange = (_key: string, value: string) => {
    setFilters((prev) => ({ ...prev, type: value as CertificateFilter['type'] }));
  };

  const handleFilterBarClear = () => {
    setFilters((prev) => ({ ...prev, search: '', type: '' }));
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

  const handlePublishCertificate = async (certificateId: string) => {
    try {
      await publishCertificateAsset(certificateId);
      setSnackbar({ open: true, message: t('messages.publishSuccess'), severity: 'success' });
      setPublishDialogOpen(false);
      loadData();
    } catch (err) {
      console.error('Error publishing certificate:', err);
      setSnackbar({ open: true, message: t('messages.publishFailed'), severity: 'error' });
      setPublishDialogOpen(false);
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

  const handlePublish = (certificate: Certificate) => {
    setSelectedCertificate(certificate);
    setPublishDialogOpen(true);
  };

  const handleDelete = (certificate: Certificate) => {
    setSelectedCertificate(certificate);
    setDeleteDialogOpen(true);
  };

  const handleUpdate = (certificate: Certificate) => {
    setSelectedCertificate(certificate);
    setUpdateDialogOpen(true);
  };

  const handleSaveUpdate = async (certificateId: string, formData: FormData) => {
    try {
      await updateCertificate(certificateId, formData);
      setSnackbar({ open: true, message: t('messages.updateSuccess'), severity: 'success' });
      setUpdateDialogOpen(false);
      loadData();
    } catch (err) {
      console.error('Error updating certificate:', err);
      setSnackbar({ open: true, message: t('messages.updateFailed'), severity: 'error' });
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
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
              <RefreshButton onClick={() => void loadData()} loading={isLoading} />
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
      <CcmFilterBar
        search={filters.search}
        onSearchChange={handleSearchChange}
        searchPlaceholder="Search by name, issuer or BPN…"
        filters={certTypeFilterDefs}
        values={{ type: filters.type }}
        onFilterChange={handleTypeFilterChange}
        onClear={handleFilterBarClear}
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
          publishedIds={publishedIds}
          onView={handleView}
          onPublish={handlePublish}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          onInfo={handleInfo}
        />
      ) : (
        <CertificateCardGrid
          certificates={filteredCertificates}
          publishedIds={publishedIds}
          onView={handleView}
          onPublish={handlePublish}
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
        publishedIds={publishedIds}
        onPublish={handlePublish}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onInfo={handleInfo}
      />

      <CertificateInfoPanel
        open={infoPanelOpen}
        certificate={selectedInfoCertificate}
        onClose={() => setInfoPanelOpen(false)}
      />

      <PublishCertificateDialog
        open={publishDialogOpen}
        onClose={() => setPublishDialogOpen(false)}
        certificate={selectedCertificate}
        onConfirm={handlePublishCertificate}
      />

      <DeleteCertificateDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        certificate={selectedCertificate}
        onConfirm={handleDeleteCertificate}
      />

      <UpdateCertificateDialog
        open={updateDialogOpen}
        onClose={() => setUpdateDialogOpen(false)}
        certificate={selectedCertificate}
        onSave={handleSaveUpdate}
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