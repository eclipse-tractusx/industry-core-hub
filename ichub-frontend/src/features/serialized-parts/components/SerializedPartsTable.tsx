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
  Paper,
  IconButton,
  Tooltip,
  Button,
  CircularProgress,
  Snackbar,
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import ViewListIcon from '@mui/icons-material/ViewList';
import RefreshIcon from '@mui/icons-material/Refresh';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import IosShare from '@mui/icons-material/IosShare';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useEffect, useState, useCallback } from 'react';
import { SerializedPart } from '../types';
import { SerializedPartTwinRead } from '../types/twin-types';
import { createSerializedPartTwin, shareSerializedPartTwin, unshareSerializedPartTwin, deleteSerializedPart, fetchAllSerializedPartTwins } from '../api';
import { StatusVariants } from '../../catalog-management/types/types';
import { SerializedPartStatusChip } from '../../catalog-management/components/product-detail/SerializedPartStatusChip';
import AddSerializedPartDialog from './AddSerializedPartDialog';

// Extended SerializedPart interface to include twin status
interface SerializedPartWithStatus extends SerializedPart {
  twinStatus: StatusVariants;
  globalId?: string;
  dtrAasId?: string;
}

interface SerializedPartsTableProps {
  parts: SerializedPart[];
  onView?: (part: SerializedPart) => void;
  onRefresh?: () => void;
}

const SerializedPartsTable = ({ parts, onRefresh }: SerializedPartsTableProps) => {
  const [rows, setRows] = useState<SerializedPartWithStatus[]>([]);
  const [allTwins, setAllTwins] = useState<SerializedPartTwinRead[]>([]);
  const [hasFetchedTwins, setHasFetchedTwins] = useState<boolean>(false); // Track if we've attempted to fetch twins
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true); // For initial data load
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false); // For refresh operations
  const [twinCreatingId, setTwinCreatingId] = useState<number | null>(null);
  const [twinSharingId, setTwinSharingId] = useState<number | null>(null);
  const [twinUnsharingId, setTwinUnsharingId] = useState<number | null>(null);
  const [partDeletingId, setPartDeletingId] = useState<number | null>(null);
  const [errorSnackbar, setErrorSnackbar] = useState({ open: false, message: '' });
  const [successSnackbar, setSuccessSnackbar] = useState({ open: false, message: '' });
  const [copyAnimations, setCopyAnimations] = useState<{ [key: string]: boolean }>({});
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ 
    open: false, 
    message: '', 
    severity: 'success' 
  });
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState<{
    open: boolean;
    row: SerializedPartWithStatus | null;
  }>({ open: false, row: null });
  const [addDialogOpen, setAddDialogOpen] = useState<boolean>(false);

  // Helper function to show error messages
  const showError = (message: string) => {
    setErrorSnackbar({ open: true, message });
  };

  // Helper function to show success messages
  const showSuccess = (message: string) => {
    setSuccessSnackbar({ open: true, message });
  };

  // Show delete confirmation dialog
  const showDeleteConfirmation = (row: SerializedPartWithStatus) => {
    setDeleteConfirmDialog({ open: true, row });
  };

  // Close delete confirmation dialog
  const closeDeleteConfirmation = () => {
    setDeleteConfirmDialog({ open: false, row: null });
  };

  // Handle opening the Add Serialized Part dialog
  const handleAddClick = () => {
    setAddDialogOpen(true);
  };

  // Handle closing the Add Serialized Part dialog
  const handleCloseAddDialog = () => {
    setAddDialogOpen(false);
  };

  // Fetch twins only once and cache them in state
  const fetchTwinsOnce = useCallback(async (): Promise<SerializedPartTwinRead[]> => {

    try {
      // Add timeout to prevent infinite loading on twin requests
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Twin request timeout after 15 seconds')), 15000);
      });
      
      const twins = await Promise.race([
        fetchAllSerializedPartTwins(),
        timeoutPromise
      ]);
      
      setAllTwins(twins);
      setHasFetchedTwins(true); // Mark that we've attempted to fetch
      return twins;
    } catch (error) {
      console.error('Error fetching all twins:', error);
      // Always return empty array and clear loading state on any error
      setAllTwins([]);
      setHasFetchedTwins(true); // Mark that we've attempted to fetch even on error
      return [];
    }
  }, []); // No dependencies - this function should be stable

  // Helper function to get relevant twins from cached data
  const getRelevantTwins = useCallback((twins: SerializedPartTwinRead[]): SerializedPartTwinRead[] => {
    return twins.filter(twin => 
      parts.some(part => 
        twin.manufacturerId === part.manufacturerId &&
        twin.manufacturerPartId === part.manufacturerPartId &&
        twin.partInstanceId === part.partInstanceId
      )
    );
  }, [parts]); // Only depend on parts

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
    const loadTwinData = async () => {
      // Don't fetch twin data if there are no parts to display
      if (!parts || parts.length === 0) {
        
        setRows([]);
        setIsInitialLoading(false);
        setHasFetchedTwins(false); // Reset when no parts
        return;
      }

      try {
        // Only fetch if we haven't attempted to fetch twins yet
        let twins = allTwins;
        if (!hasFetchedTwins) {
      
          setIsInitialLoading(true);
          
          // Add timeout for the entire twin loading process
          const timeoutPromise = new Promise<SerializedPartTwinRead[]>((_, reject) => {
            setTimeout(() => {
              console.warn('Twin data loading timed out after 20 seconds, proceeding without twin data');
              reject(new Error('Twin loading timeout'));
            }, 20000);
          });
          
          try {
            twins = await Promise.race([
              fetchTwinsOnce(),
              timeoutPromise
            ]);
          } catch {
            console.warn('Twin loading timed out, showing parts without twin status');
            twins = [];
          }
        }
        
        // Get relevant twins for current parts (call directly, don't use the callback)
        const relevantTwins = twins.filter(twin => 
          parts.some(part => 
            twin.manufacturerId === part.manufacturerId &&
            twin.manufacturerPartId === part.manufacturerPartId &&
            twin.partInstanceId === part.partInstanceId
          )
        );
        
        // Merge serialized parts with twin status
        const rowsWithStatus = parts.map((serializedPart, index) => {
          const { status, globalId, dtrAasId } = determineTwinStatus(serializedPart, relevantTwins);
          return {
            ...serializedPart,
            id: serializedPart.id || index,
            twinStatus: status,
            globalId,
            dtrAasId,
            businessPartnerName: serializedPart.businessPartner.name,
            businessPartnerBpnl: serializedPart.businessPartner.bpnl,
          };
        });

        setRows(rowsWithStatus);
      } catch (error) {
        console.error("Error fetching twin data:", error);
        // If we can't fetch twin data, just show parts as draft
        const rowsWithoutStatus = parts.map((serializedPart, index) => ({
          ...serializedPart,
          id: serializedPart.id || index,
          twinStatus: StatusVariants.draft,
          businessPartnerName: serializedPart.businessPartner.name,
          businessPartnerBpnl: serializedPart.businessPartner.bpnl,
        }));
        setRows(rowsWithoutStatus);
      } finally {
        // ALWAYS clear loading state, even on timeout or error
        setIsInitialLoading(false);
      }
    };

    // Reset hasFetchedTwins when parts change to allow fetching twins for new/changed parts
    setHasFetchedTwins(false);
    loadTwinData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parts]); // Only depend on parts - don't include allTwins to avoid infinite loop

  const handleCreateTwin = async (row: SerializedPartWithStatus) => {
    setTwinCreatingId(row.id);
    try {
      await createSerializedPartTwin({
        manufacturerId: row.manufacturerId,
        manufacturerPartId: row.manufacturerPartId,
        partInstanceId: row.partInstanceId,
      });
      
      // Refresh twin data after successful creation - re-fetch all twins to get the new one
      
      const updatedTwins = await fetchTwinsOnce();
      const relevantTwins = getRelevantTwins(updatedTwins);
      
      const rowsWithStatus = parts.map((serializedPart, index) => {
        const { status, globalId, dtrAasId } = determineTwinStatus(serializedPart, relevantTwins);
        return {
          ...serializedPart,
          id: serializedPart.id || index,
          twinStatus: status,
          globalId,
          dtrAasId,
          businessPartnerName: serializedPart.businessPartner.name,
          businessPartnerBpnl: serializedPart.businessPartner.bpnl,
        };
      });
      setRows(rowsWithStatus);
      
      // Show success message
      showSuccess('Twin registered successfully!');
    } catch (error) {
      console.error("Error creating twin:", error);
      // After error (e.g., 404), refetch and decide success vs error based on updated status
      try {
        await new Promise((resolve) => setTimeout(resolve, 1200));
        const updatedTwinsAfter = await fetchTwinsOnce();
        const relevantTwinsAfter = getRelevantTwins(updatedTwinsAfter);

        const refreshedRows = parts.map((serializedPart, index) => {
          const { status, globalId, dtrAasId } = determineTwinStatus(serializedPart, relevantTwinsAfter);
          return {
            ...serializedPart,
            id: serializedPart.id || index,
            twinStatus: status,
            globalId,
            dtrAasId,
            businessPartnerName: serializedPart.businessPartner.name,
            businessPartnerBpnl: serializedPart.businessPartner.bpnl,
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
    if (!row.globalId) return;
    
    setTwinSharingId(row.id);
    try {
      await shareSerializedPartTwin({
        manufacturerId: row.manufacturerId,
        manufacturerPartId: row.manufacturerPartId,
        partInstanceId: row.partInstanceId,
      });
      
      // Refresh twin data after successful share
      
      const updatedTwins = await fetchTwinsOnce();
      const relevantTwins = getRelevantTwins(updatedTwins);
      
      const rowsWithStatus = parts.map((serializedPart, index) => {
        const { status, globalId, dtrAasId } = determineTwinStatus(serializedPart, relevantTwins);
        return {
          ...serializedPart,
          id: serializedPart.id || index,
          twinStatus: status,
          globalId,
          dtrAasId,
          businessPartnerName: serializedPart.businessPartner.name,
          businessPartnerBpnl: serializedPart.businessPartner.bpnl,
        };
      });
      setRows(rowsWithStatus);
      
      // Show success message
      showSuccess('Twin shared successfully!');
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
    if (!row.globalId) return;
    
    setTwinUnsharingId(row.id);
    try {
      // Find the twin to get the AAS ID from cached twins
      const relevantTwins = getRelevantTwins(allTwins);
      const twin = relevantTwins.find(
        (t: SerializedPartTwinRead) => t.manufacturerId === row.manufacturerId &&
               t.manufacturerPartId === row.manufacturerPartId &&
               t.partInstanceId === row.partInstanceId
      );

      if (!twin || !twin.dtrAasId) {
        console.error("Twin or AAS ID not found for unshare operation");
        return;
      }

      // Get all business partner numbers that the twin is currently shared with
      const businessPartnerNumbers = twin.shares?.map((share) => share.businessPartner.bpnl) || [];

      await unshareSerializedPartTwin({
        aasId: twin.dtrAasId.toString(),
        businessPartnerNumberToUnshare: businessPartnerNumbers,
        manufacturerId: row.manufacturerId,
      });
      
      // Refresh twin data after successful unshare
      
      const updatedTwins = await fetchTwinsOnce();
      const updatedRelevantTwins = getRelevantTwins(updatedTwins);
      
      const rowsWithStatus = parts.map((serializedPart, index) => {
        const { status, globalId, dtrAasId } = determineTwinStatus(serializedPart, updatedRelevantTwins);
        return {
          ...serializedPart,
          id: serializedPart.id || index,
          twinStatus: status,
          globalId,
          dtrAasId,
          businessPartnerName: serializedPart.businessPartner.name,
          businessPartnerBpnl: serializedPart.businessPartner.bpnl,
        };
      });
      setRows(rowsWithStatus);
      
      // Show success message
      showSuccess('Twin unshared successfully!');
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

  // Perform the actual deletion after confirmation
  const handleDeleteSerializedPart = async (row: SerializedPartWithStatus) => {
    
    
    
    if (row.id === undefined || row.id === null) {
      console.error("No row ID found for deletion");
      return;
    }
    
    setPartDeletingId(row.id);
    try {
      
      await deleteSerializedPart(row.id, row.partInstanceId);
      
      
      // Refresh data after successful deletion
      
      const updatedTwins = await fetchTwinsOnce();
      const relevantTwins = getRelevantTwins(updatedTwins);
      
      const rowsWithStatus = parts.map((serializedPart, index) => {
        const { status, globalId, dtrAasId } = determineTwinStatus(serializedPart, relevantTwins);
        return {
          ...serializedPart,
          id: serializedPart.id || index,
          twinStatus: status,
          globalId,
          dtrAasId,
          businessPartnerName: serializedPart.businessPartner.name,
          businessPartnerBpnl: serializedPart.businessPartner.bpnl,
        };
      });
      setRows(rowsWithStatus);
      
      
      // Show success message
      showSuccess('Serialized part deleted successfully!');
      
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

  const handleRefresh = async () => {
    
    
    // Set refresh loading state (doesn't show overlay)
    setIsRefreshing(true);
    
    try {
      // Only refresh twins data if there are parts to work with
      if (parts && parts.length > 0) {
        
        await fetchTwinsOnce();
        
      }

      // Trigger the parent to refresh the serialized parts data
      if (onRefresh) {
        
        onRefresh();
      } else {
        console.warn('No onRefresh callback provided');
      }
      
      // Show success message
      showSuccess('Data refreshed successfully!');
    } catch (error) {
      console.error('Error refreshing data:', error);
      
      // Extract meaningful error message
      let errorMessage = 'Failed to refresh data. Please try again.';
      
      if (error instanceof Error) {
        errorMessage = `Refresh failed: ${error.message}`;
      } else if (typeof error === 'object' && error !== null && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string; error?: string } } };
        if (axiosError.response?.data?.message) {
          errorMessage = `Refresh failed: ${axiosError.response.data.message}`;
        } else if (axiosError.response?.data?.error) {
          errorMessage = `Refresh failed: ${axiosError.response.data.error}`;
        }
      }
      
      showError(errorMessage);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Transform data for DataGrid (keeping the old logic as fallback)
  const fallbackRows = parts.map((part, index) => ({
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
    van: part.van,
    twinStatus: StatusVariants.draft,
  }));

  const displayRows = rows.length > 0 ? rows : fallbackRows;

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
      width: 270,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <Typography 
            variant="body2" 
            sx={{ 
              fontSize: '0.875rem',
            }}
          >
            {params.value || '-'}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'name',
      headerName: 'Name',
      width: 150,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <Typography 
            variant="body2" 
            sx={{ 
              fontSize: '0.875rem',
            }}
          >
            {params.value || '-'}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'category',
      headerName: 'Category',
      width: 140,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <Typography 
            variant="body2" 
            sx={{ 
              fontSize: '0.875rem',
            }}
          >
            {params.value || '-'}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'customerPartId',
      headerName: 'Customer Part ID',
      width: 260,
      align: 'left',
      headerAlign: 'center',
      renderCell: (params) => (        
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <Typography 
            variant="body2" 
            sx={{ 
              fontSize: '0.875rem',
            }}
          >
            {params.value}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'globalId',
      headerName: 'Global Asset ID',
      width: 200,
      align: 'left',
      headerAlign: 'left',
      renderCell: (params) => {
        const globalId = params.value;
        const displayValue = globalId && !globalId.startsWith('urn:uuid:') ? `urn:uuid:${globalId}` : globalId;
        const isAnimating = copyAnimations[`${params.row.id}-globalId`];

        const handleCopy = () => {
          if (displayValue) {
            navigator.clipboard.writeText(displayValue).then(() => {
              setCopyAnimations(prev => ({ ...prev, [`${params.row.id}-globalId`]: true }));
              setTimeout(() => {
                setCopyAnimations(prev => ({ ...prev, [`${params.row.id}-globalId`]: false }));
              }, 600);
              setSnackbar({ open: true, message: 'Global Asset ID copied!', severity: 'success' });
            }).catch(() => {
              setSnackbar({ open: true, message: 'Failed to copy', severity: 'error' });
            });
          }
        };

        return (
          <Box sx={{ display: 'flex', alignItems: 'center', height: '100%', gap: 1 }}>
            <Tooltip title={displayValue || 'No Global Asset ID'} arrow>
              <Typography 
                variant="body2" 
                sx={{ 
                  fontSize: '0.875rem',
                  color: 'rgb(248, 249, 250) !important',
                  maxWidth: '120px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {displayValue || '-'}
              </Typography>
            </Tooltip>
            {displayValue && (
              <IconButton
                size="small"
                onClick={handleCopy}
                sx={{ 
                  color: 'rgb(248, 249, 250)',
                  padding: '4px',
                  transform: isAnimating ? 'scale(1.2)' : 'scale(1)',
                  transition: 'transform 0.3s ease',
                  '&:hover': { 
                    backgroundColor: 'rgba(248, 249, 250, 0.1)',
                  }
                }}
              >
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            )}
          </Box>
        );
      },
    },
    {
      field: 'dtrAasId',
      headerName: 'AAS ID',
      width: 200,
      align: 'left',
      headerAlign: 'left',
      renderCell: (params) => {
        const dtrAasId = params.value;
        const displayValue = dtrAasId && !dtrAasId.startsWith('urn:uuid:') ? `urn:uuid:${dtrAasId}` : dtrAasId;
        const isAnimating = copyAnimations[`${params.row.id}-dtrAasId`];

        const handleCopy = () => {
          if (displayValue) {
            navigator.clipboard.writeText(displayValue).then(() => {
              setCopyAnimations(prev => ({ ...prev, [`${params.row.id}-dtrAasId`]: true }));
              setTimeout(() => {
                setCopyAnimations(prev => ({ ...prev, [`${params.row.id}-dtrAasId`]: false }));
              }, 600);
              setSnackbar({ open: true, message: 'AAS ID copied!', severity: 'success' });
            }).catch(() => {
              setSnackbar({ open: true, message: 'Failed to copy', severity: 'error' });
            });
          }
        };

        return (
          <Box sx={{ display: 'flex', alignItems: 'center', height: '100%', gap: 1 }}>
            <Tooltip title={displayValue || 'No AAS ID'} arrow>
              <Typography 
                variant="body2" 
                sx={{ 
                  fontSize: '0.875rem',
                  color: 'rgb(248, 249, 250) !important',
                  maxWidth: '120px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {displayValue || '-'}
              </Typography>
            </Tooltip>
            {displayValue && (
              <IconButton
                size="small"
                onClick={handleCopy}
                sx={{ 
                  color: 'rgb(248, 249, 250)',
                  padding: '4px',
                  transform: isAnimating ? 'scale(1.2)' : 'scale(1)',
                  transition: 'transform 0.3s ease',
                  '&:hover': { 
                    backgroundColor: 'rgba(248, 249, 250, 0.1)',
                  }
                }}
              >
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            )}
          </Box>
        );
      },
    },
    {
      field: 'businessPartnerName',
      headerName: 'Business Partner',
      width: 180,
      renderCell: (params) => (        
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <Typography 
            variant="body2" 
            sx={{ 
              fontSize: '0.875rem',
              color: '#000000 !important',
            }}
          >
            {params.value || params.row.businessPartner?.name || '-'}
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
          <Typography 
            variant="body2" 
            sx={{ 
              fontSize: '0.875rem',
              color: '#000000 !important',
            }}
          >
            {params.value || params.row.businessPartner?.bpnl || '-'}
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
          <Typography 
            variant="body2" 
            sx={{ 
              fontSize: '0.875rem',
            }}
          >
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
          <Typography 
            variant="body2" 
            sx={{ 
              fontSize: '0.875rem',
            }}
          >
            {params.value}
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
          <Typography 
            variant="body2" 
            sx={{ 
              fontSize: '0.875rem',
              color: 'rgb(248, 249, 250) !important',
            }}
          >
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
          <Typography 
            variant="body2" 
            sx={{ 
              fontSize: '0.875rem',
              color: 'rgb(248, 249, 250) !important',
            }}
          >
            {params.value || '-'}
          </Typography>
        </Box>
      ),
    }
  ];

  return (
    <Box sx={{ width: '100%' }}>
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
                Serialized Parts
              </Typography>
              <Typography
                variant="body2"
                sx={{ 
                  color: 'rgba(248, 249, 250, 0.7)',
                  mt: 0.5,
                }}
              >
                View and manage serialized part instances ({displayRows.length} total)
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
              Add Serialized Part
            </Button>
            
            <Button
              variant="contained"
              startIcon={isRefreshing ? <CircularProgress size={16} sx={{ color: 'white' }} /> : <RefreshIcon />}
              onClick={handleRefresh}
              disabled={isRefreshing}
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
                '&:disabled': {
                  background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
                  opacity: 0.7,
                  transform: 'none',
                },
                transition: 'all 0.2s ease-in-out',
              }}
            >
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
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
        <Box sx={{ height: 600, width: '100%' }}>
          <DataGrid
            className="modern-data-grid"
            rows={displayRows}
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
                '& .MuiDataGrid-columnHeader': {
                  borderRight: '1px solid black',
                  '&:last-child': {
                    borderRight: 'none',
                  },
                },
                '& .MuiDataGrid-columnHeaderTitle': {
                  fontWeight: 700,
                  color: '#000000',
                },
                '& .MuiDataGrid-iconButtonContainer': {
                  '& .MuiIconButton-root': {
                    color: '#000000 !important',
                  },
                  '& .MuiSvgIcon-root': {
                    color: '#000000 !important',
                  },
                },
                '& .MuiDataGrid-sortIcon': {
                  color: '#000000 !important',
                },
                '& .MuiDataGrid-menuIcon': {
                  color: '#000000 !important',
                },
                '& .MuiDataGrid-filterIcon': {
                  color: '#000000 !important',
                },
              },
              '& .MuiDataGrid-columnSeparator': {
                color: '#000000 !important',
                '& svg': {
                  color: '#000000 !important',
                },
              },
              '& .MuiDataGrid-columnHeader:focus': {
                outline: 'none',
              },
              '& .MuiDataGrid-cell': {
                fontSize: '0.875rem',
                borderBottom: '1px solid black',
                borderRight: '1px solid black',
                backgroundColor: 'transparent',
                color: '#000000 !important',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                '&:last-child': {
                  borderRight: 'none',
                },
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
                minHeight: '400px',
              },
              '& .MuiDataGrid-overlay': {
                backgroundColor: 'transparent',
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
            loading={isInitialLoading}
            slots={{
              loadingOverlay: () => (
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  height: '100%',
                  gap: 3,
                  p: 4,
                }}>
                  <CircularProgress 
                    size={60} 
                    sx={{ 
                      color: '#1976d2',
                      mb: 2,
                    }} 
                  />
                  <Typography variant="h6" sx={{ color: 'rgb(248, 249, 250)', fontWeight: 600 }}>
                    Loading twins data...
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(248, 249, 250, 0.6)', textAlign: 'center', maxWidth: 300 }}>
                    Fetching twin information for serialized parts
                  </Typography>
                </Box>
              ),
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
                    <ViewListIcon sx={{ fontSize: 32, color: 'rgba(25, 118, 210, 0.8)' }} />
                  </Box>
                  <Typography variant="h6" sx={{ color: 'rgb(248, 249, 250)', fontWeight: 600 }}>
                    No serialized parts found
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(248, 249, 250, 0.6)', textAlign: 'center', maxWidth: 300 }}>
                    There are currently no serialized parts to display. Parts will appear here once they are created.
                  </Typography>
                </Box>
              ),
            }}
          />
        </Box>
      </Paper>
      
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
        autoHideDuration={4000}
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

      {/* Copy Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
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

      {/* Add Serialized Part Dialog */}
      <AddSerializedPartDialog
        open={addDialogOpen}
        onClose={handleCloseAddDialog}
        onSuccess={handleRefresh}
      />
    </Box>
  );
};

export default SerializedPartsTable;