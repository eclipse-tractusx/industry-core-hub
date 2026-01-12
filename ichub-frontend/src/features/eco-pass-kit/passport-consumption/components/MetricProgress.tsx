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
import { Box, Typography, Paper, LinearProgress } from '@mui/material';

interface MetricProgressProps {
  label: string;
  value: number;
  max: number;
  unit?: string;
  color?: 'primary' | 'success' | 'warning' | 'error';
  description?: string;
}

export const MetricProgress: React.FC<MetricProgressProps> = ({
  label,
  value,
  max,
  unit = '',
  color = 'primary',
  description
}) => {
  const percentage = Math.min((value / max) * 100, 100);

  const getColor = () => {
    switch (color) {
      case 'success':
        return '#43e97b';
      case 'warning':
        return '#fee140';
      case 'error':
        return '#fa709a';
      default:
        return '#667eea';
    }
  };

  return (
    <Paper
      sx={{
        p: { xs: 1.5, sm: 2.5 },
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: 2,
        transition: 'all 0.2s',
        '&:hover': {
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.12)'
        }
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: { xs: 1, sm: 1.5 }, gap: 1, flexWrap: 'wrap' }}>
        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', fontWeight: 500, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
          {label}
        </Typography>
        <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600, fontSize: { xs: '0.95rem', sm: '1.25rem' } }}>
          {value} {unit}
          {max > 0 && (
            <Typography component="span" variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.5)', ml: 0.5, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
              / {max} {unit}
            </Typography>
          )}
        </Typography>
      </Box>

      {max > 0 && (
        <Box sx={{ position: 'relative', mb: description ? 1 : 0 }}>
          <LinearProgress
            variant="determinate"
            value={percentage}
            sx={{
              height: { xs: 6, sm: 8 },
              borderRadius: 4,
              bgcolor: 'rgba(255, 255, 255, 0.08)',
              '& .MuiLinearProgress-bar': {
                bgcolor: getColor(),
                borderRadius: 4
              }
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              right: 0,
              top: '50%',
              transform: 'translateY(-50%)',
              mr: 1,
              fontSize: { xs: '0.6rem', sm: '0.65rem' },
              color: percentage > 50 ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.9)',
              fontWeight: 700,
              pointerEvents: 'none'
            }}
          >
            {percentage.toFixed(0)}%
          </Box>
        </Box>
      )}

      {description && (
        <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)', display: 'block', mt: 1, fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
          {description}
        </Typography>
      )}
    </Paper>
  );
};
