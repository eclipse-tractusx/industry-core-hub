/********************************************************************************
 * Eclipse Tractus-X - Industry Core Hub Frontend
 *
 * Copyright (c) 2025 LKS Next
 * Copyright (c) 2026 Contributors to the Eclipse Foundation
 * Copyright (c) 2026 Capgemini Deutschland GmbH
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

import { createSchemaKey, loadSchema } from './schemaLoader';
import digitalProductPassportSchema from './DigitalProductPassport-schema.json';
import UsTariffInformationSchema from './UsTariffInformation-schema.json';
import PcfSchema from './Pcf-schema.json';
<<<<<<< HEAD
import SingleLevelBomAsBuiltSchema from './SingleLevelBomAsBuilt-schema.json';
import SingleLevelUsageAsBuiltSchema from './SingleLevelUsageAsBuilt-schema.json';
=======
import idtaBatteryPassDigitalNameplate from './idta-BatteryPassDigitalNameplate-schema.json';
import idtaBatteryPassCarbonFootprint from './idta-BatteryPassCarbonFootprint-schema.json';
import idtaBatteryPassCircularity from './idta-BatteryPassCircularity-schema.json';
import idtaBatteryPassHandoverDocumentation from './idta-BatteryPassHandoverDocumentation-schema.json';
import idtaBatteryPassMaterialComposition from './idta-BatteryPassMaterialComposition-schema.json';
import idtaBatteryPassProductCondition from './idta-BatteryPassProductCondition-schema.json';
import idtaBatteryPassTechnicalData from './idta-BatteryPassTechnicalData-schema.json';
>>>>>>> 54b3bc12c5e5018d2c82c28c58408d8fa1d1f45e
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

export interface SchemaFilters {
  semanticIds?: string[];
  tags?: string[];
  namespace?: string;
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

interface SchemaRegistration {
  schema: JSONSchema;
  metadata?: Partial<SchemaMetadata>;
  key?: string;
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
<<<<<<< HEAD
const schemasToLoad: SchemaRegistration[] = [
  {
    schema: digitalProductPassportSchema as JSONSchema,
    metadata: {
      tags: ['eco-pass']
    }
  },
  {
    schema: UsTariffInformationSchema as JSONSchema,
    metadata: {
      tags: ['industry-core', 'compliance']
    }
  },
  {
    schema: PcfSchema as JSONSchema,
    metadata: {
      tags: ['pcf', 'sustainability']
    }
  },
  {
    schema: SingleLevelBomAsBuiltSchema as JSONSchema,
    metadata: {
      icon: 'AccountTree',
      color: '#2e7d32',
      tags: ['traceability', 'as-built', 'bom']
    }
  },
  {
    schema: SingleLevelUsageAsBuiltSchema as JSONSchema,
    metadata: {
      icon: 'Hub',
      color: '#1565c0',
      tags: ['traceability', 'as-built', 'usage']
    }
  }
=======
const schemasToLoad = [
  digitalProductPassportSchema as JSONSchema,
  UsTariffInformationSchema as JSONSchema,
  PcfSchema as JSONSchema,
  idtaBatteryPassDigitalNameplate as JSONSchema,
  idtaBatteryPassCarbonFootprint as JSONSchema,
  idtaBatteryPassCircularity as JSONSchema,
  idtaBatteryPassHandoverDocumentation as JSONSchema,
  idtaBatteryPassMaterialComposition as JSONSchema,
  idtaBatteryPassProductCondition as JSONSchema,
  idtaBatteryPassTechnicalData as JSONSchema,
>>>>>>> 54b3bc12c5e5018d2c82c28c58408d8fa1d1f45e
  // Add more schemas here:
  // { schema: serialPartSchema as JSONSchema, metadata: { tags: ['traceability'] } },
  // { schema: batchSchema as JSONSchema, metadata: { tags: ['traceability'] } },
];

const matchesSchemaFilters = (
  schema: SchemaDefinition,
  filters?: SchemaFilters
): boolean => {
  if (!filters) {
    return true;
  }

  if (filters.semanticIds?.length && !filters.semanticIds.includes(schema.metadata.semanticId)) {
    return false;
  }

  if (filters.namespace && schema.metadata.namespace !== filters.namespace) {
    return false;
  }

  if (filters.tags?.length) {
    const schemaTags = schema.metadata.tags ?? [];
    if (!filters.tags.some(tag => schemaTags.includes(tag))) {
      return false;
    }
  }

  return true;
};

/**
 * Registry of all available schemas
 * Automatically populated by loading and interpreting JSON schemas
 */
const SCHEMA_REGISTRY: Record<string, SchemaDefinition> = schemasToLoad.reduce<Record<string, SchemaDefinition>>(
  (registry, { schema, metadata, key }) => {
    const schemaDefinition = loadSchema(schema, metadata);
    const registryKey = key ?? createSchemaKey(schemaDefinition.metadata.semanticId);
    registry[registryKey] = schemaDefinition;
    return registry;
  },
  {}
);

/**
 * Get all available schemas
 */
export const getAvailableSchemas = (filters?: SchemaFilters): SchemaDefinition[] => {
  return Object.values(SCHEMA_REGISTRY).filter(schema => matchesSchemaFilters(schema, filters));
};

/**
 * Get available schema registry entries with their keys.
 * Useful for selector UIs that need both the key and the schema metadata.
 */
export const getAvailableSchemaEntries = (
  filters?: SchemaFilters
): Array<[string, SchemaDefinition]> => {
  return Object.entries(SCHEMA_REGISTRY).filter(([, schema]) => matchesSchemaFilters(schema, filters));
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