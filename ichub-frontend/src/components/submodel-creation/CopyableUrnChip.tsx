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

import React, { useState } from 'react';
import { Chip } from '@mui/material';
import FingerprintIcon from '@mui/icons-material/Fingerprint';

interface CopyableUrnChipProps {
  urn: string;
  onCopySuccess?: (urn: string) => void;
}


const CopyableUrnChip: React.FC<CopyableUrnChipProps> = ({ urn, onCopySuccess }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(urn);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
      if (onCopySuccess) {
        onCopySuccess(urn);
      }
    } catch {}
  };

  return (
    <Chip
      icon={<FingerprintIcon sx={{ color: '#fff', fontSize: 16 }} />}
      label={
        <span
          style={{
            fontWeight: 500,
            fontSize: '12px',
            wordBreak: 'break-all',
            whiteSpace: 'pre-line',
            display: 'inline-block',
            maxWidth: 320,
            lineHeight: 1.3,
            paddingTop: 4,
            paddingBottom: 4,
          }}
        >
          {urn}
        </span>
      }
      variant="outlined"
      size="small"
      onClick={handleCopy}
      sx={{
        mt: 1,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderColor: 'rgba(255,255,255,0.3)',
        color: '#fff',
        fontSize: '12px',
        fontWeight: 500,
        px: 1.2,
        minHeight: 38,
        cursor: 'pointer',
        '& .MuiChip-icon': {
          color: '#fff',
          fontSize: 16
        },
        '& .MuiChip-label': {
          color: '#fff',
          fontSize: '12px',
          fontWeight: 500,
          px: 1,
          wordBreak: 'break-all',
          whiteSpace: 'pre-line',
          display: 'inline-block',
          maxWidth: 320,
          lineHeight: 1.3,
          paddingTop: '4px',
          paddingBottom: '4px',
        }
      }}
    />
  );
};

export default CopyableUrnChip;