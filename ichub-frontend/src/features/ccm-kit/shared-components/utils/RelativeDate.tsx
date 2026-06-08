/********************************************************************************
 * Eclipse Tractus-X - Industry Core Hub Frontend
 *
 * Copyright (c) 2026 LKS Next
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

import { Tooltip, Typography } from '@mui/material';
import { formatRelativeDate, formatAbsoluteDateTime } from './formatRelativeDate';

interface RelativeDateProps {
  value?: string | null;
}

/**
 * Displays a timestamp in a compact, Gmail-style relative form while exposing
 * the full date/time on hover. Intended for activity columns in CCM tables.
 */
const RelativeDate = ({ value }: RelativeDateProps) => {
  const relative = formatRelativeDate(value);

  if (relative === '—') {
    return (
      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
        —
      </Typography>
    );
  }

  return (
    <Tooltip title={formatAbsoluteDateTime(value)} arrow placement="top">
      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', cursor: 'default' }}>
        {relative}
      </Typography>
    </Tooltip>
  );
};

export default RelativeDate;
