/********************************************************************************
 * Eclipse Tractus-X - Industry Core Hub Frontend
 *
 * Copyright (c) 2026 Contributors to the Eclipse Foundation
 * Copyright (c) 2026 LKS Next
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

import { CloudUpload } from '@mui/icons-material';
import { FeatureConfig } from '@/types/routing';
import PcfManagementPage from './pages/PcfManagementPage';
import PcfDetailsPage from './pages/PcfDetailsPage';
import PcfEditPage from './pages/PcfEditPage';

/**
 * PCF Management feature configuration.
 * Allows providers to manage and upload PCF data for their catalog parts.
 */
export const pcfManagementFeature: FeatureConfig = {
  name: 'PCF Management',
  icon: <CloudUpload />,
  navigationPath: '/pcf/management',
  disabled: false,
  routes: [
    {
      path: '/pcf/management',
      element: <PcfManagementPage />
    },
    // Static routes must come before the dynamic :manufacturerId/:partId route
    {
      path: '/pcf/management/details/:manufacturerPartId',
      element: <PcfDetailsPage />
    },
    {
      path: '/pcf/management/edit/:manufacturerPartId',
      element: <PcfEditPage />
    },
    {
      path: '/pcf/management/:manufacturerId/:partId',
      element: <PcfManagementPage />
    }
  ]
};
