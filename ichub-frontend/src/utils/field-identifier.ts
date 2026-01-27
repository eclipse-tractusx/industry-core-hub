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
 * Unique identification system for attributes in nested JSON structures.
 * 
 * Generates deterministic identifiers based on the attribute path:
 * - Objects: dot notation (user.address.street)
 * - Arrays: index notation (emails[0].value)
 * - Combinations: user.orders[0].items[1].sku
 * 
 * @example
 * // Generate identifier
 * FieldIdentifier.generate(['user', 'emails', 0, 'value'])
 * // => "user.emails[0].value"
 * 
 * @example
 * // Parse identifier
 * FieldIdentifier.parse('user.emails[0].value')
 * // => {
 * //   segments: ['user', 'emails', 'value'],
 * //   indices: [null, 0, null],
 * //   arrayPaths: ['user.emails'],
 * //   depth: 3
 * // }
 */

/**
 * Path segment that can be a string or array index
 */
export type PathSegment = string | number;

/**
 * Result of parsing an identifier
 */
export interface ParsedIdentifier {
  /** Path segments without indices: ['user', 'emails', 'value'] */
  segments: string[];
  /** Array indices by position: [null, 0, null] */
  indices: (number | null)[];
  /** Complete array paths: ['user.emails'] */
  arrayPaths: string[];
  /** Total path depth */
  depth: number;
  /** Original path */
  original: string;
  /** Whether the identifier points to an array element */
  isArrayElement: boolean;
  /** Path without indices: user.emails.value */
  schemaPath: string;
}

/**
 * Main class for managing unique field identifiers
 */
export class FieldIdentifier {
  /**
   * Generates a unique identifier from path segments
   * 
   * @param segments - Array of segments (strings or numbers for indices)
   * @returns Identifier in format "parent.child[0].property"
   * 
   * @example
   * FieldIdentifier.generate(['user', 'emails', 0, 'value'])
   * // => "user.emails[0].value"
   * 
   * @example
   * FieldIdentifier.generate(['orders', 0, 'items', 1, 'sku'])
   * // => "orders[0].items[1].sku"
   */
  static generate(segments: PathSegment[]): string {
    if (segments.length === 0) {
      return '';
    }

    let identifier = '';
    let isNextAfterArray = false;

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];

      if (typeof segment === 'number') {
        // Array index
        identifier += `[${segment}]`;
        isNextAfterArray = true;
      } else {
        // Object property
        if (identifier && !isNextAfterArray) {
          identifier += '.';
        }
        identifier += segment;
        isNextAfterArray = false;
      }
    }

    return identifier;
  }

  /**
   * Generates a schema identifier (without concrete indices)
   * Useful for matching and schema definition
   * 
   * @param segments - Array of segments (strings or 'item' for arrays)
   * @returns Identifier in format "parent.child[item].property"
   * 
   * @example
   * FieldIdentifier.generateSchemaPath(['user', 'emails', 'item', 'value'])
   * // => "user.emails[item].value"
   */
  static generateSchemaPath(segments: PathSegment[]): string {
    return this.generate(
      segments.map(seg => typeof seg === 'number' ? 'item' : seg)
    );
  }

  /**
   * Parses an identifier to extract its components
   * 
   * @param identifier - Identifier in format "parent.child[0].property"
   * @returns ParsedIdentifier object with structured information
   * 
   * @example
   * FieldIdentifier.parse('user.emails[0].value')
   * // => {
   * //   segments: ['user', 'emails', 'value'],
   * //   indices: [null, 0, null],
   * //   arrayPaths: ['user.emails'],
   * //   depth: 3,
   * //   original: 'user.emails[0].value',
   * //   isArrayElement: true,
   * //   schemaPath: 'user.emails.value'
   * // }
   */
  static parse(identifier: string): ParsedIdentifier {
    const segments: string[] = [];
    const indices: (number | null)[] = [];
    const arrayPaths: string[] = [];
    
    // Regex to capture segments and arrays
    // Captures: "property", "[index]", or ".property"
    const pattern = /([^.\[\]]+)|\[(\d+)\]/g;
    let match: RegExpExecArray | null;
    let currentPath = '';
    let lastWasArray = false;

    while ((match = pattern.exec(identifier)) !== null) {
      if (match[1]) {
        // It's a property name
        segments.push(match[1]);
        indices.push(null);
        
        if (currentPath && !lastWasArray) {
          currentPath += '.';
        }
        currentPath += match[1];
        lastWasArray = false;
      } else if (match[2]) {
        // It's an array index
        const index = parseInt(match[2], 10);
        indices[indices.length - 1] = index;
        
        // Register the array path
        if (!arrayPaths.includes(currentPath)) {
          arrayPaths.push(currentPath);
        }
        
        lastWasArray = true;
      }
    }

    // Generate schemaPath (without indices)
    let schemaPath = '';
    for (let i = 0; i < segments.length; i++) {
      if (i > 0) {
        schemaPath += '.';
      }
      schemaPath += segments[i];
    }

    return {
      segments,
      indices,
      arrayPaths,
      depth: segments.length,
      original: identifier,
      isArrayElement: indices.some(idx => idx !== null),
      schemaPath
    };
  }

  /**
   * Checks if an identifier matches a pattern
   * Supports wildcards for array indices
   * 
   * @param identifier - Concrete identifier: "user.emails[0].value"
   * @param pattern - Pattern with wildcards: "user.emails[*].value"
   * @returns true if it matches
   * 
   * @example
   * FieldIdentifier.matches('user.emails[0].value', 'user.emails[*].value')
   * // => true
   * 
   * @example
   * FieldIdentifier.matches('user.emails[0].value', 'user.*.value')
   * // => false (does not support wildcards in properties)
   */
  static matches(identifier: string, pattern: string): boolean {
    // Convert pattern to regex
    // Escape special characters except * and []
    const escapedPattern = pattern
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\\\*/g, '\\d+'); // * converts to \d+
    
    const regex = new RegExp(`^${escapedPattern}$`);
    return regex.test(identifier);
  }

  /**
   * Extracts the parent identifier from an identifier
   * 
   * @param identifier - Complete identifier
   * @returns Parent identifier or null if it's root
   * 
   * @example
   * FieldIdentifier.getParent('user.emails[0].value')
   * // => "user.emails[0]"
   * 
   * @example
   * FieldIdentifier.getParent('user.emails[0]')
   * // => "user.emails"
   * 
   * @example
   * FieldIdentifier.getParent('user')
   * // => null
   */
  static getParent(identifier: string): string | null {
    const parsed = this.parse(identifier);
    
    if (parsed.depth <= 1) {
      return null;
    }

    // Rebuild without the last segment
    const parentSegments: PathSegment[] = [];
    
    for (let i = 0; i < parsed.segments.length - 1; i++) {
      parentSegments.push(parsed.segments[i]);
      if (parsed.indices[i] !== null) {
        parentSegments.push(parsed.indices[i]!);
      }
    }

    return this.generate(parentSegments);
  }

  /**
   * Gets all ancestor identifiers of an identifier
   * 
   * @param identifier - Complete identifier
   * @returns Array of identifiers from root to immediate parent
   * 
   * @example
   * FieldIdentifier.getAncestors('user.emails[0].value')
   * // => ['user', 'user.emails', 'user.emails[0]']
   */
  static getAncestors(identifier: string): string[] {
    const ancestors: string[] = [];
    let current: string | null = identifier;

    while (true) {
      current = this.getParent(current);
      if (current === null) {
        break;
      }
      ancestors.unshift(current);
    }

    return ancestors;
  }

  /**
   * Checks if an identifier is a descendant of another
   * 
   * @param identifier - Identifier to check
   * @param ancestor - Possible ancestor
   * @returns true if identifier is a descendant of ancestor
   * 
   * @example
   * FieldIdentifier.isDescendantOf('user.emails[0].value', 'user')
   * // => true
   * 
   * @example
   * FieldIdentifier.isDescendantOf('user.emails[0].value', 'user.emails')
   * // => true
   * 
   * @example
   * FieldIdentifier.isDescendantOf('user.name', 'user.emails')
   * // => false
   */
  static isDescendantOf(identifier: string, ancestor: string): boolean {
    return identifier.startsWith(ancestor + '.') || 
           identifier.startsWith(ancestor + '[');
  }

  /**
   * Normalizes an identifier by removing array indices
   * Useful for matching against schema definitions
   * 
   * @param identifier - Identifier with indices
   * @returns Identifier without indices
   * 
   * @example
   * FieldIdentifier.normalize('user.emails[0].value')
   * // => "user.emails.value"
   */
  static normalize(identifier: string): string {
    return identifier.replace(/\[\d+\]/g, '');
  }

  /**
   * Gets the array index of a specific segment
   * 
   * @param identifier - Complete identifier
   * @param arrayPath - Array path
   * @returns Array index or null if not an array element
   * 
   * @example
   * FieldIdentifier.getArrayIndex('user.emails[2].value', 'user.emails')
   * // => 2
   */
  static getArrayIndex(identifier: string, arrayPath: string): number | null {
    const parsed = this.parse(identifier);
    
    // Search for the index of arrayPath in segments
    const arraySegments = arrayPath.split('.');
    let matchIndex = -1;
    
    for (let i = 0; i < parsed.segments.length; i++) {
      const currentPath = parsed.segments.slice(0, i + 1).join('.');
      if (currentPath === arrayPath) {
        matchIndex = i;
        break;
      }
    }
    
    if (matchIndex === -1) {
      return null;
    }
    
    return parsed.indices[matchIndex];
  }

  /**
   * Replaces the array index in an identifier
   * 
   * @param identifier - Original identifier
   * @param arrayPath - Path of the array to modify
   * @param newIndex - New index
   * @returns New identifier with updated index
   * 
   * @example
   * FieldIdentifier.replaceArrayIndex('user.emails[0].value', 'user.emails', 2)
   * // => "user.emails[2].value"
   */
  static replaceArrayIndex(
    identifier: string, 
    arrayPath: string, 
    newIndex: number
  ): string {
    const parsed = this.parse(identifier);
    
    // Find the segment corresponding to arrayPath
    const arraySegments = arrayPath.split('.');
    let matchIndex = -1;
    
    for (let i = 0; i < parsed.segments.length; i++) {
      const currentPath = parsed.segments.slice(0, i + 1).join('.');
      if (currentPath === arrayPath) {
        matchIndex = i;
        break;
      }
    }
    
    if (matchIndex === -1) {
      return identifier;
    }
    
    // Rebuild with new index
    const newSegments: PathSegment[] = [];
    for (let i = 0; i < parsed.segments.length; i++) {
      newSegments.push(parsed.segments[i]);
      if (i === matchIndex) {
        newSegments.push(newIndex);
      } else if (parsed.indices[i] !== null && i !== matchIndex) {
        newSegments.push(parsed.indices[i]!);
      }
    }
    
    return this.generate(newSegments);
  }
}
