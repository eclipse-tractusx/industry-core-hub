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

import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Box,
    Typography,
    CircularProgress,
    Alert,
    Button,
    IconButton,
    Paper,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Chip,
    createTheme,
    ThemeProvider,
    alpha
} from '@mui/material';
import {
    Close as CloseIcon,
    ExpandMore as ExpandMoreIcon,
    DataObject as DataObjectIcon,
    Schema as SchemaIcon,
    Info as InfoIcon,
    ViewModule as ViewModuleIcon,
    ContentCopy as ContentCopyIcon,
    Code as CodeIcon,
    Check as CheckIcon
} from '@mui/icons-material';
import { fetchSubmodelContent } from '../../api';
import JsonViewer from '../../../../components/general/JsonViewer';

interface SubmodelContent {
    [key: string]: unknown;
}

interface DarkSubmodelViewerProps {
    open: boolean;
    onClose: () => void;
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
    };
    submodelId: string;
    semanticId: string;
}

// Dark theme for the dialog
const darkTheme = createTheme({
    palette: {
        mode: 'dark',
        primary: {
            main: '#90caf9',
        },
        secondary: {
            main: '#f48fb1',
        },
        background: {
            default: '#121212',
            paper: '#1e1e1e',
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
                    backgroundColor: '#1e1e1e',
                    backgroundImage: 'none',
                    color: '#ffffff',
                },
            },
        },
        MuiAccordion: {
            styleOverrides: {
                root: {
                    backgroundColor: alpha('#000000', 0.2),
                    '&:before': {
                        display: 'none',
                    },
                },
            },
        },
    },
});

const DarkSubmodelViewer: React.FC<DarkSubmodelViewerProps> = ({
    open,
    onClose,
    submodel,
    submodelId,
    semanticId
}) => {
    const [submodelContent, setSubmodelContent] = useState<SubmodelContent | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'structured' | 'json'>('structured');
    const [copiedItems, setCopiedItems] = useState<Set<string>>(new Set());

    const handleCopyValue = async (value: string) => {
        try {
            await navigator.clipboard.writeText(value);
            setCopiedItems(prev => new Set(prev).add(value));
            // Remove the checkmark after 2 seconds
            setTimeout(() => {
                setCopiedItems(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(value);
                    return newSet;
                });
            }, 2000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
    };

    const loadSubmodelContent = async () => {
        if (!semanticId || !submodelId) return;
        
        setIsLoading(true);
        setError(null);
        try {
            
            const content = await fetchSubmodelContent(semanticId, submodelId);
            
            setSubmodelContent(content);
        } catch (err) {
            console.error('Failed to refresh submodel content:', err);
            setError('Failed to load submodel content');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const loadContent = async () => {
            if (!open || !semanticId || !submodelId) return;
            
            setIsLoading(true);
            setError(null);
            try {
                
                const content = await fetchSubmodelContent(semanticId, submodelId);
                
                setSubmodelContent(content);
            } catch (err) {
                console.error('Failed to load submodel content:', err);
                setError('Failed to load submodel content');
            } finally {
                setIsLoading(false);
            }
        };

        if (open) {
            loadContent();
        } else {
            // Reset state when dialog closes
            setSubmodelContent(null);
            setError(null);
        }
    }, [open, semanticId, submodelId]);

    const renderJsonData = (data: unknown, depth = 0): React.ReactNode => {
        if (data === null || data === undefined) {
            return <Typography variant="body2" color="text.secondary">null</Typography>;
        }

        if (typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean') {
            return (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography 
                        variant="body2" 
                        component="span"
                        sx={{ 
                            color: typeof data === 'string' ? '#4fc3f7' : 
                                  typeof data === 'number' ? '#81c784' : 
                                  '#f48fb1',
                            fontFamily: 'monospace'
                        }}
                    >
                        {String(data)}
                    </Typography>
                    <IconButton
                        size="small"
                        onClick={() => handleCopyValue(String(data))}
                        sx={{ 
                            p: 0.5, 
                            color: copiedItems.has(String(data)) ? 'success.main' : 'text.secondary',
                            '&:hover': { color: 'primary.main' }
                        }}
                    >
                        {copiedItems.has(String(data)) ? 
                            <CheckIcon fontSize="small" /> : 
                            <ContentCopyIcon fontSize="small" />
                        }
                    </IconButton>
                </Box>
            );
        }

        if (Array.isArray(data)) {
            return (
                <Box sx={{ ml: depth * 2 }}>
                    {data.map((item, index) => (
                        <Box key={index} sx={{ mb: 1 }}>
                            <Typography variant="body2" color="primary" component="span">
                                [{index}]:
                            </Typography>
                            <Box sx={{ ml: 2 }}>
                                {renderJsonData(item, depth + 1)}
                            </Box>
                        </Box>
                    ))}
                </Box>
            );
        }

        if (typeof data === 'object') {
            const obj = data as Record<string, unknown>;
            return (
                <Box sx={{ ml: depth * 2 }}>
                    {Object.entries(obj).map(([key, value]) => (
                        <Accordion key={key} sx={{ mb: 1 }}>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <DataObjectIcon fontSize="small" />
                                    <Typography variant="subtitle2">{key}</Typography>
                                    <Chip
                                        label={typeof value}
                                        size="small"
                                        variant="outlined"
                                        sx={{ ml: 1 }}
                                    />
                                </Box>
                            </AccordionSummary>
                            <AccordionDetails>
                                {renderJsonData(value, depth + 1)}
                            </AccordionDetails>
                        </Accordion>
                    ))}
                </Box>
            );
        }

        return <Typography variant="body2">Unknown data type</Typography>;
    };

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
                <DialogTitle sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    borderBottom: 1,
                    borderColor: 'divider'
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <SchemaIcon />
                        <Typography variant="h6">Submodel Viewer</Typography>
                    </Box>
                    <IconButton onClick={onClose} color="inherit">
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>

                <DialogContent sx={{ 
                    p: 3, 
                    overflow: 'auto', // Enable scroll here
                    height: 'calc(100vh - 140px)', // Account for header and footer
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    {/* Submodel Information Header */}
                    <Paper sx={{ p: 2, mb: 3, mt: 2, backgroundColor: alpha('#90caf9', 0.1) }}>
                        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <InfoIcon />
                            {submodel.idShort}
                        </Typography>
                        
                        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'auto 1fr' }}>
                            <Typography variant="body2" color="text.secondary">Submodel ID:</Typography>
                            <Typography variant="body2" fontFamily="monospace">{submodel.id}</Typography>
                            
                            <Typography variant="body2" color="text.secondary">Semantic ID:</Typography>
                            <Typography variant="body2" fontFamily="monospace">
                                {submodel.semanticId.keys.map(key => key.value).join(' / ')}
                            </Typography>
                            
                             {/* Asset Id
                            <Typography variant="body2" color="text.secondary">Asset ID:</Typography>
                            <Typography variant="body2" fontFamily="monospace">-</Typography>
                            */}
                        </Box>
                    </Paper>

                    {/* Content Section */}
                    <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <DataObjectIcon />
                                JSON Data
                            </Typography>
                            
                            {/* View Toggle Button */}
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                <Button
                                    variant={viewMode === 'structured' ? 'contained' : 'outlined'}
                                    size="small"
                                    startIcon={<ViewModuleIcon />}
                                    onClick={() => setViewMode('structured')}
                                    sx={{ textTransform: 'none' }}
                                >
                                    Structured
                                </Button>
                                <Button
                                    variant={viewMode === 'json' ? 'contained' : 'outlined'}
                                    size="small"
                                    startIcon={<CodeIcon />}
                                    onClick={() => setViewMode('json')}
                                    sx={{ textTransform: 'none' }}
                                >
                                    JSON
                                </Button>
                            </Box>
                        </Box>

                        {isLoading && (
                            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                                <CircularProgress />
                            </Box>
                        )}

                        {error && (
                            <Alert severity="error" sx={{ mb: 2 }}>
                                {error}
                            </Alert>
                        )}

                        {!isLoading && !error && submodelContent && (
                            <Paper sx={{ 
                                p: 0, 
                                backgroundColor: alpha('#000000', 0.2), 
                                flex: 1,
                                overflow: 'hidden',
                                display: 'flex',
                                flexDirection: 'column'
                            }}>
                                {viewMode === 'structured' ? (
                                    <Box sx={{ 
                                        p: 2, 
                                        flex: 1,
                                        overflow: 'auto'
                                    }}>
                                        {renderJsonData(submodelContent)}
                                    </Box>
                                ) : (
                                    <JsonViewer 
                                        data={submodelContent as Record<string, unknown>} 
                                        filename={`submodel-${submodel.idShort || 'data'}.json`}
                                        height="100%"
                                    />
                                )}
                            </Paper>
                        )}

                        {!isLoading && !error && !submodelContent && (
                            <Paper sx={{ p: 3, textAlign: 'center', backgroundColor: alpha('#000000', 0.2) }}>
                                <Typography color="text.secondary">
                                    No submodel data available or data could not be retrieved.
                                </Typography>
                            </Paper>
                        )}
                    </Box>
                </DialogContent>

                <DialogActions sx={{ p: 3, borderTop: 1, borderColor: 'divider' }}>
                    <Button onClick={onClose} variant="outlined">
                        Close
                    </Button>
                    <Button 
                        onClick={loadSubmodelContent} 
                        variant="contained" 
                        disabled={isLoading}
                        sx={{
                            backgroundColor: '#1976d2',
                            color: '#ffffff',
                            '&:hover': {
                                backgroundColor: '#1565c0',
                            },
                            '&:disabled': {
                                backgroundColor: 'rgba(25, 118, 210, 0.3)',
                                color: 'rgba(255, 255, 255, 0.5)',
                            },
                            borderRadius: 1,
                            textTransform: 'none',
                            fontWeight: 500,
                        }}
                    >
                        {isLoading ? 'Loading...' : 'Refresh'}
                    </Button>
                </DialogActions>
            </Dialog>
        </ThemeProvider>
    );
};

export default DarkSubmodelViewer;
