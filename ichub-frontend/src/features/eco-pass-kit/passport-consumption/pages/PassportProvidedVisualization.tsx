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
import { useNavigate } from 'react-router-dom';
import { PassportTypeRegistry } from '../passport-types';
import { mockProvidedPassport } from '../mockData';

/**
 * Demo page to visualize the user-provided passport data model
 * Now uses the new modular passport visualization architecture
 */
const PassportProvidedVisualization: React.FC = () => {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate('/passport');
  };

  // Detect passport type from the data
  const passportConfig = PassportTypeRegistry.detectType(mockProvidedPassport);
  
  if (!passportConfig) {
    return (
      <div style={{ padding: '2rem', color: '#fff', textAlign: 'center' }}>
        <h2>Error: Unable to determine passport type</h2>
        <button onClick={handleBack} style={{ marginTop: '1rem' }}>
          Go Back
        </button>
      </div>
    );
  }

  const VisualizationComponent = passportConfig.VisualizationComponent;

  return (
    <VisualizationComponent
      schema={passportConfig.schema}
      data={mockProvidedPassport}
      passportId="demo-provided"
      onBack={handleBack}
      passportName={passportConfig.name}
      passportVersion={passportConfig.version}
    />
  );
};

export default PassportProvidedVisualization;
