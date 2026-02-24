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

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  Grid2,
  Tabs,
  Tab,
  Button,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Alert,
  Snackbar,
  SelectChangeEvent
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ReceiptLong from '@mui/icons-material/ReceiptLong';
import { Certificate, CertificateStats, CertificateFilter } from '../types/types';
import { CertificateFormData } from '../types/dialog-types';
import { fetchAllCertificates, createCertificate, shareCertificate } from '../api';
import { certificateManagementConfig } from '../config';
import { StatsCard } from '../components/certificate-list/StatsCard';
import { CertificateTable } from '../components/certificate-list/CertificateTable';
import { UploadCertificateDialog } from '../components/dialogs/UploadCertificateDialog';
import { ShareCertificateDialog } from '../components/dialogs/ShareCertificateDialog';
import { ViewCertificateDialog } from '../components/dialogs/ViewCertificateDialog';
import { DeleteCertificateDialog } from '../components/dialogs/DeleteCertificateDialog';
import LoadingSpinner from '@/components/general/LoadingSpinner';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`certificate-tabpanel-${index}`}
      aria-labelledby={`certificate-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 1.25 }}>{children}</Box>}
    </div>
  );
}

const CertificateManagement = () => {
  // State
  const [activeTab, setActiveTab] = useState(0);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [stats, setStats] = useState<CertificateStats>({ total: 0, valid: 0, expiring: 0, expired: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter state
  const [filters, setFilters] = useState<CertificateFilter>({
    search: '',
    type: '',
    status: '',
    shared: ''
  });

  // Dialog states
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCertificate, setSelectedCertificate] = useState<Certificate | null>(null);

  // Snackbar state
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });

  // Calculate stats from certificates list
  const calculateStats = (certs: Certificate[]): CertificateStats => {
    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    return certs.reduce(
      (acc, cert) => {
        const validUntil = new Date(cert.validUntil);
        acc.total++;
        
        if (validUntil <= today) {
          acc.expired++;
        } else if (validUntil <= thirtyDaysFromNow) {
          acc.expiring++;
        } else {
          acc.valid++;
        }
        
        return acc;
      },
      { total: 0, valid: 0, expiring: 0, expired: 0 }
    );
  };

  // Load data
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const certificatesData = await fetchAllCertificates();
      
      setCertificates(certificatesData);
      setStats(calculateStats(certificatesData));
    } catch (err) {
      console.error('Error loading certificates:', err);
      setError('Failed to load certificates. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter certificates
  const filteredCertificates = useMemo(() => {
    return certificates.filter(cert => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch = 
          cert.name.toLowerCase().includes(searchLower) ||
          cert.bpn.toLowerCase().includes(searchLower) ||
          cert.issuer.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }
      
      // Type filter
      if (filters.type && cert.type !== filters.type) return false;
      
      // Status filter
      if (filters.status && cert.status !== filters.status) return false;
      
      return true;
    });
  }, [certificates, filters]);

  // Handlers
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleFilterChange = (field: keyof CertificateFilter, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleUploadCertificate = async (data: CertificateFormData) => {
    try {
      await createCertificate(data);
      setSnackbar({ open: true, message: 'Certificate uploaded successfully!', severity: 'success' });
      setUploadDialogOpen(false);
      loadData();
    } catch (err) {
      console.error('Error uploading certificate:', err);
      setSnackbar({ open: true, message: 'Failed to upload certificate.', severity: 'error' });
    }
  };

  const handleShareCertificate = async (certificateId: string, partnerBpn: string, method: 'PULL' | 'PUSH') => {
    try {
      await shareCertificate(certificateId, partnerBpn, method);
      setSnackbar({ open: true, message: 'Certificate shared successfully!', severity: 'success' });
      setShareDialogOpen(false);
      loadData();
    } catch (err) {
      console.error('Error sharing certificate:', err);
      setSnackbar({ open: true, message: 'Failed to share certificate.', severity: 'error' });
    }
  };

  // Note: Delete endpoint not available yet
  const handleDeleteCertificate = async (_certificateId: string) => {
    // TODO: Implement when DELETE /api/ccm/certificates/{id} endpoint is available
    setSnackbar({ open: true, message: 'Delete functionality not yet available.', severity: 'error' });
    setDeleteDialogOpen(false);
  };

  const handleView = (certificate: Certificate) => {
    setSelectedCertificate(certificate);
    setViewDialogOpen(true);
  };

  const handleShare = (certificate: Certificate) => {
    setSelectedCertificate(certificate);
    setShareDialogOpen(true);
  };

  const handleDelete = (certificate: Certificate) => {
    setSelectedCertificate(certificate);
    setDeleteDialogOpen(true);
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <Box className="certificate-management">
      {/* Header */}
      <Grid2 container spacing={0} alignItems="center" justifyContent="space-between" className="certificate-management__header">
        <Grid2>
          <Box className="certificate-management__title-container">
            <Box className="certificate-management__icon-box">
              <ReceiptLong className="certificate-management__icon" />
            </Box>
            <Box>
              <Typography variant="h5" className="certificate-management__title">
                Certificate Management
              </Typography>
              <Typography variant="body1" className="certificate-management__subtitle">
                Manage, share and consume certificates across the supply chain
              </Typography>
            </Box>
          </Box>
        </Grid2>
        
        {/* Stats Cards */}
        <Grid2>
          <Grid2 container spacing={1}>
            <Grid2>
              <StatsCard label="Total" value={stats.total} color="#2196f3" />
            </Grid2>
            <Grid2>
              <StatsCard label="Valid" value={stats.valid} color="#4caf50" />
            </Grid2>
            <Grid2>
              <StatsCard label="Expiring" value={stats.expiring} color="#ff9800" />
            </Grid2>
            <Grid2>
              <StatsCard label="Expired" value={stats.expired} color="#f44336" />
            </Grid2>
          </Grid2>
        </Grid2>
      </Grid2>

      {/* Tabs */}
      <Box className="certificate-management__tabs">
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange}
        >
          <Tab label="Upload Certificate" />
          <Tab label="Share Certificate" />
          <Tab label="Consume Certificate" />
        </Tabs>
      </Box>

      {/* Tab Content */}
      <TabPanel value={activeTab} index={0}>
        {/* Filters and Upload Button */}
        <Grid2 container spacing={2} alignItems="center" className="certificate-management__filters">
          <Grid2 size={{ xs: 12, sm: 3 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search certificates..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
          </Grid2>
          <Grid2 size={{ xs: 6, sm: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Type</InputLabel>
              <Select
                value={filters.type}
                label="Type"
                onChange={(e: SelectChangeEvent) => handleFilterChange('type', e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                {certificateManagementConfig.certificateTypes.map(type => (
                  <MenuItem key={type.value} value={type.value}>{type.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid2>
          <Grid2 size={{ xs: 6, sm: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.status}
                label="Status"
                onChange={(e: SelectChangeEvent) => handleFilterChange('status', e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="valid">Valid</MenuItem>
                <MenuItem value="expiring">Expiring</MenuItem>
                <MenuItem value="expired">Expired</MenuItem>
              </Select>
            </FormControl>
          </Grid2>
          <Grid2 size={{ xs: 12, sm: 5 }} className="certificate-management__filters-actions">
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => setUploadDialogOpen(true)}
            >
              Upload Certificate
            </Button>
          </Grid2>
        </Grid2>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Certificate Table */}
        <CertificateTable
          certificates={filteredCertificates}
          onView={handleView}
          onShare={handleShare}
          onDelete={handleDelete}
        />
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        <Typography className="certificate-management__tab-placeholder">
          Share certificates tab - View and manage shared certificates with partners.
        </Typography>
        {/* TODO: Implement shared certificates view */}
      </TabPanel>

      <TabPanel value={activeTab} index={2}>
        <Typography className="certificate-management__tab-placeholder">
          Consume certificates tab - View incoming certificates from partners.
        </Typography>
        {/* TODO: Implement incoming certificates view */}
      </TabPanel>

      {/* Dialogs */}
      <UploadCertificateDialog
        open={uploadDialogOpen}
        onClose={() => setUploadDialogOpen(false)}
        onSave={handleUploadCertificate}
      />

      <ShareCertificateDialog
        open={shareDialogOpen}
        onClose={() => setShareDialogOpen(false)}
        certificate={selectedCertificate}
        onShare={handleShareCertificate}
      />

      <ViewCertificateDialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        certificate={selectedCertificate}
      />

      <DeleteCertificateDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        certificate={selectedCertificate}
        onConfirm={handleDeleteCertificate}
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

export default CertificateManagement;
