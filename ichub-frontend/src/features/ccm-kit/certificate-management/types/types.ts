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
 * License for the specific language govern in permissions and limitations
 * under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 ********************************************************************************/

/**
 * Certificate validity status - computed from dates
 * Valid: Valid Until > today + 30 days
 * Expiring: Valid Until ≤ today + 30 days AND > today
 * Expired: Valid Until ≤ today
 */
export type CertificateStatus = 'valid' | 'expiring' | 'expired';

/**
 * Certificate types as per CX-0135 BusinessPartnerCertificate v3.1.0
 */
export type CertificateType = 
  | 'ISO9001'
  | 'ISO14001'
  | 'ISO45001'
  | 'IATF16949'
  | 'ISO27001'
  | 'OTHER';

/**
 * Sharing record status for EDC workflow
 */
export type ShareStatus = 'Active' | 'Pending' | 'Revoked';

/**
 * Sharing record for a certificate
 * Stores EDC sharing workflow data
 */
export interface SharingRecord {
  id: string;
  partnerBpn: string;
  partnerName?: string;
  sharedDate: string;
  method: 'PULL' | 'PUSH';
  edcContractId: string;
  status: ShareStatus;
}

/**
 * DTR (Digital Twin Registry) registration status for a certificate.
 * - registered: Submodel descriptor successfully created in the DTR
 * - not_registered: Certificate has not been registered yet
 * - pending: Registration triggered but not yet confirmed
 */
export type DtrStatus = 'registered' | 'not_registered' | 'pending';

/**
 * Status of an EDC contract negotiation (Consumer side).
 */
export type NegotiationStatus = 'idle' | 'discovering' | 'negotiating' | 'transferring' | 'completed' | 'failed';

/**
 * Certificate entity following CX-0135 BusinessPartnerCertificate v3.1.0 model
 */
export interface Certificate {
  id: string;
  name: string;
  type: CertificateType;
  bpn: string;  // BPN-L of the certificate holder
  issuer: string;  // Certification Body
  validFrom: string;
  validUntil: string;
  /** Physical certificate number / registration ID (e.g. "TÜV-2024-9001-12345") */
  certificateIdentifier?: string;
  /** Optional list of BPNS (site-specific scope) per CX-0135 enclosedSites */
  enclosedSitesBpn?: string[];
  description?: string;  // Optional description
  status: CertificateStatus;  // Computed from dates
  /** DTR registration status — drives the DTR column in the table */
  dtrStatus: DtrStatus;
  /** EDC Asset ID assigned after DTR registration */
  edcAssetId?: string;
  sharedCount: number;  // Number of active shares
  sharingRecords?: SharingRecord[];  // List of sharing records
  trustLevel?: string;        // none | low | high | trusted
  areaOfApplication?: string;
  validator?: string;
  uploaderBpnl?: string;
  documentBase64?: string;  // BASE64-encoded document (CX-0135)
  documentUrl?: string;  // Download link for PDF
  createdAt: string;
  updatedAt: string;
}

// ─── Consumer / Partner Discovery types ─────────────────────────────────────

/**
 * A single certificate discovered from a partner via their DTR.
 * All data comes from the partner's Submodel descriptor.
 */
export interface PartnerCertificate {
  id: string;
  type: CertificateType;
  issuer: string;
  validFrom: string;
  validUntil: string;
  certificateIdentifier?: string;
  status: CertificateStatus;
  /** Semantic ID as per CX-0135 — urn:samm:io.catenax.business_partner_certificate:3.1.0 */
  semanticId: string;
  edcAssetId: string;
  negotiationStatus: NegotiationStatus;
  /** Full JSON payload retrieved after a successful EDC transfer */
  retrievedData?: Record<string, unknown>;
}

/**
 * Result of searching for a partner's certificates by BPN.
 * Contains the resolved partner info and their list of certificates.
 */
export interface PartnerCertificateSearchResult {
  partnerBpn: string;
  partnerName?: string;
  dtrEndpoint?: string;
  certificates: PartnerCertificate[];
}

// ─── Incoming Push Notifications ─────────────────────────────────────────────

export type NotificationStatus = 'pending' | 'acknowledged' | 'rejected';

/**
 * An incoming certificate push notification sent by a partner via the EDC.
 */
export interface IncomingCertificateNotification {
  id: string;
  senderBpn: string;
  senderName?: string;
  certificateType: CertificateType;
  certificateIssuer: string;
  receivedAt: string;
  status: NotificationStatus;
  /** Raw CX-0135 JSON payload attached to the notification */
  payload?: Record<string, unknown>;
}

/**
 * Certificate detail with full sharing history
 */
export interface CertificateDetail extends Certificate {
  sharingHistory: SharingRecord[];
  documentBase64: string;
}

export interface CertificateStats {
  total: number;
  valid: number;
  expiring: number;
  expired: number;
  shared?: number;  // Total shared certificates
}

/**
 * Filter parameters for certificate list
 */
export interface CertificateFilter {
  search: string;  // Text search across name, issuer, BPN
  type: CertificateType | '';
  status: CertificateStatus | '';
  shared?: boolean | '';  // Filter by shared or not shared
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page: number;
  pageSize: number;
}

/**
 * Sorting parameters
 */
export interface SortParams {
  sortBy: 'name' | 'type' | 'validUntil' | 'sharedDate';
  sortOrder: 'asc' | 'desc';
}

/**
 * Paginated response from API
 */
export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

/**
 * Shared certificate record
 */
export interface SharedCertificate {
  id: string;
  certificateId: string;
  certificateName: string;
  partnerBpn: string;
  partnerName?: string;
  sharedAt: string;
  method: 'PULL' | 'PUSH';
  edcContractId: string;
  status: ShareStatus;
}
