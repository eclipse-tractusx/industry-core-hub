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

import React, { createContext, useContext, useState, useMemo, useEffect, ReactNode } from 'react';
import { kits } from '@/features/main';
import { FeatureConfig } from '@/types/routing';

interface FeatureState {
  [featureId: string]: boolean;
}

interface FeatureContextType {
  featureStates: FeatureState;
  toggleFeature: (kitId: string, featureId: string, enabled: boolean) => void;
  enabledFeatures: FeatureConfig[];
}

const FeatureContext = createContext<FeatureContextType | undefined>(undefined);

const FEATURE_STORAGE_KEY = 'ichub_feature_states';

export const FeatureProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Initialize feature states from localStorage or kits configuration
  const [featureStates, setFeatureStates] = useState<FeatureState>(() => {
    // Try to load from localStorage first
    const stored = localStorage.getItem(FEATURE_STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (error) {
        console.error('Failed to parse stored feature states:', error);
      }
    }
    
    // Fallback to default states from kits configuration
    const states: FeatureState = {};
    kits.forEach(kit => {
      kit.features.forEach(feature => {
        states[feature.id] = feature.enabled;
      });
    });
    return states;
  });

  // Persist feature states to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(FEATURE_STORAGE_KEY, JSON.stringify(featureStates));
  }, [featureStates]);

  const toggleFeature = (kitId: string, featureId: string, enabled: boolean) => {
    // Find the feature to check if it's a default feature
    const kit = kits.find(k => k.id === kitId);
    const feature = kit?.features.find(f => f.id === featureId);
    
    // Don't allow toggling default features
    if (feature?.default) {
      return;
    }
    
    setFeatureStates(prev => ({
      ...prev,
      [featureId]: enabled
    }));
  };

  const enabledFeatures = useMemo(() => {
    const features = kits
      .flatMap(kit => kit.features)
      .filter(feature => featureStates[feature.id] && feature.module)
      .map(feature => ({
        ...feature.module!,
        name: feature.name,
        icon: feature.icon || feature.module!.icon
      }));
    
    return features;
  }, [featureStates]);

  return (
    <FeatureContext.Provider value={{ featureStates, toggleFeature, enabledFeatures }}>
      {children}
    </FeatureContext.Provider>
  );
};

export const useFeatures = () => {
  const context = useContext(FeatureContext);
  if (context === undefined) {
    throw new Error('useFeatures must be used within a FeatureProvider');
  }
  return context;
};
