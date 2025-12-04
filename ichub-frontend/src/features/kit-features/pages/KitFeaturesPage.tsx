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
import { useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  Alert,
  Snackbar,
  IconButton
} from '@mui/material';
import {
  ChevronLeft,
  ChevronRight
} from '@mui/icons-material';
import KitCard from '../components/KitCard';
import { KitFeature } from '../types';
import { kits as kitsData } from '../../main';

const KitFeaturesPage: React.FC = () => {
  const location = useLocation();
  const [kits, setKits] = useState<KitFeature[]>([]);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  
  // Carousel state - smooth sliding carousel
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // Load KITs data
    setKits(kitsData);
  }, []);

  // Restore carousel position when navigating back from kit detail
  useEffect(() => {
    const state = location.state as { fromKitId?: string } | null;
    if (state?.fromKitId && kits.length > 0) {
      const kitIndex = kits.findIndex(kit => kit.id === state.fromKitId);
      if (kitIndex !== -1) {
        setCurrentIndex(kitIndex);
      }
    }
  }, [location.state, kits]);

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
        overflow: 'hidden',
        position: 'relative',
        background: `
          radial-gradient(circle at 20% 50%, rgba(66, 165, 245, 0.1) 0%, transparent 50%),
          radial-gradient(circle at 80% 80%, rgba(25, 118, 210, 0.15) 0%, transparent 50%),
          radial-gradient(circle at 40% 20%, rgba(13, 71, 161, 0.1) 0%, transparent 40%),
          linear-gradient(180deg, rgba(0, 0, 0, 0.2) 0%, rgba(0, 0, 0, 0) 100%)
        `,
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `
            linear-gradient(90deg, rgba(66, 165, 245, 0.03) 1px, transparent 1px),
            linear-gradient(rgba(66, 165, 245, 0.03) 1px, transparent 1px)!important
          `,
          backgroundSize: '60px 60px',
          opacity: 0.4,
          pointerEvents: 'none'
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '2px',
          background: 'linear-gradient(90deg, transparent 0%, rgba(66, 165, 245, 0.5) 50%, transparent 100%)!important',
          animation: 'shimmer 3s ease-in-out infinite'
        },
        '@keyframes shimmer': {
          '0%, 100%': { opacity: 0.3 },
          '50%': { opacity: 1 }
        }
      }}
    >
      {/* Hero Header Section */}
      <Box sx={{ 
        pt: 6, 
        pb: 3,
        px: 4,
        textAlign: 'center',
        position: 'relative',
        zIndex: 1,
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '90%',
          height: '100%',
          background: `
            radial-gradient(ellipse at center, rgba(66, 165, 245, 0.15) 0%, transparent 70%),
            radial-gradient(ellipse at 30% 50%, rgba(25, 118, 210, 0.12) 0%, transparent 60%),
            radial-gradient(ellipse at 70% 50%, rgba(13, 71, 161, 0.12) 0%, transparent 60%)
          `,
          filter: 'blur(40px)',
          zIndex: -1,
          pointerEvents: 'none'
        }
      }}>
        <Typography 
          variant="h2" 
          sx={{ 
            fontSize: { xs: '2.5rem', md: '3.5rem' },
            fontWeight: 700,
            background: 'linear-gradient(135deg, #42a5f5 0%, #1976d2 50%, #0d47a1 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            mb: 2,
            letterSpacing: '-0.02em',
            textShadow: '0 0 40px rgba(66, 165, 245, 0.3)'
          }}
        >
          Welcome to Industry Core Hub
        </Typography>
        
        <Typography 
          variant="h5"
          sx={{ 
            color: 'rgba(255, 255, 255, 0.9)',
            maxWidth: '900px',
            margin: '0 auto',
            fontSize: { xs: '1.1rem', md: '1.3rem' },
            fontWeight: 500,
            lineHeight: 1.6,
            mb: 1
          }}
        >
          The Eclipse Tractus-X KITs & Use Cases Speed Way
        </Typography>

        <Typography 
          variant="body1"
          sx={{ 
            color: 'rgba(255, 255, 255, 0.6)',
            maxWidth: '750px',
            margin: '0 auto',
            fontSize: { xs: '0.95rem', md: '1.05rem' },
            lineHeight: 1.8,
            fontWeight: 400
          }}
        >
          Enable or disable specific features within a KIT to unlock the complete potential of dataspaces.<br />
          Explore the carousel below to discover available features.
        </Typography>
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
                    onClick={(e) => {
                      // Don't intercept clicks on centered cards to allow button navigation
                      if (isCenter) return;
                      // For non-centered cards, check if click is on the card background (not buttons)
                      const target = e.target as HTMLElement;
                      if (!target.closest('button')) {
                        handleCardClick(kitIndex);
                      }
                    }}
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
