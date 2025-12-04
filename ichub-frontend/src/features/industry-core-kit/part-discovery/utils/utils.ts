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
// Types for AAS data structure
export interface AASData {
  description: string[];
  displayName: string[];
  globalAssetId: string;
  id: string;
  idShort?: string;
  assetKind?: string;  // Optional idShort field
  assetType?: string; // Asset type from shell descriptor
  specificAssetIds: SpecificAssetId[];
  submodelDescriptors: SubmodelDescriptor[];
}

export interface SpecificAssetId {
  supplementalSemanticIds: string[];
  name: string;
  value: string;
  externalSubjectId: ExternalReference;
}

export interface ExternalReference {
  type: string;
  keys: ReferenceKey[];
}

export interface ReferenceKey {
  type: string;
  value: string;
}

export interface SubmodelDescriptor {
  endpoints: Endpoint[];
  idShort: string;
  id: string;
  semanticId: ExternalReference;
  supplementalSemanticId: string[];
  description: string[];
  displayName: string[];
}

export interface Endpoint {
  interface: string;
  protocolInformation: ProtocolInformation;
}

export interface ProtocolInformation {
  href: string;
  endpointProtocol: string;
  endpointProtocolVersion: string[];
  subprotocol: string;
  subprotocolBody: string;
  subprotocolBodyEncoding: string;
  securityAttributes: SecurityAttribute[];
}

export interface SecurityAttribute {
  type: string;
  key: string;
  value: string;
}

// Utility functions for parsing AAS data

/**
 * Extracts a specific asset ID value by name from the AAS data
 */
export const getSpecificAssetIdByName = (aasData: AASData, name: string): string | null => {
  const specificAssetId = aasData.specificAssetIds.find(id => id.name === name);
  return specificAssetId?.value || null;
};

/**
 * Gets the manufacturer part ID from the AAS data
 */
export const getManufacturerPartId = (aasData: AASData): string | null => {
  return getSpecificAssetIdByName(aasData, 'manufacturerPartId');
};

/**
 * Gets the manufacturer ID from the AAS data
 */
export const getManufacturerId = (aasData: AASData): string | null => {
  return getSpecificAssetIdByName(aasData, 'manufacturerId');
};

/**
 * Gets the customer part ID from the AAS data
 */
export const getCustomerPartId = (aasData: AASData): string | null => {
  return getSpecificAssetIdByName(aasData, 'customerPartId');
};

/**
 * Gets the digital twin type from the AAS data
 */
export const getDigitalTwinType = (aasData: AASData): string | null => {
  return getSpecificAssetIdByName(aasData, 'digitalTwinType');
};

/**
 * Gets the part instance ID from the AAS data
 */
export const getPartInstanceId = (aasData: AASData): string | null => {
  return getSpecificAssetIdByName(aasData, 'partInstanceId');
};

/**
 * Gets all specific asset IDs as a key-value map
 */
export const getAllSpecificAssetIds = (aasData: AASData): Record<string, string> => {
  return aasData.specificAssetIds.reduce((acc, asset) => {
    acc[asset.name] = asset.value;
    return acc;
  }, {} as Record<string, string>);
};

/**
 * Extracts submodel descriptor by idShort
 */
export const getSubmodelDescriptorByIdShort = (aasData: AASData, idShort: string): SubmodelDescriptor | null => {
  return aasData.submodelDescriptors.find(descriptor => descriptor.idShort === idShort) || null;
};

/**
 * Extracts submodel descriptor by semantic ID value
 */
export const getSubmodelDescriptorBySemanticId = (aasData: AASData, semanticIdValue: string): SubmodelDescriptor | null => {
  return aasData.submodelDescriptors.find(descriptor => 
    descriptor.semanticId?.keys?.some(key => key.value === semanticIdValue)
  ) || null;
};

/**
 * Gets all submodel endpoints for a specific submodel
 */
export const getSubmodelEndpoints = (submodelDescriptor: SubmodelDescriptor): string[] => {
  return submodelDescriptor.endpoints.map(endpoint => endpoint.protocolInformation.href);
};

/**
 * Extracts the DSP endpoint from subprotocolBody
 */
export const getDspEndpointFromSubmodel = (submodelDescriptor: SubmodelDescriptor): string | null => {
  const endpoint = submodelDescriptor.endpoints[0];
  if (!endpoint?.protocolInformation?.subprotocolBody) return null;
  
  const match = endpoint.protocolInformation.subprotocolBody.match(/dspEndpoint=([^;]+)/);
  return match ? match[1] : null;
};

/**
 * Extracts the asset ID from subprotocolBody
 */
export const getAssetIdFromSubmodel = (submodelDescriptor: SubmodelDescriptor): string | null => {
  const endpoint = submodelDescriptor.endpoints[0];
  if (!endpoint?.protocolInformation?.subprotocolBody) return null;
  
  const match = endpoint.protocolInformation.subprotocolBody.match(/id=([^;]+)/);
  return match ? match[1] : null;
};

/**
 * Gets the external subject ID (BPNL) from a specific asset ID
 */
export const getExternalSubjectId = (specificAssetId: SpecificAssetId): string | null => {
  return specificAssetId.externalSubjectId?.keys?.[0]?.value || null;
};

/**
 * Checks if the AAS data represents a specific digital twin type
 */
export const isDigitalTwinType = (aasData: AASData, expectedType: string): boolean => {
  const digitalTwinType = getDigitalTwinType(aasData);
  return digitalTwinType === expectedType;
};

/**
 * Validates if the AAS data structure is complete and valid
 */
export const validateAASData = (aasData: AASData): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!aasData.globalAssetId) {
    errors.push('Missing globalAssetId');
  }
  
  if (!aasData.id) {
    errors.push('Missing id');
  }
  
  if (!aasData.specificAssetIds || aasData.specificAssetIds.length === 0) {
    errors.push('Missing or empty specificAssetIds');
  }
  
  if (!aasData.submodelDescriptors || aasData.submodelDescriptors.length === 0) {
    errors.push('Missing or empty submodelDescriptors');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Extracts summary information from AAS data for display purposes
 */
export const getAASDataSummary = (aasData: AASData) => {
  const manufacturerPartId = getManufacturerPartId(aasData);
  const manufacturerId = getManufacturerId(aasData);
  const customerPartId = getCustomerPartId(aasData);
  const digitalTwinType = getDigitalTwinType(aasData);
  const partInstanceId = getPartInstanceId(aasData);
  
  return {
    globalAssetId: aasData.globalAssetId,
    id: aasData.id,
    manufacturerPartId,
    manufacturerId,
    customerPartId,
    digitalTwinType,
    partInstanceId,
    submodelCount: aasData.submodelDescriptors.length
  };
};

// Shell Discovery Response Types and Utilities
export interface ShellDiscoveryResponse {
  shellDescriptors: AASData[];
  dtrs: DTRInfo[];
  shellsFound: number;
  pagination: PaginationInfo;
  error?: string; // Optional error field for API error responses
}

export interface DTRInfo {
  connectorUrl: string;
  assetId: string;
  status: string;
  shellsFound: number;
  shells: string[];
  paging_metadata: {
    cursor?: string;
  };
}

export interface PaginationInfo {
  page: number;
  next?: string;
  previous?: string;
}

/**
 * Check if there are more pages available (next page exists)
 */
export const hasNextPage = (response: ShellDiscoveryResponse): boolean => {
  return !!response.pagination.next;
};

/**
 * Check if there are previous pages available
 */
export const hasPreviousPage = (response: ShellDiscoveryResponse): boolean => {
  return !!response.pagination.previous;
};

/**
 * Get the next page cursor from the response
 */
export const getNextPageCursor = (response: ShellDiscoveryResponse): string | null => {
  return response.pagination.next || null;
};

/**
 * Get the previous page cursor from the response
 */
export const getPreviousPageCursor = (response: ShellDiscoveryResponse): string | null => {
  return response.pagination.previous || null;
};

/**
 * Extract summary information from shell discovery response for display
 */
export const getShellDiscoverySummary = (response: ShellDiscoveryResponse) => {
  const shellSummaries = response.shellDescriptors.map(shell => getAASDataSummary(shell));
  
  return {
    totalShellsFound: response.shellsFound,
    currentPageShells: response.shellDescriptors.length,
    currentPage: response.pagination.page,
    hasNext: hasNextPage(response),
    hasPrevious: hasPreviousPage(response),
    dtrsCount: response.dtrs.length,
    successfulDtrs: response.dtrs.filter(dtr => dtr.status === 'success').length,
    shells: shellSummaries
  };
};

/**
 * Filter shells by manufacturer ID
 */
export const filterShellsByManufacturerId = (
  response: ShellDiscoveryResponse,
  manufacturerId: string
): AASData[] => {
  return response.shellDescriptors.filter(shell => 
    getManufacturerId(shell) === manufacturerId
  );
};

/**
 * Filter shells by customer part ID
 */
export const filterShellsByCustomerPartId = (
  response: ShellDiscoveryResponse,
  customerPartId: string
): AASData[] => {
  return response.shellDescriptors.filter(shell => 
    getCustomerPartId(shell) === customerPartId
  );
};

/**
 * Group shells by manufacturer ID
 */
export const groupShellsByManufacturerId = (
  response: ShellDiscoveryResponse
): Record<string, AASData[]> => {
  return response.shellDescriptors.reduce((acc, shell) => {
    const manufacturerId = getManufacturerId(shell);
    if (manufacturerId) {
      if (!acc[manufacturerId]) {
        acc[manufacturerId] = [];
      }
      acc[manufacturerId].push(shell);
    }
    return acc;
  }, {} as Record<string, AASData[]>);
};

/**
 * Get all unique manufacturer part IDs from the response
 */
export const getUniqueManufacturerPartIds = (response: ShellDiscoveryResponse): string[] => {
  const partIds = response.shellDescriptors
    .map(shell => getManufacturerPartId(shell))
    .filter((id): id is string => id !== null);
  
  return [...new Set(partIds)];
};

/**
 * Get all unique customer part IDs from the response
 */
export const getUniqueCustomerPartIds = (response: ShellDiscoveryResponse): string[] => {
  const partIds = response.shellDescriptors
    .map(shell => getCustomerPartId(shell))
    .filter((id): id is string => id !== null);
  
  return [...new Set(partIds)];
};

/**
 * Find shells that have submodel descriptors
 */
export const getShellsWithSubmodels = (response: ShellDiscoveryResponse): AASData[] => {
  return response.shellDescriptors.filter(shell => 
    shell.submodelDescriptors && shell.submodelDescriptors.length > 0
  );
};

/**
 * Convert shell discovery response to a format suitable for table display
 */
export const formatShellsForTable = (response: ShellDiscoveryResponse) => {
  return response.shellDescriptors.map(shell => {
    const summary = getAASDataSummary(shell);
    return {
      id: shell.id,
      globalAssetId: shell.globalAssetId,
      manufacturerPartId: summary.manufacturerPartId || 'N/A',
      manufacturerId: summary.manufacturerId || 'N/A',
      customerPartId: summary.customerPartId || 'N/A',
      digitalTwinType: summary.digitalTwinType || 'N/A',
      hasSubmodels: shell.submodelDescriptors.length > 0,
      submodelCount: shell.submodelDescriptors.length
    };
  });
};