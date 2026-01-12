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
 * Status of a Digital Product Passport
 */
export type DPPStatus = 'draft' | 'active' | 'shared' | 'archived' | 'pending';

/**
 * Digital Product Passport record
 */
export interface DigitalProductPassport {
  id: string;
  name: string;
  version: string;
  semanticId: string;
  status: DPPStatus;
  twinAssociation?: TwinAssociation;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  shareCount: number;
}

/**
 * List item view of a DPP (summary)
 */
export interface DPPListItem {
  id: string;
  name: string;
  version: string;
  semanticId: string;
  status: DPPStatus;
  twinId?: string;
  submodelId?: string;
  partType?: 'catalog' | 'serialized' | 'batch';
  manufacturerPartId?: string;
  partInstanceId?: string;
  createdAt: string;
  shareCount: number;
  passportIdentifier?: string;
  issueDate?: string;
  expirationDate?: string;
}

/**
 * Association between DPP and Digital Twin
 */
export interface TwinAssociation {
  twinId: string;
  aasId?: string;
  manufacturerPartId: string;
  partInstanceId: string;
  twinName?: string;
  assetId?: string;
}

/**
 * Serialized part twin search result
 */
export interface SerializedTwinSearchResult {
  id: string;
  twinId: string;
  aasId: string;
  manufacturerPartId: string;
  partInstanceId: string;
  name: string;
  location: string;
  assetId: string;
  createdAt: string;
}

/**
 * Dataspace partner for sharing
 */
export interface DataspacePartner {
  id: string;
  name: string;
  bpn: string;
  edcEndpoint: string;
  description?: string;
}

/**
 * Configuration for sharing a DPP
 */
export interface SharingConfig {
  partnerId: string;
  readOnly: boolean;
  expirationDate?: string;
  usagePolicy: 'unrestricted' | 'restricted' | 'internal-only';
  notes?: string;
}

/**
 * Record of a DPP sharing instance
 */
export interface SharingRecord {
  id: string;
  dppId: string;
  partnerId: string;
  partnerName: string;
  partner: DataspacePartner;
  config: SharingConfig;
  accessConfig: {
    readOnly: boolean;
    expiresAt?: string;
    usagePolicy: string;
  };
  sharedAt: string;
  sharedBy: string;
  status: 'active' | 'revoked' | 'expired';
  lastAccessedAt?: string;
}

/**
 * Wizard state for DPP creation
 */
export interface DPPWizardState {
  currentStep: number;
  selectedVersion?: string;
  selectedSemanticId?: string;
  twinAssociation?: TwinAssociation;
  dppData?: Record<string, unknown>;
  isComplete: boolean;
}
