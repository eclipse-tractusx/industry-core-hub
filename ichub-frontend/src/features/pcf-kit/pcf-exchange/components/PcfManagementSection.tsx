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
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  LinearProgress,
  Tooltip,
  Alert,
  alpha
} from '@mui/material';
import {
  CloudUpload,
  Edit,
  Visibility,
  CheckCircle,
  Info,
  Co2,
  CalendarMonth,
  Public,
  Speed,
  Publish,
  DraftsOutlined
} from '@mui/icons-material';
import { ManagedPart, PcfDataRecord } from '../api/pcfExchangeApi';

// PCF Green Theme
const PCF_PRIMARY = '#10b981';
const PCF_SECONDARY = '#059669';

interface PcfManagementSectionProps {
  part: ManagedPart;
  pcfData: PcfDataRecord | null;
  onUpload: () => void;
  onEdit: () => void;
  onVisualize: () => void;
  onPublish: () => void;
  isLoading?: boolean;
}

const PcfManagementSection: React.FC<PcfManagementSectionProps> = ({
  part,
  pcfData,
  onUpload,
  onEdit,
  onVisualize,
  onPublish,
  isLoading = false
}) => {
  const hasPcf = part.hasPcf && pcfData;
  const isDraft = pcfData?.status === 'DRAFT';
  const isPublished = pcfData?.status === 'PUBLISHED';

  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString([], {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // PCF Values display
  const renderPcfValues = () => {
    if (!pcfData) return null;

    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: 2,
          p: 2,
          borderRadius: '12px',
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.06)'
        }}
      >
        {/* PCF Value (excl. biogenic) */}
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
            <Co2 sx={{ fontSize: 14, color: PCF_PRIMARY }} />
            <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
              PCF (excl. biogenic)
            </Typography>
          </Box>
          <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700 }}>
            {pcfData.pcfExcludingBiogenic.toFixed(1)}
            <Typography component="span" variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)', ml: 0.5 }}>
              kg CO2e
            </Typography>
          </Typography>
        </Box>

        {/* PCF Value (incl. biogenic) */}
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
            <Co2 sx={{ fontSize: 14, color: '#3b82f6' }} />
            <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
              PCF (incl. biogenic)
            </Typography>
          </Box>
          <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700 }}>
            {pcfData.pcfIncludingBiogenic.toFixed(1)}
            <Typography component="span" variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)', ml: 0.5 }}>
              kg CO2e
            </Typography>
          </Typography>
        </Box>

        {/* Primary Data Share */}
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
            <Speed sx={{ fontSize: 14, color: '#a855f7' }} />
            <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
              Primary Data
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700 }}>
              {pcfData.primaryDataShare.toFixed(0)}%
            </Typography>
            <LinearProgress
              variant="determinate"
              value={pcfData.primaryDataShare}
              sx={{
                flex: 1,
                height: 6,
                borderRadius: 3,
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 3,
                  backgroundColor:
                    pcfData.primaryDataShare >= 70
                      ? PCF_PRIMARY
                      : pcfData.primaryDataShare >= 50
                      ? '#eab308'
                      : '#ef4444'
                }
              }}
            />
          </Box>
        </Box>

        {/* Geography */}
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
            <Public sx={{ fontSize: 14, color: '#f97316' }} />
            <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
              Geography
            </Typography>
          </Box>
          <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700 }}>
            {pcfData.geographyCountry}
          </Typography>
        </Box>
      </Box>
    );
  };

  // Metadata section
  const renderMetadata = () => {
    if (!pcfData) return null;

    return (
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 2,
          mt: 2,
          pt: 2,
          borderTop: '1px solid rgba(255, 255, 255, 0.06)'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <CalendarMonth sx={{ fontSize: 14, color: 'rgba(255, 255, 255, 0.4)' }} />
          <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
            Reference: {formatDate(pcfData.referencePeriodStart)} - {formatDate(pcfData.referencePeriodEnd)}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Info sx={{ fontSize: 14, color: 'rgba(255, 255, 255, 0.4)' }} />
          <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
            Spec Version: {pcfData.specVersion}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Tooltip title={`Created: ${formatDate(pcfData.created)}, Updated: ${formatDate(pcfData.updated)}`}>
            <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)', cursor: 'help' }}>
              Version {pcfData.version}
            </Typography>
          </Tooltip>
        </Box>
      </Box>
    );
  };

  return (
    <Card
      sx={{
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '16px',
        mb: 3
      }}
    >
      <CardContent sx={{ p: 3 }}>
        {/* Section Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                p: 1,
                borderRadius: '8px',
                background: alpha(PCF_PRIMARY, 0.15)
              }}
            >
              <Co2 sx={{ color: PCF_PRIMARY }} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600 }}>
                PCF Management
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                Manage Product Carbon Footprint data for this part
              </Typography>
            </Box>
          </Box>

          {/* Status Badge */}
          {hasPcf && (
            <Chip
              icon={
                isPublished ? (
                  <CheckCircle sx={{ fontSize: 14 }} />
                ) : (
                  <DraftsOutlined sx={{ fontSize: 14 }} />
                )
              }
              label={isPublished ? 'Published' : 'Draft'}
              size="small"
              sx={{
                backgroundColor: isPublished
                  ? alpha(PCF_PRIMARY, 0.15)
                  : alpha('#eab308', 0.15),
                color: isPublished ? PCF_PRIMARY : '#eab308',
                border: `1px solid ${alpha(isPublished ? PCF_PRIMARY : '#eab308', 0.3)}`,
                fontWeight: 600,
                '& .MuiChip-icon': {
                  color: isPublished ? PCF_PRIMARY : '#eab308'
                }
              }}
            />
          )}
        </Box>

        {/* Loading State */}
        {isLoading && (
          <Box sx={{ mb: 3 }}>
            <LinearProgress
              sx={{
                borderRadius: 2,
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                '& .MuiLinearProgress-bar': {
                  backgroundColor: PCF_PRIMARY
                }
              }}
            />
          </Box>
        )}

        {/* No PCF Data */}
        {!hasPcf && !isLoading && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 2
              }}
            >
              <CloudUpload sx={{ fontSize: 28, color: 'rgba(255, 255, 255, 0.3)' }} />
            </Box>
            <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 1 }}>
              No PCF data available
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.4)', display: 'block', mb: 3 }}>
              Upload PCF data to respond to customer requests
            </Typography>
            <Button
              variant="contained"
              startIcon={<CloudUpload />}
              onClick={onUpload}
              sx={{
                px: 4,
                py: 1.5,
                borderRadius: '10px',
                textTransform: 'none',
                fontWeight: 600,
                background: `linear-gradient(135deg, ${PCF_PRIMARY} 0%, ${PCF_SECONDARY} 100%)`,
                '&:hover': {
                  background: `linear-gradient(135deg, ${PCF_SECONDARY} 0%, ${PCF_PRIMARY} 100%)`
                }
              }}
            >
              Upload PCF Data
            </Button>
          </Box>
        )}

        {/* Has PCF Data */}
        {hasPcf && !isLoading && (
          <>
            {/* PCF Values */}
            {renderPcfValues()}

            {/* Metadata */}
            {renderMetadata()}

            {/* Draft Alert */}
            {isDraft && (
              <Alert
                severity="warning"
                icon={<DraftsOutlined />}
                sx={{
                  mt: 2,
                  borderRadius: '10px',
                  backgroundColor: alpha('#eab308', 0.1),
                  border: `1px solid ${alpha('#eab308', 0.2)}`,
                  '& .MuiAlert-icon': {
                    color: '#eab308'
                  },
                  '& .MuiAlert-message': {
                    color: '#eab308'
                  }
                }}
              >
                <Typography variant="body2" sx={{ color: '#eab308' }}>
                  This PCF is in draft status. Publish it to make it available for sharing with customers.
                </Typography>
              </Alert>
            )}

            {/* Action Buttons */}
            <Box sx={{ display: 'flex', gap: 1.5, mt: 3 }}>
              <Button
                variant="outlined"
                startIcon={<Visibility />}
                onClick={onVisualize}
                sx={{
                  flex: 1,
                  py: 1.25,
                  borderRadius: '10px',
                  textTransform: 'none',
                  fontWeight: 600,
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                  color: 'rgba(255, 255, 255, 0.8)',
                  '&:hover': {
                    borderColor: PCF_PRIMARY,
                    backgroundColor: alpha(PCF_PRIMARY, 0.1),
                    color: '#fff',
                    '& .MuiSvgIcon-root': { color: PCF_PRIMARY }
                  }
                }}
              >
                View Details
              </Button>
              <Button
                variant="outlined"
                startIcon={<Edit />}
                onClick={onEdit}
                sx={{
                  flex: 1,
                  py: 1.25,
                  borderRadius: '10px',
                  textTransform: 'none',
                  fontWeight: 600,
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                  color: 'rgba(255, 255, 255, 0.8)',
                  '&:hover': {
                    borderColor: '#3b82f6',
                    backgroundColor: alpha('#3b82f6', 0.1),
                    color: '#fff',
                    '& .MuiSvgIcon-root': { color: '#3b82f6' }
                  }
                }}
              >
                Update
              </Button>
              {isDraft && (
                <Button
                  variant="contained"
                  startIcon={<Publish />}
                  onClick={onPublish}
                  sx={{
                    flex: 1,
                    py: 1.25,
                    borderRadius: '10px',
                    textTransform: 'none',
                    fontWeight: 600,
                    background: `linear-gradient(135deg, ${PCF_PRIMARY} 0%, ${PCF_SECONDARY} 100%)`,
                    '&:hover': {
                      background: `linear-gradient(135deg, ${PCF_SECONDARY} 0%, ${PCF_PRIMARY} 100%)`
                    }
                  }}
                >
                  Publish
                </Button>
              )}
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default PcfManagementSection;
