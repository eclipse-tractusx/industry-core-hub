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
 * Generic utilities for working with Catena-X semantic models
 */

import { ParsedSemanticId } from '@/features/industry-core-kit/part-discovery/components/submodel-addons/types';
import { compareVersions } from '@/features/industry-core-kit/part-discovery/components/submodel-addons/utils/version-utils';

/**
 * Semantic model constants
 */
export const SEMANTIC_MODEL_CONSTANTS = {
  SAMM_PREFIX: 'urn:samm:',
  BAMM_PREFIX: 'urn:bamm:',
  NAMESPACE_PREFIX: 'io.catenax.',
  SEPARATOR: ':',
  FRAGMENT_SEPARATOR: '#',
} as const;

/**
 * Creates a semantic ID string from its components
 * 
 * @param namespace - The namespace (e.g., 'us_tariff_information')
 * @param version - The version (e.g., '1.0.0')
 * @param modelName - The model name (e.g., 'UsTariffInformation')
 * @param useBAMM - Whether to use BAMM prefix instead of SAMM (default: false)
 * @returns The complete semantic ID
 */
export function createSemanticId(namespace: string, version: string, modelName: string, useBAMM = false): string {
  const prefix = useBAMM ? SEMANTIC_MODEL_CONSTANTS.BAMM_PREFIX : SEMANTIC_MODEL_CONSTANTS.SAMM_PREFIX;
  return `${prefix}${SEMANTIC_MODEL_CONSTANTS.NAMESPACE_PREFIX}${namespace}${SEMANTIC_MODEL_CONSTANTS.SEPARATOR}${version}${SEMANTIC_MODEL_CONSTANTS.FRAGMENT_SEPARATOR}${modelName}`;
}

/**
 * Parses a semantic ID string into its components
 * 
 * @param semanticId - The semantic ID to parse
 * @returns Parsed components or null if invalid
 */
export function parseSemanticId(semanticId: string): ParsedSemanticId | null {
  try {
    // Expected format: urn:(samm|bamm):io.catenax.namespace:version#ModelName
    const regex = /^urn:(samm|bamm):io\.catenax\.([^:]+):(\d+)\.(\d+)\.(\d+)#(.+)$/;
    const match = semanticId.match(regex);
    
    if (!match) {
      return null;
    }
    
    const [, prefix, namespace, major, minor, patch, modelName] = match;
    
    // Extract the actual name from namespace (last part after dots)
    const namespaceParts = namespace.split('.');
    const name = namespaceParts[namespaceParts.length - 1];
    
    return {
      prefix: prefix as 'samm' | 'bamm',
      namespace,
      name,
      version: {
        major: parseInt(major, 10),
        minor: parseInt(minor, 10),
        patch: parseInt(patch, 10)
      },
      fragment: modelName,
      originalId: semanticId,
    };
  } catch {
    return null;
  }
}

/**
 * Checks if a semantic ID belongs to a specific model (any version)
 * 
 * @param semanticId - The semantic ID to check
 * @param namespace - The expected namespace
 * @param modelName - The expected model name
 * @returns True if the semantic ID matches the namespace and model name
 */
export function isSemanticIdForModel(semanticId: string, namespace: string, modelName: string): boolean {
  const parsed = parseSemanticId(semanticId);
  return parsed !== null && parsed.namespace === namespace && parsed.fragment === modelName;
}

/**
 * Checks if a semantic ID matches a specific version of a model
 * 
 * @param semanticId - The semantic ID to check
 * @param namespace - The expected namespace
 * @param version - The expected version as SemanticVersion object
 * @param modelName - The expected model name
 * @returns True if the semantic ID matches all components
 */
export function isSemanticIdForModelVersion(
  semanticId: string, 
  namespace: string, 
  version: { major: number; minor: number; patch: number }, 
  modelName: string
): boolean {
  const parsed = parseSemanticId(semanticId);
  return (
    parsed !== null && 
    parsed.namespace === namespace && 
    parsed.version.major === version.major &&
    parsed.version.minor === version.minor &&
    parsed.version.patch === version.patch &&
    parsed.fragment === modelName
  );
}

/**
 * Extracts the version from a semantic ID
 * 
 * @param semanticId - The semantic ID to extract version from
 * @returns The version string or null if invalid
 */
export function getSemanticIdVersion(semanticId: string): string | null {
  const parsed = parseSemanticId(semanticId);
  return parsed ? `${parsed.version.major}.${parsed.version.minor}.${parsed.version.patch}` : null;
}

/**
 * Validates if a semantic ID follows the Catena-X SAMM format
 * 
 * @param semanticId - The semantic ID to validate
 * @returns True if the semantic ID is valid
 */
export function isValidSemanticId(semanticId: string): boolean {
  return parseSemanticId(semanticId) !== null;
}

/**
 * Gets all supported versions for a specific model from a list of semantic IDs
 * 
 * @param semanticIds - Array of semantic IDs to filter
 * @param namespace - The namespace to filter by
 * @param modelName - The model name to filter by
 * @returns Array of versions sorted in ascending order
 */
export function getSupportedVersionsForModel(
  semanticIds: string[], 
  namespace: string, 
  modelName: string
): string[] {
  return semanticIds
    .map(parseSemanticId)
    .filter((parsed): parsed is ParsedSemanticId => 
      parsed !== null && 
      parsed.namespace === namespace && 
      parsed.fragment === modelName
    )
    .map(parsed => `${parsed.version.major}.${parsed.version.minor}.${parsed.version.patch}`)
    .sort((a, b) => {
      // Convert string versions to SemanticVersion objects for comparison
      const versionA = { major: parseInt(a.split('.')[0]), minor: parseInt(a.split('.')[1]), patch: parseInt(a.split('.')[2]) };
      const versionB = { major: parseInt(b.split('.')[0]), minor: parseInt(b.split('.')[1]), patch: parseInt(b.split('.')[2]) };
      return compareVersions(versionA, versionB);
    });
}
