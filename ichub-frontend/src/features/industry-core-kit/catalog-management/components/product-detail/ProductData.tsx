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
import { useTheme } from '@mui/material/styles';
import Grid2 from '@mui/material/Grid2';
import { Typography } from '@mui/material';
import { PartType, StatusVariants } from '@/features/industry-core-kit/catalog-management/types/types';
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
import { SharedPartner } from '@/features/industry-core-kit/catalog-management/types/types';
import SharedTable from './SharedTable';
import SubmodelViewer from './SubmodelViewer';
import DarkSubmodelViewer from './DarkSubmodelViewer';
import { SchemaSelector, SubmodelCreator } from '@/components/submodel-creation';
import { SchemaDefinition } from '@/schemas';
import { useEffect, useState } from 'react';
import { fetchCatalogPartTwinDetails, registerCatalogPartTwin, createTwinAspect } from '@/features/industry-core-kit/catalog-management/api';
import { CatalogPartTwinDetailsRead, CatalogPartTwinCreateType } from '@/features/industry-core-kit/catalog-management/types/twin-types';
import { useTranslation } from 'react-i18next';

interface ProductDataProps {
    part: PartType;
    sharedParts: SharedPartner[];
    twinDetails?: CatalogPartTwinDetailsRead | null;
    onPartUpdated?: () => void; // Callback to refresh part data after twin registration
}

const ProductData = ({ part, sharedParts, twinDetails: propTwinDetails, onPartUpdated }: ProductDataProps) => {
    const { palette: { common } } = useTheme();
    const [twinDetails, setTwinDetails] = useState<CatalogPartTwinDetailsRead | null>(propTwinDetails || null);
    const [isLoadingTwin, setIsLoadingTwin] = useState(false);
    const [isUpdatingParent, setIsUpdatingParent] = useState(false);
    const [copySnackbar, setCopySnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });
    const { t } = useTranslation('catalogManagement');
    const { t: tCommon } = useTranslation('common');
    
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
            setCopySnackbar({ open: true, message: t('productDetail.productData.messages.twinRegisteredSuccess'), severity: 'success' });

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
            setCopySnackbar({ open: true, message: t('productDetail.productData.messages.twinRegistrationFailed'), severity: 'error' });
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
            setCopySnackbar({ open: true, message: tCommon('notifications.copiedToClipboard', { field: fieldName }), severity: 'success' });
        } catch (error) {
            console.error('Failed to copy:', error);
            setCopySnackbar({ open: true, message: tCommon('notifications.failedToCopy', { field: fieldName }), severity: 'error' });
        }
    };

    const handleCloseSnackbar = () => {
        setCopySnackbar({ open: false, message: '', severity: 'success' });
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return t('productDetail.productData.specifications.notAvailable');
        try {
            return new Date(dateString).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return t('productDetail.productData.invalidDate');
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
                throw new Error(t('productDetail.productData.messages.noSchemaSelected'));
            }

            // Check if twin exists
            if (!twinDetails || !twinDetails.globalId) {
                throw new Error(t('productDetail.productData.messages.twinRequired'));
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
                    message: t('productDetail.productData.messages.submodelCreatedSuccess', { schemaName: selectedSchema.metadata.name }), 
                    severity: 'success' 
                });
                
                // Close the creator dialog
                handleCloseSubmodelCreator();
                
                // Refresh twin details to show the new submodel
                if (onPartUpdated) {
                    onPartUpdated();
                }
            } else {
                throw new Error(result.message || t('productDetail.productData.messages.submodelCreationFailed'));
            }
        } catch (error) {
            console.error('Error creating submodel:', error);
            const errorMessage = error instanceof Error ? error.message : t('productDetail.productData.messages.submodelCreationFailed');
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
                    backgroundColor: common.black70,
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
                        backgroundColor: common.deepOverlay95,
                        p: 4,
                        borderRadius: 2,
                        border: `1px solid ${common.accent30}`,
                    }}>
                        <CircularProgress size={40} sx={{ color: common.accent }} />
                        <Typography variant="h6" sx={{ color: 'text.primary' }}>
                            {t('productDetail.productData.updatingStatus')}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center' }}>
                            {t('productDetail.productData.pleaseWait')}
                        </Typography>
                    </Box>
                </Box>
            )}
            
            {/* Header Section */}
            <Card sx={{ 
                mb: 3,
                background: `linear-gradient(135deg, ${common.darkOverlay}, ${common.deepOverlay98})`,
                border: `1px solid ${common.accent30}`,
                borderLeft: `4px solid ${common.accent}`,
                borderRadius: 3,
                boxShadow: `0 8px 32px ${common.black40}`,
                backdropFilter: 'blur(10px)',
                overflow: 'hidden',
            }}>
                <CardContent sx={{ 
                    p: { xs: 2, sm: 3, md: 4 },
                    '&:last-child': { paddingBottom: { xs: 2, sm: 3, md: 4 } }
                }}>
                    {/* Responsive flex row: on md+ chips sit right; on xs they stack above the title */}
                    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, minWidth: 0 }}>

                        {/* Left: name + category + manufacturer info */}
                        <Box sx={{ flex: 1, minWidth: 0, overflow: 'hidden', order: { xs: 1, md: 0 } }}>
                            <Tooltip title={part.name} arrow placement="top">
                                <Typography variant="h3" sx={{ 
                                    color: 'common.white',
                                    mb: 2,
                                    fontWeight: 700,
                                    fontSize: { xs: '1.4rem', sm: '1.8rem', md: '2.5rem' },
                                    letterSpacing: '-0.02em',
                                    textShadow: `0 2px 4px ${common.black30}`,
                                    whiteSpace: { xs: 'normal', md: 'nowrap' },
                                    overflow: { xs: 'visible', md: 'hidden' },
                                    textOverflow: { xs: 'clip', md: 'ellipsis' },
                                    wordBreak: { xs: 'break-word', md: 'normal' },
                                    cursor: 'help',
                                }}>
                                    {part.name}
                                </Typography>
                            </Tooltip>
                            {part.category && part.category.trim() && (
                                <Chip
                                    label={part.category}
                                    variant="filled"
                                    size="medium"
                                    sx={{
                                        mb: 2,
                                        background: (theme) => `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                                        height: 28,
                                        borderRadius: 2,
                                        boxShadow: `0 2px 8px ${common.accent30}`,
                                        '& .MuiChip-label': { color: 'common.white', fontSize: '13px', fontWeight: 500 },
                                    }}
                                />
                            )}
                            {/* Manufacturer chips — row+wrap on desktop, each chip truncates via maxWidth */}
                            <Box sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 1 }}>
                                <Tooltip title={t('common:tooltips.copyManufacturerId')}>
                                    <Chip
                                        icon={<BusinessIcon />}
                                        label={`${t('common:fields.manufacturerId')}: ${part.manufacturerId}`}
                                        variant="outlined"
                                        size="small"
                                        clickable
                                        onClick={() => handleCopy(part.manufacturerId, t('common:fields.manufacturerId'))}
                                        sx={{
                                            maxWidth: '100%',
                                            backgroundColor: common.white05,
                                            borderColor: common.white20,
                                            fontFamily: 'monospace',
                                            '&:hover': { backgroundColor: common.white10, borderColor: common.white40 },
                                            '& .MuiChip-icon': { color: 'common.white', flexShrink: 0 },
                                            '& .MuiChip-label': { color: 'common.white', fontSize: '12px', fontWeight: 500, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' },
                                        }}
                                    />
                                </Tooltip>
                                <Tooltip title={t('common:tooltips.copyManufacturerPartId')}>
                                    <Chip
                                        icon={<InventoryIcon />}
                                        label={`${t('common:fields.manufacturerPartId')}: ${part.manufacturerPartId}`}
                                        variant="outlined"
                                        size="small"
                                        clickable
                                        onClick={() => handleCopy(part.manufacturerPartId, t('common:fields.manufacturerPartId'))}
                                        sx={{
                                            maxWidth: '100%',
                                            backgroundColor: common.white05,
                                            borderColor: common.white20,
                                            fontFamily: 'monospace',
                                            '&:hover': { backgroundColor: common.white10, borderColor: common.white40 },
                                            '& .MuiChip-icon': { color: 'common.white', flexShrink: 0 },
                                            '& .MuiChip-label': { color: 'common.white', fontSize: '12px', fontWeight: 500, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' },
                                        }}
                                    />
                                </Tooltip>
                                {part.bpns && (
                                    <Tooltip title={t('productDetail.productData.tooltips.clickToCopySiteOfOrigin')}>
                                        <Chip
                                            icon={<LocationOnIcon />}
                                            label={`${t('productDetail.productData.labels.siteOfOrigin')}: ${part.bpns}`}
                                            variant="outlined"
                                            size="small"
                                            clickable
                                            onClick={() => handleCopy(part.bpns || '', t('productDetail.productData.labels.siteOfOrigin'))}
                                            sx={{
                                                maxWidth: '100%',
                                                backgroundColor: common.white05,
                                                borderColor: common.white20,
                                                fontFamily: 'monospace',
                                                '&:hover': { backgroundColor: common.white10, borderColor: common.white40 },
                                                '& .MuiChip-icon': { color: 'common.white', flexShrink: 0 },
                                                '& .MuiChip-label': { color: 'common.white', fontSize: '12px', fontWeight: 500, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' },
                                            }}
                                        />
                                    </Tooltip>
                                )}
                            </Box>
                        </Box>

                        {/* Right: register button + twin ID chips */}
                        <Box sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 1,
                            alignItems: { xs: 'flex-start', md: 'flex-end' },
                            width: { xs: '100%', md: 'auto' },
                            overflow: 'hidden',
                            order: { xs: 0, md: 1 },
                            flexShrink: 0,
                            maxWidth: { md: '45%' },
                        }}>
                            {(part.status === StatusVariants.draft || part.status === StatusVariants.pending) && (
                                <Tooltip title={t('productDetail.productData.registerPartTwin')} arrow>
                                    <IconButton
                                        onClick={handleRegisterTwin}
                                        sx={{
                                            backgroundColor: common.accent10,
                                            color: 'primary.main',
                                            border: `1px solid ${common.accent30}`,
                                            '&:hover': { backgroundColor: common.accent20, borderColor: common.accent50 },
                                        }}
                                    >
                                        <CloudUploadIcon />
                                    </IconButton>
                                </Tooltip>
                            )}
                            {isLoadingTwin ? (
                                <>
                                    <Chip label={t('productDetail.productData.loadingAasId')} variant="outlined" size="small" disabled sx={{ '& .MuiChip-label': { color: '#ffffff !important', fontSize: '12px' } }} />
                                    <Chip label={t('productDetail.productData.loadingTwinId')} variant="outlined" size="small" disabled sx={{ '& .MuiChip-label': { color: '#ffffff !important', fontSize: '12px' } }} />
                                </>
                            ) : twinDetails ? (
                                <>
                                    {twinDetails.globalId && (
                                        <Tooltip title={t('common:tooltips.copyGlobalAssetId')}>
                                            <Chip
                                                icon={<AccountTreeIcon />}
                                                label={twinDetails.globalId.startsWith('urn:uuid:') ? twinDetails.globalId : `urn:uuid:${twinDetails.globalId}`}
                                                variant="outlined"
                                                size="small"
                                                clickable
                                                onClick={() => handleCopy(twinDetails.globalId.startsWith('urn:uuid:') ? twinDetails.globalId : `urn:uuid:${twinDetails.globalId}`, 'Global Asset ID')}
                                                sx={{
                                                    maxWidth: '100%',
                                                    backgroundColor: common.white05,
                                                    borderColor: common.white30,
                                                    fontFamily: 'monospace',
                                                    '&:hover': { backgroundColor: common.white10, borderColor: common.white50 },
                                                    '& .MuiChip-icon': { color: 'common.white', flexShrink: 0 },
                                                    '& .MuiChip-label': { color: 'common.white', fontSize: '11px', fontWeight: 500, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' },
                                                }}
                                            />
                                        </Tooltip>
                                    )}
                                    {twinDetails.dtrAasId && (
                                        <Tooltip title={t('common:tooltips.copyAasId')}>
                                            <Chip
                                                icon={<FingerprintIcon />}
                                                label={twinDetails.dtrAasId.startsWith('urn:uuid:') ? twinDetails.dtrAasId : `urn:uuid:${twinDetails.dtrAasId}`}
                                                variant="outlined"
                                                size="small"
                                                clickable
                                                onClick={() => handleCopy(twinDetails.dtrAasId.startsWith('urn:uuid:') ? twinDetails.dtrAasId : `urn:uuid:${twinDetails.dtrAasId}`, 'AAS ID')}
                                                sx={{
                                                    maxWidth: '100%',
                                                    backgroundColor: common.white05,
                                                    borderColor: common.white30,
                                                    fontFamily: 'monospace',
                                                    '&:hover': { backgroundColor: common.white10, borderColor: common.white50 },
                                                    '& .MuiChip-icon': { color: 'common.white', flexShrink: 0 },
                                                    '& .MuiChip-label': { color: 'common.white', fontSize: '11px', fontWeight: 500, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' },
                                                }}
                                            />
                                        </Tooltip>
                                    )}
                                    {!twinDetails.dtrAasId && !twinDetails.globalId && (
                                        <Chip label={t('productDetail.productData.noTwinIds')} variant="outlined" size="small" sx={{ color: 'common.white', borderColor: 'common.white', '& .MuiChip-label': { color: '#ffffff !important', fontSize: '12px' } }} />
                                    )}
                                </>
                            ) : (
                                <Chip label={t('productDetail.productData.twinDataUnavailable')} variant="outlined" size="small" sx={{ color: 'common.white', borderColor: 'common.white', '& .MuiChip-label': { color: '#ffffff !important', fontSize: '12px' } }} />
                            )}
                        </Box>

                    </Box>
                </CardContent>
            </Card>

            <Grid2 container spacing={3}>
                {/* Left Column - Part Details */}
                <Grid2 size={{ lg: 6, md: 12, sm: 12 }}>
                    <Card sx={{ 
                        height: '100%',
                        backgroundColor: common.black40,
                        border: `1px solid ${common.white12}`,
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
                                {t('productDetail.productData.partDetails')}
                            </Typography>

                            <Box sx={{ mb: 2.5 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                    <DescriptionIcon sx={{ color: 'primary.main' }} />
                                    <Typography variant="label3" sx={{ color: 'text.primary' }}>
                                        {tCommon('fields.description')}
                                    </Typography>
                                </Box>
                                <Typography variant="body3" sx={{ 
                                    color: 'text.secondary',
                                    fontStyle: part.description ? 'normal' : 'italic'
                                }}>
                                    {part.description || t('productDetail.productData.partInfo.noDescription')}
                                </Typography>
                            </Box>

                            {/* Digital Twin Timestamps */}
                            <>
                                <Divider sx={{ my: 3, borderColor: common.white12 }} />
                                <Typography variant="h6" sx={{ 
                                    color: 'text.primary', 
                                    mb: 3,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1
                                }}>
                                    <AccessTimeIcon sx={{ color: 'primary.main' }} />
                                    {t('productDetail.productData.twinTimestamps.title')}
                                </Typography>

                                {/* Timestamps */}
                                <Grid2 container spacing={2}>
                                    <Grid2 size={{ lg: 6, md: 12, sm: 12, xs: 12 }}>
                                        <Box sx={{ 
                                            textAlign: 'center', 
                                            p: 2, 
                                            backgroundColor: common.white08,
                                            borderRadius: 2,
                                            border: `1px solid ${common.white15}`,
                                            backdropFilter: 'blur(20px)',
                                            boxShadow: `0 8px 32px ${common.black30}`,
                                            transition: 'all 0.3s ease',
                                            '&:hover': {
                                                backgroundColor: common.white12,
                                                border: `1px solid ${common.white25}`,
                                                transform: 'translateY(-2px)',
                                                boxShadow: `0 12px 40px ${common.black40}`
                                            }
                                        }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
                                                <AccessTimeIcon sx={{ color: 'success.main' }} />
                                                <Typography variant="caption1" sx={{ 
                                                    color: 'text.secondary',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.08em',
                                                }}>
                                                    {tCommon('labels.created')}
                                                </Typography>
                                            </Box>
                                            <Typography variant="body2" sx={{ color: 'text.primary' }}>
                                                {isLoadingTwin 
                                                    ? tCommon('actions.loading')
                                                    : twinDetails?.createdDate 
                                                        ? formatDate(twinDetails.createdDate)
                                                        : t('productDetail.productData.twinTimestamps.notYetCreated')
                                                }
                                            </Typography>
                                        </Box>
                                    </Grid2>
                                    <Grid2 size={{ lg: 6, md: 12, sm: 12, xs: 12 }}>
                                        <Box sx={{ 
                                            textAlign: 'center', 
                                            p: 2, 
                                            backgroundColor: common.white08,
                                            borderRadius: 2,
                                            border: `1px solid ${common.white15}`,
                                            backdropFilter: 'blur(20px)',
                                            boxShadow: `0 8px 32px ${common.black30}`,
                                            transition: 'all 0.3s ease',
                                            '&:hover': {
                                                backgroundColor: common.white12,
                                                border: `1px solid ${common.white25}`,
                                                transform: 'translateY(-2px)',
                                                boxShadow: `0 12px 40px ${common.black40}`
                                            }
                                        }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
                                                <UpdateIcon sx={{ color: 'warning.main' }} />
                                                <Typography variant="caption1" sx={{ 
                                                    color: 'text.secondary',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.08em',
                                                }}>
                                                    {tCommon('labels.updated')}
                                                </Typography>
                                            </Box>
                                            <Typography variant="body2" sx={{ color: 'text.primary' }}>
                                                {isLoadingTwin 
                                                    ? tCommon('actions.loading')
                                                    : twinDetails?.modifiedDate 
                                                        ? formatDate(twinDetails.modifiedDate)
                                                        : t('productDetail.productData.twinTimestamps.notYetCreated')
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
                        backgroundColor: common.black40,
                        border: `1px solid ${common.white12}`,
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
                                {t('productDetail.productData.sharing.title')}
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
                                    backgroundColor: common.warning10,
                                    borderRadius: 1,
                                    border: `1px solid ${common.warning30}`
                                }}>
                                    <WarningIcon sx={{ color: 'warning.main', fontSize: 20 }} />
                                    <Typography variant="body2" sx={{ 
                                        color: 'warning.main',
                                        fontWeight: 500,
                                        fontSize: '0.875rem'
                                    }}>
                                        {t('productDetail.productData.sharing.notYetSharedWarning')}
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
                                    backgroundColor: common.white02,
                                    borderRadius: 1,
                                    border: `1px dashed ${common.white12}`
                                }}>
                                    <WifiTetheringErrorIcon sx={{ color: 'text.secondary' }} />
                                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                        {t('productDetail.productData.sharing.noSharingInsights')}
                                    </Typography>
                                </Box>
                            )}
                        </CardContent>
                    </Card>

                    {/* Materials & Dimensions Card */}
                    <Card sx={{ 
                        backgroundColor: common.black40,
                        border: `1px solid ${common.white12}`,
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
                                {t('productDetail.productData.moreInformation.title')}
                            </Typography>
                            
                            <Grid2 container spacing={3}>
                                {/* Materials Chart */}
                                <Grid2 size={{ md: 8, xs: 12 }}>
                                    <Typography variant="label3" sx={{ color: 'text.primary', mb: 2, display: 'block' }}>
                                        {t('productDetail.productData.moreInformation.materials')}
                                    </Typography>
                                    {(part.materials && part.materials.length > 0) ? (
                                        <Box sx={{ 
                                            display: 'flex', 
                                            justifyContent: 'center',
                                            backgroundColor: common.white02,
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
                                            backgroundColor: common.white02,
                                            borderRadius: 1,
                                            border: `1px dashed ${common.white12}`
                                        }}>
                                            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                                {t('productDetail.productData.moreInformation.noMaterials')}
                                            </Typography>
                                        </Box>
                                    )}
                                </Grid2>
                                
                                {/* Physical Properties */}
                                <Grid2 size={{ md: 4, xs: 12 }}>
                                    <Typography variant="label3" sx={{ color: 'text.primary', mb: 2, display: 'block' }}>
                                        {t('productDetail.productData.moreInformation.dimensions')}
                                    </Typography>
                                    <Grid2 container spacing={2}>
                                        <Grid2 size={6}>
                                            <Box sx={{ 
                                                textAlign: 'center', 
                                                p: 1.5, 
                                                backgroundColor: common.white08,
                                                borderRadius: 2,
                                                border: `1px solid ${common.white15}`,
                                                backdropFilter: 'blur(20px)',
                                                boxShadow: `0 8px 32px ${common.black30}`,
                                                transition: 'all 0.3s ease',
                                                '&:hover': {
                                                    backgroundColor: common.white12,
                                                    border: `1px solid ${common.white25}`,
                                                    transform: 'translateY(-2px)',
                                                    boxShadow: `0 12px 40px ${common.black40}`
                                                }
                                            }}>
                                                <Typography variant="caption1" sx={{ 
                                                    color: 'text.secondary',
                                                    display: 'block',
                                                    mb: 0.5
                                                }}>
                                                    {tCommon('fields.width')}
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
                                                backgroundColor: common.white08,
                                                borderRadius: 2,
                                                border: `1px solid ${common.white15}`,
                                                backdropFilter: 'blur(20px)',
                                                boxShadow: `0 8px 32px ${common.black30}`,
                                                transition: 'all 0.3s ease',
                                                '&:hover': {
                                                    backgroundColor: common.white12,
                                                    border: `1px solid ${common.white25}`,
                                                    transform: 'translateY(-2px)',
                                                    boxShadow: `0 12px 40px ${common.black40}`
                                                }
                                            }}>
                                                <Typography variant="caption1" sx={{ 
                                                    color: 'text.secondary',
                                                    display: 'block',
                                                    mb: 0.5
                                                }}>
                                                    {t('productDetail.productData.moreInformation.height')}
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
                                                backgroundColor: common.white08,
                                                borderRadius: 2,
                                                border: `1px solid ${common.white15}`,
                                                backdropFilter: 'blur(20px)',
                                                boxShadow: `0 8px 32px ${common.black30}`,
                                                transition: 'all 0.3s ease',
                                                '&:hover': {
                                                    backgroundColor: common.white12,
                                                    border: `1px solid ${common.white25}`,
                                                    transform: 'translateY(-2px)',
                                                    boxShadow: `0 12px 40px ${common.black40}`
                                                }
                                            }}>
                                                <Typography variant="caption1" sx={{ 
                                                    color: 'text.secondary',
                                                    display: 'block',
                                                    mb: 0.5
                                                }}>
                                                    {t('productDetail.productData.moreInformation.length')}
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
                                                backgroundColor: common.white08,
                                                borderRadius: 2,
                                                border: `1px solid ${common.white15}`,
                                                backdropFilter: 'blur(20px)',
                                                boxShadow: `0 8px 32px ${common.black30}`,
                                                transition: 'all 0.3s ease',
                                                '&:hover': {
                                                    backgroundColor: common.white12,
                                                    border: `1px solid ${common.white25}`,
                                                    transform: 'translateY(-2px)',
                                                    boxShadow: `0 12px 40px ${common.black40}`
                                                }
                                            }}>
                                                <Typography variant="caption1" sx={{ 
                                                    color: 'text.secondary',
                                                    display: 'block',
                                                    mb: 0.5
                                                }}>
                                                    {t('productDetail.productData.moreInformation.weight')}
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
                    backgroundColor: common.black40,
                    border: `1px solid ${common.white12}`,
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
