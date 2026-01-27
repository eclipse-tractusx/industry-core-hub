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

import { useState, JSX, cloneElement, useRef, useEffect, useMemo } from "react";
import { Box } from "@mui/material";
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Add, Assignment } from '@mui/icons-material';
import { kitFeaturesConfig } from '../../features/main';
import FeaturesPanel from '../../features/kit-features/components/FeaturesPanel';
import SidebarTooltip from './SidebarTooltip';
import { useFeatures } from '../../contexts/FeatureContext';
import { FeatureConfig, NavigationItem } from '@/types/routing';

type SidebarItem = {
  icon: JSX.Element;
  path: string;
  disabled: boolean;
};

const Sidebar = ({ items: _items }: { items: SidebarItem[] }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [showFeaturesPanel, setShowFeaturesPanel] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const previousPath = useRef<string>('/catalog');
  const isKitFeaturesActive = location.pathname === kitFeaturesConfig.navigationPath;
  const { enabledFeatures } = useFeatures();
  
  // Get all enabled features dynamically
  const allFeatures: FeatureConfig[] = useMemo(() => {
    return [
      ...enabledFeatures,
      // Add placeholder for additional features (disabled - opens features panel)
      {
        name: 'Add Features',
        icon: <Assignment />,
        navigationPath: '/add-features',
        disabled: true,
        routes: []
      }
    ];
  }, [enabledFeatures]);
  
  // Convert to navigation items
  const items: NavigationItem[] = useMemo(() => {
    return allFeatures
      .filter(feature => feature.icon)
      .map(feature => ({
        icon: feature.icon!,
        path: feature.navigationPath,
        disabled: feature.disabled
      }));
  }, [allFeatures]);
  
  // Guardar la ruta anterior cuando no estemos en KIT Features
  useEffect(() => {
    if (location.pathname !== kitFeaturesConfig.navigationPath && location.pathname !== '/') {
      previousPath.current = location.pathname;
    }
  }, [location.pathname]);
  
  const handleKitFeaturesClick = (e: React.MouseEvent) => {
    e.preventDefault();
    
    if (isKitFeaturesActive) {
      // If we're already in KIT Features, go back to the previous page
      navigate(previousPath.current);
    } else {
      // If we're not in KIT Features, go to KIT Features
      navigate(kitFeaturesConfig.navigationPath);
    }
    setActiveIndex(-1);
  };

  const handleAddFeatureClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowFeaturesPanel(!showFeaturesPanel);
  };

  const { toggleFeature } = useFeatures();
  
  const handleFeatureToggle = (kitId: string, featureId: string, enabled: boolean) => {
    toggleFeature(kitId, featureId, enabled);
  };

  const handleCloseFeaturesPanel = () => {
    setShowFeaturesPanel(false);
  };

  return (
    <Box className="sidebarContainer">
      <Box className="regularItems">
        {items.map((item, index) => {
          const isActive = location.pathname === item.path;
          const isDisabled = item.disabled === true;
          
          // Find the feature configuration to get the name
          const feature = allFeatures.find(f => f.navigationPath === item.path);
          const tooltipTitle = isDisabled ? 'Add Features' : (feature?.name || '');

          return (
            <SidebarTooltip key={index} title={tooltipTitle}>
              {isDisabled ? (
                <Box
                  className={`iconButton disabled`}
                  onClick={handleAddFeatureClick}
                  sx={{ cursor: 'pointer', textDecoration: 'none' }}
                >
                  <Box className={`iconWrapper disabled add-feature ${showFeaturesPanel ? 'active' : ''}`}>
                    <Add />
                  </Box>
                </Box>
              ) : (
                <NavLink
                  to={item.path}
                  className={`iconButton ${isActive ? "active" : ""}`}
                  onClick={() => setActiveIndex(index)}
                >
                  <Box className={`iconWrapper ${isActive ? 'active' : ''}`}>
                    {item.icon}
                  </Box>
                </NavLink>
              )}
            </SidebarTooltip>
          );
        })}
      </Box>
      
      <Box className="fixedItems">
        <SidebarTooltip title={kitFeaturesConfig.name}>
          <Box
            className={`iconButton kitFeaturesButton ${isKitFeaturesActive ? 'active' : ''}`}
            onClick={handleKitFeaturesClick}
            sx={{ cursor: 'pointer', textDecoration: 'none' }}
          >
            <Box className={`kitFeaturesIcon ${isKitFeaturesActive ? 'active' : ''}`}>
              {cloneElement(kitFeaturesConfig.icon as React.ReactElement<any>, { isActive: isKitFeaturesActive })}
            </Box>
          </Box>
        </SidebarTooltip>
      </Box>
      
      {/* Overlay for closing panel */}
      {showFeaturesPanel && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1000000,
            backgroundColor: 'transparent'
          }}
          onClick={handleCloseFeaturesPanel}
        />
      )}
      
      {/* Features Panel */}
      <FeaturesPanel
        isOpen={showFeaturesPanel}
        onClose={handleCloseFeaturesPanel}
        onFeatureToggle={handleFeatureToggle}
      />
    </Box>
  );
};

export default Sidebar