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

import { useEffect, useState, useRef } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import Tooltip from '@mui/material/Tooltip';
import Button from '@mui/material/Button';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import AddIcon from '@mui/icons-material/Add';
import ViewListIcon from '@mui/icons-material/ViewList';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import IosShare from '@mui/icons-material/IosShare';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { DataGrid, GridColDef } from '@mui/x-data-grid';

import { SerializedPart } from '../../../serialized-parts/types';
import { SerializedPartTwinRead } from '../../../serialized-parts/types/twin-types';
import { fetchSerializedParts } from '../../../serialized-parts/api';
import { createSerializedPartTwin, shareSerializedPartTwin, unshareSerializedPartTwin, deleteSerializedPart } from '../../../serialized-parts/api';
import { fetchSerializedPartTwinsForCatalogPart } from '../../../serialized-parts/api';
import { PartType, StatusVariants } from '../../types/types';
import { SerializedPartStatusChip } from './SerializedPartStatusChip';

// Extended SerializedPart interface to include twin status
interface SerializedPartWithStatus extends SerializedPart {
  twinStatus: StatusVariants;
  globalId?: string;
  dtrAasId?: string;
}

interface InstanceProductsTableProps {
  part: PartType | null;
  onAddClick?: () => void;
}

export default function InstanceProductsTable({ part, onAddClick }: Readonly<InstanceProductsTableProps>) {
  // Ref to prevent duplicate API calls in React StrictMode
  const dataLoadedRef = useRef(false);
  
  const [rows, setRows] = useState<SerializedPartWithStatus[]>([]);
  const [twinCreatingId, setTwinCreatingId] = useState<string | number | null>(null);
  const [twinSharingId, setTwinSharingId] = useState<number | null>(null);
  const [twinUnsharingId, setTwinUnsharingId] = useState<number | null>(null);
  const [partDeletingId, setPartDeletingId] = useState<number | null>(null);
  const [errorSnackbar, setErrorSnackbar] = useState({ open: false, message: '' });
  const [successSnackbar, setSuccessSnackbar] = useState({ open: false, message: '' });
  const [copyAnimations, setCopyAnimations] = useState<{ [key: string]: boolean }>({});
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState<{
    open: boolean;
    row: SerializedPartWithStatus | null;
  }>({ open: false, row: null });

  // Helper function to show error messages
  const showError = (message: string) => {
    setErrorSnackbar({ open: true, message });
  };

  // Helper function to show success messages
  const showSuccess = (message: string) => {
    setSuccessSnackbar({ open: true, message });
  };

  // Helper function for copy operations with animation and notification
  const handleCopyWithFeedback = async (text: string, label: string, animationKey: string) => {
    try {
      await navigator.clipboard.writeText(text);
      
      // Trigger animation
      setCopyAnimations(prev => ({ ...prev, [animationKey]: true }));
      
      // Show success notification
      showSuccess(`${label} copied to clipboard!`);
      
      // Reset animation after 600ms
      setTimeout(() => {
        setCopyAnimations(prev => ({ ...prev, [animationKey]: false }));
      }, 600);
    } catch (err) {
      console.error(`Failed to copy ${label}:`, err);
      showError(`Failed to copy ${label}`);
    }
  };

  // Show delete confirmation dialog
  const showDeleteConfirmation = (row: SerializedPartWithStatus) => {
    setDeleteConfirmDialog({ open: true, row });
  };

  // Close delete confirmation dialog
  const closeDeleteConfirmation = () => {
    setDeleteConfirmDialog({ open: false, row: null });
  };

  // Determine twin status based on twin data
  const determineTwinStatus = (serializedPart: SerializedPart, twins: SerializedPartTwinRead[]): { status: StatusVariants; globalId?: string; dtrAasId?: string } => {
    const twin = twins.find(
      (t) => t.manufacturerId === serializedPart.manufacturerId &&
             t.manufacturerPartId === serializedPart.manufacturerPartId &&
             t.partInstanceId === serializedPart.partInstanceId
    );

    if (!twin) {
      return { status: StatusVariants.draft };
    }

    if (twin.shares && twin.shares.length > 0) {
      return { status: StatusVariants.shared, globalId: twin.globalId?.toString(), dtrAasId: twin.dtrAasId?.toString() };
    }

    return { status: StatusVariants.registered, globalId: twin.globalId?.toString(), dtrAasId: twin.dtrAasId?.toString() };
  };

  useEffect(() => {
    if (!part) {
      setRows([]);
      dataLoadedRef.current = false; // Reset ref when part changes
      return;
    }
    
    const loadData = async () => {
      // Prevent duplicate calls in React StrictMode
      if (dataLoadedRef.current) {
        return;
      }
      dataLoadedRef.current = true;
      
      try {
        // Fetch both serialized parts and twins
        const [serializedParts, twins] = await Promise.all([
          fetchSerializedParts(part.manufacturerId, part.manufacturerPartId),
          fetchSerializedPartTwinsForCatalogPart(part.manufacturerId, part.manufacturerPartId)
        ]);

        // Merge serialized parts with twin status
        const rowsWithStatus = serializedParts.map((serializedPart, index) => {
          const { status, globalId, dtrAasId } = determineTwinStatus(serializedPart, twins);
          return {
            ...serializedPart,
            id: serializedPart.id || index,
            twinStatus: status,
            globalId,
            dtrAasId,
          };
        });

        setRows(rowsWithStatus);
        
      } catch (error) {
        console.error("Error fetching instance products:", error);
        // Reset ref on error so it can be retried
        dataLoadedRef.current = false;
      }
    };

    loadData();
  }, [part]);

  const handleAddClick = () => {
    if (onAddClick) {
      onAddClick();
    } else {
      
    }
  };

  const handleCreateTwin = async (row: SerializedPartWithStatus) => {
    if (!part) return;
    
    setTwinCreatingId(row.id);
    try {
      await createSerializedPartTwin({
        manufacturerId: row.manufacturerId,
        manufacturerPartId: row.manufacturerPartId,
        partInstanceId: row.partInstanceId,
      });
      
      // Refresh data after successful creation
      const [serializedParts, twins] = await Promise.all([
        fetchSerializedParts(part.manufacturerId, part.manufacturerPartId),
        fetchSerializedPartTwinsForCatalogPart(part.manufacturerId, part.manufacturerPartId)
      ]);

      const rowsWithStatus = serializedParts.map((serializedPart, index) => {
        const { status, globalId, dtrAasId } = determineTwinStatus(serializedPart, twins);
        return {
          ...serializedPart,
          id: serializedPart.id || index,
          twinStatus: status,
          globalId,
          dtrAasId,
        };
      });

      setRows(rowsWithStatus);
    } catch (error) {
      console.error("Error creating twin:", error);
      // After error (e.g., 404), refetch and decide success vs error based on updated status
      try {
        // small delay allows backend propagation
        await new Promise((resolve) => setTimeout(resolve, 1200));
        const [serializedPartsAfter, twinsAfter] = await Promise.all([
          fetchSerializedParts(part.manufacturerId, part.manufacturerPartId),
          fetchSerializedPartTwinsForCatalogPart(part.manufacturerId, part.manufacturerPartId)
        ]);

        const refreshedRows = serializedPartsAfter.map((sp, index) => {
          const { status, globalId, dtrAasId } = determineTwinStatus(sp, twinsAfter);
          return {
            ...sp,
            id: sp.id || index,
            twinStatus: status,
            globalId,
            dtrAasId,
          };
        });
        setRows(refreshedRows);

        const updatedRow = refreshedRows.find(
          (r) =>
            r.manufacturerId === row.manufacturerId &&
            r.manufacturerPartId === row.manufacturerPartId &&
            r.partInstanceId === row.partInstanceId
        );

        if (updatedRow && updatedRow.twinStatus === StatusVariants.registered) {
          showSuccess('Twin registered successfully!');
          return; // suppress original error
        }
      } catch (recheckError) {
        console.warn('Twin status recheck after error failed:', recheckError);
        // Fall through to normal error handling
      }

      // Extract meaningful error message if status remains draft
      let errorMessage = 'Failed to register twin. Please try again.';
      
      if (error instanceof Error) {
        errorMessage = `Registration failed: ${error.message}`;
      } else if (typeof error === 'object' && error !== null && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string; error?: string } } };
        if (axiosError.response?.data?.message) {
          errorMessage = `Registration failed: ${axiosError.response.data.message}`;
        } else if (axiosError.response?.data?.error) {
          errorMessage = `Registration failed: ${axiosError.response.data.error}`;
        }
      }
      
      showError(errorMessage);
    } finally {
      setTwinCreatingId(null);
    }
  };

  const handleShareTwin = async (row: SerializedPartWithStatus) => {
    if (!part || !row.globalId) return;
    
    setTwinSharingId(row.id);
    try {
      await shareSerializedPartTwin({
        manufacturerId: row.manufacturerId,
        manufacturerPartId: row.manufacturerPartId,
        partInstanceId: row.partInstanceId,
      });
      
      // Refresh data after successful share
      const [serializedParts, twins] = await Promise.all([
        fetchSerializedParts(part.manufacturerId, part.manufacturerPartId),
        fetchSerializedPartTwinsForCatalogPart(part.manufacturerId, part.manufacturerPartId)
      ]);

      const rowsWithStatus = serializedParts.map((serializedPart, index) => {
        const { status, globalId, dtrAasId } = determineTwinStatus(serializedPart, twins);
        return {
          ...serializedPart,
          id: serializedPart.id || index,
          twinStatus: status,
          globalId,
          dtrAasId,
        };
      });

      setRows(rowsWithStatus);
    } catch (error) {
      console.error("Error sharing twin:", error);
      
      // Extract meaningful error message
      let errorMessage = 'Failed to share twin. Please try again.';
      
      if (error instanceof Error) {
        errorMessage = `Sharing failed: ${error.message}`;
      } else if (typeof error === 'object' && error !== null && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string; error?: string } } };
        if (axiosError.response?.data?.message) {
          errorMessage = `Sharing failed: ${axiosError.response.data.message}`;
        } else if (axiosError.response?.data?.error) {
          errorMessage = `Sharing failed: ${axiosError.response.data.error}`;
        }
      }
      
      showError(errorMessage);
    } finally {
      setTwinSharingId(null);
    }
  };

  const handleUnshareTwin = async (row: SerializedPartWithStatus) => {
    if (!part || !row.globalId) return;
    
    setTwinUnsharingId(row.id);
    try {
      // Find the twin to get the AAS ID
      const twins = await fetchSerializedPartTwinsForCatalogPart(part.manufacturerId, part.manufacturerPartId);
      const twin = twins.find(
        (t) => t.manufacturerId === row.manufacturerId &&
               t.manufacturerPartId === row.manufacturerPartId &&
               t.partInstanceId === row.partInstanceId
      );

      if (!twin || !twin.dtrAasId) {
        console.error("Twin or AAS ID not found for unshare operation");
        return;
      }

      // Get all business partner numbers that the twin is currently shared with
      const businessPartnerNumbers = twin.shares?.map(share => share.businessPartner.bpnl) || [];

      await unshareSerializedPartTwin({
        aasId: twin.dtrAasId.toString(),
        businessPartnerNumberToUnshare: businessPartnerNumbers,
        manufacturerId: row.manufacturerId,
      });
      
      // Refresh data after successful unshare
      const [serializedParts, updatedTwins] = await Promise.all([
        fetchSerializedParts(part.manufacturerId, part.manufacturerPartId),
        fetchSerializedPartTwinsForCatalogPart(part.manufacturerId, part.manufacturerPartId)
      ]);

      const rowsWithStatus = serializedParts.map((serializedPart, index) => {
        const { status, globalId, dtrAasId } = determineTwinStatus(serializedPart, updatedTwins);
        return {
          ...serializedPart,
          id: serializedPart.id || index,
          twinStatus: status,
          globalId,
          dtrAasId,
        };
      });

      setRows(rowsWithStatus);
    } catch (error) {
      console.error("Error unsharing twin:", error);
      
      // Extract meaningful error message
      let errorMessage = 'Failed to unshare twin. Please try again.';
      
      if (error instanceof Error) {
        errorMessage = `Unsharing failed: ${error.message}`;
      } else if (typeof error === 'object' && error !== null && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string; error?: string } } };
        if (axiosError.response?.data?.message) {
          errorMessage = `Unsharing failed: ${axiosError.response.data.message}`;
        } else if (axiosError.response?.data?.error) {
          errorMessage = `Unsharing failed: ${axiosError.response.data.error}`;
        }
      }
      
      showError(errorMessage);
    } finally {
      setTwinUnsharingId(null);
    }
  };

  const handleDeleteSerializedPart = async (row: SerializedPartWithStatus) => {
    
    
    
    if (!part || row.id === undefined || row.id === null) {
      console.error("No part or row ID found for deletion");
      showError("Unable to delete: invalid part data");
      return;
    }
    
    setPartDeletingId(row.id);
    try {
      
      await deleteSerializedPart(row.id, row.partInstanceId);
      
      
      // Refresh data after successful deletion
      const [serializedParts, twins] = await Promise.all([
        fetchSerializedParts(part.manufacturerId, part.manufacturerPartId),
        fetchSerializedPartTwinsForCatalogPart(part.manufacturerId, part.manufacturerPartId)
      ]);

      const rowsWithStatus = serializedParts.map((serializedPart, index) => {
        const { status, globalId } = determineTwinStatus(serializedPart, twins);
        return {
          ...serializedPart,
          id: serializedPart.id || index,
          twinStatus: status,
          globalId,
        };
      });

      setRows(rowsWithStatus);
      
      
      // Close the confirmation dialog
      closeDeleteConfirmation();
    } catch (error) {
      console.error("Error deleting serialized part:", error);
      
      // Extract meaningful error message
      let errorMessage = 'Failed to delete part. Please try again.';
      
      if (error instanceof Error) {
        errorMessage = `Deletion failed: ${error.message}`;
      } else if (typeof error === 'object' && error !== null && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string; error?: string } } };
        if (axiosError.response?.data?.message) {
          errorMessage = `Deletion failed: ${axiosError.response.data.message}`;
        } else if (axiosError.response?.data?.error) {
          errorMessage = `Deletion failed: ${axiosError.response.data.error}`;
        }
      }
      
      showError(errorMessage);
    } finally {
      setPartDeletingId(null);
    }
  };

  // Define columns for DataGrid with Status first
  const columns: GridColDef[] = [
    {
      field: 'twinStatus',
      headerName: 'Status',
      width: 140,
      headerAlign: 'center',
      align: 'center',
      renderCell: (params) => (
        <SerializedPartStatusChip 
          status={params.value as StatusVariants}
        />
      ),
      sortable: true,
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 100,
      headerAlign: 'center',
      align: 'center',
      sortable: false,
      renderCell: (params) => {
        const row = params.row as SerializedPartWithStatus;
        const actions = [];

        if (row.twinStatus === StatusVariants.draft) {
          actions.push(
            <Tooltip title="Register Twin" key="register" arrow>
              <IconButton
                size="small"
                onClick={() => handleCreateTwin(row)}
                disabled={twinCreatingId === row.id}
                sx={{
                  backgroundColor: 'rgba(25, 118, 210, 0.1)',
                  color: '#1976d2',
                  borderRadius: '8px',
                  width: 36,
                  height: 36,
                  border: '1px solid rgba(25, 118, 210, 0.3)',
                  '&:hover': {
                    backgroundColor: 'rgba(25, 118, 210, 0.2)',
                    transform: 'translateY(-1px)',
                    boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)',
                  },
                  '&:disabled': {
                    backgroundColor: 'rgba(248, 249, 250, 0.1)',
                    color: 'rgba(248, 249, 250, 0.3)',
                    border: '1px solid rgba(248, 249, 250, 0.1)',
                  },
                  transition: 'all 0.2s ease-in-out',
                }}
              >
                {twinCreatingId === row.id ? (
                  <CircularProgress size={16} sx={{ color: '#1976d2' }} />
                ) : (
                  <CloudUploadIcon fontSize="small" />
                )}
              </IconButton>
            </Tooltip>
          );
        }

        if (row.twinStatus === StatusVariants.registered) {
          actions.push(
            <Tooltip title="Share Twin" key="share" arrow>
              <IconButton
                size="small"
                onClick={() => handleShareTwin(row)}
                disabled={twinSharingId === row.id}
                sx={{
                  backgroundColor: 'rgba(156, 39, 176, 0.1)',
                  color: '#9c27b0',
                  borderRadius: '8px',
                  width: 36,
                  height: 36,
                  border: '1px solid rgba(156, 39, 176, 0.3)',
                  '&:hover': {
                    backgroundColor: 'rgba(156, 39, 176, 0.2)',
                    transform: 'translateY(-1px)',
                    boxShadow: '0 4px 12px rgba(156, 39, 176, 0.3)',
                  },
                  '&:disabled': {
                    backgroundColor: 'rgba(248, 249, 250, 0.1)',
                    color: 'rgba(248, 249, 250, 0.3)',
                    border: '1px solid rgba(248, 249, 250, 0.1)',
                  },
                  transition: 'all 0.2s ease-in-out',
                }}
              >
                <IosShare fontSize="small" />
              </IconButton>
            </Tooltip>
          );
          
          // Add delete button for registered twins
          actions.push(
            <Tooltip title="Delete Serialized Part" key="delete" arrow>
              <IconButton
                size="small"
                onClick={() => {
                  
                  showDeleteConfirmation(row);
                }}
                disabled={partDeletingId === row.id}
                sx={{
                  backgroundColor: 'rgba(244, 67, 54, 0.1)',
                  color: '#f44336',
                  borderRadius: '8px',
                  width: 36,
                  height: 36,
                  border: '1px solid rgba(244, 67, 54, 0.3)',
                  '&:hover': {
                    backgroundColor: 'rgba(244, 67, 54, 0.2)',
                    transform: 'translateY(-1px)',
                    boxShadow: '0 4px 12px rgba(244, 67, 54, 0.3)',
                  },
                  '&:disabled': {
                    backgroundColor: 'rgba(248, 249, 250, 0.1)',
                    color: 'rgba(248, 249, 250, 0.3)',
                    border: '1px solid rgba(248, 249, 250, 0.1)',
                  },
                  transition: 'all 0.2s ease-in-out',
                }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          );
        }

        if (row.twinStatus === StatusVariants.shared) {
          actions.push(
            <Tooltip title="Unshare Twin" key="unshare" arrow>
              <IconButton
                size="small"
                onClick={() => handleUnshareTwin(row)}
                disabled={twinUnsharingId === row.id}
                sx={{
                  backgroundColor: 'rgba(255, 152, 0, 0.1)',
                  color: '#ff9800',
                  borderRadius: '8px',
                  width: 36,
                  height: 36,
                  border: '1px solid rgba(255, 152, 0, 0.3)',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 152, 0, 0.2)',
                    transform: 'translateY(-1px)',
                    boxShadow: '0 4px 12px rgba(255, 152, 0, 0.3)',
                  },
                  '&:disabled': {
                    backgroundColor: 'rgba(248, 249, 250, 0.1)',
                    color: 'rgba(248, 249, 250, 0.3)',
                    border: '1px solid rgba(248, 249, 250, 0.1)',
                  },
                  transition: 'all 0.2s ease-in-out',
                }}
              >
                <LinkOffIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          );
          
          // Add delete button for shared twins
          actions.push(
            <Tooltip title="Delete Serialized Part" key="delete" arrow>
              <IconButton
                size="small"
                onClick={() => {
                  
                  showDeleteConfirmation(row);
                }}
                disabled={partDeletingId === row.id}
                sx={{
                  backgroundColor: 'rgba(244, 67, 54, 0.1)',
                  color: '#f44336',
                  borderRadius: '8px',
                  width: 36,
                  height: 36,
                  border: '1px solid rgba(244, 67, 54, 0.3)',
                  '&:hover': {
                    backgroundColor: 'rgba(244, 67, 54, 0.2)',
                    transform: 'translateY(-1px)',
                    boxShadow: '0 4px 12px rgba(244, 67, 54, 0.3)',
                  },
                  '&:disabled': {
                    backgroundColor: 'rgba(248, 249, 250, 0.1)',
                    color: 'rgba(248, 249, 250, 0.3)',
                    border: '1px solid rgba(248, 249, 250, 0.1)',
                  },
                  transition: 'all 0.2s ease-in-out',
                }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          );
        }

        return (
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
            {actions}
          </Box>
        );
      },
    },
    {
      field: 'partInstanceId',
      headerName: 'Part Instance ID',
      width: 400,
      headerAlign: 'center',
      renderCell: (params) => (
        <Typography
          variant="body2"
          sx={{ 
            color: 'rgb(248, 249, 250) !important',
            fontSize: '0.875rem',
          }}
        >
          {params.value || ''}
        </Typography>
      ),
    },
    {
      field: 'globalId',
      headerName: 'Global Asset ID',
      width: 350,
      headerAlign: 'center',
      renderCell: (params) => {
        const globalId = params.value;
        if (!globalId) {
          return (
            <Typography
              variant="body2"
              sx={{ 
                color: 'rgba(248, 249, 250, 0.5) !important',
                fontSize: '0.875rem',
                fontStyle: 'italic'
              }}
            >
              No Global Asset ID
            </Typography>
          );
        }

        const displayValue = globalId.startsWith('urn:uuid:') ? globalId : `urn:uuid:${globalId}`;
        const animationKey = `globalId-${params.row.id}`;
        
        const handleCopy = async () => {
          await handleCopyWithFeedback(displayValue, 'Global Asset ID', animationKey);
        };

        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
            <Tooltip title="Click to copy Global Asset ID" arrow>
              <Typography
                variant="body2"
                sx={{ 
                  color: 'rgb(248, 249, 250) !important',
                  fontSize: '0.75rem',
                  fontFamily: 'monospace',
                  cursor: 'pointer',
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  '&:hover': {
                    textDecoration: 'underline'
                  }
                }}
                onClick={handleCopy}
              >
                {displayValue}
              </Typography>
            </Tooltip>
            <Tooltip title="Copy Global Asset ID" arrow>
              <IconButton
                size="small"
                onClick={handleCopy}
                sx={{
                  color: 'rgba(248, 249, 250, 0.7)',
                  transform: copyAnimations[animationKey] ? 'scale(1.2)' : 'scale(1)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    color: 'rgb(248, 249, 250)',
                    backgroundColor: 'rgba(248, 249, 250, 0.1)'
                  }
                }}
              >
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        );
      },
    },
    {
      field: 'dtrAasId',
      headerName: 'AAS ID',
      width: 350,
      headerAlign: 'center',
      renderCell: (params) => {
        const aasId = params.value;
        if (!aasId) {
          return (
            <Typography
              variant="body2"
              sx={{ 
                color: 'rgba(248, 249, 250, 0.5) !important',
                fontSize: '0.875rem',
                fontStyle: 'italic'
              }}
            >
              No AAS ID
            </Typography>
          );
        }

        const displayValue = aasId.startsWith('urn:uuid:') ? aasId : `urn:uuid:${aasId}`;
        const animationKey = `aasId-${params.row.id}`;
        
        const handleCopy = async () => {
          await handleCopyWithFeedback(displayValue, 'AAS ID', animationKey);
        };

        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
            <Tooltip title="Click to copy AAS ID" arrow>
              <Typography
                variant="body2"
                sx={{ 
                  color: 'rgb(248, 249, 250) !important',
                  fontSize: '0.75rem',
                  fontFamily: 'monospace',
                  cursor: 'pointer',
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  '&:hover': {
                    textDecoration: 'underline'
                  }
                }}
                onClick={handleCopy}
              >
                {displayValue}
              </Typography>
            </Tooltip>
            <Tooltip title="Copy AAS ID" arrow>
              <IconButton
                size="small"
                onClick={handleCopy}
                sx={{
                  color: 'rgba(248, 249, 250, 0.7)',
                  transform: copyAnimations[animationKey] ? 'scale(1.2)' : 'scale(1)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    color: 'rgb(248, 249, 250)',
                    backgroundColor: 'rgba(248, 249, 250, 0.1)'
                  }
                }}
              >
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        );
      },
    },
    {
      field: 'customerPartId',
      headerName: 'Customer Part ID',
      width: 300,
      headerAlign: 'center',
      renderCell: (params) => (
        <Typography
          variant="body2"
          sx={{ 
            color: '#000000 !important',
            fontSize: '0.875rem',
          }}
        >
          {params.value || ''}
        </Typography>
      ),
    },
    {
      field: 'businessPartner',
      headerName: 'Business Partner',
      width: 180,
      headerAlign: 'center',
      renderCell: (params) => (
        <Typography
          variant="body2"
          sx={{ 
            color: '#000000 !important',
            fontSize: '0.875rem',
          }}
        >
          {params.row.businessPartner?.name || ''}
        </Typography>
      ),
    },
    {
      field: 'bpns',
      headerName: 'BPNS',
      width: 200,
      headerAlign: 'center',
      renderCell: (params) => (
        <Typography
          variant="body2"
          sx={{ 
            color: '#000000 !important',
            fontSize: '0.875rem',
          }}
        >
          {params.value || ''}
        </Typography>
      ),
    },
    {
      field: 'van',
      headerName: 'VAN',
      width: 200,
      headerAlign: 'center',
      renderCell: (params) => (
        <Typography
          variant="body2"
          sx={{ 
            color: '#000000 !important',
            fontSize: '0.875rem',
          }}
        >
          {params.value || ''}
        </Typography>
      ),
    }
  ];

  if (!part) {
    return (
      <Box sx={{ 
        width: '100%', 
        mt: 3,
        p: 4,
        background: 'rgba(35, 35, 38, 0.95)',
        borderRadius: '16px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(248, 249, 250, 0.1)',
        textAlign: 'center'
      }}>
        <Box sx={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, rgba(25, 118, 210, 0.2) 0%, rgba(66, 165, 245, 0.1) 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
        }}>
          <ViewListIcon sx={{ fontSize: 32, color: 'rgba(25, 118, 210, 0.8)' }} />
        </Box>
        <Typography 
          variant="h5" 
          gutterBottom
          sx={{ 
            color: 'rgb(248, 249, 250)',
            fontWeight: 700,
            mb: 2,
          }}
        >
          Instance Products
        </Typography>
        <Typography 
          variant="body1"
          sx={{ 
            color: 'rgba(248, 249, 250, 0.7)',
            maxWidth: 400,
            margin: '0 auto',
            lineHeight: 1.6,
          }}
        >
          Select a part from the catalog to view and manage its individual product instances.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', mt: 3 }}>
      {/* Modern Header Section */}
      <Box sx={{ 
        mb: 3,
        p: 3,
        background: 'rgba(35, 35, 38, 0.95)',
        borderRadius: '16px 16px 0 0',
        borderLeft: '4px solid #1976d2',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        backdropFilter: 'blur(10px)',
      }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          mb: 1
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{
              width: 40,
              height: 40,
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(25, 118, 210, 0.3)',
            }}>
              <ViewListIcon sx={{ color: 'white', fontSize: 20 }} />
            </Box>
            <Box>
              <Typography
                variant="h5"
                sx={{ 
                  color: 'rgb(248, 249, 250)',
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                }}
              >
                Instance Products
              </Typography>
              <Typography
                variant="body2"
                sx={{ 
                  color: 'rgba(248, 249, 250, 0.7)',
                  mt: 0.5,
                }}
              >
                Manage and track individual product instances
              </Typography>
            </Box>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddClick}
              sx={{ 
                background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
                borderRadius: '10px',
                textTransform: 'none',
                fontWeight: 600,
                boxShadow: '0 4px 16px rgba(25, 118, 210, 0.3)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #1565c0 0%, #1976d2 100%)',
                  transform: 'translateY(-1px)',
                  boxShadow: '0 6px 20px rgba(25, 118, 210, 0.4)',
                },
                transition: 'all 0.2s ease-in-out',
              }}
            >
              Add Instance Product
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Modern Table Container */}
      <Paper 
        sx={{ 
          width: '100%',
          background: 'rgba(35, 35, 38, 0.95)',
          borderRadius: '0 0 16px 16px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          backdropFilter: 'blur(10px)',
          overflow: 'hidden',
          border: '1px solid rgba(248, 249, 250, 0.1)',
        }}
      >
        <Box sx={{ height: 500, width: '100%' }}>
          <DataGrid
            className="modern-data-grid"
            rows={rows}
            columns={columns}
            initialState={{
              pagination: {
                paginationModel: { page: 0, pageSize: 10 },
              },
            }}
            pageSizeOptions={[5, 10, 25]}
            disableRowSelectionOnClick
            autoHeight={false}
            sx={{
              border: 'none',
              color: '#000000 !important',
              '& *': {
                color: '#000000 !important',
              },
              '& .MuiDataGrid-columnHeaders': {
                background: 'linear-gradient(135deg, rgba(25, 118, 210, 0.15) 0%, rgba(66, 165, 245, 0.1) 100%)',
                fontSize: '0.875rem',
                fontWeight: 700,
                borderBottom: '2px solid rgba(25, 118, 210, 0.3)',
                color: '#000000',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                minHeight: '56px !important',
                '& .MuiDataGrid-columnHeaderTitle': {
                  fontWeight: 700,
                  color: '#000000',
                },
              },
              '& .MuiDataGrid-columnHeader:focus': {
                outline: 'none',
              },
              '& .MuiDataGrid-cell': {
                fontSize: '0.875rem',
                borderBottom: '1px solid rgba(248, 249, 250, 0.05)',
                backgroundColor: 'transparent',
                color: '#000000 !important',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                '& *': {
                  color: '#000000 !important',
                },
              },
              '& .MuiDataGrid-cell:focus': {
                outline: 'none',
              },
              '& .MuiDataGrid-row': {
                backgroundColor: 'transparent',
                color: '#000000 !important',
                '& .MuiDataGrid-cell': {
                  color: '#000000 !important',
                  '& *': {
                    color: '#000000 !important',
                  },
                },
                '&:hover': {
                  backgroundColor: 'rgba(25, 118, 210, 0.08)',
                  transform: 'translateX(2px)',
                  boxShadow: 'inset 3px 0 0 #1976d2',
                  '& .MuiDataGrid-cell': {
                    color: '#000000 !important',
                    '& *': {
                      color: '#000000 !important',
                    },
                  },
                },
                '&.Mui-selected': {
                  backgroundColor: 'rgba(25, 118, 210, 0.15)',
                  '&:hover': {
                    backgroundColor: 'rgba(25, 118, 210, 0.2)',
                  },
                  '& .MuiDataGrid-cell': {
                    color: '#000000 !important',
                    '& *': {
                      color: '#000000 !important',
                    },
                  },
                },
                transition: 'all 0.2s ease-in-out',
              },
              '& .MuiDataGrid-footerContainer': {
                borderTop: '2px solid rgba(25, 118, 210, 0.2)',
                background: 'rgba(25, 118, 210, 0.05)',
                color: '#000000',
                minHeight: '56px',
                borderRadius: '0 0 16px 16px',
              },
              '& .MuiDataGrid-virtualScroller': {
                backgroundColor: 'transparent',
                minHeight: '300px',
              },
              '& .MuiDataGrid-overlay': {
                backgroundColor: 'transparent',
                color: '#000000',
              },
              '& .MuiDataGrid-noRowsOverlay': {
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '300px',
                color: '#000000',
              },
              '& .MuiTablePagination-root': {
                color: '#000000',
              },
              '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                color: '#000000',
                fontWeight: 500,
              },
              '& .MuiTablePagination-select': {
                color: '#000000',
                backgroundColor: 'rgba(248, 249, 250, 0.1)',
                borderRadius: '6px',
              },
              '& .MuiSvgIcon-root': {
                color: '#000000',
              },
              '& .MuiTablePagination-actions button': {
                color: '#000000',
                '&:hover': {
                  backgroundColor: 'rgba(25, 118, 210, 0.1)',
                },
                '&:disabled': {
                  color: 'rgba(0, 0, 0, 0.3)',
                },
              },
            }}
            slots={{
              noRowsOverlay: () => (
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  height: '100%',
                  gap: 3,
                  p: 4,
                }}>
                  <Box sx={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, rgba(25, 118, 210, 0.2) 0%, rgba(66, 165, 245, 0.1) 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 2,
                  }}>
                    <AddIcon sx={{ fontSize: 32, color: 'rgba(25, 118, 210, 0.8)' }} />
                  </Box>
                  <Typography variant="h6" sx={{ color: 'rgb(248, 249, 250)', fontWeight: 600 }}>
                    No instance products found
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(248, 249, 250, 0.6)', textAlign: 'center', maxWidth: 300 }}>
                    {part ? 'Start by adding your first instance product to track individual items' : 'Select a part to view and manage its instance products'}
                  </Typography>
                </Box>
              ),
            }}
          />
        </Box>
      </Paper>

      {/* Dialog removed for now - need to check correct props */}
      {/* <AddSerializedPartDialog
        open={addDialogOpen}
        onClose={handleCloseAddDialog}
      /> */}

      {/* Error Snackbar */}
      <Snackbar
        open={errorSnackbar.open}
        autoHideDuration={6000}
        onClose={() => setErrorSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setErrorSnackbar(prev => ({ ...prev, open: false }))}
          severity="error"
          variant="filled"
          sx={{ width: '100%' }}
        >
          {errorSnackbar.message}
        </Alert>
      </Snackbar>

      {/* Success Snackbar */}
      <Snackbar
        open={successSnackbar.open}
        autoHideDuration={3000}
        onClose={() => setSuccessSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSuccessSnackbar(prev => ({ ...prev, open: false }))}
          severity="success"
          variant="filled"
          sx={{ width: '100%' }}
        >
          {successSnackbar.message}
        </Alert>
      </Snackbar>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmDialog.open}
        onClose={closeDeleteConfirmation}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '16px',
            background: 'rgba(35, 35, 38, 0.95)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 24px 64px rgba(0, 0, 0, 0.4)',
          }
        }}
      >
        <DialogTitle id="delete-dialog-title" sx={{ 
          pb: 1,
          pt: 3,
          px: 3,
          color: 'white',
          fontSize: '1.5rem',
          fontWeight: 600,
        }}>
          Delete Serialized Part
        </DialogTitle>
        <DialogContent sx={{ pb: 2 }}>
          <DialogContentText id="delete-dialog-description" sx={{ 
            color: 'rgba(255, 255, 255, 0.8)',
            fontSize: '1rem',
            mb: 2
          }}>
            Are you sure you want to delete this serialized part?
          </DialogContentText>
          {deleteConfirmDialog.row && (
            <Box sx={{ 
              mt: 2,
              p: 2,
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}>
              <Typography variant="body2" sx={{ 
                color: 'rgba(255, 255, 255, 0.9)',
                mb: 1,
                display: 'flex',
                justifyContent: 'space-between'
              }}>
                <span style={{ fontWeight: 600 }}>Part Instance ID:</span>
                <span>{deleteConfirmDialog.row.partInstanceId}</span>
              </Typography>
              <Typography variant="body2" sx={{ 
                color: 'rgba(255, 255, 255, 0.9)',
                display: 'flex',
                justifyContent: 'space-between'
              }}>
                <span style={{ fontWeight: 600 }}>Manufacturer ID:</span>
                <span>{deleteConfirmDialog.row.manufacturerId}</span>
              </Typography>
            </Box>
          )}
          <Typography variant="body2" sx={{ 
            mt: 2,
            color: '#f44336',
            fontWeight: 500,
            textAlign: 'center',
            p: 1,
            borderRadius: '8px',
            background: 'rgba(244, 67, 54, 0.1)',
            border: '1px solid rgba(244, 67, 54, 0.2)',
          }}>
            ⚠️ This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ 
          p: 3,
          pt: 1,
          gap: 2,
        }}>
          <Button 
            onClick={closeDeleteConfirmation}
            variant="outlined"
            sx={{
              color: 'rgba(255, 255, 255, 0.8)',
              borderColor: 'rgba(255, 255, 255, 0.3)',
              borderRadius: '10px',
              px: 3,
              py: 1,
              fontWeight: 500,
              '&:hover': {
                color: 'rgba(255, 255, 255, 0.9)',
                borderColor: 'rgba(255, 255, 255, 0.5)',
                background: 'rgba(255, 255, 255, 0.05)',
              }
            }}
          >
            CANCEL
          </Button>
          <Button 
            onClick={() => {
              if (deleteConfirmDialog.row) {
                handleDeleteSerializedPart(deleteConfirmDialog.row);
              }
            }}
            variant="contained"
            disabled={partDeletingId !== null}
            sx={{
              background: 'linear-gradient(135deg, #d32f2f 0%, #f44336 100%)',
              color: 'white',
              borderRadius: '10px',
              px: 3,
              py: 1,
              fontWeight: 600,
              boxShadow: '0 4px 16px rgba(211, 47, 47, 0.3)',
              '&:hover': {
                background: 'linear-gradient(135deg, #b71c1c 0%, #d32f2f 100%)',
                boxShadow: '0 6px 20px rgba(211, 47, 47, 0.4)',
              },
              '&:disabled': {
                background: 'rgba(255, 255, 255, 0.1)',
                color: 'rgba(255, 255, 255, 0.3)',
              }
            }}
          >
            {partDeletingId === deleteConfirmDialog.row?.id ? 'DELETING...' : 'DELETE'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
