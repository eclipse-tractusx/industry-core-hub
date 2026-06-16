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
} from '@mui/material';
import Co2Icon from '@mui/icons-material/Co2';
import ScienceIcon from '@mui/icons-material/Science';
import PublicIcon from '@mui/icons-material/Public';
import { SubmodelAddonProps } from '../shared/types';
import { unwrapSubmodelData } from '../shared/utils';
import { SubmodelAddonWrapper } from '../BaseAddon';
import { InfoRow } from '../battery-pass-shared/InfoRow';
import { CarbonFootprintBattery } from './types';

const isHttpUrl = (s: string) => /^https?:\/\//i.test(s);

export const CarbonFootprintBatteryViewer: React.FC<SubmodelAddonProps<CarbonFootprintBattery>> = ({
  data: rawData,
  semanticId,
}) => {
  const data = unwrapSubmodelData<CarbonFootprintBattery>(rawData);
  if (!data) return null;

  return (
    <SubmodelAddonWrapper
      title="Battery Pass — Carbon Footprint"
      subtitle={`Semantic ID: ${semanticId}`}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {data.ProductCarbonFootprints.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            No carbon footprint data available.
          </Typography>
        )}
        {data.ProductCarbonFootprints.map((pcf, i) => (
          <Card key={`pcf-${i}`}>
            <CardContent>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Co2Icon color="primary" />
                {data.ProductCarbonFootprints.length > 1
                  ? `Carbon Footprint Entry ${i + 1}`
                  : 'Product Carbon Footprint'}
              </Typography>

              <Grid2 container spacing={2}>
                <Grid2 size={{ xs: 12, sm: 6, md: 4 }}>
                  <Typography variant="subtitle2" color="text.secondary">CO₂ Equivalent</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600, fontSize: '1.1rem' }}>
                    {pcf.PcfCo2eq} kg CO₂-eq / {pcf.QuantityOfMeasureForCalculation} {pcf.ReferenceImpactUnitForCalculation}
                  </Typography>
                </Grid2>
                <InfoRow label="Performance Class" value={pcf.PerformanceClass} />
              </Grid2>

              {pcf.PcfCalculationMethods && pcf.PcfCalculationMethods.length > 0 && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <ScienceIcon fontSize="small" color="action" />
                    Calculation Methods
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {pcf.PcfCalculationMethods.map((method) => (
                      <Chip key={method} label={method} size="small" variant="outlined" />
                    ))}
                  </Box>
                </>
              )}

              {pcf.LifeCyclePhases && pcf.LifeCyclePhases.length > 0 && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle1" sx={{ mb: 1 }}>Life Cycle Phases</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {pcf.LifeCyclePhases.map((phase) => (
                      <Chip key={phase} label={phase} size="small" color="info" variant="outlined" />
                    ))}
                  </Box>
                </>
              )}

              {pcf.WebLinkToPublicCarbonFootprintStudy && pcf.WebLinkToPublicCarbonFootprintStudy.length > 0 && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <PublicIcon fontSize="small" color="action" />
                    Public Carbon Footprint Studies
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    {pcf.WebLinkToPublicCarbonFootprintStudy.map((link) =>
                      isHttpUrl(link) ? (
                        <Link
                          key={link}
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          sx={{ fontSize: '0.85rem', fontFamily: 'monospace', wordBreak: 'break-all' }}
                        >
                          {link}
                        </Link>
                      ) : (
                        <Chip
                          key={link}
                          label={link}
                          size="small"
                          variant="outlined"
                          sx={{ fontFamily: 'monospace', fontSize: '0.75rem', maxWidth: '100%' }}
                        />
                      )
                    )}
                  </Box>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </Box>
    </SubmodelAddonWrapper>
  );
};
