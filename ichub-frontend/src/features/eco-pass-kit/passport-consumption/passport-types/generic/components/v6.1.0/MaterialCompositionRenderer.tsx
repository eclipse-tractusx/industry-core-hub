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
import { CompositionChart } from '../../../../components/CompositionChart';

interface MaterialCompositionRendererProps {
  data: any;
  rawData: Record<string, unknown>;
}

/**
 * Custom renderer for material composition in generic passports
 * This displays pie charts and data grids for material data
 */
export const MaterialCompositionRenderer: React.FC<MaterialCompositionRendererProps> = ({ data, rawData }) => {
  try {
    // Extract material composition data
    const items = data?.children
      ?.filter((child: any) => typeof child.value === 'number' || !isNaN(parseFloat(String(child.value))))
      .map((child: any) => ({
        name: child.label,
        value: typeof child.value === 'number' ? child.value : parseFloat(String(child.value)),
        unit: child.key.includes('percentage') || child.label.includes('%') ? '%' : 'kg'
      })) || [];

    // Extract additional info and materials data from rawData
    let additionalInfo: any = null;
    let criticalMaterialsData: any[] = [];
    let hazardousMaterialsData: any[] = [];

    if (rawData) {
      try {
        const materials = rawData.materials as any;
        
        // Get additional info from materialComposition
        if (materials?.materialComposition?.content?.[0]) {
          const firstItem = materials.materialComposition.content[0];
          additionalInfo = {
            unit: firstItem.unit,
            critical: firstItem.critical,
            id: firstItem.id,
            documentation: firstItem.documentation
          };
        }
        
        // Extract critical raw materials
        if (materials?.criticalRawMaterials && Array.isArray(materials.criticalRawMaterials)) {
          criticalMaterialsData = materials.criticalRawMaterials;
        }
        
        // Extract hazardous materials (substances of concern)
        if (materials?.hazardousMaterials && Array.isArray(materials.hazardousMaterials)) {
          hazardousMaterialsData = materials.hazardousMaterials;
        }
      } catch (error) {
        console.warn('Error extracting material data:', error);
      }
    }

    if (items.length === 0 && criticalMaterialsData.length === 0 && hazardousMaterialsData.length === 0) {
      return null;
    }

    return (
      <CompositionChart 
        title={data?.label || 'Material Composition'} 
        items={items} 
        additionalInfo={additionalInfo} 
        criticalMaterials={criticalMaterialsData.length > 0 ? criticalMaterialsData : undefined}
        hazardousMaterials={hazardousMaterialsData.length > 0 ? hazardousMaterialsData : undefined}
      />
    );
  } catch (error) {
    console.error('Error rendering material composition:', error);
    return null;
  }
};
