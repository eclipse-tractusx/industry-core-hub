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

import { useState, JSX, cloneElement, useRef, useEffect } from "react";
import { Box } from "@mui/material";
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Add } from '@mui/icons-material';
import { kitFeaturesConfig, allFeatures } from '../../features/main';
import FeaturesPanel from './FeaturesPanel';
import SidebarTooltip from './SidebarTooltip';

type SidebarItem = {
  icon: JSX.Element;
  path: string;
  disabled: boolean;
};

const Sidebar = ({ items }: { items: SidebarItem[] }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [showFeaturesPanel, setShowFeaturesPanel] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const previousPath = useRef<string>('/catalog'); // Ruta por defecto
  const isKitFeaturesActive = location.pathname === kitFeaturesConfig.navigationPath;
  
  // Guardar la ruta anterior cuando no estemos en KIT Features
  useEffect(() => {
    if (location.pathname !== kitFeaturesConfig.navigationPath) {
      // Si estamos en la ruta raíz, guardar /catalog como la ruta anterior
      previousPath.current = location.pathname === '/' ? '/catalog' : location.pathname;
    }
  }, [location.pathname]);
  
  const handleKitFeaturesClick = (e: React.MouseEvent) => {
    e.preventDefault();
    
    if (isKitFeaturesActive) {
      // Si ya estamos en KIT Features, volver a la página anterior
      navigate(previousPath.current);
    } else {
      // Si no estamos en KIT Features, ir a KIT Features
      navigate(kitFeaturesConfig.navigationPath);
    }
    setActiveIndex(-1);
  };

  const handleAddFeatureClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowFeaturesPanel(!showFeaturesPanel);
  };

  const handleFeatureToggle = (kitId: string, featureId: string, enabled: boolean) => {
    console.log(`Feature ${featureId} in ${kitId} KIT ${enabled ? 'enabled' : 'disabled'}`);
    // Aquí puedes añadir la lógica para habilitar/deshabilitar la feature
    // Por ejemplo, hacer una llamada a la API o actualizar el estado global
  };

  const handleCloseFeaturesPanel = () => {
    setShowFeaturesPanel(false);
  };

  return (
    <Box className="sidebarContainer">
      <Box className="regularItems">
        {items.map((item, index) => {
          const isActive = location.pathname === item.path || (location.pathname === '/' && item.path === '/catalog');
          const isDisabled = item.disabled === true;
          
          const feature = allFeatures.find(f => f.navigationPath === item.path);
          const tooltipTitle = isDisabled ? 'Add Features' : (feature?.name || item.path);

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