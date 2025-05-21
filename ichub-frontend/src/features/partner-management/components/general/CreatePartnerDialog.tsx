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
import { Button } from '@catena-x/portal-shared-components';
import { Box, TextField, Alert, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import { PartnerDialogProps } from '../../../../types/partnerDialogViewer';
import { createPartner } from '../../api';

const CreatePartnerDialog = ({ open, onClose, onSave, partnerData }: PartnerDialogProps) => {
  const [name, setName] = useState('');
  const [bpnl, setBpnl] = useState('');
  const [error, setError] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [apiErrorMessage, setApiErrorMessage] = useState('');

  // Load partner data if it exists (edit mode)
  useEffect(() => {
    if (partnerData) {
      setName(partnerData.name || '');
      setBpnl(partnerData.bpnl || '');
    } else {
      setName('');
      setBpnl('');
    }
  }, [partnerData, open]);

  const handleCreate = async () => {
    if ((!bpnl.trim()) || (!name.trim())) {
      setError(true);
      setApiErrorMessage(''); // Clear any previous API error
      return;
    }
    setError(false); // Clear validation error
    setApiErrorMessage(''); // Clear previous API error message

    const partnerPayload = { name: name.trim(), bpnl: bpnl.trim() };

    if (partnerData) { // Edit mode
      // TODO: Implement PUT request for updating partner when API endpoint is defined
      console.log(`Partner updated (locally) with name: ${name} and BPNL: ${bpnl}`);
      onSave?.(partnerPayload); // Update local state in parent
      setSuccessMessage(`Partner ${name} updated successfully [${bpnl}] (local update)`);
      setTimeout(() => {
        setSuccessMessage('');
        onClose();
      }, 3000);
    } else { // Create mode
      try {
        await createPartner(partnerPayload);
        
        console.log(`Partner created via API with name: ${name} and BPNL: ${bpnl}`);
        onSave?.(partnerPayload); // Call onSave to update the parent component's state

        setSuccessMessage(`Partner ${name} created successfully [${bpnl}]`);
        setTimeout(() => {
          setSuccessMessage('');
          onClose(); // Close dialog on success
        }, 3000);
      } catch (axiosError) {
        console.error('Error creating partner:', axiosError);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let errorMessage = (axiosError as any).message || 'Failed to create partner.';
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const errorResponse = (axiosError as any).response;

        if (errorResponse) {
          if (errorResponse.status === 422 && errorResponse.data && errorResponse.data.detail && Array.isArray(errorResponse.data.detail) && errorResponse.data.detail.length > 0) {
            // Attempt to get the specific message (pydantic validation error message) for 422 errors
            errorMessage = errorResponse.data.detail[0].msg || JSON.stringify(errorResponse.data.detail[0]) || 'Validation failed.';
          } else if (errorResponse.data && errorResponse.data.message) {
            // General error message from backend response
            errorMessage = errorResponse.data.message;
          } else if (errorResponse.data) {
            // Fallback if no specific message format is found but data exists
            errorMessage = JSON.stringify(errorResponse.data);
          }
        }
        
        setApiErrorMessage(errorMessage);
      }
    }
  };

  return (
    <Dialog open={open} maxWidth="xl" className="custom-dialog">
      <DialogTitle sx={{ m: 0, p: 2 }}>
      {partnerData ? 'Edit partner' : 'Create new partner'}
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
      <DialogContent dividers>
        <Typography variant="label2">Introduce the partner name and BPNL</Typography>
        <Box sx={{ mt: 2, mx: 'auto', maxWidth: '400px' }}>
          <TextField
            label="Partner Name"
            variant="outlined"
            size="small"
            error={error && !name.trim()}
            helperText={error && !name.trim() ? 'Name is required' : ''}
            fullWidth
            sx={{ marginBottom: '16px' }}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <TextField
            label="Partner BPNL"
            variant="outlined"
            size="small"
            error={error && !bpnl.trim()}
            helperText={error && !bpnl.trim() ? 'BPNL is required' : ''}
            fullWidth
            value={bpnl}
            onChange={(e) => setBpnl(e.target.value)}
            disabled={!!partnerData} // Disable if editing
          />
        </Box>
        {apiErrorMessage && (
          <Box sx={{ mt: 2 }}>
            <Alert severity="error">{apiErrorMessage}</Alert>
          </Box>
        )}
        {successMessage && (
          <Box sx={{ mt: 2 }}>
            <Alert severity="success">{successMessage}</Alert>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button className="close-button" variant="outlined" size="small" onClick={onClose} startIcon={<CloseIcon />} >
          CLOSE
        </Button>
        <Button className="action-button" variant="contained" size="small" onClick={handleCreate} startIcon={partnerData ? <EditIcon /> : <AddIcon />} >
          {partnerData ? 'UPDATE' : 'CREATE'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreatePartnerDialog;
