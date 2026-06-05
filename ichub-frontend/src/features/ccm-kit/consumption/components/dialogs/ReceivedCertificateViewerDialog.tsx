/********************************************************************************
 * Eclipse Tractus-X - Industry Core Hub Frontend
 *
 * Copyright (c) 2026 Contributors to the Eclipse Foundation
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

import { Box, Dialog, DialogContent, DialogTitle, IconButton, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

interface ReceivedCertificateViewerDialogProps {
  open: boolean;
  title: string;
  /** Base64-encoded PDF content (without the data: prefix). */
  documentBase64: string | null;
  onClose: () => void;
}

const ReceivedCertificateViewerDialog = ({
  open,
  title,
  documentBase64,
  onClose,
}: ReceivedCertificateViewerDialogProps) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {title}
        <IconButton onClick={onClose} aria-label="close">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ height: '75vh', p: 0 }}>
        {documentBase64 ? (
          <Box
            component="iframe"
            title={title}
            src={`data:application/pdf;base64,${documentBase64}`}
            sx={{ width: '100%', height: '100%', border: 'none' }}
          />
        ) : (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No document content available for this certificate.
            </Typography>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ReceivedCertificateViewerDialog;
