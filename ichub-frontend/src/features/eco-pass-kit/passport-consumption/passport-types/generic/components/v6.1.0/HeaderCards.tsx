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
import { Card, Box, Typography, Chip, createTheme, ThemeProvider, Grid2 } from '@mui/material';
import { Info, Factory, EnergySavingsLeaf, Science, Recycling, Event, Badge, Straighten, AspectRatio, Height as HeightIcon, ViewInAr, Scale, Business, Fingerprint, History, CheckCircle, Update, Today } from '@mui/icons-material';
import { PieChart } from '@mui/x-charts/PieChart';
import { QRCodeSVG } from 'qrcode.react';
import { HeaderCardProps } from '../../../base';

/**
 * Reusable Info Box Component
 * Displays a label and value in a compact, centered box
 */
interface InfoBoxProps {
  label: string;
  value: string | number;
  color?: string;
  backgroundColor?: string;
  borderColor?: string;
  fontFamily?: string;
  size?: 'small' | 'medium' | 'large';
}

const InfoBox: React.FC<InfoBoxProps> = ({
  label,
  value,
  color = '#fff',
  backgroundColor = 'rgba(255, 255, 255, 0.05)',
  borderColor = 'rgba(255, 255, 255, 0.1)',
  fontFamily = 'inherit',
  size = 'medium'
}) => {
  const fontSize = size === 'small' ? '0.85rem' : size === 'large' ? '1.5rem' : '1.1rem';
  const padding = size === 'small' ? 0.75 : size === 'large' ? 1.5 : 1;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: padding,
        borderRadius: '8px',
        backgroundColor,
        border: `1px solid ${borderColor}`,
        minWidth: size === 'small' ? 60 : 70,
        flex: 1,
        height: '100%'
      }}
    >
      <Typography
        variant="caption"
        sx={{
          color: 'rgba(255, 255, 255, 0.6)',
          fontSize: { xs: '0.5rem', sm: '0.55rem', md: '0.6rem' },
          textAlign: 'center',
          mb: 0.25,
          textTransform: 'uppercase',
          letterSpacing: '0.3px'
        }}
      >
        {label}
      </Typography>
      <Typography
        variant="h6"
        sx={{
          color,
          fontWeight: 700,
          fontSize: { 
            xs: size === 'small' ? '0.7rem' : size === 'medium' ? '0.8rem' : '1rem',
            sm: size === 'small' ? '0.75rem' : size === 'medium' ? '0.85rem' : '1.1rem',
            md: fontSize
          },
          fontFamily,
          textAlign: 'center',
          lineHeight: 1.2
        }}
      >
        {value}
      </Typography>
    </Box>
  );
};

/**
 * Reusable Field Display Component
 * Displays a label and value in a vertical layout
 */
interface FieldDisplayProps {
  label: string;
  value: string | number;
  fontFamily?: string;
}

const FieldDisplay: React.FC<FieldDisplayProps> = ({ label, value, fontFamily = 'inherit' }) => (
  <Box>
    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: { xs: '0.55rem', sm: '0.6rem', md: '0.65rem' } }}>
      {label}
    </Typography>
    <Typography
      variant="body2"
      sx={{
        color: 'rgba(255, 255, 255, 0.9)',
        fontSize: { xs: '0.7rem', sm: '0.75rem', md: '0.8rem' },
        fontWeight: 500,
        fontFamily,
        wordBreak: 'break-word'
      }}
    >
      {value}
    </Typography>
  </Box>
);

/**
 * General Information Card
 * Displays product name, passport identifier, issuance/expiration dates, version, and status
 */
export const GeneralInfoCard: React.FC<HeaderCardProps> = ({ data, passportId }) => {
  const identification = data.identification as Record<string, any> | undefined;
  const metadata = data.metadata as Record<string, any> | undefined;
  const sustainability = data.sustainability as Record<string, any> | undefined;
  
  const productName = identification?.type?.nameAtManufacturer || 'Unknown Product';
  const passportIdentifier = metadata?.passportIdentifier || 'N/A';
  const issuanceDate = metadata?.issueDate || 'N/A';
  const expirationDate = metadata?.expirationDate || 'N/A';
  const version = metadata?.version || '1.0.0';
  const state = sustainability?.status || 'N/A';
  const passportStatus = metadata?.status || 'N/A';
  const lastModification = metadata?.lastModification || 'N/A';
  const predecessor = metadata?.predecessor || 'N/A';

  return (
    <Card
      elevation={0}
      sx={{
        background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
        border: '1px solid rgba(102, 126, 234, 0.2)',
        borderRadius: '12px',
        p: 2,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        transition: 'all 0.2s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 8px 24px rgba(102, 126, 234, 0.15)'
        }
      }}
    >
      <Grid2 container spacing={{ xs: 1, sm: 1.25, md: 1.5 }} sx={{ flex: 1 }}>
        {/* Left column: Title and Product Name */}
        <Grid2 size={{ xs: 8 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {/* Header with Icon and Section Title */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  p: 1,
                  borderRadius: '8px',
                  background: 'rgba(102, 126, 234, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <Info sx={{ fontSize: { xs: 16, sm: 18, md: 20 }, color: '#667eea' }} />
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: { xs: '0.55rem', sm: '0.6rem', md: '0.65rem' }, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block' }}>
                  Passport Information
                </Typography>
              </Box>
            </Box>

            {/* Product Name with icon */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Info sx={{ fontSize: { xs: 14, sm: 15, md: 16 }, color: '#667eea' }} />
              <FieldDisplay label="Product Name" value={productName} />
            </Box>
          </Box>
        </Grid2>

        {/* Right column: QR Code */}
        <Grid2 size={{ xs: 4 }} sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-start' }}>
          <Box
            sx={{
              p: 0.75,
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.95)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid rgba(102, 126, 234, 0.3)',
            }}
          >
            <QRCodeSVG 
              value={passportId} 
              size={window.innerWidth < 600 ? 50 : window.innerWidth < 900 ? 55 : 65}
              level="M"
              includeMargin={false}
            />
          </Box>
        </Grid2>

        {/* Passport Identifier - Full width */}
        <Grid2 size={12}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Fingerprint sx={{ fontSize: { xs: 14, sm: 15, md: 16 }, color: '#667eea' }} />
            <FieldDisplay label="Passport Identifier" value={passportIdentifier} fontFamily="monospace" />
          </Box>
        </Grid2>

        {/* Dates - 4/4/4 split */}
        <Grid2 size={4}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Event sx={{ fontSize: { xs: 14, sm: 15, md: 16 }, color: '#667eea' }} />
            <FieldDisplay label="Issuance Date" value={issuanceDate} />
          </Box>
        </Grid2>
        <Grid2 size={4}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Today sx={{ fontSize: { xs: 14, sm: 15, md: 16 }, color: '#667eea' }} />
            <FieldDisplay label="Expiration Date" value={expirationDate} />
          </Box>
        </Grid2>
        <Grid2 size={4}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Update sx={{ fontSize: { xs: 14, sm: 15, md: 16 }, color: '#667eea' }} />
            <FieldDisplay label="Last Modification" value={lastModification} />
          </Box>
        </Grid2>

        {/* Version and State - 6/6 split */}
        <Grid2 size={6}>
          <InfoBox
            label="Version"
            value={version}
            color="#667eea"
            backgroundColor="rgba(102, 126, 234, 0.15)"
            borderColor="rgba(102, 126, 234, 0.3)"
            fontFamily="monospace"
            size="medium"
          />
        </Grid2>
        <Grid2 size={6}>
          <InfoBox
            label="State"
            value={state}
            color="#667eea"
            backgroundColor="rgba(102, 126, 234, 0.15)"
            borderColor="rgba(102, 126, 234, 0.3)"
            size="medium"
          />
        </Grid2>

        {/* Passport Status - Full width */}
        <Grid2 size={12}>
          <InfoBox
            label="Passport Status"
            value={passportStatus}
            color="#667eea"
            backgroundColor="rgba(102, 126, 234, 0.15)"
            borderColor="rgba(102, 126, 234, 0.3)"
            size="medium"
          />
        </Grid2>
      </Grid2>
    </Card>
  );
};

/**
 * Manufacturing Information Card
 * Displays manufacturer ID, manufacturing date, part ID, product name, and physical dimensions
 */
export const ManufacturingCard: React.FC<HeaderCardProps> = ({ data }) => {
  const operation = data.operation as Record<string, any> | undefined;
  const identification = data.identification as Record<string, any> | undefined;
  const characteristics = data.characteristics as Record<string, any> | undefined;
  const metadata = data.metadata as Record<string, any> | undefined;
  
  const manufacturerId = operation?.manufacturer?.manufacturer || 'N/A';
  const manufacturingDate = operation?.manufacturer?.manufacturingDate || 'N/A';
  const manufacturerPartId = identification?.type?.manufacturerPartId || 'N/A';
  const economicOperatorId = metadata?.economicOperatorId || 'N/A';

  // Physical dimensions
  const physicalDimension = characteristics?.physicalDimension || {};
  const width = physicalDimension.width ? `${physicalDimension.width.value} ${physicalDimension.width.unit?.replace('unit:', '') || 'mm'}` : 'N/A';
  const length = physicalDimension.length ? `${physicalDimension.length.value} ${physicalDimension.length.unit?.replace('unit:', '') || 'mm'}` : 'N/A';
  const height = physicalDimension.height ? `${physicalDimension.height.value} ${physicalDimension.height.unit?.replace('unit:', '') || 'mm'}` : 'N/A';
  const volume = physicalDimension.volume ? `${physicalDimension.volume.value} ${physicalDimension.volume.unit?.replace('unit:', '') || 'm³'}` : 'N/A';
  const diameter = physicalDimension.diameter ? `${physicalDimension.diameter.value} ${physicalDimension.diameter.unit?.replace('unit:', '') || 'mm'}` : 'N/A';
  const weight = physicalDimension.weight ? `${physicalDimension.weight.value} ${physicalDimension.weight.unit?.replace('unit:', '') || 'kg'}` : 'N/A';

  return (
    <Card
      elevation={0}
      sx={{
        background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(217, 119, 6, 0.1) 100%)',
        border: '1px solid rgba(245, 158, 11, 0.2)',
        borderRadius: '12px',
        p: 2,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.2s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 8px 24px rgba(245, 158, 11, 0.15)'
        }
      }}
    >
      <Grid2 container spacing={{ xs: 1, sm: 1.25, md: 1.5 }} sx={{ flex: 1 }}>
        {/* Manufacturing Date and Part ID - 6/6 split */}
        <Grid2 size={6}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Event sx={{ fontSize: { xs: 14, sm: 15, md: 16 }, color: '#f59e0b' }} />
            <FieldDisplay label="Manufacturing Date" value={manufacturingDate} />
          </Box>
        </Grid2>
        <Grid2 size={6}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Badge sx={{ fontSize: { xs: 14, sm: 15, md: 16 }, color: '#f59e0b' }} />
            <FieldDisplay label="Manufacturer Part ID" value={manufacturerPartId} fontFamily="monospace" />
          </Box>
        </Grid2>

        {/* Manufacturer ID and Product Name - 6/6 split */}
        <Grid2 size={6}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Factory sx={{ fontSize: { xs: 14, sm: 15, md: 16 }, color: '#f59e0b' }} />
            <FieldDisplay label="Manufacturer ID" value={manufacturerId} fontFamily="monospace" />
          </Box>
        </Grid2>
        <Grid2 size={6}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Business sx={{ fontSize: { xs: 14, sm: 15, md: 16 }, color: '#f59e0b' }} />
            <FieldDisplay label="Economic Operator ID" value={economicOperatorId} fontFamily="monospace" />
          </Box>
        </Grid2>

        {/* Physical Dimensions - 6/6 grid layout */}
        <Grid2 size={6}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Straighten sx={{ fontSize: { xs: 12, sm: 13, md: 14 }, color: '#f59e0b' }} />
            <InfoBox
              label="Width"
              value={width}
              color="#f59e0b"
              backgroundColor="rgba(245, 158, 11, 0.15)"
              borderColor="rgba(245, 158, 11, 0.3)"
              size="small"
            />
          </Box>
        </Grid2>
        <Grid2 size={6}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Straighten sx={{ fontSize: { xs: 12, sm: 13, md: 14 }, color: '#f59e0b', transform: 'rotate(90deg)' }} />
            <InfoBox
              label="Length"
              value={length}
              color="#f59e0b"
              backgroundColor="rgba(245, 158, 11, 0.15)"
              borderColor="rgba(245, 158, 11, 0.3)"
              size="small"
            />
          </Box>
        </Grid2>
        <Grid2 size={6}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <HeightIcon sx={{ fontSize: { xs: 12, sm: 13, md: 14 }, color: '#f59e0b' }} />
            <InfoBox
              label="Height"
              value={height}
              color="#f59e0b"
              backgroundColor="rgba(245, 158, 11, 0.15)"
              borderColor="rgba(245, 158, 11, 0.3)"
              size="small"
            />
          </Box>
        </Grid2>
        <Grid2 size={6}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <ViewInAr sx={{ fontSize: { xs: 12, sm: 13, md: 14 }, color: '#f59e0b' }} />
            <InfoBox
              label="Volume"
              value={volume}
              color="#f59e0b"
              backgroundColor="rgba(245, 158, 11, 0.15)"
              borderColor="rgba(245, 158, 11, 0.3)"
              size="small"
            />
          </Box>
        </Grid2>
        <Grid2 size={6}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <AspectRatio sx={{ fontSize: { xs: 12, sm: 13, md: 14 }, color: '#f59e0b' }} />
            <InfoBox
              label="Diameter"
              value={diameter}
              color="#f59e0b"
              backgroundColor="rgba(245, 158, 11, 0.15)"
              borderColor="rgba(245, 158, 11, 0.3)"
              size="small"
            />
          </Box>
        </Grid2>
        <Grid2 size={6}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Scale sx={{ fontSize: { xs: 12, sm: 13, md: 14 }, color: '#f59e0b' }} />
            <InfoBox
              label="Weight"
              value={weight}
              color="#f59e0b"
              backgroundColor="rgba(245, 158, 11, 0.15)"
              borderColor="rgba(245, 158, 11, 0.3)"
              size="small"
            />
          </Box>
        </Grid2>
      </Grid2>
    </Card>
  );
};

/**
 * Sustainability Card
 * Displays CO2 footprint, durability score, and percentage of recyclable materials
 */
export const SustainabilityCard: React.FC<HeaderCardProps> = ({ data }) => {
  const sustainability = data.sustainability as Record<string, any> | undefined;
  const materials = data.materials as Record<string, any> | undefined;
  
  // Calculate total footprints by summing all values in each array
  const calculateFootprint = (footprintArray: any[]) => {
    if (!footprintArray || footprintArray.length === 0) return null;
    
    let total = 0;
    let unit = '';
    
    footprintArray.forEach((item: any) => {
      if (item.value) {
        total += parseFloat(item.value);
        if (!unit && item.unit) {
          unit = item.unit;
        }
      }
    });
    
    return total > 0 ? { value: total, unit } : null;
  };
  
  const carbonFootprint = calculateFootprint(sustainability?.productFootprint?.carbon);
  const environmentalFootprint = calculateFootprint(sustainability?.productFootprint?.environmental);
  const materialFootprint = calculateFootprint(sustainability?.productFootprint?.material);
  
  const durabilityScore = sustainability?.durabilityScore || 'N/A';

  // Calculate percentage of recyclable materials based on weighted average
  const calculateRecyclablePercentage = () => {
    const materialComposition = materials?.materialComposition?.content || [];
    if (materialComposition.length === 0) return 0;

    let totalWeightedRecycled = 0;
    let totalConcentration = 0;

    materialComposition.forEach((item: any) => {
      const concentration = item.concentration || 0;
      const recycled = item.recycled || 0;
      totalWeightedRecycled += (concentration * recycled);
      totalConcentration += concentration;
    });

    return totalConcentration > 0 ? (totalWeightedRecycled / totalConcentration) : 0;
  };

  const recyclablePercentage = calculateRecyclablePercentage();

  return (
    <Card
      elevation={0}
      sx={{
        background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(22, 163, 74, 0.1) 100%)',
        border: '1px solid rgba(34, 197, 94, 0.2)',
        borderRadius: '12px',
        p: 2,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        transition: 'all 0.2s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 8px 24px rgba(34, 197, 94, 0.15)'
        }
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Header */}
        <Grid2 container spacing={{ xs: 1, sm: 1.25, md: 1.5 }} sx={{ mb: 2 }}>
          <Grid2 size={{ xs: 12 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  p: 1,
                  borderRadius: '8px',
                  background: 'rgba(34, 197, 94, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <EnergySavingsLeaf sx={{ fontSize: { xs: 16, sm: 18, md: 20 }, color: '#22c55e' }} />
              </Box>
              <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: { xs: '0.55rem', sm: '0.6rem', md: '0.65rem' }, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Sustainability
              </Typography>
            </Box>
          </Grid2>
        </Grid2>

        {/* Content Grid - 2 rows of equal height */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          {/* Scores - Top Row */}
          <Grid2 container spacing={0.75} sx={{ flex: 1 }}>
            <Grid2 size={{ xs: 4 }} sx={{ display: 'flex' }}>
              <Box sx={{ width: '100%' }}>
                <InfoBox
                  label="Durability"
                  value={durabilityScore}
                  color="#22c55e"
                  backgroundColor="rgba(34, 197, 94, 0.15)"
                  borderColor="rgba(34, 197, 94, 0.3)"
                  size="large"
                />
              </Box>
            </Grid2>
            <Grid2 size={{ xs: 4 }} sx={{ display: 'flex' }}>
              <Box sx={{ width: '100%' }}>
                <InfoBox
                  label="Reparability"
                  value={sustainability?.reparabilityScore || 'N/A'}
                  color="#22c55e"
                  backgroundColor="rgba(34, 197, 94, 0.15)"
                  borderColor="rgba(34, 197, 94, 0.3)"
                  size="large"
                />
              </Box>
            </Grid2>
            <Grid2 size={{ xs: 4 }} sx={{ display: 'flex' }}>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  p: 1.5,
                  borderRadius: '8px',
                  backgroundColor: 'rgba(34, 197, 94, 0.15)',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  width: '100%',
                  height: '100%'
                }}
              >
                <Recycling sx={{ fontSize: { xs: 14, sm: 15, md: 16 }, color: '#22c55e', mb: 0.25 }} />
                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.6rem', textAlign: 'center', mb: 0.25 }}>
                  Recyclable
                </Typography>
                <Typography variant="h6" sx={{
                  color: '#22c55e',
                  fontWeight: 700,
                  fontSize: { xs: '1.1rem', sm: '1.3rem', md: '1.5rem' },
                  lineHeight: 1
                }}>
                  {recyclablePercentage.toFixed(1)}%
                </Typography>
              </Box>
            </Grid2>
          </Grid2>

          {/* Footprint Values - Bottom Row */}
          {(() => {
            const footprintCount = [carbonFootprint, environmentalFootprint, materialFootprint].filter(Boolean).length;
            const getGridSize = () => {
              if (footprintCount === 1) return 12;
              if (footprintCount === 2) return 6;
              return 4;
            };
            const gridSize = getGridSize();

            return (carbonFootprint || environmentalFootprint || materialFootprint) ? (
              <Grid2 container spacing={0.75} sx={{ flex: 1 }}>
              {carbonFootprint && (
                <Grid2 size={{ xs: gridSize }} sx={{ display: 'flex' }}>
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      p: 1.5,
                      borderRadius: '8px',
                      backgroundColor: 'rgba(34, 197, 94, 0.15)',
                      border: '1px solid rgba(34, 197, 94, 0.3)',
                      width: '100%',
                      height: '100%'
                    }}
                  >
                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.6rem', textAlign: 'center', mb: 0.25, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                      Total Carbon Footprint
                    </Typography>
                    <Typography variant="h6" sx={{ color: '#22c55e', fontWeight: 700, fontSize: { xs: '1.1rem', sm: '1.3rem', md: '1.5rem' }, textAlign: 'center', lineHeight: 1.2 }}>
                      {carbonFootprint.value}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.55rem', textAlign: 'center', mt: 0.25 }}>
                      {carbonFootprint.unit}
                    </Typography>
                  </Box>
                </Grid2>
              )}
              {environmentalFootprint && (
                <Grid2 size={{ xs: gridSize }} sx={{ display: 'flex' }}>
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      p: 1.5,
                      borderRadius: '8px',
                      backgroundColor: 'rgba(34, 197, 94, 0.15)',
                      border: '1px solid rgba(34, 197, 94, 0.3)',
                      width: '100%',
                      height: '100%'
                    }}
                  >
                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.6rem', textAlign: 'center', mb: 0.25, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                      Total Environmental Footprint
                    </Typography>
                    <Typography variant="h6" sx={{ color: '#22c55e', fontWeight: 700, fontSize: { xs: '1.1rem', sm: '1.3rem', md: '1.5rem' }, textAlign: 'center', lineHeight: 1.2 }}>
                      {environmentalFootprint.value}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.55rem', textAlign: 'center', mt: 0.25 }}>
                      {environmentalFootprint.unit}
                    </Typography>
                  </Box>
                </Grid2>
              )}
              {materialFootprint && (
                <Grid2 size={{ xs: gridSize }} sx={{ display: 'flex' }}>
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      p: 1.5,
                      borderRadius: '8px',
                      backgroundColor: 'rgba(34, 197, 94, 0.15)',
                      border: '1px solid rgba(34, 197, 94, 0.3)',
                      width: '100%',
                      height: '100%'
                    }}
                  >
                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.6rem', textAlign: 'center', mb: 0.25, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                      Total Material Footprint
                    </Typography>
                    <Typography variant="h6" sx={{ color: '#22c55e', fontWeight: 700, fontSize: { xs: '1.1rem', sm: '1.3rem', md: '1.5rem' }, textAlign: 'center', lineHeight: 1.2 }}>
                      {materialFootprint.value}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.55rem', textAlign: 'center', mt: 0.25 }}>
                      {materialFootprint.unit}
                    </Typography>
                  </Box>
                </Grid2>
              )}
              </Grid2>
            ) : (
              <Box sx={{ textAlign: 'center', py: 1, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem' }}>
                  No footprint data available
                </Typography>
              </Box>
            );
          })()}
        </Box>
      </Box>
    </Card>
  );
};

/**
 * Materials Card
 * Displays material composition pie chart with single unit type
 */
export const MaterialsCard: React.FC<HeaderCardProps> = ({ data }) => {
  const materials = data.materials as Record<string, any> | undefined;
  
  // Material Composition data
  const materialComposition = materials?.materialComposition?.content || [];
  
  // Group materials by unit
  const materialsByUnit: Record<string, any[]> = materialComposition.reduce((acc: Record<string, any[]>, item: any) => {
    const unit = item.unit || 'unit n/a';
    if (!acc[unit]) {
      acc[unit] = [];
    }
    acc[unit].push(item);
    return acc;
  }, {});

  // Select the unit with the most materials, or the first one in case of a tie
  const selectedUnit = Object.keys(materialsByUnit).length > 0
    ? Object.keys(materialsByUnit).reduce((maxUnit, currentUnit) => 
        materialsByUnit[currentUnit].length > materialsByUnit[maxUnit].length 
          ? currentUnit 
          : maxUnit
      )
    : null;

  // Filter materials to the selected unit
  const compositionData = selectedUnit
    ? materialsByUnit[selectedUnit].map((item: any) => ({
        name: item.id?.[0]?.name || 'Unknown',
        value: item.concentration || 0,
        unit: item.unit || 'unit n/a'
      })).filter((item: any) => item.value > 0)
    : [];

  const hasCompositionData = compositionData.length > 0;

  const compositionColors = ['#8b5cf6', '#6366f1', '#a78bfa', '#c4b5fd', '#ddd6fe', '#e9d5ff', '#f3e8ff'];

  // Create a theme for white text in charts
  const chartTheme = createTheme({
    palette: {
      mode: 'dark',
      text: {
        primary: '#ffffff',
        secondary: '#ffffff',
      },
    },
    components: {
      MuiChartsLegend: {
        styleOverrides: {
          root: {
            '& text': {
              fill: '#ffffff !important',
            },
          },
        },
      },
    },
  });

  return (
    <Card
      elevation={0}
      sx={{
        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(124, 58, 237, 0.1) 100%)',
        border: '1px solid rgba(139, 92, 246, 0.2)',
        borderRadius: '12px',
        p: 2,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.2s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 8px 24px rgba(139, 92, 246, 0.15)'
        }
      }}
    >
      {/* Title - Always at top */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <Box
          sx={{
            p: 1,
            borderRadius: '8px',
            background: 'rgba(139, 92, 246, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}
        >
          <Science sx={{ fontSize: { xs: 16, sm: 18, md: 20 }, color: '#8b5cf6' }} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: { xs: '0.55rem', sm: '0.6rem', md: '0.65rem' }, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block' }}>
            Material Composition
          </Typography>
        </Box>
      </Box>
      
      {/* Chart Container - Centered and filling remaining space */}
      <Box sx={{ 
        flex: 1,
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center',
        minHeight: 0
      }}>
        {/* Material Composition */}
        {hasCompositionData && compositionData.length > 0 ? (
          <ThemeProvider theme={chartTheme}>
            <Box sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              '& svg text': {
                fill: 'white !important',
              },
              '& .MuiChartsLegend-series text': {
                fill: 'white !important',
              }
            }}>
              <PieChart
              series={[
                {
                  data: compositionData.map((item: any, index: number) => ({
                    id: index,
                    value: item.value,
                    label: item.name,
                    color: compositionColors[index % compositionColors.length]
                  })),
                  highlightScope: { faded: 'global', highlighted: 'item' },
                }
              ]}
              width={240}
              height={140}
              colors={compositionColors}
              slotProps={{
                legend: {
                  direction: 'column' as const,
                  position: { vertical: 'bottom' as const, horizontal: 'middle' as const },
                  padding: 0,
                  itemMarkWidth: 5,
                  itemMarkHeight: 5,
                  markGap: 3,
                  itemGap: 2,
                  labelStyle: {
                    fontSize: 10,
                    fill: 'white',
                    fontWeight: 400,
                  },
                },
              }}
              sx={{
                '& .MuiChartsLegend-series text': {
                  fill: 'white !important',
                  fontSize: '10px !important',
                  fontWeight: '400 !important',
                },
                '& .MuiChartsLegend-label': {
                  fontSize: '10px !important',
                },
                '& .MuiChartsLegend-mark': {
                  width: '5px !important',
                  height: '5px !important',
                },
                '& text': {
                  fontSize: '10px !important',
                },
                '& .MuiPieArc-root': {
                  stroke: 'rgba(255, 255, 255, 0.1)',
                  strokeWidth: 1,
                },
              }}
              />
              {selectedUnit && (
                <Typography 
                  variant="caption" 
                  sx={{ 
                    color: 'rgba(255, 255, 255, 0.6)', 
                    fontSize: '0.65rem', 
                    textAlign: 'center',
                    display: 'block',
                    mt: -0.5
                  }}
                >
                  {selectedUnit}
                </Typography>
              )}
            </Box>
          </ThemeProvider>
        ) : (
          <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem', textAlign: 'center', py: 2 }}>
            No data
          </Typography>
        )}
      </Box>
    </Card>
  );
};
