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
 * Utility functions for cleaning JSON data for preview display.
 * Removes empty values, null values, and empty nested structures
 * to provide a clean, intuitive JSON preview that reflects only
 * the actual data entered by the user.
 */

/**
 * Checks if a value is considered "empty" and should be removed from preview
 * @param value - The value to check
 * @returns true if the value should be considered empty
 */
export function isEmptyValue(value: any): boolean {
    if (value === null || value === undefined) {
        return true;
    }
    if (typeof value === 'string' && value.trim() === '') {
        return true;
    }
    // Numbers (including 0) and booleans (including false) are NOT empty
    if (typeof value === 'number' || typeof value === 'boolean') {
        return false;
    }
    if (Array.isArray(value)) {
        return value.length === 0;
    }
    if (typeof value === 'object') {
        return Object.keys(value).length === 0;
    }
    return false;
}

/**
 * Recursively cleans an array, removing empty items and cleaning nested structures
 * @param arr - The array to clean
 * @returns Cleaned array or null if completely empty
 */
function cleanArray(arr: any[]): any[] | null {
    const cleaned: any[] = [];
    
    for (const item of arr) {
        const cleanedItem = cleanValue(item);
        // Include the item if it has meaningful content
        // For objects: include if they have at least one non-empty property
        // For primitives: include if they're not empty
        if (cleanedItem !== null) {
            cleaned.push(cleanedItem);
        }
    }
    
    return cleaned.length > 0 ? cleaned : null;
}

/**
 * Recursively cleans an object, removing empty properties and cleaning nested structures
 * @param obj - The object to clean
 * @returns Cleaned object or null if completely empty
 */
function cleanObject(obj: Record<string, any>): Record<string, any> | null {
    const cleaned: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(obj)) {
        const cleanedValue = cleanValue(value);
        if (cleanedValue !== null) {
            cleaned[key] = cleanedValue;
        }
    }
    
    return Object.keys(cleaned).length > 0 ? cleaned : null;
}

/**
 * Cleans a single value, handling all types recursively
 * @param value - The value to clean
 * @returns Cleaned value or null if empty
 */
function cleanValue(value: any): any {
    // Handle null/undefined
    if (value === null || value === undefined) {
        return null;
    }
    
    // Handle strings - empty strings are excluded
    if (typeof value === 'string') {
        return value.trim() !== '' ? value : null;
    }
    
    // Handle numbers - 0 is a valid value, keep it
    if (typeof value === 'number') {
        return value;
    }
    
    // Handle booleans - false is a valid value, keep it
    if (typeof value === 'boolean') {
        return value;
    }
    
    // Handle arrays
    if (Array.isArray(value)) {
        return cleanArray(value);
    }
    
    // Handle objects
    if (typeof value === 'object') {
        return cleanObject(value);
    }
    
    // Any other type, return as-is
    return value;
}

/**
 * Cleans JSON data for preview display by removing:
 * - Empty strings ('')
 * - Null values
 * - Undefined values
 * - Empty objects ({}) - recursively
 * - Empty arrays ([])
 * - Object keys that lead to empty values
 * 
 * This ensures the JSON Preview shows only the actual data entered by the user,
 * providing a clean and intuitive representation of the form state.
 * 
 * @param data - The raw form data to clean
 * @returns Cleaned data object suitable for preview, or empty object if all empty
 * 
 * @example
 * // Input:
 * {
 *   metadata: { version: "1.0", status: "" },
 *   identification: {},
 *   items: [{ name: "Test", value: null }, { name: "", value: "" }]
 * }
 * 
 * // Output:
 * {
 *   metadata: { version: "1.0" },
 *   items: [{ name: "Test" }]
 * }
 */
export function cleanJsonForPreview(data: any): any {
    if (data === null || data === undefined) {
        return {};
    }
    
    if (typeof data !== 'object') {
        return data;
    }
    
    const cleaned = cleanValue(data);
    return cleaned ?? {};
}

/**
 * Checks if the cleaned data has any meaningful content
 * @param data - The data to check (raw or cleaned)
 * @returns true if there is meaningful content to display
 */
export function hasContent(data: any): boolean {
    const cleaned = cleanJsonForPreview(data);
    return Object.keys(cleaned).length > 0;
}
