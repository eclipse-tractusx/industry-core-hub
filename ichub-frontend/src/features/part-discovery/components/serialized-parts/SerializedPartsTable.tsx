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
  Typography,
  Chip,
  Tooltip
} from '@mui/material';
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import ContentCopy from '@mui/icons-material/ContentCopy';
import Download from '@mui/icons-material/Download';
import CheckCircle from '@mui/icons-material/CheckCircle';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { SerializedPartData } from '../../types/types';

interface SerializedPartsTableProps {
  parts: SerializedPartData[];
  onView?: (part: SerializedPartData) => void;
}

const SerializedPartsTable = ({ parts, onView }: SerializedPartsTableProps) => {
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  const handleCopyAasId = async (aasId: string, partId: string) => {
    try {
      await navigator.clipboard.writeText(aasId);
      console.log('AAS ID copied to clipboard:', aasId);
      setCopySuccess(partId);
      
      // Reset after 2 seconds
      setTimeout(() => {
        setCopySuccess(null);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy AAS ID:', err);
    }
  };

  const handleDownloadTwinData = (part: SerializedPartData) => {
    if (part.rawTwinData) {
      try {
        const jsonString = JSON.stringify(part.rawTwinData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `twin-${part.manufacturerPartId || part.aasId || 'data'}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        console.log('Twin data downloaded successfully');
      } catch (err) {
        console.error('Failed to download twin data:', err);
      }
    }
  };

  // Transform data for DataGrid
  const rows = parts.map((part, index) => ({
    id: part.id || `part-${index}`,
    dtrIndex: part.dtrIndex,
    globalAssetId: part.globalAssetId,
    aasId: part.aasId,
    idShort: part.idShort,
    manufacturerId: part.manufacturerId,
    manufacturerPartId: part.manufacturerPartId,
    customerPartId: part.customerPartId || '',
    partInstanceId: part.partInstanceId || '',
    digitalTwinType: part.digitalTwinType,
    submodelCount: part.submodelCount,
    rawTwinData: part.rawTwinData
  }));

  // Define columns for DataGrid
  const columns: GridColDef[] = [
    {
      field: 'dtrIndex',
      headerName: 'DTR Source',
      width: 100,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <Chip
          label={`DTR${params.value !== undefined ? params.value + 1 : 'X'}`}
          size="small"
          color="success"
          variant="filled"
          sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}
        />
      ),
    },
    {
      field: 'globalAssetId',
      headerName: 'Global Asset ID',
      width: 280,
      renderCell: (params) => (
        <Tooltip title={params.value} arrow>
          <Typography 
            variant="body2" 
            sx={{ 
              fontFamily: 'monospace',
              fontSize: '0.8rem',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              height: '100%'
            }}
          >
            {params.value}
          </Typography>
        </Tooltip>
      ),
    },
    {
      field: 'aasId',
      headerName: 'AAS ID',
      width: 280,
      renderCell: (params) => (
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1,
          height: '100%',
          width: '100%'
        }}>
          <Tooltip title={params.value} arrow>
            <Typography 
              variant="body2" 
              sx={{ 
                fontFamily: 'monospace',
                fontSize: '0.8rem',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flex: 1
              }}
            >
              {params.value}
            </Typography>
          </Tooltip>
        </Box>
      ),
    },
    {
      field: 'idShort',
      headerName: 'ID Short',
      width: 180,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <Typography 
            variant="body2" 
            sx={{ 
              fontSize: '0.875rem',
              fontFamily: 'monospace',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {params.value || '-'}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'manufacturerId',
      headerName: 'Manufacturer ID',
      width: 150,
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
      field: 'customerPartId',
      headerName: 'Customer Part ID',
      width: 150,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
            {params.value || '-'}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'partInstanceId',
      headerName: 'Part Instance ID',
      width: 150,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
            {params.value || '-'}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'digitalTwinType',
      headerName: 'Digital Twin Type',
      width: 150,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <Chip
          label={params.value}
          size="small"
          color="primary"
          variant="outlined"
          sx={{ fontSize: '0.75rem' }}
        />
      ),
    },
    {
      field: 'submodelCount',
      headerName: 'Submodels',
      width: 100,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <Typography variant="body2" sx={{ fontSize: '0.875rem', fontWeight: 500 }}>
          {params.value}
        </Typography>
      ),
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 120,
      getActions: (params) => [
        <GridActionsCellItem
          icon={
            <Tooltip title="Copy AAS ID" arrow>
              {copySuccess === params.row.id ? (
                <CheckCircle sx={{ color: 'success.main' }} />
              ) : (
                <ContentCopy />
              )}
            </Tooltip>
          }
          label="Copy AAS ID"
          onClick={() => handleCopyAasId(params.row.aasId, params.row.id)}
        />,
        <GridActionsCellItem
          icon={
            <Tooltip title="Download Twin Data" arrow>
              <Download />
            </Tooltip>
          }
          label="Download"
          onClick={() => handleDownloadTwinData(params.row)}
          disabled={!params.row.rawTwinData}
        />,
        <GridActionsCellItem
          icon={
            <Tooltip title="View Details" arrow>
              <VisibilityIcon />
            </Tooltip>
          }
          label="View"
          onClick={() => {
            console.log('View details for:', params.row);
            if (onView) {
              onView(params.row);
            }
          }}
        />,
      ],
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
            sortModel: [{ field: 'globalAssetId', sort: 'asc' }],
          },
        }}
        pageSizeOptions={[10, 25, 50, 100]}
        disableRowSelectionOnClick
        disableColumnFilter={false}
        disableColumnSelector={false}
        disableDensitySelector={false}
        rowHeight={60}
        sx={{
          border: '1px solid #e0e0e0',
          borderRadius: 1,
          backgroundColor: 'white',
          '& .MuiDataGrid-columnHeaders': {
            backgroundColor: '#f8f9fa',
            fontWeight: 600,
            borderBottom: '2px solid #ddd',
            position: 'sticky',
            top: 0,
            zIndex: 1,
          },
          '& .MuiDataGrid-cell': {
            borderBottom: '1px solid #f0f0f0',
            display: 'flex',
            alignItems: 'center',
          },
          '& .MuiDataGrid-row:hover': {
            backgroundColor: '#f8f9fa',
          },
          '& .MuiDataGrid-footerContainer': {
            borderTop: '2px solid #ddd',
            backgroundColor: '#f8f9fa',
          },
          '& .MuiDataGrid-toolbarContainer': {
            padding: '16px',
            borderBottom: '1px solid #e0e0e0',
            backgroundColor: '#f8f9fa',
          },
          '& .MuiDataGrid-virtualScroller': {
            height: '100%',
          },
        }}
        slots={{
          toolbar: () => (
            <Box sx={{ 
              p: 2, 
              borderBottom: '1px solid #e0e0e0',
              backgroundColor: '#f8f9fa',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                Showing {parts.length} serialized parts
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Click on column headers to sort • Use column filters for search
              </Typography>
            </Box>
          ),
        }}
      />
    </Box>
  );
};

export default SerializedPartsTable;
