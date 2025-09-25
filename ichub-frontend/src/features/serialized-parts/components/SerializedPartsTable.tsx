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

import {
  Box,
  Typography,
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { SerializedPart } from '../types';

interface SerializedPartsTableProps {
  parts: SerializedPart[];
  onView?: (part: SerializedPart) => void;
}

const SerializedPartsTable = ({ parts }: SerializedPartsTableProps) => {

  // Transform data for DataGrid
  const rows = parts.map((part, index) => ({
    id: part.id || `part-${index}`,
    customerPartId: part.customerPartId,
    businessPartnerName: part.businessPartner.name,
    businessPartnerBpnl: part.businessPartner.bpnl,
    manufacturerId: part.manufacturerId,
    manufacturerPartId: part.manufacturerPartId,
    partInstanceId: part.partInstanceId || '',
    name: part.name,
    category: part.category,
    bpns: part.bpns,
    van: part.van
  }));

  // Define columns for DataGrid
  const columns: GridColDef[] = [
    {
      field: 'customerPartId',
      headerName: 'Customer Part ID',
      width: 260,
      align: 'left',
      headerAlign: 'center',
      renderCell: (params) => (        
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
            {params.value}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'businessPartnerName',
      headerName: 'Business Partner',
      width: 180,
      renderCell: (params) => (        
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
            {params.value}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'businessPartnerBpnl',
      headerName: 'Business Partner BPNL',
      width: 200,
      renderCell: (params) => (        
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
            {params.value}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'manufacturerId',
      headerName: 'Manufacturer ID',
      width: 170,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
            {params.value}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'manufacturerPartId',
      headerName: 'Manufacturer Part ID',
      width: 180,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
            {params.value}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'partInstanceId',
      headerName: 'Part Instance ID',
      width: 270,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
            {params.value || '-'}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'name',
      headerName: 'Name',
      width: 240,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
            {params.value || '-'}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'category',
      headerName: 'Category',
      width: 200,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
            {params.value || '-'}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'bpns',
      headerName: 'BPNS',
      width: 180,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
            {params.value || '-'}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'van',
      headerName: 'VAN',
      width: 150,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
            {params.value || '-'}
          </Typography>
        </Box>
      ),
    },
  ];

  return (
    <Box sx={{ height: '100%', width: '100%' }}>
      <DataGrid
        rows={rows}
        columns={columns}
        initialState={{
          pagination: {
            paginationModel: { page: 0, pageSize: 25 },
          },
          sorting: {
            sortModel: [{ field: 'id', sort: 'asc' }],
          },
        }}
        pageSizeOptions={[10, 25, 50, 100]}
        disableRowSelectionOnClick
        disableColumnFilter={false}
        disableColumnSelector={false}
        disableDensitySelector={false}
        rowHeight={50}
        className='custom-data-grid'
      />
    </Box>
  );
};

export default SerializedPartsTable;