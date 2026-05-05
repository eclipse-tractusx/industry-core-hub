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
 * Dynamic Schema Loader
 * 
 * This module provides utilities to dynamically load and interpret JSON schemas
 * at runtime based on semantic IDs. Schemas are stored as JSON files and are
 * automatically interpreted to generate form fields, validation, and metadata.
 */

import { interpretJSONSchema, JSONSchema } from './json-schema-interpreter';
import { SchemaDefinition, SchemaMetadata } from './index';

/**
 * Extended JSONSchema type to include SAMM aspect model URN
 */
interface ExtendedJSONSchema extends JSONSchema {
    'x-samm-aspect-model-urn'?: string;
}

/**
 * Extracts semantic ID from a JSON schema's x-samm-aspect-model-urn
 */
function extractSemanticIdFromSchema(schema: JSONSchema): string | null {
    const extendedSchema = schema as ExtendedJSONSchema;
    return extendedSchema['x-samm-aspect-model-urn'] || null;
}

/**
 * Extracts version from semantic ID URN
 * Example: "urn:samm:io.catenax.generic.digital_product_passport:6.1.0#DigitalProductPassport" -> "6.1.0"
 */
function extractVersionFromSemanticId(semanticId: string): string {
    const versionMatch = semanticId.match(/:(\d+\.\d+\.\d+)#/);
    return versionMatch ? versionMatch[1] : '1.0.0';
}

/**
 * Extracts namespace from semantic ID URN
 * Example: "urn:samm:io.catenax.generic.digital_product_passport:6.1.0#DigitalProductPassport" -> "io.catenax.generic.digital_product_passport"
 */
function extractNamespaceFromSemanticId(semanticId: string): string {
    const namespaceMatch = semanticId.match(/urn:samm:([^:]+):/);
    return namespaceMatch ? namespaceMatch[1] : '';
}

/**
 * Generates a human-readable name from the schema title or semantic ID
 */
function generateSchemaName(schema: JSONSchema, semanticId: string): string {
    if (schema.title) {
        return schema.title;
    }
    
    // Extract name from semantic ID (last part after #)
    const nameMatch = semanticId.match(/#(.+)$/);
    if (nameMatch) {
        // Convert PascalCase to Title Case
        return nameMatch[1].replace(/([A-Z])/g, ' $1').trim();
    }
    
    return 'Unknown Schema';
}

/**
 * Loads and interprets a JSON schema, creating a complete SchemaDefinition
 */
export function loadSchema(
    jsonSchema: JSONSchema,
    customMetadata?: Partial<SchemaMetadata>
): SchemaDefinition {
    // Extract semantic ID from schema
    const semanticId = extractSemanticIdFromSchema(jsonSchema);
    if (!semanticId) {
        throw new Error('JSON Schema must have x-samm-aspect-model-urn property');
    }
    
    // Extract version and namespace
    const version = extractVersionFromSemanticId(semanticId);
    const namespace = extractNamespaceFromSemanticId(semanticId);
    const name = generateSchemaName(jsonSchema, semanticId);
    
    // Create metadata with defaults and custom overrides
    const metadata: SchemaMetadata = {
        name,
        version,
        semanticId,
        description: jsonSchema.description || '',
        icon: 'Description',
        color: '#1976d2',
        tags: [],
        namespace,
        ...customMetadata
    };
    
    // Interpret the JSON schema to generate form fields and validation
    const interpreted = interpretJSONSchema(jsonSchema);
    
    return {
        metadata,
        formFields: interpreted.formFields,
        properties: jsonSchema.properties, // Store schema properties for dynamic section detection
        createDefault: interpreted.createDefault,
        validate: interpreted.validate
    };
}

/**
 * Creates a schema registry key from semantic ID
 * Example: "urn:samm:io.catenax.generic.digital_product_passport:6.1.0#DigitalProductPassport" -> "dpp-v6.1.0"
 */
export function createSchemaKey(semanticId: string): string {
    const version = extractVersionFromSemanticId(semanticId);
    const nameMatch = semanticId.match(/#(.+)$/);
    
    if (nameMatch) {
        const name = nameMatch[1];
        // Convert to kebab-case and add version
        const kebabName = name
            .replace(/([A-Z])/g, '-$1')
            .toLowerCase()
            .replace(/^-/, '');
        
        // Create abbreviation for common patterns
        const abbreviations: Record<string, string> = {
            'digital-product-passport': 'dpp',
            'serial-part': 'sp',
            'batch': 'batch',
            'part-type-information': 'pti'
        };
        
        const key = abbreviations[kebabName] || kebabName;
        return `${key}-v${version}`;
    }
    
    return `schema-v${version}`;
}

/**
 * Batch loads multiple schemas from JSON schema objects
 */
export function loadSchemas(
    schemas: JSONSchema[]
): Record<string, SchemaDefinition> {
    const registry: Record<string, SchemaDefinition> = {};
    
    for (const jsonSchema of schemas) {
        const schemaDefinition = loadSchema(jsonSchema);
        const key = createSchemaKey(schemaDefinition.metadata.semanticId);
        registry[key] = schemaDefinition;
    }
    
    return registry;
}
