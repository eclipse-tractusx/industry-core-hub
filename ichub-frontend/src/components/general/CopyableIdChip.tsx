/********************************************************************************
 * Eclipse Tractus-X - Industry Core Hub Frontend
 *
 * Copyright (c) 2026 LKS Next
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
import { useTranslation } from 'react-i18next';
import { Chip, Tooltip } from '@mui/material';
import { ContentCopy, Check } from '@mui/icons-material';

interface CopyableIdChipProps {
  /** The identifier value shown in the chip and copied to the clipboard */
  value: string;
}

/**
 * A small chip that displays an identifier (e.g. a BPNL or BPNS) and copies it
 * to the clipboard when clicked, showing a transient "Copied!" confirmation.
 */
export default function CopyableIdChip({ value }: CopyableIdChipProps) {
  const { t } = useTranslation('common');
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <Tooltip title={copied ? t('actions.copied') : t('actions.copyToClipboard')} arrow>
      <Chip
        icon={copied ? <Check sx={{ fontSize: 15 }} /> : <ContentCopy sx={{ fontSize: 14 }} />}
        label={value}
        onClick={handleCopy}
        size="small"
        variant="outlined"
        color={copied ? 'success' : 'primary'}
        sx={{
          fontSize: '0.72rem',
          height: 24,
          maxWidth: '100%',
          fontWeight: 600,
          letterSpacing: '0.3px',
          cursor: 'pointer',
          // MUI applies a negative margin-right to the icon on small chips, which
          // makes it look glued to the label — override it to add clear separation.
          '& .MuiChip-icon': { fontSize: 15, marginLeft: '7px', marginRight: '3px' },
          '& .MuiChip-label': { paddingLeft: '4px', paddingRight: '10px' },
          transition: 'all 0.15s ease-in-out',
        }}
      />
    </Tooltip>
  );
}
