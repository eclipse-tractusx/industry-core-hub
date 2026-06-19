/********************************************************************************
 * Eclipse Tractus-X - Industry Core Hub Frontend
 *
 * Copyright (c) 2026 Capgemini Deutschland GmbH
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
 * License for the specific language govern in permissions and limitations
 * under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 ********************************************************************************/

import React from 'react';
import { Grid2, Typography } from '@mui/material';

export function InfoRow({
  label,
  value,
  unit,
}: {
  label: string;
  value?: React.ReactNode;
  unit?: string;
}) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <Grid2 size={{ xs: 12, sm: 6, md: 4 }}>
      <Typography variant="subtitle2" color="text.secondary">{label}</Typography>
      <Typography variant="body2">
        {value}{unit ? ` ${unit}` : ''}
      </Typography>
    </Grid2>
  );
}
