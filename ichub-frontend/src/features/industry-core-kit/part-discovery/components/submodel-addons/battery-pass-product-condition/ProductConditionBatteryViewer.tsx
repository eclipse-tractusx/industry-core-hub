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
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('batteryPass');
  const data = unwrapSubmodelData<ProductCondition>(rawData);
  if (!data) return null;
  return (
    <SubmodelAddonWrapper
      title={t('productCondition.title')}
      subtitle={`Semantic ID: ${semanticId}`}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* State of Charge */}
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <BatteryFullIcon color="primary" />
              {t('productCondition.sections.currentState')}
            </Typography>
            <Grid2 container spacing={2}>
              <Grid2 size={{ xs: 12, sm: 6 }}>
                <Typography variant="subtitle2" color="text.secondary">{t('productCondition.fields.stateOfCharge')}</Typography>
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
                  {t('productCondition.fields.updated', { date: data.StateOfCharge.LastUpdate })}
                </Typography>
              </Grid2>
              <MetricRow
                label={t('productCondition.fields.numberOfFullCycles')}
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
                {t('productCondition.sections.energyAndCapacity')}
              </Typography>
              <Grid2 container spacing={2}>
                <MetricRow
                  label={t('productCondition.fields.energyThroughput')}
                  value={data.EnergyThroughput?.EnergyThroughputValue}
                  unit="kWh"
                  lastUpdate={data.EnergyThroughput?.LastUpdate}
                />
                <MetricRow
                  label={t('productCondition.fields.capacityThroughput')}
                  value={data.CapacityThroughput?.CapacityThroughputValue}
                  unit="Ah"
                  lastUpdate={data.CapacityThroughput?.LastUpdate}
                />
                <MetricRow
                  label={t('productCondition.fields.remainingEnergy')}
                  value={data.RemainingEnergy?.RemainingEnergyValue}
                  unit="kWh"
                  lastUpdate={data.RemainingEnergy?.LastUpdate}
                />
                <MetricRow
                  label={t('productCondition.fields.remainingCapacity')}
                  value={data.RemainingCapacity?.RemainingCapacityValue}
                  unit="Ah"
                  lastUpdate={data.RemainingCapacity?.LastUpdate}
                />
                <MetricRow
                  label={t('productCondition.fields.stateOfCertifiedEnergy')}
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
                {t('productCondition.sections.efficiencyAndSelfDischarge')}
              </Typography>
              <Grid2 container spacing={2}>
                <MetricRow
                  label={t('productCondition.fields.remainingRoundTripEnergyEfficiency')}
                  value={data.RemainingRoundTripEnergyEfficiency?.RemainingRoundTripEnergyEfficiencyValue}
                  unit="%"
                  showProgress={true}
                  lastUpdate={data.RemainingRoundTripEnergyEfficiency?.LastUpdate}
                />
                <MetricRow
                  label={t('productCondition.fields.currentSelfDischargingRate')}
                  value={data.CurrentSelfDischargingRate?.CurrentSelfDischargingRateValue}
                  unit="%/month"
                  lastUpdate={data.CurrentSelfDischargingRate?.LastUpdate}
                />
                <MetricRow
                  label={t('productCondition.fields.evolutionOfSelfDischarge')}
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
              {t('productCondition.sections.temperatureHistory')}
            </Typography>
            <Grid2 container spacing={2}>
              <MetricRow
                label={t('productCondition.fields.timeAtExtremeHighTemperature')}
                value={data.TemperatureInformation.TimeExtremeHighTemp}
                unit="h"
              />
              <MetricRow
                label={t('productCondition.fields.timeAtExtremeLowTemperature')}
                value={data.TemperatureInformation.TimeExtremeLowTemp}
                unit="h"
              />
              <MetricRow
                label={t('productCondition.fields.timeAtExtremeHighTempCharging')}
                value={data.TemperatureInformation.TimeExtremeHighTempCharging}
                unit="h"
              />
              <MetricRow
                label={t('productCondition.fields.timeAtExtremeLowTempCharging')}
                value={data.TemperatureInformation.TimeExtremeLowTempCharging}
                unit="h"
              />
            </Grid2>
            <Typography variant="caption" color="text.secondary">
              {t('productCondition.fields.updated', { date: data.TemperatureInformation.LastUpdate })}
            </Typography>
          </CardContent>
        </Card>
        {/* Negative Events */}
        {data.NegativeEvents && data.NegativeEvents.length > 0 && (
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <WarningAmberIcon color="warning" />
                {t('productCondition.sections.negativeEvents')}
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
                {t('productCondition.sections.informationOnAccidents')}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {data.InformationOnAccidents.map((doc) => (
                  <Chip key={doc} label={doc} size="small" variant="outlined" sx={{ fontFamily: 'monospace' }} />
                ))}
              </Box>
              <Divider sx={{ my: 1.5 }} />
              <Typography variant="caption" color="text.secondary">
                {t('productCondition.accidentReports', { count: data.InformationOnAccidents.length })}
              </Typography>
            </CardContent>
          </Card>
        )}
      </Box>
    </SubmodelAddonWrapper>
  );
};
