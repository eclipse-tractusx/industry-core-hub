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

import React from 'react';
import { SchemaDefinition, getSchemaBySemanticId } from '@/schemas';
import { EnergySavingsLeaf } from '@mui/icons-material';
import digitalProductPassportSchema from '@/schemas/DigitalProductPassport-schema.json';
import { JsonSchema } from '@/features/eco-pass-kit/passport-consumption/types';

/**
 * Configuration for a DPP version
 */
export interface DPPVersionConfig {
  name: string;
  version: string;
  semanticId: string;
  schema: SchemaDefinition | undefined;
  rawSchema: JsonSchema; // Raw JSON schema for PassportVisualization
  icon: React.ReactElement;
  color: string;
  features: string[];
  deprecated?: boolean;
  description: string;
}

/**
 * Registry of available DPP versions
 * This is designed to be easily extensible for future versions
 */
export const DPP_VERSION_REGISTRY: DPPVersionConfig[] = [
  {
    name: 'Generic Digital Product Passport',
    version: '6.1.0',
    semanticId: 'urn:samm:io.catenax.generic.digital_product_passport:6.1.0#DigitalProductPassport',
    schema: getSchemaBySemanticId('urn:samm:io.catenax.generic.digital_product_passport:6.1.0#DigitalProductPassport'),
    rawSchema: digitalProductPassportSchema as JsonSchema,
    icon: <EnergySavingsLeaf />,
    color: '#667eea',
    features: [
      'Product identification',
      'Material composition',
      'Sustainability metrics',
      'Supply chain transparency',
      'End-of-life information'
    ],
    description: 'Generic Digital Product Passport v6.1.0 with comprehensive product lifecycle data'
  }
  // Future versions can be added here:
  // {
  //   version: '7.0.0',
  //   semanticId: 'urn:samm:io.catenax.generic.digital_product_passport:7.0.0#DigitalProductPassport',
  //   schema: getSchemaBySemanticId('urn:samm:io.catenax.generic.digital_product_passport:7.0.0#DigitalProductPassport'),
  //   icon: <EcoOutlined />,
  //   color: '#22c55e',
  //   features: ['Enhanced carbon tracking', 'Advanced circularity metrics'],
  //   description: 'Generic Digital Product Passport v7.0.0 with enhanced sustainability features'
  // }
];

/**
 * Get DPP version configuration by semantic ID
 */
export const getDPPVersionBySemanticId = (semanticId: string): DPPVersionConfig | undefined => {
  return DPP_VERSION_REGISTRY.find(config => config.semanticId === semanticId);
};

/**
 * Get DPP version configuration by version string
 */
export const getDPPVersionByVersion = (version: string): DPPVersionConfig | undefined => {
  return DPP_VERSION_REGISTRY.find(config => config.version === version);
};

/**
 * Get all non-deprecated DPP versions
 */
export const getActiveDPPVersions = (): DPPVersionConfig[] => {
  return DPP_VERSION_REGISTRY.filter(config => !config.deprecated);
};
