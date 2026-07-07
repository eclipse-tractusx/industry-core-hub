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
 * Design System — KIT Color Tokens
 *
 * KIT-specific color theme used by PageSectionHeader and KIT-specific buttons.
 * Each KIT has its own gradient (icon badge + primary button) and shadow color.
 *
 * Usage:
 *   import { kitThemes } from '@/theme/colors'
 *   <PageSectionHeader kitTheme={kitThemes.industryCore} ... />
 */

export interface KitTheme {
  gradientStart: string;
  gradientEnd: string;
  shadowColor: string; // rgba — used for box-shadow
}

export const kitThemes = {
  /** Industry Core KIT — catalog parts, serialized parts, part discovery */
  industryCore: {
    gradientStart: '#576A8F',
    gradientEnd: '#8AAFD6',
    shadowColor: 'rgba(87, 106, 143, 0.3)',
  },
  /** Eco Pass KIT — passport provision, passport consumption */
  ecoPass: {
    gradientStart: '#10b981',
    gradientEnd: '#059669',
    shadowColor: 'rgba(16, 185, 129, 0.4)',
  },
  /** Business Partner KIT — partner/contact management */
  businessPartner: {
    gradientStart: '#799EFF',
    gradientEnd: '#A8C0FF',
    shadowColor: 'rgba(121, 158, 255, 0.3)',
  },
  /** PCF KIT — product carbon footprint */
  pcf: {
    gradientStart: '#1B5E20',
    gradientEnd: '#4CAF50',
    shadowColor: 'rgba(27, 94, 32, 0.3)',
  },
} as const satisfies Record<string, KitTheme>
