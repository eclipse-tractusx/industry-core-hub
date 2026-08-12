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

import React, { useState, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Alert,
  Divider,
  alpha,
  CircularProgress,
  Chip
} from '@mui/material';
import {
  CloudUpload,
  CheckCircle,
  Code as CodeIcon,
  Warning
} from '@mui/icons-material';
import { getSchemaByNamespaceAndVersion, getSchemaVersionsByNamespace } from '@/schemas';
import { createSchemaKey } from '@/schemas/schemaLoader';
import { detectPcfVersion } from '../../pcf-management/utils/pcfVersionDetector';
import SubmodelCreator from '@/components/submodel-creation/SubmodelCreator';

// PCF Green Theme
const PCF_PRIMARY = '#10b981';
const PCF_SECONDARY = '#059669';

// PCF Schema namespace — version is resolved dynamically from the schema registry
const PCF_NAMESPACE = 'io.catenax.pcf';

export interface PcfDataEditorProps {
  /**
   * Callback when PCF data is saved
   */
  onSave: (pcfData: Record<string, unknown>) => Promise<void>;
  /**
   * Callback when editor is closed/cancelled
   */
  onCancel: () => void;
  /**
   * Initial PCF data for editing (optional)
   */
  initialData?: Record<string, unknown>;
  /**
   * Mode: 'create' for new PCF, 'edit' for updating existing
   */
  mode: 'create' | 'edit';
  /**
   * Manufacturer Part ID for context
   */
  manufacturerPartId?: string;
  /**
   * Whether the save operation is in progress
   */
  isSaving?: boolean;
}

type ValidationStatus = 'idle' | 'success' | 'error';

/**
 * PcfDataEditor - A component for creating or editing PCF data
 * 
 * Supports:
 * - Drag & drop JSON file upload
 * - Manual file selection
 * - JSON validation against PCF schema
 */
export const PcfDataEditor: React.FC<PcfDataEditorProps> = ({
  onSave,
  onCancel,
  initialData,
  mode,
  manufacturerPartId,
  isSaving = false
}) => {
  // State
  const [pcfData, setPcfData] = useState<Record<string, unknown> | null>(initialData || null);
  const [isDragging, setIsDragging] = useState(false);
  const [showSubmodelCreator, setShowSubmodelCreator] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [validationStatus, setValidationStatus] = useState<ValidationStatus>('idle');
  const [isValidating, setIsValidating] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  // Version tracking: auto-detected from dropped file; user-selected for form builder
  const [detectedVersion, setDetectedVersion] = useState<string | null>(null);
  const [selectedFormVersion, setSelectedFormVersion] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation('pcf');

  // Discover all PCF schema versions from registry, sorted latest-first
  const pcfSchemaVersions = useMemo(
    () =>
      getSchemaVersionsByNamespace(PCF_NAMESPACE).sort((a, b) =>
        b.metadata.version.localeCompare(a.metadata.version, undefined, { numeric: true }),
      ),
    [],
  );
  const defaultVersion = pcfSchemaVersions[0]?.metadata.version ?? '9.0.0';
  const effectiveFormVersion = selectedFormVersion || defaultVersion;

  // Schema used for validating uploaded files (auto-detected version)
  const uploadSchema = useMemo(
    () => getSchemaByNamespaceAndVersion(PCF_NAMESPACE, detectedVersion ?? defaultVersion),
    [detectedVersion, defaultVersion],
  );

  // Schema used for the form builder (user-selected version)
  const formSchema = useMemo(
    () => getSchemaByNamespaceAndVersion(PCF_NAMESPACE, effectiveFormVersion),
    [effectiveFormVersion],
  );

  // Handle drag events
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
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // Process uploaded file
  const processFile = (file: File) => {
    setUploadError(null);
    setSuccessMessage(null);

    // Check file type
    if (!file.name.endsWith('.json') && file.type !== 'application/json') {
      setUploadError(t('editor.invalidFileType'));
      return;
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setUploadError(t('editor.fileTooLarge'));
      return;
    }

    // Read file content
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const jsonData = JSON.parse(content);

        // Basic validation - check if it's an object
        if (typeof jsonData !== 'object' || jsonData === null) {
          setUploadError(t('editor.invalidFormat'));
          return;
        }

        // Auto-detect PCF version from file structure
        const version = detectPcfVersion(jsonData);
        setDetectedVersion(version);

        // Set the PCF data without validating yet
        setPcfData(jsonData);
        setValidationStatus('idle');
        setUploadError(null);
        setSuccessMessage(t('editor.loadedSuccess'));
        
        // Clear success message after 4 seconds
        setTimeout(() => {
          setSuccessMessage(null);
        }, 4000);
      } catch {
        setUploadError(t('editor.parseError'));
      }
    };

    reader.onerror = () => {
      setUploadError(t('editor.readError'));
    };

    reader.readAsText(file);
  };

  // Validate PCF data against schema
  const handleValidate = () => {
    if (!pcfData) return;
    
    setIsValidating(true);
    setUploadError(null);
    
    try {
      if (uploadSchema?.validate) {
        const validation = uploadSchema.validate(pcfData);
        if (!validation.isValid) {
          const errorMessages = validation.errors.join('; ');
          const errorCount = validation.errors.length;
          setUploadError(`Validation failed with ${errorCount} error${errorCount > 1 ? 's' : ''}: ${errorMessages}`);
          setValidationStatus('error');
        } else {
          setValidationStatus('success');
          setUploadError(null);
          setSuccessMessage(t('editor.validatedSuccess'));
          setTimeout(() => {
            setSuccessMessage(null);
          }, 4000);
        }
      } else {
        // No schema validation available - accept as is
        setValidationStatus('success');
        setSuccessMessage(t('editor.noSchemaValidation'));
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setUploadError(`Validation error: ${errorMessage}`);
      setValidationStatus('error');
    } finally {
      setIsValidating(false);
    }
  };

  // Handle save
  const handleSave = async () => {
    if (!pcfData) return;
    
    // Require validation before saving
    if (validationStatus !== 'success') {
      setUploadError('Please validate the PCF data before saving.');
      return;
    }

    await onSave(pcfData);
  };

  // Clear data and start over
  const handleClear = () => {
    setPcfData(null);
    setValidationStatus('idle');
    setUploadError(null);
    setSuccessMessage(null);
    setDetectedVersion(null);
  };

  // Handle SubmodelCreator form save — load the JSON into the editor pre-validated
  const handleSubmodelCreatorSave = async (submodelData: Record<string, unknown>) => {
    setPcfData(submodelData);
    setDetectedVersion(effectiveFormVersion);
    setValidationStatus('success');
    setSuccessMessage(t('editor.formBuilderSuccess'));
    setShowSubmodelCreator(false);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Title */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600 }}>
          {mode === 'create' ? 'Create PCF Data' : 'Edit PCF Data'}
        </Typography>
        {manufacturerPartId && (
          <Chip
            label={manufacturerPartId}
            size="small"
            sx={{
              backgroundColor: alpha(PCF_PRIMARY, 0.15),
              color: PCF_PRIMARY,
              fontFamily: 'monospace'
            }}
          />
        )}
      </Box>

      {!pcfData ? (
        /* Upload Zone - No data loaded yet */
        <>
          {/* Drag & Drop Zone */}
          <Card
            sx={{
              border: isDragging ? `2px dashed ${PCF_PRIMARY}` : '2px dashed rgba(255,255,255,0.2)',
              background: isDragging 
                ? alpha(PCF_PRIMARY, 0.08)
                : 'rgba(30, 30, 30, 0.85)',
              backdropFilter: 'blur(12px)',
              transition: 'all 0.3s ease',
              cursor: 'pointer',
              borderRadius: '16px',
              '&:hover': {
                borderColor: alpha(PCF_PRIMARY, 0.6),
                background: isDragging ? alpha(PCF_PRIMARY, 0.08) : alpha(PCF_PRIMARY, 0.05)
              }
            }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <CardContent sx={{ textAlign: 'center', py: 6 }}>
              <CloudUpload 
                sx={{ 
                  fontSize: 64, 
                  color: isDragging ? PCF_PRIMARY : 'rgba(255,255,255,0.4)', 
                  mb: 2 
                }} 
              />
              <Typography variant="h6" sx={{ color: '#fff', mb: 1 }}>
                {isDragging ? 'Drop PCF file here' : 'Drag & Drop PCF JSON File'}
              </Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.6)', mb: 2 }}>
                or click to browse files
              </Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem', mb: 2 }}>
                Supported format: JSON (.json)
              </Typography>
              {/* Supported version chips */}
              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
                {pcfSchemaVersions.map((s) => (
                  <Chip
                    key={s.metadata.version}
                    label={`PCF v${s.metadata.version}`}
                    size="small"
                    sx={{
                      backgroundColor: 'rgba(255,255,255,0.06)',
                      color: 'rgba(255,255,255,0.45)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      fontSize: '0.7rem',
                      fontFamily: 'monospace',
                      pointerEvents: 'none',
                    }}
                  />
                ))}
              </Box>
            </CardContent>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              style={{ display: 'none' }}
              onChange={handleFileSelect}
            />
          </Card>

          {uploadError && (
            <Alert 
              severity="error" 
              sx={{ 
                bgcolor: 'rgba(239, 68, 68, 0.1)', 
                color: '#ef4444',
                borderRadius: '10px'
              }}
            >
              {uploadError}
            </Alert>
          )}

          {/* Cancel Button */}
          <Button
            variant="outlined"
            onClick={onCancel}
            sx={{
              borderColor: 'rgba(255,255,255,0.2)',
              color: 'rgba(255,255,255,0.7)',
              textTransform: 'none',
              borderRadius: '10px',
              '&:hover': {
                borderColor: 'rgba(255,255,255,0.4)',
                backgroundColor: 'rgba(255,255,255,0.05)',
                color: 'rgba(255,255,255,0.7)'
              }
            }}
          >
            {t('common.cancel')}
          </Button>

          {/* OR divider + Form Builder option */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Divider sx={{ flex: 1, borderColor: 'rgba(255,255,255,0.1)' }} />
            <Typography sx={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem' }}>{t('editor.or')}</Typography>
            <Divider sx={{ flex: 1, borderColor: 'rgba(255,255,255,0.1)' }} />
          </Box>

          {/* Form Builder version selector */}
          <Box>
            <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', mb: 1 }}>
              Schema version for form builder:
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {pcfSchemaVersions.map((s) => {
                const isSelected = effectiveFormVersion === s.metadata.version;
                const isLatest = s.metadata.version === pcfSchemaVersions[0]?.metadata.version;
                return (
                  <Chip
                    key={s.metadata.version}
                    label={`PCF v${s.metadata.version}${isLatest ? ' — Latest' : ''}`}
                    size="small"
                    onClick={(e) => { e.stopPropagation(); setSelectedFormVersion(s.metadata.version); }}
                    sx={{
                      cursor: 'pointer',
                      backgroundColor: isSelected ? alpha(PCF_PRIMARY, 0.2) : 'rgba(255,255,255,0.06)',
                      color: isSelected ? PCF_PRIMARY : 'rgba(255,255,255,0.5)',
                      border: `1px solid ${isSelected ? alpha(PCF_PRIMARY, 0.5) : 'rgba(255,255,255,0.12)'}`,
                      fontFamily: 'monospace',
                      fontSize: '0.75rem',
                      fontWeight: isSelected ? 600 : 400,
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        backgroundColor: alpha(PCF_PRIMARY, 0.12),
                        borderColor: alpha(PCF_PRIMARY, 0.4),
                        color: PCF_PRIMARY,
                      },
                    }}
                  />
                );
              })}
            </Box>
          </Box>

          <Button
            variant="contained"
            onClick={() => setShowSubmodelCreator(true)}
            startIcon={<CodeIcon />}
            sx={{
              background: `linear-gradient(135deg, ${PCF_PRIMARY} 0%, ${PCF_SECONDARY} 100%)`,
              color: '#fff',
              textTransform: 'none',
              borderRadius: '10px',
              fontWeight: 600,
              '&:hover': {
                background: `linear-gradient(135deg, ${PCF_SECONDARY} 0%, ${PCF_PRIMARY} 100%)`
              }
            }}
          >
            {t('editor.formBuilder')}
          </Button>
        </>
      ) : (
        /* Data Loaded - Show validation and actions */
        <Card 
          sx={{
            borderWidth: 2,
            borderStyle: 'solid',
            borderColor: validationStatus === 'success'
              ? PCF_PRIMARY
              : validationStatus === 'error'
              ? '#ef4444'
              : 'rgba(255,255,255,0.1)',
            transition: 'border-color 0.3s ease',
            borderRadius: '16px',
            background: 'rgba(30, 30, 30, 0.85)',
            backdropFilter: 'blur(12px)'
          }}
        >
          <CardContent sx={{ p: 3 }}>
            {/* Status Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
              {validationStatus === 'success' ? (
                <CheckCircle sx={{ color: PCF_PRIMARY, fontSize: 32 }} />
              ) : validationStatus === 'error' ? (
                <Warning sx={{ color: '#ef4444', fontSize: 32 }} />
              ) : (
                <CodeIcon sx={{ color: '#f59e0b', fontSize: 32 }} />
              )}
              <Typography variant="h6" sx={{ color: '#fff', flex: 1 }}>
                {validationStatus === 'success' 
                  ? t('editor.validatedTitle') 
                  : validationStatus === 'error' 
                  ? t('editor.validationFailedTitle') 
                  : t('editor.loadedTitle')}
              </Typography>
              {detectedVersion && (
                <Chip
                  label={`PCF v${detectedVersion}`}
                  size="small"
                  sx={{
                    backgroundColor: alpha(PCF_PRIMARY, 0.15),
                    color: PCF_PRIMARY,
                    border: `1px solid ${alpha(PCF_PRIMARY, 0.3)}`,
                    fontFamily: 'monospace',
                    fontWeight: 600,
                    fontSize: '0.75rem',
                  }}
                />
              )}
            </Box>

            <Typography sx={{ color: 'rgba(255,255,255,0.6)', mb: 2 }}>
              {validationStatus === 'success'
                ? t('editor.validatedMsg')
                : validationStatus === 'error'
                ? t('editor.validationFailedMsg')
                : t('editor.pendingMsg')}
            </Typography>

            {/* Messages */}
            {uploadError && (
              <Alert 
                severity="error" 
                sx={{ 
                  bgcolor: 'rgba(239, 68, 68, 0.1)', 
                  color: '#ef4444',
                  borderRadius: '10px',
                  mb: 2
                }}
              >
                {uploadError}
              </Alert>
            )}

            {successMessage && (
              <Alert 
                severity="success" 
                sx={{ 
                  bgcolor: alpha(PCF_PRIMARY, 0.1), 
                  color: PCF_PRIMARY,
                  borderRadius: '10px',
                  mb: 2
                }}
              >
                {successMessage}
              </Alert>
            )}

            {/* Action Buttons */}
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              {/* Validate Button */}
              <Button
                variant="contained"
                onClick={handleValidate}
                disabled={isValidating || validationStatus === 'success'}
                startIcon={isValidating ? <CircularProgress size={20} color="inherit" /> : <CheckCircle />}
                sx={{
                  flex: 1,
                  minWidth: 150,
                  background: validationStatus === 'success' 
                    ? alpha(PCF_PRIMARY, 0.3)
                    : validationStatus === 'error'
                    ? 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)'
                    : `linear-gradient(135deg, ${PCF_PRIMARY} 0%, ${PCF_SECONDARY} 100%)`,
                  color: '#fff',
                  borderRadius: '10px',
                  fontWeight: 600,
                  textTransform: 'none',
                  '&:disabled': {
                    background: alpha(PCF_PRIMARY, 0.3),
                    color: 'rgba(255,255,255,0.5)'
                  }
                }}
              >
                {isValidating 
                  ? t('editor.validating') 
                  : validationStatus === 'success' 
                  ? t('editor.validated') 
                  : t('editor.validate')}
              </Button>

              {/* Clear Button */}
              <Button
                variant="outlined"
                onClick={handleClear}
                sx={{
                  borderColor: 'rgba(255,255,255,0.2)',
                  color: 'rgba(255,255,255,0.6)',
                  borderRadius: '10px',
                  textTransform: 'none',
                  '&:hover': {
                    borderColor: '#ef4444',
                    backgroundColor: alpha('#ef4444', 0.1),
                    color: '#ef4444'
                  }
                }}
              >
                {t('editor.clear')}
              </Button>
            </Box>

            <Divider sx={{ my: 3, borderColor: 'rgba(255,255,255,0.1)' }} />

            {/* Save/Cancel Actions */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                onClick={handleSave}
                disabled={validationStatus !== 'success' || isSaving}
                startIcon={isSaving ? <CircularProgress size={20} color="inherit" /> : <CloudUpload />}
                sx={{
                  flex: 1,
                  py: 1.5,
                  background: `linear-gradient(135deg, ${PCF_PRIMARY} 0%, ${PCF_SECONDARY} 100%)`,
                  borderRadius: '10px',
                  textTransform: 'none',
                  fontWeight: 600,
                  '&:hover': {
                    background: `linear-gradient(135deg, ${PCF_SECONDARY} 0%, ${PCF_PRIMARY} 100%)`
                  },
                  '&:disabled': {
                    background: 'rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.3)'
                  }
                }}
              >
                {isSaving ? t('editor.saving') : mode === 'create' ? t('editor.uploadPcf') : t('editor.saveChanges')}
              </Button>

              <Button
                variant="outlined"
                onClick={onCancel}
                disabled={isSaving}
                sx={{
                  borderColor: 'rgba(255,255,255,0.2)',
                  color: 'rgba(255,255,255,0.7)',
                  textTransform: 'none',
                  borderRadius: '10px',
                  px: 4,
                  '&:hover': {
                    borderColor: 'rgba(255,255,255,0.4)',
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    color: 'rgba(255,255,255,0.7)'
                  }
                }}
              >
                {t('common.cancel')}
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}
      {/* SubmodelCreator dialog — Form-based PCF creation */}
      {formSchema && (
        <SubmodelCreator
          open={showSubmodelCreator}
          onClose={() => setShowSubmodelCreator(false)}
          onBack={() => setShowSubmodelCreator(false)}
          onCreateSubmodel={handleSubmodelCreatorSave}
          selectedSchema={formSchema}
          schemaKey={createSchemaKey(formSchema.metadata.semanticId)}
          manufacturerPartId={manufacturerPartId}
          saveButtonLabel={t('editor.useAsPcfData')}
        />
      )}
    </Box>
  );
};

export default PcfDataEditor;
