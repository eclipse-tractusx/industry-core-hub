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

import React from "react";
import { useParams } from "react-router-dom";
import sharedPartners from '../tests/payloads/shared-partners.json';
import { StatusTag, Button, Icon } from '@catena-x/portal-shared-components';
import { PRODUCT_STATUS } from "../types/common";
import JsonViewerDialog from "../features/catalog-management/components/product-detail/JsonViewerDialog";
import Grid2 from '@mui/material/Grid2';
import InstanceProductsTable from "../features/catalog-management/components/product-detail/InstanceProductsTable";
import PageNotification from "../components/general/PageNotification";
import ShareDropdown from "../features/catalog-management/components/product-detail/ShareDropdown";
import ProductButton from "../features/catalog-management/components/product-detail/ProductButton";
import ProductData from "../features/catalog-management/components/product-detail/ProductData";
import ShareDialog from "../components/general/ShareDialog";
import { PartType } from "../types/product";
import { fetchCatalogPart } from "../features/catalog-management/api";
import { mapApiPartDataToPartType } from "../features/catalog-management/utils";

const ProductsDetails = () => {

  const { manufacturerId, manufacturerPartId } = useParams<{
    manufacturerId: string;
    manufacturerPartId: string;
  }>();

  const [partType, setPartType] = React.useState<PartType>();
  const [jsonDialogOpen, setJsonDialogOpen] = React.useState(false);
  const [shareDialogOpen, setShareDialogOpen] = React.useState(false);
  const [notification, setNotification] = React.useState<{ open: boolean; severity: "success" | "error"; title: string } | null>(null);
  

  React.useEffect(() => {
    if (!manufacturerId || !manufacturerPartId) return;

      fetchData();
    }, [manufacturerId, manufacturerPartId]);

    if(!manufacturerId || !manufacturerPartId){
    return <div>Product not found</div>; 
  }
  const productId = manufacturerId + "/" + manufacturerPartId

  const fetchData = async () => {
    try {
      const apiData = await fetchCatalogPart(manufacturerId, manufacturerPartId);
      console.log(apiData)
      // Map API data to PartInstance[]
      const mappedCarParts: PartType = mapApiPartDataToPartType(apiData)

      setPartType(mappedCarParts);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

        // Map API data to PartInstance[]
  if (!partType) {
    return <div>Product not found</div>;
  }

  const handleOpenJsonDialog = () => {
    setJsonDialogOpen(true);
  };

  const handleCloseJsonDialog = () => {
    setJsonDialogOpen(false);
  };

  const handleOpenShareDialog = () => {
    setShareDialogOpen(true);
  };

  const handleCloseShareDialog = () => {
    setShareDialogOpen(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(productId)
      .then(() => {
        setNotification({
          open: true,
          severity: "success",
          title: "PartInstanceID copied to clipboard",
        });
        setTimeout(() => setNotification(null), 3000);
      })
      .catch((error) => {
        setNotification({
          open: true,
          severity: "error",
          title: "Failed to copy PartInstanceID",
        });
        setTimeout(() => setNotification(null), 3000);
        console.error("Failed to copy text: ", error);
      });
  };

  const handleDownload = () => {
    const fileName = partType.name.toLowerCase().replace(/\s+/g, "-") + ".txt";
    const blob = new Blob([productId], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

    
  const getStatusTag = (status: string) => {
    switch (status.toLowerCase()) {
      case PRODUCT_STATUS.REGISTERED:
        return <StatusTag color="confirmed" label="Registered" variant="outlined" />;
      case PRODUCT_STATUS.DRAFT:
        return <StatusTag color="label" label="Draft" variant="outlined" />;
      case PRODUCT_STATUS.SHARED:
        return <StatusTag color="pending" label="Shared" variant="filled" />;
      default:
        return null;
    }
  };

  return (
    <>
      <PageNotification notification={notification} />

      <Grid2 container direction="column" className="productDetail">
        <Grid2 container spacing={2} className="mb-5">
          <Grid2 size={{lg: 4, md: 6, sm: 6}} display="flex" justifyContent="start">
            {getStatusTag(partType.status ?? PRODUCT_STATUS.DRAFT)}
          </Grid2>
          <Grid2 size={{lg: 4, md: 6, sm: 6}} display="flex" justifyContent={{ lg: "center", md: "end", sm: "end" }}>
            <Button size="small" onClick={() => console.log("DCM v2.0 button")} className="update-button" endIcon={<Icon fontSize="16" iconName="Edit" />}>            
                <span className="update-button-content">UPDATE</span>            
            </Button>
          </Grid2>
          <Grid2 size={{lg: 4, md: 12, sm: 12}} display="flex" justifyContent="end">
            <ShareDropdown handleCopy={handleCopy} handleDownload={handleDownload} handleShare={handleOpenShareDialog} />
          </Grid2>
        </Grid2>
        <ProductData part={partType} sharedParts={sharedPartners} />
        <Grid2 container spacing={2} direction="column" className="add-on-buttons">

          <ProductButton gridSize={{ sm: 12 }} buttonText="MORE INFORMATION" onClick={handleOpenJsonDialog} />

          <Grid2 container spacing={2} justifyContent="center">
            <ProductButton gridSize={{ lg: 4, md: 12, sm: 12 }} disabled={true} buttonText="PCF v3.0.0" onClick={() => console.log("PCF v2.0 button")} />
            <ProductButton gridSize={{ lg: 4, md: 12, sm: 12 }} disabled={true} buttonText="DIGITAL PRODUCT PASSPORT v6.0.0" onClick={() => console.log("TRANSMISSION PASS v2.0.0")} />
            <ProductButton gridSize={{ lg: 4, md: 12, sm: 12 }} disabled={true} buttonText="DCM v2.0.0" onClick={() => console.log("DPP v2.0 button")} />
          </Grid2>

          <Grid2 size={{ sm: 12 }}>
            <Button className="submodel-button" color="success" size="small" onClick={() => console.log("Add button")} fullWidth={true} style={{ padding: "5px" }}>
              <Icon fontSize="18" iconName="Add" />
            </Button>
          </Grid2>
        </Grid2>

        <Grid2 size={12} className='product-table-wrapper'>
          <InstanceProductsTable />
        </Grid2>
        
        <JsonViewerDialog open={jsonDialogOpen} onClose={handleCloseJsonDialog} partData={partType} />
        <ShareDialog open={shareDialogOpen} onClose={handleCloseShareDialog} partData={partType} />
      </Grid2>
    </>
  );
}

export default ProductsDetails