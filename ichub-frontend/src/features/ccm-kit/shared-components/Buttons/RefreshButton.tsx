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

import { CircularProgress, IconButton, Tooltip } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useTranslation } from 'react-i18next';

const CCM_PRIMARY = '#9D6FD4';

interface RefreshButtonProps {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  tooltip?: string;
}

/**
 * Standardised refresh icon-button for all CCM KIT feature headers.
 * Idle: semi-transparent grey; Hover: CCM purple accent.
 */
const RefreshButton = ({
  onClick,
  disabled = false,
  loading = false,
  tooltip,
}: RefreshButtonProps) => {
  const { t } = useTranslation('certificateManagement');
  return (
  <Tooltip title={tooltip ?? t('common.refresh')}>
    <span>
      <IconButton
        onClick={onClick}
        disabled={disabled || loading}
        sx={{
          color: 'rgba(255,255,255,0.7)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 1.5,
          '&:hover': {
            color: CCM_PRIMARY,
            borderColor: 'rgba(157,111,212,0.3)',
            backgroundColor: 'rgba(157,111,212,0.1)',
          },
          '&.Mui-disabled': {
            color: 'rgba(255,255,255,0.25)',
            borderColor: 'rgba(255,255,255,0.06)',
          },
        }}
      >
        {loading ? (
          <CircularProgress size={22} sx={{ color: CCM_PRIMARY }} />
        ) : (
          <RefreshIcon />
        )}
      </IconButton>
    </span>
  </Tooltip>
  );
};

export default RefreshButton;
