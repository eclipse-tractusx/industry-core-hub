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

import { useState, JSX } from "react";
import { Box } from "@mui/material";
import { NavLink, useLocation } from 'react-router-dom';
import { kitFeaturesConfig } from '../../features/main';

type SidebarItem = {
  icon: JSX.Element;
  path: string;
  disabled: boolean;
};

const Sidebar = ({ items }: { items: SidebarItem[] }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const location = useLocation();
  const isKitFeaturesActive = location.pathname === kitFeaturesConfig.navigationPath;

  return (
    <Box className="sidebarContainer">
      <Box className="regularItems">
        {items.map((item, index) => (
          <NavLink
            to={item.path}
            key={index}
            className={`iconButton ${index === activeIndex ? "active" : ""} ${item.disabled === true ? "disabled" : ""}`}
            onClick={() => setActiveIndex(index)}
          >
            {item.icon}
          </NavLink>
        ))}
      </Box>
      
      <Box className="fixedItems">
        <NavLink
          to={kitFeaturesConfig.navigationPath}
          className={`iconButton kitFeaturesButton ${isKitFeaturesActive ? 'active' : ''}`}
          onClick={() => setActiveIndex(-1)}
        >
          <Box className={`kitFeaturesIcon ${isKitFeaturesActive ? 'active' : ''}`}>
            {kitFeaturesConfig.icon}
          </Box>
        </NavLink>
      </Box>
    </Box>
  );
};

export default Sidebar