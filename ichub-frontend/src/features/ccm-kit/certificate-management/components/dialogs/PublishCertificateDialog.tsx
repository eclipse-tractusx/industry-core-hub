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
 * License for the specific language governing permissions and limitations
 * under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 ********************************************************************************/

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
} from '@mui/material';
import PublishIcon from '@mui/icons-material/Publish';
import { PublishCertificateDialogProps } from '../../types/dialog-types';
import { certificateManagementConfig } from '../../config';

export const PublishCertificateDialog = ({
  open,
  onClose,
  certificate,
  onConfirm,
}: PublishCertificateDialogProps) => {
  const typeLabel = certificate?.type
    ? (certificateManagementConfig.certificateTypes.find((t) => t.value === certificate.type)?.label ?? certificate.type)
    : undefined;

  const handleConfirm = () => {
    if (certificate) {
      onConfirm(certificate.id);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle
        sx={{
          backgroundColor: 'primary.main',
          color: 'primary.contrastText',
          px: 3,
          py: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <PublishIcon sx={{ fontSize: 22, color: 'inherit' }} />
          <Typography variant="h6" sx={{ fontWeight: 600, color: 'inherit', lineHeight: 1.2 }}>
            Publish Certificate
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ backgroundColor: 'background.paper', px: 3, pt: 3, pb: 2 }}>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Are you sure you want to publish this certificate?
        </Typography>

        {certificate && (
          <Box
            sx={{
              px: 2,
              py: 1.5,
              borderRadius: 2,
              backgroundColor: 'rgba(25,118,210,0.08)',
              border: '1px solid rgba(25,118,210,0.2)',
              mb: 2,
            }}
          >
            <Typography variant="subtitle2" fontWeight={700} color="primary.main">
              {certificate.name}
            </Typography>
            {typeLabel && (
              <Typography variant="caption" color="text.secondary">
                {typeLabel}
              </Typography>
            )}
          </Box>
        )}

        <Typography variant="body2" color="text.secondary">
          Publishing will register this certificate in the network, making it
          discoverable by your partners through the Catena-X dataspace.
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
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          startIcon={<PublishIcon />}
          sx={{ textTransform: 'none', fontWeight: 600 }}
        >
          Publish
        </Button>
      </DialogActions>
    </Dialog>
  );
};
