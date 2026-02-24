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

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { DeleteCertificateDialogProps } from '../../types/dialog-types';

export const DeleteCertificateDialog = ({
  open,
  onClose,
  certificate,
  onConfirm
}: DeleteCertificateDialogProps) => {
  const handleConfirm = () => {
    if (certificate) {
      onConfirm(certificate.id);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <WarningAmberIcon color="error" />
        Delete Certificate
      </DialogTitle>
      <DialogContent>
        <Typography variant="body1">
          Are you sure you want to delete this certificate?
        </Typography>
        {certificate && (
          <Typography variant="subtitle1" fontWeight={600} sx={{ mt: 2 }}>
            {certificate.name}
          </Typography>
        )}
        <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
          This action cannot be undone. All shared references will also be removed.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleConfirm} variant="contained" color="error">
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );
};
