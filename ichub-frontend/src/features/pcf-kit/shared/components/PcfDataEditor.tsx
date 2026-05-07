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

import React, { useState, useRef, useCallback } from 'react';
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
import { getSchemaByNamespaceAndVersion } from '@/schemas';
import { createSchemaKey } from '@/schemas/schemaLoader';
import SubmodelCreator from '@/components/submodel-creation/SubmodelCreator';

// PCF Green Theme
const PCF_PRIMARY = '#10b981';
const PCF_SECONDARY = '#059669';

// PCF Schema semantic ID
const PCF_NAMESPACE = 'io.catenax.pcf';
const PCF_VERSION = '9.0.0';
const PCF_SEMANTIC_ID = `urn:samm:${PCF_NAMESPACE}:${PCF_VERSION}#Pcf`;

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

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get PCF schema
  const pcfSchema = getSchemaByNamespaceAndVersion(PCF_NAMESPACE, PCF_VERSION);

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
      setUploadError('Invalid file type. Please upload a JSON file.');
      return;
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File is too large. Maximum size is 10MB.');
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
          setUploadError('Invalid PCF format. Expected a JSON object.');
          return;
        }

        // Set the PCF data without validating yet
        setPcfData(jsonData);
        setValidationStatus('idle');
        setUploadError(null);
        setSuccessMessage('PCF data loaded successfully. Please validate before saving.');
        
        // Clear success message after 4 seconds
        setTimeout(() => {
          setSuccessMessage(null);
        }, 4000);
      } catch {
        setUploadError('Failed to parse JSON file. Please check the file format.');
      }
    };

    reader.onerror = () => {
      setUploadError('Failed to read file. Please try again.');
    };

    reader.readAsText(file);
  };

  // Validate PCF data against schema
  const handleValidate = () => {
    if (!pcfData) return;
    
    setIsValidating(true);
    setUploadError(null);
    
    try {
      if (pcfSchema?.validate) {
        const validation = pcfSchema.validate(pcfData);
        if (!validation.isValid) {
          const errorMessages = validation.errors.join('; ');
          const errorCount = validation.errors.length;
          setUploadError(`Validation failed with ${errorCount} error${errorCount > 1 ? 's' : ''}: ${errorMessages}`);
          setValidationStatus('error');
        } else {
          setValidationStatus('success');
          setUploadError(null);
          setSuccessMessage('PCF data validated successfully!');
          setTimeout(() => {
            setSuccessMessage(null);
          }, 4000);
        }
      } else {
        // No schema validation available - accept as is
        setValidationStatus('success');
        setSuccessMessage('PCF data accepted (no schema validation available).');
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
  };

  // Handle SubmodelCreator form save — load the JSON into the editor pre-validated
  const handleSubmodelCreatorSave = async (submodelData: Record<string, unknown>) => {
    setPcfData(submodelData);
    setValidationStatus('success');
    setSuccessMessage('PCF data created with Form Builder and ready to save.');
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
              <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem', mb: 1 }}>
                Supported format: JSON (.json)
              </Typography>
              <Typography 
                sx={{ 
                  color: 'rgba(255,255,255,0.3)', 
                  fontSize: '0.75rem', 
                  fontFamily: 'monospace' 
                }}
              >
                Semantic ID: {PCF_SEMANTIC_ID}
              </Typography>
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
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              {validationStatus === 'success' ? (
                <CheckCircle sx={{ color: PCF_PRIMARY, fontSize: 32 }} />
              ) : validationStatus === 'error' ? (
                <Warning sx={{ color: '#ef4444', fontSize: 32 }} />
              ) : (
                <CodeIcon sx={{ color: '#f59e0b', fontSize: 32 }} />
              )}
              <Typography variant="h6" sx={{ color: '#fff' }}>
                {validationStatus === 'success' 
                  ? t('editor.validatedTitle') 
                  : validationStatus === 'error' 
                  ? t('editor.validationFailedTitle') 
                  : t('editor.loadedTitle')}
              </Typography>
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
      {pcfSchema && (
        <SubmodelCreator
          open={showSubmodelCreator}
          onClose={() => setShowSubmodelCreator(false)}
          onBack={() => setShowSubmodelCreator(false)}
          onCreateSubmodel={handleSubmodelCreatorSave}
          selectedSchema={pcfSchema}
          schemaKey={createSchemaKey(pcfSchema.metadata.semanticId)}
          manufacturerPartId={manufacturerPartId}
          saveButtonLabel="Use as PCF Data"
        />
      )}
    </Box>
  );
};

export default PcfDataEditor;
