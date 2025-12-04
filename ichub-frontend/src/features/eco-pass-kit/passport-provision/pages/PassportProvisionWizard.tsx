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

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Stepper,
  Step,
  StepLabel,
  Button,
  Typography,
  Card,
  CardContent,
  TextField,
  Autocomplete,
  Alert,
  Chip,
  CircularProgress,
  Paper,
  Divider,
  Grid2,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
} from '@mui/material';
import {
  CheckCircle,
  Warning,
  ArrowBack,
  ArrowForward,
  Save,
  Link as LinkIcon,
  Add,
  CloudUpload,
  Edit,
  Close,
  Visibility,
} from '@mui/icons-material';
import { DPP_VERSION_REGISTRY } from '../config/dppVersionRegistry';
import { createTwinAspect } from '@/features/industry-core-kit/catalog-management/api';
import SubmodelCreator from '@/components/submodel-creation/SubmodelCreator';
import { darkCardStyles } from '../styles/cardStyles';
import { GenericPassportVisualization } from '../../passport-consumption/passport-types/generic/GenericPassportVisualization';
import { fetchAllSerializedPartTwins, fetchAllSerializedParts, createSerializedPartTwin } from '@/features/industry-core-kit/serialized-parts/api';
import { SerializedPart } from '@/features/industry-core-kit/serialized-parts/types';
import { SerializedPartTwinRead } from '@/features/industry-core-kit/serialized-parts/types/twin-types';
import { StatusVariants } from '@/features/industry-core-kit/catalog-management/types/types';
import AddSerializedPartDialog from '@/features/industry-core-kit/serialized-parts/components/AddSerializedPartDialog';

const steps = ['Select Version', 'Twin Association', 'DPP Data', 'Review & Create'];

const PassportProvisionWizard: React.FC = () => {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Step 1: Version Selection
  const [selectedVersion, setSelectedVersion] = useState(DPP_VERSION_REGISTRY[0]);

  // Step 2: Twin Association
  const [serializedParts, setSerializedParts] = useState<SerializedPart[]>([]);
  const [selectedPart, setSelectedPart] = useState<SerializedPart | null>(null);
  const [partsLoading, setPartsLoading] = useState(false);
  const [showAddPartDialog, setShowAddPartDialog] = useState(false);
  const [partRegistrationStatus, setPartRegistrationStatus] = useState<StatusVariants | null>(null);
  const [checkingRegistration, setCheckingRegistration] = useState(false);
  const [registering, setRegistering] = useState(false);

  // Step 3: DPP Data (via SubmodelCreator)
  const [showSubmodelCreator, setShowSubmodelCreator] = useState(false);
  const [dppData, setDppData] = useState<any>(null);
  const [dppValidated, setDppValidated] = useState(false);
  const [validationStatus, setValidationStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Step 4: Review
  const [status] = useState<'draft' | 'active'>('draft');
  const [showPreview, setShowPreview] = useState(false);
  const [publishingDialog, setPublishingDialog] = useState(false);
  const [publishingResult, setPublishingResult] = useState<{ success: boolean; submodelId?: string; error?: string } | null>(null);

  const handleNext = async () => {
    setError(null);

    if (activeStep === 0) {
      // Version selected, move to twin association and load parts
      await loadSerializedParts();
      setActiveStep(1);
    } else if (activeStep === 1) {
      // Twin association step
      if (!selectedPart) {
        setError('Please select a serialized part to associate with this DPP');
        return;
      }
      // Check if part is registered
      if (partRegistrationStatus !== StatusVariants.registered && partRegistrationStatus !== StatusVariants.shared) {
        setError('The selected serialized part must be registered before creating a DPP. Please register it first.');
        return;
      }
      setActiveStep(2);
    } else if (activeStep === 2) {
      // DPP Data step - require validated data before advancing
      if (!dppData) {
        setError('Please provide DPP data before proceeding. You can create it using the form or upload a JSON file.');
        return;
      }
      if (!dppValidated) {
        setError('Please validate the DPP data before proceeding.');
        return;
      }
      setActiveStep(3);
    } else if (activeStep === 3) {
      // Final step - create DPP
      await handleCreate();
    }
  };

  const handleBack = () => {
    setError(null);
    if (activeStep === 2 && showSubmodelCreator) {
      setShowSubmodelCreator(false);
    } else {
      setActiveStep((prev) => prev - 1);
    }
  };

  const loadSerializedParts = async () => {
    setPartsLoading(true);
    try {
      // Fetch both created parts and registered twins in parallel
      const [allParts, allTwins] = await Promise.all([
        fetchAllSerializedParts(),
        fetchAllSerializedPartTwins()
      ]);

      // Create a map of twins for quick lookup
      const twinsMap = new Map(
        allTwins.map(twin => 
          [`${twin.manufacturerPartId}-${twin.partInstanceId}`, twin]
        )
      );

      // Merge parts with their twin data (if they're registered)
      const mergedParts = allParts.map(part => {
        const twin = twinsMap.get(`${part.manufacturerPartId}-${part.partInstanceId}`);
        // If twin exists, enrich the part with twin data
        if (twin) {
          return {
            ...part,
            ...twin, // This adds globalId, dtrAasId, etc. if they exist
            _registrationStatus: twin.dtrAasId && twin.globalId ? 'shared' : 'registered'
          };
        }
        return {
          ...part,
          _registrationStatus: 'draft'
        };
      });

      // Also include twins that might not be in the parts list
      const partKeys = new Set(
        allParts.map(p => `${p.manufacturerPartId}-${p.partInstanceId}`)
      );
      
      const orphanedTwins = allTwins.filter(
        twin => !partKeys.has(`${twin.manufacturerPartId}-${twin.partInstanceId}`)
      );

      // Combine both lists
      const finalParts = [...mergedParts, ...orphanedTwins];

      setSerializedParts(finalParts);
      return finalParts;
    } catch (err) {
      setError('Failed to load serialized parts');
      return [];
    } finally {
      setPartsLoading(false);
    }
  };

  const checkPartRegistrationStatus = async (part: SerializedPart) => {
    setCheckingRegistration(true);
    setPartRegistrationStatus(null);
    try {
      // Check if the part already has the registration status from loadSerializedParts
      if ((part as any)._registrationStatus) {
        const status = (part as any)._registrationStatus;
        setPartRegistrationStatus(
          status === 'shared' ? StatusVariants.shared : 
          status === 'registered' ? StatusVariants.registered : 
          StatusVariants.draft
        );
      } else {
        // Fallback to checking twins if status not available
        const twins = await fetchAllSerializedPartTwins();
        const twin = twins.find(
          (t: SerializedPartTwinRead) =>
            t.manufacturerPartId === part.manufacturerPartId &&
            t.partInstanceId === part.partInstanceId
        );

        if (!twin) {
          setPartRegistrationStatus(StatusVariants.draft);
        } else if (twin.dtrAasId && twin.globalId) {
          setPartRegistrationStatus(StatusVariants.shared);
        } else {
          setPartRegistrationStatus(StatusVariants.registered);
        }
      }
    } catch (err) {
      console.error('Failed to check registration status:', err);
      setPartRegistrationStatus(StatusVariants.draft);
    } finally {
      setCheckingRegistration(false);
    }
  };

  const handleRegisterPart = async () => {
    if (!selectedPart) return;

    setRegistering(true);
    setError(null);

    try {
      await createSerializedPartTwin({
        manufacturerId: selectedPart.manufacturerId,
        manufacturerPartId: selectedPart.manufacturerPartId,
        partInstanceId: selectedPart.partInstanceId,
      });

      // Show success message immediately after registration
      setSuccessMessage('Twin registered successfully!');
      setTimeout(() => setSuccessMessage(null), 4000);

      // Reload the serialized parts list to get the updated twin data with globalId and dtrAasId
      const refreshedParts = await loadSerializedParts();
      
      // Find the registered part from the refreshed list to get complete twin data
      const partWithTwinData = refreshedParts.find(
        (p: SerializedPart) =>
          p.manufacturerPartId === selectedPart.manufacturerPartId &&
          p.partInstanceId === selectedPart.partInstanceId
      );
      
      // Update the selected part with complete twin data
      if (partWithTwinData) {
        setSelectedPart(partWithTwinData);
      }

      // Re-check registration status after successful registration (don't fail if this errors)
      try {
        await checkPartRegistrationStatus(partWithTwinData || selectedPart);
      } catch (statusErr) {
        console.warn('Failed to check registration status after registration:', statusErr);
        // Set status to registered manually since we know the registration succeeded
        setPartRegistrationStatus(StatusVariants.registered);
      }
    } catch (err: any) {
      console.error('Failed to register serialized part:', err);
      const errorMessage = err?.response?.data?.message || err?.response?.data?.error || err?.message || 'Failed to register serialized part. Please try again.';
      setError(errorMessage);
    } finally {
      setRegistering(false);
    }
  };

  const handlePartCreated = async (createdPart?: SerializedPart) => {
    setShowAddPartDialog(false);
    
    if (createdPart) {
      // Reload the serialized parts list to get the complete twin data including globalId and dtrAasId
      const refreshedParts = await loadSerializedParts();
      
      // Find the newly created part from the refreshed list to get complete twin data
      const partWithTwinData = refreshedParts.find(
        (p: SerializedPart) =>
          p.manufacturerPartId === createdPart.manufacturerPartId &&
          p.partInstanceId === createdPart.partInstanceId
      );
      
      // Select the part with complete twin data from the list
      const partToSelect = partWithTwinData || createdPart;
      setSelectedPart(partToSelect);
      setError(null);
      
      // Check registration status of the new part
      await checkPartRegistrationStatus(partToSelect);
      
      // Show success message
      setSuccessMessage('Serialized part created successfully');
      setTimeout(() => setSuccessMessage(null), 4000);
    } else {
      await loadSerializedParts();
    }
  };

  const handleSubmodelCreated = async (submodelData: any) => {
    setDppData(submodelData);
    setDppValidated(true); // Form-created/saved data is already validated
    setValidationStatus('success'); // Mark as successfully validated
    setUploadError(null); // Clear any previous errors
    setShowSubmodelCreator(false);
    // Stay on step 2 to allow further edits
  };

  const handleCreate = async () => {
    setPublishingDialog(true);
    setPublishingResult(null);
    setError(null);

    try {
      // Get the global asset ID from the selected part
      const globalAssetId = (selectedPart as any)?.globalId;
      
      if (!globalAssetId) {
        throw new Error('Global Asset ID not available for the selected part');
      }

      // Extract semantic ID from raw schema
      const semanticId = (selectedVersion.rawSchema as any)['x-samm-aspect-model-urn'] || selectedVersion.semanticId;

      // Call the twin-aspect API with the required parameters
      const result = await createTwinAspect(
        globalAssetId,
        semanticId,
        dppData
      );

      if (!result.success) {
        setPublishingResult({
          success: false,
          error: result.message || 'Failed to create Digital Product Passport'
        });
        return;
      }

      // Show success with submodel ID
      setPublishingResult({
        success: true,
        submodelId: result.submodelId
      });
    } catch (err) {
      setPublishingResult({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to create Digital Product Passport'
      });
    }
  };

  const handleClosePublishingDialog = () => {
    setPublishingDialog(false);
    if (publishingResult?.success) {
      // Navigate back to the list after successful creation
      setTimeout(() => {
        navigate('/passport/provision');
      }, 500);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const processFile = (file: File) => {
    setUploadError(null);

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
          setUploadError('Invalid DPP format. Expected a JSON object.');
          return;
        }

        // Set the DPP data without validating
        setDppData(jsonData);
        setDppValidated(false);
        setValidationStatus('idle');
        setUploadError(null);
        setSuccessMessage('DPP file loaded successfully! Click "Validate" to verify against schema.');
        
        // Clear success message after 4 seconds
        setTimeout(() => {
          setSuccessMessage(null);
        }, 4000);
      } catch (err) {
        setUploadError('Failed to parse JSON file. Please check the file format.');
      }
    };

    reader.onerror = () => {
      setUploadError('Failed to read file. Please try again.');
    };

    reader.readAsText(file);
  };

  const handleValidateDpp = () => {
    if (!dppData) return;
    
    setValidating(true);
    setUploadError(null);
    
    try {
      if (selectedVersion.schema) {
        const validation = selectedVersion.schema.validate(dppData);
        if (!validation.isValid) {
          const errorMessages = validation.errors.join('; ');
          const errorCount = validation.errors.length;
          setUploadError(`Validation failed with ${errorCount} error${errorCount > 1 ? 's' : ''}: ${errorMessages}`);
          setDppValidated(false);
          setValidationStatus('error');
        } else {
          setDppValidated(true);
          setValidationStatus('success');
          setUploadError(null);
          setSuccessMessage('DPP validated successfully!');
          setTimeout(() => {
            setSuccessMessage(null);
          }, 4000);
        }
      } else {
        setDppValidated(true);
        setValidationStatus('success');
        setSuccessMessage('No schema available. DPP accepted.');
      }
    } catch (err: any) {
      setUploadError(`Validation error: ${err?.message || 'Unknown error occurred'}`);
      setDppValidated(false);
      setValidationStatus('error');
    } finally {
      setValidating(false);
    }
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" sx={{ color: '#fff', mb: 3 }}>
              Select DPP Version
            </Typography>
            <Grid2 container spacing={2}>
              {DPP_VERSION_REGISTRY.map((version) => (
                <Grid2 size={{ xs: 12, md: 6 }} key={version.semanticId}>
                  <Card
                    sx={{
                      ...darkCardStyles.card,
                      cursor: 'pointer',
                      borderColor:
                        selectedVersion.semanticId === version.semanticId
                          ? version.color
                          : 'rgba(255, 255, 255, 0.12)',
                      borderWidth: selectedVersion.semanticId === version.semanticId ? 2 : 1,
                      '&:hover': {
                        borderColor: version.color,
                        transform: 'translateY(-2px)',
                        transition: 'all 0.2s ease-in-out',
                      },
                    }}
                    onClick={() => setSelectedVersion(version)}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 48,
                            height: 48,
                            borderRadius: '12px',
                            bgcolor: `${version.color}20`,
                            color: version.color,
                          }}
                        >
                          {version.icon}
                        </Box>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="h6" sx={{ color: '#fff' }}>
                            {version.name}
                          </Typography>
                          <Chip
                            label={`v${version.version}`}
                            size="small"
                            sx={{
                              bgcolor: `${version.color}20`,
                              color: version.color,
                              fontSize: '0.75rem',
                            }}
                          />
                        </Box>
                        {selectedVersion.semanticId === version.semanticId && (
                          <CheckCircle sx={{ color: version.color }} />
                        )}
                      </Box>
                      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', mb: 2 }}>
                        {version.description}
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {version.features.slice(0, 3).map((feature, idx) => (
                          <Chip
                            key={idx}
                            label={feature}
                            size="small"
                            sx={{
                              bgcolor: 'rgba(255,255,255,0.05)',
                              color: 'rgba(255,255,255,0.6)',
                              fontSize: '0.7rem',
                            }}
                          />
                        ))}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid2>
              ))}
            </Grid2>
          </Box>
        );

      case 1:
        return (
          <Box>
            <Typography variant="h6" sx={{ color: '#fff', mb: 3 }}>
              Associate with Serialized Part
            </Typography>

            <Box sx={{ mb: 3 }}>
              <Alert
                severity="info"
                sx={{
                  bgcolor: 'rgba(59, 130, 246, 0.1)',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  color: '#60a5fa',
                }}
              >
                Select an existing serialized part, or create a new one to link with this Digital Product Passport
              </Alert>
            </Box>

            {partsLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : serializedParts.length === 0 ? (
              <Card sx={darkCardStyles.card}>
                <CardContent sx={{ textAlign: 'center', py: 6 }}>
                  <Warning sx={{ fontSize: 64, color: '#f59e0b', mb: 2 }} />
                  <Typography variant="h6" sx={{ color: '#fff', mb: 1 }}>
                    No Serialized Parts Available
                  </Typography>
                  <Typography sx={{ color: 'rgba(255,255,255,0.6)', mb: 3 }}>
                    You need to create a serialized part before you can provision a DPP
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => setShowAddPartDialog(true)}
                    sx={darkCardStyles.button.primary}
                  >
                    Create Serialized Part
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card sx={darkCardStyles.card}>
                <CardContent>
                  <Autocomplete
                    fullWidth
                    options={serializedParts}
                    getOptionLabel={(option) =>
                      `${option.manufacturerPartId} - ${option.partInstanceId} (${option.name})`
                    }
                    value={selectedPart}
                    onChange={(_, value) => {
                      setSelectedPart(value);
                      setError(null);
                      if (value) {
                        checkPartRegistrationStatus(value);
                      } else {
                        setPartRegistrationStatus(null);
                      }
                    }}
                    slotProps={{
                      paper: {
                        sx: {
                          bgcolor: '#1e1e1e',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          '& .MuiAutocomplete-listbox': {
                            bgcolor: '#1e1e1e',
                            '& .MuiAutocomplete-option': {
                              '&:hover': {
                                bgcolor: 'rgba(255, 255, 255, 0.08)',
                              },
                              '&[aria-selected="true"]': {
                                bgcolor: 'rgba(255, 255, 255, 0.12)',
                              },
                            },
                          },
                        },
                      },
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Select Serialized Part"
                        placeholder="Choose a serialized part..."
                        sx={{
                          ...darkCardStyles.textField,
                          '& .MuiInputLabel-root': {
                            color: 'rgba(255, 255, 255, 0.7)',
                          },
                          '& .MuiInputLabel-root.Mui-focused': {
                            color: '#fff',
                          },
                        }}
                      />
                    )}
                    renderOption={(props, option) => (
                      <Box component="li" {...props} key={`twin-${option.id}`}>
                        <Box sx={{ width: '100%' }}>
                          <Typography variant="body2" sx={{ color: '#fff', fontWeight: 600 }}>
                            {option.name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                            Manufacturer Part ID: {option.manufacturerPartId} • Part Instance ID: {option.partInstanceId}
                          </Typography>
                          {option.van && (
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', display: 'block' }}>
                              VAN: {option.van}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    )}
                  />

                  {selectedPart && (
                    <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 1 }}>
                      <Typography variant="body2" sx={{ color: '#fff', mb: 1 }}>
                        Selected Part:
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                        <Chip
                          icon={<LinkIcon />}
                          label={`Name: ${selectedPart.name}`}
                          size="small"
                          sx={darkCardStyles.chip.active}
                        />
                        <Chip
                          label={`Manufacturer Part ID: ${selectedPart.manufacturerPartId}`}
                          size="small"
                          sx={darkCardStyles.chip.default}
                        />
                        <Chip
                          label={`Part Instance ID: ${selectedPart.partInstanceId}`}
                          size="small"
                          sx={darkCardStyles.chip.default}
                        />
                        {selectedPart.van && (
                          <Chip
                            label={`VAN: ${selectedPart.van}`}
                            size="small"
                            sx={darkCardStyles.chip.default}
                          />
                        )}
                        {(selectedPart as any)?.globalId && (
                          <Chip
                            label={`Global Asset ID: ${(selectedPart as any).globalId}`}
                            size="small"
                            sx={darkCardStyles.chip.active}
                          />
                        )}
                        {(selectedPart as any)?.dtrAasId && (
                          <Chip
                            label={`AAS ID: ${(selectedPart as any).dtrAasId}`}
                            size="small"
                            sx={darkCardStyles.chip.active}
                          />
                        )}
                      </Box>
                      
                      {checkingRegistration ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CircularProgress size={16} />
                          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                            Checking registration status...
                          </Typography>
                        </Box>
                      ) : partRegistrationStatus ? (
                        <Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                              Registration Status:
                            </Typography>
                            <Chip
                              label={partRegistrationStatus}
                              size="small"
                              sx={{
                                ...(
                                  partRegistrationStatus === StatusVariants.registered || partRegistrationStatus === StatusVariants.shared
                                    ? darkCardStyles.chip.active
                                    : partRegistrationStatus === StatusVariants.draft
                                    ? darkCardStyles.chip.draft
                                    : darkCardStyles.chip.default
                                )
                              }}
                            />
                          </Box>
                          {(partRegistrationStatus === StatusVariants.draft || partRegistrationStatus === StatusVariants.pending) && (
                            <Alert
                              severity="warning"
                              sx={{
                                bgcolor: 'rgba(245, 158, 11, 0.1)',
                                border: '1px solid rgba(245, 158, 11, 0.3)',
                                color: '#fbbf24',
                                mb: 2
                              }}
                            >
                              This serialized part must be registered as a digital twin before you can provision a DPP.
                            </Alert>
                          )}
                          {(partRegistrationStatus === StatusVariants.draft || partRegistrationStatus === StatusVariants.pending) && (
                            <Button
                              fullWidth
                              variant="contained"
                              startIcon={registering ? <CircularProgress size={20} color="inherit" /> : <CloudUpload />}
                              onClick={handleRegisterPart}
                              disabled={registering}
                              sx={{
                                ...darkCardStyles.button.primary,
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                '&:hover': {
                                  background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)'
                                }
                              }}
                            >
                              {registering ? 'Registering...' : 'Register Serialized Part'}
                            </Button>
                          )}
                        </Box>
                      ) : null}
                    </Box>
                  )}

                  {!selectedPart && (
                    <>
                      <Divider sx={{ my: 3, borderColor: 'rgba(255,255,255,0.1)' }} />

                      <Button
                        fullWidth
                        variant="outlined"
                        startIcon={<Add />}
                        onClick={() => setShowAddPartDialog(true)}
                        sx={{
                          ...darkCardStyles.button.outlined,
                          '&:hover': {
                            ...darkCardStyles.button.outlined['&:hover'],
                            color: '#fff',
                          }
                        }}
                      >
                        Create New Serialized Part
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            )}
          </Box>
        );

      case 2:
        return (
          <Box>
            <Typography variant="h6" sx={{ color: '#fff', mb: 3 }}>
              DPP Data Entry
            </Typography>

            {!dppData ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {/* Drag & Drop Zone */}
                <Card
                  sx={{
                    ...darkCardStyles.card,
                    border: isDragging ? '2px dashed #3b82f6' : '2px dashed rgba(255,255,255,0.2)',
                    background: isDragging 
                      ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(37, 99, 235, 0.15) 100%)'
                      : darkCardStyles.card.background,
                    transition: 'all 0.3s ease',
                    cursor: 'pointer',
                  }}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <CardContent sx={{ textAlign: 'center', py: 6 }}>
                    <CloudUpload sx={{ fontSize: 64, color: isDragging ? '#3b82f6' : 'rgba(255,255,255,0.5)', mb: 2 }} />
                    <Typography variant="h6" sx={{ color: '#fff', mb: 1 }}>
                      {isDragging ? 'Drop DPP file here' : 'Drag & Drop DPP File'}
                    </Typography>
                    <Typography sx={{ color: 'rgba(255,255,255,0.6)', mb: 2 }}>
                      or click to browse for a JSON file
                    </Typography>
                    <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem', mb: 1 }}>
                      Supported format: JSON
                    </Typography>
                    <Typography sx={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                      Semantic ID: {selectedVersion.semanticId}
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
                  <Alert severity="error" sx={{ bgcolor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                    {uploadError}
                  </Alert>
                )}

                {/* Divider with OR */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Divider sx={{ flex: 1, bgcolor: 'rgba(255,255,255,0.1)' }} />
                  <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>OR</Typography>
                  <Divider sx={{ flex: 1, bgcolor: 'rgba(255,255,255,0.1)' }} />
                </Box>

                {/* Create DPP Button */}
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<Add />}
                  onClick={() => setShowSubmodelCreator(true)}
                  sx={{
                    ...darkCardStyles.button.primary,
                    py: 2,
                    fontSize: '1rem',
                  }}
                >
                  Create DPP from Form
                </Button>
              </Box>
            ) : (
              <Card sx={{
                ...darkCardStyles.card,
                borderWidth: 2,
                borderStyle: 'solid',
                borderColor: validationStatus === 'success'
                  ? '#22c55e'
                  : validationStatus === 'error'
                  ? '#ef4444'
                  : 'rgba(255,255,255,0.1)',
                transition: 'border-color 0.3s ease',
              }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <CheckCircle sx={{ 
                      color: validationStatus === 'success' ? '#22c55e' 
                        : validationStatus === 'error' ? '#ef4444' 
                        : '#f59e0b',
                      fontSize: '2rem'
                    }} />
                    <Typography variant="h6" sx={{ color: '#fff' }}>
                      {validationStatus === 'success' ? 'DPP Data Validated' 
                        : validationStatus === 'error' ? 'Validation Failed' 
                        : 'DPP Data Loaded'}
                    </Typography>
                  </Box>
                  <Typography sx={{ color: 'rgba(255,255,255,0.6)', mb: 2 }}>
                    {validationStatus === 'success'
                      ? 'All required data has been validated. Review in the next step.'
                      : validationStatus === 'error'
                      ? `Validation Failed. Your DPP JSON file semantic is not matching all the mandatory fields from the "${selectedVersion.semanticId}" semantic model. Please edit the DPP data to fix validation errors.`
                      : 'Data uploaded successfully. Please validate before proceeding.'}
                  </Typography>
                  {uploadError && validationStatus === 'error' && (
                    <Alert severity="error" sx={{ bgcolor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', mb: 2 }}>
                      {uploadError}
                    </Alert>
                  )}
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Button
                      variant="contained"
                      onClick={handleValidateDpp}
                      disabled={validating}
                      sx={{
                        flex: 1,
                        background: validationStatus === 'success' 
                          ? 'linear-gradient(135deg, #16a34a 0%, #22c55e 100%)'
                          : validationStatus === 'error'
                          ? 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)'
                          : darkCardStyles.button.primary.background,
                        color: '#fff',
                        borderRadius: darkCardStyles.button.primary.borderRadius,
                        fontWeight: 600,
                        textTransform: 'none',
                        boxShadow: validationStatus === 'success'
                          ? '0 4px 16px rgba(34, 197, 94, 0.3)'
                          : validationStatus === 'error'
                          ? '0 4px 16px rgba(239, 68, 68, 0.3)'
                          : darkCardStyles.button.primary.boxShadow,
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          background: validationStatus === 'success'
                            ? 'linear-gradient(135deg, #15803d 0%, #16a34a 100%)'
                            : validationStatus === 'error'
                            ? 'linear-gradient(135deg, #b91c1c 0%, #dc2626 100%)'
                            : darkCardStyles.button.primary['&:hover']?.background,
                          boxShadow: validationStatus === 'success'
                            ? '0 6px 24px rgba(34, 197, 94, 0.4)'
                            : validationStatus === 'error'
                            ? '0 6px 24px rgba(239, 68, 68, 0.4)'
                            : darkCardStyles.button.primary['&:hover']?.boxShadow,
                          transform: 'translateY(-1px)',
                        },
                        '&:disabled': darkCardStyles.button.primary['&:disabled'],
                      }}
                    >
                      {validating ? (
                        <CircularProgress size={24} />
                      ) : validationStatus === 'success' ? (
                        'Validated ✓'
                      ) : validationStatus === 'error' ? (
                        'Validation Failed ✗'
                      ) : (
                        'Validate DPP'
                      )}
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<Edit />}
                      onClick={() => setShowSubmodelCreator(true)}
                      sx={{
                        ...darkCardStyles.button.outlined,
                        flex: 1,
                        '&:hover': {
                          ...darkCardStyles.button.outlined['&:hover'],
                          color: '#fff',
                        },
                      }}
                    >
                      Edit DPP Data
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<Close />}
                      onClick={() => {
                        setDppData(null);
                        setDppValidated(false);
                        setValidationStatus('idle');
                        setUploadError(null);
                      }}
                      sx={{
                        ...darkCardStyles.button.outlined,
                        borderColor: 'rgba(239, 68, 68, 0.3)',
                        color: '#ef4444',
                        '&:hover': {
                          borderColor: '#ef4444',
                          backgroundColor: 'rgba(239, 68, 68, 0.1)',
                          color: '#ef4444',
                        },
                      }}
                    >
                      Remove
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            )}
          </Box>
        );

      case 3:
        return (
          <Box>
            <Typography variant="h6" sx={{ color: '#fff', mb: 3 }}>
              Review & Create
            </Typography>

            <Card sx={darkCardStyles.card}>
              <CardContent>
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" sx={{ color: 'rgba(255,255,255,0.6)', mb: 1 }}>
                    DPP Version
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 40,
                        height: 40,
                        borderRadius: '8px',
                        bgcolor: `${selectedVersion.color}20`,
                        color: selectedVersion.color,
                      }}
                    >
                      {selectedVersion.icon}
                    </Box>
                    <Box>
                      <Typography sx={{ color: '#fff' }}>{selectedVersion.name}</Typography>
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                        v{selectedVersion.version}
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.1)' }} />

                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" sx={{ color: 'rgba(255,255,255,0.6)', mb: 1 }}>
                    Serialized Part Association
                  </Typography>
                  {selectedPart ? (
                    <Box>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                        <Chip
                          label={selectedPart.name}
                          size="small"
                          sx={darkCardStyles.chip.active}
                        />
                        <Chip
                          label={`Part ID: ${selectedPart.manufacturerPartId}`}
                          size="small"
                          sx={darkCardStyles.chip.default}
                        />
                        <Chip
                          label={`Serial: ${selectedPart.partInstanceId}`}
                          size="small"
                          sx={darkCardStyles.chip.default}
                        />
                      </Box>
                      {selectedPart.van && (
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                          VAN: {selectedPart.van}
                        </Typography>
                      )}
                    </Box>
                  ) : (
                    <Chip label="No part selected" size="small" sx={darkCardStyles.chip.draft} />
                  )}
                </Box>

                <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.1)' }} />

                {/* Digital Twin Information */}
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" sx={{ color: 'rgba(255,255,255,0.6)', mb: 1 }}>
                    Digital Twin Information
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {selectedPart && selectedPart.manufacturerPartId && selectedPart.partInstanceId ? (
                      <Chip
                        label={`Discovery ID: CX:${selectedPart.manufacturerPartId}:${selectedPart.partInstanceId}`}
                        size="small"
                        sx={darkCardStyles.chip.active}
                      />
                    ) : (
                      <Chip
                        label="Discovery ID: Not available"
                        size="small"
                        sx={darkCardStyles.chip.draft}
                      />
                    )}
                    {(selectedPart as any)?.globalId ? (
                      <Chip
                        label={`Global Asset ID: ${(selectedPart as any).globalId}`}
                        size="small"
                        sx={darkCardStyles.chip.active}
                      />
                    ) : (
                      <Chip
                        label="Global Asset ID: Not available"
                        size="small"
                        sx={darkCardStyles.chip.draft}
                      />
                    )}
                    {(selectedPart as any)?.dtrAasId ? (
                      <Chip
                        label={`AAS ID: ${(selectedPart as any).dtrAasId}`}
                        size="small"
                        sx={darkCardStyles.chip.active}
                      />
                    ) : (
                      <Chip
                        label="AAS ID: Not available"
                        size="small"
                        sx={darkCardStyles.chip.draft}
                      />
                    )}
                  </Box>
                </Box>

                <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.1)' }} />

                <Box>
                  <Typography variant="subtitle2" sx={{ color: 'rgba(255,255,255,0.6)', mb: 1 }}>
                    Status
                  </Typography>
                  <Chip
                    label={status.toUpperCase()}
                    size="small"
                    sx={status === 'draft' ? darkCardStyles.chip.draft : darkCardStyles.chip.active}
                  />
                </Box>

                <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.1)' }} />

                {/* Preview Passport Button */}
                {dppData && (
                  <Box sx={{ mt: 2 }}>
                    <Button
                      variant="contained"
                      fullWidth
                      startIcon={<Visibility />}
                      onClick={() => setShowPreview(true)}
                      sx={{
                        py: 2,
                        fontSize: '1rem',
                        fontWeight: 600,
                        textTransform: 'none',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: '#fff',
                        borderRadius: 2,
                        boxShadow: '0 4px 20px rgba(102, 126, 234, 0.4)',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #5568d3 0%, #65408b 100%)',
                          boxShadow: '0 6px 28px rgba(102, 126, 234, 0.5)',
                          transform: 'translateY(-2px)',
                        },
                        '&:active': {
                          transform: 'translateY(0px)',
                        },
                      }}
                    >
                      Preview Passport
                    </Button>
                  </Box>
                )}
              </CardContent>
            </Card>

            <Alert
              severity="success"
              sx={{
                mt: 3,
                bgcolor: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                color: '#10b981',
              }}
            >
              Ready to create your Digital Product Passport
            </Alert>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Box
      sx={{
        height: '100%',
        overflow: 'auto',
        p: 3,
      }}
    >
      <Container maxWidth="lg" sx={{ pb: 3 }}>
        {/* Header */}
        <Box sx={{ mb: 3 }}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate('/passport/provision')}
            sx={{
              color: '#fff',
              mb: 1.5,
              '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
            }}
          >
            Back to List
          </Button>
          <Typography variant="h5" sx={{ color: '#fff', fontWeight: 600 }}>
            Create Digital Product Passport
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', mt: 0.5 }}>
            Follow the steps to create and provision a new DPP
          </Typography>
        </Box>

        {/* Stepper */}
        <Paper
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: 90,
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(139, 92, 246, 0.2)',
            borderRadius: 2,
            p: 2.5,
            mb: 2.5,
            boxShadow: '0 8px 32px rgba(139, 92, 246, 0.15)',
            bgcolor: 'rgba(10, 10, 15, 0.95)',
          }}
        >
          <Stepper activeStep={activeStep} alternativeLabel>
            {steps.map((label, index) => (
              <Step key={label}>
                <StepLabel
                  sx={{
                    '& .MuiStepLabel-label': {
                      color: 'rgba(255,255,255,0.5)',
                      fontWeight: 500,
                      fontSize: '0.95rem',
                      '&.Mui-active': { 
                        color: '#fff',
                        fontWeight: 600,
                      },
                      '&.Mui-completed': { 
                        color: '#a78bfa',
                        fontWeight: 500,
                      },
                    },
                    '& .MuiStepIcon-root': {
                      color: 'rgba(255,255,255,0.2)',
                      fontSize: '1.75rem',
                      '&.Mui-active': {
                        color: '#8b5cf6',
                        filter: 'drop-shadow(0 4px 20px rgba(139, 92, 246, 0.6))',
                        '& .MuiStepIcon-text': {
                          fill: '#fff',
                          fontWeight: 600,
                        },
                      },
                      '&.Mui-completed': {
                        color: '#10b981',
                        filter: 'drop-shadow(0 2px 10px rgba(16, 185, 129, 0.4))',
                        '& .MuiStepIcon-text': {
                          fill: '#fff',
                        },
                      },
                    },
                    '& .MuiStepConnector-line': {
                      borderColor: 'rgba(255,255,255,0.2)',
                    },
                  }}
                >
                  {label}
                </StepLabel>
              </Step>
            ))}
          </Stepper>
        </Paper>

        {/* Content */}
        <Paper
          sx={{
            bgcolor: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: 2,
            p: 3,
            mb: 2.5,
          }}
        >
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {successMessage && (
            <Alert 
              severity="success" 
              sx={{ 
                mb: 3,
                bgcolor: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                color: '#10b981',
              }}
            >
              {successMessage}
            </Alert>
          )}

          {renderStepContent()}
        </Paper>

        {/* Actions */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button
            disabled={activeStep === 0 || loading}
            onClick={handleBack}
            startIcon={<ArrowBack />}
            sx={darkCardStyles.button.outlined}
          >
            Back
          </Button>
          <Button
            variant="contained"
            onClick={handleNext}
            disabled={
              loading ||
              (activeStep === 1 && 
                (!selectedPart || 
                  (partRegistrationStatus !== StatusVariants.registered && 
                   partRegistrationStatus !== StatusVariants.shared))) ||
              (activeStep === 2 && (!dppData || !dppValidated))
            }
            endIcon={activeStep === 3 ? <Save /> : <ArrowForward />}
            sx={darkCardStyles.button.primary}
          >
            {loading ? (
              <CircularProgress size={24} />
            ) : activeStep === 3 ? (
              'Create DPP'
            ) : (
              'Next'
            )}
          </Button>
        </Box>
      </Container>

      {/* SubmodelCreator Dialog */}
      {showSubmodelCreator && selectedVersion.schema && (
        <SubmodelCreator
          open={showSubmodelCreator}
          onClose={() => setShowSubmodelCreator(false)}
          onBack={() => setShowSubmodelCreator(false)}
          onCreateSubmodel={handleSubmodelCreated}
          selectedSchema={selectedVersion.schema}
          schemaKey={selectedVersion.semanticId}
          manufacturerPartId={selectedPart?.manufacturerPartId}
          twinId={(selectedPart as any)?.globalId}
          dtrAasId={(selectedPart as any)?.dtrAasId}
          serializedPartTwin={selectedPart}
          initialData={dppData}
          saveButtonLabel="Save Submodel"
        />
      )}

      {/* Add Serialized Part Dialog */}
      <AddSerializedPartDialog
        open={showAddPartDialog}
        onClose={() => setShowAddPartDialog(false)}
        onSuccess={handlePartCreated}
      />

      {/* Preview Passport Dialog */}
      <Dialog
        open={showPreview}
        onClose={() => setShowPreview(false)}
        fullScreen
        TransitionProps={{
          timeout: 0
        }}
        PaperProps={{
          sx: {
            bgcolor: '#0a0a0f',
            backdropFilter: 'blur(20px)',
          }
        }}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          color: '#fff',
          borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
          bgcolor: 'rgba(0, 0, 0, 0.4)',
        }}>

        </DialogTitle>
        <DialogContent sx={{ p: 0, overflow: 'auto' }}>
          {dppData && selectedVersion.rawSchema ? (
            <Box sx={{ height: '100%' }}>
              <GenericPassportVisualization
                schema={selectedVersion.rawSchema}
                data={dppData}
                passportId={selectedPart && selectedPart.manufacturerPartId && selectedPart.partInstanceId 
                  ? `CX:${selectedPart.manufacturerPartId}:${selectedPart.partInstanceId}` 
                  : `preview-${Date.now()}`}
                passportVersion={selectedVersion.version}
                onBack={() => setShowPreview(false)}
              />
            </Box>
          ) : (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', p: 4 }}>
              <Typography sx={{ color: '#fff' }}>No data available for preview</Typography>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Publishing Dialog */}
      <Dialog
        open={publishingDialog}
        onClose={publishingResult ? handleClosePublishingDialog : undefined}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: 'rgba(10, 10, 15, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(139, 92, 246, 0.2)',
          }
        }}
      >
        <DialogTitle sx={{ 
          color: '#fff',
          borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
          pb: 2,
          textAlign: 'center'
        }}>
          {!publishingResult ? 'Publishing DPP...' : publishingResult.success ? 'DPP Published Successfully' : 'Publishing Failed'}
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {!publishingResult ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 3 }}>
              <CircularProgress size={60} sx={{ color: '#8b5cf6', mb: 2 }} />
              <Typography sx={{ color: 'rgba(255,255,255,0.7)', textAlign: 'center' }}>
                Creating Digital Product Passport...
              </Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', mt: 1, fontSize: '0.875rem' }}>
                Please wait while we register your DPP
              </Typography>
            </Box>
          ) : publishingResult.success ? (
            <Box sx={{ py: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, justifyContent: 'center' }}>
                <CheckCircle sx={{ fontSize: 60, color: '#10b981' }} />
              </Box>
              <Alert 
                severity="success" 
                sx={{ 
                  mb: 2,
                  bgcolor: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  color: '#10b981',
                }}
              >
                Your Digital Product Passport has been successfully published!
              </Alert>
              {publishingResult.submodelId && (
                <Box sx={{ mt: 2 }}>
                  <Typography sx={{ color: 'rgba(255,255,255,0.6)', mb: 1, fontSize: '0.875rem' }}>
                    Submodel ID:
                  </Typography>
                  <Box sx={{ 
                    bgcolor: 'rgba(139, 92, 246, 0.1)',
                    border: '1px solid rgba(139, 92, 246, 0.3)',
                    borderRadius: 1,
                    p: 1.5,
                    fontFamily: 'monospace',
                    fontSize: '0.875rem',
                    color: '#a78bfa',
                    wordBreak: 'break-all'
                  }}>
                    {publishingResult.submodelId}
                  </Box>
                </Box>
              )}
              
              {/* Status and Share Option */}
              <Box sx={{ mt: 3, pt: 3, borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem' }}>
                    Current Status:
                  </Typography>
                  <Chip
                    label="Registered"
                    size="small"
                    sx={{
                      bgcolor: 'rgba(16, 185, 129, 0.1)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      color: '#10b981',
                      fontWeight: 600
                    }}
                  />
                </Box>
                <Divider sx={{ my: 2, borderColor: 'rgba(255, 255, 255, 0.1)' }} />
                <Typography sx={{ color: 'rgba(255,255,255,0.7)', mb: 2, fontSize: '0.9rem' }}>
                  Now you can share it with your partner!
                </Typography>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<LinkIcon />}
                  sx={{
                    borderColor: 'rgba(139, 92, 246, 0.5)',
                    color: '#a78bfa',
                    textTransform: 'none',
                    py: 1.2,
                    '&:hover': {
                      borderColor: '#8b5cf6',
                      bgcolor: 'rgba(139, 92, 246, 0.1)',
                      color: '#a78bfa',
                    }
                  }}
                >
                  Share DPP
                </Button>
              </Box>
            </Box>
          ) : (
            <Box sx={{ py: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, justifyContent: 'center' }}>
                <Warning sx={{ fontSize: 60, color: '#ef4444' }} />
              </Box>
              <Alert 
                severity="error"
                sx={{ 
                  bgcolor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  color: '#ef4444',
                }}
              >
                {publishingResult.error || 'An error occurred while publishing the DPP'}
              </Alert>
            </Box>
          )}
        </DialogContent>
        {publishingResult && !publishingResult.success && (
          <DialogActions sx={{ borderTop: '1px solid rgba(255, 255, 255, 0.12)', p: 2 }}>
            <Button
              onClick={handleClosePublishingDialog}
              variant="contained"
              sx={{
                background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                color: '#fff',
                textTransform: 'none',
                px: 3,
                '&:hover': {
                  background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                }
              }}
            >
              Close
            </Button>
          </DialogActions>
        )}
        {publishingResult && publishingResult.success && (
          <DialogActions sx={{ borderTop: '1px solid rgba(255, 255, 255, 0.12)', p: 2, gap: 1 }}>
            <Button
              onClick={handleClosePublishingDialog}
              variant="outlined"
              sx={{
                borderColor: 'rgba(255, 255, 255, 0.2)',
                color: 'rgba(255, 255, 255, 0.7)',
                textTransform: 'none',
                px: 3,
                '&:hover': {
                  borderColor: 'rgba(255, 255, 255, 0.4)',
                  bgcolor: 'rgba(255, 255, 255, 0.05)',
                  color: 'rgba(255, 255, 255, 0.7)',
                }
              }}
            >
              Back to List
            </Button>
          </DialogActions>
        )}
      </Dialog>
    </Box>
  );
};

export default PassportProvisionWizard;
