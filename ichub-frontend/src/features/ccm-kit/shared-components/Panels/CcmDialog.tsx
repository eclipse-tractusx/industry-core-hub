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
import {
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  IconButton,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

interface CcmDialogProps {
  open: boolean;
  onClose: () => void;
  /** Dialog title shown in the purple CCM header. */
  title: string;
  /** Optional subtitle line below the title. */
  subtitle?: string;
  /** Optional MUI icon rendered to the left of the title. */
  icon?: ReactNode;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  /** Footer slot — pass Cancel + primary action buttons. */
  actions: ReactNode;
  children: ReactNode;
}

/**
 * Standardised dialog wrapper for all CCM KIT dialogs.
 *
 * Layout:
 *  ┌──────────────────────────────────────┐
 *  │ [Purple gradient header]  [Close ✕]  │
 *  │   icon  Title                        │
 *  │         subtitle                     │
 *  ├──────────────────────────────────────┤
 *  │ content (white bg)                   │
 *  ├──────────────────────────────────────┤
 *  │ [actions — right-aligned]            │
 *  └──────────────────────────────────────┘
 */
const CcmDialog = ({
  open,
  onClose,
  title,
  subtitle,
  icon,
  maxWidth = 'md',
  fullWidth = true,
  actions,
  children,
}: CcmDialogProps) => (
  <Dialog
    open={open}
    onClose={onClose}
    maxWidth={maxWidth}
    fullWidth={fullWidth}
    PaperProps={{ sx: { borderRadius: 4 } }}
  >
    {/* ── CCM-branded header ───────────────────────────────────────────── */}
    <Box
      sx={{
        backgroundColor: 'primary.main',
        px: 3,
        py: 2,
        pr: 6,
        position: 'relative',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        {icon && (
          <Box sx={{ color: '#fff', display: 'flex', alignItems: 'center', '& .MuiSvgIcon-root': { fontSize: 22 } }}>
            {icon}
          </Box>
        )}
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.75)' }}>
              {subtitle}
            </Typography>
          )}
        </Box>
      </Box>
      <IconButton
        size="medium"
        onClick={onClose}
        aria-label="close"
        sx={{
          position: 'absolute',
          right: 12,
          top: 12,
          color: '#fff',
          '&:hover': { backgroundColor: 'rgba(244,67,54,0.18)', color: '#ef5350' },
        }}
      >
        <CloseIcon />
      </IconButton>
    </Box>

    {/* ── Content ──────────────────────────────────────────────────────── */}
    <DialogContent sx={{ backgroundColor: 'background.paper', p: 0 }}>
      {children}
    </DialogContent>

    {/* ── Footer ───────────────────────────────────────────────────────── */}
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
      {actions}
    </DialogActions>
  </Dialog>
);

export default CcmDialog;
