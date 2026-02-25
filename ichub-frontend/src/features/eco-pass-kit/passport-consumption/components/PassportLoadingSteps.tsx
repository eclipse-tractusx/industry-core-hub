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

import React from 'react';
import { Box, Card, CardContent, Typography, Button } from '@mui/material';
import { CheckCircle, RadioButtonUnchecked } from '@mui/icons-material';
import { LOADING_STEPS } from './loadingStepsConfig';

interface PassportLoadingStepsProps {
  passportId?: string;
  currentStep: number;
  onCancel?: () => void;
  error?: string | null;
  errorStep?: number;
}

/**
 * Loading component with step-by-step progress visualization
 * Shows the current loading stage when fetching passport data
 */
const PassportLoadingSteps: React.FC<PassportLoadingStepsProps> = ({
  passportId,
  currentStep,
  onCancel,
  error,
  errorStep
}) => {
  const hasError = Boolean(error);
  const failedStep = errorStep !== undefined ? errorStep : currentStep;
  return (
    <Box 
      sx={{ 
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: { xs: 2, sm: 3, md: 4 }
      }}
    >
      <Card
        sx={{
          maxWidth: '600px',
          width: '100%',
          background: 'linear-gradient(135deg, rgba(30, 30, 30, 0.95) 0%, rgba(20, 20, 20, 0.95) 100%)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: { xs: '16px', md: '20px' },
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
        }}
      >
        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          {/* Header */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography variant="h5" sx={{ color: hasError ? '#f44336' : '#fff', fontWeight: 600, mb: 1 }}>
              {hasError ? 'Error Loading Passport' : 'Loading Passport'}
            </Typography>
            {passportId && (
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', fontFamily: 'monospace' }}>
                {passportId}
              </Typography>
            )}
          </Box>

          {/* Progress Steps - Horizontal */}
          <Box sx={{ mb: 4 }}>
            {/* Step Icons Row */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
              {LOADING_STEPS.map((step, index) => {
                const Icon = step.icon;
                const isFailed = hasError && index === failedStep;
                const isActive = !hasError && index === currentStep;
                const isCompleted = !hasError && index < currentStep;
                const isPending = !hasError && index > currentStep;

                return (
                  <React.Fragment key={step.id}>
                    {/* Step Icon */}
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        flex: 1,
                        position: 'relative',
                        transition: 'all 0.3s ease',
                        opacity: isPending ? 0.4 : 1
                      }}
                    >
                      <Box
                        sx={{
                          width: { xs: 36, sm: 44 },
                          height: { xs: 36, sm: 44 },
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: isFailed
                            ? 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)'
                            : isCompleted
                            ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                            : isActive
                            ? 'rgba(102, 126, 234, 0.2)'
                            : 'rgba(255, 255, 255, 0.05)',
                          border: isFailed ? '2px solid #f44336' : isActive ? '2px solid #667eea' : 'none',
                          transition: 'all 0.3s ease',
                          position: 'relative',
                          zIndex: 2,
                          ...(isActive && {
                            animation: 'pulse 2s ease-in-out infinite',
                            '@keyframes pulse': {
                              '0%, 100%': { boxShadow: '0 0 0 0 rgba(102, 126, 234, 0.4)' },
                              '50%': { boxShadow: '0 0 0 8px rgba(102, 126, 234, 0)' }
                            }
                          })
                        }}
                      >
                        {isFailed ? (
                          <Box sx={{ fontSize: { xs: 20, sm: 24 }, color: '#fff', fontWeight: 'bold' }}>✕</Box>
                        ) : isCompleted ? (
                          <CheckCircle sx={{ fontSize: { xs: 20, sm: 24 }, color: '#fff' }} />
                        ) : isActive ? (
                          <Icon sx={{ fontSize: { xs: 20, sm: 24 }, color: '#667eea' }} />
                        ) : (
                          <RadioButtonUnchecked sx={{ fontSize: { xs: 20, sm: 24 }, color: 'rgba(255, 255, 255, 0.3)' }} />
                        )}
                      </Box>
                      
                      {/* Step Label */}
                      <Typography
                        variant="caption"
                        sx={{
                          color: isActive || isCompleted ? '#fff' : 'rgba(255, 255, 255, 0.5)',
                          fontWeight: isActive ? 600 : 500,
                          fontSize: { xs: '0.65rem', sm: '0.75rem' },
                          mt: 1,
                          textAlign: 'center',
                          transition: 'all 0.3s ease',
                          display: { xs: 'none', sm: 'block' }
                        }}
                      >
                        {step.label}
                      </Typography>
                    </Box>

                    {/* Connector Line */}
                    {index < LOADING_STEPS.length - 1 && (
                      <Box
                        sx={{
                          height: 2,
                          flex: 1,
                          mx: { xs: 0.5, sm: 1 },
                          background: isCompleted
                            ? 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)'
                            : 'rgba(255, 255, 255, 0.1)',
                          transition: 'all 0.5s ease',
                          position: 'relative',
                          top: { xs: -18, sm: -22 }
                        }}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </Box>

            {/* Active Step Description or Error Message */}
            {hasError && error ? (
              <Box
                sx={{
                  textAlign: 'center',
                  p: 2,
                  borderRadius: '10px',
                  background: 'rgba(244, 67, 54, 0.1)',
                  border: '1px solid rgba(244, 67, 54, 0.3)'
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    color: '#f44336',
                    fontWeight: 600,
                    mb: 0.5,
                    fontSize: { xs: '0.85rem', sm: '0.9rem' }
                  }}
                >
                  {LOADING_STEPS[failedStep]?.label || 'Error'}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: 'rgba(255, 255, 255, 0.8)',
                    fontSize: { xs: '0.75rem', sm: '0.8rem' }
                  }}
                >
                  {error}
                </Typography>
              </Box>
            ) : LOADING_STEPS[currentStep] && (
              <Box
                sx={{
                  textAlign: 'center',
                  p: 2,
                  borderRadius: '10px',
                  background: 'rgba(102, 126, 234, 0.1)',
                  border: '1px solid rgba(102, 126, 234, 0.2)'
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    color: '#fff',
                    fontWeight: 600,
                    mb: 0.5,
                    fontSize: { xs: '0.85rem', sm: '0.9rem' }
                  }}
                >
                  {LOADING_STEPS[currentStep].label}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: 'rgba(255, 255, 255, 0.6)',
                    fontSize: { xs: '0.75rem', sm: '0.8rem' }
                  }}
                >
                  {LOADING_STEPS[currentStep].description}
                </Typography>
              </Box>
            )}
          </Box>

          {/* Cancel/Go Back Button */}
          {onCancel && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Button
                variant={hasError ? 'contained' : 'outlined'}
                onClick={onCancel}
                sx={{
                  ...(hasError ? {
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: '#fff',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)'
                    }
                  } : {
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                    color: 'rgba(255, 255, 255, 0.7)',
                    '&:hover': {
                      borderColor: 'rgba(255, 255, 255, 0.4)',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)'
                    }
                  }),
                  textTransform: 'none',
                  px: 3,
                  py: 1,
                  borderRadius: '10px'
                }}
              >
                {hasError ? 'Go Back' : 'Cancel'}
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default PassportLoadingSteps;
