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

import { ComponentType } from 'react';

/**
 * Base interface for all submodel addon configurations
 */
export interface SubmodelAddonBase {
  /** Unique identifier for the addon */
  id: string;
  /** Display name for the addon */
  name: string;
  /** Brief description of what this addon visualizes */
  description: string;
  /** Semantic model namespace (e.g., 'us_tariff_information') */
  namespace: string;
  /** Semantic model name (e.g., 'UsTariffInformation') */
  modelName: string;
  /** Array of supported semantic IDs */
  supportedSemanticIds: readonly string[];
  /** Priority for addon selection (higher = preferred) */
  priority: number;
}

/**
 * Versioned submodel addon configuration
 */
export interface VersionedSubmodelAddon<TData = unknown> extends SubmodelAddonBase {
  /** Type guard function to validate data structure */
  isValidData: (semanticId: string, data: unknown) => data is TData;
  /** React component for rendering the submodel data */
  component: ComponentType<SubmodelAddonProps<TData>>;
}

/**
 * Props passed to submodel addon components
 */
export interface SubmodelAddonProps<TData = unknown> {
  /** The semantic ID of the submodel */
  semanticId: string;
  /** The validated submodel data */
  data: TData;
  /** Optional metadata about the submodel */
  metadata?: SubmodelMetadata;
  /** Callback for error handling */
  onError?: (error: Error) => void;
  /** Additional props that can be passed down */
  [key: string]: unknown;
}

/**
 * Metadata about a submodel
 */
export interface SubmodelMetadata {
  /** Source of the submodel data */
  source?: string;
  /** Timestamp when the data was last updated */
  lastUpdated?: Date;
  /** Version information */
  version?: string;
  /** Additional metadata */
  [key: string]: unknown;
}

/**
 * Registry entry for a submodel addon
 */
export interface SubmodelAddonRegistryEntry {
  /** The addon configuration */
  addon: VersionedSubmodelAddon;
  /** Whether the addon is enabled */
  enabled: boolean;
  /** Load priority (for lazy loading) */
  loadPriority: number;
}

/**
 * Error types that can occur in submodel addon system
 */
export enum SubmodelAddonErrorType {
  ADDON_NOT_FOUND = 'ADDON_NOT_FOUND',
  INVALID_DATA = 'INVALID_DATA',
  COMPONENT_ERROR = 'COMPONENT_ERROR',
  REGISTRATION_ERROR = 'REGISTRATION_ERROR',
}

/**
 * Error class for submodel addon related errors
 */
export class SubmodelAddonError extends Error {
  constructor(
    public type: SubmodelAddonErrorType,
    message: string,
    public semanticId?: string,
    public addonId?: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'SubmodelAddonError';
  }
}

/**
 * Result of addon resolution
 */
export interface AddonResolutionResult<TData = unknown> {
  /** The resolved addon */
  addon: VersionedSubmodelAddon<TData>;
  /** Whether this is the preferred addon for the semantic ID */
  isPreferred: boolean;
  /** Confidence score (0-1) for the match */
  confidence: number;
}

/**
 * Configuration for the submodel addon system
 */
export interface SubmodelAddonSystemConfig {
  /** Whether to enable strict mode (throws on missing addons) */
  strictMode: boolean;
  /** Default fallback component for unknown submodels */
  fallbackComponent?: ComponentType<SubmodelAddonProps>;
  /** Maximum number of addons to cache */
  maxCacheSize: number;
  /** Whether to enable performance monitoring */
  enablePerformanceMonitoring: boolean;
}
