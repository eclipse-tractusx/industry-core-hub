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
  Divider,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@mui/material';
import ScienceIcon from '@mui/icons-material/Science';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CategoryIcon from '@mui/icons-material/Category';
import { SubmodelAddonProps } from '../shared/types';
import { unwrapSubmodelData } from '../shared/utils';
import { SubmodelAddonWrapper } from '../BaseAddon';
import { MaterialComposition, HazardousSubstanceClass } from './types';

const HAZARDOUS_CLASS_LABELS: Record<HazardousSubstanceClass, string> = {
  AcuteToxicity: 'Acute Toxicity',
  SkinCorrosionOrIrritation: 'Skin Corrosion / Irritation',
  EyeDamageOrIrritation: 'Eye Damage / Irritation',
};

export const MaterialCompositionBatteryViewer: React.FC<SubmodelAddonProps<MaterialComposition>> = ({
  data: rawData,
  semanticId,
}) => {
  const data = unwrapSubmodelData<MaterialComposition>(rawData);
  if (!data) return null;

  return (
    <SubmodelAddonWrapper
      title="Battery Pass — Material Composition"
      subtitle={`Semantic ID: ${semanticId}`}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

        {/* Battery Chemistry */}
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <ScienceIcon color="primary" />
              Battery Chemistry
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              <Chip label={data.BatteryChemistry.ShortName} color="primary" sx={{ fontWeight: 700, fontSize: '1rem', px: 1 }} />
              <Typography variant="body1">{data.BatteryChemistry.ClearName}</Typography>
            </Box>
          </CardContent>
        </Card>

        {/* Battery Materials */}
        {data.BatteryMaterials && data.BatteryMaterials.length > 0 && (
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <CategoryIcon color="primary" />
                Battery Materials
              </Typography>
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><Typography variant="subtitle2">Material</Typography></TableCell>
                      <TableCell><Typography variant="subtitle2">Identifier</Typography></TableCell>
                      <TableCell><Typography variant="subtitle2">Mass (kg)</Typography></TableCell>
                      <TableCell><Typography variant="subtitle2">Location</Typography></TableCell>
                      <TableCell><Typography variant="subtitle2">Critical</Typography></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.BatteryMaterials.map((mat) => (
                      <TableRow key={mat.BatteryMaterialIdentifier} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: mat.IsCriticalRawMaterial ? 600 : 400 }}>
                            {mat.BatteryMaterialName}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                            {mat.BatteryMaterialIdentifier}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{mat.BatteryMaterialMass}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {mat.BatteryMaterialLocation.ComponentName ?? mat.BatteryMaterialLocation.ComponentId ?? '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {mat.IsCriticalRawMaterial ? (
                            <Chip label="Critical" size="small" color="warning" />
                          ) : (
                            <Chip label="Standard" size="small" variant="outlined" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
              {data.BatteryMaterials.some(m => m.IsCriticalRawMaterial) && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1.5 }}>
                  <WarningAmberIcon color="warning" fontSize="small" />
                  <Typography variant="caption" color="text.secondary">
                    {data.BatteryMaterials.filter(m => m.IsCriticalRawMaterial).length} critical raw material(s) identified
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        )}

        {/* Hazardous Substances */}
        {data.HazardousSubstances && data.HazardousSubstances.length > 0 && (
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <WarningAmberIcon color="error" />
                Hazardous Substances
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {data.HazardousSubstances.map((sub) => (
                  <Card key={sub.HazardousSubstanceIdentifier} variant="outlined" sx={{ borderColor: 'warning.light' }}>
                    <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          {sub.HazardousSubstanceName}
                        </Typography>
                        <Chip
                          label={HAZARDOUS_CLASS_LABELS[sub.HazardousSubstanceClass]}
                          size="small"
                          color="warning"
                        />
                      </Box>
                      <Grid2 container spacing={1}>
                        <Grid2 size={{ xs: 12, sm: 6 }}>
                          <Typography variant="subtitle2" color="text.secondary">Identifier</Typography>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                            {sub.HazardousSubstanceIdentifier}
                          </Typography>
                        </Grid2>
                        <Grid2 size={{ xs: 12, sm: 6 }}>
                          <Typography variant="subtitle2" color="text.secondary">Concentration</Typography>
                          <Typography variant="body2">{sub.HazardousSubstanceConcentration}%</Typography>
                        </Grid2>
                        {sub.HazardousSubstanceLocation && (sub.HazardousSubstanceLocation.ComponentName || sub.HazardousSubstanceLocation.ComponentId) && (
                          <Grid2 size={12}>
                            <Typography variant="subtitle2" color="text.secondary">Location</Typography>
                            <Typography variant="body2">
                              {sub.HazardousSubstanceLocation.ComponentName ?? sub.HazardousSubstanceLocation.ComponentId}
                            </Typography>
                          </Grid2>
                        )}
                        {sub.HazardousSubstanceImpact && sub.HazardousSubstanceImpact.length > 0 && (
                          <Grid2 size={12}>
                            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>Impact</Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {sub.HazardousSubstanceImpact.map((impact) => (
                                <Chip key={impact} label={impact} size="small" variant="outlined" color="error" />
                              ))}
                            </Box>
                          </Grid2>
                        )}
                      </Grid2>
                    </CardContent>
                  </Card>
                ))}
              </Box>
              <Divider sx={{ my: 2 }} />
              <Typography variant="caption" color="text.secondary">
                {data.HazardousSubstances.length} hazardous substance(s) declared in this battery
              </Typography>
            </CardContent>
          </Card>
        )}
      </Box>
    </SubmodelAddonWrapper>
  );
};
