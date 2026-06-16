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

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  AppBar,
  Toolbar,
  Box,
  Typography,
  IconButton,
  Button,
  Chip,
  Stepper,
  Step,
  StepLabel,
  Alert,
  TextField,
  alpha,
  CircularProgress,
  StepConnector,
  stepConnectorClasses,
  styled,
  Tooltip,
} from '@mui/material';
import {
  Close as CloseIcon,
  Code as CodeIcon,
  Edit as EditIcon,
  CheckCircle as CheckCircleIcon,
  ArrowForward as ArrowForwardIcon,
  ArrowBack as ArrowBackIcon,
  AutoFixHigh as AutoFixHighIcon,
  Warning as WarningIcon,
  Save as SaveIcon,
  CloudUpload as CloudUploadIcon,
  InsertDriveFile as InsertDriveFileIcon,
  CheckCircleOutline as CheckCircleOutlineIcon,
  InfoOutlined as InfoOutlinedIcon,
} from '@mui/icons-material';
import { getSchemaByNamespaceAndVersion } from '@/schemas';
import { createSchemaKey } from '@/schemas/schemaLoader';
import SubmodelCreator from '@/components/submodel-creation/SubmodelCreator';
import { detectPcfVersion } from '../../pcf-management/utils/pcfVersionDetector';
import {
  findCrossVersionDifferences,
  extractV7CompatibleFields,
  setNestedValue,
  getConstraintWarning,
  type FieldDifference,
} from '../utils/pcfFieldMapper';
import './DualPcfCreationWizard.scss';

const PCF_PRIMARY = '#10b981';
const PCF_SECONDARY = '#059669';
const PCF_NAMESPACE = 'io.catenax.pcf';
const PCF_V9 = '9.0.0';
const PCF_V7 = '7.0.0';

export interface DualPcfCreationWizardProps {
  open: boolean;
  onClose: () => void;
  onSaveBoth: (
    v9Data: Record<string, unknown>,
    v7Data: Record<string, unknown>,
  ) => Promise<void>;
  manufacturerPartId?: string;
  isSaving?: boolean;
}

type WizardStep = 0 | 1 | 2;
type EditorMode = 'v9' | 'v7' | null;

const PcfStepConnector = styled(StepConnector)(() => ({
  [`&.${stepConnectorClasses.alternativeLabel}`]: { top: 18 },
  [`&.${stepConnectorClasses.active} .${stepConnectorClasses.line}`]: {
    background: `linear-gradient(90deg, ${PCF_PRIMARY} 0%, ${PCF_SECONDARY} 100%)`,
  },
  [`&.${stepConnectorClasses.completed} .${stepConnectorClasses.line}`]: {
    background: `linear-gradient(90deg, ${PCF_PRIMARY} 0%, ${PCF_SECONDARY} 100%)`,
  },
  [`& .${stepConnectorClasses.line}`]: {
    height: 3,
    border: 0,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 1,
  },
}));

const formatValue = (value: unknown, emptyLabel: string): string => {
  if (value === undefined || value === null || value === '') return emptyLabel;
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

// ---------------------------------------------------------------------------
// File drop zone — shared between Step 1 (v9) and Step 2 (v7)
// ---------------------------------------------------------------------------

interface PcfFileDropZoneProps {
  onDataLoaded: (data: Record<string, unknown>, detectedVersion: string | null) => void;
  expectedVersion: string;
  isLoaded: boolean;
  loadedVersion: string | null;
}

const PcfFileDropZone: React.FC<PcfFileDropZoneProps> = ({
  onDataLoaded,
  expectedVersion,
  isLoaded,
  loadedVersion,
}) => {
  const { t } = useTranslation('pcf');
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback((file: File) => {
    setError(null);
    if (!file.name.endsWith('.json') && file.type !== 'application/json') {
      setError(t('dualWizard.dropErrorJson'));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError(t('dualWizard.dropErrorSize'));
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string) as Record<string, unknown>;
        if (typeof parsed !== 'object' || parsed === null) {
          setError(t('dualWizard.dropErrorFormat'));
          return;
        }
        onDataLoaded(parsed, detectPcfVersion(parsed));
      } catch {
        setError(t('dualWizard.dropErrorParse'));
      }
    };
    reader.onerror = () => setError(t('dualWizard.dropErrorRead'));
    reader.readAsText(file);
  }, [onDataLoaded, t]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) processFile(e.dataTransfer.files[0]);
  }, [processFile]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      processFile(e.target.files[0]);
      e.target.value = '';
    }
  }, [processFile]);

  const versionMismatch = loadedVersion && loadedVersion !== expectedVersion;

  return (
    <Box>
      <Box
        className={[
          'dual-pcf-wizard__dropzone',
          isDragging ? 'dual-pcf-wizard__dropzone--dragging' : '',
          isLoaded ? 'dual-pcf-wizard__dropzone--loaded' : '',
        ].join(' ')}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          style={{ display: 'none' }}
          onChange={handleChange}
        />
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
          {isLoaded ? (
            <>
              <InsertDriveFileIcon sx={{ fontSize: 38, color: PCF_PRIMARY }} />
              <Typography sx={{ color: PCF_PRIMARY, fontWeight: 700, fontSize: '0.9rem' }}>
                {t('dualWizard.dropFileLoaded', { version: expectedVersion })}
              </Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>
                {t('dualWizard.dropReplaceHint')}
              </Typography>
            </>
          ) : (
            <>
              <CloudUploadIcon
                sx={{
                  fontSize: 40,
                  color: isDragging ? PCF_PRIMARY : 'rgba(255,255,255,0.22)',
                  transition: 'color 0.2s',
                }}
              />
              <Typography sx={{ color: isDragging ? PCF_PRIMARY : 'rgba(255,255,255,0.7)', fontWeight: 600, fontSize: '0.9rem', transition: 'color 0.2s', textAlign: 'center' }}>
                {isDragging ? t('dualWizard.dropDragging') : t('dualWizard.dropDrag', { version: expectedVersion })}
              </Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem' }}>
                {t('dualWizard.dropBrowse')}
              </Typography>
            </>
          )}
        </Box>
      </Box>

      {versionMismatch && (
        <Alert severity="warning" icon={<WarningIcon fontSize="small" />}
          sx={{ mt: 1, bgcolor: alpha('#f59e0b', 0.09), color: '#f59e0b', borderRadius: '10px', fontSize: '0.78rem', py: 0.5 }}>
          {t('dualWizard.dropVersionMismatch', { detected: loadedVersion, expected: expectedVersion })}
        </Alert>
      )}
      {error && (
        <Alert severity="error"
          sx={{ mt: 1, bgcolor: 'rgba(239,68,68,0.09)', color: '#ef4444', borderRadius: '10px', fontSize: '0.78rem', py: 0.5 }}>
          {error}
        </Alert>
      )}
    </Box>
  );
};

// ---------------------------------------------------------------------------
// Main wizard
// ---------------------------------------------------------------------------

export const DualPcfCreationWizard: React.FC<DualPcfCreationWizardProps> = ({
  open,
  onClose,
  onSaveBoth,
  manufacturerPartId,
  isSaving = false,
}) => {
  const { t } = useTranslation('pcf');

  const [activeStep, setActiveStep] = useState<WizardStep>(0);
  const [v9FormData, setV9FormData] = useState<Record<string, unknown> | null>(null);
  const [v9LoadedVersion, setV9LoadedVersion] = useState<string | null>(null);
  const [v7FormData, setV7FormData] = useState<Record<string, unknown> | null>(null);
  const [v7LoadedVersion, setV7LoadedVersion] = useState<string | null>(null);
  const [editorMode, setEditorMode] = useState<EditorMode>(null);
  const [editorInitialData, setEditorInitialData] = useState<Record<string, unknown> | undefined>(undefined);
  const [differences, setDifferences] = useState<FieldDifference[]>([]);
  const [v9ValidationResult, setV9ValidationResult] = useState<{ valid: boolean; errors: string[] } | null>(null);
  const [v7ValidationResult, setV7ValidationResult] = useState<{ valid: boolean; errors: string[] } | null>(null);

  const v9Schema = useMemo(() => getSchemaByNamespaceAndVersion(PCF_NAMESPACE, PCF_V9), []);
  const v7Schema = useMemo(() => getSchemaByNamespaceAndVersion(PCF_NAMESPACE, PCF_V7), []);

  // True whenever the shared fields between v9 and v7 are out of sync (refresh makes sense)
  const v7DiffersFromV9 = useMemo(() => {
    if (!v9FormData || !v7FormData) return false;
    return findCrossVersionDifferences(v9FormData, v7FormData).length > 0;
  }, [v9FormData, v7FormData]);

  useEffect(() => {
    if (open) {
      setActiveStep(0);
      setV9FormData(null);
      setV9LoadedVersion(null);
      setV7FormData(null);
      setV7LoadedVersion(null);
      setEditorMode(null);
      setEditorInitialData(undefined);
      setDifferences([]);
      setV9ValidationResult(null);
      setV7ValidationResult(null);
    }
  }, [open]);

  // Clear validation results when data is replaced
  useEffect(() => { setV9ValidationResult(null); }, [v9FormData]);
  useEffect(() => { setV7ValidationResult(null); }, [v7FormData]);

  const handleV9FileLoaded = useCallback((data: Record<string, unknown>, detected: string | null) => {
    setV9FormData(data);
    setV9LoadedVersion(detected);
  }, []);

  const handleV7FileLoaded = useCallback((data: Record<string, unknown>, detected: string | null) => {
    setV7FormData(data);
    setV7LoadedVersion(detected);
  }, []);

  const openV9Editor = useCallback(() => {
    setEditorInitialData(v9FormData ?? undefined);
    setEditorMode('v9');
  }, [v9FormData]);

  // Opens v7 editor pre-filled with fields extracted from v9 data
  const openV7Editor = useCallback(() => {
    const extracted = v9FormData ? extractV7CompatibleFields(v9FormData) : undefined;
    const merged = (extracted && v7FormData)
      ? { ...extracted, pcf: { ...((extracted.pcf as object) ?? {}), ...((v7FormData.pcf as object) ?? {}) } }
      : extracted ?? v7FormData ?? undefined;
    setEditorInitialData(merged);
    setEditorMode('v7');
  }, [v9FormData, v7FormData]);

  const handleEditorCapture = useCallback(async (data: Record<string, unknown>) => {
    if (editorMode === 'v9') {
      setV9FormData(data);
      setV9LoadedVersion(PCF_V9);
    } else if (editorMode === 'v7') {
      setV7FormData(data);
      setV7LoadedVersion(PCF_V7);
    }
    setEditorMode(null);
  }, [editorMode]);

  const refreshV7FromV9 = useCallback(() => {
    if (!v9FormData) return;
    const extracted = extractV7CompatibleFields(v9FormData);
    // v9-derived values win for shared fields; v7-only fields are preserved
    const merged = v7FormData
      ? {
          ...v7FormData,
          ...extracted,
          pcf: {
            ...((v7FormData.pcf as object) ?? {}),
            ...((extracted.pcf as object) ?? {}),
          },
        }
      : extracted;
    setV7FormData(merged);
    setV7LoadedVersion(PCF_V7);
  }, [v9FormData, v7FormData]);

  const validateAndNextStep = useCallback(() => {
    if (!v9FormData) return;
    if (v9Schema?.validate) {
      const result = v9Schema.validate(v9FormData);
      const errors = (result.errors as unknown[]).map(String);
      const unique = [...new Set(errors)];
      if (!result.isValid && unique.length > 0) {
        setV9ValidationResult({ valid: false, errors: unique });
        return;
      }
    }
    setV9ValidationResult(null);
    setActiveStep(1);
  }, [v9FormData, v9Schema]);

  const validateAndGoToReview = useCallback(() => {
    if (!v7FormData) return;
    if (v7Schema?.validate) {
      const result = v7Schema.validate(v7FormData);
      const errors = (result.errors as unknown[]).map(String);
      const unique = [...new Set(errors)];
      if (!result.isValid && unique.length > 0) {
        setV7ValidationResult({ valid: false, errors: unique });
        return;
      }
    }
    setV7ValidationResult(null);
    if (v9FormData && v7FormData) {
      setDifferences(findCrossVersionDifferences(v9FormData, v7FormData));
    }
    setActiveStep(2);
  }, [v7FormData, v7Schema, v9FormData]);

  const resolveDifference = useCallback(
    (diff: FieldDifference, chosen: 'v9' | 'v7' | 'manual', manualValue?: unknown) => {
      const resolvedValue =
        chosen === 'v9' ? diff.v9Value : chosen === 'v7' ? diff.v7Value : manualValue;
      setV9FormData((prev) => (prev ? setNestedValue(prev, diff.v9Path, resolvedValue) : prev));
      setV7FormData((prev) => (prev ? setNestedValue(prev, diff.v7Path, resolvedValue) : prev));
      setDifferences((prev) =>
        prev.map((d) =>
          d.fieldKey === diff.fieldKey
            ? { ...d, chosenVersion: chosen, resolvedValue, manualValue }
            : d,
        ),
      );
    },
    [],
  );

  const unresolved = differences.filter((d) => !d.chosenVersion);
  const allResolved = unresolved.length === 0;
  const canSave = activeStep === 2 && v9FormData != null && v7FormData != null && allResolved && !isSaving;
  const emptyLabel = t('dualWizard.empty');

  // -------- Button styles --------
  const primarySx = {
    background: `linear-gradient(135deg, ${PCF_PRIMARY} 0%, ${PCF_SECONDARY} 100%)`,
    color: '#fff',
    textTransform: 'none' as const,
    borderRadius: '10px',
    fontWeight: 600,
    boxShadow: `0 4px 14px ${alpha(PCF_PRIMARY, 0.35)}`,
    '&:hover': { background: `linear-gradient(135deg, ${PCF_SECONDARY} 0%, ${PCF_PRIMARY} 100%)`, boxShadow: `0 6px 20px ${alpha(PCF_PRIMARY, 0.5)}` },
    '&:disabled': { background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.22)', boxShadow: 'none' },
  };
  const outlinedSx = {
    borderColor: 'rgba(255,255,255,0.16)',
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'none' as const,
    borderRadius: '10px',
    '&:hover': { borderColor: 'rgba(255,255,255,0.34)', backgroundColor: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.88)' },
  };
  const fillSx = {
    borderColor: alpha(PCF_PRIMARY, 0.5),
    color: PCF_PRIMARY,
    textTransform: 'none' as const,
    borderRadius: '10px',
    fontWeight: 600,
    '&:hover': { borderColor: PCF_PRIMARY, backgroundColor: alpha(PCF_PRIMARY, 0.09), boxShadow: `0 0 12px ${alpha(PCF_PRIMARY, 0.22)}` },
    '&:disabled': { borderColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.2)' },
  };

  const stepLabels = [
    t('dualWizard.steps.createV9'),
    t('dualWizard.steps.createV7'),
    t('dualWizard.steps.review'),
  ];

  // -------- Capture banner --------
  const renderCaptured = (label: string, icon?: React.ReactNode) => (
    <Box className="dual-pcf-wizard__captured" sx={{ mb: 3 }}>
      {icon ?? <CheckCircleOutlineIcon sx={{ color: PCF_PRIMARY, fontSize: 20 }} />}
      <Typography sx={{ color: PCF_PRIMARY, fontWeight: 600, fontSize: '0.88rem' }}>{label}</Typography>
    </Box>
  );

  return (
    <>
      <Dialog
        open={open && editorMode === null}
        onClose={onClose}
        fullScreen
        PaperProps={{ sx: { backgroundColor: '#0e0e0e', overflow: 'hidden' } }}
      >
        {/* ── AppBar ── */}
        <AppBar position="relative" elevation={0}
          sx={{ backgroundColor: '#151515', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
          <Toolbar sx={{ px: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
              <Box sx={{
                width: 36, height: 36, borderRadius: '10px',
                background: `linear-gradient(135deg, ${PCF_PRIMARY} 0%, ${PCF_SECONDARY} 100%)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 4px 12px ${alpha(PCF_PRIMARY, 0.4)}`,
              }}>
                <CodeIcon sx={{ fontSize: 20, color: '#fff' }} />
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#fff', lineHeight: 1.2, fontSize: '1rem' }}>
                  {t('dualWizard.title')}
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.78rem' }}>
                  {manufacturerPartId
                    ? t('dualWizard.subtitleWithPart', { partId: manufacturerPartId })
                    : t('dualWizard.subtitle')}
                </Typography>
              </Box>
            </Box>
            <IconButton onClick={onClose}
              sx={{ color: 'rgba(255,255,255,0.55)', '&:hover': { backgroundColor: 'rgba(255,255,255,0.06)', color: '#fff' } }}>
              <CloseIcon />
            </IconButton>
          </Toolbar>
        </AppBar>

        {/* ── Layout: sticky stepper + scrollable body + sticky step-3 footer ── */}
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', p: 0, overflow: 'hidden', flex: 1 }}>

          {/* Sticky stepper */}
          <Box className="dual-pcf-wizard__stepper-bar">
            <Stepper activeStep={activeStep} alternativeLabel connector={<PcfStepConnector />}
              sx={{ maxWidth: 680, mx: 'auto', width: '100%' }}>
              {stepLabels.map((label, idx) => (
                <Step key={label} completed={activeStep > idx}>
                  <StepLabel sx={{
                    '& .MuiStepLabel-label': { color: 'rgba(255,255,255,0.38)', fontSize: '0.82rem' },
                    '& .MuiStepLabel-label.Mui-active': { color: '#fff', fontWeight: 700 },
                    '& .MuiStepLabel-label.Mui-completed': { color: PCF_PRIMARY, fontWeight: 600 },
                    '& .MuiStepIcon-root': { color: 'rgba(255,255,255,0.1)' },
                    '& .MuiStepIcon-root.Mui-active': { color: PCF_PRIMARY, filter: `drop-shadow(0 0 5px ${alpha(PCF_PRIMARY, 0.55)})` },
                    '& .MuiStepIcon-root.Mui-completed': { color: PCF_PRIMARY },
                  }}>
                    {label}
                  </StepLabel>
                </Step>
              ))}
            </Stepper>
          </Box>

          {/* Scrollable body */}
          <Box className="dual-pcf-wizard__body">
            <Box sx={{ maxWidth: 900, mx: 'auto', px: { xs: 2, sm: 4 }, py: 4, pb: activeStep === 2 ? 2 : 4 }}>

              {/* ──────── Step 1: Create PCF v9.0.0 ──────── */}
              {activeStep === 0 && (
                <Box className="dual-pcf-wizard__step-card" sx={{ p: { xs: 3, sm: 4 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.75 }}>
                    <Chip label="v9.0.0" size="small"
                      sx={{ background: `linear-gradient(135deg, ${PCF_PRIMARY}, ${PCF_SECONDARY})`, color: '#fff', fontWeight: 700, fontSize: '0.68rem' }} />
                    <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700, fontSize: '1rem' }}>
                      {t('dualWizard.step1Title')}
                    </Typography>
                  </Box>
                  <Typography sx={{ color: 'rgba(255,255,255,0.45)', mb: 3, fontSize: '0.85rem' }}>
                    {t('dualWizard.step1Desc')}
                  </Typography>

                  {v9FormData && renderCaptured(t('dualWizard.v9Ready'))}

                  {/* Drop zone */}
                  <Tooltip title={t('dualWizard.tooltipDropZone')} placement="top" arrow>
                    <Box>
                      <PcfFileDropZone
                        onDataLoaded={handleV9FileLoaded}
                        expectedVersion={PCF_V9}
                        isLoaded={!!v9FormData}
                        loadedVersion={v9LoadedVersion}
                      />
                    </Box>
                  </Tooltip>

                  {/* ── or ── divider */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, my: 2 }}>
                    <Box sx={{ flex: 1, height: '1px', bgcolor: 'rgba(255,255,255,0.09)' }} />
                    <Typography sx={{ color: 'rgba(255,255,255,0.28)', fontSize: '0.78rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
                      {t('dualWizard.or')}
                    </Typography>
                    <Box sx={{ flex: 1, height: '1px', bgcolor: 'rgba(255,255,255,0.09)' }} />
                  </Box>

                  {/* Open Form Editor button */}
                  <Tooltip title={t('dualWizard.tooltipFormEditorV9')} placement="bottom" arrow>
                    <Button
                      fullWidth
                      variant="outlined"
                      size="large"
                      startIcon={<CodeIcon />}
                      onClick={openV9Editor}
                      sx={{
                        py: 1.75,
                        borderColor: 'rgba(255,255,255,0.16)',
                        color: 'rgba(255,255,255,0.75)',
                        textTransform: 'none',
                        borderRadius: '14px',
                        fontWeight: 600,
                        fontSize: '0.95rem',
                        '&:hover': {
                          borderColor: alpha(PCF_PRIMARY, 0.6),
                          backgroundColor: alpha(PCF_PRIMARY, 0.06),
                          color: '#fff',
                          boxShadow: `0 0 20px ${alpha(PCF_PRIMARY, 0.12)}`,
                        },
                      }}
                    >
                      {v9FormData ? t('dualWizard.editV9') : t('dualWizard.openV9Editor')}
                    </Button>
                  </Tooltip>

                  {/* v9 validation errors */}
                  {v9ValidationResult && !v9ValidationResult.valid && (
                    <Alert severity="error" sx={{ mt: 2, bgcolor: 'rgba(239,68,68,0.08)', color: '#ef4444', borderRadius: '12px', border: '1px solid rgba(239,68,68,0.22)' }}>
                      <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#ef4444', mb: 0.5 }}>
                        {t('dualWizard.validationFailed', { count: v9ValidationResult.errors.length })}
                      </Typography>
                      <Box component="ul" sx={{ m: 0, pl: 2 }}>
                        {v9ValidationResult.errors.slice(0, 6).map((err, i) => (
                          <Box component="li" key={i} sx={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', mb: 0.25 }}>{err}</Box>
                        ))}
                        {v9ValidationResult.errors.length > 6 && (
                          <Box component="li" sx={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)' }}>
                            +{v9ValidationResult.errors.length - 6} more
                          </Box>
                        )}
                      </Box>
                    </Alert>
                  )}

                  {/* Footer */}
                  <Box className="dual-pcf-wizard__step-footer" sx={{ mt: 4 }}>
                    <Tooltip title={t('dualWizard.exitWizard')} placement="top">
                      <Button variant="outlined" startIcon={<CloseIcon />} onClick={onClose} sx={outlinedSx}>
                        {t('dualWizard.exitWizard')}
                      </Button>
                    </Tooltip>
                    <Box className="dual-pcf-wizard__nav">
                      <Tooltip title={!v9FormData ? t('dualWizard.step1NextTooltip') : t('dualWizard.tooltipNextV7')} placement="top">
                        <span>
                          <Button variant="contained" endIcon={<ArrowForwardIcon />}
                            disabled={!v9FormData} onClick={validateAndNextStep} sx={primarySx}>
                            {t('dualWizard.nextCreateV7')}
                          </Button>
                        </span>
                      </Tooltip>
                    </Box>
                  </Box>
                </Box>
              )}

              {/* ──────── Step 2: Create PCF v7.0.0 ──────── */}
              {activeStep === 1 && (
                <Box className="dual-pcf-wizard__step-card" sx={{ p: { xs: 3, sm: 4 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.75 }}>
                    <Chip label="v7.0.0" size="small"
                      sx={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: '#fff', fontWeight: 700, fontSize: '0.68rem' }} />
                    <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700, fontSize: '1rem' }}>
                      {t('dualWizard.step2Title')}
                    </Typography>
                  </Box>
                  <Typography sx={{ color: 'rgba(255,255,255,0.45)', mb: 2, fontSize: '0.85rem' }}>
                    {t('dualWizard.step2Desc')}
                  </Typography>

                  {/* Auto-fill info notice */}
                  <Alert icon={<InfoOutlinedIcon fontSize="small" />} severity="info"
                    sx={{ mb: 3, bgcolor: 'rgba(59,130,246,0.08)', color: 'rgba(147,197,253,0.9)',
                          border: '1px solid rgba(59,130,246,0.2)', borderRadius: '12px', fontSize: '0.82rem' }}>
                    {t('dualWizard.step2AutoFillNote')}
                  </Alert>

                  {v7FormData && renderCaptured(t('dualWizard.v7Ready'))}

                  {/* Drop zone */}
                  <Tooltip title={t('dualWizard.tooltipDropZone')} placement="top" arrow>
                    <Box>
                      <PcfFileDropZone
                        onDataLoaded={handleV7FileLoaded}
                        expectedVersion={PCF_V7}
                        isLoaded={!!v7FormData}
                        loadedVersion={v7LoadedVersion}
                      />
                    </Box>
                  </Tooltip>

                  {/* ── or ── divider */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, my: 2 }}>
                    <Box sx={{ flex: 1, height: '1px', bgcolor: 'rgba(255,255,255,0.09)' }} />
                    <Typography sx={{ color: 'rgba(255,255,255,0.28)', fontSize: '0.78rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
                      {t('dualWizard.or')}
                    </Typography>
                    <Box sx={{ flex: 1, height: '1px', bgcolor: 'rgba(255,255,255,0.09)' }} />
                  </Box>

                  {/* Open Form Editor button */}
                  <Tooltip title={t('dualWizard.tooltipFormEditorV7')} placement="bottom" arrow>
                    <Button
                      fullWidth
                      variant="outlined"
                      size="large"
                      startIcon={<CodeIcon />}
                      onClick={openV7Editor}
                      sx={{
                        py: 1.75,
                        borderColor: 'rgba(255,255,255,0.16)',
                        color: 'rgba(255,255,255,0.75)',
                        textTransform: 'none',
                        borderRadius: '14px',
                        fontWeight: 600,
                        fontSize: '0.95rem',
                        '&:hover': {
                          borderColor: 'rgba(59,130,246,0.6)',
                          backgroundColor: 'rgba(59,130,246,0.06)',
                          color: '#fff',
                          boxShadow: '0 0 20px rgba(59,130,246,0.12)',
                        },
                      }}
                    >
                      {v7FormData ? t('dualWizard.editV7') : t('dualWizard.openV7Editor')}
                    </Button>
                  </Tooltip>

                  {/* Subtle "Refresh from v9.0.0" — only when v7 data exists AND differs from v9 */}
                  {v7FormData && v7DiffersFromV9 && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1.5 }}>
                      <Tooltip title={t('dualWizard.tooltipRefreshV9')} placement="bottom" arrow>
                        <Button
                          size="small"
                          variant="text"
                          startIcon={<AutoFixHighIcon sx={{ fontSize: 14 }} />}
                          disabled={!v9FormData}
                          onClick={refreshV7FromV9}
                          sx={{
                            color: 'rgba(255,255,255,0.32)',
                            textTransform: 'none',
                            fontSize: '0.78rem',
                            '&:hover': { color: PCF_PRIMARY, bgcolor: alpha(PCF_PRIMARY, 0.06) },
                            '&:disabled': { color: 'rgba(255,255,255,0.14)' },
                          }}
                        >
                          {t('dualWizard.fillFromV9')}
                        </Button>
                      </Tooltip>
                    </Box>
                  )}

                  {/* v7 validation errors */}
                  {v7ValidationResult && !v7ValidationResult.valid && (
                    <Alert severity="error" sx={{ mt: 2, bgcolor: 'rgba(239,68,68,0.08)', color: '#ef4444', borderRadius: '12px', border: '1px solid rgba(239,68,68,0.22)' }}>
                      <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#ef4444', mb: 0.5 }}>
                        {t('dualWizard.validationFailed', { count: v7ValidationResult.errors.length })}
                      </Typography>
                      <Box component="ul" sx={{ m: 0, pl: 2 }}>
                        {v7ValidationResult.errors.slice(0, 6).map((err, i) => (
                          <Box component="li" key={i} sx={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', mb: 0.25 }}>{err}</Box>
                        ))}
                        {v7ValidationResult.errors.length > 6 && (
                          <Box component="li" sx={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)' }}>
                            +{v7ValidationResult.errors.length - 6} more
                          </Box>
                        )}
                      </Box>
                    </Alert>
                  )}

                  {/* Footer */}
                  <Box className="dual-pcf-wizard__step-footer" sx={{ mt: 4 }}>
                    <Tooltip title={t('dualWizard.tooltipBackToV9')} placement="top">
                      <Button variant="outlined" startIcon={<ArrowBackIcon />}
                        onClick={() => setActiveStep(0)} sx={outlinedSx}>
                        {t('dualWizard.backToV9')}
                      </Button>
                    </Tooltip>
                    <Box className="dual-pcf-wizard__nav">
                      <Tooltip title={!v7FormData ? t('dualWizard.step2NextTooltip') : t('dualWizard.tooltipValidateContinue')} placement="top">
                        <span>
                          <Button variant="contained" endIcon={<ArrowForwardIcon />}
                            disabled={!v7FormData} onClick={validateAndGoToReview} sx={primarySx}>
                            {t('dualWizard.validateContinue')}
                          </Button>
                        </span>
                      </Tooltip>
                    </Box>
                  </Box>
                </Box>
              )}

              {/* ──────── Step 3: Review & Save ──────── */}
              {activeStep === 2 && (
                <Box sx={{ pb: 2 }}>
                  {differences.length === 0 || allResolved ? (
                    <Alert icon={<CheckCircleIcon fontSize="inherit" />} severity="success"
                      sx={{ bgcolor: alpha(PCF_PRIMARY, 0.09), color: PCF_PRIMARY, borderRadius: '12px', mb: 3, border: `1px solid ${alpha(PCF_PRIMARY, 0.28)}` }}>
                      {t('dualWizard.consistent')}
                    </Alert>
                  ) : (
                    <Alert severity="warning"
                      sx={{ bgcolor: alpha('#f59e0b', 0.07), color: '#f59e0b', borderRadius: '12px', mb: 3, border: '1px solid rgba(245,158,11,0.22)' }}>
                      <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff' }}>
                        {t('dualWizard.reconcileTitle', { count: unresolved.length })}
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 0.5, opacity: 0.85, fontSize: '0.82rem', color: '#fff' }}>
                        {t('dualWizard.reconcileSubtitle')}
                      </Typography>
                    </Alert>
                  )}

                  {differences.length > 0 && (
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.5, mb: 1.5, px: 0.5 }}>
                      <Tooltip title={t('dualWizard.tooltipV9Column')} placement="top" arrow>
                        <Typography sx={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, cursor: 'default' }}>
                          v9.0.0
                        </Typography>
                      </Tooltip>
                      <Tooltip title={t('dualWizard.tooltipV7Column')} placement="top" arrow>
                        <Typography sx={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, cursor: 'default' }}>
                          v7.0.0
                        </Typography>
                      </Tooltip>
                    </Box>
                  )}

                  {differences.map((diff) => (
                    <ReconciliationCard
                      key={diff.fieldKey}
                      diff={diff}
                      emptyLabel={emptyLabel}
                      onResolve={resolveDifference}
                    />
                  ))}
                </Box>
              )}

            </Box>
          </Box>

          {/* ── Sticky footer for Step 3 only ── */}
          {activeStep === 2 && (
            <Box className="dual-pcf-wizard__sticky-footer">
              <Box sx={{ maxWidth: 900, mx: 'auto', px: { xs: 2, sm: 4 }, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Tooltip title={t('dualWizard.tooltipBackToV7')} placement="top" arrow>
                  <Button variant="outlined" startIcon={<ArrowBackIcon />}
                    onClick={() => setActiveStep(1)} sx={outlinedSx}>
                    {t('dualWizard.backToV7')}
                  </Button>
                </Tooltip>
                <Tooltip title={!canSave ? (allResolved ? '' : t('dualWizard.tooltipSaveBoth')) : t('dualWizard.tooltipSaveBoth')} placement="top" arrow>
                  <span>
                    <Button variant="contained"
                      startIcon={isSaving ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
                      disabled={!canSave} onClick={async () => { if (v9FormData && v7FormData) await onSaveBoth(v9FormData, v7FormData); }}
                      sx={primarySx}>
                      {isSaving ? t('dualWizard.saving') : t('dualWizard.saveBoth')}
                    </Button>
                  </span>
                </Tooltip>
              </Box>
            </Box>
          )}

        </DialogContent>
      </Dialog>

      {/* v9.0.0 form editor */}
      {editorMode === 'v9' && v9Schema && (
        <SubmodelCreator
          open
          onClose={() => setEditorMode(null)}
          onBack={() => setEditorMode(null)}
          onCreateSubmodel={handleEditorCapture}
          selectedSchema={v9Schema}
          schemaKey={createSchemaKey(v9Schema.metadata.semanticId)}
          manufacturerPartId={manufacturerPartId}
          initialData={editorInitialData}
          saveButtonLabel={t('dualWizard.useAsV9')}
        />
      )}

      {/* v7.0.0 form editor */}
      {editorMode === 'v7' && v7Schema && (
        <SubmodelCreator
          open
          onClose={() => setEditorMode(null)}
          onBack={() => setEditorMode(null)}
          onCreateSubmodel={handleEditorCapture}
          selectedSchema={v7Schema}
          schemaKey={createSchemaKey(v7Schema.metadata.semanticId)}
          manufacturerPartId={manufacturerPartId}
          initialData={editorInitialData}
          saveButtonLabel={t('dualWizard.useAsV7')}
        />
      )}
    </>
  );
};

// ---------------------------------------------------------------------------
// Reconciliation card — column picker with manual value display
// ---------------------------------------------------------------------------

interface ReconciliationCardProps {
  diff: FieldDifference;
  emptyLabel: string;
  onResolve: (diff: FieldDifference, chosen: 'v9' | 'v7' | 'manual', manualValue?: unknown) => void;
}

function validateManualInput(text: string, diff: FieldDifference, t: (key: string) => string): string | null {
  if (!text.trim()) return null;
  const sample = diff.v9Value ?? diff.v7Value;
  if (typeof sample === 'number') {
    const n = Number(text);
    if (Number.isNaN(n)) return t('dualWizard.manualErrorNumeric');
  }
  if (typeof sample === 'string' && sample.startsWith('urn:') && !text.startsWith('urn:')) {
    return t('dualWizard.manualErrorUrn');
  }
  return null;
}

const ReconciliationCard: React.FC<ReconciliationCardProps> = ({ diff, emptyLabel, onResolve }) => {
  const { t } = useTranslation('pcf');
  const [manualMode, setManualMode] = useState(false);
  const [manualText, setManualText] = useState('');
  const [manualError, setManualError] = useState<string | null>(null);

  const isResolved = !!diff.chosenVersion;
  const chosen = diff.chosenVersion;

  // Reset manual mode when card is resolved externally (via v9/v7 column click)
  useEffect(() => {
    if (chosen === 'v9' || chosen === 'v7') setManualMode(false);
  }, [chosen]);

  const coerceManual = (text: string): unknown => {
    const sample = diff.v9Value ?? diff.v7Value;
    if (typeof sample === 'number') { const n = Number(text); return Number.isNaN(n) ? text : n; }
    if (typeof sample === 'boolean') return text === 'true';
    return text;
  };

  const v9Warning = getConstraintWarning(diff.v9Value, diff.constraints);
  const v7Warning = getConstraintWarning(diff.v7Value, diff.constraints);

  const warnChip = (show: boolean, label: string) => show ? (
    <Chip size="small" icon={<WarningIcon sx={{ fontSize: 11 }} />} label={label}
      sx={{ mt: 0.75, bgcolor: alpha('#ef4444', 0.13), color: '#ef4444', fontSize: '0.62rem', height: 18, fontWeight: 600 }} />
  ) : null;

  return (
    <Box className={`dual-pcf-wizard__diff-card${isResolved ? ' dual-pcf-wizard__diff-card--resolved' : ''}`} sx={{ mb: 2 }}>
      {/* Header row */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '0.88rem' }}>{diff.label}</Typography>
        {isResolved ? (
          <Chip size="small" icon={<CheckCircleIcon sx={{ fontSize: 12 }} />}
            label={chosen === 'manual' ? t('dualWizard.customValue') : chosen === 'v9' ? 'v9.0.0' : 'v7.0.0'}
            sx={{ bgcolor: alpha('#10b981', 0.16), color: '#10b981', fontWeight: 700, fontSize: '0.68rem', height: 22 }} />
        ) : (
          <Chip size="small" label={t('dualWizard.unresolved')}
            sx={{ bgcolor: alpha('#f59e0b', 0.14), color: '#f59e0b', fontWeight: 600, fontSize: '0.68rem', height: 22 }} />
        )}
      </Box>

      {/* Two-column clickable value picker */}
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
        {/* v9.0.0 */}
        <Tooltip title={t('dualWizard.tooltipV9Column')} placement="top" arrow>
        <Box
          className={`dual-pcf-wizard__value-col${chosen === 'v9' ? ' dual-pcf-wizard__value-col--selected' : ''}`}
          onClick={() => { setManualMode(false); onResolve(diff, 'v9'); }}
          sx={{ cursor: 'pointer' }}
        >
          <Typography sx={{ color: 'rgba(255,255,255,0.38)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, mb: 0.75 }}>
            v9.0.0
          </Typography>
          <Typography className="dual-pcf-wizard__diff-value"
            sx={{ color: chosen === 'v9' ? '#fff' : 'rgba(255,255,255,0.78)', fontSize: '0.82rem', wordBreak: 'break-all', minHeight: 20 }}>
            {formatValue(diff.v9Value, emptyLabel)}
          </Typography>
          {warnChip(v9Warning.outOfV9Range, t('dualWizard.outOfV9Range'))}
          {chosen === 'v9' && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
              <CheckCircleIcon sx={{ fontSize: 13, color: '#10b981' }} />
              <Typography sx={{ color: '#10b981', fontSize: '0.7rem', fontWeight: 600 }}>{t('dualWizard.selected')}</Typography>
            </Box>
          )}
        </Box>
        </Tooltip>

        {/* v7.0.0 */}
        <Tooltip title={t('dualWizard.tooltipV7Column')} placement="top" arrow>
        <Box
          className={`dual-pcf-wizard__value-col${chosen === 'v7' ? ' dual-pcf-wizard__value-col--selected' : ''}`}
          onClick={() => { setManualMode(false); onResolve(diff, 'v7'); }}
          sx={{ cursor: 'pointer' }}
        >
          <Typography sx={{ color: 'rgba(255,255,255,0.38)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, mb: 0.75 }}>
            v7.0.0
          </Typography>
          <Typography className="dual-pcf-wizard__diff-value"
            sx={{ color: chosen === 'v7' ? '#fff' : 'rgba(255,255,255,0.78)', fontSize: '0.82rem', wordBreak: 'break-all', minHeight: 20 }}>
            {formatValue(diff.v7Value, emptyLabel)}
          </Typography>
          {warnChip(v7Warning.outOfV7Range, t('dualWizard.outOfV7Range'))}
          {chosen === 'v7' && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
              <CheckCircleIcon sx={{ fontSize: 13, color: '#10b981' }} />
              <Typography sx={{ color: '#10b981', fontSize: '0.7rem', fontWeight: 600 }}>{t('dualWizard.selected')}</Typography>
            </Box>
          )}
        </Box>
        </Tooltip>
      </Box>

      {/* Manual value display when resolved with custom value */}
      {chosen === 'manual' && !manualMode && (
        <Box sx={{ mt: 2, px: 2, py: 1.5, borderRadius: '10px', bgcolor: alpha('#10b981', 0.07), border: `1px solid ${alpha('#10b981', 0.26)}` }}>
          <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, mb: 0.5 }}>
            {t('dualWizard.manualResolved', { value: '' }).replace(': ', '')}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography className="dual-pcf-wizard__diff-value"
              sx={{ color: '#fff', fontSize: '0.85rem', flex: 1, wordBreak: 'break-all' }}>
              {formatValue(diff.resolvedValue, emptyLabel)}
            </Typography>
            <Button size="small" startIcon={<EditIcon sx={{ fontSize: 13 }} />}
              onClick={() => { setManualMode(true); setManualText(String(diff.resolvedValue ?? '')); setManualError(null); }}
              sx={{ color: 'rgba(255,255,255,0.5)', textTransform: 'none', fontSize: '0.75rem', minWidth: 0,
                    '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.06)' } }}>
              {t('dualWizard.reEdit')}
            </Button>
          </Box>
        </Box>
      )}

      {/* Manual input trigger */}
      {!manualMode && chosen !== 'manual' && (
        <Box sx={{ mt: 1.5, display: 'flex', justifyContent: 'flex-end' }}>
          <Tooltip title={t('dualWizard.tooltipManualEntry')} placement="left" arrow>
            <Button size="small" variant="text" startIcon={<EditIcon sx={{ fontSize: 13 }} />}
              onClick={() => { setManualMode(true); setManualText(''); setManualError(null); }}
              sx={{ color: 'rgba(255,255,255,0.35)', textTransform: 'none', fontSize: '0.75rem',
                    '&:hover': { color: 'rgba(255,255,255,0.72)', bgcolor: 'rgba(255,255,255,0.04)' } }}>
              {t('dualWizard.editManually')}
            </Button>
          </Tooltip>
        </Box>
      )}

      {manualMode && (
        <Box sx={{ mt: 2, p: 2, borderRadius: '10px', bgcolor: 'rgba(255,255,255,0.025)', border: `1px solid ${manualError ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.08)'}` }}>
          <Typography sx={{ color: 'rgba(255,255,255,0.38)', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, mb: 1 }}>
            {t('dualWizard.customValue')}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <TextField
              size="small"
              autoFocus
              value={manualText}
              onChange={(e) => {
                const text = e.target.value;
                setManualText(text);
                setManualError(validateManualInput(text, diff, t as (key: string) => string));
              }}
              placeholder={t('dualWizard.manualPlaceholder')}
              error={!!manualError}
              sx={{
                flex: 1, minWidth: 160,
                '& .MuiOutlinedInput-root': {
                  color: '#fff',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(255,255,255,0.05)',
                },
                '& .MuiInputBase-input': { color: '#fff' },
                '& .MuiOutlinedInput-notchedOutline': { borderColor: manualError ? 'rgba(239,68,68,0.6)' : 'rgba(255,255,255,0.14)' },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: manualError ? 'rgba(239,68,68,0.8)' : 'rgba(255,255,255,0.28)' },
                '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: manualError ? '#ef4444' : '#10b981' },
              }} />
            <Tooltip title={manualError ?? ''} placement="top" arrow>
              <span>
                <Button variant="contained" size="small"
                  disabled={!!manualError}
                  onClick={() => { onResolve(diff, 'manual', coerceManual(manualText)); setManualMode(false); setManualError(null); }}
                  sx={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', textTransform: 'none', borderRadius: '8px', fontWeight: 600,
                        '&:hover': { background: 'linear-gradient(135deg, #059669, #10b981)' },
                        '&:disabled': { background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.22)' } }}>
                  {t('dualWizard.apply')}
                </Button>
              </span>
            </Tooltip>
            <Button variant="outlined" size="small" onClick={() => { setManualMode(false); setManualError(null); }}
              sx={{ borderColor: 'rgba(255,255,255,0.14)', color: 'rgba(255,255,255,0.48)', textTransform: 'none', borderRadius: '8px',
                    '&:hover': { borderColor: 'rgba(255,255,255,0.28)', color: 'rgba(255,255,255,0.8)' } }}>
              {t('dualWizard.cancel')}
            </Button>
          </Box>
          {manualError && (
            <Typography sx={{ color: '#ef4444', fontSize: '0.72rem', mt: 0.75, display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <WarningIcon sx={{ fontSize: 12 }} />
              {manualError}
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
};

export default DualPcfCreationWizard;
