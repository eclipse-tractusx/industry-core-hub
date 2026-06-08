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
  TextField,
} from '@mui/material';
import ShareIcon from '@mui/icons-material/Share';
import CloseIcon from '@mui/icons-material/Close';
import { ShareCertificateDialogProps } from '../../types/dialog-types';
import { certificateManagementConfig } from '../../config';

export const ShareCertificateDialog = ({
  open,
  onClose,
  certificate,
  onShare,
}: ShareCertificateDialogProps) => {
  const { t } = useTranslation('certificateManagement');
  const [partnerBpn, setPartnerBpn] = useState('');
  const [error, setError] = useState('');

  const handleShare = () => {
    if (!partnerBpn.trim()) {
      setError(t('shareDialog.errors.partnerBpnRequired'));
      return;
    }
    if (!certificateManagementConfig.validation.bpn.pattern.test(partnerBpn)) {
      setError(certificateManagementConfig.validation.bpn.errorMessage);
      return;
    }
    if (certificate) {
      onShare(certificate.id, partnerBpn, 'PUSH');
      handleClose();
    }
  };

  const handleClose = () => {
    setPartnerBpn('');
    setError('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle
        sx={{
          backgroundColor: 'primary.main',
          color: 'primary.contrastText',
          px: 3,
          py: 2,
          pr: 6,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <ShareIcon sx={{ fontSize: 22, color: 'inherit' }} />
          <Box>
            <Typography
              variant="h6"
              sx={{ fontWeight: 600, color: 'inherit', lineHeight: 1.2 }}
            >
              {t('shareDialog.title')}
            </Typography>
            {certificate && (
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.75)' }}>
                {certificate.name}
              </Typography>
            )}
          </Box>
        </Box>
        <IconButton
          size="small"
          onClick={handleClose}
          aria-label="close"
          sx={{
            position: 'absolute',
            right: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'primary.contrastText',
            '&:hover': { backgroundColor: 'rgba(255,255,255,0.15)' },
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ backgroundColor: 'background.paper', px: 3, pt: 4, pb: 3 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {t('shareDialog.description')}
        </Typography>

        <TextField
          fullWidth
          label={t('shareDialog.partnerBpn')}
          value={partnerBpn}
          onChange={(e) => {
            setPartnerBpn(e.target.value);
            setError('');
          }}
          error={!!error}
          helperText={error || 'e.g. BPNL0000000000XX'}
          placeholder="BPNL..."
          size="small"
          sx={{ mb: 2 }}
        />
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
        <Button
          onClick={handleClose}
          variant="outlined"
          sx={{ textTransform: 'none' }}
        >
          {t('common.cancel')}
        </Button>
        <Button
          onClick={handleShare}
          variant="contained"
          sx={{ textTransform: 'none', fontWeight: 600 }}
        >
          {t('common.share')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
