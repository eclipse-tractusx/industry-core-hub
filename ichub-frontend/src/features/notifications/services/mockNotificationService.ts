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

import {
  InboxNotification,
  Contact,
  NotificationHeader,
  ConnectToParentPayload,
  ConnectToParentItem,
  VerifiedItem,
} from '../types';

type NotificationCallback = (notification: InboxNotification) => void;

/**
 * Mock Notification Service
 * Simulates incoming Digital Twin Event notifications
 */
class MockNotificationService {
  private subscribers: NotificationCallback[] = [];
  private notificationInterval: ReturnType<typeof setInterval> | null = null;

  // Known BPNs that exist in the Contact List (will show partner name)
  private knownBpns = ['BPNL123456789102', 'BPNL00000003CRHK'];

  // Unknown BPNs that don't exist in Contact List (will show option to add)
  private unknownBpns = [
    'BPNL00000003AZQP',
    'BPNL00000003B2OM',
    'BPNL00000003CPIY',
    'BPNL00000003DKNS',
    'BPNL00000003XYZW',
    'BPNL00000003ABCD',
  ];

  // Mock contacts representing known business partners
  private mockContacts: Contact[] = [
    { bpnl: 'BPNL123456789102', name: 'Automotive Parts GmbH', isKnown: true },
    { bpnl: 'BPNL00000003CRHK', name: 'Tier 1 Supplier GmbH', isKnown: true },
  ];

  // Sample manufacturer part IDs
  private partIds = [
    '8840838-04',
    'HV-BATT-2024-A',
    'ECU-MOD-3500',
    'STEEL-FRAME-XL',
    'BRAKE-PAD-PRO',
    'SENSOR-TEMP-01',
    'WIRE-HARNESS-M',
  ];

  // Generate UUID v4
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  // Generate Catena-X ID
  private generateCatenaXId(): string {
    return `urn:uuid:${this.generateUUID()}`;
  }

  // Generate a mock notification header with varying response times
  private generateHeader(senderBpn: string): NotificationHeader {
    const now = new Date();
    // Random response time: 1 hour to 14 days
    const hoursToRespond = Math.floor(Math.random() * 336) + 1; // 1 hour to 14 days
    const expectedResponse = new Date(now.getTime() + hoursToRespond * 60 * 60 * 1000);

    return {
      messageId: this.generateUUID(),
      context: 'IndustryCore-UniqueIdPush-ConnectToParent:3.0.0',
      sentDateTime: now.toISOString(),
      senderBpn,
      receiverBpn: 'BPNL00000003XXXX', // Our BPN
      expectedResponseBy: expectedResponse.toISOString(),
      version: '3.0.0',
    };
  }

  // Generate mock items for a notification
  private generateItems(count: number, senderBpn: string): ConnectToParentItem[] {
    const items: ConnectToParentItem[] = [];

    for (let i = 0; i < count; i++) {
      const itemType = Math.random();
      const partId = this.partIds[Math.floor(Math.random() * this.partIds.length)];

      if (itemType < 0.5) {
        // Serialized Part
        items.push({
          manufacturerId: senderBpn,
          manufacturerPartId: partId,
          customerPartId: `CUST-${partId}`,
          partInstanceId: `SN-${Date.now()}-${i}`,
          catenaXId: this.generateCatenaXId(),
        });
      } else if (itemType < 0.8) {
        // Batch
        items.push({
          manufacturerId: senderBpn,
          manufacturerPartId: partId,
          customerPartId: `CUST-${partId}`,
          batchId: `BATCH-${Date.now()}-${i}`,
          catenaXId: this.generateCatenaXId(),
        });
      } else {
        // JIS Item
        items.push({
          manufacturerId: senderBpn,
          manufacturerPartId: partId,
          customerPartId: `CUST-${partId}`,
          jisNumber: `JIS-${Math.floor(Math.random() * 1000000)}`,
          jisCallDate: new Date().toISOString(),
          parentOrderNumber: `ORD-${this.generateUUID().slice(0, 8)}`,
          catenaXId: this.generateCatenaXId(),
        });
      }
    }

    return items;
  }

  // Generate a mock notification with specific or random BPN
  private generateNotification(forceKnown?: boolean): InboxNotification {
    let senderBpn: string;
    
    if (forceKnown === true) {
      // Use a known BPN
      senderBpn = this.knownBpns[Math.floor(Math.random() * this.knownBpns.length)];
    } else if (forceKnown === false) {
      // Use an unknown BPN
      senderBpn = this.unknownBpns[Math.floor(Math.random() * this.unknownBpns.length)];
    } else {
      // Random mix
      const allBpns = [...this.knownBpns, ...this.unknownBpns];
      senderBpn = allBpns[Math.floor(Math.random() * allBpns.length)];
    }

    const itemCount = Math.floor(Math.random() * 5) + 1;
    const items = this.generateItems(itemCount, senderBpn);
    const header = this.generateHeader(senderBpn);

    // Check if known contact
    const knownContact = this.mockContacts.find((c) => c.bpnl === senderBpn);
    const senderName = knownContact?.name || senderBpn;

    const content: ConnectToParentPayload = {
      digitalTwinType: Math.random() > 0.5 ? 'PartInstance' : 'PartType',
      information: `Digital Twin notification for ${itemCount} item${itemCount > 1 ? 's' : ''} shared by ${senderName}. These items have been registered in the dataspace and are now available for consumption.`,
      listOfItems: items,
    };

    const verifiedItems: VerifiedItem[] = items.map((item) => ({
      item,
      verificationStatus: 'not-verified',
    }));

    return {
      id: this.generateUUID(),
      type: 'connect-to-parent',
      status: 'unread',
      header,
      content,
      receivedAt: new Date(),
      verifiedItems,
      threadId: header.messageId,
      isThreadStart: true,
      relatedNotifications: [],
      isArchived: false,
      verificationState: 'not-verified',
    };
  }

  // Generate initial notifications
  getNotifications(): InboxNotification[] {
    const notifications: InboxNotification[] = [];

    // Generate some historical notifications
    for (let i = 0; i < 25; i++) {
      const notification = this.generateNotification();
      // Set older dates
      const daysAgo = Math.floor(Math.random() * 14);
      notification.receivedAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

      // Some are already read
      if (Math.random() > 0.4) {
        notification.status = 'read';
        notification.readAt = new Date(notification.receivedAt.getTime() + 3600000);
      }

      // Some have verified items (but not all items necessarily verified)
      if (notification.status === 'read' && Math.random() > 0.5) {
        notification.verifiedItems = notification.verifiedItems.map((vi) => ({
          ...vi,
          verificationStatus: 'accessible',
          verifiedAt: new Date(notification.readAt!.getTime() + 3600000),
        }));
        notification.verificationState = 'verified';
      }

      // Some have feedback sent
      if (notification.verificationState === 'verified' && Math.random() > 0.5) {
        notification.status = 'feedback-sent';
        notification.verificationState = 'feedback-sent';
        notification.feedbackSentAt = new Date(notification.readAt!.getTime() + 7200000);
        notification.feedbackResponse = {
          status: 'OK',
          statusMessage: 'All digital twins processed successfully',
          listOfItems: notification.content.listOfItems.map((item) => ({
            catenaXId: item.catenaXId,
            status: 'OK',
          })),
        };
      }

      // Some are archived
      if (Math.random() > 0.9) {
        notification.isArchived = true;
      }

      notifications.push(notification);
    }

    // Sort by date descending (by receivedAt)
    return notifications.sort((a, b) => b.receivedAt.getTime() - a.receivedAt.getTime());
  }

  // Get contacts
  getContacts(): Contact[] {
    return [...this.mockContacts];
  }

  // Add a new contact (when user adds unknown BPN)
  addContact(bpnl: string, name: string): void {
    if (!this.mockContacts.find((c) => c.bpnl === bpnl)) {
      this.mockContacts.push({ bpnl, name, isKnown: true });
      // Move from unknown to known
      const unknownIdx = this.unknownBpns.indexOf(bpnl);
      if (unknownIdx > -1) {
        this.unknownBpns.splice(unknownIdx, 1);
        this.knownBpns.push(bpnl);
      }
    }
  }

  // Check if BPN is known
  isKnownBpn(bpnl: string): boolean {
    return this.mockContacts.some((c) => c.bpnl === bpnl);
  }

  // Subscribe to new notifications
  subscribe(callback: NotificationCallback): () => void {
    this.subscribers.push(callback);

    // Start generating notifications if not already
    if (!this.notificationInterval) {
      this.startGenerating();
    }

    // Return unsubscribe function
    return () => {
      this.subscribers = this.subscribers.filter((cb) => cb !== callback);
      if (this.subscribers.length === 0) {
        this.stopGenerating();
      }
    };
  }

  // Start generating periodic notifications - every minute, alternating between known and unknown
  private startGenerating(): void {
    let useKnown = true; // Alternate between known and unknown BPNs

    // Generate a new notification every minute (60000ms)
    this.notificationInterval = setInterval(() => {
      const notification = this.generateNotification(useKnown);
      this.subscribers.forEach((callback) => callback(notification));
      useKnown = !useKnown; // Alternate for next time
    }, 60000); // Every 1 minute
  }

  // Stop generating notifications
  private stopGenerating(): void {
    if (this.notificationInterval) {
      clearInterval(this.notificationInterval);
      this.notificationInterval = null;
    }
  }
}

export const mockNotificationService = new MockNotificationService();
