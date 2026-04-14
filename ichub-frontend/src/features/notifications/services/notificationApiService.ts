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

import httpClient from '@/services/HttpClient';

/**
 * Backend notification status enum matching Python NotificationStatus.
 */
export type BackendNotificationStatus = 'received' | 'read' | 'pending' | 'sent' | 'failed';

/**
 * Request body for POST /v1/notifications-management/notification/send.
 * All fields except message_id and provider_bpn are optional — the backend
 * resolves them automatically from connector discovery and configuration.
 */
export interface SendNotificationRequest {
  message_id: string;
  provider_bpn: string;
  endpoint_path?: string;
  provider_dsp_url?: string;
  governance?: Array<Record<string, unknown>>;
}

/**
 * Raw notification response from the backend API.
 * Top-level fields are camelCase (FastAPI alias_generator=to_camel).
 * fullNotification.header supports both camelCase (records created after the
 * by_alias fix) and snake_case (records stored before the fix) so the mapper
 * can handle both without data loss.
 */
export interface NotificationApiResponse {
  id: number;
  createdAt: string;
  messageId: string;
  senderBpn: string;
  receiverBpn: string;
  direction: string;
  status: string;
  useCase: string | null;
  fullNotification: {
    header: {
      // camelCase — new records (by_alias=True)
      messageId?: string;
      sentDateTime?: string;
      senderBpn?: string;
      receiverBpn?: string;
      expectedResponseBy?: string | null;
      relatedMessageId?: string | null;
      // snake_case — old records stored before the fix
      message_id?: string;
      sent_date_time?: string;
      sender_bpn?: string;
      receiver_bpn?: string;
      expected_response_by?: string | null;
      related_message_id?: string | null;
      // always present
      context: string;
      version: string;
    };
    content: Record<string, unknown>;
  };
}

/**
 * Service for interacting with the backend Notification Management API.
 *
 * All endpoints live under /notifications-management/ and require authentication
 * (handled automatically by httpClient interceptors).
 */
class NotificationApiService {
  private readonly basePath = '/notifications-management';

  /**
   * Fetch all notifications for a given BPN.
   *
   * Backend endpoint: POST /v1/notifications-management/notifications
   * Query params: bpn (required), status (optional), offset, limit
   */
  async fetchNotifications(
    bpn: string,
    status?: BackendNotificationStatus,
    offset = 0,
    limit = 100,
  ): Promise<NotificationApiResponse[]> {
    const params: Record<string, string | number> = { bpn, offset, limit };
    if (status) {
      params.status = status;
    }

    const response = await httpClient.post<NotificationApiResponse[]>(
      `${this.basePath}/notifications`,
      null, // POST with no body — params go as query parameters
      { params },
    );

    return response.data;
  }

  /**
   * Update the status of a notification (e.g. mark as read).
   *
   * Backend endpoint: PUT /v1/notifications-management/notification/status
   * Query params: message_id, status
   */
  async updateNotificationStatus(
    messageId: string,
    newStatus: BackendNotificationStatus,
  ): Promise<void> {
    await httpClient.put(`${this.basePath}/notification/status`, null, {
      params: { message_id: messageId, status: newStatus },
    });
  }

  /**
   * Delete a notification by its message_id.
   *
   * Backend endpoint: DELETE /v1/notifications-management/notification
   * Query params: message_id
   */
  async deleteNotification(messageId: string): Promise<void> {
    await httpClient.delete(`${this.basePath}/notification`, {
      params: { message_id: messageId },
    });
  }

  /**
   * Send an existing notification via the EDC connector.
   *
   * Backend endpoint: POST /v1/notifications-management/notification/send
   * Body: SendNotificationRequest (message_id + provider_bpn required; other fields
   *       are resolved automatically by the backend when omitted)
   */
  async sendNotification(payload: SendNotificationRequest): Promise<void> {
    await httpClient.post(`${this.basePath}/notification/send`, payload);
  }
}

/** Singleton instance of the notification API service */
export const notificationApiService = new NotificationApiService();
