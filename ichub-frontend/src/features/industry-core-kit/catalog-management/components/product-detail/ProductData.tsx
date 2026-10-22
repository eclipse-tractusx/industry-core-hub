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

import { Box, Chip, Snackbar, Alert, Card, CardContent, Divider, Tooltip, IconButton, CircularProgress } from '@mui/material'
import { useTheme } from '@mui/material/styles';
import Grid2 from '@mui/material/Grid2';
import { Typography } from '@mui/material';
import { PartType, StatusVariants } from '@/features/industry-core-kit/catalog-management/types/types';
import { PieChart } from '@mui/x-charts/PieChart';
import WifiTetheringErrorIcon from '@mui/icons-material/WifiTetheringError';
import DescriptionIcon from '@mui/icons-material/Description';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import UpdateIcon from '@mui/icons-material/Update';
import ShareIcon from '@mui/icons-material/Share';
import InfoIcon from '@mui/icons-material/Info';
import WarningIcon from '@mui/icons-material/Warning';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import { SharedPartner } from '@/features/industry-core-kit/catalog-management/types/types';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import SharedTable from './SharedTable';
import SubmodelViewer from './SubmodelViewer';
import DarkSubmodelViewer from './DarkSubmodelViewer';
import ProductActionRail from './ProductActionRail';
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
    onShare: () => void;
}

const ProductData = ({ part, sharedParts, twinDetails: propTwinDetails, onPartUpdated, onShare }: ProductDataProps) => {
    const { palette: { common } } = useTheme();
    const [twinDetails, setTwinDetails] = useState<CatalogPartTwinDetailsRead | null>(propTwinDetails || null);
    const [isLoadingTwin, setIsLoadingTwin] = useState(false);
    const [isUpdatingParent, setIsUpdatingParent] = useState(false);
    const [copySnackbar, setCopySnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });
    const { t } = useTranslation('catalogManagement');
    const { t: tCommon } = useTranslation('common');
    const { t: tNotifications } = useTranslation('notifications');
    const globalAssetId = twinDetails?.globalId
        ? twinDetails.globalId.startsWith('urn:uuid:') ? twinDetails.globalId : `urn:uuid:${twinDetails.globalId}`
        : undefined;
    const aasId = twinDetails?.dtrAasId
        ? twinDetails.dtrAasId.startsWith('urn:uuid:') ? twinDetails.dtrAasId : `urn:uuid:${twinDetails.dtrAasId}`
        : undefined;
    
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
            setCopySnackbar({ open: true, message: tNotifications('copiedToClipboard', { field: fieldName }), severity: 'success' });
        } catch (error) {
            console.error('Failed to copy:', error);
            setCopySnackbar({ open: true, message: tNotifications('failedToCopy', { field: fieldName }), severity: 'error' });
        }
    };

    const renderPartField = (label: string, value?: string, tooltip?: string, wide = false) => {
        const fieldValue = value?.trim();

        return (
            <Box className={`product-attribute${wide ? ' product-attribute-wide' : ''}`}>
                <Typography className="product-attribute-label">{label}</Typography>
                <Box className={`product-attribute-value${fieldValue && tooltip ? ' is-copyable' : ''}`}>
                    <Typography component="span" className="product-attribute-text">
                        {fieldValue || tCommon('status.notDefined')}
                    </Typography>
                    {fieldValue && tooltip && (
                        <Tooltip title={tooltip} arrow>
                            <IconButton size="small" aria-label={tooltip} onClick={() => handleCopy(fieldValue, label)}>
                                <ContentCopyIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    )}
                </Box>
            </Box>
        );
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

    // Sync flow: register both PCF versions as independent twin-aspect submodels.
    // Called by SchemaSelector when PCF_BACKWARD_COMPATIBILITY_SATURN=true and the
    // DualPcfCreationWizard completes. Mirrors two sequential calls to the normal
    // "create submodel" path, one per version.
    const handleDualSchemaComplete = async (
        v9Data: Record<string, unknown>,
        v7Data: Record<string, unknown>,
    ) => {
        if (!twinDetails?.globalId) {
            throw new Error(t('productDetail.productData.messages.twinRequired'));
        }

        const PCF_V9_SEMANTIC_ID = 'urn:samm:io.catenax.pcf:9.0.0#Pcf';
        const PCF_V7_SEMANTIC_ID = 'urn:samm:io.catenax.pcf:7.0.0#Pcf';

        const v9Result = await createTwinAspect(twinDetails.globalId, PCF_V9_SEMANTIC_ID, v9Data);
        if (!v9Result.success) {
            throw new Error(v9Result.message || t('productDetail.productData.messages.submodelCreationFailed'));
        }

        const v7Result = await createTwinAspect(twinDetails.globalId, PCF_V7_SEMANTIC_ID, v7Data);
        if (!v7Result.success) {
            throw new Error(v7Result.message || t('productDetail.productData.messages.submodelCreationFailed'));
        }

        setCopySnackbar({
            open: true,
            message: t('productDetail.productData.messages.submodelCreatedSuccess', { schemaName: 'PCF v9.0.0 + v7.0.0' }),
            severity: 'success',
        });

        if (onPartUpdated) {
            onPartUpdated();
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
                    <Box className="product-data-header">
                        <Box className="product-data-main">
                            <Tooltip title={part.name} arrow placement="top">
                                <Typography variant="h3" sx={{ 
                                    color: 'common.white',
                                    mb: 2,
                                    fontWeight: 700,
                                    fontSize: { xs: '1.4rem', sm: '1.8rem', md: '1.6rem' },
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
                            <Box className="product-attributes">
                                {renderPartField(
                                    tCommon('fields.manufacturerId'),
                                    part.manufacturerId,
                                    tCommon('tooltips.copyManufacturerId')
                                )}
                                {renderPartField(
                                    tCommon('fields.manufacturerPartId'),
                                    part.manufacturerPartId,
                                    tCommon('tooltips.copyManufacturerPartId')
                                )}
                                <Divider className="product-attributes-divider" />
                                {renderPartField(tCommon('fields.category'), part.category)}
                                {renderPartField(
                                    tCommon('fields.bpns'),
                                    part.bpns,
                                    part.bpns ? t('productDetail.productData.tooltips.clickToCopySiteOfOrigin') : undefined
                                )}
                            </Box>
                            <Box className="product-twin-identifiers">
                                <Box className="product-twin-id">
                                    <Box className="product-twin-id-heading">
                                        <AccountTreeIcon aria-hidden="true" />
                                        <Typography className="product-attribute-label">{tCommon('fields.globalAssetId')}</Typography>
                                        {globalAssetId && (
                                            <Tooltip title={tCommon('tooltips.copyGlobalAssetId')} arrow>
                                                <IconButton size="small" aria-label={tCommon('tooltips.copyGlobalAssetId')} onClick={() => handleCopy(globalAssetId, tCommon('fields.globalAssetId'))}>
                                                    <ContentCopyIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        )}
                                    </Box>
                                    <Typography className="product-twin-id-value">
                                        {isLoadingTwin ? t('productDetail.productData.loadingTwinId') : globalAssetId || t('productDetail.productData.noTwinIds')}
                                    </Typography>
                                </Box>
                                <Box className="product-twin-id">
                                    <Box className="product-twin-id-heading">
                                        <FingerprintIcon aria-hidden="true" />
                                        <Typography className="product-attribute-label">{tCommon('fields.aasId')}</Typography>
                                        {aasId && (
                                            <Tooltip title={tCommon('tooltips.copyAasId')} arrow>
                                                <IconButton size="small" aria-label={tCommon('tooltips.copyAasId')} onClick={() => handleCopy(aasId, tCommon('fields.aasId'))}>
                                                    <ContentCopyIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        )}
                                    </Box>
                                    <Typography className="product-twin-id-value">
                                        {isLoadingTwin ? t('productDetail.productData.loadingTwinId') : aasId || t('productDetail.productData.noTwinIds')}
                                    </Typography>
                                </Box>
                            </Box>
                        </Box>
                        <ProductActionRail
                            part={part}
                            twinDetails={twinDetails}
                            isLoadingTwin={isLoadingTwin}
                            isRegistering={isUpdatingParent}
                            onRegister={handleRegisterTwin}
                            onShare={onShare}
                            onCopy={handleCopy}
                        />
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
                onDualSchemaComplete={handleDualSchemaComplete}
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
