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

import { SemanticVersion, VersionRange, ParsedSemanticId } from '../types';

/**
 * Parse a semantic ID string into its components
 * Format: urn:(samm|bamm):namespace:version#fragment
 * Examples: 
 * - urn:samm:io.catenax.us_tariff_information:1.0.0#UsTariffInformation
 * - urn:bamm:io.catenax.single_level_bom_as_built:3.0.0#SingleLevelBomAsBuilt
 */
export function parseSemanticId(semanticId: string): ParsedSemanticId | null {
  try {
    // Regular expression to parse URN SAMM/BAMM format
    const pattern = /^urn:(samm|bamm):([^:]+):(\d+)\.(\d+)\.(\d+)(?:#(.+))?$/;
    const match = semanticId.match(pattern);
    
    if (!match) {
      console.warn(`Invalid semantic ID format: ${semanticId}`);
      return null;
    }

    const [, prefix, namespace, major, minor, patch, fragment] = match;
    
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
      fragment,
      originalId: semanticId
    };
  } catch (error) {
    console.error(`Error parsing semantic ID: ${semanticId}`, error);
    return null;
  }
}

/**
 * Compare two semantic versions
 * Returns: -1 if a < b, 0 if a === b, 1 if a > b
 */
export function compareVersions(a: SemanticVersion, b: SemanticVersion): number {
  if (a.major !== b.major) {
    return a.major - b.major;
  }
  if (a.minor !== b.minor) {
    return a.minor - b.minor;
  }
  return a.patch - b.patch;
}

/**
 * Check if a version is within a given range
 */
export function isVersionInRange(version: SemanticVersion, range: VersionRange): boolean {
  // Check exact version match first
  if (range.exact) {
    return compareVersions(version, range.exact) === 0;
  }

  // Check minimum version
  if (range.min && compareVersions(version, range.min) < 0) {
    return false;
  }

  // Check maximum version
  if (range.max && compareVersions(version, range.max) > 0) {
    return false;
  }

  return true;
}

/**
 * Check if two versions are compatible (same major version)
 */
export function areVersionsCompatible(a: SemanticVersion, b: SemanticVersion): boolean {
  return a.major === b.major;
}

/**
 * Format a semantic version as a string
 */
export function formatVersion(version: SemanticVersion): string {
  return `${version.major}.${version.minor}.${version.patch}`;
}

/**
 * Format a version range as a string
 */
export function formatVersionRange(range: VersionRange): string {
  if (range.exact) {
    return formatVersion(range.exact);
  }

  const parts: string[] = [];
  if (range.min) {
    parts.push(`>= ${formatVersion(range.min)}`);
  }
  if (range.max) {
    parts.push(`<= ${formatVersion(range.max)}`);
  }

  return parts.length > 0 ? parts.join(' && ') : '*';
}

/**
 * Create a version range for backward compatibility
 * Supports same major version with any minor/patch
 */
export function createCompatibleVersionRange(version: SemanticVersion): VersionRange {
  return {
    min: { major: version.major, minor: 0, patch: 0 },
    max: { major: version.major, minor: Number.MAX_SAFE_INTEGER, patch: Number.MAX_SAFE_INTEGER }
  };
}

/**
 * Create a version range for exact version match
 */
export function createExactVersionRange(version: SemanticVersion): VersionRange {
  return {
    exact: version
  };
}

/**
 * Create a version range for a specific version range
 */
export function createVersionRange(min?: SemanticVersion, max?: SemanticVersion): VersionRange {
  return { min, max };
}
