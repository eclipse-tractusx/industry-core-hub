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

import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useFeatures } from '@/contexts/FeatureContext';

/**
 * Helper function to match a route pattern with dynamic parameters against a current path
 * @param routePath - Route pattern like /product/:manufacturerId/:manufacturerPartId
 * @param currentPath - Actual path like /product/TEST001/PART123
 * @returns true if the current path matches the route pattern
 */
const matchesRoute = (routePath: string, currentPath: string): boolean => {
  // If route has dynamic parameters (contains :)
  if (routePath.includes(':')) {
    // Convert route pattern to regex: /product/:id/:id2 -> /product/[^/]+/[^/]+
    const pattern = routePath.replace(/:[^/]+/g, '[^/]+');
    const regex = new RegExp(`^${pattern}$`);
    return regex.test(currentPath);
  }
  // Exact match for static routes
  return routePath === currentPath;
};

export const FeatureRouteGuard: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { enabledFeatures } = useFeatures();

  useEffect(() => {
    // Check if current path matches any enabled feature route
    const currentPath = location.pathname;
    
    // Skip check for kit-features and root paths (including dynamic routes like /kit-features/:kitId)
    if (currentPath === '/kit-features' || 
        currentPath === '/' || 
        currentPath === '/catalog' ||
        currentPath.startsWith('/kit-features/')) {
      return;
    }

    // Check if the current path is an enabled feature route (supports dynamic routes)
    const isValidRoute = enabledFeatures.some(feature => 
      feature.routes.some(route => matchesRoute(route.path, currentPath))
    );

    // If not valid, redirect to kit-features
    if (!isValidRoute) {
      navigate('/kit-features', { replace: true });
    }
  }, [location.pathname, enabledFeatures, navigate]);

  return null;
};
