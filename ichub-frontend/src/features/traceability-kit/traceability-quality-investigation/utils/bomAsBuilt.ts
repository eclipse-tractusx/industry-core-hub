/********************************************************************************
 * Eclipse Tractus-X - Industry Core Hub Frontend
 *
 * Copyright (c) 2026 Contributors to the Eclipse Foundation
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

export const BOM_AS_BUILT_SEMANTIC_ID =
  'urn:samm:io.catenax.single_level_bom_as_built:4.0.0#SingleLevelBomAsBuilt';
export const BOM_AS_BUILT_SEMANTIC_ID_ALT =
  'urn:samm:io.catenax.single_level_bom_as_built:4.0.0#SingleLevelBoMAsBuilt';
export const BOM_AS_BUILT_URN = 'urn:samm:io.catenax.single_level_bom_as_built:4.0.0';

const BOM_AS_BUILT_SEMANTIC_IDS = new Set([
  BOM_AS_BUILT_SEMANTIC_ID,
  BOM_AS_BUILT_SEMANTIC_ID_ALT,
]);

export interface SemanticKeyLike {
  value?: string;
}

export interface SubmodelDescriptorLike {
  id?: string;
  submodelId?: string;
  semanticId?: {
    keys?: SemanticKeyLike[];
  };
}

export interface ShellDescriptorLike {
  globalAssetId?: string;
  specificAssetIds?: Array<{ name?: string; value?: string }>;
  submodelDescriptors?: SubmodelDescriptorLike[];
}

export interface BomChildItem {
  quantity?: {
    value?: unknown;
    unit?: unknown;
  };
  hasAlternatives?: unknown;
  createdOn?: unknown;
  lastModifiedOn?: unknown;
  globalAssetId?: unknown;
  businessPartner?: unknown;
  [key: string]: unknown;
}

export interface TwinAspectRead {
  semanticId: string;
  submodelId: string;
  registrations?: Record<string, unknown>;
}

export const getSubmodelSemanticIds = (descriptor: SubmodelDescriptorLike): string[] => {
  const keys = descriptor.semanticId?.keys ?? [];
  return keys.map((key) => key.value).filter((value): value is string => Boolean(value));
};

export const extractGlobalAssetId = (shell: ShellDescriptorLike): string | null => {
  if (shell.globalAssetId) {
    return shell.globalAssetId;
  }

  return shell.specificAssetIds?.find((asset) => asset.name === 'globalAssetId')?.value ?? null;
};

export const isBomAsBuiltSemanticId = (semanticId: string): boolean => {
  return BOM_AS_BUILT_SEMANTIC_IDS.has(semanticId) || semanticId.startsWith(BOM_AS_BUILT_URN);
};

export const findBomDescriptors = (shell: ShellDescriptorLike): Array<{ semanticId: string; submodelId: string }> => {
  const descriptors = shell.submodelDescriptors ?? [];
  return descriptors
    .map((descriptor) => {
      const semanticIds = getSubmodelSemanticIds(descriptor);
      const semanticId = semanticIds.find(isBomAsBuiltSemanticId);
      const submodelId = descriptor.id || descriptor.submodelId;

      if (!semanticId || !submodelId) {
        return null;
      }

      return { semanticId, submodelId };
    })
    .filter((entry): entry is { semanticId: string; submodelId: string } => Boolean(entry));
};

export const toChildItems = (submodelContent: Record<string, unknown>): BomChildItem[] => {
  const childItems = submodelContent.childItems;
  if (!Array.isArray(childItems)) {
    return [];
  }

  return childItems.filter((item): item is BomChildItem => {
    return typeof item === 'object' && item !== null;
  });
};
