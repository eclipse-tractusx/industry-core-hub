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
import { SvgIcon, SvgIconProps } from '@mui/material';

interface CustomAppsIconProps extends SvgIconProps {
  isActive?: boolean;
}

const CustomAppsIcon: React.FC<CustomAppsIconProps> = ({ isActive = false, ...props }) => {
  const baseSize = 3.5;
  const baseRadius = 0.4;
  
  // Posiciones base (más centradas)
  const positions = [
    { x: 4, y: 4 },   // Top-left
    { x: 10, y: 4 },  // Top-center  
    { x: 16, y: 4 },  // Top-right
    { x: 4, y: 10 },  // Middle-left
    { x: 10, y: 10 }, // Middle-center
    { x: 16, y: 10 }, // Middle-right
    { x: 4, y: 16 },  // Bottom-left
    { x: 10, y: 16 }, // Bottom-center
    { x: 16, y: 16 }  // Bottom-right
  ];

  // Ajustes para el estado activo (se "despliegan" hacia afuera)
  const activeAdjustments = [
    { dx: -0.8, dy: -0.8 }, // Top-left: hacia arriba-izquierda
    { dx: 0, dy: -0.8 },    // Top-center: hacia arriba
    { dx: 0.8, dy: -0.8 },  // Top-right: hacia arriba-derecha
    { dx: -0.8, dy: 0 },    // Middle-left: hacia izquierda
    { dx: 0, dy: 0 },       // Middle-center: se queda
    { dx: 0.8, dy: 0 },     // Middle-right: hacia derecha
    { dx: -0.8, dy: 0.8 },  // Bottom-left: hacia abajo-izquierda
    { dx: 0, dy: 0.8 },     // Bottom-center: hacia abajo
    { dx: 0.8, dy: 0.8 }    // Bottom-right: hacia abajo-derecha
  ];

  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <g>
        {positions.map((pos, index) => {
          const adjustment = isActive ? activeAdjustments[index] : { dx: 0, dy: 0 };
          const finalX = pos.x + adjustment.dx;
          const finalY = pos.y + adjustment.dy;
          
          return (
            <rect
              key={index}
              x={finalX}
              y={finalY}
              width={baseSize}
              height={baseSize}
              fill="currentColor"
              rx={baseRadius}
              style={{
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                transformOrigin: `${finalX + baseSize/2}px ${finalY + baseSize/2}px`
              }}
            />
          );
        })}
      </g>
    </SvgIcon>
  );
};

export default CustomAppsIcon;