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

import {
  Downloading,
  Security,
  VerifiedUser,
  Storage,
  Search
} from '@mui/icons-material';

export interface LoadingStep {
  id: string;
  label: string;
  icon: React.ElementType;
  description: string;
}

export const LOADING_STEPS: LoadingStep[] = [
  { id: 'parsing', label: 'Parsing ID', icon: Search, description: 'Extracting manufacturer and instance information' },
  { id: 'discovering_bpn', label: 'Finding Owner', icon: Security, description: 'Looking up BPN using BPN Discovery' },
  { id: 'retrieving_twin', label: 'Retrieving Twin', icon: Downloading, description: 'Fetching digital twin from DTR' },
  { id: 'looking_up_submodel', label: 'Finding Submodel', icon: Storage, description: 'Locating matching submodel' },
  { id: 'consuming_data', label: 'Loading Data', icon: Downloading, description: 'Consuming passport data' },
  { id: 'complete', label: 'Ready', icon: VerifiedUser, description: 'Passport loaded successfully' }
];

export const getStepIndexByName = (stepName: string): number => {
  const index = LOADING_STEPS.findIndex(step => step.id === stepName);
  return index >= 0 ? index : 0;
};
