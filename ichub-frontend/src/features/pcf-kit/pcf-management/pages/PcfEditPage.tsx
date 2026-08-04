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

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Alert, Box, Button, CircularProgress, Snackbar } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { getSchemaByNamespaceAndVersion, SchemaDefinition } from '@/schemas';
import { createSchemaKey } from '@/schemas/schemaLoader';
import SubmodelCreator from '@/components/submodel-creation/SubmodelCreator';
import { getPcfByManufacturerPartId, updatePcfAndGetParticipants, uploadPcf, notifyParticipants, DEFAULT_PCF_POLICIES, type PcfVersion } from '../../services/pcfApi';
import { detectPcfVersion } from '../utils/pcfVersionDetector';
import { ParticipantSelectionDialog } from '../components';
import { getPcfExchangePoliciesConfig } from '@/services/EnvironmentService';
import { generatePoliciesFromDefinition } from '@/features/industry-core-kit/part-discovery/utils/governancePolicyUtils';
import './PcfEditPage.scss';

const PCF_NAMESPACE = 'io.catenax.pcf';

/** Normalize a `?version=` query value to the API's PcfVersion key, or null. */
const toPcfVersionKey = (raw: string | null): PcfVersion | null => {
  if (!raw) return null;
  const v = raw.startsWith('v') ? raw : `v${raw}`;
  return v === 'v9.0.0' || v === 'v7.0.0' ? (v as PcfVersion) : null;
};

/**
 * PCF edit page — opens the shared SubmodelCreator (full-screen dialog) pre-populated
 * with the existing PCF data, then triggers the ParticipantSelectionDialog notification
 * flow after a successful save.
 *
 * Accessible at: /pcf/management/edit/:manufacturerPartId
 */
const PcfEditPage: React.FC = () => {
  const { manufacturerPartId } = useParams<{ manufacturerPartId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation('pcf');

  // Version to edit, from the ?version= query param (e.g. "9.0.0" / "7.0.0").
  // Drives both the GET (which slot to load) and the PUT (which slot to update).
  const requestedVersion = toPcfVersionKey(searchParams.get('version'));

  // PCF schema — resolved after data loads, matching the actual version of the stored PCF
  const [pcfSchema, setPcfSchema] = useState<SchemaDefinition | undefined>(undefined);

  // --------------- Data loading ---------------
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [initialData, setInitialData] = useState<Record<string, unknown> | null>(null);
  // Create mode: the requested version slot is empty on the backend, so saving
  // POSTs (uploads) a new submodel instead of PUT-updating an existing one.
  const [isCreateMode, setIsCreateMode] = useState(false);

  // --------------- Save / Notify state ---------------
  const [isSaving, setIsSaving] = useState(false);
  const [participantBpns, setParticipantBpns] = useState<string[]>([]);
  const [isParticipantDialogOpen, setIsParticipantDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success',
  });

  useEffect(() => {
    if (!manufacturerPartId) return;
    const load = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const raw = await getPcfByManufacturerPartId(manufacturerPartId, requestedVersion ?? undefined);
        if (!raw) {
          // No stored data for this slot. With an explicit version we switch to
          // create mode (empty form → upload); without one it's a genuine error.
          if (requestedVersion) {
            const version = requestedVersion.replace(/^v/, '');
            setPcfSchema(getSchemaByNamespaceAndVersion(PCF_NAMESPACE, version));
            setInitialData({});
            setIsCreateMode(true);
            return;
          }
          setLoadError(t('error.pcfNotFound', 'PCF data not found for this part.'));
          return;
        }
        // Use the requested version when provided; otherwise detect from shape.
        // Edit in native format — no cross-version conversion.
        const version = requestedVersion ? requestedVersion.replace(/^v/, '') : detectPcfVersion(raw);
        const schema = getSchemaByNamespaceAndVersion(PCF_NAMESPACE, version);
        setPcfSchema(schema);
        setInitialData(raw as Record<string, unknown>);
        setIsCreateMode(false);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : t('error.failedToLoadPcf'));
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [manufacturerPartId, requestedVersion, t]);

  // Governance policies — same logic as PcfManagementPage
  const governancePolicies = useMemo(() => {
    const configured = getPcfExchangePoliciesConfig();
    if (configured.length > 0) {
      return configured.flatMap(def => generatePoliciesFromDefinition(def));
    }
    return DEFAULT_PCF_POLICIES;
  }, []);

  // --------------- SubmodelCreator save → update PCF → open notify dialog ---------------
  const handleSubmodelSave = useCallback(
    async (submodelData: Record<string, unknown>) => {
      if (!manufacturerPartId) return;
      setIsSaving(true);
      try {
        if (isCreateMode) {
          // New slot → upload, then return to the management page (no notify,
          // since a brand-new PCF has no prior interested participants).
          await uploadPcf(manufacturerPartId, submodelData, requestedVersion ?? undefined);
          setSnackbar({ open: true, message: t('management.uploadSuccess', 'PCF uploaded'), severity: 'success' });
          navigate('/pcf/management');
          return;
        }
        const result = await updatePcfAndGetParticipants(manufacturerPartId, submodelData, requestedVersion ?? undefined);
        const bpns = Array.isArray(result) ? result : [];
        setParticipantBpns(bpns);
        setIsParticipantDialogOpen(true);
      } catch (err) {
        const msg = err instanceof Error ? err.message : t('error.failedToSavePcf');
        setSnackbar({ open: true, message: msg, severity: 'error' });
      } finally {
        setIsSaving(false);
      }
    },
    [manufacturerPartId, requestedVersion, isCreateMode, navigate, t]
  );

  // --------------- Notify participants → navigate home ---------------
  const handleNotify = useCallback(
    async (selectedBpns: string[]) => {
      if (!manufacturerPartId) return;
      await notifyParticipants(
        manufacturerPartId,
        selectedBpns,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        governancePolicies as any
      );
      setSnackbar({
        open: true,
        message: t('exchange.pcfUpdateSent', { count: selectedBpns.length }),
        severity: 'success',
      });
      setIsParticipantDialogOpen(false);
      navigate('/pcf/management');
    },
    [manufacturerPartId, governancePolicies, navigate]
  );

  const handleParticipantDialogClose = () => {
    setIsParticipantDialogOpen(false);
    navigate('/pcf/management');
  };

  const handleBack = () => navigate(-1);

  // --------------- Loading state ---------------
  if (isLoading) {
    return (
      <Box className="pcf-edit-page__loading">
        <CircularProgress sx={{ color: '#10b981' }} size={48} />
      </Box>
    );
  }

  // --------------- Error state (load failed or schema missing) ---------------
  if (loadError || !initialData || !pcfSchema) {
    const message = loadError
      ?? (!pcfSchema ? t('error.schemaNotFound') : t('error.loadError'));
    return (
      <Box className="pcf-edit-page__error">
        <Alert severity="error" sx={{ maxWidth: 520 }}>{message}</Alert>
        <Button startIcon={<ArrowBack />} onClick={handleBack} sx={{ mt: 2, color: 'rgba(255,255,255,0.7)' }}>
          {t('common.back', 'Back')}
        </Button>
      </Box>
    );
  }

  // --------------- Main render — SubmodelCreator is always open (it IS the page) ---------------
  return (
    <>
      <SubmodelCreator
        open={true}
        onClose={handleBack}
        onBack={handleBack}
        onCreateSubmodel={handleSubmodelSave}
        selectedSchema={pcfSchema}
        schemaKey={createSchemaKey(pcfSchema.metadata.semanticId)}
        manufacturerPartId={manufacturerPartId}
        initialData={initialData}
        saveButtonLabel={t('management.update', 'Update PCF')}
        loading={isSaving}
      />

      <ParticipantSelectionDialog
        open={isParticipantDialogOpen}
        onClose={handleParticipantDialogClose}
        onConfirm={handleNotify}
        participants={participantBpns}
        manufacturerPartId={manufacturerPartId ?? ''}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.severity}
          variant="filled"
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default PcfEditPage;
