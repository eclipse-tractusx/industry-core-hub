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
 * Comprehensive mapping of country codes and names to their flag emojis
 */
const COUNTRY_FLAG_MAP: Record<string, string> = {
  // North America
  'US': '🇺🇸', 'USA': '🇺🇸', 'United States': '🇺🇸', 'United States of America': '🇺🇸',
  'CA': '🇨🇦', 'CAN': '🇨🇦', 'Canada': '🇨🇦',
  'MX': '🇲🇽', 'MEX': '🇲🇽', 'Mexico': '🇲🇽',

  // Europe - Western
  'DE': '🇩🇪', 'DEU': '🇩🇪', 'Germany': '🇩🇪', 'Deutschland': '🇩🇪',
  'FR': '🇫🇷', 'FRA': '🇫🇷', 'France': '🇫🇷',
  'IT': '🇮🇹', 'ITA': '🇮🇹', 'Italy': '🇮🇹',
  'GB': '🇬🇧', 'GBR': '🇬🇧', 'United Kingdom': '🇬🇧', 'UK': '🇬🇧', 'Britain': '🇬🇧',
  'ES': '🇪🇸', 'ESP': '🇪🇸', 'Spain': '🇪🇸',
  'NL': '🇳🇱', 'NLD': '🇳🇱', 'Netherlands': '🇳🇱', 'Holland': '🇳🇱',
  'BE': '🇧🇪', 'BEL': '🇧🇪', 'Belgium': '🇧🇪',
  'CH': '🇨🇭', 'CHE': '🇨🇭', 'Switzerland': '🇨🇭',
  'AT': '🇦🇹', 'AUT': '🇦🇹', 'Austria': '🇦🇹',
  'PT': '🇵🇹', 'PRT': '🇵🇹', 'Portugal': '🇵🇹',
  'IE': '🇮🇪', 'IRL': '🇮🇪', 'Ireland': '🇮🇪',
  'LU': '🇱🇺', 'LUX': '🇱🇺', 'Luxembourg': '🇱🇺',

  // Europe - Nordic
  'SE': '🇸🇪', 'SWE': '🇸🇪', 'Sweden': '🇸🇪',
  'NO': '🇳🇴', 'NOR': '🇳🇴', 'Norway': '🇳🇴',
  'DK': '🇩🇰', 'DNK': '🇩🇰', 'Denmark': '🇩🇰',
  'FI': '🇫🇮', 'FIN': '🇫🇮', 'Finland': '🇫🇮',

  // Europe - Eastern
  'PL': '🇵🇱', 'POL': '🇵🇱', 'Poland': '🇵🇱',
  'CZ': '🇨🇿', 'CZE': '🇨🇿', 'Czech Republic': '🇨🇿', 'Czechia': '🇨🇿',
  'HU': '🇭🇺', 'HUN': '🇭🇺', 'Hungary': '🇭🇺',
  'RO': '🇷🇴', 'ROU': '🇷🇴', 'Romania': '🇷🇴',
  'SK': '🇸🇰', 'SVK': '🇸🇰', 'Slovakia': '🇸🇰',
  'SI': '🇸🇮', 'SVN': '🇸🇮', 'Slovenia': '🇸🇮',
  'HR': '🇭🇷', 'HRV': '🇭🇷', 'Croatia': '🇭🇷',
  'BG': '🇧🇬', 'BGR': '🇧🇬', 'Bulgaria': '🇧🇬',
  'GR': '🇬🇷', 'GRC': '🇬🇷', 'Greece': '🇬🇷',
  'EE': '🇪🇪', 'EST': '🇪🇪', 'Estonia': '🇪🇪',
  'LV': '🇱🇻', 'LVA': '🇱🇻', 'Latvia': '🇱🇻',
  'LT': '🇱🇹', 'LTU': '🇱🇹', 'Lithuania': '🇱🇹',

  // Europe - Mediterranean
  'MT': '🇲🇹', 'MLT': '🇲🇹', 'Malta': '🇲🇹',
  'CY': '🇨🇾', 'CYP': '🇨🇾', 'Cyprus': '🇨🇾',

  // Asia - East
  'CN': '🇨🇳', 'CHN': '🇨🇳', 'China': '🇨🇳', 'People\'s Republic of China': '🇨🇳',
  'JP': '🇯🇵', 'JPN': '🇯🇵', 'Japan': '🇯🇵',
  'KR': '🇰🇷', 'KOR': '🇰🇷', 'South Korea': '🇰🇷', 'Korea': '🇰🇷',
  'TW': '🇹🇼', 'TWN': '🇹🇼', 'Taiwan': '🇹🇼',

  // Asia - Southeast
  'SG': '🇸🇬', 'SGP': '🇸🇬', 'Singapore': '🇸🇬',
  'MY': '🇲🇾', 'MYS': '🇲🇾', 'Malaysia': '🇲🇾',
  'TH': '🇹🇭', 'THA': '🇹🇭', 'Thailand': '🇹🇭',
  'VN': '🇻🇳', 'VNM': '🇻🇳', 'Vietnam': '🇻🇳',
  'PH': '🇵🇭', 'PHL': '🇵🇭', 'Philippines': '🇵🇭',
  'ID': '🇮🇩', 'IDN': '🇮🇩', 'Indonesia': '🇮🇩',

  // Asia - South
  'IN': '🇮🇳', 'IND': '🇮🇳', 'India': '🇮🇳',

  // Asia - West/Middle East
  'RU': '🇷🇺', 'RUS': '🇷🇺', 'Russia': '🇷🇺', 'Russian Federation': '🇷🇺',
  'TR': '🇹🇷', 'TUR': '🇹🇷', 'Turkey': '🇹🇷', 'Türkiye': '🇹🇷',
  'IL': '🇮🇱', 'ISR': '🇮🇱', 'Israel': '🇮🇱',
  'SA': '🇸🇦', 'SAU': '🇸🇦', 'Saudi Arabia': '🇸🇦',
  'AE': '🇦🇪', 'ARE': '🇦🇪', 'UAE': '🇦🇪', 'United Arab Emirates': '🇦🇪',

  // Africa
  'ZA': '🇿🇦', 'ZAF': '🇿🇦', 'South Africa': '🇿🇦',
  'EG': '🇪🇬', 'EGY': '🇪🇬', 'Egypt': '🇪🇬',

  // Oceania
  'AU': '🇦🇺', 'AUS': '🇦🇺', 'Australia': '🇦🇺',
  'NZ': '🇳🇿', 'NZL': '🇳🇿', 'New Zealand': '🇳🇿',

  // South America
  'BR': '🇧🇷', 'BRA': '🇧🇷', 'Brazil': '🇧🇷',
  'AR': '🇦🇷', 'ARG': '🇦🇷', 'Argentina': '🇦🇷',
  'CL': '🇨🇱', 'CHL': '🇨🇱', 'Chile': '🇨🇱',
  'CO': '🇨🇴', 'COL': '🇨🇴', 'Colombia': '🇨🇴',
  'PE': '🇵🇪', 'PER': '🇵🇪', 'Peru': '🇵🇪',
  'VE': '🇻🇪', 'VEN': '🇻🇪', 'Venezuela': '🇻🇪',
};

/**
 * Gets the flag emoji for a given country code or name
 * 
 * @param countryCode - Country code (ISO 2/3 letter) or full country name
 * @returns Flag emoji string, or default flag if not found
 * 
 * @example
 * ```typescript
 * getCountryFlag('US') // Returns '🇺🇸'
 * getCountryFlag('Germany') // Returns '🇩🇪'
 * getCountryFlag('unknown') // Returns '🏳️'
 * ```
 */
export const getCountryFlag = (countryCode: string): string => {
  // Handle empty or invalid input
  if (!countryCode || typeof countryCode !== 'string') {
    return '🏳️';
  }

  // Try exact match first
  if (COUNTRY_FLAG_MAP[countryCode]) {
    return COUNTRY_FLAG_MAP[countryCode];
  }

  // Try case-insensitive search
  const lowerCode = countryCode.toLowerCase();
  for (const [key, flag] of Object.entries(COUNTRY_FLAG_MAP)) {
    if (key.toLowerCase() === lowerCode) {
      return flag;
    }
  }

  // Try partial match for longer country names
  for (const [key, flag] of Object.entries(COUNTRY_FLAG_MAP)) {
    if (countryCode.toLowerCase().includes(key.toLowerCase()) || 
        key.toLowerCase().includes(countryCode.toLowerCase())) {
      return flag;
    }
  }

  return '🏳️'; // Default flag for unknown countries
};

/**
 * Gets all available country codes and names that have flag mappings
 * 
 * @returns Array of country identifiers
 */
export const getAvailableCountries = (): string[] => {
  return Object.keys(COUNTRY_FLAG_MAP);
};

/**
 * Checks if a country has a flag mapping available
 * 
 * @param countryCode - Country code or name to check
 * @returns True if flag mapping exists
 */
export const hasCountryFlag = (countryCode: string): boolean => {
  return getCountryFlag(countryCode) !== '🏳️';
};
