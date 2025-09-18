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
import { Button } from '@mui/material';
import { Box, TextField, Autocomplete, Alert, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Checkbox, FormControlLabel, Typography, Grid2 } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import CloseIcon from '@mui/icons-material/Close';
import PersonAddIcon from '@mui/icons-material/PersonAdd';

import { ProductDetailDialogProps } from '../../types/dialog-types';
import { PartnerInstance } from "../../../partner-management/types/types";

import { shareCatalogPart } from '../../api';
import { fetchPartners } from '../../../partner-management/api';

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
    setError(false); // Clear validation error on change
    setApiErrorMessage(''); // Clear API error on change
    setSuccessMessage(''); // Clear success message on change
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
    <Dialog 
      open={open} 
      maxWidth={false}
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: 'background.paper',
          width: '40vw',
          height: 'auto',
          maxWidth: '40vw',
          maxHeight: '80vh',
          minWidth: '500px',
          '& .MuiDialogContent-root': {
            backgroundColor: 'background.paper',
          }
        }
      }}
    >
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
        Share with partner ({title})
      </DialogTitle>
      <IconButton
        aria-label="close"
        onClick={onClose}
        sx={(theme) => ({
          position: 'absolute',
          right: 8,
          top: 8,
          color: theme.palette.primary.contrastText,
        })}
      >
        <CloseIcon />
      </IconButton>
      <DialogContent sx={{ 
        p: 3, 
        backgroundColor: 'background.paper',
        overflow: 'auto',
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
        '& .MuiFormControlLabel-root': {
          '& .MuiCheckbox-root': {
            color: 'primary.main',
            '&.Mui-checked': {
              color: 'primary.main',
            }
          }
        }
      }}>
        {partnersList.length === 0 ? (
          <Grid2 container spacing={3}>
            <Grid2 size={12}>
              <Typography variant="h6" gutterBottom sx={{ 
                mb: 2, 
                color: 'text.primary',
                fontSize: '1.1rem',
                fontWeight: 500
              }}>
                No Partners Available
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textAlign: 'center', py: 4 }}>
                No partners available. Please add partners in the Partner View to share parts.
              </Typography>
            </Grid2>
          </Grid2>
        ) : (
          <Grid2 container spacing={3}>
            <Grid2 size={12}>
              <Typography variant="h6" gutterBottom sx={{ 
                mb: 2, 
                color: 'text.primary',
                fontSize: '1.1rem',
                fontWeight: 500
              }}>
                Share Part Information
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Select a partner to share the part with
              </Typography>
            </Grid2>
            
            <Grid2 size={12}>
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
                    size="medium"
                    error={error}
                    helperText={error ? 'Partner selection is required' : ''}
                    fullWidth
                  />
                )}
              />
            </Grid2>
            
            <Grid2 size={12}>
              <Box sx={{ 
                p: 3, 
                backgroundColor: 'background.default', 
                borderRadius: 2, 
                mt: 1,
                border: '1px solid',
                borderColor: 'divider',
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  borderColor: 'primary.light',
                  boxShadow: '0 2px 8px rgba(25, 118, 210, 0.1)',
                }
              }}>
                <FormControlLabel
                  className='customer-part-id-form'
                  sx={{
                    alignItems: 'center', // Center align instead of flex-start
                    '& .MuiFormControlLabel-label': {
                      paddingLeft: '12px', // Increased left padding for better separation
                    }
                  }}
                  control={
                    <Checkbox
                      checked={showCustomPartId}
                      onChange={(e) => {
                        console.log('Checkbox changed to:', e.target.checked);
                        setShowCustomPartId(e.target.checked);
                      }}
                      size="small"
                      className='customer-part-id-checkbox'
                      sx={{
                        p: 0.5,
                        borderRadius: '6px',
                        transition: 'all 0.2s ease-in-out',
                        color: 'rgba(0, 0, 0, 0.26)', // Modern light gray for unchecked
                        '&:hover': {
                          backgroundColor: 'rgba(25, 118, 210, 0.08)',
                          transform: 'scale(1.05)',
                        },
                        '&.Mui-checked': {
                          color: 'primary.main',
                          '&:hover': {
                            backgroundColor: 'rgba(25, 118, 210, 0.12)',
                          }
                        },
                        '& .MuiSvgIcon-root': {
                          fontSize: 20, // Reduced from 24
                          borderRadius: '3px',
                          transition: 'all 0.2s ease-in-out',
                          filter: 'drop-shadow(0px 1px 2px rgba(0, 0, 0, 0.1))',
                        },
                        // Modern unchecked state with subtle border
                        '&:not(.Mui-checked) .MuiSvgIcon-root': {
                          color: 'rgba(0, 0, 0, 0.54)',
                          border: '1.5px solid rgba(0, 0, 0, 0.23)', // Thinner border
                          borderRadius: '3px',
                          backgroundColor: 'background.paper',
                        },
                        // Modern checked state with smooth animation
                        '&.Mui-checked .MuiSvgIcon-root': {
                          color: 'primary.main',
                          backgroundColor: 'transparent',
                          border: 'none',
                          filter: 'drop-shadow(0px 1px 3px rgba(25, 118, 210, 0.3))',
                        },
                        // Focus state for accessibility
                        '&.Mui-focusVisible': {
                          outline: '2px solid',
                          outlineColor: 'primary.main',
                          outlineOffset: '2px',
                        }
                      }}
                    />
                  }
                  label={
                    <Typography variant="body2" sx={{ 
                      color: 'text.primary', 
                      fontWeight: 500,
                      fontSize: '0.9rem',
                      letterSpacing: '0.01em',
                      transition: 'color 0.2s ease-in-out',
                      ml: 0.5, // Additional left margin for better spacing
                      '&:hover': {
                        color: 'primary.main',
                      }
                    }}>
                      Add custom customer part Id
                    </Typography>
                  }
                />
                {showCustomPartId && (
                  <Box sx={{ mt: 2 }}>
                    <TextField
                      label="Customer Part Id"
                      variant="outlined"
                      size="medium"
                      fullWidth
                      value={customPartId}
                      onChange={(e) => setCustomPartId(e.target.value)}
                      placeholder="Enter your custom part identifier"
                    />
                  </Box>
                )}
              </Box>
            </Grid2>
          </Grid2>
        )}

        {apiErrorMessage && (
          <Box sx={{ mt: 3 }}>
            <Alert severity="error">{apiErrorMessage}</Alert>
          </Box>
        )}
        {successMessage && (
          <Box sx={{ mt: 3 }}>
            <Alert severity="success">{successMessage}</Alert>
          </Box>
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
          CLOSE
        </Button>
        {partnersList.length === 0 ? (
          <Button 
            onClick={handleGoToPartners}
            variant="contained"
            color="primary"
            size="large"
            startIcon={<PersonAddIcon />}
            sx={{
              minWidth: '100px',
              textTransform: 'none',
              fontWeight: 500,
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}
          >
            Add a Partner
          </Button>
        ) : (
          <Button 
            onClick={handleShare}
            variant="contained"
            color="primary"
            size="large"
            startIcon={<SendIcon />}
            disabled={!bpnl}
            sx={{
              minWidth: '100px',
              textTransform: 'none',
              fontWeight: 500,
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}
          >
            Share
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ShareDialog;
