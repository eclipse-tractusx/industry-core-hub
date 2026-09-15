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
 * Mock data for CCM (Company Certificate Management) feature.
 *
 * Used when the backend URL is not configured or the API is unavailable.
 * All mock functions simulate network latency with MOCK_DELAY_MS to give
 * a realistic experience and make it easy to spot loading states during dev.
 *
 * When the backend is ready, only the api.ts functions need to be updated —
 * this file can be deleted or kept for testing purposes.
 */

import type {
  Certificate,
  CertificateDetail,
  SharedCertificate,
  IncomingCertificateNotification,
  PartnerCertificateSearchResult,
  PartnerCertificate,
  PaginatedResponse,
} from '../types/types';

/** Simulated network latency in milliseconds */
export const MOCK_DELAY_MS = 700;

const delay = (ms: number = MOCK_DELAY_MS) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

// ─── Own Certificates ───────────────────────────────────────────────────────

export const MOCK_CERTIFICATES: Certificate[] = [
  {
    id: 'cert-001',
    name: 'ISO 9001:2015 Quality Management',
    type: 'ISO9001',
    bpn: 'BPNL00000003AYRE',
    issuer: 'TÜV Rheinland AG',
    validFrom: '2023-01-15',
    validUntil: '2026-01-14',
    certificateIdentifier: 'TUV-2023-9001-48291',
    description: 'Quality Management System certification for all manufacturing sites.',
    status: 'valid',
    dtrStatus: 'registered',
    edcAssetId: 'urn:uuid:a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    sharedCount: 3,
    createdAt: '2023-01-16T10:00:00Z',
    updatedAt: '2025-03-01T08:30:00Z',
  },
  {
    id: 'cert-002',
    name: 'IATF 16949:2016 Automotive Quality',
    type: 'IATF16949',
    bpn: 'BPNL00000003AYRE',
    issuer: 'Bureau Veritas',
    validFrom: '2024-03-01',
    validUntil: '2026-06-10',
    certificateIdentifier: 'BV-2024-IATF-00872',
    enclosedSitesBpn: ['BPNS00000003B3NX', 'BPNS00000003C7PQ'],
    description: 'Automotive sector-specific QMS covering Plant A and Plant B.',
    status: 'expiring',
    dtrStatus: 'registered',
    edcAssetId: 'urn:uuid:b2c3d4e5-f6a7-8901-bcde-f12345678901',
    sharedCount: 1,
    createdAt: '2024-03-02T09:00:00Z',
    updatedAt: '2024-03-02T09:00:00Z',
  },
  {
    id: 'cert-003',
    name: 'ISO 14001:2015 Environmental Management',
    type: 'ISO14001',
    bpn: 'BPNL00000003AYRE',
    issuer: 'DNV GL',
    validFrom: '2022-06-01',
    validUntil: '2025-05-31',
    certificateIdentifier: 'DNV-2022-14001-3391',
    description: 'Environmental Management System certification.',
    status: 'expired',
    dtrStatus: 'registered',
    edcAssetId: 'urn:uuid:c3d4e5f6-a7b8-9012-cdef-123456789012',
    sharedCount: 0,
    createdAt: '2022-06-02T11:00:00Z',
    updatedAt: '2025-06-01T00:00:00Z',
  },
  {
    id: 'cert-004',
    name: 'ISO 45001:2018 Occupational Health & Safety',
    type: 'ISO45001',
    bpn: 'BPNL00000003AYRE',
    issuer: 'SGS SA',
    validFrom: '2024-09-01',
    validUntil: '2027-08-31',
    certificateIdentifier: 'SGS-2024-45001-7712',
    description: 'OH&S Management System for all company sites.',
    status: 'valid',
    dtrStatus: 'not_registered',
    sharedCount: 0,
    createdAt: '2024-09-02T14:00:00Z',
    updatedAt: '2024-09-02T14:00:00Z',
  },
  {
    id: 'cert-005',
    name: 'ISO 27001:2022 Information Security',
    type: 'ISO27001',
    bpn: 'BPNL00000003AYRE',
    issuer: 'LRQA Limited',
    validFrom: '2025-01-10',
    validUntil: '2028-01-09',
    certificateIdentifier: 'LRQA-2025-27001-0049',
    description: 'Information Security Management System.',
    status: 'valid',
    dtrStatus: 'pending',
    sharedCount: 2,
    createdAt: '2025-01-11T09:00:00Z',
    updatedAt: '2025-01-11T09:00:00Z',
  },
  {
    id: 'cert-006',
    name: 'ISO 9001:2015 — Logistics Division',
    type: 'ISO9001',
    bpn: 'BPNL00000003AYRE',
    issuer: 'Intertek Group plc',
    validFrom: '2023-07-01',
    validUntil: '2026-07-15',
    certificateIdentifier: 'ITK-2023-9001-8823',
    enclosedSitesBpn: ['BPNS00000003D9RT'],
    description: 'ISO 9001 for the logistics and warehousing division.',
    status: 'valid',
    dtrStatus: 'registered',
    edcAssetId: 'urn:uuid:d4e5f6a7-b8c9-0123-def0-234567890123',
    sharedCount: 1,
    createdAt: '2023-07-02T08:00:00Z',
    updatedAt: '2024-07-01T00:00:00Z',
  },
  {
    id: 'cert-007',
    name: 'ISO 14001:2015 — Renewable Energy Program',
    type: 'ISO14001',
    bpn: 'BPNL00000003AYRE',
    issuer: 'TÜV SÜD AG',
    validFrom: '2025-02-15',
    validUntil: '2028-02-14',
    certificateIdentifier: 'TUVSUD-2025-14001-1102',
    description: 'Environmental certification for the new solar energy program.',
    status: 'valid',
    dtrStatus: 'not_registered',
    sharedCount: 0,
    createdAt: '2025-02-16T10:00:00Z',
    updatedAt: '2025-02-16T10:00:00Z',
  },
  {
    id: 'cert-008',
    name: 'IATF 16949 — Global Supply Chain',
    type: 'IATF16949',
    bpn: 'BPNL00000003AYRE',
    issuer: 'Bureau Veritas',
    validFrom: '2023-11-01',
    validUntil: '2026-05-30',
    certificateIdentifier: 'BV-2023-IATF-01143',
    enclosedSitesBpn: ['BPNS00000003B3NX', 'BPNS00000003E1LM', 'BPNS00000003F2KN'],
    description: 'Global supply chain IATF coverage.',
    status: 'expiring',
    dtrStatus: 'registered',
    edcAssetId: 'urn:uuid:e5f6a7b8-c9d0-1234-ef01-345678901234',
    sharedCount: 0,
    createdAt: '2023-11-02T11:00:00Z',
    updatedAt: '2023-11-02T11:00:00Z',
  },
  {
    id: 'cert-009',
    name: 'ISO 27001 — Cloud Infrastructure',
    type: 'ISO27001',
    bpn: 'BPNL00000003AYRE',
    issuer: 'BSI Group',
    validFrom: '2024-04-01',
    validUntil: '2025-03-31',
    certificateIdentifier: 'BSI-2024-27001-5571',
    description: 'ISMS for cloud and IT infrastructure.',
    status: 'expired',
    dtrStatus: 'registered',
    edcAssetId: 'urn:uuid:f6a7b8c9-d0e1-2345-f012-456789012345',
    sharedCount: 0,
    createdAt: '2024-04-02T09:00:00Z',
    updatedAt: '2025-04-01T00:00:00Z',
  },
  {
    id: 'cert-010',
    name: 'ISO 45001 — Construction Projects',
    type: 'ISO45001',
    bpn: 'BPNL00000003AYRE',
    issuer: 'Bureau Veritas',
    validFrom: '2025-04-01',
    validUntil: '2028-03-31',
    certificateIdentifier: 'BV-2025-45001-0021',
    description: 'OH&S certification for active construction and facility projects.',
    status: 'valid',
    dtrStatus: 'not_registered',
    sharedCount: 0,
    createdAt: '2025-04-02T10:00:00Z',
    updatedAt: '2025-04-02T10:00:00Z',
  },
];

// ─── Sharing Records (Outbox) ─────────────────────────────────────────────────

export const MOCK_SHARING_RECORDS: SharedCertificate[] = [
  {
    id: 'share-001',
    certificateId: 'cert-001',
    certificateName: 'ISO 9001:2015 Quality Management',
    partnerBpn: 'BPNL00000007OR16',
    partnerName: 'Volkswagen AG',
    sharedAt: '2024-02-10T14:00:00Z',
    method: 'PULL',
    edcContractId: 'contract-vw-9001-2024',
    status: 'Active',
  },
  {
    id: 'share-002',
    certificateId: 'cert-001',
    certificateName: 'ISO 9001:2015 Quality Management',
    partnerBpn: 'BPNL00000005ZS82',
    partnerName: 'BMW Group',
    sharedAt: '2024-05-20T09:30:00Z',
    method: 'PULL',
    edcContractId: 'contract-bmw-9001-2024',
    status: 'Active',
  },
  {
    id: 'share-003',
    certificateId: 'cert-001',
    certificateName: 'ISO 9001:2015 Quality Management',
    partnerBpn: 'BPNL00000002A57Z',
    partnerName: 'Mercedes-Benz AG',
    sharedAt: '2023-12-01T11:00:00Z',
    method: 'PUSH',
    edcContractId: 'contract-mb-9001-2023',
    status: 'Revoked',
  },
  {
    id: 'share-004',
    certificateId: 'cert-002',
    certificateName: 'IATF 16949:2016 Automotive Quality',
    partnerBpn: 'BPNL00000007OR16',
    partnerName: 'Volkswagen AG',
    sharedAt: '2025-01-15T10:00:00Z',
    method: 'PULL',
    edcContractId: 'contract-vw-iatf-2025',
    status: 'Active',
  },
  {
    id: 'share-005',
    certificateId: 'cert-005',
    certificateName: 'ISO 27001:2022 Information Security',
    partnerBpn: 'BPNL00000005ZS82',
    partnerName: 'BMW Group',
    sharedAt: '2025-03-01T08:00:00Z',
    method: 'PUSH',
    edcContractId: 'contract-bmw-27001-2025',
    status: 'Active',
  },
  {
    id: 'share-006',
    certificateId: 'cert-005',
    certificateName: 'ISO 27001:2022 Information Security',
    partnerBpn: 'BPNL00000002A57Z',
    partnerName: 'Mercedes-Benz AG',
    sharedAt: '2025-04-10T16:00:00Z',
    method: 'PULL',
    edcContractId: 'contract-mb-27001-2025',
    status: 'Pending',
  },
];

// ─── Incoming Notifications (Inbox) ──────────────────────────────────────────

export const MOCK_INCOMING_NOTIFICATIONS: IncomingCertificateNotification[] = [
  {
    id: 'notif-001',
    senderBpn: 'BPNL00000007OR16',
    senderName: 'Volkswagen AG',
    certificateType: 'ISO9001',
    certificateIssuer: 'TÜV Rheinland AG',
    receivedAt: '2026-05-15T09:00:00Z',
    status: 'pending',
    payload: {
      businessPartnerNumber: 'BPNL00000007OR16',
      certificateType: 'ISO 9001',
      issuer: 'TÜV Rheinland AG',
      validFrom: '2024-01-01',
      validUntil: '2027-01-01',
      certificateIdentifier: 'TUV-2024-9001-VW-00123',
    },
  },
  {
    id: 'notif-002',
    senderBpn: 'BPNL00000005ZS82',
    senderName: 'BMW Group',
    certificateType: 'ISO14001',
    certificateIssuer: 'DNV GL',
    receivedAt: '2026-05-10T14:30:00Z',
    status: 'acknowledged',
    payload: {
      businessPartnerNumber: 'BPNL00000005ZS82',
      certificateType: 'ISO 14001',
      issuer: 'DNV GL',
      validFrom: '2023-06-01',
      validUntil: '2026-05-31',
      certificateIdentifier: 'DNV-2023-14001-BMW-0091',
    },
  },
  {
    id: 'notif-003',
    senderBpn: 'BPNL00000002A57Z',
    senderName: 'Mercedes-Benz AG',
    certificateType: 'IATF16949',
    certificateIssuer: 'Bureau Veritas',
    receivedAt: '2026-05-08T11:00:00Z',
    status: 'rejected',
    payload: {
      businessPartnerNumber: 'BPNL00000002A57Z',
      certificateType: 'IATF 16949',
      issuer: 'Bureau Veritas',
      validFrom: '2022-01-01',
      validUntil: '2025-12-31',
      certificateIdentifier: 'BV-2022-IATF-MB-0445',
    },
  },
];

// ─── Partner Certificates (Consumer discovery) ───────────────────────────────

const PARTNER_VW_CERTIFICATES: PartnerCertificate[] = [
  {
    id: 'partner-cert-vw-001',
    type: 'ISO9001',
    issuer: 'TÜV Rheinland AG',
    validFrom: '2024-01-01',
    validUntil: '2027-01-01',
    certificateIdentifier: 'TUV-2024-9001-VW-00123',
    status: 'valid',
    semanticId: 'urn:samm:io.catenax.business_partner_certificate:3.1.0#BusinessPartnerCertificate',
    edcAssetId: 'urn:uuid:aa11bb22-cc33-dd44-ee55-ff6677889900',
    negotiationStatus: 'idle',
  },
  {
    id: 'partner-cert-vw-002',
    type: 'IATF16949',
    issuer: 'Bureau Veritas',
    validFrom: '2023-07-01',
    validUntil: '2026-06-30',
    certificateIdentifier: 'BV-2023-IATF-VW-00456',
    status: 'expiring',
    semanticId: 'urn:samm:io.catenax.business_partner_certificate:3.1.0#BusinessPartnerCertificate',
    edcAssetId: 'urn:uuid:bb22cc33-dd44-ee55-ff66-aa7788990011',
    negotiationStatus: 'idle',
  },
  {
    id: 'partner-cert-vw-003',
    type: 'ISO14001',
    issuer: 'SGS SA',
    validFrom: '2025-03-01',
    validUntil: '2028-02-28',
    status: 'valid',
    semanticId: 'urn:samm:io.catenax.business_partner_certificate:3.1.0#BusinessPartnerCertificate',
    edcAssetId: 'urn:uuid:cc33dd44-ee55-ff66-aa77-bb8899001122',
    negotiationStatus: 'idle',
  },
];

const PARTNER_BMW_CERTIFICATES: PartnerCertificate[] = [
  {
    id: 'partner-cert-bmw-001',
    type: 'ISO9001',
    issuer: 'LRQA Limited',
    validFrom: '2023-09-01',
    validUntil: '2026-08-31',
    certificateIdentifier: 'LRQA-2023-9001-BMW-0771',
    status: 'valid',
    semanticId: 'urn:samm:io.catenax.business_partner_certificate:3.1.0#BusinessPartnerCertificate',
    edcAssetId: 'urn:uuid:dd44ee55-ff66-aa77-bb88-cc9900112233',
    negotiationStatus: 'idle',
  },
  {
    id: 'partner-cert-bmw-002',
    type: 'ISO45001',
    issuer: 'TÜV SÜD AG',
    validFrom: '2024-11-01',
    validUntil: '2027-10-31',
    status: 'valid',
    semanticId: 'urn:samm:io.catenax.business_partner_certificate:3.1.0#BusinessPartnerCertificate',
    edcAssetId: 'urn:uuid:ee55ff66-aa77-bb88-cc99-dd0011223344',
    negotiationStatus: 'idle',
  },
];

/**
 * Mock partner search results keyed by BPN.
 * Returns a search result for known BPNs, empty list for unknowns.
 */
export const MOCK_PARTNER_SEARCH: Record<string, PartnerCertificateSearchResult> = {
  BPNL00000007OR16: {
    partnerBpn: 'BPNL00000007OR16',
    partnerName: 'Volkswagen AG',
    dtrEndpoint: 'https://dtr.volkswagen.catena-x.net/api/v3',
    certificates: PARTNER_VW_CERTIFICATES,
  },
  BPNL00000005ZS82: {
    partnerBpn: 'BPNL00000005ZS82',
    partnerName: 'BMW Group',
    dtrEndpoint: 'https://dtr.bmwgroup.catena-x.net/api/v3',
    certificates: PARTNER_BMW_CERTIFICATES,
  },
};

// ─── Mock API Functions ───────────────────────────────────────────────────────

export const mockFetchCertificates = async (): Promise<Certificate[]> => {
  await delay();
  return [...MOCK_CERTIFICATES];
};

export const mockFetchCertificateDetail = async (id: string): Promise<CertificateDetail | null> => {
  await delay();
  const cert = MOCK_CERTIFICATES.find((c) => c.id === id);
  if (!cert) return null;
  return {
    ...cert,
    sharingHistory: MOCK_SHARING_RECORDS.filter((r) => r.certificateId === id),
    documentBase64: 'JVBERi0xLjQKJcOkw7zDtsOfCjIgMCBvYmoKPDwvTGVuZ3RoIDMgMCBSL0ZpbHRlci9GbGF0ZURlY29kZT4+', // minimal stub PDF base64
  };
};

export const mockFetchSharingRecords = async (): Promise<SharedCertificate[]> => {
  await delay();
  return [...MOCK_SHARING_RECORDS];
};

export const mockFetchIncomingNotifications = async (): Promise<IncomingCertificateNotification[]> => {
  await delay();
  return [...MOCK_INCOMING_NOTIFICATIONS];
};

export const mockSearchPartnerCertificates = async (
  partnerBpn: string,
): Promise<PartnerCertificateSearchResult> => {
  // Simulate 3-step discovery delay (longer to feel realistic)
  await delay(1800);
  const result = MOCK_PARTNER_SEARCH[partnerBpn.toUpperCase()];
  if (result) return { ...result, certificates: result.certificates.map((c) => ({ ...c })) };
  return { partnerBpn, certificates: [] };
};

export const mockInitiateNegotiation = async (
  _partnerBpn: string,
  edcAssetId: string,
): Promise<{ negotiationId: string }> => {
  await delay(500);
  return { negotiationId: `neg-${edcAssetId.slice(-8)}-${Date.now()}` };
};

export const mockCheckNegotiationStatus = async (
  negotiationId: string,
  _callCount: number,
): Promise<{ status: 'negotiating' | 'transferring' | 'completed' | 'failed'; transferId?: string }> => {
  await delay(1200);
  // Simulate progression: call 1 → negotiating, call 2 → transferring, call 3+ → completed
  if (_callCount <= 1) return { status: 'negotiating' };
  if (_callCount === 2) return { status: 'transferring' };
  return { status: 'completed', transferId: `transfer-${negotiationId}-done` };
};

export const mockFetchTransferredCertificate = async (
  _transferId: string,
): Promise<Record<string, unknown>> => {
  await delay(400);
  return {
    '@context': { '@vocab': 'https://w3id.org/edc/v0.0.1/ns/' },
    'businessPartnerNumber': 'BPNL00000007OR16',
    'certificateType': 'ISO 9001',
    'issuer': 'TÜV Rheinland AG',
    'validFrom': '2024-01-01T00:00:00Z',
    'validUntil': '2027-01-01T00:00:00Z',
    'certificateIdentifier': 'TUV-2024-9001-VW-00123',
    'semanticId': 'urn:samm:io.catenax.business_partner_certificate:3.1.0#BusinessPartnerCertificate',
  };
};

export const mockRegisterInDtr = async (
  id: string,
): Promise<{ dtrStatus: 'registered'; edcAssetId: string }> => {
  await delay(1000);
  return {
    dtrStatus: 'registered',
    edcAssetId: `urn:uuid:mock-${id}-${Date.now()}`,
  };
};

export const mockPaginatedCertificates = async (): Promise<PaginatedResponse<Certificate>> => {
  await delay();
  return {
    data: MOCK_CERTIFICATES,
    page: 0,
    pageSize: MOCK_CERTIFICATES.length,
    totalCount: MOCK_CERTIFICATES.length,
    totalPages: 1,
  };
};
