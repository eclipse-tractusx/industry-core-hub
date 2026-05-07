/********************************************************************************
 * Eclipse Tractus-X - Industry Core Hub Frontend
 *
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

/**
 * PCF Exchange API - Provider-side API for responding to PCF requests
 */

// =============================================================================
// Types and Interfaces
// =============================================================================

/**
 * Status of a PCF notification (request from an external party)
 */
export type PcfNotificationStatus = 
  | 'PENDING'      // Request received, awaiting action
  | 'ACCEPTED'     // Request accepted, PCF will be/has been shared
  | 'REJECTED'     // Request rejected by provider
  | 'DELIVERED'    // PCF data has been delivered
  | 'FAILED';      // Technical error during processing

/**
 * Part with its PCF data for management
 */
export interface ManagedPart {
  catenaXId: string;
  manufacturerPartId: string;
  partInstanceId: string;
  partName: string;
  hasPcf: boolean;
  pcfVersion?: number;
  pcfLastUpdated?: string;
  pcfValue?: number;  // kg CO2e
  pcfValueUnit?: string;
  pcfStatus?: 'DRAFT' | 'PUBLISHED';
}

/**
 * PCF data record for a part
 */
export interface PcfDataRecord {
  id: string;
  partCatenaXId: string;
  version: number;
  specVersion: string;
  status: 'DRAFT' | 'PUBLISHED';
  created: string;
  updated: string;
  
  // Identification
  companyName: string;
  companyBpn: string;
  productDescription: string;
  productName: string;
  
  // PCF Values
  pcfExcludingBiogenic: number;
  pcfIncludingBiogenic: number;
  fossilGhgEmissions: number;
  biogenicCarbonContent: number;
  
  // Reference period
  referencePeriodStart: string;
  referencePeriodEnd: string;
  
  // Quality
  primaryDataShare: number;
  geographyCountry: string;
}

/**
 * Incoming PCF notification (request)
 */
export interface PcfNotification {
  id: string;
  partCatenaXId: string;
  manufacturerPartId: string;
  partInstanceId: string;
  partName?: string;
  
  // Request details
  requesterId: string;      // BPN of requester
  requesterName: string;    // Company name
  requestDate: string;
  
  // Status
  status: PcfNotificationStatus;
  responseDate?: string;
  rejectReason?: string;
  
  // PCF location URI — present when the provider has already resolved the PCF data location.
  // A PENDING request without this field means the PCF is not yet findable; Accept should be
  // blocked until the location is resolved (via the refresh-pcf endpoint).
  pcfLocation?: string | null;

  // Metadata
  message?: string;         // Optional message from requester
  priority?: 'LOW' | 'NORMAL' | 'HIGH';
}

/**
 * Grouped notifications by status for the UI
 */
export interface GroupedNotifications {
  pending: PcfNotification[];
  accepted: PcfNotification[];
  rejected: PcfNotification[];
  delivered: PcfNotification[];
  failed: PcfNotification[];
}

/**
 * Response when accepting/rejecting a notification
 */
export interface NotificationResponse {
  notificationId: string;
  status: PcfNotificationStatus;
  responseDate: string;
  rejectReason?: string;
}

// =============================================================================
// Mock Data
// =============================================================================

const MOCK_MANAGED_PARTS: ManagedPart[] = [
  {
    catenaXId: 'urn:uuid:e5c96ab5-896a-482c-8761-efd74777ca97',
    manufacturerPartId: 'BATTERY-MOD-A',
    partInstanceId: 'BATCH-2024-001',
    partName: 'HV Battery Module Type A',
    hasPcf: true,
    pcfVersion: 3,
    pcfLastUpdated: '2024-12-01T10:30:00Z',
    pcfValue: 158.5,
    pcfValueUnit: 'kg CO2e',
    pcfStatus: 'PUBLISHED'
  },
  {
    catenaXId: 'urn:uuid:62dcf56e-89a7-4c31-8ca0-6c8d1cdddc10',
    manufacturerPartId: 'BATTERY-MOD-B',
    partInstanceId: 'BATCH-2024-002',
    partName: 'HV Battery Module Type B',
    hasPcf: true,
    pcfVersion: 1,
    pcfLastUpdated: '2024-11-15T14:20:00Z',
    pcfValue: 142.3,
    pcfValueUnit: 'kg CO2e',
    pcfStatus: 'DRAFT'
  },
  {
    catenaXId: 'urn:uuid:b3d1c2a4-5678-90ab-cdef-1234567890ab',
    manufacturerPartId: 'CELL-HP-01',
    partInstanceId: 'SN-12345',
    partName: 'High Performance Cell Unit',
    hasPcf: false
  }
];

const MOCK_NOTIFICATIONS: PcfNotification[] = [
  // Pending notifications
  {
    id: 'notif-001',
    partCatenaXId: 'urn:uuid:e5c96ab5-896a-482c-8761-efd74777ca97',
    manufacturerPartId: 'BATTERY-MOD-A',
    partInstanceId: 'BATCH-2024-001',
    partName: 'HV Battery Module Type A',
    requesterId: 'BPNL00000001ABCD',
    requesterName: 'OEM Automotive AG',
    requestDate: '2024-12-10T09:15:00Z',
    status: 'PENDING',
    priority: 'HIGH',
    message: 'Urgent: Required for regulatory compliance report due Dec 20'
  },
  {
    id: 'notif-002',
    partCatenaXId: 'urn:uuid:62dcf56e-89a7-4c31-8ca0-6c8d1cdddc10',
    manufacturerPartId: 'BATTERY-MOD-B',
    partInstanceId: 'BATCH-2024-002',
    partName: 'HV Battery Module Type B',
    requesterId: 'BPNL00000002EFGH',
    requesterName: 'Tier1 Systems GmbH',
    requestDate: '2024-12-09T16:45:00Z',
    status: 'PENDING',
    priority: 'NORMAL'
  },
  {
    id: 'notif-003',
    partCatenaXId: 'urn:uuid:b3d1c2a4-5678-90ab-cdef-1234567890ab',
    manufacturerPartId: 'CELL-HP-01',
    partInstanceId: 'SN-12345',
    partName: 'High Performance Cell Unit',
    requesterId: 'BPNL00000003IJKL',
    requesterName: 'Battery Assembler SpA',
    requestDate: '2024-12-08T11:30:00Z',
    status: 'PENDING',
    priority: 'LOW',
    message: 'Needed for product catalog update Q1 2025'
  },
  {
    id: 'notif-008',
    partCatenaXId: 'urn:uuid:f4e2d1c3-6789-01bc-def2-3456789012cd',
    manufacturerPartId: 'MOTOR-CTRL-X1',
    partInstanceId: 'MCU-2024-A01',
    partName: 'Electric Motor Controller X1',
    requesterId: 'BPNL00000008YZAB',
    requesterName: 'PowerTrain Solutions Ltd',
    requestDate: '2024-12-11T08:00:00Z',
    status: 'PENDING',
    priority: 'HIGH',
    message: 'Needed urgently for customer audit next week'
  },
  {
    id: 'notif-009',
    partCatenaXId: 'urn:uuid:a1b2c3d4-5678-90ab-cdef-1234567890ef',
    manufacturerPartId: 'INVERTER-HV-200',
    partInstanceId: 'INV-2024-B05',
    partName: 'High Voltage Inverter 200kW',
    requesterId: 'BPNL00000009CDEF',
    requesterName: 'E-Mobility Tech Corp',
    requestDate: '2024-12-10T14:20:00Z',
    status: 'PENDING',
    priority: 'NORMAL'
  },
  // Accepted notifications
  {
    id: 'notif-004',
    partCatenaXId: 'urn:uuid:b3d1c2a4-5678-90ab-cdef-1234567890ab',
    manufacturerPartId: 'CELL-HP-01',
    partInstanceId: 'SN-12345',
    partName: 'High Performance Cell Unit',
    requesterId: 'BPNL00000003IJKL',
    requesterName: 'Battery Assembler SpA',
    requestDate: '2024-12-08T11:30:00Z',
    status: 'PENDING',
    priority: 'LOW',
    message: 'Needed for product catalog update Q1 2025'
  },
  // Accepted notifications
  {
    id: 'notif-004',
    partCatenaXId: 'urn:uuid:e5c96ab5-896a-482c-8761-efd74777ca97',
    manufacturerPartId: 'BATTERY-MOD-A',
    partInstanceId: 'BATCH-2024-001',
    partName: 'HV Battery Module Type A',
    requesterId: 'BPNL00000004MNOP',
    requesterName: 'Electric Motors Inc',
    requestDate: '2024-12-05T08:00:00Z',
    status: 'ACCEPTED',
    responseDate: '2024-12-05T10:30:00Z',
    priority: 'NORMAL',
    message: 'Thank you for your quick response'
  },
  {
    id: 'notif-010',
    partCatenaXId: 'urn:uuid:c2d3e4f5-7890-12cd-ef34-5678901234ab',
    manufacturerPartId: 'BMS-CTRL-V2',
    partInstanceId: 'BMS-2024-C12',
    partName: 'Battery Management System Controller V2',
    requesterId: 'BPNL00000010GHIJ',
    requesterName: 'Green Energy Solutions',
    requestDate: '2024-12-06T10:00:00Z',
    status: 'ACCEPTED',
    responseDate: '2024-12-06T12:15:00Z',
    priority: 'HIGH'
  },
  // Rejected notifications
  {
    id: 'notif-005',
    partCatenaXId: 'urn:uuid:62dcf56e-89a7-4c31-8ca0-6c8d1cdddc10',
    manufacturerPartId: 'BATTERY-MOD-B',
    partInstanceId: 'BATCH-2024-002',
    partName: 'HV Battery Module Type B',
    requesterId: 'BPNL00000005QRST',
    requesterName: 'Unknown Corp Ltd',
    requestDate: '2024-12-04T14:20:00Z',
    status: 'REJECTED',
    responseDate: '2024-12-04T16:00:00Z',
    rejectReason: 'No valid business relationship established',
    priority: 'NORMAL'
  },
  {
    id: 'notif-011',
    partCatenaXId: 'urn:uuid:d4e5f6a7-8901-23de-f456-7890123456cd',
    manufacturerPartId: 'CHARGER-DC-50',
    partInstanceId: 'CHG-2024-D45',
    partName: 'DC Fast Charger Module 50kW',
    requesterId: 'BPNL00000011KLMN',
    requesterName: 'Charging Infra GmbH',
    requestDate: '2024-12-03T09:30:00Z',
    status: 'REJECTED',
    responseDate: '2024-12-03T11:45:00Z',
    rejectReason: 'Confidential product - PCF data not shareable',
    priority: 'LOW',
    message: 'We need this for our sustainability report'
  },
  // Delivered notifications
  {
    id: 'notif-006',
    partCatenaXId: 'urn:uuid:e5c96ab5-896a-482c-8761-efd74777ca97',
    manufacturerPartId: 'BATTERY-MOD-A',
    partInstanceId: 'BATCH-2024-001',
    partName: 'HV Battery Module Type A',
    requesterId: 'BPNL00000006UVWX',
    requesterName: 'Sustainable Mobility GmbH',
    requestDate: '2024-12-01T09:00:00Z',
    status: 'DELIVERED',
    responseDate: '2024-12-01T11:00:00Z',
    priority: 'HIGH',
    message: 'Required for EU battery regulation compliance'
  },
  {
    id: 'notif-007',
    partCatenaXId: 'urn:uuid:e5c96ab5-896a-482c-8761-efd74777ca97',
    manufacturerPartId: 'BATTERY-MOD-A',
    partInstanceId: 'BATCH-2024-001',
    partName: 'HV Battery Module Type A',
    requesterId: 'BPNL00000001ABCD',
    requesterName: 'OEM Automotive AG',
    requestDate: '2024-11-20T10:00:00Z',
    status: 'DELIVERED',
    responseDate: '2024-11-20T14:30:00Z',
    priority: 'NORMAL'
  },
  {
    id: 'notif-012',
    partCatenaXId: 'urn:uuid:e6f7a8b9-0123-45ef-a678-9012345678de',
    manufacturerPartId: 'THERMAL-MGT-01',
    partInstanceId: 'TMS-2024-E78',
    partName: 'Thermal Management System',
    requesterId: 'BPNL00000012OPQR',
    requesterName: 'CleanTech Automotive',
    requestDate: '2024-11-15T14:00:00Z',
    status: 'DELIVERED',
    responseDate: '2024-11-15T16:30:00Z',
    priority: 'NORMAL',
    message: 'Annual carbon footprint reporting'
  },
  // Failed notifications (technical errors)
  {
    id: 'notif-013',
    partCatenaXId: 'urn:uuid:f7a8b9c0-1234-56fa-b789-0123456789ef',
    manufacturerPartId: 'CONVERTER-AC-DC',
    partInstanceId: 'CONV-2024-F01',
    partName: 'AC/DC Power Converter',
    requesterId: 'BPNL00000013STUV',
    requesterName: 'Power Electronics Ltd',
    requestDate: '2024-12-09T18:00:00Z',
    status: 'FAILED',
    priority: 'HIGH',
    message: 'Connection timeout during data transfer'
  },
  {
    id: 'notif-014',
    partCatenaXId: 'urn:uuid:a8b9c0d1-2345-67ab-c890-1234567890ab',
    manufacturerPartId: 'SENSOR-PACK-01',
    partInstanceId: 'SENS-2024-G23',
    partName: 'Multi-Sensor Package',
    requesterId: 'BPNL00000014WXYZ',
    requesterName: 'Sensor Systems AG',
    requestDate: '2024-12-08T10:30:00Z',
    status: 'FAILED',
    priority: 'NORMAL',
    message: 'EDC contract negotiation failed'
  }
];

const MOCK_PCF_DATA: PcfDataRecord = {
  id: 'pcf-001',
  partCatenaXId: 'urn:uuid:e5c96ab5-896a-482c-8761-efd74777ca97',
  version: 3,
  specVersion: '2.2.0',
  status: 'PUBLISHED',
  created: '2024-10-01T10:00:00Z',
  updated: '2024-12-01T10:30:00Z',
  
  companyName: 'Battery Manufacturer GmbH',
  companyBpn: 'BPNL00000007CXHK',
  productDescription: 'High-voltage battery module for electric vehicles',
  productName: 'HV Battery Module Type A',
  
  pcfExcludingBiogenic: 158.5,
  pcfIncludingBiogenic: 150.2,
  fossilGhgEmissions: 140.3,
  biogenicCarbonContent: 8.3,
  
  referencePeriodStart: '2024-01-01T00:00:00Z',
  referencePeriodEnd: '2024-12-31T23:59:59Z',
  
  primaryDataShare: 72.5,
  geographyCountry: 'DE'
};

// Simulated delay helper
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// =============================================================================
// API Functions
// =============================================================================

/**
 * Search for a managed part by identifier
 */
export async function searchManagedPart(partIdentifier: string): Promise<ManagedPart | null> {
  await delay(600);
  
  // partIdentifier format: "manufacturerPartId:partInstanceId"
  const [mfgPartId, instanceId] = partIdentifier.split(':');
  
  if (!mfgPartId || !instanceId) return null;
  
  const part = MOCK_MANAGED_PARTS.find(
    p => p.manufacturerPartId === mfgPartId && p.partInstanceId === instanceId
  );
  
  // If no exact match, generate auto-mock data for any valid search
  if (!part) {
    return {
      catenaXId: `urn:uuid:${crypto.randomUUID()}`,
      manufacturerPartId: mfgPartId,
      partInstanceId: instanceId,
      partName: `Product ${mfgPartId}`,
      hasPcf: Math.random() > 0.3, // 70% chance has PCF
      pcfVersion: 1,
      pcfLastUpdated: new Date().toISOString(),
      pcfValue: Math.round(50 + Math.random() * 150),
      pcfValueUnit: 'kg CO2e',
      pcfStatus: Math.random() > 0.5 ? 'PUBLISHED' : 'DRAFT'
    };
  }
  
  return part;
}

/**
 * Get all managed parts (for listing)
 */
export async function getManagedParts(): Promise<ManagedPart[]> {
  await delay(400);
  return [...MOCK_MANAGED_PARTS];
}

/**
 * Get PCF data for a part
 */
export async function getPcfData(partCatenaXId: string): Promise<PcfDataRecord | null> {
  await delay(500);
  
  if (partCatenaXId === MOCK_PCF_DATA.partCatenaXId) {
    return { ...MOCK_PCF_DATA };
  }
  
  // Generate mock PCF for any part (simulate having PCF data)
  return {
    id: `pcf-${Date.now()}`,
    partCatenaXId,
    version: 1,
    specVersion: '2.2.0',
    status: 'DRAFT',
    created: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updated: new Date().toISOString(),
    companyName: 'Your Company GmbH',
    companyBpn: 'BPNL00000007CXHK',
    productDescription: 'Product with carbon footprint data',
    productName: 'Auto-generated Product',
    pcfExcludingBiogenic: Math.round(50 + Math.random() * 150),
    pcfIncludingBiogenic: Math.round(45 + Math.random() * 140),
    fossilGhgEmissions: Math.round(40 + Math.random() * 120),
    biogenicCarbonContent: Math.round(5 + Math.random() * 20),
    referencePeriodStart: '2024-01-01T00:00:00Z',
    referencePeriodEnd: '2024-12-31T23:59:59Z',
    primaryDataShare: Math.round(50 + Math.random() * 40),
    geographyCountry: 'DE'
  };
}

/**
 * Upload/create PCF data for a part
 */
export async function uploadPcfData(
  partCatenaXId: string, 
  data: Partial<PcfDataRecord>
): Promise<PcfDataRecord> {
  await delay(800);
  
  const newPcf: PcfDataRecord = {
    ...MOCK_PCF_DATA,
    ...data,
    id: `pcf-${Date.now()}`,
    partCatenaXId,
    version: 1,
    status: 'DRAFT',
    created: new Date().toISOString(),
    updated: new Date().toISOString()
  };
  
  return newPcf;
}

/**
 * Update existing PCF data
 */
export async function updatePcfData(
  _pcfId: string, 
  data: Partial<PcfDataRecord>
): Promise<PcfDataRecord> {
  await delay(600);
  
  return {
    ...MOCK_PCF_DATA,
    ...data,
    version: MOCK_PCF_DATA.version + 1,
    updated: new Date().toISOString()
  };
}

/**
 * Publish PCF data (make available for sharing)
 */
export async function publishPcfData(_pcfId: string): Promise<PcfDataRecord> {
  await delay(500);
  
  return {
    ...MOCK_PCF_DATA,
    status: 'PUBLISHED',
    updated: new Date().toISOString()
  };
}

/**
 * Get all notifications (optionally filtered by status)
 */
export async function getNotifications(status?: PcfNotificationStatus): Promise<PcfNotification[]> {
  await delay(400);
  
  let notifications = [...MOCK_NOTIFICATIONS];
  
  if (status) {
    notifications = notifications.filter(n => n.status === status);
  }
  
  // Sort by date, newest first
  notifications.sort((a, b) => 
    new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime()
  );
  
  return notifications;
}

/**
 * Get notifications grouped by status
 */
export async function getGroupedNotifications(): Promise<GroupedNotifications> {
  await delay(400);
  
  const notifications = [...MOCK_NOTIFICATIONS];
  
  return {
    pending: notifications.filter(n => n.status === 'PENDING')
      .sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime()),
    accepted: notifications.filter(n => n.status === 'ACCEPTED')
      .sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime()),
    rejected: notifications.filter(n => n.status === 'REJECTED')
      .sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime()),
    delivered: notifications.filter(n => n.status === 'DELIVERED')
      .sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime()),
    failed: notifications.filter(n => n.status === 'FAILED')
      .sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime())
  };
}

/**
 * Get notification counts by status
 */
export async function getNotificationCounts(): Promise<Record<PcfNotificationStatus, number>> {
  await delay(200);
  
  const notifications = [...MOCK_NOTIFICATIONS];
  
  return {
    PENDING: notifications.filter(n => n.status === 'PENDING').length,
    ACCEPTED: notifications.filter(n => n.status === 'ACCEPTED').length,
    REJECTED: notifications.filter(n => n.status === 'REJECTED').length,
    DELIVERED: notifications.filter(n => n.status === 'DELIVERED').length,
    FAILED: notifications.filter(n => n.status === 'FAILED').length
  };
}

/**
 * Accept a PCF request notification
 */
export async function acceptNotification(notificationId: string): Promise<NotificationResponse> {
  await delay(700);
  
  return {
    notificationId,
    status: 'ACCEPTED',
    responseDate: new Date().toISOString()
  };
}

/**
 * Reject a PCF request notification
 */
export async function rejectNotification(
  notificationId: string, 
  reason: string
): Promise<NotificationResponse> {
  await delay(600);
  
  return {
    notificationId,
    status: 'REJECTED',
    responseDate: new Date().toISOString(),
    rejectReason: reason
  };
}

/**
 * Get notifications for a specific part
 */
export async function getNotificationsForPart(partCatenaXId: string): Promise<PcfNotification[]> {
  await delay(400);
  
  // Return matching notifications or generate sample ones for demo
  const matching = MOCK_NOTIFICATIONS.filter(n => n.partCatenaXId === partCatenaXId);
  
  if (matching.length > 0) {
    return matching;
  }
  
  // Generate sample notifications for any part to demonstrate the feature
  return [
    {
      id: `notif-auto-${Date.now()}-1`,
      partCatenaXId,
      manufacturerPartId: 'SAMPLE-PART',
      partInstanceId: 'SAMPLE-001',
      partName: 'Sample Product',
      requesterId: 'BPNL00000001DEMO',
      requesterName: 'Demo Partner AG',
      requestDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'PENDING',
      priority: 'NORMAL',
      message: 'Requesting PCF data for sustainability reporting'
    },
    {
      id: `notif-auto-${Date.now()}-2`,
      partCatenaXId,
      manufacturerPartId: 'SAMPLE-PART',
      partInstanceId: 'SAMPLE-001',
      partName: 'Sample Product',
      requesterId: 'BPNL00000002DEMO',
      requesterName: 'Another Partner GmbH',
      requestDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'DELIVERED',
      responseDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      priority: 'HIGH'
    }
  ];
}

/**
 * Deliver PCF data in response to a notification
 */
export async function deliverPcfData(notificationId: string): Promise<NotificationResponse> {
  await delay(800);
  
  return {
    notificationId,
    status: 'DELIVERED',
    responseDate: new Date().toISOString()
  };
}
