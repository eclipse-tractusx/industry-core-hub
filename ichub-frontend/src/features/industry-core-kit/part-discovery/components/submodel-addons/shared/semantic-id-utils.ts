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
 * Generic utilities for parsing and working with Catena-X semantic model IDs
 * 
 * Semantic ID format: urn:samm:io.catenax.{namespace}:{version}#{modelName}
 * Examples:
 * - urn:samm:io.catenax.us_tariff_information:1.0.0#UsTariffInformation
 * - urn:samm:io.catenax.single_level_bom_as_built:3.0.0#SingleLevelBomAsBuilt
 * - urn:samm:io.catenax.shared.shopfloor_information_types:2.0.0#ShopfloorInformationTypes
 */

/**
 * Parsed semantic ID components
 */
export interface ParsedSemanticId {
  /** The namespace part (e.g., 'us_tariff_information', 'single_level_bom_as_built') */
  namespace: string;
  /** The version (e.g., '1.0.0', '3.0.0') */
  version: string;
  /** The model name (e.g., 'UsTariffInformation', 'SingleLevelBomAsBuilt') */
  modelName: string;
  /** The complete original URN */
  fullUrn: string;
}

/**
 * Regular expression for parsing Catena-X semantic IDs
 */
const SEMANTIC_ID_REGEX = /^urn:samm:io\.catenax\.([\w.]+):(\d+\.\d+\.\d+)#(\w+)$/;

/**
 * Parses a Catena-X semantic ID into its components
 * 
 * @param semanticId - The semantic ID to parse
 * @returns Parsed components or null if invalid format
 * 
 * @example
 * ```typescript
 * const parsed = parseSemanticId('urn:samm:io.catenax.us_tariff_information:1.0.0#UsTariffInformation');
 * // Returns: {
 * //   namespace: 'us_tariff_information',
 * //   version: '1.0.0',
 * //   modelName: 'UsTariffInformation',
 * //   fullUrn: 'urn:samm:io.catenax.us_tariff_information:1.0.0#UsTariffInformation'
 * // }
 * ```
 */
export function parseSemanticId(semanticId: string): ParsedSemanticId | null {
  const match = semanticId.match(SEMANTIC_ID_REGEX);
  if (!match) {
    return null;
  }
  
  return {
    namespace: match[1],
    version: match[2],
    modelName: match[3],
    fullUrn: semanticId
  };
}

/**
 * Extracts the version from a semantic ID
 * 
 * @param semanticId - The semantic ID
 * @returns The version string or null if invalid
 * 
 * @example
 * ```typescript
 * extractVersionFromSemanticId('urn:samm:io.catenax.us_tariff_information:1.0.0#UsTariffInformation');
 * // Returns: '1.0.0'
 * ```
 */
export function extractVersionFromSemanticId(semanticId: string): string | null {
  const parsed = parseSemanticId(semanticId);
  return parsed?.version ?? null;
}

/**
 * Extracts the model name from a semantic ID
 * 
 * @param semanticId - The semantic ID
 * @returns The model name or null if invalid
 * 
 * @example
 * ```typescript
 * extractModelNameFromSemanticId('urn:samm:io.catenax.us_tariff_information:1.0.0#UsTariffInformation');
 * // Returns: 'UsTariffInformation'
 * ```
 */
export function extractModelNameFromSemanticId(semanticId: string): string | null {
  const parsed = parseSemanticId(semanticId);
  return parsed?.modelName ?? null;
}

/**
 * Extracts the namespace from a semantic ID
 * 
 * @param semanticId - The semantic ID
 * @returns The namespace or null if invalid
 * 
 * @example
 * ```typescript
 * extractNamespaceFromSemanticId('urn:samm:io.catenax.us_tariff_information:1.0.0#UsTariffInformation');
 * // Returns: 'us_tariff_information'
 * ```
 */
export function extractNamespaceFromSemanticId(semanticId: string): string | null {
  const parsed = parseSemanticId(semanticId);
  return parsed?.namespace ?? null;
}

/**
 * Checks if a semantic ID matches a specific model type
 * 
 * @param semanticId - The semantic ID to check
 * @param namespace - The expected namespace
 * @param modelName - The expected model name
 * @returns True if the semantic ID matches the specified model
 * 
 * @example
 * ```typescript
 * isSemanticIdForModel(
 *   'urn:samm:io.catenax.us_tariff_information:1.0.0#UsTariffInformation',
 *   'us_tariff_information',
 *   'UsTariffInformation'
 * );
 * // Returns: true
 * ```
 */
export function isSemanticIdForModel(
  semanticId: string, 
  namespace: string, 
  modelName: string
): boolean {
  const parsed = parseSemanticId(semanticId);
  return parsed?.namespace === namespace && parsed?.modelName === modelName;
}

/**
 * Checks if a semantic ID is valid Catena-X format
 * 
 * @param semanticId - The semantic ID to validate
 * @returns True if the semantic ID is valid
 * 
 * @example
 * ```typescript
 * isValidSemanticId('urn:samm:io.catenax.us_tariff_information:1.0.0#UsTariffInformation');
 * // Returns: true
 * 
 * isValidSemanticId('invalid-id');
 * // Returns: false
 * ```
 */
export function isValidSemanticId(semanticId: string): boolean {
  return parseSemanticId(semanticId) !== null;
}

/**
 * Creates a semantic ID from components
 * 
 * @param namespace - The namespace
 * @param version - The version
 * @param modelName - The model name
 * @returns The constructed semantic ID
 * 
 * @example
 * ```typescript
 * createSemanticId('us_tariff_information', '1.0.0', 'UsTariffInformation');
 * // Returns: 'urn:samm:io.catenax.us_tariff_information:1.0.0#UsTariffInformation'
 * ```
 */
export function createSemanticId(namespace: string, version: string, modelName: string): string {
  return `urn:samm:io.catenax.${namespace}:${version}#${modelName}`;
}

/**
 * Compares two version strings using semantic versioning rules
 * 
 * @param version1 - First version to compare
 * @param version2 - Second version to compare
 * @returns -1 if version1 < version2, 0 if equal, 1 if version1 > version2
 * 
 * @example
 * ```typescript
 * compareVersions('1.0.0', '1.1.0'); // Returns: -1
 * compareVersions('2.0.0', '1.9.9'); // Returns: 1
 * compareVersions('1.0.0', '1.0.0'); // Returns: 0
 * ```
 */
export function compareVersions(version1: string, version2: string): number {
  const parts1 = version1.split('.').map(Number);
  const parts2 = version2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const part1 = parts1[i] || 0;
    const part2 = parts2[i] || 0;
    
    if (part1 < part2) return -1;
    if (part1 > part2) return 1;
  }
  
  return 0;
}

/**
 * Gets the latest version from a list of semantic IDs for the same model
 * 
 * @param semanticIds - Array of semantic IDs
 * @param namespace - The namespace to filter by
 * @param modelName - The model name to filter by
 * @returns The semantic ID with the latest version, or null if none found
 * 
 * @example
 * ```typescript
 * const ids = [
 *   'urn:samm:io.catenax.us_tariff_information:1.0.0#UsTariffInformation',
 *   'urn:samm:io.catenax.us_tariff_information:1.1.0#UsTariffInformation',
 *   'urn:samm:io.catenax.us_tariff_information:2.0.0#UsTariffInformation'
 * ];
 * getLatestVersionSemanticId(ids, 'us_tariff_information', 'UsTariffInformation');
 * // Returns: 'urn:samm:io.catenax.us_tariff_information:2.0.0#UsTariffInformation'
 * ```
 */
export function getLatestVersionSemanticId(
  semanticIds: string[], 
  namespace: string, 
  modelName: string
): string | null {
  const matchingIds = semanticIds.filter(id => 
    isSemanticIdForModel(id, namespace, modelName)
  );
  
  if (matchingIds.length === 0) {
    return null;
  }
  
  return matchingIds.reduce((latest, current) => {
    const latestVersion = extractVersionFromSemanticId(latest);
    const currentVersion = extractVersionFromSemanticId(current);
    
    if (!latestVersion || !currentVersion) {
      return latest;
    }
    
    return compareVersions(currentVersion, latestVersion) > 0 ? current : latest;
  });
}
