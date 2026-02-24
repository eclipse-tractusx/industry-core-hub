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
  Grid2,
  Typography,
  Chip,
  Divider,
  Box
} from '@mui/material';
import { ViewCertificateDialogProps } from '../../types/dialog-types';
import { certificateManagementConfig } from '../../config';

export const ViewCertificateDialog = ({
  open,
  onClose,
  certificate
}: ViewCertificateDialogProps) => {
  if (!certificate) return null;

  const getStatusColor = (status: string) => {
    const config = certificateManagementConfig.statusConfig[status as keyof typeof certificateManagementConfig.statusConfig];
    return config?.color || '#666';
  };

  const getCertificateTypeLabel = (type: string) => {
    const typeConfig = certificateManagementConfig.certificateTypes.find(t => t.value === type);
    return typeConfig?.label || type;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">{certificate.name}</Typography>
          <Chip
            label={certificate.status}
            size="small"
            sx={{
              backgroundColor: `${getStatusColor(certificate.status)}20`,
              color: getStatusColor(certificate.status),
              fontWeight: 500,
              textTransform: 'capitalize'
            }}
          />
        </Box>
      </DialogTitle>
      <DialogContent>
        <Grid2 container spacing={2}>
          <Grid2 size={12}>
            <Typography variant="caption" color="textSecondary">
              Certificate Type
            </Typography>
            <Typography variant="body1">
              {getCertificateTypeLabel(certificate.type)}
            </Typography>
          </Grid2>

          <Grid2 size={12}>
            <Divider />
          </Grid2>

          <Grid2 size={6}>
            <Typography variant="caption" color="textSecondary">
              BPN
            </Typography>
            <Typography variant="body1">
              {certificate.bpn}
            </Typography>
          </Grid2>

          <Grid2 size={6}>
            <Typography variant="caption" color="textSecondary">
              Issuer
            </Typography>
            <Typography variant="body1">
              {certificate.issuer}
            </Typography>
          </Grid2>

          <Grid2 size={12}>
            <Divider />
          </Grid2>

          <Grid2 size={6}>
            <Typography variant="caption" color="textSecondary">
              Valid From
            </Typography>
            <Typography variant="body1">
              {formatDate(certificate.validFrom)}
            </Typography>
          </Grid2>

          <Grid2 size={6}>
            <Typography variant="caption" color="textSecondary">
              Valid Until
            </Typography>
            <Typography variant="body1">
              {formatDate(certificate.validUntil)}
            </Typography>
          </Grid2>

          <Grid2 size={12}>
            <Divider />
          </Grid2>

          <Grid2 size={12}>
            <Typography variant="caption" color="textSecondary">
              Shared With
            </Typography>
            <Typography variant="body1">
              {certificate.sharedCount} partner{certificate.sharedCount !== 1 ? 's' : ''}
            </Typography>
          </Grid2>

          {certificate.documentUrl && (
            <>
              <Grid2 size={12}>
                <Divider />
              </Grid2>
              <Grid2 size={12}>
                <Button
                  variant="outlined"
                  href={certificate.documentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View Document
                </Button>
              </Grid2>
            </>
          )}
        </Grid2>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};
