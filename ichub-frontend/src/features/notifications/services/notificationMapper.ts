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

import type { NotificationApiResponse } from './notificationApiService';
import type {
  InboxNotification,
  NotificationHeader,
  NotificationType,
  NotificationStatus,
  NotificationVerificationState,
  ConnectToParentPayload,
  ConnectToParentItem,
  VerifiedItem,
  DigitalTwinType,
} from '../types';

// ---------------------------------------------------------------------------
// Context-string → NotificationType mapping
// ---------------------------------------------------------------------------

/**
 * Maps the header.context string from the backend to a frontend NotificationType.
 *
 * Examples of context values:
 *   "IndustryCore-UniqueIdPush-ConnectToParent:3.0.0"
 *   "IndustryCore-UniqueIdPush-ConnectToChild:3.0.0"
 *   "IndustryCore-UniqueIdPush-SubmodelUpdate:1.0.0"
 *   "IndustryCore-UniqueIdPush-Feedback:1.0.0"
 */
const parseNotificationType = (context: string): NotificationType => {
  const normalized = context.toLowerCase();

  if (normalized.includes('connecttoparent') || normalized.includes('connect-to-parent') || normalized.includes('connect_to_parent')) {
    return 'connect-to-parent';
  }
  if (normalized.includes('connecttochild') || normalized.includes('connect-to-child') || normalized.includes('connect_to_child')) {
    return 'connect-to-child';
  }
  if (normalized.includes('submodelupdate') || normalized.includes('submodel-update') || normalized.includes('submodel_update')) {
    return 'submodel-update';
  }
  if (normalized.includes('feedback')) {
    return 'feedback';
  }

  // Default to connect-to-parent for unrecognized contexts
  return 'connect-to-parent';
};

// ---------------------------------------------------------------------------
// Backend status → Frontend status mapping
// ---------------------------------------------------------------------------

/**
 * Maps the backend notification status string to the frontend NotificationStatus.
 *
 * Backend: received | read | pending | sent | failed
 * Frontend: unread | read | pending-feedback | feedback-sent
 */
const mapStatus = (backendStatus: string): NotificationStatus => {
  switch (backendStatus) {
    case 'received':
      return 'unread';
    case 'read':
      return 'read';
    case 'pending':
      return 'pending-feedback';
    case 'sent':
      return 'feedback-sent';
    case 'failed':
      // Failed feedback is still considered "read" from a UI perspective
      return 'read';
    default:
      return 'unread';
  }
};

/**
 * Maps the backend notification status to the frontend verification state.
 */
const mapVerificationState = (backendStatus: string): NotificationVerificationState => {
  switch (backendStatus) {
    case 'sent':
      return 'feedback-sent';
    case 'pending':
    case 'read':
      return 'not-verified';
    default:
      return 'not-verified';
  }
};

// ---------------------------------------------------------------------------
// Header mapping (snake_case → camelCase)
// ---------------------------------------------------------------------------

/**
 * Converts a header from the backend to the frontend camelCase format.
 * Supports both camelCase (new records) and snake_case (old stored records)
 * so the UI works regardless of when the notification was created.
 */
const mapHeader = (raw: NotificationApiResponse['fullNotification']['header']): NotificationHeader => ({
  messageId: raw.messageId ?? raw.message_id ?? '',
  context: raw.context,
  sentDateTime: raw.sentDateTime ?? raw.sent_date_time ?? '',
  senderBpn: raw.senderBpn ?? raw.sender_bpn ?? '',
  receiverBpn: raw.receiverBpn ?? raw.receiver_bpn ?? '',
  version: raw.version,
  expectedResponseBy: (raw.expectedResponseBy ?? raw.expected_response_by) ?? undefined,
  relatedMessageId: (raw.relatedMessageId ?? raw.related_message_id) ?? undefined,
});

// ---------------------------------------------------------------------------
// Content mapping
// ---------------------------------------------------------------------------

/**
 * Safely extracts a ConnectToParentItem array from the backend content.
 *
 * The SDK's NotificationContent.extra = "allow" means that if the sender
 * included rich `listOfItems` or `list_of_items` data (with manufacturerId etc.),
 * it will be preserved in full_notification. Otherwise, `list_of_affected_items`
 * contains only ID strings and we build minimal items from them.
 */
const mapContentItems = (rawContent: Record<string, unknown>): ConnectToParentItem[] => {
  // 1. Check for camelCase listOfItems (extra field preserved by SDK)
  if (Array.isArray(rawContent.listOfItems) && rawContent.listOfItems.length > 0) {
    return rawContent.listOfItems as ConnectToParentItem[];
  }

  // 2. Check for snake_case list_of_items (extra field in snake_case)
  if (Array.isArray(rawContent.list_of_items) && (rawContent.list_of_items as unknown[]).length > 0) {
    return mapSnakeCaseItems(rawContent.list_of_items as Record<string, unknown>[]);
  }

  // 3. camelCase listOfAffectedItems — new records (stored with by_alias=True)
  if (Array.isArray(rawContent.listOfAffectedItems) && (rawContent.listOfAffectedItems as unknown[]).length > 0) {
    return (rawContent.listOfAffectedItems as string[]).map((id: string) => ({
      manufacturerId: '',
      manufacturerPartId: '',
      catenaXId: id,
      partInstanceId: id,
    }));
  }

  // 4. snake_case list_of_affected_items — old records stored before the fix
  if (Array.isArray(rawContent.list_of_affected_items)) {
    return (rawContent.list_of_affected_items as string[]).map((id: string) => ({
      manufacturerId: '',
      manufacturerPartId: '',
      catenaXId: id,
      partInstanceId: id,
    }));
  }

  return [];
};

/**
 * Converts a list of snake_case item objects to camelCase ConnectToParentItem objects.
 */
const mapSnakeCaseItems = (items: Record<string, unknown>[]): ConnectToParentItem[] =>
  items.map((item) => {
    const base = {
      manufacturerId: (item.manufacturer_id as string) ?? (item.manufacturerId as string) ?? '',
      manufacturerPartId: (item.manufacturer_part_id as string) ?? (item.manufacturerPartId as string) ?? '',
      customerPartId: (item.customer_part_id as string) ?? (item.customerPartId as string) ?? undefined,
      catenaXId: (item.catena_x_id as string) ?? (item.catenaXId as string) ?? '',
    };

    // Detect item subtype by looking for distinguishing fields
    if (item.part_instance_id ?? item.partInstanceId) {
      return {
        ...base,
        partInstanceId: (item.part_instance_id as string) ?? (item.partInstanceId as string) ?? '',
      };
    }
    if (item.batch_id ?? item.batchId) {
      return {
        ...base,
        batchId: (item.batch_id as string) ?? (item.batchId as string) ?? '',
      };
    }
    if (item.jis_number ?? item.jisNumber) {
      return {
        ...base,
        jisNumber: (item.jis_number as string) ?? (item.jisNumber as string) ?? '',
        jisCallDate: (item.jis_call_date as string) ?? (item.jisCallDate as string) ?? undefined,
        parentOrderNumber: (item.parent_order_number as string) ?? (item.parentOrderNumber as string) ?? undefined,
      };
    }

    // Default to serialized part
    return {
      ...base,
      partInstanceId: '',
    };
  });

/**
 * Extracts the digital twin type from the content, handling both snake_case and camelCase.
 */
const extractDigitalTwinType = (rawContent: Record<string, unknown>): DigitalTwinType => {
  const value = (rawContent.digital_twin_type as string) ??
    (rawContent.digitalTwinType as string) ??
    'PartInstance';
  // Normalize to expected format
  if (value.toLowerCase().includes('type')) return 'PartType';
  return 'PartInstance';
};

/**
 * Maps the raw backend content to a ConnectToParentPayload.
 */
const mapContent = (rawContent: Record<string, unknown>): ConnectToParentPayload => {
  const listOfItems = mapContentItems(rawContent);
  const digitalTwinType = extractDigitalTwinType(rawContent);
  const information = (rawContent.information as string) ?? undefined;

  return {
    digitalTwinType,
    information,
    listOfItems,
  };
};

// ---------------------------------------------------------------------------
// Main mapper
// ---------------------------------------------------------------------------

/**
 * Maps a single NotificationApiResponse from the backend to an InboxNotification
 * that the frontend can render.
 */
export const mapApiResponseToInboxNotification = (
  response: NotificationApiResponse,
): InboxNotification => {
  const header = mapHeader(response.fullNotification.header);
  const content = mapContent(response.fullNotification.content);
  const notificationType = parseNotificationType(header.context);
  const status = mapStatus(response.status);
  const verificationState = mapVerificationState(response.status);

  const verifiedItems: VerifiedItem[] = content.listOfItems.map((item) => ({
    item,
    verificationStatus: verificationState === 'feedback-sent' ? 'accessible' : 'not-verified',
    verifiedAt: verificationState === 'feedback-sent' ? new Date(response.createdAt) : undefined,
  }));

  const receivedAt = new Date(response.createdAt);
  const isFeedbackSent = status === 'feedback-sent';

  return {
    id: response.messageId,
    type: notificationType,
    status,
    header,
    content,
    receivedAt,
    readAt: status !== 'unread' ? receivedAt : undefined,
    feedbackSentAt: isFeedbackSent ? receivedAt : undefined,
    feedbackResponse: undefined, // Backend does not expose feedback content in the response
    verifiedItems,
    threadId: header.relatedMessageId ?? header.messageId,
    isThreadStart: !header.relatedMessageId,
    relatedNotifications: [],
    isArchived: false,
    isTrashed: false,
    verificationState,
  };
};

/**
 * Maps an array of backend API responses to frontend InboxNotification objects,
 * sorted by receivedAt descending (newest first).
 */
export const mapApiResponsesToNotifications = (
  responses: NotificationApiResponse[],
): InboxNotification[] =>
  responses
    .map(mapApiResponseToInboxNotification)
    .sort((a, b) => b.receivedAt.getTime() - a.receivedAt.getTime());
