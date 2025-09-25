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
import { useNavigate } from 'react-router-dom';
import { Button } from '@catena-x/portal-shared-components';
import { Box, TextField, Autocomplete, Alert, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Checkbox, FormControlLabel } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import CloseIcon from '@mui/icons-material/Close';
import PersonAddIcon from '@mui/icons-material/PersonAdd';

import { ProductDetailDialogProps } from '../../types/dialogViewer';
import { PartnerInstance } from "../../types/partner";

import { shareCatalogPart } from '../../features/catalog-management/api';
import { fetchPartners } from '../../features/partner-management/api';

const ShareDialog = ({ open, onClose, partData }: ProductDetailDialogProps) => {
  const title = partData?.name ?? "Part name not obtained";
  const navigate = useNavigate();

  const [bpnl, setBpnl] = useState('');
  const [error, setError] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [apiErrorMessage, setApiErrorMessage] = useState('');
  const [partnersList, setPartnersList] = useState<PartnerInstance[]>([]);
  const [showCustomPartId, setShowCustomPartId] = useState(false);
  const [customPartId, setCustomPartId] = useState('');

  useEffect(() => {
    // Reset fields when dialog opens or partData changes
    if (open) {
      setBpnl('');
      setError(false);
      setSuccessMessage('');
      setApiErrorMessage('');
      setShowCustomPartId(false);
      setCustomPartId('');

      const fetchData = async () => {
        try {
          const data = await fetchPartners();          
          setPartnersList(data);
        } catch (error) {
          console.error('Error fetching data:', error);  
          setPartnersList([]);
        }
      };
      fetchData();
    }
  }, [open, partData]);

  const handlePartnerSelection = (_event: React.SyntheticEvent, value: PartnerInstance | null) => {
    console.log('handlePartnerSelection called with:', value);
    if (value && 'bpnl' in value) {
      // User selected a partner from the dropdown
      console.log('Setting bpnl to partner.bpnl:', value.bpnl);
      setBpnl(value.bpnl); // Only BPNL for backend
    } else {
      // Value is null
      console.log('Setting bpnl to empty');
      setBpnl('');
    }
  };

  const handleShare = async () => {
    console.log('handleShare called with bpnl:', bpnl);
    console.log('bpnl.trim():', bpnl.trim());
    
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
      console.log('Calling shareCatalogPart with:', {
        manufacturerId: partData.manufacturerId,
        manufacturerPartId: partData.manufacturerPartId,
        bpnl: bpnl.trim(),
        customerPartId: customPartId.trim() || undefined
      });
      
      await shareCatalogPart(
        partData.manufacturerId,
        partData.manufacturerPartId,
        bpnl.trim(),
        customPartId.trim() || undefined
      );
      
      setSuccessMessage(`Part shared successfully with ${bpnl.trim()}`);

      setTimeout(() => {
        setSuccessMessage('');
        onClose(); // Close dialog on success
        // Refresh the page to update the view
        window.location.reload();
      }, 2000);

    } catch (axiosError) {
      console.error('Error sharing part:', axiosError);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let errorMessage = (axiosError as any).message || 'Failed to share part.';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const errorResponse = (axiosError as any).response;

      if (errorResponse?.status === 422) {
        errorMessage = errorResponse?.data?.detail?.[0]?.msg
                      ?? JSON.stringify(errorResponse?.data?.detail?.[0])
                      ?? 'Validation failed.';
      } else if (errorResponse?.data?.message) {
        errorMessage = errorResponse.data.message;
      } else if (errorResponse?.data) {
        errorMessage = JSON.stringify(errorResponse.data);
      }
      setApiErrorMessage(errorMessage);
    }
  };

  const handleGoToPartners = () => {
    onClose(); // Close the dialog first
    navigate('/partners'); // Navigate to partners page
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
        {partnersList.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <p>No partners available. Please add partners in the Partner View to share parts.</p>
          </Box>
        ) : (
          <>
            <p>Select a partner to share the part with</p>
            <Box sx={{ mt: 2, mx: 'auto', maxWidth: 400 }}>
              <Autocomplete
                options={partnersList}
                getOptionLabel={(option) => `${option.name} (${option.bpnl})`}
                value={partnersList.find(p => p.bpnl === bpnl) || null}
                onChange={handlePartnerSelection}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Partner"
                    variant="outlined"
                    size="small"
                    error={error}
                    helperText={error ? 'Partner selection is required' : ''}
                  />
                )}
              />
            </Box>
            <Box sx={{ mt: 2, mx: 'auto', maxWidth: 400 }}>
              <FormControlLabel
                className='customer-part-id-form'
                control={
                  <Checkbox
                    checked={showCustomPartId}
                    onChange={(e) => {
                      console.log('Checkbox changed to:', e.target.checked);
                      setShowCustomPartId(e.target.checked);
                    }}
                    size="small"
                    className='customer-part-id-checkbox'
                  />
                }
                label="Add custom customer part Id"
              />
              {showCustomPartId && (
                <Box sx={{ mt: 1 }}>
                  <TextField
                    label="Customer Part Id"
                    variant="outlined"
                    size="small"
                    fullWidth
                    value={customPartId}
                    onChange={(e) => setCustomPartId(e.target.value)}
                    placeholder="Enter your custom part identifier"
                  />
                </Box>
              )}
            </Box>
          </>
        )}
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
        {partnersList.length === 0 ? (
          <Button 
            className="action-button" 
            variant="contained" 
            size="small" 
            onClick={handleGoToPartners} 
            startIcon={<PersonAddIcon />}
          >
            Add a Partner
          </Button>
        ) : (
          <Button 
            className="action-button" 
            variant="contained" 
            size="small" 
            onClick={handleShare} 
            startIcon={<SendIcon />}
            disabled={!bpnl}
          >
            Share
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ShareDialog;
