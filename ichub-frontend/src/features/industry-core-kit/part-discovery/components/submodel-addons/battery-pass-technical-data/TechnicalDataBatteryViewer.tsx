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
} from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business';
import BoltIcon from '@mui/icons-material/Bolt';
import ThermostatIcon from '@mui/icons-material/Thermostat';
import TimerIcon from '@mui/icons-material/Timer';
import SpeedIcon from '@mui/icons-material/Speed';
import BuildIcon from '@mui/icons-material/Build';
import { SubmodelAddonProps } from '../shared/types';
import { unwrapSubmodelData } from '../shared/utils';
import { SubmodelAddonWrapper } from '../BaseAddon';
import { InfoRow } from '../battery-pass-shared/InfoRow';
import { TechnicalData, BatteryCategory, getMultiLangValue } from './types';

const CATEGORY_LABELS: Record<BatteryCategory, string> = {
  lmt: 'technicalData.categories.lmt',
  ev: 'technicalData.categories.ev',
  industrial: 'technicalData.categories.industrial',
  stationary: 'technicalData.categories.stationary',
};

export const TechnicalDataBatteryViewer: React.FC<SubmodelAddonProps<TechnicalData>> = ({
  data: rawData,
  semanticId,
}) => {
  const { t } = useTranslation('batteryPass');
  const data = unwrapSubmodelData<TechnicalData>(rawData);
  if (!data) return null;
  const generalInfo = data.GeneralInformation;
  const techAreas = data.TechnicalPropertyAreas;

  return (
    <SubmodelAddonWrapper
      title={t('technicalData.title')}
      subtitle={`Semantic ID: ${semanticId}`}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

        {/* General Information */}
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <BusinessIcon color="primary" />
              {t('technicalData.sections.generalInformation')}
            </Typography>
            <Grid2 container spacing={2}>
              <InfoRow label={t('technicalData.fields.manufacturer')} value={generalInfo.ManufacturerName} />
              <InfoRow
                label={t('technicalData.fields.productDesignation')}
                value={getMultiLangValue(generalInfo.ManufacturerProductDesignation)}
              />
              <InfoRow label={t('technicalData.fields.articleNumber')} value={generalInfo.ManufacturerArticleNumber} />
              <InfoRow label={t('technicalData.fields.orderCode')} value={generalInfo.ManufacturerOrderCode} />
              <InfoRow label={t('technicalData.fields.manufacturerIdentifier')} value={generalInfo.ManufacturerIdentifier} />
              <InfoRow label={t('technicalData.fields.warrantyPeriod')} value={generalInfo.WarrantyPeriod} />
              <InfoRow label={t('technicalData.fields.batteryMass')} value={generalInfo.BatteryMass} unit="kg" />
              <Grid2 size={{ xs: 12, sm: 6, md: 4 }}>
                <Typography variant="subtitle2" color="text.secondary">{t('technicalData.fields.batteryCategory')}</Typography>
                <Chip
                  label={t(CATEGORY_LABELS[generalInfo.BatteryCategory] ?? generalInfo.BatteryCategory)}
                  color="primary"
                  size="small"
                  variant="outlined"
                />
              </Grid2>
            </Grid2>
          </CardContent>
        </Card>

        {/* Capacity, Energy, Voltage */}
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <BoltIcon color="primary" />
              {t('technicalData.sections.capacityEnergyVoltage')}
            </Typography>
            <Grid2 container spacing={2}>
              <InfoRow label={t('technicalData.fields.nominalVoltage')} value={techAreas.CapacityEnergyVoltage.NominalVoltage} unit="V" />
              <InfoRow label={t('technicalData.fields.minimumVoltage')} value={techAreas.CapacityEnergyVoltage.MinVoltage} unit="V" />
              <InfoRow label={t('technicalData.fields.maximumVoltage')} value={techAreas.CapacityEnergyVoltage.MaxVoltage} unit="V" />
              <InfoRow label={t('technicalData.fields.ratedCapacity')} value={techAreas.CapacityEnergyVoltage.RatedCapacity} unit="Ah" />
              {techAreas.CapacityEnergyVoltage.CapacityFade !== undefined && (
                <InfoRow label={t('technicalData.fields.capacityFade')} value={techAreas.CapacityEnergyVoltage.CapacityFade} unit="%" />
              )}
              {techAreas.CapacityEnergyVoltage.CertifiedUsableBatteryEnergy !== undefined && (
                <InfoRow label={t('technicalData.fields.certifiedUsableBatteryEnergy')} value={techAreas.CapacityEnergyVoltage.CertifiedUsableBatteryEnergy} unit="kWh" />
              )}
            </Grid2>
          </CardContent>
        </Card>

        {/* Round Trip Energy Efficiency */}
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <SpeedIcon color="primary" />
              {t('technicalData.sections.roundTripEnergyEfficiency')}
            </Typography>
            <Grid2 container spacing={2}>
              <InfoRow label={t('technicalData.fields.initialEfficiency')} value={techAreas.RoundTripEnergyEfficiency.InitialRoundTripEnergyEfficiency} unit="%" />
              <InfoRow label={t('technicalData.fields.efficiencyAt50PercentCycleLife')} value={techAreas.RoundTripEnergyEfficiency.RoundTripEnergyEfficiencyAt50PercentOfCycleLife} unit="%" />
              {techAreas.RoundTripEnergyEfficiency.EnergyRoundTripEfficiencyFade !== undefined && (
                <InfoRow label={t('technicalData.fields.efficiencyFade')} value={techAreas.RoundTripEnergyEfficiency.EnergyRoundTripEfficiencyFade} unit="%" />
              )}
              {techAreas.RoundTripEnergyEfficiency.InitialSelfDischargingRate !== undefined && (
                <InfoRow label={t('technicalData.fields.initialSelfDischargingRate')} value={techAreas.RoundTripEnergyEfficiency.InitialSelfDischargingRate} unit="%/month" />
              )}
            </Grid2>
          </CardContent>
        </Card>

        {/* Resistance */}
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <BuildIcon color="primary" />
              {t('technicalData.sections.internalResistance')}
            </Typography>
            <Grid2 container spacing={2}>
              <InfoRow label={t('technicalData.fields.cellLevelInitial')} value={techAreas.Resistance.InitialInternalResistanceAtBatteryCellLevel} unit="mΩ" />
              <InfoRow label={t('technicalData.fields.packLevelInitial')} value={techAreas.Resistance.InitialInternalResistanceAtBatteryPackLevel} unit="mΩ" />
              {techAreas.Resistance.InitialInternalResistanceAtBatteryModuleLevel !== undefined && (
                <InfoRow label={t('technicalData.fields.moduleLevelInitial')} value={techAreas.Resistance.InitialInternalResistanceAtBatteryModuleLevel} unit="mΩ" />
              )}
              <Grid2 size={12}>
                <Divider sx={{ my: 0.5 }} />
              </Grid2>
              <InfoRow label={t('technicalData.fields.packLevelIncrease')} value={techAreas.Resistance.InternalResistanceIncreaseAtBatteryPackLevel} unit="%" />
              {techAreas.Resistance.InternalResistanceIncreaseAtBatteryCellLevel !== undefined && (
                <InfoRow label={t('technicalData.fields.cellLevelIncrease')} value={techAreas.Resistance.InternalResistanceIncreaseAtBatteryCellLevel} unit="%" />
              )}
              {techAreas.Resistance.InternalResistanceIncreaseAtBatteryModuleLevel !== undefined && (
                <InfoRow label={t('technicalData.fields.moduleLevelIncrease')} value={techAreas.Resistance.InternalResistanceIncreaseAtBatteryModuleLevel} unit="%" />
              )}
            </Grid2>
          </CardContent>
        </Card>

        {/* Power Capability */}
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <BoltIcon color="primary" />
              {t('technicalData.sections.powerCapability')}
            </Typography>
            <Grid2 container spacing={2}>
              <InfoRow label={t('technicalData.fields.maximumPermittedPower')} value={techAreas.PowerCapability.MaximumPermittedBatteryPower} unit="W" />
              <InfoRow label={t('technicalData.fields.powerFade')} value={techAreas.PowerCapability.PowerFade} unit="%" />
              <InfoRow label={t('technicalData.fields.powerToEnergyRatio')} value={techAreas.PowerCapability.RatioNominalBatteryPowerAndBatteryEnergy} unit="W/Wh" />
            </Grid2>
            {techAreas.PowerCapability.OriginalPowerCapability && techAreas.PowerCapability.OriginalPowerCapability.length > 0 && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  {t('technicalData.sections.powerCapabilityAtSoC')}
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {techAreas.PowerCapability.OriginalPowerCapability.map((pc) => (
                    <Chip
                      key={`soc-${pc.atSoC}`}
                      label={`SoC ${pc.atSoC}%: ${pc.powerCapabilityAt} W`}
                      size="small"
                      variant="outlined"
                    />
                  ))}
                </Box>
              </>
            )}
          </CardContent>
        </Card>

        {/* Temperature & Lifetime */}
        <Grid2 container spacing={2}>
          <Grid2 size={{ xs: 12, md: 6 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <ThermostatIcon color="primary" />
                  {t('technicalData.sections.temperatureRange')}
                </Typography>
                <Grid2 container spacing={2}>
                  <InfoRow label={t('technicalData.fields.lowerBoundary')} value={techAreas.Temperature.TemperatureRangeIdleState_LowerBoundary} unit="°C" />
                  <InfoRow label={t('technicalData.fields.upperBoundary')} value={techAreas.Temperature.TemperatureRangeIdleState_UpperBoundary} unit="°C" />
                </Grid2>
              </CardContent>
            </Card>
          </Grid2>
          <Grid2 size={{ xs: 12, md: 6 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <TimerIcon color="primary" />
                  {t('technicalData.sections.lifetime')}
                </Typography>
                <Grid2 container spacing={2}>
                  <InfoRow label={t('technicalData.fields.expectedLifetime')} value={techAreas.Lifetime.ExpectedLifetimeInCalendarYears} unit="years" />
                  <InfoRow label={t('technicalData.fields.expectedCycles')} value={techAreas.Lifetime.ExpectedNumberOfCycles} />
                  <InfoRow label={t('technicalData.fields.capacityThresholdForExhaustion')} value={techAreas.Lifetime.CapacityThresholdExhaustion} unit="%" />
                  <InfoRow label={t('technicalData.fields.cRateCycleLifeTest')} value={techAreas.Lifetime.CrateOfRelevantCycleLifeTest} />
                </Grid2>
                {techAreas.Lifetime.CycleLifeReferenceTest && techAreas.Lifetime.CycleLifeReferenceTest.length > 0 && (
                  <>
                    <Divider sx={{ my: 1.5 }} />
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>{t('technicalData.sections.referenceTestDocuments')}</Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {techAreas.Lifetime.CycleLifeReferenceTest.map((doc) => (
                        <Chip key={doc} label={doc} size="small" variant="outlined" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }} />
                      ))}
                    </Box>
                  </>
                )}
              </CardContent>
            </Card>
          </Grid2>
        </Grid2>

      </Box>
    </SubmodelAddonWrapper>
  );
};
