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

/**
 * Creates a map from shell ID to DTR index for efficient lookup
 */
export const createShellToDtrMap = (
  dtrs: Array<Record<string, unknown> & { shells?: string[] }>
): Map<string, number> => {
  const shellToDtrMap = new Map<string, number>();
  dtrs.forEach((dtr, dtrIndex) => {
    if (dtr.shells && Array.isArray(dtr.shells)) {
      dtr.shells.forEach((shellId: string) => {
        shellToDtrMap.set(shellId, dtrIndex);
      });
    }
  });
  return shellToDtrMap;
};

interface DtrColor {
  bg: string;
  color: string;
  light: string;
  border: string;
}

/**
 * Gets consistent colors for DTR identifiers with support for many DTRs
 */
export const getDtrColor = (dtrIndex: number): DtrColor => {
  const baseColors = [
    { bg: 'rgba(76, 175, 80, 0.9)', color: 'white', light: 'rgba(76, 175, 80, 0.1)', border: 'rgba(76, 175, 80, 0.3)' }, // Green
    { bg: 'rgba(33, 150, 243, 0.9)', color: 'white', light: 'rgba(33, 150, 243, 0.1)', border: 'rgba(33, 150, 243, 0.3)' }, // Blue
    { bg: 'rgba(255, 152, 0, 0.9)', color: 'white', light: 'rgba(255, 152, 0, 0.1)', border: 'rgba(255, 152, 0, 0.3)' }, // Orange
    { bg: 'rgba(156, 39, 176, 0.9)', color: 'white', light: 'rgba(156, 39, 176, 0.1)', border: 'rgba(156, 39, 176, 0.3)' }, // Purple
    { bg: 'rgba(244, 67, 54, 0.9)', color: 'white', light: 'rgba(244, 67, 54, 0.1)', border: 'rgba(244, 67, 54, 0.3)' }, // Red
    { bg: 'rgba(0, 188, 212, 0.9)', color: 'white', light: 'rgba(0, 188, 212, 0.1)', border: 'rgba(0, 188, 212, 0.3)' }, // Cyan
    { bg: 'rgba(139, 195, 74, 0.9)', color: 'white', light: 'rgba(139, 195, 74, 0.1)', border: 'rgba(139, 195, 74, 0.3)' }, // Light Green
    { bg: 'rgba(121, 85, 72, 0.9)', color: 'white', light: 'rgba(121, 85, 72, 0.1)', border: 'rgba(121, 85, 72, 0.3)' }, // Brown
  ];
  
  const colorIndex = dtrIndex % baseColors.length;
  const variation = Math.floor(dtrIndex / baseColors.length);
  
  // For DTRs beyond 8, add opacity variations to distinguish them
  const baseColor = baseColors[colorIndex];
  const opacity = Math.max(0.7, 1 - (variation * 0.1)); // Gradually reduce opacity
  
  return {
    bg: baseColor.bg.replace('0.9)', `${opacity})`),
    color: baseColor.color,
    light: baseColor.light,
    border: baseColor.border
  };
};
