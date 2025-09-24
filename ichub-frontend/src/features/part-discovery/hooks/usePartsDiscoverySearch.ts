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

import { useState } from 'react';
import { 
  discoverShellsWithCustomQuery,
  discoverSingleShell,
  ShellDiscoveryPaginator,
  SingleShellDiscoveryResponse 
} from '../api';
import { 
  ShellDiscoveryResponse,
} from '../utils';
import { convertToPartCards, convertToSerializedParts } from '../data-converters';
import { createShellToDtrMap } from '../dtr-utils';
import { 
  PartCardData, 
  SerializedPartData, 
  SearchFilters, 
  PartType, 
  PaginationSettings 
} from '../types';

export const usePartsDiscoverySearch = () => {
  // Results and pagination
  const [partTypeCards, setPartTypeCards] = useState<PartCardData[]>([]);
  const [serializedParts, setSerializedParts] = useState<SerializedPartData[]>([]);
  const [currentResponse, setCurrentResponse] = useState<ShellDiscoveryResponse | null>(null);
  const [paginator, setPaginator] = useState<ShellDiscoveryPaginator | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  
  // Single twin search
  const [singleTwinResult, setSingleTwinResult] = useState<SingleShellDiscoveryResponse | null>(null);
  
  // Loading and error states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  
  // Pagination loading states
  const [isLoadingNext, setIsLoadingNext] = useState(false);
  const [isLoadingPrevious, setIsLoadingPrevious] = useState(false);

  const resetSearch = () => {
    setHasSearched(false);
    setCurrentResponse(null);
    setPaginator(null);
    setPartTypeCards([]);
    setSerializedParts([]);
    setCurrentPage(1);
    setTotalPages(0);
    setError(null);
    setSingleTwinResult(null);
    setIsLoadingNext(false);
    setIsLoadingPrevious(false);
  };

  const clearError = () => {
    setError(null);
  };

  const performDiscoverySearch = async (
    bpnl: string,
    partType: PartType,
    filters: SearchFilters,
    paginationSettings: PaginationSettings
  ) => {
    // Validate custom limit
    if (paginationSettings.isCustomLimit) {
      if (!paginationSettings.customLimit.trim()) {
        setError('Please enter a custom limit or select a predefined option');
        return;
      }
      const customLimitNum = parseInt(paginationSettings.customLimit);
      if (isNaN(customLimitNum) || customLimitNum < 1 || customLimitNum > 1000) {
        setError('Custom limit must be a number between 1 and 1000');
        return;
      }
    }

    setIsLoading(true);
    setError(null);
    setIsLoadingNext(false);
    setIsLoadingPrevious(false);
    
    try {
      // Calculate the correct limit based on whether custom limit is being used
      let limit: number | undefined;
      if (paginationSettings.isCustomLimit) {
        const customLimitNum = parseInt(paginationSettings.customLimit);
        limit = customLimitNum;
      } else {
        limit = paginationSettings.pageLimit === 0 ? undefined : paginationSettings.pageLimit;
      }
      
      // Build custom query with all provided parameters
      const querySpec: Array<{ name: string; value: string }> = [];
      
      // Add digitalTwinType based on part type selection
      querySpec.push({
        name: 'digitalTwinType',
        value: partType === 'Catalog' ? 'PartType' : 'PartInstance'
      });
      
      // Add all provided search parameters
      if (filters.customerPartId.trim()) {
        querySpec.push({
          name: 'customerPartId',
          value: filters.customerPartId.trim()
        });
      }
      
      if (filters.manufacturerPartId.trim()) {
        querySpec.push({
          name: 'manufacturerPartId',
          value: filters.manufacturerPartId.trim()
        });
      }
      
      if (filters.globalAssetId.trim()) {
        querySpec.push({
          name: 'globalAssetId',
          value: filters.globalAssetId.trim()
        });
      }
      
      // Only add partInstanceId if part type is Serialized (PartInstance)
      if (partType === 'Serialized' && filters.partInstanceId.trim()) {
        querySpec.push({
          name: 'partInstanceId',
          value: filters.partInstanceId.trim()
        });
      }
      
      // Use custom query for comprehensive search
      const response = await discoverShellsWithCustomQuery(bpnl, querySpec, limit);

      setCurrentResponse(response);
      
      // Check if the API returned an error in the response
      if (response.error) {
        if (response.error.toLowerCase().includes('no dtrs found')) {
          setError(`No Digital Twin Registries found for partner "${bpnl}". Please verify the BPNL is correct and if the partner has a Connector (with a reachable DTR) connected in the same dataspace as you.`);
        } else {
          setError(`Search failed: ${response.error}`);
        }
        return;
      }
      
      // Check if no shell descriptors were found
      if (!response.shellDescriptors || response.shellDescriptors.length === 0) {
        setError('No digital twins found for the specified criteria. Please try different search parameters.');
        return;
      }
      
      // Create paginator
      const digitalTwinType = partType === 'Catalog' ? 'PartType' : 'PartInstance';
      const newPaginator = new ShellDiscoveryPaginator(
        response,
        bpnl,
        digitalTwinType,
        limit
      );
      setPaginator(newPaginator);

      // Create DTR mapping if DTRs are available
      const shellToDtrMap = response.dtrs ? createShellToDtrMap(response.dtrs as unknown as Array<Record<string, unknown> & { shells?: string[] }>) : undefined;

      // Process results based on part type
      if (partType === 'Catalog') {
        const cards = convertToPartCards(response.shellDescriptors, shellToDtrMap);
        setPartTypeCards(cards);
        setSerializedParts([]);
      } else {
        const serialized = convertToSerializedParts(response.shellDescriptors, shellToDtrMap);
        setSerializedParts(serialized);
        setPartTypeCards([]);
      }

      setCurrentPage(response.pagination?.page || 1);
      // Calculate total pages
      if (limit === undefined) {
        setTotalPages(1); // No pagination when no limit is set
      } else {
        setTotalPages(Math.ceil(response.shellsFound / limit));
      }

      // Mark that search has been performed successfully
      setHasSearched(true);

    } catch (err) {
      console.error('Search error:', err);
      
      let errorMessage = 'Error searching for parts. Please try again.';
      
      if (err instanceof Error) {
        errorMessage = `Search failed: ${err.message}`;
      } else if (typeof err === 'string') {
        errorMessage = `Search failed: ${err}`;
      } else if (err && typeof err === 'object') {
        if ('response' in err && err.response) {
          const axiosErr = err as { response: { data?: { error?: string; message?: string }; status: number; statusText: string } };
          if (axiosErr.response.data?.error) {
            errorMessage = `API Error: ${axiosErr.response.data.error}`;
          } else if (axiosErr.response.data?.message) {
            errorMessage = `API Error: ${axiosErr.response.data.message}`;
          } else if (axiosErr.response.statusText) {
            errorMessage = `HTTP ${axiosErr.response.status}: ${axiosErr.response.statusText}`;
          } else {
            errorMessage = `HTTP Error ${axiosErr.response.status}`;
          }
        } else if ('message' in err) {
          const errWithMessage = err as { message: string };
          errorMessage = `Search failed: ${errWithMessage.message}`;
        }
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const performSingleTwinSearch = async (bpnl: string, aasId: string) => {
    setIsLoading(true);
    setError(null);
    setSingleTwinResult(null);
    
    try {
      const response = await discoverSingleShell(bpnl, aasId.trim());
      setSingleTwinResult(response);
      setHasSearched(true);
    } catch (err) {
      let errorMessage = 'Failed to discover digital twin';
      
      if (err instanceof Error) {
        errorMessage = `Single twin search failed: ${err.message}`;
      } else if (typeof err === 'string') {
        errorMessage = `Single twin search failed: ${err}`;
      } else if (err && typeof err === 'object') {
        if ('response' in err && err.response && typeof err.response === 'object' && 'data' in err.response) {
          const responseData = err.response.data as Record<string, unknown>;
          if (typeof responseData.message === 'string') {
            errorMessage = `Single twin search failed: ${responseData.message}`;
          }
        } else if ('message' in err) {
          const errWithMessage = err as { message: string };
          errorMessage = `Single twin search failed: ${errWithMessage.message}`;
        }
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePageChange = async (page: number, partType: PartType, bpnl: string) => {
    if (!paginator || page === currentPage) return;

    // Determine direction and set appropriate loading state
    const isNext = page === currentPage + 1;
    const isPrevious = page === currentPage - 1;
    
    if (isNext) {
      setIsLoadingNext(true);
    } else if (isPrevious) {
      setIsLoadingPrevious(true);
    }
    
    setError(null);
    
    try {
      let newResponse: ShellDiscoveryResponse | null = null;

      // Handle sequential navigation
      if (page === currentPage + 1 && paginator.hasNext()) {
        newResponse = await paginator.next();
      } else if (page === currentPage - 1 && paginator.hasPrevious()) {
        newResponse = await paginator.previous();
      } else {
        setError(`Direct navigation to page ${page} is not supported. Please use next/previous navigation.`);
        return;
      }

      if (newResponse) {
        // Check if the pagination response contains an error
        if (newResponse.error) {
          if (newResponse.error.toLowerCase().includes('no dtrs found')) {
            setError(`No Digital Twin Registries found for partner "${bpnl}" on page ${page}. Please verify the BPNL is correct and the partner has registered digital twins.`);
          } else {
            setError(`Pagination failed: ${newResponse.error}`);
          }
          return;
        }
        
        setCurrentResponse(newResponse);
        setCurrentPage(newResponse.pagination?.page || currentPage);

        // Create DTR mapping if DTRs are available
        const shellToDtrMap = newResponse.dtrs ? createShellToDtrMap(newResponse.dtrs as unknown as Array<Record<string, unknown> & { shells?: string[] }>) : undefined;

        // Update results based on part type
        if (partType === 'Catalog') {
          const cards = convertToPartCards(newResponse.shellDescriptors, shellToDtrMap);
          setPartTypeCards(cards);
        } else {
          const serialized = convertToSerializedParts(newResponse.shellDescriptors, shellToDtrMap);
          setSerializedParts(serialized);
        }
      } else {
        setError('No more pages available in that direction.');
      }
    } catch (err) {
      console.error('Pagination error:', err);
      
      let errorMessage = 'Error loading page. Please try again.';
      
      if (err instanceof Error) {
        errorMessage = `Pagination failed: ${err.message}`;
      } else if (typeof err === 'string') {
        errorMessage = `Pagination failed: ${err}`;
      } else if (err && typeof err === 'object') {
        if ('response' in err && err.response) {
          const axiosErr = err as { response: { data?: { error?: string; message?: string }; status: number; statusText: string } };
          if (axiosErr.response.data?.error) {
            errorMessage = `Pagination API Error: ${axiosErr.response.data.error}`;
          } else if (axiosErr.response.data?.message) {
            errorMessage = `Pagination API Error: ${axiosErr.response.data.message}`;
          } else {
            errorMessage = `Pagination HTTP ${axiosErr.response.status}: ${axiosErr.response.statusText}`;
          }
        } else if ('message' in err) {
          const errWithMessage = err as { message: string };
          errorMessage = `Pagination failed: ${errWithMessage.message}`;
        }
      }
      
      setError(errorMessage);
    } finally {
      // Clean up pagination loading states
      setIsLoadingNext(false);
      setIsLoadingPrevious(false);
    }
  };

  return {
    // State
    partTypeCards,
    serializedParts,
    currentResponse,
    paginator,
    currentPage,
    totalPages,
    singleTwinResult,
    isLoading,
    error,
    hasSearched,
    isLoadingNext,
    isLoadingPrevious,
    
    // Actions
    resetSearch,
    clearError,
    performDiscoverySearch,
    performSingleTwinSearch,
    handlePageChange,
  };
};
