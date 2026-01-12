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
  Typography,
  Card,
  CardContent,
  Chip,
  Grid2,
  Alert,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { PieChart } from '@mui/x-charts/PieChart';
import InfoIcon from '@mui/icons-material/Info';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import FactoryIcon from '@mui/icons-material/Factory';
import VerifiedIcon from '@mui/icons-material/Verified';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import PieChartIcon from '@mui/icons-material/PieChart';
import CategoryIcon from '@mui/icons-material/Category';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import GppGoodIcon from '@mui/icons-material/GppGood';
import BusinessIcon from '@mui/icons-material/Business';
import { SubmodelAddonProps } from '../shared/types';
import { SubmodelAddonWrapper } from '../BaseAddon';
import { UsTariffInformation } from './types';
import { getCountryFlag } from '@/features/industry-core-kit/part-discovery/components/submodel-addons/utils/country-flags';

/**
 * Specialized viewer component for US Tariff Information submodels
 */
export const UsTariffInformationViewer: React.FC<SubmodelAddonProps<UsTariffInformation>> = ({
  data,
  semanticId
}) => {
  const formatCurrency = (value: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(value);
  };

  const formatWeight = (weight: { value: number; unit: string }) => {
    return `${weight.value} ${weight.unit}`;
  };

  // Distinct color palette for better visibility and differentiation
  const distinctColorPalette = [
    '#2196F3', // Blue
    '#4CAF50', // Green
    '#FF9800', // Orange
    '#9C27B0', // Purple
    '#F44336', // Red
    '#00BCD4', // Cyan
    '#795548', // Brown
    '#607D8B', // Blue Grey
    '#E91E63', // Pink
    '#8BC34A', // Light Green
    '#FF5722', // Deep Orange
    '#3F51B5', // Indigo
  ];

  // Prepare pie chart data from material composition
  const pieChartData = data.materialList.map((material, index) => ({
    id: index,
    value: material.value,
    label: material.material.materialName,
    color: distinctColorPalette[index % distinctColorPalette.length]
  }));

  // Prepare country origin share data
  const countryOriginData = (() => {
    const countryMap = new Map<string, number>();
    
    data.materialList.forEach(material => {
      material.origin.forEach(origin => {
        const country = origin.originCountry;
        const percentage = origin.valuePercentage;
        countryMap.set(country, (countryMap.get(country) || 0) + percentage);
      });
    });

    return Array.from(countryMap.entries()).map(([country, percentage], index) => ({
      id: index,
      value: percentage,
      label: `${getCountryFlag(country)} ${country}`,
      color: distinctColorPalette[(index + 6) % distinctColorPalette.length] // Offset to use different colors
    }));
  })();

  // Prepare data for DataGrid
  const materialRows = data.materialList.map((material, index) => ({
    id: index,
    materialName: material.material.materialName,
    classificationType: material.material.classificationType,
    classificationId: material.material.classificationId,
    referenceNumber: material.referenceNumber,
    value: formatCurrency(material.value, material.currency),
    originCountries: material.origin.map(origin => `${origin.originCountry} (${origin.valuePercentage}%)`).join(', '),
    processingSteps: material.processing.length,
    material: material // Keep full material object for complex rendering
  }));

  const materialColumns: GridColDef[] = [
    {
      field: 'materialName',
      headerName: 'Material',
      flex: 1,
      minWidth: 200,
      renderCell: (params) => (
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
            {params.row.materialName}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {params.row.classificationType}: {params.row.classificationId}
          </Typography>
        </Box>
      )
    },
    {
      field: 'referenceNumber',
      headerName: 'Reference',
      width: 140
    },
    {
      field: 'value',
      headerName: 'Value',
      width: 120
    },
    {
      field: 'originCountries',
      headerName: 'Origin Countries',
      flex: 1,
      minWidth: 250,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, py: 1 }}>
          {params.row.material.origin.map((origin: { originCountry: string; valuePercentage: number }, idx: number) => (
            <Chip
              key={idx}
              label={`${getCountryFlag(origin.originCountry)} ${origin.originCountry} (${origin.valuePercentage}%)`}
              size="small"
              variant="outlined"
            />
          ))}
        </Box>
      )
    },
    {
      field: 'processingSteps',
      headerName: 'Processing Steps',
      width: 130,
      renderCell: (params) => (
        <Typography variant="caption">
          {params.value} step(s)
        </Typography>
      )
    }
  ];

  return (
    <SubmodelAddonWrapper
      title="US Tariff Information"
      subtitle={`Semantic ID: ${semanticId}`}
    >
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: 1.5,
        width: '100%',
        overflowX: 'auto',
        overflowY: 'auto',
        minWidth: 0 // Allow flex items to shrink below their content size
      }}>
        {/* Part Information */}
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <InfoIcon color="primary" />
              Part Information
            </Typography>
            <Grid2 container spacing={2}>
              <Grid2 size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle2" color="text.secondary">Part ID</Typography>
                <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>{data.partId}</Typography>
              </Grid2>
              <Grid2 size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle2" color="text.secondary">Part Name</Typography>
                <Typography variant="body1">{data.partName}</Typography>
              </Grid2>
              <Grid2 size={12}>
                <Typography variant="subtitle2" color="text.secondary">Description</Typography>
                <Typography variant="body1">{data.partDescription}</Typography>
              </Grid2>
              <Grid2 size={{ xs: 12, md: 4 }}>
                <Typography variant="subtitle2" color="text.secondary">Weight</Typography>
                <Typography variant="body1">{formatWeight(data.partWeight)}</Typography>
              </Grid2>
              <Grid2 size={{ xs: 12, md: 4 }}>
                <Typography variant="subtitle2" color="text.secondary">Vehicle System</Typography>
                <Typography variant="body1">{data.partUsage.vehicleSystem}</Typography>
              </Grid2>
              <Grid2 size={{ xs: 12, md: 4 }}>
                <Typography variant="subtitle2" color="text.secondary">Vehicle Subassembly</Typography>
                <Typography variant="body1">{data.partUsage.vehicleSubassembly}</Typography>
              </Grid2>
              <Grid2 size={12}>
                <Typography variant="subtitle2" color="text.secondary">OEM Part References</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                  {data.partUsage.oemPartRef.map((ref, index) => (
                    <Chip
                      key={index}
                      label={ref}
                      variant="outlined"
                      size="small"
                      sx={{ fontFamily: 'monospace' }}
                    />
                  ))}
                </Box>
              </Grid2>
            </Grid2>
          </CardContent>
        </Card>

        {/* Tariff Information */}
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <MonetizationOnIcon color="primary" />
              Tariff Information
            </Typography>
            <Grid2 container spacing={2}>
              <Grid2 size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CategoryIcon fontSize="small" color="action" />
                  HTS Code
                </Typography>
                <Typography variant="body1" sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
                  {data.tariff.htsCode}
                </Typography>
              </Grid2>
              <Grid2 size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle2" color="text.secondary">Coding System</Typography>
                <Typography variant="body1">{data.tariff.htsCodingSystem}</Typography>
              </Grid2>
              <Grid2 size={12}>
                <Typography variant="subtitle2" color="text.secondary">HTS Description</Typography>
                <Typography variant="body1">{data.tariff.htsDescription}</Typography>
              </Grid2>
              <Grid2 size={{ xs: 12, md: 4 }}>
                <Typography variant="subtitle2" color="text.secondary">Country of Import</Typography>
                <Typography variant="body1">{data.tariff.countryOfImport}</Typography>
              </Grid2>
              <Grid2 size={{ xs: 12, md: 4 }}>
                <Typography variant="subtitle2" color="text.secondary">Country of Export</Typography>
                <Typography variant="body1">{data.tariff.countryOfExport}</Typography>
              </Grid2>
              <Grid2 size={{ xs: 12, md: 4 }}>
                <Typography variant="subtitle2" color="text.secondary">Incoterms</Typography>
                <Typography variant="body1">{data.tariff.incoterms}</Typography>
              </Grid2>
              <Grid2 size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle2" color="text.secondary">Declared Customs Value</Typography>
                <Typography variant="body1" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                  {formatCurrency(data.tariff.declaredCustomsValue.value, data.tariff.declaredCustomsValue.currency)}
                </Typography>
              </Grid2>
              {data.tariff.dutyRateNote && (
                <Grid2 size={12}>
                  <Typography variant="subtitle2" color="text.secondary">Duty Rate Note</Typography>
                  <Alert severity="info" sx={{ mt: 1 }}>
                    {data.tariff.dutyRateNote}
                  </Alert>
                </Grid2>
              )}
            </Grid2>
          </CardContent>
        </Card>

        {/* Material Value Distribution Chart */}
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <PieChartIcon color="primary" />
              Material Analysis
            </Typography>
            <Grid2 container spacing={3} sx={{ overflowX: 'auto', minWidth: 'fit-content' }}>
              {/* Material Value Distribution */}
              <Grid2 size={{ xs: 12, lg: 6 }} sx={{ minWidth: '350px' }}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" sx={{ mb: 2, textAlign: 'center' }}>
                      Value Distribution by Material
                    </Typography>
                    <Box sx={{ 
                      height: 400, 
                      display: 'flex', 
                      justifyContent: 'center', 
                      alignItems: 'center',
                      overflowX: 'auto'
                    }}>
                      <PieChart
                        series={[
                          {
                            data: pieChartData,
                            highlightScope: { fade: 'global', highlight: 'item' },
                          },
                        ]}
                        width={400}
                        height={350}
                        slotProps={{
                          legend: {
                            position: { vertical: 'bottom', horizontal: 'center' },
                          },
                        }}
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid2>
              
              {/* Country Origin Share */}
              <Grid2 size={{ xs: 12, lg: 6 }} sx={{ minWidth: '350px' }}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" sx={{ mb: 2, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                      <LocationOnIcon fontSize="small" color="action" />
                      Country Origin Share (%)
                    </Typography>
                    <Box sx={{ 
                      height: 400, 
                      display: 'flex', 
                      justifyContent: 'center', 
                      alignItems: 'center',
                      overflowX: 'auto'
                    }}>
                      <PieChart
                        series={[
                          {
                            data: countryOriginData,
                            highlightScope: { fade: 'global', highlight: 'item' },
                          },
                        ]}
                        width={400}
                        height={350}
                        slotProps={{
                          legend: {
                            position: { vertical: 'bottom', horizontal: 'center' },
                          },
                        }}
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid2>
            </Grid2>
          </CardContent>
        </Card>

        {/* Material Composition Details Table */}
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <FactoryIcon color="primary" />
              Material Composition Details
            </Typography>
            <Box sx={{ height: 450, width: '100%' }}>
              <DataGrid
                rows={materialRows}
                columns={materialColumns}
                pageSizeOptions={[5, 10, 25]}
                initialState={{
                  pagination: {
                    paginationModel: { pageSize: 10 }
                  }
                }}
                disableRowSelectionOnClick
                getRowHeight={() => 'auto'}
                sx={{
                  '& .MuiDataGrid-cell': {
                    py: 1
                  }
                }}
              />
            </Box>
          </CardContent>
        </Card>

        {/* Compliance Information */}
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <VerifiedIcon color="primary" />
              Compliance Information
            </Typography>
            <Grid2 container spacing={2}>
              <Grid2 size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <GppGoodIcon fontSize="small" color="action" />
                  RoHS Compliance
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                  <Chip
                    label={data.compliance.rohs.compliant ? 'Compliant' : 'Not Compliant'}
                    color={data.compliance.rohs.compliant ? 'success' : 'error'}
                    size="small"
                  />
                  {data.compliance.rohs.exemptions.length > 0 && (
                    <Typography variant="caption" color="text.secondary">
                      {data.compliance.rohs.exemptions.length} exemption(s)
                    </Typography>
                  )}
                </Box>
              </Grid2>
              <Grid2 size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle2" color="text.secondary">REACH SVHC Content</Typography>
                <Typography variant="body1">
                  {data.compliance.reach.svhcContentWppm} wppm
                </Typography>
              </Grid2>
              <Grid2 size={12}>
                <Typography variant="subtitle2" color="text.secondary">ISO Certificates</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                  {data.compliance.isoCertificates.map((cert, index) => (
                    <Chip
                      key={index}
                      label={cert}
                      variant="outlined"
                      size="small"
                      color="primary"
                    />
                  ))}
                </Box>
              </Grid2>
            </Grid2>
          </CardContent>
        </Card>

        {/* Supply Chain */}
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <LocalShippingIcon color="primary" />
              Supply Chain Information
            </Typography>
            <Grid2 container spacing={2}>
              <Grid2 size={{ xs: 12, md: 4 }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <BusinessIcon fontSize="small" color="action" />
                  Manufacturer
                </Typography>
                <Typography variant="body1">
                  {data.supplyChain.manufacturer}
                </Typography>
              </Grid2>
              <Grid2 size={{ xs: 12, md: 4 }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LocationOnIcon fontSize="small" color="action" />
                  Final Assembly
                </Typography>
                <Typography variant="body1">
                  {getCountryFlag(data.supplyChain.finalAssembly)} {data.supplyChain.finalAssembly}
                </Typography>
              </Grid2>
              <Grid2 size={{ xs: 12, md: 4 }}>
                <Typography variant="subtitle2" color="text.secondary">Batch Number</Typography>
                <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
                  {data.supplyChain.batchNumber}
                </Typography>
              </Grid2>
              <Grid2 size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle2" color="text.secondary">Lot Code Marking</Typography>
                <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
                  {data.supplyChain.traceability.lotCodeMarking}
                </Typography>
              </Grid2>
              <Grid2 size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle2" color="text.secondary">Date Code Format</Typography>
                <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
                  {data.supplyChain.traceability.dateCodeFormat}
                </Typography>
              </Grid2>
            </Grid2>
          </CardContent>
        </Card>

        {/* Totals Check */}
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Totals Verification
            </Typography>
            <Grid2 container spacing={2}>
              <Grid2 size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle2" color="text.secondary">Sum of Material Weights</Typography>
                <Typography variant="body1">
                  {data.totalsCheck.sumOfMaterialWeights_g} g
                </Typography>
              </Grid2>
              <Grid2 size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle2" color="text.secondary">Sum of Origin Value Percentages</Typography>
                <Typography variant="body1">
                  {data.totalsCheck.sumOfOriginValuePercentages}%
                </Typography>
              </Grid2>
            </Grid2>
          </CardContent>
        </Card>

        {/* Notes */}
        {data.notes && data.notes.length > 0 && (
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Additional Notes
              </Typography>
              <List dense>
                {data.notes.map((note, index) => (
                  <ListItem key={index}>
                    <ListItemText primary={note} />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        )}
      </Box>
    </SubmodelAddonWrapper>
  );
};
