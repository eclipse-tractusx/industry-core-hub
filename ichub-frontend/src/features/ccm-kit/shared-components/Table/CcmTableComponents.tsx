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

import React from 'react';
import { styled } from '@mui/material/styles';
import { Paper, TableRow, TableCell, TablePagination } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';

/**
 * Shared visual primitives for all CCM KIT tables.
 * Applies the Certificate Management visual style (gradient background,
 * translucent header row, per-cell borders) as the unified standard.
 */

interface CcmTablePaperProps {
  children: React.ReactNode;
  sx?: SxProps<Theme>;
}

export const CcmTablePaper = ({ children, sx }: CcmTablePaperProps) => (
  <Paper
    sx={[
      {
        borderRadius: '10px',
        border: '1px solid rgba(255,255,255,0.08)',
        background: 'linear-gradient(135deg, rgba(30,30,30,0.95) 0%, rgba(20,20,20,0.95) 100%)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      },
      ...(Array.isArray(sx) ? sx : sx != null ? [sx] : []),
    ]}
  >
    {children}
  </Paper>
);

export const CcmHeaderRow = styled(TableRow)({
  backgroundColor: 'rgba(255,255,255,0.06)',
});

export const CcmHeaderCell = styled(TableCell)({
  color: 'rgba(255,255,255,0.6)',
  fontWeight: 600,
  fontSize: '0.7rem',
  textTransform: 'uppercase',
  letterSpacing: '0.07em',
  borderBottom: '1px solid rgba(255,255,255,0.1)',
});

export const CcmBodyRow = styled(TableRow)({
  cursor: 'pointer',
  '&:last-child td': { border: 0 },
  '&:hover': { backgroundColor: 'rgba(255,255,255,0.06)' },
});

export const CcmBodyCell = styled(TableCell)({
  borderBottom: '1px solid rgba(255,255,255,0.06)',
});

export const CcmTablePagination = styled(TablePagination)({
  color: 'rgba(255,255,255,0.6)',
  borderTop: '1px solid rgba(255,255,255,0.08)',
  '& .MuiTablePagination-selectIcon': { color: 'rgba(255,255,255,0.5)' },
  '& .MuiTablePagination-select': { color: 'rgba(255,255,255,0.8)' },
  '& .MuiIconButton-root': { color: 'rgba(255,255,255,0.6)' },
  '& .MuiIconButton-root.Mui-disabled': { color: 'rgba(255,255,255,0.2)' },
}) as typeof TablePagination;
