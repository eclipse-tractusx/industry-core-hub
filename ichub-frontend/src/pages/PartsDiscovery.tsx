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

import { useState } from 'react';
import {
  Box,
  Grid2,
  Typography,
  Radio,
  RadioGroup,
  FormControlLabel,
  Slider,
  TextField,
  Button,
  InputAdornment,
  IconButton
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import type { ApiPartData, PartType } from '../types/product';
import { ProductCard } from '../features/catalog-management/components/product-list/ProductCard';
import { mapApiPartDataToPartType } from '../features/catalog-management/utils';
import InstanceProductsTable from '../features/catalog-management/components/product-detail/InstanceProductsTable';

const PartsDiscovery = () => {
  const [partType, setPartType] = useState('Part');
  const [numParts, setNumParts] = useState(10);
  const [bpnl, setBpnl] = useState('');
  const [parts, setParts] = useState<PartType[]>([]);
  
  const handleSearchClick = async () => {
    if (!bpnl) {
      alert('Please enter a partner BPNL');
      return;
    }

    try {
      console.log(`Searching for parts with BPNL: ${bpnl}`);
      // Here we should call the API to fetch parts based on the BPNL and part type
      const fakeParts: ApiPartData[] = Array.from({ length: numParts }).map((_, idx) => ({
        manufacturerId: `MFR-${idx + 1}`,
        manufacturerPartId: `PART-${idx + 1}`,
        name: `Part Name ${idx + 1}`,
        status: 2,
        description: `Description for part ${idx + 1}`,
        category: 'Category A',
        materials: [],
      }));
      
      const mappedFakeParts: PartType[] = fakeParts.map((part) =>
        mapApiPartDataToPartType(part)
      );

      mappedFakeParts.reverse();

      setParts(mappedFakeParts);
    } catch (error) {
      console.error('Error al buscar:', error);
      alert('Error');
    }
  };

  return (
    <Grid2 container direction="row">
      {/* Sidebar */}
      <Grid2 size={{ lg: 2, md: 4, sm: 12 }} padding={4} className="parts-discovery-sidebar">
        <Typography variant="subtitle1">Part Type</Typography>
        <RadioGroup value={partType} onChange={(e) => setPartType(e.target.value)}>
          <FormControlLabel value="Part" control={<Radio />} label="Part Type" />
          <FormControlLabel value="Serialized" control={<Radio />} label="Serialized" />
        </RadioGroup>

        <Grid2 container mt={4}>
          <Grid2 size={10}>
            <Typography>Nº Parts</Typography>
            <Slider
              value={numParts}
              min={1}
              max={20}
              onChange={(_, val) => {
                if (typeof val === 'number') {
                  setNumParts(val);
                }
              }}
              valueLabelDisplay="auto"
            />
          </Grid2>
          <Grid2 size={2}>
            <Box display="flex" justifyContent="center" alignItems="center" height="100%">
              <Typography variant="h4">{numParts}</Typography>
            </Box>
          </Grid2>
        </Grid2>
      </Grid2>

      {/* Main Content */}
      <Grid2 size={{ lg: 10, md: 8, sm: 12 }}>
        <Typography variant="h1" align="center" marginTop={{md: 15, sm: 10}} marginBottom={{md: 8, sm: 4}} sx={{ fontWeight: '500', color: '#f8f9fa' }}>
          Parts Discovery
        </Typography>

        {/* Search fields */}
        <Box display="flex" flexDirection="column" alignItems="center" gap={2} mb={3}>
          <Grid2 size={{ xl: 8, lg: 9, sm: 10, xs: 12 }}>
            <TextField
              fullWidth
              placeholder="Introduce partner BPNL"
              variant="outlined"
              size="small"
              value={bpnl}
              onChange={(e) => setBpnl(e.target.value)}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton size="small">
                        <SearchIcon />
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Grid2>
          <Grid2 size={{ xl: 8, lg: 9, sm: 10, xs: 12 }} marginTop={2}>
            <TextField
              fullWidth
              placeholder="AAS-ID"
              variant="outlined"
              size="small"
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton size="small">
                        <SearchIcon />
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Grid2>
          <Grid2 size={{ lg: 2, sm: 4, xs: 6 }} marginTop={4}>
            <Button
              className="parts-discovery-search-button"
              variant="outlined"
              color="primary"
              size="large"
              fullWidth={true}
              onClick={handleSearchClick}
            >
              Search
              <SearchIcon sx={{ marginLeft: 1 }} />
            </Button>
          </Grid2>
        </Box>

        {/* Parts grid */}
        <Grid2 container spacing={2} margin={3} justifyContent="center">
        {partType === 'Serialized' ? (
          <Grid2 size={12} className='product-table-wrapper'>
            <InstanceProductsTable />
          </Grid2>
        ) : (
          <ProductCard
            onClick={() => {}}
            onShare={() => {}}
            onMore={() => {}}
            onRegisterClick={() => {}}
            items={parts.slice(0, numParts).map((part) => ({
              manufacturerId: part.manufacturerId,
              manufacturerPartId: part.manufacturerPartId,
              name: part.name,
              category: part.category,
              status: part.status,
            }))}
            isLoading={false}
            isDiscovery={true}
          />
        )}
        </Grid2>
      </Grid2>
    </Grid2>
  );
};

export default PartsDiscovery;