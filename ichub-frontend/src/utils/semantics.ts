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

export const parseSemanticId = (semanticId: string) => {
    try {
      // Handle different URN formats:
      // urn:bamm:io.catenax.single_level_bom_as_built:3.0.0#SingleLevelBomAsBuilt
      // urn:samm:io.catenax.generic.digital_product_passport:5.0.0#DigitalProductPassport
      
      const parts = semanticId.split(':');
      if (parts.length >= 4) {
        const lastPart = parts[parts.length - 1]; // "3.0.0#SingleLevelBomAsBuilt"
        const [version, modelName] = lastPart.split('#');
        
        // Extract model name from the namespace if no # separator
        let displayName = modelName || '';
        if (!displayName && parts.length >= 3) {
          const namespacePart = parts[parts.length - 2]; // "io.catenax.single_level_bom_as_built"
          const nameParts = namespacePart.split('.');
          displayName = nameParts[nameParts.length - 1]
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
        }
        
        return {
          version: version || 'Unknown',
          name: displayName || 'Unknown Model',
          namespace: parts.slice(2, -1).join(':')
        };
      }
      
      return {
        version: 'Unknown',
        name: 'Unknown Model',
        namespace: semanticId
      };
    } catch (error) {
      console.warn('Error parsing semantic ID:', error);
      return {
        version: 'Unknown',
        name: 'Unknown Model',
        namespace: semanticId
      };
    }
  };