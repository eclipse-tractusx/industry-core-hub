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

import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button, Snackbar, Alert, Fab } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { CardChip } from "../components/product-list/CardChip";
import { StatusVariants } from "../types/types";
import HelpOutlineIcon from '@mui/icons-material/Help';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Grid2 from '@mui/material/Grid2';
import Box from '@mui/material/Box';

import InstanceProductsTable from "../components/product-detail/InstanceProductsTable";
import ShareDropdown from "../components/product-detail/ShareDropdown";
// Removed unused ProductButton import
import ProductData from "../components/product-detail/ProductData";
import JsonViewerDialog from "../components/product-detail/JsonViewerDialog";
import AddSerializedPartDialog from "../components/product-detail/AddSerializedPartDialog";
import SubmodelsGridDialog from "../components/product-detail/SubmodelsGridDialog";

import ShareDialog from "../components/shared/ShareDialog";
import {ErrorNotFound} from "../../../components/general/ErrorNotFound";
import LoadingSpinner from "../../../components/general/LoadingSpinner";

import { PartType } from "../types/types";
import { PRODUCT_STATUS } from "../types/shared";
import { CatalogPartTwinDetailsRead } from "../types/twin-types";

import { SharedPartner } from "../types/types"

import { fetchCatalogPart, fetchCatalogPartTwinDetails } from "../api";
import { mapApiPartDataToPartType, mapSharePartCustomerPartIds} from "../utils/utils";
import { useEscapeNavigation } from "../../../hooks/useEscapeKey";

const ProductsDetails = () => {
  const navigate = useNavigate();

  const { manufacturerId, manufacturerPartId } = useParams<{
    manufacturerId: string;
    manufacturerPartId: string;
  }>();

  const [partType, setPartType] = useState<PartType>();
  const [jsonDialogOpen, setJsonDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [addSerializedPartDialogOpen, setAddSerializedPartDialogOpen] = useState(false);
  const [submodelsGridDialogOpen, setSubmodelsGridDialogOpen] = useState(false);
  const [notification, setNotification] = useState<{ open: boolean; severity: "success" | "error"; title: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sharedPartners, setSharedPartners] = useState<SharedPartner[]>([]);
  const [twinDetails, setTwinDetails] = useState<CatalogPartTwinDetailsRead | null>(null);

  useEscapeNavigation(() => navigate('/catalog'), !jsonDialogOpen && !shareDialogOpen && !addSerializedPartDialogOpen && !submodelsGridDialogOpen);

  const fetchData = useCallback(async () => {
    if (!manufacturerId || !manufacturerPartId) return;
    
    setIsLoading(true);
    try {
      const apiData = await fetchCatalogPart(manufacturerId, manufacturerPartId);
      
      // Map API data to PartInstance[]
      const mappedPart: PartType = mapApiPartDataToPartType(apiData)
      setPartType(mappedPart);
      // Just if the customer part ids are available we can see if they are shared
      if(mappedPart.customerPartIds){
          const mappedResult:SharedPartner[] = mapSharePartCustomerPartIds(mappedPart.customerPartIds)
          setSharedPartners(mappedResult)
      }
      
      // Fetch twin details
      try {
        
        const twinData = await fetchCatalogPartTwinDetails(manufacturerId, manufacturerPartId);
        
        setTwinDetails(twinData);
      } catch (twinError) {
        console.error('Error fetching twin details:', twinError);
        setTwinDetails(null);
      }

    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [manufacturerId, manufacturerPartId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if(!manufacturerId || !manufacturerPartId){
    return <div>Product not found</div>; 
  }

  if (isLoading) {
    return <LoadingSpinner />;
  }
  
  // Map API data to PartInstance[]
  if (!partType) {
    return (
      <Grid2 className="product-catalog" container spacing={1} direction="row">
        <Grid2 className="flex flex-content-center" size={12} sx={{ 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center',
          gap: 2,
          minHeight: '60vh'
        }}>
          <ErrorNotFound icon={HelpOutlineIcon} message="404 PART NOT FOUND "/>
          <Button 
            className="back-button" variant="outlined" size="small"
            onClick={() => navigate('/catalog')}
            startIcon={<ArrowBackIcon />}
          >
            BACK TO CATALOG
          </Button>
        </Grid2>
      </Grid2>
    );
  }

  // Removed unused handler: Json dialog is controlled elsewhere

  const handleCloseJsonDialog = () => {
    setJsonDialogOpen(false);
  };

  const handleOpenShareDialog = () => {
    setShareDialogOpen(true);
  };

  const handleCloseShareDialog = () => {
    setShareDialogOpen(false);
  };

  const handleOpenAddSerializedPartDialog = () => {
    setAddSerializedPartDialogOpen(true);
  };

  const handleCloseAddSerializedPartDialog = () => {
    setAddSerializedPartDialogOpen(false);
  };

  const handleOpenSubmodelsGridDialog = () => {
    setSubmodelsGridDialogOpen(true);
  };

  const handleCloseSubmodelsGridDialog = () => {
    setSubmodelsGridDialogOpen(false);
  };

  const handleCloseNotification = () => {
    setNotification(null);
  };

  const getStatusTag = (status: string) => {
    let statusVariant: StatusVariants;
    
    switch (status.toLowerCase()) {
      case PRODUCT_STATUS.REGISTERED:
        statusVariant = StatusVariants.registered;
        break;
      case PRODUCT_STATUS.DRAFT:
        statusVariant = StatusVariants.draft;
        break;
      case PRODUCT_STATUS.PENDING:
        statusVariant = StatusVariants.pending;
        break;
      case PRODUCT_STATUS.SHARED:
        statusVariant = StatusVariants.shared;
        break;
      default:
        statusVariant = StatusVariants.draft;
        break;
    }

    // Note: No optimistic fallback here. The chip reflects exactly the backend-provided status.
    
    return <CardChip 
      status={statusVariant} 
      statusText={statusVariant} 
      className={(statusVariant === StatusVariants.shared) || (statusVariant === StatusVariants.pending) ? 'black-status-chip' : undefined}
    />;
  };

  return (
    <Box sx={{ 
      width: "100%", 
      height: "100%", 
      display: "flex", 
      flexDirection: "column",
      overflow: "auto" // Enable scrolling when content overflows
    }}>
      <Grid2 container className="productDetail" sx={{ flexGrow: 1 }}>
        <Grid2 size={4} display="flex" justifyContent="start" alignItems="center">
          {getStatusTag(partType.status ?? PRODUCT_STATUS.DRAFT)}
        </Grid2>
        <Grid2 size={4} display="flex" justifyContent="center" alignItems="center">
          <Button size="small" className="update-button" endIcon={<EditIcon />}>            
              <span className="update-button-content">UPDATE</span>            
          </Button>
        </Grid2>
        <Grid2 size={4} display="flex" justifyContent="end" alignItems="center">
          <ShareDropdown 
            partData={partType} 
            twinDetails={twinDetails} 
            handleShare={handleOpenShareDialog}
            onNotification={setNotification}
            onRefresh={fetchData}
          />
        </Grid2>

  <ProductData part={partType} sharedParts={sharedPartners} twinDetails={twinDetails} onPartUpdated={fetchData} />
        
        <Grid2 container size={12} spacing={2}className="add-on-buttons">
          <Grid2 size={{ sm: 12 }}>
            <Button className="submodel-button" color="success" size="small" onClick={handleOpenSubmodelsGridDialog} fullWidth={true} style={{ padding: "5px" }}>
              View Submodels
            </Button>
          </Grid2>
        </Grid2>

        <Grid2 size={12} className='product-table-wrapper'>
          <InstanceProductsTable part={partType} onAddClick={handleOpenAddSerializedPartDialog} />
        </Grid2>
        
        <JsonViewerDialog open={jsonDialogOpen} onClose={handleCloseJsonDialog} partData={partType} />
        <ShareDialog open={shareDialogOpen} onClose={handleCloseShareDialog} partData={partType} />
        <AddSerializedPartDialog open={addSerializedPartDialogOpen} onClose={handleCloseAddSerializedPartDialog} partData={partType} />
        <SubmodelsGridDialog 
          open={submodelsGridDialogOpen} 
          onClose={handleCloseSubmodelsGridDialog} 
          twinDetails={twinDetails}
          partName={partType?.name}
        />
      </Grid2>

      {/* Copy notification snackbar */}
      <Snackbar
        open={notification?.open || false}
        autoHideDuration={3000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseNotification}
          variant="filled"
          severity={notification?.severity || 'success'}
          sx={{ width: '100%' }}
        >
          {notification?.title}
        </Alert>
      </Snackbar>

      {/* Floating back button */}
      <Fab
        color="primary"
        aria-label="back"
        onClick={() => navigate('/catalog')}
        sx={{
          position: 'fixed',
          bottom: 24,
          left: 104,
          backgroundColor: '#1976d2',
          color: 'white',
          '&:hover': {
            backgroundColor: '#1565c0',
          },
        }}
      >
        <ArrowBackIcon />
      </Fab>
    </Box>
  );
}

export default ProductsDetails