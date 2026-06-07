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

import { ReactNode } from 'react';
import { Box, Drawer, IconButton, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

interface InfoPanelProps {
  open: boolean;
  onClose: () => void;
  /** Primary title shown in the purple CCM header. */
  title: string;
  /** Optional chips / badges rendered below the title in the header. */
  headerChips?: ReactNode;
  /** Free-form panel content. */
  children: ReactNode;
  /** Drawer width in pixels (default: 420). */
  width?: number;
}

/**
 * Generic right-anchored info panel for all CCM KIT features.
 *
 * - Uses the CCM purple gradient header (same as CcmDialog).
 * - z-index 1500 ensures it always renders above fullscreen Dialogs (z-index 1300).
 * - `children` is free-form — specialised panels (e.g. CertificateInfoPanel) wrap this.
 */
const InfoPanel = ({
  open,
  onClose,
  title,
  headerChips,
  children,
  width = 420,
}: InfoPanelProps) => (
  <Drawer
    anchor="right"
    open={open}
    onClose={onClose}
    sx={{ zIndex: 1500 }}
    PaperProps={{
      sx: {
        width,
        backgroundColor: '#121827',
        borderLeft: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        flexDirection: 'column',
      },
    }}
  >
    {/* ── CCM-branded header ───────────────────────────────────────────── */}
    <Box
      sx={{
        flexShrink: 0,
        backgroundColor: 'primary.main',
        px: 2.5,
        py: 2,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1.5,
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="subtitle1"
          sx={{
            color: '#fff',
            fontWeight: 700,
            lineHeight: 1.3,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {title || '—'}
        </Typography>
        {headerChips && (
          <Box sx={{ display: 'flex', gap: 0.75, mt: 0.75, flexWrap: 'wrap' }}>
            {headerChips}
          </Box>
        )}
      </Box>
      <IconButton
        size="small"
        onClick={onClose}
        sx={{
          color: 'rgba(255,255,255,0.8)',
          mt: -0.5,
          '&:hover': { backgroundColor: 'rgba(255,255,255,0.15)' },
        }}
      >
        <CloseIcon fontSize="small" />
      </IconButton>
    </Box>

    {/* ── Scrollable content ───────────────────────────────────────────── */}
    <Box sx={{ flex: 1, overflowY: 'auto' }}>
      {children}
    </Box>
  </Drawer>
);

export default InfoPanel;
