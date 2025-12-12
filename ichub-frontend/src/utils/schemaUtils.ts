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
 * Generic schema utility functions that work with any SchemaDefinition
 * These helpers provide common operations needed for working with JSON schemas
 * in a schema-agnostic way.
 */

import { SchemaDefinition } from '../schemas';
import { FormField } from '../schemas/json-schema-interpreter';

/**
 * Gets the required fields from a schema
 * @param schema - The schema definition to extract required fields from
 * @returns Array of required form fields
 */
export function getRequiredFields(schema: SchemaDefinition | null): FormField[] {
    if (!schema) return [];
    return schema.formFields.filter(field => field.required);
}

/**
 * Gets optional (non-required) fields from a schema
 * @param schema - The schema definition to extract optional fields from
 * @returns Array of optional form fields
 */
export function getOptionalFields(schema: SchemaDefinition | null): FormField[] {
    if (!schema) return [];
    return schema.formFields.filter(field => !field.required);
}

/**
 * Groups schema fields by section
 * @param schema - The schema definition to group fields from
 * @returns Record mapping section names to arrays of fields
 */
export function getFieldGroups(schema: SchemaDefinition | null): Record<string, FormField[]> {
    if (!schema) return {};
    
    return schema.formFields.reduce((groups, field) => {
        if (!groups[field.section]) {
            groups[field.section] = [];
        }
        groups[field.section].push(field);
        return groups;
    }, {} as Record<string, FormField[]>);
}

/**
 * Gets a specific field by its key path
 * @param schema - The schema definition to search in
 * @param key - The field key (e.g., "metadata.version" or "identification.type")
 * @returns The matching form field or undefined
 */
export function getFieldByKey(schema: SchemaDefinition | null, key: string): FormField | undefined {
    if (!schema) return undefined;
    return schema.formFields.find(field => field.key === key);
}

/**
 * Extracts top-level keys from required fields for initializing form data structure
 * This helps create the initial nested object structure needed for the form
 * 
 * @param schema - The schema definition to analyze
 * @returns Set of top-level keys that should be initialized as empty objects
 * 
 * @example
 * // If required fields are: ['metadata.version', 'metadata.status', 'identification.type']
 * // Returns: Set(['metadata', 'identification'])
 */
export function getTopLevelKeysFromRequiredFields(schema: SchemaDefinition | null): Set<string> {
    if (!schema) return new Set();
    
    const requiredFields = getRequiredFields(schema);
    const topLevelKeys = new Set(
        requiredFields
            .map(field => field.key.split('.')[0])
            .filter(Boolean)
    );
    
    return topLevelKeys;
}

/**
 * Creates an initial form data object with empty structures for required top-level keys
 * This ensures the JSON editor and form have the correct structure from the start
 * 
 * @param schema - The schema definition to use
 * @returns Object with top-level keys initialized as empty objects or arrays
 */
export function createInitialFormData(schema: SchemaDefinition | null): Record<string, any> {
    if (!schema) return {};
    
    const topLevelKeys = getTopLevelKeysFromRequiredFields(schema);
    const initialData: Record<string, any> = {};
    
    topLevelKeys.forEach(key => {
        // Find the field definition to determine if it's an array or object
        const field = schema.formFields.find(f => f.key === key);
        initialData[key] = field?.type === 'array' ? [] : {};
    });
    
    return initialData;
}

/**
 * Validates data against a schema
 * @param schema - The schema definition with validation rules
 * @param data - The data to validate
 * @returns Validation result with isValid flag and error messages
 */
export function validateWithSchema(
    schema: SchemaDefinition | null, 
    data: any
): { isValid: boolean; errors: string[] } {
    if (!schema) {
        return { isValid: true, errors: [] };
    }
    
    if (schema.validate) {
        return schema.validate(data);
    }
    
    // If no validation function, consider it valid
    return { isValid: true, errors: [] };
}

/**
 * Creates default data using the schema's createDefault function if available
 * @param schema - The schema definition
 * @param params - Optional parameters to pass to the createDefault function
 * @returns Default data object
 */
export function createDefaultData(schema: SchemaDefinition | null, params?: any): any {
    if (!schema) return {};
    
    if (schema.createDefault) {
        return schema.createDefault(params);
    }
    
    // Fallback to initial form data structure
    return createInitialFormData(schema);
}

/**
 * Gets all field keys from a schema
 * @param schema - The schema definition
 * @returns Array of all field keys
 */
export function getAllFieldKeys(schema: SchemaDefinition | null): string[] {
    if (!schema) return [];
    return schema.formFields.map(field => field.key);
}

/**
 * Gets fields filtered by type
 * @param schema - The schema definition
 * @param type - The field type to filter by
 * @returns Array of fields matching the specified type
 */
export function getFieldsByType(
    schema: SchemaDefinition | null, 
    type: FormField['type']
): FormField[] {
    if (!schema) return [];
    return schema.formFields.filter(field => field.type === type);
}

/**
 * Checks if a schema has any required fields
 * @param schema - The schema definition
 * @returns True if schema has at least one required field
 */
export function hasRequiredFields(schema: SchemaDefinition | null): boolean {
    if (!schema) return false;
    return schema.formFields.some(field => field.required);
}

/**
 * Gets field count statistics for a schema
 * @param schema - The schema definition
 * @returns Object with total, required, and optional field counts
 */
export function getFieldStats(schema: SchemaDefinition | null): {
    total: number;
    required: number;
    optional: number;
} {
    if (!schema) {
        return { total: 0, required: 0, optional: 0 };
    }
    
    const required = getRequiredFields(schema).length;
    const total = schema.formFields.length;
    
    return {
        total,
        required,
        optional: total - required
    };
}
