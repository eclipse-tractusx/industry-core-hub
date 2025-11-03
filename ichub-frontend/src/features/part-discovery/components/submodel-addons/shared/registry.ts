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

import {
  VersionedSubmodelAddon,
  SubmodelAddonRegistryEntry,
  AddonResolutionResult,
  SubmodelAddonError,
  SubmodelAddonErrorType,
  SubmodelAddonSystemConfig,
} from './types';
import { isSemanticIdForModel, parseSemanticId } from './semantic-id-utils';

/**
 * Default configuration for the submodel addon system
 */
const DEFAULT_CONFIG: SubmodelAddonSystemConfig = {
  strictMode: false,
  maxCacheSize: 50,
  enablePerformanceMonitoring: false,
};

/**
 * Registry for managing submodel addons
 * 
 * This registry provides a centralized way to register, discover, and resolve
 * submodel addons based on semantic IDs. It supports versioning, prioritization,
 * and fallback mechanisms.
 */
export class SubmodelAddonRegistry {
  private readonly addons = new Map<string, SubmodelAddonRegistryEntry>();
  private readonly semanticIdCache = new Map<string, AddonResolutionResult>();
  private readonly config: SubmodelAddonSystemConfig;

  constructor(config: Partial<SubmodelAddonSystemConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Registers a submodel addon
   * 
   * @param addon - The addon to register
   * @param options - Registration options
   * @throws {SubmodelAddonError} If registration fails
   */
  register(
    addon: VersionedSubmodelAddon,
    options: {
      enabled?: boolean;
      loadPriority?: number;
      replaceExisting?: boolean;
    } = {}
  ): void {
    const { enabled = true, loadPriority = 0, replaceExisting = false } = options;

    // Validate addon configuration
    this.validateAddon(addon);

    // Check if addon already exists
    if (this.addons.has(addon.id) && !replaceExisting) {
      throw new SubmodelAddonError(
        SubmodelAddonErrorType.REGISTRATION_ERROR,
        `Addon with ID '${addon.id}' is already registered. Use replaceExisting: true to override.`,
        undefined,
        addon.id
      );
    }

    // Register the addon
    this.addons.set(addon.id, {
      addon,
      enabled,
      loadPriority,
    });

    // Clear relevant cache entries
    this.clearCacheForAddon(addon);

    console.debug(`Registered submodel addon: ${addon.id} (${addon.name})`);
  }

  /**
   * Unregisters a submodel addon
   * 
   * @param addonId - The ID of the addon to unregister
   * @returns True if the addon was found and removed
   */
  unregister(addonId: string): boolean {
    const entry = this.addons.get(addonId);
    if (!entry) {
      return false;
    }

    this.addons.delete(addonId);
    this.clearCacheForAddon(entry.addon);

    console.debug(`Unregistered submodel addon: ${addonId}`);
    return true;
  }

  /**
   * Resolves the best addon for a given semantic ID
   * 
   * @param semanticId - The semantic ID to resolve
   * @param data - The submodel data (optional, for validation)
   * @returns The resolved addon or null if none found
   */
  resolve<TData = unknown>(
    semanticId: string,
    data?: unknown
  ): AddonResolutionResult<TData> | null {
    // Check cache first
    const cached = this.semanticIdCache.get(semanticId);
    if (cached) {
      // Validate data if provided
      if (data !== undefined && !cached.addon.isValidData(semanticId, data)) {
        return null;
      }
      return cached as AddonResolutionResult<TData>;
    }

    // Find matching addons
    const candidates = this.findMatchingAddons(semanticId, data);
    if (candidates.length === 0) {
      if (this.config.strictMode) {
        throw new SubmodelAddonError(
          SubmodelAddonErrorType.ADDON_NOT_FOUND,
          `No addon found for semantic ID: ${semanticId}`,
          semanticId
        );
      }
      return null;
    }

    // Select the best candidate
    const best = this.selectBestAddon(candidates, semanticId);

    // Cache the result
    if (this.semanticIdCache.size >= this.config.maxCacheSize) {
      // Simple LRU: remove oldest entry
      const firstKey = this.semanticIdCache.keys().next().value;
      if (firstKey) {
        this.semanticIdCache.delete(firstKey);
      }
    }
    this.semanticIdCache.set(semanticId, best);

    return best as AddonResolutionResult<TData>;
  }

  /**
   * Gets all registered addons
   * 
   * @param includeDisabled - Whether to include disabled addons
   * @returns Array of addon entries
   */
  getAllAddons(includeDisabled = false): SubmodelAddonRegistryEntry[] {
    return Array.from(this.addons.values()).filter(
      entry => includeDisabled || entry.enabled
    );
  }

  /**
   * Gets addon by ID
   * 
   * @param addonId - The addon ID
   * @returns The addon entry or undefined
   */
  getAddon(addonId: string): SubmodelAddonRegistryEntry | undefined {
    return this.addons.get(addonId);
  }

  /**
   * Enables or disables an addon
   * 
   * @param addonId - The addon ID
   * @param enabled - Whether to enable the addon
   * @returns True if the addon was found and updated
   */
  setAddonEnabled(addonId: string, enabled: boolean): boolean {
    const entry = this.addons.get(addonId);
    if (!entry) {
      return false;
    }

    entry.enabled = enabled;
    this.clearCacheForAddon(entry.addon);
    return true;
  }

  /**
   * Clears the resolution cache
   */
  clearCache(): void {
    this.semanticIdCache.clear();
  }

  /**
   * Gets statistics about the registry
   */
  getStats(): {
    totalAddons: number;
    enabledAddons: number;
    cacheSize: number;
    namespaces: string[];
  } {
    const entries = Array.from(this.addons.values());
    const enabledEntries = entries.filter(e => e.enabled);
    const namespaces = [...new Set(entries.map(e => e.addon.namespace))];

    return {
      totalAddons: entries.length,
      enabledAddons: enabledEntries.length,
      cacheSize: this.semanticIdCache.size,
      namespaces,
    };
  }

  /**
   * Validates an addon configuration
   */
  private validateAddon(addon: VersionedSubmodelAddon): void {
    if (!addon.id || typeof addon.id !== 'string') {
      throw new SubmodelAddonError(
        SubmodelAddonErrorType.REGISTRATION_ERROR,
        'Addon must have a valid string ID',
        undefined,
        addon.id
      );
    }

    if (!addon.name || typeof addon.name !== 'string') {
      throw new SubmodelAddonError(
        SubmodelAddonErrorType.REGISTRATION_ERROR,
        'Addon must have a valid name',
        undefined,
        addon.id
      );
    }

    if (!addon.namespace || typeof addon.namespace !== 'string') {
      throw new SubmodelAddonError(
        SubmodelAddonErrorType.REGISTRATION_ERROR,
        'Addon must have a valid namespace',
        undefined,
        addon.id
      );
    }

    if (!addon.modelName || typeof addon.modelName !== 'string') {
      throw new SubmodelAddonError(
        SubmodelAddonErrorType.REGISTRATION_ERROR,
        'Addon must have a valid modelName',
        undefined,
        addon.id
      );
    }

    if (!Array.isArray(addon.supportedSemanticIds) || addon.supportedSemanticIds.length === 0) {
      throw new SubmodelAddonError(
        SubmodelAddonErrorType.REGISTRATION_ERROR,
        'Addon must support at least one semantic ID',
        undefined,
        addon.id
      );
    }

    if (typeof addon.isValidData !== 'function') {
      throw new SubmodelAddonError(
        SubmodelAddonErrorType.REGISTRATION_ERROR,
        'Addon must provide a valid isValidData function',
        undefined,
        addon.id
      );
    }

    if (!addon.component) {
      throw new SubmodelAddonError(
        SubmodelAddonErrorType.REGISTRATION_ERROR,
        'Addon must provide a React component',
        undefined,
        addon.id
      );
    }
  }

  /**
   * Finds addons that match the given semantic ID
   */
  private findMatchingAddons(semanticId: string, data?: unknown): SubmodelAddonRegistryEntry[] {
    const parsed = parseSemanticId(semanticId);
    if (!parsed) {
      return [];
    }

    return Array.from(this.addons.values()).filter(entry => {
      if (!entry.enabled) {
        return false;
      }

      const { addon } = entry;

      // Check if addon supports this namespace and model
      if (!isSemanticIdForModel(semanticId, addon.namespace, addon.modelName)) {
        return false;
      }

      // Check if addon explicitly supports this semantic ID
      if (!addon.supportedSemanticIds.includes(semanticId)) {
        return false;
      }

      // Validate data if provided
      if (data !== undefined && !addon.isValidData(semanticId, data)) {
        return false;
      }

      return true;
    });
  }

  /**
   * Selects the best addon from candidates
   */
  private selectBestAddon(
    candidates: SubmodelAddonRegistryEntry[],
    semanticId: string
  ): AddonResolutionResult {
    // Sort by priority (descending) and load priority (ascending)
    const sorted = candidates.sort((a, b) => {
      if (a.addon.priority !== b.addon.priority) {
        return b.addon.priority - a.addon.priority; // Higher priority first
      }
      return a.loadPriority - b.loadPriority; // Lower load priority first
    });

    const best = sorted[0];
    const isPreferred = sorted.length === 1 || best.addon.priority > sorted[1].addon.priority;
    const confidence = this.calculateConfidence(best.addon, semanticId);

    return {
      addon: best.addon,
      isPreferred,
      confidence,
    };
  }

  /**
   * Calculates confidence score for an addon match
   */
  private calculateConfidence(addon: VersionedSubmodelAddon, semanticId: string): number {
    // Base confidence for exact semantic ID match
    let confidence = addon.supportedSemanticIds.includes(semanticId) ? 1.0 : 0.8;

    // Adjust based on addon priority
    confidence *= Math.min(1.0, (addon.priority + 10) / 20);

    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Clears cache entries related to an addon
   */
  private clearCacheForAddon(addon: VersionedSubmodelAddon): void {
    for (const [semanticId, result] of this.semanticIdCache.entries()) {
      if (result.addon.id === addon.id) {
        this.semanticIdCache.delete(semanticId);
      }
    }
  }
}

/**
 * Global singleton instance of the submodel addon registry
 */
export const submodelAddonRegistry = new SubmodelAddonRegistry();
