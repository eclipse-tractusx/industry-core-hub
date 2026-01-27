/********************************************************************************
 * Eclipse Tractus-X - Industry Core Hub Frontend
 *
 * Copyright (c) 2025 LKS Next
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
 * Path Normalizer Utility
 * 
 * Handles bidirectional conversion between:
 * - Schema paths with [item] placeholder (e.g., "materialList.processing[item].processingCountry")
 * - Data paths with numeric indices (e.g., "materialList[0].processing[0].processingCountry")
 * 
 * This is essential for matching validation errors (which use numeric indices) 
 * with form fields (which use [item] placeholders in their keys).
 */

/**
 * Converts a path with numeric indices to a schema path with [item] placeholders
 * Example: "materialList[0].processing[1].country" -> "materialList.processing[item].country"
 * 
 * @param dataPath - Path with numeric array indices
 * @returns Schema path with [item] placeholders
 */
export function dataPathToSchemaPath(dataPath: string): string {
  // Replace [N] with nothing (remove array indices) but keep the structure
  // "materialList[0].processing[1].country" -> "materialList.processing.country"
  return dataPath.replace(/\[\d+\]/g, '');
}

/**
 * Converts a path with numeric indices to a template path with [item] placeholders
 * Example: "materialList[0].processing[1].country" -> "materialList[item].processing[item].country"
 * 
 * @param dataPath - Path with numeric array indices
 * @returns Path with [item] placeholders instead of numeric indices
 */
export function dataPathToTemplatePath(dataPath: string): string {
  return dataPath.replace(/\[\d+\]/g, '[item]');
}

/**
 * Removes all array notation from a path (both [N] and [item])
 * Example: "materialList[0].processing[item].country" -> "materialList.processing.country"
 * 
 * @param path - Path with any array notation
 * @returns Clean path without array notation
 */
export function removeArrayNotation(path: string): string {
  return path.replace(/\[\d+\]/g, '').replace(/\[item\]/g, '');
}

/**
 * Extracts all array indices from a path
 * Example: "materialList[0].processing[2].items[5]" -> [0, 2, 5]
 * 
 * @param path - Path with numeric array indices
 * @returns Array of indices found in the path
 */
export function extractArrayIndices(path: string): number[] {
  const matches = path.match(/\[(\d+)\]/g);
  if (!matches) return [];
  return matches.map(m => parseInt(m.replace(/[\[\]]/g, ''), 10));
}

/**
 * Checks if two paths match, ignoring array indices
 * Handles comparison between paths with [item], [N], or no array notation
 * 
 * Example matches:
 * - "materials[0].name" matches "materials.name"
 * - "materials[0].name" matches "materials[item].name"
 * - "a[0].b[1].c" matches "a.b.c"
 * 
 * @param path1 - First path
 * @param path2 - Second path
 * @returns true if paths match ignoring array indices
 */
export function pathsMatch(path1: string, path2: string): boolean {
  const normalized1 = removeArrayNotation(path1);
  const normalized2 = removeArrayNotation(path2);
  return normalized1 === normalized2;
}

/**
 * Checks if a path starts with another path (for parent-child relationships)
 * 
 * Example:
 * - pathStartsWith("materials[0].name", "materials") -> true
 * - pathStartsWith("materials[0].processing[1].country", "materials.processing") -> true
 * 
 * @param childPath - The potentially nested path
 * @param parentPath - The potential parent path
 * @returns true if childPath starts with parentPath
 */
export function pathStartsWith(childPath: string, parentPath: string): boolean {
  const normalizedChild = removeArrayNotation(childPath);
  const normalizedParent = removeArrayNotation(parentPath);
  
  // Check if child starts with parent
  if (!normalizedChild.startsWith(normalizedParent)) {
    return false;
  }
  
  // Ensure it's a proper parent (not just a partial match)
  const remainder = normalizedChild.slice(normalizedParent.length);
  return remainder === '' || remainder.startsWith('.');
}

/**
 * Generates all possible path variants for error matching
 * This helps match errors to fields regardless of how the path is formatted
 * 
 * @param errorPath - The path from an error message
 * @returns Array of all possible path variants to check
 */
export function generatePathVariants(errorPath: string): string[] {
  const variants = new Set<string>();
  
  // Original path
  variants.add(errorPath);
  
  // Without array indices
  variants.add(dataPathToSchemaPath(errorPath));
  
  // With [item] placeholders
  variants.add(dataPathToTemplatePath(errorPath));
  
  // Also add each segment progressively for parent matching
  const parts = errorPath.split('.');
  let accumulated = '';
  for (const part of parts) {
    accumulated = accumulated ? `${accumulated}.${part}` : part;
    variants.add(accumulated);
    variants.add(dataPathToSchemaPath(accumulated));
    variants.add(dataPathToTemplatePath(accumulated));
  }
  
  return Array.from(variants);
}

/**
 * Extracts the field key from an error message
 * Handles various error message formats from validation
 * 
 * @param error - Error message string
 * @returns Extracted field key or null if not found
 */
export function extractFieldKeyFromError(error: string): string | null {
  // Patterns to extract field paths from error messages
  const patterns = [
    // Direct path patterns (with potential array indices)
    /^([\w.\[\]]+)\s+is required/i,
    /^([\w.\[\]]+)\s+must be/i,
    /^([\w.\[\]]+)\s+format is invalid/i,
    /^([\w.\[\]]+)\s+should match pattern/i,
    /^([\w.\[\]]+)\s+must have at least/i,
    /^([\w.\[\]]+)\s+must have at most/i,
    // Quoted patterns
    /Field '([^']+)'/i,
    /Field "([^"]+)"/i,
    /'([^']+)'\s+is required/i,
    /"([^"]+)"\s+is required/i,
  ];
  
  for (const pattern of patterns) {
    const match = error.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
}

/**
 * Builds a complete field path from parent path and field key
 * Handles the complexities of nested array structures
 * 
 * @param parentPath - Parent path (may include array indices)
 * @param fieldKey - Field key (may include [item] placeholders or nested path)
 * @param arrayIndex - Optional array index for the current item
 * @returns Complete resolved path
 */
export function buildFieldPath(
  parentPath: string | undefined,
  fieldKey: string,
  arrayIndex?: number
): string {
  // Get just the simple key (last part of the field key)
  const keyParts = fieldKey.split('.');
  const simpleKey = keyParts[keyParts.length - 1].replace(/\[item\]/g, '');
  
  if (!parentPath) {
    return fieldKey.replace(/\[item\]/g, arrayIndex !== undefined ? `[${arrayIndex}]` : '');
  }
  
  // If parentPath already ends with an array index, append the simple key
  return `${parentPath}.${simpleKey}`;
}

/**
 * Checks if an error applies to a specific field
 * Uses flexible matching to handle different path formats
 * 
 * @param errorPath - The path extracted from the error
 * @param fieldKey - The field's key (may have [item] placeholders)
 * @param parentPath - The parent path context (for fields in arrays)
 * @returns true if the error applies to this field
 */
export function errorMatchesField(
  errorPath: string,
  fieldKey: string,
  parentPath?: string
): boolean {
  // Build the expected path for this field
  const expectedPath = parentPath 
    ? buildFieldPath(parentPath, fieldKey)
    : fieldKey;
  
  // Direct match
  if (pathsMatch(errorPath, expectedPath)) {
    return true;
  }
  
  // Check if error path matches the simple field key
  const simpleKey = fieldKey.split('.').pop()?.replace(/\[item\]/g, '') || '';
  const errorSimpleKey = errorPath.split('.').pop()?.replace(/\[\d+\]/g, '') || '';
  
  if (simpleKey === errorSimpleKey) {
    // Verify parent context matches
    const errorParent = errorPath.split('.').slice(0, -1).join('.');
    const expectedParent = expectedPath.split('.').slice(0, -1).join('.');
    
    if (pathsMatch(errorParent, expectedParent)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Groups errors by their root section for display
 * 
 * @param errors - Array of error messages
 * @returns Map of section name to errors
 */
export function groupErrorsBySection(errors: string[]): Map<string, string[]> {
  const grouped = new Map<string, string[]>();
  
  for (const error of errors) {
    const fieldKey = extractFieldKeyFromError(error);
    const section = fieldKey?.split('.')[0]?.replace(/\[\d+\]/g, '') || 'General';
    
    const sectionErrors = grouped.get(section) || [];
    sectionErrors.push(error);
    grouped.set(section, sectionErrors);
  }
  
  return grouped;
}

/**
 * Creates a mapping of all possible error paths to their normalized versions
 * This is used to pre-compute error matching for performance
 * 
 * @param fieldErrors - Set of field keys that have errors
 * @param errors - Array of error messages
 * @returns Map of normalized paths to error information
 */
export interface ErrorInfo {
  originalPath: string;
  normalizedPath: string;
  errorMessages: string[];
  arrayIndices: number[];
}

export function createErrorMapping(
  fieldErrors: Set<string>,
  errors: string[]
): Map<string, ErrorInfo> {
  const mapping = new Map<string, ErrorInfo>();
  
  for (const error of errors) {
    const fieldKey = extractFieldKeyFromError(error);
    if (!fieldKey) continue;
    
    const normalizedPath = removeArrayNotation(fieldKey);
    const arrayIndices = extractArrayIndices(fieldKey);
    
    // Get or create entry
    const existing = mapping.get(normalizedPath);
    if (existing) {
      existing.errorMessages.push(error);
    } else {
      mapping.set(normalizedPath, {
        originalPath: fieldKey,
        normalizedPath,
        errorMessages: [error],
        arrayIndices
      });
    }
    
    // Also add entry for the original path with indices
    if (fieldKey !== normalizedPath && !mapping.has(fieldKey)) {
      mapping.set(fieldKey, {
        originalPath: fieldKey,
        normalizedPath,
        errorMessages: [error],
        arrayIndices
      });
    }
  }
  
  return mapping;
}
