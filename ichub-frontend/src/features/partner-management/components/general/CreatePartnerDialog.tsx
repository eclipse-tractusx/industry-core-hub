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

const CreatePartnerDialog = ({ open, onClose, onSave, partnerData }: PartnerDialogProps) => {
  const [name, setName] = useState('');
  const [bpnl, setBpnl] = useState('');
  const [error, setError] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

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

  const handleCreate = () => {
    if ((!bpnl.trim()) || (!name.trim())) {
      setError(true);
      return;
    }

    // Here we would make an API call to store the new partner
    // For demonstration, we will just log the BPNL
    const partner = { name: name.trim(), bpnl: bpnl.trim() };
    
    console.log(`Partner created with name: ${name} and  BPNL: ${bpnl}`);

    onSave?.(partner);

    setSuccessMessage(`Partner ${name} ${partnerData ? 'updated' : 'created'} successfully [${bpnl}]`);
    setTimeout(() => {
      setSuccessMessage('');
      onClose();
    }, 3000);
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
