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

import { JsonSchema } from '../types';

/**
 * Base interface for all passport types
 */
export interface PassportTypeConfig {
  /**
   * Unique identifier for this passport type
   */
  id: string;
  
  /**
   * Display name of the passport type
   */
  name: string;
  
  /**
   * Version of the passport specification
   */
  version: string;
  
  /**
   * URN identifier for the passport spec
   */
  specUrn: string;
  
  /**
   * JSON Schema for validation
   */
  schema: JsonSchema;
  
  /**
   * Component to render the passport visualization
   */
  VisualizationComponent: React.ComponentType<PassportVisualizationProps>;
  
  /**
   * Mock data for testing (optional)
   */
  mockData?: Record<string, unknown>;
}

/**
 * Props for passport visualization components
 */
export interface PassportVisualizationProps {
  schema: JsonSchema;
  data: Record<string, unknown>;
  passportId: string;
  onBack: () => void;
  passportName?: string;
  passportVersion?: string;
  digitalTwinData?: {
    shell_descriptor: {
      id: string;
      idShort?: string;
      globalAssetId: string;
      assetKind: string;
      assetType: string;
      description?: Array<{ language: string; text: string }>;
      displayName?: Array<{ language: string; text: string }>;
      submodelDescriptors: Array<{
        endpoints: Array<{
          interface: string;
          protocolInformation: {
            href: string;
            endpointProtocol: string;
            endpointProtocolVersion: string[];
            subprotocol: string;
            subprotocolBody: string;
            subprotocolBodyEncoding: string;
            securityAttributes: Array<{
              type: string;
              key: string;
              value: string;
            }>;
          };
        }>;
        idShort: string;
        id: string;
        semanticId: {
          type: string;
          keys: Array<{
            type: string;
            value: string;
          }>;
        };
        supplementalSemanticId: unknown[];
        description: unknown[];
        displayName: unknown[];
      }>;
      specificAssetIds: Array<{
        name: string;
        value: string;
      }>;
    };
    dtr?: {
      connectorUrl: string;
      assetId: string;
    };
  };
  counterPartyId?: string;
}

/**
 * Registry for passport type configurations
 */
export class PassportTypeRegistry {
  private static configs: Map<string, PassportTypeConfig> = new Map();
  
  /**
   * Register a new passport type
   */
  static register(config: PassportTypeConfig): void {
    this.configs.set(config.id, config);
  }
  
  /**
   * Get passport type config by ID
   */
  static get(id: string): PassportTypeConfig | undefined {
    return this.configs.get(id);
  }
  
  /**
   * Get passport type config by spec URN
   */
  static getBySpecUrn(specUrn: string): PassportTypeConfig | undefined {
    return Array.from(this.configs.values()).find(config => config.specUrn === specUrn);
  }
  
  /**
   * Get passport type config by semantic ID
   * Semantic IDs typically follow the format: urn:io.catenax.generic.digital_product_passport:6.1.0#DigitalProductPassport
   * This method extracts the URN portion and matches against registered passport types
   */
  static getBySemanticId(semanticId: string): PassportTypeConfig | undefined {
    if (!semanticId) return undefined;
    
    // Extract URN portion before the # (if present)
    const urnPart = semanticId.split('#')[0];
    
    // Try exact match first
    let config = this.getBySpecUrn(semanticId);
    if (config) return config;
    
    // Try matching just the URN portion
    config = this.getBySpecUrn(urnPart);
    if (config) return config;
    
    // Try partial match (in case of version differences)
    return Array.from(this.configs.values()).find(c => 
      semanticId.includes(c.specUrn) || c.specUrn.includes(urnPart)
    );
  }
  
  /**
   * Detect passport type from data
   */
  static detectType(data: Record<string, unknown>): PassportTypeConfig | undefined {
    // Check metadata.specVersion first
    if (data.metadata && typeof data.metadata === 'object') {
      const metadata = data.metadata as Record<string, unknown>;
      if (metadata.specVersion && typeof metadata.specVersion === 'string') {
        const config = this.getBySpecUrn(metadata.specVersion);
        if (config) return config;
      }
    }
    
    // Fallback to generic passport if no specific type detected
    return this.get('generic');
  }
  
  /**
   * Get all registered passport types
   */
  static getAll(): PassportTypeConfig[] {
    return Array.from(this.configs.values());
  }
}
