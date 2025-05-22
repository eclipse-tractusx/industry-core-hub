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
import { Box, TextField, Autocomplete, Alert, Dialog, DialogTitle, DialogContent, DialogActions, IconButton } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import CloseIcon from '@mui/icons-material/Close';

import { ProductDetailDialogProps } from '../../types/dialogViewer';
import { PartnerInstance } from "../../types/partner";

import { shareCatalogPart } from '../../features/catalog-management/api';
import { fetchPartners } from '../../features/partner-management/api';

const ShareDialog = ({ open, onClose, partData }: ProductDetailDialogProps) => {
  const title = partData?.name ?? "Part name not obtained";

  const [bpnl, setBpnl] = useState('');
  const [error, setError] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [apiErrorMessage, setApiErrorMessage] = useState('');
  const [partnerBpnlsList, setPartnerBpnlsList] = useState<string[]>([]);

  useEffect(() => {
    // Reset fields when dialog opens or partData changes
    if (open) {
      setBpnl('');
      setError(false);
      setSuccessMessage('');
      setApiErrorMessage('');

      const fetchData = async () => {
        try {
          const data = await fetchPartners();          
          setPartnerBpnlsList(data.map((partner: PartnerInstance) => partner.bpnl));
        } catch (error) {
          console.error('Error fetching data:', error);  
          setPartnerBpnlsList([]);
        }
      };
      fetchData();
    }
  }, [open, partData]);

  const handleBpnlChange = (_event: any, value: string | null) => {
    setBpnl(value ??'');
    setError(false); // Clear validation error on change
    setApiErrorMessage(''); // Clear API error on change
    setSuccessMessage(''); // Clear success message on change
  };

  const handleShare = async () => {
    if (!bpnl.trim()) {
      setError(true);
      setApiErrorMessage('');
      return;
    }
    setError(false);
    setApiErrorMessage('');

    if (!partData) {
      setApiErrorMessage("Part data is not available.");
      return;
    }

    try {
      await shareCatalogPart(
        partData.manufacturerId,
        partData.manufacturerPartId,
        bpnl.trim()
      );
      
      setSuccessMessage(`Part shared successfully with ${bpnl.trim()}`);

      setTimeout(() => {
        setSuccessMessage('');
        onClose(); // Close dialog on success
      }, 2000);

    } catch (axiosError) {
      console.error('Error sharing part:', axiosError);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let errorMessage = (axiosError as any).message || 'Failed to share part.';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const errorResponse = (axiosError as any).response;

      if (errorResponse) {
        if (errorResponse.status === 422 && errorResponse.data && errorResponse.data.detail && Array.isArray(errorResponse.data.detail) && errorResponse.data.detail.length > 0) {
          errorMessage = errorResponse.data.detail[0].msg || JSON.stringify(errorResponse.data.detail[0]) || 'Validation failed.';
        } else if (errorResponse.data && errorResponse.data.message) {
          errorMessage = errorResponse.data.message;
        } else if (errorResponse.data) {
          errorMessage = JSON.stringify(errorResponse.data);
        }
      }
      setApiErrorMessage(errorMessage);
    }
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
            options={partnerBpnlsList}
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
