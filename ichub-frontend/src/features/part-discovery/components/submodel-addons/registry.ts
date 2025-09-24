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

import { SubmodelAddonConfig, SubmodelAddonRegistry, ParsedSemanticId } from './types';

/**
 * Utility function to parse semantic ID from string
 */
function parseSemanticId(semanticId: string): ParsedSemanticId | null {
  try {
    // Parse semantic ID format: urn:samm:org.eclipse.esmf.samm:example:1.0.0#Property
    const match = semanticId.match(/^urn:(samm|bamm):([^:]+):([^:]+):(\d+)\.(\d+)\.(\d+)(?:#(.+))?$/);
    
    if (!match) {
      return null;
    }

    const [, prefix, namespace, name, major, minor, patch, fragment] = match;

    return {
      prefix: prefix as 'samm' | 'bamm',
      namespace,
      name,
      version: {
        major: parseInt(major, 10),
        minor: parseInt(minor, 10),
        patch: parseInt(patch, 10)
      },
      fragment,
      originalId: semanticId
    };
  } catch (error) {
    console.warn('Failed to parse semantic ID:', semanticId, error);
    return null;
  }
}

/**
 * Check if a parsed semantic ID matches the add-on's criteria
 */
function addonCanHandle(config: SubmodelAddonConfig, parsedSemanticId: ParsedSemanticId): boolean {
  // Check namespace and name match
  if (config.semanticNamespace !== parsedSemanticId.namespace || 
      config.semanticName !== parsedSemanticId.name) {
    return false;
  }

  // Check version compatibility
  const version = parsedSemanticId.version;
  const { supportedVersions } = config;

  if (supportedVersions.exact) {
    return version.major === supportedVersions.exact.major &&
           version.minor === supportedVersions.exact.minor &&
           version.patch === supportedVersions.exact.patch;
  }

  if (supportedVersions.min) {
    const minVersion = supportedVersions.min;
    if (version.major < minVersion.major ||
        (version.major === minVersion.major && version.minor < minVersion.minor) ||
        (version.major === minVersion.major && version.minor === minVersion.minor && version.patch < minVersion.patch)) {
      return false;
    }
  }

  if (supportedVersions.max) {
    const maxVersion = supportedVersions.max;
    if (version.major > maxVersion.major ||
        (version.major === maxVersion.major && version.minor > maxVersion.minor) ||
        (version.major === maxVersion.major && version.minor === maxVersion.minor && version.patch > maxVersion.patch)) {
      return false;
    }
  }

  return true;
}

/**
 * Create a new submodel add-on registry
 */
export function createSubmodelAddonRegistry(): SubmodelAddonRegistry {
  const addons = new Map<string, SubmodelAddonConfig>();

  return {
    addons,
    
    register(config: SubmodelAddonConfig) {
      // If no custom canHandle function provided, create a default one
      if (!config.canHandle) {
        config.canHandle = (parsedSemanticId: ParsedSemanticId) => 
          addonCanHandle(config, parsedSemanticId);
      }
      
      addons.set(config.id, config);
      console.log(`Registered submodel add-on: ${config.name} (${config.id})`);
    },

    getAddon(semanticId: string): SubmodelAddonConfig | null {
      const parsedSemanticId = parseSemanticId(semanticId);
      if (!parsedSemanticId) {
        return null;
      }

      const candidates = Array.from(addons.values())
        .filter(addon => addon.canHandle(parsedSemanticId))
        .sort((a, b) => b.priority - a.priority); // Sort by priority descending

      return candidates.length > 0 ? candidates[0] : null;
    },

    getCompatibleAddons(parsedSemanticId: ParsedSemanticId): SubmodelAddonConfig[] {
      return Array.from(addons.values())
        .filter(addon => addon.canHandle(parsedSemanticId))
        .sort((a, b) => b.priority - a.priority); // Sort by priority descending
    },

    getAllAddons(): SubmodelAddonConfig[] {
      return Array.from(addons.values()).sort((a, b) => a.name.localeCompare(b.name));
    }
  };
}

/**
 * Global registry instance
 */
export const submodelAddonRegistry = createSubmodelAddonRegistry();
