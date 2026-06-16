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
  LinearProgress,
} from '@mui/material';
import BatteryFullIcon from '@mui/icons-material/BatteryFull';
import ThunderstormIcon from '@mui/icons-material/Thunderstorm';
import SpeedIcon from '@mui/icons-material/Speed';
import ThermostatIcon from '@mui/icons-material/Thermostat';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import EventNoteIcon from '@mui/icons-material/EventNote';
import { SubmodelAddonProps } from '../shared/types';
import { unwrapSubmodelData } from '../shared/utils';
import { SubmodelAddonWrapper } from '../BaseAddon';
import { ProductCondition } from './types';

function MetricRow({
  label,
  value,
  unit,
  lastUpdate,
  showProgress,
  progressMax,
}: {
  label: string;
  value?: number;
  unit?: string;
  lastUpdate?: string;
  showProgress?: boolean;
  progressMax?: number;
}) {
  if (value === undefined) return null;
  const progressValue = progressMax ? Math.min((value / progressMax) * 100, 100) : Math.min(value, 100);
  return (
    <Grid2 size={{ xs: 12, sm: 6, md: 4 }}>
      <Typography variant="subtitle2" color="text.secondary">{label}</Typography>
      <Typography variant="body1" sx={{ fontWeight: 600 }}>
        {value}{unit ? ` ${unit}` : ''}
      </Typography>
      {showProgress && (
        <LinearProgress
          variant="determinate"
          value={progressValue}
          sx={{ mt: 0.5, height: 4, borderRadius: 2 }}
        />
      )}
      {lastUpdate && (
        <Typography variant="caption" color="text.secondary">
          Updated: {lastUpdate}
        </Typography>
      )}
    </Grid2>
  );
}

export const ProductConditionBatteryViewer: React.FC<SubmodelAddonProps<ProductCondition>> = ({
  data: rawData,
  semanticId,
}) => {
  const data = unwrapSubmodelData<ProductCondition>(rawData);
  if (!data) return null;

  return (
    <SubmodelAddonWrapper
      title="Battery Pass — Product Condition"
      subtitle={`Semantic ID: ${semanticId}`}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

        {/* State of Charge */}
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <BatteryFullIcon color="primary" />
              Current State
            </Typography>
            <Grid2 container spacing={2}>
              <Grid2 size={{ xs: 12, sm: 6 }}>
                <Typography variant="subtitle2" color="text.secondary">State of Charge</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 0.5 }}>
                  <Box sx={{ flex: 1 }}>
                    <LinearProgress
                      variant="determinate"
                      value={data.StateOfCharge.StateOfChargeValue}
                      color={data.StateOfCharge.StateOfChargeValue > 50 ? 'success' : data.StateOfCharge.StateOfChargeValue > 20 ? 'warning' : 'error'}
                      sx={{ height: 12, borderRadius: 6 }}
                    />
                  </Box>
                  <Typography variant="body1" sx={{ fontWeight: 700, minWidth: 50 }}>
                    {data.StateOfCharge.StateOfChargeValue}%
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  Updated: {data.StateOfCharge.LastUpdate}
                </Typography>
              </Grid2>
              <MetricRow
                label="Number of Full Cycles"
                value={data.NumberOfFullCycles.NumberOfFullCyclesValue}
                lastUpdate={data.NumberOfFullCycles.LastUpdate}
              />
            </Grid2>
          </CardContent>
        </Card>

        {/* Energy & Capacity */}
        {(data.EnergyThroughput || data.CapacityThroughput || data.RemainingEnergy || data.RemainingCapacity || data.StateOfCertifiedEnergy) && (
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <ThunderstormIcon color="primary" />
                Energy &amp; Capacity
              </Typography>
              <Grid2 container spacing={2}>
                <MetricRow
                  label="Energy Throughput"
                  value={data.EnergyThroughput?.EnergyThroughputValue}
                  unit="kWh"
                  lastUpdate={data.EnergyThroughput?.LastUpdate}
                />
                <MetricRow
                  label="Capacity Throughput"
                  value={data.CapacityThroughput?.CapacityThroughputValue}
                  unit="Ah"
                  lastUpdate={data.CapacityThroughput?.LastUpdate}
                />
                <MetricRow
                  label="Remaining Energy"
                  value={data.RemainingEnergy?.RemainingEnergyValue}
                  unit="kWh"
                  lastUpdate={data.RemainingEnergy?.LastUpdate}
                />
                <MetricRow
                  label="Remaining Capacity"
                  value={data.RemainingCapacity?.RemainingCapacityValue}
                  unit="Ah"
                  lastUpdate={data.RemainingCapacity?.LastUpdate}
                />
                <MetricRow
                  label="State of Certified Energy"
                  value={data.StateOfCertifiedEnergy?.StateOfCertifiedEnergyValue}
                  unit="%"
                  showProgress={true}
                  lastUpdate={data.StateOfCertifiedEnergy?.LastUpdate}
                />
              </Grid2>
            </CardContent>
          </Card>
        )}

        {/* Efficiency & Discharge */}
        {(data.RemainingRoundTripEnergyEfficiency || data.CurrentSelfDischargingRate || data.EvolutionOfSelfDischarge) && (
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <SpeedIcon color="primary" />
                Efficiency &amp; Self-Discharge
              </Typography>
              <Grid2 container spacing={2}>
                <MetricRow
                  label="Remaining Round Trip Energy Efficiency"
                  value={data.RemainingRoundTripEnergyEfficiency?.RemainingRoundTripEnergyEfficiencyValue}
                  unit="%"
                  showProgress={true}
                  lastUpdate={data.RemainingRoundTripEnergyEfficiency?.LastUpdate}
                />
                <MetricRow
                  label="Current Self-Discharging Rate"
                  value={data.CurrentSelfDischargingRate?.CurrentSelfDischargingRateValue}
                  unit="%/month"
                  lastUpdate={data.CurrentSelfDischargingRate?.LastUpdate}
                />
                <MetricRow
                  label="Evolution of Self-Discharge"
                  value={data.EvolutionOfSelfDischarge?.EvolutionOfSelfDischargeValue}
                  lastUpdate={data.EvolutionOfSelfDischarge?.LastUpdate}
                />
              </Grid2>
            </CardContent>
          </Card>
        )}

        {/* Temperature Information */}
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <ThermostatIcon color="primary" />
              Temperature History
            </Typography>
            <Grid2 container spacing={2}>
              <MetricRow
                label="Time at Extreme High Temperature"
                value={data.TemperatureInformation.TimeExtremeHighTemp}
                unit="h"
              />
              <MetricRow
                label="Time at Extreme Low Temperature"
                value={data.TemperatureInformation.TimeExtremeLowTemp}
                unit="h"
              />
              <MetricRow
                label="Time at Extreme High Temp (Charging)"
                value={data.TemperatureInformation.TimeExtremeHighTempCharging}
                unit="h"
              />
              <MetricRow
                label="Time at Extreme Low Temp (Charging)"
                value={data.TemperatureInformation.TimeExtremeLowTempCharging}
                unit="h"
              />
            </Grid2>
            <Typography variant="caption" color="text.secondary">
              Updated: {data.TemperatureInformation.LastUpdate}
            </Typography>
          </CardContent>
        </Card>

        {/* Negative Events */}
        {data.NegativeEvents && data.NegativeEvents.length > 0 && (
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <WarningAmberIcon color="warning" />
                Negative Events
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {data.NegativeEvents.map((event) => (
                  <Box key={`${event.NegativeEventValue}-${event.LastUpdate}`} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                    <Chip label={event.NegativeEventValue} color="warning" variant="outlined" />
                    <Typography variant="caption" color="text.secondary">{event.LastUpdate}</Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        )}

        {/* Accidents & Compliance */}
        {data.InformationOnAccidents && data.InformationOnAccidents.length > 0 && (
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <EventNoteIcon color="primary" />
                Information on Accidents
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {data.InformationOnAccidents.map((doc) => (
                  <Chip key={doc} label={doc} size="small" variant="outlined" sx={{ fontFamily: 'monospace' }} />
                ))}
              </Box>
              <Divider sx={{ my: 1.5 }} />
              <Typography variant="caption" color="text.secondary">
                {data.InformationOnAccidents.length} accident report document(s) on record
              </Typography>
            </CardContent>
          </Card>
        )}
      </Box>
    </SubmodelAddonWrapper>
  );
};
