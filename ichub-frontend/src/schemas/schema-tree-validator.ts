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
 * Sistema de validación unificado basado en el árbol de SchemaNode
 * 
 * Recorre el árbol de forma recursiva y valida cada nodo contra los datos,
 * generando ValidationError estructurados con metadata completa.
 */

import {
  SchemaNode,
  NodeType,
  PrimitiveType,
  ValidationError,
  ValidationResult,
  ValidationRules
} from '../models/schema-node';
import { FieldIdentifier } from '../utils/field-identifier';

/**
 * Valida datos contra un árbol de SchemaNode
 * 
 * @param rootNodes - Mapa de nodos raíz del schema
 * @param data - Datos a validar
 * @returns Resultado de validación con errores estructurados
 */
export function validateSchemaTree(
  rootNodes: Map<string, SchemaNode>,
  data: any
): ValidationResult {
  const errors: ValidationError[] = [];
  const errorsByField = new Map<string, ValidationError[]>();
  const fieldsWithErrors = new Set<string>();
  const sectionsWithErrors = new Set<string>();

  // Validar cada nodo raíz
  for (const [key, node] of rootNodes.entries()) {
    const value = data?.[key];
    validateNode(node, value, errors, data);
  }

  // Organizar errores por campo
  for (const error of errors) {
    if (!errorsByField.has(error.fieldId)) {
      errorsByField.set(error.fieldId, []);
    }
    errorsByField.get(error.fieldId)!.push(error);
    fieldsWithErrors.add(error.fieldId);
    sectionsWithErrors.add(error.section);
  }

  return {
    isValid: errors.length === 0,
    errors,
    errorsByField,
    fieldsWithErrors,
    sectionsWithErrors: Array.from(sectionsWithErrors)
  };
}

/**
 * Valida un nodo individual recursivamente
 */
function validateNode(
  node: SchemaNode,
  value: any,
  errors: ValidationError[],
  rootData: any,
  runtimeIndex?: number
): void {
  // Generate appropriate fieldId (with index if it's an array element)
  const fieldId = runtimeIndex !== undefined
    ? FieldIdentifier.generate([...FieldIdentifier.parse(node.id).segments.slice(0, -1), runtimeIndex, node.key])
    : node.id;

  // Validate required
  if (node.required && isEmpty(value)) {
    errors.push(createError(
      fieldId,
      `El campo '${node.label}' es obligatorio`,
      'required',
      node.section,
      'error',
      value
    ));
    return; // If it's required and empty, don't validate additional rules
  }

  // If it's optional and empty, don't validate
  if (!node.required && isEmpty(value)) {
    return;
  }

  // Validar según tipo de nodo
  switch (node.nodeType) {
    case NodeType.PRIMITIVE:
      validatePrimitiveNode(node, value, fieldId, errors);
      break;

    case NodeType.OBJECT:
      validateObjectNode(node, value, fieldId, errors, rootData);
      break;

    case NodeType.ARRAY:
      validateArrayNode(node, value, fieldId, errors, rootData);
      break;
  }
}

/**
 * Valida un nodo primitivo
 */
function validatePrimitiveNode(
  node: SchemaNode,
  value: any,
  fieldId: string,
  errors: ValidationError[]
): void {
  if (!node.validationRules) {
    return;
  }

  const rules = node.validationRules;

  // Validación numérica
  if (node.primitiveType === PrimitiveType.NUMBER || node.primitiveType === PrimitiveType.INTEGER) {
    validateNumericRules(node, value, fieldId, rules, errors);
  }

  // Validación de string
  if (node.primitiveType === PrimitiveType.STRING || 
      node.primitiveType === PrimitiveType.TEXTAREA ||
      node.primitiveType === PrimitiveType.EMAIL ||
      node.primitiveType === PrimitiveType.URL) {
    validateStringRules(node, value, fieldId, rules, errors);
  }

  // Validación de enum
  if (rules.enum && !rules.enum.includes(value)) {
    errors.push(createError(
      fieldId,
      `'${node.label}' debe ser uno de: ${rules.enum.join(', ')}`,
      'enum',
      node.section,
      'error',
      value
    ));
  }

  // Validación de const
  if (rules.const !== undefined && value !== rules.const) {
    errors.push(createError(
      fieldId,
      `'${node.label}' debe ser exactamente: ${rules.const}`,
      'const',
      node.section,
      'error',
      value
    ));
  }

  // Validación de formato
  if (rules.format) {
    validateFormat(node, value, fieldId, rules.format, errors);
  }

  // Validaciones custom
  if (rules.custom) {
    for (const customRule of rules.custom) {
      if (customRule.validator && !customRule.validator(value)) {
        errors.push(createError(
          fieldId,
          customRule.message,
          customRule.rule,
          node.section,
          'error',
          value
        ));
      }
    }
  }
}

/**
 * Valida reglas numéricas
 */
function validateNumericRules(
  node: SchemaNode,
  value: any,
  fieldId: string,
  rules: ValidationRules,
  errors: ValidationError[]
): void {
  const numValue = Number(value);

  if (isNaN(numValue)) {
    errors.push(createError(
      fieldId,
      `'${node.label}' debe ser un número válido`,
      'type',
      node.section,
      'error',
      value
    ));
    return;
  }

  if (rules.min !== undefined) {
    if (rules.exclusiveMin && numValue <= rules.min) {
      errors.push(createError(
        fieldId,
        `'${node.label}' debe ser mayor que ${rules.min}`,
        'minimum',
        node.section,
        'error',
        value
      ));
    } else if (!rules.exclusiveMin && numValue < rules.min) {
      errors.push(createError(
        fieldId,
        `'${node.label}' debe ser al menos ${rules.min}`,
        'minimum',
        node.section,
        'error',
        value
      ));
    }
  }

  if (rules.max !== undefined) {
    if (rules.exclusiveMax && numValue >= rules.max) {
      errors.push(createError(
        fieldId,
        `'${node.label}' debe ser menor que ${rules.max}`,
        'maximum',
        node.section,
        'error',
        value
      ));
    } else if (!rules.exclusiveMax && numValue > rules.max) {
      errors.push(createError(
        fieldId,
        `'${node.label}' debe ser como máximo ${rules.max}`,
        'maximum',
        node.section,
        'error',
        value
      ));
    }
  }

  if (rules.multipleOf !== undefined && numValue % rules.multipleOf !== 0) {
    errors.push(createError(
      fieldId,
      `'${node.label}' debe ser múltiplo de ${rules.multipleOf}`,
      'multipleOf',
      node.section,
      'error',
      value
    ));
  }
}

/**
 * Valida reglas de string
 */
function validateStringRules(
  node: SchemaNode,
  value: any,
  fieldId: string,
  rules: ValidationRules,
  errors: ValidationError[]
): void {
  const strValue = String(value);

  if (rules.minLength !== undefined && strValue.length < rules.minLength) {
    errors.push(createError(
      fieldId,
      `'${node.label}' debe tener al menos ${rules.minLength} caracteres`,
      'minLength',
      node.section,
      'error',
      value
    ));
  }

  if (rules.maxLength !== undefined && strValue.length > rules.maxLength) {
    errors.push(createError(
      fieldId,
      `'${node.label}' debe tener como máximo ${rules.maxLength} caracteres`,
      'maxLength',
      node.section,
      'error',
      value
    ));
  }

  if (rules.pattern) {
    try {
      const regex = new RegExp(rules.pattern);
      if (!regex.test(strValue)) {
        errors.push(createError(
          fieldId,
          `'${node.label}' no cumple el formato requerido`,
          'pattern',
          node.section,
          'error',
          value
        ));
      }
    } catch (e) {
      console.error(`Invalid regex pattern for ${fieldId}: ${rules.pattern}`);
    }
  }
}

/**
 * Valida formato específico
 */
function validateFormat(
  node: SchemaNode,
  value: any,
  fieldId: string,
  format: string,
  errors: ValidationError[]
): void {
  const strValue = String(value);
  let isValid = true;
  let message = '';

  switch (format) {
    case 'email':
      isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(strValue);
      message = 'debe ser una dirección de correo válida';
      break;

    case 'uri':
    case 'uri-reference':
      try {
        new URL(strValue);
      } catch {
        isValid = false;
      }
      message = 'debe ser una URL válida';
      break;

    case 'date':
      isValid = /^\d{4}-\d{2}-\d{2}$/.test(strValue);
      message = 'debe estar en formato AAAA-MM-DD';
      break;

    case 'date-time':
      isValid = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(strValue);
      message = 'debe estar en formato ISO 8601 (AAAA-MM-DDTHH:MM:SS)';
      break;

    case 'time':
      isValid = /^\d{2}:\d{2}:\d{2}$/.test(strValue);
      message = 'debe estar en formato HH:MM:SS';
      break;

    case 'ipv4':
      isValid = /^(\d{1,3}\.){3}\d{1,3}$/.test(strValue);
      message = 'debe ser una dirección IPv4 válida';
      break;

    case 'ipv6':
      isValid = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/.test(strValue);
      message = 'debe ser una dirección IPv6 válida';
      break;

    case 'uuid':
      isValid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(strValue);
      message = 'debe ser un UUID válido';
      break;

    default:
      return; // Formato no reconocido
  }

  if (!isValid) {
    errors.push(createError(
      fieldId,
      `'${node.label}' ${message}`,
      'format',
      node.section,
      'error',
      value
    ));
  }
}

/**
 * Valida un nodo objeto
 */
function validateObjectNode(
  node: SchemaNode,
  value: any,
  fieldId: string,
  errors: ValidationError[],
  rootData: any
): void {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    if (node.required) {
      errors.push(createError(
        fieldId,
        `'${node.label}' debe ser un objeto`,
        'type',
        node.section,
        'error',
        value
      ));
    }
    return;
  }

  // Validar cada propiedad hija
  if (node.properties) {
    for (const [childKey, childNode] of node.properties.entries()) {
      const childValue = value[childKey];
      validateNode(childNode, childValue, errors, rootData);
    }
  }
}

/**
 * Valida un nodo array
 */
function validateArrayNode(
  node: SchemaNode,
  value: any,
  fieldId: string,
  errors: ValidationError[],
  rootData: any
): void {
  if (!Array.isArray(value)) {
    if (node.required) {
      errors.push(createError(
        fieldId,
        `'${node.label}' debe ser un array`,
        'type',
        node.section,
        'error',
        value
      ));
    }
    return;
  }

  // Validar constraints del array
  if (node.arrayConstraints) {
    const constraints = node.arrayConstraints;

    if (constraints.minItems !== undefined && value.length < constraints.minItems) {
      errors.push(createError(
        fieldId,
        `'${node.label}' debe tener al menos ${constraints.minItems} elemento${constraints.minItems !== 1 ? 's' : ''}`,
        'minItems',
        node.section,
        'error',
        value
      ));
    }

    if (constraints.maxItems !== undefined && value.length > constraints.maxItems) {
      errors.push(createError(
        fieldId,
        `'${node.label}' debe tener como máximo ${constraints.maxItems} elemento${constraints.maxItems !== 1 ? 's' : ''}`,
        'maxItems',
        node.section,
        'error',
        value
      ));
    }

    if (constraints.uniqueItems) {
      const uniqueValues = new Set(value.map((v: any) => JSON.stringify(v)));
      if (uniqueValues.size !== value.length) {
        errors.push(createError(
          fieldId,
          `'${node.label}' no puede contener elementos duplicados`,
          'uniqueItems',
          node.section,
          'error',
          value
        ));
      }
    }
  }

  // Validar cada elemento del array
  if (node.itemSchema && value.length > 0) {
    value.forEach((item: any, index: number) => {
      validateNode(node.itemSchema!, item, errors, rootData, index);
    });
  }
}

/**
 * Crea un objeto ValidationError
 */
function createError(
  fieldId: string,
  message: string,
  rule: string,
  section: string,
  severity: 'error' | 'warning',
  value?: any
): ValidationError {
  const parsed = FieldIdentifier.parse(fieldId);

  return {
    fieldId,
    message,
    rule,
    severity,
    value,
    arrayPath: parsed.arrayPaths.length > 0 ? parsed.arrayPaths[parsed.arrayPaths.length - 1] : undefined,
    arrayIndex: parsed.indices.find(idx => idx !== null) ?? undefined,
    section,
    timestamp: Date.now()
  };
}

/**
 * Verifica si un valor está vacío
 */
function isEmpty(value: any): boolean {
  if (value === undefined || value === null) {
    return true;
  }

  if (typeof value === 'string' && value.trim() === '') {
    return true;
  }

  if (Array.isArray(value) && value.length === 0) {
    return true;
  }

  return false;
}

/**
 * Obtiene valor de un path en un objeto
 */
export function getValueByPath(obj: any, path: string): any {
  const segments = path.split('.');
  let current = obj;

  for (const segment of segments) {
    // Manejar índices de array
    const arrayMatch = segment.match(/^(.+)\[(\d+)\]$/);
    if (arrayMatch) {
      const [, arrayName, index] = arrayMatch;
      current = current?.[arrayName]?.[parseInt(index, 10)];
    } else {
      current = current?.[segment];
    }

    if (current === undefined) {
      return undefined;
    }
  }

  return current;
}

/**
 * Establece valor en un path de un objeto
 */
export function setValueByPath(obj: any, path: string, value: any): void {
  const segments = path.split('.');
  let current = obj;

  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i];

    // Manejar índices de array
    const arrayMatch = segment.match(/^(.+)\[(\d+)\]$/);
    if (arrayMatch) {
      const [, arrayName, index] = arrayMatch;
      const idx = parseInt(index, 10);

      if (!current[arrayName]) {
        current[arrayName] = [];
      }

      if (!current[arrayName][idx]) {
        current[arrayName][idx] = {};
      }

      current = current[arrayName][idx];
    } else {
      if (!current[segment]) {
        current[segment] = {};
      }
      current = current[segment];
    }
  }

  const lastSegment = segments[segments.length - 1];
  const arrayMatch = lastSegment.match(/^(.+)\[(\d+)\]$/);

  if (arrayMatch) {
    const [, arrayName, index] = arrayMatch;
    const idx = parseInt(index, 10);

    if (!current[arrayName]) {
      current[arrayName] = [];
    }

    current[arrayName][idx] = value;
  } else {
    current[lastSegment] = value;
  }
}
