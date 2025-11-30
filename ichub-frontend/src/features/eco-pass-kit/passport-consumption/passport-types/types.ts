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
