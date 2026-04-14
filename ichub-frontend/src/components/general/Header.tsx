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

import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import Badge from '@mui/material/Badge';
import MenuItem from '@mui/material/MenuItem';
import Menu from '@mui/material/Menu';
import AccountCircle from '@mui/icons-material/AccountCircle';
import Policy from '@mui/icons-material/Policy';
import NotificationsIcon from '@mui/icons-material/Notifications';
import MoreIcon from '@mui/icons-material/MoreVert';
import LanguageIcon from '@mui/icons-material/Language';
import { Divider, ListItemIcon, Typography, Tooltip } from '@mui/material';
import { Logout, Settings, ContentCopy } from '@mui/icons-material';
import { getParticipantId } from '../../services/EnvironmentService';
import useAuth from '../../hooks/useAuth';
import { useNotifications } from '../../features/notifications';

const languages = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'de', name: 'Deutsch' },
  { code: 'fr', name: 'Français' },
  { code: 'zh', name: '中文' },
  { code: 'ja', name: '日本語' },
  { code: 'pt', name: 'Português' }
];

export default function PrimarySearchAppBar() {
  const { i18n, t } = useTranslation('common');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [mobileMoreAnchorEl, setMobileMoreAnchorEl] = useState<null | HTMLElement>(null);
  const [languageAnchorEl, setLanguageAnchorEl] = useState<null | HTMLElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const [participantId, setParticipantId] = useState<string>('CX-Operator');
  const [copied, setCopied] = useState(false);
  
  // Auth hook
  const { isAuthenticated, user, logout } = useAuth();
  
  // Notifications hook
  const { togglePanel, unreadCount, isPanelOpen } = useNotifications();
  
  // Ref for the notifications button to position the panel
  const notificationButtonRef = useRef<HTMLButtonElement>(null);

  const isMenuOpen = Boolean(anchorEl);
  const isMobileMenuOpen = Boolean(mobileMoreAnchorEl);
  const isLanguageMenuOpen = Boolean(languageAnchorEl);

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

  const handleCopyParticipantId = async () => {
    try {
      await navigator.clipboard.writeText(participantId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleLanguageMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setLanguageAnchorEl(event.currentTarget);
  };

  const handleLanguageMenuClose = () => {
    setLanguageAnchorEl(null);
  };

  const handleLanguageChange = (langCode: string) => {
    i18n.changeLanguage(langCode);
    handleLanguageMenuClose();
  };

  const getCurrentLanguage = () => {
    return languages.find(lang => lang.code === i18n.language) || languages[0];
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
      className="header-menu user-menu"
      open={isMenuOpen}
      onClose={handleMenuClose}
      transformOrigin={{ horizontal: 'right', vertical: 'top' }}
      anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
    >
      {/* User Info Section */}
      <Box className="user-info-section">
        <Typography variant="subtitle1" className="user-name" color="text.primary">
          {isAuthenticated && user ? user.firstName + ' ' + user.lastName : t('header.guest')}
        </Typography>
        <Typography variant="body2" className="user-username" color="text.secondary">
          {isAuthenticated && user ? user.username : t('header.guest')}
        </Typography>
        {isAuthenticated && user?.email && (
          <Typography variant="caption" className="user-email" color="text.secondary">
            {user.email}
          </Typography>
        )}
        <Box className="company-id-box">
          <Typography variant="caption" className="company-id-text" color="primary">
            {t('header.companyId', { id: participantId })}
          </Typography>
          <Tooltip title={copied ? t('actions.copied') : t('header.copyId')} arrow>
            <IconButton
              size="small"
              className="copy-button"
              onClick={handleCopyParticipantId}
              color="primary"
            >
              <ContentCopy />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      
      <Divider />

      {/* Menu Options */}
      <MenuItem onClick={handleMenuClose} className="menu-item">
        <ListItemIcon>
          <AccountCircle fontSize="small" color="primary" />
        </ListItemIcon>
        <Typography variant="body2">{t('header.profile')}</Typography>
      </MenuItem>
      <MenuItem onClick={handleMenuClose} className="menu-item">
        <ListItemIcon>
          <Settings fontSize="small" color="primary" />
        </ListItemIcon>
        <Typography variant="body2">{t('header.settings')}</Typography>
      </MenuItem>
      
      <Divider />
      
      <MenuItem onClick={handleLogout} className="menu-item menu-item--logout">
        <ListItemIcon>
          <Logout fontSize="small" color="error" />
        </ListItemIcon>
        <Typography variant="body2" color="error">{t('header.logout')}</Typography>
      </MenuItem>
    </Menu>
  );

  const languageMenuId = 'language-menu';
  const renderLanguageMenu = (
    <Menu
      anchorEl={languageAnchorEl}
      id={languageMenuId}
      className="header-menu language-menu"
      open={isLanguageMenuOpen}
      onClose={handleLanguageMenuClose}
      transformOrigin={{ horizontal: 'right', vertical: 'top' }}
      anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
    >
      {languages.map((lang) => (
        <MenuItem
          key={lang.code}
          onClick={() => handleLanguageChange(lang.code)}
          selected={i18n.language === lang.code}
          className="language-item"
        >
          <img
            src={`/flags/${lang.code}.png`}
            alt={lang.name}
            className="flag-icon"
          />
          <Typography variant="body2">{lang.name}</Typography>
        </MenuItem>
      ))}
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
      className="mobile-menu"
      keepMounted
      transformOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
      open={isMobileMenuOpen}
      onClose={handleMobileMenuClose}
    >
      <MenuItem onClick={() => { handleMobileMenuClose(); togglePanel(); }}>
        <IconButton
          size="large"
          aria-label={`show ${unreadCount} new notifications`}
        >
          <Badge badgeContent={unreadCount} color="error">
            <NotificationsIcon />
          </Badge>
        </IconButton>
        <p>{t('header.notifications')}</p>
      </MenuItem>
      <MenuItem className="mobile-menu-item">
        <IconButton size="large" aria-label="configure policies">
          <Policy />
        </IconButton>
        <p>{t('header.policyConfig')}</p>
      </MenuItem>
      <MenuItem onClick={handleLanguageMenuOpen} className="mobile-menu-item">
        <IconButton size="large" aria-label="select language">
          <LanguageIcon />
        </IconButton>
        <Box className="language-display">
          <img
            src={`/flags/${getCurrentLanguage().code}.png`}
            alt={getCurrentLanguage().name}
            className="flag-icon"
          />
          {getCurrentLanguage().name}
        </Box>
      </MenuItem>
      <MenuItem onClick={handleProfileMenuOpen} className="mobile-menu-item">
        <IconButton size="large" aria-label="account of current user">
          <AccountCircle />
        </IconButton>
        <p>{t('header.profile')}</p>
      </MenuItem>
    </Menu>
  );

  return (
    <Box className="header-wrapper">
      <AppBar position="static" className={`ichub-header ${scrolled ? "scrolled" : ""}`}>
        <Toolbar>
          <Box className="logo-container logo-container--mobile">
            <a href="/">
              <img
                src="/241117_Tractus_X_Logo_Only_RGB.png"
                alt="Eclipse Tractus-X logo"
                className="small-logo"
              />
            </a>
          </Box>
          <Box className="logo-container logo-container--desktop">
            <a href="/">
              <img
                src="/241117_Tractus_X_Logo_RGB_Light_Version.png"
                alt="Eclipse Tractus-X logo"
                className="main-logo"
              />
            </a>
          </Box>
          <Box className="header-title-container">
            <Typography variant="h1" className="header-title">
              {t('app.name')}
            </Typography>
          </Box>
          <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 2, alignItems: 'center' }}>
            <Tooltip title={isPanelOpen ? t('header.closeMessages') : t('header.openMessages')} arrow>
              <IconButton
                ref={notificationButtonRef}
                size="large"
                aria-label={`show ${unreadCount} new notifications`}
                onClick={togglePanel}
                sx={{
                  color: 'white',
                  position: 'relative',
                  '&:hover': {
                    backgroundColor: 'rgba(25, 118, 210, 0.2)',
                    transform: 'translateY(-1px)',
                    boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)'
                  },
                  transition: 'all 0.2s ease-in-out',
                  ...(isPanelOpen && {
                    backgroundColor: 'rgba(25, 118, 210, 0.3)',
                    '&:hover': {
                      backgroundColor: 'rgba(25, 118, 210, 0.4)',
                    },
                  }),
                }}
              >
                <Badge 
                  badgeContent={unreadCount} 
                  color="error"
                >
                  <NotificationsIcon />
                </Badge>
              </IconButton>
            </Tooltip>
            <Tooltip title={t('header.policyComingSoon')} arrow>
              <IconButton 
                size="large"
                className="header-icon-button"
                aria-label="configure policies"
              >
                <Policy/>
              </IconButton>
            </Tooltip>
            <Tooltip title={t('header.language', { language: getCurrentLanguage().name })} arrow>
              <IconButton
                size="large"
                className="header-icon-button"
                aria-label="select language"
                aria-controls={languageMenuId}
                aria-haspopup="true"
                onClick={handleLanguageMenuOpen}
              >
                <LanguageIcon />
              </IconButton>
            </Tooltip>
            <IconButton
              size="large"
              edge="end"
              aria-label="account of current user"
              aria-controls={menuId}
              aria-haspopup="true"
              onClick={handleProfileMenuOpen}
              className="user-button"
            >
              <AccountCircle />
            </IconButton>
          </Box>
          <Box className="header-actions header-actions--mobile">
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
      {renderLanguageMenu}
    </Box>
  );
}