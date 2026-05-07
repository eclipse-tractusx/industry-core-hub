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

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  Card,
  IconButton,
  alpha,
  CircularProgress,
  Tooltip,
  ToggleButton,
  ToggleButtonGroup,
  TextField,
  InputAdornment,
  Alert
} from '@mui/material';
import {
  Inbox as InboxIcon,
  Refresh,
  ViewList,
  ViewModule,
  Search
} from '@mui/icons-material';
import {
  getProviderRequests,
  acceptRequest,
  refreshPcfForRequest,
  countRequestsByStatus,
  PcfExchangeModel,
  mapStatusToUi
} from '../../services/pcfApi';
import {
  NotificationFilters,
  NotificationCard,
  RejectDialog
} from '../../pcf-exchange/components';
import { PcfNotification, PcfNotificationStatus } from '../api/pcfExchangeApi';

// PCF Green Theme
const PCF_PRIMARY = '#10b981';
const PCF_SECONDARY = '#059669';

type ViewMode = 'card' | 'list';

/**
 * Convert API model to UI notification format (compatible with PcfNotification)
 */
function toUiNotification(model: PcfExchangeModel): PcfNotification {
  return {
    id: model.requestId,
    partCatenaXId: '', // Will be resolved if needed
    manufacturerPartId: model.manufacturerPartId || model.customerPartId || 'Unknown',
    partInstanceId: 'CATALOG',
    partName: model.manufacturerPartId,
    requesterId: model.requestingBpn,
    requesterName: model.requestingBpn, // Could be resolved to company name
    requestDate: new Date().toISOString(), // API should provide this
    status: mapStatusToUi(model.status) as PcfNotificationStatus,
    message: model.message,
    pcfLocation: model.pcfLocation ?? null
  };
}

const PcfIncomingRequestsPage: React.FC = () => {
  const { t } = useTranslation('pcf');
  // Data state
  const [notifications, setNotifications] = useState<PcfNotification[]>([]);
  const [notificationCounts, setNotificationCounts] = useState<Record<PcfNotificationStatus, number>>({
    PENDING: 0,
    ACCEPTED: 0,
    REJECTED: 0,
    DELIVERED: 0,
    FAILED: 0
  });
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<PcfNotificationStatus | 'ALL'>('ALL');
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog state
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingNotificationId, setRejectingNotificationId] = useState<string | null>(null);
  const [processingNotificationId, setProcessingNotificationId] = useState<string | null>(null);

  // Convert API status to UI counts format
  const mapApiCountsToUi = useCallback((apiCounts: Record<string, number>): Record<PcfNotificationStatus, number> => {
    return {
      PENDING: apiCounts.pending || 0,
      ACCEPTED: apiCounts.accepted || 0,
      REJECTED: apiCounts.rejected || 0,
      DELIVERED: apiCounts.delivered || 0,
      FAILED: apiCounts.failed || 0
    };
  }, []);

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const requests = await getProviderRequests();
      const uiNotifications = requests.map(toUiNotification);
      const counts = countRequestsByStatus(requests);
      
      setNotifications(uiNotifications);
      setNotificationCounts(mapApiCountsToUi(counts));
    } catch (err) {
      console.error('Failed to load notifications:', err);
      setError(err instanceof Error ? err.message : t('error.failedToLoadRequests'));
    } finally {
      setIsLoading(false);
    }
  };

  // Handle refresh data
  const handleRefresh = async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      const requests = await getProviderRequests();
      const uiNotifications = requests.map(toUiNotification);
      const counts = countRequestsByStatus(requests);
      
      setNotifications(uiNotifications);
      setNotificationCounts(mapApiCountsToUi(counts));
    } catch (err) {
      console.error('Failed to refresh data:', err);
      setError(err instanceof Error ? err.message : t('error.failedToRefreshRequests'));
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle accept notification
  const handleAcceptNotification = async (notificationId: string) => {
    setProcessingNotificationId(notificationId);
    setError(null);
    try {
      await acceptRequest(notificationId);
      await handleRefresh();
    } catch (err) {
      console.error('Failed to accept notification:', err);
      setError(err instanceof Error ? err.message : t('error.failedToAcceptRequest'));
    } finally {
      setProcessingNotificationId(null);
    }
  };

  // Handle reject notification
  const handleOpenRejectDialog = (notificationId: string) => {
    setRejectingNotificationId(notificationId);
    setRejectDialogOpen(true);
  };

  const handleConfirmReject = async (reason: string) => {
    if (!rejectingNotificationId) return;

    setProcessingNotificationId(rejectingNotificationId);
    try {
      // TODO: Implement reject endpoint when available in backend
      // For now, just log and close the dialog
      console.log('Rejecting notification:', rejectingNotificationId, 'Reason:', reason);
      setError(t('error.rejectNotImplemented'));
      await handleRefresh();
    } finally {
      setProcessingNotificationId(null);
      setRejectDialogOpen(false);
      setRejectingNotificationId(null);
    }
  };

  // Refresh PCF location for a single pending request.
  // Calls the backend refresh-pcf endpoint, then reloads the list so the
  // updated pcfLocation (if now present) is reflected in the card.
  const handleRefreshPcf = async (notificationId: string) => {
    try {
      await refreshPcfForRequest(notificationId);
      await handleRefresh();
    } catch (err) {
      console.error('Failed to refresh PCF for request:', notificationId, err);
    }
  };

  // Filter notifications by status and search
  const filteredNotifications = notifications.filter(n => {
    // Status filter
    if (selectedStatus !== 'ALL' && n.status !== selectedStatus) {
      return false;
    }
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        n.manufacturerPartId.toLowerCase().includes(query) ||
        (n.partName?.toLowerCase().includes(query) ?? false) ||
        n.requesterName.toLowerCase().includes(query) ||
        n.requesterId.toLowerCase().includes(query)
      );
    }
    return true;
  });

  // Get rejecting notification for dialog
  const rejectingNotification = notifications.find(n => n.id === rejectingNotificationId);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress sx={{ color: PCF_PRIMARY }} />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header - Passport Provisioning style */}
      <Box sx={{ p: { xs: 2, sm: 3, md: 4 }, pb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          {/* Icon */}
          <Box
            sx={{
              width: { xs: 48, sm: 56 },
              height: { xs: 48, sm: 56 },
              borderRadius: '12px',
              background: `linear-gradient(135deg, ${PCF_PRIMARY} 0%, ${PCF_SECONDARY} 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 4px 16px ${alpha(PCF_PRIMARY, 0.3)}`
            }}
          >
            <InboxIcon sx={{ fontSize: { xs: 28, sm: 32 }, color: '#fff' }} />
          </Box>
          {/* Title & Subtitle */}
          <Box sx={{ flex: 1 }}>
            <Typography
              variant="h4"
              sx={{
                color: '#fff',
                fontWeight: 700,
                fontSize: { xs: '1.5rem', sm: '2rem', md: '2.25rem' }
              }}
            >
              {t('requests.title')}
            </Typography>
            <Typography
              variant="body1"
              sx={{
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: { xs: '0.875rem', sm: '1rem' }
              }}
            >
              {t('requests.subtitle')}
            </Typography>
          </Box>
          {/* Refresh button */}
          <Tooltip title={t('common.refresh')}>
            <IconButton
              onClick={handleRefresh}
              disabled={isRefreshing}
              sx={{ 
                color: 'rgba(255,255,255,0.7)', 
                border: '1px solid rgba(255,255,255,0.1)',
                '&:hover': { color: PCF_PRIMARY, borderColor: alpha(PCF_PRIMARY, 0.3), background: alpha(PCF_PRIMARY, 0.1) }
              }}
            >
              {isRefreshing ? <CircularProgress size={22} sx={{ color: PCF_PRIMARY }} /> : <Refresh />}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Search Bar with Toggle */}
      <Box
        sx={{
          px: { xs: 2, sm: 3, md: 4 },
          pb: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 2
        }}
      >
        <TextField
          placeholder={t('requests.searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size="small"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search sx={{ color: 'rgba(255, 255, 255, 0.4)' }} />
              </InputAdornment>
            )
          }}
          sx={{
            flex: 1,
            maxWidth: 600,
            '& .MuiOutlinedInput-root': {
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '10px',
              height: 40,
              '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.1)' },
              '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
              '&.Mui-focused fieldset': { borderColor: PCF_PRIMARY }
            },
            '& .MuiInputBase-input': { color: '#fff' }
          }}
        />
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(_, val) => val && setViewMode(val)}
          size="small"
          sx={{
            '& .MuiToggleButton-root': {
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.5)',
              px: 1.5,
              height: 40,
              '&:hover': { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.8)' },
              '&.Mui-selected': { background: alpha(PCF_PRIMARY, 0.15), color: PCF_PRIMARY, borderColor: alpha(PCF_PRIMARY, 0.3) },
              '&.Mui-selected:hover': { background: alpha(PCF_PRIMARY, 0.2) }
            }
          }}
        >
          <Tooltip title={t('requests.cardView')}>
            <ToggleButton value="card"><ViewModule sx={{ fontSize: 18 }} /></ToggleButton>
          </Tooltip>
          <Tooltip title={t('requests.listView')}>
            <ToggleButton value="list"><ViewList sx={{ fontSize: 18 }} /></ToggleButton>
          </Tooltip>
        </ToggleButtonGroup>
      </Box>

      {/* Filters Bar */}
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          px: { xs: 2, sm: 3, md: 4 },
          py: 1.5,
          background: 'linear-gradient(180deg, rgba(18, 18, 18, 1) 0%, rgba(18, 18, 18, 0.95) 100%)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)'
        }}
      >
        <NotificationFilters
          selectedStatus={selectedStatus}
          counts={notificationCounts}
          onStatusChange={setSelectedStatus}
        />
      </Box>

      {/* Error Alert */}
      {error && (
        <Box sx={{ px: { xs: 2, sm: 3, md: 4 }, pb: 2 }}>
          <Alert 
            severity="error" 
            onClose={() => setError(null)}
            sx={{ 
              background: 'rgba(211, 47, 47, 0.1)', 
              border: '1px solid rgba(211, 47, 47, 0.3)',
              '& .MuiAlert-icon': { color: '#ef5350' }
            }}
          >
            {error}
          </Alert>
        </Box>
      )}

      {/* Content */}
      <Box sx={{ flex: 1, px: { xs: 2, sm: 3, md: 4 }, py: 2, overflow: 'auto' }}>
        <Box 
          sx={{ 
            display: viewMode === 'card' ? 'grid' : 'flex', 
            gridTemplateColumns: viewMode === 'card' ? 'repeat(auto-fill, minmax(380px, 1fr))' : undefined, 
            flexDirection: viewMode === 'list' ? 'column' : undefined, 
            gap: viewMode === 'list' ? 1 : 2 
          }}
        >
          {filteredNotifications.length === 0 ? (
            <Card sx={{ gridColumn: '1 / -1', textAlign: 'center', py: 6, background: 'rgba(30, 30, 30, 0.5)', border: '1px dashed rgba(255, 255, 255, 0.1)', borderRadius: '16px' }}>
              <InboxIcon sx={{ fontSize: 48, color: 'rgba(255, 255, 255, 0.2)', mb: 2 }} />
              <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                {searchQuery 
                  ? t('requests.noMatchSearch') 
                  : selectedStatus === 'ALL' 
                    ? t('requests.noRequests') 
                    : t('requests.noStatusRequests', { status: selectedStatus.toLowerCase() })
                }
              </Typography>
            </Card>
          ) : (
            filteredNotifications.map(notification => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                onAccept={handleAcceptNotification}
                onReject={handleOpenRejectDialog}
                onRefreshPcf={handleRefreshPcf}
                isProcessing={processingNotificationId === notification.id}
                viewMode={viewMode}
              />
            ))
          )}
        </Box>
      </Box>

      {/* Reject Dialog */}
      <RejectDialog
        open={rejectDialogOpen}
        onClose={() => { setRejectDialogOpen(false); setRejectingNotificationId(null); }}
        onConfirm={handleConfirmReject}
        notificationId={rejectingNotificationId || ''}
        requesterName={rejectingNotification?.requesterName || ''}
        partName={rejectingNotification?.partName || `${rejectingNotification?.manufacturerPartId}` || ''}
      />
    </Box>
  );
};

export default PcfIncomingRequestsPage;
