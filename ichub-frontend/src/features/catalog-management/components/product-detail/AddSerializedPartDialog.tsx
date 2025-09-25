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

import { useState } from 'react';
import { Button, Icon } from '@catena-x/portal-shared-components';

import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import TextField from '@mui/material/TextField';
import Grid2 from '@mui/material/Grid2';
import Box from '@mui/material/Box';

import { ProductDetailDialogProps } from '../../../../types/dialogViewer';
import PageNotification from '../../../../components/general/PageNotification';
import { addSerializedPart } from '../../../serialized-parts/api';
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

    const [notification, setNotification] = useState<{
        open: boolean;
        severity: 'success' | 'error';
        title: string;
    } | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData((prev) => ({
            ...prev,
            [e.target.name]: e.target.value,
        }));
    };

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
        <Dialog open={open} maxWidth="xl" className='custom-dialog'>
            <PageNotification notification={notification} />
            <DialogTitle sx={{ m: 0, p: 2 }}>Add a serialized part</DialogTitle>
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
            <Box component="form" onSubmit={handleSubmit}>
                <DialogContent dividers>
                    <Grid2 container spacing={2}>
                        <Grid2 size={{ sm: 6, xs: 12 }}>
                            <TextField fullWidth label="Manufacturer ID" name="manufacturerId"
                                value={formData.manufacturerId} disabled/>
                        </Grid2>
                        <Grid2 size={{ sm: 6, xs: 12 }}>
                            <TextField fullWidth label="Manufacturer Part ID" name="manufacturerPartId"
                                value={formData.manufacturerPartId} disabled />
                        </Grid2>
                        <Grid2 size={{ sm: 6, xs: 12 }}>
                            <TextField fullWidth label="Business Partner Number" name="businessPartnerNumber"
                                value={formData.businessPartnerNumber} onChange={handleChange} required/>
                        </Grid2>
                        <Grid2 size={{ sm: 6, xs: 12 }}>
                            <TextField fullWidth label="Part Instance ID" name="partInstanceId"
                                value={formData.partInstanceId} onChange={handleChange} required />
                        </Grid2>
                        <Grid2 size={{ sm: 6, xs: 12 }}>
                            <TextField fullWidth label="VAN" name="van"
                                value={formData.van} onChange={handleChange} required />
                        </Grid2>
                        <Grid2 size={{ sm: 6, xs: 12 }}>
                            <TextField fullWidth label="Customer Part ID" name="customerPartId"
                                value={formData.customerPartId} onChange={handleChange} required />
                        </Grid2>
                    </Grid2>
                </DialogContent>

                <DialogActions>
                    <Button className="close-button" variant="outlined" size="small" onClick={onClose}>
                        <Icon fontSize="16" iconName="Close" />
                        <span className="close-button-content">CLOSE</span>
                    </Button>
                    <Button className="action-button" variant="outlined" size="small" type="submit">
                        <Icon fontSize="16" iconName="Save" />
                        <span className="action-button-content">SAVE</span>
                    </Button>
                </DialogActions>
            </Box>
        </Dialog>
    )
}

export default AddSerializedPartDialog