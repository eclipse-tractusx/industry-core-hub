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

import IosShare from '@mui/icons-material/IosShare'
import MoreVert from '@mui/icons-material/MoreVert'
import { Box, Typography, IconButton, useTheme } from '@mui/material'
import { CardChip, StatusVariants } from './CardChip'

export interface AppContent {
  uuid?: string
  name?: string
  class?: string
  status?: StatusVariants
}

export interface CardDecisionProps {
  items: AppContent[]
  onShare: (e: string) => void
  onMore: (e: string) => void
  onClick: (e: string) => void
}

export enum ButtonEvents {
    SHARE,
    MORE
}

export const ProductCard = ({
  items,
  onShare,
  onMore,
  onClick,
}: CardDecisionProps) => {
  const theme = useTheme()

  const handleDecision = (
    e: React.SyntheticEvent,
    id: string,
    type: ButtonEvents
  ) => {
    e.stopPropagation()
    return (type == ButtonEvents.SHARE) ? onShare(id) : onMore(id)
  }

  return (
    <Box
      sx={{
        display: 'flex',
        msFlexWrap: 'wrap',
        flexWrap: 'wrap',
        justifyContent: 'center',
        marginRight: '-10px',
        marginLeft: '-10px',
      }}
    >
      {items.map((item) => {
        const id = item.uuid ?? ''
        const name = item.name ?? ''
        return (
          <Box
            key={id}
            sx={{
              paddingRight: '10px',
              paddingLeft: '10px',
              width: '270px',
              minWidth: '270px',
              marginBottom: '20px',
            }}
          >
            <Box
              sx={{
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                padding: '16px 28px',
                width: 'auto',
                height: '200px',
                background: '#FFFFFF',
                border: '1px solid #DCDCDC',
                borderRadius: '20px',
                flex: 'none',
                order: 1,
                alignSelf: 'stretch',
                flexGrow: 0,
                cursor: 'pointer',
                ':hover': {
                  boxShadow: theme.shadows['20'],
                },
              }}
              onClick={() => {
                onClick(id)
              }}
            >
              <Typography
                variant="h5"
                sx={{
                  height: '48px',
                  '-webkit-line-clamp': '2',
                  display: '-webkit-box',
                  '-webkit-box-orient': 'vertical',
                  overflow: 'hidden',
                }}
              >
                {name}
              </Typography>
              <Typography
                variant="label2"
                sx={{
                  color: '#999999',
                  height: '48px',
                }}
              >
                {item.class}
              </Typography>
              <Box sx={{ marginBottom: '10px' }}>
                <CardChip
                  status={item.status}
                  statusText={item.status}
                />
              </Box>
              {(item.status?.toLowerCase() as StatusVariants) !==
                StatusVariants.registerd && (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                  }}
                >
                  <IconButton
                    sx={{
                      padding: '5px',
                      border: '1px solid #5fb9ff42',
                      margin: '0 10px',
                      ':hover': {
                        boxShadow: '0px 0px 0px 3px rgb(41 184 112 / 40%)',
                        backgroundColor: 'transparent',
                      },
                    }}
                    onClick={(e) => {
                      handleDecision(e, id, ButtonEvents.SHARE)
                    }}
                  >
                    <IosShare sx={{ color: '#00AA55' }} />
                  </IconButton>
                  <IconButton
                    sx={{
                      padding: '5px',
                      border: '1px solidrgba(65, 65, 65, 0.88)',
                      ':hover': {
                        boxShadow: '0px 0px 0px 3px rgb(217 30 24 / 40%)',
                        backgroundColor: 'transparent',
                      },
                    }}
                    onClick={(e) => {
                      handleDecision(e, id, ButtonEvents.MORE)
                    }}
                  >
                    <MoreVert sx={{ color: 'gray' }} />
                  </IconButton>
                </Box>
              )}
            </Box>
          </Box>
        )
      })}
    </Box>
  )
}
