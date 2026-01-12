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
import { PassportVisualizationProps } from '../types';
import { BasePassportVisualization } from '../base';
import { GeneralInfoCard, ManufacturingCard, SustainabilityCard, MaterialsCard } from './components/v6.1.0/HeaderCards';
import { MaterialCompositionRenderer } from './components/v6.1.0/MaterialCompositionRenderer';
import { AdditionalDataRenderer } from './components/v6.1.0/AdditionalDataRenderer';
import { SourcesRenderer } from './components/v6.1.0/SourcesRenderer';
import { MaterialsRenderer } from './components/v6.1.0/MaterialsRenderer';
import { parseSemanticId } from '@/utils/semantics';

/**
 * Generic passport visualization component
 * Uses the base skeleton with custom header cards and renderers for generic digital product passports
 */
export const GenericPassportVisualization: React.FC<PassportVisualizationProps> = (props) => {
  // Extract version from digital twin's DPP submodel semantic ID if available
  let versionFromTwin = props.passportVersion;
  
  if (props.digitalTwinData?.shell_descriptor?.submodelDescriptors) {
    const dppSubmodel = props.digitalTwinData.shell_descriptor.submodelDescriptors.find(
      sm => sm.idShort === 'digitalProductPassport'
    );
    
    if (dppSubmodel?.semanticId?.keys?.[0]?.value) {
      const semanticId = dppSubmodel.semanticId.keys[0].value;
      const parsed = parseSemanticId(semanticId);
      versionFromTwin = parsed.version;
    }
  }
  
  return (
    <BasePassportVisualization 
      {...props}
      passportVersion={versionFromTwin}
      config={{
        headerCards: [
          GeneralInfoCard,
          ManufacturingCard,
          SustainabilityCard,
          MaterialsCard
        ],
        customRenderers: {
          'materialComposition': MaterialCompositionRenderer,
          'materials.materialComposition': MaterialCompositionRenderer,
          'additionalData': AdditionalDataRenderer,
          'sources': SourcesRenderer,
          'materials': MaterialsRenderer
        }
      }}
    />
  );
};
