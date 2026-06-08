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

import { Box, Paper, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { CertificateStats, CertificateStatus } from '../../types/types';

interface SummaryStatsBarProps {
  stats: CertificateStats;
  activeStatusFilter: CertificateStatus | '';
  onFilterByStatus: (status: CertificateStatus | '') => void;
}

interface StatItem {
  key: CertificateStatus | '';
  labelKey: string;
  color: string;
  getValue: (s: CertificateStats) => number;
}

const STAT_ITEMS: StatItem[] = [
  { key: '', labelKey: 'statsBar.total', color: '#9D6FD4', getValue: (s) => s.total },
  { key: 'valid', labelKey: 'statsBar.valid', color: '#4caf50', getValue: (s) => s.valid },
  { key: 'expiring', labelKey: 'statsBar.expiring', color: '#ed8936', getValue: (s) => s.expiring },
  { key: 'expired', labelKey: 'statsBar.expired', color: '#f44336', getValue: (s) => s.expired },
];

export const SummaryStatsBar = ({ stats, activeStatusFilter, onFilterByStatus }: SummaryStatsBarProps) => {
  const { t } = useTranslation('certificateManagement');
  const handleClick = (key: CertificateStatus | '') => {
    if (key === '') {
      onFilterByStatus('');
      return;
    }
    onFilterByStatus(activeStatusFilter === key ? '' : key);
  };

  return (
    <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
      {STAT_ITEMS.map(({ key, labelKey, color, getValue }) => {
        const isActive = key === '' ? activeStatusFilter === '' : activeStatusFilter === key;
        return (
          <Paper
            key={key || 'total'}
            onClick={() => handleClick(key)}
            elevation={0}
            sx={{
              p: 2,
              borderRadius: '10px',
              border: `1px solid rgba(255,255,255,0.1)`,
              borderLeftWidth: '3px',
              borderLeftColor: color,
              backgroundColor: isActive ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.09)',
              cursor: 'pointer',
              flex: '1 1 120px',
              minWidth: 100,
              transition: 'all 0.2s ease',
              ...(isActive && {
                boxShadow: `0 0 0 1px ${color}`,
                borderColor: `${color}55`,
                borderLeftColor: color,
              }),
              '&:hover': {
                backgroundColor: isActive ? 'rgba(255,255,255,0.19)' : 'rgba(255,255,255,0.13)',
                transform: 'translateY(-1px)',
              },
            }}
          >
            <Typography
              variant="h4"
              sx={{ color, fontWeight: 700, lineHeight: 1, mb: 0.5 }}
            >
              {getValue(stats)}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: 'rgba(255,255,255,0.55)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                fontWeight: 500,
              }}
            >
              {t(labelKey)}
            </Typography>
          </Paper>
        );
      })}
    </Box>
  );
};
