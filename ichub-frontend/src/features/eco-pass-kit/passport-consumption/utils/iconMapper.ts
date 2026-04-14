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

import {
  Info,
  Category,
  Assignment,
  Widgets,
  Science,
  Bolt,
  AddCircle,
  SwapHoriz,
  BatteryChargingFull,
  Speed,
  Favorite,
  EnergySavingsLeaf,
  Recycling,
  Factory,
  CalendarToday,
  LocationOn,
  Business,
  FitnessCenter,
  Height,
  Straighten,
  Inventory,
  LocalShipping,
  Warning,
  Security,
  CloudUpload,
  Description,
  FolderSpecial
} from '@mui/icons-material';

/**
 * Maps property keys to appropriate MUI icons based on semantic meaning
 */
export const getIconForProperty = (key: string): React.ElementType => {
  const lowerKey = key.toLowerCase();
  
  // Metadata & Identification
  if (lowerKey.includes('metadata')) return Info;
  if (lowerKey.includes('identification') || lowerKey.includes('id') || lowerKey.includes('serial')) return Assignment;
  if (lowerKey.includes('code') || lowerKey.includes('classification')) return Category;
  
  // Components & Parts
  if (lowerKey.includes('component')) return Widgets;
  if (lowerKey.includes('part')) return Inventory;
  
  // Battery & Performance
  if (lowerKey.includes('battery') || lowerKey.includes('capacity')) return BatteryChargingFull;
  if (lowerKey.includes('performance') || lowerKey.includes('power')) return Speed;
  if (lowerKey.includes('health') || lowerKey.includes('state')) return Favorite;
  if (lowerKey.includes('chemistry') || lowerKey.includes('chemical')) return Science;
  if (lowerKey.includes('electrochemical') || lowerKey.includes('electric')) return Bolt;
  
  // Sustainability & Environment
  if (lowerKey.includes('sustainab') || lowerKey.includes('footprint')) return EnergySavingsLeaf;
  if (lowerKey.includes('recycl') || lowerKey.includes('circular')) return Recycling;
  if (lowerKey.includes('carbon') || lowerKey.includes('co2')) return CloudUpload;
  
  // Materials & Composition
  if (lowerKey.includes('material') || lowerKey.includes('substance')) return Science;
  if (lowerKey.includes('composition')) return Widgets;
  
  // Manufacturing & Operations
  if (lowerKey.includes('manufactur') || lowerKey.includes('operation')) return Factory;
  if (lowerKey.includes('facility') || lowerKey.includes('plant')) return Business;
  
  // Physical Properties
  if (lowerKey.includes('weight') || lowerKey.includes('mass')) return FitnessCenter;
  if (lowerKey.includes('height') || lowerKey.includes('dimension')) return Height;
  if (lowerKey.includes('length') || lowerKey.includes('width') || lowerKey.includes('size')) return Straighten;
  
  // Dates & Locations
  if (lowerKey.includes('date') || lowerKey.includes('time')) return CalendarToday;
  if (lowerKey.includes('location') || lowerKey.includes('place')) return LocationOn;
  
  // Commercial & Handling
  if (lowerKey.includes('commercial') || lowerKey.includes('purchase')) return LocalShipping;
  if (lowerKey.includes('handling') || lowerKey.includes('spare')) return FolderSpecial;
  
  // Safety & Compliance
  if (lowerKey.includes('concern') || lowerKey.includes('hazard')) return Warning;
  if (lowerKey.includes('compliance') || lowerKey.includes('safety')) return Security;
  
  // Documentation
  if (lowerKey.includes('source') || lowerKey.includes('document')) return Description;
  if (lowerKey.includes('additional') || lowerKey.includes('data exchange')) return SwapHoriz;
  if (lowerKey.includes('general')) return Info;
  
  // Characteristics
  if (lowerKey.includes('characteristic')) return Category;
  
  // Default fallback
  return AddCircle;
};

/**
 * Get category-specific icons for metric cards
 */
export const getCategoryIcon = (category?: string): React.ElementType => {
  if (!category) return Info;
  
  const lower = category.toLowerCase();
  
  // Metadata & Information
  if (lower.includes('metadata') || lower.includes('general')) return Info;
  
  // Identification & Classification
  if (lower.includes('identification') || lower.includes('classification')) return Assignment;
  
  // Operation & Manufacturing
  if (lower.includes('operation') || lower.includes('manufactur')) return Factory;
  
  // Handling & Logistics
  if (lower.includes('handling') || lower.includes('spare')) return FolderSpecial;
  
  // Characteristics & Properties
  if (lower.includes('characteristic') || lower.includes('physical')) return Category;
  
  // Commercial & Business
  if (lower.includes('commercial') || lower.includes('purchase')) return LocalShipping;
  
  // Materials & Composition
  if (lower.includes('material') || lower.includes('substance') || lower.includes('composition')) return Science;
  
  // Sustainability & Environment
  if (lower.includes('sustainab') || lower.includes('footprint') || lower.includes('carbon')) return EnergySavingsLeaf;
  
  // Sources & Documentation
  if (lower.includes('source') || lower.includes('document')) return Description;
  
  // Additional Data
  if (lower.includes('additional') || lower.includes('data')) return SwapHoriz;
  
  // Performance & Metrics
  if (lower.includes('performance')) return Speed;
  if (lower.includes('health')) return Favorite;
  
  return Info;
};
