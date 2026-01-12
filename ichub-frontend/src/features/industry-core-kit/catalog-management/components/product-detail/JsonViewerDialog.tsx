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
import { Button } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';

import { ProductDetailDialogProps } from '@/features/industry-core-kit/catalog-management/types/dialog-types';
import { useEscapeDialog } from '@/hooks/useEscapeKey';

const JsonViewerDialog = ({ open, onClose, partData }: ProductDetailDialogProps) => {
    const [copied, setCopied] = useState(false);
    const title = partData?.name ? `${partData.name} JSON data` : "DCM JSON Data";

    useEscapeDialog(onClose, open);

    const handleCopy = () => {
        const json_string = JSON.stringify(partData, null, 2);
        navigator.clipboard.writeText(json_string)
          .then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          })
          .catch((error) => {
            console.error("Failed to copy text: ", error);
          });
      };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xl" className='custom-dialog'>
            <DialogTitle sx={{ m: 0, p: 2 }}>
                {title}
            </DialogTitle>
            <IconButton
                aria-label="close"
                onClick={onClose}
                sx={(theme) => ({
                    position: 'absolute',
                    right: 21,
                    top: 21,
                    color: theme.palette.grey[500],
                    zIndex: 1,
                    '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    }
                })}
                >
                <CloseIcon />
            </IconButton>
            <DialogContent dividers>
                <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: '#f4f4f4', padding: '0 10px 5px 10px', borderRadius: '5px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '4px' }}>
                        <span className='mr-3'>{copied ? 'JSON copied ✅' : ''}</span>
                        <Button variant="text" onClick={handleCopy} size='small' className='copy-button'>
                            <ContentCopyIcon />
                        </Button>
                    </div>
                    <code style={{ textAlign: 'left', display: 'block' }}>
                        {JSON.stringify(partData, null, 2)}
                    </code>
                </pre>
            </DialogContent>
            <DialogActions>
                <Button className="close-button" variant="outlined" size="small" onClick={onClose}>
                <CloseIcon />
                    <span className="close-button-content">CLOSE</span>
                </Button>
            </DialogActions>
        </Dialog>
    )
}

export default JsonViewerDialog