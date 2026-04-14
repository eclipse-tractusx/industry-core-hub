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

import i18n from '@/i18n';
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
import { kitFeaturesFeature } from './kit-features/routes';
import { FeatureConfig, NavigationItem } from '@/types/routing';
import { KitFeature } from './kit-features/types';

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
import { catalogManagementFeature } from './industry-core-kit/catalog-management/routes';
import { partDiscoveryFeature } from './industry-core-kit/part-discovery/routes';
import { partnerManagementFeature } from './business-partner-kit/partner-management/routes';
import { serializedPartsFeature } from './industry-core-kit/serialized-parts/routes';
import { passportConsumptionFeature } from './eco-pass-kit/passport-consumption/routes';
import { passportProvisionFeature } from './eco-pass-kit/passport-provision/routes';

// KIT configurations with feature toggles
export const kits: KitFeature[] = [
  {
    id: 'industry-core',
    name: i18n.t('industryCore.name', { ns: 'kits' }),
    description: i18n.t('industryCore.description', { ns: 'kits' }),
    status: 'available',
    icon: <Hub />,
    image: IndustryCoreKitImage,
    features: [
      {
        module: catalogManagementFeature,
        id: 'catalog-management',
        name: i18n.t('industryCore.features.catalogManagement.name', { ns: 'kits' }),
        description: i18n.t('industryCore.features.catalogManagement.description', { ns: 'kits' }),
        icon: <Storefront />,
        enabled: true,
        default: true
      },
      {
        module: serializedPartsFeature,
        id: 'serialized-parts',
        name: i18n.t('industryCore.features.serializedParts.name', { ns: 'kits' }),
        description: i18n.t('industryCore.features.serializedParts.description', { ns: 'kits' }),
        icon: <Dashboard />,
        enabled: true,
        default: true
      },
      {
        module: partDiscoveryFeature,
        id: 'dataspace-discovery',
        name: i18n.t('industryCore.features.dataspaceDiscovery.name', { ns: 'kits' }),
        description: i18n.t('industryCore.features.dataspaceDiscovery.description', { ns: 'kits' }),
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
    name: i18n.t('businessPartner.name', { ns: 'kits' }),
    description: i18n.t('businessPartner.description', { ns: 'kits' }),
    status: 'available',
    icon: <Group />,
    image: BusinessPartnerKitImage,
    features: [
        {
        module: partnerManagementFeature,
        id: 'participants',
        name: i18n.t('businessPartner.features.participants.name', { ns: 'kits' }),
        description: i18n.t('businessPartner.features.participants.description', { ns: 'kits' }),
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
    name: i18n.t('ecoPass.name', { ns: 'kits' }),
    description: i18n.t('ecoPass.description', { ns: 'kits' }),
    status: 'available',
    icon: <Recycling />,
    image: EcoPassKitImage,
    features: [
      {
        module: passportConsumptionFeature,
        id: 'pass-consumption',
        name: i18n.t('ecoPass.features.passConsumption.name', { ns: 'kits' }),
        description: i18n.t('ecoPass.features.passConsumption.description', { ns: 'kits' }),
        icon: <Badge />,
        enabled: false,
        default: false
      },
      {
        module: passportProvisionFeature,
        id: 'pass-provision',
        name: i18n.t('ecoPass.features.passProvision.name', { ns: 'kits' }),
        description: i18n.t('ecoPass.features.passProvision.description', { ns: 'kits' }),
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
    name: i18n.t('dataGovernance.name', { ns: 'kits' }),
    description: i18n.t('dataGovernance.description', { ns: 'kits' }),
    status: 'coming-soon',
    icon: <Policy />,
    image: DataGovernanceKitImage,
    features: [],
    domain: 'dataspace-foundation',
    version: '0.0.0',
    documentation: 'https://eclipse-tractusx.github.io/docs-kits/kits/data-governance-kit/adoption-view'
  },
  {
    id: 'pcf',
    name: i18n.t('pcf.name', { ns: 'kits' }),
    description: i18n.t('pcf.description', { ns: 'kits' }),
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
    name: i18n.t('dataChain.name', { ns: 'kits' }),
    description: i18n.t('dataChain.description', { ns: 'kits' }),
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
    name: i18n.t('dcm.name', { ns: 'kits' }),
    description: i18n.t('dcm.description', { ns: 'kits' }),
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
    name: i18n.t('traceability.name', { ns: 'kits' }),
    description: i18n.t('traceability.description', { ns: 'kits' }),
    status: 'coming-soon',
    icon: <Timeline />,
    image: TraceabilityKitImage,
    features: [],
    version: '0.0.0',
    domain: 'industry-core',
    documentation: 'https://eclipse-tractusx.github.io/docs-kits/kits/Traceability%20Kit/Adoption%20View%20Traceability%20Kit'
  }
];

// Get enabled features from kits configuration
const getEnabledFeatures = (): FeatureConfig[] => {
  return kits
    .flatMap(kit => kit.features)
    .filter(feature => feature.enabled && feature.module)
    .map(feature => ({
      ...feature.module!,
      name: feature.name,
      icon: feature.icon || feature.module!.icon
    }));
};

// Import all feature configurations (only enabled ones)
export const allFeatures: FeatureConfig[] = [
  ...getEnabledFeatures(),
  // Add placeholder for additional features (disabled - opens features panel)
  {
    name: i18n.t('features.addFeatures'),
    icon: <Assignment />,
    navigationPath: '/add-features',
    disabled: true,
    routes: []
  }
];

export const kitFeaturesConfig = kitFeaturesFeature;

// Extract just the navigation items for the sidebar (backward compatibility)
export const features: NavigationItem[] = allFeatures
  .filter(feature => feature.icon) // Only include features with icons
  .map(feature => ({
    icon: feature.icon!,
    path: feature.navigationPath,
    disabled: feature.disabled
  }));

// Get all routes from all features
export const getAllRoutes = () => {
  return [...allFeatures.flatMap(feature => feature.routes), ...kitFeaturesConfig.routes];
};
