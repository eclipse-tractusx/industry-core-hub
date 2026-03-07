/********************************************************************************
 * Eclipse Tractus-X - Industry Core Hub Frontend
 *
 * Copyright (c) 2026 LKS Next
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
import { Box, IconButton, Typography, Tooltip } from '@mui/material';
import {
  Close,
  OpenInFull,
  CloseFullscreen,
  ChevronLeft,
  ChevronRight,
  Inbox,
} from '@mui/icons-material';
import { useNotifications } from '../contexts/NotificationContext';
import NotificationInbox from './NotificationInbox';
import NotificationDetail from './NotificationDetail';

/**
 * Main notifications panel component
 * Displays as a floating panel on the right side of the screen
 * Now implements an inbox/email-like interface for Digital Twin notifications
 */
const NotificationsPanel: React.FC = () => {
  const {
    isPanelOpen,
    panelSize,
    closePanel,
    expandPanel,
    collapsePanel,
    selectedNotification,
    getStats,
  } = useNotifications();

  const { t } = useTranslation('notifications');

  if (!isPanelOpen) return null;

  const isExpanded = panelSize === 'expanded';
  const stats = getStats();

  return (
    <>
      {/* Overlay background */}
      <Box
        onClick={closePanel}
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          zIndex: isExpanded ? 1299 : 1199,
          opacity: isPanelOpen ? 1 : 0,
          transition: 'opacity 0.3s ease-out',
          backdropFilter: 'blur(2px)',
        }}
      />

      {/* Panel */}
      <Box
        sx={{
          position: 'fixed',
          top: isExpanded ? 0 : '64px',
          right: 0,
          bottom: 0,
          width: isExpanded ? '100vw' : '420px',
          maxWidth: '100vw',
          backgroundColor: 'rgba(0, 42, 126, 0.98)',
          backdropFilter: 'blur(20px)',
          boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.4)',
          zIndex: isExpanded ? 1300 : 1200,
          display: 'flex',
          flexDirection: 'row',
          overflow: 'hidden',
          animation: 'slideInFromRight 0.3s ease-out',
          transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1), top 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          borderLeft: isExpanded ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
          '@keyframes slideInFromRight': {
            from: {
              opacity: 0,
              transform: 'translateX(100%)',
            },
            to: {
              opacity: 1,
              transform: 'translateX(0)',
            },
          },
        }}
      >
        {/* Left Collapse/Expand Toggle */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '28px',
            minWidth: '28px',
            backgroundColor: 'rgba(0, 0, 0, 0.15)',
            borderRight: '1px solid rgba(255, 255, 255, 0.1)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
            },
          }}
          onClick={isExpanded ? collapsePanel : expandPanel}
        >
          <Tooltip title={isExpanded ? t('panel.collapse') : t('panel.expand')} placement="right" arrow>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'rgba(255, 255, 255, 0.6)',
                transition: 'color 0.2s ease',
                '&:hover': {
                  color: 'white',
                },
              }}
            >
              {isExpanded ? <ChevronRight /> : <ChevronLeft />}
            </Box>
          </Tooltip>
        </Box>

        {/* Main Panel Content */}
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.15)',
              background:
                'linear-gradient(135deg, rgba(66, 165, 245, 0.2) 0%, rgba(25, 118, 210, 0.2) 100%)',
              minHeight: '64px',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Inbox sx={{ color: 'white', fontSize: '1.4rem' }} />
              <Typography
                variant="h6"
                sx={{
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '1.1rem',
                }}
              >
                {t('panel.title')}
              </Typography>
              {stats.unread > 0 && (
                <Box
                  sx={{
                    backgroundColor: '#f44336',
                    color: 'white',
                    borderRadius: '12px',
                    padding: '2px 8px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    minWidth: '20px',
                    textAlign: 'center',
                  }}
                >
                  {stats.unread > 99 ? '99+' : stats.unread}
                </Box>
              )}
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Tooltip title={isExpanded ? t('panel.collapse') : t('panel.expand')} arrow>
                <IconButton
                  onClick={isExpanded ? collapsePanel : expandPanel}
                  sx={{
                    color: 'rgba(255, 255, 255, 0.8)',
                    '&:hover': {
                      color: 'white',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    },
                  }}
                >
                  {isExpanded ? <CloseFullscreen /> : <OpenInFull />}
                </IconButton>
              </Tooltip>
              <Tooltip title={t('panel.close')} arrow>
                <IconButton
                  onClick={closePanel}
                  sx={{
                    color: 'rgba(255, 255, 255, 0.8)',
                    '&:hover': {
                      color: 'white',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    },
                  }}
                >
                  <Close />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          {/* Content */}
          <Box
            sx={{
              flex: 1,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'row',
            }}
          >
            {/* Inbox List - Always visible in expanded mode, or when no notification selected */}
            <Box
              sx={{
                width: isExpanded && selectedNotification ? '380px' : '100%',
                minWidth: isExpanded && selectedNotification ? '380px' : 'auto',
                borderRight:
                  isExpanded && selectedNotification
                    ? '1px solid rgba(255, 255, 255, 0.1)'
                    : 'none',
                display: isExpanded || !selectedNotification ? 'flex' : 'none',
                flexDirection: 'column',
                overflow: 'hidden',
                transition: 'width 0.3s ease-out',
              }}
            >
              <NotificationInbox />
            </Box>

            {/* Notification Detail - Only visible when a notification is selected */}
            {selectedNotification && (
              <Box
                sx={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  animation: 'fadeIn 0.2s ease-out',
                  '@keyframes fadeIn': {
                    from: { opacity: 0 },
                    to: { opacity: 1 },
                  },
                }}
              >
                <NotificationDetail />
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    </>
  );
};

export default NotificationsPanel;
