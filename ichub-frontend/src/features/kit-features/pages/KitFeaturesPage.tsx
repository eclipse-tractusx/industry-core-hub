/********************************************************************************
 * Eclipse Tractus-X - Industry Core Hub Frontend
 *
 * Copyright (c) 2025 LKS Next
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

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Alert,
  Snackbar,
  Tab,
  Tabs,
  Paper
} from '@mui/material';
import Grid2 from '@mui/material/Grid2';
import {
  Hub,
  Recycling,
  Link,
  Security,
  Analytics,
  DeviceHub,
  Timeline,
  Inventory,
  AccountTree,
  Cloud,
  Build,
  Engineering,
  VerifiedUser,
  Science,
  QrCode,
  LocalShipping
} from '@mui/icons-material';
import KitCard from '../components/KitCard';
import { KitFeature } from '../types';

const KitFeaturesPage: React.FC = () => {
  const [kits, setKits] = useState<KitFeature[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');


  // Mock data for KITs - en producción esto vendría de una API
  const mockKits: KitFeature[] = [
    {
      id: 'industry-core',
      name: 'Industry Core KIT',
      description: 'Core functionality for industrial data management, partner discovery, and catalog management.',
      status: 'available',
      icon: <Hub />,
      image: '/src/assets/kit-images/industry-core-kit.svg',
      features: [
        { id: 'catalog-management', name: 'Catalog Management', description: 'Manage service catalogs and registrations', enabled: true },
        { id: 'serialized-parts', name: 'Serialized Parts', description: 'Track and manage serialized components', enabled: true },
        { id: 'dataspace-discovery', name: 'Dataspace Discovery', description: 'Discover and connect to data spaces', enabled: true },
        { id: 'participants', name: 'Participants Management', description: 'Manage ecosystem participants', enabled: true }
      ],
      category: 'core',
      version: '1.0.0',
      lastUpdated: '2024-10-15'
    },
    {
      id: 'pcf',
      name: 'PCF KIT',
      description: 'Product Carbon Footprint calculation and lifecycle assessment tools.',
      status: 'available',
      icon: <Science />,
      image: '/src/assets/kit-images/pcf-kit.svg',
      features: [
        { id: 'carbon-calculation', name: 'Carbon Calculation', description: 'Calculate product carbon footprints', enabled: false },
        { id: 'lifecycle-assessment', name: 'Lifecycle Assessment', description: 'Perform comprehensive LCA analysis', enabled: false },
        { id: 'emission-tracking', name: 'Emission Tracking', description: 'Track and monitor emissions', enabled: false },
        { id: 'reports', name: 'Sustainability Reports', description: 'Generate detailed sustainability reports', enabled: false }
      ],
      category: 'sustainability',
      version: '0.9.0',
      lastUpdated: '2024-10-10'
    },
    {
      id: 'eco-pass',
      name: 'Eco Pass KIT',
      description: 'Environmental sustainability tracking and carbon footprint management for supply chains.',
      status: 'coming-soon',
      icon: <Recycling />,
      image: '/src/assets/kit-images/eco-pass-kit.svg',
      features: [
        { id: 'carbon-footprint', name: 'Carbon Footprint', description: 'Environmental impact tracking', enabled: false },
        { id: 'environmental-impact', name: 'Environmental Impact', description: 'Assess environmental impacts', enabled: false },
        { id: 'sustainability-reports', name: 'Sustainability Reports', description: 'Generate sustainability reports', enabled: false },
        { id: 'green-metrics', name: 'Green Metrics', description: 'Track green performance metrics', enabled: false }
      ],
      category: 'sustainability'
    },
    {
      id: 'data-chain',
      name: 'Data Chain KIT',
      description: 'Secure data sharing and interoperability across automotive value chains.',
      status: 'coming-soon',
      icon: <Link />,
      image: '/src/assets/kit-images/data-chain-kit.svg',
      features: [
        { id: 'data-sharing', name: 'Data Sharing', description: 'Secure data sharing capabilities', enabled: false },
        { id: 'interoperability', name: 'Interoperability', description: 'Cross-platform interoperability', enabled: false },
        { id: 'chain-management', name: 'Chain Management', description: 'Manage data chains', enabled: false },
        { id: 'data-governance', name: 'Data Governance', description: 'Data governance and policies', enabled: false }
      ],
      category: 'collaboration'
    },
    {
      id: 'traceability',
      name: 'Traceability KIT',
      description: 'End-to-end traceability of parts and components throughout the supply chain.',
      status: 'available',
      icon: <Timeline />,
      image: '/src/assets/kit-images/traceability-kit.svg',
      features: [
        { id: 'part-tracking', name: 'Part Tracking', description: 'Track parts through supply chain', enabled: true },
        { id: 'supply-chain-visibility', name: 'Supply Chain Visibility', description: 'Full supply chain visibility', enabled: true },
        { id: 'origin-verification', name: 'Origin Verification', description: 'Verify part origins', enabled: true },
        { id: 'recall-management', name: 'Recall Management', description: 'Manage product recalls', enabled: true }
      ],
      category: 'traceability',
      version: '1.0.0',
      lastUpdated: '2024-10-24'
    },
    {
      id: 'business-partner',
      name: 'Business Partner KIT',
      description: 'Comprehensive business partner data management and validation.',
      status: 'coming-soon',
      icon: <Build />,
      image: '/src/assets/kit-images/business-partner-kit.svg',
      features: [
        { id: 'partner-data', name: 'Partner Data', description: 'Manage partner information', enabled: false },
        { id: 'validation', name: 'Validation', description: 'Validate partner data', enabled: false },
        { id: 'master-data', name: 'Master Data', description: 'Master data management', enabled: false },
        { id: 'golden-record', name: 'Golden Record', description: 'Create golden records', enabled: false }
      ],
      category: 'core'
    },
    {
      id: 'dcm',
      name: 'DCM KIT',
      description: 'Demand and Capacity Management for optimizing supply chain operations.',
      status: 'coming-soon',
      icon: <DeviceHub />,
      image: '/src/assets/kit-images/dcm-kit.svg',
      features: [
        { id: 'demand-planning', name: 'Demand Planning', description: 'Plan and forecast demand', enabled: false },
        { id: 'capacity-planning', name: 'Capacity Planning', description: 'Optimize capacity planning', enabled: false },
        { id: 'resource-optimization', name: 'Resource Optimization', description: 'Optimize resource allocation', enabled: false },
        { id: 'analytics', name: 'Analytics', description: 'Advanced analytics and insights', enabled: false }
      ],
      category: 'core'
    }
  ];

  useEffect(() => {
    // Simular carga de datos
    setKits(mockKits);
  }, []);

  const handleFeatureToggle = (kitId: string, featureId: string, enabled: boolean) => {
    setKits(prevKits => 
      prevKits.map(kit => 
        kit.id === kitId 
          ? {
              ...kit,
              features: kit.features.map(feature =>
                feature.id === featureId ? { ...feature, enabled } : feature
              )
            }
          : kit
      )
    );
    
    const kit = kits.find(k => k.id === kitId);
    const feature = kit?.features.find(f => f.id === featureId);
    setSnackbarMessage(
      `${feature?.name} in ${kit?.name} has been ${enabled ? 'enabled' : 'disabled'}`
    );
    setSnackbarOpen(true);
  };





  const categories = [
    { value: 'all', label: 'All KITs' },
    { value: 'core', label: 'Core' },
    { value: 'sustainability', label: 'Sustainability' },
    { value: 'quality', label: 'Quality' },
    { value: 'traceability', label: 'Traceability' },
    { value: 'collaboration', label: 'Collaboration' }
  ];

  const filteredKits = (selectedCategory === 'all' 
    ? kits 
    : kits.filter(kit => kit.category === selectedCategory))
    .sort((a, b) => {
      // First sort by status: available first, then coming-soon
      if (a.status !== b.status) {
        if (a.status === 'available') return -1;
        if (b.status === 'available') return 1;
        if (a.status === 'beta' && b.status === 'coming-soon') return -1;
        if (b.status === 'beta' && a.status === 'coming-soon') return 1;
      }
      // Then sort alphabetically by name
      return a.name.localeCompare(b.name);
    });

  return (
    <Box className="kit-features-container" sx={{ height: '100%', overflow: 'auto' }}>
      <Box mb={2} textAlign="center" sx={{ pt: 2, pb: 1, px: 3 }}>
        <Typography 
          variant="h2" 
          sx={{ 
            fontWeight: '800', 
            color: 'primary.main',
            textAlign: 'center',
            mb: 2,
            fontSize: { xs: '2.5rem', sm: '3rem', md: '3.5rem' },
            textShadow: '0 2px 4px rgba(25, 118, 210, 0.2)',
            background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}
        >
          KIT Features
        </Typography>
        <Typography variant="body1" className="kit-features-subtitle" paragraph sx={{ mb: 2 }}>
          Manage and configure Tractus-X KITs. Enable or disable specific features within each KIT to customize your application capabilities.
        </Typography>
      </Box>

      <Box sx={{ px: 3, mb: 3 }}>
        <Paper className="kit-category-tabs">
          <Tabs
            value={selectedCategory}
            onChange={(_, newValue) => setSelectedCategory(newValue)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            {categories.map((category) => (
              <Tab
                key={category.value}
                label={category.label}
                value={category.value}
              />
            ))}
          </Tabs>
        </Paper>
      </Box>

      <Box sx={{ px: 3, pb: 3 }}>
        <Grid container spacing={2}>
          {filteredKits.map((kit) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={kit.id}>
              <KitCard
                kit={kit}
                onFeatureToggle={handleFeatureToggle}
              />
            </Grid>
          ))}
        </Grid>
      </Box>

      {filteredKits.length === 0 && (
        <Box textAlign="center" py={8} sx={{ px: 3 }}>
          <Typography variant="h6" color="text.secondary">
            No KITs found in this category
          </Typography>
        </Box>
      )}

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity="success"
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default KitFeaturesPage;
