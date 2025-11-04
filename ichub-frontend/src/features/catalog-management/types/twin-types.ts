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

import { UUIDTypes } from 'uuid';

export interface BusinessPartner {
  name: string;
  bpnl: string;
}

export interface DataExchangeContractRead {
  semanticId: string;
  edcUsagePolicyId: string;
}

export interface DataExchangeAgreementRead {
  businessPartner: BusinessPartner;
  name: string;
  contracts: DataExchangeContractRead[];
}

export interface TwinAspectRegistration {
  enablementServiceStackName: string;
  status: number;
  mode: number;
  createdDate: string;
  modifiedDate: string;
}

export interface TwinAspectRead {
  semanticId: string;
  submodelId: string;
  registrations?: Record<string, TwinAspectRegistration>;
  registrationStatus?: 'PLANNED' | 'STORED' | 'REGISTERED';
  aspectUrl?: string;
  aspectData?: unknown;
}

export interface TwinRead {
  globalId: string;
  dtrAasId: string;
  createdDate: string;
  modifiedDate: string;
  shares?: DataExchangeAgreementRead[];
}

export interface TwinReadType {
  globalId: UUIDTypes;
  dtrAasId: UUIDTypes;
  createdDate: string;
  modifiedDate: string;
  shares?: DataExchangeAgreementRead[];
}

export interface CatalogPartTwinDetailsRead extends TwinRead {
  additionalContext?: Record<string, unknown>;
  registrations?: Record<string, boolean>;
  aspects?: Record<string, TwinAspectRead>;
  manufacturerId: string;
  manufacturerPartId: string;
  name: string;
  category?: string;
  bpns?: string;
  description?: string;
  materials?: Array<{name: string; share: number}>;
  width?: {value: number; unit: string};
  height?: {value: number; unit: string};
  length?: {value: number; unit: string};
  weight?: {value: number; unit: string};
  customerPartIds?: Record<string, BusinessPartner>;
}

export interface CatalogPartTwinDetailsReadType extends TwinReadType {
  additionalContext?: Record<string, unknown>;
  registrations?: Record<string, boolean>;
  aspects?: Record<string, TwinAspectRead>;
  manufacturerId: string;
  manufacturerPartId: string;
  name: string;
  nameAtManufacturer: string;
  classification: string;
}

export interface CatalogPartTwinCreateType {
  manufacturerId: string;
  manufacturerPartId: string;
  globalId?: UUIDTypes;
  dtrAasId?: UUIDTypes;
}
