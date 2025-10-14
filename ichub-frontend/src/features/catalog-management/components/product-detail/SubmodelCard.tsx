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

import React from 'react';
import {
    Card,
    CardContent,
    CardActions,
    Typography,
    Button,
    Box,
    Chip,
    Tooltip
} from '@mui/material';
import {
    Visibility as VisibilityIcon,
    DataObject as DataObjectIcon
} from '@mui/icons-material';

import { TwinAspectRead } from '../../types/twin-types';

interface SubmodelCardProps {
    semanticId: string;
    aspect: TwinAspectRead;
    assetId: string;
    onViewDetails: (submodel: {
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
}

const SubmodelCard: React.FC<SubmodelCardProps> = ({
    semanticId,
    aspect,
    onViewDetails
}) => {
    // Parse semantic ID to extract version and model name (inspired by SingleTwinResult)
    const parseSemanticId = (semanticId: string) => {
        try {
            // Handle different URN formats:
            // urn:bamm:io.catenax.single_level_bom_as_built:3.0.0#SingleLevelBomAsBuilt
            // urn:samm:io.catenax.generic.digital_product_passport:5.0.0#DigitalProductPassport
            
            const parts = semanticId.split(':');
            if (parts.length >= 4) {
                const lastPart = parts[parts.length - 1]; // "3.0.0#SingleLevelBomAsBuilt"
                const [version, modelName] = lastPart.split('#');
                
                // Extract model name from the namespace if no # separator
                let displayName = modelName || '';
                if (!displayName && parts.length >= 3) {
                    const namespacePart = parts[parts.length - 2]; // "io.catenax.single_level_bom_as_built"
                    const nameParts = namespacePart.split('.');
                    displayName = nameParts[nameParts.length - 1]
                        .split('_')
                        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                        .join(' ');
                }
                
                return {
                    version: version || 'Unknown',
                    name: displayName || 'Unknown Model',
                    namespace: parts.slice(2, -1).join(':')
                };
            }
            
            return {
                version: 'Unknown',
                name: 'Unknown Model',
                namespace: semanticId
            };
        } catch (error) {
            console.warn('Error parsing semantic ID:', error);
            return {
                version: 'Unknown',
                name: 'Unknown Model',
                namespace: semanticId
            };
        }
    };

    const formatSemanticId = (semanticId: string): string => {
        if (semanticId.length > 40) {
            return `${semanticId.substring(0, 37)}...`;
        }
        return semanticId;
    };

    const handleViewDetails = () => {
        const parsedSemanticId = parseSemanticId(semanticId);
        // Create a mock submodel structure that matches the expected interface
        const mockSubmodel = {
            id: aspect.submodelId,
            idShort: parsedSemanticId.name,
            semanticId: {
                type: "ExternalReference",
                keys: [{
                    type: "GlobalReference", 
                    value: semanticId
                }]
            }
        };
        onViewDetails(mockSubmodel, aspect.submodelId, semanticId);
    };

    const parsedSemanticId = parseSemanticId(semanticId);

    return (
        <Card 
            sx={{
                height: '100%',
                maxHeight: '280px',
                backgroundColor: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: 2,
                transition: 'all 0.3s ease',
                '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)'
                },
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            <CardContent sx={{ flex: 1, p: 2 }}>
                {/* Header */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <DataObjectIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                    <Typography 
                        variant="subtitle2" 
                        sx={{ 
                            color: 'text.primary',
                            fontWeight: 600,
                            fontSize: '14px'
                        }}
                    >
                        {parsedSemanticId.name}
                    </Typography>
                </Box>

                {/* Model and Version Chips */}
                <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                    <Chip
                        label={parsedSemanticId.name}
                        size="small"
                        icon={<DataObjectIcon fontSize="small" />}
                        sx={{
                            height: '18px',
                            fontSize: '0.7rem',
                            backgroundColor: 'rgba(76, 175, 80, 0.1)',
                            color: 'success.main',
                            '& .MuiChip-label': {
                                px: 0.5
                            }
                        }}
                    />
                    <Chip
                        label={`v${parsedSemanticId.version}`}
                        size="small"
                        sx={{
                            height: '18px',
                            fontSize: '0.7rem',
                            backgroundColor: 'rgba(25, 118, 210, 0.1)',
                            color: 'primary.main',
                            '& .MuiChip-label': {
                                px: 0.5
                            }
                        }}
                    />
                </Box>

                {/* Details */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Box>
                        <Typography 
                            variant="caption" 
                            sx={{ 
                                color: 'text.secondary',
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                letterSpacing: 0.5,
                                fontSize: '10px'
                            }}
                        >
                            Namespace
                        </Typography>
                        <Tooltip title={parsedSemanticId.namespace} placement="top">
                            <Typography 
                                variant="body2" 
                                sx={{ 
                                    color: 'text.primary',
                                    fontFamily: 'monospace',
                                    fontSize: '11px',
                                    mt: 0.5,
                                    wordBreak: 'break-all'
                                }}
                            >
                                {formatSemanticId(parsedSemanticId.namespace)}
                            </Typography>
                        </Tooltip>
                    </Box>

                    <Box>
                        <Typography 
                            variant="caption" 
                            sx={{ 
                                color: 'text.secondary',
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                letterSpacing: 0.5,
                                fontSize: '10px'
                            }}
                        >
                            Submodel ID
                        </Typography>
                        <Tooltip title={aspect.submodelId} placement="top">
                            <Typography 
                                variant="body2" 
                                sx={{ 
                                    color: 'text.primary',
                                    fontFamily: 'monospace',
                                    fontSize: '11px',
                                    mt: 0.5,
                                    wordBreak: 'break-all'
                                }}
                            >
                                {formatSemanticId(aspect.submodelId)}
                            </Typography>
                        </Tooltip>
                    </Box>
                </Box>
            </CardContent>

            <CardActions sx={{ p: 1.5, pt: 0 }}>
                <Button
                    fullWidth
                    variant="contained"
                    size="small"
                    startIcon={<VisibilityIcon />}
                    onClick={handleViewDetails}
                    sx={{
                        backgroundColor: 'rgba(96, 165, 250, 0.9)',
                        color: '#ffffff',
                        fontSize: '11px',
                        textTransform: 'none',
                        fontWeight: 500,
                        py: 0.5,
                        '&:hover': {
                            backgroundColor: 'rgba(59, 130, 246, 1)',
                        },
                        borderRadius: 1
                    }}
                >
                    View Details
                </Button>
            </CardActions>
        </Card>
    );
};

export default SubmodelCard;