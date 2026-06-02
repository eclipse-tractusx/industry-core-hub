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
 * License for the specific language govern in permissions and limitations
 * under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 ********************************************************************************/

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  Card,
  CardContent,
  IconButton,
  Button,
  alpha,
  CircularProgress,
  Tooltip,
  LinearProgress,
  Chip,
  Alert,
  Stepper,
  Step,
  StepLabel,
  StepConnector,
  stepConnectorClasses,
  styled
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  CheckCircle,
  RadioButtonUnchecked,
  Downloading,
  Security,
  VerifiedUser,
  ArrowBack,
  Refresh,
  Search,
  Co2,
  Edit,
  Visibility,
  DraftsOutlined,
  CalendarMonth,
  Info,
  Public,
  Speed,
  Inventory,
  AddBox,
  PlaylistAdd,
  OpenInNew
} from '@mui/icons-material';
import { CatalogPartSearch, CatalogPartSearchResult, PartInfoHeader, PcfDataEditor } from '../../shared/components';
import { ManagedPart } from '../../pcf-exchange/api/pcfExchangeApi';
import type { PcfNestedData } from '../types/pcfNestedData';
import {
  getPcfExcludingBiogenic,
  getPcfIncludingBiogenic,
  getPrimaryDataShare,
  getGeographyCountry,
  getReferencePeriod,
  getSpecVersion,
  getPcfVersion,
  getPcfStatus,
  mapPcfStatus,
  formatReferencePeriod,
} from '../utils/pcfDataExtractors';
import { PcfDetailsDialog, PcfEditDialog, PcfManagementSection } from '../../pcf-exchange/components';
import {
  getPcfByManufacturerPartId,
  uploadPcf,
  updatePcfAndGetParticipants,
  notifyParticipants,
  DEFAULT_PCF_POLICIES
} from '../../services/pcfApi';
import { fetchCatalogPart } from '@/features/industry-core-kit/catalog-management/api';
import { ParticipantSelectionDialog } from '../components';
import { getPcfExchangePoliciesConfig } from '@/services/EnvironmentService';
import { generatePoliciesFromDefinition } from '@/features/industry-core-kit/part-discovery/utils/governancePolicyUtils';

// PCF Green Theme
const PCF_PRIMARY = '#10b981';
const PCF_SECONDARY = '#059669';

// Custom styled step connector
const ColoredStepConnector = styled(StepConnector)(() => ({
  [`&.${stepConnectorClasses.alternativeLabel}`]: {
    top: 22,
  },
  [`&.${stepConnectorClasses.active}`]: {
    [`& .${stepConnectorClasses.line}`]: {
      background: `linear-gradient(90deg, ${PCF_PRIMARY} 0%, ${PCF_SECONDARY} 100%)`,
    },
  },
  [`&.${stepConnectorClasses.completed}`]: {
    [`& .${stepConnectorClasses.line}`]: {
      background: `linear-gradient(90deg, ${PCF_PRIMARY} 0%, ${PCF_SECONDARY} 100%)`,
    },
  },
  [`& .${stepConnectorClasses.line}`]: {
    height: 3,
    border: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 1,
  },
}));

// Part readiness status
type PartReadiness = 'draft' | 'registered-no-pcf' | 'has-pcf';

// Loading steps for animation
interface LoadingStep {
  id: string;
  label: string;
  icon: React.ElementType;
  description: string;
}

const LOADING_STEPS: LoadingStep[] = [
  { id: 'search', label: 'loading.searchingPart', icon: Search, description: 'loading.searchingPartDesc' },
  { id: 'pcf', label: 'loading.loadingPcf', icon: Downloading, description: 'loading.loadingPcfDesc' },
  { id: 'validate', label: 'loading.validating', icon: Security, description: 'loading.validatingDesc' },
  { id: 'complete', label: 'loading.ready', icon: VerifiedUser, description: 'loading.dataLoadedDesc' }
];

type PageState = 'search' | 'loading' | 'visualization' | 'error';

const PcfManagementPage: React.FC = () => {
  const { t } = useTranslation('pcf');
  const navigate = useNavigate();
  const params = useParams();

  // Page state
  const [pageState, setPageState] = useState<PageState>('search');
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Part readiness state
  const [partReadiness, setPartReadiness] = useState<PartReadiness>('has-pcf');

  // Data state
  const [managedPart, setManagedPart] = useState<ManagedPart | null>(null);
  const [manufacturerId, setManufacturerId] = useState<string>('');
  const [rawPcfData, setRawPcfData] = useState<PcfNestedData | null>(null);

  // Dialog state
  const [pcfDetailsDialogOpen, setPcfDetailsDialogOpen] = useState(false);
  const [pcfEditDialogOpen, setPcfEditDialogOpen] = useState(false);
  const [pcfCreateDialogOpen, setPcfCreateDialogOpen] = useState(false);
  const [participantDialogOpen, setParticipantDialogOpen] = useState(false);
  const [availableParticipants, setAvailableParticipants] = useState<string[]>([]);

  // PCF loading state
  const [isPcfLoading, setIsPcfLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Governance policies — use PCF_EXCHANGE_POLICIES_CONFIG from environment,
  // falling back to the default PCF policies (same as PCF Request/Response flows).
  const governancePolicies = useMemo(() => {
    const configured = getPcfExchangePoliciesConfig();
    if (configured.length > 0) {
      return configured.flatMap(def => generatePoliciesFromDefinition(def));
    }
    return DEFAULT_PCF_POLICIES;
  }, []);

  // Parse part ID and manufacturer ID from URL
  const manufacturerIdFromUrl = params?.manufacturerId;
  const partIdFromUrl = params?.partId;

  // Load part data when URL contains both params
  useEffect(() => {
    if (manufacturerIdFromUrl && partIdFromUrl) {
      const decodedManufacturerId = decodeURIComponent(manufacturerIdFromUrl);
      const decodedPartId = decodeURIComponent(partIdFromUrl);
      setManufacturerId(decodedManufacturerId);
      loadPartData(decodedManufacturerId, decodedPartId);
    }
  }, [manufacturerIdFromUrl, partIdFromUrl]);

  const loadPartData = async (manufacturerId: string, manufacturerPartId: string) => {
    setPageState('loading');
    setError(null);
    setCurrentStep(0);
    setManufacturerId(manufacturerId);

    try {
      // Step 1: Fetch catalog part details
      setCurrentStep(0);
      const catalogPart = await fetchCatalogPart(manufacturerId, manufacturerPartId);
      
      // Determine part status based on catalog part data
      // API status: 0 = Draft, 1 = Pending, 2 = Registered, 3 = Shared
      const isDraft = catalogPart.status === 0;
      
      if (isDraft) {
        // Part is in Draft status - not registered
        setPartReadiness('draft');
        const part: ManagedPart = {
          catenaXId: '',
          manufacturerPartId,
          partInstanceId: 'CATALOG',
          partName: catalogPart.name || `Product ${manufacturerPartId}`,
          hasPcf: false,
          pcfStatus: 'DRAFT'
        };
        setCurrentStep(3);
        await new Promise(resolve => setTimeout(resolve, 300));
        setManagedPart(part);
        setRawPcfData(null);
        setPageState('visualization');
        return;
      }

      // Step 2: Fetch PCF data for the part
      setCurrentStep(1);
      let pcfResponse: { pcfData?: Record<string, unknown>; exists: boolean } = { exists: false };
      
      try {
        const pcfResult = await getPcfByManufacturerPartId(manufacturerPartId);
        if (pcfResult && Object.keys(pcfResult).length > 0) {
          pcfResponse = { pcfData: pcfResult as Record<string, unknown>, exists: true };
        }
      } catch {
        // No PCF data found for this part
        pcfResponse = { exists: false };
      }

      // Step 3: Validate data
      setCurrentStep(2);
      await new Promise(resolve => setTimeout(resolve, 400));

      // Create managed part from catalog part
      const hasPcf = pcfResponse.exists;
      const pcfDataRecord = pcfResponse.pcfData;
      
      // Extract PCF values from raw data if available
      const pcfValue = pcfDataRecord?.pcfValue as number | undefined;
      const pcfValueUnit = (pcfDataRecord?.pcfValueUnit as string) || 'kg CO2e';

      const part: ManagedPart = {
        catenaXId: `urn:uuid:${crypto.randomUUID()}`,
        manufacturerPartId,
        partInstanceId: 'CATALOG',
        partName: catalogPart.name || `Product ${manufacturerPartId}`,
        hasPcf,
        pcfVersion: hasPcf ? (pcfDataRecord?.version as number) || 1 : undefined,
        pcfLastUpdated: hasPcf ? (pcfDataRecord?.updatedAt as string) || new Date().toISOString() : undefined,
        pcfValue: hasPcf ? pcfValue : undefined,
        pcfValueUnit: hasPcf ? pcfValueUnit : undefined,
        pcfStatus: hasPcf ? 'PUBLISHED' : undefined
      };

      // Step 4: Complete
      setCurrentStep(3);
      await new Promise(resolve => setTimeout(resolve, 300));

      if (!hasPcf) {
        setPartReadiness('registered-no-pcf');
        setManagedPart(part);
        setRawPcfData(null);
        setPageState('visualization');
        return;
      }

      setPartReadiness('has-pcf');
      setManagedPart(part);
      setRawPcfData((pcfDataRecord as PcfNestedData) || null);
      setPageState('visualization');
    } catch (err) {
      const message = err instanceof Error ? err.message : t('error.failedToLoadPart');
      setError(message);
      setPageState('error');
    }
  };

  // Handle selecting a part from search
  // Only navigate — the useEffect watching URL params triggers loadPartData to avoid a double call
  const handlePartSelect = (part: CatalogPartSearchResult) => {
    const encodedManufacturerId = encodeURIComponent(part.manufacturerId);
    const encodedPartId = encodeURIComponent(part.manufacturerPartId);
    setManufacturerId(part.manufacturerId);
    navigate(`/pcf/management/${encodedManufacturerId}/${encodedPartId}`);
  };

  // Handle back to search
  const handleBackToSearch = () => {
    setPageState('search');
    setManagedPart(null);
    setRawPcfData(null);
    setError(null);
    navigate('/pcf/management');
  };

  // Handle refresh data
  const handleRefresh = async () => {
    if (!managedPart || !manufacturerId) return;
    
    setIsRefreshing(true);
    try {
      // Refresh by reloading the entire part data
      await loadPartData(manufacturerId, managedPart.manufacturerPartId);
    } catch (err) {
      console.error('Failed to refresh data:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle opening the PCF create dialog - for parts with no PCF
  const handleOpenPcfCreateDialog = () => {
    setPcfCreateDialogOpen(true);
  };

  // Handle PCF created from PcfDataEditor
  const handlePcfCreated = async (pcfDataJson: Record<string, unknown>) => {
    if (!managedPart) return;

    setIsUploading(true);
    try {
      // Upload the new PCF data
      await uploadPcf(managedPart.manufacturerPartId, pcfDataJson);
      
      // Refresh the page data to show the new PCF
      if (manufacturerId) {
        await loadPartData(manufacturerId, managedPart.manufacturerPartId);
      }
      
      setPcfCreateDialogOpen(false);
    } catch (err) {
      console.error('Failed to upload PCF:', err);
      throw err; // Re-throw to let PcfDataEditor handle the error
    } finally {
      setIsUploading(false);
    }
  };

  // Handle saving edited PCF fields from PcfEditDialog
  // PcfEditDialog builds the full updated nested structure and passes it here.
  const handleEditSave = async (data: Record<string, unknown>) => {
    if (!managedPart) return;

    setIsUpdating(true);
    try {
      const participants = await updatePcfAndGetParticipants(
        managedPart.manufacturerPartId,
        data
      );
      setRawPcfData(data as PcfNestedData);
      setPcfEditDialogOpen(false);
      // Always open the notify dialog so the user sees who will be notified
      // (or learns that no one has requested this PCF yet).
      setAvailableParticipants(participants);
      setParticipantDialogOpen(true);
    } catch (err) {
      console.error('Failed to update PCF:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUploadPcf = async () => {
    if (!rawPcfData || !managedPart) return;

    setIsPcfLoading(true);
    try {
      // Update the PCF and get list of interested participants
      const participants = await updatePcfAndGetParticipants(
        managedPart.manufacturerPartId,
        rawPcfData
      );
      // Always open the notify dialog so the user sees who will be notified
      // (or learns that no one has requested this PCF yet).
      setAvailableParticipants(participants);
      setParticipantDialogOpen(true);
    } catch (err) {
      console.error('Failed to upload PCF:', err);
    } finally {
      setIsPcfLoading(false);
    }
  };

  // Handle notifying selected participants
  const handleNotifyParticipants = async (selectedParticipants: string[]) => {
    if (!managedPart) return;

    setIsUpdating(true);
    try {
      // Pass the same governance policies used for PCF Request/Response exchange.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await notifyParticipants(managedPart.manufacturerPartId, selectedParticipants, governancePolicies as any);
      
      // Refresh data after successful notification
      if (manufacturerId) {
        await loadPartData(manufacturerId, managedPart.manufacturerPartId);
      }
    } catch (err) {
      console.error('Failed to notify participants:', err);
      throw err;
    } finally {
      setIsUpdating(false);
    }
  };

  // Format date helper
  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString([], {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

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
              {t('loading.title')}
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', fontFamily: 'monospace' }}>
              {partIdFromUrl && decodeURIComponent(partIdFromUrl)}
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
                      {t(step.label)}
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
              {t('common.cancel')}
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
            {t('common.backToSearch')}
          </Button>
        </CardContent>
      </Card>
    </Box>
  );

  // Render visualization state
  const renderVisualization = () => {
    if (!managedPart) return null;

    const hasPcf = managedPart.hasPcf && rawPcfData;
    // Derive display values from nested Catena-X 9.0.0 structure using extractor helpers
    const pcfExclBio  = getPcfExcludingBiogenic(rawPcfData) ?? 0;
    const pcfInclBio  = getPcfIncludingBiogenic(rawPcfData) ?? 0;
    const primaryData = getPrimaryDataShare(rawPcfData) ?? 0;
    const geoCountry  = getGeographyCountry(rawPcfData) ?? 'N/A';
    const period      = getReferencePeriod(rawPcfData);
    const specVersion = getSpecVersion(rawPcfData) ?? 'N/A';
    const version     = getPcfVersion(rawPcfData) ?? 1;
    const rawStatus   = getPcfStatus(rawPcfData);
    const isPublished = mapPcfStatus(rawStatus) === 'PUBLISHED';
    const isDraft     = !isPublished;

    return (
      <Box sx={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header - Passport Provisioning style */}
        <Box sx={{ p: { xs: 2, sm: 3, md: 4 }, pb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            {/* Back Button */}
            <Tooltip title={t('common.newSearch')}>
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
            {/* Icon */}
            <Box
              sx={{
                width: { xs: 48, sm: 56 },
                height: { xs: 48, sm: 56 },
                borderRadius: '12px',
                background: `linear-gradient(135deg, ${PCF_PRIMARY} 0%, ${PCF_SECONDARY} 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: `0 4px 16px ${alpha(PCF_PRIMARY, 0.3)}`
              }}
            >
              <CloudUploadIcon sx={{ fontSize: { xs: 28, sm: 32 }, color: '#fff' }} />
            </Box>
            {/* Title & Subtitle */}
            <Box sx={{ flex: 1 }}>
              <Typography
                variant="h4"
                sx={{
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: { xs: '1.5rem', sm: '2rem', md: '2.25rem' }
                }}
              >
                {t('management.title')}
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: 'rgba(255, 255, 255, 0.6)',
                  fontSize: { xs: '0.875rem', sm: '1rem' }
                }}
              >
                {t('management.subtitle')}
              </Typography>
            </Box>
            {/* Right side: Part info and refresh */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                <PartInfoHeader
                  manufacturerId={manufacturerId}
                  manufacturerPartId={managedPart.manufacturerPartId}
                  partName={managedPart.partName}
                  hideOnSmallScreens={false}
                />
              </Box>
              <Tooltip title={t('common.refresh')}>
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

        {/* Content */}
        <Box sx={{ flex: 1, px: { xs: 2, sm: 3, md: 4 }, pb: 4 }}>
          <Card
            sx={{
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px'
            }}
          >
            <CardContent sx={{ p: 3 }}>
              {/* Section Header */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{ p: 1, borderRadius: '8px', background: alpha(PCF_PRIMARY, 0.15) }}>
                    <Co2 sx={{ color: PCF_PRIMARY }} />
                  </Box>
                  <Box>
                    <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600 }}>
                      {t('management.pcfData')}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                      {t('management.pcfDataSubtitle')}
                    </Typography>
                  </Box>
                </Box>

                {/* Status Badge */}
                {hasPcf && (
                  <Chip
                    icon={isPublished ? <CheckCircle sx={{ fontSize: 14 }} /> : <DraftsOutlined sx={{ fontSize: 14 }} />}
                    label={isPublished ? t('common.published') : t('common.draft')}
                    size="small"
                    sx={{
                      backgroundColor: isPublished ? alpha(PCF_PRIMARY, 0.15) : alpha('#eab308', 0.15),
                      color: isPublished ? PCF_PRIMARY : '#eab308',
                      border: `1px solid ${alpha(isPublished ? PCF_PRIMARY : '#eab308', 0.3)}`,
                      fontWeight: 600,
                      '& .MuiChip-icon': { color: isPublished ? PCF_PRIMARY : '#eab308' }
                    }}
                  />
                )}
              </Box>

              {/* Loading State */}
              {isPcfLoading && (
                <Box sx={{ mb: 3 }}>
                  <LinearProgress
                    sx={{
                      borderRadius: 2,
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      '& .MuiLinearProgress-bar': { backgroundColor: PCF_PRIMARY }
                    }}
                  />
                </Box>
              )}

              {/* Wizard for Draft or No PCF */}
              {!hasPcf && !isPcfLoading && (
                <Box sx={{ py: 3 }}>
                  {/* 3-Step Wizard */}
                  <Stepper
                    alternativeLabel
                    activeStep={partReadiness === 'draft' ? 0 : partReadiness === 'registered-no-pcf' ? 1 : 2}
                    connector={<ColoredStepConnector />}
                    sx={{ mb: 4 }}
                  >
                    {/* Step 1: Register Catalog Part */}
                    <Step completed={partReadiness !== 'draft'}>
                      <StepLabel
                        StepIconComponent={({ active, completed }) => (
                          <Box
                            sx={{
                              width: 40,
                              height: 40,
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: completed
                                ? `linear-gradient(135deg, ${PCF_PRIMARY} 0%, ${PCF_SECONDARY} 100%)`
                                : active
                                ? alpha(PCF_PRIMARY, 0.2)
                                : 'rgba(255, 255, 255, 0.05)',
                              border: active ? `2px solid ${PCF_PRIMARY}` : 'none',
                              boxShadow: completed ? `0 4px 12px ${alpha(PCF_PRIMARY, 0.3)}` : 'none'
                            }}
                          >
                            {completed ? (
                              <CheckCircle sx={{ fontSize: 22, color: '#fff' }} />
                            ) : (
                              <Inventory sx={{ fontSize: 20, color: active ? PCF_PRIMARY : 'rgba(255, 255, 255, 0.3)' }} />
                            )}
                          </Box>
                        )}
                      >
                        <Typography sx={{ color: partReadiness !== 'draft' ? PCF_PRIMARY : '#fff', fontWeight: 600 }}>
                          {t('management.stepRegister')}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                          {t('management.stepRegisterDesc')}
                        </Typography>
                      </StepLabel>
                    </Step>

                    {/* Step 2: Upload PCF Data */}
                    <Step completed={partReadiness === 'has-pcf'}>
                      <StepLabel
                        StepIconComponent={({ active, completed }) => (
                          <Box
                            sx={{
                              width: 40,
                              height: 40,
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: completed
                                ? `linear-gradient(135deg, ${PCF_PRIMARY} 0%, ${PCF_SECONDARY} 100%)`
                                : active
                                ? alpha(PCF_PRIMARY, 0.2)
                                : 'rgba(255, 255, 255, 0.05)',
                              border: active ? `2px solid ${PCF_PRIMARY}` : 'none',
                              boxShadow: completed ? `0 4px 12px ${alpha(PCF_PRIMARY, 0.3)}` : 'none'
                            }}
                          >
                            {completed ? (
                              <CheckCircle sx={{ fontSize: 22, color: '#fff' }} />
                            ) : (
                              <AddBox sx={{ fontSize: 20, color: active ? PCF_PRIMARY : 'rgba(255, 255, 255, 0.3)' }} />
                            )}
                          </Box>
                        )}
                      >
                        <Typography sx={{ color: partReadiness === 'has-pcf' ? PCF_PRIMARY : partReadiness === 'registered-no-pcf' ? '#fff' : 'rgba(255, 255, 255, 0.4)', fontWeight: 600 }}>
                          {t('management.stepUpload')}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                          {t('management.stepUploadDesc')}
                        </Typography>
                      </StepLabel>
                    </Step>

                    {/* Step 3: PCF Data */}
                    <Step completed={partReadiness === 'has-pcf'}>
                      <StepLabel
                        StepIconComponent={({ active, completed }) => (
                          <Box
                            sx={{
                              width: 40,
                              height: 40,
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: completed
                                ? `linear-gradient(135deg, ${PCF_PRIMARY} 0%, ${PCF_SECONDARY} 100%)`
                                : active
                                ? alpha(PCF_PRIMARY, 0.2)
                                : 'rgba(255, 255, 255, 0.05)',
                              border: active ? `2px solid ${PCF_PRIMARY}` : 'none',
                              boxShadow: completed ? `0 4px 12px ${alpha(PCF_PRIMARY, 0.3)}` : 'none'
                            }}
                          >
                            {completed ? (
                              <CheckCircle sx={{ fontSize: 22, color: '#fff' }} />
                            ) : (
                              <PlaylistAdd sx={{ fontSize: 20, color: active ? PCF_PRIMARY : 'rgba(255, 255, 255, 0.3)' }} />
                            )}
                          </Box>
                        )}
                      >
                        <Typography sx={{ color: partReadiness === 'has-pcf' ? PCF_PRIMARY : 'rgba(255, 255, 255, 0.4)', fontWeight: 600 }}>
                          {t('management.stepPcfData')}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                          {t('management.stepPcfDataDesc')}
                        </Typography>
                      </StepLabel>
                    </Step>
                  </Stepper>

                  {/* Action Card based on current step.
                       Increased background opacity and backdrop blur so it reads
                       clearly over the page background. */}
                  <Box
                    sx={{
                      p: 3,
                      borderRadius: '12px',
                      background: alpha(PCF_PRIMARY, 0.12),
                      border: `1px solid ${alpha(PCF_PRIMARY, 0.25)}`,
                      backdropFilter: 'blur(8px)',
                      textAlign: 'center'
                    }}
                  >
                    {partReadiness === 'draft' && (
                      <>
                        <Box sx={{ mb: 2 }}>
                          <Chip
                            icon={<DraftsOutlined sx={{ fontSize: 14 }} />}
                            label={t('management.draftPart')}
                            size="small"
                            sx={{
                              backgroundColor: alpha('#eab308', 0.15),
                              color: '#eab308',
                              border: `1px solid ${alpha('#eab308', 0.3)}`,
                              fontWeight: 600
                            }}
                          />
                        </Box>
                        <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600, mb: 1 }}>
                          {t('management.registerTitle')}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', mb: 3, maxWidth: 400, mx: 'auto' }}>
                          {t('management.registerDescription')}
                        </Typography>
                        <Button
                          variant="contained"
                          startIcon={<Inventory />}
                          endIcon={<OpenInNew sx={{ fontSize: 16 }} />}
                          onClick={() => navigate(`/product/${encodeURIComponent(manufacturerId)}/${encodeURIComponent(managedPart.manufacturerPartId)}`)}
                          sx={{
                            px: 4,
                            py: 1.5,
                            borderRadius: '10px',
                            textTransform: 'none',
                            fontWeight: 600,
                            background: `linear-gradient(135deg, ${PCF_PRIMARY} 0%, ${PCF_SECONDARY} 100%)`,
                            '&:hover': { background: `linear-gradient(135deg, ${PCF_SECONDARY} 0%, ${PCF_PRIMARY} 100%)` }
                          }}
                        >
                          {t('management.goToCatalog')}
                        </Button>
                      </>
                    )}

                    {partReadiness === 'registered-no-pcf' && (
                      <>
                        <Box sx={{ mb: 2 }}>
                          <Chip
                            icon={<CheckCircle sx={{ fontSize: 14 }} />}
                            label={t('management.registeredPart')}
                            size="small"
                            sx={{
                              backgroundColor: alpha(PCF_PRIMARY, 0.15),
                              color: PCF_PRIMARY,
                              border: `1px solid ${alpha(PCF_PRIMARY, 0.3)}`,
                              fontWeight: 600
                            }}
                          />
                        </Box>
                        <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600, mb: 1 }}>
                          {t('management.uploadTitle')}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', mb: 3, maxWidth: 400, mx: 'auto' }}>
                          {t('management.uploadDescription')}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                          <Button
                            variant="contained"
                            startIcon={isUploading ? <CircularProgress size={18} sx={{ color: 'inherit' }} /> : <PlaylistAdd />}
                            onClick={handleOpenPcfCreateDialog}
                            disabled={isUploading}
                            sx={{
                              px: 4,
                              py: 1.5,
                              borderRadius: '10px',
                              textTransform: 'none',
                              fontWeight: 600,
                              background: `linear-gradient(135deg, ${PCF_PRIMARY} 0%, ${PCF_SECONDARY} 100%)`,
                              '&:hover': { background: `linear-gradient(135deg, ${PCF_SECONDARY} 0%, ${PCF_PRIMARY} 100%)` }
                            }}
                          >
                            {isUploading ? t('management.uploading') : t('management.uploadButton')}
                          </Button>
                        </Box>
                      </>
                    )}
                  </Box>
                </Box>
              )}

              {/* Has PCF Data — rendered inline inside this Card (no nested card) */}
              {hasPcf && !isPcfLoading && managedPart && (
                <PcfManagementSection
                  part={managedPart}
                  pcfData={rawPcfData}
                  onVisualize={() => navigate(`/pcf/management/details/${encodeURIComponent(managedPart.manufacturerPartId)}`)}
                  onEdit={() => navigate(`/pcf/management/edit/${encodeURIComponent(managedPart.manufacturerPartId)}`)}
                  onUpload={handleUploadPcf}
                  onPublish={handleUploadPcf}
                  isLoading={isPcfLoading}
                  contentOnly
                />
              )}
            </CardContent>
          </Card>
        </Box>

        <PcfDetailsDialog
          open={pcfDetailsDialogOpen}
          onClose={() => setPcfDetailsDialogOpen(false)}
          pcfData={rawPcfData}
          part={managedPart}
        />

        <PcfEditDialog
          open={pcfEditDialogOpen}
          onClose={() => setPcfEditDialogOpen(false)}
          onSave={handleEditSave}
          pcfData={rawPcfData}
          part={managedPart}
        />

        {/* Participant Selection Dialog - for notifying parties about updates */}
        <ParticipantSelectionDialog
          open={participantDialogOpen}
          onClose={() => setParticipantDialogOpen(false)}
          onConfirm={handleNotifyParticipants}
          participants={availableParticipants}
          manufacturerPartId={managedPart?.manufacturerPartId || ''}
          isLoading={isUpdating}
        />

        {/* Create PCF Dialog - for parts without PCF data */}
        {pcfCreateDialogOpen && (
          <Box
            sx={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 1300,
              bgcolor: 'rgba(0, 0, 0, 0.75)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              p: 3,
            }}
            onClick={() => !isUploading && setPcfCreateDialogOpen(false)}
          >
            <Box
              sx={{ maxWidth: 800, width: '100%' }}
              onClick={(e) => e.stopPropagation()}
            >
              <PcfDataEditor
                onSave={handlePcfCreated}
                onCancel={() => setPcfCreateDialogOpen(false)}
                mode="create"
                manufacturerPartId={managedPart?.manufacturerPartId || ''}
                isSaving={isUploading}
              />
            </Box>
          </Box>
        )}
      </Box>
    );
  };

  // Render search state
  const renderSearch = () => (
    <CatalogPartSearch
      icon={<CloudUploadIcon sx={{ fontSize: 36, color: '#fff' }} />}
      title={t('management.title')}
      subtitle={t('management.searchSubtitle')}
      onPartSelect={handlePartSelect}
      searchPlaceholder={t('management.searchPlaceholder')}
      searchButtonText={t('management.searchButton')}
    />
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

export default PcfManagementPage;
