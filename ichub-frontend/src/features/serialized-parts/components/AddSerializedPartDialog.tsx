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

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@mui/material';

import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import SpeedIcon from '@mui/icons-material/Speed';
import SettingsIcon from '@mui/icons-material/Settings';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import TextField from '@mui/material/TextField';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';

import PageNotification from '../../../components/general/PageNotification';
import { addSerializedPart } from '../api';
import { fetchPartners } from '../../partner-management/api';
import { PartnerInstance } from '../../partner-management/types/types';
import { PartnerAutocomplete } from '../../partner-management/components';
import { AxiosError } from '../../../types/axiosError';
import { getBpn } from '../../../services/EnvironmentService';
import { useEscapeDialog } from '../../../hooks/useEscapeKey';
import { fetchCatalogParts } from '../../catalog-management/api';
import { ApiPartData } from '../../catalog-management/types/types';
import Autocomplete from '@mui/material/Autocomplete';

interface AddSerializedPartDialogProps {
    open: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

const AddSerializedPartDialog = ({ open, onClose, onSuccess }: AddSerializedPartDialogProps) => {
    const manufacturerId = getBpn();
    const navigate = useNavigate();
    
    // Step management for three-step process
    const [currentStep, setCurrentStep] = useState<'serialized-part' | 'choice' | 'catalog-part'>('serialized-part');
    
    const [formData, setFormData] = useState({
        businessPartnerNumber: '',
        manufacturerId: manufacturerId,
        manufacturerPartId: '',
        partInstanceId: '',
        van: '',
        customerPartId: '',
    });

    // Catalog part form data for second step
    const [catalogPartData, setCatalogPartData] = useState({
        name: '',
        category: '',
        bpns: '',
    });

    const [showVanField, setShowVanField] = useState(false);
    const [showCustomerPartIdField, setShowCustomerPartIdField] = useState(false);
    const [partners, setPartners] = useState<PartnerInstance[]>([]);
    const [selectedPartner, setSelectedPartner] = useState<PartnerInstance | null>(null);
    const [catalogParts, setCatalogParts] = useState<ApiPartData[]>([]);
    const [manufacturerPartIdOptions, setManufacturerPartIdOptions] = useState<string[]>([]);

    const [notification, setNotification] = useState<{
        open: boolean;
        severity: 'success' | 'error';
        title: string;
    } | null>(null);

    useEscapeDialog(onClose, open);

    useEffect(() => {
        const loadPartners = async () => {
            try {
                const partnersData = await fetchPartners();
                setPartners(partnersData);
            } catch (error) {
                console.error('Failed to fetch partners:', error);
            }
        };

        const loadCatalogParts = async () => {
            try {
                const catalogPartsData = await fetchCatalogParts();
                setCatalogParts(catalogPartsData);
                
                // Extract unique manufacturer part IDs for autocomplete
                const uniquePartIds = Array.from(
                    new Set(catalogPartsData.map(part => part.manufacturerPartId))
                ).filter(partId => partId.trim() !== '');
                setManufacturerPartIdOptions(uniquePartIds);
            } catch (error) {
                console.error('Failed to fetch catalog parts:', error);
            }
        };

        loadPartners();
        loadCatalogParts();
    }, []);

    // Reset form when dialog opens or closes
    useEffect(() => {
        if (open) {
            // Reset form when opening dialog
            setCurrentStep('serialized-part');
            setFormData({
                businessPartnerNumber: '',
                manufacturerId: manufacturerId,
                manufacturerPartId: '',
                partInstanceId: '',
                van: '',
                customerPartId: '',
            });
            setCatalogPartData({
                name: '',
                category: '',
                bpns: '',
            });
            setShowVanField(false);
            setShowCustomerPartIdField(false);
            setSelectedPartner(null);
            setNotification(null);
        } else if (!open) {
            // Reset form when closing dialog
            setCurrentStep('serialized-part');
            setFormData({
                businessPartnerNumber: '',
                manufacturerId: manufacturerId,
                manufacturerPartId: '',
                partInstanceId: '',
                van: '',
                customerPartId: '',
            });
            setCatalogPartData({
                name: '',
                category: '',
                bpns: '',
            });
            setShowVanField(false);
            setShowCustomerPartIdField(false);
            setSelectedPartner(null);
            setNotification(null);
        }
    }, [open, manufacturerId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validate that manufacturerPartId is not empty
        if (!formData.manufacturerPartId.trim()) {
            setNotification({
                open: true,
                severity: 'error',
                title: 'Manufacturer Part ID is required and cannot be empty',
            });
            setTimeout(() => setNotification(null), 6000);
            return;
        }
        
        // Check if catalog part exists for this manufacturer (strict check)
        const existsCatalogPair = catalogParts.some(
            (p) => p.manufacturerPartId === formData.manufacturerPartId && p.manufacturerId === formData.manufacturerId
        );
        
        try {
            await addSerializedPart(formData, false); // First try without auto-generation
            setNotification({
                open: true,
                severity: 'success',
                title: 'Serialized part created successfully',
            });
            
            // Call onSuccess callback to refresh the table
            if (onSuccess) {
                onSuccess();
            }
            
            // Close dialog after short delay
            setTimeout(() => {
                onClose();
            }, 1500);
        } catch (err) {
            console.error("Error adding serialized part:", err);
            const error = err as AxiosError;
            const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
            
            // Check if this is a catalog part not found error
            if (errorMessage.includes('Catalog part') && errorMessage.includes('not found')) {
                // Switch to choice step first
                setCurrentStep('choice');
                setNotification({
                    open: true,
                    severity: 'error',
                    title: 'Catalog part not found. How would you like to create it?',
                });
            } else {
                // Other errors
                setNotification({
                    open: true,
                    severity: 'error',
                    title: `Failed to create serialized part: ${errorMessage}`,
                });
            }
            // If backend says not found but we had a matching pair locally, treat as error, not creation flow
            if (errorMessage.includes('Catalog part') && errorMessage.includes('not found') && existsCatalogPair) {
                setNotification({
                    open: true,
                    severity: 'error',
                    title: 'Selected catalog part could not be found on server. Please refresh catalog or try again.',
                });
            } else {
                setNotification({
                    open: true,
                    severity: 'error',
                    title: `Failed to create serialized part: ${errorMessage}`,
                });
            }
            setTimeout(() => setNotification(null), 6000);
        }
    };

    const handleCatalogPartSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // Merge serialized part data with catalog part data for auto-generation
            const completeFormData = {
                ...formData,
                // Include catalog part details for auto-generation
                name: catalogPartData.name,
                category: catalogPartData.category,
                bpns: catalogPartData.bpns,
            };
            
            // Now try with auto-generation enabled
            await addSerializedPart(completeFormData, true);
            setNotification({
                open: true,
                severity: 'success',
                title: 'Catalog part and serialized part created successfully',
            });
            
            // Call onSuccess callback to refresh the table
            if (onSuccess) {
                onSuccess();
            }
            
            // Close dialog after short delay
            setTimeout(() => {
                onClose();
            }, 1500);
        } catch (err) {
            console.error("Error creating catalog part and serialized part:", err);
            const error = err as AxiosError;
            const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
            setNotification({
                open: true,
                severity: 'error',
                title: `Failed to create catalog part: ${errorMessage}`,
            });
            setTimeout(() => setNotification(null), 6000);
        }
    };

    return (
        <Dialog 
            open={open} 
            onClose={onClose}
            maxWidth="md" 
            fullWidth
            PaperProps={{
                sx: {
                    backgroundColor: 'background.paper',
                    '& .MuiDialogContent-root': {
                        backgroundColor: 'background.paper',
                    }
                }
            }}
        >
            <PageNotification notification={notification} />
            <DialogTitle 
                sx={{ 
                    m: 0, 
                    p: 3,
                    backgroundColor: 'primary.main',
                    color: 'primary.contrastText',
                    fontSize: '1.25rem',
                    fontWeight: 600
                }}
            >
                {currentStep === 'serialized-part' 
                    ? 'Add a serialized part' 
                    : currentStep === 'choice'
                    ? 'Choose catalog part creation method'
                    : 'Create catalog part'}
            </DialogTitle>
            <IconButton
                aria-label="close"
                onClick={onClose}
                sx={(theme) => ({
                    position: 'absolute',
                    right: 21,
                    top: 21,
                    color: theme.palette.grey[500],
                    zIndex: 1,
                    '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    }
                })}
                >
                <CloseIcon />
            </IconButton>
            <DialogContent sx={{ 
                p: 3, 
                backgroundColor: 'background.paper',
                '& .MuiTextField-root': {
                    backgroundColor: 'background.default',
                    '& .MuiOutlinedInput-root': {
                        backgroundColor: 'background.default',
                        '& fieldset': {
                            borderColor: 'divider',
                        },
                        '&:hover fieldset': {
                            borderColor: 'primary.main',
                        },
                        '&.Mui-focused fieldset': {
                            borderColor: 'primary.main',
                        }
                    }
                },
                '& .MuiAutocomplete-root': {
                    '& .MuiOutlinedInput-root': {
                        backgroundColor: 'background.default',
                        '& fieldset': {
                            borderColor: 'divider',
                        },
                        '&:hover fieldset': {
                            borderColor: 'primary.main',
                        },
                        '&.Mui-focused fieldset': {
                            borderColor: 'primary.main',
                        }
                    }
                }
            }}>
                {currentStep === 'serialized-part' ? (
                    // Step 1: Serialized Part Form
                    <Grid container spacing={3}>
                        <Grid item xs={12}>
                            <Box sx={{ 
                                display: 'flex', 
                                flexWrap: 'wrap', 
                                gap: 1.5,
                                mb: 1
                            }}>
                                <Chip
                                    label={`Manufacturer ID: ${formData.manufacturerId}`}
                                    variant="filled"
                                    color="secondary"
                                    size="medium"
                                    sx={{
                                        backgroundColor: 'secondary.main',
                                        color: 'secondary.contrastText',
                                        maxWidth: '100%',
                                        '& .MuiChip-label': {
                                            fontSize: '0.875rem',
                                            px: 1,
                                            fontWeight: 500,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                            maxWidth: '300px'
                                        }
                                    }}
                                />
                            </Box>
                        </Grid>
                        <Grid item xs={12}>
                            <Autocomplete
                                options={manufacturerPartIdOptions}
                                value={formData.manufacturerPartId}
                                onChange={(_, newValue) => setFormData({ ...formData, manufacturerPartId: newValue || '' })}
                                onInputChange={(_, newInputValue) => setFormData({ ...formData, manufacturerPartId: newInputValue || '' })}
                                freeSolo
                                fullWidth
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="Manufacturer Part ID"
                                        required
                                        variant="outlined"
                                        size="medium"
                                        placeholder="Select or enter a manufacturer part ID"
                                        helperText="Select from existing catalog parts or enter a new one"
                                    />
                                )}
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        backgroundColor: 'background.default',
                                        '& fieldset': {
                                            borderColor: 'divider',
                                        },
                                        '&:hover fieldset': {
                                            borderColor: 'primary.main',
                                        },
                                        '&.Mui-focused fieldset': {
                                            borderColor: 'primary.main',
                                        }
                                    }
                                }}
                            />
                        </Grid>
                        
                        <Grid item xs={12}>
                            <Typography variant="h6" gutterBottom sx={{ 
                                mt: 0, 
                                mb: 1, 
                                color: 'text.primary',
                                fontSize: '1.1rem',
                                fontWeight: 500
                            }}>
                                Sharing Partner
                            </Typography>
                            <PartnerAutocomplete
                                value={formData.businessPartnerNumber}
                                availablePartners={partners}
                                selectedPartner={selectedPartner}
                                isLoadingPartners={false}
                                partnersError={false}
                                hasError={false}
                                label="Select Sharing Partner"
                                placeholder="Select a partner to share with"
                                required={true}
                                onBpnlChange={(bpnl) => setFormData({ ...formData, businessPartnerNumber: bpnl })}
                                onPartnerChange={setSelectedPartner}
                            />
                        </Grid>

                        <Grid item xs={12}>
                            <TextField
                                label="Part Instance ID"
                                value={formData.partInstanceId}
                                onChange={(e) => setFormData({ ...formData, partInstanceId: e.target.value })}
                                fullWidth
                                required
                                variant="outlined"
                                size="medium"
                            />
                        </Grid>

                        <Grid item xs={12}>
                            <Box sx={{ mt: 2 }}>
                                <Typography variant="h6" gutterBottom sx={{ 
                                    mb: 2, 
                                    color: 'text.primary',
                                    fontSize: '1.1rem',
                                    fontWeight: 500
                                }}>
                                    Optional Fields
                                </Typography>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={showVanField}
                                            onChange={(e) => setShowVanField(e.target.checked)}
                                            color="primary"
                                        />
                                    }
                                    label="Include VAN field"
                                    sx={{ mb: 2, color: 'text.primary' }}
                                />
                                
                                {showVanField && (
                                    <TextField
                                        label="VAN"
                                        value={formData.van}
                                        onChange={(e) => setFormData({ ...formData, van: e.target.value })}
                                        fullWidth
                                        variant="outlined"
                                        size="medium"
                                        sx={{ mb: 2 }}
                                    />
                                )}
                                
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={showCustomerPartIdField}
                                            onChange={(e) => setShowCustomerPartIdField(e.target.checked)}
                                            color="primary"
                                        />
                                    }
                                    label="Include Customer Part ID field"
                                    sx={{ mb: 2, color: 'text.primary' }}
                                />
                                
                                {showCustomerPartIdField && (
                                    <TextField
                                        label="Customer Part ID"
                                        value={formData.customerPartId}
                                        onChange={(e) => setFormData({ ...formData, customerPartId: e.target.value })}
                                        fullWidth
                                        variant="outlined"
                                        size="medium"
                                    />
                                )}
                            </Box>
                        </Grid>
                    </Grid>
                ) : currentStep === 'choice' ? (
                    // Step 2: Choice Step - How to create catalog part
                    <Grid container spacing={3}>
                        <Grid item xs={12}>
                            <Typography variant="body1" sx={{ mb: 3, color: 'text.secondary' }}>
                                The catalog part <strong>{formData.manufacturerId}/{formData.manufacturerPartId}</strong> was not found. 
                                How would you like to create it?
                            </Typography>
                        </Grid>
                        
                        <Grid item xs={12}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                {/* Quick Creation Card */}
                                <Card
                                    onClick={() => setCurrentStep('catalog-part')}
                                    sx={{
                                        position: 'relative',
                                        cursor: 'pointer',
                                        background: 'linear-gradient(135deg, rgba(25, 118, 210, 0.08) 0%, rgba(66, 165, 245, 0.05) 100%)',
                                        border: '2px solid transparent',
                                        borderRadius: 3,
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                        overflow: 'hidden',
                                        '&:hover': {
                                            border: '2px solid #1976d2',
                                            background: 'linear-gradient(135deg, rgba(25, 118, 210, 0.12) 0%, rgba(66, 165, 245, 0.08) 100%)',
                                            transform: 'translateY(-2px)',
                                            boxShadow: '0 12px 32px rgba(25, 118, 210, 0.15)',
                                        },
                                        '&::before': {
                                            content: '""',
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            right: 0,
                                            height: 4,
                                            background: 'linear-gradient(90deg, #1976d2 0%, #42a5f5 100%)',
                                        }
                                    }}
                                >
                                    <CardContent sx={{ p: 3 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                            <Box sx={{
                                                width: 56,
                                                height: 56,
                                                borderRadius: '16px',
                                                background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                boxShadow: '0 4px 16px rgba(25, 118, 210, 0.3)',
                                            }}>
                                                <SpeedIcon sx={{ color: 'white', fontSize: 28 }} />
                                            </Box>
                                            <Box sx={{ flex: 1 }}>
                                                <Typography variant="h6" sx={{ 
                                                    fontWeight: 600, 
                                                    mb: 0.5,
                                                    color: 'text.primary',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 1
                                                }}>
                                                    Quick Creation
                                                    <Chip 
                                                        label="Recommended" 
                                                        size="small" 
                                                        sx={{ 
                                                            backgroundColor: '#1976d2',
                                                            color: 'white',
                                                            fontSize: '11px',
                                                            height: 20
                                                        }} 
                                                    />
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                                    Create catalog part here with basic details (name, category, bpns)
                                                </Typography>
                                                <Typography variant="caption" sx={{ 
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    gap: 0.5,
                                                    color: '#1976d2',
                                                    fontWeight: 500
                                                }}>
                                                    Fast & Simple <ArrowForwardIcon sx={{ fontSize: 14 }} />
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </CardContent>
                                </Card>
                                
                                {/* Detailed Creation Card */}
                                <Card
                                    onClick={() => {
                                        onClose();
                                        navigate('/catalog');
                                    }}
                                    sx={{
                                        position: 'relative',
                                        cursor: 'pointer',
                                        background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.08) 0%, rgba(129, 199, 132, 0.05) 100%)',
                                        border: '2px solid transparent',
                                        borderRadius: 3,
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                        overflow: 'hidden',
                                        '&:hover': {
                                            border: '2px solid #4caf50',
                                            background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.12) 0%, rgba(129, 199, 132, 0.08) 100%)',
                                            transform: 'translateY(-2px)',
                                            boxShadow: '0 12px 32px rgba(76, 175, 80, 0.15)',
                                        },
                                        '&::before': {
                                            content: '""',
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            right: 0,
                                            height: 4,
                                            background: 'linear-gradient(90deg, #4caf50 0%, #81c784 100%)',
                                        }
                                    }}
                                >
                                    <CardContent sx={{ p: 3 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                            <Box sx={{
                                                width: 56,
                                                height: 56,
                                                borderRadius: '16px',
                                                background: 'linear-gradient(135deg, #4caf50 0%, #81c784 100%)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                boxShadow: '0 4px 16px rgba(76, 175, 80, 0.3)',
                                            }}>
                                                <SettingsIcon sx={{ color: 'white', fontSize: 28 }} />
                                            </Box>
                                            <Box sx={{ flex: 1 }}>
                                                <Typography variant="h6" sx={{ 
                                                    fontWeight: 600, 
                                                    mb: 0.5,
                                                    color: 'text.primary'
                                                }}>
                                                    Detailed Creation
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                                    Go to catalog parts view to create with full details and then return
                                                </Typography>
                                                <Typography variant="caption" sx={{ 
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    gap: 0.5,
                                                    color: '#4caf50',
                                                    fontWeight: 500
                                                }}>
                                                    Full Control <ArrowForwardIcon sx={{ fontSize: 14 }} />
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Box>
                        </Grid>
                    </Grid>
                ) : (
                    // Step 3: Catalog Part Form
                    <Grid container spacing={3}>
                        <Grid item xs={12}>
                            <Typography variant="body1" sx={{ mb: 2, color: 'text.secondary' }}>
                                The catalog part <strong>{formData.manufacturerId}/{formData.manufacturerPartId}</strong> was not found. 
                                Please provide the required details to create it.
                            </Typography>
                        </Grid>
                        
                        <Grid item xs={12}>
                            <TextField
                                label="Name"
                                value={catalogPartData.name}
                                onChange={(e) => setCatalogPartData({ ...catalogPartData, name: e.target.value })}
                                fullWidth
                                required
                                variant="outlined"
                                size="medium"
                                helperText="The name for the catalog part"
                            />
                        </Grid>
                        
                        <Grid item xs={12}>
                            <TextField
                                label="Category"
                                value={catalogPartData.category}
                                onChange={(e) => setCatalogPartData({ ...catalogPartData, category: e.target.value })}
                                fullWidth
                                variant="outlined"
                                size="medium"
                                helperText="Optional category for the catalog part"
                            />
                        </Grid>
                        
                        <Grid item xs={12}>
                            <TextField
                                label="BPNS"
                                value={catalogPartData.bpns}
                                onChange={(e) => setCatalogPartData({ ...catalogPartData, bpns: e.target.value })}
                                fullWidth
                                variant="outlined"
                                size="medium"
                                helperText="Optional Business Partner Number Site"
                            />
                        </Grid>
                    </Grid>
                )}
            </DialogContent>
            <DialogActions sx={{ 
                p: 3, 
                backgroundColor: 'background.paper',
                borderTop: '1px solid',
                borderColor: 'divider',
                gap: 2,
                justifyContent: 'flex-end'
            }}>
                <Button 
                    onClick={onClose}
                    variant="outlined"
                    color="primary"
                    size="large"
                    sx={{
                        minWidth: '100px',
                        textTransform: 'none',
                        fontWeight: 500
                    }}
                >
                    Cancel
                </Button>
                {currentStep === 'serialized-part' ? (
                    <Button 
                        onClick={handleSubmit}
                        variant="contained"
                        color="primary"
                        size="large"
                        sx={{
                            minWidth: '100px',
                            textTransform: 'none',
                            fontWeight: 500,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                        }}
                    >
                        Save
                    </Button>
                ) : currentStep === 'choice' ? (
                    <Button 
                        onClick={() => setCurrentStep('serialized-part')}
                        variant="outlined"
                        color="secondary"
                        size="large"
                        sx={{
                            minWidth: '100px',
                            textTransform: 'none',
                            fontWeight: 500,
                            color: '#1976d2',
                            borderColor: '#1976d2'
                        }}
                    >
                        Back
                    </Button>
                ) : (
                    <>
                        <Button 
                            onClick={() => setCurrentStep('choice')}
                            variant="outlined"
                            color="secondary"
                            size="large"
                            sx={{
                                minWidth: '100px',
                                textTransform: 'none',
                                fontWeight: 500,
                                color: '#1976d2',
                                borderColor: '#1976d2'
                            }}
                        >
                            Back
                        </Button>
                        <Button 
                            onClick={handleCatalogPartSubmit}
                            variant="contained"
                            color="primary"
                            size="large"
                            sx={{
                                minWidth: '140px',
                                textTransform: 'none',
                                fontWeight: 500,
                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                            }}
                        >
                            Create & Save
                        </Button>
                    </>
                )}
            </DialogActions>
        </Dialog>
    )
}

export default AddSerializedPartDialog