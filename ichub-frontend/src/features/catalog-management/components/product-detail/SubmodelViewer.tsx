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
import {
    Box,
    Card,
    CardContent,
    Typography,
    Grid2,
    Chip,
    Tooltip,
    Button,
    IconButton
} from '@mui/material';
import {
    Schema as SchemaIcon,
    Visibility as VisibilityIcon,
    DataObject as DataObjectIcon,
    AccessTime as AccessTimeIcon,
    Update as UpdateIcon,
    Tag as TagIcon,
    ChevronLeft as ChevronLeftIcon,
    ChevronRight as ChevronRightIcon,
    Add as AddIcon
} from '@mui/icons-material';
import { CatalogPartTwinDetailsRead } from '../../types/twin-types';
import { parseSemanticId } from '../../../../utils/semantics';

interface SubmodelViewerProps {
    twinDetails: CatalogPartTwinDetailsRead;
    onViewFullDetails?: (submodel: {
        id: string;
        idShort: string;
        semanticId: {
            type: string;
            keys: Array<{
                type: string;
                value: string;
            }>;
        };
    }, submodelId: string, semanticId: string) => void;
    onCreateSubmodel?: () => void;
}

const SubmodelViewer: React.FC<SubmodelViewerProps> = ({ twinDetails, onViewFullDetails, onCreateSubmodel }) => {
    const [currentStartIndex, setCurrentStartIndex] = useState(0);
    const submodelsPerPage = 3;
    const submodelEntries = Object.entries(twinDetails.aspects || {});
    const totalSubmodels = submodelEntries.length;
    const showCarousel = totalSubmodels > 3;

    const handlePrevious = () => {
        setCurrentStartIndex(prev => Math.max(0, prev - submodelsPerPage));
    };

    const handleNext = () => {
        setCurrentStartIndex(prev => Math.min(totalSubmodels - submodelsPerPage, prev + submodelsPerPage));
    };

    const visibleSubmodels = showCarousel 
        ? submodelEntries.slice(currentStartIndex, currentStartIndex + submodelsPerPage)
        : submodelEntries;

    const getStatusLabel = (status: number): { label: string; color: string } => {
        switch (status) {
            case 1:
                return { label: 'Created', color: '#2196f3' }; // Blue
            case 2:
                return { label: 'Available', color: '#ff9800' }; // Orange
            case 3:
                return { label: 'Registered', color: '#4caf50' }; // Green
            default:
                return { label: 'Unknown', color: '#757575' }; // Gray
        }
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

    const getSemanticIdDisplayName = (semanticId: string) => {
        const parsed = parseSemanticId(semanticId);
        return parsed.name;
    };

    const getSemanticIdVersion = (semanticId: string) => {
        const parsed = parseSemanticId(semanticId);
        return parsed.version;
    };

    if (!twinDetails?.aspects || Object.keys(twinDetails.aspects).length === 0) {
        return (
            <Card sx={{
                backgroundColor: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: 2
            }}>
                <CardContent sx={{ p: 3, textAlign: 'center' }}>
                    <SchemaIcon sx={{ color: 'text.secondary', fontSize: 48, mb: 2 }} />
                    <Typography variant="h6" sx={{ color: 'text.primary', mb: 1 }}>
                        No Submodels Available
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        This digital twin doesn't have any submodel aspects available.
                    </Typography>
                </CardContent>
            </Card>
        );
    }

    return (
        <Box sx={{ width: '100%' }}>
            <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                mb: 3 
            }}>
                <Typography variant="h6" sx={{ 
                    color: 'text.primary',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                }}>
                    <SchemaIcon sx={{ color: 'primary.main' }} />
                    Digital Twin Submodels ({totalSubmodels})
                </Typography>
                
                {onCreateSubmodel && (
                    <Button
                        variant="contained"
                        size="small"
                        startIcon={<AddIcon />}
                        onClick={onCreateSubmodel}
                        sx={{
                            background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
                            borderRadius: '10px',
                            textTransform: 'none',
                            fontWeight: 600,
                            fontSize: '11px',
                            py: 0.75,
                            px: 2,
                            boxShadow: '0 4px 16px rgba(25, 118, 210, 0.3)',
                            '&:hover': {
                                background: 'linear-gradient(135deg, #1565c0 0%, #1976d2 100%)',
                                transform: 'translateY(-1px)',
                                boxShadow: '0 6px 20px rgba(25, 118, 210, 0.4)',
                            },
                            transition: 'all 0.2s ease-in-out',
                        }}
                    >
                        New Submodel
                    </Button>
                )}
                
                {showCarousel && (
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary', mr: 1 }}>
                            {currentStartIndex + 1}-{Math.min(currentStartIndex + submodelsPerPage, totalSubmodels)} of {totalSubmodels}
                        </Typography>
                        <IconButton
                            onClick={handlePrevious}
                            disabled={currentStartIndex === 0}
                            size="small"
                            sx={{
                                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                color: 'white',
                                '&:hover': {
                                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                },
                                '&:disabled': {
                                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                    color: 'rgba(255, 255, 255, 0.3)',
                                }
                            }}
                        >
                            <ChevronLeftIcon />
                        </IconButton>
                        <IconButton
                            onClick={handleNext}
                            disabled={currentStartIndex + submodelsPerPage >= totalSubmodels}
                            size="small"
                            sx={{
                                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                color: 'white',
                                '&:hover': {
                                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                },
                                '&:disabled': {
                                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                    color: 'rgba(255, 255, 255, 0.3)',
                                }
                            }}
                        >
                            <ChevronRightIcon />
                        </IconButton>
                    </Box>
                )}
            </Box>

            <Box sx={{ 
                overflow: 'hidden',
                transition: 'all 0.3s ease-in-out'
            }}>
                <Grid2 container spacing={2} sx={{
                    transition: 'transform 0.3s ease-in-out'
                }}>
                    {visibleSubmodels.map(([semanticId, aspect]) => {
                    const registration = aspect.registrations ? Object.values(aspect.registrations)[0] : undefined;

                    return (
                        <Grid2 size={{ xs: 12, md: 6, lg: 4 }} key={semanticId}>
                            <Card sx={{
                                backgroundColor: 'rgba(0, 0, 0, 0.4)',
                                border: '1px solid rgba(255, 255, 255, 0.12)',
                                borderRadius: 2,
                                height: '100%',
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                    transform: 'translateY(-2px)',
                                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)'
                                },
                                display: 'flex',
                                flexDirection: 'column'
                            }}>
                                <CardContent sx={{ p: 2, flex: 1 }}>
                                    {/* Header */}
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                        <DataObjectIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                                        <Typography variant="subtitle2" sx={{ 
                                            color: 'text.primary',
                                            fontWeight: 600,
                                            fontSize: '14px'
                                        }}>
                                            {getSemanticIdDisplayName(semanticId)}
                                        </Typography>
                                    </Box>

                                    {/* Status Chip */}
                                    <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                                        {registration ? (
                                            <Chip
                                                label={getStatusLabel(registration.status).label}
                                                size="small"
                                                sx={{
                                                    backgroundColor: `${getStatusLabel(registration.status).color}20`,
                                                    color: getStatusLabel(registration.status).color,
                                                    fontSize: '11px',
                                                    fontWeight: 600,
                                                    borderRadius: 1.5,
                                                    '& .MuiChip-label': {
                                                        px: 1
                                                    }
                                                }}
                                            />
                                        ) : (
                                            <Chip
                                                label="No Registration"
                                                size="small"
                                                sx={{
                                                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                                    color: 'text.secondary',
                                                    fontSize: '11px'
                                                }}
                                            />
                                        )}
                                        <Chip
                                            icon={<TagIcon />}
                                            label={`v${getSemanticIdVersion(semanticId)}`}
                                            size="small"
                                            sx={{
                                                backgroundColor: 'rgba(25, 118, 210, 0.1)',
                                                color: 'primary.main',
                                                fontSize: '11px',
                                                fontWeight: 600,
                                                borderRadius: 1.5,
                                                '& .MuiChip-label': {
                                                    px: 1
                                                }
                                            }}
                                        />
                                    </Box>

                                    {/* Submodel ID */}
                                    <Box sx={{ mb: 2 }}>
                                        <Typography variant="caption" sx={{ 
                                            color: 'text.secondary',
                                            display: 'block',
                                            fontWeight: 600,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.08em',
                                            fontSize: '10px'
                                        }}>
                                            Submodel ID
                                        </Typography>
                                        <Tooltip title={aspect.submodelId} placement="top">
                                            <Typography variant="body2" sx={{ 
                                                color: 'text.primary',
                                                fontFamily: 'monospace',
                                                fontSize: '11px',
                                                wordBreak: 'break-all',
                                                mt: 0.5
                                            }}>
                                                {aspect.submodelId.length > 30 ? `${aspect.submodelId.substring(0, 30)}...` : aspect.submodelId}
                                            </Typography>
                                        </Tooltip>
                                    </Box>

                                    {/* Registration Timestamps */}
                                    {registration && (
                                        <Box sx={{ mb: 2 }}>
                                            <Typography variant="caption" sx={{ 
                                                color: 'text.secondary',
                                                display: 'block',
                                                mb: 1,
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.08em',
                                                fontSize: '10px'
                                            }}>
                                                Registration Info
                                            </Typography>
                                            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                    <AccessTimeIcon sx={{ color: 'success.main', fontSize: 14 }} />
                                                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                                        {formatDate(registration.createdDate)}
                                                    </Typography>
                                                </Box>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                    <UpdateIcon sx={{ color: 'warning.main', fontSize: 14 }} />
                                                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                                        {formatDate(registration.modifiedDate)}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        </Box>
                                    )}
                                </CardContent>

                                {/* View Submodel Button */}
                                <Box sx={{ p: 2, pt: 0 }}>
                                    {onViewFullDetails && (
                                        <Button
                                            fullWidth
                                            variant="contained"
                                            size="small"
                                            startIcon={<VisibilityIcon />}
                                            onClick={() => {
                                                const displayName = getSemanticIdDisplayName(semanticId);
                                                onViewFullDetails({
                                                    id: aspect.submodelId || `submodel-${semanticId}`,
                                                    idShort: displayName,
                                                    semanticId: {
                                                        type: 'ExternalReference',
                                                        keys: [{
                                                            type: 'GlobalReference',
                                                            value: semanticId
                                                        }]
                                                    }
                                                }, aspect.submodelId, semanticId);
                                            }}
                                            sx={{
                                                backgroundColor: 'rgba(96, 165, 250, 0.9)',
                                                color: '#ffffff',
                                                fontSize: '11px',
                                                textTransform: 'none',
                                                fontWeight: 500,
                                                py: 0.75,
                                                '&:hover': {
                                                    backgroundColor: 'rgba(59, 130, 246, 1)',
                                                },
                                                borderRadius: 1
                                            }}
                                        >
                                            View Submodel
                                        </Button>
                                    )}
                                </Box>
                            </Card>
                        </Grid2>
                    );
                })}
                </Grid2>
            </Box>
        </Box>
    );
};

export default SubmodelViewer;
