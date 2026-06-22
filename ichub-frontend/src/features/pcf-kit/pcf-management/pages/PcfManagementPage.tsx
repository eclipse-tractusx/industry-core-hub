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
  ArrowBack,
  Refresh,
  Co2,
  DraftsOutlined,
  Inventory,
  AddBox,
  PlaylistAdd,
  OpenInNew
} from '@mui/icons-material';
import { CatalogPartSearch, CatalogPartSearchResult, PartInfoHeader, DualPcfCreationWizard } from '../../shared/components';
import type {
  DualPcfVersionStatus,
  DualSaveOutcome,
  DualPcfInitialData,
  PcfVersionSaveResult,
} from '../../shared/components/DualPcfCreationWizard';
import { ManagedPart } from '../../pcf-exchange/api/pcfExchangeApi';
import type { PcfNestedData } from '../types/pcfNestedData';
import { normalizePcfData } from '../utils/pcfNormalizer';
import {
  getPcfStatus,
  mapPcfStatus,
} from '../utils/pcfDataExtractors';
import { PcfDetailsDialog, PcfEditDialog, PcfManagementSection } from '../../pcf-exchange/components';
import { PcfOverviewPanel, PcfVersionBlock } from '../components';
import type { PcfVersionKey } from '../components';
import environmentService from '@/services/EnvironmentService';
import {
  getPcfVersionStatus,
  uploadPcf,
  updatePcfAndGetParticipants,
  notifyParticipants,
  extractApiErrorDetail,
  PCF_VERSIONS,
  DEFAULT_PCF_POLICIES,
  type PcfVersion,
  type PcfVersionDataMap,
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

type PageState = 'search' | 'loading' | 'visualization' | 'error';

/** Order-insensitive deep equality, used to detect whether a version's data
 *  actually changed versus what is already stored on the backend. */
const deepEqualData = (a: unknown, b: unknown): boolean => {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null || typeof a !== 'object') return a === b;
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((v, i) => deepEqualData(v, b[i]));
  }
  const ao = a as Record<string, unknown>;
  const bo = b as Record<string, unknown>;
  const ak = Object.keys(ao);
  const bk = Object.keys(bo);
  if (ak.length !== bk.length) return false;
  return ak.every((k) => Object.prototype.hasOwnProperty.call(bo, k) && deepEqualData(ao[k], bo[k]));
};

/** Builds the wizard's per-version payload from the wizard's v9/v7 form data.
 *  A `null` side (individual-update flow without a counterpart) is omitted, so
 *  only the supplied version(s) are persisted. */
const buildVersionPayloads = (
  v9Data: Record<string, unknown> | null,
  v7Data: Record<string, unknown> | null,
): Partial<Record<PcfVersion, Record<string, unknown>>> => {
  const payloads: Partial<Record<PcfVersion, Record<string, unknown>>> = {};
  // v9 is already the canonical nested shape; normalize is a safe pass-through.
  if (v9Data) payloads['v9.0.0'] = normalizePcfData(v9Data) as unknown as Record<string, unknown>;
  if (v7Data) payloads['v7.0.0'] = v7Data;
  return payloads;
};

const PcfManagementPage: React.FC = () => {
  const { t } = useTranslation('pcf');
  const navigate = useNavigate();
  const params = useParams();

  // Page state
  const [pageState, setPageState] = useState<PageState>('search');
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

  // Per-version PCF state for the dual creation wizard (async flow).
  // `remotePcfByVersion` holds the backend-stored payload per version (or null);
  // `versionStatus` drives the NO EXISTE / PENDIENTE / SUBIDO header blocks.
  const [remotePcfByVersion, setRemotePcfByVersion] = useState<PcfVersionDataMap | null>(null);
  const [versionStatus, setVersionStatus] = useState<DualPcfVersionStatus | null>(null);

  // PCF loading state
  const [isPcfLoading, setIsPcfLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Feature flag (PCF_BACKWARD_COMPATIBILITY_SATURN): when true, PCF is managed
  // as a dual pair (v9 + v7) through the wizard; when false, each version is
  // managed individually through the submodel creator.
  const pcfBackwardCompatibility = environmentService.getFeatureFlags().backwardCompatibility;

  // Governance policies — use PCF_EXCHANGE_POLICIES_CONFIG from environment,
  // falling back to the default PCF policies (same as PCF Request/Response flows).
  const governancePolicies = useMemo(() => {
    const configured = getPcfExchangePoliciesConfig();
    if (configured.length > 0) {
      return configured.flatMap(def => generatePoliciesFromDefinition(def));
    }
    return DEFAULT_PCF_POLICIES;
  }, []);

  // Pre-seed the dual wizard with whatever versions already exist on the backend
  // so completing a missing version doesn't require re-entering the existing one.
  const dualInitialData = useMemo<DualPcfInitialData | undefined>(() => {
    if (!remotePcfByVersion) return undefined;
    const data: DualPcfInitialData = {};
    if (remotePcfByVersion['v9.0.0']) data['v9.0.0'] = remotePcfByVersion['v9.0.0']!;
    if (remotePcfByVersion['v7.0.0']) data['v7.0.0'] = remotePcfByVersion['v7.0.0']!;
    return Object.keys(data).length > 0 ? data : undefined;
  }, [remotePcfByVersion]);

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
    setManufacturerId(manufacturerId);

    try {
      // Fetch catalog part details
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
        setManagedPart(part);
        setRawPcfData(null);
        setPageState('visualization');
        return;
      }

      // Fetch PCF data for the part — per version, so we know whether the part
      // has both versions, only one (incomplete), or none.
      let pcfResponse: { pcfData?: Record<string, unknown>; exists: boolean } = { exists: false };

      let versionMap: PcfVersionDataMap = { 'v9.0.0': null, 'v7.0.0': null };
      try {
        versionMap = await getPcfVersionStatus(manufacturerPartId);
      } catch {
        versionMap = { 'v9.0.0': null, 'v7.0.0': null };
      }
      setRemotePcfByVersion(versionMap);
      setVersionStatus({
        'v9.0.0': { state: versionMap['v9.0.0'] ? 'SUBIDO' : 'NO_EXISTE' },
        'v7.0.0': { state: versionMap['v7.0.0'] ? 'SUBIDO' : 'NO_EXISTE' },
      });

      // Use v9.0.0 as the canonical payload for display; fall back to v7.0.0.
      const canonicalPcf = versionMap['v9.0.0'] ?? versionMap['v7.0.0'];
      if (canonicalPcf && Object.keys(canonicalPcf).length > 0) {
        pcfResponse = { pcfData: canonicalPcf as Record<string, unknown>, exists: true };
      }

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

      if (!hasPcf) {
        setPartReadiness('registered-no-pcf');
        setManagedPart(part);
        setRawPcfData(null);
        setPageState('visualization');
        return;
      }

      setPartReadiness('has-pcf');
      setManagedPart(part);
      setRawPcfData(pcfDataRecord ? normalizePcfData(pcfDataRecord) : null);
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

  // Derive the wizard header status from the per-version backend payload map.
  const buildVersionStatus = (map: PcfVersionDataMap): DualPcfVersionStatus => ({
    'v9.0.0': { state: map['v9.0.0'] ? 'SUBIDO' : 'NO_EXISTE' },
    'v7.0.0': { state: map['v7.0.0'] ? 'SUBIDO' : 'NO_EXISTE' },
  });

  // Open the dual creation wizard (PCF_BACKWARD_COMPATIBILITY_SATURN=true).
  // Primes the per-version status so the wizard header reflects the backend.
  const handleOpenPcfCreateDialog = async () => {
    setPcfCreateDialogOpen(true);
    if (!managedPart) return;
    try {
      const map = await getPcfVersionStatus(managedPart.manufacturerPartId);
      setRemotePcfByVersion(map);
      setVersionStatus(buildVersionStatus(map));
    } catch (err) {
      console.error('Failed to load PCF version status:', err);
      // Fall back to "unknown → not existing" so the wizard still works.
      setVersionStatus({ 'v9.0.0': { state: 'NO_EXISTE' }, 'v7.0.0': { state: 'NO_EXISTE' } });
    }
  };

  // Navigate to the version-aware details view (PcfDetailsPage reads ?version=).
  const handleViewVersionDetails = (version: PcfVersionKey) => {
    if (!managedPart) return;
    const v = version === 'v9.0.0' ? '9.0.0' : '7.0.0';
    navigate(
      `/pcf/management/details/${encodeURIComponent(managedPart.manufacturerPartId)}?version=${v}`,
    );
  };

  // Update/create a single version.
  //   - dual mode (PCF_BACKWARD_COMPATIBILITY_SATURN=true) → open the dual
  //     wizard, pre-seeded with both versions; the smart-save persists what
  //     changed and lets the user reconcile shared data across versions.
  //   - individual mode → edit ONLY the selected submodel through the
  //     version-aware editor; no dual wizard, no cross-version reconciliation.
  const handleUpdateVersion = (version: PcfVersionKey) => {
    if (!managedPart) return;
    if (pcfBackwardCompatibility) {
      void handleOpenPcfCreateDialog();
      return;
    }
    const v = version === 'v9.0.0' ? '9.0.0' : '7.0.0';
    navigate(
      `/pcf/management/edit/${encodeURIComponent(managedPart.manufacturerPartId)}?version=${v}`,
    );
  };

  // Handle both PCF versions produced by the DualPcfCreationWizard (async flow).
  //
  // Smart, per-version save against the version-aware provider endpoints:
  //   - version missing on backend         → POST (upload)
  //   - version present but data changed    → PUT  (update)
  //   - version present and unchanged       → skip
  // Each version is handled independently and its error is captured, so a
  // partial failure (one published, one failing) only blocks the failing one.
  // The wizard stays open on any error to allow a targeted retry; the page is
  // only reloaded/closed on full success.
  const handleDualPcfCreated = async (
    v9Data: Record<string, unknown> | null,
    v7Data: Record<string, unknown> | null,
  ): Promise<DualSaveOutcome> => {
    const errorOutcome = (detail: string): DualSaveOutcome => ({
      'v9.0.0': { status: 'error', detail },
      'v7.0.0': { status: 'error', detail },
    });
    if (!managedPart) return errorOutcome('No part selected');

    const partId = managedPart.manufacturerPartId;
    setIsUploading(true);
    try {
      // Re-read the backend truth so the decision uses the freshest state
      // (handles retries after a previous partial save).
      const remote = await getPcfVersionStatus(partId).catch(
        () => remotePcfByVersion ?? ({ 'v9.0.0': null, 'v7.0.0': null } as PcfVersionDataMap),
      );
      const payloads = buildVersionPayloads(v9Data, v7Data);

      // Versions not supplied this round (individual-update without a
      // counterpart) are left untouched and reported as skipped.
      const outcome = {
        'v9.0.0': { status: 'skipped' } as PcfVersionSaveResult,
        'v7.0.0': { status: 'skipped' } as PcfVersionSaveResult,
      } as DualSaveOutcome;

      for (const version of PCF_VERSIONS) {
        const payload = payloads[version];
        if (!payload) continue; // version not part of this save
        const existing = remote[version];
        try {
          if (!existing) {
            await uploadPcf(partId, payload, version);
            outcome[version] = { status: 'uploaded' };
          } else if (!deepEqualData(existing, payload)) {
            await updatePcfAndGetParticipants(partId, payload, version);
            outcome[version] = { status: 'updated' };
          } else {
            outcome[version] = { status: 'skipped' };
          }
        } catch (err) {
          const { status, message } = extractApiErrorDetail(err);
          outcome[version] = { status: 'error', detail: status ? `${status} — ${message}` : message };
        }
      }

      // Reflect the new state in the header blocks (preserve versions not saved).
      setVersionStatus((prev) => {
        const next: DualPcfVersionStatus = {
          'v9.0.0': prev?.['v9.0.0'] ?? { state: remote['v9.0.0'] ? 'SUBIDO' : 'NO_EXISTE' },
          'v7.0.0': prev?.['v7.0.0'] ?? { state: remote['v7.0.0'] ? 'SUBIDO' : 'NO_EXISTE' },
        };
        for (const version of PCF_VERSIONS) {
          if (!payloads[version]) continue;
          next[version] = outcome[version].status === 'error'
            ? { state: 'PENDIENTE', error: outcome[version].detail }
            : { state: 'SUBIDO' };
        }
        return next;
      });
      // Keep the local cache in sync for the next save decision (only the
      // versions saved this round change; the others keep their stored value).
      setRemotePcfByVersion({
        'v9.0.0': payloads['v9.0.0'] && outcome['v9.0.0'].status !== 'error'
          ? payloads['v9.0.0']!
          : remote['v9.0.0'],
        'v7.0.0': payloads['v7.0.0'] && outcome['v7.0.0'].status !== 'error'
          ? payloads['v7.0.0']!
          : remote['v7.0.0'],
      });

      const allOk = outcome['v9.0.0'].status !== 'error' && outcome['v7.0.0'].status !== 'error';
      if (allOk) {
        if (manufacturerId) {
          await loadPartData(manufacturerId, partId);
        }
        setPcfCreateDialogOpen(false);
      }
      return outcome;
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
      setRawPcfData(normalizePcfData(data));
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

  // Render loading state — a simple spinner while the part + PCF data load.
  const renderLoading = () => (
    <Box
      sx={{
        minHeight: 'calc(100vh - 68.8px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        px: { xs: 2, sm: 3, md: 4 }
      }}
    >
      <CircularProgress sx={{ color: PCF_PRIMARY }} size={44} />
      <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
        {t('loading.title')}
      </Typography>
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
  

    const rawStatus = rawPcfData ? getPcfStatus(rawPcfData) : null;
    const isPublished = mapPcfStatus(rawStatus) === 'PUBLISHED';

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
                            onClick={() => handleOpenPcfCreateDialog()}
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

              {/* Has PCF Data — per-version blocks (top) + combined overview.
                   The two version blocks sit directly under the "PCF Data"
                   header; the representative Carbon Footprint Overview follows. */}
              {hasPcf && !isPcfLoading && managedPart && remotePcfByVersion && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {/* Top — one block per version, each with its own actions */}
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                      gap: 2,
                    }}
                  >
                    {(['v9.0.0', 'v7.0.0'] as PcfVersionKey[]).map((version) => (
                      <PcfVersionBlock
                        key={version}
                        version={version}
                        data={remotePcfByVersion[version]}
                        onViewDetails={() => handleViewVersionDetails(version)}
                        onUpdate={() => handleUpdateVersion(version)}
                        onCreate={() => handleUpdateVersion(version)}
                        busy={isUploading}
                      />
                    ))}
                  </Box>

                  {/* Below — combined / representative overview with charts */}
                  <PcfOverviewPanel
                    v9Raw={remotePcfByVersion['v9.0.0']}
                    v7Raw={remotePcfByVersion['v7.0.0']}
                  />
                </Box>
              )}

              {/* Fallback — part flagged as having PCF but the per-version map
                   hasn't loaded yet (e.g. legacy single-payload path). */}
              {hasPcf && !isPcfLoading && managedPart && !remotePcfByVersion && (
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

        {/* Create PCF Dialog — dual (v9 + v7) creation wizard. Used both for parts
            with no PCF and to complete a part that only has one version uploaded. */}
        <DualPcfCreationWizard
          open={pcfCreateDialogOpen}
          onClose={() => {
            if (isUploading) return;
            setPcfCreateDialogOpen(false);
          }}
          onSaveBoth={handleDualPcfCreated}
          manufacturerPartId={managedPart?.manufacturerPartId || ''}
          isSaving={isUploading}
          versionStatus={versionStatus ?? undefined}
          initialData={dualInitialData}
        />
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
