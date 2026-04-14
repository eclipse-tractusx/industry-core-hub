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
 * COMPREHENSIVE JSON Schema Interpreter
 * Automatically generates form fields, validation, and default values from ANY JSON Schema
 * Handles: nested objects, arrays, all data types, validation rules, descriptions, required fields
 * 
 * REFACTORED VERSION:
 * - New unified tree-based system (SchemaNode)
 * - Unique deterministic identifiers for all levels
 * - Optimized recursive validation
 * - Improved error management
 * 
 * The old API is maintained for backward compatibility, but internally
 * uses the new tree system.
 */

// Re-export the new system
export { buildSchemaTree } from './json-schema-tree-builder';
export { validateSchemaTree, getValueByPath, setValueByPath } from './schema-tree-validator';
export type { SchemaNode, NodeType, PrimitiveType, ValidationError, ValidationResult } from '../models/schema-node';

export interface JSONSchemaProperty {
  type?: string | string[];
  description?: string;
  properties?: Record<string, JSONSchemaProperty>;
  items?: JSONSchemaProperty | JSONSchemaProperty[];
  additionalItems?: JSONSchemaProperty;
  enum?: any[];
  const?: any;
  pattern?: string;
  format?: string;
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number | boolean;
  exclusiveMaximum?: number | boolean;
  minLength?: number;
  maxLength?: number;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
  multipleOf?: number;
  required?: string[];
  dependencies?: Record<string, string[] | JSONSchemaProperty>;
  $ref?: string;
  default?: any;
  examples?: any[];
  title?: string;
  // SAMM aspect model extensions
  'x-samm-aspect-model-urn'?: string;
  // JSON Schema draft-specific
  allOf?: JSONSchemaProperty[];
  anyOf?: JSONSchemaProperty[];
  oneOf?: JSONSchemaProperty[];
  not?: JSONSchemaProperty;
  if?: JSONSchemaProperty;
  then?: JSONSchemaProperty;
  else?: JSONSchemaProperty;
}

export interface JSONSchema {
  $schema?: string;
  $id?: string;
  title?: string;
  description?: string;
  type?: string;
  properties?: Record<string, JSONSchemaProperty>;
  patternProperties?: Record<string, JSONSchemaProperty>;
  additionalProperties?: boolean | JSONSchemaProperty;
  items?: JSONSchemaProperty | JSONSchemaProperty[];
  additionalItems?: JSONSchemaProperty;
  required?: string[];
  dependencies?: Record<string, string[] | JSONSchemaProperty>;
  enum?: any[];
  const?: any;
  // Component definitions
  components?: {
    schemas?: Record<string, JSONSchemaProperty>;
  };
  definitions?: Record<string, JSONSchemaProperty>;
  // Schema composition
  allOf?: JSONSchemaProperty[];
  anyOf?: JSONSchemaProperty[];
  oneOf?: JSONSchemaProperty[];
  not?: JSONSchemaProperty;
  if?: JSONSchemaProperty;
  then?: JSONSchemaProperty;
  else?: JSONSchemaProperty;
}

export interface FormField {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'integer' | 'date' | 'datetime' | 'time' | 'email' | 'url' | 'password' | 'select' | 'multiselect' | 'checkbox' | 'radio' | 'array' | 'object';
  fieldCategory: 'simple' | 'complex'; // Distinguishes between primitive fields and complex structures (arrays/objects)
  sectionType?: 'primitive' | 'array' | 'object'; // Indicates if this is a top-level section and its type
  section: string;
  description?: string;
  urn?: string;
  placeholder?: string;
  required: boolean;
  readonly?: boolean;
  deprecated?: boolean;
  // Enhanced options for complex types
  options?: Array<{ value: any; label: string; description?: string }>;
  // Comprehensive validation rules
  validation?: {
    min?: number;
    max?: number;
    exclusiveMin?: number;
    exclusiveMax?: number;
    minLength?: number;
    maxLength?: number;
    minItems?: number;
    maxItems?: number;
    uniqueItems?: boolean;
    pattern?: string;
    format?: string;
    multipleOf?: number;
    enum?: any[];
    const?: any;
  };
  // Array-specific properties
  itemType?: 'string' | 'number' | 'integer' | 'boolean' | 'object' | 'array';
  itemSchema?: JSONSchemaProperty;
  itemFields?: FormField[];
  // Object-specific properties
  objectFields?: FormField[];
  // Conditional logic
  dependencies?: Record<string, any>;
  // Default and example values
  defaultValue?: any;
  examples?: any[];
}

/**
 * Converts JSON Schema property to comprehensive form field type
 */
function getFormFieldType(property: JSONSchemaProperty, resolvedProperty?: JSONSchemaProperty): FormField['type'] {
  const prop = resolvedProperty || property;
  
  // Handle arrays of types (JSON Schema allows type: ["string", "null"])
  const types = Array.isArray(prop.type) ? prop.type : [prop.type];
  const primaryType = types.find(t => t !== 'null') || types[0];
  
  // Enum/const values become select (dropdown for better UX)
  if (prop.enum && prop.enum.length > 0) {
    return 'select';
  }
  
  if (prop.const !== undefined) {
    return 'text'; // Read-only field with const value
  }
  
  // Handle arrays
  if (primaryType === 'array') {
    return 'array';
  }
  
  // Handle objects
  if (primaryType === 'object') {
    return 'object';
  }
  
  // Handle booleans
  if (primaryType === 'boolean') {
    // If there are specific enum values for boolean, use select instead
    if (prop.enum && prop.enum.length > 0) {
      return 'select';
    }
    return 'checkbox';
  }
  
  // Handle numbers
  if (primaryType === 'number') {
    return 'number';
  }
  
  if (primaryType === 'integer') {
    return 'integer';
  }
  
  // Handle strings with formats
  if (primaryType === 'string') {
    // Date/time formats
    if (prop.format === 'date') return 'date';
    if (prop.format === 'date-time') return 'datetime';
    if (prop.format === 'time') return 'time';
    
    // String formats
    if (prop.format === 'email') return 'email';
    if (prop.format === 'uri' || prop.format === 'uri-reference') return 'url';
    if (prop.format === 'password') return 'password';
    
    // Pattern-based detection
    if (prop.pattern) {
      // Date pattern
      if (prop.pattern.includes('\\d{4}-\\d{2}-\\d{2}')) return 'date';
      // Email pattern
      if (prop.pattern.includes('@')) return 'email';
      // URL pattern
      if (prop.pattern.includes('http')) return 'url';
    }
    
    // Long descriptions become textarea
    if (prop.description && prop.description.length > 200) {
      return 'textarea';
    }
    
    // Title suggests textarea
    if (prop.title && (prop.title.toLowerCase().includes('description') || 
                      prop.title.toLowerCase().includes('comment') ||
                      prop.title.toLowerCase().includes('note'))) {
      return 'textarea';
    }
    
    return 'text';
  }
  
  // Default fallback
  return 'text';
}

/**
 * Resolves $ref references in JSON Schema - handles all reference formats
 */
function resolveRef(ref: string, schema: JSONSchema): JSONSchemaProperty | null {
  if (!ref.startsWith('#/')) {
    console.warn(`External references not supported: ${ref}`);
    return null;
  }
  
  // Handle different reference paths
  if (ref.startsWith('#/components/schemas/')) {
    const schemaName = ref.replace('#/components/schemas/', '');
    const resolved = schema.components?.schemas?.[schemaName] || null;
    
    return resolved;
  }
  
  if (ref.startsWith('#/definitions/')) {
    const schemaName = ref.replace('#/definitions/', '');
    return schema.definitions?.[schemaName] || null;
  }
  
  // Handle JSON Pointer references like #/properties/metadata
  if (ref.startsWith('#/')) {
    const path = ref.substring(2).split('/');
    let current: any = schema;
    
    for (const segment of path) {
      if (current && typeof current === 'object') {
        current = current[segment];
      } else {
        return null;
      }
    }
    
    return current as JSONSchemaProperty || null;
  }
  
  return null;
}

/**
 * Generates a human-readable label from a property key
 */
function generateLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .replace(/Id$/, ' ID')
    .trim();
}

/**
 * ENHANCED FUNCTION: Creates a context-aware required fields mapping
 * This prevents field name conflicts between different schema contexts
 */
function createContextualRequiredMapping(
  properties: Record<string, JSONSchemaProperty>,
  schema: JSONSchema,
  requiredFields: string[] = [],
  parentPath: string = ''
): Map<string, boolean> {
  const requiredMapping = new Map<string, boolean>();
  
  for (const [key, property] of Object.entries(properties)) {
    const fullPath = parentPath ? `${parentPath}.${key}` : key;
    
    // CRITICAL: Check if this specific field is required in THIS context
    const isRequiredInThisContext = requiredFields.includes(key);
    requiredMapping.set(fullPath, isRequiredInThisContext);
    
    // Recursively process nested objects with their own required fields
    const resolvedProperty = resolveSchemaProperty(property, schema);
    if (resolvedProperty.type === 'object' && resolvedProperty.properties) {
      const nestedRequired = resolvedProperty.required || [];
      const nestedMapping = createContextualRequiredMapping(
        resolvedProperty.properties,
        schema,
        nestedRequired,
        fullPath
      );
      
      // Merge nested mappings
      for (const [nestedPath, nestedIsRequired] of nestedMapping.entries()) {
        requiredMapping.set(nestedPath, nestedIsRequired);
      }
    }
  }
  
  return requiredMapping;
}

/**
 * DEBUG FUNCTION: Analyzes required fields throughout the schema
 */
function debugRequiredFields(schema: JSONSchema, path: string = ''): void {
  // Debug function - console logs removed for production
  if (schema.properties) {
    Object.entries(schema.properties).forEach(([key, property]) => {
      const fullPath = path ? `${path}.${key}` : key;
      
      // Recurse into nested objects
      if (property.type === 'object' && property.properties) {
        debugRequiredFields(property as JSONSchema, fullPath);
      }
      
      // Check allOf, oneOf, anyOf
      if (property.allOf) {
        property.allOf.forEach((subSchema, index) => {
          debugRequiredFields(subSchema as JSONSchema, `${fullPath}.allOf[${index}]`);
        });
      }
      if (property.oneOf) {
        property.oneOf.forEach((subSchema, index) => {
          debugRequiredFields(subSchema as JSONSchema, `${fullPath}.oneOf[${index}]`);
        });
      }
      if (property.anyOf) {
        property.anyOf.forEach((subSchema, index) => {
          debugRequiredFields(subSchema as JSONSchema, `${fullPath}.anyOf[${index}]`);
        });
      }
    });
  }
}

/**
 * Determines the section name for grouping fields - DYNAMICALLY from schema structure
 * For top-level properties, uses the property key as section name
 * For nested properties, uses the top-level parent as section
 */
function getSectionName(key: string, property: JSONSchemaProperty, parentKey?: string, schema?: JSONSchema): string {
  // For top-level properties (no parent), use the property itself as section
  if (!parentKey) {
    // Prefer title if available
    if (property.title) {
      return property.title;
    }
    // Generate readable label from key
    return generateLabel(key);
  }
  
  // For nested properties, find the top-level parent
  const topLevelKey = key.split('.')[0];
  
  // If we have access to schema, try to get title from top-level property
  if (schema?.properties?.[topLevelKey]) {
    const topLevelProperty = schema.properties[topLevelKey];
    if (topLevelProperty.title) {
      return topLevelProperty.title;
    }
    return generateLabel(topLevelKey);
  }
  
  // Fallback: generate from top-level key
  return generateLabel(topLevelKey);
}

/**
 * ENHANCED recursive processing with context-aware required field handling
 * 
 * MAJOR IMPROVEMENT: This function now correctly handles fields with the same name in different contexts
 * by using a context-aware required field mapping system instead of simple field name matching.
 * 
 * Key Changes:
 *   - Uses full path context for required field determination
 *   - Each schema context maintains its own required fields
 *   - Prevents cross-contamination between different schema sections
 *   - Fixes issues like metadata.status vs sustainability.status confusion
 */
function processProperties(
  properties: Record<string, JSONSchemaProperty>,
  schema: JSONSchema,
  requiredFields: string[] = [],
  parentKey: string = '',
  parentSection: string = 'General Information',
  depth: number = 0
): FormField[] {
  const fields: FormField[] = [];
  
  // Prevent infinite recursion
  if (depth > 10) {
    console.warn(`Maximum recursion depth reached for ${parentKey}`);
    return fields;
  }
  
  // ENHANCED: Create contextual required fields mapping for this level
  const contextualRequiredMapping = createContextualRequiredMapping(
    properties,
    schema,
    requiredFields,
    parentKey
  );
  
  for (const [key, property] of Object.entries(properties)) {
    const fullKey = parentKey ? `${parentKey}.${key}` : key;
    
    // ENHANCED: Use contextual mapping for accurate required field determination
    const isRequired = contextualRequiredMapping.get(fullKey) || false;
    
    // Resolve all possible references and compositions
    let resolvedProperty = resolveSchemaProperty(property, schema);
    
    // Determine section - use dynamic section detection from schema structure
    const section = parentKey ? parentSection : getSectionName(key, resolvedProperty, parentKey, schema);
    
    // Handle different property types comprehensively
    const processedFields = processSchemaProperty(
      key,
      fullKey,
      resolvedProperty,
      schema,
      section,
      isRequired, // This now correctly reflects the context-specific requirement
      depth + 1
    );
    
    fields.push(...processedFields);
  }
  
  // VALIDATION: Ensure contextual mapping worked correctly for status fields
  const statusFields = fields.filter(f => f.key.includes('status'));  
  statusFields.forEach(field => {
    const mappingValue = contextualRequiredMapping.get(field.key);
    if (field.required !== mappingValue) {
      console.error(`VALIDATION ERROR: ${field.key} - field.required=${field.required} but mapping=${mappingValue}`);
    }
  });
  
  return fields;
}

/**
 * Resolves a schema property handling $ref, allOf, anyOf, oneOf, and other compositions
 */
function resolveSchemaProperty(property: JSONSchemaProperty, schema: JSONSchema): JSONSchemaProperty {
  let resolved = { ...property };
  
  // Resolve $ref
  if (property.$ref) {
    const refResolved = resolveRef(property.$ref, schema);
    if (refResolved) {
      resolved = { ...refResolved, ...resolved };
      delete resolved.$ref;
    }
  }
  
  // Handle allOf - merge all schemas
  if (property.allOf) {
    for (const subSchema of property.allOf) {
      const subResolved = resolveSchemaProperty(subSchema, schema);
      resolved = mergeSchemas(resolved, subResolved);
    }
  }
  
  // Handle oneOf - take the first schema for now (could be enhanced with UI selection)
  if (property.oneOf && property.oneOf.length > 0) {
    const firstOption = resolveSchemaProperty(property.oneOf[0], schema);
    resolved = mergeSchemas(resolved, firstOption);
  }
  
  // Handle anyOf - similar to oneOf for now
  if (property.anyOf && property.anyOf.length > 0) {
    const firstOption = resolveSchemaProperty(property.anyOf[0], schema);
    resolved = mergeSchemas(resolved, firstOption);
  }
  
  return resolved;
}

/**
 * Merges two schema properties
 */
function mergeSchemas(base: JSONSchemaProperty, overlay: JSONSchemaProperty): JSONSchemaProperty {
  const merged = { ...base, ...overlay };
  
  // Merge properties
  if (base.properties && overlay.properties) {
    merged.properties = { ...base.properties, ...overlay.properties };
  }
  
  // Merge required arrays
  if (base.required && overlay.required) {
    const combined = [...base.required, ...overlay.required];
    merged.required = combined.filter((item, index) => combined.indexOf(item) === index);
  }
  
  return merged;
}

/**
 * Processes a single schema property into form fields
 */
function processSchemaProperty(
  key: string,
  fullKey: string,
  property: JSONSchemaProperty,
  schema: JSONSchema,
  section: string,
  isRequired: boolean,
  depth: number
): FormField[] {
  const fields: FormField[] = [];
  
  // Handle object types - process nested properties
  // CRITICAL: Each nested object gets its OWN required fields array
  // This prevents cross-contamination between contexts (e.g., metadata vs sustainability)
  if (property.type === 'object' && property.properties) {
    const nestedRequiredFields = property.required || [];
    const objectUrn = property['x-samm-aspect-model-urn'];
    const isTopLevel = fullKey && !fullKey.includes('.');
    
    // Check if we're inside an array context (path contains [item])
    // In this case, nested objects should NOT be flattened - they should use objectFields
    const isInsideArrayContext = fullKey.includes('[item]');
    
    if (isInsideArrayContext || !isTopLevel) {
      // For objects inside arrays or non-top-level nested objects:
      // Create a proper object FormField with objectFields instead of flattening
      const nestedFields = processProperties(
        property.properties,
        schema,
        nestedRequiredFields,
        fullKey,
        section,
        depth
      );
      
      const objectField: FormField = {
        key: fullKey,
        label: generateLabel(key),
        type: 'object',
        fieldCategory: 'complex',
        section,
        description: property.description,
        required: isRequired,
        urn: objectUrn,
        objectFields: nestedFields // Nested fields go into objectFields, NOT flattened
      };
      
      fields.push(objectField);
      return fields;
    }
    
    // For top-level objects (sections), flatten the fields as before
    if (objectUrn) {
      // Patch: For top-level sections, use the short description from the root schema's properties
      let sectionDescription = property.description;
      // Only override if this is a top-level property (fullKey has no dot)
      if (isTopLevel && schema.properties && schema.properties[key] && schema.properties[key].description) {
        sectionDescription = schema.properties[key].description;
      }
      fields.push({
        key: fullKey,
        label: generateLabel(key),
        type: 'object',
        fieldCategory: 'complex', // Nested objects are complex structures
        sectionType: isTopLevel ? 'object' : undefined, // Mark top-level objects as object sections
        section,
        description: sectionDescription,
        required: isRequired,
        urn: objectUrn
      } as FormField);
    }
    const nestedFields = processProperties(
      property.properties,
      schema,
      nestedRequiredFields, // Each context gets its own required fields
      fullKey,
      section,
      depth
    );
    fields.push(...nestedFields);
    return fields;
  }
  
  // Handle array types
  if (property.type === 'array') {
    const arrayField = processArrayProperty(key, fullKey, property, schema, section, isRequired, depth);
    fields.push(arrayField);
    return fields;
  }
  
  // Handle primitive types
  const field = createFormField(key, fullKey, property, section, isRequired);
  fields.push(field);
  
  return fields;
}

/**
 * Processes array properties with comprehensive support
 */
function processArrayProperty(
  key: string,
  fullKey: string,
  property: JSONSchemaProperty,
  schema: JSONSchema,
  section: string,
  isRequired: boolean,
  depth: number
): FormField {
  const isTopLevel = fullKey && !fullKey.includes('.');
  const field: FormField = {
    key: fullKey,
    label: generateLabel(key),
    type: 'array',
    fieldCategory: 'complex', // Arrays are complex structures
    sectionType: isTopLevel ? 'array' : undefined, // Mark top-level arrays as array sections
    section,
    description: property.description,
    required: isRequired,
    placeholder: `Add ${generateLabel(key).toLowerCase()}`,
    urn: property['x-samm-aspect-model-urn']
  };
  
  // Process array items
  if (property.items) {
    const itemsSchema = Array.isArray(property.items) ? property.items[0] : property.items;
    const resolvedItems = resolveSchemaProperty(itemsSchema, schema);
    
    // Determine item type
    if (resolvedItems.type === 'object' && resolvedItems.properties) {
      field.itemType = 'object';
      field.itemSchema = resolvedItems;
      
      // Process nested fields for array items
      const itemFields = processProperties(
        resolvedItems.properties,
        schema,
        resolvedItems.required || [],
        `${fullKey}[item]`,
        section,
        depth
      );
      field.itemFields = itemFields;
    } else if (resolvedItems.type === 'array') {
      field.itemType = 'array';
      field.itemSchema = resolvedItems;
    } else {
      field.itemType = resolvedItems.type as any || 'string';
      field.itemSchema = resolvedItems;
    }
  }
  
  // Add array-specific validation
  field.validation = {
    ...createValidationRules(property),
    minItems: property.minItems,
    maxItems: property.maxItems,
    uniqueItems: property.uniqueItems
  };
  
  return field;
}

/**
 * Creates a form field for primitive types with comprehensive validation
 */
function createFormField(
  key: string,
  fullKey: string,
  property: JSONSchemaProperty,
  section: string,
  isRequired: boolean
): FormField {
  const isTopLevel = fullKey && !fullKey.includes('.');
  const field: FormField = {
    key: fullKey,
    label: property.title || generateLabel(key),
    type: getFormFieldType(property),
    fieldCategory: 'simple', // Primitive types are always simple
    sectionType: isTopLevel ? 'primitive' : undefined, // Mark top-level primitives as primitive sections
    section,
    description: property.description,
    required: isRequired,
    placeholder: `Enter ${generateLabel(key).toLowerCase()}`,
    urn: property['x-samm-aspect-model-urn']
  };
  
  // Add enum/const options
  if (property.enum) {
    field.options = property.enum.map(value => ({
      value,
      label: typeof value === 'string' ? generateLabel(value) : String(value),
      description: property.description
    }));
  }
  
  if (property.const !== undefined) {
    field.defaultValue = property.const;
    field.readonly = true;
  }
  
  // Add comprehensive validation
  field.validation = createValidationRules(property);
  
  // Add default value and examples
  if (property.default !== undefined) {
    field.defaultValue = property.default;
  }
  
  if (property.examples) {
    field.examples = property.examples;
  }
  
  return field;
}

/**
 * Creates comprehensive validation rules from JSON Schema property
 */
function createValidationRules(property: JSONSchemaProperty): FormField['validation'] {
  const validation: FormField['validation'] = {};
  
  // Numeric constraints
  if (property.minimum !== undefined) validation.min = property.minimum;
  if (property.maximum !== undefined) validation.max = property.maximum;
  if (property.exclusiveMinimum !== undefined) {
    validation.exclusiveMin = typeof property.exclusiveMinimum === 'boolean' 
      ? property.minimum : property.exclusiveMinimum;
  }
  if (property.exclusiveMaximum !== undefined) {
    validation.exclusiveMax = typeof property.exclusiveMaximum === 'boolean' 
      ? property.maximum : property.exclusiveMaximum;
  }
  if (property.multipleOf !== undefined) validation.multipleOf = property.multipleOf;
  
  // String constraints
  if (property.minLength !== undefined) validation.minLength = property.minLength;
  if (property.maxLength !== undefined) validation.maxLength = property.maxLength;
  if (property.pattern) validation.pattern = property.pattern;
  if (property.format) validation.format = property.format;
  
  // Array constraints
  if (property.minItems !== undefined) validation.minItems = property.minItems;
  if (property.maxItems !== undefined) validation.maxItems = property.maxItems;
  if (property.uniqueItems !== undefined) validation.uniqueItems = property.uniqueItems;
  
  // Enum/const constraints
  if (property.enum) validation.enum = property.enum;
  if (property.const !== undefined) validation.const = property.const;
  
  return Object.keys(validation).length > 0 ? validation : undefined;
}

/**
 * COMPREHENSIVE JSON Schema interpretation - handles ANY JSON Schema completely
 */
/**
 * NEW API - SchemaNode tree-based system
 * 
 * This is the recommended API that uses the new unified tree architecture.
 * Provides better identifier management, optimized recursive validation
 * and structured errors with complete metadata.
 * 
 * @param schema - Complete JSON Schema
 * @param options - Tree build options
 * @returns Object with node tree and validation functions
 */
export function interpretJSONSchemaTree(schema: JSONSchema, options?: any): {
  schemaTree: Map<string, import('../models/schema-node').SchemaNode>;
  validate: (data: any) => import('../models/schema-node').ValidationResult;
  formFields: FormField[]; // Backward compatibility
  getFieldGroups: () => Record<string, FormField[]>;
  getFieldByKey: (key: string) => FormField | undefined;
} {
  // Dynamically import to avoid circular dependencies
  const { buildSchemaTree } = require('./json-schema-tree-builder');
  const { validateSchemaTree } = require('./schema-tree-validator');
  const { SchemaTreeUtils } = require('../models/schema-node');

  // Build the tree
  const schemaTree = buildSchemaTree(schema, options);

  // Validation function using the tree
  const validate = (data: any) => {
    return validateSchemaTree(schemaTree, data);
  };

  // Convert tree to FormFields for backward compatibility
  const formFields: FormField[] = convertTreeToFormFields(schemaTree);

  const getFieldGroups = (): Record<string, FormField[]> => {
    return formFields.reduce((groups, field) => {
      if (!groups[field.section]) {
        groups[field.section] = [];
      }
      groups[field.section].push(field);
      return groups;
    }, {} as Record<string, FormField[]>);
  };

  const getFieldByKey = (key: string): FormField | undefined => {
    return formFields.find(field => field.key === key);
  };

  return {
    schemaTree,
    validate,
    formFields,
    getFieldGroups,
    getFieldByKey
  };
}

/**
 * Converts SchemaNode tree to FormFields for backward compatibility
 */
function convertTreeToFormFields(schemaTree: Map<string, any>): FormField[] {
  const fields: FormField[] = [];

  function traverse(node: any): void {
    // Add current node as FormField
    const field: FormField = {
      key: node.id,
      label: node.label,
      type: node.nodeType === 'primitive' ? (node.primitiveType || 'text') : node.nodeType,
      fieldCategory: node.nodeType === 'primitive' ? 'simple' : 'complex',
      section: node.section,
      description: node.description,
      urn: node.urn,
      required: node.required,
      validation: node.validationRules,
      defaultValue: node.defaultValue,
      options: node.options
    };

    if (node.nodeType === 'array') {
      field.itemType = node.itemType;
      field.itemSchema = node.itemSchema;
      if (node.itemSchema && node.itemSchema.properties) {
        field.itemFields = [];
        for (const childNode of node.itemSchema.properties.values()) {
          traverse(childNode);
        }
      }
    }

    if (node.nodeType === 'object' && node.properties) {
      field.objectFields = [];
      for (const childNode of node.properties.values()) {
        traverse(childNode);
      }
    }

    fields.push(field);

    // Recorrer hijos
    if (node.properties) {
      for (const childNode of node.properties.values()) {
        traverse(childNode);
      }
    }
  }

  for (const rootNode of schemaTree.values()) {
    traverse(rootNode);
  }

  return fields;
}

/**
 * API LEGACY - Mantiene retrocompatibilidad
 * 
 * Esta función mantiene la API original pero ahora usa internamente
 * el nuevo sistema de árbol para mayor consistencia.
 * 
 * DEPRECADO: Usar interpretJSONSchemaTree() para nuevas implementaciones.
 */
export function interpretJSONSchema(schema: JSONSchema): {
  formFields: FormField[];
  validate: (data: any) => { isValid: boolean; errors: string[] };
  createDefault: (params?: any) => any;
  getFieldGroups: () => Record<string, FormField[]>;
  getFieldByKey: (key: string) => FormField | undefined;
  getRequiredFields: () => FormField[];
  getOptionalFields: () => FormField[];
} {
  // DEBUG: Analyze required fields throughout the entire schema
  debugRequiredFields(schema);
  
  if (!schema.properties && !schema.allOf && !schema.anyOf && !schema.oneOf) {
    throw new Error('Invalid JSON Schema: missing properties or composition keywords');
  }
  
  let baseProperties = schema.properties || {};
  
  // Handle schema composition at root level
  if (schema.allOf) {
    for (const subSchema of schema.allOf) {
      const resolved = resolveSchemaProperty(subSchema, schema);
      if (resolved.properties) {
        baseProperties = { ...baseProperties, ...resolved.properties };
      }
    }
  }
  
  const formFields = processProperties(
    baseProperties,
    schema,
    schema.required || []
  );
  
  // Enhanced validation function with comprehensive rules including recursive validation for arrays and objects
  // This version properly handles N levels of nesting for arrays and objects
  const validate = (data: any): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    /**
     * Check if a value is considered empty for validation purposes
     */
    function isEmpty(value: any): boolean {
      if (value === undefined || value === null) return true;
      if (typeof value === 'string' && value.trim() === '') return true;
      if (Array.isArray(value) && value.length === 0) return true;
      if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0) return true;
      return false;
    }

    /**
     * Apply validation rules to a field value
     */
    function validateFieldRules(value: any, field: FormField, fieldPath: string): void {
      if (!field.validation) return;
      const val = field.validation;

      // Numeric validations
      if (val.min !== undefined && Number(value) < val.min) {
        errors.push(`${fieldPath} must be at least ${val.min}`);
      }
      if (val.max !== undefined && Number(value) > val.max) {
        errors.push(`${fieldPath} must be at most ${val.max}`);
      }
      if (val.exclusiveMin !== undefined && Number(value) <= val.exclusiveMin) {
        errors.push(`${fieldPath} must be greater than ${val.exclusiveMin}`);
      }
      if (val.exclusiveMax !== undefined && Number(value) >= val.exclusiveMax) {
        errors.push(`${fieldPath} must be less than ${val.exclusiveMax}`);
      }
      if (val.multipleOf !== undefined && Number(value) % val.multipleOf !== 0) {
        errors.push(`${fieldPath} must be a multiple of ${val.multipleOf}`);
      }

      // String validations
      if (val.minLength !== undefined && String(value).length < val.minLength) {
        errors.push(`${fieldPath} must be at least ${val.minLength} characters`);
      }
      if (val.maxLength !== undefined && String(value).length > val.maxLength) {
        errors.push(`${fieldPath} must be at most ${val.maxLength} characters`);
      }
      if (val.pattern && !new RegExp(val.pattern).test(String(value))) {
        errors.push(`${fieldPath} format is invalid`);
      }

      // Enum validation
      if (val.enum && !val.enum.includes(value)) {
        errors.push(`${fieldPath} must be one of: ${val.enum.join(', ')}`);
      }

      // Const validation
      if (val.const !== undefined && value !== val.const) {
        errors.push(`${fieldPath} must be exactly: ${val.const}`);
      }

      // Format validation
      if (val.format) {
        const formatErrors = validateFormat(value, val.format, fieldPath);
        errors.push(...formatErrors);
      }
    }

    /**
     * Recursively validate a field and all its nested children
     * This is the core recursive function that handles any depth of nesting
     */
    function validateField(field: FormField, value: any, currentPath: string): void {
      // Check required constraint
      if (field.required && isEmpty(value)) {
        errors.push(`${currentPath} is required`);
        return; // Don't continue validating if required field is empty
      }

      // Skip validation for empty optional fields
      if (!field.required && isEmpty(value)) {
        return;
      }

      // ARRAY VALIDATION
      if (field.type === 'array') {
        if (!Array.isArray(value)) {
          // If value exists but isn't an array, that's an error
          if (value !== undefined && value !== null) {
            errors.push(`${currentPath} must be an array`);
          }
          return;
        }

        // Array-level constraints
        if (field.validation) {
          if (field.validation.minItems !== undefined && value.length < field.validation.minItems) {
            errors.push(`${currentPath} must have at least ${field.validation.minItems} items`);
          }
          if (field.validation.maxItems !== undefined && value.length > field.validation.maxItems) {
            errors.push(`${currentPath} must have at most ${field.validation.maxItems} items`);
          }
          if (field.validation.uniqueItems && new Set(value.map(JSON.stringify)).size !== value.length) {
            errors.push(`${currentPath} items must be unique`);
          }
        }

        // Validate each array item
        if (field.itemFields && field.itemFields.length > 0) {
          value.forEach((item: any, index: number) => {
            const itemPath = `${currentPath}[${index}]`;
            
            // Check if the item has been explicitly created (has structure/keys defined)
            // An item is considered "created" if:
            // 1. It's an object with any keys (even if values are empty), OR
            // 2. It's not an empty string/null/undefined (for primitive arrays)
            const isItemCreated = (() => {
              if (item === undefined || item === null) return false;
              if (typeof item === 'object' && !Array.isArray(item)) {
                // For objects, consider created if it has any keys
                // This handles both {} and initialized structures like { name: '', id: '' }
                return Object.keys(item).length > 0;
              }
              // For primitives, only skip if completely empty
              return item !== '';
            })();
            
            // Skip validation only for items that don't exist or are completely uninitialized
            // This allows validation of items with initialized structure but empty values
            if (!isItemCreated) {
              return;
            }
            
            // Validate each field within the array item
            for (const itemField of field.itemFields!) {
              // Get simple key (last part of the field key)
              const keyParts = itemField.key.split('.');
              const simpleKey = keyParts[keyParts.length - 1].replace(/\[item\]/g, '');
              const itemValue = item?.[simpleKey];
              const fieldPath = `${itemPath}.${simpleKey}`;
              
              // Recursively validate this field
              validateField(itemField, itemValue, fieldPath);
            }
          });
        } else if (field.itemSchema) {
          // Primitive array items - validate each item against itemSchema
          value.forEach((item: any, index: number) => {
            const itemPath = `${currentPath}[${index}]`;
            if (field.validation) {
              validateFieldRules(item, field, itemPath);
            }
          });
        }
        return;
      }

      // OBJECT VALIDATION
      if (field.type === 'object' && field.objectFields) {
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
          // Value should be an object but isn't
          if (value !== undefined && value !== null) {
            errors.push(`${currentPath} must be an object`);
          }
          return;
        }

        // Check if this is an optional parent (not required)
        // If so, only validate required children if:
        // 1. At least one child has a value, OR
        // 2. The object has been explicitly initialized with keys (structure defined)
        const isOptionalParent = !field.required;
        
        if (isOptionalParent) {
          // Check if the object has been explicitly created (has structure/keys defined)
          const hasObjectStructure = Object.keys(value).length > 0;
          
          // Check if any child has a non-empty value
          const hasAnyChildValue = field.objectFields.some(objField => {
            const keyParts = objField.key.split('.');
            const simpleKey = keyParts[keyParts.length - 1];
            const objValue = value?.[simpleKey];
            return !isEmpty(objValue);
          });
          
          // If no child has a value AND the object has no structure, skip validation
          // But if the object was explicitly initialized (has keys), validate it
          if (!hasAnyChildValue && !hasObjectStructure) {
            return;
          }
        }

        // Validate each field within the object
        for (const objField of field.objectFields) {
          // Get simple key (last part of the field key)
          const keyParts = objField.key.split('.');
          const simpleKey = keyParts[keyParts.length - 1];
          const objValue = value?.[simpleKey];
          const fieldPath = `${currentPath}.${simpleKey}`;
          
          // Recursively validate this field
          validateField(objField, objValue, fieldPath);
        }
        return;
      }

      // PRIMITIVE FIELD VALIDATION
      if (field.fieldCategory === 'simple' && field.validation) {
        validateFieldRules(value, field, currentPath);
      }
    }

    // Main validation loop for top-level fields
    for (const field of formFields) {
      // Skip intermediate object nodes that are already processed as part of hierarchy
      // We only want to validate actual form fields, not grouping nodes
      if (field.type === 'object' && !field.objectFields && !field.required) {
        continue;
      }

      const value = getValueByPath(data, field.key);
      validateField(field, value, field.key);
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  };
  
  // Enhanced default values function
  const createDefault = (params?: any): any => {
    const defaultData: any = {};
    
    for (const field of formFields) {
      const defaultValue = getDefaultValue(field);
      if (defaultValue !== undefined) {
        if (field.key.includes('.')) {
          setValueByPath(defaultData, field.key, defaultValue);
        } else {
          defaultData[field.key] = defaultValue;
        }
      }
    }
    
    return defaultData;
  };
  
  // Utility functions
  const getFieldGroups = (): Record<string, FormField[]> => {
    return formFields.reduce((groups, field) => {
      if (!groups[field.section]) {
        groups[field.section] = [];
      }
      groups[field.section].push(field);
      return groups;
    }, {} as Record<string, FormField[]>);
  };
  
  const getFieldByKey = (key: string): FormField | undefined => {
    return formFields.find(field => field.key === key);
  };
  
  const getRequiredFields = (): FormField[] => {
    return formFields.filter(field => field.required);
  };
  
  const getOptionalFields = (): FormField[] => {
    return formFields.filter(field => !field.required);
  };
  
  return {
    formFields,
    validate,
    createDefault,
    getFieldGroups,
    getFieldByKey,
    getRequiredFields,
    getOptionalFields
  };
}

/**
 * Validates format-specific rules
 */
function validateFormat(value: any, format: string, fieldLabel: string): string[] {
  const errors: string[] = [];
  const strValue = String(value);
  
  switch (format) {
    case 'email':
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(strValue)) {
        errors.push(`${fieldLabel} must be a valid email address`);
      }
      break;
      
    case 'uri':
    case 'uri-reference':
      try {
        new URL(strValue);
      } catch {
        errors.push(`${fieldLabel} must be a valid URL`);
      }
      break;
      
    case 'date':
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(strValue)) {
        errors.push(`${fieldLabel} must be in YYYY-MM-DD format`);
      }
      break;
      
    case 'date-time':
      const dateTimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
      if (!dateTimeRegex.test(strValue)) {
        errors.push(`${fieldLabel} must be in ISO 8601 date-time format`);
      }
      break;
      
    case 'time':
      const timeRegex = /^\d{2}:\d{2}:\d{2}$/;
      if (!timeRegex.test(strValue)) {
        errors.push(`${fieldLabel} must be in HH:MM:SS format`);
      }
      break;
      
    case 'ipv4':
      const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
      if (!ipv4Regex.test(strValue)) {
        errors.push(`${fieldLabel} must be a valid IPv4 address`);
      }
      break;
      
    case 'ipv6':
      const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
      if (!ipv6Regex.test(strValue)) {
        errors.push(`${fieldLabel} must be a valid IPv6 address`);
      }
      break;
      
    case 'uuid':
      const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
      if (!uuidRegex.test(strValue)) {
        errors.push(`${fieldLabel} must be a valid UUID`);
      }
      break;
  }
  
  return errors;
}

/**
 * Enhanced helper function to get default value for a field
 */
function getDefaultValue(field: FormField): any {
  // Use explicit default value if provided
  if (field.defaultValue !== undefined) {
    return field.defaultValue;
  }
  
  // Use const value if provided
  if (field.validation?.const !== undefined) {
    return field.validation.const;
  }
  
  // Use first enum option if available
  if (field.options && field.options.length > 0) {
    return field.options[0].value;
  }
  
  // Type-based defaults
  switch (field.type) {
    case 'checkbox':
      return false;
    case 'number':
    case 'integer':
      return field.validation?.min !== undefined ? field.validation.min : 0;
    case 'array':
      return [];
    case 'object':
      return {};
    case 'date':
      return new Date().toISOString().split('T')[0]; // Today in YYYY-MM-DD format
    case 'datetime':
      return new Date().toISOString();
    case 'time':
      return '00:00:00';
    case 'email':
      return '';
    case 'url':
      return 'https://';
    case 'select':
    case 'radio':
    case 'multiselect':
      return field.options?.[0]?.value || '';
    default:
      return '';
  }
}

/**
 * Helper function to get value from nested object path
 */
function getValueByPath(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current && current[key], obj);
}

/**
 * Helper function to set value in nested object path
 */
function setValueByPath(obj: any, path: string, value: any): void {
  const keys = path.split('.');
  let current = obj;
  
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!current[key] || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key];
  }
  
  const lastKey = keys[keys.length - 1];
  current[lastKey] = value;
}