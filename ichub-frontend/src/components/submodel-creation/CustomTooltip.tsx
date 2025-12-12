/********************************************************************************
 * Eclipse Tractus-X - Industry Core Hub Frontend
 *
 * Copyright (c) 2025 LKS Next
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

import CopyableUrnChip from './CopyableUrnChip';
import React, { useState, useRef } from 'react';
import { Box, Typography, Chip, Popper, Paper, ClickAwayListener, Snackbar, Alert } from '@mui/material';
import FingerprintIcon from '@mui/icons-material/Fingerprint';

interface CustomTooltipProps {
  title?: string;
  description?: string;
  urn?: string;
  children: React.ReactElement<any>;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ title = 'Description', description, urn, children }) => {
  const [open, setOpen] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [copiedValue, setCopiedValue] = useState<string | null>(null);
  const anchorRef = useRef<HTMLSpanElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const closeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleOpen = () => {
    if (closeTimeout.current) {
      clearTimeout(closeTimeout.current);
      closeTimeout.current = null;
    }
    setOpen(true);
  };
  const handleClose = () => {
    if (closeTimeout.current) clearTimeout(closeTimeout.current);
    closeTimeout.current = setTimeout(() => setOpen(false), 180);
  };

  // Snackbar handler for URN copy
  const handleCopySuccess = (urn: string) => {
    setCopiedValue(urn);
    setCopySuccess(true);
  };

  const shadowColor = '#23272f';
  const shadowSize = 5;

  return (
    <>
      <span
        ref={anchorRef}
        style={{ display: 'inline-flex', alignItems: 'center' }}
        onMouseEnter={handleOpen}
        onMouseLeave={handleClose}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            boxShadow: open ? `0 0 0 ${shadowSize}px ${shadowColor}` : 'none',
            borderRadius: '50%',
            transition: 'box-shadow 0.15s',
            boxSizing: 'content-box',
          }}
        >
          {React.cloneElement(children, {
            style: { ...children.props.style, cursor: 'pointer' },
          })}
        </span>
        <Popper open={open} anchorEl={anchorRef.current} placement="top" style={{ zIndex: 1500, marginBottom: shadowSize }} modifiers={[{ name: 'offset', options: { offset: [0, shadowSize] } }]}
          onMouseEnter={handleOpen}
          onMouseLeave={handleClose}
        >
          <ClickAwayListener onClickAway={handleClose}>
            <div
              ref={tooltipRef}
              style={{
                paddingTop: 16,
                paddingBottom: 16,
                marginTop: -16,
                marginBottom: -16,
                pointerEvents: 'auto',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <Paper elevation={4} sx={{ p: 2, minWidth: 180, maxWidth: 350, background: '#23272f', border: '1px solid #333', borderRadius: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'primary.main', mb: 0.5, fontSize: '13px' }}>
                  {title}
                </Typography>
                {description && (
                  <Typography variant="body2" sx={{ color: 'text.primary', mb: urn ? 1 : 0, fontSize: '12px' }}>
                    {description}
                  </Typography>
                )}
                {urn && (
                  <CopyableUrnChip urn={urn} onCopySuccess={handleCopySuccess} />
                )}
              </Paper>
            </div>
          </ClickAwayListener>
        </Popper>
      </span>
      <Snackbar
        open={copySuccess}
        autoHideDuration={2000}
        onClose={() => setCopySuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setCopySuccess(false)}
          severity="success"
          sx={{ width: '100%' }}
        >
          Copied to clipboard: {copiedValue}
        </Alert>
      </Snackbar>
    </>
  );
};

export default CustomTooltip;
