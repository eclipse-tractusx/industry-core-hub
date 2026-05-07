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

import { CloudUpload } from '@mui/icons-material';
import { FeatureConfig } from '@/types/routing';
import PcfManagementPage from './pages/PcfManagementPage';

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
    {
      path: '/pcf/management/:manufacturerId/:partId',
      element: <PcfManagementPage />
    }
  ]
};
