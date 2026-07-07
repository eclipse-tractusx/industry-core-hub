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
 * UNIFIED VALIDATION ERROR MANAGER
 * 
 * This module provides a single source of truth for validation errors.
 * It parses error messages, extracts field metadata, and provides consistent
 * data structures for both the form (red highlighting) and the ErrorViewer.
 * 
 * KEY DESIGN PRINCIPLES:
 * 1. Parse once, use everywhere - errors are parsed into structured objects immediately
 * 2. Path normalization is centralized - no duplicate logic across components
 * 3. Schema-aware lookup - finds field metadata even in deeply nested structures
 * 4. Support all field types - primitives, arrays, objects, selects, nested items
 */

import { FormField } from '../schemas/json-schema-interpreter';
import { SchemaDefinition } from '../schemas';

/**
 * Structured validation error with all metadata needed for display and navigation
 */
export interface StructuredValidationError {
  /** Original error message from validation */
  originalMessage: string;
  /** User-friendly display message */
  displayMessage: string;
  /** Full path with array indices: "materials.substancesOfConcern.content[0].id" */
  fullPath: string;
  /** Normalized path without indices: "materials.substancesOfConcern.content.id" */
  normalizedPath: string;
  /** Schema path with [item] placeholders: "materials.substancesOfConcern.content[item].id" */
  schemaPath: string;
  /** Field key as defined in schema (may differ from fullPath for nested items) */
  fieldKey: string;
  /** Human-readable field label */
  fieldLabel: string;
  /** Section name for grouping */
  section: string;
  /** Error severity */
  severity: 'error' | 'warning' | 'info';
  /** Array index if this error is for an array item */
  arrayIndex?: number;
  /** All array indices in the path */
  arrayIndices: number[];
  /** Parent path for context */
  parentPath: string;
  /** Field type from schema */
  fieldType?: string;
  /** Whether field is required */
  isRequired?: boolean;
  /** URN from schema if available */
  urn?: string;
}

/**
 * Result of validation error processing
 */
export interface ValidationErrorResult {
  /** All structured errors */
  errors: StructuredValidationError[];
  /** Errors grouped by section */
  errorsBySection: Map<string, StructuredValidationError[]>;
  /** Errors indexed by full path (for form highlighting) */
  errorsByPath: Map<string, StructuredValidationError[]>;
  /** Errors indexed by normalized path */
  errorsByNormalizedPath: Map<string, StructuredValidationError[]>;
  /** Set of all paths with errors (including parents) - for quick lookup */
  pathsWithErrors: Set<string>;
  /** Set of all normalized paths with errors */
  normalizedPathsWithErrors: Set<string>;
  /** Set of direct error paths only (NOT including parents) - for marking items in red */
  directErrorPaths: Set<string>;
  /** Set of direct error paths normalized */
  directErrorPathsNormalized: Set<string>;
  /** Set of sections with errors */
  sectionsWithErrors: Set<string>;
  /** Total error count */
  totalErrors: number;
  /** Whether validation passed */
  isValid: boolean;
}

/**
 * All regex patterns for extracting field paths from error messages
 * Ordered by specificity - more specific patterns first
 */
const ERROR_PATH_PATTERNS: RegExp[] = [
  // Full path patterns (with potential array indices)
  /^([\w.\[\]]+)\s+is required/i,
  /^([\w.\[\]]+)\s+must be at least/i,
  /^([\w.\[\]]+)\s+must be at most/i,
  /^([\w.\[\]]+)\s+must be greater than/i,
  /^([\w.\[\]]+)\s+must be less than/i,
  /^([\w.\[\]]+)\s+must be a multiple of/i,
  /^([\w.\[\]]+)\s+must be one of:/i,
  /^([\w.\[\]]+)\s+must be exactly:/i,
  /^([\w.\[\]]+)\s+must be a valid/i,
  /^([\w.\[\]]+)\s+must be an array/i,
  /^([\w.\[\]]+)\s+must be an object/i,
  /^([\w.\[\]]+)\s+must have at least/i,
  /^([\w.\[\]]+)\s+must have at most/i,
  /^([\w.\[\]]+)\s+items must be unique/i,
  /^([\w.\[\]]+)\s+format is invalid/i,
  /^([\w.\[\]]+)\s+must be in/i,
  // Legacy quoted patterns
  /Field '([^']+)'/i,
  /Field "([^"]+)"/i,
  /'([^']+)'\s+is required/i,
  /"([^"]+)"\s+is required/i,
  /property\s+'([^']+)'/i,
];

/**
 * Normalize a path by removing array indices
 * "materials[0].content[1].id" -> "materials.content.id"
 */
export function normalizePath(path: string): string {
  return path.replace(/\[\d+\]/g, '').replace(/\[item\]/g, '');
}

/**
 * Convert a path with numeric indices to schema path with [item]
 * "materials[0].content[1].id" -> "materials[item].content[item].id"
 */
export function toSchemaPath(path: string): string {
  return path.replace(/\[\d+\]/g, '[item]');
}

/**
 * Extract all array indices from a path
 * "materials[0].content[2].items[1]" -> [0, 2, 1]
 */
export function extractArrayIndices(path: string): number[] {
  const indices: number[] = [];
  const regex = /\[(\d+)\]/g;
  let match;
  while ((match = regex.exec(path)) !== null) {
    indices.push(parseInt(match[1], 10));
  }
  return indices;
}

/**
 * Get parent path from a full path
 * "materials.content[0].id" -> "materials.content[0]"
 */
export function getParentPath(path: string): string {
  const lastDotIndex = path.lastIndexOf('.');
  if (lastDotIndex === -1) return '';
  return path.substring(0, lastDotIndex);
}

/**
 * Get all parent paths from a path (for highlighting parent containers)
 * "a.b[0].c.d" -> ["a", "a.b", "a.b[0]", "a.b[0].c"]
 */
export function getAllParentPaths(path: string): string[] {
  const parents: string[] = [];
  const parts = path.split('.');
  
  let accumulated = '';
  for (let i = 0; i < parts.length - 1; i++) {
    accumulated = accumulated ? `${accumulated}.${parts[i]}` : parts[i];
    parents.push(accumulated);
    // Also add normalized version if different
    const normalized = normalizePath(accumulated);
    if (normalized !== accumulated && !parents.includes(normalized)) {
      parents.push(normalized);
    }
  }
  
  return parents;
}

/**
 * Extract field path from an error message
 */
function extractPathFromError(error: string): string | null {
  for (const pattern of ERROR_PATH_PATTERNS) {
    const match = error.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
}

/**
 * Generate a human-readable label from a field key
 */
function generateLabel(key: string): string {
  // Get the last part of the path
  const simpleName = key.includes('.') ? key.split('.').pop()! : key;
  // Remove [item] or [n] placeholders
  const cleanName = simpleName.replace(/\[\w+\]/g, '');
  // Convert camelCase/PascalCase to Title Case
  return cleanName
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .replace(/Id$/, ' ID')
    .trim();
}

/**
 * Deep search for a field in the schema structure
 * Handles itemFields, objectFields, and direct matches
 */
function findFieldInSchema(
  searchPath: string,
  formFields: FormField[],
  parentSection: string = 'General'
): { field: FormField; section: string } | null {
  const normalizedSearch = normalizePath(searchPath);
  const schemaSearch = toSchemaPath(searchPath);
  
  /**
   * Recursive helper to search through nested field structures
   */
  function searchRecursive(
    fields: FormField[],
    currentSection: string,
    _parentPath: string = ''
  ): { field: FormField; section: string } | null {
    for (const field of fields) {
      const fieldNormalized = normalizePath(field.key);
      const fieldSection = field.section || currentSection;
      
      // Direct match checks
      if (
        field.key === searchPath ||
        field.key === normalizedSearch ||
        field.key === schemaSearch ||
        fieldNormalized === normalizedSearch
      ) {
        return { field, section: fieldSection };
      }
      
      // Check if the search path ends with this field's simple key
      const simpleKey = field.key.includes('.') 
        ? field.key.split('.').pop()!.replace(/\[item\]/g, '')
        : field.key.replace(/\[item\]/g, '');
      
      const searchSimpleKey = normalizedSearch.includes('.')
        ? normalizedSearch.split('.').pop()!
        : normalizedSearch;
      
      // Match by simple key if parent context also matches
      if (simpleKey === searchSimpleKey) {
        const searchParent = getParentPath(normalizedSearch);
        const fieldParent = normalizePath(getParentPath(field.key));
        
        if (
          searchParent === fieldParent ||
          searchParent.endsWith(fieldParent) ||
          fieldParent.endsWith(searchParent) ||
          fieldParent === '' ||
          searchParent === ''
        ) {
          return { field, section: fieldSection };
        }
      }
      
      // Search in objectFields
      if (field.objectFields && field.objectFields.length > 0) {
        const result = searchRecursive(
          field.objectFields, 
          fieldSection,
          field.key
        );
        if (result) return result;
      }
      
      // Search in itemFields (for arrays)
      if (field.itemFields && field.itemFields.length > 0) {
        const result = searchRecursive(
          field.itemFields, 
          fieldSection,
          field.key
        );
        if (result) return result;
      }
    }
    
    return null;
  }
  
  // Start recursive search
  const result = searchRecursive(formFields, parentSection);
  if (result) return result;
  
  // Fallback: try to match by the last segment of the path
  const lastSegment = normalizedSearch.split('.').pop();
  if (lastSegment) {
    const lastSegmentLower = lastSegment.toLowerCase();
    function searchByLastSegment(fields: FormField[], section: string): { field: FormField; section: string } | null {
      for (const field of fields) {
        const fieldSimple = field.key.includes('.') 
          ? field.key.split('.').pop()!.replace(/\[item\]/g, '')
          : field.key.replace(/\[item\]/g, '');
        
        if (fieldSimple.toLowerCase() === lastSegmentLower ||
            field.label.toLowerCase() === lastSegmentLower) {
          return { field, section: field.section || section };
        }
        
        if (field.objectFields) {
          const result = searchByLastSegment(field.objectFields, field.section || section);
          if (result) return result;
        }
        
        if (field.itemFields) {
          const result = searchByLastSegment(field.itemFields, field.section || section);
          if (result) return result;
        }
      }
      return null;
    }
    
    return searchByLastSegment(formFields, parentSection);
  }
  
  return null;
}

/**
 * Create a user-friendly display message from an error
 */
function createDisplayMessage(
  originalMessage: string,
  fieldLabel: string,
  arrayIndex?: number
): string {
  // Try to replace the path with the label in the message
  let displayMessage = originalMessage;
  
  // Extract the path from the message
  const pathMatch = originalMessage.match(/^([\w.\[\]]+)\s+/);
  if (pathMatch) {
    displayMessage = originalMessage.replace(pathMatch[1], fieldLabel);
  }
  
  // Add array index context if present
  if (arrayIndex !== undefined && !displayMessage.includes('item')) {
    displayMessage += ` (item ${arrayIndex + 1})`;
  }
  
  return displayMessage;
}

/**
 * Determine section from path when no schema match is found
 */
function inferSectionFromPath(path: string): string {
  const normalizedPath = normalizePath(path);
  const topLevel = normalizedPath.split('.')[0];
  return generateLabel(topLevel);
}

/**
 * MAIN FUNCTION: Process validation errors into structured format
 * This is the single source of truth for all error information
 */
export function processValidationErrors(
  rawErrors: string[],
  schema: SchemaDefinition | null
): ValidationErrorResult {
  const errors: StructuredValidationError[] = [];
  const errorsBySection = new Map<string, StructuredValidationError[]>();
  const errorsByPath = new Map<string, StructuredValidationError[]>();
  const errorsByNormalizedPath = new Map<string, StructuredValidationError[]>();
  const pathsWithErrors = new Set<string>();
  const normalizedPathsWithErrors = new Set<string>();
  const directErrorPaths = new Set<string>();
  const directErrorPathsNormalized = new Set<string>();
  const sectionsWithErrors = new Set<string>();
  
  // Deduplicate raw errors
  const uniqueErrors = Array.from(new Set(rawErrors));
  
  for (const rawError of uniqueErrors) {
    // Extract path from error message
    const fullPath = extractPathFromError(rawError);
    
    if (!fullPath) {
      // Error without recognizable path - add as general error
      const generalError: StructuredValidationError = {
        originalMessage: rawError,
        displayMessage: rawError,
        fullPath: '',
        normalizedPath: '',
        schemaPath: '',
        fieldKey: '',
        fieldLabel: 'General',
        section: 'General',
        severity: 'error',
        arrayIndices: [],
        parentPath: '',
      };
      errors.push(generalError);
      
      if (!errorsBySection.has('General')) {
        errorsBySection.set('General', []);
      }
      errorsBySection.get('General')!.push(generalError);
      sectionsWithErrors.add('General');
      continue;
    }
    
    // Derive all path variations
    const normalizedPath = normalizePath(fullPath);
    const schemaPath = toSchemaPath(fullPath);
    const arrayIndices = extractArrayIndices(fullPath);
    const parentPath = getParentPath(fullPath);
    const firstArrayIndex = arrayIndices.length > 0 ? arrayIndices[0] : undefined;
    
    // Find field in schema
    let fieldKey = fullPath;
    let fieldLabel = generateLabel(fullPath);
    let section = inferSectionFromPath(fullPath);
    let fieldType: string | undefined;
    let isRequired: boolean | undefined;
    let urn: string | undefined;
    
    if (schema?.formFields) {
      const fieldInfo = findFieldInSchema(fullPath, schema.formFields);
      if (fieldInfo) {
        fieldKey = fieldInfo.field.key;
        fieldLabel = fieldInfo.field.label;
        section = fieldInfo.section;
        fieldType = fieldInfo.field.type;
        isRequired = fieldInfo.field.required;
        urn = fieldInfo.field.urn;
      }
    }
    
    // Create structured error
    const structuredError: StructuredValidationError = {
      originalMessage: rawError,
      displayMessage: createDisplayMessage(rawError, fieldLabel, firstArrayIndex),
      fullPath,
      normalizedPath,
      schemaPath,
      fieldKey,
      fieldLabel,
      section,
      severity: 'error',
      arrayIndex: firstArrayIndex,
      arrayIndices,
      parentPath,
      fieldType,
      isRequired,
      urn,
    };
    
    errors.push(structuredError);
    
    // Index by section
    if (!errorsBySection.has(section)) {
      errorsBySection.set(section, []);
    }
    errorsBySection.get(section)!.push(structuredError);
    sectionsWithErrors.add(section);
    
    // Index by full path
    if (!errorsByPath.has(fullPath)) {
      errorsByPath.set(fullPath, []);
    }
    errorsByPath.get(fullPath)!.push(structuredError);
    pathsWithErrors.add(fullPath);
    
    // Add to direct error paths (without parents) - these are the actual errors
    directErrorPaths.add(fullPath);
    directErrorPathsNormalized.add(normalizedPath);
    
    // Index by normalized path
    if (!errorsByNormalizedPath.has(normalizedPath)) {
      errorsByNormalizedPath.set(normalizedPath, []);
    }
    errorsByNormalizedPath.get(normalizedPath)!.push(structuredError);
    normalizedPathsWithErrors.add(normalizedPath);
    
    // Add schema path variation to general path sets (for lookups/matching)
    // BUT NOT to directErrorPaths - we only want actual error paths there to avoid duplicate counting
    if (schemaPath !== fullPath && schemaPath !== normalizedPath) {
      pathsWithErrors.add(schemaPath);
      normalizedPathsWithErrors.add(normalizePath(schemaPath));
      // Note: intentionally NOT adding to directErrorPaths to prevent duplicate error counts
    }
    
    // Add all parent paths (for highlighting containers) - NOT added to directErrorPaths
    const parentPaths = getAllParentPaths(fullPath);
    for (const parent of parentPaths) {
      pathsWithErrors.add(parent);
      normalizedPathsWithErrors.add(normalizePath(parent));
    }
  }
  
  return {
    errors,
    errorsBySection,
    errorsByPath,
    errorsByNormalizedPath,
    pathsWithErrors,
    normalizedPathsWithErrors,
    directErrorPaths,
    directErrorPathsNormalized,
    sectionsWithErrors,
    totalErrors: errors.length,
    isValid: errors.length === 0,
  };
}

/**
 * Check if a field path has any errors
 * Handles matching with or without array indices
 */
export function hasErrorForPath(
  result: ValidationErrorResult,
  path: string
): boolean {
  const normalized = normalizePath(path);
  return result.pathsWithErrors.has(path) ||
         result.pathsWithErrors.has(normalized) ||
         result.normalizedPathsWithErrors.has(normalized);
}

/**
 * Get all errors for a specific path
 */
export function getErrorsForPath(
  result: ValidationErrorResult,
  path: string
): StructuredValidationError[] {
  const errors: StructuredValidationError[] = [];
  const normalized = normalizePath(path);
  
  // Check exact path
  const exactMatch = result.errorsByPath.get(path);
  if (exactMatch) {
    errors.push(...exactMatch);
  }
  
  // Check normalized path
  const normalizedMatch = result.errorsByNormalizedPath.get(normalized);
  if (normalizedMatch) {
    for (const err of normalizedMatch) {
      if (!errors.includes(err)) {
        errors.push(err);
      }
    }
  }
  
  return errors;
}

/**
 * Get section order from schema for sorting errors
 */
export function getSectionOrder(schema: SchemaDefinition | null): string[] {
  if (!schema) return [];
  
  // Use explicit config if available
  if (schema.sectionConfig?.order) {
    return schema.sectionConfig.order;
  }
  
  // Extract from form fields in order
  const sections: string[] = [];
  const seen = new Set<string>();
  
  for (const field of schema.formFields || []) {
    if (!seen.has(field.section)) {
      seen.add(field.section);
      sections.push(field.section);
    }
  }
  
  return sections;
}

/**
 * Sort errors by section order
 */
export function sortErrorsBySection(
  errorsBySection: Map<string, StructuredValidationError[]>,
  sectionOrder: string[]
): [string, StructuredValidationError[]][] {
  const entries = Array.from(errorsBySection.entries());
  
  return entries.sort(([sectionA], [sectionB]) => {
    const indexA = sectionOrder.indexOf(sectionA);
    const indexB = sectionOrder.indexOf(sectionB);
    
    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB;
    }
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    return sectionA.localeCompare(sectionB);
  });
}
