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

import { StatusVariants } from './statusVariants'

export enum Unit {
  MM = "mm",
  CM = "cm",
  M = "m",
  G = "g",
  KG = "kg",
}

export interface Measurement {
  value: number;
  unit: Unit;
}

export interface Material {
  name: string;
  share: number; // Percentage, 0-100
}

export interface PartType {
  manufacturerId: string;
  manufacturerPartId: string;
  name: string;
  status?: StatusVariants;
  description?: string;
  category?: string;
  materials: Material[];
  bpns?: string; // Site BPN
  width?: Measurement;
  height?: Measurement;
  length?: Measurement;
  weight?: Measurement;
  customer_part_ids?: Record<string, string>; // e.g., { "CUSTOMER_BPNL_XYZ": "CUST_PART_ID_123" }
}

export type ApiPartData = Omit<PartType, 'status'> & {
  status: number; // Status from API is a number
};