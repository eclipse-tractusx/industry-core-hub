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
import {
  Box,
  Card,
  CardContent,
  Chip,
  Grid2,
  Typography,
} from '@mui/material';
import MemoryIcon from '@mui/icons-material/Memory';
import PlaceIcon from '@mui/icons-material/Place';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import { SubmodelAddonProps } from '../shared/types';
import { SubmodelAddonWrapper } from '../BaseAddon';
import { PartTypeInformation } from './types';

/**
 * Viewer component for the Part Type Information submodel.
 */
export const PartTypeInformationViewer: React.FC<SubmodelAddonProps<PartTypeInformation>> = ({
  data: rawData,
  semanticId,
}) => {
  // Normalise: some backends return the submodel wrapped in an array.
  const data: PartTypeInformation = (Array.isArray(rawData) ? rawData[0] : rawData) as PartTypeInformation;

  const pti = data.partTypeInformation;

  return (
    <SubmodelAddonWrapper
      title="Part Type Information"
      subtitle={`Semantic ID: ${semanticId}`}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

        {/* Catena-X ID */}
        {data.catenaXId && (
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <FingerprintIcon color="primary" />
                Digital Twin Identity
              </Typography>
              <Typography variant="subtitle2" color="text.secondary">Catena-X ID</Typography>
              <Chip
                label={data.catenaXId}
                variant="outlined"
                size="small"
                sx={{ mt: 0.5, fontFamily: 'monospace', fontSize: '0.78rem' }}
              />
            </CardContent>
          </Card>
        )}

        {/* Part Type Information */}
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <MemoryIcon color="primary" />
              Part Information
            </Typography>
            <Grid2 container spacing={2}>
              <Grid2 size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle2" color="text.secondary">Manufacturer Part ID</Typography>
                <Typography variant="body1" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                  {pti.manufacturerPartId}
                </Typography>
              </Grid2>
              {pti.nameAtManufacturer && (
                <Grid2 size={{ xs: 12, md: 6 }}>
                  <Typography variant="subtitle2" color="text.secondary">Name at Manufacturer</Typography>
                  <Typography variant="body1">{pti.nameAtManufacturer}</Typography>
                </Grid2>
              )}
              {pti.customerPartId && (
                <Grid2 size={{ xs: 12, md: 6 }}>
                  <Typography variant="subtitle2" color="text.secondary">Customer Part ID</Typography>
                  <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>{pti.customerPartId}</Typography>
                </Grid2>
              )}
              {pti.nameAtCustomer && (
                <Grid2 size={{ xs: 12, md: 6 }}>
                  <Typography variant="subtitle2" color="text.secondary">Name at Customer</Typography>
                  <Typography variant="body1">{pti.nameAtCustomer}</Typography>
                </Grid2>
              )}
            </Grid2>
          </CardContent>
        </Card>

        {/* Production Sites */}
        {data.partSitesInformationAsPlanned && data.partSitesInformationAsPlanned.length > 0 && (
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <PlaceIcon color="primary" />
                Production Sites
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {data.partSitesInformationAsPlanned.map((site) => (
                  <Chip
                    key={site.catenaXsiteId}
                    label={`${site.catenaXsiteId} · ${site.function}`}
                    variant="outlined"
                    color="primary"
                    size="small"
                    icon={<PlaceIcon />}
                    sx={{ fontFamily: 'monospace' }}
                  />
                ))}
              </Box>
            </CardContent>
          </Card>
        )}

      </Box>
    </SubmodelAddonWrapper>
  );
};
