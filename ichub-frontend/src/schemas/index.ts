/********************************************************************************
 * Eclipse Tractus-X - Industry Core Hub Frontend
 *
 * Copyright (c) 2025,2026 LKS Next
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
 * Schema registry for managing different schema types and versions.
 *
 * Schemas are auto-discovered from subfolders inside schemas/ using Vite's
 * import.meta.glob. The subfolder name (e.g. "catena-x", "idta") becomes the
 * schema group and is stored in SchemaMetadata.group.
 *
 * To add a new schema: place a *-schema.json file in the appropriate subfolder
 * (catena-x/ or idta/). It will be picked up automatically on next build.
 */

import { loadSchema, createSchemaKey } from './schemaLoader';
import { JSONSchema } from './json-schema-interpreter';

export interface SchemaMetadata {
  name: string;
  version: string;
  semanticId: string;
  description: string;
  icon: string;
  color: string;
  tags: string[];
  namespace?: string;
  group: string;
}

export interface SectionConfig {
  order?: string[];
  displayNames?: Record<string, string>;
  defaultSection?: string;
}

export interface SchemaDefinition<T = any> {
  metadata: SchemaMetadata;
  formFields: any[];
  sectionConfig?: SectionConfig;
  createDefault: (params?: any) => Partial<T>;
  validate?: (data: Partial<T>) => { isValid: boolean; errors: string[] };
  properties?: Record<string, any>;
  /** The original raw JSON Schema object, as parsed from the .json file. */
  rawSchema?: Record<string, unknown>;
}

/**
 * A SchemaFamily groups all versions of the same submodel (same namespace)
 * within the same group (folder). Used by the UI to render multi-version cards.
 */
export interface SchemaVersion {
  key: string;
  version: string;
  schema: SchemaDefinition;
}

export interface SchemaFamily {
  /** Human-readable submodel name (shared across versions) */
  name: string;
  /** SAMM namespace — unique per submodel kind */
  namespace: string;
  /** Group/folder name (e.g. "catena-x", "idta") */
  group: string;
  /** All available versions, sorted ascending */
  versions: SchemaVersion[];
  /** Registry key of the latest version (default selection) */
  defaultVersionKey: string;
}

// Auto-discover all *-schema*.json files inside any subfolder of schemas/
// Path patterns: 
//   - ./<group>/<Name>-schema.json (single version)
//   - ./<group>/<Name>-schema-v<version>.json (multi-version)
// ---------------------------------------------------------------------------
const globModules = import.meta.glob('./*/*-schema*.json', { eager: true }) as Record<
  string,
  { default: JSONSchema }
>;
/**
 * Extracts the group name (subfolder) from a glob path.
 * e.g. "./catena-x/Pcf-schema.json" → "catena-x"
 */
function extractGroupFromPath(path: string): string {
  const match = path.match(/^\.\/([^/]+)\//);
  return match ? match[1] : 'unknown';
}

// Build the registry + per-key group mapping in one pass
const SCHEMA_REGISTRY: Record<string, SchemaDefinition> = {};

for (const [path, mod] of Object.entries(globModules)) {
  const jsonSchema = mod.default as JSONSchema;
  const group = extractGroupFromPath(path);
  try {
    const def = loadSchema(jsonSchema, { group });
    const key = createSchemaKey(def.metadata.semanticId);
    SCHEMA_REGISTRY[key] = def;
  } catch (e) {
    console.warn(`[SchemaRegistry] Could not load schema at ${path}:`, e);
  }
}

// ---------------------------------------------------------------------------
// Public query API
// ---------------------------------------------------------------------------

export const getAvailableSchemas = (): SchemaDefinition[] =>
  Object.values(SCHEMA_REGISTRY);

export const getSchema = (key: string): SchemaDefinition | undefined =>
  SCHEMA_REGISTRY[key];

export const getSchemaBySemanticId = (semanticId: string): SchemaDefinition | undefined =>
  Object.values(SCHEMA_REGISTRY).find(s => s.metadata.semanticId === semanticId);

export const getSchemaByNamespaceAndVersion = (
  namespace: string,
  version: string,
): SchemaDefinition | undefined =>
  Object.values(SCHEMA_REGISTRY).find(
    s => s.metadata.namespace === namespace && s.metadata.version === version,
  );

export const getSchemaVersionsByNamespace = (namespace: string): SchemaDefinition[] =>
  Object.values(SCHEMA_REGISTRY).filter(s => s.metadata.namespace === namespace);

/** Returns the sorted list of unique group names present in the registry. */
export const getAllGroups = (): string[] =>
  [...new Set(Object.values(SCHEMA_REGISTRY).map(s => s.metadata.group))].sort();

/**
 * Returns schema families grouped by [group][namespace], sorted by name.
 * Families with multiple versions expose them as selectable chips in the UI.
 */
export const getGroupedSchemaFamilies = (): Record<string, SchemaFamily[]> => {
  const result: Record<string, SchemaFamily[]> = {};

  for (const [key, def] of Object.entries(SCHEMA_REGISTRY)) {
    const { group, namespace = '', name, version } = def.metadata;
    if (!result[group]) result[group] = [];

    let family = result[group].find(f => f.namespace === namespace);
    if (!family) {
      family = { name, namespace, group, versions: [], defaultVersionKey: '' };
      result[group].push(family);
    }

    family.versions.push({ key, version, schema: def });
  }

  // Sort versions ascending (semver-ish) and pick latest as default
  for (const families of Object.values(result)) {
    for (const family of families) {
      family.versions.sort((a, b) => a.version.localeCompare(b.version, undefined, { numeric: true }));
      family.defaultVersionKey = family.versions[family.versions.length - 1].key;
    }
    families.sort((a, b) => a.name.localeCompare(b.name));
  }

  return result;
};

export { SCHEMA_REGISTRY };