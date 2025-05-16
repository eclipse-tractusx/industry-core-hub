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

import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import carPartsData from "../tests/payloads/sample-data.json";
import { ProductCard } from "../features/catalog-management/components/product-list/ProductCard";
import { PartInstance } from "../types/product";
import TablePagination from '@mui/material/TablePagination';
import { Typography, Grid2 } from '@mui/material';
import { StatusVariants } from "../features/catalog-management/components/product-list/CardChip";
import ShareDialog from "../components/general/ShareDialog";


const ProductsList = () => {
  const [carParts, setCarParts] = useState<PartInstance[]>([]);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedPart, setSelectedPart] = useState<PartInstance | null>(null);
  const [initialCarParts, setInitialCarParts] = useState<PartInstance[]>([]);
  const [page, setPage] = useState(0);
  const rowsPerPage = 10;
  const navigate = useNavigate();

  const handleChangePage = (
    _event: React.MouseEvent<HTMLButtonElement> | null,
    newPage: number,
  ) => {
    setPage(newPage);
  };

  useEffect(() => {
    // Define the async function inside useEffect
    const fetchData = async () => {
      try {
        const mappedCarParts = carPartsData.map((part) => ({
          ...part,
          status: part.status as StatusVariants,
        }));
        setCarParts(mappedCarParts);
        setInitialCarParts(mappedCarParts);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    fetchData();  // Call the async function
  }, []);

  const handleButtonClick = (partUuid: string) => {
    navigate(`/product/${partUuid}`);  // Navigate to the details page
  };

  const handleShareDialog = (uuid: string) => {
    const part = visibleRows.find(p => p.uuid === uuid);
    if (part) {
      console.log('Share dialog for part:', part);
      setSelectedPart(part);
      setShareDialogOpen(true);
    } else {
      console.warn('Part not found for UUID:', uuid);
    }
  };
  
  const handleMore = (itemId: string) => {
    console.log('More options for item with id:', itemId);
    // More options logic
  };

  const visibleRows = useMemo(
    () => {
      return [...carParts].slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
    },
    [page, rowsPerPage, carParts],
  );

  return (
    <Grid2 className="product-catalog" container spacing={1} direction="row">
      <Grid2 className="title flex flex-content-center">
        <Typography className="text">
          Catalog Parts
        </Typography>
      </Grid2>

      <Grid2 className="flex flex-content-center" size={12}>
        <ProductCard
          onClick={handleButtonClick}
          onShare={handleShareDialog}
          onMore={handleMore}
          items={visibleRows.map((part) => ({
            uuid: part.uuid,
            name: part.name,
            class: part.class,
            status: part.status as StatusVariants,
          }))}
        />
      </Grid2>

      <Grid2 size={12} className="flex flex-content-center">
        <TablePagination
          rowsPerPageOptions={[rowsPerPage]}
          component="div"
          count={initialCarParts.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          className="product-list-pagination"
        />
      </Grid2>
    {selectedPart && (
      <ShareDialog
        open={shareDialogOpen}
        onClose={() => setShareDialogOpen(false)}
        partData={selectedPart}
      />
    )}
    </Grid2>
  );
};

export default ProductsList;
