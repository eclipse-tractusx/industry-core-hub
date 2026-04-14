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

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  IconButton,
  Button,
  Chip,
  Tooltip,
  Avatar,
  Divider,
  CircularProgress,
  Collapse,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  AppBar,
  Toolbar,
} from '@mui/material';
import {
  ArrowBack,
  ContentCopy,
  CheckCircle,
  Error,
  Refresh,
  Send,
  Visibility,
  ExpandMore,
  ExpandLess,
  DeviceHub,
  HelpOutline,
  Info,
  PersonAdd,
  Close,
  Warning,
  PriorityHigh,
  Search,
  HourglassEmpty,
} from '@mui/icons-material';
import { useNotifications } from '../contexts/NotificationContext';
import {
  ConnectToParentItem,
  VerifiedItem,
  DigitalTwinVerificationStatus,
  SerializedPartItem,
  FeedbackPayload,
  ItemFeedback,
} from '../types';
import FeedbackForm from './FeedbackForm';
import CreatePartnerDialog from '@/features/business-partner-kit/partner-management/components/general/CreatePartnerDialog';
import { discoverSingleShell, SingleShellDiscoveryResponse } from '@/features/industry-core-kit/part-discovery/api';
import { SingleTwinResult } from '@/features/industry-core-kit/part-discovery/components';

/**
 * NotificationDetail component - displays full notification details and verification
 * Supports responsive design and hides technical details behind info icon
 */
const NotificationDetail: React.FC = () => {
  const {
    panelSize,
    selectedNotification,
    selectNotification,
    getContactName,
    isKnownContact,
    getPriority,
    refreshPartners,
    verifyDigitalTwin,
    verifyAllDigitalTwins,
  } = useNotifications();

  const { t } = useTranslation('notifications');

  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [showAddContactDialog, setShowAddContactDialog] = useState(false);

  // Reset transient UI state when switching notifications
  useEffect(() => {
    setShowFeedbackForm(false);
    setExpandedItems(new Set());
  }, [selectedNotification?.id]);

  // View Twin states
  const [viewTwinItem, setViewTwinItem] = useState<ConnectToParentItem | null>(null);
  const [viewTwinLoading, setViewTwinLoading] = useState(false);
  const [viewTwinResult, setViewTwinResult] = useState<SingleShellDiscoveryResponse | null>(null);
  const [viewTwinError, setViewTwinError] = useState<string | null>(null);

  // Determine layout mode
  const isCompact = panelSize === 'normal';

  // Ref for scrollable content container (auto-scroll on expand)
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  /** Scrolls the content container so the given element is visible */
  const scrollToElement = useCallback((el: HTMLElement) => {
    if (!el) return;
    // Wait for the Collapse animation to finish before scrolling
    setTimeout(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 320);
  }, []);

  if (!selectedNotification) return null;

  const { header, content, verifiedItems, status, feedbackResponse } = selectedNotification;

  const senderName = getContactName(header.senderBpn);
  const isKnown = isKnownContact(header.senderBpn);
  const priority = getPriority(selectedNotification);

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleString();
  };

  const formatResponseTime = (dateStr?: string): string | null => {
    if (!dateStr) return null;
    const responseBy = new Date(dateStr);
    const now = new Date();
    const diffMs = responseBy.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMs < 0) return t('detail.overdue');
    if (diffHours < 24) return t('time.hoursRemaining', { count: diffHours });
    return t('time.daysRemaining', { count: diffDays });
  };

  const getPriorityDisplay = () => {
    const colors = {
      urgent: { bg: 'rgba(244, 67, 54, 0.2)', text: '#ef5350', icon: <PriorityHigh sx={{ fontSize: '0.9rem' }} /> },
      high: { bg: 'rgba(255, 152, 0, 0.2)', text: '#ffb74d', icon: <Warning sx={{ fontSize: '0.85rem' }} /> },
      normal: { bg: 'rgba(255, 255, 255, 0.1)', text: 'rgba(255, 255, 255, 0.7)', icon: null },
      low: { bg: 'rgba(255, 255, 255, 0.05)', text: 'rgba(255, 255, 255, 0.5)', icon: null },
    };
    const config = colors[priority];
    const responseTime = formatResponseTime(header.expectedResponseBy);

    return (
      <Chip
        icon={config.icon || undefined}
        label={responseTime || priority}
        size="small"
        sx={{
          backgroundColor: config.bg,
          color: config.text,
          fontSize: '0.7rem',
          '& .MuiChip-icon': { color: config.text },
        }}
      />
    );
  };

  const getAvatarColor = (bpn: string): string => {
    const hash = bpn.split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0);
    const colors = ['#1976d2', '#388e3c', '#f57c00', '#7b1fa2', '#c2185b', '#00796b', '#5d4037'];
    return colors[hash % colors.length];
  };

  const getInitials = (name: string): string => {
    if (name.startsWith('BPNL')) return name.slice(-2).toUpperCase();
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getVerificationIcon = (vStatus: DigitalTwinVerificationStatus) => {
    switch (vStatus) {
      case 'accessible':
        return <CheckCircle sx={{ color: '#81c784', fontSize: '1.1rem' }} />;
      case 'not-accessible':
        return <Error sx={{ color: '#ef5350', fontSize: '1.1rem' }} />;
      case 'verifying':
        return <CircularProgress size={16} sx={{ color: '#64b5f6' }} />;
      case 'error':
        return <Error sx={{ color: '#ff9800', fontSize: '1.1rem' }} />;
      default:
        return <HelpOutline sx={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '1.1rem' }} />;
    }
  };

  const getVerificationLabel = (vStatus: DigitalTwinVerificationStatus): string => {
    switch (vStatus) {
      case 'accessible':
        return t('verification.accessible');
      case 'not-accessible':
        return t('verification.notAccessible');
      case 'verifying':
        return t('verification.verifying');
      case 'error':
        return t('verification.error');
      default:
        return t('verification.notVerified');
    }
  };

  const toggleItemExpanded = (catenaXId: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(catenaXId)) {
        next.delete(catenaXId);
      } else {
        next.add(catenaXId);
      }
      return next;
    });
  };

  const getItemType = (item: ConnectToParentItem): string => {
    if ('partInstanceId' in item) return t('itemTypes.serializedPart');
    if ('batchId' in item) return t('itemTypes.batch');
    if ('jisNumber' in item) return t('itemTypes.jisPart');
    return t('itemTypes.part');
  };

  const getItemIdentifier = (item: ConnectToParentItem): string => {
    if ('partInstanceId' in item) return item.partInstanceId;
    if ('batchId' in item) return item.batchId;
    if ('jisNumber' in item) return item.jisNumber;
    return (item as SerializedPartItem).catenaXId;
  };

  const handleAddContactSuccess = () => {
    setShowAddContactDialog(false);
    refreshPartners();
  };

  /**
   * Opens the View Twin dialog and triggers a discovery search for the digital twin
   * through the dataspace, reusing the existing discoverSingleShell API.
   */
  const handleViewTwin = useCallback(async (item: ConnectToParentItem) => {
    setViewTwinItem(item);
    setViewTwinLoading(true);
    setViewTwinResult(null);
    setViewTwinError(null);

    try {
      const result = await discoverSingleShell(header.senderBpn, item.catenaXId);
      setViewTwinResult(result);
    } catch (err: unknown) {
      const errorMessage = (err as { message?: string })?.message || t('detail.failedToDiscoverTwin');
      setViewTwinError(errorMessage);
    } finally {
      setViewTwinLoading(false);
    }
  }, [header.senderBpn]);

  /** Closes the View Twin dialog and resets all related state */
  const handleCloseViewTwin = useCallback(() => {
    setViewTwinItem(null);
    setViewTwinResult(null);
    setViewTwinError(null);
    setViewTwinLoading(false);
  }, []);

  const allVerified = verifiedItems.every(
    (vi) => vi.verificationStatus === 'accessible' || vi.verificationStatus === 'not-accessible'
  );

  const anyVerifying = verifiedItems.some((vi) => vi.verificationStatus === 'verifying');

  const renderDigitalTwinItem = (verifiedItem: VerifiedItem, index: number) => {
    const { item, verificationStatus, verificationError } = verifiedItem;
    const isExpanded = expandedItems.has(item.catenaXId);
    const itemFeedback = feedbackResponse?.listOfItems.find(
      (f) => f.catenaXId === item.catenaXId
    );

    return (
      <Box
        key={item.catenaXId}
        sx={{
          backgroundColor: 'rgba(0, 0, 0, 0.2)',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          overflow: 'hidden',
          mb: 1,
        }}
      >
        {/* Item Header */}
        <Box
          onClick={() => toggleItemExpanded(item.catenaXId)}
          sx={{
            display: 'flex',
            alignItems: 'center',
            padding: isCompact ? '8px 10px' : '10px 12px',
            cursor: 'pointer',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
            },
          }}
        >
          <DeviceHub sx={{ color: '#81c784', fontSize: isCompact ? '1rem' : '1.2rem', mr: 1 }} />

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography
                sx={{
                  color: '#ffffff',
                  fontWeight: 500,
                  fontSize: isCompact ? '0.75rem' : '0.85rem',
                }}
              >
                {getItemType(item)} #{index + 1}
              </Typography>
              {!isCompact && (
                <Chip
                  label={getItemIdentifier(item)}
                  size="small"
                  sx={{
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    color: 'rgba(255, 255, 255, 0.8)',
                    fontSize: '0.6rem',
                    height: '16px',
                    maxWidth: '120px',
                    '& .MuiChip-label': {
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    },
                  }}
                />
              )}
            </Box>
            <Typography
              sx={{
                color: 'rgba(255, 255, 255, 0.5)',
                fontSize: '0.65rem',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {item.manufacturerPartId}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Tooltip title={getVerificationLabel(verificationStatus)} arrow>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                {getVerificationIcon(verificationStatus)}
              </Box>
            </Tooltip>

            {itemFeedback && (
              <Chip
                label={itemFeedback.status}
                size="small"
                sx={{
                  backgroundColor:
                    itemFeedback.status === 'OK'
                      ? 'rgba(76, 175, 80, 0.2)'
                      : itemFeedback.status === 'PENDING'
                        ? 'rgba(255, 167, 38, 0.2)'
                        : 'rgba(244, 67, 54, 0.2)',
                  color: itemFeedback.status === 'OK' 
                    ? '#81c784' 
                    : itemFeedback.status === 'PENDING'
                      ? '#ffa726'
                      : '#ef5350',
                  fontSize: '0.55rem',
                  height: '16px',
                }}
              />
            )}

            {isExpanded ? (
              <ExpandLess sx={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '1rem' }} />
            ) : (
              <ExpandMore sx={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '1rem' }} />
            )}
          </Box>
        </Box>

        {/* Expanded Details */}
        <Collapse in={isExpanded} onEntered={(node) => scrollToElement(node as HTMLElement)}>
          <Box
            sx={{
              padding: isCompact ? '8px 10px' : '12px',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              backgroundColor: 'rgba(0, 0, 0, 0.1)',
            }}
          >
            <Box sx={{ display: 'grid', gridTemplateColumns: isCompact ? '1fr' : '1fr 1fr', gap: 1 }}>
              <DetailRow label={t('detail.catenaXId')} value={item.catenaXId} copyable compact={isCompact} t={t} />
              <DetailRow label={t('fields.manufacturerId')} value={item.manufacturerId} copyable compact={isCompact} t={t} />
              <DetailRow label={t('fields.manufacturerPartId')} value={item.manufacturerPartId} compact={isCompact} t={t} />
              {item.customerPartId && (
                <DetailRow label={t('fields.customerPartId')} value={item.customerPartId} compact={isCompact} t={t} />
              )}
              {'partInstanceId' in item && (
                <DetailRow label={t('fields.serialNumber')} value={item.partInstanceId} compact={isCompact} t={t} />
              )}
              {'batchId' in item && <DetailRow label={t('fields.batchId')} value={item.batchId} compact={isCompact} t={t} />}
              {'jisNumber' in item && (
                <>
                  <DetailRow label={t('fields.jisNumber')} value={item.jisNumber} compact={isCompact} t={t} />
                  {'jisCallDate' in item && item.jisCallDate && (
                    <DetailRow label={t('fields.jisCallDate')} value={item.jisCallDate} compact={isCompact} t={t} />
                  )}
                </>
              )}
            </Box>

            {verificationError && (
              <Box
                sx={{
                  mt: 1,
                  padding: '6px 8px',
                  backgroundColor: 'rgba(244, 67, 54, 0.1)',
                  borderRadius: '4px',
                  borderLeft: '3px solid #f44336',
                }}
              >
                <Typography sx={{ color: '#ef5350', fontSize: '0.7rem' }}>
                  {verificationError}
                </Typography>
              </Box>
            )}

            {verificationStatus === 'not-verified' && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<Visibility sx={{ fontSize: '0.9rem' }} />}
                onClick={() => verifyDigitalTwin(selectedNotification.id, item.catenaXId)}
                sx={{
                  mt: 1,
                  color: '#64b5f6',
                  borderColor: 'rgba(100, 181, 246, 0.5)',
                  fontSize: '0.7rem',
                  padding: '4px 10px',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    borderColor: '#64b5f6',
                    backgroundColor: 'rgba(100, 181, 246, 0.2)',
                    color: '#90caf9',
                    transform: 'translateY(-1px)',
                    boxShadow: '0 2px 8px rgba(100, 181, 246, 0.3)',
                  },
                }}
              >
                {t('detail.verifyAccess')}
              </Button>
            )}

            {/* View Twin button - always visible to discover the twin through the dataspace */}
            <Button
              variant="outlined"
              size="small"
              startIcon={<Search sx={{ fontSize: '0.9rem' }} />}
              onClick={(e) => {
                e.stopPropagation();
                handleViewTwin(item);
              }}
              sx={{
                mt: 1,
                ml: verificationStatus === 'not-verified' ? 1 : 0,
                color: '#81c784',
                borderColor: 'rgba(129, 199, 132, 0.5)',
                fontSize: '0.7rem',
                padding: '4px 10px',
                transition: 'all 0.2s ease',
                '&:hover': {
                  borderColor: '#81c784',
                  backgroundColor: 'rgba(129, 199, 132, 0.2)',
                  color: '#a5d6a7',
                  transform: 'translateY(-1px)',
                  boxShadow: '0 2px 8px rgba(129, 199, 132, 0.3)',
                },
              }}
            >
              {t('detail.viewTwin')}
            </Button>
          </Box>
        </Collapse>
      </Box>
    );
  };

  // Technical Details Dialog
  const renderTechnicalDetailsDialog = () => (
    <Dialog
      open={showTechnicalDetails}
      onClose={() => setShowTechnicalDetails(false)}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: '#1a1a1a',
          color: '#ffffff',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
        },
      }}
    >
      <DialogTitle 
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          padding: '20px 24px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          backgroundColor: 'rgba(0, 0, 0, 0.2)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Info sx={{ color: '#64b5f6', fontSize: '1.4rem' }} />
          <Typography sx={{ fontWeight: 600, fontSize: '1.1rem', color: '#ffffff' }}>
            {t('detail.technicalDetails')}
          </Typography>
        </Box>
        <IconButton 
          onClick={() => setShowTechnicalDetails(false)} 
          sx={{ 
            color: 'rgba(255, 255, 255, 0.6)',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            '&:hover': { 
              backgroundColor: 'rgba(244, 67, 54, 0.15)',
              color: '#ef5350',
            },
          }}
        >
          <Close sx={{ fontSize: '1.2rem' }} />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ padding: '24px', backgroundColor: '#1e1e1e' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {/* Message Information Section */}
          <Box>
            <Typography 
              sx={{ 
                color: '#64b5f6', 
                fontSize: '0.75rem', 
                fontWeight: 600, 
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                mb: 1.5,
              }}
            >
              {t('detail.messageInformation')}
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, rowGap: 2.5 }}>
              <DetailRow label={t('detail.messageId')} value={header.messageId} copyable t={t} />
              <DetailRow label={t('detail.context')} value={header.context} t={t} />
              <DetailRow label={t('detail.version')} value={header.version} t={t} />
              {header.relatedMessageId && (
                <DetailRow label={t('detail.relatedMessage')} value={header.relatedMessageId} copyable t={t} />
              )}
            </Box>
          </Box>

          <Box sx={{ height: '1px', backgroundColor: 'rgba(255, 255, 255, 0.08)' }} />

          {/* Business Partner Information Section */}
          <Box>
            <Typography 
              sx={{ 
                color: '#64b5f6', 
                fontSize: '0.75rem', 
                fontWeight: 600, 
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                mb: 1.5,
              }}
            >
              {t('detail.businessPartners')}
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, rowGap: 2.5 }}>
              <DetailRow label={t('detail.senderBpn')} value={header.senderBpn} copyable t={t} />
              <DetailRow label={t('detail.receiverBpn')} value={header.receiverBpn} copyable t={t} />
            </Box>
          </Box>

          <Box sx={{ height: '1px', backgroundColor: 'rgba(255, 255, 255, 0.08)' }} />

          {/* Timestamps Section */}
          <Box>
            <Typography 
              sx={{ 
                color: '#64b5f6', 
                fontSize: '0.75rem', 
                fontWeight: 600, 
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                mb: 1.5,
              }}
            >
              {t('detail.timestamps')}
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, rowGap: 2.5 }}>
              <DetailRow label={t('detail.sentDateTime')} value={formatDate(header.sentDateTime)} t={t} />
              {header.expectedResponseBy ? (
                <DetailRow label={t('detail.expectedResponse')} value={formatDate(header.expectedResponseBy)} t={t} />
              ) : (
                <Box />
              )}
            </Box>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions 
        sx={{ 
          padding: '16px 24px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          backgroundColor: 'rgba(0, 0, 0, 0.2)',
        }}
      >
        <Button
          onClick={() => setShowTechnicalDetails(false)}
          variant="contained"
          sx={{ 
            backgroundColor: '#42a5f5',
            color: '#ffffff',
            textTransform: 'none',
            fontWeight: 500,
            padding: '8px 24px',
            borderRadius: '8px',
            '&:hover': {
              backgroundColor: '#1976d2',
            },
          }}
        >
          {t('detail.close')}
        </Button>
      </DialogActions>
    </Dialog>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          padding: isCompact ? '10px 12px' : '12px 16px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          backgroundColor: 'rgba(0, 0, 0, 0.1)',
        }}
      >
        <IconButton
          onClick={() => selectNotification(null)}
          sx={{
            color: 'rgba(255, 255, 255, 0.7)',
            mr: 1,
            padding: isCompact ? '6px' : '8px',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            '&:hover': {
              color: '#ffffff',
              backgroundColor: 'rgba(66, 165, 245, 0.2)',
            },
          }}
        >
          <ArrowBack sx={{ fontSize: isCompact ? '1.1rem' : '1.3rem' }} />
        </IconButton>

        <Avatar
          sx={{
            width: isCompact ? 32 : 40,
            height: isCompact ? 32 : 40,
            backgroundColor: getAvatarColor(header.senderBpn),
            fontSize: isCompact ? '0.7rem' : '0.85rem',
            fontWeight: 600,
          }}
        >
          {getInitials(senderName)}
        </Avatar>

        <Box sx={{ flex: 1, ml: 1.5, overflow: 'hidden' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography
              sx={{
                color: '#ffffff',
                fontWeight: 600,
                fontSize: isCompact ? '0.85rem' : '0.95rem',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {senderName}
            </Typography>
            {isKnown ? (
              <Tooltip title={t('detail.knownContact')} arrow>
                <CheckCircle sx={{ fontSize: '0.85rem', color: '#81c784' }} />
              </Tooltip>
            ) : (
              <Tooltip title={t('detail.addToContacts')} arrow>
                <IconButton
                  size="small"
                  onClick={() => setShowAddContactDialog(true)}
                  sx={{
                    padding: '4px',
                    color: '#ffb74d',
                    backgroundColor: 'rgba(255, 183, 77, 0.1)',
                    '&:hover': { 
                      backgroundColor: 'rgba(255, 183, 77, 0.25)',
                      color: '#ffa726',
                    },
                  }}
                >
                  <PersonAdd sx={{ fontSize: '0.95rem' }} />
                </IconButton>
              </Tooltip>
            )}
          </Box>
          <Typography
            sx={{
              color: 'rgba(255, 255, 255, 0.5)',
              fontSize: isCompact ? '0.65rem' : '0.7rem',
            }}
          >
            {formatDate(header.sentDateTime)}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {/* Technical Details Info Icon */}
          <Tooltip title={t('detail.viewTechnicalDetails')} arrow>
            <IconButton
              onClick={() => setShowTechnicalDetails(true)}
              sx={{
                color: 'rgba(255, 255, 255, 0.6)',
                padding: '6px',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                '&:hover': {
                  color: '#64b5f6',
                  backgroundColor: 'rgba(100, 181, 246, 0.2)',
                },
              }}
            >
              <Info sx={{ fontSize: '1.1rem' }} />
            </IconButton>
          </Tooltip>

          {status === 'feedback-sent' && (
            <Chip
              icon={<CheckCircle sx={{ fontSize: '0.8rem !important' }} />}
              label={isCompact ? t('detail.sent') : t('detail.feedbackSent')}
              size="small"
              sx={{
                backgroundColor: 'rgba(76, 175, 80, 0.2)',
                color: '#81c784',
                fontSize: '0.65rem',
              }}
            />
          )}
        </Box>
      </Box>

      {/* Content */}
      <Box
        ref={scrollContainerRef}
        sx={{
          flex: 1,
          overflow: 'auto',
          scrollBehavior: 'smooth',
          padding: isCompact ? '12px' : '16px',
          '&::-webkit-scrollbar': {
            width: '5px',
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'rgba(255, 255, 255, 0.15)',
            borderRadius: '3px',
          },
        }}
      >
        {/* Message Info */}
        <Box
          sx={{
            padding: isCompact ? '10px' : '12px',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '8px',
            mb: 2,
          }}
        >
          <Typography
            sx={{
              color: '#ffffff',
              fontSize: isCompact ? '0.8rem' : '0.9rem',
              lineHeight: 1.6,
              mb: 1.5,
            }}
          >
            {content.information || 'Digital Twin notification received.'}
          </Typography>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
            <Chip
              label={content.digitalTwinType}
              size="small"
              sx={{
                backgroundColor: 'rgba(25, 118, 210, 0.2)',
                color: '#64b5f6',
                fontSize: '0.65rem',
                height: '22px',
              }}
            />
            <Chip
              icon={<DeviceHub sx={{ fontSize: '0.75rem !important' }} />}
              label={`${content.listOfItems.length} DT${content.listOfItems.length > 1 ? 's' : ''}`}
              size="small"
              sx={{
                backgroundColor: 'rgba(76, 175, 80, 0.2)',
                color: '#81c784',
                fontSize: '0.65rem',
                height: '22px',
                '& .MuiChip-icon': { color: '#81c784' },
              }}
            />
            {header.expectedResponseBy && getPriorityDisplay()}
          </Box>
        </Box>

        {/* Digital Twins Section */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography
            sx={{
              color: 'rgba(255, 255, 255, 0.6)',
              fontSize: '0.7rem',
              fontWeight: 600,
              textTransform: 'uppercase',
            }}
          >
            {t('detail.digitalTwinsCount', { count: content.listOfItems.length })}
          </Typography>

          {!allVerified && !anyVerifying && (
            <Button
              size="small"
              startIcon={<Refresh sx={{ fontSize: '0.85rem' }} />}
              onClick={() => verifyAllDigitalTwins(selectedNotification.id)}
              sx={{
                color: '#64b5f6',
                fontSize: '0.65rem',
                padding: '2px 8px',
                transition: 'all 0.2s ease',
                '&:hover': {
                  backgroundColor: 'rgba(100, 181, 246, 0.2)',
                  color: '#90caf9',
                  transform: 'translateY(-1px)',
                },
              }}
            >
              {t('detail.verifyAll')}
            </Button>
          )}
        </Box>

        {verifiedItems.map((vi, index) => renderDigitalTwinItem(vi, index))}

        {/* Feedback Section */}
        {status !== 'feedback-sent' && (
          <Box sx={{ mt: 2 }}>
            <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)', mb: 2 }} />

            {!showFeedbackForm ? (
              <Tooltip 
                title={!allVerified ? t('detail.verifyAllTooltip') : ""}
                arrow
                placement="top"
              >
                <span>
                  <Button
                    variant="contained"
                    fullWidth
                    startIcon={<Send sx={{ fontSize: '1rem' }} />}
                    onClick={() => {
                      setShowFeedbackForm(true);
                      // Scroll to bottom so the feedback form is visible
                      setTimeout(() => {
                        scrollContainerRef.current?.scrollTo({
                          top: scrollContainerRef.current.scrollHeight,
                          behavior: 'smooth',
                        });
                      }, 350);
                    }}
                    disabled={!allVerified}
                    sx={{
                      backgroundColor: allVerified ? '#1976d2' : 'rgba(255, 255, 255, 0.1)',
                      color: '#ffffff',
                      fontSize: '0.8rem',
                      padding: '8px 16px',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        backgroundColor: allVerified ? '#1565c0' : 'rgba(255, 255, 255, 0.15)',
                        transform: allVerified ? 'translateY(-1px)' : 'none',
                        boxShadow: allVerified ? '0 4px 12px rgba(25, 118, 210, 0.4)' : 'none',
                      },
                      '&.Mui-disabled': {
                        color: 'rgba(255, 255, 255, 0.4)',
                        backgroundColor: 'rgba(255, 255, 255, 0.08)',
                      },
                    }}
                  >
                    {allVerified ? t('detail.sendFeedback') : t('detail.pendingVerification')}
                  </Button>
                </span>
              </Tooltip>
            ) : (
              <FeedbackForm
                notification={selectedNotification}
                onCancel={() => setShowFeedbackForm(false)}
              />
            )}
          </Box>
        )}

        {/* Feedback Response if already sent */}
        {feedbackResponse && (
          <FeedbackSentPanel feedbackResponse={feedbackResponse} t={t} />
        )}
      </Box>

      {/* Technical Details Dialog */}
      {renderTechnicalDetailsDialog()}

      {/* Add Contact Dialog */}
      <CreatePartnerDialog
        open={showAddContactDialog}
        onClose={() => setShowAddContactDialog(false)}
        onSave={handleAddContactSuccess}
        partnerData={{ bpnl: header.senderBpn, name: '' }}
      />

      {/* View Twin Dialog */}
      <Dialog
        maxWidth={false}
        open={!!viewTwinItem}
        onClose={handleCloseViewTwin}
        PaperProps={{
          sx: {
            width: '92vw',
            height: '88vh',
            maxWidth: '92vw',
            borderRadius: '16px',
            backgroundColor: '#0a1628',
            backgroundImage: 'linear-gradient(180deg, #0d1f3c 0%, #0a1628 100%)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          },
        }}
        slotProps={{
          backdrop: {
            sx: {
              backdropFilter: 'blur(6px)',
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
            },
          },
        }}
      >
        <AppBar
          sx={{
            position: 'relative',
            backgroundColor: 'rgba(0, 42, 126, 0.98)',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 2px 16px rgba(0, 0, 0, 0.3)',
            borderRadius: '16px 16px 0 0',
          }}
        >
          <Toolbar>
            <Search sx={{ color: '#81c784', mr: 1.5 }} />
            <Typography sx={{ flex: 1, fontWeight: 600, fontSize: '1.1rem', color: 'rgba(255, 255, 255, 0.95)' }}>
              {t('detail.viewDigitalTwin')}
            </Typography>
            {viewTwinItem && (
              <Chip
                label={viewTwinItem.catenaXId}
                size="small"
                sx={{
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontSize: '0.7rem',
                  maxWidth: '300px',
                  mr: 1.5,
                  '& .MuiChip-label': {
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  },
                }}
              />
            )}
            <IconButton
              edge="end"
              onClick={handleCloseViewTwin}
              aria-label="close"
              sx={{
                color: 'rgba(255, 255, 255, 0.85)',
                transition: 'all 0.2s ease',
                '&:hover': {
                  color: '#ffffff',
                  backgroundColor: 'rgba(255, 255, 255, 0.12)',
                  transform: 'scale(1.05)',
                },
              }}
            >
              <Close />
            </IconButton>
          </Toolbar>
        </AppBar>

        <Box
          sx={{
            flex: 1,
            overflow: 'auto',
            padding: 3,
          }}
        >
          {/* Loading state */}
          {viewTwinLoading && (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '60vh',
                gap: 3,
              }}
            >
              <CircularProgress
                size={56}
                sx={{
                  color: '#42a5f5',
                }}
              />
              <Box sx={{ textAlign: 'center' }}>
                <Typography
                  sx={{
                    color: '#ffffff',
                    fontSize: '1.2rem',
                    fontWeight: 600,
                    mb: 1,
                  }}
                >
                  {t('detail.discoveringTwin')}
                </Typography>
                <Typography
                  sx={{
                    color: 'rgba(255, 255, 255, 0.6)',
                    fontSize: '0.9rem',
                  }}
                >
                  {t('detail.searchingDataspace')}
                </Typography>
                {viewTwinItem && (
                  <Typography
                    sx={{
                      color: 'rgba(100, 181, 246, 0.8)',
                      fontSize: '0.75rem',
                      mt: 1.5,
                      fontFamily: 'monospace',
                    }}
                  >
                    {viewTwinItem.catenaXId}
                  </Typography>
                )}
              </Box>
            </Box>
          )}

          {/* Error state */}
          {viewTwinError && !viewTwinLoading && (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '60vh',
                gap: 2,
              }}
            >
              <Error sx={{ color: '#ef5350', fontSize: '3rem' }} />
              <Typography
                sx={{
                  color: '#ffffff',
                  fontSize: '1.1rem',
                  fontWeight: 600,
                }}
              >
                {t('detail.discoveryFailed')}
              </Typography>
              <Typography
                sx={{
                  color: 'rgba(255, 255, 255, 0.6)',
                  fontSize: '0.9rem',
                  textAlign: 'center',
                  maxWidth: '500px',
                }}
              >
                {viewTwinError}
              </Typography>
              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={() => viewTwinItem && handleViewTwin(viewTwinItem)}
                sx={{
                  mt: 2,
                  color: '#64b5f6',
                  borderColor: 'rgba(100, 181, 246, 0.5)',
                  '&:hover': {
                    borderColor: '#64b5f6',
                    backgroundColor: 'rgba(100, 181, 246, 0.1)',
                  },
                }}
              >
                {t('detail.retry')}
              </Button>
            </Box>
          )}

          {/* Success - show the discovered twin using SingleTwinResult */}
          {viewTwinResult && !viewTwinLoading && (
            <Box sx={{ width: '100%', maxWidth: '1400px', mx: 'auto' }}>
              {/* Type assertion needed: SingleShellDiscoveryResponse has optional assetKind/assetType
                 while SingleTwinResult props expect them as required. The API always returns them. */}
              <SingleTwinResult
                counterPartyId={header.senderBpn}
                singleTwinResult={viewTwinResult as React.ComponentProps<typeof SingleTwinResult>['singleTwinResult']}
              />
            </Box>
          )}
        </Box>
      </Dialog>
    </Box>
  );
};

// Helper component for detail rows
const DetailRow: React.FC<{ label: string; value: string; copyable?: boolean; compact?: boolean; t?: (key: string) => string }> = ({
  label,
  value,
  copyable,
  compact = false,
  t,
}) => (
  <Box>
    <Typography sx={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: compact ? '0.6rem' : '0.65rem', mb: 0.25 }}>
      {label}
    </Typography>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <Typography
        sx={{
          color: 'rgba(255, 255, 255, 0.9)',
          fontSize: compact ? '0.7rem' : '0.75rem',
          wordBreak: 'break-all',
        }}
      >
        {value}
      </Typography>
      {copyable && (
        <Tooltip title={t ? t('detail.copy') : 'Copy'} arrow>
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              navigator.clipboard.writeText(value);
            }}
            sx={{
              padding: '2px',
              color: 'rgba(255, 255, 255, 0.4)',
              '&:hover': { color: '#ffffff' },
            }}
          >
            <ContentCopy sx={{ fontSize: '0.65rem' }} />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  </Box>
);

// Helper to get feedback status color for the FeedbackSentPanel
const getFeedbackStatusColor = (status: string): string => {
  switch (status) {
    case 'OK': return '#81c784';
    case 'PENDING': return '#ffa726';
    default: return '#ef5350';
  }
};

const getFeedbackStatusBg = (status: string): string => {
  switch (status) {
    case 'OK': return 'rgba(76, 175, 80, 0.1)';
    case 'PENDING': return 'rgba(255, 167, 38, 0.1)';
    default: return 'rgba(244, 67, 54, 0.1)';
  }
};

const getFeedbackStatusHoverBg = (status: string): string => {
  switch (status) {
    case 'OK': return 'rgba(76, 175, 80, 0.15)';
    case 'PENDING': return 'rgba(255, 167, 38, 0.15)';
    default: return 'rgba(244, 67, 54, 0.15)';
  }
};

const getFeedbackStatusIcon = (status: string, fontSize: string = '1rem') => {
  switch (status) {
    case 'OK': return <CheckCircle sx={{ color: '#81c784', fontSize }} />;
    case 'PENDING': return <HourglassEmpty sx={{ color: '#ffa726', fontSize }} />;
    default: return <Error sx={{ color: '#ef5350', fontSize }} />;
  }
};

// Expandable Feedback Sent Panel
const FeedbackSentPanel: React.FC<{ feedbackResponse: FeedbackPayload; t: (key: string, params?: Record<string, unknown>) => string }> = ({ feedbackResponse, t }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <Box sx={{ mt: 2 }}>
      <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)', mb: 2 }} />
      
      {/* Header - Clickable */}
      <Box
        onClick={() => setExpanded(!expanded)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 12px',
          backgroundColor: getFeedbackStatusBg(feedbackResponse.status),
          borderRadius: expanded ? '8px 8px 0 0' : '8px',
          borderLeft: `3px solid ${getFeedbackStatusColor(feedbackResponse.status)}`,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          '&:hover': {
            backgroundColor: getFeedbackStatusHoverBg(feedbackResponse.status),
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {getFeedbackStatusIcon(feedbackResponse.status)}
          <Box>
            <Typography sx={{ color: '#ffffff', fontWeight: 600, fontSize: '0.8rem' }}>
              {t('detail.feedbackSent')}
            </Typography>
            <Typography sx={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.65rem' }}>
              {t('detail.statusItems', { status: feedbackResponse.status, count: feedbackResponse.listOfItems?.length || 0 })}
            </Typography>
          </Box>
        </Box>
        <IconButton
          size="small"
          sx={{
            color: 'rgba(255, 255, 255, 0.5)',
            padding: '4px',
            '&:hover': { color: '#ffffff' },
          }}
        >
          {expanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
        </IconButton>
      </Box>

      {/* Expanded Details */}
      <Collapse in={expanded}>
        <Box
          sx={{
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
            borderRadius: '0 0 8px 8px',
            padding: '12px',
            borderLeft: `3px solid ${getFeedbackStatusColor(feedbackResponse.status)}`,
            borderTop: 'none',
          }}
        >
          {/* Overall Message */}
          {feedbackResponse.statusMessage && (
            <Box sx={{ mb: 1.5 }}>
              <Typography sx={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.6rem', textTransform: 'uppercase', mb: 0.5 }}>
                {t('detail.message')}
              </Typography>
              <Typography sx={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '0.75rem', textAlign: 'center', fontStyle: 'italic' }}>
                "{feedbackResponse.statusMessage}"
              </Typography>
            </Box>
          )}

          {/* Items List */}
          {feedbackResponse.listOfItems && feedbackResponse.listOfItems.length > 0 && (
            <Box>
              <Typography sx={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.6rem', textTransform: 'uppercase', mb: 0.75 }}>
                {t('detail.itemResponses')}
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                {feedbackResponse.listOfItems.map((item: ItemFeedback, idx: number) => (
                  <Box
                    key={idx}
                    sx={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 1,
                      padding: '8px 10px',
                      backgroundColor: 'rgba(0, 0, 0, 0.2)',
                      borderRadius: '6px',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                    }}
                  >
                    {getFeedbackStatusIcon(item.status, '0.9rem')}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography 
                        sx={{ 
                          color: 'rgba(255, 255, 255, 0.7)', 
                          fontSize: '0.6rem',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {item.catenaXId}
                      </Typography>
                      {item.statusMessage && (
                        <Typography sx={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.65rem', mt: 0.25 }}>
                          {item.statusMessage}
                        </Typography>
                      )}
                    </Box>
                    <Chip
                      label={item.status}
                      size="small"
                      sx={{
                        backgroundColor: getFeedbackStatusBg(item.status),
                        color: getFeedbackStatusColor(item.status),
                        fontSize: '0.55rem',
                        height: '18px',
                        fontWeight: 600,
                      }}
                    />
                  </Box>
                ))}
              </Box>
            </Box>
          )}
        </Box>
      </Collapse>
    </Box>
  );
};

export default NotificationDetail;
