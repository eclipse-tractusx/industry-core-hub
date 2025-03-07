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
import carPartsData from "../tests/payloads/sample-data.json";
import instanceData from "../tests/payloads/instance-data.json";
import { DropdownMenu, StatusTag, Button, Icon, Typography, PageNotifications, Table } from '@catena-x/portal-shared-components';
import { PRODUCT_STATUS, PRODUCT_OPTIONS } from "../types/common";
import JsonViewerDialog from "../components/JsonViewerDialog";
import { Grid2 } from '@mui/material';

const ProductsDetails = () => {
  const { id } = useParams<{ id: string }>();
  const part = carPartsData.find((part) => part.uuid === id);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [notification, setNotification] = React.useState<{ open: boolean; severity: "success" | "error"; title: string } | null>(null);

  if (!part) {
    return <div>Product not found</div>;
  }

  const handleOpenDialog = () => {
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(part.uuid)
      .then(() => {
        setNotification({
          open: true,
          severity: "success",
          title: "PartInstanceID copied to clipboard",
        });
        setTimeout(() => setNotification(null), 15500); // Cierra la notificación después de 3 segundos
      })
      .catch((error) => {
        setNotification({
          open: true,
          severity: "error",
          title: "Failed to copy PartInstanceID",
        });
        setTimeout(() => setNotification(null), 15500); // Cierra la notificación después de 3 segundos
        console.error("Failed to copy text: ", error);
      });
  };

  const handleDownload = () => {
    const fileName = part.name.toLowerCase().replace(/\s+/g, "-") + ".txt";
    const blob = new Blob([part.uuid], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: part.name,
          text: `Check out this part: ${part.name} (UUID: ${part.uuid})`,
          url: window.location.href
        });
      } catch (error) {
        console.error("Error sharing:", error);
      }
    } else {
      console.log("Web Share API not supported.");
    }
  };


  const getStatusTag = (status: string) => {
    switch (status.toLowerCase()) {
      case PRODUCT_STATUS.REGISTERED:
        return <StatusTag color="confirmed" label="Registered" variant="outlined" />;
      case PRODUCT_STATUS.DRAFT:
        return <StatusTag color="info" label="Draft" variant="outline" />;
      case PRODUCT_STATUS.SHARED:
        return <StatusTag color="warning" label="Shared" variant="filled" />;
      default:
        return null;
    }
  };

  return (
    <div className="productWrapper">
      
    {notification && (
      <div style={{ maxWidth: '300px', marginLeft: 'auto' }}>
        <PageNotifications open severity="success" showIcon title="Copy successful" />
      </div>
    )}
    <div className="productDetail">
      <div className="flex flex-content-between m-3">
        {getStatusTag(part.status)}
        <Button size="small"
          onClick={() => console.log("DCM v2.0 button")}
          style={{
            backgroundColor: "rgba(77, 77, 77, 0.56)",
            height: "32px",
            boxSizing: "border-box",
            borderRadius: "6px",
            fontSize: "0.8125rem"
          }} 
          endIcon={<Icon fontSize="16" iconName="Edit" />}>
          
          <span className="update-button-content">UPDATE</span>
          
        </Button>
        <DropdownMenu
              buttonSx={{
                'padding': '10px 10px',
                'border': '1px solid #b4b4b4!important',
                'font-size': '14px',
              }}
              buttonText="Share"
              startIcon={<Icon fontSize="16" iconName="IosShare" />}
            >
              <div className="flex flex-column">
                <Button className="dropdown-button" color="secondary" size="small" onClick={handleCopy} className="share-dropdown-btn" startIcon={<Icon fontSize="16" iconName="ContentCopy" />}>
                  <span className="dropdown-button-content">{PRODUCT_OPTIONS.COPY}</span>
                </Button>
                <Button className="dropdown-button" color="secondary" size="small" onClick={handleDownload} className="share-dropdown-btn" startIcon={<Icon fontSize="16" iconName="FileDownload" />}>
                  <span className="dropdown-button-content">{PRODUCT_OPTIONS.DOWNLOAD}</span>
                </Button>
                <Button className="dropdown-button" color="secondary" size="small" onClick={handleShare} className="share-dropdown-btn" startIcon={<Icon fontSize="16" iconName="IosShare" />}>
                  <span className="dropdown-button-content">{PRODUCT_OPTIONS.SHARE}</span>
                </Button>
              </div>
            </DropdownMenu>
      </div>
      <Grid2 container spacing={1} direction="row"   sx={{
    justifyContent: "space-between",
    alignItems: "top",
  }}>
        <Grid2 size={5}>
          <Grid2 className="my-5 flex flex-content-between px-3">
            <div className="title-subtitle">
              <Typography variant="h2">{part.name}</Typography>
              <Typography variant="caption1">{part.class}</Typography>
            </div>
          </Grid2>

          <Grid2 className="ml-3 product-card">
            <div className="mb-2">
              <Typography variant="label3">Manufacturer</Typography>
              <Typography variant="body1">{part.manufacturer}</Typography>
            </div>
            <div className="mt-2 mb-2">
              <Typography variant="label3">Manufacturer Part Id</Typography>
              <Typography variant="body1">{part.manufacturerPartId}</Typography>
            </div>
            <div className="mb-2" style={{margin: '30px 0px 10px 0'}}>
              <Typography variant="label4">Description</Typography>
              <Typography variant="body2">{part.description}</Typography>
            </div>
            <div className="flex flex-content-between">
            <div className="mr-2">
              <Typography variant="label4">Created</Typography>
              <Typography variant="body2">{part.created}</Typography>
            </div>
            <div className="ml-2">
              <Typography variant="label4">Updated</Typography>
              <Typography variant="body2">{part.created}</Typography>
            </div>
            </div>
          </Grid2>
        </Grid2>
        <Grid2 size={{lg: 3, md: 6, sm: 6}}>
          <img src={part.image} alt={part.name} className="product-image img-fluid my-auto" />
          <div className="mt-3">
          <div className="mt-2 mb-2 flex flex-items-center">
              <Typography variant="label4">{part.uuid}</Typography>
            </div>
            <h2>Shared With:</h2>
            <ul className="mt-3">
              <li className="flex">
                <Icon fontSize="16" iconName="Polyline" className="my-auto mr-1" />
                <Typography variant="label2" style={{ marginRight: "5px" }}>Volkswagen AG -</Typography>
                <Typography variant="body2">BPNL42621500AS61</Typography>
              </li>
              <li className="flex">
                <Icon fontSize="16" iconName="Polyline" className="my-auto mr-1" />
                <Typography variant="label2" style={{ marginRight: "5px" }}>BMW Racing Gmbh -</Typography>
                <Typography variant="body2">BPNL3A4T8A5621S3</Typography>
              </li>
              <li className="flex">
                <Icon fontSize="16" iconName="Polyline" className="my-auto mr-1" />
                <Typography variant="label2" style={{ marginRight: "5px" }}>John the Recycler KG - </Typography>
                <Typography variant="body2">BPNL5ASD5428800A</Typography>
              </li>
              <li className="flex">
                <Icon fontSize="16" iconName="Launch" className="my-auto mr-1" />
                <a href="">512 more</a>
  
              </li>
            </ul>
          </div>
        </Grid2>
      </Grid2>

      <div className="flex m-5">
        <Button className="submodel-button" variant="outlined" color="primary" size="large" onClick={handleOpenDialog} fullWidth={true} style={{ padding: "10px" }}>
          <span className="submodel-button-content">DIGITAL PRODUCT PASSPORT v5.0.0</span>
          <Icon fontSize="16" iconName="OpenInNew" />
        </Button>
      </div>
      <div className="flex m-5 flex-content-between flex-gap-5">
        <Button className="submodel-button" variant="outlined" color="primary" size="large" onClick={() => console.log("PCF v3.0 button")} fullWidth={true} style={{ padding: "10px" }}>
          <span className="submodel-button-content">PCF v3.0.0</span>
          <Icon fontSize="16" iconName="OpenInNew" />
        </Button>
        <Button className="submodel-button" variant="outlined" color="primary" size="large" onClick={() => console.log("DPP v2.0 button")} fullWidth={true} style={{ padding: "10px" }}>
          <span className="submodel-button-content">TRANSMISSION PASS v2.0.0</span>
          <Icon fontSize="16" iconName="OpenInNew" />
        </Button>
        <Button className="submodel-button" variant="outlined"color="primary" size="large" fullWidth={true} style={{ padding: "10px" }}>
          <span className="submodel-button-content">DCM v2.0.0</span>
          <Icon fontSize="16" iconName="OpenInNew" />
        </Button>
      </div>
      <div className="flex m-5">
        <Button className="submodel-button" color="success" size="small" onClick={() => console.log("Add button")} fullWidth={true} style={{ padding: "5px" }}>
          <Icon fontSize="18" iconName="Add" />
        </Button>
      </div>

      <JsonViewerDialog open={dialogOpen} onClose={handleCloseDialog} carJsonData={part}/>
    </div>
    <div className="product-table-wrapper">
    <Table
      className="product-table"
      columnHeadersBackgroundColor="#fff"
      getRowId={(row) => row.uuid}

      rowsCount="5 of 52.0213 Digital Twins"
      columns={[
        {
          field: 'uuid',  
          flex: 3,
          headerName: 'uuid'
        },
        {
          field: 'partInstanceId',
          flex: 3,
          headerName: 'Part Instance ID'
        },
        {
          field: 'submodels',
          flex: 1,
          headerName: 'Submodels'
        },
        {
          field: 'status',
          flex: 1,
          headerName: 'Status'
        },
        {
          field: 'type',
          flex: 1,
          headerName: 'Type'
        },
        {
          field: 'created',
          flex: 1,
          headerName: 'Created'
        },
        {
          field: 'updated',
          flex: 2,
          headerName: 'Updated'
        },
        {
          field: 'manufacturer',
          flex: 2,
          headerName: 'Manufacturer'
        }
      ]}
      disableColumnMenu
      disableColumnSelector
      disableDensitySelector
      hasBorder
      hideFooter
      noRowsMsg="No rows"
      rowHeight={50}
      rows={instanceData}
      
      searchPlaceholder=""
      title="Instance Products"
      toolbarVariant="basic"
    />
    </div>
    </div>
  );
}

export default ProductsDetails