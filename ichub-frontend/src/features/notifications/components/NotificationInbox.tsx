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

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  IconButton,
  TextField,
  InputAdornment,
  Tooltip,
  Chip,
  Badge,
  Avatar,
  Divider,
  Select,
  MenuItem,
  FormControl,
  Menu,
  ListItemIcon,
  ListItemText,
  Checkbox,
  Button,
  CircularProgress,
} from '@mui/material';
import {
  Search,
  DoneAll,
  DeviceHub,
  KeyboardArrowRight,
  KeyboardArrowLeft,
  PersonAdd,
  SortByAlpha,
  Menu as MenuIcon,
  Inbox,
  Markunread,
  Archive,
  CheckBox,
  CheckBoxOutlineBlank,
  IndeterminateCheckBox,
  MarkEmailRead,
  MarkEmailUnread,
  Unarchive,
  Schedule,
  Close,
  Delete,
  RestoreFromTrash,
  Tune,
  People,
} from '@mui/icons-material';
import { useNotifications } from '../contexts/NotificationContext';
import { InboxNotification, SenderGroup, NotificationSortBy, InboxFilterType } from '../types';
import CreatePartnerDialog from '@/features/business-partner-kit/partner-management/components/general/CreatePartnerDialog';

/**
 * NotificationInbox component - displays notifications in list or grouped view
 * Supports responsive design: compact (mobile) vs full (desktop) layout
 */
const NotificationInbox: React.FC = () => {
  const {
    panelSize,
    viewMode,
    setViewMode,
    filteredNotifications,
    paginatedNotifications,
    senderGroups,
    filters,
    setFilters,
    stats,
    sortBy,
    setSortBy,
    inboxFilter,
    setInboxFilter,
    markAllAsRead,
    selectNotification,
    getContactName,
    isKnownContact,
    getVerificationState,
    refreshPartners,
    // Selection
    selectedIds,
    toggleSelection,
    selectAll,
    clearSelection,
    isSelectionMode,
    setSelectionMode,
    markSelectedAsRead,
    markSelectedAsUnread,
    archiveSelected,
    unarchiveSelected,
    trashSelected,
    restoreSelectedFromTrash,
    markAsRead,
    markAsUnread,
    archiveNotification,
    unarchiveNotification,
    trashNotification,
    restoreFromTrash,
    // Pagination
    currentPage,
    setCurrentPage,
    totalPages,
    pageSize,
  } = useNotifications();

  const { t } = useTranslation('notifications');

  // Determine if we're in compact (mobile) mode
  const isCompact = panelSize === 'normal';

  // State for filter menu
  const [filterMenuAnchor, setFilterMenuAnchor] = useState<null | HTMLElement>(null);
  
  // State for context menu
  const [contextMenu, setContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
    notification: InboxNotification;
  } | null>(null);

  // State for add contact dialog
  const [addContactDialog, setAddContactDialog] = useState<{
    open: boolean;
    bpn: string;
  }>({ open: false, bpn: '' });

  // State for undo snackbars (supports stacking)
  interface UndoSnackbarItem {
    id: string;
    message: string;
    action: 'archive' | 'trash' | 'unarchive' | 'restore';
    targetIds: string[];
    createdAt: number;
  }
  const [undoSnackbars, setUndoSnackbars] = useState<UndoSnackbarItem[]>([]);
  const snackbarTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Auto-remove snackbars after 5 seconds
  useEffect(() => {
    undoSnackbars.forEach((snackbar) => {
      if (!snackbarTimersRef.current.has(snackbar.id)) {
        const timer = setTimeout(() => {
          setUndoSnackbars((prev) => prev.filter((s) => s.id !== snackbar.id));
          snackbarTimersRef.current.delete(snackbar.id);
        }, 5000);
        snackbarTimersRef.current.set(snackbar.id, timer);
      }
    });
    return () => {
      // Cleanup on unmount
    };
  }, [undoSnackbars]);

  // Handle undo action for a specific snackbar
  const handleUndo = (snackbarId: string) => {
    const snackbar = undoSnackbars.find((s) => s.id === snackbarId);
    if (!snackbar) return;
    
    snackbar.targetIds.forEach((id) => {
      switch (snackbar.action) {
        case 'archive':
          unarchiveNotification(id);
          break;
        case 'trash':
          restoreFromTrash(id);
          break;
        case 'unarchive':
          archiveNotification(id);
          break;
        case 'restore':
          trashNotification(id);
          break;
      }
    });
    // Remove this snackbar
    setUndoSnackbars((prev) => prev.filter((s) => s.id !== snackbarId));
    const timer = snackbarTimersRef.current.get(snackbarId);
    if (timer) {
      clearTimeout(timer);
      snackbarTimersRef.current.delete(snackbarId);
    }
  };

  // Dismiss a snackbar
  const dismissSnackbar = (snackbarId: string) => {
    setUndoSnackbars((prev) => prev.filter((s) => s.id !== snackbarId));
    const timer = snackbarTimersRef.current.get(snackbarId);
    if (timer) {
      clearTimeout(timer);
      snackbarTimersRef.current.delete(snackbarId);
    }
  };

  // Show undo snackbar helper
  const showUndoSnackbar = (
    action: 'archive' | 'trash' | 'unarchive' | 'restore',
    targetIds: string[]
  ) => {
    const count = targetIds.length;
    let message = '';
    switch (action) {
      case 'archive':
        message = count === 1 ? t('snackbar.archived') : t('snackbar.archivedMultiple', { count });
        break;
      case 'trash':
        message = count === 1 ? t('snackbar.movedToTrash') : t('snackbar.movedToTrashMultiple', { count });
        break;
      case 'unarchive':
        message = count === 1 ? t('snackbar.unarchived') : t('snackbar.unarchivedMultiple', { count });
        break;
      case 'restore':
        message = count === 1 ? t('snackbar.restored') : t('snackbar.restoredMultiple', { count });
        break;
    }
    const newSnackbar: UndoSnackbarItem = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      message,
      action,
      targetIds,
      createdAt: Date.now(),
    };
    setUndoSnackbars((prev) => [...prev, newSnackbar]);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({ ...filters, search: e.target.value });
  };

  const formatDate = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t('inbox.now');
    if (diffMins < 60) return t('time.minutesAgo', { count: diffMins });
    if (diffHours < 24) return t('time.hoursAgo', { count: diffHours });
    if (diffDays < 7) return t('time.daysAgo', { count: diffDays });
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const getAvatarColor = (bpn: string): string => {
    const hash = bpn.split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0);
    const colors = ['#1976d2', '#388e3c', '#f57c00', '#7b1fa2', '#c2185b', '#00796b', '#5d4037'];
    return colors[hash % colors.length];
  };

  const getInitials = (name: string): string => {
    if (name.startsWith('BPNL')) return name.slice(-2).toUpperCase();
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Get verification state color
  const getVerificationStateColor = (notification: InboxNotification): { color: string; tooltip: string } => {
    const state = getVerificationState(notification);
    switch (state) {
      case 'feedback-sent':
        return { color: 'rgba(129, 199, 132, 0.8)', tooltip: t('inbox.feedbackSent') };
      case 'verified':
        return { color: 'rgba(255, 183, 77, 0.8)', tooltip: t('inbox.verified') };
      case 'not-verified':
      default:
        return { color: 'rgba(239, 83, 80, 0.7)', tooltip: t('inbox.notVerified') };
    }
  };

  // Get deadline info for display
  const getDeadlineInfo = (notification: InboxNotification): { label: string; color: string; bgColor: string } | null => {
    const deadline = notification.header.expectedResponseBy;
    if (!deadline) return null;

    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diffMs = deadlineDate.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMs < 0) {
      return { label: t('detail.overdue'), color: '#ef5350', bgColor: 'rgba(239, 83, 80, 0.2)' };
    }
    if (diffHours < 24) {
      return { label: t('time.hoursLeft', { count: diffHours }), color: '#ef5350', bgColor: 'rgba(239, 83, 80, 0.2)' };
    }
    if (diffDays <= 3) {
      return { label: t('time.daysLeft', { count: diffDays }), color: '#ffb74d', bgColor: 'rgba(255, 183, 77, 0.2)' };
    }
    if (diffDays <= 7) {
      return { label: t('time.daysLeft', { count: diffDays }), color: '#81c784', bgColor: 'rgba(129, 199, 132, 0.2)' };
    }
    return { label: t('time.days', { count: diffDays }), color: 'rgba(255, 255, 255, 0.6)', bgColor: 'rgba(255, 255, 255, 0.1)' };
  };

  // Handle filter menu
  const handleFilterMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setFilterMenuAnchor(event.currentTarget);
  };

  const handleFilterMenuClose = () => {
    setFilterMenuAnchor(null);
  };

  const handleFilterSelect = (filter: InboxFilterType) => {
    setInboxFilter(filter);
    handleFilterMenuClose();
  };

  // Handle context menu
  const handleContextMenu = (event: React.MouseEvent, notification: InboxNotification) => {
    event.preventDefault();
    setContextMenu({
      mouseX: event.clientX,
      mouseY: event.clientY,
      notification,
    });
  };

  const handleContextMenuClose = () => {
    setContextMenu(null);
  };

  // Handle add contact click
  const handleAddContactClick = (bpn: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setAddContactDialog({ open: true, bpn });
  };

  const handleAddContactSuccess = () => {
    setAddContactDialog({ open: false, bpn: '' });
    refreshPartners();
  };

  // Get filter label
  const getFilterLabel = (filter: InboxFilterType): string => {
    switch (filter) {
      case 'all': return t('inbox.title');
      case 'unread': return t('inbox.unread');
      case 'not-verified': return t('inbox.notVerified');
      case 'verified': return t('inbox.verified');
      case 'feedback-sent': return t('inbox.feedbackSent');
      case 'archived': return t('inbox.archived');
      case 'trash': return t('inbox.trash');
      default: return t('inbox.title');
    }
  };

  // Get filter count
  const getFilterCount = (filter: InboxFilterType): number => {
    switch (filter) {
      case 'all': return stats.total;
      case 'unread': return stats.unread;
      case 'not-verified': return stats.notVerified;
      case 'verified': return stats.verified;
      case 'feedback-sent': return stats.feedbackSent;
      case 'archived': return stats.archived;
      case 'trash': return stats.trash;
      default: return 0;
    }
  };

  // Selection toolbar
  const renderSelectionToolbar = () => {
    if (!isSelectionMode) return null;

    const selectedCount = selectedIds.size;
    const allSelected = selectedCount === paginatedNotifications.length && selectedCount > 0;
    const someSelected = selectedCount > 0 && !allSelected;
    
    // Check if majority are read or unread
    const selectedNotifications = paginatedNotifications.filter((n) => selectedIds.has(n.id));
    const unreadSelected = selectedNotifications.filter((n) => n.status === 'unread').length;
    const showMarkAsRead = unreadSelected > selectedCount / 2;

    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          padding: '8px 12px',
          backgroundColor: 'rgba(66, 165, 245, 0.15)',
          borderBottom: '1px solid rgba(66, 165, 245, 0.3)',
        }}
      >
        <IconButton
          size="small"
          onClick={() => {
            if (allSelected) {
              clearSelection();
            } else {
              selectAll();
            }
          }}
          sx={{ color: '#90caf9' }}
        >
          {allSelected ? (
            <CheckBox sx={{ fontSize: '1.2rem' }} />
          ) : someSelected ? (
            <IndeterminateCheckBox sx={{ fontSize: '1.2rem' }} />
          ) : (
            <CheckBoxOutlineBlank sx={{ fontSize: '1.2rem' }} />
          )}
        </IconButton>

        <Typography sx={{ color: '#ffffff', fontSize: '0.8rem', flex: 1 }}>
          {t('inbox.selected', { count: selectedCount })}
        </Typography>

        <Tooltip title={showMarkAsRead ? t('inbox.markAsRead') : t('inbox.markAsUnread')} arrow>
          <IconButton
            size="small"
            onClick={showMarkAsRead ? markSelectedAsRead : markSelectedAsUnread}
            sx={{ color: 'rgba(255, 255, 255, 0.8)' }}
          >
            {showMarkAsRead ? <MarkEmailRead sx={{ fontSize: '1.1rem' }} /> : <MarkEmailUnread sx={{ fontSize: '1.1rem' }} />}
          </IconButton>
        </Tooltip>

        {inboxFilter !== 'trash' && (
          <Tooltip title={inboxFilter === 'archived' ? t('inbox.unarchive') : t('inbox.archive')} arrow>
            <IconButton
              size="small"
              onClick={() => {
                const ids = Array.from(selectedIds);
                if (inboxFilter === 'archived') {
                  unarchiveSelected();
                  showUndoSnackbar('unarchive', ids);
                } else {
                  archiveSelected();
                  showUndoSnackbar('archive', ids);
                }
              }}
              sx={{ color: 'rgba(255, 255, 255, 0.8)' }}
            >
              {inboxFilter === 'archived' ? <Unarchive sx={{ fontSize: '1.1rem' }} /> : <Archive sx={{ fontSize: '1.1rem' }} />}
            </IconButton>
          </Tooltip>
        )}

        <Tooltip title={inboxFilter === 'trash' ? t('inbox.restore') : t('inbox.moveToTrash')} arrow>
          <IconButton
            size="small"
            onClick={() => {
              const ids = Array.from(selectedIds);
              if (inboxFilter === 'trash') {
                restoreSelectedFromTrash();
                showUndoSnackbar('restore', ids);
              } else {
                trashSelected();
                showUndoSnackbar('trash', ids);
              }
            }}
            sx={{ color: inboxFilter === 'trash' ? 'rgba(129, 199, 132, 0.9)' : 'rgba(239, 83, 80, 0.9)' }}
          >
            {inboxFilter === 'trash' ? <RestoreFromTrash sx={{ fontSize: '1.1rem' }} /> : <Delete sx={{ fontSize: '1.1rem' }} />}
          </IconButton>
        </Tooltip>

        <Button
          size="small"
          onClick={clearSelection}
          startIcon={<Close sx={{ fontSize: '0.9rem' }} />}
          sx={{
            color: '#ffffff',
            backgroundColor: 'rgba(239, 83, 80, 0.3)',
            borderRadius: '16px',
            padding: '2px 12px',
            fontSize: '0.75rem',
            textTransform: 'none',
            fontWeight: 500,
            ml: 1,
            '&:hover': {
              backgroundColor: 'rgba(239, 83, 80, 0.5)',
            },
          }}
        >
          {t('inbox.cancel')}
        </Button>
      </Box>
    );
  };

  // Compact (mobile) notification item
  const renderCompactNotificationItem = (notification: InboxNotification) => {
    const senderBpn = notification.header.senderBpn;
    const senderName = getContactName(senderBpn);
    const isKnown = isKnownContact(senderBpn);
    const verificationColor = getVerificationStateColor(notification);
    const isSelected = selectedIds.has(notification.id);
    const deadlineInfo = getDeadlineInfo(notification);

    return (
      <Box
        key={notification.id}
        onClick={() => {
          if (isSelectionMode) {
            toggleSelection(notification.id);
          } else {
            selectNotification(notification);
          }
        }}
        onContextMenu={(e) => handleContextMenu(e, notification)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          padding: '10px 12px',
          cursor: 'pointer',
          backgroundColor: isSelected
            ? 'rgba(66, 165, 245, 0.2)'
            : notification.status === 'unread'
            ? 'rgba(66, 165, 245, 0.08)'
            : 'transparent',
          borderLeft: notification.status === 'unread' ? '3px solid #42a5f5' : '3px solid transparent',
          transition: 'all 0.15s ease',
          position: 'relative',
          '&:hover': {
            backgroundColor: isSelected ? 'rgba(66, 165, 245, 0.25)' : 'rgba(255, 255, 255, 0.06)',
          },
        }}
      >
        {/* Selection checkbox when in selection mode */}
        {isSelectionMode && (
          <Checkbox
            checked={isSelected}
            onChange={() => toggleSelection(notification.id)}
            onClick={(e) => e.stopPropagation()}
            sx={{
              padding: '4px',
              mr: 1,
              color: 'rgba(255, 255, 255, 0.5)',
              '&.Mui-checked': { color: '#42a5f5' },
            }}
          />
        )}

        {/* Avatar */}
        <Avatar
          sx={{
            width: 36,
            height: 36,
            backgroundColor: getAvatarColor(senderBpn),
            fontSize: '0.75rem',
            fontWeight: 600,
            mr: 1,
          }}
        >
          {getInitials(senderName)}
        </Avatar>

        {/* Content */}
        <Box sx={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.25 }}>
            <Typography
              sx={{
                color: '#ffffff',
                fontWeight: notification.status === 'unread' ? 600 : 400,
                fontSize: '0.8rem',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {senderName}
            </Typography>
            {!isKnown && (
              <Tooltip title={t('inbox.addToContacts')} arrow>
                <IconButton
                  size="small"
                  onClick={(e) => handleAddContactClick(senderBpn, e)}
                  sx={{
                    padding: '2px',
                    color: '#ffb74d',
                    '&:hover': { color: '#ffa726', backgroundColor: 'rgba(255, 167, 38, 0.15)' },
                  }}
                >
                  <PersonAdd sx={{ fontSize: '0.85rem' }} />
                </IconButton>
              </Tooltip>
            )}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
            <Chip
              label={`${notification.content.listOfItems.length} DT`}
              size="small"
              sx={{
                backgroundColor: 'rgba(129, 199, 132, 0.15)',
                color: '#81c784',
                fontSize: '0.6rem',
                height: '16px',
              }}
            />
            {deadlineInfo && (
              <Chip
                icon={<Schedule sx={{ fontSize: '0.7rem !important' }} />}
                label={deadlineInfo.label}
                size="small"
                sx={{
                  backgroundColor: deadlineInfo.bgColor,
                  color: deadlineInfo.color,
                  fontSize: '0.55rem',
                  height: '16px',
                  '& .MuiChip-icon': { color: deadlineInfo.color },
                }}
              />
            )}
          </Box>
        </Box>

        {/* Right side: time and verification status bar */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
          <Typography sx={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '0.65rem' }}>
            {formatDate(notification.receivedAt)}
          </Typography>
        </Box>

        {/* Verification status bar on the right edge */}
        <Tooltip title={verificationColor.tooltip} arrow placement="left">
          <Box
            sx={{
              position: 'absolute',
              right: 0,
              top: 0,
              bottom: 0,
              width: '4px',
              backgroundColor: verificationColor.color,
            }}
          />
        </Tooltip>
      </Box>
    );
  };

  // Full (desktop) notification item
  const renderFullNotificationItem = (notification: InboxNotification) => {
    const senderBpn = notification.header.senderBpn;
    const senderName = getContactName(senderBpn);
    const isKnown = isKnownContact(senderBpn);
    const verificationColor = getVerificationStateColor(notification);
    const isSelected = selectedIds.has(notification.id);
    const deadlineInfo = getDeadlineInfo(notification);

    return (
      <Box
        key={notification.id}
        onClick={() => {
          if (isSelectionMode) {
            toggleSelection(notification.id);
          } else {
            selectNotification(notification);
          }
        }}
        onContextMenu={(e) => handleContextMenu(e, notification)}
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          padding: '14px 20px',
          cursor: 'pointer',
          backgroundColor: isSelected
            ? 'rgba(66, 165, 245, 0.2)'
            : notification.status === 'unread'
            ? 'rgba(66, 165, 245, 0.08)'
            : 'transparent',
          borderLeft: notification.status === 'unread' ? '4px solid #42a5f5' : '4px solid transparent',
          transition: 'all 0.2s ease',
          position: 'relative',
          '&:hover': {
            backgroundColor: isSelected ? 'rgba(66, 165, 245, 0.25)' : 'rgba(255, 255, 255, 0.06)',
          },
        }}
      >
        {/* Selection checkbox when in selection mode */}
        {isSelectionMode && (
          <Checkbox
            checked={isSelected}
            onChange={() => toggleSelection(notification.id)}
            onClick={(e) => e.stopPropagation()}
            sx={{
              padding: '4px',
              mr: 1,
              mt: 0.5,
              color: 'rgba(255, 255, 255, 0.5)',
              '&.Mui-checked': { color: '#42a5f5' },
            }}
          />
        )}

        {/* Avatar */}
        <Avatar
          sx={{
            width: 44,
            height: 44,
            backgroundColor: getAvatarColor(senderBpn),
            fontSize: '0.9rem',
            fontWeight: 600,
            mr: 2,
          }}
        >
          {getInitials(senderName)}
        </Avatar>

        {/* Content */}
        <Box sx={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Typography
              sx={{
                color: '#ffffff',
                fontWeight: notification.status === 'unread' ? 600 : 400,
                fontSize: '0.9rem',
              }}
            >
              {senderName}
            </Typography>
            {!isKnown && (
              <Tooltip title={t('inbox.addToContacts')} arrow>
                <IconButton
                  size="small"
                  onClick={(e) => handleAddContactClick(senderBpn, e)}
                  sx={{
                    padding: '2px',
                    color: '#ffb74d',
                    '&:hover': { color: '#ffa726', backgroundColor: 'rgba(255, 167, 38, 0.15)' },
                  }}
                >
                  <PersonAdd sx={{ fontSize: '0.95rem' }} />
                </IconButton>
              </Tooltip>
            )}
          </Box>

          <Typography
            sx={{
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '0.8rem',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              mb: 1,
            }}
          >
            {notification.content.information || t('inbox.digitalTwinNotificationReceived')}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Chip
                icon={<DeviceHub sx={{ fontSize: '0.8rem !important' }} />}
                label={`${notification.content.listOfItems.length} Digital Twin${notification.content.listOfItems.length > 1 ? 's' : ''}`}
                size="small"
                sx={{
                  backgroundColor: 'rgba(129, 199, 132, 0.15)',
                  color: '#81c784',
                  fontSize: '0.65rem',
                  height: '22px',
                  '& .MuiChip-icon': { color: '#81c784' },
                }}
              />
              <Chip
                label={notification.content.digitalTwinType}
                size="small"
                sx={{
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontSize: '0.65rem',
                  height: '22px',
                }}
              />
              {deadlineInfo && (
                <Chip
                  icon={<Schedule sx={{ fontSize: '0.75rem !important' }} />}
                  label={deadlineInfo.label}
                  size="small"
                  sx={{
                    backgroundColor: deadlineInfo.bgColor,
                    color: deadlineInfo.color,
                    fontSize: '0.65rem',
                    height: '22px',
                    '& .MuiChip-icon': { color: deadlineInfo.color },
                  }}
                />
              )}
            </Box>
            {/* Time at bottom right */}
            <Typography sx={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '0.7rem' }}>
              {formatDate(notification.receivedAt)}
            </Typography>
          </Box>
        </Box>

        <KeyboardArrowRight sx={{ color: 'rgba(255, 255, 255, 0.3)', ml: 1, mt: 1 }} />

        {/* Verification status bar on the right edge */}
        <Tooltip title={verificationColor.tooltip} arrow placement="left">
          <Box
            sx={{
              position: 'absolute',
              right: 0,
              top: 0,
              bottom: 0,
              width: '4px',
              backgroundColor: verificationColor.color,
            }}
          />
        </Tooltip>
      </Box>
    );
  };

  const renderSenderGroup = (group: SenderGroup) => {
    const isKnown = isKnownContact(group.sender.bpnl);

    const handleGroupClick = () => {
      // Switch to list view and apply filter
      setViewMode('list');
      setFilters({ ...filters, senderBpn: group.sender.bpnl });
    };

    return (
      <Box key={group.sender.bpnl}>
        <Box
          onClick={handleGroupClick}
          sx={{
            display: 'flex',
            alignItems: 'center',
            padding: isCompact ? '10px 12px' : '14px 20px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.06)',
            },
          }}
        >
          <Badge
            badgeContent={group.unreadCount}
            color="primary"
            sx={{
              '& .MuiBadge-badge': {
                fontSize: '0.6rem',
                minWidth: '16px',
                height: '16px',
                backgroundColor: '#42a5f5',
              },
            }}
          >
            <Avatar
              sx={{
                width: isCompact ? 40 : 48,
                height: isCompact ? 40 : 48,
                backgroundColor: getAvatarColor(group.sender.bpnl),
                fontSize: isCompact ? '0.85rem' : '1rem',
                fontWeight: 600,
              }}
            >
              {getInitials(group.sender.name)}
            </Avatar>
          </Badge>

          <Box sx={{ flex: 1, ml: 1.5, overflow: 'hidden' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography
                sx={{
                  color: '#ffffff',
                  fontWeight: group.unreadCount > 0 ? 600 : 400,
                  fontSize: isCompact ? '0.85rem' : '0.95rem',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {group.sender.name}
              </Typography>
              {!isKnown && (
                <Tooltip title={t('inbox.addToContacts')} arrow>
                  <IconButton
                    size="small"
                    onClick={(e) => handleAddContactClick(group.sender.bpnl, e)}
                    sx={{
                      padding: '2px',
                      color: '#ffb74d',
                      '&:hover': { color: '#ffa726', backgroundColor: 'rgba(255, 167, 38, 0.15)' },
                    }}
                  >
                    <PersonAdd sx={{ fontSize: '0.85rem' }} />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
            <Typography
              sx={{
                color: 'rgba(255, 255, 255, 0.5)',
                fontSize: isCompact ? '0.7rem' : '0.75rem',
              }}
            >
              {group.notifications.length} {group.notifications.length > 1 ? t('inbox.notifications') : t('inbox.notification')}
            </Typography>
          </Box>

          <Typography
            sx={{
              color: 'rgba(255, 255, 255, 0.4)',
              fontSize: '0.7rem',
            }}
          >
            {formatDate(group.lastActivity)}
          </Typography>
          <KeyboardArrowRight sx={{ color: 'rgba(255, 255, 255, 0.3)', ml: 1 }} />
        </Box>
        <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.06)' }} />
      </Box>
    );
  };

  // Context menu component
  const renderContextMenu = () => {
    if (!contextMenu) return null;

    const notification = contextMenu.notification;
    const isRead = notification.status !== 'unread';
    const isArchived = notification.isArchived ?? false;
    const isTrashed = notification.isTrashed ?? false;

    return (
      <Menu
        open={true}
        onClose={handleContextMenuClose}
        anchorReference="anchorPosition"
        anchorPosition={{ top: contextMenu.mouseY, left: contextMenu.mouseX }}
        PaperProps={{
          sx: {
            backgroundColor: 'rgba(20, 25, 35, 0.98)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(66, 165, 245, 0.2)',
            borderRadius: '10px',
            minWidth: 200,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(66, 165, 245, 0.1)',
            overflow: 'hidden',
          },
        }}
      >
        {/* 1. Select */}
        <MenuItem
          onClick={() => {
            setSelectionMode(true);
            toggleSelection(notification.id);
            handleContextMenuClose();
          }}
          sx={{ 
            color: '#ffffff', 
            fontSize: '0.85rem',
            padding: '10px 16px',
            transition: 'all 0.15s ease',
            '&:hover': {
              backgroundColor: 'rgba(66, 165, 245, 0.15)',
            },
          }}
        >
          <ListItemIcon sx={{ color: '#90caf9', minWidth: 36 }}>
            <CheckBox fontSize="small" />
          </ListItemIcon>
          <ListItemText primary={t('inbox.select')} primaryTypographyProps={{ sx: { color: '#ffffff', fontSize: '0.85rem' } }} />
        </MenuItem>
        {/* 2. Mark as Read/Unread */}
        <MenuItem
          onClick={() => {
            if (isRead) {
              markAsUnread(notification.id);
            } else {
              markAsRead(notification.id);
            }
            handleContextMenuClose();
          }}
          sx={{ 
            color: '#ffffff', 
            fontSize: '0.85rem',
            padding: '10px 16px',
            transition: 'all 0.15s ease',
            '&:hover': {
              backgroundColor: 'rgba(66, 165, 245, 0.15)',
            },
          }}
        >
          <ListItemIcon sx={{ color: isRead ? '#ffb74d' : '#81c784', minWidth: 36 }}>
            {isRead ? <MarkEmailUnread fontSize="small" /> : <MarkEmailRead fontSize="small" />}
          </ListItemIcon>
          <ListItemText primary={isRead ? t('inbox.markAsUnread') : t('inbox.markAsRead')} primaryTypographyProps={{ sx: { color: '#ffffff', fontSize: '0.85rem' } }} />
        </MenuItem>
        <Divider sx={{ borderColor: 'rgba(66, 165, 245, 0.15)', my: 0.5 }} />
        {/* 3. Archive/Unarchive */}
        {!isTrashed && (
          <MenuItem
            onClick={() => {
              if (isArchived) {
                unarchiveNotification(notification.id);
                showUndoSnackbar('unarchive', [notification.id]);
              } else {
                archiveNotification(notification.id);
                showUndoSnackbar('archive', [notification.id]);
              }
              handleContextMenuClose();
            }}
            sx={{ 
              color: '#ffffff', 
              fontSize: '0.85rem',
              padding: '10px 16px',
              transition: 'all 0.15s ease',
              '&:hover': {
                backgroundColor: 'rgba(66, 165, 245, 0.15)',
              },
            }}
          >
            <ListItemIcon sx={{ color: '#64b5f6', minWidth: 36 }}>
              {isArchived ? <Unarchive fontSize="small" /> : <Archive fontSize="small" />}
            </ListItemIcon>
            <ListItemText primary={isArchived ? t('inbox.unarchive') : t('inbox.archive')} primaryTypographyProps={{ sx: { color: '#ffffff', fontSize: '0.85rem' } }} />
          </MenuItem>
        )}
        {/* 4. Move to Trash/Restore */}
        <MenuItem
          onClick={() => {
            if (isTrashed) {
              restoreFromTrash(notification.id);
              showUndoSnackbar('restore', [notification.id]);
            } else {
              trashNotification(notification.id);
              showUndoSnackbar('trash', [notification.id]);
            }
            handleContextMenuClose();
          }}
          sx={{ 
            color: '#ffffff', 
            fontSize: '0.85rem',
            padding: '10px 16px',
            transition: 'all 0.15s ease',
            '&:hover': {
              backgroundColor: isTrashed ? 'rgba(129, 199, 132, 0.15)' : 'rgba(239, 83, 80, 0.15)',
            },
          }}
        >
          <ListItemIcon sx={{ color: isTrashed ? '#81c784' : '#ef5350', minWidth: 36 }}>
            {isTrashed ? <RestoreFromTrash fontSize="small" /> : <Delete fontSize="small" />}
          </ListItemIcon>
          <ListItemText primary={isTrashed ? t('inbox.restore') : t('inbox.moveToTrash')} primaryTypographyProps={{ sx: { color: '#ffffff', fontSize: '0.85rem' } }} />
        </MenuItem>
      </Menu>
    );
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <Box
        sx={{
          padding: isCompact ? '10px 12px' : '14px 20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        {/* Title row with filter menu */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton
              size="small"
              onClick={handleFilterMenuOpen}
              sx={{
                color: filterMenuAnchor ? '#42a5f5' : 'rgba(255, 255, 255, 0.7)',
                backgroundColor: filterMenuAnchor ? 'rgba(66, 165, 245, 0.15)' : 'transparent',
                borderRadius: '6px',
                padding: '6px',
                transition: 'all 0.2s ease',
                '&:hover': { 
                  backgroundColor: 'rgba(66, 165, 245, 0.2)',
                  color: '#42a5f5',
                  transform: 'scale(1.05)',
                },
              }}
            >
              <MenuIcon sx={{ fontSize: '1.2rem' }} />
            </IconButton>
            <Typography sx={{ color: '#ffffff', fontWeight: 600, fontSize: isCompact ? '0.95rem' : '1.1rem' }}>
              {getFilterLabel(inboxFilter)}
            </Typography>
            {getFilterCount(inboxFilter) > 0 && (
              <Chip
                label={getFilterCount(inboxFilter)}
                size="small"
                sx={{
                  backgroundColor: inboxFilter === 'unread' ? '#42a5f5' : 'rgba(255, 255, 255, 0.15)',
                  color: '#ffffff',
                  fontSize: '0.65rem',
                  height: '18px',
                  fontWeight: 600,
                }}
              />
            )}
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Tooltip title={t('inbox.markAllAsRead')} arrow>
              <span>
                <IconButton
                  size="small"
                  onClick={markAllAsRead}
                  disabled={stats.unread === 0}
                  sx={{
                    color: stats.unread > 0 ? 'rgba(255, 255, 255, 0.7)' : 'rgba(255, 255, 255, 0.25)',
                    '&:hover': { 
                      backgroundColor: stats.unread > 0 ? 'rgba(66, 165, 245, 0.15)' : 'transparent',
                      color: stats.unread > 0 ? '#ffffff' : 'rgba(255, 255, 255, 0.25)',
                    },
                    '&.Mui-disabled': { color: 'rgba(255, 255, 255, 0.25)' },
                  }}
                >
                  <DoneAll sx={{ fontSize: '1rem' }} />
                </IconButton>
              </span>
            </Tooltip>

            <Tooltip title={t('inbox.selectionMode')} arrow>
              <IconButton
                size="small"
                onClick={() => setSelectionMode(!isSelectionMode)}
                sx={{
                  color: isSelectionMode ? '#42a5f5' : 'rgba(255, 255, 255, 0.7)',
                  backgroundColor: isSelectionMode ? 'rgba(66, 165, 245, 0.2)' : 'transparent',
                  '&:hover': { 
                    backgroundColor: 'rgba(66, 165, 245, 0.15)',
                    color: '#ffffff',
                  },
                }}
              >
                <Tune sx={{ fontSize: '1rem' }} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Search and Sort row */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            placeholder={t('inbox.searchPlaceholder')}
            value={filters.search}
            onChange={handleSearchChange}
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '1rem' }} />
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '6px',
                color: '#ffffff',
                fontSize: '0.8rem',
                '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.12)' },
                '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.25)' },
                '&.Mui-focused fieldset': { borderColor: '#42a5f5' },
              },
              '& .MuiInputBase-input::placeholder': { color: 'rgba(255, 255, 255, 0.35)', opacity: 1 },
            }}
          />

          <FormControl size="small" sx={{ minWidth: isCompact ? 100 : 160 }}>
            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as NotificationSortBy)}
              displayEmpty
              renderValue={(value) => (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <SortByAlpha sx={{ fontSize: isCompact ? '0.85rem' : '0.95rem', color: 'rgba(255, 255, 255, 0.6)' }} />
                  {!isCompact && (
                    <Typography sx={{ fontSize: '0.75rem', color: '#ffffff' }}>
                      {value === 'receivedAt' && t('sorting.date')}
                      {value === 'expectedResponseBy' && t('sorting.deadline')}
                      {value === 'priority' && t('sorting.priority')}
                    </Typography>
                  )}
                </Box>
              )}
              sx={{
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                color: '#ffffff',
                fontSize: '0.75rem',
                height: '36px',
                '& .MuiSelect-select': {
                  paddingTop: '6px',
                  paddingBottom: '6px',
                  paddingLeft: '8px',
                  paddingRight: '24px',
                  display: 'flex',
                  alignItems: 'center',
                },
                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.15)' },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#42a5f5', borderWidth: '2px' },
                '& .MuiSelect-icon': { color: 'rgba(255, 255, 255, 0.6)', right: '4px' },
              }}
              MenuProps={{
                PaperProps: {
                  sx: {
                    backgroundColor: 'rgba(20, 25, 35, 0.98)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(66, 165, 245, 0.2)',
                    borderRadius: '8px',
                    mt: 0.5,
                    '& .MuiMenuItem-root': {
                      color: '#ffffff',
                      fontSize: '0.8rem',
                      padding: '10px 16px',
                      '&:hover': {
                        backgroundColor: 'rgba(66, 165, 245, 0.15)',
                      },
                      '&.Mui-selected': {
                        backgroundColor: 'rgba(66, 165, 245, 0.25)',
                        '&:hover': {
                          backgroundColor: 'rgba(66, 165, 245, 0.35)',
                        },
                      },
                    },
                  },
                },
              }}
            >
              <MenuItem value="receivedAt">{t('sorting.dateReceived')}</MenuItem>
              <MenuItem value="expectedResponseBy">{t('sorting.responseDeadline')}</MenuItem>
              <MenuItem value="priority">{t('sorting.priority')}</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>

      {/* Selection toolbar */}
      {renderSelectionToolbar()}

      {/* Active filter chip */}
      {filters.senderBpn && (
        <Box sx={{ padding: '8px 12px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <Chip
            label={`From: ${getContactName(filters.senderBpn)}`}
            onDelete={() => setFilters({ ...filters, senderBpn: undefined })}
            size="small"
            sx={{
              backgroundColor: 'rgba(66, 165, 245, 0.2)',
              color: '#90caf9',
              fontSize: '0.7rem',
              '& .MuiChip-deleteIcon': { color: 'rgba(144, 202, 249, 0.7)', '&:hover': { color: '#90caf9' } },
            }}
          />
        </Box>
      )}

      {/* Content */}
      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          '&::-webkit-scrollbar': { width: '5px' },
          '&::-webkit-scrollbar-track': { backgroundColor: 'rgba(255, 255, 255, 0.03)' },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'rgba(255, 255, 255, 0.15)',
            borderRadius: '3px',
            '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.25)' },
          },
        }}
      >
        {viewMode === 'list' ? (
          paginatedNotifications.length > 0 ? (
            paginatedNotifications.map((notification) => (
              <React.Fragment key={notification.id}>
                {isCompact
                  ? renderCompactNotificationItem(notification)
                  : renderFullNotificationItem(notification)}
                <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.05)' }} />
              </React.Fragment>
            ))
          ) : (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '180px',
                color: 'rgba(255, 255, 255, 0.8)',
              }}
            >
              <DeviceHub sx={{ fontSize: '2.5rem', mb: 1, opacity: 0.7 }} />
              <Typography sx={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.9)', fontWeight: 500 }}>{t('inbox.noNotificationsFound')}</Typography>
            </Box>
          )
        ) : senderGroups.length > 0 ? (
          senderGroups.map(renderSenderGroup)
        ) : (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '180px',
              color: 'rgba(255, 255, 255, 0.4)',
            }}
          >
            <People sx={{ fontSize: '2.5rem', mb: 1, opacity: 0.5 }} />
            <Typography sx={{ fontSize: '0.85rem' }}>{t('inbox.noContactsWithNotifications')}</Typography>
          </Box>
        )}
      </Box>

      {/* Pagination - Compact horizontal layout */}
      {viewMode === 'list' && filteredNotifications.length > 0 && (
        <Box
          sx={{
            padding: '6px 12px',
            borderTop: '1px solid rgba(66, 165, 245, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
            backgroundColor: 'rgba(20, 25, 35, 0.6)',
          }}
        >
          <IconButton
            size="small"
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            sx={{
              color: currentPage === 1 ? 'rgba(255, 255, 255, 0.2)' : '#90caf9',
              padding: '4px',
              '&:hover': {
                backgroundColor: currentPage === 1 ? 'transparent' : 'rgba(66, 165, 245, 0.15)',
              },
              '&.Mui-disabled': { color: 'rgba(255, 255, 255, 0.2)' },
            }}
          >
            <KeyboardArrowLeft sx={{ fontSize: '1.2rem' }} />
          </IconButton>
          <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.75rem', minWidth: '100px', textAlign: 'center' }}>
            {t('pagination.rangeOf', { start: ((currentPage - 1) * pageSize) + 1, end: Math.min(currentPage * pageSize, filteredNotifications.length), total: filteredNotifications.length })}
          </Typography>
          <IconButton
            size="small"
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            sx={{
              color: currentPage === totalPages ? 'rgba(255, 255, 255, 0.2)' : '#90caf9',
              padding: '4px',
              '&:hover': {
                backgroundColor: currentPage === totalPages ? 'transparent' : 'rgba(66, 165, 245, 0.15)',
              },
              '&.Mui-disabled': { color: 'rgba(255, 255, 255, 0.2)' },
            }}
          >
            <KeyboardArrowRight sx={{ fontSize: '1.2rem' }} />
          </IconButton>
        </Box>
      )}

      {/* Filter menu */}
      <Menu
        anchorEl={filterMenuAnchor}
        open={Boolean(filterMenuAnchor)}
        onClose={handleFilterMenuClose}
        PaperProps={{
          sx: {
            backgroundColor: 'rgba(20, 25, 35, 0.98)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(66, 165, 245, 0.2)',
            borderRadius: '10px',
            minWidth: 220,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(66, 165, 245, 0.1)',
            overflow: 'hidden',
            mt: 1,
          },
        }}
      >
        <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid rgba(66, 165, 245, 0.1)' }}>
          <Typography sx={{ color: '#64b5f6', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {t('inbox.filterMessages')}
          </Typography>
        </Box>
        <MenuItem
          onClick={() => handleFilterSelect('all')}
          selected={inboxFilter === 'all'}
          sx={{ 
            color: '#ffffff', 
            fontSize: '0.85rem',
            padding: '10px 16px',
            transition: 'all 0.15s ease',
            '&:hover': { backgroundColor: 'rgba(66, 165, 245, 0.15)' },
            '&.Mui-selected': { backgroundColor: 'rgba(66, 165, 245, 0.2)', '&:hover': { backgroundColor: 'rgba(66, 165, 245, 0.25)' } },
          }}
        >
          <ListItemIcon sx={{ color: '#90caf9', minWidth: 36 }}>
            <Inbox fontSize="small" />
          </ListItemIcon>
          <ListItemText primary={t('inbox.title')} primaryTypographyProps={{ sx: { color: '#ffffff', fontSize: '0.85rem' } }} />
          <Chip label={stats.total} size="small" sx={{ height: '20px', fontSize: '0.7rem', backgroundColor: 'rgba(144, 202, 249, 0.2)', color: '#90caf9' }} />
        </MenuItem>
        <MenuItem
          onClick={() => handleFilterSelect('unread')}
          selected={inboxFilter === 'unread'}
          sx={{ 
            color: '#ffffff', 
            fontSize: '0.85rem',
            padding: '10px 16px',
            transition: 'all 0.15s ease',
            '&:hover': { backgroundColor: 'rgba(66, 165, 245, 0.15)' },
            '&.Mui-selected': { backgroundColor: 'rgba(66, 165, 245, 0.2)', '&:hover': { backgroundColor: 'rgba(66, 165, 245, 0.25)' } },
          }}
        >
          <ListItemIcon sx={{ color: '#42a5f5', minWidth: 36 }}>
            <Markunread fontSize="small" />
          </ListItemIcon>
          <ListItemText primary={t('inbox.unread')} primaryTypographyProps={{ sx: { color: '#ffffff', fontSize: '0.85rem' } }} />
          <Chip label={stats.unread} size="small" sx={{ height: '20px', fontSize: '0.7rem', backgroundColor: 'rgba(66, 165, 245, 0.2)', color: '#42a5f5' }} />
        </MenuItem>
        <Divider sx={{ borderColor: 'rgba(66, 165, 245, 0.1)', my: 0.5 }} />
        <MenuItem
          onClick={() => handleFilterSelect('not-verified')}
          selected={inboxFilter === 'not-verified'}
          sx={{ 
            color: '#ffffff', 
            fontSize: '0.85rem',
            padding: '10px 16px',
            transition: 'all 0.15s ease',
            '&:hover': { backgroundColor: 'rgba(239, 83, 80, 0.1)' },
            '&.Mui-selected': { backgroundColor: 'rgba(239, 83, 80, 0.15)', '&:hover': { backgroundColor: 'rgba(239, 83, 80, 0.2)' } },
          }}
        >
          <ListItemIcon sx={{ color: '#ef5350', minWidth: 36 }}>
            <Box sx={{ width: 18, height: 18, backgroundColor: 'rgba(239, 83, 80, 0.8)', borderRadius: '4px' }} />
          </ListItemIcon>
          <ListItemText primary={t('inbox.notVerified')} primaryTypographyProps={{ sx: { color: '#ffffff', fontSize: '0.85rem' } }} />
          <Chip label={stats.notVerified} size="small" sx={{ height: '20px', fontSize: '0.7rem', backgroundColor: 'rgba(239, 83, 80, 0.2)', color: '#ef5350' }} />
        </MenuItem>
        <MenuItem
          onClick={() => handleFilterSelect('verified')}
          selected={inboxFilter === 'verified'}
          sx={{ 
            color: '#ffffff', 
            fontSize: '0.85rem',
            padding: '10px 16px',
            transition: 'all 0.15s ease',
            '&:hover': { backgroundColor: 'rgba(255, 183, 77, 0.1)' },
            '&.Mui-selected': { backgroundColor: 'rgba(255, 183, 77, 0.15)', '&:hover': { backgroundColor: 'rgba(255, 183, 77, 0.2)' } },
          }}
        >
          <ListItemIcon sx={{ color: '#ffb74d', minWidth: 36 }}>
            <Box sx={{ width: 18, height: 18, backgroundColor: 'rgba(255, 183, 77, 0.8)', borderRadius: '4px' }} />
          </ListItemIcon>
          <ListItemText primary={t('inbox.verified')} primaryTypographyProps={{ sx: { color: '#ffffff', fontSize: '0.85rem' } }} />
          <Chip label={stats.verified} size="small" sx={{ height: '20px', fontSize: '0.7rem', backgroundColor: 'rgba(255, 183, 77, 0.2)', color: '#ffb74d' }} />
        </MenuItem>
        <MenuItem
          onClick={() => handleFilterSelect('feedback-sent')}
          selected={inboxFilter === 'feedback-sent'}
          sx={{ 
            color: '#ffffff', 
            fontSize: '0.85rem',
            padding: '10px 16px',
            transition: 'all 0.15s ease',
            '&:hover': { backgroundColor: 'rgba(129, 199, 132, 0.1)' },
            '&.Mui-selected': { backgroundColor: 'rgba(129, 199, 132, 0.15)', '&:hover': { backgroundColor: 'rgba(129, 199, 132, 0.2)' } },
          }}
        >
          <ListItemIcon sx={{ color: '#81c784', minWidth: 36 }}>
            <Box sx={{ width: 18, height: 18, backgroundColor: 'rgba(129, 199, 132, 0.8)', borderRadius: '4px' }} />
          </ListItemIcon>
          <ListItemText primary={t('inbox.feedbackSent')} primaryTypographyProps={{ sx: { color: '#ffffff', fontSize: '0.85rem' } }} />
          <Chip label={stats.feedbackSent} size="small" sx={{ height: '20px', fontSize: '0.7rem', backgroundColor: 'rgba(129, 199, 132, 0.2)', color: '#81c784' }} />
        </MenuItem>
        <Divider sx={{ borderColor: 'rgba(66, 165, 245, 0.1)', my: 0.5 }} />
        <MenuItem
          onClick={() => handleFilterSelect('archived')}
          selected={inboxFilter === 'archived'}
          sx={{ 
            color: '#ffffff', 
            fontSize: '0.85rem',
            padding: '10px 16px',
            transition: 'all 0.15s ease',
            '&:hover': { backgroundColor: 'rgba(158, 158, 158, 0.1)' },
            '&.Mui-selected': { backgroundColor: 'rgba(158, 158, 158, 0.15)', '&:hover': { backgroundColor: 'rgba(158, 158, 158, 0.2)' } },
          }}
        >
          <ListItemIcon sx={{ color: '#9e9e9e', minWidth: 36 }}>
            <Archive fontSize="small" />
          </ListItemIcon>
          <ListItemText primary={t('inbox.archived')} primaryTypographyProps={{ sx: { color: '#ffffff', fontSize: '0.85rem' } }} />
          <Chip label={stats.archived} size="small" sx={{ height: '20px', fontSize: '0.7rem', backgroundColor: 'rgba(158, 158, 158, 0.2)', color: '#9e9e9e' }} />
        </MenuItem>
        <MenuItem
          onClick={() => handleFilterSelect('trash')}
          selected={inboxFilter === 'trash'}
          sx={{ 
            color: '#ffffff', 
            fontSize: '0.85rem',
            padding: '10px 16px',
            transition: 'all 0.15s ease',
            '&:hover': { backgroundColor: 'rgba(239, 83, 80, 0.1)' },
            '&.Mui-selected': { backgroundColor: 'rgba(239, 83, 80, 0.15)', '&:hover': { backgroundColor: 'rgba(239, 83, 80, 0.2)' } },
          }}
        >
          <ListItemIcon sx={{ color: '#ef5350', minWidth: 36 }}>
            <Delete fontSize="small" />
          </ListItemIcon>
          <ListItemText primary={t('inbox.trash')} primaryTypographyProps={{ sx: { color: '#ffffff', fontSize: '0.85rem' } }} />
          <Chip label={stats.trash} size="small" sx={{ height: '20px', fontSize: '0.7rem', backgroundColor: 'rgba(239, 83, 80, 0.2)', color: '#ef5350' }} />
        </MenuItem>
      </Menu>

      {/* Context menu */}
      {renderContextMenu()}

      {/* Add contact dialog */}
      {addContactDialog.open && (
        <CreatePartnerDialog
          open={addContactDialog.open}
          onClose={() => setAddContactDialog({ open: false, bpn: '' })}
          onSave={handleAddContactSuccess}
          partnerData={{ bpnl: addContactDialog.bpn, name: '' }}
        />
      )}

      {/* Stacking Undo Snackbars */}
      <Box
        sx={{
          position: 'fixed',
          bottom: 16,
          left: 16,
          display: 'flex',
          flexDirection: 'column-reverse',
          gap: 1,
          zIndex: 1400,
          pointerEvents: 'none',
        }}
      >
        {undoSnackbars.map((snackbar) => (
          <UndoSnackbarItem
            key={snackbar.id}
            snackbar={snackbar}
            onUndo={handleUndo}
            onDismiss={dismissSnackbar}
            undoLabel={t('snackbar.undo')}
          />
        ))}
      </Box>
    </Box>
  );
};

// Separate component for each snackbar with its own countdown timer
interface UndoSnackbarItemProps {
  snackbar: {
    id: string;
    message: string;
    action: 'archive' | 'trash' | 'unarchive' | 'restore';
    targetIds: string[];
    createdAt: number;
  };
  onUndo: (id: string) => void;
  onDismiss: (id: string) => void;
  undoLabel: string;
}

const UndoSnackbarItem: React.FC<UndoSnackbarItemProps> = ({ snackbar, onUndo, onDismiss, undoLabel }) => {
  const [progress, setProgress] = useState(100);
  const DURATION = 5000;

  useEffect(() => {
    const startTime = snackbar.createdAt;
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / DURATION) * 100);
      setProgress(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 50);
    return () => clearInterval(interval);
  }, [snackbar.createdAt]);

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        backgroundColor: 'rgba(20, 25, 35, 0.95)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(66, 165, 245, 0.2)',
        borderRadius: '8px',
        padding: '8px 12px',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
        pointerEvents: 'auto',
        whiteSpace: 'nowrap',
        animation: 'slideIn 0.2s ease-out',
        '@keyframes slideIn': {
          from: { opacity: 0, transform: 'translateX(-20px)' },
          to: { opacity: 1, transform: 'translateX(0)' },
        },
      }}
    >
      <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20 }}>
        <CircularProgress
          variant="determinate"
          value={progress}
          size={18}
          thickness={5}
          sx={{
            color: '#42a5f5',
            '& .MuiCircularProgress-circle': {
              strokeLinecap: 'round',
            },
          }}
        />
      </Box>
      <Typography
        sx={{
          color: '#ffffff',
          fontSize: '0.8rem',
          fontWeight: 500,
        }}
      >
        {snackbar.message}
      </Typography>
      <Button
        size="small"
        onClick={() => onUndo(snackbar.id)}
        sx={{
          color: '#42a5f5',
          fontWeight: 600,
          fontSize: '0.75rem',
          textTransform: 'none',
          minWidth: 'auto',
          padding: '2px 8px',
          '&:hover': {
            backgroundColor: 'rgba(66, 165, 245, 0.15)',
          },
        }}
      >
        {undoLabel}
      </Button>
      <IconButton
        size="small"
        onClick={() => onDismiss(snackbar.id)}
        sx={{
          color: 'rgba(255, 255, 255, 0.5)',
          padding: '2px',
          '&:hover': {
            color: '#ffffff',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
          },
        }}
      >
        <Close sx={{ fontSize: '0.9rem' }} />
      </IconButton>
    </Box>
  );
};

export default NotificationInbox;
