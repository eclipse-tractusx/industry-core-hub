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

export const CardChip = ({ status, statusText }: CardChipProps) => {
  const theme = useTheme()

  // Ensure the status is valid; otherwise, use 'default'
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
