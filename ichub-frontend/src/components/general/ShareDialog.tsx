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
import { Button } from '@catena-x/portal-shared-components';
import { Box, TextField, Autocomplete, Alert, Dialog, DialogTitle, DialogContent, DialogActions, IconButton } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import CloseIcon from '@mui/icons-material/Close';

import { ProductDetailDialogProps } from '../../types/dialogViewer';

// Sample BPNL data for the autocomplete field
// After the integration, this data would be fetched from the API
const PREVIOUS_BPNLS = [
  'BPNL0000000001XY',
  'BPNL0000000002XY',
  'BPNL0000000003XY',
  'BPNL0000000004XY',
];

const ShareDialog = ({ open, onClose, partData }: ProductDetailDialogProps) => {
  const title = partData?.name ?? "Part name not obtained";

  const [bpnl, setBpnl] = useState('');
  const [error, setError] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleBpnlChange = (_event: any, value: string | null) => {
    setBpnl(value ??'');
    setError(false);
    setSuccessMessage('');
  };

  const handleShare = () => {
    if (!bpnl.trim()) {
      setError(true);
      return;
    }

    // Here we would make an API call to share the part with the partner
    // For demonstration, we will just log the BPNL

    setSuccessMessage(`Part shared successfully with ${bpnl}`);
    setTimeout(() => {
      setSuccessMessage('');
      onClose();
    }, 2000);
  };

  return (
    <Dialog open={open} maxWidth="xl" className="custom-dialog">
      <DialogTitle sx={{ m: 0, p: 2 }}>
        Share with partner ({title})
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
        <p>Introduce the partner BPNL to share the part with them</p>
        <Box sx={{ mt: 2, mx: 'auto', maxWidth: 400 }}>
          <Autocomplete
            freeSolo
            options={PREVIOUS_BPNLS}
            inputValue={bpnl}
            onInputChange={handleBpnlChange}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Partner BPNL"
                variant="outlined"
                size="small"
                error={error}
                helperText={error ? 'BPNL is required' : ''}
              />
            )}
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
          <span className="close-button-content">CLOSE</span>
        </Button>
        <Button className="action-button" variant="contained" size="small" onClick={handleShare} startIcon={<SendIcon />} >
          Share
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ShareDialog;
