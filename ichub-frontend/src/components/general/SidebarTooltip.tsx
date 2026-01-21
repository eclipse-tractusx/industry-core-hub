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

import React, { useState, useRef } from 'react';
import { Box, Typography } from '@mui/material';

interface SidebarTooltipProps {
  title: string;
  children: React.ReactElement;
  disabled?: boolean;
}

const SidebarTooltip: React.FC<SidebarTooltipProps> = ({ title, children, disabled = false }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0 });
  const childRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = (e: React.MouseEvent) => {
    if (disabled) return;
    
    if (childRef.current) {
      const rect = childRef.current.getBoundingClientRect();
      setPosition({
        top: rect.top + rect.height / 2
      });
    }
    setIsVisible(true);
  };

  const handleMouseLeave = () => {
    setIsVisible(false);
  };

  return (
    <>
      <Box
        ref={childRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        sx={{ position: 'relative', width: '100%' }}
      >
        {children}
      </Box>
      
      {isVisible && (
        <Box
          sx={{
            position: 'fixed',
            left: '90px', // Posicionado a la derecha del sidebar
            top: position.top,
            transform: 'translateY(-50%)',
            backgroundColor: '#2a2a2a',
            color: 'white',
            padding: '10px 14px',
            borderRadius: '8px',
            fontSize: '0.875rem',
            fontWeight: 500,
            whiteSpace: 'nowrap',
            zIndex: 1000001,
            boxShadow: '0 6px 20px rgba(0, 0, 0, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRight: '2px solid #42a5f5',
            animation: 'tooltipFadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            background: 'linear-gradient(135deg, #2a2a2a 0%, #1e1e1e 100%)',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: '50%',
              left: '-6px',
              transform: 'translateY(-50%)',
              width: 0,
              height: 0,
              borderStyle: 'solid',
              borderWidth: '6px 6px 6px 0',
              borderColor: 'transparent #2a2a2a transparent transparent',
            },
            '@keyframes tooltipFadeIn': {
              '0%': {
                opacity: 0,
                transform: 'translateY(-50%) translateX(-12px) scale(0.9)'
              },
              '100%': {
                opacity: 1,
                transform: 'translateY(-50%) translateX(0) scale(1)'
              }
            }
          }}
        >
          <Typography 
            variant="body2" 
            sx={{ 
              fontSize: '0.875rem', 
              fontWeight: 600,
              lineHeight: 1.2,
              color: '#ffffff',
              textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)'
            }}
          >
            {title}
          </Typography>
        </Box>
      )}
    </>
  );
};

export default SidebarTooltip;