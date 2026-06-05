/********************************************************************************
 * Eclipse Tractus-X - Industry Core Hub Frontend
 *
 * Copyright (c) 2026 Contributors to the Eclipse Foundation
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
 * TypeScript mirrors of the backend CCM consumer DTOs.
 * Field names match the camelCase aliases returned by the API
 * (`/v1/addons/ccm-kit/consumer/*`).
 */

export type Governance = Array<Record<string, unknown>>;

/** Outbound-request lifecycle status. */
export type OutboundRequestStatus = 'Pending' | 'Found' | 'NotFound' | 'Failed';

/** Consumer feedback values (CX-0135). */
export type CertificateStatusValue = 'RECEIVED' | 'ACCEPTED' | 'REJECTED';

/** Local processing status of a received certificate. */
export type ReceivedLocalStatus = 'Pending' | 'Accepted' | 'Rejected';

// ─── catalog-search ───────────────────────────────────────────────────────

export interface CatalogSearchResult {
  found: boolean;
  providerBpn: string;
  dspUrl?: string | null;
  assetId?: string | null;
  dctType?: string | null;
  error?: string | null;
}

// ─── request ────────────────────────────────────────────────────────────────

export interface SendRequestPayload {
  senderBpn: string;
  providerBpn: string;
  certifiedBpn: string;
  certificateType: string;
  locationBpns?: string[];
  governance?: Governance;
}

export interface SendResult {
  success: boolean;
  messageId?: string | null;
  error?: string | null;
}

// ─── status (feedback) ───────────────────────────────────────────────────────

export interface CertificateErrorDetail {
  message: string;
}

export interface LocationErrorDetail {
  bpn: string;
  locationErrors: CertificateErrorDetail[];
}

export interface SendStatusPayload {
  senderBpn: string;
  providerBpn: string;
  documentId: string;
  certificateStatus: CertificateStatusValue;
  relatedMessageId?: string | null;
  locationBpns?: string[];
  certificateErrors?: CertificateErrorDetail[];
  locationErrors?: LocationErrorDetail[];
  governance?: Governance;
}

// ─── pull ────────────────────────────────────────────────────────────────────

export interface PullRequestPayload {
  providerBpn: string;
  documentId: string;
  governance?: Governance;
}

export interface PullResult {
  certificateData: Record<string, unknown>;
  stored: boolean;
}

// ─── outbound requests (list / history) ──────────────────────────────────────

export interface OutboundRequestItem {
  id: number;
  senderBpn: string;
  providerBpn: string;
  certifiedBpn: string;
  certificateType: string;
  locationBpns?: string[] | null;
  status: OutboundRequestStatus;
  notificationId?: string | null;
  documentId?: string | null;
  requestedAt: string;
  updatedAt: string;
}

// ─── received certificates (list / detail) ───────────────────────────────────

export interface ReceivedCertificateItem {
  id: number;
  documentId: string;
  providerBpn: string;
  certifiedBpn: string;
  certificateType: string;
  trustLevel?: string | null;
  validFrom?: string | null;
  validUntil?: string | null;
  localStatus: ReceivedLocalStatus;
  statusUpdatedAt?: string | null;
  receivedAt: string;
}

export interface ReceivedCertificateDetail extends ReceivedCertificateItem {
  certificateVersion?: string | null;
  issuerName?: string | null;
  issuerBpn?: string | null;
  validatorName?: string | null;
  registrationNumber?: string | null;
  areaOfApplication?: string | null;
  uploaderBpn?: string | null;
  documentBase64?: string | null;
}
