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
import { Box, Typography, Card, CardContent, Chip } from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import { SubmodelAddonProps } from './types';

/**
 * Base wrapper component for submodel add-ons
 */
export const SubmodelAddonWrapper: React.FC<{
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}> = ({ title, subtitle, children, actions }) => {
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ 
        borderBottom: 1, 
        borderColor: 'divider', 
        px: 3, 
        py: 2, 
        backgroundColor: 'background.paper',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
        {actions && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            {actions}
          </Box>
        )}
      </Box>
      <Box sx={{ 
        flex: 1, 
        overflow: 'auto', 
        backgroundColor: 'background.default',
        p: 3 
      }}>
        {children}
      </Box>
    </Box>
  );
};

/**
 * Default fallback component when no specific add-on is available
 */
export const DefaultSubmodelAddon: React.FC<SubmodelAddonProps> = ({ 
  data, 
  semanticId 
}) => {
  return (
    <SubmodelAddonWrapper 
      title="Generic Submodel View"
      subtitle={`Semantic ID: ${semanticId}`}
    >
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <InfoIcon color="primary" />
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Submodel Information
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>
                Semantic ID:
              </Typography>
              <Chip
                label={semanticId}
                variant="outlined"
                size="small"
                sx={{
                  fontFamily: 'monospace',
                  fontSize: '0.75rem'
                }}
              />
            </Box>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>
                Data Structure:
              </Typography>
              <Typography variant="body2" color="text.secondary">
                This submodel contains {Object.keys(data).length} top-level properties.
                No specialized visualization is available for this semantic ID.
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </SubmodelAddonWrapper>
  );
};
