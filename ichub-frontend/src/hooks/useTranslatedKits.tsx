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

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Assignment,
  Hub,
  Recycling,
  Link,
  DeviceHub,
  Timeline,
  Group,
  EnergySavingsLeaf,
  Storefront,
  Dashboard,
  FindInPage,
  GroupAdd,
  Badge,
  Policy,
  PostAdd
} from '@mui/icons-material';
import { KitFeature } from '@/features/kit-features/types';
import { FeatureConfig } from '@/types/routing';

// Import KIT images
import IndustryCoreKitImage from '@/features/kit-features/assets/kit-images/industry-core-kit.svg';
import BusinessPartnerKitImage from '@/features/kit-features/assets/kit-images/business-partner-kit.svg';
import EcoPassKitImage from '@/features/kit-features/assets/kit-images/eco-pass-kit.svg';
import DataGovernanceKitImage from '@/features/kit-features/assets/kit-images/data-governance-kit.svg';
import PcfKitImage from '@/features/kit-features/assets/kit-images/pcf-kit.svg';
import DataChainKitImage from '@/features/kit-features/assets/kit-images/data-chain-kit.svg';
import DcmKitImage from '@/features/kit-features/assets/kit-images/dcm-kit.svg';
import TraceabilityKitImage from '@/features/kit-features/assets/kit-images/traceability-kit.svg';

// Import feature modules
import { catalogManagementFeature } from '@/features/industry-core-kit/catalog-management/routes';
import { partDiscoveryFeature } from '@/features/industry-core-kit/part-discovery/routes';
import { partnerManagementFeature } from '@/features/business-partner-kit/partner-management/routes';
import { serializedPartsFeature } from '@/features/industry-core-kit/serialized-parts/routes';
import { passportConsumptionFeature } from '@/features/eco-pass-kit/passport-consumption/routes';
import { passportProvisionFeature } from '@/features/eco-pass-kit/passport-provision/routes';

/**
 * Hook that returns translated KIT configurations.
 * Re-renders when language changes.
 */
export const useTranslatedKits = (): KitFeature[] => {
  const { t } = useTranslation('kits');

  return useMemo(() => [
    {
      id: 'industry-core',
      name: t('items.industryCore.name'),
      description: t('items.industryCore.description'),
      status: 'available',
      icon: <Hub />,
      image: IndustryCoreKitImage,
      features: [
        {
          module: catalogManagementFeature,
          id: 'catalog-management',
          name: t('items.industryCore.features.catalogManagement.name'),
          description: t('items.industryCore.features.catalogManagement.description'),
          icon: <Storefront />,
          enabled: true,
          default: true
        },
        {
          module: serializedPartsFeature,
          id: 'serialized-parts',
          name: t('items.industryCore.features.serializedParts.name'),
          description: t('items.industryCore.features.serializedParts.description'),
          icon: <Dashboard />,
          enabled: true,
          default: true
        },
        {
          module: partDiscoveryFeature,
          id: 'dataspace-discovery',
          name: t('items.industryCore.features.dataspaceDiscovery.name'),
          description: t('items.industryCore.features.dataspaceDiscovery.description'),
          icon: <FindInPage />,
          enabled: true,
          default: true
        },
      ],
      domain: 'industry-core',
      version: '1.0.0',
      createdAt: '2025-06-01',
      lastUpdated: '2025-12-03',
      documentation: 'https://eclipse-tractusx.github.io/docs-kits/kits/industry-core-kit/adoption-view'
    },
    {
      id: 'business-partner',
      name: t('items.businessPartner.name'),
      description: t('items.businessPartner.description'),
      status: 'available',
      icon: <Group />,
      image: BusinessPartnerKitImage,
      features: [
        {
          module: partnerManagementFeature,
          id: 'participants',
          name: t('items.businessPartner.features.participants.name'),
          description: t('items.businessPartner.features.participants.description'),
          icon: <GroupAdd />,
          enabled: true,
          default: true
        }
      ],
      version: '1.0.0',
      createdAt: '2025-06-01',
      lastUpdated: '2025-12-03',
      domain: 'participant-management',
      documentation: 'https://eclipse-tractusx.github.io/docs-kits/kits/business-partner-kit/adoption-view'
    },
    {
      id: 'eco-pass',
      name: t('items.ecoPass.name'),
      description: t('items.ecoPass.description'),
      status: 'available',
      icon: <Recycling />,
      image: EcoPassKitImage,
      features: [
        {
          module: passportConsumptionFeature,
          id: 'pass-consumption',
          name: t('items.ecoPass.features.passConsumption.name'),
          description: t('items.ecoPass.features.passConsumption.description'),
          icon: <Badge />,
          enabled: false,
          default: false
        },
        {
          module: passportProvisionFeature,
          id: 'pass-provision',
          name: t('items.ecoPass.features.passProvision.name'),
          description: t('items.ecoPass.features.passProvision.description'),
          icon: <PostAdd />,
          enabled: false,
          default: false
        },
      ],
      createdAt: '2025-11-26',
      lastUpdated: '2025-12-03',
      domain: 'sustainability',
      documentation: 'https://eclipse-tractusx.github.io/docs-kits/kits/eco-pass-kit/adoption-view'
    },
    {
      id: 'data-governance',
      name: t('items.dataGovernance.name'),
      description: t('items.dataGovernance.description'),
      status: 'coming-soon',
      icon: <Policy />,
      image: DataGovernanceKitImage,
      features: [],
      domain: 'dataspace-foundation' as const,
      version: '0.0.0',
      documentation: 'https://eclipse-tractusx.github.io/docs-kits/kits/data-governance-kit/adoption-view'
    },
    {
      id: 'pcf',
      name: t('items.pcf.name'),
      description: t('items.pcf.description'),
      status: 'coming-soon',
      icon: <EnergySavingsLeaf />,
      image: PcfKitImage,
      features: [],
      domain: 'sustainability',
      version: '0.0.0',
      documentation: 'https://eclipse-tractusx.github.io/docs-kits/kits/product-carbon-footprint-exchange-kit/adoption-view'
    },
    {
      id: 'data-chain',
      name: t('items.dataChain.name'),
      description: t('items.dataChain.description'),
      status: 'coming-soon',
      icon: <Link />,
      image: DataChainKitImage,
      features: [],
      version: '0.0.0',
      domain: 'supply-chain',
      documentation: 'https://eclipse-tractusx.github.io/docs-kits/kits/data-chain-kit/adoption-view'
    },
    {
      id: 'dcm',
      name: t('items.dcm.name'),
      description: t('items.dcm.description'),
      status: 'coming-soon',
      icon: <DeviceHub />,
      image: DcmKitImage,
      features: [],
      version: '0.0.0',
      domain: 'supply-chain',
      documentation: 'https://eclipse-tractusx.github.io/docs-kits/kits/demand-and-capacity-management-kit/adoption-view/overview'
    },
    {
      id: 'traceability',
      name: t('items.traceability.name'),
      description: t('items.traceability.description'),
      status: 'coming-soon',
      icon: <Timeline />,
      image: TraceabilityKitImage,
      features: [],
      version: '0.0.0',
      domain: 'industry-core',
      documentation: 'https://eclipse-tractusx.github.io/docs-kits/kits/Traceability%20Kit/Adoption%20View%20Traceability%20Kit'
    }
  ] as KitFeature[], [t]);
};

/**
 * Hook that returns translated enabled features for navigation.
 */
export const useTranslatedFeatures = (): FeatureConfig[] => {
  const { t } = useTranslation('common');
  const kits = useTranslatedKits();

  return useMemo(() => {
    const enabledFeatures = kits
      .flatMap(kit => kit.features)
      .filter(feature => feature.enabled && feature.module)
      .map(feature => ({
        ...feature.module!,
        name: feature.name,
        icon: feature.icon || feature.module!.icon
      }));

    return [
      ...enabledFeatures,
      {
        name: t('features.addFeatures'),
        icon: <Assignment />,
        navigationPath: '/add-features',
        disabled: true,
        routes: []
      }
    ];
  }, [kits, t]);
};
