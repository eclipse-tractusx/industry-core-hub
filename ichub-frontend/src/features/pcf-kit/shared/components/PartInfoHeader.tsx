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
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  alpha,
  Tooltip
} from '@mui/material';
import { OpenInNew } from '@mui/icons-material';

// PCF Green Theme
const PCF_PRIMARY = '#10b981';

export interface PartInfoHeaderProps {
  /**
   * The manufacturer ID (BPN) of the part
   */
  manufacturerId: string;
  /**
   * The manufacturer part ID
   */
  manufacturerPartId: string;
  /**
   * The display name of the part
   */
  partName: string;
  /**
   * Whether to hide the component on small screens
   * @default true
   */
  hideOnSmallScreens?: boolean;
  /**
   * Override the default navigation URL
   */
  customNavigationUrl?: string;
}

/**
 * PartInfoHeader - A reusable component that displays part information
 * in the header area and provides navigation to the part details page.
 * 
 * Used in PCF Management and PCF Precalculation pages.
 */
export const PartInfoHeader: React.FC<PartInfoHeaderProps> = ({
  manufacturerId,
  manufacturerPartId,
  partName,
  hideOnSmallScreens = true,
  customNavigationUrl
}) => {
  const navigate = useNavigate();
  const { t } = useTranslation('pcf');

  const handleClick = () => {
    const url = customNavigationUrl || `/product/${encodeURIComponent(manufacturerId)}/${encodeURIComponent(manufacturerPartId)}`;
    navigate(url);
  };

  return (
    <Tooltip title={t('partInfoHeader.viewDetails')} placement="bottom">
      <Box 
        onClick={handleClick}
        sx={{ 
          cursor: 'pointer',
          p: 1.5,
          borderRadius: '10px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          transition: 'all 0.2s ease',
          display: hideOnSmallScreens ? { xs: 'none', md: 'block' } : 'block',
          '&:hover': { 
            background: alpha(PCF_PRIMARY, 0.08),
            borderColor: alpha(PCF_PRIMARY, 0.2),
            '& .open-icon': {
              opacity: 1
            }
          }
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          {/* Manufacturer ID (BPN) */}
          <Box>
            <Typography 
              variant="caption" 
              sx={{ 
                color: 'rgba(255,255,255,0.5)', 
                fontSize: '0.7rem', 
                textTransform: 'uppercase', 
                letterSpacing: 0.5 
              }}
            >
              {t('partInfoHeader.manufacturerId')}
            </Typography>
            <Typography 
              variant="body2" 
              sx={{ 
                color: 'rgba(255,255,255,0.8)', 
                fontWeight: 500, 
                fontFamily: 'monospace',
                fontSize: '0.75rem'
              }}
            >
              {manufacturerId || 'N/A'}
            </Typography>
          </Box>

          {/* Divider */}
          <Box sx={{ 
            borderLeft: '1px solid rgba(255,255,255,0.1)', 
            height: 32,
            display: { xs: 'none', lg: 'block' }
          }} />

          {/* Manufacturer Part ID */}
          <Box>
            <Typography 
              variant="caption" 
              sx={{ 
                color: 'rgba(255,255,255,0.5)', 
                fontSize: '0.7rem', 
                textTransform: 'uppercase', 
                letterSpacing: 0.5 
              }}
            >
              {t('partInfoHeader.manufacturerPartId')}
            </Typography>
            <Typography 
              variant="body2" 
              sx={{ 
                color: PCF_PRIMARY, 
                fontWeight: 600, 
                fontFamily: 'monospace' 
              }}
            >
              {manufacturerPartId}
            </Typography>
          </Box>

          {/* Divider */}
          <Box sx={{ 
            borderLeft: '1px solid rgba(255,255,255,0.1)', 
            height: 32,
            display: { xs: 'none', lg: 'block' }
          }} />

          {/* Part Name */}
          <Box>
            <Typography 
              variant="caption" 
              sx={{ 
                color: 'rgba(255,255,255,0.5)', 
                fontSize: '0.7rem', 
                textTransform: 'uppercase', 
                letterSpacing: 0.5 
              }}
            >
              {t('partInfoHeader.partName')}
            </Typography>
            <Typography 
              variant="body2" 
              sx={{ 
                color: '#fff', 
                fontWeight: 500 
              }}
            >
              {partName}
            </Typography>
          </Box>

          {/* Open Icon */}
          <OpenInNew 
            className="open-icon"
            sx={{ 
              fontSize: 16, 
              color: PCF_PRIMARY,
              opacity: 0,
              transition: 'opacity 0.2s ease',
              ml: 1
            }} 
          />
        </Box>
      </Box>
    </Tooltip>
  );
};

export default PartInfoHeader;
