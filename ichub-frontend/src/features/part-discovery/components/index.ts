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

// Search result components
export { PaginationControls } from './search-result/PaginationControls';
export { FilterChips } from './search-result/FilterChips';

// Search components
export { SearchModeToggle } from './search/SearchModeToggle';
export { PartnerSearch } from './search/PartnerSearch';
export { SearchHeader } from './search-result/SearchHeader';
export { default as SearchLoading } from './search/SearchLoading';
export { default as ErrorBoundary } from './search/ErrorBoundary';
export { default as PartsDiscoverySidebar } from './search/PartsDiscoverySidebar';

// Single twin components
export { SingleTwinSearch } from './single-twin/SingleTwinSearch';
export { SingleTwinResult } from './single-twin/SingleTwinResult';

// Serialized parts components
export { default as SerializedPartsTable } from './serialized-parts/SerializedPartsTable';

// Catalog parts components
export { CatalogPartsDiscovery } from './catalog-parts/CatalogPartsDiscovery';
export { DiscoveryCardChip } from './catalog-parts/DiscoveryCardChip';

// Submodel components
export { SubmodelViewer } from './submodel/SubmodelViewer';

// Submodel addon types and interfaces
export type { 
  SemanticVersion,
  VersionRange,
  ParsedSemanticId,
  SubmodelData,
  SubmodelAddonProps,
  SubmodelAddonConfig,
  SubmodelAddonRegistry,
  SubmodelAddonContext
} from './submodel-addons/types';

// US Tariff Information addon
export { UsTariffInformationViewer } from './submodel-addons/us-tariff-information/UsTariffInformationViewer';
export type { UsTariffInformation } from './submodel-addons/us-tariff-information/types';

// Utility functions
export { getCountryFlag, getAvailableCountries, hasCountryFlag } from './submodel-addons/utils/country-flags';
