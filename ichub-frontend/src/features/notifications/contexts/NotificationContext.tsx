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

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
  InboxNotification,
  NotificationPanelSize,
  InboxViewMode,
  NotificationFilters,
  NotificationStats,
  Contact,
  SenderGroup,
  FeedbackPayload,
  DigitalTwinVerificationStatus,
  NotificationSortBy,
  InboxFilterType,
  NotificationVerificationState,
} from '../types';
import { notificationApiService } from '../services/notificationApiService';
import { mapApiResponsesToNotifications } from '../services/notificationMapper';
import { getNotificationsPollInterval, getParticipantId } from '@/services/EnvironmentService';
import { fetchPartners } from '@/features/business-partner-kit/partner-management/api';
import { PartnerInstance } from '@/features/business-partner-kit/partner-management/types/types';

interface NotificationContextType {
  // Panel state
  isPanelOpen: boolean;
  panelSize: NotificationPanelSize;
  togglePanel: () => void;
  openPanel: () => void;
  closePanel: () => void;
  expandPanel: () => void;
  collapsePanel: () => void;
  setPanelSize: (size: NotificationPanelSize) => void;

  // View state
  viewMode: InboxViewMode;
  setViewMode: (mode: InboxViewMode) => void;
  selectedNotification: InboxNotification | null;
  selectNotification: (notification: InboxNotification | null) => void;

  // Sorting
  sortBy: NotificationSortBy;
  setSortBy: (sort: NotificationSortBy) => void;

  // Inbox filter
  inboxFilter: InboxFilterType;
  setInboxFilter: (filter: InboxFilterType) => void;

  // Notifications
  notifications: InboxNotification[];
  filteredNotifications: InboxNotification[];
  senderGroups: SenderGroup[];
  stats: NotificationStats;
  unreadCount: number;

  // Pagination
  currentPage: number;
  setCurrentPage: (page: number) => void;
  pageSize: number;
  totalPages: number;
  paginatedNotifications: InboxNotification[];

  // Selection
  selectedIds: Set<string>;
  toggleSelection: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  isSelectionMode: boolean;
  setSelectionMode: (mode: boolean) => void;

  // Filters
  filters: NotificationFilters;
  setFilters: (filters: NotificationFilters) => void;
  clearFilters: () => void;

  // Actions
  markAsRead: (notificationId: string) => void;
  markAsUnread: (notificationId: string) => void;
  markSelectedAsRead: () => void;
  markSelectedAsUnread: () => void;
  markAllAsRead: () => void;
  archiveNotification: (notificationId: string) => void;
  unarchiveNotification: (notificationId: string) => void;
  archiveSelected: () => void;
  unarchiveSelected: () => void;
  trashNotification: (notificationId: string) => void;
  restoreFromTrash: (notificationId: string) => void;
  trashSelected: () => void;
  restoreSelectedFromTrash: () => void;
  verifyDigitalTwin: (notificationId: string, catenaXId: string) => Promise<void>;
  verifyAllDigitalTwins: (notificationId: string) => Promise<void>;
  sendFeedback: (notificationId: string, feedback: FeedbackPayload) => Promise<void>;

  // Contacts integration
  contacts: Contact[];
  realPartners: PartnerInstance[];
  getContactName: (bpnl: string) => string;
  isKnownContact: (bpnl: string) => boolean;
  refreshPartners: () => Promise<void>;

  // Priority helper
  getPriority: (notification: InboxNotification) => 'urgent' | 'high' | 'normal' | 'low';

  // Stats helper
  getStats: () => NotificationStats;

  // Verification state helper
  getVerificationState: (notification: InboxNotification) => NotificationVerificationState;
}

const defaultFilters: NotificationFilters = {
  search: '',
  status: 'all',
  type: 'all',
  inboxFilter: 'all',
};

const PAGE_SIZE = 20;

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Panel state
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [panelSize, setPanelSize] = useState<NotificationPanelSize>('normal');

  // View state
  const [viewMode, setViewMode] = useState<InboxViewMode>('list');
  const [selectedNotification, setSelectedNotification] = useState<InboxNotification | null>(null);
  const [sortBy, setSortBy] = useState<NotificationSortBy>('receivedAt');
  const [inboxFilter, setInboxFilter] = useState<InboxFilterType>('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setSelectionMode] = useState(false);

  // Data
  const [notifications, setNotifications] = useState<InboxNotification[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [realPartners, setRealPartners] = useState<PartnerInstance[]>([]);
  const [filters, setFilters] = useState<NotificationFilters>(defaultFilters);

  // Load partners from Contact List API
  const refreshPartners = useCallback(async () => {
    try {
      const partners = await fetchPartners();
      setRealPartners(partners);
      // Merge with mock contacts
      const partnerContacts: Contact[] = partners.map((p) => ({
        bpnl: p.bpnl,
        name: p.name,
        isKnown: true,
      }));
      setContacts((prevContacts) => {
        const merged = [...partnerContacts];
        // Add any mock contacts that aren't in real partners
        prevContacts.forEach((c) => {
          if (!merged.find((m) => m.bpnl === c.bpnl)) {
            merged.push(c);
          }
        });
        return merged;
      });
    } catch (error) {
      console.error('Failed to fetch partners:', error);
    }
  }, []);

  // Fetch notifications from the backend API
  const fetchNotificationsFromApi = useCallback(async () => {
    try {
      const bpn = getParticipantId();
      if (!bpn) {
        console.warn('No BPN configured — cannot fetch notifications from API');
        return;
      }
      const responses = await notificationApiService.fetchNotifications(bpn);
      const mapped = mapApiResponsesToNotifications(responses);
      setNotifications(mapped);
    } catch (error) {
      console.error('Failed to fetch notifications from API:', error);
    }
  }, []);

  // Load initial data from backend API
  useEffect(() => {
    refreshPartners();
    fetchNotificationsFromApi();

    // Set up polling at the configured interval
    const pollInterval = getNotificationsPollInterval();
    const intervalId = setInterval(() => {
      fetchNotificationsFromApi();
    }, pollInterval);

    return () => clearInterval(intervalId);
  }, [refreshPartners, fetchNotificationsFromApi]);

  // Panel controls
  const togglePanel = useCallback(() => {
    setIsPanelOpen((prev) => !prev);
    if (isPanelOpen) {
      setSelectedNotification(null);
    }
  }, [isPanelOpen]);

  const openPanel = useCallback(() => {
    setIsPanelOpen(true);
  }, []);

  const closePanel = useCallback(() => {
    setIsPanelOpen(false);
    setSelectedNotification(null);
  }, []);

  const expandPanel = useCallback(() => {
    setPanelSize('expanded');
  }, []);

  const collapsePanel = useCallback(() => {
    setPanelSize('normal');
  }, []);

  // Select notification with browser history support
  const selectNotification = useCallback((notification: InboxNotification | null) => {
    if (notification) {
      // Push state to browser history when selecting a notification
      window.history.pushState({ notificationOpen: true, notificationId: notification.id }, '');
    }
    setSelectedNotification(notification);
    if (notification && notification.status === 'unread') {
      // Mark as read when selected
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notification.id
            ? { ...n, status: 'read', readAt: new Date() }
            : n
        )
      );
      // Persist read status to backend
      notificationApiService
        .updateNotificationStatus(notification.header.messageId, 'read')
        .catch((err) => console.error('Failed to mark notification as read via API:', err));
    }
  }, []);

  // Handle browser back button to return to inbox
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      // If we have a selected notification and user pressed back, close it
      if (selectedNotification && !event.state?.notificationOpen) {
        setSelectedNotification(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [selectedNotification]);

  // Helper to get verification state from notification
  const getVerificationState = useCallback((notification: InboxNotification): NotificationVerificationState => {
    if (notification.verificationState) return notification.verificationState;
    // Derive from status for backwards compatibility
    if (notification.status === 'feedback-sent') return 'feedback-sent';
    const allVerified = notification.verifiedItems.every(
      (vi) => vi.verificationStatus === 'accessible' || vi.verificationStatus === 'not-accessible'
    );
    return allVerified ? 'verified' : 'not-verified';
  }, []);

  // Filter notifications based on inbox filter and other criteria
  const filteredNotifications = React.useMemo(() => {
    return notifications.filter((notification) => {
      // Inbox filter (archived, trash vs non-archived and verification state)
      const isArchived = notification.isArchived ?? false;
      const isTrashed = notification.isTrashed ?? false;
      const verificationState = getVerificationState(notification);
      
      switch (inboxFilter) {
        case 'trash':
          if (!isTrashed) return false;
          break;
        case 'archived':
          if (!isArchived || isTrashed) return false;
          break;
        case 'all':
        case 'unread':
        case 'not-verified':
        case 'verified':
        case 'feedback-sent':
          // Archived and trashed messages should not appear in regular lists
          if (isArchived || isTrashed) return false;
          break;
      }

      // Apply specific inbox filter
      if (inboxFilter === 'unread' && notification.status !== 'unread') {
        return false;
      }
      if (inboxFilter === 'not-verified' && verificationState !== 'not-verified') {
        return false;
      }
      if (inboxFilter === 'verified' && verificationState !== 'verified') {
        return false;
      }
      if (inboxFilter === 'feedback-sent' && verificationState !== 'feedback-sent') {
        return false;
      }

      // Search filter - searches contacts, titles, content, BPNs, and part IDs
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        
        // Get contact name for the sender
        const senderBpn = notification.header.senderBpn;
        const realPartner = realPartners.find((p) => p.bpnl === senderBpn);
        const contactName = realPartner?.name || contacts.find((c) => c.bpnl === senderBpn)?.name || '';
        
        const matchesSearch =
          // Search by BPN
          notification.header.senderBpn.toLowerCase().includes(searchLower) ||
          // Search by contact name
          contactName.toLowerCase().includes(searchLower) ||
          // Search by message content/information
          notification.content.information?.toLowerCase().includes(searchLower) ||
          // Search by digital twin type
          notification.content.digitalTwinType?.toLowerCase().includes(searchLower) ||
          // Search by items (catenaXId, manufacturerPartId, customerPartId)
          notification.content.listOfItems.some(
            (item) =>
              item.catenaXId.toLowerCase().includes(searchLower) ||
              item.manufacturerPartId.toLowerCase().includes(searchLower) ||
              item.customerPartId?.toLowerCase().includes(searchLower) ||
              item.manufacturerId?.toLowerCase().includes(searchLower)
          );
        if (!matchesSearch) return false;
      }

      // Status filter (legacy)
      if (filters.status !== 'all' && notification.status !== filters.status) {
        return false;
      }

      // Type filter
      if (filters.type !== 'all' && notification.type !== filters.type) {
        return false;
      }

      // Sender filter
      if (filters.senderBpn && notification.header.senderBpn !== filters.senderBpn) {
        return false;
      }

      return true;
    });
  }, [notifications, filters, inboxFilter, getVerificationState, realPartners, contacts]);

  // Calculate priority based on expectedResponseBy
  const getPriority = useCallback(
    (notification: InboxNotification): 'urgent' | 'high' | 'normal' | 'low' => {
      if (!notification.header.expectedResponseBy) return 'normal';

      const now = new Date();
      const responseBy = new Date(notification.header.expectedResponseBy);
      const hoursRemaining = (responseBy.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (hoursRemaining < 0) return 'urgent'; // Overdue
      if (hoursRemaining < 24) return 'urgent'; // Less than 24 hours
      if (hoursRemaining < 72) return 'high'; // Less than 3 days
      if (hoursRemaining < 168) return 'normal'; // Less than 7 days
      return 'low'; // More than 7 days
    },
    []
  );

  // Sort notifications
  const sortedFilteredNotifications = React.useMemo(() => {
    const sorted = [...filteredNotifications];

    switch (sortBy) {
      case 'expectedResponseBy':
        sorted.sort((a, b) => {
          const aDate = a.header.expectedResponseBy
            ? new Date(a.header.expectedResponseBy).getTime()
            : Infinity;
          const bDate = b.header.expectedResponseBy
            ? new Date(b.header.expectedResponseBy).getTime()
            : Infinity;
          return aDate - bDate; // Soonest first
        });
        break;
      case 'priority':
        const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
        sorted.sort((a, b) => {
          return priorityOrder[getPriority(a)] - priorityOrder[getPriority(b)];
        });
        break;
      case 'receivedAt':
      default:
        sorted.sort((a, b) => b.receivedAt.getTime() - a.receivedAt.getTime());
        break;
    }

    return sorted;
  }, [filteredNotifications, sortBy, getPriority]);

  // Group notifications by sender
  const senderGroups = React.useMemo((): SenderGroup[] => {
    const groups = new Map<string, SenderGroup>();

    sortedFilteredNotifications.forEach((notification) => {
      const senderBpn = notification.header.senderBpn;
      const existingGroup = groups.get(senderBpn);

      if (existingGroup) {
        existingGroup.notifications.push(notification);
        if (notification.status === 'unread') {
          existingGroup.unreadCount++;
        }
        if (notification.receivedAt > existingGroup.lastActivity) {
          existingGroup.lastActivity = notification.receivedAt;
        }
      } else {
        // Check real partners first, then mock contacts
        const realPartner = realPartners.find((p) => p.bpnl === senderBpn);
        const mockContact = contacts.find((c) => c.bpnl === senderBpn);
        const contact: Contact = realPartner
          ? { bpnl: realPartner.bpnl, name: realPartner.name, isKnown: true }
          : mockContact || { bpnl: senderBpn, name: senderBpn, isKnown: false };

        groups.set(senderBpn, {
          sender: contact,
          notifications: [notification],
          unreadCount: notification.status === 'unread' ? 1 : 0,
          lastActivity: notification.receivedAt,
        });
      }
    });

    return Array.from(groups.values()).sort(
      (a, b) => b.lastActivity.getTime() - a.lastActivity.getTime()
    );
  }, [sortedFilteredNotifications, contacts, realPartners]);

  // Pagination
  const totalPages = React.useMemo(() => {
    return Math.ceil(sortedFilteredNotifications.length / PAGE_SIZE);
  }, [sortedFilteredNotifications.length]);

  const paginatedNotifications = React.useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return sortedFilteredNotifications.slice(startIndex, startIndex + PAGE_SIZE);
  }, [sortedFilteredNotifications, currentPage]);

  // Reset page when filter changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [inboxFilter, filters]);

  // Statistics
  const stats = React.useMemo((): NotificationStats => {
    const nonArchivedNonTrashed = notifications.filter((n) => !n.isArchived && !n.isTrashed);
    return {
      total: nonArchivedNonTrashed.length,
      unread: nonArchivedNonTrashed.filter((n) => n.status === 'unread').length,
      notVerified: nonArchivedNonTrashed.filter((n) => getVerificationState(n) === 'not-verified').length,
      verified: nonArchivedNonTrashed.filter((n) => getVerificationState(n) === 'verified').length,
      feedbackSent: nonArchivedNonTrashed.filter((n) => getVerificationState(n) === 'feedback-sent').length,
      archived: notifications.filter((n) => n.isArchived && !n.isTrashed).length,
      trash: notifications.filter((n) => n.isTrashed).length,
    };
  }, [notifications, getVerificationState]);

  // Unread count for header
  const unreadCount = React.useMemo(() => {
    return notifications.filter((n) => n.status === 'unread' && !n.isArchived).length;
  }, [notifications]);

  // Mark as read
  const markAsRead = useCallback((notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) => {
        if (n.id === notificationId && n.status === 'unread') {
          // Persist to backend
          notificationApiService
            .updateNotificationStatus(n.header.messageId, 'read')
            .catch((err) => console.error('Failed to mark notification as read via API:', err));
          return { ...n, status: 'read', readAt: new Date() };
        }
        return n;
      })
    );
  }, []);

  // Mark as unread
  const markAsUnread = useCallback((notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === notificationId
          ? { ...n, status: 'unread', readAt: undefined }
          : n
      )
    );
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(() => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.status === 'unread' && !n.isArchived ? { ...n, status: 'read', readAt: new Date() } : n
      )
    );
  }, []);

  // Selection functions
  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      // Selection mode persists even with no items selected
      // User must explicitly cancel via the Cancel button
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    const allIds = new Set(paginatedNotifications.map((n) => n.id));
    setSelectedIds(allIds);
  }, [paginatedNotifications]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setSelectionMode(false);
  }, []);

  // Mark selected as read/unread
  const markSelectedAsRead = useCallback(() => {
    setNotifications((prev) =>
      prev.map((n) =>
        selectedIds.has(n.id) && n.status === 'unread'
          ? { ...n, status: 'read', readAt: new Date() }
          : n
      )
    );
    clearSelection();
  }, [selectedIds, clearSelection]);

  const markSelectedAsUnread = useCallback(() => {
    setNotifications((prev) =>
      prev.map((n) =>
        selectedIds.has(n.id)
          ? { ...n, status: 'unread', readAt: undefined }
          : n
      )
    );
    clearSelection();
  }, [selectedIds, clearSelection]);

  // Archive functions
  const archiveNotification = useCallback((notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === notificationId
          ? { ...n, isArchived: true }
          : n
      )
    );
  }, []);

  const unarchiveNotification = useCallback((notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === notificationId
          ? { ...n, isArchived: false }
          : n
      )
    );
  }, []);

  const archiveSelected = useCallback(() => {
    setNotifications((prev) =>
      prev.map((n) =>
        selectedIds.has(n.id)
          ? { ...n, isArchived: true }
          : n
      )
    );
    clearSelection();
  }, [selectedIds, clearSelection]);

  const unarchiveSelected = useCallback(() => {
    setNotifications((prev) =>
      prev.map((n) =>
        selectedIds.has(n.id)
          ? { ...n, isArchived: false }
          : n
      )
    );
    clearSelection();
  }, [selectedIds, clearSelection]);

  // Trash functions
  const trashNotification = useCallback((notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === notificationId
          ? { ...n, isTrashed: true }
          : n
      )
    );
  }, []);

  const restoreFromTrash = useCallback((notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === notificationId
          ? { ...n, isTrashed: false }
          : n
      )
    );
  }, []);

  const trashSelected = useCallback(() => {
    setNotifications((prev) =>
      prev.map((n) =>
        selectedIds.has(n.id)
          ? { ...n, isTrashed: true }
          : n
      )
    );
    clearSelection();
  }, [selectedIds, clearSelection]);

  const restoreSelectedFromTrash = useCallback(() => {
    setNotifications((prev) =>
      prev.map((n) =>
        selectedIds.has(n.id)
          ? { ...n, isTrashed: false }
          : n
      )
    );
    clearSelection();
  }, [selectedIds, clearSelection]);

  // Verify a single digital twin
  const verifyDigitalTwin = useCallback(
    async (notificationId: string, catenaXId: string) => {
      // Set verifying status
      setNotifications((prev) =>
        prev.map((n) => {
          if (n.id !== notificationId) return n;
          return {
            ...n,
            verifiedItems: n.verifiedItems.map((vi) =>
              vi.item.catenaXId === catenaXId
                ? { ...vi, verificationStatus: 'verifying' as DigitalTwinVerificationStatus }
                : vi
            ),
          };
        })
      );

      // Simulate verification (would call real API)
      await new Promise((resolve) => setTimeout(resolve, 1500));
      // Mock always succeeds - simulates successful Digital Twin access verification
      const isAccessible = true;

      setNotifications((prev) =>
        prev.map((n) => {
          if (n.id !== notificationId) return n;
          const updatedItems = n.verifiedItems.map((vi) =>
            vi.item.catenaXId === catenaXId
              ? {
                  ...vi,
                  verificationStatus: isAccessible
                    ? ('accessible' as DigitalTwinVerificationStatus)
                    : ('not-accessible' as DigitalTwinVerificationStatus),
                  verifiedAt: new Date(),
                  verificationError: isAccessible ? undefined : 'Could not access digital twin',
                }
              : vi
          );
          // Update verification state if all items are verified
          const allVerified = updatedItems.every(
            (vi) => vi.verificationStatus === 'accessible' || vi.verificationStatus === 'not-accessible'
          );
          return {
            ...n,
            verifiedItems: updatedItems,
            verificationState: allVerified ? 'verified' : n.verificationState,
          };
        })
      );
    },
    []
  );

  // Verify all digital twins
  const verifyAllDigitalTwins = useCallback(
    async (notificationId: string) => {
      const notification = notifications.find((n) => n.id === notificationId);
      if (!notification) return;

      for (const verifiedItem of notification.verifiedItems) {
        if (verifiedItem.verificationStatus === 'not-verified') {
          await verifyDigitalTwin(notificationId, verifiedItem.item.catenaXId);
        }
      }
    },
    [notifications, verifyDigitalTwin]
  );

  // Send feedback
  const sendFeedback = useCallback(
    async (notificationId: string, feedback: FeedbackPayload) => {
      // Find the notification to get its messageId, then update status
      const notification = notifications.find((n) => n.id === notificationId);
      if (notification) {
        try {
          await notificationApiService.updateNotificationStatus(
            notification.header.messageId,
            'sent',
          );
        } catch (error) {
          console.error('Failed to send feedback status via API:', error);
          throw error; // Propagate so UI can handle the error
        }
      }

      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId
            ? {
                ...n,
                status: 'feedback-sent',
                verificationState: 'feedback-sent' as NotificationVerificationState,
                feedbackSentAt: new Date(),
                feedbackResponse: feedback,
              }
            : n
        )
      );

      // Update selected notification if it's the one we just updated
      if (selectedNotification?.id === notificationId) {
        setSelectedNotification((prev) =>
          prev
            ? {
                ...prev,
                status: 'feedback-sent',
                feedbackSentAt: new Date(),
                feedbackResponse: feedback,
              }
            : null
        );
      }
    },
    [selectedNotification]
  );

  // Clear filters
  const clearFilters = useCallback(() => {
    setFilters(defaultFilters);
  }, []);

  // Get contact name (checks real partners first)
  const getContactName = useCallback(
    (bpnl: string): string => {
      const realPartner = realPartners.find((p) => p.bpnl === bpnl);
      if (realPartner) return realPartner.name;
      const contact = contacts.find((c) => c.bpnl === bpnl);
      return contact?.name || bpnl;
    },
    [contacts, realPartners]
  );

  // Check if BPN is in Contact List
  const isKnownContact = useCallback(
    (bpnl: string): boolean => {
      return realPartners.some((p) => p.bpnl === bpnl) || contacts.some((c) => c.bpnl === bpnl && c.isKnown);
    },
    [realPartners, contacts]
  );

  // Get stats helper
  const getStats = useCallback((): NotificationStats => stats, [stats]);

  const value: NotificationContextType = {
    isPanelOpen,
    panelSize,
    togglePanel,
    openPanel,
    closePanel,
    expandPanel,
    collapsePanel,
    setPanelSize,
    viewMode,
    setViewMode,
    selectedNotification,
    selectNotification,
    sortBy,
    setSortBy,
    inboxFilter,
    setInboxFilter,
    notifications,
    filteredNotifications: sortedFilteredNotifications,
    senderGroups,
    stats,
    unreadCount,
    currentPage,
    setCurrentPage,
    pageSize: PAGE_SIZE,
    totalPages,
    paginatedNotifications,
    selectedIds,
    toggleSelection,
    selectAll,
    clearSelection,
    isSelectionMode,
    setSelectionMode,
    filters,
    setFilters,
    clearFilters,
    markAsRead,
    markAsUnread,
    markSelectedAsRead,
    markSelectedAsUnread,
    markAllAsRead,
    archiveNotification,
    unarchiveNotification,
    archiveSelected,
    unarchiveSelected,
    trashNotification,
    restoreFromTrash,
    trashSelected,
    restoreSelectedFromTrash,
    verifyDigitalTwin,
    verifyAllDigitalTwins,
    sendFeedback,
    contacts,
    realPartners,
    getContactName,
    isKnownContact,
    refreshPartners,
    getPriority,
    getStats,
    getVerificationState,
  };

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
