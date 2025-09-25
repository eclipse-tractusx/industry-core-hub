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

import PersonIcon from '@mui/icons-material/Person'
import { type Palette, useTheme } from '@mui/material'
import MuiChip from '@mui/material/Chip'
import { StatusVariants } from '../../../../types/statusVariants'

export interface CardChipProps {
  status?: StatusVariants
  statusText?: string
  dtrIndex?: number
  useDtrDisplay?: boolean
}

interface ChipStyle {
  color: keyof Palette['chip']
  backgroundColor: keyof Palette['chip']
  border: keyof Palette['chip']
}

const statusStyles: Record<StatusVariants | 'default', ChipStyle> = {
  [StatusVariants.registered]: {
    color: 'registered',
    backgroundColor: 'black',
    border: 'bgRegistered',
  },
  [StatusVariants.shared]: {
    color: 'black',
    backgroundColor: 'warning',
    border: 'none',
  },
  [StatusVariants.draft]: {
    color: 'bgDefault',
    backgroundColor: 'none',
    border: 'borderDraft',
  },
  [StatusVariants.pending]: {
    color: 'inReview',
    backgroundColor: 'bgInReview',
    border: 'inReview',
  },
  default: {
    color: 'default',
    backgroundColor: 'bgDefault',
    border: 'none',
  }
}

// Helper function to get consistent colors for DTR identifiers
const getDtrColor = (dtrIndex: number) => {
  const baseColors = [
    { bg: 'rgba(76, 175, 80, 0.9)', color: 'white' }, // Green
    { bg: 'rgba(33, 150, 243, 0.9)', color: 'white' }, // Blue
    { bg: 'rgba(255, 152, 0, 0.9)', color: 'white' }, // Orange
    { bg: 'rgba(156, 39, 176, 0.9)', color: 'white' }, // Purple
    { bg: 'rgba(244, 67, 54, 0.9)', color: 'white' }, // Red
    { bg: 'rgba(0, 188, 212, 0.9)', color: 'white' }, // Cyan
    { bg: 'rgba(139, 195, 74, 0.9)', color: 'white' }, // Light Green
    { bg: 'rgba(121, 85, 72, 0.9)', color: 'white' }, // Brown
  ];
  
  const colorIndex = dtrIndex % baseColors.length;
  const variation = Math.floor(dtrIndex / baseColors.length);
  
  // For DTRs beyond 8, add opacity variations to distinguish them
  const baseColor = baseColors[colorIndex];
  const opacity = Math.max(0.7, 1 - (variation * 0.1)); // Gradually reduce opacity
  
  return {
    bg: baseColor.bg.replace('0.9)', `${opacity})`),
    color: baseColor.color
  };
};

export const DiscoveryCardChip = ({ status, statusText, dtrIndex, useDtrDisplay }: CardChipProps) => {
  const theme = useTheme()

  // If DTR display is requested and dtrIndex is provided, use DTR styling
  if (useDtrDisplay && dtrIndex !== undefined) {
    const dtrColors = getDtrColor(dtrIndex);
    return (
      <MuiChip
        label={`DTR ${dtrIndex + 1}`}
        variant="outlined"
        sx={{
          color: dtrColors.color,
          backgroundColor: dtrColors.bg,
          borderRadius: '4px',
          border: 'none',
          height: '28px',
          fontWeight: '600',
        }}
      />
    );
  }

  // Otherwise, use original status styling
  const statusKey = status && statusStyles[status] ? status : 'default'
  const { color, backgroundColor, border } = statusStyles[statusKey]

  return (
    <MuiChip
      label={statusText}
      variant="outlined"
      sx={{
        color: theme.palette.chip[color],
        backgroundColor: theme.palette.chip[backgroundColor],
        borderRadius: '4px',
        border: theme.palette.chip[border],
        height: '28px',
      }}
      icon={statusKey==StatusVariants.shared?<PersonIcon sx={{color: '#000000', fontSize: '18px'}}/>:undefined}
    />
  )
}
