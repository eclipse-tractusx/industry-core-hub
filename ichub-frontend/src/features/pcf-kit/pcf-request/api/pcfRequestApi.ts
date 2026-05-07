/********************************************************************************
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
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations
 * under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 *******************************************************************************/

import { fetchCatalogParts } from '../../../industry-core-kit/catalog-management/api';
import {
  getSubparts,
  addSubpart as apiAddSubpart,
  sendPcfRequest,
  PcfExchangeModel
} from '../../services/pcfApi';

// ============================================================================
// Types for PCF Request Feature
// ============================================================================

/**
 * Subpart PCF response - represents a supplier's subpart with its PCF status
 */
export interface SubpartPcfResponse {
  id: string;
  supplierBpn: string;
  supplierName: string;
  manufacturerPartId: string;
  partName: string;
  pcfStatus: 'pending' | 'delivered' | 'rejected' | 'error';
  pcfValue?: number;
  pcfUnit?: string;
  requestedAt?: string;
  deliveredAt?: string;
  errorMessage?: string;
  rejectReason?: string;
}

/**
 * Catalog Part with PCF information and linked subparts
 */
export interface CatalogPartPcfResponse {
  manufacturerId: string;
  manufacturerPartId: string;
  partName: string;
  description?: string;
  category?: string;
  subparts: SubpartPcfResponse[];
}

/**
 * Form data for adding a new subpart relation
 */
export interface AddSubpartFormData {
  supplierBpn: string;
  manufacturerPartId: string;
}

/**
 * Search result for catalog parts
 */
export interface CatalogPartSearchResult {
  manufacturerId: string;
  manufacturerPartId: string;
  partName: string;
  description?: string;
  category?: string;
}

// ============================================================================
// Mock Data for Development
// ============================================================================

const mockSubparts: Record<string, SubpartPcfResponse[]> = {
  'CAT-PART-001': [
    {
      id: 'sub-1',
      supplierBpn: 'BPNL00000001SUPP',
      supplierName: 'Steel Supplier GmbH',
      manufacturerPartId: 'STEEL-COMP-A1',
      partName: 'Steel Component A',
      pcfStatus: 'delivered',
      pcfValue: 12.5,
      pcfUnit: 'kg CO2e',
      requestedAt: '2024-12-01T10:00:00Z',
      deliveredAt: '2024-12-02T14:30:00Z',
    },
    {
      id: 'sub-2',
      supplierBpn: 'BPNL00000002SUPP',
      supplierName: 'Plastics Corp',
      manufacturerPartId: 'PLASTIC-HOUSING-B2',
      partName: 'Plastic Housing B',
      pcfStatus: 'pending',
      requestedAt: '2024-12-10T09:00:00Z',
    },
    {
      id: 'sub-3',
      supplierBpn: 'BPNL00000003SUPP',
      supplierName: 'Electronics Ltd',
      manufacturerPartId: 'PCB-BOARD-C3',
      partName: 'PCB Board C',
      pcfStatus: 'error',
      requestedAt: '2024-12-08T11:00:00Z',
      errorMessage: 'Connection timeout - supplier EDC unreachable',
    },
  ],
  'CAT-PART-002': [
    {
      id: 'sub-4',
      supplierBpn: 'BPNL00000004SUPP',
      supplierName: 'Aluminum Works',
      manufacturerPartId: 'ALU-FRAME-D4',
      partName: 'Aluminum Frame D',
      pcfStatus: 'delivered',
      pcfValue: 8.3,
      pcfUnit: 'kg CO2e',
      requestedAt: '2024-11-28T08:00:00Z',
      deliveredAt: '2024-11-29T16:45:00Z',
    },
    {
      id: 'sub-7',
      supplierBpn: 'BPNL00000007SUPP',
      supplierName: 'Metal Parts Inc',
      manufacturerPartId: 'METAL-BRACKET-G7',
      partName: 'Metal Bracket G',
      pcfStatus: 'rejected',
      requestedAt: '2024-12-03T09:00:00Z',
      rejectReason: 'Confidential data - PCF not shareable',
    },
  ],
  'CAT-PART-003': [
    {
      id: 'sub-5',
      supplierBpn: 'BPNL00000005SUPP',
      supplierName: 'Rubber Solutions',
      manufacturerPartId: 'RUBBER-SEAL-E5',
      partName: 'Rubber Seal E',
      pcfStatus: 'pending',
      requestedAt: '2024-12-09T08:00:00Z',
    },
    {
      id: 'sub-6',
      supplierBpn: 'BPNL00000006SUPP',
      supplierName: 'Glass Innovations',
      manufacturerPartId: 'GLASS-PANEL-F6',
      partName: 'Glass Panel F',
      pcfStatus: 'delivered',
      pcfValue: 5.7,
      pcfUnit: 'kg CO2e',
      requestedAt: '2024-12-05T13:00:00Z',
      deliveredAt: '2024-12-06T10:20:00Z',
    },
  ],
};

// ============================================================================
// API Functions
// ============================================================================

/**
 * Search catalog parts by manufacturer part ID
 * Returns matching catalog parts from the system
 */
export async function searchCatalogPartsByManufacturerPartId(
  searchQuery: string
): Promise<CatalogPartSearchResult[]> {
  try {
    const catalogParts = await fetchCatalogParts();
    
    if (!searchQuery.trim()) {
      return catalogParts.map(part => ({
        manufacturerId: part.manufacturerId || '',
        manufacturerPartId: part.manufacturerPartId,
        partName: part.name,
        description: part.description,
        category: part.category,
      }));
    }
    
    const query = searchQuery.toLowerCase();
    const filtered = catalogParts.filter(part => 
      part.manufacturerPartId.toLowerCase().includes(query) ||
      part.name.toLowerCase().includes(query)
    );
    
    return filtered.map(part => ({
      manufacturerId: part.manufacturerId || '',
      manufacturerPartId: part.manufacturerPartId,
      partName: part.name,
      description: part.description,
      category: part.category,
    }));
  } catch (error) {
    console.error('Error searching catalog parts:', error);
    // Return mock data for development
    return [
      {
        manufacturerId: 'BPNL00000001CFRM',
        manufacturerPartId: 'CAT-PART-001',
        partName: 'Automotive Control Module',
        description: 'Electronic control unit for automotive applications',
        category: 'Electronics',
      },
      {
        manufacturerId: 'BPNL00000001CFRM',
        manufacturerPartId: 'CAT-PART-002',
        partName: 'Chassis Assembly Frame',
        description: 'Main structural frame for vehicle chassis',
        category: 'Structural',
      },
      {
        manufacturerId: 'BPNL00000001CFRM',
        manufacturerPartId: 'CAT-PART-003',
        partName: 'Sensor Module Package',
        description: 'Integrated sensor package for monitoring systems',
        category: 'Sensors',
      },
    ].filter(part => {
      const q = searchQuery.toLowerCase();
      return !searchQuery.trim() ||
        part.manufacturerPartId.toLowerCase().includes(q) ||
        part.partName.toLowerCase().includes(q);
    });
  }
}

/**
 * Convert API exchange model to UI subpart response
 */
function convertToSubpartResponse(exchange: PcfExchangeModel): SubpartPcfResponse {
  // Map API status to UI status
  const statusMap: Record<string, SubpartPcfResponse['pcfStatus']> = {
    'pending': 'pending',
    'delivered': 'delivered',
    'responded': 'delivered',
    'rejected': 'rejected',
    'failed': 'error',
    'error': 'error'
  };
  
  return {
    id: exchange.requestId,
    supplierBpn: exchange.targetBpn,
    supplierName: exchange.targetBpn, // Could be resolved to company name
    manufacturerPartId: exchange.manufacturerPartId || exchange.customerPartId || 'Unknown',
    partName: exchange.manufacturerPartId || 'Unknown Part',
    pcfStatus: statusMap[exchange.status.toLowerCase()] || 'pending',
    pcfValue: exchange.pcfData?.pcfValue as number | undefined,
    pcfUnit: (exchange.pcfData?.pcfUnit as string) || 'kg CO2e',
    requestedAt: new Date().toISOString(), // API should provide this
    errorMessage: exchange.status.toLowerCase() === 'error' ? exchange.message : undefined,
    rejectReason: exchange.status.toLowerCase() === 'rejected' ? exchange.message : undefined
  };
}

/**
 * Get a catalog part with its linked subparts and PCF responses
 * Uses real backend API to fetch subpart relationships
 */
export async function getCatalogPartWithSubparts(
  manufacturerPartId: string
): Promise<CatalogPartPcfResponse | null> {
  try {
    // First, get the catalog parts to find the one we need
    const catalogParts = await fetchCatalogParts();
    const part = catalogParts.find(p => p.manufacturerPartId === manufacturerPartId);
    
    if (!part) {
      // Part not found in catalog
      return null;
    }

    // Get subparts from the real API
    let subparts: SubpartPcfResponse[] = [];
    try {
      const subpartsResponse = await getSubparts(manufacturerPartId);
      if (subpartsResponse && subpartsResponse.listSubManufacturerPartIds) {
        subparts = subpartsResponse.listSubManufacturerPartIds.map(convertToSubpartResponse);
      }
    } catch {
      // No subparts or API not available yet - use empty array
      console.log('No subparts found for part:', manufacturerPartId);
    }

    return {
      manufacturerId: part.manufacturerId || '',
      manufacturerPartId: part.manufacturerPartId,
      partName: part.name,
      description: part.description,
      category: part.category,
      subparts,
    };
  } catch (error) {
    console.error('Error fetching catalog part:', error);
    return null;
  }
}

/**
 * Add a new subpart relation to a catalog part
 * Uses real backend API to create the relationship and initiate PCF request
 */
export async function addSubpartRelation(
  parentManufacturerPartId: string,
  formData: AddSubpartFormData
): Promise<SubpartPcfResponse> {
  try {
    // Call the real API to add the subpart relation
    const result = await apiAddSubpart(parentManufacturerPartId, {
      manufacturerPartId: formData.manufacturerPartId,
      bpn: formData.supplierBpn
    });
    
    // Find the newly added subpart in the response
    if (result && result.listSubManufacturerPartIds && result.listSubManufacturerPartIds.length > 0) {
      // Return the last added subpart (newest)
      const latestExchange = result.listSubManufacturerPartIds[result.listSubManufacturerPartIds.length - 1];
      return convertToSubpartResponse(latestExchange);
    }
    
    // Fallback response if API doesn't return the created subpart
    return {
      id: `sub-${Date.now()}`,
      supplierBpn: formData.supplierBpn,
      supplierName: `Supplier ${formData.supplierBpn.slice(-4)}`,
      manufacturerPartId: formData.manufacturerPartId,
      partName: `Part ${formData.manufacturerPartId}`,
      pcfStatus: 'pending',
      requestedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error adding subpart relation:', error);
    throw error;
  }
}

/**
 * Request PCF for a specific subpart (send request to supplier)
 * Uses real backend API to send the PCF request
 */
export async function requestSubpartPcf(
  parentManufacturerPartId: string,
  subpartId: string
): Promise<SubpartPcfResponse> {
  try {
    // Send the PCF request using the requestId (subpartId)
    await sendPcfRequest(subpartId);
    
    // Reload the subparts to get the updated status
    const subpartsResponse = await getSubparts(parentManufacturerPartId);
    
    if (subpartsResponse && subpartsResponse.listSubManufacturerPartIds) {
      const updatedSubpart = subpartsResponse.listSubManufacturerPartIds.find(
        (s) => s.requestId === subpartId
      );
      
      if (updatedSubpart) {
        return convertToSubpartResponse(updatedSubpart);
      }
    }
    
    // Return a pending status if we couldn't find the updated subpart
    return {
      id: subpartId,
      supplierBpn: '',
      supplierName: 'Unknown',
      manufacturerPartId: '',
      partName: 'Unknown',
      pcfStatus: 'pending',
      requestedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error requesting subpart PCF:', error);
    // Return error status
    return {
      id: subpartId,
      supplierBpn: '',
      supplierName: 'Unknown',
      manufacturerPartId: '',
      partName: 'Unknown',
      pcfStatus: 'error',
      errorMessage: error instanceof Error ? error.message : 'Failed to send PCF request'
    };
  }
}

/**
 * Delete a subpart relation
 */
export async function deleteSubpartRelation(
  parentManufacturerPartId: string,
  subpartId: string
): Promise<void> {
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const subparts = mockSubparts[parentManufacturerPartId];
  if (subparts) {
    const index = subparts.findIndex(s => s.id === subpartId);
    if (index !== -1) {
      subparts.splice(index, 1);
    }
  }
}
