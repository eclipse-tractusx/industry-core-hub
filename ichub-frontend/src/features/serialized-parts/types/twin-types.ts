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

import { UUIDTypes } from 'uuid';
import { SerializedPart } from '../types';

interface BusinessPartner {
  name: string;
  bpnl: string;
}

interface ShareInfo {
  businessPartner: BusinessPartner;
  name: string;
  contracts: unknown[];
}

export interface TwinReadType {
  globalId: UUIDTypes;
  dtrAasId: UUIDTypes;
  createdDate: string;
  modifiedDate: string;
  shares?: ShareInfo[];
}

export interface SerializedPartTwinRead extends SerializedPart, TwinReadType {
  // This represents a serialized part with twin information
}

export interface SerializedPartTwinCreateType {
  manufacturerId: string;
  manufacturerPartId: string;
  partInstanceId: string;
  globalId?: UUIDTypes;
  dtrAasId?: UUIDTypes;
}

export interface SerializedPartTwinShareCreateType {
  manufacturerId: string;
  manufacturerPartId: string;
  partInstanceId: string;
}

export interface SerializedPartTwinUnshareCreateType {
  aasId: string;
  businessPartnerNumberToUnshare: string[];
  manufacturerId: string;
  assetIdNamesFilter?: string[];
}
