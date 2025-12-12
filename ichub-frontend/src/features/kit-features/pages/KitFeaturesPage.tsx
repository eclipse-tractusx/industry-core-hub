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
  Alert,
  Snackbar,
  IconButton
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
  LocalShipping,
  ChevronLeft,
  ChevronRight
} from '@mui/icons-material';
import KitCard from '../components/KitCard';
import { KitFeature } from '../types';
import IndustryCoreKitImage from '../../../assets/kit-images/industry-core-kit.svg';
import PcfKitImage from '../../../assets/kit-images/pcf-kit.svg';
import DataChainKitImage from '../../../assets/kit-images/data-chain-kit.svg';
import BusinessPartnerKitImage from '../../../assets/kit-images/business-partner-kit.svg';
import DcmKitImage from '../../../assets/kit-images/dcm-kit.svg';
import EcoPassKitImage from '../../../assets/kit-images/eco-pass-kit.svg';
import TraceabilityKitImage from '../../../assets/kit-images/traceability-kit.svg';

const KitFeaturesPage: React.FC = () => {
  const [kits, setKits] = useState<KitFeature[]>([]);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  
  // Carousel state - smooth sliding carousel
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);


  // Mock data for KITs in specific order for carousel
  const mockKits: KitFeature[] = [
    // 1. Industry Core KIT
    {
      id: 'industry-core',
      name: 'Industry Core KIT',
      description: 'Core functionality for industrial data management, partner discovery, and catalog management.',
      status: 'available',
      icon: <Hub />,
      image: IndustryCoreKitImage,
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
    // 2. PCF KIT
    {
      id: 'pcf',
      name: 'PCF KIT',
      description: 'Product Carbon Footprint calculation and lifecycle assessment tools.',
      status: 'available',
      icon: <Science />,
      image: PcfKitImage,
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
    // 3. Data Chain KIT
    {
      id: 'data-chain',
      name: 'Data Chain KIT',
      description: 'Secure data sharing and interoperability across automotive value chains.',
      status: 'coming-soon',
      icon: <Link />,
      image: DataChainKitImage,
      features: [
        { id: 'data-sharing', name: 'Data Sharing', description: 'Secure data sharing capabilities', enabled: false },
        { id: 'interoperability', name: 'Interoperability', description: 'Cross-platform interoperability', enabled: false },
        { id: 'chain-management', name: 'Chain Management', description: 'Manage data chains', enabled: false },
        { id: 'data-governance', name: 'Data Governance', description: 'Data governance and policies', enabled: false }
      ],
      category: 'collaboration'
    },
    // 4. Business Partner KIT
    {
      id: 'business-partner',
      name: 'Business Partner KIT',
      description: 'Comprehensive business partner data management and validation.',
      status: 'coming-soon',
      icon: <Build />,
      image: BusinessPartnerKitImage,
      features: [
        { id: 'partner-data', name: 'Partner Data', description: 'Manage partner information', enabled: false },
        { id: 'validation', name: 'Validation', description: 'Validate partner data', enabled: false },
        { id: 'master-data', name: 'Master Data', description: 'Master data management', enabled: false },
        { id: 'golden-record', name: 'Golden Record', description: 'Create golden records', enabled: false }
      ],
      category: 'core'
    },
    // 5. DCM KIT
    {
      id: 'dcm',
      name: 'DCM KIT',
      description: 'Demand and Capacity Management for optimizing supply chain operations.',
      status: 'coming-soon',
      icon: <DeviceHub />,
      image: DcmKitImage,
      features: [
        { id: 'demand-planning', name: 'Demand Planning', description: 'Plan and forecast demand', enabled: false },
        { id: 'capacity-planning', name: 'Capacity Planning', description: 'Optimize capacity planning', enabled: false },
        { id: 'resource-optimization', name: 'Resource Optimization', description: 'Optimize resource allocation', enabled: false },
        { id: 'analytics', name: 'Analytics', description: 'Advanced analytics and insights', enabled: false }
      ],
      category: 'core'
    },
    // 6. Eco Pass KIT
    {
      id: 'eco-pass',
      name: 'Eco Pass KIT',
      description: 'Environmental sustainability tracking and carbon footprint management for supply chains.',
      status: 'coming-soon',
      icon: <Recycling />,
      image: EcoPassKitImage,
      features: [
        { id: 'carbon-footprint', name: 'Carbon Footprint', description: 'Environmental impact tracking', enabled: false },
        { id: 'environmental-impact', name: 'Environmental Impact', description: 'Assess environmental impacts', enabled: false },
        { id: 'sustainability-reports', name: 'Sustainability Reports', description: 'Generate sustainability reports', enabled: false },
        { id: 'green-metrics', name: 'Green Metrics', description: 'Track green performance metrics', enabled: false }
      ],
      category: 'sustainability'
    },
    // 7. Traceability KIT
    {
      id: 'traceability',
      name: 'Traceability KIT',
      description: 'End-to-end traceability of parts and components throughout the supply chain.',
      status: 'available',
      icon: <Timeline />,
      image: TraceabilityKitImage,
      features: [
        { id: 'part-tracking', name: 'Part Tracking', description: 'Track parts through supply chain', enabled: false },
        { id: 'supply-chain-visibility', name: 'Supply Chain Visibility', description: 'Full supply chain visibility', enabled: false },
        { id: 'origin-verification', name: 'Origin Verification', description: 'Verify part origins', enabled: false },
        { id: 'recall-management', name: 'Recall Management', description: 'Manage product recalls', enabled: false }
      ],
      category: 'traceability',
      version: '1.0.0',
      lastUpdated: '2024-10-24'
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

  // Carousel navigation functions - infinite smooth sliding
  const handlePrevSlide = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setCurrentIndex(prev => prev - 1);
    setTimeout(() => setIsAnimating(false), 600);
  };

  const handleNextSlide = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setCurrentIndex(prev => prev + 1);
    setTimeout(() => setIsAnimating(false), 600);
  };

  // Handle dot click to go to specific card
  const handleDotClick = (index: number) => {
    const normalizedCurrent = ((currentIndex % sortedKits.length) + sortedKits.length) % sortedKits.length;
    if (isAnimating || index === normalizedCurrent) return;
    setIsAnimating(true);
    setCurrentIndex(index);
    setTimeout(() => setIsAnimating(false), 600);
  };

  // Handle card click to center it
  const handleCardClick = (kitIndex: number) => {
    const normalizedCurrent = ((currentIndex % sortedKits.length) + sortedKits.length) % sortedKits.length;
    if (isAnimating || kitIndex === normalizedCurrent) return; // Don't do anything if it's already centered or animating
    
    setIsAnimating(true);
    // Calculate the difference and move accordingly
    const difference = kitIndex - normalizedCurrent;
    
    // Choose the shortest path (considering infinite loop)
    let targetIndex;
    if (Math.abs(difference) <= sortedKits.length / 2) {
      // Direct path is shorter
      targetIndex = currentIndex + difference;
    } else {
      // Wrap-around path is shorter
      if (difference > 0) {
        targetIndex = currentIndex - (sortedKits.length - difference);
      } else {
        targetIndex = currentIndex + (sortedKits.length + difference);
      }
    }
    
    setCurrentIndex(targetIndex);
    setTimeout(() => setIsAnimating(false), 600);
  };

  // Note: Removed reset carousel when kits change to prevent unwanted navigation
  // when toggling features



  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        handlePrevSlide();
      } else if (event.key === 'ArrowRight') {
        handleNextSlide();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isAnimating]);

  // Optional: Auto-play carousel (uncomment to enable)
  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     if (!isAnimating) {
  //       handleNextSlide();
  //     }
  //   }, 4000); // Change slide every 4 seconds
  //   
  //   return () => clearInterval(interval);
  // }, [isAnimating, currentIndex]);





  // Keep KITs in specified order for infinite carousel
  const sortedKits = kits; // No sorting - maintain original order

  // Handle infinite loop reset without animation
  useEffect(() => {
    if (!isAnimating) {
      // Silently reset position to maintain infinite loop
      const timer = setTimeout(() => {
        if (currentIndex >= sortedKits.length * 2) {
          setCurrentIndex(prev => prev - sortedKits.length);
        } else if (currentIndex <= -sortedKits.length) {
          setCurrentIndex(prev => prev + sortedKits.length);
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [currentIndex, isAnimating, sortedKits.length]);

  return (
        <Box 
      className="kit-features-page"
      sx={{ 
        width: "100%", 
        height: "100vh", 
        display: "flex", 
        flexDirection: "column", 
        p: 3,
        overflow: 'hidden', // Prevent any overflow scroll
        boxSizing: 'border-box' // Include padding in height calculation
      }}
    >
      {/* Header Section - Same format as Catalog Parts */}
      <Box sx={{ mt: 2, mb: 4 }}>
        <Grid2 container direction="column" alignItems="center" sx={{ mb: 3 }}>
          <Grid2 className="product-catalog title flex flex-content-center">
            <Typography className="text">KIT Features</Typography>
          </Grid2>
        </Grid2>
        <Box sx={{ textAlign: 'center' }}>
          <Typography 
            variant="body1" 
            className="kit-features-subtitle" 
            sx={{ 
              textAlign: 'center',
              maxWidth: '800px',
              margin: '0 auto',
              fontSize: '1rem'
            }}
          >
            Manage and configure Tractus-X KITs. Enable or disable specific features within each KIT to customize your application capabilities.
          </Typography>
        </Box>
      </Box>

      {/* Center Carousel Container */}
      <Box sx={{ 
        flex: 1, // Take remaining space
        display: 'flex', 
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        maxHeight: 'calc(100vh - 200px)', // Responsive height based on viewport
        minHeight: '350px' // Minimum height for cards
      }}>
        {/* Side Navigation Arrows - Centered with carousel */}
        {sortedKits.length > 1 && (
          <>
            {/* Left Arrow - positioned at left edge of container */}
            <IconButton
              onClick={handlePrevSlide}
              sx={{
                position: 'absolute',
                left: '1%', // Close to left edge of container
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 1000,
                color: '#ffffff',
                background: 'linear-gradient(135deg, rgba(0,0,0,0.8) 0%, rgba(30,30,30,0.9) 100%)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                '&:hover': {
                  background: 'linear-gradient(135deg, rgba(66,165,245,0.8) 0%, rgba(30,30,30,0.9) 100%)',
                  transform: 'translateY(-50%) scale(1.1)',
                  boxShadow: '0 12px 40px rgba(66,165,245,0.2)'
                },
                width: 56,
                height: 56
              }}
            >
              <ChevronLeft sx={{ fontSize: 32 }} />
            </IconButton>

            {/* Right Arrow - positioned at right edge of container */}
            <IconButton
              onClick={handleNextSlide}
              sx={{
                position: 'absolute',
                right: '1%', // Close to right edge of container
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 1000,
                color: '#ffffff',
                background: 'linear-gradient(135deg, rgba(0,0,0,0.8) 0%, rgba(30,30,30,0.9) 100%)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                '&:hover': {
                  background: 'linear-gradient(135deg, rgba(66,165,245,0.8) 0%, rgba(30,30,30,0.9) 100%)',
                  transform: 'translateY(-50%) scale(1.1)',
                  boxShadow: '0 12px 40px rgba(66,165,245,0.2)'
                },
                width: 56,
                height: 56
              }}
            >
              <ChevronRight sx={{ fontSize: 32 }} />
            </IconButton>
          </>
        )}
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            height: '380px', // Fixed height matching cards
            overflow: 'visible' // Allow cards to extend beyond bounds for animations
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              height: '100%',
              // Create infinite loop by multiplying array size
              width: `${sortedKits.length * 320 * 5}px`, // 5 copies for seamless infinite scroll
              transform: `translateX(calc(50vw - 233px - ${(currentIndex + sortedKits.length * 2) * 320}px))`, // Adjusted for perfect centering with title and dots
              transition: isAnimating ? 'transform 0.6s cubic-bezier(0.4, 0.0, 0.2, 1)' : 'none',
              gap: 0
            }}
          >
            {/* Create 5 copies for infinite seamless loop */}
            {Array.from({ length: 5 }, (_, copyIndex) => 
              sortedKits.map((kit, kitIndex) => {
                const absoluteIndex = copyIndex * sortedKits.length + kitIndex;
                const virtualIndex = absoluteIndex - sortedKits.length * 2; // Center offset
                const relativePosition = virtualIndex - currentIndex;
                const distance = Math.abs(relativePosition);
                const isCenter = relativePosition === 0;
                
                // Calculate progressive effects based on distance from center
                let scale = 1;
                let opacity = 1;
                let blur = 0;
                let zIndex = 10;
                
                if (distance === 0) {
                  // Center card - most prominent
                  scale = 1.1;
                  opacity = 1;
                  blur = 0;
                  zIndex = 20;
                } else if (distance === 1) {
                  // Adjacent cards
                  scale = 0.95;
                  opacity = 0.8;
                  blur = 1;
                  zIndex = 15;
                } else if (distance === 2) {
                  // Second level cards
                  scale = 0.85;
                  opacity = 0.6;
                  blur = 2;
                  zIndex = 10;
                } else if (distance >= 3) {
                  // Far cards - heavily blurred
                  scale = 0.75;
                  opacity = 0.3;
                  blur = 4;
                  zIndex = 5;
                }
                
                return (
                  <Box
                    key={`${kit.id}-${copyIndex}-${kitIndex}`}
                    onClick={() => !isCenter && handleCardClick(kitIndex)} // Only allow click if not centered
                    sx={{
                      flex: '0 0 320px',
                      width: '320px',
                      height: '380px', // More compact cards
                      transform: `scale(${scale}) translateY(${distance * 5}px)`,
                      opacity: opacity,
                      filter: `blur(${blur}px)`,
                      transition: 'all 0.6s cubic-bezier(0.4, 0.0, 0.2, 1)',
                      zIndex: zIndex,
                      px: 2,
                      cursor: !isCenter ? 'pointer' : 'default', // Show pointer cursor for non-centered cards
                      '&:hover': !isCenter ? {
                        transform: `scale(${scale * 1.05}) translateY(${distance * 5}px)`, // Slight scale increase on hover for non-centered cards
                      } : {}
                    }}
                  >
                    <KitCard
                      kit={kit}
                      onFeatureToggle={handleFeatureToggle}
                      isCenter={isCenter}
                    />
                  </Box>
                );
              })
            ).flat()}
          </Box>
        </Box>
      </Box>

      {/* Bottom Navigation Dots */}
      {sortedKits.length > 1 && (
        <Box 
          sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            gap: 1.5, 
            mt: 3, // Same margin as header spacing
            mb: 3, // Same margin for bottom spacing
            px: 3
          }}
        >
          {sortedKits.map((_, index) => {
            const normalizedCurrent = ((currentIndex % sortedKits.length) + sortedKits.length) % sortedKits.length;
            const isActive = index === normalizedCurrent;
            
            return (
              <Box
                key={index}
                onClick={() => handleDotClick(index)}
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  backgroundColor: isActive 
                    ? 'rgba(66, 165, 245, 0.9)' 
                    : 'rgba(255, 255, 255, 0.4)',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  '&:hover': {
                    backgroundColor: isActive 
                      ? 'rgba(66, 165, 245, 1)' 
                      : 'rgba(255, 255, 255, 0.6)',
                    transform: 'scale(1.3)',
                    border: '1px solid rgba(66, 165, 245, 0.5)'
                  }
                }}
              />
            );
          })}
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
