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

import { AASData } from '@/features/industry-core-kit/part-discovery/utils/utils';

// Re-export shared product types from catalog-management for discovery context
export type { 
  ApiPartData, 
  DiscoveryPartType,
  Material,
  LengthMeasurement,
  WeightMeasurement,
  LengthUnit,
  WeightUnit
} from '@/features/industry-core-kit/catalog-management/types/types';

// Re-export shared twin types from catalog-management
export type { 
  TwinReadType, 
  CatalogPartTwinCreateType 
} from '@/features/industry-core-kit/catalog-management/types/twin-types';

// Note: PartType is redefined here for part discovery context (Catalog | Serialized)
// This is different from the catalog management PartType interface

export interface PartCardData {
  id: string;
  manufacturerId: string;
  manufacturerPartId: string;
  customerPartId?: string;
  name?: string;
  category?: string;
  digitalTwinType: string;
  globalAssetId: string;
  submodelCount: number;
  dtrIndex?: number;
  rawTwinData?: AASData;
}

export interface SerializedPartData {
  id: string;
  globalAssetId: string;
  aasId: string;
  idShort?: string;
  manufacturerId: string;
  manufacturerPartId: string;
  customerPartId?: string;
  partInstanceId?: string;
  digitalTwinType: string;
  submodelCount: number;
  dtrIndex?: number;
  rawTwinData?: AASData;
}

export interface SearchFilters {
  customerPartId: string;
  manufacturerPartId: string;
  globalAssetId: string;
  partInstanceId: string;
}

export interface PaginationSettings {
  pageLimit: number;
  customLimit: string;
  isCustomLimit: boolean;
}

export type SearchMode = 'discovery' | 'single';
export type PartType = 'Catalog' | 'Serialized';
