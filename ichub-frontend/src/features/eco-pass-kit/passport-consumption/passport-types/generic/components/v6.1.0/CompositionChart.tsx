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
import { Box, Typography, Paper, Chip } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { CheckCircle, Cancel } from '@mui/icons-material';

interface CompositionItem {
  name: string;
  value: number;
  unit?: string;
  color?: string;
  casNumber?: string;
  casType?: string;
  recycled?: number;
  renewable?: number;
  critical?: boolean;
  concentration?: number;
  unitRaw?: string;
  location?: string;
  exemption?: string;
  hazardClass?: string;
  hazardCategory?: string;
  hazardStatement?: string;
}

interface CriticalMaterial {
  name: string;
  percentage: number;
  origin?: string;
  certified?: boolean;
}

interface HazardousMaterial {
  name: string;
  casNumber?: string;
  concentration: number;
  location?: string;
  exemption?: string;
  hazardClass?: string;
  hazardCategory?: string;
  hazardStatement?: string;
  concentrationMin?: number | null;
  concentrationMax?: number | null;
  unit?: string;
}

interface MaterialDetail {
  name: string;
  percentage: number;
  casNumber?: string;
  recycled?: number;
  renewable?: number;
  critical?: boolean;
  unit?: string;
}

interface CompositionChartProps {
  title: string;
  items: CompositionItem[];
  compact?: boolean;
  additionalInfo?: {
    unit?: string;
    critical?: boolean;
    id?: Array<{ type: string; name: string; id: string }>;
    documentation?: Array<{ contentType: string; header: string; content: string }>;
  };
  criticalMaterials?: CriticalMaterial[];
  hazardousMaterials?: HazardousMaterial[];
  materialDetails?: MaterialDetail[];
}

const CHART_COLORS = [
  '#667eea',
  '#764ba2',
  '#f093fb',
  '#4facfe',
  '#43e97b',
  '#fa709a',
  '#fee140',
  '#30cfd0'
];

export const CompositionChart: React.FC<CompositionChartProps> = ({ title, items, compact = false, additionalInfo, criticalMaterials, hazardousMaterials, materialDetails }) => {
  // Calculate total
  const total = items.reduce((sum, item) => sum + item.value, 0);

  // Calculate percentages and add colors
  const itemsWithPercentages = items.map((item, index) => ({
    ...item,
    percentage: (item.value / total) * 100,
    color: item.color || CHART_COLORS[index % CHART_COLORS.length]
  }));

  // Sort by percentage descending
  const sortedItems = [...itemsWithPercentages].sort((a, b) => b.percentage - a.percentage);

  // In compact mode, show only top 3 items
  const displayItems = compact ? sortedItems.slice(0, 3) : sortedItems;

  // Calculate cumulative percentages for pie chart segments
  let cumulativePercentage = 0;
  const segments = sortedItems.map((item) => {
    const startPercentage = cumulativePercentage;
    cumulativePercentage += item.percentage;
    return {
      ...item,
      startPercentage,
      endPercentage: cumulativePercentage
    };
  });

  // Convert percentage to SVG path
  const getCoordinatesForPercent = (percent: number) => {
    const x = Math.cos(2 * Math.PI * percent - Math.PI / 2);
    const y = Math.sin(2 * Math.PI * percent - Math.PI / 2);
    return [x, y];
  };

  const createArc = (startPercent: number, endPercent: number) => {
    const start = getCoordinatesForPercent(startPercent / 100);
    const end = getCoordinatesForPercent(endPercent / 100);
    const largeArcFlag = endPercent - startPercent > 50 ? 1 : 0;

    return [
      `M ${start[0]} ${start[1]}`,
      `A 1 1 0 ${largeArcFlag} 1 ${end[0]} ${end[1]}`,
      'L 0 0'
    ].join(' ');
  };

  if (compact) {
    return (
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.75, sm: 1 }, mb: { xs: 1, sm: 1.5 } }}>
          <Typography
            variant="overline"
            sx={{
              color: 'rgba(255, 255, 255, 0.6)',
              fontWeight: 500,
              fontSize: { xs: '0.65rem', sm: '0.7rem' },
              letterSpacing: { xs: '0.3px', sm: '0.5px' }
            }}
          >
            {title}
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flex: 1 }}>
          {/* Compact Pie Chart */}
          <Box sx={{ width: { xs: 80, sm: 100 }, height: { xs: 80, sm: 100 }, flexShrink: 0 }}>
            <svg viewBox="-1 -1 2 2" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
              {segments.map((segment, index) => (
                <path
                  key={index}
                  d={createArc(segment.startPercentage, segment.endPercentage)}
                  fill={segment.color}
                  opacity={0.9}
                />
              ))}
            </svg>
          </Box>

          {/* Compact Legend */}
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: { xs: 0.5, sm: 0.75 } }}>
            {displayItems.map((item, index) => (
              <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: item.color,
                    flexShrink: 0
                  }}
                />
                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: { xs: '0.65rem', sm: '0.7rem' }, flex: 1 }}>
                  {item.name}
                </Typography>
                <Typography variant="caption" sx={{ color: '#fff', fontWeight: 600, fontSize: { xs: '0.65rem', sm: '0.7rem' } }}>
                  {item.percentage.toFixed(1)}%
                </Typography>
              </Box>
            ))}
            {sortedItems.length > 3 && (
              <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: { xs: '0.6rem', sm: '0.65rem' }, mt: 0.5 }}>
                +{sortedItems.length - 3} more
              </Typography>
            )}
          </Box>
        </Box>
      </Box>
    );
  }

  return (
    <Paper
      sx={{
        p: { xs: 2, sm: 3 },
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: 2
      }}
    >
      <Typography variant="h6" sx={{ mb: { xs: 2, sm: 3 }, color: '#fff', fontWeight: 600, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
        {title}
      </Typography>

      <Box sx={{ display: 'flex', gap: { xs: 2, sm: 4 }, alignItems: 'center', flexWrap: 'wrap', justifyContent: { xs: 'center', sm: 'flex-start' } }}>
        {/* Pie Chart */}
        <Box sx={{ flex: { xs: '1 1 150px', sm: '0 0 200px' }, maxWidth: { xs: '150px', sm: '200px' }, width: '100%' }}>
          <svg viewBox="-1 -1 2 2" style={{ transform: 'rotate(-90deg)' }}>
            {segments.map((segment, index) => (
              <path
                key={index}
                d={createArc(segment.startPercentage, segment.endPercentage)}
                fill={segment.color}
                opacity={0.9}
                style={{
                  transition: 'opacity 0.2s',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '1';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '0.9';
                }}
              />
            ))}
          </svg>
        </Box>

        {/* Legend */}
        <Box sx={{ flex: 1, minWidth: { xs: '100%', sm: 200 } }}>
          {sortedItems.map((item, index) => (
            <Box
              key={index}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                mb: { xs: 1, sm: 1.5 },
                p: { xs: 0.75, sm: 1 },
                borderRadius: 1,
                transition: 'background 0.2s',
                '&:hover': {
                  background: 'rgba(255, 255, 255, 0.05)'
                }
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 1.5 }, flex: 1 }}>
                <Box
                  sx={{
                    width: { xs: 10, sm: 12 },
                    height: { xs: 10, sm: 12 },
                    borderRadius: '50%',
                    bgcolor: item.color,
                    flexShrink: 0
                  }}
                />
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                  {item.name}
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'right', ml: { xs: 1, sm: 2 } }}>
                <Typography variant="body2" sx={{ color: '#fff', fontWeight: 600, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                  {item.percentage.toFixed(1)}%
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
                  {item.value} {item.unit || ''}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Material Details DataGrid - Only for Material Composition */}
      {!compact && title === "Material Composition" && materialDetails && materialDetails.length > 0 && (
        <Box sx={{ mt: 3, pt: 3, borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <Typography variant="subtitle2" sx={{ color: '#fff', fontWeight: 600, mb: 2, fontSize: { xs: '0.9rem', sm: '1rem' } }}>
            Material Details
          </Typography>
          <Box sx={{ height: 400, width: '100%' }}>
            <DataGrid
              rows={materialDetails.map((item, index) => ({ id: index, ...item }))}
              columns={[
                { 
                  field: 'name', 
                  headerName: 'Material Name', 
                  flex: 1.5,
                  minWidth: 150,
                  renderCell: (params) => (
                    <Typography variant="body2" sx={{ color: '#fff', fontWeight: 500 }}>
                      {params.value}
                    </Typography>
                  )
                },
                { 
                  field: 'percentage', 
                  headerName: 'Percentage', 
                  width: 120,
                  renderCell: (params) => (
                    <Chip
                      label={`${params.value.toFixed(1)}%`}
                      size="small"
                      sx={{
                        backgroundColor: 'rgba(102, 126, 234, 0.2)',
                        color: '#667eea',
                        fontWeight: 600
                      }}
                    />
                  )
                },
                { 
                  field: 'casNumber', 
                  headerName: 'CAS Number', 
                  width: 130,
                  renderCell: (params) => (
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                      {params.value || 'N/A'}
                    </Typography>
                  )
                },
                { 
                  field: 'recycled', 
                  headerName: 'Recycled %', 
                  width: 110,
                  renderCell: (params) => (
                    <Typography variant="body2" sx={{ color: params.value > 0 ? '#43e97b' : 'rgba(255, 255, 255, 0.5)', fontWeight: params.value > 0 ? 600 : 400 }}>
                      {params.value ? `${params.value}%` : '0%'}
                    </Typography>
                  )
                },
                { 
                  field: 'renewable', 
                  headerName: 'Renewable %', 
                  width: 120,
                  renderCell: (params) => (
                    <Typography variant="body2" sx={{ color: params.value > 0 ? '#43e97b' : 'rgba(255, 255, 255, 0.5)', fontWeight: params.value > 0 ? 600 : 400 }}>
                      {params.value ? `${params.value}%` : '0%'}
                    </Typography>
                  )
                },
                { 
                  field: 'critical', 
                  headerName: 'Critical', 
                  width: 100,
                  align: 'center',
                  headerAlign: 'center',
                  renderCell: (params) => params.value ? (
                    <Chip
                      label="Yes"
                      size="small"
                      sx={{
                        backgroundColor: 'rgba(250, 112, 154, 0.2)',
                        color: '#fa709a',
                        fontWeight: 600,
                        fontSize: '0.7rem'
                      }}
                    />
                  ) : (
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.4)' }}>
                      No
                    </Typography>
                  )
                }
              ] as GridColDef[]}
              disableRowSelectionOnClick
              hideFooter
              sx={{
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 2,
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                '& .MuiDataGrid-columnHeaders': {
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontSize: '0.8rem',
                  fontWeight: 600
                },
                '& .MuiDataGrid-columnHeader': {
                  color: 'rgba(255, 255, 255, 0.7)',
                  '&:focus': {
                    outline: 'none'
                  }
                },
                '& .MuiDataGrid-columnHeaderTitle': {
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontWeight: 600
                },
                '& .MuiDataGrid-iconSeparator': {
                  color: 'rgba(255, 255, 255, 0.1)'
                },
                '& .MuiDataGrid-sortIcon': {
                  color: 'rgba(255, 255, 255, 0.5)'
                },
                '& .MuiDataGrid-menuIcon': {
                  color: 'rgba(255, 255, 255, 0.5)'
                },
                '& .MuiDataGrid-cell': {
                  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                  color: '#fff',
                  '&:focus': {
                    outline: 'none'
                  }
                },
                '& .MuiDataGrid-row': {
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.05)'
                  },
                  '&.Mui-selected': {
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    '&:hover': {
                      backgroundColor: 'rgba(102, 126, 234, 0.15)'
                    }
                  }
                },
                '& .MuiCheckbox-root': {
                  color: 'rgba(255, 255, 255, 0.5)'
                },
                '& .MuiDataGrid-overlay': {
                  backgroundColor: 'rgba(0, 0, 0, 0.5)'
                },
                '& .MuiDataGrid-scrollbar': {
                  '&::-webkit-scrollbar': {
                    width: '8px',
                    height: '8px'
                  },
                  '&::-webkit-scrollbar-track': {
                    background: 'rgba(255, 255, 255, 0.05)'
                  },
                  '&::-webkit-scrollbar-thumb': {
                    background: 'rgba(255, 255, 255, 0.2)',
                    borderRadius: '4px',
                    '&:hover': {
                      background: 'rgba(255, 255, 255, 0.3)'
                    }
                  }
                }
              }}
            />
          </Box>
        </Box>
      )}

      {/* Substances of Concern Details DataGrid */}
      {!compact && title === "Substances of Concern" && hazardousMaterials && hazardousMaterials.length > 0 && (
        <Box sx={{ mt: 3, pt: 3, borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <Typography variant="subtitle2" sx={{ color: '#fff', fontWeight: 600, mb: 2, fontSize: { xs: '0.9rem', sm: '1rem' } }}>
            Substance Details
          </Typography>
          <Box sx={{ height: 400, width: '100%' }}>
            <DataGrid
              rows={hazardousMaterials.map((item, index) => ({ id: index, ...item }))}
              columns={[
                { 
                  field: 'name', 
                  headerName: 'Substance Name', 
                  flex: 1.5,
                  minWidth: 150,
                  renderCell: (params) => (
                    <Typography variant="body2" sx={{ color: '#fff', fontWeight: 500 }}>
                      {params.value}
                    </Typography>
                  )
                },
                { 
                  field: 'casNumber', 
                  headerName: 'CAS Number', 
                  width: 130,
                  renderCell: (params) => (
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                      {params.value || 'N/A'}
                    </Typography>
                  )
                },
                { 
                  field: 'concentration', 
                  headerName: 'Concentration', 
                  width: 130,
                  renderCell: (params) => (
                    <Chip
                      label={`${params.value} ppm`}
                      size="small"
                      sx={{
                        backgroundColor: 'rgba(250, 112, 154, 0.2)',
                        color: '#fa709a',
                        fontWeight: 600
                      }}
                    />
                  )
                },
                { 
                  field: 'concentrationRange', 
                  headerName: 'Concentration Range', 
                  width: 160,
                  renderCell: (params) => {
                    const min = params.row.concentrationMin;
                    const max = params.row.concentrationMax;
                    if (min !== null && min !== undefined && max !== null && max !== undefined) {
                      return (
                        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.75rem' }}>
                          {min} - {max} ppm
                        </Typography>
                      );
                    }
                    return (
                      <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.4)' }}>
                        N/A
                      </Typography>
                    );
                  }
                },
                { 
                  field: 'location', 
                  headerName: 'Location', 
                  flex: 1,
                  minWidth: 120,
                  renderCell: (params) => (
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                      {params.value || 'N/A'}
                    </Typography>
                  )
                },
                { 
                  field: 'hazardClass', 
                  headerName: 'Hazard Class', 
                  flex: 1.2,
                  minWidth: 140,
                  renderCell: (params) => (
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.75rem' }}>
                      {params.value || 'N/A'}
                    </Typography>
                  )
                },
                { 
                  field: 'hazardCategory', 
                  headerName: 'Category', 
                  width: 110,
                  renderCell: (params) => (
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.75rem' }}>
                      {params.value || 'N/A'}
                    </Typography>
                  )
                },
                { 
                  field: 'hazardStatement', 
                  headerName: 'Hazard Statement', 
                  flex: 1.5,
                  minWidth: 180,
                  renderCell: (params) => (
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.75rem' }}>
                      {params.value || 'N/A'}
                    </Typography>
                  )
                },
                { 
                  field: 'exemption', 
                  headerName: 'Exemption', 
                  flex: 1.3,
                  minWidth: 150,
                  renderCell: (params) => (
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.75rem' }}>
                      {params.value || 'N/A'}
                    </Typography>
                  )
                }
              ] as GridColDef[]}
              disableRowSelectionOnClick
              hideFooter
              sx={{
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 2,
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                '& .MuiDataGrid-columnHeaders': {
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontSize: '0.8rem',
                  fontWeight: 600
                },
                '& .MuiDataGrid-columnHeader': {
                  color: 'rgba(255, 255, 255, 0.7)',
                  '&:focus': {
                    outline: 'none'
                  }
                },
                '& .MuiDataGrid-columnHeaderTitle': {
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontWeight: 600
                },
                '& .MuiDataGrid-iconSeparator': {
                  color: 'rgba(255, 255, 255, 0.1)'
                },
                '& .MuiDataGrid-sortIcon': {
                  color: 'rgba(255, 255, 255, 0.5)'
                },
                '& .MuiDataGrid-menuIcon': {
                  color: 'rgba(255, 255, 255, 0.5)'
                },
                '& .MuiDataGrid-cell': {
                  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                  color: '#fff',
                  '&:focus': {
                    outline: 'none'
                  }
                },
                '& .MuiDataGrid-row': {
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.05)'
                  },
                  '&.Mui-selected': {
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    '&:hover': {
                      backgroundColor: 'rgba(102, 126, 234, 0.15)'
                    }
                  }
                },
                '& .MuiCheckbox-root': {
                  color: 'rgba(255, 255, 255, 0.5)'
                },
                '& .MuiDataGrid-overlay': {
                  backgroundColor: 'rgba(0, 0, 0, 0.5)'
                },
                '& .MuiDataGrid-scrollbar': {
                  '&::-webkit-scrollbar': {
                    width: '8px',
                    height: '8px'
                  },
                  '&::-webkit-scrollbar-track': {
                    background: 'rgba(255, 255, 255, 0.05)'
                  },
                  '&::-webkit-scrollbar-thumb': {
                    background: 'rgba(255, 255, 255, 0.2)',
                    borderRadius: '4px',
                    '&:hover': {
                      background: 'rgba(255, 255, 255, 0.3)'
                    }
                  }
                }
              }}
            />
          </Box>
        </Box>
      )}
      
      {/* Additional Information - Only shown in full (non-compact) mode */}
      {additionalInfo && Object.keys(additionalInfo).length > 0 && (
        <Box sx={{ mt: 3, pt: 3, borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <Typography variant="subtitle2" sx={{ color: '#fff', fontWeight: 600, mb: 2, fontSize: { xs: '0.9rem', sm: '1rem' } }}>
            Additional Information
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {additionalInfo.id && Array.isArray(additionalInfo.id) && additionalInfo.id.length > 0 && (
              <Box sx={{ 
                p: 1.5, 
                background: 'rgba(255, 255, 255, 0.03)', 
                borderRadius: 1.5,
                border: '1px solid rgba(255, 255, 255, 0.08)'
              }}>
                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.7rem', display: 'block', mb: 0.5 }}>
                  Material ID
                </Typography>
                <Typography variant="body2" sx={{ color: '#fff', fontSize: '0.875rem' }}>
                  {additionalInfo.id[0].name}
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.7rem', display: 'block', mt: 0.5 }}>
                  {additionalInfo.id[0].type}: {additionalInfo.id[0].id}
                </Typography>
              </Box>
            )}
            {additionalInfo.unit && (
              <Box sx={{ 
                p: 1.5, 
                background: 'rgba(255, 255, 255, 0.03)', 
                borderRadius: 1.5,
                border: '1px solid rgba(255, 255, 255, 0.08)'
              }}>
                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.7rem', display: 'block', mb: 0.5 }}>
                  Unit
                </Typography>
                <Typography variant="body2" sx={{ color: '#fff', fontSize: '0.875rem' }}>
                  {additionalInfo.unit}
                </Typography>
              </Box>
            )}
            {additionalInfo.critical !== undefined && (
              <Box sx={{ 
                p: 1.5, 
                background: additionalInfo.critical ? 'rgba(250, 112, 154, 0.1)' : 'rgba(255, 255, 255, 0.03)', 
                borderRadius: 1.5,
                border: `1px solid ${additionalInfo.critical ? 'rgba(250, 112, 154, 0.3)' : 'rgba(255, 255, 255, 0.08)'}`
              }}>
                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.7rem', display: 'block', mb: 0.5 }}>
                  Critical Material
                </Typography>
                <Typography variant="body2" sx={{ 
                  color: additionalInfo.critical ? '#fa709a' : '#fff', 
                  fontSize: '0.875rem',
                  fontWeight: additionalInfo.critical ? 600 : 400 
                }}>
                  {additionalInfo.critical ? 'Yes' : 'No'}
                </Typography>
              </Box>
            )}
            {additionalInfo.documentation && Array.isArray(additionalInfo.documentation) && additionalInfo.documentation.length > 0 && (
              <Box sx={{ 
                p: 1.5, 
                background: 'rgba(255, 255, 255, 0.03)', 
                borderRadius: 1.5,
                border: '1px solid rgba(255, 255, 255, 0.08)'
              }}>
                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.7rem', display: 'block', mb: 0.5 }}>
                  Documentation
                </Typography>
                {additionalInfo.documentation.map((doc: any, idx: number) => (
                  <Box key={idx} sx={{ mt: idx > 0 ? 1 : 0 }}>
                    <Typography variant="body2" sx={{ color: '#fff', fontSize: '0.875rem', mb: 0.25 }}>
                      {doc.header}
                    </Typography>
                    <Typography 
                      variant="caption" 
                      component="a"
                      href={doc.content}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{ 
                        color: '#4a90e2',
                        fontSize: '0.7rem',
                        textDecoration: 'none',
                        '&:hover': {
                          textDecoration: 'underline'
                        }
                      }}
                    >
                      {doc.content}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        </Box>
      )}

      {/* Critical Raw Materials Section - Only shown in full (non-compact) mode */}
      {!compact && criticalMaterials && Array.isArray(criticalMaterials) && criticalMaterials.length > 0 && (
        <Box sx={{ mt: 3, pt: 3, borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <Typography variant="subtitle2" sx={{ color: '#fff', fontWeight: 600, mb: 2, fontSize: { xs: '0.9rem', sm: '1rem' } }}>
            Critical Raw Materials
          </Typography>
          
          {/* Mini Pie Chart for Critical Materials */}
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
            <svg width="200" height="200" viewBox="0 0 200 200">
              {(() => {
                const total = criticalMaterials.reduce((sum, m) => sum + m.percentage, 0);
                let currentAngle = -90;
                return criticalMaterials.map((material, index) => {
                  const percentage = (material.percentage / total) * 100;
                  const angle = (percentage / 100) * 360;
                  const startAngle = currentAngle;
                  const endAngle = currentAngle + angle;
                  currentAngle = endAngle;

                  const startRad = (startAngle * Math.PI) / 180;
                  const endRad = (endAngle * Math.PI) / 180;
                  const x1 = 100 + 80 * Math.cos(startRad);
                  const y1 = 100 + 80 * Math.sin(startRad);
                  const x2 = 100 + 80 * Math.cos(endRad);
                  const y2 = 100 + 80 * Math.sin(endRad);
                  const largeArc = angle > 180 ? 1 : 0;

                  return (
                    <path
                      key={index}
                      d={`M 100 100 L ${x1} ${y1} A 80 80 0 ${largeArc} 1 ${x2} ${y2} Z`}
                      fill={CHART_COLORS[index % CHART_COLORS.length]}
                      opacity="0.9"
                    />
                  );
                });
              })()}
            </svg>
          </Box>

          {/* DataGrid for Critical Materials */}
          <Box sx={{ height: 300, width: '100%' }}>
            <DataGrid
              rows={criticalMaterials.map((material, index) => ({ id: index, ...material }))}
              columns={[
                { 
                  field: 'name', 
                  headerName: 'Material', 
                  flex: 1,
                  renderCell: (params) => (
                    <Typography variant="body2" sx={{ color: '#fff', fontWeight: 500 }}>
                      {params.value}
                    </Typography>
                  )
                },
                { 
                  field: 'percentage', 
                  headerName: 'Percentage', 
                  width: 150,
                  renderCell: (params) => (
                    <Chip
                      label={`${params.value.toFixed(1)}%`}
                      size="small"
                      sx={{
                        backgroundColor: 'rgba(102, 126, 234, 0.2)',
                        color: '#667eea',
                        fontWeight: 600
                      }}
                    />
                  )
                },
                { 
                  field: 'origin', 
                  headerName: 'Origin', 
                  flex: 1,
                  renderCell: (params) => (
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                      {params.value || 'N/A'}
                    </Typography>
                  )
                },
                { 
                  field: 'certified', 
                  headerName: 'Certified', 
                  width: 120,
                  align: 'center',
                  headerAlign: 'center',
                  renderCell: (params) => params.value ? (
                    <CheckCircle sx={{ color: '#43e97b', fontSize: 20 }} />
                  ) : (
                    <Cancel sx={{ color: 'rgba(255, 255, 255, 0.3)', fontSize: 20 }} />
                  )
                }
              ] as GridColDef[]}
              disableRowSelectionOnClick
              hideFooter
              sx={{
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 2,
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                '& .MuiDataGrid-columnHeaders': {
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontSize: '0.8rem',
                  fontWeight: 600
                },
                '& .MuiDataGrid-columnHeader': {
                  color: 'rgba(255, 255, 255, 0.7)',
                  '&:focus': {
                    outline: 'none'
                  }
                },
                '& .MuiDataGrid-columnHeaderTitle': {
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontWeight: 600
                },
                '& .MuiDataGrid-iconSeparator': {
                  color: 'rgba(255, 255, 255, 0.1)'
                },
                '& .MuiDataGrid-sortIcon': {
                  color: 'rgba(255, 255, 255, 0.5)'
                },
                '& .MuiDataGrid-menuIcon': {
                  color: 'rgba(255, 255, 255, 0.5)'
                },
                '& .MuiDataGrid-cell': {
                  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                  color: '#fff',
                  '&:focus': {
                    outline: 'none'
                  }
                },
                '& .MuiDataGrid-row': {
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.05)'
                  },
                  '&.Mui-selected': {
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    '&:hover': {
                      backgroundColor: 'rgba(102, 126, 234, 0.15)'
                    }
                  }
                },
                '& .MuiCheckbox-root': {
                  color: 'rgba(255, 255, 255, 0.5)'
                },
                '& .MuiDataGrid-overlay': {
                  backgroundColor: 'rgba(0, 0, 0, 0.5)'
                },
                '& .MuiDataGrid-scrollbar': {
                  '&::-webkit-scrollbar': {
                    width: '8px',
                    height: '8px'
                  },
                  '&::-webkit-scrollbar-track': {
                    background: 'rgba(255, 255, 255, 0.05)'
                  },
                  '&::-webkit-scrollbar-thumb': {
                    background: 'rgba(255, 255, 255, 0.2)',
                    borderRadius: '4px',
                    '&:hover': {
                      background: 'rgba(255, 255, 255, 0.3)'
                    }
                  }
                }
              }}
            />
          </Box>
        </Box>
      )}

      {/* Substances of Concern Section - Only shown in full (non-compact) mode */}
      {!compact && hazardousMaterials && Array.isArray(hazardousMaterials) && hazardousMaterials.length > 0 && (
        <Box sx={{ mt: 3, pt: 3, borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <Typography variant="subtitle2" sx={{ color: '#fff', fontWeight: 600, mb: 2, fontSize: { xs: '0.9rem', sm: '1rem' } }}>
            Substances of Concern
          </Typography>
          
          {/* Mini Pie Chart for Hazardous Materials */}
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
            <svg width="200" height="200" viewBox="0 0 200 200">
              {(() => {
                const total = hazardousMaterials.reduce((sum, m) => sum + m.concentration, 0);
                let currentAngle = -90;
                return hazardousMaterials.map((material, index) => {
                  const percentage = (material.concentration / total) * 100;
                  const angle = (percentage / 100) * 360;
                  const startAngle = currentAngle;
                  const endAngle = currentAngle + angle;
                  currentAngle = endAngle;

                  const startRad = (startAngle * Math.PI) / 180;
                  const endRad = (endAngle * Math.PI) / 180;
                  const x1 = 100 + 80 * Math.cos(startRad);
                  const y1 = 100 + 80 * Math.sin(startRad);
                  const x2 = 100 + 80 * Math.cos(endRad);
                  const y2 = 100 + 80 * Math.sin(endRad);
                  const largeArc = angle > 180 ? 1 : 0;

                  return (
                    <path
                      key={index}
                      d={`M 100 100 L ${x1} ${y1} A 80 80 0 ${largeArc} 1 ${x2} ${y2} Z`}
                      fill={CHART_COLORS[index % CHART_COLORS.length]}
                      opacity="0.9"
                    />
                  );
                });
              })()}
            </svg>
          </Box>

          {/* DataGrid for Hazardous Materials */}
          <Box sx={{ height: 200, width: '100%' }}>
            <DataGrid
              rows={hazardousMaterials.map((material, index) => ({ id: index, ...material }))}
              columns={[
                { 
                  field: 'name', 
                  headerName: 'Substance Name', 
                  flex: 1,
                  renderCell: (params) => (
                    <Typography variant="body2" sx={{ color: '#fff', fontWeight: 500 }}>
                      {params.value}
                    </Typography>
                  )
                },
                { 
                  field: 'casNumber', 
                  headerName: 'CAS Number', 
                  width: 150,
                  renderCell: (params) => (
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', fontFamily: 'monospace' }}>
                      {params.value || 'N/A'}
                    </Typography>
                  )
                },
                { 
                  field: 'concentration', 
                  headerName: 'Concentration (%)', 
                  width: 180,
                  renderCell: (params) => (
                    <Chip
                      label={`${params.value.toFixed(2)}%`}
                      size="small"
                      sx={{
                        backgroundColor: 'rgba(250, 112, 154, 0.2)',
                        color: '#fa709a',
                        fontWeight: 600
                      }}
                    />
                  )
                }
              ] as GridColDef[]}
              disableRowSelectionOnClick
              hideFooter
              sx={{
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 2,
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                '& .MuiDataGrid-columnHeaders': {
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontSize: '0.8rem',
                  fontWeight: 600
                },
                '& .MuiDataGrid-columnHeader': {
                  color: 'rgba(255, 255, 255, 0.7)',
                  '&:focus': {
                    outline: 'none'
                  }
                },
                '& .MuiDataGrid-columnHeaderTitle': {
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontWeight: 600
                },
                '& .MuiDataGrid-iconSeparator': {
                  color: 'rgba(255, 255, 255, 0.1)'
                },
                '& .MuiDataGrid-sortIcon': {
                  color: 'rgba(255, 255, 255, 0.5)'
                },
                '& .MuiDataGrid-menuIcon': {
                  color: 'rgba(255, 255, 255, 0.5)'
                },
                '& .MuiDataGrid-cell': {
                  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                  color: '#fff',
                  '&:focus': {
                    outline: 'none'
                  }
                },
                '& .MuiDataGrid-row': {
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.05)'
                  },
                  '&.Mui-selected': {
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    '&:hover': {
                      backgroundColor: 'rgba(102, 126, 234, 0.15)'
                    }
                  }
                },
                '& .MuiCheckbox-root': {
                  color: 'rgba(255, 255, 255, 0.5)'
                },
                '& .MuiDataGrid-overlay': {
                  backgroundColor: 'rgba(0, 0, 0, 0.5)'
                },
                '& .MuiDataGrid-scrollbar': {
                  '&::-webkit-scrollbar': {
                    width: '8px',
                    height: '8px'
                  },
                  '&::-webkit-scrollbar-track': {
                    background: 'rgba(255, 255, 255, 0.05)'
                  },
                  '&::-webkit-scrollbar-thumb': {
                    background: 'rgba(255, 255, 255, 0.2)',
                    borderRadius: '4px',
                    '&:hover': {
                      background: 'rgba(255, 255, 255, 0.3)'
                    }
                  }
                }
              }}
            />
          </Box>
        </Box>
      )}
    </Paper>
  );
};
