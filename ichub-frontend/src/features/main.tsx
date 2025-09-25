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

import { Assignment } from '@mui/icons-material';
import { catalogManagementFeature } from './catalog-management/routes';
import { partDiscoveryFeature } from './part-discovery/routes';
import { partnerManagementFeature } from './partner-management/routes';
import { serializedPartsFeature } from './serialized-parts/routes';
import { FeatureConfig, NavigationItem } from '../types/routing';

// Import all feature configurations
export const allFeatures: FeatureConfig[] = [
  catalogManagementFeature,
  serializedPartsFeature,
  partDiscoveryFeature,
  partnerManagementFeature,
  // Add placeholder for status feature (disabled)
  {
    name: 'Status',
    icon: <Assignment />,
    navigationPath: '/status',
    disabled: true,
    routes: []
  }
];

// Extract just the navigation items for the sidebar (backward compatibility)
export const features: NavigationItem[] = allFeatures.map(feature => ({
  icon: feature.icon,
  path: feature.navigationPath,
  disabled: feature.disabled
}));

// Get all routes from all features
export const getAllRoutes = () => {
  return allFeatures.flatMap(feature => feature.routes);
};