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

import KitFeaturesPage from './pages/KitFeaturesPage';
import KitDetailPage from './pages/KitDetailPage';
import { FeatureConfig } from '@/types/routing';
import CustomAppsIcon from '../../components/icons/CustomAppsIcon';

export const kitFeaturesFeature: FeatureConfig = {
  name: 'KIT Features',
  icon: <CustomAppsIcon />,
  navigationPath: '/kit-features',
  disabled: false,
  routes: [
    {
      path: '/',
      index: true,
      element: <KitFeaturesPage />,
      meta: {
        title: 'KIT Features',
        description: 'Manage and configure Tractus-X KITs'
      }
    },
    {
      path: '/kit-features',
      element: <KitFeaturesPage />,
      meta: {
        title: 'KIT Features',
        description: 'Manage and configure Tractus-X KITs'
      }
    },
    {
      path: '/kit-features/:kitId',
      element: <KitDetailPage />,
      meta: {
        title: 'KIT Details',
        description: 'View and manage KIT features'
      }
    }
  ]
};
