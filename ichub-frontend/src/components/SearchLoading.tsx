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

import { Box, Typography, LinearProgress } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import StorageIcon from '@mui/icons-material/Storage';
import HandshakeIcon from '@mui/icons-material/Handshake';
import CloudIcon from '@mui/icons-material/Cloud';
import DescriptionIcon from '@mui/icons-material/Description';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useEffect, useState } from 'react';

interface SearchLoadingProps {
  currentStep: number;
  currentStatus: string;
  isCompleted?: boolean;
}

const SearchLoading = ({ currentStep, currentStatus, isCompleted = false }: SearchLoadingProps) => {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [hasShownCache, setHasShownCache] = useState(false);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [, forceUpdate] = useState(0); // Force re-renders for smooth progress
  
  // Messages that rotate every few seconds
  const rotatingMessages = [
    { 
      text: 'Searching for Connectors for BPN...',
      icon: <SearchIcon sx={{ color: '#1976d2', mr: 1 }} />
    },
    { 
      text: 'Searching Digital Twin Registries...',
      icon: <CloudIcon sx={{ color: '#1976d2', mr: 1 }} />
    },
    { 
      text: 'Negotiating Contracts...',
      icon: <HandshakeIcon sx={{ color: '#1976d2', mr: 1 }} />
    },
    { 
      text: 'Looking for Shell Descriptors...',
      icon: <DescriptionIcon sx={{ color: '#1976d2', mr: 1 }} />
    }
  ];

  // Calculate progress - steadily increase to ~95% over time, never restart
  const calculateProgress = () => {
    // Immediately return 100% when completed - this should be instant
    if (isCompleted || currentStatus.includes('completed')) {
      console.log('📊 Progress set to 100% - completion detected', { isCompleted, currentStatus });
      return 100; 
    }
    
    const elapsed = Date.now() - startTime;
    // Progress from 10% to 95% over 20 seconds, then stay at 95%
    const baseProgress = Math.min(95, 10 + (elapsed / 20000) * 85);
    return baseProgress;
  };

  const isSearchCompleted = isCompleted || currentStatus.includes('completed');
  const progressValue = calculateProgress();
  
  // Debug log to track completion state changes - log every render when completed
  useEffect(() => {
    if (isSearchCompleted) {
      console.log('� COMPLETION STATE ACTIVE:', { 
        isCompleted, 
        currentStatus, 
        isSearchCompleted, 
        progressValue 
      });
    }
  });
  
  // Force re-render when completion state changes for immediate visual feedback
  useEffect(() => {
    if (isSearchCompleted) {
      console.log('✨ Forcing update for completion visual feedback');
      // Trigger a small re-render to ensure immediate visual update
      forceUpdate((prev: number) => prev + 1);
    }
  }, [isSearchCompleted]);
  
  // Change color to orange/yellow when stalled (more than 12 seconds)
  const elapsed = Date.now() - startTime;
  const isStalled = elapsed > 12000 && !isSearchCompleted;
  const progressColor = isSearchCompleted ? 'success' : (isStalled ? 'warning' : 'primary');

  // Reset state when a new search starts (currentStep goes back to 1)
  useEffect(() => {
    if (currentStep === 1 && !isSearchCompleted) {
      setCurrentMessageIndex(0);
      setHasShownCache(false);
      setStartTime(Date.now()); // Reset the timer for new search
    }
  }, [currentStep, isSearchCompleted]);

  // Determine current message to display
  const getCurrentMessage = () => {
    if (isSearchCompleted) {
      return {
        text: 'Search completed successfully!',
        icon: <CheckCircleIcon sx={{ color: '#4caf50', mr: 1 }} />
      };
    }
    
    // Show cache message first (only once)
    if (!hasShownCache && currentStep === 1) {
      return {
        text: 'Looking for known Digital Twin Registries in the Cache',
        icon: <StorageIcon sx={{ color: '#1976d2', mr: 1 }} />
      };
    }
    
    // After 10 seconds, show special message
    if (currentStatus.includes('Taking a bit more than expected')) {
      return {
        text: 'Taking a bit more than expected (probably still negotiating the assets ~10s)',
        icon: <HandshakeIcon sx={{ color: '#ff9800', mr: 1 }} />
      };
    }
    
    // Otherwise rotate through normal messages
    return rotatingMessages[currentMessageIndex];
  };

  // Rotate messages every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isSearchCompleted && hasShownCache) {
        setCurrentMessageIndex((prev) => (prev + 1) % rotatingMessages.length);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isSearchCompleted, hasShownCache, rotatingMessages.length]);

  // Update progress bar smoothly every 500ms
  useEffect(() => {
    if (!isSearchCompleted) {
      const interval = setInterval(() => {
        // Force re-render to update progress bar calculation
        forceUpdate(prev => prev + 1);
      }, 500);

      return () => clearInterval(interval);
    }
  }, [isSearchCompleted]);

  // Mark cache as shown after 500ms (cache step duration)
  useEffect(() => {
    if (currentStep >= 2) {
      setHasShownCache(true);
    }
  }, [currentStep]);

  const currentMessage = getCurrentMessage();

  // Debug logging
  console.log('🔄 SearchLoading render:', {
    isCompleted,
    currentStatus,
    currentStep,
    isSearchCompleted,
    progressValue,
    currentMessage: currentMessage.text
  });

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography 
          variant="h5" 
          sx={{ 
            fontWeight: 'bold',
            background: isSearchCompleted 
              ? 'linear-gradient(45deg, #4caf50 30%, #66bb6a 90%)'
              : 'linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            mb: 2,
            transition: 'all 0.3s ease'
          }}
        >
          {isSearchCompleted ? 'Search Complete!' : 'Searching Digital Twins'}
        </Typography>
        <Typography variant="body2" color="textSecondary">
          {isSearchCompleted 
            ? 'Data has been successfully retrieved and is ready to display'
            : 'This process may take up to 10 seconds while we negotiate contracts and search the dataspace'
          }
        </Typography>
      </Box>

      <LinearProgress 
        variant="determinate" 
        value={progressValue} 
        color={progressColor}
        sx={{ 
          mb: 4, 
          height: 8, 
          borderRadius: 4,
          backgroundColor: isSearchCompleted 
            ? 'rgba(76, 175, 80, 0.1)' // Light green background when completed
            : 'rgba(25, 118, 210, 0.1)', // Light blue background when loading
          '& .MuiLinearProgress-bar': {
            background: isSearchCompleted 
              ? 'linear-gradient(45deg, #4caf50 30%, #66bb6a 90%)'  // Green when completed
              : isStalled
                ? 'linear-gradient(45deg, #ff9800 30%, #ffb74d 90%)' // Orange when stalled
                : 'linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)', // Blue when loading
            borderRadius: 4,
            transition: isSearchCompleted 
              ? 'all 0.1s ease-out' // Very fast transition to completion
              : 'transform 0.4s ease-in-out', // Smooth transition for normal progress
            // Add a subtle glow effect when completed
            ...(isSearchCompleted && {
              boxShadow: '0 0 20px rgba(76, 175, 80, 0.8)',
              transform: 'scaleY(1.2)', // More prominent expansion when completed
              animation: 'pulse 1s ease-in-out infinite alternate' // Pulsing animation
            })
          },
          // Add keyframe animation for pulsing effect
          '@keyframes pulse': {
            '0%': {
              boxShadow: '0 0 20px rgba(76, 175, 80, 0.8)'
            },
            '100%': {
              boxShadow: '0 0 30px rgba(76, 175, 80, 1.0)'
            }
          }
        }} 
      />

      {/* Current Message Display */}
      <Box 
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          mb: 3,
          p: 3,
          backgroundColor: isSearchCompleted ? 'rgba(76, 175, 80, 0.15)' : 'rgba(25, 118, 210, 0.1)',
          borderRadius: 2,
          border: isSearchCompleted ? '2px solid rgba(76, 175, 80, 0.5)' : '1px solid rgba(25, 118, 210, 0.2)',
          transition: 'all 0.3s ease',
          ...(isSearchCompleted && {
            boxShadow: '0 6px 20px rgba(76, 175, 80, 0.4)',
            transform: 'scale(1.05)', // More noticeable enlargement when completed
            animation: 'completionGlow 2s ease-in-out infinite alternate'
          }),
          // Add keyframe animation for completion glow
          '@keyframes completionGlow': {
            '0%': {
              backgroundColor: 'rgba(76, 175, 80, 0.15)',
              borderColor: 'rgba(76, 175, 80, 0.5)'
            },
            '100%': {
              backgroundColor: 'rgba(76, 175, 80, 0.25)',
              borderColor: 'rgba(76, 175, 80, 0.8)'
            }
          }
        }}
      >
        {isSearchCompleted ? (
          <CheckCircleIcon sx={{ color: '#4caf50', mr: 2, fontSize: '2rem' }} />
        ) : (
          currentMessage.icon
        )}
        <Typography 
          variant="h6" 
          sx={{ 
            color: isSearchCompleted ? '#4caf50' : '#1976d2',
            fontWeight: isSearchCompleted ? 'bold' : 'medium',
            textAlign: 'center',
            fontSize: isSearchCompleted ? '1.3rem' : '1.1rem'
          }}
        >
          {isSearchCompleted ? '🎉 Search Completed Successfully! Displaying results...' : currentMessage.text}
        </Typography>
      </Box>
    </Box>
  );
};

export default SearchLoading;
