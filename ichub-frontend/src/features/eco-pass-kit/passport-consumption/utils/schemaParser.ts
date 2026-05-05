/********************************************************************************
 * Eclipse Tractus-X - Industry Core Hub Frontend
 *
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

import { JsonSchema, JsonSchemaProperty, ParsedProperty, TabDefinition } from '../types';
import { getIconForProperty } from './iconMapper';
import { toTitleCase } from './dataFormatter';

/**
 * Parse JSON Schema and data payload to extract structured properties
 */
export class SchemaParser {
  private schema: JsonSchema;
  private components: Record<string, JsonSchemaProperty>;

  constructor(schema: JsonSchema) {
    this.schema = schema;
    this.components = schema.components?.schemas || {};
  }

  /**
   * Resolve $ref references in schema
   */
  private resolveRef(ref: string): JsonSchemaProperty | null {
    const refPath = ref.replace('#/components/schemas/', '');
    return this.components[refPath] || null;
  }

  /**
   * Get property type, resolving refs if needed
   */
  private getPropertyType(property: JsonSchemaProperty): string {
    if (property.$ref) {
      const resolved = this.resolveRef(property.$ref);
      const resolvedType = resolved?.type;
      return Array.isArray(resolvedType) ? resolvedType[0] : resolvedType || 'object';
    }
    
    if (Array.isArray(property.type)) {
      return property.type[0];
    }
    
    return property.type || 'string';
  }

  /**
   * Generate human-readable label from property key and description
   */
  private generateLabel(key: string, property: JsonSchemaProperty): string {
    // Always use the key/field name converted to Title Case
    // The description can be read separately for full context
    return toTitleCase(key);
  }

  /**
   * Parse a single property with its value
   */
  private parseProperty(
    key: string,
    property: JsonSchemaProperty,
    value: unknown,
    required: string[] = []
  ): ParsedProperty {
    const type = this.getPropertyType(property);
    const label = this.generateLabel(key, property);
    
    // Extract the actual property name (without prefix) for required check
    const actualKey = key.includes(' ') ? key.split(' ').pop() || key : key;
    
    const parsed: ParsedProperty = {
      key,
      label,
      description: property.description,
      semanticId: property['x-samm-aspect-model-urn'],
      type,
      value,
      isRequired: required.includes(actualKey)
    };

    // Handle enums
    if (property.enum) {
      parsed.enumValues = property.enum;
    }

    // Handle nested objects
    if (type === 'object' && value && typeof value === 'object' && !Array.isArray(value)) {
      const resolvedProp = property.$ref ? this.resolveRef(property.$ref) : property;
      const valueObj = value as Record<string, unknown>;
      
      // Special handling for wrapper objects with 'content' array
      // Pattern: { applicable: true, content: [...] }
      // Auto-expand these wrappers to show the content array items directly
      if (valueObj.content && Array.isArray(valueObj.content)) {
        if (resolvedProp?.properties?.content) {
          const contentProp = resolvedProp.properties.content;
          const resolvedContentProp = contentProp.$ref ? this.resolveRef(contentProp.$ref) : contentProp;
          const contentType = this.getPropertyType(resolvedContentProp);
          
          if (contentType === 'array' && resolvedContentProp.items) {
            const resolvedItems = resolvedContentProp.items.$ref ? this.resolveRef(resolvedContentProp.items.$ref) : resolvedContentProp.items;
            const itemType = this.getPropertyType(resolvedItems);
            
            if (itemType === 'object' && resolvedItems?.properties) {
              // Parse the content array items directly as children
              if (valueObj.content.length > 0) {
                // Try to find meaningful labels for array items
                const identifierFields = ['name', 'id', 'type', 'key', 'title', 'label'];
                const isSingleItem = valueObj.content.length === 1;
                
                parsed.children = valueObj.content.flatMap((item, index) => {
                  // Find a good label from the item data
                  let itemLabel = '';
                  if (typeof item === 'object' && item !== null) {
                    const itemObj = item as Record<string, unknown>;
                    for (const field of identifierFields) {
                      if (itemObj[field] && typeof itemObj[field] === 'string') {
                        itemLabel = String(itemObj[field]);
                        break;
                      } else if (itemObj[field] && typeof itemObj[field] === 'object') {
                        const nested = itemObj[field] as Record<string, unknown>;
                        if (nested.name) itemLabel = String(nested.name);
                        else if (nested.id) itemLabel = String(nested.id);
                        break;
                      }
                    }
                  }
                  
                  // For single items, use empty prefix (properties show directly)
                  // For multiple items without identifier, use "Item N"
                  if (!itemLabel && !isSingleItem) {
                    itemLabel = `Item ${index + 1}`;
                  }
                  
                  return this.parseProperties(
                    resolvedItems.properties!,
                    item as Record<string, unknown>,
                    resolvedItems.required || [],
                    itemLabel
                  );
                });
              } else {
                parsed.children = [];
              }
              // Update the value to reflect it's an array
              parsed.type = 'array';
              parsed.value = valueObj.content;
              return parsed;
            } else if (valueObj.content.length > 0) {
              // Array of primitives in content
              parsed.children = valueObj.content.map((item) => ({
                key: String(item),
                label: String(item),
                type: typeof item === 'number' ? 'number' : typeof item === 'boolean' ? 'boolean' : 'string',
                value: item,
                isRequired: false
              } as ParsedProperty));
              parsed.type = 'array';
              parsed.value = valueObj.content;
              return parsed;
            }
          }
        }
      }
      
      // Normal object handling (only if we didn't return above)
      if (resolvedProp?.properties) {
        parsed.children = this.parseProperties(
          resolvedProp.properties,
          valueObj,
          resolvedProp.required || []
        );
      }
    }

    // Handle arrays
    if (type === 'array' && Array.isArray(value)) {
      // Resolve the property if it has a $ref to get the items definition
      const resolvedProperty = property.$ref ? this.resolveRef(property.$ref) : property;
      const items = resolvedProperty?.items;
      
      if (items) {
        const itemType = this.getPropertyType(items);
        
        if (itemType === 'object') {
          const resolvedItems = items.$ref ? this.resolveRef(items.$ref) : items;
        if (resolvedItems?.properties && value.length > 0) {
          // Parse each array item's properties
          const isSingleItem = value.length === 1;
          
          // Check if items have a recursive "children" property
          const hasRecursiveChildren = value.some((item: any) => 
            item && typeof item === 'object' && 'children' in item && Array.isArray(item.children)
          );
          
          // Create child properties for each item in the array
          parsed.children = value.map((item, index) => {
            // Create a property for this array item with its properties as children
            const itemProperties = this.parseProperties(
              resolvedItems.properties!,
              item as Record<string, unknown>,
              resolvedItems.required || [],
              ''
            );
            
            // For recursive structures (like AdditionalDataEntity), extract the 'children' property
            // and use it as the actual children array, removing it from the properties list
            const childrenProp = itemProperties.find(p => p.key === 'children');
            const nonChildrenProps = itemProperties.filter(p => p.key !== 'children');
            
            // For single items WITHOUT recursive children, show properties directly (no wrapper)
            // This way the array property key (e.g., "producer") becomes the label
            // But if there's recursive structure (like additionalData with children arrays), keep the wrapper
            if (isSingleItem && !hasRecursiveChildren) {
              return itemProperties;
            }
            
            // For multiple items or items with recursive children, wrap each in a numbered container
            // Use the item's 'label' field if available, otherwise default to 'Item N'
            const itemData = item as Record<string, unknown>;
            const itemLabel = itemData.label ? String(itemData.label) : `Item ${index + 1}`;
            
            // Merge children from the recursive property with the other properties
            // This ensures both the 'data' field AND the nested 'children' are displayed
            const allChildren = [...nonChildrenProps];
            if (childrenProp && childrenProp.children && childrenProp.children.length > 0) {
              // Add the children array as nested items
              allChildren.push(...childrenProp.children);
            }
            
            return {
              key: `item-${index}`,
              label: itemLabel,
              description: itemData.description ? String(itemData.description) : undefined,
              type: 'object',
              value: item,
              children: allChildren,
              isRequired: false
            } as ParsedProperty;
          }).flat();
        } else if (value.length === 0) {
          // Empty array - still valid, just no children
          parsed.children = [];
        }
      } else {
        // Array of primitives (strings, numbers, booleans)
        // Create child properties for each item
        if (value.length > 0) {
          parsed.children = value.map((item, index) => ({
            key: String(item),
            label: String(item),
            type: typeof item === 'number' ? 'number' : typeof item === 'boolean' ? 'boolean' : 'string',
            value: item,
            isRequired: false
          } as ParsedProperty));
        } else {
          parsed.children = [];
        }
      }
    } else if (value.length > 0) {
        // Array without schema items - show as simple array values
        parsed.children = value.map((item, index) => ({
          key: `item-${index}`,
          label: typeof item === 'object' ? `Item ${index + 1}` : String(item),
          type: typeof item === 'number' ? 'number' : typeof item === 'boolean' ? 'boolean' : typeof item === 'object' ? 'object' : 'string',
          value: item,
          isRequired: false
        } as ParsedProperty));
      }
    }

    return parsed;
  }

  /**
   * Parse multiple properties
   */
  private parseProperties(
    properties: Record<string, JsonSchemaProperty>,
    data: Record<string, unknown>,
    required: string[] = [],
    keyPrefix: string = ''
  ): ParsedProperty[] {
    const parsed = Object.entries(properties).map(([key, property]) => {
      const fullKey = keyPrefix ? `${keyPrefix} ${key}` : key;
      const value = data[key];
      return this.parseProperty(fullKey, property, value, required);
    }).filter(prop => prop.value !== undefined && prop.value !== null);
    
    // Post-process: if a property is just a wrapper with 'applicable' and 'content',
    // and content is an array, flatten it by removing the wrapper level
    return parsed.filter(prop => {
      // Skip if this property doesn't have children
      if (!prop.children || prop.children.length === 0) return true;
      
      // Check if this is a wrapper pattern: has 'applicable' field and all other data is in 'content'
      const hasApplicable = prop.children.some(c => c.key === 'applicable');
      const contentChild = prop.children.find(c => c.key === 'content');
      
      // If it's a wrapper with content array, we already promoted content children in parseProperty
      // So we can keep this property as-is (it now has the content array items as direct children)
      return true;
    });
  }

  /**
   * Parse entire schema with data
   */
  public parse(data: Record<string, unknown>): ParsedProperty[] {
    if (!this.schema.properties) return [];
    
    return this.parseProperties(
      this.schema.properties,
      data,
      this.schema.required || []
    );
  }

  /**
   * Generate tab definitions from top-level properties
   */
  public generateTabs(data: Record<string, unknown>): TabDefinition[] {
    if (!this.schema.properties) return [];

    return Object.entries(this.schema.properties).map(([key, property]) => {
      const label = this.generateLabel(key, property);
      const value = data[key];

      // Parse nested properties using schema when possible
      const resolvedProp = property.$ref ? this.resolveRef(property.$ref) : property;
      let properties = resolvedProp?.properties
        ? this.parseProperties(
            resolvedProp.properties,
            (value as Record<string, unknown>) || {},
            resolvedProp.required || []
          )
        : [];

      // If schema parsing produced no properties but the payload contains data,
      // auto-generate properties from the payload so the tab still shows.
      if ((properties.length === 0 || properties.every(p => p.value === undefined)) && value && typeof value === 'object') {
        properties = Object.entries(value as Record<string, unknown>).map(([k, v]) => ({
          key: k,
          label: toTitleCase(k),
          description: undefined,
          type: typeof v === 'number' ? 'number' : typeof v === 'boolean' ? 'boolean' : Array.isArray(v) ? 'array' : 'string',
          value: v
        } as ParsedProperty));
      }

      // If value is primitive, create a single property to display it
      if ((properties.length === 0 || properties.every(p => p.value === undefined)) && value !== undefined && value !== null && typeof value !== 'object') {
        properties = [{
          key: key,
          label: label,
          description: undefined,
          type: typeof value === 'number' ? 'number' : typeof value === 'boolean' ? 'boolean' : 'string',
          value
        } as ParsedProperty];
      }

      return {
        id: key,
        label,
        category: key,
        properties
      };
    }).filter(tab => tab.properties && tab.properties.length > 0);
  }

  /**
   * Extract key metrics for header cards
   */
  public extractMetrics(data: Record<string, unknown>): Array<{
    category: string;
    value: string;
    label: string;
  }> {
    const metrics: Array<{ category: string; value: string; label: string }> = [];

    // Extract from identification
    if (data.identification && typeof data.identification === 'object') {
      const id = data.identification as Record<string, unknown>;
      if (id.type && typeof id.type === 'object') {
        const type = id.type as Record<string, unknown>;
        if (type.nameAtManufacturer) {
          metrics.push({
            category: 'GENERAL',
            value: String(type.nameAtManufacturer),
            label: 'Product name'
          });
        }
        if (type.manufacturerPartId) {
          metrics.push({
            category: 'GENERAL',
            value: String(type.manufacturerPartId),
            label: 'Product type'
          });
        }
      }
    }

    // Extract from operation/manufacturer
    if (data.operation && typeof data.operation === 'object') {
      const operation = data.operation as Record<string, unknown>;
      if (operation.manufacturer && typeof operation.manufacturer === 'object') {
        const manufacturer = operation.manufacturer as Record<string, unknown>;
        if (manufacturer.manufacturer) {
          metrics.push({
            category: 'MANUFACTURING',
            value: String(manufacturer.manufacturer),
            label: 'Manufacturer Id'
          });
        }
        if (manufacturer.manufacturingDate) {
          metrics.push({
            category: 'MANUFACTURING',
            value: String(manufacturer.manufacturingDate),
            label: 'Date of Manufacturing'
          });
        }
      }
    }

    // Extract from metadata (version info)
    if (data.metadata && typeof data.metadata === 'object') {
      const metadata = data.metadata as Record<string, unknown>;
      if (metadata.version) {
        metrics.push({
          category: 'GENERAL',
          value: String(metadata.version),
          label: 'Current version'
        });
      }
      if (metadata.issueDate) {
        // Format the date to be more readable (remove time part)
        const dateStr = String(metadata.issueDate);
        const formattedDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
        metrics.push({
          category: 'GENERAL',
          value: formattedDate,
          label: 'Issued'
        });
      }
    }

    // Extract from sustainability
    if (data.sustainability && typeof data.sustainability === 'object') {
      const sustain = data.sustainability as Record<string, unknown>;
      
      // Extract carbon footprint from productFootprint.carbon
      if (sustain.productFootprint && typeof sustain.productFootprint === 'object') {
        const productFootprint = sustain.productFootprint as Record<string, unknown>;
        if (productFootprint.carbon && Array.isArray(productFootprint.carbon) && productFootprint.carbon.length > 0) {
          const carbonData = productFootprint.carbon[0] as Record<string, unknown>;
          if (carbonData.value && carbonData.unit) {
            metrics.push({
              category: 'SUSTAINABILITY',
              value: `${carbonData.value} ${carbonData.unit}`,
              label: 'Total CO2 footprint'
            });
          }
        }
      }
      
      // Fallback: check for direct carbonFootprint property (for other mock data)
      if (sustain.carbonFootprint && typeof sustain.carbonFootprint === 'number') {
        metrics.push({
          category: 'SUSTAINABILITY',
          value: `${sustain.carbonFootprint} kg CO2e`,
          label: 'Total CO2 footprint'
        });
      }
    }

    // Extract warranty information from additionalInformation
    if (data.additionalInformation && typeof data.additionalInformation === 'object') {
      const additional = data.additionalInformation as Record<string, unknown>;
      if (additional.warranty && typeof additional.warranty === 'object') {
        const warranty = additional.warranty as Record<string, unknown>;
        if (warranty.warrantyPeriod) {
          metrics.push({
            category: 'SUSTAINABILITY',
            value: `${warranty.warrantyPeriod} years`,
            label: 'Warranty period'
          });
        }
      }
    }

    return metrics;
  }
}
