/********************************************************************************
 * Eclipse Tractus-X - Industry Core Hub Frontend
 *
 * Copyright (c) 2026 Capgemini Deutschland GmbH
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
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Grid2,
  Link,
  Divider,
  LinearProgress,
} from '@mui/material';
import RecyclingIcon from '@mui/icons-material/Recycling';
import BuildIcon from '@mui/icons-material/Build';
import SecurityIcon from '@mui/icons-material/Security';
import DeleteIcon from '@mui/icons-material/Delete';
import StorefrontIcon from '@mui/icons-material/Storefront';
import { SubmodelAddonProps } from '../shared/types';
import { unwrapSubmodelData } from '../shared/utils';
import { SubmodelAddonWrapper } from '../BaseAddon';
import { InfoRow } from '../battery-pass-shared/InfoRow';
import { Circularity, getMultiLangValue } from './types';

function toPercent(v: number): number {
  const pct = v > 1 ? v : v * 100;
  return Math.max(0, Math.min(pct, 100));
}

export const CircularityBatteryViewer: React.FC<SubmodelAddonProps<Circularity>> = ({
  data: rawData,
  semanticId,
}) => {
  const data = unwrapSubmodelData<Circularity>(rawData);
  if (!data) return null;

  return (
    <SubmodelAddonWrapper
      title="Battery Pass — Circularity"
      subtitle={`Semantic ID: ${semanticId}`}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

        {/* Renewable Content */}
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <RecyclingIcon color="primary" />
              Renewable Content
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ flex: 1 }}>
                <LinearProgress
                  variant="determinate"
                  value={toPercent(data.RenewableContent)}
                  color="success"
                  sx={{ height: 10, borderRadius: 5 }}
                />
              </Box>
              <Typography variant="body1" sx={{ fontWeight: 600, minWidth: 60 }}>
                {toPercent(data.RenewableContent).toFixed(1)}%
              </Typography>
            </Box>
          </CardContent>
        </Card>

        {/* Recycled Content */}
        {data.RecycledContentInformation && data.RecycledContentInformation.length > 0 && (
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <RecyclingIcon color="primary" />
                Recycled Content
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {data.RecycledContentInformation.map((rc) => (
                  <Card key={rc.RecycledMaterial} variant="outlined">
                    <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                        {rc.RecycledMaterial}
                      </Typography>
                      <Grid2 container spacing={2}>
                        <Grid2 size={{ xs: 12, sm: 6 }}>
                          <Typography variant="subtitle2" color="text.secondary">Pre-consumer Share</Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LinearProgress
                              variant="determinate"
                              value={toPercent(rc.PreConsumerShare)}
                              color="info"
                              sx={{ flex: 1, height: 8, borderRadius: 4 }}
                            />
                            <Typography variant="body2">{toPercent(rc.PreConsumerShare).toFixed(1)}%</Typography>
                          </Box>
                        </Grid2>
                        <Grid2 size={{ xs: 12, sm: 6 }}>
                          <Typography variant="subtitle2" color="text.secondary">Post-consumer Share</Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LinearProgress
                              variant="determinate"
                              value={toPercent(rc.PostConsumerShare)}
                              color="success"
                              sx={{ flex: 1, height: 8, borderRadius: 4 }}
                            />
                            <Typography variant="body2">{toPercent(rc.PostConsumerShare).toFixed(1)}%</Typography>
                          </Box>
                        </Grid2>
                      </Grid2>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            </CardContent>
          </Card>
        )}

        {/* Dismantling */}
        {data.DismantlingAndRemovalInformation && data.DismantlingAndRemovalInformation.length > 0 && (
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <BuildIcon color="primary" />
                Dismantling &amp; Removal Information
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {data.DismantlingAndRemovalInformation.map((doc) => (
                  <Chip key={doc} label={doc} size="small" variant="outlined" sx={{ fontFamily: 'monospace' }} />
                ))}
              </Box>
            </CardContent>
          </Card>
        )}

        {/* Spare Part Sources */}
        {data.SparePartSources && data.SparePartSources.length > 0 && (
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <StorefrontIcon color="primary" />
                Spare Part Sources
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {data.SparePartSources.map((supplier) => (
                  <Card key={supplier.SupplierWebAddress} variant="outlined">
                    <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                        {getMultiLangValue(supplier.NameOfSupplier)}
                      </Typography>
                      <Grid2 container spacing={2}>
                        <InfoRow
                          label="Address"
                          value={[
                            getMultiLangValue(supplier.AddressOfSupplier.Street),
                            getMultiLangValue(supplier.AddressOfSupplier.PostalCode),
                            getMultiLangValue(supplier.AddressOfSupplier.NationalCode),
                          ].filter(Boolean).join(', ')}
                        />
                        <InfoRow label="Email" value={supplier.EmailAddressOfSupplier.EmailAddress} />
                        <Grid2 size={{ xs: 12, sm: 6 }}>
                          <Typography variant="subtitle2" color="text.secondary">Website</Typography>
                          <Link href={supplier.SupplierWebAddress} target="_blank" rel="noopener noreferrer" sx={{ fontSize: '0.875rem' }}>
                            {supplier.SupplierWebAddress}
                          </Link>
                        </Grid2>
                      </Grid2>
                      {supplier.Components && supplier.Components.length > 0 && (
                        <>
                          <Divider sx={{ my: 1.5 }} />
                          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Components</Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            {supplier.Components.map((comp) => (
                              <Chip key={comp.PartNumber} label={`${comp.PartName} (${comp.PartNumber})`} size="small" variant="outlined" />
                            ))}
                          </Box>
                        </>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </Box>
            </CardContent>
          </Card>
        )}

        {/* Safety Measures */}
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <SecurityIcon color="primary" />
              Safety Measures
            </Typography>
            {data.SafetyMeasures.SafetyInstructions && data.SafetyMeasures.SafetyInstructions.length > 0 && (
              <>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Safety Instructions</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                  {data.SafetyMeasures.SafetyInstructions.map((doc) => (
                    <Chip key={doc} label={doc} size="small" variant="outlined" sx={{ fontFamily: 'monospace' }} />
                  ))}
                </Box>
              </>
            )}
            {data.SafetyMeasures.ExtinguishingAgents && data.SafetyMeasures.ExtinguishingAgents.length > 0 && (
              <>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Extinguishing Agents</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {data.SafetyMeasures.ExtinguishingAgents.map((agent) => (
                    <Chip key={agent} label={agent} size="small" color="warning" variant="outlined" />
                  ))}
                </Box>
              </>
            )}
          </CardContent>
        </Card>

        {/* End of Life */}
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <DeleteIcon color="primary" />
              End of Life Information
            </Typography>
            <Grid2 container spacing={2}>
              {data.EndOfLifeInformation.WastePrevention && data.EndOfLifeInformation.WastePrevention.length > 0 && (
                <Grid2 size={12}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Waste Prevention</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {data.EndOfLifeInformation.WastePrevention.map((doc) => (
                      <Chip key={doc} label={doc} size="small" variant="outlined" sx={{ fontFamily: 'monospace' }} />
                    ))}
                  </Box>
                </Grid2>
              )}
              {data.EndOfLifeInformation.SeparateCollection && data.EndOfLifeInformation.SeparateCollection.length > 0 && (
                <Grid2 size={12}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Separate Collection</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {data.EndOfLifeInformation.SeparateCollection.map((doc) => (
                      <Chip key={doc} label={doc} size="small" variant="outlined" sx={{ fontFamily: 'monospace' }} />
                    ))}
                  </Box>
                </Grid2>
              )}
              {data.EndOfLifeInformation.InformationOnCollection && data.EndOfLifeInformation.InformationOnCollection.length > 0 && (
                <Grid2 size={12}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Information on Collection</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {data.EndOfLifeInformation.InformationOnCollection.map((doc) => (
                      <Chip key={doc} label={doc} size="small" variant="outlined" sx={{ fontFamily: 'monospace' }} />
                    ))}
                  </Box>
                </Grid2>
              )}
            </Grid2>
          </CardContent>
        </Card>

      </Box>
    </SubmodelAddonWrapper>
  );
};
