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
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  alpha
} from '@mui/material';
import {
  HourglassEmpty,
  CheckCircle,
  Cancel,
  LocalShipping,
  Notifications,
  Error as ErrorIcon
} from '@mui/icons-material';
import { PcfNotificationStatus } from '../api/pcfExchangeApi';

// PCF Green Theme
const PCF_PRIMARY = '#10b981';

interface NotificationStatusConfig {
  label: string;
  color: string;
  bgColor: string;
  icon: React.ElementType;
}

export const NOTIFICATION_STATUS_CONFIG: Record<PcfNotificationStatus, NotificationStatusConfig> = {
  PENDING: {
    label: 'Pending',
    color: '#eab308',
    bgColor: 'rgba(234, 179, 8, 0.15)',
    icon: HourglassEmpty
  },
  ACCEPTED: {
    label: 'Accepted',
    color: '#3b82f6',
    bgColor: 'rgba(59, 130, 246, 0.15)',
    icon: CheckCircle
  },
  REJECTED: {
    label: 'Rejected',
    color: '#9ca3af',
    bgColor: 'rgba(156, 163, 175, 0.15)',
    icon: Cancel
  },
  DELIVERED: {
    label: 'Delivered',
    color: PCF_PRIMARY,
    bgColor: 'rgba(16, 185, 129, 0.15)',
    icon: LocalShipping
  },
  FAILED: {
    label: 'Failed',
    color: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.15)',
    icon: ErrorIcon
  }
};

interface NotificationFiltersProps {
  selectedStatus: PcfNotificationStatus | 'ALL';
  counts: Record<PcfNotificationStatus, number>;
  onStatusChange: (status: PcfNotificationStatus | 'ALL') => void;
}

const NotificationFilters: React.FC<NotificationFiltersProps> = ({
  selectedStatus,
  counts,
  onStatusChange
}) => {
  const { t } = useTranslation('pcf');
  const totalCount = Object.values(counts).reduce((sum, count) => sum + count, 0);

  const statuses: Array<{ key: PcfNotificationStatus | 'ALL'; label: string; count: number; icon: React.ElementType; color: string }> = [
    {
      key: 'ALL',
      label: t('notifications.statusAll'),
      count: totalCount,
      icon: Notifications,
      color: PCF_PRIMARY
    },
    {
      key: 'PENDING',
      label: t('notifications.statusPending'),
      count: counts.PENDING,
      icon: NOTIFICATION_STATUS_CONFIG.PENDING.icon,
      color: NOTIFICATION_STATUS_CONFIG.PENDING.color
    },
    {
      key: 'ACCEPTED',
      label: t('notifications.statusAccepted'),
      count: counts.ACCEPTED,
      icon: NOTIFICATION_STATUS_CONFIG.ACCEPTED.icon,
      color: NOTIFICATION_STATUS_CONFIG.ACCEPTED.color
    },
    {
      key: 'DELIVERED',
      label: t('notifications.statusDelivered'),
      count: counts.DELIVERED,
      icon: NOTIFICATION_STATUS_CONFIG.DELIVERED.icon,
      color: NOTIFICATION_STATUS_CONFIG.DELIVERED.color
    },
    {
      key: 'REJECTED',
      label: t('notifications.statusRejected'),
      count: counts.REJECTED,
      icon: NOTIFICATION_STATUS_CONFIG.REJECTED.icon,
      color: NOTIFICATION_STATUS_CONFIG.REJECTED.color
    },
    {
      key: 'FAILED',
      label: t('notifications.statusFailed'),
      count: counts.FAILED,
      icon: NOTIFICATION_STATUS_CONFIG.FAILED.icon,
      color: NOTIFICATION_STATUS_CONFIG.FAILED.color
    }
  ];

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 1,
        flex: 1
      }}
    >
      {statuses.map(({ key, label, count, icon: Icon, color }) => {
        const isSelected = selectedStatus === key;
        
        return (
          <Box
            key={key}
            onClick={() => onStatusChange(key)}
            sx={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1,
              py: 0.75,
              px: 1.5,
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              background: isSelected
                ? alpha(color, 0.15)
                : 'transparent',
              border: isSelected
                ? `1px solid ${alpha(color, 0.4)}`
                : '1px solid rgba(255, 255, 255, 0.1)',
              '&:hover': {
                background: isSelected
                  ? alpha(color, 0.2)
                  : 'rgba(255, 255, 255, 0.05)',
                borderColor: isSelected
                  ? alpha(color, 0.5)
                  : 'rgba(255, 255, 255, 0.2)'
              }
            }}
          >
            <Icon sx={{ fontSize: 16, color: isSelected ? color : 'rgba(255, 255, 255, 0.5)' }} />
            <Typography
              variant="body2"
              sx={{
                fontWeight: isSelected ? 600 : 500,
                color: isSelected ? '#fff' : 'rgba(255, 255, 255, 0.7)',
                fontSize: '0.8rem'
              }}
            >
              {label}
            </Typography>
            <Box
              sx={{
                px: 0.75,
                py: 0.25,
                borderRadius: '6px',
                background: isSelected ? alpha(color, 0.3) : 'rgba(255, 255, 255, 0.08)',
                minWidth: 22,
                textAlign: 'center'
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 700,
                  fontSize: '0.7rem',
                  color: isSelected ? color : 'rgba(255, 255, 255, 0.6)'
                }}
              >
                {count}
              </Typography>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
};

export default NotificationFilters;
