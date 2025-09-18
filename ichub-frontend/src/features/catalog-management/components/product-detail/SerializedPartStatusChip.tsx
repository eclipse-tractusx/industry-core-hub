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

import React from 'react';
import { Chip } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import { useTheme } from '@mui/material';
import { StatusVariants } from '../../types/types';

export interface SerializedPartStatusChipProps {
  status: StatusVariants;
}

interface ChipStyle {
  color: string;
  backgroundColor: string;
  border: string;
}

const getStatusStyle = (status: StatusVariants): ChipStyle => {
  switch (status) {
    case StatusVariants.registered:
      return {
        color: 'rgb(255, 255, 255)',
        backgroundColor: 'rgba(40, 104, 255, 0.8)', // More visible blue background
        border: '2px solid rgba(40, 104, 255, 1)',
      };
    case StatusVariants.shared:
      return {
        color: 'rgb(0, 0, 0)',
        backgroundColor: 'rgba(255, 166, 0, 0.9)', // More visible orange background
        border: 'none',
      };
    case StatusVariants.pending:
      return {
        // Dark text on white background per design request
        color: 'rgb(33, 33, 33)',
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        border: '1px solid rgba(220, 220, 220, 0.9)',
      };
    case StatusVariants.draft:
      return {
        color: 'rgb(60, 60, 60)', // Dark text for better readability
        backgroundColor: 'rgba(255, 255, 255, 0.95)', // White background
        border: '1px solid rgba(200, 200, 200, 0.8)',
      };
    default:
      return {
        color: 'rgb(136, 136, 136)',
        backgroundColor: 'rgba(199, 197, 197, 0.8)',
        border: 'none',
      };
  }
};

export const SerializedPartStatusChip: React.FC<SerializedPartStatusChipProps> = ({ status }) => {
  const theme = useTheme();
  const style = getStatusStyle(status);

  return (
    <Chip
      label={status}
      variant="outlined"
      sx={{
        color: style.color,
        backgroundColor: style.backgroundColor,
        borderRadius: '4px',
        border: style.border,
        height: '28px',
      }}
      icon={status === StatusVariants.shared ? 
        <PersonIcon sx={{ 
          color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000', 
          fontSize: '18px' 
        }} /> : 
        undefined
      }
    />
  );
};
