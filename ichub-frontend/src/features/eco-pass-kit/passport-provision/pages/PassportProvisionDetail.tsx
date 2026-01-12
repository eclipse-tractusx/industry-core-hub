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

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import { getDPPById } from '../api/provisionApi';
import { PassportTypeRegistry } from '../../passport-consumption/passport-types';
import PassportLoadingSteps from '../../passport-consumption/components/PassportLoadingSteps';
import { LOADING_STEPS } from '../../passport-consumption/components/loadingStepsConfig';

/**
 * Component to view/visualize a user's provisioned DPP
 * Uses the same visualization architecture as passport consumption
 */
const PassportProvisionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const stateData = location.state as { 
    dppData?: any; 
    submodelContent?: any;
    semanticId?: string;
    skipStepper?: boolean;
    directToVisualizer?: boolean;
  } | null;

  const [loading, setLoading] = useState(!stateData?.submodelContent && !stateData?.skipStepper && !stateData?.directToVisualizer);
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dppData, setDppData] = useState<any>(
    stateData?.submodelContent 
      ? { data: stateData.submodelContent, semanticId: stateData.semanticId }
      : stateData?.dppData || null
  );

  useEffect(() => {
    // If we have submodel content from navigation state, skip loading
    if (stateData?.submodelContent || stateData?.skipStepper || stateData?.directToVisualizer) {
      return;
    }

    const loadDPP = async () => {
      if (!id) {
        setError('No DPP ID provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        setCurrentStep(0);

        // Simulate step-by-step loading for better UX
        for (let step = 0; step < LOADING_STEPS.length - 1; step++) {
          setCurrentStep(step);
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Fetch DPP data from API
        const response = await getDPPById(id);

        if (!response) {
          throw new Error('DPP not found');
        }

        // Show final step
        setCurrentStep(LOADING_STEPS.length - 1);
        await new Promise(resolve => setTimeout(resolve, 300));

        setDppData(response);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load DPP data');
      } finally {
        setLoading(false);
      }
    };

    loadDPP();
  }, [id, stateData]);

  const handleBack = () => {
    navigate('/passport/provision');
  };

  // Loading state with step-by-step progress
  if (loading) {
    return (
      <PassportLoadingSteps
        passportId={id || ''}
        currentStep={currentStep}
        onCancel={handleBack}
      />
    );
  }

  // Error state
  if (error || !dppData) {
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
          Error Loading DPP
        </Typography>
        <Typography
          variant="body1"
          sx={{
            color: 'rgba(255, 255, 255, 0.7)',
            textAlign: 'center',
            maxWidth: 500
          }}
        >
          {error || 'Unable to load DPP data'}
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
  let passportConfig = dppData.semanticId 
    ? PassportTypeRegistry.getBySemanticId(dppData.semanticId)
    : undefined;
  
  // Fallback to data structure detection if semantic ID doesn't match
  if (!passportConfig) {
    passportConfig = PassportTypeRegistry.detectType(dppData.data);
  }
  
  // Final fallback to generic visualization
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
      data={dppData.data}
      passportId={id || ''}
      onBack={handleBack}
      passportName={passportConfig.name}
      passportVersion={passportConfig.version}
      skipLoadingAnimation={stateData?.skipStepper || stateData?.directToVisualizer || false}
      digitalTwinData={dppData.twinAssociation ? {
        shell_descriptor: {
          id: dppData.twinAssociation.twinId,
          globalAssetId: dppData.twinAssociation.twinId,
          assetKind: 'Instance',
          assetType: 'Product',
          submodelDescriptors: [],
          specificAssetIds: [
            {
              name: 'manufacturerPartId',
              value: dppData.twinAssociation.manufacturerPartId
            },
            {
              name: 'serialNumber',
              value: dppData.twinAssociation.serialNumber
            }
          ]
        }
      } : undefined}
    />
  );
};

export default PassportProvisionDetail;
