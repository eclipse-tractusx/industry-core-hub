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

import { Box, Typography, LinearProgress, IconButton } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloseIcon from '@mui/icons-material/Close';
import { useState, useEffect } from 'react';

interface SearchLoadingProps {
  isLoading: boolean;
  isCompleted?: boolean;
  onCancel?: () => void;
}

const SearchLoading = ({ isLoading, isCompleted = false, onCancel }: SearchLoadingProps) => {
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [currentMessageIndex, setCurrentMessageIndex] = useState<number>(0);
  const [showFirstMessage, setShowFirstMessage] = useState<boolean>(true);
  
  // Base rotating messages (shown after first message)
  const rotatingMessages = [
    'Searching through the dataspace for available data...',
    'Discovering Partner endpoints...',
    'Discovering Digital Twin Registries...',
    'Negotiating contracts with data providers...',
    'Connecting to digital twin registries...',
    'Establishing secure connections to data sources...',
    'Retrieving digital twin information...',
  ];
  
  // Extended wait message for long operations
  const extendedWaitMessage = "It's taking a bit more than expected, probably the access negotiation is still going (approx 10s). This negotiation is done only on the first request.";
  
  // Error message for very long operations
  const errorMessage = "This is taking much longer than expected. There may be an error in the initial connection/negotiation process. Please contact your administrator.";
  
  // Reset component state when loading starts
  useEffect(() => {
    if (isLoading && !isCompleted) {
      setStartTime(Date.now());
      setCurrentMessageIndex(0);
      setShowFirstMessage(true);
    }
  }, [isLoading, isCompleted]);

  // Handle message cycling
  useEffect(() => {
    if (!isLoading || isCompleted) return;
    
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      
      // Show first message for 1 second, then start cycling
      if (elapsed >= 1000 && showFirstMessage) {
        setShowFirstMessage(false);
        setCurrentMessageIndex(0);
      } else if (!showFirstMessage) {
        setCurrentMessageIndex(prev => (prev + 1) % rotatingMessages.length);
      }
    }, 1000); // Cycle every 1 second
    
    return () => clearInterval(interval);
  }, [isLoading, isCompleted, startTime, showFirstMessage, rotatingMessages.length]);

  // Calculate progress - smooth animation from 0-95% during loading, 100% on completion
  const calculateProgress = () => {
    if (isCompleted) return 100;
    if (!isLoading) return 0;
    
    const elapsed = Date.now() - startTime;
    // Gradually increase to 95% over time
    return Math.min(5 + (elapsed / 200), 95);
  };

  // Get current message based on state
  const getCurrentMessage = () => {
    if (isCompleted) {
      return 'Preparing results for display...';
    }
    
    if (showFirstMessage) {
      return 'Looking for known registries in cache...';
    }
    
    const elapsed = Date.now() - startTime;
    
    // Show error message after 30 seconds
    if (elapsed > 30000) {
      return errorMessage;
    }
    
    // Show extended wait message after 12 seconds
    if (elapsed > 12000) {
      return extendedWaitMessage;
    }
    
    return rotatingMessages[currentMessageIndex];
  };

  const progressValue = calculateProgress();
  const elapsed = Date.now() - startTime;
  const isExtendedWait = elapsed > 12000 && elapsed <= 30000 && isLoading && !isCompleted;
  const isErrorState = elapsed > 30000 && isLoading && !isCompleted;
  const progressColor = isCompleted ? 'success' : (isErrorState ? 'error' : (isExtendedWait ? 'warning' : 'primary'));

  return (
    <Box sx={{ width: '100%', position: 'relative' }}>
      {/* Cancel button - only show during loading */}
      {onCancel && isLoading && !isCompleted && (
        <IconButton
          onClick={onCancel}
          sx={{
            position: 'absolute',
            top: 12,
            right: 12,
            zIndex: 10,
            width: 32,
            height: 32,
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(0, 0, 0, 0.08)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)',
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              backgroundColor: 'rgba(244, 67, 54, 0.1)',
              borderColor: 'rgba(244, 67, 54, 0.2)',
              transform: 'scale(1.05)',
              boxShadow: '0 4px 12px rgba(244, 67, 54, 0.15)',
              '& .cancel-icon': {
                color: '#f44336'
              }
            }
          }}
          title="Cancel search"
        >
          <CloseIcon 
            className="cancel-icon"
            sx={{ 
              fontSize: 18,
              color: '#666',
              transition: 'color 0.2s ease-in-out'
            }} 
          />
        </IconButton>
      )}
      
      {/* Header section */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography 
          variant="h5" 
          sx={{ 
            fontWeight: 'bold',
            background: isCompleted 
              ? 'linear-gradient(45deg, #4caf50 30%, #66bb6a 90%)'
              : 'linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            mb: 2,
            transition: 'all 0.4s ease'
          }}
        >
          {isCompleted ? 'Search Complete!' : 'Searching Digital Twins'}
        </Typography>
        <Typography 
          variant="body2" 
          color="textSecondary"
          sx={{
            transition: 'all 0.3s ease',
            ...(isCompleted && {
              color: '#4caf50',
              fontWeight: 'medium'
            })
          }}
        >
          {getCurrentMessage()}
        </Typography>
      </Box>

      {/* Progress bar */}
      <LinearProgress 
        variant="determinate" 
        value={progressValue} 
        color={progressColor}
        sx={{ 
          mb: 4, 
          height: 8, 
          borderRadius: 4,
          backgroundColor: 'rgba(25, 118, 210, 0.1)',
          '& .MuiLinearProgress-bar': {
            background: isCompleted 
              ? 'linear-gradient(45deg, #4caf50 30%, #66bb6a 90%)'  // Green when completed
              : isErrorState
                ? 'linear-gradient(45deg, #f44336 30%, #ef5350 90%)' // Red when error state (30+ seconds)
                : isExtendedWait
                  ? 'linear-gradient(45deg, #ff9800 30%, #ffb74d 90%)' // Orange/Yellow when taking longer
                  : 'linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)', // Blue when loading normally
            borderRadius: 4,
            transition: isCompleted 
              ? 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)' // Smooth elastic transition to completion
              : 'all 0.4s ease-in-out', // Smooth transition for normal progress and color changes
            // Add a subtle glow effect when completed, extended wait, or error state
            ...(isCompleted && {
              boxShadow: '0 0 15px rgba(76, 175, 80, 0.6)',
              transform: 'scaleY(1.1)' // Slightly expand when complete
            }),
            ...(isErrorState && !isCompleted && {
              boxShadow: '0 0 12px rgba(244, 67, 54, 0.6)',
            }),
            ...(isExtendedWait && !isCompleted && !isErrorState && {
              boxShadow: '0 0 12px rgba(255, 152, 0, 0.4)',
            })
          }
        }} 
      />

      {/* Status indicator */}
      {isCompleted && (
        <Box 
          sx={{ 
            mt: 3, 
            p: 2, 
            backgroundColor: 'rgba(76, 175, 80, 0.1)', 
            borderRadius: 2,
            border: '1px solid rgba(76, 175, 80, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1
          }}
        >
          <CheckCircleIcon 
            sx={{ 
              color: '#4caf50', 
              fontSize: '1.2rem' 
            }} 
          />
          <Typography 
            variant="body2" 
            sx={{ 
              color: '#4caf50',
              fontWeight: 'medium',
              textAlign: 'center'
            }}
          >
            Data has been successfully retrieved and is ready to display
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default SearchLoading;
