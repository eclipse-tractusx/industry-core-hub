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

import React, { useState } from 'react';
import { Box, Typography, Grid2, Paper, Chip, IconButton, Tooltip, ClickAwayListener, Collapse, LinearProgress, Link, Divider } from '@mui/material';
import { PieChart } from '@mui/x-charts/PieChart';
import { BarChart } from '@mui/x-charts/BarChart';
import { 
  Science, 
  ExpandMore, 
  ExpandLess, 
  Warning, 
  CheckCircle, 
  Recycling,
  EnergySavingsLeaf,
  LocationOn,
  Description,
  Error as ErrorIcon,
  InfoOutlined
} from '@mui/icons-material';

interface MaterialId {
  type: string;
  name: string;
  id: string;
}

interface Documentation {
  contentType: string;
  header: string;
  content: string;
}

interface HazardClassification {
  category: string;
  statement: string;
  class: string;
}

interface ConcentrationRange {
  max: number;
  min: number;
}

interface SubstanceOfConcern {
  unit: string;
  hazardClassification: HazardClassification;
  documentation?: Documentation[];
  concentrationRange?: ConcentrationRange[];
  location?: string;
  concentration: number;
  exemption?: string;
  id: MaterialId[];
}

interface MaterialCompositionItem {
  unit: string;
  recycled: number;
  critical: boolean;
  renewable: number;
  documentation?: Documentation[];
  concentration: number;
  id: MaterialId[];
}

interface Materials {
  substancesOfConcern?: {
    applicable: boolean;
    content: SubstanceOfConcern[];
  };
  materialComposition?: {
    applicable: boolean;
    content: MaterialCompositionItem[];
  };
}

interface MaterialsRendererProps {
  data: any;
  rawData: Record<string, unknown>;
}

/**
 * Custom renderer for materials section
 * Displays substances of concern and material composition with detailed information
 */
export const MaterialsRenderer: React.FC<MaterialsRendererProps> = ({ rawData }) => {
  const materials = rawData.materials as Materials | undefined;

  if (!materials) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
          No materials information available
        </Typography>
      </Box>
    );
  }

  // Prepare chart data for material composition
  const compositionColors = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#00f2fe', '#43e97b', '#38f9d7'];
  
  // Group materials by unit
  const materialsByUnit = materials.materialComposition?.content.reduce((acc, material) => {
    const unit = material.unit || 'unit n/a';
    if (!acc[unit]) {
      acc[unit] = [];
    }
    acc[unit].push(material);
    return acc;
  }, {} as Record<string, MaterialCompositionItem[]>) || {};

  const hasMultipleCompositionUnits = Object.keys(materialsByUnit).length > 1;
  const primaryCompositionUnit = Object.keys(materialsByUnit)[0] || 'unit';

  const compositionChartData = materials.materialComposition?.content.map((material, index) => {
    const materialName = material.id?.[0]?.name || `Material ${index + 1}`;
    const concentrationPercent = (material.concentration / 10000);
    return {
      id: index,
      value: concentrationPercent,
      label: materialName.length > 30 ? materialName.substring(0, 27) + '...' : materialName,
      color: material.critical ? '#ff9800' : compositionColors[index % compositionColors.length]
    };
  }) || [];

  const substancesColors = ['#ff6b6b', '#ee5a6f', '#f06595', '#cc5de8', '#845ef7', '#5c7cfa', '#339af0'];
  
  // Group substances by unit for proper visualization
  const substancesByUnit = materials.substancesOfConcern?.content.reduce((acc, substance) => {
    const unit = substance.unit || 'unit n/a';
    if (!acc[unit]) {
      acc[unit] = [];
    }
    acc[unit].push(substance);
    return acc;
  }, {} as Record<string, SubstanceOfConcern[]>) || {};

  const substancesChartData = materials.substancesOfConcern?.content.map((substance, index) => {
    const substanceName = substance.id?.[0]?.name || `Substance ${index + 1}`;
    const unit = substance.unit || 'N/A';
    return {
      substance: substanceName,
      concentration: substance.concentration,
      unit: unit,
      label: `${substanceName} (${unit})`,
      color: substancesColors[index % substancesColors.length]
    };
  }) || [];

  // Determine if there are multiple units
  const hasMultipleUnits = Object.keys(substancesByUnit).length > 1;
  const primaryUnit = Object.keys(substancesByUnit)[0] || 'unit';

  const hasComposition = materials.materialComposition?.applicable && materials.materialComposition.content.length > 0;
  const hasSubstances = materials.substancesOfConcern?.applicable && materials.substancesOfConcern.content.length > 0;

  return (
    <Box>
      {/* Pie Charts Overview */}
      {(hasComposition || hasSubstances) && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" sx={{ color: '#fff', fontWeight: 600, mb: 3 }}>
            Materials Overview
          </Typography>
          <Grid2 container spacing={3}>
            {/* Material Composition Pie Chart */}
            {hasComposition && (
              <Grid2 size={{ xs: 12, md: 6 }}>
                <Paper
                  elevation={0}
                  sx={{
                    background: 'rgba(102, 126, 234, 0.05)',
                    border: '1px solid rgba(102, 126, 234, 0.2)',
                    borderRadius: 2,
                    p: 3
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                    <Science sx={{ color: '#667eea', fontSize: 24 }} />
                    <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600 }}>
                      Material Composition
                    </Typography>
                    <Chip
                      label={`${materials.materialComposition.content.length} materials`}
                      size="small"
                      sx={{
                        backgroundColor: 'rgba(102, 126, 234, 0.2)',
                        color: '#667eea',
                        fontSize: '0.7rem',
                        height: 22
                      }}
                    />
                    {hasMultipleCompositionUnits && (
                      <Chip
                        label="Multiple units"
                        size="small"
                        icon={<InfoOutlined sx={{ fontSize: 14 }} />}
                        sx={{
                          backgroundColor: 'rgba(102, 126, 234, 0.15)',
                          color: '#667eea',
                          fontSize: '0.65rem',
                          height: 22
                        }}
                      />
                    )}
                  </Box>
                  {hasMultipleCompositionUnits ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, minHeight: 300 }}>
                      <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', fontStyle: 'italic', mb: 1 }}>
                        Materials use different units. Showing separate chart for each unit.
                      </Typography>
                      {Object.entries(materialsByUnit).map(([unit, materials]) => {
                        const unitChartData = materials.map((material, idx) => {
                          const materialName = material.id?.[0]?.name || `Material ${idx + 1}`;
                          const concentrationPercent = unit === 'unit:partPerMillion' ? (material.concentration / 10000) : material.concentration;
                          return {
                            id: idx,
                            value: concentrationPercent,
                            label: materialName.length > 30 ? materialName.substring(0, 27) + '...' : materialName,
                            color: material.critical ? '#ff9800' : compositionColors[idx % compositionColors.length]
                          };
                        });
                        
                        return unitChartData.length > 0 && (
                          <Box key={unit} sx={{ mb: 2 }}>
                            <Typography variant="body2" sx={{ color: '#667eea', fontWeight: 600, mb: 2 }}>
                              {unit}
                            </Typography>
                            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                              <PieChart
                                series={[
                                  {
                                    data: unitChartData,
                                    highlightScope: { faded: 'global', highlighted: 'item' },
                                    faded: { innerRadius: 30, additionalRadius: -30, color: 'rgba(255, 255, 255, 0.2)' },
                                    arcLabel: (item) => `${item.value.toFixed(1)}${unit === 'unit:partPerMillion' ? '%' : ''}`,
                                    arcLabelMinAngle: 35,
                                  },
                                ]}
                                width={400}
                                height={250}
                                slotProps={{
                                  legend: {
                                    direction: 'column' as const,
                                    position: { vertical: 'middle' as const, horizontal: 'right' as const },
                                    padding: 0,
                                    itemMarkWidth: 12,
                                    itemMarkHeight: 12,
                                    markGap: 6,
                                    itemGap: 8,
                                    labelStyle: {
                                      fontSize: 11,
                                      fill: '#fff',
                                      fontWeight: 600
                                    }
                                  }
                                }}
                                sx={{
                                  '& .MuiChartsLegend-mark': {
                                    rx: 2
                                  },
                                  '& .MuiChartsLegend-label': {
                                    fill: '#fff !important',
                                    color: '#fff !important'
                                  },
                                  '& .MuiChartsLegend-series text': {
                                    fill: '#fff !important'
                                  },
                                  '& text': {
                                    fill: '#fff !important',
                                    color: '#fff !important'
                                  },
                                  '& tspan': {
                                    fill: '#fff !important'
                                  },
                                  '& .MuiChartsAxis-label': {
                                    fill: '#fff !important'
                                  }
                                }}
                              />
                            </Box>
                          </Box>
                        );
                      })}
                    </Box>
                  ) : null}
                  {!hasMultipleUnits && compositionChartData && compositionChartData.length > 0 && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
                      <PieChart
                        series={[
                          {
                            data: compositionChartData,
                            highlightScope: { faded: 'global', highlighted: 'item' },
                            faded: { innerRadius: 30, additionalRadius: -30, color: 'rgba(255, 255, 255, 0.2)' },
                            arcLabel: (item) => `${item.value.toFixed(1)}%`,
                            arcLabelMinAngle: 35,
                          },
                        ]}
                        width={400}
                        height={300}
                        slotProps={{
                          legend: {
                            direction: 'column' as const,
                            position: { vertical: 'middle' as const, horizontal: 'right' as const },
                            padding: 0,
                            itemMarkWidth: 14,
                            itemMarkHeight: 14,
                            markGap: 8,
                            itemGap: 12,
                            labelStyle: {
                              fontSize: 13,
                              fill: '#fff',
                              fontWeight: 600
                            }
                          }
                        }}
                        sx={{
                          '& .MuiChartsLegend-mark': {
                            rx: 2
                          },
                          '& .MuiChartsLegend-label': {
                            fill: '#fff !important',
                            color: '#fff !important'
                          },
                          '& .MuiChartsLegend-series text': {
                            fill: '#fff !important'
                          },
                          '& text': {
                            fill: '#fff !important',
                            color: '#fff !important'
                          },
                          '& tspan': {
                            fill: '#fff !important'
                          }
                        }}
                      />
                    </Box>
                  )}
                </Paper>
              </Grid2>
            )}

            {/* Substances of Concern Bar Chart */}
            {hasSubstances && (
              <Grid2 size={{ xs: 12, md: 6 }}>
                <Paper
                  elevation={0}
                  sx={{
                    background: 'rgba(255, 152, 0, 0.05)',
                    border: '1px solid rgba(255, 152, 0, 0.2)',
                    borderRadius: 2,
                    p: 3
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                    <Warning sx={{ color: '#ff9800', fontSize: 24 }} />
                    <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600 }}>
                      Substances of Concern
                    </Typography>
                    <Chip
                      label={`${materials.substancesOfConcern.content.length} substances`}
                      size="small"
                      sx={{
                        backgroundColor: 'rgba(255, 152, 0, 0.2)',
                        color: '#ffb74d',
                        fontSize: '0.7rem',
                        height: 22
                      }}
                    />
                    {hasMultipleUnits && (
                      <Chip
                        label="Multiple units"
                        size="small"
                        icon={<InfoOutlined sx={{ fontSize: 14 }} />}
                        sx={{
                          backgroundColor: 'rgba(255, 152, 0, 0.15)',
                          color: '#ffb74d',
                          fontSize: '0.65rem',
                          height: 22
                        }}
                      />
                    )}
                  </Box>
                  {hasMultipleUnits ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, minHeight: 300 }}>
                      <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', fontStyle: 'italic', mb: 1 }}>
                        Substances use different units. Showing separate chart for each unit.
                      </Typography>
                      {Object.entries(substancesByUnit).map(([unit, substances]) => {
                        const unitChartData = substances.map((substance, idx) => {
                          const substanceName = substance.id?.[0]?.name || `Substance ${idx + 1}`;
                          return {
                            substance: substanceName,
                            concentration: substance.concentration,
                          };
                        });
                        
                        return (
                          <Box key={unit} sx={{ mb: 2 }}>
                            <Typography variant="body2" sx={{ color: '#ffb74d', fontWeight: 600, mb: 2 }}>
                              {unit}
                            </Typography>
                            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                              <BarChart
                                dataset={unitChartData}
                                yAxis={[{
                                  scaleType: 'band',
                                  dataKey: 'substance',
                                  tickLabelStyle: {
                                    fontSize: 11,
                                    fill: '#fff'
                                  }
                                }]}
                                xAxis={[{
                                  label: `Concentration (${unit})`,
                                  labelStyle: {
                                    fill: '#fff',
                                    fontSize: 12
                                  },
                                  tickLabelStyle: {
                                    fill: '#fff',
                                    fontSize: 11
                                  }
                                }]}
                                series={[
                                  {
                                    dataKey: 'concentration',
                                    color: '#ff6b6b'
                                  }
                                ]}
                                layout="horizontal"
                                width={600}
                                height={Math.max(200, substances.length * 50)}
                                margin={{ left: 200, bottom: 40, top: 20, right: 40 }}
                                slotProps={{
                                  legend: {
                                    hidden: true
                                  }
                                }}
                                sx={{
                                  '& .MuiChartsAxis-line': {
                                    stroke: 'rgba(255, 255, 255, 0.3)'
                                  },
                                  '& .MuiChartsAxis-tick': {
                                    stroke: 'rgba(255, 255, 255, 0.3)'
                                  },
                                  '& .MuiChartsAxis-label': {
                                    fill: '#fff !important'
                                  },
                                  '& .MuiChartsAxis-tickLabel': {
                                    fill: '#fff !important'
                                  },
                                  '& text': {
                                    fill: '#fff !important',
                                    color: '#fff !important'
                                  },
                                  '& tspan': {
                                    fill: '#fff !important'
                                  }
                                }}
                              />
                            </Box>
                          </Box>
                        );
                      })}
                    </Box>
                  ) : (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
                      <BarChart
                        dataset={substancesChartData}
                        yAxis={[{
                          scaleType: 'band',
                          dataKey: 'substance',
                          tickLabelStyle: {
                            fontSize: 11,
                            fill: '#fff'
                          }
                        }]}
                        xAxis={[{
                          label: `Concentration (${primaryUnit})`,
                          labelStyle: {
                            fill: '#fff',
                            fontSize: 12
                          },
                          tickLabelStyle: {
                            fill: '#fff',
                            fontSize: 11
                          }
                        }]}
                        series={[
                          {
                            dataKey: 'concentration',
                            color: '#ff6b6b'
                          }
                        ]}
                        layout="horizontal"
                        width={600}
                        height={Math.max(300, materials.substancesOfConcern.content.length * 50)}
                        margin={{ left: 200, bottom: 40, top: 20, right: 40 }}
                        slotProps={{
                          legend: {
                            hidden: true
                          }
                        }}
                        sx={{
                          '& .MuiChartsAxis-line': {
                            stroke: 'rgba(255, 255, 255, 0.3)'
                          },
                          '& .MuiChartsAxis-tick': {
                            stroke: 'rgba(255, 255, 255, 0.3)'
                          },
                          '& text': {
                            fill: '#fff !important'
                          }
                        }}
                      />
                    </Box>
                  )}
                </Paper>
              </Grid2>
            )}
          </Grid2>
        </Box>
      )}

      {/* Substances of Concern Details */}
      {materials.substancesOfConcern?.applicable && materials.substancesOfConcern.content.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <Warning sx={{ color: '#ff9800', fontSize: 28 }} />
            <Typography variant="h5" sx={{ color: '#fff', fontWeight: 600 }}>
              Substances of Concern - Details
            </Typography>
          </Box>
          <Grid2 container spacing={{ xs: 1.5, sm: 2 }}>
            {materials.substancesOfConcern.content.map((substance, index) => (
              <SubstanceOfConcernCard key={index} substance={substance} index={index} />
            ))}
          </Grid2>
        </Box>
      )}

      {/* Material Composition Details */}
      {materials.materialComposition?.applicable && materials.materialComposition.content.length > 0 && (
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <Science sx={{ color: '#667eea', fontSize: 28 }} />
            <Typography variant="h5" sx={{ color: '#fff', fontWeight: 600 }}>
              Material Composition - Details
            </Typography>
            <Chip
              label={`${materials.materialComposition.content.length} materials`}
              size="small"
              sx={{
                backgroundColor: 'rgba(102, 126, 234, 0.15)',
                color: '#667eea',
                fontSize: '0.7rem',
                height: 24
              }}
            />
          </Box>
          <Grid2 container spacing={{ xs: 1.5, sm: 2 }}>
            {materials.materialComposition.content.map((material, index) => (
              <MaterialCompositionCard key={index} material={material} index={index} />
            ))}
          </Grid2>
        </Box>
      )}
    </Box>
  );
};

/**
 * Card component for Substance of Concern
 */
const SubstanceOfConcernCard: React.FC<{ substance: SubstanceOfConcern; index: number }> = ({ substance, index }) => {
  const [expanded, setExpanded] = useState(false);
  const [tooltipOpen, setTooltipOpen] = useState(false);

  const materialName = substance.id?.[0]?.name || `Substance ${index + 1}`;
  const materialId = substance.id?.[0]?.id || 'N/A';
  const materialType = substance.id?.[0]?.type || 'Unknown';

  const getSeverityColor = (category: string) => {
    if (category.includes('1')) return '#f44336';
    if (category.includes('2')) return '#ff9800';
    return '#ffc107';
  };

  return (
    <Grid2 size={{ xs: 12, lg: 6 }}>
      <Paper
        elevation={0}
        sx={{
          background: 'rgba(255, 152, 0, 0.05)',
          border: '1px solid rgba(255, 152, 0, 0.2)',
          borderRadius: 2,
          overflow: 'hidden',
          transition: 'all 0.2s ease',
          '&:hover': {
            borderColor: 'rgba(255, 152, 0, 0.4)',
            boxShadow: '0 4px 12px rgba(255, 152, 0, 0.2)'
          }
        }}
      >
        {/* Header */}
        <Box
          sx={{
            p: { xs: 2, sm: 2.5 },
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(255, 152, 0, 0.1)'
          }}
          onClick={() => setExpanded(!expanded)}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1, minWidth: 0 }}>
            <Box
              sx={{
                p: 1,
                borderRadius: 1.5,
                background: 'rgba(255, 152, 0, 0.2)',
                color: '#ff9800',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <Warning sx={{ fontSize: 22 }} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="h6"
                sx={{
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: { xs: '0.95rem', sm: '1.05rem' },
                  mb: 0.5,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {materialName}
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                {substance.id && substance.id.length > 0 ? (
                  substance.id.map((identifier, idx) => {
                    const firstIdName = substance.id[0]?.name;
                    const showName = substance.id.length > 1 && identifier.name && identifier.name !== firstIdName;
                    return (
                      <Chip
                        key={idx}
                        label={showName
                          ? `${identifier.type}: ${identifier.name} (${identifier.id})`
                          : `${identifier.type}: ${identifier.id}`
                        }
                        size="small"
                        sx={{
                          backgroundColor: 'rgba(255, 255, 255, 0.1)',
                          color: 'rgba(255, 255, 255, 0.9)',
                          fontSize: '0.65rem',
                          height: 20,
                          fontFamily: 'monospace',
                          '& .MuiChip-label': { px: 1, py: 0 }
                        }}
                      />
                    );
                  })
                ) : (
                  <Chip
                    label={`${materialType}: ${materialId}`}
                    size="small"
                    sx={{
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      color: 'rgba(255, 255, 255, 0.9)',
                      fontSize: '0.65rem',
                      height: 20,
                      fontFamily: 'monospace',
                      '& .MuiChip-label': { px: 1, py: 0 }
                    }}
                  />
                )}
                <Chip
                  label={substance.hazardClassification.category}
                  size="small"
                  sx={{
                    backgroundColor: getSeverityColor(substance.hazardClassification.category),
                    color: '#fff',
                    fontSize: '0.65rem',
                    height: 20,
                    fontWeight: 600,
                    '& .MuiChip-label': { px: 1, py: 0 }
                  }}
                />
              </Box>
            </Box>
          </Box>
          <IconButton size="small" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            {expanded ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        </Box>

        {/* Expandable Content */}
        <Collapse in={expanded}>
          <Box sx={{ p: { xs: 2, sm: 2.5 }, pt: 2 }}>
            {/* Hazard Classification */}
            <Box sx={{ mb: 2.5 }}>
              <Typography
                variant="caption"
                sx={{
                  color: 'rgba(255, 255, 255, 0.5)',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  mb: 1,
                  display: 'block'
                }}
              >
                Hazard Classification
              </Typography>
              <Paper
                elevation={0}
                sx={{
                  p: 1.5,
                  background: 'rgba(255, 152, 0, 0.1)',
                  border: '1px solid rgba(255, 152, 0, 0.2)',
                  borderRadius: 1
                }}
              >
                <Typography variant="body2" sx={{ color: '#fff', fontWeight: 600, mb: 0.5 }}>
                  {substance.hazardClassification.class}
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.875rem' }}>
                  {substance.hazardClassification.statement}
                </Typography>
              </Paper>
            </Box>

            {/* Concentration */}
            <Grid2 container spacing={2} sx={{ mb: 2.5 }}>
              <Grid2 size={{ xs: 6 }}>
                <Typography
                  variant="caption"
                  sx={{
                    color: 'rgba(255, 255, 255, 0.5)',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    mb: 0.5,
                    display: 'block'
                  }}
                >
                  Concentration
                </Typography>
                <Typography variant="body1" sx={{ color: '#fff', fontWeight: 600 }}>
                  {substance.concentration} {substance.unit?.replace('unit:', '')}
                </Typography>
              </Grid2>
              {substance.concentrationRange && substance.concentrationRange.length > 0 && (
                <Grid2 size={{ xs: 6 }}>
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'rgba(255, 255, 255, 0.5)',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      mb: 0.5,
                      display: 'block'
                    }}
                  >
                    Range
                  </Typography>
                  <Typography variant="body1" sx={{ color: '#fff', fontWeight: 600 }}>
                    {substance.concentrationRange[0].min} - {substance.concentrationRange[0].max}
                  </Typography>
                </Grid2>
              )}
            </Grid2>

            {/* Location */}
            {substance.location && (
              <Box sx={{ mb: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <LocationOn sx={{ fontSize: 16, color: 'rgba(255, 255, 255, 0.5)' }} />
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'rgba(255, 255, 255, 0.5)',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}
                  >
                    Location
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ color: '#fff', pl: 3 }}>
                  {substance.location}
                </Typography>
              </Box>
            )}

            {/* Exemption */}
            {substance.exemption && (
              <Box sx={{ mb: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <InfoOutlined sx={{ fontSize: 16, color: 'rgba(255, 255, 255, 0.5)' }} />
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'rgba(255, 255, 255, 0.5)',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}
                  >
                    Exemption
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.875rem', pl: 3 }}>
                  {substance.exemption}
                </Typography>
              </Box>
            )}

            {/* Documentation */}
            {substance.documentation && substance.documentation.length > 0 && (
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Description sx={{ fontSize: 16, color: 'rgba(255, 255, 255, 0.5)' }} />
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'rgba(255, 255, 255, 0.5)',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}
                  >
                    Documentation
                  </Typography>
                </Box>
                {substance.documentation.map((doc, idx) => (
                  <Link
                    key={idx}
                    href={doc.content}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{
                      color: '#667eea',
                      textDecoration: 'none',
                      display: 'block',
                      fontSize: '0.875rem',
                      pl: 3,
                      mb: 0.5,
                      '&:hover': { textDecoration: 'underline' }
                    }}
                  >
                    {doc.header}
                  </Link>
                ))}
              </Box>
            )}
          </Box>
        </Collapse>
      </Paper>
    </Grid2>
  );
};

/**
 * Card component for Material Composition
 */
const MaterialCompositionCard: React.FC<{ material: MaterialCompositionItem; index: number }> = ({ material, index }) => {
  const [expanded, setExpanded] = useState(false);

  const materialName = material.id?.[0]?.name || `Material ${index + 1}`;
  const materialId = material.id?.[0]?.id || 'N/A';
  const materialType = material.id?.[0]?.type || 'Unknown';
  
  const concentrationPercent = (material.concentration / 10000).toFixed(2);
  const recycledPercent = material.recycled;
  const renewablePercent = material.renewable;

  return (
    <Grid2 size={{ xs: 12, md: 6 }}>
      <Paper
        elevation={0}
        sx={{
          background: 'rgba(102, 126, 234, 0.05)',
          border: material.critical ? '1px solid rgba(255, 152, 0, 0.3)' : '1px solid rgba(102, 126, 234, 0.2)',
          borderRadius: 2,
          overflow: 'hidden',
          transition: 'all 0.2s ease',
          '&:hover': {
            borderColor: material.critical ? 'rgba(255, 152, 0, 0.5)' : 'rgba(102, 126, 234, 0.4)',
            boxShadow: material.critical ? '0 4px 12px rgba(255, 152, 0, 0.2)' : '0 4px 12px rgba(102, 126, 234, 0.2)'
          }
        }}
      >
        {/* Header */}
        <Box
          sx={{
            p: { xs: 2, sm: 2.5 },
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: material.critical ? 'rgba(255, 152, 0, 0.1)' : 'rgba(102, 126, 234, 0.1)'
          }}
          onClick={() => setExpanded(!expanded)}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1, minWidth: 0 }}>
            <Box
              sx={{
                p: 1,
                borderRadius: 1.5,
                background: material.critical ? 'rgba(255, 152, 0, 0.2)' : 'rgba(102, 126, 234, 0.2)',
                color: material.critical ? '#ff9800' : '#667eea',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <Science sx={{ fontSize: 22 }} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="h6"
                sx={{
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: { xs: '0.95rem', sm: '1.05rem' },
                  mb: 0.5,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {materialName}
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                {material.id && material.id.length > 0 ? (
                  material.id.map((identifier, idx) => {
                    const firstIdName = material.id[0]?.name;
                    const showName = material.id.length > 1 && identifier.name && identifier.name !== firstIdName;
                    return (
                      <Chip
                        key={idx}
                        label={showName
                          ? `${identifier.type}: ${identifier.name} (${identifier.id})`
                          : `${identifier.type}: ${identifier.id}`
                        }
                        size="small"
                        sx={{
                          backgroundColor: 'rgba(255, 255, 255, 0.1)',
                          color: 'rgba(255, 255, 255, 0.9)',
                          fontSize: '0.65rem',
                          height: 20,
                          fontFamily: 'monospace',
                          '& .MuiChip-label': { px: 1, py: 0 }
                        }}
                      />
                    );
                  })
                ) : (
                  <Chip
                    label={`${materialType}: ${materialId}`}
                    size="small"
                    sx={{
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      color: 'rgba(255, 255, 255, 0.9)',
                      fontSize: '0.65rem',
                      height: 20,
                      fontFamily: 'monospace',
                      '& .MuiChip-label': { px: 1, py: 0 }
                    }}
                  />
                )}
                <Chip
                  label={`${concentrationPercent}%`}
                  size="small"
                  sx={{
                    backgroundColor: 'rgba(102, 126, 234, 0.2)',
                    color: '#667eea',
                    fontSize: '0.65rem',
                    height: 20,
                    fontWeight: 600,
                    '& .MuiChip-label': { px: 1, py: 0 }
                  }}
                />
                {material.critical && (
                  <Chip
                    icon={<Warning sx={{ fontSize: 14 }} />}
                    label="Critical"
                    size="small"
                    sx={{
                      backgroundColor: 'rgba(255, 152, 0, 0.2)',
                      color: '#ff9800',
                      fontSize: '0.65rem',
                      height: 20,
                      fontWeight: 600,
                      '& .MuiChip-label': { px: 0.75, py: 0 },
                      '& .MuiChip-icon': { color: '#ff9800', fontSize: 14 }
                    }}
                  />
                )}
              </Box>
            </Box>
          </Box>
          <IconButton size="small" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            {expanded ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        </Box>

        {/* Expandable Content */}
        <Collapse in={expanded}>
          <Box sx={{ p: { xs: 2, sm: 2.5 }, pt: 2 }}>
            {/* Concentration */}
            <Box sx={{ mb: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography
                  variant="caption"
                  sx={{
                    color: 'rgba(255, 255, 255, 0.5)',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}
                >
                  Concentration
                </Typography>
                <Typography variant="body2" sx={{ color: '#fff', fontWeight: 600 }}>
                  {material.concentration} {material.unit?.replace('unit:', '')}
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={Math.min(parseFloat(concentrationPercent), 100)}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: '#667eea',
                    borderRadius: 4
                  }
                }}
              />
            </Box>

            {/* Recycled Content */}
            <Box sx={{ mb: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Recycling sx={{ fontSize: 16, color: '#4caf50' }} />
                <Typography
                  variant="caption"
                  sx={{
                    color: 'rgba(255, 255, 255, 0.5)',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    flex: 1
                  }}
                >
                  Recycled Content
                </Typography>
                <Typography variant="body2" sx={{ color: '#4caf50', fontWeight: 600 }}>
                  {recycledPercent}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={recycledPercent}
                sx={{
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: '#4caf50',
                    borderRadius: 3
                  }
                }}
              />
            </Box>

            {/* Renewable Content */}
            <Box sx={{ mb: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <EnergySavingsLeaf sx={{ fontSize: 16, color: '#66bb6a' }} />
                <Typography
                  variant="caption"
                  sx={{
                    color: 'rgba(255, 255, 255, 0.5)',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    flex: 1
                  }}
                >
                  Renewable Content
                </Typography>
                <Typography variant="body2" sx={{ color: '#66bb6a', fontWeight: 600 }}>
                  {renewablePercent}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={renewablePercent}
                sx={{
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: '#66bb6a',
                    borderRadius: 3
                  }
                }}
              />
            </Box>

            {/* Documentation */}
            {material.documentation && material.documentation.length > 0 && (
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Description sx={{ fontSize: 16, color: 'rgba(255, 255, 255, 0.5)' }} />
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'rgba(255, 255, 255, 0.5)',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}
                  >
                    Documentation
                  </Typography>
                </Box>
                {material.documentation.map((doc, idx) => (
                  <Link
                    key={idx}
                    href={doc.content}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{
                      color: '#667eea',
                      textDecoration: 'none',
                      display: 'block',
                      fontSize: '0.875rem',
                      pl: 3,
                      mb: 0.5,
                      '&:hover': { textDecoration: 'underline' }
                    }}
                  >
                    {doc.header}
                  </Link>
                ))}
              </Box>
            )}
          </Box>
        </Collapse>
      </Paper>
    </Grid2>
  );
};
