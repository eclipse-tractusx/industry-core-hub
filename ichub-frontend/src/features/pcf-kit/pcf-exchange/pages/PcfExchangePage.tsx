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

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  IconButton,
  Button,
  alpha,
  Paper,
  TextField,
  InputAdornment,
  CircularProgress,
  Tooltip,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Search,
  CheckCircle,
  RadioButtonUnchecked,
  Downloading,
  Security,
  VerifiedUser,
  ArrowBack,
  Refresh,
  Close as CloseIcon,
  DataObject as DataObjectIcon,
  Inbox as InboxIcon,
  Category,
  ViewList,
  ViewModule
} from '@mui/icons-material';
import { fetchCatalogParts } from '../../../industry-core-kit/catalog-management/api';
import {
  NotificationFilters,
  NotificationCard,
  PcfManagementSection,
  RejectDialog,
  PcfDetailsDialog,
  PcfEditDialog
} from '../components';
import {
  getPcfData,
  getNotificationsForPart,
  getNotificationCounts,
  acceptNotification,
  rejectNotification,
  publishPcfData,
  ManagedPart,
  PcfDataRecord,
  PcfNotification,
  PcfNotificationStatus
} from '../api/pcfExchangeApi';
import { refreshPcfForRequest } from '../../services/pcfApi';

// PCF Green Theme
const PCF_PRIMARY = '#10b981';
const PCF_SECONDARY = '#059669';

// Loading steps for animation
interface LoadingStep {
  id: string;
  label: string;
  icon: React.ElementType;
  description: string;
}

const LOADING_STEPS: LoadingStep[] = [
  { id: 'search', label: 'Searching', icon: Search, description: 'Locating catalog part in registry' },
  { id: 'pcf', label: 'Loading PCF', icon: Downloading, description: 'Fetching PCF data' },
  { id: 'requests', label: 'Requests', icon: Security, description: 'Loading pending requests' },
  { id: 'complete', label: 'Ready', icon: VerifiedUser, description: 'Data loaded successfully' }
];

type PageState = 'search' | 'loading' | 'visualization' | 'error';
type SectionTab = 'management' | 'requests';
type ViewMode = 'card' | 'list';

interface CatalogPartSearchResult {
  manufacturerId: string;
  manufacturerPartId: string;
  partName: string;
  description?: string;
  category?: string;
}

const PcfExchangePage: React.FC = () => {
  const navigate = useNavigate();
  const params = useParams();

  // Page state
  const [pageState, setPageState] = useState<PageState>('search');
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Data state
  const [managedPart, setManagedPart] = useState<ManagedPart | null>(null);
  const [pcfData, setPcfData] = useState<PcfDataRecord | null>(null);
  const [notifications, setNotifications] = useState<PcfNotification[]>([]);
  const [notificationCounts, setNotificationCounts] = useState<Record<PcfNotificationStatus, number>>({
    PENDING: 0,
    ACCEPTED: 0,
    REJECTED: 0,
    DELIVERED: 0,
    FAILED: 0
  });

  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<CatalogPartSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Section tab state
  const [activeSection, setActiveSection] = useState<SectionTab>('management');

  // View mode state
  const [viewMode, setViewMode] = useState<ViewMode>('card');

  // Filter state
  const [selectedStatus, setSelectedStatus] = useState<PcfNotificationStatus | 'ALL'>('ALL');

  // Dialog state
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingNotificationId, setRejectingNotificationId] = useState<string | null>(null);
  const [processingNotificationId, setProcessingNotificationId] = useState<string | null>(null);

  // PCF Details/Edit dialog state
  const [pcfDetailsDialogOpen, setPcfDetailsDialogOpen] = useState(false);
  const [pcfEditDialogOpen, setPcfEditDialogOpen] = useState(false);

  // PCF loading state
  const [isPcfLoading, setIsPcfLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Parse part ID from URL
  const partIdFromUrl = params?.partId;

  // Load part data when URL contains partId
  useEffect(() => {
    if (partIdFromUrl) {
      const decodedPartId = decodeURIComponent(partIdFromUrl);
      setSearchTerm(decodedPartId);
      loadPartData(decodedPartId);
    }
  }, [partIdFromUrl]);

  // Search catalog parts as user types
  useEffect(() => {
    if (!searchTerm.trim() || pageState !== 'search') {
      setSearchResults([]);
      return;
    }

    const searchTimeout = setTimeout(async () => {
      setIsSearching(true);
      try {
        const catalogParts = await fetchCatalogParts();
        const query = searchTerm.toLowerCase();
        const filtered = catalogParts
          .filter(part =>
            part.manufacturerPartId.toLowerCase().includes(query) ||
            part.name.toLowerCase().includes(query)
          )
          .map(part => ({
            manufacturerId: part.manufacturerId || '',
            manufacturerPartId: part.manufacturerPartId,
            partName: part.name,
            description: part.description,
            category: part.category
          }));
        setSearchResults(filtered);
        setShowDropdown(true);
      } catch (err) {
        console.error('Search error:', err);
        // Mock data fallback
        setSearchResults([
          { manufacturerId: 'BPNL00000001CFRM', manufacturerPartId: 'BATTERY-MOD-A', partName: 'HV Battery Module Type A', category: 'Battery' },
          { manufacturerId: 'BPNL00000001CFRM', manufacturerPartId: 'BATTERY-MOD-B', partName: 'HV Battery Module Type B', category: 'Battery' },
          { manufacturerId: 'BPNL00000001CFRM', manufacturerPartId: 'CELL-HP-01', partName: 'High Performance Cell Unit', category: 'Cell' }
        ].filter(p => 
          p.manufacturerPartId.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.partName.toLowerCase().includes(searchTerm.toLowerCase())
        ));
        setShowDropdown(true);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [searchTerm, pageState]);

  const loadPartData = async (manufacturerPartId: string) => {
    setPageState('loading');
    setError(null);
    setCurrentStep(0);

    try {
      // Step 1: Search for part
      setCurrentStep(0);
      await new Promise(resolve => setTimeout(resolve, 600));

      // Create managed part from catalog part
      const part: ManagedPart = {
        catenaXId: `urn:uuid:${crypto.randomUUID()}`,
        manufacturerPartId,
        partInstanceId: 'CATALOG',
        partName: `Product ${manufacturerPartId}`,
        hasPcf: true,
        pcfVersion: 1,
        pcfLastUpdated: new Date().toISOString(),
        pcfValue: Math.round(50 + Math.random() * 150),
        pcfValueUnit: 'kg CO2e',
        pcfStatus: 'PUBLISHED'
      };

      // Step 2: Load PCF data
      setCurrentStep(1);
      await new Promise(resolve => setTimeout(resolve, 800));

      const pcf = await getPcfData(part.catenaXId);

      // Step 3: Load notifications
      setCurrentStep(2);
      await new Promise(resolve => setTimeout(resolve, 600));

      const [partNotifications, counts] = await Promise.all([
        getNotificationsForPart(part.catenaXId),
        getNotificationCounts()
      ]);

      // Step 4: Complete
      setCurrentStep(3);
      await new Promise(resolve => setTimeout(resolve, 500));

      setManagedPart(part);
      setPcfData(pcf);
      setNotifications(partNotifications);
      setNotificationCounts(counts);
      setPageState('visualization');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load part data';
      setError(message);
      setPageState('error');
    }
  };

  // Handle selecting a search result
  const handleSelectPart = (part: CatalogPartSearchResult) => {
    setShowDropdown(false);
    const partId = encodeURIComponent(part.manufacturerPartId);
    navigate(`/pcf/exchange/${partId}`);
  };

  // Handle search submission
  const handleSearchSubmit = () => {
    if (searchTerm.trim()) {
      setShowDropdown(false);
      const partId = encodeURIComponent(searchTerm.trim());
      navigate(`/pcf/exchange/${partId}`);
    }
  };

  // Handle accept notification
  const handleAcceptNotification = async (notificationId: string) => {
    setProcessingNotificationId(notificationId);
    try {
      await acceptNotification(notificationId);
      if (managedPart) {
        const [updatedNotifications, counts] = await Promise.all([
          getNotificationsForPart(managedPart.catenaXId),
          getNotificationCounts()
        ]);
        setNotifications(updatedNotifications);
        setNotificationCounts(counts);
      }
    } catch (err) {
      console.error('Failed to accept notification:', err);
    } finally {
      setProcessingNotificationId(null);
    }
  };

  // Handle reject notification
  const handleOpenRejectDialog = (notificationId: string) => {
    setRejectingNotificationId(notificationId);
    setRejectDialogOpen(true);
  };

  const handleConfirmReject = async (reason: string) => {
    if (!rejectingNotificationId) return;

    setProcessingNotificationId(rejectingNotificationId);
    try {
      await rejectNotification(rejectingNotificationId, reason);
      if (managedPart) {
        const [updatedNotifications, counts] = await Promise.all([
          getNotificationsForPart(managedPart.catenaXId),
          getNotificationCounts()
        ]);
        setNotifications(updatedNotifications);
        setNotificationCounts(counts);
      }
    } finally {
      setProcessingNotificationId(null);
    }
  };

  // Refresh PCF location for a single pending request and reload the part's notifications
  const handleRefreshPcf = async (notificationId: string) => {
    try {
      await refreshPcfForRequest(notificationId);
      if (managedPart) {
        const [updatedNotifications, counts] = await Promise.all([
          getNotificationsForPart(managedPart.catenaXId),
          getNotificationCounts()
        ]);
        setNotifications(updatedNotifications);
        setNotificationCounts(counts);
      }
    } catch (err) {
      console.error('Failed to refresh PCF for request:', notificationId, err);
    }
  };

  // Handle publish PCF
  const handlePublishPcf = async () => {
    if (!pcfData) return;

    setIsPcfLoading(true);
    try {
      const updatedPcf = await publishPcfData(pcfData.id);
      setPcfData(updatedPcf);
    } catch (err) {
      console.error('Failed to publish PCF:', err);
    } finally {
      setIsPcfLoading(false);
    }
  };

  // Handle back to search
  const handleBackToSearch = () => {
    setPageState('search');
    setManagedPart(null);
    setPcfData(null);
    setNotifications([]);
    setError(null);
    setSearchTerm('');
    navigate('/pcf/exchange');
  };

  // Handle refresh data (without full reload)
  const handleRefresh = async () => {
    if (!managedPart) return;
    
    setIsRefreshing(true);
    try {
      const [pcf, partNotifications, counts] = await Promise.all([
        getPcfData(managedPart.catenaXId),
        getNotificationsForPart(managedPart.catenaXId),
        getNotificationCounts()
      ]);
      setPcfData(pcf);
      setNotifications(partNotifications);
      setNotificationCounts(counts);
    } catch (err) {
      console.error('Failed to refresh data:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Filter notifications by selected status
  const filteredNotifications = selectedStatus === 'ALL'
    ? notifications
    : notifications.filter(n => n.status === selectedStatus);

  // Get rejecting notification for dialog
  const rejectingNotification = notifications.find(n => n.id === rejectingNotificationId);

  // Render loading state
  const renderLoading = () => (
    <Box
      sx={{
        minHeight: 'calc(100vh - 68.8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: { xs: 2, sm: 3, md: 4 }
      }}
    >
      <Card
        sx={{
          maxWidth: '600px',
          width: '100%',
          background: 'linear-gradient(135deg, rgba(30, 30, 30, 0.95) 0%, rgba(20, 20, 20, 0.95) 100%)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '20px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
        }}
      >
        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography variant="h5" sx={{ color: '#fff', fontWeight: 600, mb: 1 }}>
              Loading Catalog Part
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', fontFamily: 'monospace' }}>
              {searchTerm}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
            {LOADING_STEPS.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;
              const isPending = index > currentStep;

              return (
                <React.Fragment key={step.id}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, opacity: isPending ? 0.4 : 1 }}>
                    <Box
                      sx={{
                        width: 44,
                        height: 44,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: isCompleted
                          ? `linear-gradient(135deg, ${PCF_PRIMARY} 0%, ${PCF_SECONDARY} 100%)`
                          : isActive
                          ? alpha(PCF_PRIMARY, 0.2)
                          : 'rgba(255, 255, 255, 0.05)',
                        border: isActive ? `2px solid ${PCF_PRIMARY}` : 'none',
                        ...(isActive && {
                          animation: 'pulse 2s ease-in-out infinite',
                          '@keyframes pulse': {
                            '0%, 100%': { boxShadow: `0 0 0 0 ${alpha(PCF_PRIMARY, 0.4)}` },
                            '50%': { boxShadow: `0 0 0 8px ${alpha(PCF_PRIMARY, 0)}` }
                          }
                        })
                      }}
                    >
                      {isCompleted ? (
                        <CheckCircle sx={{ fontSize: 24, color: '#fff' }} />
                      ) : isActive ? (
                        <Icon sx={{ fontSize: 24, color: PCF_PRIMARY }} />
                      ) : (
                        <RadioButtonUnchecked sx={{ fontSize: 20, color: 'rgba(255, 255, 255, 0.3)' }} />
                      )}
                    </Box>
                    <Typography variant="caption" sx={{ color: isActive || isCompleted ? '#fff' : 'rgba(255, 255, 255, 0.5)', fontWeight: isActive ? 600 : 500, mt: 1 }}>
                      {step.label}
                    </Typography>
                  </Box>
                  {index < LOADING_STEPS.length - 1 && (
                    <Box sx={{ height: 2, flex: 1, mx: 1, background: isCompleted ? `linear-gradient(90deg, ${PCF_PRIMARY} 0%, ${PCF_SECONDARY} 100%)` : 'rgba(255, 255, 255, 0.1)', position: 'relative', top: -18 }} />
                  )}
                </React.Fragment>
              );
            })}
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Button variant="outlined" onClick={handleBackToSearch} sx={{ borderColor: 'rgba(255, 255, 255, 0.2)', color: 'rgba(255, 255, 255, 0.7)', textTransform: 'none', px: 4, borderRadius: '10px' }}>
              Cancel
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );

  // Render error state
  const renderError = () => (
    <Box sx={{ minHeight: 'calc(100vh - 68.8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', px: 3 }}>
      <Card sx={{ maxWidth: '500px', width: '100%', background: 'rgba(30, 30, 30, 0.95)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px' }}>
        <CardContent sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" sx={{ color: '#fff', mb: 2 }}>{error}</Typography>
          <Button variant="contained" onClick={handleBackToSearch} sx={{ background: `linear-gradient(135deg, ${PCF_PRIMARY} 0%, ${PCF_SECONDARY} 100%)`, textTransform: 'none', borderRadius: '10px' }}>
            Back to Search
          </Button>
        </CardContent>
      </Card>
    </Box>
  );

  // Render visualization state
  const renderVisualization = () => {
    if (!managedPart) return null;

    return (
      <Box sx={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header - Similar to Eco Pass KIT Provisioning */}
        <Box
          sx={{
            px: 3,
            py: 2.5,
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'rgba(0, 0, 0, 0.2)'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {/* Left: Back button, icon, title, subtitle */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Tooltip title="New Search">
                <IconButton
                  onClick={handleBackToSearch}
                  sx={{
                    color: 'rgba(255,255,255,0.7)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    '&:hover': { color: '#fff', background: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.2)' }
                  }}
                >
                  <ArrowBack />
                </IconButton>
              </Tooltip>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: '12px',
                  background: `linear-gradient(135deg, ${PCF_PRIMARY} 0%, ${PCF_SECONDARY} 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: `0 4px 16px ${alpha(PCF_PRIMARY, 0.3)}`
                }}
              >
                <CloudUploadIcon sx={{ fontSize: 26, color: '#fff' }} />
              </Box>
              <Box>
                <Typography variant="h5" sx={{ color: '#fff', fontWeight: 700, lineHeight: 1.2 }}>
                  PCF Exchange
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', mt: 0.25 }}>
                  Manage PCF data and respond to incoming requests
                </Typography>
              </Box>
            </Box>

            {/* Right: Part info and refresh */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <Box 
                onClick={() => navigate(`/catalog-management/parts/${encodeURIComponent(managedPart.manufacturerPartId)}`)}
                sx={{ 
                  cursor: 'pointer',
                  p: 1.5,
                  borderRadius: '10px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  transition: 'all 0.2s ease',
                  '&:hover': { 
                    background: alpha(PCF_PRIMARY, 0.08),
                    borderColor: alpha(PCF_PRIMARY, 0.2)
                  }
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <Box>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Manufacturer Part ID
                    </Typography>
                    <Typography variant="body2" sx={{ color: PCF_PRIMARY, fontWeight: 600, fontFamily: 'monospace' }}>
                      {managedPart.manufacturerPartId}
                    </Typography>
                  </Box>
                  <Box sx={{ borderLeft: '1px solid rgba(255,255,255,0.1)', pl: 3 }}>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Part Name
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#fff', fontWeight: 500 }}>
                      {managedPart.partName}
                    </Typography>
                  </Box>
                </Box>
              </Box>
              <Tooltip title="Refresh">
                <IconButton
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  sx={{ 
                    color: 'rgba(255,255,255,0.7)', 
                    border: '1px solid rgba(255,255,255,0.1)',
                    '&:hover': { color: PCF_PRIMARY, borderColor: alpha(PCF_PRIMARY, 0.3), background: alpha(PCF_PRIMARY, 0.1) }
                  }}
                >
                  {isRefreshing ? <CircularProgress size={22} sx={{ color: PCF_PRIMARY }} /> : <Refresh />}
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </Box>

        {/* Section Tabs - Full width */}
        <Box
          sx={{
            display: 'flex',
            gap: 0,
            background: 'rgba(18, 18, 18, 0.98)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)'
          }}
        >
          <Button
            variant={activeSection === 'management' ? 'contained' : 'text'}
            startIcon={<DataObjectIcon sx={{ fontSize: 20 }} />}
            onClick={() => setActiveSection('management')}
            sx={{
              flex: 1,
              py: 1.5,
              borderRadius: 0,
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.95rem',
              ...(activeSection === 'management'
                ? {
                    background: `linear-gradient(135deg, ${PCF_PRIMARY} 0%, ${PCF_SECONDARY} 100%)`,
                    color: '#fff',
                    '&:hover': { background: `linear-gradient(135deg, ${PCF_SECONDARY} 0%, ${PCF_PRIMARY} 100%)` }
                  }
                : {
                    background: 'rgba(255, 255, 255, 0.02)',
                    borderBottom: '2px solid transparent',
                    color: 'rgba(255, 255, 255, 0.5)',
                    '&:hover': { background: 'rgba(255, 255, 255, 0.05)', color: '#fff' }
                  })
            }}
          >
            PCF Management
          </Button>
          <Button
            variant={activeSection === 'requests' ? 'contained' : 'text'}
            startIcon={<InboxIcon sx={{ fontSize: 20 }} />}
            onClick={() => setActiveSection('requests')}
            sx={{
              flex: 1,
              py: 1.5,
              borderRadius: 0,
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.95rem',
              ...(activeSection === 'requests'
                ? {
                    background: `linear-gradient(135deg, ${PCF_PRIMARY} 0%, ${PCF_SECONDARY} 100%)`,
                    color: '#fff',
                    '&:hover': { background: `linear-gradient(135deg, ${PCF_SECONDARY} 0%, ${PCF_PRIMARY} 100%)` }
                  }
                : {
                    background: 'rgba(255, 255, 255, 0.02)',
                    borderBottom: '2px solid transparent',
                    color: 'rgba(255, 255, 255, 0.5)',
                    '&:hover': { background: 'rgba(255, 255, 255, 0.05)', color: '#fff' }
                  })
            }}
          >
            PCF Requests ({notificationCounts.PENDING})
          </Button>
        </Box>

        {/* Filters Bar - Only for PCF Requests */}
        {activeSection === 'requests' && (
          <Box
            sx={{
              position: 'sticky',
              top: 0,
              zIndex: 10,
              px: 3,
              py: 1.5,
              background: 'linear-gradient(180deg, rgba(18, 18, 18, 1) 0%, rgba(18, 18, 18, 0.95) 100%)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <NotificationFilters
              selectedStatus={selectedStatus}
              counts={notificationCounts}
              onStatusChange={setSelectedStatus}
            />
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(_, val) => val && setViewMode(val)}
              size="small"
              sx={{
                '& .MuiToggleButton-root': {
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.5)',
                  px: 1.5,
                  '&:hover': { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.8)' },
                  '&.Mui-selected': { background: alpha(PCF_PRIMARY, 0.15), color: PCF_PRIMARY, borderColor: alpha(PCF_PRIMARY, 0.3) },
                  '&.Mui-selected:hover': { background: alpha(PCF_PRIMARY, 0.2) }
                }
              }}
            >
              <ToggleButton value="card"><ViewModule sx={{ fontSize: 18 }} /></ToggleButton>
              <ToggleButton value="list"><ViewList sx={{ fontSize: 18 }} /></ToggleButton>
            </ToggleButtonGroup>
          </Box>
        )}

        {/* Content */}
        <Box sx={{ flex: 1, px: 3, py: 2, overflow: 'auto' }}>
          {activeSection === 'management' && (
            <PcfManagementSection
              part={managedPart}
              pcfData={pcfData}
              onUpload={() => console.log('Upload PCF')}
              onEdit={() => setPcfEditDialogOpen(true)}
              onVisualize={() => setPcfDetailsDialogOpen(true)}
              onPublish={handlePublishPcf}
              isLoading={isPcfLoading}
            />
          )}
          {activeSection === 'requests' && (
            <Box sx={{ display: viewMode === 'card' ? 'grid' : 'flex', gridTemplateColumns: viewMode === 'card' ? 'repeat(auto-fill, minmax(380px, 1fr))' : undefined, flexDirection: viewMode === 'list' ? 'column' : undefined, gap: viewMode === 'list' ? 1 : 2 }}>
              {filteredNotifications.length === 0 ? (
                <Card sx={{ gridColumn: '1 / -1', textAlign: 'center', py: 6, background: 'rgba(30, 30, 30, 0.5)', border: '1px dashed rgba(255, 255, 255, 0.1)', borderRadius: '16px' }}>
                  <InboxIcon sx={{ fontSize: 48, color: 'rgba(255, 255, 255, 0.2)', mb: 2 }} />
                  <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                    {selectedStatus === 'ALL' ? 'No PCF requests for this part' : `No ${selectedStatus.toLowerCase()} requests`}
                  </Typography>
                </Card>
              ) : (
                filteredNotifications.map(notification => (
                  <NotificationCard
                    key={notification.id}
                    notification={notification}
                    onAccept={handleAcceptNotification}
                    onReject={handleOpenRejectDialog}
                    onRefreshPcf={handleRefreshPcf}
                    isProcessing={processingNotificationId === notification.id}
                    viewMode={viewMode}
                  />
                ))
              )}
            </Box>
          )}
        </Box>

        {/* Reject Dialog */}
        <RejectDialog
          open={rejectDialogOpen}
          onClose={() => { setRejectDialogOpen(false); setRejectingNotificationId(null); }}
          onConfirm={handleConfirmReject}
          notificationId={rejectingNotificationId || ''}
          requesterName={rejectingNotification?.requesterName || ''}
          partName={rejectingNotification?.partName || `${rejectingNotification?.manufacturerPartId}` || ''}
        />

        {/* PCF Details Dialog */}
        <PcfDetailsDialog
          open={pcfDetailsDialogOpen}
          onClose={() => setPcfDetailsDialogOpen(false)}
          pcfData={pcfData}
          part={managedPart}
        />

        {/* PCF Edit Dialog */}
        <PcfEditDialog
          open={pcfEditDialogOpen}
          onClose={() => setPcfEditDialogOpen(false)}
          onSave={async (data) => {
            console.log('Saving PCF data:', data);
            // Here would be the API call to update PCF
            // For now just close the dialog
          }}
          pcfData={pcfData}
          part={managedPart}
        />
      </Box>
    );
  };

  // Render search state
  const renderSearch = () => (
    <Box sx={{ minHeight: 'calc(100vh - 68.8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', px: { xs: 2, sm: 3, md: 4 } }}>
      <Box sx={{ width: '100%', maxWidth: '700px', textAlign: 'center' }}>
        <Box sx={{ mb: 5 }}>
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: '16px',
              background: `linear-gradient(135deg, ${PCF_PRIMARY} 0%, ${PCF_SECONDARY} 50%, #047857 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto',
              mb: 2,
              boxShadow: `0 8px 32px ${alpha(PCF_PRIMARY, 0.4)}`
            }}
          >
            <CloudUploadIcon sx={{ fontSize: 36, color: '#fff' }} />
          </Box>
          <Typography variant="h4" sx={{ color: '#fff', fontWeight: 700, mb: 1 }}>
            PCF Exchange
          </Typography>
          <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.6)', maxWidth: '500px', margin: '0 auto' }}>
            Manage Product Carbon Footprint data and respond to requests from your partners
          </Typography>
        </Box>

        <Card
          sx={{
            background: 'linear-gradient(135deg, rgba(30, 30, 30, 0.95) 0%, rgba(20, 20, 20, 0.95) 100%)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '20px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
          }}
        >
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h6" sx={{ color: '#fff', mb: 0.5, fontWeight: 600 }}>
              Search Catalog Part
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.5)', mb: 3 }}>
              Enter a Manufacturer Part ID to manage its PCF data
            </Typography>

            <Box sx={{ position: 'relative' }}>
              <TextField
                fullWidth
                placeholder="Enter Manufacturer Part ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit()}
                onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><Search sx={{ color: 'rgba(255, 255, 255, 0.4)' }} /></InputAdornment>,
                  endAdornment: searchTerm && (
                    <InputAdornment position="end">
                      {isSearching ? <CircularProgress size={20} sx={{ color: PCF_PRIMARY }} /> : (
                        <IconButton size="small" onClick={() => setSearchTerm('')} sx={{ color: 'rgba(255, 255, 255, 0.4)' }}>
                          <CloseIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      )}
                    </InputAdornment>
                  )
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '12px',
                    '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.1)' },
                    '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                    '&.Mui-focused fieldset': { borderColor: PCF_PRIMARY }
                  },
                  '& .MuiInputBase-input': { color: '#fff' }
                }}
              />

              {showDropdown && searchResults.length > 0 && (
                <Paper
                  sx={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    mt: 1,
                    maxHeight: 300,
                    overflow: 'auto',
                    background: 'rgba(30, 30, 30, 0.98)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    zIndex: 20
                  }}
                >
                  {searchResults.map((result) => (
                    <Box
                      key={result.manufacturerPartId}
                      onClick={() => handleSelectPart(result)}
                      sx={{
                        p: 2,
                        cursor: 'pointer',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        '&:hover': { background: alpha(PCF_PRIMARY, 0.1) },
                        '&:last-child': { borderBottom: 'none' }
                      }}
                    >
                      <Box sx={{ width: 36, height: 36, borderRadius: '8px', background: alpha(PCF_PRIMARY, 0.15), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Category sx={{ fontSize: 18, color: PCF_PRIMARY }} />
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" sx={{ color: '#fff', fontWeight: 600 }}>{result.manufacturerPartId}</Typography>
                        <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>{result.partName} • {result.category}</Typography>
                      </Box>
                    </Box>
                  ))}
                </Paper>
              )}
            </Box>

            <Button
              fullWidth
              variant="contained"
              onClick={handleSearchSubmit}
              disabled={!searchTerm.trim()}
              sx={{
                mt: 3,
                py: 1.5,
                background: `linear-gradient(135deg, ${PCF_PRIMARY} 0%, ${PCF_SECONDARY} 100%)`,
                borderRadius: '12px',
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '1rem',
                '&:disabled': { background: 'rgba(255, 255, 255, 0.1)', color: 'rgba(255, 255, 255, 0.3)' }
              }}
            >
              Search Part
            </Button>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );

  return (
    <Box>
      {pageState === 'search' && renderSearch()}
      {pageState === 'loading' && renderLoading()}
      {pageState === 'error' && renderError()}
      {pageState === 'visualization' && renderVisualization()}
    </Box>
  );
};

export default PcfExchangePage;
