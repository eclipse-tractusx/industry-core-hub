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

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import { PassportTypeRegistry } from '../passport-types';
import { discoverPassport, PassportResponse, DiscoveryStatus } from '../api/passportApi';
import PassportLoadingSteps from '../components/PassportLoadingSteps';
import { getStepIndexByName } from '../components/loadingStepsConfig';
import { getDtrPoliciesConfig, getGovernanceConfig } from '@/services/EnvironmentService';

/**
 * Demo page to visualize the user-provided passport data model
 * Now uses the new modular passport visualization architecture with API loading
 */
const PassportProvidedVisualization: React.FC = () => {
  const navigate = useNavigate();
  const params = useParams();
  const passportId = params?.id as string | undefined;
  
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [errorStep, setErrorStep] = useState<number | undefined>(undefined);
  const [passportData, setPassportData] = useState<PassportResponse | null>(null);

  useEffect(() => {
    const loadPassportData = async () => {
      if (!passportId) {
        setError('No passport ID provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        setCurrentStep(0);
        
        // Use the discovery API with real backend polling
        const semanticId = 'urn:samm:io.catenax.generic.digital_product_passport:6.1.0#DigitalProductPassport';
        
        // Retrieve DTR and governance policies from configuration
        const dtrPolicies = getDtrPoliciesConfig();
        const governanceConfigs = getGovernanceConfig();
        
        // Find the governance config that matches the semantic ID
        const matchingGovernance = governanceConfigs.find(gc => gc.semanticid === semanticId);
        const governancePolicies = matchingGovernance ? { policies: matchingGovernance.policies } : undefined;
        
        const response = await discoverPassport(
          passportId,
          semanticId,
          (status: DiscoveryStatus) => {
            // Update the UI based on backend status
            const stepIndex = getStepIndexByName(status.step);
            setCurrentStep(stepIndex);
            
            // If status indicates error, capture it
            if (status.status === 'failed') {
              setError(status.message || 'Discovery failed');
              setErrorStep(stepIndex);
            }
          },
          dtrPolicies,
          governancePolicies
        );
        
        setPassportData(response);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load passport data';
        setError(errorMessage);
        // Capture the current step at the time of error
        setErrorStep((prevStep) => prevStep !== undefined ? prevStep : currentStep);
      } finally {
        setLoading(false);
      }
    };

    loadPassportData();
  }, [passportId]);

  const handleBack = () => {
    navigate('/passport');
  };

  // Loading state with step-by-step progress (includes error display)
  if (loading || error) {
    return (
      <PassportLoadingSteps
        passportId={passportId}
        currentStep={currentStep}
        error={error}
        errorStep={errorStep}
        onCancel={() => navigate('/passport')}
      />
    );
  }

  // Final fallback error (should not reach here normally)
  if (!passportData) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0d0d0d',
          gap: 2,
          p: 3
        }}
      >
        <Typography
          variant="h5"
          sx={{
            color: '#f44336',
            fontWeight: 600,
            mb: 1
          }}
        >
          Error Loading Passport
        </Typography>
        <Typography
          variant="body1"
          sx={{
            color: 'rgba(255, 255, 255, 0.7)',
            textAlign: 'center',
            maxWidth: 500
          }}
        >
          {error || 'Unable to load passport data'}
        </Typography>
        <Box
          component="button"
          onClick={handleBack}
          sx={{
            mt: 2,
            px: 3,
            py: 1.5,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '0.95rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
            }
          }}
        >
          Go Back
        </Box>
      </Box>
    );
  }

  // Detect passport type from semantic ID (if available), otherwise from data structure
  let passportConfig = passportData.semanticId 
    ? PassportTypeRegistry.getBySemanticId(passportData.semanticId)
    : undefined;
  
  // Fallback to data structure detection if semantic ID doesn't match
  if (!passportConfig) {
    passportConfig = PassportTypeRegistry.detectType(passportData.data);
  }
  
  // Final fallback to base/generic visualization
  if (!passportConfig) {
    passportConfig = PassportTypeRegistry.get('generic');
  }
  
  if (!passportConfig) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0d0d0d',
          gap: 2,
          p: 3
        }}
      >
        <Typography
          variant="h5"
          sx={{
            color: '#f44336',
            fontWeight: 600,
            mb: 1
          }}
        >
          Unable to Determine Passport Type
        </Typography>
        <Typography
          variant="body1"
          sx={{
            color: 'rgba(255, 255, 255, 0.7)',
            textAlign: 'center'
          }}
        >
          The passport data format is not recognized
        </Typography>
        <Box
          component="button"
          onClick={handleBack}
          sx={{
            mt: 2,
            px: 3,
            py: 1.5,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '0.95rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
            }
          }}
        >
          Go Back
        </Box>
      </Box>
    );
  }

  const VisualizationComponent = passportConfig.VisualizationComponent;

  return (
    <VisualizationComponent
      schema={passportConfig.schema}
      data={passportData.data}
      passportId={passportId || ''}
      onBack={handleBack}
      passportName={passportConfig.name}
      passportVersion={passportConfig.version}
      digitalTwinData={passportData.digitalTwin}
      counterPartyId={passportData.counterPartyId}
    />
  );
};

export default PassportProvidedVisualization;
