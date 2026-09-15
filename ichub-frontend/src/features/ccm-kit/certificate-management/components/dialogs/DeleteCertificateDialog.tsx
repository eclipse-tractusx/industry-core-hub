/********************************************************************************
 * Eclipse Tractus-X - Industry Core Hub Frontend
 *
 * Copyright (c) 2026 Contributors to the Eclipse Foundation
 * Copyright (c) 2026 LKS Next
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

import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton,
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CloseIcon from '@mui/icons-material/Close';
import { DeleteCertificateDialogProps } from '../../types/dialog-types';

export const DeleteCertificateDialog = ({
  open,
  onClose,
  certificate,
  onConfirm
}: DeleteCertificateDialogProps) => {
  const { t } = useTranslation('certificateManagement');
  const handleConfirm = () => {
    if (certificate) {
      onConfirm(certificate.id);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: { borderRadius: 4 } }}
    >
      <DialogTitle
        sx={{
          backgroundColor: 'primary.main',
          color: 'primary.contrastText',
          px: 3,
          py: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          pr: 6,
          position: 'relative',
        }}
      >
        <WarningAmberIcon sx={{ color: '#9D6FD4', fontSize: 22 }} />
        <Typography variant="h6" sx={{ fontWeight: 600, color: 'inherit', lineHeight: 1 }}>
          {t('deleteDialog.title')}
        </Typography>
        <IconButton
          size="medium"
          onClick={onClose}
          aria-label="close"
          sx={{
            position: 'absolute',
            right: 12,
            top: 9,
            color: 'primary.contrastText',
            '&:hover': { backgroundColor: 'rgba(255,255,255,0.15)' },
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ backgroundColor: 'background.paper', px: 3, pt: 3, pb: 3 }}>
        <Typography variant="body1" sx={{ mb: certificate ? 2 : 0, mt: 3 }}>
          {t('deleteDialog.confirmation')}
        </Typography>
        {certificate && (
          <Box
            sx={{
              px: 2,
              py: 1.5,
              borderRadius: 2,
              backgroundColor: 'rgba(211,47,47,0.08)',
              border: '1px solid rgba(211,47,47,0.3)',
              mb: 2,
            }}
          >
            <Typography variant="subtitle2" fontWeight={700} color="error.dark">
              {certificate.name}
            </Typography>
          </Box>
        )}
        <Typography variant="body2" color="text.secondary">
          {t('deleteDialog.warning')}
        </Typography>
      </DialogContent>

      <DialogActions
        sx={{
          px: 3,
          py: 2,
          borderTop: '1px solid',
          borderColor: 'divider',
          backgroundColor: 'grey.50',
          gap: 1,
        }}
      >
        <Button onClick={onClose} variant="outlined" sx={{ textTransform: 'none' }}>
          {t('common.cancel')}
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          color="error"
          sx={{ textTransform: 'none', fontWeight: 600 }}
        >
          {t('common.delete')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
