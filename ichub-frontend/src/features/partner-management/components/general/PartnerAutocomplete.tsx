import React, { HTMLAttributes } from 'react';
import {
  Autocomplete,
  TextField,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Button,
  InputAdornment,
  IconButton
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { PartnerInstance } from '../../types/types';

export interface PartnerAutocompleteProps {
  /** Current BPNL value */
  value: string;
  /** Available partners list */
  availablePartners: PartnerInstance[];
  /** Selected partner object */
  selectedPartner: PartnerInstance | null;
  /** Loading state for partners */
  isLoadingPartners: boolean;
  /** Error state for partner loading */
  partnersError: boolean;
  /** Form validation error */
  hasError?: boolean;
  /** Custom label for the input */
  label?: string;
  /** Custom placeholder text */
  placeholder?: string;
  /** Custom helper text */
  helperText?: string;
  /** Error message when validation fails */
  errorMessage?: string;
  /** Whether to show search icon */
  showSearchIcon?: boolean;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Whether the field is required */
  required?: boolean;
  
  /** Callback when BPNL value changes */
  onBpnlChange: (bpnl: string) => void;
  /** Callback when partner is selected */
  onPartnerChange: (partner: PartnerInstance | null) => void;
  /** Callback to retry loading partners */
  onRetryLoadPartners?: () => void;
  /** Callback when search icon is clicked */
  onSearchClick?: () => void;
}

const PartnerAutocomplete: React.FC<PartnerAutocompleteProps> = ({
  value,
  availablePartners,
  isLoadingPartners,
  partnersError,
  hasError = false,
  label = "Partner BPNL",
  placeholder = "Select partner or enter custom BPNL (e.g., BPNL0000000093Q7)",
  helperText = "Select from available partners or enter a custom Business Partner Number Legal Entity",
  errorMessage = "BPNL is required",
  showSearchIcon = false,
  disabled = false,
  required = true,
  onBpnlChange,
  onPartnerChange,
  onRetryLoadPartners,
  onSearchClick
}) => {
  // Safely validate and filter partners to prevent crashes from corrupted data
  const safePartners = React.useMemo(() => {
    if (!Array.isArray(availablePartners)) {
      console.warn('availablePartners is not an array:', availablePartners);
      return [];
    }

    return availablePartners.filter((partner) => {
      // Ensure partner is a valid object with required properties
      if (!partner || typeof partner !== 'object') {
        console.warn('Invalid partner object:', partner);
        return false;
      }

      // Check for required properties
      if (typeof partner.name !== 'string' || typeof partner.bpnl !== 'string') {
        console.warn('Partner missing required properties:', partner);
        return false;
      }

      return true;
    });
  }, [availablePartners]);

  const handleAutocompleteChange = (
    _: React.SyntheticEvent, 
    newValue: string | PartnerInstance | null
  ) => {
    try {
      if (typeof newValue === 'string') {
        // Custom BPNL entered
        onBpnlChange(newValue);
        onPartnerChange(null);
      } else if (newValue && typeof newValue === 'object' && newValue.bpnl) {
        // Partner selected from dropdown
        onBpnlChange(newValue.bpnl);
        onPartnerChange(newValue);
      } else {
        // Cleared
        onBpnlChange('');
        onPartnerChange(null);
      }
    } catch (err) {
      console.error('Error in PartnerAutocomplete onChange:', err);
      // Fallback to safe state
      onBpnlChange('');
      onPartnerChange(null);
    }
  };

  const handleInputChange = (_: React.SyntheticEvent, newInputValue: string) => {
    try {
      onBpnlChange(newInputValue || '');
      // Safely check if partner exists in the array
      if (safePartners.length > 0 && !safePartners.find(p => p?.bpnl === newInputValue)) {
        onPartnerChange(null);
      }
    } catch (err) {
      console.error('Error in PartnerAutocomplete onInputChange:', err);
      // Fallback to safe state
      onBpnlChange(newInputValue || '');
      onPartnerChange(null);
    }
  };

  const getOptionLabel = (option: string | PartnerInstance): string => {
    try {
      if (typeof option === 'string') return option;
      // Safety check for corrupted data from backend errors
      if (!option || typeof option !== 'object') {
        console.warn('Invalid option in getOptionLabel:', option);
        return '';
      }
      const name = option.name || 'Unknown';
      const bpnl = option.bpnl || 'Unknown';
      return `${name} - ${bpnl}`;
    } catch (error) {
      console.warn('Error in getOptionLabel:', error);
      return '';
    }
  };

  const renderOption = (
    props: HTMLAttributes<HTMLLIElement>, 
    option: PartnerInstance
  ) => {
    try {
      // Ensure option is valid before rendering
      if (!option || typeof option !== 'object' || !option.name || !option.bpnl) {
        return null;
      }

      return (
        <Box component="li" {...props} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', py: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
            {option.name}
          </Typography>
          <Typography variant="caption" color="textSecondary">
            {option.bpnl}
          </Typography>
        </Box>
      );
    } catch (error) {
      console.warn('Error rendering partner option:', error);
      return null;
    }
  };

  const shouldShowError = hasError && (!value || !value.trim());
  const displayHelperText = shouldShowError ? errorMessage : helperText;

  return (
    <Box sx={{ width: '100%' }}>
      {/* Partners Loading Error Alert */}
      {partnersError && onRetryLoadPartners && (
        <Alert 
          severity="warning" 
          action={
            <Button 
              color="inherit" 
              size="small" 
              onClick={onRetryLoadPartners}
              disabled={isLoadingPartners}
            >
              Retry
            </Button>
          }
          sx={{ mb: 2 }}
        >
          <Typography variant="body2">
            Unable to load partner list from backend. You can still enter a custom BPNL manually.
          </Typography>
        </Alert>
      )}
      
      <Autocomplete
        freeSolo
        options={safePartners}
        getOptionLabel={getOptionLabel}
        value={value}
        onChange={handleAutocompleteChange}
        onInputChange={handleInputChange}
        disabled={disabled}
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            placeholder={placeholder}
            variant="outlined"
            error={shouldShowError}
            helperText={displayHelperText}
            required={required}
            slotProps={{
              input: {
                ...params.InputProps,
                endAdornment: (
                  <>
                    {isLoadingPartners ? <CircularProgress color="inherit" size={20} /> : null}
                    {params.InputProps.endAdornment}
                    {showSearchIcon && onSearchClick && (
                      <InputAdornment position="end">
                        <IconButton onClick={onSearchClick} disabled={disabled}>
                          <SearchIcon />
                        </IconButton>
                      </InputAdornment>
                    )}
                  </>
                ),
              },
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 3,
                fontSize: '1.1rem',
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.9)'
                },
                '&.Mui-focused': {
                  backgroundColor: 'white'
                }
              },
              '& .MuiInputLabel-root': {
                fontSize: '1.1rem'
              }
            }}
          />
        )}
        renderOption={renderOption}
        loading={isLoadingPartners}
        loadingText="Loading partners..."
        noOptionsText="No partners found. You can still enter a custom BPNL."
        sx={{ width: '100%' }}
      />
    </Box>
  );
};

export default PartnerAutocomplete;