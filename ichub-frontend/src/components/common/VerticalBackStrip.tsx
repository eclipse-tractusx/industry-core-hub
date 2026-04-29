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

import { Box, Tooltip } from '@mui/material';
import { ChevronLeft } from '@mui/icons-material';

interface VerticalBackStripProps {
  onClick: () => void;
  tooltip?: string;
  /** Width of the sidebar in px. Defaults to 72. */
  sidebarWidth?: number;
  /** Height of the header in px. Defaults to 68.8. */
  headerHeight?: number;
}

const VerticalBackStrip = ({
  onClick,
  tooltip = 'Go back',
  sidebarWidth = 72,
  headerHeight = 68.8,
}: VerticalBackStripProps) => {
  return (
    <Tooltip title={tooltip} placement="right" arrow>
      <Box
        onClick={onClick}
        role="button"
        aria-label={tooltip}
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
        sx={{
          position: 'fixed',
          left: `${sidebarWidth}px`,
          top: `${headerHeight}px`,
          bottom: 0,
          width: '18px',
          zIndex: 1199,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(87, 106, 143, 0.85)',
          borderLeft: '3px solid rgba(255, 255, 255, 0.3)',
          borderRight: '1px solid rgba(255,255,255,0.1)',
          transition: 'width 0.2s ease, background 0.2s ease, border-left-color 0.2s ease',
          '&:hover': {
            width: '34px',
            background: 'rgba(87, 106, 143, 1)',
            borderLeftColor: 'rgba(255, 255, 255, 0.5)',
          },
          '&:hover .back-icon': {
            color: '#ffffff',
            opacity: 1,
          },
          backdropFilter: 'blur(4px)',
        }}
      >
        <ChevronLeft
          className="back-icon"
          sx={{
            fontSize: '1.1rem',
            color: '#ffffff',
            opacity: 1,
            transition: 'color 0.2s ease, opacity 0.2s ease',
            flexShrink: 0,
          }}
        />
      </Box>
    </Tooltip>
  );
};

export default VerticalBackStrip;
