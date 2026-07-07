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
import { Box, Typography, Grid2, Paper, Chip, IconButton, Link, Tooltip, ClickAwayListener } from '@mui/material';
import { Description, Category, Link as LinkIcon, OpenInNew, InfoOutlined } from '@mui/icons-material';

interface SourceItem {
  header?: string;
  category?: string;
  type?: string;
  content?: string;
}

interface SourcesRendererProps {
  data: any;
  rawData: Record<string, unknown>;
}

/**
 * Custom renderer for sources array
 * Displays document references with header, category, type, and content
 */
export const SourcesRenderer: React.FC<SourcesRendererProps> = ({ rawData }) => {
  const sources = rawData.sources as SourceItem[] | undefined;

  if (!sources || !Array.isArray(sources) || sources.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
          No source documents available
        </Typography>
      </Box>
    );
  }

  return (
    <Grid2 container spacing={{ xs: 1.5, sm: 2 }}>
      {sources.map((source, index) => (
        <SourceItemRenderer key={index} source={source} index={index} />
      ))}
    </Grid2>
  );
};

/**
 * Component for rendering individual source items
 */
const SourceItemRenderer: React.FC<{ source: SourceItem; index: number }> = ({ source, index }) => {
  const [tooltipOpen, setTooltipOpen] = useState(false);

  const isUrl = source.type?.toUpperCase() === 'URL';
  const hasContent = source.content && source.content.trim().length > 0;

  return (
    <Grid2 size={{ xs: 12, md: 6 }}>
      <Paper
        elevation={0}
        sx={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 2,
          overflow: 'hidden',
          transition: 'all 0.2s ease',
          '&:hover': {
            background: 'rgba(255, 255, 255, 0.05)',
            borderColor: 'rgba(102, 126, 234, 0.3)',
            transform: 'translateY(-2px)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
          }
        }}
      >
        <Box sx={{ p: { xs: 2, sm: 2.5 } }}>
          {/* Header Section */}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.5, mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1, minWidth: 0 }}>
              <Box
                sx={{
                  p: 1,
                  borderRadius: 1.5,
                  background: 'rgba(102, 126, 234, 0.15)',
                  color: '#667eea',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <Description sx={{ fontSize: 22 }} />
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  variant="h6"
                  sx={{
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: { xs: '0.95rem', sm: '1.05rem' },
                    mb: 0.5,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical'
                  }}
                >
                  {source.header || `Document ${index + 1}`}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                  <Chip
                    label={`#${index + 1}`}
                    size="small"
                    sx={{
                      backgroundColor: 'rgba(102, 126, 234, 0.15)',
                      color: '#667eea',
                      fontSize: '0.65rem',
                      height: 20,
                      fontWeight: 600,
                      '& .MuiChip-label': { px: 1, py: 0 }
                    }}
                  />
                  {source.type && (
                    <Chip
                      icon={<LinkIcon sx={{ fontSize: 14 }} />}
                      label={source.type}
                      size="small"
                      sx={{
                        backgroundColor: 'rgba(118, 75, 162, 0.15)',
                        color: '#9b6ec7',
                        fontSize: '0.65rem',
                        height: 20,
                        '& .MuiChip-label': { px: 1, py: 0 },
                        '& .MuiChip-icon': { color: '#9b6ec7', fontSize: 14 }
                      }}
                    />
                  )}
                </Box>
              </Box>
            </Box>
          </Box>

          {/* Category */}
          {source.category && (
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Category sx={{ fontSize: 16, color: 'rgba(255, 255, 255, 0.4)' }} />
                <Typography
                  variant="caption"
                  sx={{
                    color: 'rgba(255, 255, 255, 0.5)',
                    fontSize: '0.7rem',
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}
                >
                  Category
                </Typography>
              </Box>
              <Typography
                variant="body2"
                sx={{
                  color: '#fff',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  pl: 3
                }}
              >
                {source.category}
              </Typography>
            </Box>
          )}

          {/* Content/Link */}
          {hasContent && (
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <LinkIcon sx={{ fontSize: 16, color: 'rgba(255, 255, 255, 0.4)' }} />
                <Typography
                  variant="caption"
                  sx={{
                    color: 'rgba(255, 255, 255, 0.5)',
                    fontSize: '0.7rem',
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}
                >
                  {isUrl ? 'Document Link' : 'Content'}
                </Typography>
              </Box>
              <Box sx={{ pl: 3 }}>
                {isUrl ? (
                  <Link
                    href={source.content}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{
                      color: '#667eea',
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 0.5,
                      fontSize: '0.875rem',
                      fontFamily: 'monospace',
                      wordBreak: 'break-all',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        color: '#8b9aef',
                        textDecoration: 'underline'
                      }
                    }}
                  >
                    {source.content}
                    <OpenInNew sx={{ fontSize: 14, ml: 0.5 }} />
                  </Link>
                ) : (
                  <Typography
                    variant="body2"
                    sx={{
                      color: '#fff',
                      fontSize: '0.875rem',
                      fontFamily: source.type === 'TEXT' ? 'inherit' : 'monospace',
                      wordBreak: 'break-word',
                      whiteSpace: 'pre-wrap'
                    }}
                  >
                    {source.content}
                  </Typography>
                )}
              </Box>
            </Box>
          )}
        </Box>
      </Paper>
    </Grid2>
  );
};
