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

// This file contains only truly shared types used across multiple features
// Feature-specific types have been moved to their respective feature folders

// Generic product status - shared across features
export enum PRODUCT_STATUS {
    REGISTERED = "registered",
    DRAFT = "draft",
    PENDING = "pending",
    SHARED = "shared",
}

// Generic product options - shared across features  
export enum PRODUCT_OPTIONS {
    COPY = "Copy unique ID",
    COPY_AAS_ID = "Copy AAS ID",
    DOWNLOAD = "Download JSON",
    SHARE = "Share with partner",
    EDIT = "Edit product",
    DELETE = "Delete product",
    EXPORT = "Export data",
    VIEW_DETAILS = "View full details",
    REGISTER = "Register Twin",
}

// Re-export feature-specific types for backward compatibility
// These will be removed in future versions - use direct imports from features instead
export type { PartType, ApiPartData } from './types';
export type { PartnerInstance, SharedPartner } from '@/features/business-partner-kit/partner-management/types/types';
export type { TwinReadType, CatalogPartTwinCreateType } from './twin-types';
