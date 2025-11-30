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
 * Format date strings to human-readable format
 */
export const formatDate = (dateStr: string): string => {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  } catch {
    return dateStr;
  }
};

/**
 * Format numbers with appropriate decimal places
 */
export const formatNumber = (num: number, decimals: number = 2): string => {
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals
  });
};

/**
 * Format percentage values
 */
export const formatPercentage = (value: number): string => {
  return `${formatNumber(value, 0)}%`;
};

/**
 * Format value with unit
 */
export const formatWithUnit = (value: number | string, unit?: string): string => {
  if (!unit) return String(value);
  
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numValue)) return String(value);
  
  // Handle unit formatting
  const unitStr = unit.replace('unit:', '');
  return `${formatNumber(numValue)} ${unitStr}`;
};

/**
 * Convert camelCase or snake_case to Title Case
 */
export const toTitleCase = (str: string): string => {
  return str
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase())
    .trim();
};

/**
 * Truncate long text
 */
export const truncateText = (text: string, maxLength: number = 100): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

/**
 * Format boolean values
 */
export const formatBoolean = (value: boolean): string => {
  return value ? 'Yes' : 'No';
};

/**
 * Detect and format value based on type
 */
export const formatValue = (value: unknown, _type?: string, unit?: string): string => {
  if (value === null || value === undefined) return 'N/A';
  
  // Boolean
  if (typeof value === 'boolean') return formatBoolean(value);
  
  // Number
  if (typeof value === 'number') {
    if (unit) return formatWithUnit(value, unit);
    return formatNumber(value);
  }
  
  // Date pattern
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return formatDate(value);
  }
  
  // String
  if (typeof value === 'string') {
    if (unit) return formatWithUnit(value, unit);
    return value;
  }
  
  // Array
  if (Array.isArray(value)) {
    if (value.length === 0) return 'None';
    
    // For arrays of primitives, join them
    if (value.every(item => typeof item !== 'object')) {
      return value.slice(0, 3).join(', ') + (value.length > 3 ? '...' : '');
    }
    
    // For arrays of objects, try to extract meaningful info
    if (value.length === 1 && typeof value[0] === 'object' && value[0] !== null) {
      const obj = value[0] as Record<string, unknown>;
      // Try common field names
      const displayField = obj.value || obj.name || obj.label || obj.id || obj.content;
      if (displayField && typeof displayField !== 'object') {
        return String(displayField);
      }
    }
    
    return `${value.length} item${value.length !== 1 ? 's' : ''}`;
  }
  
  // Object - try to extract meaningful value
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    
    // Try common value fields
    if ('value' in obj && obj.value !== null && typeof obj.value !== 'object') {
      const val = obj.value;
      const objUnit = 'unit' in obj ? obj.unit : unit;
      return formatValue(val, _type, objUnit as string);
    }
    
    // Try other common fields
    const displayField = obj.name || obj.label || obj.id || obj.content;
    if (displayField && typeof displayField !== 'object') {
      return String(displayField);
    }
    
    // Show count of keys
    const keys = Object.keys(obj);
    if (keys.length === 0) return 'Empty';
    return `${keys.length} propert${keys.length !== 1 ? 'ies' : 'y'}`;
  }
  
  return String(value);
};
