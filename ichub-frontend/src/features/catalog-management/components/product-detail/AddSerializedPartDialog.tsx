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
import { Button } from '@mui/material';

import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import TextField from '@mui/material/TextField';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Autocomplete from '@mui/material/Autocomplete';

import { ProductDetailDialogProps } from '../../types/dialog-types';
import PageNotification from '../../../../components/general/PageNotification';
import { addSerializedPart } from '../../../serialized-parts/api';
import { fetchPartners } from '../../../partner-management/api';
import { PartnerInstance } from '../../../partner-management/types/types';
import { AxiosError } from '../../../../types/axiosError';

const AddSerializedPartDialog = ({ open, onClose, partData }: ProductDetailDialogProps) => {
    const [formData, setFormData] = useState({
        businessPartnerNumber: '',
        manufacturerId: partData?.manufacturerId ?? '',
        manufacturerPartId: partData?.manufacturerPartId ?? '',
        partInstanceId: '',
        van: '',
        customerPartId: '',
    });

    const [showVanField, setShowVanField] = useState(false);
    const [showCustomerPartIdField, setShowCustomerPartIdField] = useState(false);
    const [partners, setPartners] = useState<PartnerInstance[]>([]);
    const [selectedPartner, setSelectedPartner] = useState<PartnerInstance | null>(null);

    const [notification, setNotification] = useState<{
        open: boolean;
        severity: 'success' | 'error';
        title: string;
    } | null>(null);

    // Fetch partners on component mount
    useEffect(() => {
        const loadPartners = async () => {
            try {
                const partnersData = await fetchPartners();
                setPartners(partnersData);
            } catch (error) {
                console.error('Failed to fetch partners:', error);
            }
        };
        loadPartners();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await addSerializedPart(formData);
            setNotification({
                open: true,
                severity: 'success',
                title: 'Serialized part created successfully',
            });
            setTimeout(() => { window.location.reload(); }, 1500);
        } catch (err) {
            console.error("Error adding serialized part:", err);
            const error = err as AxiosError;
            const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
            setNotification({
                open: true,
                severity: 'error',
                title: `Failed to create serialized part: ${errorMessage}`,
            });
            setTimeout(() => setNotification(null), 6000);
        }
    };

    return (
        <Dialog 
            open={open} 
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
                Add a serialized part
            </DialogTitle>
            <IconButton
                aria-label="close"
                onClick={onClose}
                sx={(theme) => ({
                    position: 'absolute',
                    right: 8,
                    top: 8,
                    color: theme.palette.grey[500],
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
                            <Chip
                                label={`Manufacturer Part ID: ${formData.manufacturerPartId}`}
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
                        <Typography variant="h6" gutterBottom sx={{ 
                            mt: 0, 
                            mb: 1, 
                            color: 'text.primary',
                            fontSize: '1.1rem',
                            fontWeight: 500
                        }}>
                            Sharing Partner
                        </Typography>
                        <Autocomplete
                            value={selectedPartner}
                            onChange={(_, newValue) => {
                                setSelectedPartner(newValue);
                                setFormData({ 
                                    ...formData, 
                                    businessPartnerNumber: newValue?.bpnl || '' 
                                });
                            }}
                            options={partners}
                            getOptionLabel={(option) => `${option.name} (${option.bpnl})`}
                            isOptionEqualToValue={(option, value) => option.bpnl === value?.bpnl}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Select Sharing Partner"
                                    required
                                    variant="outlined"
                                    size="medium"
                                />
                            )}
                            renderOption={(props, option) => (
                                <li {...props} key={option.bpnl}>
                                    <Box>
                                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                            {option.name}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {option.bpnl}
                                        </Typography>
                                    </Box>
                                </li>
                            )}
                            fullWidth
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
            </DialogActions>
        </Dialog>
    )
}

export default AddSerializedPartDialog