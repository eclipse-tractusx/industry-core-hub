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

export interface JsonSchemaProperty {
  type?: string | string[];
  description?: string;
  properties?: Record<string, JsonSchemaProperty>;
  items?: JsonSchemaProperty;
  $ref?: string;
  enum?: string[];
  pattern?: string;
  required?: string[];
  'x-samm-aspect-model-urn'?: string;
}

export interface JsonSchema {
  $schema?: string;
  type: string;
  description?: string;
  properties?: Record<string, JsonSchemaProperty>;
  components?: {
    schemas?: Record<string, JsonSchemaProperty>;
  };
  required?: string[];
}

export interface ParsedProperty {
  key: string;
  label: string;
  description?: string;
  semanticId?: string;
  type: string;
  value: unknown;
  enumValues?: string[];
  children?: ParsedProperty[];
  isRequired?: boolean;
}

export interface MetricCard {
  category: string;
  icon: React.ElementType;
  value: string | number;
  unit?: string;
  subtext?: string;
}

export interface TabDefinition {
  id: string;
  label: string;
  category?: string;
  properties: ParsedProperty[];
}
