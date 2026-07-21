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

import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Box, CircularProgress, Alert, Fab, Tooltip } from '@mui/material';
import { Edit } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { BasePassportVisualization } from '@/features/eco-pass-kit/passport-consumption/passport-types/base/BasePassportVisualization';
import { JsonSchema } from '@/features/eco-pass-kit/passport-consumption/types';
import {
  getPcfByManufacturerPartId,
  getPcfVersionStatus,
  updatePcfAndGetParticipants,
  notifyParticipants,
  DEFAULT_PCF_POLICIES,
  type PcfVersion,
  type PcfVersionDataMap,
} from '../../services/pcfApi';
import { PcfNestedData } from '../types/pcfNestedData';
import { PcfSummaryCard } from '../components/header-cards/PcfSummaryCard';
import { PcfCompanyCard } from '../components/header-cards/PcfCompanyCard';
import { PcfPeriodCard } from '../components/header-cards/PcfPeriodCard';
import { normalizePcfData } from '../utils/pcfNormalizer';
import { detectPcfVersion } from '../utils/pcfVersionDetector';
import { getSchemaByNamespaceAndVersion } from '@/schemas';
import type { SchemaDefinition } from '@/schemas';
import { DualPcfCreationWizard } from '../../shared/components';
import type { DualPcfVersionStatus, DualSaveOutcome, DualPcfInitialData, PcfVersionSaveResult } from '../../shared/components/DualPcfCreationWizard';
import { ParticipantSelectionDialog } from '../components';
import { getPcfExchangePoliciesConfig } from '@/services/EnvironmentService';
import { generatePoliciesFromDefinition } from '@/features/industry-core-kit/part-discovery/utils/governancePolicyUtils';
import environmentService from '@/services/EnvironmentService';
import { PCF_VERSIONS } from '../../services/pcfApi';
import './PcfDetailsPage.scss';

const PCF_NAMESPACE = 'io.catenax.pcf';

/** Normalize a `?version=` query value to the API's PcfVersion key, or null. */
const toPcfVersionKey = (raw: string | null): PcfVersion | null => {
  if (!raw) return null;
  const v = raw.startsWith('v') ? raw : `v${raw}`;
  return v === 'v9.0.0' || v === 'v7.0.0' ? (v as PcfVersion) : null;
};

/**
 * Full-screen details view for a PCF (Product Carbon Footprint).
 *
 * Reuses BasePassportVisualization (same pattern as Passport Provisioning details)
 * to render all 7 sections of the PCF schema in auto-generated tabs with
 * collapsible header summary cards.
 *
 * Accessible from PcfManagementPage via navigate('/pcf/management/details/:manufacturerPartId').
 * An Edit FAB allows navigating directly to the Update page.
 */
const PcfDetailsPage: React.FC = () => {
  const { manufacturerPartId } = useParams<{ manufacturerPartId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation('pcf');

  // Requested version from the ?version= query param (e.g. "9.0.0" / "7.0.0").
  const requestedVersion = toPcfVersionKey(searchParams.get('version'));

  // The data passed to BasePassportVisualization. For v9 it is the canonical
  // nested model; for v7 it is the raw flat payload (rendered against the v7
  // schema directly, so the v7 structure is shown faithfully — not normalized).
  const [pcfData, setPcfData] = useState<Record<string, unknown> | null>(null);
  const [pcfSchema, setPcfSchema] = useState<SchemaDefinition | null>(null);
  // Whether the rendered data is in the canonical v9 nested shape (drives the
  // v9-specific header cards, which assume the nested structure).
  const [isV9Shape, setIsV9Shape] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Feature flag: when true the FAB opens the Dual PCF Wizard instead of the
  // individual SubmodelCreator editor.
  const pcfBackwardCompatibility = environmentService.getFeatureFlags().backwardCompatibility;

  // Dual PCF wizard state (used only when pcfBackwardCompatibility = true)
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardSaving, setWizardSaving] = useState(false);
  const [versionStatus, setVersionStatus] = useState<DualPcfVersionStatus | null>(null);
  const [remotePcfByVersion, setRemotePcfByVersion] = useState<PcfVersionDataMap | null>(null);
  const [participantDialogOpen, setParticipantDialogOpen] = useState(false);
  const [availableParticipants, setAvailableParticipants] = useState<string[]>([]);
  const [isNotifying, setIsNotifying] = useState(false);

  // Governance policies for PCF exchange notifications
  const governancePolicies = useMemo(() => {
    const configured = getPcfExchangePoliciesConfig();
    if (configured.length > 0) {
      return configured.flatMap(def => generatePoliciesFromDefinition(def));
    }
    return DEFAULT_PCF_POLICIES;
  }, []);

  // Pre-seed the wizard with whatever versions already exist on the backend
  const dualInitialData = useMemo<DualPcfInitialData | undefined>(() => {
    if (!remotePcfByVersion) return undefined;
    const data: DualPcfInitialData = {};
    if (remotePcfByVersion['v9.0.0']) data['v9.0.0'] = remotePcfByVersion['v9.0.0']!;
    if (remotePcfByVersion['v7.0.0']) data['v7.0.0'] = remotePcfByVersion['v7.0.0']!;
    return Object.keys(data).length > 0 ? data : undefined;
  }, [remotePcfByVersion]);

  /** Opens the Dual PCF Wizard, first fetching the current per-version status. */
  const handleOpenWizard = async () => {
    if (!manufacturerPartId) return;
    setWizardOpen(true);
    try {
      const map = await getPcfVersionStatus(manufacturerPartId);
      setRemotePcfByVersion(map);
      setVersionStatus({
        'v9.0.0': { state: map['v9.0.0'] ? 'SUBIDO' : 'NO_EXISTE' },
        'v7.0.0': { state: map['v7.0.0'] ? 'SUBIDO' : 'NO_EXISTE' },
      });
    } catch (err) {
      console.error('Failed to load PCF version status:', err);
      setVersionStatus({ 'v9.0.0': { state: 'NO_EXISTE' }, 'v7.0.0': { state: 'NO_EXISTE' } });
    }
  };

  /** Called by DualPcfCreationWizard when the user confirms. Updates both
   *  versions, collects participants, then opens ParticipantSelectionDialog. */
  const handleDualPcfUpdate = async (
    v9Data: Record<string, unknown> | null,
    v7Data: Record<string, unknown> | null,
  ): Promise<DualSaveOutcome> => {
    const errorOutcome = (detail: string): DualSaveOutcome => ({
      'v9.0.0': { status: 'error', detail },
      'v7.0.0': { status: 'error', detail },
    });
    if (!manufacturerPartId) return errorOutcome('No part selected');

    setWizardSaving(true);
    const payloads: Partial<Record<typeof PCF_VERSIONS[number], Record<string, unknown>>> = {};
    if (v9Data) payloads['v9.0.0'] = v9Data;
    if (v7Data) payloads['v7.0.0'] = v7Data;

    const outcome = {
      'v9.0.0': { status: 'skipped' } as PcfVersionSaveResult,
      'v7.0.0': { status: 'skipped' } as PcfVersionSaveResult,
    } as DualSaveOutcome;

    let collectedParticipants: string[] = [];

    try {
      for (const version of PCF_VERSIONS) {
        const payload = payloads[version];
        if (!payload) continue;
        try {
          const participants = await updatePcfAndGetParticipants(manufacturerPartId, payload, version);
          collectedParticipants = [...new Set([...collectedParticipants, ...participants])];
          outcome[version] = { status: 'updated' };
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          outcome[version] = { status: 'error', detail: msg };
        }
      }

      const allOk = outcome['v9.0.0'].status !== 'error' && outcome['v7.0.0'].status !== 'error';
      if (allOk) {
        setWizardOpen(false);
        if (outcome['v9.0.0'].status === 'updated' || outcome['v7.0.0'].status === 'updated') {
          setAvailableParticipants(collectedParticipants);
          setParticipantDialogOpen(true);
        }
      }
      return outcome;
    } finally {
      setWizardSaving(false);
    }
  };

  /** Notifies selected participants after a successful PCF update. */
  const handleNotifyParticipants = async (selectedParticipants: string[]) => {
    if (!manufacturerPartId) return;
    setIsNotifying(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await notifyParticipants(manufacturerPartId, selectedParticipants, governancePolicies as any);
    } catch (err) {
      console.error('Failed to notify participants:', err);
      throw err;
    } finally {
      setIsNotifying(false);
    }
  };

  useEffect(() => {
    if (!manufacturerPartId) return;

    const loadPcf = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const raw = await getPcfByManufacturerPartId(
          manufacturerPartId,
          requestedVersion ?? undefined,
        );
        if (!raw) {
          setError(t('error.pcfNotFound', 'PCF data not found for this part.'));
          return;
        }
        // Resolve the effective version: the explicit query param wins, else
        // fall back to shape-based detection ("9.0.0" | "7.0.0").
        const detected = detectPcfVersion(raw);
        const effective = requestedVersion
          ? requestedVersion.replace(/^v/, '')
          : detected;

        if (effective === '7.0.0') {
          // v7: render the raw flat payload against the v7 schema so the v7
          // structure is shown as-is. Fall back to v9 (normalized) only if the
          // v7 schema is somehow unavailable.
          const v7Schema = getSchemaByNamespaceAndVersion(PCF_NAMESPACE, '7.0.0');
          if (v7Schema) {
            setPcfData(raw);
            setPcfSchema(v7Schema);
            setIsV9Shape(false);
            return;
          }
        }

        // v9 (or fallback): normalize to the canonical nested model + v9 schema.
        const normalized = normalizePcfData(raw) as unknown as Record<string, unknown>;
        const schema =
          getSchemaByNamespaceAndVersion(PCF_NAMESPACE, '9.0.0') ??
          getSchemaByNamespaceAndVersion(PCF_NAMESPACE, detected);
        setPcfData(normalized);
        setPcfSchema(schema ?? null);
        setIsV9Shape(true);
      } catch (err) {
        const message = err instanceof Error ? err.message : t('error.failedToLoadPcf');
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    loadPcf();
  }, [manufacturerPartId, requestedVersion, t]);

  if (isLoading) {
    return (
      <Box className="pcf-details-page__loading">
        <CircularProgress sx={{ color: '#10b981' }} size={48} />
      </Box>
    );
  }

  if (error || !pcfData || !pcfSchema) {
    return (
      <Box className="pcf-details-page__error">
        <Alert severity="error" sx={{ maxWidth: 520 }}>
          {error ?? t('error.generic', 'An unexpected error occurred.')}
        </Alert>
      </Box>
    );
  }

  // Extract display names — handle both the v9 nested shape and the v7 flat shape.
  const nested = isV9Shape ? (pcfData as unknown as PcfNestedData) : null;
  const productName =
    nested?.companyAndProductInformation?.[0]?.productInformation?.[0]?.productNameCompany ??
    (pcfData.productName as string | undefined) ??
    manufacturerPartId;

  const specVersion = isV9Shape
    ? nested?.scopeOfPcfForm?.[0]?.specVersion
    : (pcfData.specVersion as string | undefined);

  // The version label shown in the header / edit link.
  const versionLabel = isV9Shape ? '9.0.0' : '7.0.0';

  return (
    // Relative container so the FAB can be positioned fixed without layout issues
    <Box className="pcf-details-page">
      <BasePassportVisualization
        schema={pcfSchema.rawSchema as unknown as JsonSchema}
        data={pcfData}
        passportId={manufacturerPartId ?? ''}
        onBack={() => navigate(-1)}
        passportName={productName}
        passportVersion={specVersion}
        config={{
          // The header cards normalize their input internally, so the same
          // representative summary renders for both the v9 nested shape and the
          // raw v7 flat shape (which is shown faithfully in the tabs below).
          headerCards: [PcfSummaryCard, PcfCompanyCard, PcfPeriodCard],
          hideActionButtons: ['dataContract', 'exportPdf'],
        }}
      />

      {/* FAB — Edit button, visible in bottom-right corner over the visualization */}
      <Tooltip title={t('management.update', 'Update PCF')} placement="left">
        <Fab
          className="pcf-details-page__edit-fab"
          onClick={() => {
            if (pcfBackwardCompatibility) {
              // Dual mode: open the wizard so both versions are updated together
              void handleOpenWizard();
            } else {
              // Individual mode: navigate to the version-specific submodel editor
              navigate(
                `/pcf/management/edit/${encodeURIComponent(manufacturerPartId ?? '')}?version=${versionLabel}`,
              );
            }
          }}
          aria-label={t('management.update', 'Update PCF')}
        >
          <Edit />
        </Fab>
      </Tooltip>

      {/* Dual PCF Creation Wizard — shown when PCF_BACKWARD_COMPATIBILITY_SATURN=true */}
      {pcfBackwardCompatibility && (
        <DualPcfCreationWizard
          open={wizardOpen}
          onClose={() => {
            if (wizardSaving) return;
            setWizardOpen(false);
          }}
          onSaveBoth={handleDualPcfUpdate}
          manufacturerPartId={manufacturerPartId ?? ''}
          isSaving={wizardSaving}
          versionStatus={versionStatus ?? undefined}
          initialData={dualInitialData}
          isUpdate
        />
      )}

      {/* Participant Selection Dialog — opened after a successful update */}
      <ParticipantSelectionDialog
        open={participantDialogOpen}
        onClose={() => setParticipantDialogOpen(false)}
        onConfirm={handleNotifyParticipants}
        participants={availableParticipants}
        manufacturerPartId={manufacturerPartId ?? ''}
        isLoading={isNotifying}
      />
    </Box>
  );
};

export default PcfDetailsPage;