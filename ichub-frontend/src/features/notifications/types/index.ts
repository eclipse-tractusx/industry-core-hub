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

// ============================================================================
// SWAGGER-based Types for Digital Twin Event Notification API
// Based on: Catena-X Digital Twin Event Notification API Specification v3.0.0
// ============================================================================

/**
 * Notification Header following the shared message header standard
 * urn:samm:io.catenax.shared.message_header:3.0.0
 */
export interface NotificationHeader {
  messageId: string;
  context: string;
  sentDateTime: string;
  senderBpn: string;
  receiverBpn: string;
  expectedResponseBy?: string;
  relatedMessageId?: string;
  version: string;
}

/**
 * Digital Twin Type classification
 */
export type DigitalTwinType = 'PartType' | 'PartInstance';

/**
 * Base Part Item structure
 */
export interface PartItem {
  manufacturerId: string;
  manufacturerPartId: string;
  customerPartId?: string;
}

/**
 * Serialized Part Item (extends PartItem)
 */
export interface SerializedPartItem extends PartItem {
  partInstanceId: string;
  catenaXId: string;
}

/**
 * Batch Item (extends PartItem)
 */
export interface BatchItem extends PartItem {
  batchId: string;
  catenaXId: string;
}

/**
 * JIS (Just-In-Sequence) Item (extends PartItem)
 */
export interface JISItem extends PartItem {
  jisNumber: string;
  jisCallDate?: string;
  parentOrderNumber?: string;
  catenaXId: string;
}

/**
 * Union type for all item types in Connect-to-Parent
 */
export type ConnectToParentItem = SerializedPartItem | BatchItem | JISItem;

/**
 * Connect-to-Parent Payload content
 */
export interface ConnectToParentPayload {
  digitalTwinType: DigitalTwinType;
  information?: string;
  listOfItems: ConnectToParentItem[];
}

/**
 * Complete Connect-to-Parent Request
 */
export interface ConnectToParentNotification {
  header: NotificationHeader;
  content: ConnectToParentPayload;
}

/**
 * Item Feedback Status
 */
export type ItemFeedbackStatus = 'OK' | 'ERROR' | 'PENDING';

/**
 * Feedback Status for overall notification
 */
export type FeedbackStatus = 'OK' | 'ERROR' | 'PENDING';

/**
 * Individual Item Feedback
 */
export interface ItemFeedback {
  catenaXId: string;
  status: ItemFeedbackStatus;
  statusMessage?: string;
}

/**
 * Feedback Payload content
 */
export interface FeedbackPayload {
  status: FeedbackStatus;
  statusMessage?: string;
  listOfItems: ItemFeedback[];
}

/**
 * Complete Feedback Request
 */
export interface FeedbackNotification {
  header: NotificationHeader;
  content: FeedbackPayload;
}

// ============================================================================
// Internal Application Types
// ============================================================================

/**
 * Notification Type based on API operations
 */
export type NotificationType = 'connect-to-parent' | 'connect-to-child' | 'submodel-update' | 'feedback';

/**
 * Notification Status for inbox (read/unread state)
 */
export type NotificationReadStatus = 'unread' | 'read';

/**
 * Notification verification state (workflow status)
 */
export type NotificationVerificationState = 'not-verified' | 'verified' | 'feedback-sent';

/**
 * Legacy status - kept for compatibility, maps to combination of read + verification state
 */
export type NotificationStatus = 'unread' | 'read' | 'pending-feedback' | 'feedback-sent';

/**
 * Digital Twin verification status
 */
export type DigitalTwinVerificationStatus = 'not-verified' | 'verifying' | 'accessible' | 'not-accessible' | 'error';

/**
 * Verified Digital Twin item with verification status
 */
export interface VerifiedItem {
  item: ConnectToParentItem;
  verificationStatus: DigitalTwinVerificationStatus;
  verificationError?: string;
  verifiedAt?: Date;
}

/**
 * Internal Notification representation for the inbox
 */
export interface InboxNotification {
  id: string;
  type: NotificationType;
  status: NotificationStatus;
  header: NotificationHeader;
  content: ConnectToParentPayload;
  receivedAt: Date;
  readAt?: Date;
  feedbackSentAt?: Date;
  feedbackResponse?: FeedbackPayload;
  verifiedItems: VerifiedItem[];
  // Thread-related
  threadId: string;
  isThreadStart: boolean;
  relatedNotifications: string[];
  // New fields for archive, trash and verification state
  isArchived: boolean;
  isTrashed: boolean;
  verificationState: NotificationVerificationState;
}

/**
 * Inbox filter type for different views
 */
export type InboxFilterType = 'all' | 'unread' | 'not-verified' | 'verified' | 'feedback-sent' | 'archived' | 'trash';

/**
 * Contact/Sender information
 */
export interface Contact {
  bpnl: string;
  name: string;
  isKnown: boolean;
}

/**
 * Grouped notifications by sender
 */
export interface SenderGroup {
  sender: Contact;
  notifications: InboxNotification[];
  unreadCount: number;
  lastActivity: Date;
}

/**
 * Notification panel view modes
 */
export type InboxViewMode = 'list' | 'grouped';

/**
 * Notification panel size states
 */
export type NotificationPanelSize = 'collapsed' | 'normal' | 'expanded';

/**
 * Search/Filter options for notifications
 */
export interface NotificationFilters {
  search: string;
  status: NotificationStatus | 'all';
  type: NotificationType | 'all';
  inboxFilter: InboxFilterType;
  dateRange?: {
    from: Date;
    to: Date;
  };
  senderBpn?: string;
}

/**
 * Feedback form state
 */
export interface FeedbackFormState {
  overallStatus: FeedbackStatus;
  overallMessage: string;
  itemFeedbacks: ItemFeedback[];
}

/**
 * Statistics for notifications
 */
export interface NotificationStats {
  total: number;
  unread: number;
  notVerified: number;
  verified: number;
  feedbackSent: number;
  archived: number;
  trash: number;
}

/**
 * Sorting options for notifications
 */
export type NotificationSortBy = 'receivedAt' | 'expectedResponseBy' | 'priority';

/**
 * Priority level based on response urgency
 */
export type NotificationPriority = 'urgent' | 'high' | 'normal' | 'low';
