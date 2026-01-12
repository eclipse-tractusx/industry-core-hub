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
    Dialog,
    DialogContent,
    DialogActions,
    Box,
    Typography,
    IconButton,
    Grid2,
    Button,
    createTheme,
    ThemeProvider,
    alpha,
    Container,
    Toolbar,
    AppBar
} from '@mui/material';
import {
    Close as CloseIcon,
    ViewModule as ViewModuleIcon,
    Schema as SchemaIcon,
    Add as AddIcon
} from '@mui/icons-material';
import { CatalogPartTwinDetailsRead } from '@/features/industry-core-kit/catalog-management/types/twin-types';
import SubmodelCard from './SubmodelCard';
import DarkSubmodelViewer from './DarkSubmodelViewer';
import { useEscapeDialog } from '@/hooks/useEscapeKey';

interface SubmodelsGridDialogProps {
    open: boolean;
    onClose: () => void;
    twinDetails: CatalogPartTwinDetailsRead | null;
    partName?: string;
    onCreateSubmodel?: () => void;
}

// Dark theme for the dialog - matching application patterns
const darkTheme = createTheme({
    palette: {
        mode: 'dark',
        primary: {
            main: '#60a5fa',
        },
        secondary: {
            main: '#f48fb1',
        },
        background: {
            default: '#121212',
            paper: 'rgba(0, 0, 0, 0.4)',
        },
        text: {
            primary: '#ffffff',
            secondary: '#b3b3b3',
        },
    },
    components: {
        MuiDialog: {
            styleOverrides: {
                paper: {
                    backgroundColor: '#121212',
                    backgroundImage: 'none',
                    color: '#ffffff',
                },
            },
        },
        MuiAppBar: {
            styleOverrides: {
                root: {
                    backgroundColor: 'rgba(0, 0, 0, 0.4)',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
                },
            },
        },
    },
});

const SubmodelsGridDialog: React.FC<SubmodelsGridDialogProps> = ({
    open,
    onClose,
    twinDetails,
    partName,
    onCreateSubmodel
}) => {
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
    const [submodelViewerOpen, setSubmodelViewerOpen] = useState(false);

    useEscapeDialog(onClose, open);

    const handleViewSubmodelDetails = (
        submodel: {
            id: string;
            idShort: string;
            semanticId: {
                type: string;
                keys: Array<{
                    type: string;
                    value: string;
                }>;
            };
        },
        submodelId: string,
        semanticId: string
    ) => {
        setSelectedSubmodel(submodel);
        setSelectedSubmodelId(submodelId);
        setSelectedSemanticId(semanticId);
        setSubmodelViewerOpen(true);
    };

    const handleCloseSubmodelViewer = () => {
        setSubmodelViewerOpen(false);
        setSelectedSubmodel(null);
        setSelectedSubmodelId('');
        setSelectedSemanticId('');
    };

    const submodelsCount = twinDetails?.aspects ? Object.keys(twinDetails.aspects).length : 0;

    return (
        <ThemeProvider theme={darkTheme}>
            <Dialog
                open={open}
                onClose={onClose}
                fullScreen
                PaperProps={{
                    sx: {
                        backgroundColor: 'background.paper',
                    }
                }}
            >
                {/* Custom App Bar */}
                <AppBar position="relative" elevation={0}>
                    <Toolbar sx={{ px: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                            <ViewModuleIcon sx={{ fontSize: 28 }} />
                            <Box>
                                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                    Digital Twin Submodels
                                </Typography>
                                <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                                    {partName ? `${partName} • ` : ''}{submodelsCount} submodel{submodelsCount !== 1 ? 's' : ''} available
                                </Typography>
                            </Box>
                        </Box>
                        <IconButton 
                            onClick={onClose} 
                            color="inherit"
                            sx={{ 
                                p: 1.5,
                                '&:hover': {
                                    backgroundColor: alpha('#ffffff', 0.1)
                                }
                            }}
                        >
                            <CloseIcon />
                        </IconButton>
                    </Toolbar>
                </AppBar>

                <DialogContent sx={{ 
                    p: 0,
                    backgroundColor: '#121212',
                    height: 'calc(100vh - 140px)',
                    overflow: 'auto'
                }}>
                    <Container maxWidth="xl" sx={{ py: 3, px: 3, height: '100%' }}>
                        {!twinDetails?.aspects || Object.keys(twinDetails.aspects).length === 0 ? (
                            // Empty State
                            <Box sx={{ 
                                display: 'flex', 
                                flexDirection: 'column', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                minHeight: '400px',
                                textAlign: 'center',
                                gap: 3
                            }}>
                                <SchemaIcon sx={{ 
                                    fontSize: 80, 
                                    color: alpha('#ffffff', 0.3) 
                                }} />
                                <Box>
                                    <Typography variant="h5" sx={{ 
                                        color: 'text.primary', 
                                        mb: 1,
                                        fontWeight: 500
                                    }}>
                                        No Submodels Available
                                    </Typography>
                                    <Typography variant="body1" sx={{ 
                                        color: 'text.secondary',
                                        maxWidth: 400
                                    }}>
                                        This digital twin doesn't have any submodel aspects available for viewing.
                                    </Typography>
                                </Box>
                            </Box>
                        ) : (
                            // Submodels Grid
                            <Grid2 container spacing={3}>
                                {/* Add Submodel Card */}
                                {onCreateSubmodel && (
                                    <Grid2 
                                        size={{ xs: 12, sm: 6, md: 4, lg: 3 }}
                                    >
                                        <Box
                                            onClick={onCreateSubmodel}
                                            sx={{
                                                height: '100%',
                                                minHeight: '280px',
                                                backgroundColor: 'rgba(25, 118, 210, 0.1)',
                                                border: '2px dashed rgba(66, 165, 245, 0.5)',
                                                borderRadius: 2,
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: 2,
                                                cursor: 'pointer',
                                                transition: 'all 0.3s ease',
                                                '&:hover': {
                                                    backgroundColor: 'rgba(25, 118, 210, 0.15)',
                                                    borderColor: 'rgba(66, 165, 245, 0.8)',
                                                    transform: 'translateY(-4px)',
                                                    boxShadow: '0 8px 24px rgba(25, 118, 210, 0.3)',
                                                },
                                            }}
                                        >
                                            <Box
                                                sx={{
                                                    width: 80,
                                                    height: 80,
                                                    borderRadius: '50%',
                                                    backgroundColor: 'rgba(66, 165, 245, 0.2)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    transition: 'all 0.3s ease',
                                                }}
                                            >
                                                <AddIcon sx={{ fontSize: 48, color: '#42a5f5' }} />
                                            </Box>
                                            <Typography
                                                variant="h6"
                                                sx={{
                                                    color: 'primary.main',
                                                    fontWeight: 600,
                                                    textAlign: 'center',
                                                }}
                                            >
                                                Add Submodel
                                            </Typography>
                                            <Typography
                                                variant="body2"
                                                sx={{
                                                    color: 'text.secondary',
                                                    textAlign: 'center',
                                                    px: 2,
                                                }}
                                            >
                                                Create a new submodel aspect
                                            </Typography>
                                        </Box>
                                    </Grid2>
                                )}
                                {Object.entries(twinDetails.aspects).map(([semanticId, aspect]) => (
                                    <Grid2 
                                        key={semanticId} 
                                        size={{ xs: 12, sm: 6, md: 4, lg: 3 }}
                                    >
                                        <SubmodelCard
                                            semanticId={semanticId}
                                            aspect={aspect}
                                            assetId={twinDetails.globalId}
                                            onViewDetails={handleViewSubmodelDetails}
                                        />
                                    </Grid2>
                                ))}
                            </Grid2>
                        )}
                    </Container>
                </DialogContent>

                {/* Footer Actions */}
                <DialogActions sx={{ 
                    p: 3, 
                    borderTop: 1, 
                    borderColor: 'divider',
                    backgroundColor: '#1e1e1e'
                }}>
                    <Typography variant="body2" sx={{ 
                        color: 'text.secondary', 
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1
                    }}>
                        <SchemaIcon fontSize="small" />
                        {submodelsCount} digital twin submodel{submodelsCount !== 1 ? 's' : ''} displayed
                    </Typography>
                    <Button 
                        onClick={onClose} 
                        variant="outlined"
                        sx={{
                            textTransform: 'none',
                            fontWeight: 500,
                            px: 3
                        }}
                    >
                        Close
                    </Button>
                </DialogActions>

                {/* Individual Submodel Viewer Dialog */}
                {selectedSubmodel && (
                    <DarkSubmodelViewer
                        open={submodelViewerOpen}
                        onClose={handleCloseSubmodelViewer}
                        submodel={selectedSubmodel}
                        submodelId={selectedSubmodelId}
                        semanticId={selectedSemanticId}
                    />
                )}
            </Dialog>
        </ThemeProvider>
    );
};

export default SubmodelsGridDialog;