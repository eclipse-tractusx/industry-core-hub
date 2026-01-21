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

import { Box, Chip, Snackbar, Alert, Card, CardContent, Divider, Tooltip, IconButton, CircularProgress } from '@mui/material'
import Grid2 from '@mui/material/Grid2';
import { Typography } from '@mui/material';
import { PartType, StatusVariants } from '../../types/types';
import { PieChart } from '@mui/x-charts/PieChart';
import WifiTetheringErrorIcon from '@mui/icons-material/WifiTetheringError';
import BusinessIcon from '@mui/icons-material/Business';
import InventoryIcon from '@mui/icons-material/Inventory';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import DescriptionIcon from '@mui/icons-material/Description';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import UpdateIcon from '@mui/icons-material/Update';
import ShareIcon from '@mui/icons-material/Share';
import InfoIcon from '@mui/icons-material/Info';
import WarningIcon from '@mui/icons-material/Warning';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { SharedPartner } from '../../types/types';
import SharedTable from './SharedTable';
import SubmodelViewer from './SubmodelViewer';
import DarkSubmodelViewer from './DarkSubmodelViewer';
import { SchemaSelector, SubmodelCreator } from '../../../../components/submodel-creation';
import { SchemaDefinition } from '../../../../schemas';
import { useEffect, useState } from 'react';
import { fetchCatalogPartTwinDetails, registerCatalogPartTwin, createTwinAspect } from '../../api';
import { CatalogPartTwinDetailsRead, CatalogPartTwinCreateType } from '../../types/twin-types';

interface ProductDataProps {
    part: PartType;
    sharedParts: SharedPartner[];
    twinDetails?: CatalogPartTwinDetailsRead | null;
    onPartUpdated?: () => void; // Callback to refresh part data after twin registration
}

const ProductData = ({ part, sharedParts, twinDetails: propTwinDetails, onPartUpdated }: ProductDataProps) => {
    const [twinDetails, setTwinDetails] = useState<CatalogPartTwinDetailsRead | null>(propTwinDetails || null);
    const [isLoadingTwin, setIsLoadingTwin] = useState(false);
    const [isUpdatingParent, setIsUpdatingParent] = useState(false);
    const [copySnackbar, setCopySnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });
    
    // Submodel viewer dialog state
    const [submodelViewerOpen, setSubmodelViewerOpen] = useState(false);
    const [selectedSubmodel, setSelectedSubmodel] = useState<{
        id: string;
        idShort: string;
        semanticId: {
            type: string;
            keys: Array<{
                type: string;
                value: string;
            }>;
        };
    } | null>(null);
    const [selectedSubmodelId, setSelectedSubmodelId] = useState<string>('');
    const [selectedSemanticId, setSelectedSemanticId] = useState<string>('');

    // Submodel creation dialog state
    const [schemaSelectorOpen, setSchemaSelectorOpen] = useState(false);
    const [submodelCreatorOpen, setSubmodelCreatorOpen] = useState(false);
    const [selectedSchema, setSelectedSchema] = useState<SchemaDefinition | null>(null);
    const [selectedSchemaKey, setSelectedSchemaKey] = useState<string>('');

    const handleRegisterTwin = async () => {
        try {
            setIsUpdatingParent(true);
            const twinToCreate: CatalogPartTwinCreateType = {
                manufacturerId: part.manufacturerId,
                manufacturerPartId: part.manufacturerPartId,
            };
            await registerCatalogPartTwin(twinToCreate);
            // Show success message immediately
            setCopySnackbar({ open: true, message: 'Part twin registered successfully!', severity: 'success' });

            // Delay refresh so the snackbar is visible before re-rendering content
            setTimeout(async () => {
                // Refetch twin details to update the UI
                if (part.manufacturerId && part.manufacturerPartId) {
                    setIsLoadingTwin(true);
                    try {
                        const twinData = await fetchCatalogPartTwinDetails(part.manufacturerId, part.manufacturerPartId);
                        setTwinDetails(twinData);
                    } catch (error) {
                        console.error('Error fetching updated twin details:', error);
                    } finally {
                        setIsLoadingTwin(false);
                    }
                }

                // Call the parent callback to refresh the part data and update status
                try {
                    if (onPartUpdated) {
                        onPartUpdated();
                    }
                } catch (err) {
                    console.error('Error in onPartUpdated callback:', err);
                } finally {
                    setIsUpdatingParent(false);
                }
            }, 1000);
        } catch (error) {
            console.error("Error registering part twin:", error);
            setCopySnackbar({ open: true, message: 'Failed to register part twin!', severity: 'error' });
            setIsUpdatingParent(false);
        }
    };

    useEffect(() => {
        // If twin details are provided as prop, use them
        if (propTwinDetails) {
            setTwinDetails(propTwinDetails);
            return;
        }

        // Otherwise, fetch them (for backward compatibility)
        const fetchTwinData = async () => {
            if (part.manufacturerId && part.manufacturerPartId) {
                setIsLoadingTwin(true);
                try {
                    
                    const twinData = await fetchCatalogPartTwinDetails(part.manufacturerId, part.manufacturerPartId);
                    
                    setTwinDetails(twinData);
                } catch (error) {
                    console.error('Error fetching twin details:', error);
                    setTwinDetails(null);
                } finally {
                    setIsLoadingTwin(false);
                }
            }
        };

        fetchTwinData();
    }, [part.manufacturerId, part.manufacturerPartId, propTwinDetails]);

    const handleCopy = async (text: string, fieldName: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopySnackbar({ open: true, message: `${fieldName} copied to clipboard!`, severity: 'success' });
        } catch (error) {
            console.error('Failed to copy:', error);
            setCopySnackbar({ open: true, message: `Failed to copy ${fieldName}`, severity: 'error' });
        }
    };

    const handleCloseSnackbar = () => {
        setCopySnackbar({ open: false, message: '', severity: 'success' });
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return 'Not available';
        try {
            return new Date(dateString).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return 'Invalid date';
        }
    };

    // Submodel creation handlers
    const handleCreateSubmodel = () => {
        setSchemaSelectorOpen(true);
    };

    const handleSchemaSelect = (schemaKey: string, schema: SchemaDefinition) => {
        setSelectedSchemaKey(schemaKey);
        setSelectedSchema(schema);
        setSchemaSelectorOpen(false);
        setSubmodelCreatorOpen(true);
    };

    const handleBackToSchemaSelector = () => {
        setSubmodelCreatorOpen(false);
        setSchemaSelectorOpen(true);
    };

    const handleCloseSchemaSelector = () => {
        setSchemaSelectorOpen(false);
        setSelectedSchema(null);
        setSelectedSchemaKey('');
    };

    const handleCloseSubmodelCreator = () => {
        setSubmodelCreatorOpen(false);
        setSelectedSchema(null);
        setSelectedSchemaKey('');
    };

    const handleCreateSubmodelSubmit = async (submodelData: any) => {
        try {
            if (!selectedSchema) {
                throw new Error('No schema selected');
            }

            // Check if twin exists
            if (!twinDetails || !twinDetails.globalId) {
                throw new Error('Twin must be created before adding submodels. Please create a twin first.');
            }

            // Call the API to create the twin aspect
            const result = await createTwinAspect(
                twinDetails.globalId,
                selectedSchema.metadata.semanticId,
                submodelData
            );

            if (result.success) {
                setCopySnackbar({ 
                    open: true, 
                    message: `Submodel created successfully with ${selectedSchema.metadata.name} schema!`, 
                    severity: 'success' 
                });
                
                // Close the creator dialog
                handleCloseSubmodelCreator();
                
                // Refresh twin details to show the new submodel
                if (onPartUpdated) {
                    onPartUpdated();
                }
            } else {
                throw new Error(result.message || 'Failed to create submodel');
            }
        } catch (error) {
            console.error('Error creating submodel:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to create submodel';
            setCopySnackbar({ 
                open: true, 
                message: errorMessage, 
                severity: 'error' 
            });
        }
    };

    // Removed unused helpers (getStatusLabel, parseSemanticId)

    return (
        <Box sx={{ width: '100%', p: 2, position: 'relative' }}>
            {/* Loading overlay for parent updates */}
            {isUpdatingParent && (
                <Box sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    zIndex: 9999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 2,
                }}>
                    <Box sx={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center',
                        gap: 2,
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        p: 4,
                        borderRadius: 2,
                        border: '1px solid rgba(59, 130, 246, 0.3)',
                    }}>
                        <CircularProgress size={40} sx={{ color: '#3b82f6' }} />
                        <Typography variant="h6" sx={{ color: 'text.primary' }}>
                            Updating part status...
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center' }}>
                            Please wait while we refresh the twin information
                        </Typography>
                    </Box>
                </Box>
            )}
            
            {/* Header Section */}
            <Card sx={{ 
                mb: 3, 
                background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.98))',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderLeft: '4px solid #3b82f6',
                borderRadius: 3,
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                backdropFilter: 'blur(10px)',
                transition: 'all 0.3s ease',
                '&:hover': {
                    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5)',
                    transform: 'translateY(-2px)'
                }
            }}>
                <CardContent sx={{ 
                    p: 4,
                    '&:last-child': {
                        paddingBottom: 4
                    }
                }}>
                    <Box sx={{ position: 'relative' }}>
                        {/* Digital Twin IDs - Top Right Corner */}
                        <Box sx={{ 
                            position: 'absolute', 
                            top: 0, 
                            right: 0, 
                            display: 'flex', 
                            flexDirection: 'column',
                            flexWrap: 'wrap', 
                            gap: 1, 
                            justifyContent: 'flex-end',
                            alignItems: 'flex-end',
                            maxWidth: '60%'
                        }}>
                            {/* Register Twin Button - Only show if status is draft */}
                            {(part.status === StatusVariants.draft || part.status === StatusVariants.pending) && (
                                <Tooltip title="Register part twin" arrow>
                                    <IconButton
                                        onClick={handleRegisterTwin}
                                        sx={{
                                            backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                            color: '#3b82f6',
                                            border: '1px solid rgba(59, 130, 246, 0.3)',
                                            '&:hover': {
                                                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                                                borderColor: 'rgba(59, 130, 246, 0.5)'
                                            },
                                            marginBottom: 1
                                        }}
                                    >
                                        <CloudUploadIcon />
                                    </IconButton>
                                </Tooltip>
                            )}
                            {isLoadingTwin ? (
                                <>
                                    <Chip 
                                        label="Loading AAS ID..." 
                                        variant="outlined" 
                                        size="small" 
                                        disabled 
                                        sx={{
                                            '& .MuiChip-label': {
                                                color: '#ffffff !important',
                                                fontSize: '12px'
                                            }
                                        }}
                                    />
                                    <Chip 
                                        label="Loading Twin ID..." 
                                        variant="outlined" 
                                        size="small" 
                                        disabled 
                                        sx={{
                                            '& .MuiChip-label': {
                                                color: '#ffffff !important',
                                                fontSize: '12px'
                                            }
                                        }}
                                    />
                                </>
                            ) : twinDetails ? (
                                <> {twinDetails.globalId && (
                                        <Tooltip title="Click to copy Global Asset ID">
                                            <Chip
                                                icon={<AccountTreeIcon />}
                                                label={twinDetails.globalId.startsWith('urn:uuid:') ? twinDetails.globalId : `urn:uuid:${twinDetails.globalId}`}
                                                variant="outlined"
                                                size="small"
                                                clickable
                                                onClick={() => handleCopy(twinDetails.globalId.startsWith('urn:uuid:') ? twinDetails.globalId : `urn:uuid:${twinDetails.globalId}`, 'Global Asset ID')}
                                                sx={{
                                                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                                    borderColor: 'rgba(255, 255, 255, 0.3)',
                                                    color: '#ffffff',
                                                    fontFamily: 'monospace',
                                                    '&:hover': {
                                                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                                        borderColor: 'rgba(255, 255, 255, 0.5)'
                                                    },
                                                    '& .MuiChip-icon': {
                                                        color: '#ffffff'
                                                    },
                                                    '& .MuiChip-label': {
                                                        color: '#ffffff !important',
                                                        fontSize: '11px',
                                                        fontWeight: 500,
                                                        fontFamily: 'monospace'
                                                    }
                                                }}
                                            />
                                        </Tooltip>
                                    )}
                                    {twinDetails.dtrAasId && (
                                        <Tooltip title="Click to copy AAS ID">
                                            <Chip
                                                icon={<FingerprintIcon />}
                                                label={twinDetails.dtrAasId.startsWith('urn:uuid:') ? twinDetails.dtrAasId : `urn:uuid:${twinDetails.dtrAasId}`}
                                                variant="outlined"
                                                size="small"
                                                clickable
                                                onClick={() => handleCopy(twinDetails.dtrAasId.startsWith('urn:uuid:') ? twinDetails.dtrAasId : `urn:uuid:${twinDetails.dtrAasId}`, 'AAS ID')}
                                                sx={{
                                                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                                    borderColor: 'rgba(255, 255, 255, 0.3)',
                                                    color: '#ffffff',
                                                    fontFamily: 'monospace',
                                                    '&:hover': {
                                                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                                        borderColor: 'rgba(255, 255, 255, 0.5)'
                                                    },
                                                    '& .MuiChip-icon': {
                                                        color: '#ffffff'
                                                    },
                                                    '& .MuiChip-label': {
                                                        color: '#ffffff !important',
                                                        fontSize: '11px',
                                                        fontWeight: 500,
                                                        fontFamily: 'monospace'
                                                    },
                                                    '& span': {
                                                        color: '#ffffff !important'
                                                    }
                                                }}
                                            />
                                        </Tooltip>
                                    )}
                                    {(!twinDetails.dtrAasId && !twinDetails.globalId) && (
                                        <Chip 
                                            label="No Twin IDs" 
                                            variant="outlined" 
                                            size="small" 
                                            sx={{ 
                                                color: '#ffffff',
                                                borderColor: '#ffffff',
                                                '& .MuiChip-label': {
                                                    color: '#ffffff !important',
                                                    fontSize: '12px'
                                                }
                                            }}
                                        />
                                    )}
                                </>
                            ) : (
                                <Chip 
                                    label="Twin data unavailable" 
                                    variant="outlined" 
                                    size="small" 
                                    sx={{ 
                                        color: '#ffffff',
                                        borderColor: '#ffffff',
                                        '& .MuiChip-label': {
                                            color: '#ffffff !important',
                                            fontSize: '12px'
                                        }
                                    }}
                                />
                            )}
                        </Box>

                        <Grid2 container spacing={2} alignItems="center">
                            {/* Left Side - Product Name and Manufacturer Info */}
                            <Grid2 size={{ xs: 12, md: 8 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 2, pr: { xs: 0, md: 10 } }}>
                                    <Box>
                                        <Tooltip title={part.name} arrow placement="top">
                                            <Typography variant="h3" sx={{ 
                                                color: '#ffffff', 
                                                mb: 1, 
                                                fontWeight: 700,
                                                fontSize: '2.5rem',
                                                letterSpacing: '-0.02em',
                                                textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
                                                wordBreak: 'break-word',
                                                overflowWrap: 'break-word',
                                                maxWidth: '100%',
                                                cursor: 'help'
                                            }}>
                                                {(() => {
                                                    // Smart truncation for very long product names
                                                    const productName = part.name;
                                                    if (productName.length <= 80) return productName;
                                                    // Show first 40 characters and last 35 for better recognition
                                                    const startLength = 40;
                                                    const endLength = 35;
                                                    return `${productName.substring(0, startLength)}...${productName.substring(productName.length - endLength)}`;
                                                })()}
                                            </Typography>
                                        </Tooltip>
                                        {part.category && part.category.trim() && (
                                            <Chip 
                                                label={part.category} 
                                                variant="filled" 
                                                size="medium"
                                                sx={{ 
                                                    background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                                                    color: '#ffffff',
                                                    fontWeight: 600,
                                                    fontSize: '13px',
                                                    height: 28,
                                                    borderRadius: 2,
                                                    boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)',
                                                    '& .MuiChip-label': {
                                                        color: '#ffffff !important',
                                                        fontSize: '13px',
                                                        fontWeight: 500
                                                    }
                                                }}
                                            />
                                        )}
                                    </Box>
                                </Box>
                                {/* Manufacturer Info Chips */}
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
                                    <Tooltip title="Click to copy Manufacturer ID">
                                        <Chip
                                            icon={<BusinessIcon />}
                                            label={`Manufacturer ID: ${part.manufacturerId}`}
                                            variant="outlined"
                                            size="small"
                                            clickable
                                            onClick={() => handleCopy(part.manufacturerId, 'Manufacturer ID')}
                                            sx={{
                                                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                                borderColor: 'rgba(255, 255, 255, 0.2)',
                                                color: '#ffffff',
                                                fontFamily: 'monospace',
                                                '&:hover': {
                                                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                                    borderColor: 'rgba(255, 255, 255, 0.4)'
                                                },
                                                '& .MuiChip-icon': {
                                                    color: '#ffffff'
                                                },
                                                '& .MuiChip-label': {
                                                    color: '#ffffff',
                                                    fontSize: '12px',
                                                    fontWeight: 500,
                                                    fontFamily: 'monospace'
                                                }
                                            }}
                                        />
                                    </Tooltip>
                                    <Tooltip title="Click to copy Manufacturer Part ID">
                                        <Chip
                                            icon={<InventoryIcon />}
                                            label={`Manufacturer Part ID: ${part.manufacturerPartId}`}
                                            variant="outlined"
                                            size="small"
                                            clickable
                                            onClick={() => handleCopy(part.manufacturerPartId, 'Manufacturer Part ID')}
                                            sx={{
                                                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                                borderColor: 'rgba(255, 255, 255, 0.2)',
                                                color: '#ffffff',
                                                fontFamily: 'monospace',
                                                '&:hover': {
                                                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                                    borderColor: 'rgba(255, 255, 255, 0.4)'
                                                },
                                                '& .MuiChip-icon': {
                                                    color: '#ffffff'
                                                },
                                                '& .MuiChip-label': {
                                                    color: '#ffffff',
                                                    fontSize: '12px',
                                                    fontWeight: 500,
                                                    fontFamily: 'monospace'
                                                }
                                            }}
                                        />
                                    </Tooltip>
                                    {part.bpns && (
                                        <Tooltip title="Click to copy Site of Origin">
                                            <Chip
                                                icon={<LocationOnIcon />}
                                                label={`Site of Origin: ${part.bpns}`}
                                                variant="outlined"
                                                size="small"
                                                clickable
                                                onClick={() => handleCopy(part.bpns || '', 'Site of Origin (BPNS)')}
                                                sx={{
                                                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                                    borderColor: 'rgba(255, 255, 255, 0.2)',
                                                    color: '#ffffff',
                                                    fontFamily: 'monospace',
                                                    '&:hover': {
                                                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                                        borderColor: 'rgba(255, 255, 255, 0.4)'
                                                    },
                                                    '& .MuiChip-icon': {
                                                        color: '#ffffff'
                                                    },
                                                    '& .MuiChip-label': {
                                                        color: '#ffffff',
                                                        fontSize: '12px',
                                                        fontWeight: 500,
                                                        fontFamily: 'monospace'
                                                    }
                                                }}
                                            />
                                        </Tooltip>
                                    )}
                                </Box>
                            </Grid2>
                        </Grid2>
                    </Box>
                </CardContent>
            </Card>

            <Grid2 container spacing={3}>
                {/* Left Column - Part Details */}
                <Grid2 size={{ lg: 6, md: 12, sm: 12 }}>
                    <Card sx={{ 
                        height: '100%',
                        backgroundColor: 'rgba(0, 0, 0, 0.4)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: 2
                    }}>
                        <CardContent sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
                            <Typography variant="h6" sx={{ 
                                color: 'text.primary', 
                                mb: 3,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1
                            }}>
                                <InfoIcon sx={{ color: 'primary.main' }} />
                                Part Details
                            </Typography>

                            <Box sx={{ mb: 2.5 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                    <DescriptionIcon sx={{ color: 'primary.main' }} />
                                    <Typography variant="label3" sx={{ color: 'text.primary' }}>
                                        Description
                                    </Typography>
                                </Box>
                                <Typography variant="body3" sx={{ 
                                    color: 'text.secondary',
                                    fontStyle: part.description ? 'normal' : 'italic'
                                }}>
                                    {part.description || 'No description available'}
                                </Typography>
                            </Box>

                            {/* Digital Twin Timestamps */}
                            <>
                                <Divider sx={{ my: 3, borderColor: 'rgba(255, 255, 255, 0.12)' }} />
                                <Typography variant="h6" sx={{ 
                                    color: 'text.primary', 
                                    mb: 3,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1
                                }}>
                                    <AccessTimeIcon sx={{ color: 'primary.main' }} />
                                    Twin Timestamps
                                </Typography>

                                {/* Timestamps */}
                                <Grid2 container spacing={2}>
                                    <Grid2 size={6}>
                                        <Box sx={{ 
                                            textAlign: 'center', 
                                            p: 2, 
                                            backgroundColor: 'rgba(255, 255, 255, 0.08)', 
                                            borderRadius: 2,
                                            border: '1px solid rgba(255, 255, 255, 0.15)',
                                            backdropFilter: 'blur(20px)',
                                            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                                            transition: 'all 0.3s ease',
                                            '&:hover': {
                                                backgroundColor: 'rgba(255, 255, 255, 0.12)',
                                                border: '1px solid rgba(255, 255, 255, 0.25)',
                                                transform: 'translateY(-2px)',
                                                boxShadow: '0 12px 40px rgba(0, 0, 0, 0.4)'
                                            }
                                        }}>
                                            <AccessTimeIcon sx={{ color: 'success.main', mb: 1 }} />
                                            <Typography variant="caption1" sx={{ 
                                                color: 'text.secondary',
                                                display: 'block',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.08em',
                                                mb: 1
                                            }}>
                                                Created
                                            </Typography>
                                            <Typography variant="body2" sx={{ color: 'text.primary' }}>
                                                {isLoadingTwin 
                                                    ? 'Loading...' 
                                                    : twinDetails?.createdDate 
                                                        ? formatDate(twinDetails.createdDate)
                                                        : 'Not yet created'
                                                }
                                            </Typography>
                                        </Box>
                                    </Grid2>
                                    <Grid2 size={6}>
                                        <Box sx={{ 
                                            textAlign: 'center', 
                                            p: 2, 
                                            backgroundColor: 'rgba(255, 255, 255, 0.08)', 
                                            borderRadius: 2,
                                            border: '1px solid rgba(255, 255, 255, 0.15)',
                                            backdropFilter: 'blur(20px)',
                                            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                                            transition: 'all 0.3s ease',
                                            '&:hover': {
                                                backgroundColor: 'rgba(255, 255, 255, 0.12)',
                                                border: '1px solid rgba(255, 255, 255, 0.25)',
                                                transform: 'translateY(-2px)',
                                                boxShadow: '0 12px 40px rgba(0, 0, 0, 0.4)'
                                            }
                                        }}>
                                            <UpdateIcon sx={{ color: 'warning.main', mb: 1 }} />
                                            <Typography variant="caption1" sx={{ 
                                                color: 'text.secondary',
                                                display: 'block',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.08em',
                                                mb: 1
                                            }}>
                                                Updated
                                            </Typography>
                                            <Typography variant="body2" sx={{ color: 'text.primary' }}>
                                                {isLoadingTwin 
                                                    ? 'Loading...' 
                                                    : twinDetails?.modifiedDate 
                                                        ? formatDate(twinDetails.modifiedDate)
                                                        : 'Not yet created'
                                                }
                                            </Typography>
                                        </Box>
                                    </Grid2>
                                </Grid2>
                            </>
                        </CardContent>
                    </Card>
                </Grid2>

                {/* Right Column - Sharing & Materials */}
                <Grid2 size={{ lg: 6, md: 12, sm: 12 }}>
                    {/* Sharing Information Card */}
                    <Card sx={{ 
                        mb: 3,
                        backgroundColor: 'rgba(0, 0, 0, 0.4)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: 2
                    }}>
                        <CardContent sx={{ p: 3 }}>
                            <Typography variant="h6" sx={{ 
                                color: 'text.primary', 
                                mb: 3,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1
                            }}>
                                <ShareIcon sx={{ color: 'primary.main' }} />
                                Shared With
                            </Typography>
                            
                            {/* Warning for parts with customer IDs but not yet shared */}
                            {part.customerPartIds && Object.keys(part.customerPartIds).length > 0 && 
                             part.status !== StatusVariants.shared && (
                                <Box sx={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: 2,
                                    p: 2,
                                    mb: 3,
                                    backgroundColor: 'rgba(255, 152, 0, 0.1)',
                                    borderRadius: 1,
                                    border: '1px solid rgba(255, 152, 0, 0.3)'
                                }}>
                                    <WarningIcon sx={{ color: '#ff9800', fontSize: 20 }} />
                                    <Typography variant="body2" sx={{ 
                                        color: '#ff9800',
                                        fontWeight: 500,
                                        fontSize: '0.875rem'
                                    }}>
                                        This part is still not shared, but has already an existing customer part ID prepared for sharing.
                                    </Typography>
                                </Box>
                            )}
                            
                            {sharedParts.length > 0 ? (
                                <SharedTable sharedParts={sharedParts} />
                            ) : (
                                <Box sx={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: 2,
                                    p: 3,
                                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                                    borderRadius: 1,
                                    border: '1px dashed rgba(255, 255, 255, 0.12)'
                                }}>
                                    <WifiTetheringErrorIcon sx={{ color: 'text.secondary' }} />
                                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                        No sharing insights are currently available. Share this part with a partner to view the information here.
                                    </Typography>
                                </Box>
                            )}
                        </CardContent>
                    </Card>

                    {/* Materials & Dimensions Card */}
                    <Card sx={{ 
                        backgroundColor: 'rgba(0, 0, 0, 0.4)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: 2
                    }}>
                        <CardContent sx={{ p: 3 }}>
                            <Typography variant="h6" sx={{ 
                                color: 'text.primary', 
                                mb: 3,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1
                            }}>
                                <InfoIcon sx={{ color: 'primary.main' }} />
                                More Information
                            </Typography>
                            
                            <Grid2 container spacing={3}>
                                {/* Materials Chart */}
                                <Grid2 size={{ md: 8, xs: 12 }}>
                                    <Typography variant="label3" sx={{ color: 'text.primary', mb: 2, display: 'block' }}>
                                        Materials:
                                    </Typography>
                                    {(part.materials && part.materials.length > 0) ? (
                                        <Box sx={{ 
                                            display: 'flex', 
                                            justifyContent: 'center',
                                            backgroundColor: 'rgba(255, 255, 255, 0.02)',
                                            borderRadius: 1,
                                            p: 2
                                        }}>
                                            <PieChart
                                                series={[
                                                    {
                                                        data: part.materials.map((material) => ({
                                                            value: material.share,
                                                            label: material.name,
                                                        })),
                                                        highlightScope: { fade: 'global', highlight: 'item' },
                                                    },
                                                ]}
                                                width={200}
                                                height={200}
                                            />
                                        </Box>
                                    ) : (
                                        <Box sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            p: 3,
                                            backgroundColor: 'rgba(255, 255, 255, 0.02)',
                                            borderRadius: 1,
                                            border: '1px dashed rgba(255, 255, 255, 0.12)'
                                        }}>
                                            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                                No materials data available
                                            </Typography>
                                        </Box>
                                    )}
                                </Grid2>
                                
                                {/* Physical Properties */}
                                <Grid2 size={{ md: 4, xs: 12 }}>
                                    <Typography variant="label3" sx={{ color: 'text.primary', mb: 2, display: 'block' }}>
                                        Dimensions:
                                    </Typography>
                                    <Grid2 container spacing={2}>
                                        <Grid2 size={6}>
                                            <Box sx={{ 
                                                textAlign: 'center', 
                                                p: 1.5, 
                                                backgroundColor: 'rgba(255, 255, 255, 0.08)', 
                                                borderRadius: 2,
                                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                                backdropFilter: 'blur(20px)',
                                                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                                                transition: 'all 0.3s ease',
                                                '&:hover': {
                                                    backgroundColor: 'rgba(255, 255, 255, 0.12)',
                                                    border: '1px solid rgba(255, 255, 255, 0.25)',
                                                    transform: 'translateY(-2px)',
                                                    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.4)'
                                                }
                                            }}>
                                                <Typography variant="caption1" sx={{ 
                                                    color: 'text.secondary',
                                                    display: 'block',
                                                    mb: 0.5
                                                }}>
                                                    Width
                                                </Typography>
                                                <Typography variant="body2" sx={{ color: 'text.primary' }}>
                                                    {part.width?.value || '-'} {part.width?.unit || ''}
                                                </Typography>
                                            </Box>
                                        </Grid2>
                                        <Grid2 size={6}>
                                            <Box sx={{ 
                                                textAlign: 'center', 
                                                p: 1.5, 
                                                backgroundColor: 'rgba(255, 255, 255, 0.08)', 
                                                borderRadius: 2,
                                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                                backdropFilter: 'blur(20px)',
                                                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                                                transition: 'all 0.3s ease',
                                                '&:hover': {
                                                    backgroundColor: 'rgba(255, 255, 255, 0.12)',
                                                    border: '1px solid rgba(255, 255, 255, 0.25)',
                                                    transform: 'translateY(-2px)',
                                                    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.4)'
                                                }
                                            }}>
                                                <Typography variant="caption1" sx={{ 
                                                    color: 'text.secondary',
                                                    display: 'block',
                                                    mb: 0.5
                                                }}>
                                                    Height
                                                </Typography>
                                                <Typography variant="body2" sx={{ color: 'text.primary' }}>
                                                    {part.height?.value || '-'} {part.height?.unit || ''}
                                                </Typography>
                                            </Box>
                                        </Grid2>
                                        <Grid2 size={6}>
                                            <Box sx={{ 
                                                textAlign: 'center', 
                                                p: 1.5, 
                                                backgroundColor: 'rgba(255, 255, 255, 0.08)', 
                                                borderRadius: 2,
                                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                                backdropFilter: 'blur(20px)',
                                                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                                                transition: 'all 0.3s ease',
                                                '&:hover': {
                                                    backgroundColor: 'rgba(255, 255, 255, 0.12)',
                                                    border: '1px solid rgba(255, 255, 255, 0.25)',
                                                    transform: 'translateY(-2px)',
                                                    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.4)'
                                                }
                                            }}>
                                                <Typography variant="caption1" sx={{ 
                                                    color: 'text.secondary',
                                                    display: 'block',
                                                    mb: 0.5
                                                }}>
                                                    Length
                                                </Typography>
                                                <Typography variant="body2" sx={{ color: 'text.primary' }}>
                                                    {part.length?.value || '-'} {part.length?.unit || ''}
                                                </Typography>
                                            </Box>
                                        </Grid2>
                                        <Grid2 size={6}>
                                            <Box sx={{ 
                                                textAlign: 'center', 
                                                p: 1.5, 
                                                backgroundColor: 'rgba(255, 255, 255, 0.08)', 
                                                borderRadius: 2,
                                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                                backdropFilter: 'blur(20px)',
                                                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                                                transition: 'all 0.3s ease',
                                                '&:hover': {
                                                    backgroundColor: 'rgba(255, 255, 255, 0.12)',
                                                    border: '1px solid rgba(255, 255, 255, 0.25)',
                                                    transform: 'translateY(-2px)',
                                                    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.4)'
                                                }
                                            }}>
                                                <Typography variant="caption1" sx={{ 
                                                    color: 'text.secondary',
                                                    display: 'block',
                                                    mb: 0.5
                                                }}>
                                                    Weight
                                                </Typography>
                                                <Typography variant="body2" sx={{ color: 'text.primary' }}>
                                                    {part.weight?.value || '-'} {part.weight?.unit || ''}
                                                </Typography>
                                            </Box>
                                        </Grid2>
                                    </Grid2>
                                </Grid2>
                            </Grid2>
                        </CardContent>
                    </Card>
                </Grid2>
            </Grid2>

            {/* Submodels Section */}
            {twinDetails && (
                <Card sx={{ 
                    mt: 3,
                    backgroundColor: 'rgba(0, 0, 0, 0.4)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: 2
                }}>
                    <CardContent sx={{ p: 3 }}>
                        <SubmodelViewer 
                            twinDetails={twinDetails} 
                            onViewFullDetails={(submodel, submodelId, semanticId) => {
                                setSelectedSubmodel(submodel);
                                setSelectedSubmodelId(submodelId);
                                setSelectedSemanticId(semanticId);
                                setSubmodelViewerOpen(true);
                            }}
                            onCreateSubmodel={handleCreateSubmodel}
                        />
                    </CardContent>
                </Card>
            )}

            {/* Copy notification snackbar */}
            <Snackbar
                open={copySnackbar.open}
                autoHideDuration={3000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                sx={{ zIndex: 10000 }}
            >
                <Alert 
                    onClose={handleCloseSnackbar}
                    variant="filled"
                    severity={copySnackbar.severity}
                    sx={{ width: '100%' }}
                >
                    {copySnackbar.message}
                </Alert>
            </Snackbar>

            {/* Submodel Viewer Dialog */}
            {selectedSubmodel && (
                <DarkSubmodelViewer
                    open={submodelViewerOpen}
                    onClose={() => setSubmodelViewerOpen(false)}
                    submodel={selectedSubmodel}
                    submodelId={selectedSubmodelId}
                    semanticId={selectedSemanticId}
                />
            )}

            {/* Schema Selector Dialog */}
            <SchemaSelector
                open={schemaSelectorOpen}
                onClose={handleCloseSchemaSelector}
                onSchemaSelect={handleSchemaSelect}
                manufacturerPartId={part.manufacturerPartId}
            />

            {/* Submodel Creator Dialog */}
            <SubmodelCreator
                open={submodelCreatorOpen}
                onClose={handleCloseSubmodelCreator}
                onBack={handleBackToSchemaSelector}
                onCreateSubmodel={handleCreateSubmodelSubmit}
                selectedSchema={selectedSchema}
                schemaKey={selectedSchemaKey}
                manufacturerPartId={part.manufacturerPartId}
                twinId={twinDetails?.globalId}
                dtrAasId={twinDetails?.dtrAasId}
            />
        </Box>
        
    );
};

export default ProductData;
