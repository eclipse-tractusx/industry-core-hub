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
 * Raw notification response from the backend API.
 * Field names are snake_case as returned by FastAPI/Pydantic.
 */
export interface NotificationApiResponse {
  id: number;
  created_at: string;
  message_id: string;
  sender_bpn: string;
  receiver_bpn: string;
  direction: string;
  status: string;
  use_case: string | null;
  full_notification: {
    header: {
      message_id: string;
      context: string;
      sent_date_time: string;
      sender_bpn: string;
      receiver_bpn: string;
      version: string;
      expected_response_by?: string | null;
      related_message_id?: string | null;
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
}

/** Singleton instance of the notification API service */
export const notificationApiService = new NotificationApiService();
