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

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  Button,
  TextField,
  FormControl,
  Select,
  MenuItem,
  CircularProgress,
  Collapse,
  IconButton,
  Chip,
  Tooltip,
  SelectChangeEvent,
} from '@mui/material';
import {
  Send,
  Close,
  ExpandMore,
  ExpandLess,
  CheckCircle,
  Error,
  DeviceHub,
  ReplyAll,
  HourglassEmpty,
} from '@mui/icons-material';
import { useNotifications } from '../contexts/NotificationContext';
import {
  InboxNotification,
  FeedbackPayload,
  ItemFeedback,
  FeedbackStatus,
} from '../types';

interface FeedbackFormProps {
  notification: InboxNotification;
  onCancel: () => void;
}

// Default messages for each status
const DEFAULT_MESSAGES: Record<FeedbackStatus, string> = {
  OK: 'Digital Twin accessible and processed successfully',
  ERROR: 'Digital Twin not accessible or processing failed',
  PENDING: 'Verification pending - Digital Twin not yet processed',
};

/**
 * Returns the color associated with a given feedback status.
 * Used across the form for consistent status coloring.
 */
const getStatusColor = (status: FeedbackStatus): string => {
  switch (status) {
    case 'OK': return '#81c784';
    case 'ERROR': return '#ef5350';
    case 'PENDING': return '#ffa726';
  }
};

/**
 * Returns the background color (with alpha) for a given feedback status.
 */
const getStatusBgColor = (status: FeedbackStatus): string => {
  switch (status) {
    case 'OK': return 'rgba(129, 199, 132, 0.12)';
    case 'ERROR': return 'rgba(239, 83, 80, 0.12)';
    case 'PENDING': return 'rgba(255, 167, 38, 0.12)';
  }
};

/**
 * Returns the border color (with alpha) for a given feedback status.
 */
const getStatusBorderColor = (status: FeedbackStatus): string => {
  switch (status) {
    case 'OK': return 'rgba(129, 199, 132, 0.4)';
    case 'ERROR': return 'rgba(239, 83, 80, 0.4)';
    case 'PENDING': return 'rgba(255, 167, 38, 0.4)';
  }
};

/**
 * Returns the icon component for a given feedback status.
 */
const getStatusIcon = (status: FeedbackStatus, fontSize: string = '1.1rem') => {
  switch (status) {
    case 'OK': return <CheckCircle sx={{ color: '#81c784', fontSize }} />;
    case 'ERROR': return <Error sx={{ color: '#ef5350', fontSize }} />;
    case 'PENDING': return <HourglassEmpty sx={{ color: '#ffa726', fontSize }} />;
  }
};

/**
 * FeedbackForm component - Professional feedback composition interface
 * Blue themed to match the notification panel
 */
const FeedbackForm: React.FC<FeedbackFormProps> = ({ notification, onCancel }) => {
  const { sendFeedback, panelSize } = useNotifications();
  const { t } = useTranslation('notifications');

  const [overallStatus, setOverallStatus] = useState<FeedbackStatus>('OK');
  const [overallMessage, setOverallMessage] = useState('');
  const [overallMessageModified, setOverallMessageModified] = useState(false);
  const [itemFeedbacks, setItemFeedbacks] = useState<ItemFeedback[]>([]);
  const [itemMessageModified, setItemMessageModified] = useState<Set<string>>(new Set());
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);

  const isCompact = panelSize === 'normal';

  // Initialize item feedbacks from verified items
  useEffect(() => {
    const initialFeedbacks: ItemFeedback[] = notification.verifiedItems.map((vi) => ({
      catenaXId: vi.item.catenaXId,
      status: vi.verificationStatus === 'accessible' ? 'OK' : 'ERROR',
      statusMessage:
        vi.verificationStatus === 'accessible'
          ? DEFAULT_MESSAGES.OK
          : vi.verificationError || DEFAULT_MESSAGES.ERROR,
    }));
    setItemFeedbacks(initialFeedbacks);

    // Set overall status based on items
    const hasErrors = notification.verifiedItems.some(
      (vi) => vi.verificationStatus !== 'accessible'
    );
    setOverallStatus(hasErrors ? 'ERROR' : 'OK');
    setOverallMessage(hasErrors ? DEFAULT_MESSAGES.ERROR : DEFAULT_MESSAGES.OK);
  }, [notification]);

  // Auto-update overall message when status changes (if not manually modified)
  useEffect(() => {
    if (!overallMessageModified) {
      setOverallMessage(DEFAULT_MESSAGES[overallStatus]);
    }
  }, [overallStatus, overallMessageModified]);

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

  // Handler to update item status with auto-message update
  const updateItemStatus = useCallback((catenaXId: string, newStatus: FeedbackStatus) => {
    setItemFeedbacks((prev) =>
      prev.map((f) => {
        if (f.catenaXId === catenaXId) {
          const wasModified = itemMessageModified.has(catenaXId);
          const newMessage = wasModified ? f.statusMessage : DEFAULT_MESSAGES[newStatus];
          return { ...f, status: newStatus, statusMessage: newMessage };
        }
        return f;
      })
    );
  }, [itemMessageModified]);

  // Handler to update item message
  const updateItemMessage = useCallback((catenaXId: string, message: string) => {
    setItemFeedbacks((prev) =>
      prev.map((f) => (f.catenaXId === catenaXId ? { ...f, statusMessage: message } : f))
    );
    setItemMessageModified((prev) => new Set(prev).add(catenaXId));
  }, []);

  const getItemInfo = (catenaXId: string) => {
    const verified = notification.verifiedItems.find((vi) => vi.item.catenaXId === catenaXId);
    return verified?.item;
  };

  const handleSend = async () => {
    setSending(true);
    try {
      const feedbackContent: FeedbackPayload = {
        status: overallStatus,
        statusMessage: overallMessage || undefined,
        listOfItems: itemFeedbacks,
      };
      await sendFeedback(notification.id, feedbackContent);
      onCancel();
    } catch (error) {
      console.error('Failed to send feedback:', error);
    } finally {
      setSending(false);
    }
  };

  const okCount = itemFeedbacks.filter((f) => f.status === 'OK').length;
  const errorCount = itemFeedbacks.filter((f) => f.status === 'ERROR').length;
  const pendingCount = itemFeedbacks.filter((f) => f.status === 'PENDING').length;

  return (
    <Box
      sx={{
        background: 'linear-gradient(180deg, rgba(25, 35, 55, 0.98) 0%, rgba(15, 25, 45, 0.98) 100%)',
        borderRadius: '12px',
        border: '1px solid rgba(66, 165, 245, 0.25)',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(66, 165, 245, 0.1)',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: isCompact ? '12px 14px' : '14px 18px',
          background: 'linear-gradient(135deg, rgba(66, 165, 245, 0.2) 0%, rgba(25, 118, 210, 0.15) 100%)',
          borderBottom: '1px solid rgba(66, 165, 245, 0.2)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              borderRadius: '8px',
              backgroundColor: 'rgba(66, 165, 245, 0.2)',
            }}
          >
            <ReplyAll sx={{ color: '#64b5f6', fontSize: isCompact ? '1rem' : '1.1rem' }} />
          </Box>
          <Typography
            sx={{
              color: '#ffffff',
              fontWeight: 600,
              fontSize: isCompact ? '0.9rem' : '1rem',
              letterSpacing: '0.3px',
            }}
          >
            {t('feedback.composeFeedback')}
          </Typography>
        </Box>
        <Tooltip title={t('feedback.cancel')} arrow>
          <IconButton
            size="small"
            onClick={onCancel}
            sx={{
              color: 'rgba(255, 255, 255, 0.6)',
              padding: '6px',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '8px',
              '&:hover': { 
                color: '#ef5350',
                backgroundColor: 'rgba(244, 67, 54, 0.15)',
              },
            }}
          >
            <Close sx={{ fontSize: isCompact ? '1rem' : '1.1rem' }} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Content */}
      <Box sx={{ padding: isCompact ? '14px' : '18px' }}>
        {/* Overall Status Row */}
        <Box sx={{ mb: 2.5 }}>
          <Typography
            sx={{
              color: '#64b5f6',
              fontSize: '0.7rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.8px',
              mb: 1,
            }}
          >
            {t('feedback.responseStatus')}
          </Typography>

          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start', flexDirection: isCompact ? 'column' : 'row' }}>
            <FormControl size="small" sx={{ minWidth: isCompact ? '100%' : 130 }}>
              <Select
                value={overallStatus}
                onChange={(e: SelectChangeEvent<FeedbackStatus>) => {
                  setOverallStatus(e.target.value as FeedbackStatus);
                }}
                sx={{
                  backgroundColor: getStatusBgColor(overallStatus),
                  color: getStatusColor(overallStatus),
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  height: '40px',
                  borderRadius: '8px',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: getStatusBorderColor(overallStatus),
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: getStatusColor(overallStatus),
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: getStatusColor(overallStatus),
                    borderWidth: '2px',
                  },
                  '& .MuiSelect-icon': {
                    color: getStatusColor(overallStatus),
                  },
                }}
                MenuProps={{
                  PaperProps: {
                    sx: {
                      backgroundColor: 'rgba(20, 30, 45, 0.98)',
                      backdropFilter: 'blur(12px)',
                      border: '1px solid rgba(66, 165, 245, 0.2)',
                      borderRadius: '10px',
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
                      '& .MuiMenuItem-root': {
                        color: '#ffffff',
                        fontSize: '0.85rem',
                        padding: '12px 16px',
                        '&:hover': { backgroundColor: 'rgba(66, 165, 245, 0.15)' },
                        '&.Mui-selected': { 
                          backgroundColor: 'rgba(66, 165, 245, 0.25)',
                          '&:hover': { backgroundColor: 'rgba(66, 165, 245, 0.3)' },
                        },
                      },
                    },
                  },
                }}
              >
                <MenuItem value="OK">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckCircle sx={{ color: '#81c784', fontSize: '1.1rem' }} />
                    <span style={{ fontWeight: 600 }}>OK</span>
                  </Box>
                </MenuItem>
                <MenuItem value="ERROR">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Error sx={{ color: '#ef5350', fontSize: '1.1rem' }} />
                    <span style={{ fontWeight: 600 }}>ERROR</span>
                  </Box>
                </MenuItem>
                <MenuItem value="PENDING">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <HourglassEmpty sx={{ color: '#ffa726', fontSize: '1.1rem' }} />
                    <span style={{ fontWeight: 600 }}>PENDING</span>
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              size="small"
              placeholder={t('feedback.addMessagePlaceholder')}
              value={overallMessage}
              onChange={(e) => {
                setOverallMessage(e.target.value);
                setOverallMessageModified(true);
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'rgba(255, 255, 255, 0.04)',
                  color: '#ffffff',
                  fontSize: '0.85rem',
                  height: '40px',
                  borderRadius: '8px',
                  '& fieldset': { borderColor: 'rgba(66, 165, 245, 0.2)' },
                  '&:hover fieldset': { borderColor: 'rgba(66, 165, 245, 0.4)' },
                  '&.Mui-focused fieldset': { borderColor: '#42a5f5', borderWidth: '2px' },
                },
                '& .MuiInputBase-input': { padding: '10px 14px' },
                '& .MuiInputBase-input::placeholder': { color: 'rgba(255, 255, 255, 0.4)', opacity: 1 },
              }}
            />
          </Box>
        </Box>

        {/* Summary Chips */}
        <Box sx={{ display: 'flex', gap: 1, mb: 2.5, flexWrap: 'wrap' }}>
          <Chip
            icon={<CheckCircle sx={{ fontSize: '0.9rem !important' }} />}
            label={`${okCount} OK`}
            size="small"
            sx={{
              backgroundColor: 'rgba(129, 199, 132, 0.15)',
              color: '#81c784',
              fontSize: '0.75rem',
              fontWeight: 600,
              height: '26px',
              borderRadius: '13px',
              '& .MuiChip-icon': { color: '#81c784' },
            }}
          />
          {errorCount > 0 && (
            <Chip
              icon={<Error sx={{ fontSize: '0.9rem !important' }} />}
              label={`${errorCount} Error`}
              size="small"
              sx={{
                backgroundColor: 'rgba(239, 83, 80, 0.15)',
                color: '#ef5350',
                fontSize: '0.75rem',
                fontWeight: 600,
                height: '26px',
                borderRadius: '13px',
                '& .MuiChip-icon': { color: '#ef5350' },
              }}
            />
          )}
          {pendingCount > 0 && (
            <Chip
              icon={<HourglassEmpty sx={{ fontSize: '0.9rem !important' }} />}
              label={`${pendingCount} Pending`}
              size="small"
              sx={{
                backgroundColor: 'rgba(255, 167, 38, 0.15)',
                color: '#ffa726',
                fontSize: '0.75rem',
                fontWeight: 600,
                height: '26px',
                borderRadius: '13px',
                '& .MuiChip-icon': { color: '#ffa726' },
              }}
            />
          )}
        </Box>

        {/* Per-Item Feedback */}
        <Box sx={{ mb: 2.5 }}>
          <Typography
            sx={{
              color: '#64b5f6',
              fontSize: '0.7rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.8px',
              mb: 1,
            }}
          >
            {t('feedback.itemDetails')} ({itemFeedbacks.length})
          </Typography>

          <Box>
            {itemFeedbacks.map((feedback) => {
              const item = getItemInfo(feedback.catenaXId);
              const isExpanded = expandedItems.has(feedback.catenaXId);

              return (
                <Box
                  key={feedback.catenaXId}
                  sx={{
                    backgroundColor: 'rgba(66, 165, 245, 0.06)',
                    borderRadius: '8px',
                    mb: 1,
                    border: '1px solid rgba(66, 165, 245, 0.12)',
                    overflow: 'hidden',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      backgroundColor: 'rgba(66, 165, 245, 0.1)',
                      borderColor: 'rgba(66, 165, 245, 0.2)',
                    },
                  }}
                >
                  {/* Item Header */}
                  <Box
                    onClick={() => toggleItemExpanded(feedback.catenaXId)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '10px 12px',
                      cursor: 'pointer',
                    }}
                  >
                    <DeviceHub sx={{ color: '#64b5f6', fontSize: '1rem', mr: 1 }} />
                    <Typography
                      sx={{
                        color: '#ffffff',
                        fontSize: '0.8rem',
                        fontWeight: 500,
                        flex: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {item?.manufacturerPartId || t('itemTypes.unknownItem')}
                    </Typography>
                    <Chip
                      icon={getStatusIcon(feedback.status as FeedbackStatus, '0.75rem')}
                      label={feedback.status}
                      size="small"
                      sx={{
                        backgroundColor: getStatusBgColor(feedback.status as FeedbackStatus),
                        color: getStatusColor(feedback.status as FeedbackStatus),
                        fontSize: '0.65rem',
                        fontWeight: 600,
                        height: '22px',
                        mr: 1,
                        '& .MuiChip-icon': {
                          color: getStatusColor(feedback.status as FeedbackStatus),
                        },
                      }}
                    />
                    {isExpanded ? (
                      <ExpandLess sx={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '1.1rem' }} />
                    ) : (
                      <ExpandMore sx={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '1.1rem' }} />
                    )}
                  </Box>

                  {/* Expanded Edit */}
                  <Collapse
                    in={isExpanded}
                    onEntered={(node) => {
                      setTimeout(() => {
                        (node as HTMLElement).scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
                      }, 100);
                    }}
                  >
                    <Box
                      sx={{
                        padding: '12px 14px',
                        borderTop: '1px solid rgba(66, 165, 245, 0.1)',
                        backgroundColor: 'rgba(0, 0, 0, 0.15)',
                      }}
                    >
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        {/* Status selector row */}
                        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                          <Typography sx={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.75rem', fontWeight: 500, minWidth: '50px' }}>
                            {t('feedback.status')}
                          </Typography>
                          <FormControl size="small" sx={{ flex: 1, maxWidth: 160 }}>
                            <Select
                              value={feedback.status}
                              onChange={(e: SelectChangeEvent<FeedbackStatus>) => {
                                updateItemStatus(feedback.catenaXId, e.target.value as FeedbackStatus);
                              }}
                              sx={{
                                backgroundColor: getStatusBgColor(feedback.status as FeedbackStatus),
                                color: getStatusColor(feedback.status as FeedbackStatus),
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                height: '34px',
                                borderRadius: '8px',
                                '& .MuiOutlinedInput-notchedOutline': { 
                                  borderColor: getStatusBorderColor(feedback.status as FeedbackStatus),
                                },
                                '&:hover .MuiOutlinedInput-notchedOutline': { 
                                  borderColor: getStatusColor(feedback.status as FeedbackStatus),
                                },
                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { 
                                  borderColor: getStatusColor(feedback.status as FeedbackStatus),
                                  borderWidth: '2px',
                                },
                                '& .MuiSelect-icon': { 
                                  color: getStatusColor(feedback.status as FeedbackStatus),
                                },
                              }}
                              MenuProps={{
                                PaperProps: {
                                  sx: {
                                    backgroundColor: 'rgba(20, 30, 45, 0.98)',
                                    backdropFilter: 'blur(12px)',
                                    border: '1px solid rgba(66, 165, 245, 0.2)',
                                    borderRadius: '10px',
                                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
                                    '& .MuiMenuItem-root': { 
                                      color: '#ffffff', 
                                      fontSize: '0.8rem',
                                      padding: '10px 14px',
                                      '&:hover': { backgroundColor: 'rgba(66, 165, 245, 0.15)' },
                                      '&.Mui-selected': { 
                                        backgroundColor: 'rgba(66, 165, 245, 0.25)',
                                        '&:hover': { backgroundColor: 'rgba(66, 165, 245, 0.3)' },
                                      },
                                    },
                                  },
                                },
                              }}
                            >
                              <MenuItem value="OK">
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <CheckCircle sx={{ color: '#81c784', fontSize: '1rem' }} />
                                  <span style={{ fontWeight: 600 }}>{t('feedback.ok')}</span>
                                </Box>
                              </MenuItem>
                              <MenuItem value="ERROR">
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Error sx={{ color: '#ef5350', fontSize: '1rem' }} />
                                  <span style={{ fontWeight: 600 }}>{t('feedback.error')}</span>
                                </Box>
                              </MenuItem>
                              <MenuItem value="PENDING">
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <HourglassEmpty sx={{ color: '#ffa726', fontSize: '1rem' }} />
                                  <span style={{ fontWeight: 600 }}>{t('feedback.pending')}</span>
                                </Box>
                              </MenuItem>
                            </Select>
                          </FormControl>
                        </Box>

                        {/* Message input */}
                        <Box>
                          <Typography sx={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.75rem', fontWeight: 500, mb: 0.75 }}>
                            {t('feedback.message')}
                          </Typography>
                          <TextField
                            fullWidth
                            size="small"
                            multiline
                            rows={2}
                            placeholder="Enter status message..."
                            value={feedback.statusMessage || ''}
                            onChange={(e) => updateItemMessage(feedback.catenaXId, e.target.value)}
                            sx={{
                              '& .MuiOutlinedInput-root': {
                                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                                color: '#ffffff',
                                fontSize: '0.8rem',
                                borderRadius: '8px',
                                '& fieldset': { borderColor: 'rgba(66, 165, 245, 0.15)' },
                                '&:hover fieldset': { borderColor: 'rgba(66, 165, 245, 0.3)' },
                                '&.Mui-focused fieldset': { borderColor: '#42a5f5', borderWidth: '2px' },
                              },
                              '& .MuiInputBase-input::placeholder': { 
                                color: 'rgba(255, 255, 255, 0.35)', 
                                opacity: 1,
                              },
                            }}
                          />
                        </Box>
                      </Box>
                    </Box>
                  </Collapse>
                </Box>
              );
            })}
          </Box>
        </Box>

        {/* Actions - Compact buttons aligned right */}
        <Box 
          sx={{ 
            display: 'flex', 
            gap: 1.5, 
            justifyContent: 'flex-end',
            pt: 1,
            borderTop: '1px solid rgba(66, 165, 245, 0.1)',
          }}
        >
          <Button
            size="small"
            onClick={onCancel}
            sx={{
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: '0.8rem',
              padding: '8px 20px',
              textTransform: 'none',
              fontWeight: 500,
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                borderColor: 'rgba(255, 255, 255, 0.25)',
                color: '#ffffff',
              },
            }}
          >
            Cancel
          </Button>
          <Button
            size="small"
            variant="contained"
            onClick={handleSend}
            disabled={sending}
            startIcon={sending ? <CircularProgress size={14} color="inherit" /> : <Send sx={{ fontSize: '0.95rem' }} />}
            sx={{
              backgroundColor: '#42a5f5',
              color: '#ffffff',
              fontSize: '0.8rem',
              padding: '8px 24px',
              textTransform: 'none',
              fontWeight: 600,
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(66, 165, 245, 0.3)',
              '&:hover': {
                backgroundColor: '#1e88e5',
                boxShadow: '0 6px 16px rgba(66, 165, 245, 0.4)',
              },
              '&.Mui-disabled': {
                backgroundColor: 'rgba(66, 165, 245, 0.3)',
                color: 'rgba(255, 255, 255, 0.5)',
              },
            }}
          >
            {sending ? t('feedback.sending') : t('feedback.title')}
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default FeedbackForm;
