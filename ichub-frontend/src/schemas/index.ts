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
 * Schema registry for managing different schema types and versions
 * 
 * Schemas are dynamically loaded from JSON schema files using the schemaLoader utility.
 * To add a new schema:
 * 1. Place the JSON schema file in the schemas/ directory (e.g., DigitalProductPassport-schema.json)
 * 2. Import it and add to the schemas array below with optional custom metadata
 * 3. The schema will be automatically interpreted and registered based on its semantic ID
 */

import { loadSchemas } from './schemaLoader';
import digitalProductPassportSchema from './DigitalProductPassport-schema.json';
import UsTariffInformationSchema from './UsTariffInformation-schema.json';
import batteryPassportSchema from './BatteryPass-schema.json';
import { JSONSchema } from './json-schema-interpreter';

export interface SchemaMetadata {
  name: string;
  version: string;
  semanticId: string;
  description: string;
  icon: string;
  color: string;
  tags: string[];
  namespace?: string; // Optional namespace for schema identification
}

export interface SectionConfig {
  order?: string[]; // Explicit section order override
  displayNames?: Record<string, string>; // Custom display names per section
  defaultSection?: string; // Default section for fields without explicit section
}

export interface SchemaDefinition<T = any> {
  metadata: SchemaMetadata;
  formFields: any[];
  sectionConfig?: SectionConfig; // Optional section customization
  createDefault: (params?: any) => Partial<T>;
  validate?: (data: Partial<T>) => { isValid: boolean; errors: string[] };
  properties?: Record<string, any>; // Schema properties for section detection
}

/**
 * Define schemas to load
 * 
 * Everything is automatically extracted from the JSON schema file:
 *   - semanticId, version, namespace: From x-samm-aspect-model-urn
 *   - name, description: From schema's title and description fields
 *   - formFields, validation: Generated from schema structure
 * 
 * Simply import the JSON schema file and add it to this array.
 */
const schemasToLoad = [
  digitalProductPassportSchema as JSONSchema,
  UsTariffInformationSchema as JSONSchema,
  batteryPassportSchema as JSONSchema
  // Add more schemas here:
  // serialPartSchema as JSONSchema,
  // batchSchema as JSONSchema,
];

/**
 * Registry of all available schemas
 * Automatically populated by loading and interpreting JSON schemas
 */
const SCHEMA_REGISTRY: Record<string, SchemaDefinition> = loadSchemas(schemasToLoad);

/**
 * Get all available schemas
 */
export const getAvailableSchemas = (): SchemaDefinition[] => {
  return Object.values(SCHEMA_REGISTRY);
};

/**
 * Get schema by key
 */
export const getSchema = (key: string): SchemaDefinition | undefined => {
  return SCHEMA_REGISTRY[key];
};

/**
 * Get schema by semantic ID
 * Useful when you have the full semantic ID URN from a data model
 */
export const getSchemaBySemanticId = (semanticId: string): SchemaDefinition | undefined => {
  return Object.values(SCHEMA_REGISTRY).find(
    schema => schema.metadata.semanticId === semanticId
  );
};

/**
 * Get schema by namespace and version
 * Example: getSchemaByNamespaceAndVersion('io.catenax.generic.digital_product_passport', '6.1.0')
 */
export const getSchemaByNamespaceAndVersion = (
  namespace: string, 
  version: string
): SchemaDefinition | undefined => {
  return Object.values(SCHEMA_REGISTRY).find(
    schema => schema.metadata.namespace === namespace && schema.metadata.version === version
  );
};

/**
 * Get all schema versions for a specific namespace
 */
export const getSchemaVersionsByNamespace = (namespace: string): SchemaDefinition[] => {
  return Object.values(SCHEMA_REGISTRY).filter(
    schema => schema.metadata.namespace === namespace
  );
};

/**
 * Export the schema registry for direct access
 */
export { SCHEMA_REGISTRY };