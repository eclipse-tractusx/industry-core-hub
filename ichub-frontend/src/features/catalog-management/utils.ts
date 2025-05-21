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

import { StatusVariants } from '../../types/statusVariants';
import { ApiPartData, PartType } from '../../types/product';

// Helper function to map numeric API status to StatusVariants
export const mapApiStatusToVariant = (apiStatus: number): StatusVariants => {
  switch (apiStatus) {
    case 0:
      return StatusVariants.draft;
    case 1:
      return StatusVariants.pending;
    case 2:
      return StatusVariants.registered;
    case 3:
      return StatusVariants.shared;
    default:
      return StatusVariants.draft;
  }
};

// Helper function to map StatusVariants to numeric API status
export const mapVariantToApiStatus = (variant: StatusVariants): number => {
  switch (variant) {
    case StatusVariants.draft:
      return 0;
    case StatusVariants.pending:
      return 1;
    case StatusVariants.registered:
      return 2;
    case StatusVariants.shared:
      return 3;
    default:
      return 0; // Default to draft if unknown variant
  }
};

// Maps ApiPartData to PartInstance
export const mapApiPartDataToPartType = (apiData: ApiPartData): PartType => {
  const { status, ...rest } = apiData;
  return {
    ...rest,
    status: mapApiStatusToVariant(status),
  };
};

// Maps PartInstance to ApiPartData
export const mapPartInstanceToApiPartData = (partInstance: PartType): ApiPartData => {
  const { status, ...rest } = partInstance;
  return {
    ...rest,
    status: mapVariantToApiStatus(status ?? StatusVariants.draft),
  };
};
