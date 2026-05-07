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
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import MemoryIcon from '@mui/icons-material/Memory';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import PlaceIcon from '@mui/icons-material/Place';
import { SubmodelAddonProps } from '../shared/types';
import { SubmodelAddonWrapper } from '../BaseAddon';
import { SerialPart } from './types';
import { getCountryFlag } from '../utils/country-flags';

/**
 * Viewer component for the Serial Part submodel.
 */
export const SerialPartViewer: React.FC<SubmodelAddonProps<SerialPart>> = ({
  data: rawData,
  semanticId,
}) => {
  // Normalise: some backends return the submodel wrapped in an array.
  const data: SerialPart = (Array.isArray(rawData) ? rawData[0] : rawData) as SerialPart;

  return (
    <SubmodelAddonWrapper
      title="Serial Part"
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

        {/* Local Identifiers */}
        {data.localIdentifiers && data.localIdentifiers.length > 0 && (
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <FingerprintIcon color="secondary" />
                Local Identifiers
              </Typography>
              <Grid2 container spacing={2}>
                {data.localIdentifiers.map((id) => (
                  <Grid2 key={id.key} size={{ xs: 12, sm: 6, md: 4 }}>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                      {id.key}
                    </Typography>
                    <Typography variant="body1" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                      {id.value ?? '—'}
                    </Typography>
                  </Grid2>
                ))}
              </Grid2>
            </CardContent>
          </Card>
        )}

        {/* Part Type Information */}
        {data.partTypeInformation && (
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
                    {data.partTypeInformation.manufacturerPartId}
                  </Typography>
                </Grid2>
                {data.partTypeInformation.nameAtManufacturer && (
                  <Grid2 size={{ xs: 12, md: 6 }}>
                    <Typography variant="subtitle2" color="text.secondary">Name at Manufacturer</Typography>
                    <Typography variant="body1">{data.partTypeInformation.nameAtManufacturer}</Typography>
                  </Grid2>
                )}
                {data.partTypeInformation.customerPartId && (
                  <Grid2 size={{ xs: 12, md: 6 }}>
                    <Typography variant="subtitle2" color="text.secondary">Customer Part ID</Typography>
                    <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
                      {data.partTypeInformation.customerPartId}
                    </Typography>
                  </Grid2>
                )}
                {data.partTypeInformation.nameAtCustomer && (
                  <Grid2 size={{ xs: 12, md: 6 }}>
                    <Typography variant="subtitle2" color="text.secondary">Name at Customer</Typography>
                    <Typography variant="body1">{data.partTypeInformation.nameAtCustomer}</Typography>
                  </Grid2>
                )}
              </Grid2>
            </CardContent>
          </Card>
        )}

        {/* Manufacturing Information */}
        {data.manufacturingInformation && (
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <PrecisionManufacturingIcon color="primary" />
                Manufacturing Information
              </Typography>
              <Grid2 container spacing={2}>
                {data.manufacturingInformation.date && (
                  <Grid2 size={{ xs: 12, md: 6 }}>
                    <Typography variant="subtitle2" color="text.secondary">Manufacturing Date</Typography>
                    <Typography variant="body1">
                      {new Date(data.manufacturingInformation.date).toLocaleString()}
                    </Typography>
                  </Grid2>
                )}
                {data.manufacturingInformation.country && (
                  <Grid2 size={{ xs: 12, md: 6 }}>
                    <Typography variant="subtitle2" color="text.secondary">Country</Typography>
                    <Typography variant="body1">
                      {getCountryFlag(data.manufacturingInformation.country)}&nbsp;
                      {data.manufacturingInformation.country}
                    </Typography>
                  </Grid2>
                )}
                {data.manufacturingInformation.sites && data.manufacturingInformation.sites.length > 0 && (
                  <Grid2 size={12}>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                      Production Sites
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {data.manufacturingInformation.sites.map((site) => (
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
                  </Grid2>
                )}
              </Grid2>
            </CardContent>
          </Card>
        )}

      </Box>
    </SubmodelAddonWrapper>
  );
};
