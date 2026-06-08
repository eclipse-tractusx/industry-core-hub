/********************************************************************************
 * Eclipse Tractus-X - Industry Core Hub Frontend
 *
 * Copyright (c) 2026 Contributors to the Eclipse Foundation
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
 * License for the specific language governing permissions and limitations
 * under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 ********************************************************************************/

import { useState } from 'react';
import { Box, Chip, IconButton, InputAdornment, TextField, Tooltip, Typography } from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import { useTranslation } from 'react-i18next';

const BPNS_REGEX = /^BPNS[A-Z0-9]{12}$/;

interface BpnsInputProps {
  /** Current list of BPNS values. */
  value: string[];
  onChange: (next: string[]) => void;
  /** Section heading shown above the input. */
  label?: string;
  disabled?: boolean;
}

/**
 * Reusable BPNS / site-location chip input shared across all CCM forms.
 * Type a value and press Enter (or click the + button) to add it to the list.
 */
export const BpnsInput = ({
  value,
  onChange,
  label,
  disabled = false,
}: BpnsInputProps) => {
  const { t } = useTranslation('certificateManagement');
  const resolvedLabel = label ?? t('bpnsInput.label');
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const commit = () => {
    const val = input.trim().toUpperCase();
    if (!val) return;
    if (!BPNS_REGEX.test(val)) {
      setError(t('bpnsInput.errorFormat'));
      return;
    }
    if (value.includes(val)) {
      setError(t('bpnsInput.errorDuplicate'));
      return;
    }
    onChange([...value, val]);
    setInput('');
    setError(null);
  };

  const remove = (bpn: string) => onChange(value.filter((b) => b !== bpn));

  return (
    <Box>
      {/* Label row */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
        <LocationOnIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
        <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
          {resolvedLabel}
          <Typography component="span" variant="caption" color="text.disabled" sx={{ ml: 0.75 }}>
            {t('bpnsInput.optional')}
          </Typography>
        </Typography>
      </Box>

      {/* Input row */}
      <TextField
        value={input}
        onChange={(e) => {
          setInput(e.target.value.toUpperCase());
          setError(null);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit();
          }
        }}
        placeholder={t('bpnsInput.placeholder')}
        size="small"
        fullWidth
        disabled={disabled}
        error={!!error}
        helperText={error ?? t('bpnsInput.helper')}
        inputProps={{ style: { fontFamily: 'monospace', letterSpacing: '0.03em' } }}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <Tooltip title={t('bpnsInput.addTooltip')}>
                <span>
                  <IconButton
                    size="small"
                    edge="end"
                    disabled={disabled || !input.trim()}
                    onClick={commit}
                    sx={{
                      color: 'primary.main',
                      '&:hover': { color: 'primary.dark' },
                      '&.Mui-disabled': { color: 'action.disabled' },
                    }}
                  >
                    <AddCircleOutlineIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            </InputAdornment>
          ),
        }}
      />

      {/* Chip list */}
      {value.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 1 }}>
          {value.map((bpn) => (
            <Chip
              key={bpn}
              label={bpn}
              size="small"
              onDelete={disabled ? undefined : () => remove(bpn)}
              sx={{
                fontFamily: 'monospace',
                fontSize: '0.75rem',
                backgroundColor: 'action.selected',
                border: '1px solid',
                borderColor: 'divider',
              }}
            />
          ))}
        </Box>
      )}
    </Box>
  );
};
