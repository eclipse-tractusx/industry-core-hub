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

import { useState } from 'react';
import { MainNavigation, Button, IconButton } from '@catena-x/portal-shared-components';
import PersonIcon from '@mui/icons-material/Person';
import { Menu, MenuItem, Typography, Divider, ListItemIcon } from '@mui/material';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';

const Header = () => {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  return (
    <MainNavigation
      items={[
        { href: '/', title: 'Industry Core Hub' },
      ]}
    > 
      <div className='main-logo-wrapper'>
        <a href="/" className="main-logo-link">
          <img
            src="/241117_Tractus_X_Logo_RGB_Light_Version.png"
            alt="Eclipse Tractus-X logo"
            className='main-logo'
          />
        </a>
      </div>
      <div>
        <IconButton aria-label="user-menu" onClick={handleMenuOpen}>
          <PersonIcon />
        </IconButton>
        <Menu
          anchorEl={anchorEl}
          open={open}
          onClose={handleMenuClose}
          className='navbar-user-dropdown'
        >
          {/* Encabezado con nombre y email */}
          <Typography variant="subtitle1" sx={{ padding: '8px 16px 0px 16px', fontWeight: 'bold' }}>
            Mathias Brunkow Moser
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ padding: '0 16px 8px', fontStyle: 'italic' }}>
            CX-Operator
          </Typography>
          <Divider />

          {/* Opciones del menú */}
          <MenuItem onClick={handleMenuClose}>
            <ListItemIcon>
              <AccountCircleIcon fontSize="small" />
            </ListItemIcon>
            Profile
          </MenuItem>
          <MenuItem onClick={handleMenuClose}>
            <ListItemIcon>
              <SettingsIcon fontSize="small" />
            </ListItemIcon>
            Settings
          </MenuItem>
          <Divider />
          <MenuItem onClick={handleMenuClose}>
            <ListItemIcon>
              <LogoutIcon fontSize="small" />
            </ListItemIcon>
            Logout
          </MenuItem>
        </Menu>
      </div>
    </MainNavigation>
  );
};

export default Header;