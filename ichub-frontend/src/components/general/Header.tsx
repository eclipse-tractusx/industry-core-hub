/********************************************************************************
 * Eclipse Tractus-X - Industry Core Hub Frontend
 *
 * Copyright (c) 2025 LKS Next
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

import { useState, useEffect } from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import Badge from '@mui/material/Badge';
import MenuItem from '@mui/material/MenuItem';
import Menu from '@mui/material/Menu';
import AccountCircle from '@mui/icons-material/AccountCircle';
import MailIcon from '@mui/icons-material/Mail';
import NotificationsIcon from '@mui/icons-material/Notifications';
import MoreIcon from '@mui/icons-material/MoreVert';
import { Divider, ListItemIcon, Typography, Tooltip } from '@mui/material';
import { Logout, Settings, ContentCopy } from '@mui/icons-material';
import { getParticipantId } from '../../services/EnvironmentService';
import useAuth from '../../hooks/useAuth';

export default function PrimarySearchAppBar() {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [mobileMoreAnchorEl, setMobileMoreAnchorEl] = useState<null | HTMLElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const [participantId, setParticipantId] = useState<string>('CX-Operator');
  const [copied, setCopied] = useState(false);
  
  // Auth hook
  const { isAuthenticated, user, logout } = useAuth();

  const isMenuOpen = Boolean(anchorEl);
  const isMobileMenuOpen = Boolean(mobileMoreAnchorEl);

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMobileMenuClose = () => {
    setMobileMoreAnchorEl(null);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    handleMobileMenuClose();
  };

  const handleLogout = async () => {
    try {
      handleMenuClose();
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleMobileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMobileMoreAnchorEl(event.currentTarget);
  };

  const handleCopyParticipantId = () => {
    navigator.clipboard.writeText(participantId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const fetchParticipantId = async () => {
      try {
        const id = await getParticipantId();
        if (id) {
          setParticipantId(id);
        }
      } catch (error) {
        console.warn('Could not fetch participant ID:', error);
        // Keep default value "CX-Operator"
      }
    };

    fetchParticipantId();
  }, []);

  const menuId = 'primary-search-account-menu';
  const renderMenu = (
    <Menu
      anchorEl={anchorEl}
      id={menuId}
      open={isMenuOpen}
      onClose={handleMenuClose}
    >
      <Box sx={{ px: 2, py: 2, background: 'linear-gradient(135deg, rgba(66, 165, 245, 0.1) 0%, rgba(25, 118, 210, 0.05) 100%)' }}>
        <Typography 
          variant="subtitle1" 
          sx={{ 
            fontWeight: 600,
            mb: 0.5,
            color: 'text.primary'
          }}
        >
          Mathias Brunkow Moser
        </Typography>
        <Typography 
          variant="body2" 
          sx={{ 
            color: 'text.secondary',
            mb: 0.5,
            fontSize: '0.875rem'
          }}
        >
          {isAuthenticated && user ? user.username : 'Guest'}
        </Typography>
        {isAuthenticated && user?.email && (
          <Typography 
            variant="caption" 
            sx={{ 
              color: 'text.secondary',
              display: 'block',
              mb: 1
            }}
          >
            {user.email}
          </Typography>
        )}
        <Box 
          sx={{ 
            mt: 1,
            px: 1.5,
            py: 0.75,
            backgroundColor: 'rgba(25, 118, 210, 0.08)',
            borderRadius: 1,
            border: '1px solid rgba(25, 118, 210, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1
          }}
        >
          <Typography 
            variant="caption" 
            sx={{ 
              color: 'primary.main',
              fontWeight: 600,
              fontSize: '0.75rem',
              letterSpacing: '0.3px',
              flex: 1
            }}
          >
            Company ID: {participantId}
          </Typography>
          <Tooltip title={copied ? "Copied!" : "Copy ID"} arrow>
            <IconButton
              size="small"
              onClick={handleCopyParticipantId}
              sx={{
                padding: '4px',
                color: 'primary.main',
                '&:hover': {
                  backgroundColor: 'rgba(25, 118, 210, 0.15)'
                }
              }}
            >
              <ContentCopy sx={{ fontSize: '0.875rem' }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      
      <Divider sx={{ my: 1 }} />


        {/* Opciones del menú */}
        <MenuItem onClick={handleMenuClose}>
        <ListItemIcon>
            <AccountCircle fontSize="small" />
        </ListItemIcon>
        Profile
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
        <ListItemIcon>
            <Settings fontSize="small" />
        </ListItemIcon>
        Settings
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogout}>
        <ListItemIcon>
            <Logout fontSize="small" />
        </ListItemIcon>
        Logout
        </MenuItem>
    </Menu>
  );

  const mobileMenuId = 'primary-search-account-menu-mobile';
  const renderMobileMenu = (
    <Menu
      anchorEl={mobileMoreAnchorEl}
      anchorOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
      id={mobileMenuId}
      keepMounted
      transformOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
      open={isMobileMenuOpen}
      onClose={handleMobileMenuClose}
    >
      <MenuItem>
        <IconButton size="large" aria-label="show 4 new mails">
          <Badge badgeContent={4} color="error">
            <MailIcon />
          </Badge>
        </IconButton>
        <p>Messages</p>
      </MenuItem>
      <MenuItem>
        <IconButton
          size="large"
          aria-label="show 17 new notifications"
        >
          <Badge badgeContent={17} color="error">
            <NotificationsIcon />
          </Badge>
        </IconButton>
        <p>Notifications</p>
      </MenuItem>
      <MenuItem onClick={handleProfileMenuOpen}>
        <IconButton
          size="large"
          aria-label="account of current user"
        >
          <AccountCircle />
        </IconButton>
        <p>Profile</p>
      </MenuItem>
    </Menu>
  );

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static" className={`ichub-header ${scrolled ? "scrolled" : ""}`}>
        <Toolbar>
          <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', justifyContent: 'flex-start' }}>
            <a href="/" style={{ display: 'flex', alignItems: 'center' }}>
              <img
                src="/241117_Tractus_X_Logo_Only_RGB.png"
                alt="Eclipse Tractus-X logo"
                className='small-logo'
                style={{ display: 'block' }}
              />
            </a>
          </Box>
          <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', justifyContent: 'flex-start' }}>
            <a href="/" style={{ display: 'flex', alignItems: 'center' }}>
              <img
                src="/241117_Tractus_X_Logo_RGB_Light_Version.png"
                alt="Eclipse Tractus-X logo"
                className='main-logo'
                style={{ display: 'block' }}
              />
            </a>
          </Box>
          <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center' }}>
            <Typography 
              variant="h1" 
              sx={{ 
                fontSize: { xs: '1.6rem', md: '2rem' },
                fontWeight: '700',
                color: 'white',
                textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                letterSpacing: '0.5px'
              }}
            >
              Industry Core Hub
            </Typography>
          </Box>
          <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 2, alignItems: 'center' }}>
            <IconButton 
              size="large" 
              aria-label="show 4 new mails"
              sx={{
                color: 'white',
                '&:hover': {
                  backgroundColor: 'rgba(25, 118, 210, 0.2)',
                  transform: 'translateY(-1px)',
                  boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)'
                },
                transition: 'all 0.2s ease-in-out'
              }}
            >
              <Badge badgeContent={4} color="error">
                <MailIcon />
              </Badge>
            </IconButton>
            <IconButton
              size="large"
              aria-label="show 17 new notifications"
              sx={{
                color: 'white',
                '&:hover': {
                  backgroundColor: 'rgba(25, 118, 210, 0.2)',
                  transform: 'translateY(-1px)',
                  boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)'
                },
                transition: 'all 0.2s ease-in-out'
              }}
            >
              <Badge badgeContent={17} color="error">
                <NotificationsIcon />
              </Badge>
            </IconButton>
            <IconButton
              size="large"
              edge="end"
              aria-label="account of current user"
              aria-controls={menuId}
              aria-haspopup="true"
              onClick={handleProfileMenuOpen}
              className='user-button'
            >
              <AccountCircle />
            </IconButton>
          </Box>
          <Box sx={{ display: { xs: 'flex', md: 'none' } }}>
            <IconButton
              size="large"
              aria-label="show more"
              aria-controls={mobileMenuId}
              aria-haspopup="true"
              onClick={handleMobileMenuOpen}
              color="inherit"
            >
              <MoreIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>
      {renderMobileMenu}
      {renderMenu}
    </Box>
  );
}