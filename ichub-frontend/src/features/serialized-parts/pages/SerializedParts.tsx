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

import { Box, Grid2, Typography } from '@mui/material';
import { useState, useEffect } from 'react';
import { fetchAllSerializedParts } from '../api';
import SerializedPartsTable from '../components/SerializedPartsTable';
import { SerializedPart } from '../types';

const SerializedParts = () => {
  const [serializedParts, setSerializedParts] = useState<SerializedPart[]>([]);

  const loadData = async () => {
    try {
      const data = await fetchAllSerializedParts();
      setSerializedParts(data);
    } catch (error) {
      console.error("Error fetching instance products:", error);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = () => {
    console.log("Refreshing serialized parts data");
    loadData();
  };

  return (
    <Grid2 container direction="row">
      <Box sx={{ p: 3, mx: 'auto',  color: 'white'}} className="product-catalog title">
        <Typography className="text">Serialized Parts</Typography>
      </Box>
      <Box sx={{ p: 3, width: '100%', color: 'white'}}>
        <SerializedPartsTable 
          parts={serializedParts} 
          onView={(part) => {
            console.log("View part:", part);
          }}
          onRefresh={handleRefresh}
        />
      </Box>
    </Grid2>
  );
};

export default SerializedParts;