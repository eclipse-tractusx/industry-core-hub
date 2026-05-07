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
import { useTranslation } from 'react-i18next';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Collapse,
  Tooltip,
  alpha,
  IconButton,
  CircularProgress
} from '@mui/material';
import {
  Business,
  Inventory,
  CheckCircle,
  Cancel,
  ExpandMore,
  ExpandLess,
  AccessTime,
  Message,
  PriorityHigh,
  LocalShipping,
  Info,
  Refresh,
  Link as LinkIcon
} from '@mui/icons-material';
import { PcfNotification } from '../api/pcfExchangeApi';
import { NOTIFICATION_STATUS_CONFIG } from './NotificationFilters';

// PCF Green Theme
const PCF_PRIMARY = '#10b981';
const PCF_SECONDARY = '#059669';

interface NotificationCardProps {
  notification: PcfNotification;
  onAccept: (notificationId: string) => Promise<void>;
  onReject: (notificationId: string) => void;  // Opens reject dialog
  /** Called when user clicks the Refresh button on a PENDING request without a pcfLocation. */
  onRefreshPcf?: (notificationId: string) => Promise<void>;
  isProcessing?: boolean;
  viewMode?: 'card' | 'list';
}

const NotificationCard: React.FC<NotificationCardProps> = ({
  notification,
  onAccept,
  onReject,
  onRefreshPcf,
  isProcessing = false,
  viewMode = 'card'
}) => {
  const { t } = useTranslation('pcf');
  const [expanded, setExpanded] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isRefreshingPcf, setIsRefreshingPcf] = useState(false);

  const statusConfig = NOTIFICATION_STATUS_CONFIG[notification.status];
  const StatusIcon = statusConfig.icon;

  // Accept is only allowed for PENDING requests that already have a resolved pcfLocation.
  // When pcfLocation is absent, the provider needs to use the Refresh button to re-check.
  const isPending = notification.status === 'PENDING';
  const canAccept = isPending && !!notification.pcfLocation;

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return t('notifications.today', { time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
    } else if (diffDays === 1) {
      return t('notifications.yesterday', { time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
    } else if (diffDays < 7) {
      return t('notifications.daysAgo', { count: diffDays });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    }
  };

  const getPriorityColor = (priority?: string): string => {
    switch (priority) {
      case 'HIGH': return '#ef4444';
      case 'NORMAL': return '#3b82f6';
      case 'LOW': return '#9ca3af';
      default: return '#9ca3af';
    }
  };

  const handleAccept = async () => {
    setIsAccepting(true);
    try {
      await onAccept(notification.id);
    } finally {
      setIsAccepting(false);
    }
  };

  const handleRefreshPcf = async () => {
    if (!onRefreshPcf) return;
    setIsRefreshingPcf(true);
    try {
      await onRefreshPcf(notification.id);
    } finally {
      setIsRefreshingPcf(false);
    }
  };

  // List View - Structured two-row layout
  if (viewMode === 'list') {
    return (
      <Card
        sx={{
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '10px',
          transition: 'all 0.2s ease',
          '&:hover': {
            borderColor: isPending ? alpha(PCF_PRIMARY, 0.3) : 'rgba(255, 255, 255, 0.15)',
            backgroundColor: 'rgba(255, 255, 255, 0.07)'
          }
        }}
      >
        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
          {/* Main Row */}
          <Box sx={{ display: 'flex', alignItems: 'stretch' }}>
            {/* Left Section: Requester Info */}
            <Box 
              sx={{ 
                flex: '0 0 280px',
                p: 2,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center'
              }}
            >
              <Typography variant="body1" sx={{ fontWeight: 600, color: '#fff', mb: 0.5 }}>
                {notification.requesterName}
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                {notification.requesterId}
              </Typography>
            </Box>

            {/* Vertical Divider */}
            <Box sx={{ width: '1px', background: 'rgba(255, 255, 255, 0.1)', my: 1 }} />

            {/* Middle Section: Part Info */}
            <Box 
              sx={{ 
                flex: 1,
                p: 2,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Inventory sx={{ fontSize: 16, color: PCF_PRIMARY }} />
                <Typography variant="body2" sx={{ color: '#fff', fontWeight: 500 }}>
                  {notification.partName || t('notifications.unknownPart')}
                </Typography>
              </Box>
              <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)', fontFamily: 'monospace', pl: 3 }}>
                {notification.manufacturerPartId} · {notification.partInstanceId}
              </Typography>
              {notification.pcfLocation && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5, pl: 3 }}>
                  <LinkIcon sx={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }} />
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'rgba(255,255,255,0.45)',
                      fontFamily: 'monospace',
                      fontSize: '0.7rem',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: 260
                    }}
                  >
                    {notification.pcfLocation}
                  </Typography>
                </Box>
              )}
            </Box>

            {/* Right Section: Actions & Status */}
            <Box 
              sx={{ 
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                p: 2,
                pl: 0
              }}
            >
              {/* Action Buttons for PENDING requests */}
              {isPending && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                  {/* Refresh button — shown when pcfLocation is not yet resolved */}
                  {!notification.pcfLocation && onRefreshPcf && (
                    <>
                      <Tooltip title={t('notifications.recheckPcf')}>
                        <span>
                          <IconButton
                            size="small"
                            onClick={handleRefreshPcf}
                            disabled={isProcessing || isRefreshingPcf}
                            sx={{
                              color: PCF_PRIMARY,
                              border: `1px solid ${alpha(PCF_PRIMARY, 0.3)}`,
                              borderRadius: '8px',
                              mr: 1,
                              '&:hover': { background: alpha(PCF_PRIMARY, 0.1) },
                              '&.Mui-disabled': { color: 'rgba(255,255,255,0.2)', borderColor: 'rgba(255,255,255,0.1)' }
                            }}
                          >
                            {isRefreshingPcf
                              ? <CircularProgress size={16} sx={{ color: PCF_PRIMARY }} />
                              : <Refresh sx={{ fontSize: 16 }} />}
                          </IconButton>
                        </span>
                      </Tooltip>
                      {/* Vertical divider */}
                      <Box sx={{ width: '1px', height: 28, background: 'rgba(255,255,255,0.12)', mx: 1 }} />
                    </>
                  )}

                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title={!canAccept ? t('notifications.pcfLocationNotResolved') : ''}>
                      <span>
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<CheckCircle sx={{ fontSize: 16 }} />}
                          onClick={handleAccept}
                          disabled={!canAccept || isProcessing || isAccepting}
                          sx={{
                            px: 2.5,
                            py: 0.75,
                            borderRadius: '8px',
                            textTransform: 'none',
                            fontWeight: 600,
                            fontSize: '0.8rem',
                            background: `linear-gradient(135deg, ${PCF_PRIMARY} 0%, ${PCF_SECONDARY} 100%)`,
                            '&:hover': { background: `linear-gradient(135deg, ${PCF_SECONDARY} 0%, ${PCF_PRIMARY} 100%)` },
                            '&.Mui-disabled': { background: 'rgba(255, 255, 255, 0.1)', color: 'rgba(255, 255, 255, 0.3)' }
                          }}
                        >
                          {isAccepting ? t('notifications.accepting') : t('notifications.accept')}
                        </Button>
                      </span>
                    </Tooltip>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<Cancel sx={{ fontSize: 16 }} />}
                      onClick={() => onReject(notification.id)}
                      disabled={isProcessing || isAccepting}
                      sx={{
                        px: 2.5,
                        py: 0.75,
                        borderRadius: '8px',
                        textTransform: 'none',
                        fontWeight: 600,
                        fontSize: '0.8rem',
                        borderColor: 'rgba(255, 255, 255, 0.2)',
                        color: 'rgba(255, 255, 255, 0.7)',
                        '&:hover': { borderColor: '#ef4444', color: '#ef4444', background: alpha('#ef4444', 0.08) }
                      }}
                    >
                      {t('notifications.reject')}
                    </Button>
                  </Box>
                </Box>
              )}

              {/* Status Badge */}
              <Chip
                icon={<StatusIcon sx={{ fontSize: 14 }} />}
                label={t(`notifications.status${notification.status.charAt(0)}${notification.status.slice(1).toLowerCase()}`)}
                size="small"
                sx={{
                  minWidth: 100,
                  backgroundColor: statusConfig.bgColor,
                  color: statusConfig.color,
                  border: `1px solid ${alpha(statusConfig.color, 0.3)}`,
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  '& .MuiChip-icon': { color: statusConfig.color }
                }}
              />
            </Box>
          </Box>

          {/* Bottom Row: Message & Date */}
          <Box 
            sx={{ 
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: 2,
              py: 1.25,
              borderTop: '1px solid rgba(255, 255, 255, 0.06)',
              background: 'rgba(0, 0, 0, 0.15)'
            }}
          >
            {/* Message or placeholder */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
              {notification.message ? (
                <>
                  <Message sx={{ fontSize: 14, color: 'rgba(255, 255, 255, 0.4)' }} />
                  <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)', fontStyle: 'italic' }}>
                    "{notification.message}"
                  </Typography>
                </>
              ) : (
                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.3)' }}>
                  {t('notifications.noMessage')}
                </Typography>
              )}
            </Box>

            {/* Priority & Date */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {notification.priority && notification.priority !== 'NORMAL' && (
                <Chip
                  label={notification.priority}
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: '0.65rem',
                    fontWeight: 600,
                    backgroundColor: alpha(getPriorityColor(notification.priority), 0.15),
                    color: getPriorityColor(notification.priority),
                    border: `1px solid ${alpha(getPriorityColor(notification.priority), 0.3)}`
                  }}
                />
              )}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <AccessTime sx={{ fontSize: 14, color: 'rgba(255, 255, 255, 0.4)' }} />
                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                  {formatDate(notification.requestDate)}
                </Typography>
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>
    );
  }

  // Card View - Original layout
  return (
    <Card
      sx={{
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '12px',
        transition: 'all 0.2s ease',
        display: 'flex',
        flexDirection: 'column',
        height: 280,
        '&:hover': {
          borderColor: 'rgba(255, 255, 255, 0.15)',
          backgroundColor: 'rgba(255, 255, 255, 0.07)'
        }
      }}
    >
      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 }, display: 'flex', flexDirection: 'column', flex: 1 }}>
        {/* Header Row */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
          {/* Requester Info */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                p: 1,
                borderRadius: '8px',
                background: 'rgba(59, 130, 246, 0.15)'
              }}
            >
              <Business sx={{ fontSize: 20, color: '#3b82f6' }} />
            </Box>
            <Box>
              <Typography variant="body1" sx={{ fontWeight: 600, color: '#fff' }}>
                {notification.requesterName}
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: 'rgba(255, 255, 255, 0.5)', fontFamily: 'monospace' }}
              >
                {notification.requesterId}
              </Typography>
            </Box>
          </Box>

          {/* Status Badge & Priority */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {notification.priority === 'HIGH' && (
              <Tooltip title={t('notifications.highPriority')}>
                <PriorityHigh sx={{ fontSize: 20, color: '#ef4444' }} />
              </Tooltip>
            )}
            <Chip
              icon={<StatusIcon sx={{ fontSize: 14 }} />}
              label={t(`notifications.status${notification.status.charAt(0)}${notification.status.slice(1).toLowerCase()}`)}
              size="small"
              sx={{
                backgroundColor: statusConfig.bgColor,
                color: statusConfig.color,
                border: `1px solid ${alpha(statusConfig.color, 0.3)}`,
                fontWeight: 600,
                '& .MuiChip-icon': {
                  color: statusConfig.color
                }
              }}
            />
          </Box>
        </Box>

        {/* Part Info */}
        <Box
          sx={{
            p: 1.5,
            mb: 2,
            borderRadius: '8px',
            background: alpha(PCF_PRIMARY, 0.08),
            border: `1px solid ${alpha(PCF_PRIMARY, 0.15)}`
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Inventory sx={{ fontSize: 16, color: PCF_PRIMARY }} />
            <Typography variant="body2" sx={{ color: '#fff', fontWeight: 500 }}>
              {notification.partName || `${notification.manufacturerPartId}`}
            </Typography>
          </Box>
          <Typography
            variant="caption"
            sx={{ color: 'rgba(255, 255, 255, 0.5)', fontFamily: 'monospace', ml: 3 }}
          >
            {notification.manufacturerPartId}:{notification.partInstanceId}
          </Typography>
          {notification.pcfLocation && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5, ml: 3 }}>
              <LinkIcon sx={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }} />
              <Typography
                variant="caption"
                sx={{
                  color: 'rgba(255,255,255,0.45)',
                  fontFamily: 'monospace',
                  fontSize: '0.7rem',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: 220
                }}
              >
                {notification.pcfLocation}
              </Typography>
            </Box>
          )}
        </Box>

        {/* Request Details */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <AccessTime sx={{ fontSize: 14, color: 'rgba(255, 255, 255, 0.4)' }} />
            <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
              {t('notifications.requestedOn', { date: formatDate(notification.requestDate) })}
            </Typography>
          </Box>
          {notification.priority && (
            <Chip
              label={notification.priority}
              size="small"
              sx={{
                height: 20,
                fontSize: 10,
                fontWeight: 600,
                backgroundColor: alpha(getPriorityColor(notification.priority), 0.15),
                color: getPriorityColor(notification.priority),
                border: `1px solid ${alpha(getPriorityColor(notification.priority), 0.3)}`
              }}
            />
          )}
        </Box>

        {/* Message Preview (if exists) */}
        {notification.message && (
          <Box
            sx={{
              p: 1.5,
              mb: 2,
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.06)'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
              <Message sx={{ fontSize: 14, color: 'rgba(255, 255, 255, 0.4)', mt: 0.25 }} />
              <Typography
                variant="caption"
                sx={{
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontStyle: 'italic',
                  lineHeight: 1.5
                }}
              >
                "{notification.message}"
              </Typography>
            </Box>
          </Box>
        )}

        {/* Expandable Details (for non-pending) */}
        {!isPending && (
          <>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                color: 'rgba(255, 255, 255, 0.5)',
                '&:hover': { color: 'rgba(255, 255, 255, 0.7)' }
              }}
              onClick={() => setExpanded(!expanded)}
            >
              <Typography variant="caption">
                {expanded ? t('notifications.hideDetails') : t('notifications.showDetails')}
              </Typography>
              {expanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
            </Box>

            <Collapse in={expanded}>
              <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                {notification.responseDate && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <CheckCircle sx={{ fontSize: 14, color: statusConfig.color }} />
                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                      {t('notifications.respondedOn', { date: new Date(notification.responseDate).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) })}
                    </Typography>
                  </Box>
                )}
                {notification.rejectReason && (
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                    <Info sx={{ fontSize: 14, color: '#9ca3af', mt: 0.25 }} />
                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                      {t('notifications.reason')}: {notification.rejectReason}
                    </Typography>
                  </Box>
                )}
                {notification.status === 'DELIVERED' && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LocalShipping sx={{ fontSize: 14, color: PCF_PRIMARY }} />
                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                      {t('notifications.pcfDelivered')}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Collapse>
          </>
        )}

        {/* Action Buttons (for pending only) - Always at bottom */}
        {isPending && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 'auto', pt: 2, borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
            {/* Refresh button — shown when pcfLocation is not yet resolved.
                The user clicks this to trigger a backend re-check before accepting. */}
            {!notification.pcfLocation && onRefreshPcf && (
              <>
                <Tooltip title={t('notifications.recheckPcf')}>
                  <span>
                    <IconButton
                      size="small"
                      onClick={handleRefreshPcf}
                      disabled={isProcessing || isRefreshingPcf}
                      sx={{
                        color: PCF_PRIMARY,
                        border: `1px solid ${alpha(PCF_PRIMARY, 0.3)}`,
                        borderRadius: '8px',
                        '&:hover': { background: alpha(PCF_PRIMARY, 0.1) },
                        '&.Mui-disabled': { color: 'rgba(255,255,255,0.2)', borderColor: 'rgba(255,255,255,0.1)' }
                      }}
                    >
                      {isRefreshingPcf
                        ? <CircularProgress size={16} sx={{ color: PCF_PRIMARY }} />
                        : <Refresh sx={{ fontSize: 18 }} />}
                    </IconButton>
                  </span>
                </Tooltip>
                {/* Vertical divider between refresh and accept/reject */}
                <Box sx={{ width: '1px', height: 32, background: 'rgba(255,255,255,0.12)', flexShrink: 0 }} />
              </>
            )}

            <Tooltip title={!canAccept ? t('notifications.pcfLocationNotResolved') : ''} sx={{ flex: 1 }}>
              <span style={{ flex: 1 }}>
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<CheckCircle />}
                  onClick={handleAccept}
                  disabled={!canAccept || isProcessing || isAccepting}
                  sx={{
                    py: 1,
                    borderRadius: '10px',
                    textTransform: 'none',
                    fontWeight: 600,
                    background: `linear-gradient(135deg, ${PCF_PRIMARY} 0%, ${PCF_SECONDARY} 100%)`,
                    '&:hover': {
                      background: `linear-gradient(135deg, ${PCF_SECONDARY} 0%, ${PCF_PRIMARY} 100%)`
                    },
                    '&.Mui-disabled': {
                      background: 'rgba(255, 255, 255, 0.1)',
                      color: 'rgba(255, 255, 255, 0.3)'
                    }
                  }}
                >
                  {isAccepting ? t('notifications.accepting') : t('notifications.accept')}
                </Button>
              </span>
            </Tooltip>
            <Button
              variant="outlined"
              startIcon={<Cancel />}
              onClick={() => onReject(notification.id)}
              disabled={isProcessing || isAccepting}
              sx={{
                flex: 1,
                py: 1,
                borderRadius: '10px',
                textTransform: 'none',
                fontWeight: 600,
                borderColor: 'rgba(255, 255, 255, 0.2)',
                color: 'rgba(255, 255, 255, 0.7)',
                '&:hover': {
                  borderColor: '#ef4444',
                  backgroundColor: alpha('#ef4444', 0.08),
                  color: '#ef4444'
                }
              }}
            >
              {t('notifications.reject')}
            </Button>
          </Box>
        )}

        {/* Spacer for non-pending cards to push content up */}
        {!isPending && <Box sx={{ flex: 1 }} />}
      </CardContent>
    </Card>
  );
};

export default NotificationCard;
