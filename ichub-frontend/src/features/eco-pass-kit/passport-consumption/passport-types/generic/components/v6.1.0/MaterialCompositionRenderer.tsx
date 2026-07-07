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
import { Box } from '@mui/material';
import { CompositionChart } from './CompositionChart';

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
    // Extract material composition data from rawData
    const materials = rawData.materials as any;
    const materialComposition = materials?.materialComposition?.content || [];
    const substancesOfConcern = materials?.substancesOfConcern?.content || [];

    // Process material composition for pie chart and data grid
    const compositionItems = materialComposition.map((item: any) => ({
      name: item.id?.[0]?.name || 'Unknown',
      value: item.concentration ? (item.concentration / 10000) : 0, // Convert PPM to percentage
      unit: '%',
      casNumber: item.id?.[0]?.id || 'N/A',
      casType: item.id?.[0]?.type || 'N/A',
      recycled: item.recycled || 0,
      renewable: item.renewable || 0,
      critical: item.critical || false,
      concentration: item.concentration || 0,
      unitRaw: item.unit || 'N/A',
      documentation: item.documentation || []
    })).filter((item: any) => item.value > 0);

    // Process substances of concern with all details
    const concernItems = substancesOfConcern.map((item: any) => ({
      name: item.id?.[0]?.name || 'Unknown',
      casNumber: item.id?.[0]?.id || 'N/A',
      concentration: item.concentration || 0,
      location: item.location || 'N/A',
      exemption: item.exemption || 'N/A',
      hazardClass: item.hazardClassification?.class || 'N/A',
      hazardCategory: item.hazardClassification?.category || 'N/A',
      hazardStatement: item.hazardClassification?.statement || 'N/A',
      concentrationMin: item.concentrationRange?.[0]?.min || null,
      concentrationMax: item.concentrationRange?.[0]?.max || null,
      unit: item.unit || 'N/A'
    })).filter((item: any) => item.concentration > 0);

    if (compositionItems.length === 0 && concernItems.length === 0) {
      return null;
    }

    return (
      <>
        {/* Material Composition Chart with full data grid */}
        {compositionItems.length > 0 && (
          <CompositionChart 
            title="Material Composition" 
            items={compositionItems}
            materialDetails={compositionItems.map(item => ({
              name: item.name,
              percentage: item.value / 10000,
              casNumber: item.casNumber,
              recycled: item.recycled,
              renewable: item.renewable,
              critical: item.critical,
              unit: item.unit
            }))}
          />
        )}
        
        {/* Substances of Concern Chart with full data grid */}
        {concernItems.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <CompositionChart 
              title="Substances of Concern" 
              items={concernItems.map(item => ({
                name: item.name,
                value: item.concentration,
                unit: 'ppm'
              }))}
              hazardousMaterials={concernItems}
            />
          </Box>
        )}
      </>
    );
  } catch (error) {
    console.error('Error rendering material composition:', error);
    return null;
  }
};
