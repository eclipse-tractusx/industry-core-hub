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
 * Pattern Example Generator
 * 
 * Generates example values that match common regex patterns used in JSON Schemas.
 * This utility helps users understand the expected format for fields with pattern validation.
 */

// Known pattern mappings - these are common patterns used in Catena-X / Tractus-X schemas
const KNOWN_PATTERNS: Record<string, { example: string; description: string }> = {
    // UUID patterns
    '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$': {
        example: '550e8400-e29b-41d4-a716-446655440000',
        description: 'UUID format'
    },
    '(^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$)|(^urn:uuid:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$)': {
        example: 'urn:uuid:550e8400-e29b-41d4-a716-446655440000',
        description: 'UUID or URN:UUID format'
    },

    // BPN patterns (Business Partner Numbers)
    '^BPNL[a-zA-Z0-9]{12}$': {
        example: 'BPNL00000003CSGV',
        description: 'Business Partner Number Legal Entity'
    },
    '^BPNA[a-zA-Z0-9]{12}$': {
        example: 'BPNA00000003CSGV',
        description: 'Business Partner Number Address'
    },
    '^BPNS[a-zA-Z0-9]{12}$': {
        example: 'BPNS00000003CSGV',
        description: 'Business Partner Number Site'
    },

    // Date patterns
    '^\\d{4}-\\d{2}-\\d{2}$': {
        example: '2024-01-15',
        description: 'Date in YYYY-MM-DD format'
    },
    '^\\d{4}[-.\\s]?\\d{2}[-.\\s]?\\d{4}$': {
        example: '1234-56-7890',
        description: 'Numeric code format'
    },

    // ISO DateTime pattern
    '-?([1-9][0-9]{3,}|0[0-9]{3})-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T(([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](\\.[0-9]+)?|(24:00:00(\\.0+)?))(Z|(\\+|-)((0[0-9]|1[0-3]):[0-5][0-9]|14:00))?': {
        example: '2024-01-15T10:30:00Z',
        description: 'ISO 8601 DateTime format'
    },

    // Country codes
    '^[A-Z]{2}$': {
        example: 'DE',
        description: 'Two-letter country code (ISO 3166-1 alpha-2)'
    },
    '^[A-Z]{3}$': {
        example: 'EUR',
        description: 'Three-letter code (e.g., currency code)'
    },

    // Identifier patterns
    '^(manufacturerId|partInstanceId|batchId|van|customKey:\\w+)$': {
        example: 'manufacturerId',
        description: 'Identifier key type'
    },
    '^(manufacturerId|batchId|customKey:\\w+)$': {
        example: 'batchId',
        description: 'Batch identifier key type'
    },

    // URN-like patterns
    '[a-zA-Z]*:[a-zA-Z]+': {
        example: 'unit:kilogram',
        description: 'Namespace:value format'
    },

    // Vehicle/Registration patterns
    '^[A-Z]{2}[A-Z0-9]{1,18}$': {
        example: 'DE123456789012',
        description: 'Vehicle identification format'
    },

    // Email pattern (common)
    '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$': {
        example: 'example@domain.com',
        description: 'Email address format'
    },

    // URL patterns
    '^https?://.*$': {
        example: 'https://example.com/resource',
        description: 'HTTP/HTTPS URL'
    },

    // Semantic versioning
    '^\\d+\\.\\d+\\.\\d+$': {
        example: '1.0.0',
        description: 'Semantic version format'
    },
    '^v?\\d+\\.\\d+\\.\\d+(-[a-zA-Z0-9]+)?$': {
        example: 'v1.2.3-beta',
        description: 'Semantic version with optional prefix'
    },
};

/**
 * Generates an example value that matches the given regex pattern.
 * 
 * @param pattern - The regex pattern string
 * @param examples - Optional array of example values from the schema
 * @returns An example value that matches the pattern, or null if no example can be generated
 */
export function generatePatternExample(pattern: string, examples?: any[]): string | null {
    // First, check if we have schema-provided examples
    if (examples && examples.length > 0) {
        const validExample = examples.find(ex => {
            try {
                return new RegExp(pattern).test(String(ex));
            } catch {
                return false;
            }
        });
        if (validExample !== undefined) {
            return String(validExample);
        }
    }

    // Check known patterns (exact match)
    if (KNOWN_PATTERNS[pattern]) {
        return KNOWN_PATTERNS[pattern].example;
    }

    // Try to find a partial match in known patterns
    for (const [knownPattern, data] of Object.entries(KNOWN_PATTERNS)) {
        // Check if the pattern is contained or similar
        if (pattern.includes(knownPattern) || knownPattern.includes(pattern)) {
            // Verify the example actually matches
            try {
                if (new RegExp(pattern).test(data.example)) {
                    return data.example;
                }
            } catch {
                // Invalid regex, skip
            }
        }
    }

    // Try to generate based on pattern analysis
    const generatedExample = analyzeAndGenerateExample(pattern);
    if (generatedExample) {
        return generatedExample;
    }

    return null;
}

/**
 * Analyzes a regex pattern and attempts to generate a matching example.
 * This is a heuristic approach for simple patterns.
 */
function analyzeAndGenerateExample(pattern: string): string | null {
    try {
        // Simple heuristics for common pattern structures
        let result = '';
        let i = 0;
        const p = pattern.replace(/^\^/, '').replace(/\$$/, ''); // Remove anchors

        while (i < p.length) {
            const char = p[i];
            
            // Character class [...]
            if (char === '[') {
                const endBracket = p.indexOf(']', i);
                if (endBracket === -1) break;
                
                const charClass = p.substring(i + 1, endBracket);
                const isNegated = charClass.startsWith('^');
                const chars = isNegated ? charClass.substring(1) : charClass;
                
                // Get quantifier if present
                const afterBracket = p.substring(endBracket + 1);
                const quantifier = parseQuantifier(afterBracket);
                const count = quantifier.count;
                
                // Generate characters
                for (let j = 0; j < count; j++) {
                    result += getCharFromClass(chars, isNegated);
                }
                
                i = endBracket + 1 + quantifier.length;
                continue;
            }
            
            // Escaped characters
            if (char === '\\') {
                const nextChar = p[i + 1];
                const afterEscape = p.substring(i + 2);
                const quantifier = parseQuantifier(afterEscape);
                const count = quantifier.count;
                
                for (let j = 0; j < count; j++) {
                    result += getEscapedChar(nextChar);
                }
                
                i += 2 + quantifier.length;
                continue;
            }
            
            // Literal characters (skip special regex chars)
            if (!'[]{}()*+?|.^$'.includes(char)) {
                result += char;
                i++;
                continue;
            }
            
            // Groups and alternation - simplified handling
            if (char === '(') {
                // Find matching close paren
                let depth = 1;
                let j = i + 1;
                while (j < p.length && depth > 0) {
                    if (p[j] === '(') depth++;
                    if (p[j] === ')') depth--;
                    j++;
                }
                // Skip groups for now, they're complex
                i = j;
                continue;
            }
            
            // Skip other special characters
            i++;
        }
        
        // Verify the result matches the pattern
        if (result && new RegExp(pattern).test(result)) {
            return result;
        }
    } catch {
        // Pattern analysis failed
    }
    
    return null;
}

/**
 * Parses a quantifier from the pattern string.
 */
function parseQuantifier(str: string): { count: number; length: number } {
    if (!str) return { count: 1, length: 0 };
    
    // {n} or {n,m}
    const braceMatch = str.match(/^\{(\d+)(?:,(\d+))?\}/);
    if (braceMatch) {
        const min = parseInt(braceMatch[1], 10);
        const max = braceMatch[2] ? parseInt(braceMatch[2], 10) : min;
        return { count: Math.min(min, max), length: braceMatch[0].length };
    }
    
    // *, +, ?
    if (str[0] === '*') return { count: 0, length: 1 };
    if (str[0] === '+') return { count: 1, length: 1 };
    if (str[0] === '?') return { count: 1, length: 1 };
    
    return { count: 1, length: 0 };
}

/**
 * Gets a character from a character class.
 */
function getCharFromClass(charClass: string, _isNegated: boolean): string {
    // Handle ranges like a-z, A-Z, 0-9
    if (charClass.includes('a-z') || charClass.includes('A-Z')) {
        if (charClass.includes('A-Z')) return 'A';
        return 'a';
    }
    if (charClass.includes('0-9')) return '0';
    
    // Return first available character
    const available = charClass.replace(/-/g, '');
    return available[0] || 'x';
}

/**
 * Gets a character for an escape sequence.
 */
function getEscapedChar(char: string): string {
    switch (char) {
        case 'd': return '0';
        case 'D': return 'a';
        case 'w': return 'a';
        case 'W': return '!';
        case 's': return ' ';
        case 'S': return 'a';
        case 'n': return '\n';
        case 't': return '\t';
        case 'r': return '\r';
        default: return char;
    }
}

/**
 * Gets a human-readable description of the pattern.
 */
export function getPatternDescription(pattern: string): string {
    if (KNOWN_PATTERNS[pattern]) {
        return KNOWN_PATTERNS[pattern].description;
    }
    
    // Try partial matches
    for (const [knownPattern, data] of Object.entries(KNOWN_PATTERNS)) {
        if (pattern.includes(knownPattern) || knownPattern.includes(pattern)) {
            return data.description;
        }
    }
    
    return 'This field must match a specific pattern format';
}

/**
 * Checks if a pattern has a known example generator.
 */
export function hasPatternExample(pattern: string, examples?: any[]): boolean {
    return generatePatternExample(pattern, examples) !== null;
}
