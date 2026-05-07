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

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  IconButton,
  CircularProgress,
  alpha,
  Tooltip,
  Collapse,
  Alert
} from '@mui/material';
import {
  Calculate as CalculateIcon,
  CheckCircle,
  RadioButtonUnchecked,
  Downloading,
  Security,
  VerifiedUser,
  Add,
  AddCircleOutline,
  ArrowBack,
  Refresh,
  Error as ErrorIcon,
  HourglassEmpty,
  ExpandMore,
  ExpandLess,
  Download,
  Category,
  AccountTree,
  Send,
  Block,
  Search
} from '@mui/icons-material';
import { CatalogPartSearch, CatalogPartSearchResult as SharedCatalogPartSearchResult, PartInfoHeader } from '../../shared/components';
import {
  getCatalogPartWithSubparts,
  addSubpartRelation,
  requestSubpartPcf,
  CatalogPartPcfResponse,
  SubpartPcfResponse,
  AddSubpartFormData
} from '../api/pcfRequestApi';
import {
  getPcfStatus,
  downloadPcfData,
  PcfSpecificStateModel
} from '../../services/pcfApi';
import { downloadJson } from '@/utils/downloadJson';
import AddSubpartDialog from '../components/AddSubpartDialog';

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
  { id: 'search', label: 'loading.searchingPart', icon: Search, description: 'loading.searchingPartDesc' },
  { id: 'subparts', label: 'loading.loadingSubparts', icon: Downloading, description: 'loading.loadingSubpartsDesc' },
  { id: 'status', label: 'loading.checkingStatus', icon: Security, description: 'loading.checkingStatusDesc' },
  { id: 'complete', label: 'loading.ready', icon: VerifiedUser, description: 'loading.readyDesc' }
];

type PageState = 'search' | 'loading' | 'visualization' | 'error';

const PcfRequestPage: React.FC = () => {
  const { t } = useTranslation('pcf');
  const navigate = useNavigate();
  const params = useParams();

  // Page state
  const [pageState, setPageState] = useState<PageState>('search');
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Data state
  const [partData, setPartData] = useState<CatalogPartPcfResponse | null>(null);
  // PCF assembly progress from backend (overrides local calculation when available)
  const [pcfStatus, setPcfStatus] = useState<PcfSpecificStateModel | null>(null);

  // Download state
  const [isDownloading, setIsDownloading] = useState(false);
  // Non-null when backend fails to return PCF collection status
  const [pcfStatusError, setPcfStatusError] = useState<string | null>(null);
  // Non-null when the PCF data download API call fails
  const [downloadError, setDownloadError] = useState<string | null>(null);

  // Dialog state
  const [addSubpartDialogOpen, setAddSubpartDialogOpen] = useState(false);

  // Inline loading state for adding subparts (no page transition)
  const [isAddingSubpart, setIsAddingSubpart] = useState(false);
  const [newlyAddedSubpartId, setNewlyAddedSubpartId] = useState<string | null>(null);

  // Expanded subparts
  const [expandedSubparts, setExpandedSubparts] = useState<Set<string>>(new Set());

  // Sending/polling state per subpartId: 'sending' while API call in flight, 'polling' while waiting for status change
  const [subpartSendingState, setSubpartSendingState] = useState<Map<string, 'sending' | 'polling'>>(new Map());
  const pollingIntervalsRef = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());

  // Parse part ID and manufacturer ID from URL
  const partIdFromUrl = params?.partId;

  // Load part data when URL contains partId
  useEffect(() => {
    if (partIdFromUrl) {
      const decodedPartId = decodeURIComponent(partIdFromUrl);
      loadPartData(decodedPartId);
    }
  }, [partIdFromUrl]);

  // Cleanup all polling intervals when the component unmounts
  useEffect(() => {
    return () => {
      pollingIntervalsRef.current.forEach(intervalId => clearInterval(intervalId));
      pollingIntervalsRef.current.clear();
    };
  }, []);

  const loadPartData = async (manufacturerPartId: string) => {
    setPageState('loading');
    setError(null);
    setPcfStatusError(null);
    setDownloadError(null);
    setCurrentStep(0);

    try {
      // Step 1: Search for part
      setCurrentStep(0);
      await new Promise(resolve => setTimeout(resolve, 600));

      // Step 2: Load subparts
      setCurrentStep(1);
      await new Promise(resolve => setTimeout(resolve, 800));

      const partWithSubparts = await getCatalogPartWithSubparts(manufacturerPartId);
      if (!partWithSubparts) {
        throw new Error(`Catalog part not found: ${manufacturerPartId}`);
      }

      // Step 3: Check status
      setCurrentStep(2);
      await new Promise(resolve => setTimeout(resolve, 600));

      // Step 4: Complete
      setCurrentStep(3);
      await new Promise(resolve => setTimeout(resolve, 400));

      setPartData(partWithSubparts);

      // Fetch PCF assembly progress from backend.
      // A failure sets pcfStatusError which is shown in the UI — no local fallback.
      try {
        const status = await getPcfStatus(manufacturerPartId);
        setPcfStatus(status);
        setPcfStatusError(null);
      } catch {
        setPcfStatus(null);
        setPcfStatusError('Could not retrieve PCF collection status from the server. Refresh to retry.');
      }

      setPageState('visualization');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load part data';
      setError(message);
      setPageState('error');
    }
  };

  // Handle back to search
  const handleBackToSearch = () => {
    setPageState('search');
    setPartData(null);
    setError(null);
    navigate('/pcf/precalculation');
  };

  // Handle refresh data
  const handleRefresh = async () => {
    if (partData) {
      await loadPartData(partData.manufacturerPartId);
      await handleRefreshProgress(partData.manufacturerPartId);
    }
  };

  // Silently refresh PCF assembly progress without reloading the whole page
  const handleRefreshProgress = async (manufacturerPartId: string) => {
    try {
      const status = await getPcfStatus(manufacturerPartId);
      setPcfStatus(status);
      setPcfStatusError(null);
    } catch {
      setPcfStatus(null);
      setPcfStatusError('Could not retrieve PCF collection status from the server. Refresh to retry.');
    }
  };

  // Handle downloading the aggregated PCF JSON
  const handleDownloadJson = async () => {
    if (!partData || isDownloading) return;
    setIsDownloading(true);
    setDownloadError(null);
    try {
      const data = await downloadPcfData(partData.manufacturerPartId);
      downloadJson(data, `pcf-data-${partData.manufacturerPartId}.json`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected error';
      setDownloadError(`Download failed: ${message}. Please check the backend and try again.`);
    } finally {
      setIsDownloading(false);
    }
  };

  // Silent refresh - updates data without loading animation
  const handleSilentRefresh = async () => {
    if (partData) {
      try {
        const updatedPart = await getCatalogPartWithSubparts(partData.manufacturerPartId);
        if (updatedPart) {
          setPartData(updatedPart);
        }
      } catch (err) {
        console.error('Failed to refresh data:', err);
      }
    }
  };

  // Handle adding subpart with inline loading
  const handleAddSubpartComplete = async (formData: AddSubpartFormData) => {
    if (!partData) return;
    
    setIsAddingSubpart(true);
    try {
      // Make the API call
      const newSubpart = await addSubpartRelation(partData.manufacturerPartId, formData);
      
      // Refresh data
      await handleSilentRefresh();
      
      // Highlight the newly added subpart briefly
      setNewlyAddedSubpartId(newSubpart?.id || null);
      setTimeout(() => setNewlyAddedSubpartId(null), 2500);
    } catch (err) {
      console.error('Failed to add subpart:', err);
    } finally {
      setIsAddingSubpart(false);
    }
  };

  // Toggle subpart expansion
  const toggleSubpartExpansion = (subpartId: string) => {
    setExpandedSubparts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(subpartId)) {
        newSet.delete(subpartId);
      } else {
        newSet.add(subpartId);
      }
      return newSet;
    });
  };

  // Get status color and icon
  const getStatusInfo = (status: SubpartPcfResponse['pcfStatus']) => {
    switch (status) {
      case 'delivered':
        return { color: PCF_PRIMARY, icon: CheckCircle, label: 'Delivered', lineColor: PCF_PRIMARY };
      case 'rejected':
        return { color: '#ef4444', icon: Block, label: 'Rejected', lineColor: '#ef4444' };
      case 'error':
        return { color: '#ef4444', icon: ErrorIcon, label: 'Error', lineColor: '#ef4444' };
      case 'pending':
      default:
        return { color: '#f59e0b', icon: HourglassEmpty, label: 'Pending', lineColor: '#f59e0b' };
    }
  };

  /** Returns a contextual tooltip message for the subpart row based on its current state */
  const getSubpartRowTooltip = (subpart: SubpartPcfResponse, sendingState?: 'sending' | 'polling'): string => {
    if (sendingState === 'sending') return t('precalculation.subpartTooltip.sending');
    if (sendingState === 'polling') return t('precalculation.subpartTooltip.polling');
    switch (subpart.pcfStatus) {
      case 'pending':
        return t('precalculation.subpartTooltip.pending');
      case 'delivered':
        return subpart.pcfValue
          ? t('precalculation.subpartTooltip.deliveredWithValue', {
              value: subpart.pcfValue,
              unit: subpart.pcfUnit || 'kg CO₂e'
            })
          : t('precalculation.subpartTooltip.deliveredNoValue');
      case 'rejected':
        return subpart.rejectReason
          ? t('precalculation.subpartTooltip.rejectedWithReason', {
              reason: subpart.rejectReason
            })
          : t('precalculation.subpartTooltip.rejectedNoReason');
      case 'error':
        return subpart.errorMessage
          ? t('precalculation.subpartTooltip.errorWithMessage', {
              error: subpart.errorMessage
            })
          : t('precalculation.subpartTooltip.errorNoMessage');
      default:
        return '';
    }
  };

  // Handle request PCF for single subpart
  // Starts polling every 5 s until pcfStatus changes from 'pending' (max 30 iterations)
  const startPollingSubpart = (manufacturerPartId: string, subpartId: string) => {
    let iterations = 0;
    const MAX_ITERATIONS = 30;
    const intervalId = setInterval(async () => {
      iterations++;
      if (iterations > MAX_ITERATIONS) {
        clearInterval(intervalId);
        pollingIntervalsRef.current.delete(subpartId);
        setSubpartSendingState(prev => {
          const next = new Map(prev);
          next.delete(subpartId);
          return next;
        });
        return;
      }
      try {
        const updatedPart = await getCatalogPartWithSubparts(manufacturerPartId);
        if (updatedPart) {
          const updatedSubpart = updatedPart.subparts.find(s => s.id === subpartId);
          if (updatedSubpart && updatedSubpart.pcfStatus !== 'pending') {
            clearInterval(intervalId);
            pollingIntervalsRef.current.delete(subpartId);
            setSubpartSendingState(prev => {
              const next = new Map(prev);
              next.delete(subpartId);
              return next;
            });
            setPartData(updatedPart);
          }
        }
      } catch (err) {
        console.error('Polling error for subpart:', subpartId, err);
      }
    }, 5000);
    pollingIntervalsRef.current.set(subpartId, intervalId);
  };

  const handleRequestPcf = async (subpartId: string) => {
    if (!partData) return;

    setSubpartSendingState(prev => new Map(prev).set(subpartId, 'sending'));
    try {
      await requestSubpartPcf(partData.manufacturerPartId, subpartId);
      setSubpartSendingState(prev => new Map(prev).set(subpartId, 'polling'));
      startPollingSubpart(partData.manufacturerPartId, subpartId);
    } catch (err) {
      console.error('Failed to request PCF:', err);
      setSubpartSendingState(prev => {
        const next = new Map(prev);
        next.delete(subpartId);
        return next;
      });
    }
  };

  // Calculate progress stats for the main part
  const stats = useMemo(() => {
    if (!partData) return { total: 0, delivered: 0, pending: 0, rejected: 0, error: 0, progress: 0 };
    const delivered = partData.subparts.filter(s => s.pcfStatus === 'delivered').length;
    const total = partData.subparts.length;
    return {
      total,
      delivered,
      pending: partData.subparts.filter(s => s.pcfStatus === 'pending').length,
      rejected: partData.subparts.filter(s => s.pcfStatus === 'rejected').length,
      error: partData.subparts.filter(s => s.pcfStatus === 'error').length,
      progress: total > 0 ? Math.round((delivered / total) * 100) : 0
    };
  }, [partData]);

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
          borderRadius: { xs: '16px', md: '20px' },
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
        }}
      >
        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          {/* Header */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography variant="h5" sx={{ color: '#fff', fontWeight: 600, mb: 1 }}>
              {t('loading.title')}
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', fontFamily: 'monospace' }}>
              {partIdFromUrl ? decodeURIComponent(partIdFromUrl) : ''}
            </Typography>
          </Box>

          {/* Progress Steps - Horizontal */}
          <Box sx={{ mb: 4 }}>
            {/* Step Icons Row */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
              {LOADING_STEPS.map((step, index) => {
                const Icon = step.icon;
                const isActive = index === currentStep;
                const isCompleted = index < currentStep;
                const isPending = index > currentStep;

                return (
                  <React.Fragment key={step.id}>
                    {/* Step Icon */}
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        flex: 1,
                        position: 'relative',
                        transition: 'all 0.3s ease',
                        opacity: isPending ? 0.4 : 1
                      }}
                    >
                      <Box
                        sx={{
                          width: { xs: 36, sm: 44 },
                          height: { xs: 36, sm: 44 },
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
                          transition: 'all 0.3s ease',
                          position: 'relative',
                          zIndex: 2,
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
                          <CheckCircle sx={{ fontSize: { xs: 20, sm: 24 }, color: '#fff' }} />
                        ) : isActive ? (
                          <Icon sx={{ fontSize: { xs: 20, sm: 24 }, color: PCF_PRIMARY }} />
                        ) : (
                          <RadioButtonUnchecked sx={{ fontSize: { xs: 20, sm: 24 }, color: 'rgba(255, 255, 255, 0.3)' }} />
                        )}
                      </Box>
                      
                      {/* Step Label */}
                      <Typography
                        variant="caption"
                        sx={{
                          color: isActive || isCompleted ? '#fff' : 'rgba(255, 255, 255, 0.5)',
                          fontWeight: isActive ? 600 : 500,
                          fontSize: { xs: '0.65rem', sm: '0.75rem' },
                          mt: 1,
                          textAlign: 'center',
                          transition: 'all 0.3s ease',
                          display: { xs: 'none', sm: 'block' }
                        }}
                      >
                        {t(step.label)}
                      </Typography>
                    </Box>

                    {/* Connector Line */}
                    {index < LOADING_STEPS.length - 1 && (
                      <Box
                        sx={{
                          height: 2,
                          flex: 1,
                          mx: { xs: 0.5, sm: 1 },
                          background: isCompleted
                            ? `linear-gradient(90deg, ${PCF_PRIMARY} 0%, ${PCF_SECONDARY} 100%)`
                            : 'rgba(255, 255, 255, 0.1)',
                          transition: 'all 0.5s ease',
                          position: 'relative',
                          top: { xs: -18, sm: -22 }
                        }}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </Box>

            {/* Active Step Description */}
            {LOADING_STEPS[currentStep] && (
              <Box
                sx={{
                  textAlign: 'center',
                  p: 2,
                  borderRadius: '10px',
                  background: alpha(PCF_PRIMARY, 0.1),
                  border: `1px solid ${alpha(PCF_PRIMARY, 0.2)}`
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    color: '#fff',
                    fontWeight: 600,
                    mb: 0.5,
                    fontSize: { xs: '0.85rem', sm: '0.9rem' }
                  }}
                >
                  {t(LOADING_STEPS[currentStep].label)}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: 'rgba(255, 255, 255, 0.6)',
                    fontSize: { xs: '0.75rem', sm: '0.8rem' }
                  }}
                >
                  {t(LOADING_STEPS[currentStep].description)}
                </Typography>
              </Box>
            )}
          </Box>

          {/* Cancel Button */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Button
              variant="outlined"
              onClick={handleBackToSearch}
              sx={{
                borderColor: 'rgba(255, 255, 255, 0.2)',
                color: 'rgba(255, 255, 255, 0.7)',
                textTransform: 'none',
                px: 3,
                py: 1,
                borderRadius: '10px',
                '&:hover': {
                  borderColor: 'rgba(255, 255, 255, 0.4)',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)'
                }
              }}
            >
              {t('common.cancel')}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );

  // Render error state
  const renderError = () => (
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
          maxWidth: '500px',
          width: '100%',
          background: 'linear-gradient(135deg, rgba(30, 30, 30, 0.95) 0%, rgba(20, 20, 20, 0.95) 100%)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px'
        }}
      >
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center' }}>
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: alpha('#ef4444', 0.15),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
                mb: 2
              }}
            >
              <ErrorIcon sx={{ fontSize: 32, color: '#ef4444' }} />
            </Box>
            <Typography variant="h6" sx={{ color: '#fff', mb: 1 }}>
              {t('error.failedToLoadPart')}
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', mb: 3 }}>
              {error}
            </Typography>
            <Button
              variant="contained"
              onClick={handleBackToSearch}
              sx={{
                background: `linear-gradient(135deg, ${PCF_PRIMARY} 0%, ${PCF_SECONDARY} 100%)`,
                textTransform: 'none',
                borderRadius: '10px'
              }}
            >
              {t('common.backToSearch')}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );

  // Render visualization state
  const renderVisualization = () => {
    if (!partData) return null;

    return (
      <Box sx={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header - Similar to PCF Exchange */}
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
                <CalculateIcon sx={{ fontSize: { xs: 28, sm: 32 }, color: '#fff' }} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography
                  variant="h4"
                  sx={{
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: { xs: '1.5rem', sm: '2rem', md: '2.25rem' }
                  }}
                >
                  {t('precalculation.title')}
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    color: 'rgba(255, 255, 255, 0.6)',
                    fontSize: { xs: '0.875rem', sm: '1rem' }
                  }}
                >
                  {t('precalculation.subtitle')}
                </Typography>
              </Box>
            </Box>

            {/* Right: Part info and actions */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                <PartInfoHeader
                  manufacturerId={partData.manufacturerId}
                  manufacturerPartId={partData.manufacturerPartId}
                  partName={partData.partName}
                  hideOnSmallScreens={false}
                />
              </Box>
              <Tooltip title={t('common.refresh')}>
                <IconButton
                  onClick={handleRefresh}
                  sx={{ 
                    color: 'rgba(255,255,255,0.7)', 
                    border: '1px solid rgba(255,255,255,0.1)',
                    '&:hover': { color: PCF_PRIMARY, borderColor: alpha(PCF_PRIMARY, 0.3), background: alpha(PCF_PRIMARY, 0.1) }
                  }}
                >
                  <Refresh />
                </IconButton>
              </Tooltip>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setAddSubpartDialogOpen(true)}
                sx={{
                  background: `linear-gradient(135deg, ${PCF_PRIMARY} 0%, ${PCF_SECONDARY} 100%)`,
                  textTransform: 'none',
                  borderRadius: '10px',
                  px: 2.5,
                  py: 1,
                  fontWeight: 600,
                  '&:hover': {
                    background: `linear-gradient(135deg, ${PCF_SECONDARY} 0%, ${PCF_PRIMARY} 100%)`
                  }
                }}
              >
                {t('precalculation.addSubpartRelation')}
              </Button>
            </Box>
          </Box>
        </Box>

        {/* Progress Bar for Main Part */}
        <Box sx={{ px: 3, pt: 2, pb: 2 }}>
          {/* Progress Header with Download Button
              Progress and completion state are driven exclusively by the backend pcf-status endpoint.
              If the backend call fails, pcfStatusError is shown and the Download button stays disabled. */}
          {(() => {
            // Source of truth is the backend only — no local fallback.
            const displayProgress = pcfStatus?.progressPercentage ?? 0;
            const isComplete = pcfStatus?.overallStatus === 'COMPLETED';
            return (
              <>
                {/* Backend status error — shown when getPcfStatus fails */}
                {pcfStatusError && (
                  <Alert
                    severity="warning"
                    onClose={() => setPcfStatusError(null)}
                    sx={{ mb: 1.5, borderRadius: '8px', fontSize: '0.8rem' }}
                  >
                    {pcfStatusError}
                  </Alert>
                )}

                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                  <Typography variant="subtitle2" sx={{ color: '#fff', fontWeight: 600 }}>
                    {t('precalculation.collectionProgress')}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    {!pcfStatusError && (
                      <Typography variant="body2" sx={{ color: PCF_PRIMARY, fontWeight: 600 }}>
                        {displayProgress}%
                      </Typography>
                    )}
                    <Tooltip title={
                      pcfStatusError
                        ? t('precalculation.statusUnavailable')
                        : isComplete
                          ? t('precalculation.downloadAggregated')
                          : t('precalculation.completeToDownload')
                    }>
                      <span>
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={isDownloading
                            ? <CircularProgress size={14} sx={{ color: 'inherit' }} />
                            : <Download />}
                          disabled={!isComplete || isDownloading || !!pcfStatusError}
                          onClick={handleDownloadJson}
                          sx={{
                            background: isComplete && !pcfStatusError
                              ? `linear-gradient(135deg, ${PCF_PRIMARY} 0%, ${PCF_SECONDARY} 100%)`
                              : 'rgba(255,255,255,0.1)',
                            textTransform: 'none',
                            borderRadius: '8px',
                            px: 2,
                            py: 0.5,
                            fontWeight: 600,
                            fontSize: '0.75rem',
                            '&:hover': {
                              background: isComplete && !pcfStatusError
                                ? `linear-gradient(135deg, ${PCF_SECONDARY} 0%, ${PCF_PRIMARY} 100%)`
                                : 'rgba(255,255,255,0.1)'
                            },
                            '&.Mui-disabled': {
                              color: 'rgba(255,255,255,0.3)',
                              background: 'rgba(255,255,255,0.05)'
                            }
                          }}
                        >
                          {isDownloading ? t('precalculation.downloading') : t('precalculation.downloadJson')}
                        </Button>
                      </span>
                    </Tooltip>
                  </Box>
                </Box>

                {/* Progress Bar */}
                <Box sx={{
                  height: 8,
                  borderRadius: 4,
                  background: 'rgba(255,255,255,0.1)',
                  overflow: 'hidden',
                  mb: 2
                }}>
                  <Box sx={{
                    height: '100%',
                    width: `${displayProgress}%`,
                    background: `linear-gradient(90deg, ${PCF_PRIMARY} 0%, ${PCF_SECONDARY} 100%)`,
                    borderRadius: 4,
                    transition: 'width 0.5s ease'
                  }} />
                </Box>

                {/* Download error — shown when downloadPcfData API call fails */}
                {downloadError && (
                  <Alert
                    severity="error"
                    onClose={() => setDownloadError(null)}
                    sx={{ mb: 1, borderRadius: '8px', fontSize: '0.8rem' }}
                  >
                    {downloadError}
                  </Alert>
                )}
              </>
            );
          })()}

          {/* Stats Cards */}
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Card sx={{ flex: 1, minWidth: 140, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px' }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>{t('precalculation.totalSubparts')}</Typography>
                <Typography variant="h4" sx={{ color: '#fff', fontWeight: 700 }}>{stats.total}</Typography>
              </CardContent>
            </Card>
            <Card sx={{ flex: 1, minWidth: 140, background: alpha(PCF_PRIMARY, 0.1), border: `1px solid ${alpha(PCF_PRIMARY, 0.2)}`, borderRadius: '12px' }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Typography variant="caption" sx={{ color: PCF_PRIMARY }}>{t('precalculation.delivered')}</Typography>
                <Typography variant="h4" sx={{ color: PCF_PRIMARY, fontWeight: 700 }}>{stats.delivered}</Typography>
              </CardContent>
            </Card>
            <Card sx={{ flex: 1, minWidth: 140, background: alpha('#f59e0b', 0.1), border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: '12px' }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Typography variant="caption" sx={{ color: '#f59e0b' }}>{t('precalculation.pending')}</Typography>
                <Typography variant="h4" sx={{ color: '#f59e0b', fontWeight: 700 }}>{stats.pending}</Typography>
              </CardContent>
            </Card>
          </Box>
        </Box>

        {/* Subparts Tree Structure */}
        <Box sx={{ px: 3, pb: 3, flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <AccountTree sx={{ color: PCF_PRIMARY, fontSize: 22 }} />
              <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600 }}>
                {t('precalculation.subpartRelations')}
              </Typography>
              {isAddingSubpart && (
                <CircularProgress size={18} sx={{ color: PCF_PRIMARY, ml: 1 }} />
              )}
            </Box>
          </Box>

          {/* Tree Container */}
          <Box sx={{ position: 'relative', pl: 3 }}>
            {/* Main vertical connector line */}
            {(partData.subparts.length > 0 || isAddingSubpart) && (
              <Box
                sx={{
                  position: 'absolute',
                  left: 11,
                  top: 0,
                  bottom: 80,
                  width: 2,
                  background: `linear-gradient(to bottom, ${PCF_PRIMARY}, ${alpha(PCF_PRIMARY, 0.2)})`,
                  borderRadius: 1
                }}
              />
            )}

            {/* Parent Part Node (Root) */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, position: 'relative' }}>
              <Box
                sx={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: `linear-gradient(135deg, ${PCF_PRIMARY} 0%, ${PCF_SECONDARY} 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'absolute',
                  left: -12,
                  boxShadow: `0 0 12px ${alpha(PCF_PRIMARY, 0.5)}`
                }}
              >
                <Category sx={{ fontSize: 14, color: '#fff' }} />
              </Box>
              <Box
                sx={{
                  ml: 3,
                  p: 1.5,
                  px: 2,
                  borderRadius: '10px',
                  background: alpha(PCF_PRIMARY, 0.1),
                  border: `1px solid ${alpha(PCF_PRIMARY, 0.3)}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2
                }}
              >
                <Typography variant="body2" sx={{ color: '#fff', fontWeight: 600 }}>
                  {partData.partName}
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}>
                  {partData.manufacturerPartId}
                </Typography>
              </Box>
            </Box>

            {/* Subpart Nodes */}
            {partData.subparts.length === 0 && !isAddingSubpart ? (
              <Box sx={{ ml: 3 }}>
                <Card
                  sx={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px dashed rgba(255,255,255,0.15)',
                    borderRadius: '12px',
                    p: 3,
                    textAlign: 'center'
                  }}
                >
                  <Category sx={{ fontSize: 36, color: 'rgba(255,255,255,0.2)', mb: 1 }} />
                  <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.6)', mb: 0.5 }}>
                    {t('precalculation.noSubpartsAdded')}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)', mb: 2 }}>
                    {t('precalculation.addSubpartsHint')}
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => setAddSubpartDialogOpen(true)}
                    sx={{
                      background: `linear-gradient(135deg, ${PCF_PRIMARY} 0%, ${PCF_SECONDARY} 100%)`,
                      textTransform: 'none',
                      borderRadius: '10px'
                    }}
                  >
                    {t('precalculation.addSubpart')}
                  </Button>
                </Card>
              </Box>
            ) : (
              <Box sx={{ ml: 3 }}>
                {partData.subparts.map((subpart, index) => {
                  const statusInfo = getStatusInfo(subpart.pcfStatus);
                  const StatusIcon = statusInfo.icon;
                  const isExpanded = expandedSubparts.has(subpart.id);
                  const isLastItem = index === partData.subparts.length - 1;
                  const isNewlyAdded = newlyAddedSubpartId === subpart.id;

                  return (
                    <Box key={subpart.id} sx={{ position: 'relative', mb: isLastItem ? 0 : 1.5 }}>
                      {/* Horizontal connector - colored by status */}
                      <Box
                        sx={{
                          position: 'absolute',
                          left: -28,
                          top: 24,
                          width: 28,
                          height: 2,
                          background: statusInfo.lineColor,
                          transition: 'background 0.3s ease'
                        }}
                      />
                      {/* Node dot */}
                      <Box
                        sx={{
                          position: 'absolute',
                          left: -4,
                          top: 20,
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          background: statusInfo.color,
                          border: '2px solid #1a1a1a',
                          boxShadow: isNewlyAdded ? `0 0 12px ${PCF_PRIMARY}` : undefined,
                          animation: isNewlyAdded ? 'pulseNew 1s ease-in-out infinite' : undefined,
                          '@keyframes pulseNew': {
                            '0%, 100%': { boxShadow: `0 0 0 0 ${alpha(PCF_PRIMARY, 0.7)}` },
                            '50%': { boxShadow: `0 0 0 8px ${alpha(PCF_PRIMARY, 0)}` }
                          }
                        }}
                      />

                      {/* Subpart Card */}
                      <Card
                        sx={{
                          background: isNewlyAdded 
                            ? alpha(PCF_PRIMARY, 0.08) 
                            : 'rgba(255,255,255,0.03)',
                          border: isNewlyAdded 
                            ? `1px solid ${alpha(PCF_PRIMARY, 0.4)}`
                            : '1px solid rgba(255,255,255,0.08)',
                          borderRadius: '12px',
                          transition: 'all 0.3s ease',
                          overflow: 'hidden',
                          '&:hover': {
                            background: 'rgba(255,255,255,0.05)',
                            borderColor: 'rgba(255,255,255,0.15)'
                          }
                        }}
                      >
                        <Tooltip
                          title={getSubpartRowTooltip(subpart, subpartSendingState.get(subpart.id))}
                          placement="top"
                          arrow
                          enterDelay={500}
                        >
                        <Box
                          sx={{
                            p: 2,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 2,
                            cursor: subpart.pcfStatus === 'delivered' ? 'pointer' : 'default'
                          }}
                          onClick={() => subpart.pcfStatus === 'delivered' && toggleSubpartExpansion(subpart.id)}
                        >
                          {/* Supplier Info */}
                          <Box sx={{ flex: '0 0 200px' }}>
                            <Typography variant="body2" sx={{ color: '#fff', fontWeight: 500 }}>
                              {subpart.supplierName}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace', fontSize: '0.7rem' }}>
                              {subpart.supplierBpn}
                            </Typography>
                          </Box>

                          {/* Divider - colored by status */}
                          <Box sx={{ 
                            width: 2, 
                            height: 32, 
                            background: statusInfo.lineColor,
                            borderRadius: 1,
                            transition: 'background 0.3s ease'
                          }} />

                          {/* Part Info */}
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="body2" sx={{ color: '#fff', fontFamily: 'monospace' }}>
                              {subpart.manufacturerPartId}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                              {subpart.partName}
                            </Typography>
                          </Box>

                          {/* Status */}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: '0 0 150px' }}>
                            <StatusIcon sx={{ fontSize: 18, color: statusInfo.color }} />
                            <Typography variant="body2" sx={{ color: statusInfo.color, fontWeight: 500 }}>
                              {statusInfo.label}
                            </Typography>
                          </Box>

                          {/* PCF Value */}
                          <Box sx={{ flex: '0 0 120px', textAlign: 'right' }}>
                            {subpart.pcfStatus === 'delivered' && subpart.pcfValue ? (
                              <Typography variant="body2" sx={{ color: PCF_PRIMARY, fontWeight: 600 }}>
                                {subpart.pcfValue} {subpart.pcfUnit}
                              </Typography>
                            ) : (
                              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.3)' }}>
                                —
                              </Typography>
                            )}
                          </Box>

                          {/* Actions */}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: '0 0 auto' }}>
                            {subpartSendingState.has(subpart.id) ? (
                              <CircularProgress size={18} sx={{ color: PCF_PRIMARY }} />
                            ) : (
                              <>
                                {/* Request button for pending status */}
                                {subpart.pcfStatus === 'pending' && (
                                  <Tooltip title={t('precalculation.requestPcf')}>
                                    <IconButton
                                      size="small"
                                      onClick={() => handleRequestPcf(subpart.id)}
                                      sx={{
                                        color: '#fff',
                                        background: alpha(PCF_PRIMARY, 0.2),
                                        '&:hover': { background: alpha(PCF_PRIMARY, 0.4) }
                                      }}
                                    >
                                      <Send sx={{ fontSize: 16 }} />
                                    </IconButton>
                                  </Tooltip>
                                )}
                                {/* Retry button for error status */}
                                {subpart.pcfStatus === 'error' && (
                                  <Tooltip title={`${t('precalculation.retryRequest')}${subpart.errorMessage ? `: ${subpart.errorMessage}` : ''}`}>
                                    <IconButton
                                      size="small"
                                      onClick={() => handleRequestPcf(subpart.id)}
                                      sx={{
                                        color: '#fff',
                                        background: alpha('#ef4444', 0.2),
                                        '&:hover': { background: alpha('#ef4444', 0.4) }
                                      }}
                                    >
                                      <Send sx={{ fontSize: 16 }} />
                                    </IconButton>
                                  </Tooltip>
                                )}
                                {subpart.pcfStatus === 'delivered' && (
                                  <>
                                    <Tooltip title={t('precalculation.downloadPcf')}>
                                      <IconButton size="small" sx={{ color: 'rgba(255,255,255,0.5)', '&:hover': { color: PCF_PRIMARY } }}>
                                        <Download sx={{ fontSize: 18 }} />
                                      </IconButton>
                                    </Tooltip>
                                    <IconButton size="small" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                                      {isExpanded ? <ExpandLess /> : <ExpandMore />}
                                    </IconButton>
                                  </>
                                )}
                              </>
                            )}
                          </Box>
                        </Box>
                        </Tooltip>

                        {/* Expanded Details */}
                        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                          <Box sx={{ px: 2, pb: 2, pt: 1, borderTop: '1px solid rgba(255,255,255,0.05)', background: alpha(PCF_PRIMARY, 0.03) }}>
                            <Typography variant="subtitle2" sx={{ color: PCF_PRIMARY, mb: 1.5, fontWeight: 600 }}>
                              {t('precalculation.pcfDetails')}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 4 }}>
                              <Box>
                                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                                  {t('precalculation.requestedAt')}
                                </Typography>
                                <Typography variant="body2" sx={{ color: '#fff' }}>
                                  {subpart.requestedAt ? new Date(subpart.requestedAt).toLocaleString() : '—'}
                                </Typography>
                              </Box>
                              <Box>
                                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                                  {t('precalculation.deliveredAt')}
                                </Typography>
                                <Typography variant="body2" sx={{ color: '#fff' }}>
                                  {subpart.deliveredAt ? new Date(subpart.deliveredAt).toLocaleString() : '—'}
                                </Typography>
                              </Box>
                              <Box>
                                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                                  {t('precalculation.carbonFootprint')}
                                </Typography>
                                <Typography variant="body2" sx={{ color: PCF_PRIMARY, fontWeight: 600 }}>
                                  {subpart.pcfValue} {subpart.pcfUnit}
                                </Typography>
                              </Box>
                            </Box>
                          </Box>
                        </Collapse>
                      </Card>
                    </Box>
                  );
                })}

                {/* Loading placeholder when adding subpart */}
                {isAddingSubpart && (
                  <Box sx={{ position: 'relative', mt: 1.5 }}>
                    {/* Horizontal connector */}
                    <Box
                      sx={{
                        position: 'absolute',
                        left: -28,
                        top: 24,
                        width: 28,
                        height: 2,
                        background: alpha(PCF_PRIMARY, 0.5)
                      }}
                    />
                    {/* Node dot - loading */}
                    <Box
                      sx={{
                        position: 'absolute',
                        left: -7,
                        top: 17,
                        width: 16,
                        height: 16,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <CircularProgress size={14} sx={{ color: PCF_PRIMARY }} />
                    </Box>

                    {/* Placeholder card */}
                    <Card
                      sx={{
                        background: alpha(PCF_PRIMARY, 0.05),
                        border: `1px dashed ${alpha(PCF_PRIMARY, 0.3)}`,
                        borderRadius: '12px',
                        p: 2
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <CircularProgress size={20} sx={{ color: PCF_PRIMARY }} />
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                          {t('precalculation.creatingSubpart')}
                        </Typography>
                      </Box>
                    </Card>
                  </Box>
                )}

                {/* Ghost button - Add more subparts */}
                {!isAddingSubpart && (
                  <Box sx={{ position: 'relative', mt: 1.5 }}>
                    {/* Horizontal connector (faded) */}
                    <Box
                      sx={{
                        position: 'absolute',
                        left: -28,
                        top: 24,
                        width: 28,
                        height: 2,
                        background: 'rgba(255,255,255,0.1)'
                      }}
                    />
                    {/* Ghost node dot */}
                    <Box
                      sx={{
                        position: 'absolute',
                        left: -4,
                        top: 20,
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        border: '2px dashed rgba(255,255,255,0.2)',
                        background: 'transparent'
                      }}
                    />

                    {/* Ghost Add Button */}
                    <Box
                      onClick={() => setAddSubpartDialogOpen(true)}
                      sx={{
                        p: 2,
                        borderRadius: '12px',
                        border: '1px dashed rgba(255,255,255,0.15)',
                        background: 'rgba(255,255,255,0.02)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 1.5,
                        '&:hover': {
                          background: alpha(PCF_PRIMARY, 0.08),
                          borderColor: alpha(PCF_PRIMARY, 0.3),
                          '& .ghost-icon, & .ghost-text': {
                            color: PCF_PRIMARY
                          }
                        }
                      }}
                    >
                      <AddCircleOutline 
                        className="ghost-icon"
                        sx={{ 
                          fontSize: 22, 
                          color: 'rgba(255,255,255,0.3)',
                          transition: 'color 0.2s ease'
                        }} 
                      />
                      <Typography 
                        className="ghost-text"
                        variant="body2" 
                        sx={{ 
                          color: 'rgba(255,255,255,0.3)',
                          fontWeight: 500,
                          transition: 'color 0.2s ease'
                        }}
                      >
                        {t('precalculation.addSubpartGhost')}
                      </Typography>
                    </Box>
                  </Box>
                )}
              </Box>
            )}
          </Box>
        </Box>

        {/* Add Subpart Dialog */}
        <AddSubpartDialog
          open={addSubpartDialogOpen}
          onClose={() => setAddSubpartDialogOpen(false)}
          onSubmit={handleAddSubpartComplete}
          parentManufacturerPartId={partData.manufacturerPartId}
        />
      </Box>
    );
  };

  // Render search state
  const renderSearch = () => {
    const handlePartSelect = (part: SharedCatalogPartSearchResult) => {
      const encodedManufacturerId = encodeURIComponent(part.manufacturerId);
      const encodedPartId = encodeURIComponent(part.manufacturerPartId);
      navigate(`/pcf/precalculation/${encodedManufacturerId}/${encodedPartId}`);
    };

    return (
      <CatalogPartSearch
        icon={<CalculateIcon sx={{ fontSize: 36, color: '#fff' }} />}
        title={t('precalculation.title')}
        subtitle={t('precalculation.searchSubtitle')}
        onPartSelect={handlePartSelect}
        searchPlaceholder={t('precalculation.searchPlaceholder')}
        searchButtonText={t('precalculation.searchButton')}
      />
    );
  };

  return (
    <Box>
      {pageState === 'search' && renderSearch()}
      {pageState === 'loading' && renderLoading()}
      {pageState === 'error' && renderError()}
      {pageState === 'visualization' && renderVisualization()}
    </Box>
  );
};

export default PcfRequestPage;
