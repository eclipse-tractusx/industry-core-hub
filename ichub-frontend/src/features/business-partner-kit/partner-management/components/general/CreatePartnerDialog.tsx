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
import { Box, TextField, Alert, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Typography, Grid2 } from '@mui/material';
import { useTranslation } from 'react-i18next';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import { PartnerDialogProps } from '@/features/business-partner-kit/partner-management/types/dialog-types';
import { createPartner } from '@/features/business-partner-kit/partner-management/api';
import { useEscapeDialog } from '@/hooks/useEscapeKey';

const CreatePartnerDialog = ({ open, onClose, onSave, partnerData }: PartnerDialogProps) => {
  const { t } = useTranslation(['partnerManagement', 'common']);
  const [name, setName] = useState('');
  const [bpnl, setBpnl] = useState('');
  const [error, setError] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [apiErrorMessage, setApiErrorMessage] = useState('');

  useEscapeDialog(onClose, open);

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
      onSave?.(partnerPayload); // Update local state in parent
      setSuccessMessage(t('messages.updateSuccess', { name, bpnl }));
      setTimeout(() => {
        setSuccessMessage('');
        onClose();
      }, 3000);
    } else { // Create mode
      try {
        await createPartner(partnerPayload);
        
        
        onSave?.(partnerPayload); // Call onSave to update the parent component's state

        setSuccessMessage(t('messages.createSuccess', { name, bpnl }));
        setTimeout(() => {
          setSuccessMessage('');
          onClose(); // Close dialog on success
        }, 3000);
      } catch (axiosError) {
        console.error('Error creating partner:', axiosError);
        let errorMessage = t('messages.createError');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const errorResponse = (axiosError as any).response;

        if (errorResponse) {
          if (errorResponse.status === 422 && errorResponse.data && errorResponse.data.detail && Array.isArray(errorResponse.data.detail) && errorResponse.data.detail.length > 0) {
            // Attempt to get the specific message (pydantic validation error message) for 422 errors
            errorMessage = errorResponse.data.detail[0].msg || JSON.stringify(errorResponse.data.detail[0]) || t('common:httpErrors.validationFailed');
          } else if (errorResponse.data && errorResponse.data.message) {
            // General error message from backend response
            errorMessage = errorResponse.data.message;
          } else if (errorResponse.data && typeof errorResponse.data === 'string') {
            // Check if response contains HTML content
            if (errorResponse.data.includes('<html>') || errorResponse.data.includes('<title>')) {
              // Extract meaningful error from HTML if possible
              const titleMatch = errorResponse.data.match(/<title>(.*?)<\/title>/i);
              const h1Match = errorResponse.data.match(/<h1>(.*?)<\/h1>/i);
              
              if (titleMatch && titleMatch[1]) {
                errorMessage = titleMatch[1].trim();
              } else if (h1Match && h1Match[1]) {
                errorMessage = h1Match[1].trim();
              } else {
                // Fallback for HTML responses
                errorMessage = t('common:httpErrors.serverError', { status: errorResponse.status });
              }
            } else {
              errorMessage = errorResponse.data;
            }
          } else if (errorResponse.status) {
            // Status-based error messages
            switch (errorResponse.status) {
              case 400:
                errorMessage = t('common:httpErrors.badRequest');
                break;
              case 401:
                errorMessage = t('common:httpErrors.unauthorized');
                break;
              case 403:
                errorMessage = t('common:httpErrors.forbidden');
                break;
              case 404:
                errorMessage = t('common:httpErrors.notFound');
                break;
              case 405:
                errorMessage = t('common:httpErrors.methodNotAllowed');
                break;
              case 409:
                errorMessage = t('messages.bpnlConflict');
                break;
              case 422:
                errorMessage = t('common:httpErrors.validationFailed');
                break;
              case 500:
                errorMessage = t('common:httpErrors.internalServer');
                break;
              case 502:
              case 503:
              case 504:
                errorMessage = t('common:httpErrors.serviceUnavailable');
                break;
              default:
                errorMessage = t('common:httpErrors.serverError', { status: errorResponse.status });
            }
          }
        } else if (axiosError instanceof Error && axiosError.message) {
          // Network or other errors
          const message = axiosError.message;
          if (message.includes('Network Error')) {
            errorMessage = t('common:httpErrors.networkError');
          } else if (message.includes('timeout')) {
            errorMessage = t('common:httpErrors.timeout');
          } else {
            errorMessage = t('common:httpErrors.connectionFailed');
          }
        }
        
        setApiErrorMessage(errorMessage);
      }
    }
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
          width: '60vw',
          height: 'auto',
          maxWidth: '60vw',
          maxHeight: '90vh',
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
        {partnerData ? t('dialog.editTitle') : t('dialog.createTitle')}
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
        }
      }}>
        <Grid2 container spacing={3}>
          <Grid2 size={12}>
            <Typography variant="h6" gutterBottom sx={{ 
              mb: 2, 
              color: 'text.primary',
              fontSize: '1.1rem',
              fontWeight: 500
            }}>
              {t('dialog.partnerInfo')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {t('dialog.partnerInfoDescription')}
            </Typography>
          </Grid2>
          
          <Grid2 size={{xs: 12, sm: 6}}>
            <TextField
              label={t('fields.partnerName')}
              variant="outlined"
              size="medium"
              error={error && !name.trim()}
              helperText={error && !name.trim() ? t('common:validation.required', { field: t('fields.name') }) : ''}
              fullWidth
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Grid2>
          
          <Grid2 size={{xs: 12, sm: 6}}>
            <TextField
              label={t('fields.partnerBpnl')}
              variant="outlined"
              size="medium"
              error={error && !bpnl.trim()}
              helperText={error && !bpnl.trim() ? t('common:validation.required', { field: t('fields.bpnl') }) : ''}
              fullWidth
              value={bpnl}
              onChange={(e) => setBpnl(e.target.value)}
              disabled={!!partnerData} // Disable if editing
            />
          </Grid2>
        </Grid2>

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
          {t('common:actions.close').toUpperCase()}
        </Button>
        <Button 
          onClick={handleCreate}
          variant="contained"
          color="primary"
          size="large"
          startIcon={partnerData ? <EditIcon /> : <AddIcon />}
          sx={{
            minWidth: '100px',
            textTransform: 'none',
            fontWeight: 500,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}
        >
          {partnerData ? t('common:actions.update').toUpperCase() : t('common:actions.create').toUpperCase()}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreatePartnerDialog;