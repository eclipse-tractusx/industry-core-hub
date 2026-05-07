/********************************************************************************
 * Eclipse Tractus-X - Industry Core Hub Frontend
 *
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

import { ReactNode } from 'react';
import { Box, Typography } from '@mui/material';
import { KitTheme } from '@/theme/colors';

interface PageSectionHeaderProps {
  /** MUI icon (or any ReactNode) rendered inside the themed gradient badge */
  icon: ReactNode;
  title: string;
  subtitle?: string;
  /** KIT-specific color tokens from kitThemes in @/theme/colors */
  kitTheme: KitTheme;
  /**
   * Free-form right-side slot: buttons, chips, menus — anything.
   * The component applies no opinion on how actions are laid out internally;
   * each page is responsible for its own responsive behaviour.
   */
  actions?: ReactNode;
}

/**
 * Standardised page-section header used across all KIT feature pages.
 *
 * Layout (left → right):
 *   [Gradient icon badge]  [Title + optional subtitle]  [actions slot]
 *
 * The component owns no bottom margin — the calling page should wrap it in
 * a <Box sx={{ mb: ... }}> or similar to control vertical spacing.
 */
export default function PageSectionHeader({
  icon,
  title,
  subtitle,
  kitTheme,
  actions,
}: PageSectionHeaderProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        flexWrap: { xs: 'wrap', sm: 'nowrap' },
      }}
    >
      {/* Themed icon badge */}
      <Box
        sx={{
          flexShrink: 0,
          width: { xs: 48, sm: 56 },
          height: { xs: 48, sm: 56 },
          borderRadius: '12px',
          background: `linear-gradient(135deg, ${kitTheme.gradientStart} 0%, ${kitTheme.gradientEnd} 100%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: `0 4px 16px ${kitTheme.shadowColor}`,
          '& .MuiSvgIcon-root': {
            fontSize: { xs: 28, sm: 32 },
            color: '#fff',
          },
        }}
      >
        {icon}
      </Box>

      {/* Title + subtitle */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="h4"
          sx={{
            color: '#fff',
            fontWeight: 700,
            fontSize: { xs: '1.5rem', sm: '2rem', md: '2.25rem' },
            lineHeight: 1.2,
          }}
        >
          {title}
        </Typography>
        {subtitle && (
          <Typography
            variant="body1"
            sx={{
              color: 'rgba(255, 255, 255, 0.6)',
              fontSize: { xs: '0.875rem', sm: '1rem' },
              mt: 0.25,
            }}
          >
            {subtitle}
          </Typography>
        )}
      </Box>

      {/* Free-form actions slot */}
      {actions && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
          {actions}
        </Box>
      )}
    </Box>
  );
}
