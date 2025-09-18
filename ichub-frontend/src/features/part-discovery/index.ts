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

// Export pages
export * from './pages';

// Export routes
export * from './routes';

// Export components
export { PaginationControls } from './components/search-result/PaginationControls';
export { SearchModeToggle } from './components/search/SearchModeToggle';
export { FilterChips } from './components/search-result/FilterChips';
export { PartnerSearch } from './components/search/PartnerSearch';
export { SingleTwinSearch } from './components/single-twin/SingleTwinSearch';
export { SearchHeader } from './components/search-result/SearchHeader';
export { default as PartsDiscoverySidebar } from './components/search/PartsDiscoverySidebar';

// Export hooks
export { usePartsDiscoverySearch } from './hooks/usePartsDiscoverySearch';

// Export types
export * from './types/types';

// Export utilities
export * from './utils/utils';
export * from './utils/dtr-utils';
export * from './utils/data-converters';

// Export API
export * from './api';

// Export configuration
export * from './config';
