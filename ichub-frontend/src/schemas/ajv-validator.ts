/********************************************************************************
 * Eclipse Tractus-X - Industry Core Hub Frontend
 *
 * Copyright (c) 2026 Contributors to the Eclipse Foundation
 * Copyright (c) 2026 LKS Next
 *
 * See the NOTICE file(s) distributed with this work for additional
 * information regarding copyright ownership.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Apache License, Version 2.0 which is available at
 * https://www.apache.org/licenses/LICENSE-2.0.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND,
 * either express or implied. See the
 * License for the specific language govern in permissions and limitations
 * under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 ********************************************************************************/

/**
 * ajv-validator.ts
 *
 * Real JSON-Schema validation backed by Ajv, used as the canonical `validate`
 * for loaded schemas. This mirrors the backend, which validates submodel
 * payloads with a standard JSON-Schema validator (`jsonschema` / Draft-04),
 * so the frontend rejects exactly what the backend would reject — no surprise
 * 422/400 "format" errors after Save.
 *
 * The Catena-X SAMM aspect schemas are JSON Schema **draft-04** documents that
 * reference their sub-definitions via `#/components/schemas/...` JSON pointers.
 * Ajv 6 supports draft-04 once its meta-schema is registered.
 *
 * IMPORTANT — error string format:
 * The error messages produced here are intentionally shaped as
 *   `<dot/bracket path> <recognized phrase>`
 * (e.g. `pcf.productOrSectorSpecificRules[0] must be an object`) so that the
 * existing {@link ../utils/validation-error-manager} can keep extracting the
 * field path via its regex patterns. This preserves the SubmodelCreator's
 * per-field error highlighting, the ErrorViewer and field navigation, while the
 * Schema Rules view (which reads the schema definition, not `validate`) is
 * unaffected.
 */

import Ajv, { ErrorObject, ValidateFunction } from 'ajv';
import draft04MetaSchema from 'ajv/lib/refs/json-schema-draft-04.json';

/** Standard JSON-Schema formats neutralized to no-ops so we match the backend,
 *  which does not assert `format` (its validator has no format checker). */
const NEUTRALIZED_FORMATS = [
  'date-time', 'date', 'time', 'email', 'idn-email', 'hostname', 'idn-hostname',
  'ipv4', 'ipv6', 'uri', 'uri-reference', 'iri', 'iri-reference', 'uri-template',
  'url', 'json-pointer', 'relative-json-pointer', 'regex', 'uuid',
];

let ajvInstance: Ajv.Ajv | null = null;

/** Lazily build a single draft-04-aware Ajv instance configured to match the backend. */
function getAjv(): Ajv.Ajv {
  if (ajvInstance) return ajvInstance;
  const ajv = new Ajv({
    schemaId: 'auto',          // accept draft-04 "id" as well as "$id"
    allErrors: true,           // report every violation, like the backend
    unknownFormats: 'ignore',  // ignore SAMM/custom formats instead of throwing
    jsonPointers: false,       // dataPath uses ".a.b[0]" property-access notation
    nullable: false,
    missingRefs: 'ignore',     // tolerate unresolved refs rather than crashing
  });
  ajv.addMetaSchema(draft04MetaSchema);
  // Neutralize built-in format assertions to mirror the backend (no format checker).
  for (const fmt of NEUTRALIZED_FORMATS) {
    ajv.addFormat(fmt, () => true);
  }
  ajvInstance = ajv;
  return ajv;
}

// Compiled-validator cache, keyed by the raw schema object identity.
const validatorCache = new WeakMap<object, ValidateFunction>();

/** Container keywords that only produce noise on top of their child errors. */
const SKIP_KEYWORDS = new Set(['if', 'then', 'else', 'allOf', 'anyOf', 'oneOf', 'not']);

/** Result shape shared with the legacy interpreter validator. */
export interface SchemaValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Compiles (and caches) a validator for the given raw JSON Schema, or returns
 * `null` when the schema cannot be compiled (caller should fall back).
 */
export function buildAjvValidator(
  rawSchema: Record<string, unknown>,
): ((data: unknown) => SchemaValidationResult) | null {
  try {
    const ajv = getAjv();
    let validate = validatorCache.get(rawSchema);
    if (!validate) {
      validate = ajv.compile(rawSchema);
      validatorCache.set(rawSchema, validate);
    }
    return (data: unknown): SchemaValidationResult => {
      const valid = validate!(data) as boolean;
      if (valid) return { isValid: true, errors: [] };
      const errors = formatAjvErrors(validate!.errors ?? []);
      return { isValid: errors.length === 0, errors };
    };
  } catch {
    // Schema could not be compiled (unsupported construct, bad $ref, …).
    return null;
  }
}

/** Convert Ajv's `dataPath` (".a.b[0].c") into a bare "a.b[0].c" field path. */
function dataPathToFieldPath(dataPath: string | undefined): string {
  if (!dataPath) return '';
  return dataPath.replace(/^\./, '');
}

/** Map Ajv errors to deduplicated, manager-parseable message strings. */
function formatAjvErrors(errors: ErrorObject[]): string[] {
  const messages: string[] = [];
  const seen = new Set<string>();
  for (const err of errors) {
    if (SKIP_KEYWORDS.has(err.keyword)) continue;
    const msg = formatAjvError(err);
    if (msg && !seen.has(msg)) {
      seen.add(msg);
      messages.push(msg);
    }
  }
  return messages;
}

/**
 * Render a single Ajv error as `<path> <phrase>`, where the phrase matches one
 * of the patterns recognized by the validation-error-manager so the field can
 * be located and highlighted.
 */
function formatAjvError(err: ErrorObject): string {
  const base = dataPathToFieldPath(err.dataPath);
  const params = (err.params ?? {}) as Record<string, unknown>;
  const here = base || '(root)';

  switch (err.keyword) {
    case 'required': {
      const missing = String(params.missingProperty ?? '');
      const path = base ? `${base}.${missing}` : missing;
      return `${path} is required`;
    }
    case 'type': {
      const expected = String(params.type ?? 'value');
      if (expected === 'array') return `${here} must be an array`;
      if (expected === 'object') return `${here} must be an object`;
      return `${here} must be a valid ${expected}`;
    }
    case 'enum': {
      const allowed = Array.isArray(params.allowedValues)
        ? (params.allowedValues as unknown[]).map((v) => String(v)).join(', ')
        : '';
      return `${here} must be one of: ${allowed}`;
    }
    case 'const':
      return `${here} must be exactly: ${String(params.allowedValue ?? '')}`;
    case 'minimum':
      return `${here} must be at least ${String(params.limit ?? '')}`;
    case 'maximum':
      return `${here} must be at most ${String(params.limit ?? '')}`;
    case 'exclusiveMinimum':
      return `${here} must be greater than ${String(params.limit ?? '')}`;
    case 'exclusiveMaximum':
      return `${here} must be less than ${String(params.limit ?? '')}`;
    case 'multipleOf':
      return `${here} must be a multiple of ${String(params.multipleOf ?? '')}`;
    case 'minLength':
      return `${here} must be at least ${String(params.limit ?? '')} characters`;
    case 'maxLength':
      return `${here} must be at most ${String(params.limit ?? '')} characters`;
    case 'minItems':
      return `${here} must have at least ${String(params.limit ?? '')} items`;
    case 'maxItems':
      return `${here} must have at most ${String(params.limit ?? '')} items`;
    case 'uniqueItems':
      return `${here} items must be unique`;
    case 'pattern':
      return `${here} format is invalid`;
    case 'additionalProperties': {
      const extra = String(params.additionalProperty ?? '');
      const path = base ? `${base}.${extra}` : extra;
      return `${path} is not allowed`;
    }
    default:
      // Any other keyword: keep the path so the field can still be located.
      return `${here} must be a valid value`;
  }
}
