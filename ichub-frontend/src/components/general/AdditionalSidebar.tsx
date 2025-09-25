/********************************************************************************
 * Eclipse Tractus-X - Industry Core Hub Frontend
 *
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

import React from 'react';
import { Box } from '@mui/material';
import { useAdditionalSidebar } from '../../hooks/useAdditionalSidebar';

const AdditionalSidebar: React.FC = () => {
  const { isVisible, content } = useAdditionalSidebar();

  return (
    <Box
      sx={{
        background: 'linear-gradient(180deg, #1e3a8a 0%, #1e40af 50%, #2563eb 100%)',
        height: '100%',
        borderRight: '1px solid rgba(59, 130, 246, 0.2)',
        boxShadow: '4px 0 16px rgba(30, 58, 138, 0.1)',
        width: isVisible ? '320px' : '0px',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transition: 'width 0.15s ease-out',
        backgroundColor: '#1e3a8a', // Fallback background to prevent gap
      }}
    >
      <Box sx={{ width: '320px', minWidth: '320px' }}>
        {content}
      </Box>
    </Box>
  );
};

export default AdditionalSidebar;
