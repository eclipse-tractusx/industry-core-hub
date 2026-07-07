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

import React from 'react';

/**
 * Semantic version representation
 */
export interface SemanticVersion {
  major: number;
  minor: number;
  patch: number;
}

/**
 * Version range for compatibility checking
 */
export interface VersionRange {
  min?: SemanticVersion;
  max?: SemanticVersion;
  exact?: SemanticVersion;
}

/**
 * Parsed semantic ID information
 */
export interface ParsedSemanticId {
  prefix: 'samm' | 'bamm';
  namespace: string;
  name: string;
  version: SemanticVersion;
  fragment?: string;
  originalId: string;
}

/**
 * Base interface for submodel data
 */
export interface SubmodelData {
  [key: string]: unknown;
}

/**
 * Props passed to submodel add-on components
 */
export interface SubmodelAddonProps {
  data: SubmodelData;
  semanticId: string;
  parsedSemanticId: ParsedSemanticId;
  submodelId: string;
  onExport?: (data: SubmodelData, filename: string) => void;
  onShare?: (data: SubmodelData, title: string) => void;
}

/**
 * Configuration for a submodel add-on
 */
export interface SubmodelAddonConfig {
  /** Unique identifier for the add-on */
  id: string;
  /** Display name for the add-on */
  name: string;
  /** Description of what this add-on visualizes */
  description: string;
  /** Add-on version */
  version: SemanticVersion;
  /** Semantic ID namespace this add-on handles */
  semanticNamespace: string;
  /** Semantic ID name this add-on handles */
  semanticName: string;
  /** Supported semantic ID versions */
  supportedVersions: VersionRange;
  /** Priority for add-on selection (higher = more preferred) */
  priority: number;
  /** Icon component to display */
  icon: React.ComponentType<{ fontSize?: string; color?: string }>;
  /** The main visualization component */
  component: React.ComponentType<SubmodelAddonProps>;
  /** Whether this add-on can handle the given parsed semantic ID */
  canHandle: (parsedSemanticId: ParsedSemanticId) => boolean;
}

/**
 * Registry for all submodel add-ons
 */
export interface SubmodelAddonRegistry {
  addons: Map<string, SubmodelAddonConfig>;
  register: (config: SubmodelAddonConfig) => void;
  getAddon: (semanticId: string) => SubmodelAddonConfig | null;
  getAllAddons: () => SubmodelAddonConfig[];
  getCompatibleAddons: (parsedSemanticId: ParsedSemanticId) => SubmodelAddonConfig[];
}

/**
 * Context for the submodel add-on system
 */
export interface SubmodelAddonContext {
  registry: SubmodelAddonRegistry;
  currentAddon: SubmodelAddonConfig | null;
  setCurrentAddon: (addon: SubmodelAddonConfig | null) => void;
}
