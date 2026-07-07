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

import { FieldIdentifier } from '../utils/field-identifier';

/**
 * Node type according to schema structure
 */
export enum NodeType {
  /** Primitive value: string, number, boolean, etc. */
  PRIMITIVE = 'primitive',
  /** Object with nested properties */
  OBJECT = 'object',
  /** Array of elements (primitives or objects) */
  ARRAY = 'array'
}

/**
 * Primitive data type
 */
export enum PrimitiveType {
  STRING = 'string',
  NUMBER = 'number',
  INTEGER = 'integer',
  BOOLEAN = 'boolean',
  DATE = 'date',
  DATETIME = 'datetime',
  TIME = 'time',
  EMAIL = 'email',
  URL = 'url',
  TEXTAREA = 'textarea',
  PASSWORD = 'password',
  ENUM = 'enum',
  RADIO = 'radio',
  CHECKBOX = 'checkbox'
}

/**
 * Validation rules associated with a node
 */
export interface ValidationRules {
  // Numeric rules
  min?: number;
  max?: number;
  exclusiveMin?: boolean;
  exclusiveMax?: boolean;
  multipleOf?: number;

  // String rules
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string;

  // Array rules
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;

  // Enum/const rules
  enum?: any[];
  const?: any;

  // Additional custom rules
  custom?: {
    rule: string;
    message: string;
    validator?: (value: any) => boolean;
  }[];
}

/**
 * Schema tree node
 * Represents an attribute at any level of the hierarchy
 */
export interface SchemaNode {
  /** Unique identifier: "user.emails[0].value" */
  id: string;
  /** Property name without path: "value" */
  key: string;
  /** User-readable label */
  label: string;
  /** Node type: primitive, object, array */
  nodeType: NodeType;
  /** Specific primitive type (only if nodeType === PRIMITIVE) */
  primitiveType?: PrimitiveType;
  /** Field description */
  description?: string;
  /** Semantic URN (SAMM extension) */
  urn?: string;
  /** Whether the field is required */
  required: boolean;
  /** Associated validation rules */
  validationRules?: ValidationRules;
  /** Default value */
  defaultValue?: any;
  /** Options for enums/select */
  options?: Array<{ value: any; label: string }>;
  /** Depth in the tree (0 = root) */
  depth: number;
  /** Parent node identifier */
  parentId: string | null;
  /** Path of the section/group it belongs to */
  section: string;
  // --- For OBJECT nodes ---
  /** Object properties (map key -> child node) */
  properties?: Map<string, SchemaNode>;
  // --- For ARRAY nodes ---
  /** Type of elements contained in the array */
  itemType?: 'primitive' | 'object' | 'array';
  /** Array element schema (template to create items) */
  itemSchema?: SchemaNode;
  /** Array cardinality constraints */
  arrayConstraints?: {
    minItems?: number;
    maxItems?: number;
    uniqueItems?: boolean;
  };
  // --- Metadata for rendering ---
  /** Whether it is a top-level section */
  isTopLevel: boolean;
  /** Rendering order */
  order: number;
  /** Whether it should be collapsed by default */
  collapsedByDefault?: boolean;
  /** Placeholder for the input */
  placeholder?: string;
  /** Additional visual hints */
  helpText?: string;
}

/**
 * Structured validation error
 */
export interface ValidationError {
  /** Field identifier with error: "user.emails[0].value" */
  fieldId: string;

  /** Readable error message */
  message: string;

  /** Violated validation rule */
  rule: string;

  /** Error severity */
  severity: 'error' | 'warning';

  /** Value that caused the error */
  value?: any;

  /** Parent array path if applicable: "user.emails" */
  arrayPath?: string;

  /** Element index in the array if applicable */
  arrayIndex?: number;

  /** Affected section identifier */
  section: string;

  /** Error timestamp */
  timestamp: number;
}

/**
 * Validation result of a complete tree
 */
export interface ValidationResult {
  /** Whether the complete schema is valid */
  isValid: boolean;

  /** Array of all errors found */
  errors: ValidationError[];

  /** Quick map: fieldId -> errors of that field */
  errorsByField: Map<string, ValidationError[]>;

  /** Set of fieldIds with errors (lookup O(1)) */
  fieldsWithErrors: Set<string>;

  /** Array of sections with errors */
  sectionsWithErrors: string[];
}

/**
 * Options for tree construction
 */
export interface SchemaTreeOptions {
  /** Maximum allowed depth */
  maxDepth?: number;

  /** Whether to include optional fields */
  includeOptional?: boolean;

  /** Prefix for generated IDs */
  idPrefix?: string;

  /** Whether to collapse objects by default */
  collapseObjectsByDefault?: boolean;

  /** Whether to collapse arrays by default */
  collapseArraysByDefault?: boolean;
}

/**
 * Builder to construct tree nodes in a fluent way
 */
export class SchemaNodeBuilder {
  private node: Partial<SchemaNode>;

  constructor(key: string, nodeType: NodeType) {
    this.node = {
      key,
      nodeType,
      required: false,
      depth: 0,
      parentId: null,
      section: key,
      isTopLevel: true,
      order: 0
    };
  }

  id(id: string): this {
    this.node.id = id;
    return this;
  }

  label(label: string): this {
    this.node.label = label;
    return this;
  }

  primitiveType(type: PrimitiveType): this {
    this.node.primitiveType = type;
    return this;
  }

  description(desc: string): this {
    this.node.description = desc;
    return this;
  }

  urn(urn: string): this {
    this.node.urn = urn;
    return this;
  }

  required(required: boolean): this {
    this.node.required = required;
    return this;
  }

  validationRules(rules: ValidationRules): this {
    this.node.validationRules = rules;
    return this;
  }

  defaultValue(value: any): this {
    this.node.defaultValue = value;
    return this;
  }

  options(options: Array<{ value: any; label: string }>): this {
    this.node.options = options;
    return this;
  }

  depth(depth: number): this {
    this.node.depth = depth;
    return this;
  }

  parentId(parentId: string | null): this {
    this.node.parentId = parentId;
    return this;
  }

  section(section: string): this {
    this.node.section = section;
    return this;
  }

  properties(props: Map<string, SchemaNode>): this {
    this.node.properties = props;
    return this;
  }

  itemType(type: 'primitive' | 'object' | 'array'): this {
    this.node.itemType = type;
    return this;
  }

  itemSchema(schema: SchemaNode): this {
    this.node.itemSchema = schema;
    return this;
  }

  arrayConstraints(constraints: NonNullable<SchemaNode['arrayConstraints']>): this {
    this.node.arrayConstraints = constraints;
    return this;
  }

  isTopLevel(isTop: boolean): this {
    this.node.isTopLevel = isTop;
    return this;
  }

  order(order: number): this {
    this.node.order = order;
    return this;
  }

  collapsedByDefault(collapsed: boolean): this {
    this.node.collapsedByDefault = collapsed;
    return this;
  }

  placeholder(placeholder: string): this {
    this.node.placeholder = placeholder;
    return this;
  }

  helpText(text: string): this {
    this.node.helpText = text;
    return this;
  }

  build(): SchemaNode {
    if (!this.node.id || !this.node.label) {
      throw new Error('SchemaNode must have id and label');
    }
    return this.node as SchemaNode;
  }
}

/**
 * Utilities for working with schema trees
 */
export class SchemaTreeUtils {
  /**
   * Finds a node by its ID in the tree
   */
  static findNodeById(root: SchemaNode, id: string): SchemaNode | null {
    if (root.id === id) {
      return root;
    }

    // Search in properties (object)
    if (root.properties) {
      for (const child of root.properties.values()) {
        const found = this.findNodeById(child, id);
        if (found) return found;
      }
    }

    // Search in itemSchema (array)
    if (root.itemSchema) {
      const found = this.findNodeById(root.itemSchema, id);
      if (found) return found;
    }

    return null;
  }

  /**
   * Gets all descendant nodes of a node
   */
  static getDescendants(node: SchemaNode): SchemaNode[] {
    const descendants: SchemaNode[] = [];

    if (node.properties) {
      for (const child of node.properties.values()) {
        descendants.push(child);
        descendants.push(...this.getDescendants(child));
      }
    }

    if (node.itemSchema) {
      descendants.push(node.itemSchema);
      descendants.push(...this.getDescendants(node.itemSchema));
    }

    return descendants;
  }

  /**
   * Gets all primitive nodes of the tree
   */
  static getPrimitiveNodes(node: SchemaNode): SchemaNode[] {
    const primitives: SchemaNode[] = [];

    if (node.nodeType === NodeType.PRIMITIVE) {
      primitives.push(node);
    }

    if (node.properties) {
      for (const child of node.properties.values()) {
        primitives.push(...this.getPrimitiveNodes(child));
      }
    }

    if (node.itemSchema) {
      primitives.push(...this.getPrimitiveNodes(node.itemSchema));
    }

    return primitives;
  }

  /**
   * Gets all nodes that are arrays
   */
  static getArrayNodes(node: SchemaNode): SchemaNode[] {
    const arrays: SchemaNode[] = [];

    if (node.nodeType === NodeType.ARRAY) {
      arrays.push(node);
    }

    if (node.properties) {
      for (const child of node.properties.values()) {
        arrays.push(...this.getArrayNodes(child));
      }
    }

    if (node.itemSchema) {
      arrays.push(...this.getArrayNodes(node.itemSchema));
    }

    return arrays;
  }

  /**
   * Gets the ancestor path to a node
   */
  static getAncestorPath(root: SchemaNode, targetId: string): SchemaNode[] {
    const path: SchemaNode[] = [];
    
    const traverse = (node: SchemaNode): boolean => {
      if (node.id === targetId) {
        path.push(node);
        return true;
      }

      if (node.properties) {
        for (const child of node.properties.values()) {
          if (traverse(child)) {
            path.unshift(node);
            return true;
          }
        }
      }

      if (node.itemSchema && traverse(node.itemSchema)) {
        path.unshift(node);
        return true;
      }

      return false;
    };

    traverse(root);
    return path;
  }

  /**
   * Calculates tree statistics
   */
  static getTreeStats(root: SchemaNode): {
    totalNodes: number;
    primitiveNodes: number;
    objectNodes: number;
    arrayNodes: number;
    maxDepth: number;
    requiredNodes: number;
  } {
    let totalNodes = 0;
    let primitiveNodes = 0;
    let objectNodes = 0;
    let arrayNodes = 0;
    let maxDepth = 0;
    let requiredNodes = 0;

    const traverse = (node: SchemaNode) => {
      totalNodes++;
      maxDepth = Math.max(maxDepth, node.depth);
      
      if (node.required) requiredNodes++;

      switch (node.nodeType) {
        case NodeType.PRIMITIVE:
          primitiveNodes++;
          break;
        case NodeType.OBJECT:
          objectNodes++;
          break;
        case NodeType.ARRAY:
          arrayNodes++;
          break;
      }

      if (node.properties) {
        for (const child of node.properties.values()) {
          traverse(child);
        }
      }

      if (node.itemSchema) {
        traverse(node.itemSchema);
      }
    };

    traverse(root);

    return {
      totalNodes,
      primitiveNodes,
      objectNodes,
      arrayNodes,
      maxDepth,
      requiredNodes
    };
  }

  /**
   * Converts the tree to a flat representation
   * Useful for debugging and visualization
   */
  static flatten(root: SchemaNode): Array<{
    id: string;
    depth: number;
    type: NodeType;
    required: boolean;
  }> {
    const flat: Array<{
      id: string;
      depth: number;
      type: NodeType;
      required: boolean;
    }> = [];

    const traverse = (node: SchemaNode) => {
      flat.push({
        id: node.id,
        depth: node.depth,
        type: node.nodeType,
        required: node.required
      });

      if (node.properties) {
        for (const child of node.properties.values()) {
          traverse(child);
        }
      }

      if (node.itemSchema) {
        traverse(node.itemSchema);
      }
    };

    traverse(root);
    return flat;
  }
}
