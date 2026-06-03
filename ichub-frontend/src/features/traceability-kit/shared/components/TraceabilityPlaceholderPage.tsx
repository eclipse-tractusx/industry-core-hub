/********************************************************************************
 * Eclipse Tractus-X - Industry Core Hub Frontend
 *
 * Copyright (c) 2026 Contributors to the Eclipse Foundation
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
import { Box, Card, CardContent, Chip, Typography } from '@mui/material';
import { Construction } from '@mui/icons-material';

interface TraceabilityPlaceholderPageProps {
  title: string;
  description: string;
}

const TRACEABILITY_ORANGE = '#ff6600';

const TraceabilityPlaceholderPage: React.FC<TraceabilityPlaceholderPageProps> = ({
  title,
  description
}) => {
  return (
    <Box sx={{ p: 3 }}>
      <Card
        sx={{
          background: 'linear-gradient(135deg, rgba(255, 102, 0, 0.12), rgba(255, 140, 0, 0.08))',
          border: `1px solid ${TRACEABILITY_ORANGE}66`,
          borderRadius: 2
        }}
      >
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <Construction sx={{ color: TRACEABILITY_ORANGE }} />
            <Typography variant="h4" sx={{ color: '#ffffff', fontWeight: 700 }}>
              {title}
            </Typography>
          </Box>

          <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.8)', mb: 2 }}>
            {description}
          </Typography>

          <Chip
            label="Initial structure ready"
            sx={{
              backgroundColor: 'rgba(255, 102, 0, 0.2)',
              color: TRACEABILITY_ORANGE,
              border: `1px solid ${TRACEABILITY_ORANGE}80`,
              fontWeight: 600
            }}
          />
        </CardContent>
      </Card>
    </Box>
  );
};

export default TraceabilityPlaceholderPage;
