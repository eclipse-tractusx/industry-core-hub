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
import { Box, TextField, Alert, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Checkbox, FormControlLabel, Typography, Grid2, CircularProgress } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import CloseIcon from '@mui/icons-material/Close';
import PersonAddIcon from '@mui/icons-material/PersonAdd';

import { PartnerInstance } from "@/features/business-partner-kit/partner-management/types/types";
import { PartnerAutocomplete } from '@/features/business-partner-kit/partner-management/components';

import { shareDPP } from '../api/provisionApi';
import { fetchPartners } from '@/features/business-partner-kit/partner-management/api';
import { useEscapeDialog } from '@/hooks/useEscapeKey';

interface DppShareDialogProps {
  open: boolean;
  onClose: () => void;
  dppId: string;
  dppName: string;
}

const DppShareDialog = ({ open, onClose, dppId, dppName }: DppShareDialogProps) => {
  const navigate = useNavigate();

  const [bpnl, setBpnl] = useState('');
  const [error, setError] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [apiErrorMessage, setApiErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [partnersList, setPartnersList] = useState<PartnerInstance[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<PartnerInstance | null>(null);
  const [showCustomPartId, setShowCustomPartId] = useState(false);
  const [customPartId, setCustomPartId] = useState('');

  useEscapeDialog(onClose, open);

  useEffect(() => {
    // Reset fields when dialog opens
    if (open) {
      setBpnl('');
      setError(false);
      setSuccessMessage('');
      setApiErrorMessage('');
      setIsLoading(false);
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
  }, [open, dppId]);

  const handlePartnerSelection = (_event: React.SyntheticEvent, value: PartnerInstance | null) => {
    if (value && 'bpnl' in value) {
      setBpnl(value.bpnl);
    } else {
      setBpnl('');
    }
    setError(false);
    setApiErrorMessage('');
    setSuccessMessage('');
  };

  const handleShare = async () => {
    if (!bpnl.trim()) {
      setError(true);
      setApiErrorMessage('');
      return;
    }
    setError(false);
    setApiErrorMessage('');

    setIsLoading(true);
    try {
      await shareDPP(
        dppId,
        bpnl.trim(),
        customPartId.trim() || undefined
      );
      
      setSuccessMessage(`DPP shared successfully with ${bpnl.trim()}`);

      setTimeout(() => {
        setSuccessMessage('');
        onClose();
        // Refresh the page to update the view
        window.location.reload();
        setIsLoading(false);
      }, 2000);

    } catch (axiosError) {
      setIsLoading(false);
      console.error('Error sharing DPP:', axiosError);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let errorMessage = (axiosError as any).message || 'Failed to share DPP.';
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
    onClose();
    navigate('/partners#new');
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
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
        Share Digital Product Passport ({dppName})
      </DialogTitle>
      <IconButton
        aria-label="close"
        onClick={onClose}
        sx={(theme) => ({
          position: 'absolute',
          right: 21,
          top: 21,
          color: theme.palette.primary.contrastText,
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
                No partners available. Please add partners in the Partner View to share DPPs.
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
                Share Digital Product Passport
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Select a partner to share the DPP with
              </Typography>
            </Grid2>
            
            <Grid2 size={12}>
              <PartnerAutocomplete
                value={bpnl}
                availablePartners={partnersList}
                selectedPartner={selectedPartner}
                isLoadingPartners={false}
                partnersError={false}
                hasError={error}
                label="Partner"
                placeholder="Select a partner to share the DPP with"
                helperText="Select from available partners"
                errorMessage="Partner selection is required"
                onBpnlChange={setBpnl}
                onPartnerChange={(partner) => {
                  setSelectedPartner(partner);
                  if (partner) {
                    setBpnl(partner.bpnl);
                  } else {
                    setBpnl('');
                  }
                  setError(false);
                  setApiErrorMessage('');
                }}
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
                  sx={{
                    alignItems: 'center',
                    '& .MuiFormControlLabel-label': {
                      paddingLeft: '12px',
                    }
                  }}
                  control={
                    <Checkbox
                      checked={showCustomPartId}
                      onChange={(e) => setShowCustomPartId(e.target.checked)}
                      size="small"
                      sx={{
                        p: 0.5,
                        borderRadius: '6px',
                        transition: 'all 0.2s ease-in-out',
                        color: 'rgba(0, 0, 0, 0.26)',
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
                          fontSize: 20,
                          borderRadius: '3px',
                          transition: 'all 0.2s ease-in-out',
                          filter: 'drop-shadow(0px 1px 2px rgba(0, 0, 0, 0.1))',
                        },
                        '&:not(.Mui-checked) .MuiSvgIcon-root': {
                          color: 'rgba(0, 0, 0, 0.54)',
                          border: '1.5px solid rgba(0, 0, 0, 0.23)',
                          borderRadius: '3px',
                          backgroundColor: 'background.paper',
                        },
                        '&.Mui-checked .MuiSvgIcon-root': {
                          color: 'primary.main',
                          backgroundColor: 'transparent',
                          border: 'none',
                          filter: 'drop-shadow(0px 1px 3px rgba(25, 118, 210, 0.3))',
                        },
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
                      ml: 0.5,
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
            startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
            disabled={isLoading || !bpnl}
            sx={{
              minWidth: '100px',
              textTransform: 'none',
              fontWeight: 500,
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}
          >
            {isLoading ? 'Sharing...' : 'Share'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default DppShareDialog;
