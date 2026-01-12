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

export interface SerializedPart {
    id: number, // not in API, just for table handling
    customerPartId: string,
    businessPartner: {name: string, bpnl: string},
    manufacturerId: string,
    manufacturerPartId: string,
    partInstanceId: string,
    name: string,
    category: string,
    bpns: string,
    van: string
}

export interface AddSerializedPartRequest {
  businessPartnerNumber: string;
  manufacturerId: string;
  manufacturerPartId: string;
  partInstanceId: string;
  van: string;
  customerPartId: string;
  // Optional catalog part fields for auto-generation
  name?: string;
  category?: string;
  bpns?: string;
}