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

import { Badge } from '@mui/icons-material';
import { FeatureConfig } from '@/types/routing';
import PassportConsumption from './pages/PassportConsumption';
import PassportProvidedVisualization from './pages/PassportProvidedVisualization';
import PassportQRScanner from './pages/PassportQRScanner';

export const passportConsumptionFeature: FeatureConfig = {
  name: 'Passport Consumption & Visualization',
  icon: <Badge />,
  navigationPath: '/passport',
  disabled: false,
  routes: [
    {
      path: '/passport',
      element: <PassportConsumption />
    },
    {
      path: '/passport/scan',
      element: <PassportQRScanner />
    },
    {
      path: '/passport/:id',
      element: <PassportProvidedVisualization />
    }
  ]
};
