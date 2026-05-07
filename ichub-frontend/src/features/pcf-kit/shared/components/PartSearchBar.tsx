/*
 * Copyright (c) 2024, 2025 Cofinity-X GmbH
 * Copyright (c) 2024, 2025 Contributors to the Eclipse Foundation
 *
 * This work is licensed under the Creative Commons Attribution 4.0 International License (CC-BY-4.0).
 */

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  IconButton,
  Paper,
  Chip,
  Fade,
  Slide,
  Tooltip,
  alpha,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

// PCF Green Theme
const PCF_GREEN = {
  primary: '#10b981',
  secondary: '#059669',
  dark: '#047857',
  light: '#34d399',
  lighter: '#6ee7b7',
  gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
};

interface PartSearchBarProps {
  /**
   * Mode of display:
   * - 'centered': Full page search with centered card, icon, title, subtitle, search
   * - 'top': Compact header with search bar, back button, and current part chip
   */
  mode: 'centered' | 'top';
  /**
   * Icon component to display (e.g., CloudDownloadIcon or CloudUploadIcon)
   */
  icon: React.ReactNode;
  /**
   * Title text for the page
   */
  title: string;
  /**
   * Subtitle text for the page
   */
  subtitle: string;
  /**
   * Placeholder text for the search input
   */
  searchPlaceholder?: string;
  /**
   * Current search value
   */
  searchValue: string;
  /**
   * Callback when search value changes
   */
  onSearchChange: (value: string) => void;
  /**
   * Callback when search is submitted
   */
  onSearchSubmit: () => void;
  /**
   * Callback when back button is clicked (only in 'top' mode)
   */
  onBack?: () => void;
  /**
   * Current part ID to display (only in 'top' mode)
   */
  currentPartId?: string;
  /**
   * Whether the search button should be disabled
   */
  isSearchDisabled?: boolean;
  /**
   * Whether to show the header section (title, icon, subtitle) in 'top' mode
   * Default is true
   */
  showHeader?: boolean;
}

export const PartSearchBar = ({
  mode,
  icon,
  title,
  subtitle,
  searchPlaceholder = 'Search for a part...',
  searchValue,
  onSearchChange,
  onSearchSubmit,
  onBack,
  currentPartId,
  isSearchDisabled = false,
  showHeader = true,
}: PartSearchBarProps) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isSearchDisabled) {
      onSearchSubmit();
    }
  };

  const handleClear = () => {
    onSearchChange('');
  };

  // Centered mode - full page search experience
  if (mode === 'centered') {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          p: 3,
        }}
      >
        <Fade in={isVisible} timeout={600}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              maxWidth: 600,
              width: '100%',
            }}
          >
            {/* Icon */}
            <Box
              sx={{
                width: 100,
                height: 100,
                borderRadius: '50%',
                background: PCF_GREEN.gradient,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 3,
                boxShadow: `0 8px 32px ${alpha(PCF_GREEN.primary, 0.3)}`,
                '& .MuiSvgIcon-root': {
                  fontSize: 48,
                  color: 'white',
                },
              }}
            >
              {icon}
            </Box>

            {/* Title */}
            <Typography
              variant="h3"
              sx={{
                fontWeight: 700,
                background: PCF_GREEN.gradient,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                mb: 1,
                textAlign: 'center',
              }}
            >
              {title}
            </Typography>

            {/* Subtitle */}
            <Typography
              variant="h6"
              sx={{
                color: 'text.secondary',
                textAlign: 'center',
                mb: 4,
                fontWeight: 400,
              }}
            >
              {subtitle}
            </Typography>

            {/* Search Card */}
            <Paper
              elevation={0}
              sx={{
                width: '100%',
                p: 3,
                borderRadius: 3,
                background: alpha('#1a1a2e', 0.6),
                backdropFilter: 'blur(20px)',
                border: `1px solid ${alpha(PCF_GREEN.primary, isFocused ? 0.5 : 0.2)}`,
                transition: 'all 0.3s ease',
                transform: isFocused ? 'scale(1.02)' : 'scale(1)',
                boxShadow: isFocused
                  ? `0 8px 40px ${alpha(PCF_GREEN.primary, 0.25)}`
                  : `0 4px 20px ${alpha('#000', 0.1)}`,
              }}
            >
              <TextField
                fullWidth
                placeholder={searchPlaceholder}
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                onKeyPress={handleKeyPress}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon
                          sx={{
                            color: isFocused ? PCF_GREEN.primary : 'text.secondary',
                            transition: 'color 0.3s ease',
                          }}
                        />
                      </InputAdornment>
                    ),
                    endAdornment: searchValue && (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={handleClear}>
                          <CloseIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    backgroundColor: alpha('#0a0a0f', 0.5),
                    fontSize: '1.1rem',
                    '& fieldset': {
                      borderColor: 'transparent',
                    },
                    '&:hover fieldset': {
                      borderColor: alpha(PCF_GREEN.primary, 0.3),
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: PCF_GREEN.primary,
                      borderWidth: 2,
                    },
                  },
                }}
              />

              {/* Search Button */}
              <Box
                sx={{
                  mt: 2,
                  display: 'flex',
                  justifyContent: 'center',
                }}
              >
                <Box
                  component="button"
                  onClick={onSearchSubmit}
                  disabled={isSearchDisabled}
                  sx={{
                    px: 4,
                    py: 1.5,
                    background: isSearchDisabled
                      ? alpha(PCF_GREEN.primary, 0.3)
                      : PCF_GREEN.gradient,
                    border: 'none',
                    borderRadius: 2,
                    color: 'white',
                    fontWeight: 600,
                    fontSize: '1rem',
                    cursor: isSearchDisabled ? 'not-allowed' : 'pointer',
                    transition: 'all 0.3s ease',
                    '&:hover:not(:disabled)': {
                      transform: 'translateY(-2px)',
                      boxShadow: `0 4px 20px ${alpha(PCF_GREEN.primary, 0.4)}`,
                    },
                  }}
                >
                  Search Part
                </Box>
              </Box>
            </Paper>

            {/* Helper Text */}
            <Typography
              variant="body2"
              sx={{
                color: 'text.secondary',
                mt: 3,
                textAlign: 'center',
              }}
            >
              Enter a part number to get started
            </Typography>
          </Box>
        </Fade>
      </Box>
    );
  }

  // Top mode - compact header with optional page header section
  return (
    <Slide in={true} direction="down" timeout={300}>
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          background: 'linear-gradient(180deg, rgba(10,10,15,0.98) 0%, rgba(10,10,15,0.95) 100%)',
          backdropFilter: 'blur(20px)',
          borderBottom: `1px solid ${alpha(PCF_GREEN.primary, 0.1)}`,
        }}
      >
        {/* Page Header Section */}
        {showHeader && (
          <Box
            sx={{
              px: 3,
              pt: 2,
              pb: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
            }}
          >
            {/* Back Button */}
            {onBack && (
              <Tooltip title="Back to search">
                <IconButton
                  onClick={onBack}
                  sx={{
                    color: 'text.secondary',
                    '&:hover': {
                      color: PCF_GREEN.primary,
                      backgroundColor: alpha(PCF_GREEN.primary, 0.1),
                    },
                  }}
                >
                  <ArrowBackIcon />
                </IconButton>
              </Tooltip>
            )}

            {/* Icon */}
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: PCF_GREEN.gradient,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                '& .MuiSvgIcon-root': {
                  fontSize: 20,
                  color: 'white',
                },
              }}
            >
              {icon}
            </Box>

            {/* Title and Subtitle */}
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 700,
                  background: PCF_GREEN.gradient,
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  lineHeight: 1.2,
                }}
              >
                {title}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: 'text.secondary',
                  display: 'block',
                }}
              >
                {subtitle}
              </Typography>
            </Box>

            {/* Current Part Chip */}
            {currentPartId && (
              <Chip
                label={currentPartId}
                size="small"
                sx={{
                  background: alpha(PCF_GREEN.primary, 0.15),
                  color: PCF_GREEN.light,
                  border: `1px solid ${alpha(PCF_GREEN.primary, 0.3)}`,
                  fontWeight: 600,
                  fontFamily: 'monospace',
                  '& .MuiChip-label': {
                    px: 1.5,
                  },
                }}
              />
            )}
          </Box>
        )}

        {/* Search Bar Section */}
        <Box
          sx={{
            px: 3,
            py: 1.5,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
          }}
        >
          {/* Back Button (if no header shown) */}
          {!showHeader && onBack && (
            <Tooltip title="Back to search">
              <IconButton
                onClick={onBack}
                sx={{
                  color: 'text.secondary',
                  '&:hover': {
                    color: PCF_GREEN.primary,
                    backgroundColor: alpha(PCF_GREEN.primary, 0.1),
                  },
                }}
              >
                <ArrowBackIcon />
              </IconButton>
            </Tooltip>
          )}

          {/* Search Input */}
          <TextField
            size="small"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyPress={handleKeyPress}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            sx={{
              flexGrow: 1,
              maxWidth: 400,
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                backgroundColor: alpha('#1a1a2e', 0.6),
                '& fieldset': {
                  borderColor: alpha(PCF_GREEN.primary, 0.2),
                },
                '&:hover fieldset': {
                  borderColor: alpha(PCF_GREEN.primary, 0.4),
                },
                '&.Mui-focused fieldset': {
                  borderColor: PCF_GREEN.primary,
                },
              },
            }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon
                      sx={{
                        color: isFocused ? PCF_GREEN.primary : 'text.secondary',
                        fontSize: 20,
                      }}
                    />
                  </InputAdornment>
                ),
                endAdornment: searchValue && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={handleClear}>
                      <CloseIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />

          {/* Search Button */}
          <Box
            component="button"
            onClick={onSearchSubmit}
            disabled={isSearchDisabled}
            sx={{
              px: 2,
              py: 0.8,
              background: isSearchDisabled
                ? alpha(PCF_GREEN.primary, 0.3)
                : PCF_GREEN.gradient,
              border: 'none',
              borderRadius: 1.5,
              color: 'white',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: isSearchDisabled ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap',
              '&:hover:not(:disabled)': {
                transform: 'translateY(-1px)',
                boxShadow: `0 2px 12px ${alpha(PCF_GREEN.primary, 0.3)}`,
              },
            }}
          >
            Search
          </Box>
        </Box>
      </Box>
    </Slide>
  );
};

export default PartSearchBar;
