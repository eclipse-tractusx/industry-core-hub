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
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Typography,
  Box
} from '@mui/material';
import { ShareCertificateDialogProps } from '../../types/dialog-types';
import { certificateManagementConfig } from '../../config';

export const ShareCertificateDialog = ({
  open,
  onClose,
  certificate,
  onShare
}: ShareCertificateDialogProps) => {
  const [partnerBpn, setPartnerBpn] = useState('');
  const [method, setMethod] = useState<'PULL' | 'PUSH'>('PULL');
  const [error, setError] = useState('');

  const handleShare = () => {
    if (!partnerBpn.trim()) {
      setError('Partner BPN is required');
      return;
    }
    if (!certificateManagementConfig.validation.bpn.pattern.test(partnerBpn)) {
      setError(certificateManagementConfig.validation.bpn.errorMessage);
      return;
    }
    if (certificate) {
      onShare(certificate.id, partnerBpn, method);
      handleClose();
    }
  };

  const handleClose = () => {
    setPartnerBpn('');
    setMethod('PULL');
    setError('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Share Certificate</DialogTitle>
      <DialogContent>
        {certificate && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" color="textSecondary">
              Sharing certificate:
            </Typography>
            <Typography variant="subtitle1" fontWeight={600}>
              {certificate.name}
            </Typography>
          </Box>
        )}

        <TextField
          fullWidth
          label="Partner BPN"
          value={partnerBpn}
          onChange={(e) => {
            setPartnerBpn(e.target.value);
            setError('');
          }}
          error={!!error}
          helperText={error}
          placeholder="BPNL..."
          sx={{ mb: 3 }}
        />

        <FormControl component="fieldset">
          <FormLabel component="legend">Sharing Method</FormLabel>
          <RadioGroup
            value={method}
            onChange={(e) => setMethod(e.target.value as 'PULL' | 'PUSH')}
          >
            <FormControlLabel
              value="PULL"
              control={<Radio />}
              label={
                <Box>
                  <Typography variant="body1">EDC Pull</Typography>
                  <Typography variant="caption" color="textSecondary">
                    Partner will pull the certificate via EDC connector
                  </Typography>
                </Box>
              }
            />
            <FormControlLabel
              value="PUSH"
              control={<Radio />}
              label={
                <Box>
                  <Typography variant="body1">Notification Push</Typography>
                  <Typography variant="caption" color="textSecondary">
                    Certificate will be sent to partner via notification
                  </Typography>
                </Box>
              }
            />
          </RadioGroup>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button onClick={handleShare} variant="contained" color="primary">
          Share
        </Button>
      </DialogActions>
    </Dialog>
  );
};
