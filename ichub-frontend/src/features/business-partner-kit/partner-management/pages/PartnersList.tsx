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
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND,
 * either express or implied. See the
 * License for the specific language govern in permissions and limitations
 * under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 ********************************************************************************/

import { useState, useEffect, useMemo, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { PartnerInstance } from "@/features/business-partner-kit/partner-management/types/types";
import TablePagination from '@mui/material/TablePagination';
import { Typography, Grid2, Button, Alert } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import { PartnerCard } from "@/features/business-partner-kit/partner-management/components/partners-list/PartnerCard";
import CreatePartnerDialog from "@/features/business-partner-kit/partner-management/components/general/CreatePartnerDialog";
import { fetchPartners } from '@/features/business-partner-kit/partner-management/api';
import {ErrorNotFound} from '@/components/general/ErrorNotFound';
import LoadingSpinner from '@/components/general/LoadingSpinner';

const PartnersList = () => {
  const [partnerList, setPartnerList] = useState<PartnerInstance[]>([]);
  const [editingPartner, setEditingPartner] = useState<PartnerInstance | undefined>(undefined);
  const [initialPartnerList, setInitialPartnerList] = useState<PartnerInstance[]>([]);
  const [createPartnerDialogOpen, setCreatePartnerDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [page, setPage] = useState(0);
  const rowsPerPage = 10;
  const location = useLocation();
  const navigate = useNavigate();

  const handleOpenCreatePartnerDialog = () => {
    setCreatePartnerDialogOpen(true);
  };

  const handleCloseCreatePartnerDialog = () => {
    setCreatePartnerDialogOpen(false);
    setEditingPartner(undefined);
  };

  const handleCreatePartner = (newPartner: PartnerInstance) => {
    // Here we just set the new partner to the list
    // Afterwards we would have to call the API to store it

    if (editingPartner) {
      setPartnerList(prev =>
        prev.map(p => (p.bpnl === newPartner.bpnl ? newPartner : p))
      );
      setInitialPartnerList(prev =>
        prev.map(p => (p.bpnl === newPartner.bpnl ? newPartner : p))
      );
    } else {
      setPartnerList(prev => [...prev, newPartner]);
      setInitialPartnerList(prev => [...prev, newPartner]);
    }
  };

  const handleChangePage = (
    _event: React.MouseEvent<HTMLButtonElement> | null,
    newPage: number,
  ) => {
    setPage(newPage);
  };

  const loadPartners = useCallback(async (isRetry: boolean = false) => {
    try {
      if (isRetry) {
        setIsRetrying(true);
      } else {
        setIsLoading(true);
      }
      setError(null);
      
      // Add timeout to prevent infinite loading
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout after 30 seconds')), 30000);
      });
      
      const data = await Promise.race([
        fetchPartners(),
        timeoutPromise
      ]);
      
      setPartnerList(data || []);
      setInitialPartnerList(data || []);
      
      // If we got empty data, show a warning but don't treat it as an error
      if (!data || data.length === 0) {
        console.warn('No partners returned from backend');
      }
    } catch (error) {
      console.error('Error fetching partners:', error);
      setError(
        error instanceof Error 
          ? error.message 
          : 'Failed to load partners. Please check backend connectivity.'
      );
      setPartnerList([]);
      setInitialPartnerList([]);
    } finally {
      // Always clear loading states, even on error
      setIsLoading(false);
      setIsRetrying(false);
    }
  }, []);

  useEffect(() => {
    loadPartners();
  }, [loadPartners]);

  // Auto-open create dialog if query param or hash is present
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const hasNewParam = searchParams.has('new');
    const hasNewHash = location.hash === '#new';
    
    if (hasNewParam || hasNewHash) {
      setCreatePartnerDialogOpen(true);
      // Clean up URL after opening dialog
      if (hasNewParam) {
        searchParams.delete('new');
        navigate(`${location.pathname}${searchParams.toString() ? '?' + searchParams.toString() : ''}${location.hash}`, { replace: true });
      } else if (hasNewHash) {
        navigate(`${location.pathname}${location.search}`, { replace: true });
      }
    }
  }, [location, navigate]);

  const handleButtonClick = (partnerBPNL: string) => {
    
    // For now we will just log the partnerBPNL
    //navigate(`/partner/${partnerBPNL}`);  // Navigate to the details page
  };

  const handleEdit = (bpnlToEdit: string) => {
    const partnerToEdit = partnerList.find(p => p.bpnl === bpnlToEdit);
    if (partnerToEdit) {
      setEditingPartner(partnerToEdit);
      setCreatePartnerDialogOpen(true);
    }
  };

  const handleDelete = (bpnlToDelete: string) => {
    setPartnerList((prev) => prev.filter((partner) => partner.bpnl !== bpnlToDelete));
    setInitialPartnerList((prev) => prev.filter((partner) => partner.bpnl !== bpnlToDelete));
  };

  const visibleRows = useMemo(
    () => {
      return [...partnerList].slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
    },
    [page, rowsPerPage, partnerList],
  );

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <>
      <Grid2 className="product-catalog" container spacing={1} direction="row">
        <Grid2 className="title flex flex-content-center">
          <Typography className="text">
            Contact List
          </Typography>
        </Grid2>

        <Grid2 size={12} container justifyContent="flex-end" marginRight={6} marginBottom={2}>
          <Button className="add-button" variant="outlined" size="small" onClick={handleOpenCreatePartnerDialog} startIcon={<AddIcon />} >New</Button>
        </Grid2>

        {/* Error State */}
        {error && (
          <Grid2 size={12} className="flex flex-content-center" sx={{ mb: 2 }}>
            <Alert 
              severity="error" 
              sx={{ 
                backgroundColor: 'rgba(244, 67, 54, 0.1)', 
                color: 'white',
                width: '100%',
                maxWidth: '600px'
              }}
              action={
                <Button 
                  onClick={() => loadPartners(true)} 
                  disabled={isRetrying}
                  variant="outlined"
                  size="small"
                  sx={{ 
                    color: 'white', 
                    borderColor: 'white',
                    '&:hover': { borderColor: 'white', backgroundColor: 'rgba(255,255,255,0.1)' }
                  }}
                >
                  {isRetrying ? 'Retrying...' : 'Retry'}
                </Button>
              }
            >
              {error}
            </Alert>
          </Grid2>
        )}

        {/* No Partners State */}
        {!error && partnerList.length === 0 ? (
          <Grid2 className="flex flex-content-center" size={12}>
            <ErrorNotFound icon={ReportProblemIcon} message="No partners were added yet, use the green button above to create one."/>
          </Grid2>
        ) : !error && (
          <>
            <Grid2 className="flex flex-content-center" size={12}>
              <PartnerCard
                onClick={handleButtonClick}
                onDelete={handleDelete}
                onEdit={handleEdit}
                items={visibleRows.map((partner) => ({
                  bpnl: partner.bpnl,
                  name: partner.name,
                }))}
              />
            </Grid2>

            <Grid2 size={12} className="flex flex-content-center">
              <TablePagination
                rowsPerPageOptions={[rowsPerPage]}
                component="div"
                count={initialPartnerList.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                className="product-list-pagination"
              />
            </Grid2>
          </>
        )}
      </Grid2>
      
      <CreatePartnerDialog open={createPartnerDialogOpen} onClose={handleCloseCreatePartnerDialog} onSave={handleCreatePartner} partnerData={editingPartner}/>
    </>
  );
};

export default PartnersList;
