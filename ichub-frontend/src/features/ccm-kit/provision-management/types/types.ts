/********************************************************************************
 * Eclipse Tractus-X - Industry Core Hub Frontend
 *
 * Copyright (c) 2026 Contributors to the Eclipse Foundation
 * Copyright (c) 2026 LKS Next
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
 * License for the specific language governing permissions and limitations
 * under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 ********************************************************************************/

/**
 * TypeScript mirrors of the backend CCM provider DTOs.
 * Field names match the camelCase aliases returned by the API
 * (`/v1/addons/ccm-kit/provider/*`).
 */

export type Governance = Array<Record<string, unknown>>;

/** Inbound-request lifecycle status. */
export type InboundRequestStatus = 'NotFound' | 'Registered' | 'Available' | 'Pushed';

/** Consumer feedback values (CX-0135). */
export type ConsumerStatusValue = 'RECEIVED' | 'ACCEPTED' | 'REJECTED';

/** Share lifecycle status. */
export type ShareStatus = 'Active' | 'Pending' | 'Revoked';

export interface InboundRequestItem {
  requestId: number;
  consumerBpn: string;
  certifiedBpn: string;
  certificateType: string;
  /** JSON-serialised list of BPNS/BPNA scope (if provided). */
  locationBpns?: string | null;
  certificateId?: number | null;
  status: InboundRequestStatus;
  consumerStatus?: ConsumerStatusValue | null;
  notificationId?: string | null;
  receivedAt: string;
  updatedAt: string;
}

export interface PublishedItem {
  certificateId: number;
  assetId: string;
  bpnl: string;
  certificateType: string;
}

export interface PublishResult {
  documentId: string;
  assetId: string;
  certificateId: number;
}

export interface ShareItem {
  shareId: number;
  certificateId: number;
  certificateType: string;
  providerBpnl: string;
  consumerBpnl: string;
  status: ShareStatus;
  rejectionReason?: string | object | null;
  consumerStatus?: ConsumerStatusValue | null;
  lastSharedDate: string;
  createdAt: string;
}

export interface SendResult {
  success: boolean;
  messageId?: string | null;
  error?: string | null;
}

export interface AvailablePayload {
  senderBpn: string;
  certificateId: number;
  consumerBpn: string;
  governance?: Governance;
  relatedMessageId?: string | null;
}

export interface PushPayload {
  senderBpn: string;
  certificateId: number;
  consumerBpn: string;
  governance?: Governance;
  relatedMessageId?: string | null;
}
