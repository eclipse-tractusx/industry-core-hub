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

import React, { useState } from 'react';
import { Box, Typography, Grid2, Paper, Collapse, IconButton, Chip, Tooltip, ClickAwayListener } from '@mui/material';
import { ExpandMore, ExpandLess, InfoOutlined, DataObject, DataArray } from '@mui/icons-material';
import { formatValue } from '../../../../utils/dataFormatter';

interface AdditionalDataItem {
  label: string;
  description?: string;
  type: {
    dataType: string;
    typeUnit?: string;
  };
  data?: any;
  children?: AdditionalDataItem[];
}

interface AdditionalDataRendererProps {
  data: any;
  rawData: Record<string, unknown>;
}

/**
 * Custom renderer for additionalData with recursive children support
 * Handles the special structure: { label, description, type: { dataType, typeUnit }, data, children }
 */
export const AdditionalDataRenderer: React.FC<AdditionalDataRendererProps> = ({ rawData }) => {
  const additionalData = rawData.additionalData as AdditionalDataItem[] | undefined;

  if (!additionalData || !Array.isArray(additionalData) || additionalData.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
          No additional data available
        </Typography>
      </Box>
    );
  }

  return (
    <Grid2 container spacing={{ xs: 1.5, sm: 2 }}>
      {additionalData.map((item, index) => (
        <AdditionalDataItemRenderer key={index} item={item} level={0} />
      ))}
    </Grid2>
  );
};

/**
 * Recursive component for rendering individual additional data items
 */
const AdditionalDataItemRenderer: React.FC<{ item: AdditionalDataItem; level: number }> = ({ item, level }) => {
  const [expanded, setExpanded] = useState(level < 2); // Auto-expand first 2 levels
  const [tooltipOpen, setTooltipOpen] = useState(false);

  const hasChildren = item.children && item.children.length > 0;
  const hasData = item.data !== undefined && item.data !== null;
  const dataType = item.type?.dataType || 'string';
  const typeUnit = item.type?.typeUnit;

  // Determine the icon based on data type
  const getIcon = () => {
    if (dataType === 'array') return DataArray;
    if (dataType === 'object') return DataObject;
    return DataObject;
  };

  const Icon = getIcon();

  // Format the data value based on type
  const formatDataValue = () => {
    if (!hasData) return null;

    if (Array.isArray(item.data)) {
      // For arrays, show count and expand to show items
      return (
        <Box>
          <Chip
            label={`${item.data.length} items`}
            size="small"
            sx={{
              backgroundColor: 'rgba(102, 126, 234, 0.15)',
              color: '#667eea',
              fontSize: '0.7rem',
              height: 22,
              mb: 1
            }}
          />
          <Grid2 container spacing={1}>
            {item.data.map((val: any, idx: number) => (
              <Grid2 key={idx} size={{ xs: 12, sm: 6, md: 4 }}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 1.5,
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: 1
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'rgba(255, 255, 255, 0.5)',
                      fontSize: '0.65rem',
                      display: 'block',
                      mb: 0.5
                    }}
                  >
                    Item {idx + 1}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: '#fff',
                      fontSize: '0.875rem'
                    }}
                  >
                    {formatValue(val, typeof val)}
                    {typeUnit && <span style={{ marginLeft: '4px', color: 'rgba(255, 255, 255, 0.6)' }}>{typeUnit}</span>}
                  </Typography>
                </Paper>
              </Grid2>
            ))}
          </Grid2>
        </Box>
      );
    }

    // For primitive values
    return (
      <Typography
        variant="body1"
        sx={{
          color: '#fff',
          fontWeight: 500,
          fontSize: '0.95rem'
        }}
      >
        {formatValue(item.data, dataType)}
        {typeUnit && <span style={{ marginLeft: '4px', color: 'rgba(255, 255, 255, 0.6)' }}>{typeUnit}</span>}
      </Typography>
    );
  };

  return (
    <Grid2 size={{ xs: 12 }}>
      <Paper
        elevation={0}
        sx={{
          background: `rgba(255, 255, 255, ${Math.max(0.02, 0.05 - level * 0.01)})`,
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 2,
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <Box
          sx={{
            p: { xs: 1.5, sm: 2 },
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: hasChildren ? 'pointer' : 'default',
            transition: 'background 0.2s',
            '&:hover': hasChildren ? {
              background: 'rgba(255, 255, 255, 0.03)'
            } : {}
          }}
          onClick={() => hasChildren && setExpanded(!expanded)}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 1.5 }, flex: 1 }}>
            <Box
              sx={{
                p: { xs: 0.75, sm: 1 },
                borderRadius: 1.5,
                background: 'rgba(102, 126, 234, 0.15)',
                color: '#667eea',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Icon sx={{ fontSize: { xs: 18, sm: 20 } }} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
                <Typography
                  variant="body1"
                  sx={{
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: { xs: '0.9rem', sm: '1rem' }
                  }}
                >
                  {item.label}
                </Typography>
                <Chip
                  label={dataType}
                  size="small"
                  sx={{
                    backgroundColor: 'rgba(102, 126, 234, 0.15)',
                    color: '#667eea',
                    fontSize: '0.6rem',
                    height: 20,
                    fontFamily: 'monospace',
                    '& .MuiChip-label': { px: 1, py: 0 }
                  }}
                />
                {hasChildren && (
                  <Chip
                    label={`${item.children!.length} ${item.children!.length === 1 ? 'child' : 'children'}`}
                    size="small"
                    sx={{
                      backgroundColor: 'rgba(118, 75, 162, 0.15)',
                      color: '#9b6ec7',
                      fontSize: '0.65rem',
                      height: 20,
                      '& .MuiChip-label': { px: 1, py: 0 }
                    }}
                  />
                )}
              </Box>
              {item.description && (
                <Typography
                  variant="caption"
                  sx={{
                    color: 'rgba(255, 255, 255, 0.5)',
                    fontSize: '0.75rem',
                    display: 'block'
                  }}
                >
                  {item.description}
                </Typography>
              )}
            </Box>
            {item.description && (
              <ClickAwayListener onClickAway={() => setTooltipOpen(false)}>
                <Tooltip
                  title={item.description}
                  arrow
                  placement="top"
                  open={tooltipOpen}
                  disableHoverListener
                  disableFocusListener
                  slotProps={{
                    tooltip: {
                      sx: {
                        backgroundColor: 'rgba(30, 30, 30, 0.95)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: 2,
                        padding: 2,
                        fontSize: '0.8rem',
                        maxWidth: 300
                      }
                    },
                    arrow: {
                      sx: {
                        color: 'rgba(30, 30, 30, 0.95)',
                        '&::before': {
                          border: '1px solid rgba(255, 255, 255, 0.1)'
                        }
                      }
                    }
                  }}
                >
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      setTooltipOpen(!tooltipOpen);
                    }}
                    sx={{
                      p: 0.5,
                      color: 'rgba(102, 126, 234, 0.7)',
                      '&:hover': {
                        color: '#667eea',
                        backgroundColor: 'rgba(102, 126, 234, 0.1)'
                      }
                    }}
                  >
                    <InfoOutlined sx={{ fontSize: 18 }} />
                  </IconButton>
                </Tooltip>
              </ClickAwayListener>
            )}
          </Box>
          {hasChildren && (
            <IconButton
              size="small"
              sx={{
                color: 'rgba(255, 255, 255, 0.5)',
                ml: 1,
                p: 1
              }}
            >
              {expanded ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          )}
        </Box>

        {/* Data Value (if present and no children, or alongside children) */}
        {hasData && (
          <Box
            sx={{
              px: { xs: 1.5, sm: 2 },
              pb: hasChildren ? 1 : 2,
              pt: 0
            }}
          >
            {formatDataValue()}
          </Box>
        )}

        {/* Children (recursive) */}
        {hasChildren && (
          <Collapse in={expanded}>
            <Box
              sx={{
                p: { xs: 1.5, sm: 2 },
                pt: hasData ? 1 : 0,
                borderTop: '1px solid rgba(255, 255, 255, 0.05)'
              }}
            >
              <Grid2 container spacing={{ xs: 1.5, sm: 2 }}>
                {item.children!.map((child, idx) => (
                  <AdditionalDataItemRenderer key={idx} item={child} level={level + 1} />
                ))}
              </Grid2>
            </Box>
          </Collapse>
        )}
      </Paper>
    </Grid2>
  );
};
