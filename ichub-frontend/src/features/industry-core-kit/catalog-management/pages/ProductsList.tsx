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
import { useTranslation } from "react-i18next";
import { ProductCard } from "@/features/industry-core-kit/catalog-management/components/product-list/ProductCard";
import { PartType, ApiPartData } from "@/features/industry-core-kit/catalog-management/types/types";
import TablePagination from "@mui/material/TablePagination";
import { Grid2, Box } from "@mui/material"; // Removed Paper
import { Button } from "@mui/material";
import { Alert, Snackbar } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import StorefrontIcon from "@mui/icons-material/Storefront";
import PageSectionHeader from '@/components/common/PageSectionHeader';
import { kitThemes } from '@/theme/colors';
import ShareDialog from "@/features/industry-core-kit/catalog-management/components/shared/ShareDialog";
import CreateProductListDialog from "@/features/industry-core-kit/catalog-management/components/product-list/CreateProductListDialog";
import { fetchCatalogParts, registerCatalogPartTwin } from "@/features/industry-core-kit/catalog-management/api";
import { mapApiPartDataToPartType } from "../utils/utils";
import { CatalogPartTwinCreateType } from "@/features/industry-core-kit/catalog-management/types/twin-types";

const ProductsList = () => {
  const { t } = useTranslation('catalogManagement');
  const [carParts, setCarParts] = useState<PartType[]>([]);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedPart, setSelectedPart] = useState<PartType | null>(null);
  const [initialCarParts, setInitialCarParts] = useState<PartType[]>([]);
  const [page, setPage] = useState(0);
  const rowsPerPage = 10;
  const navigate = useNavigate();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' >('success');
  const [isLoading, setIsLoading] = useState(true);

  const handleChangePage = (
    _event: React.MouseEvent<HTMLButtonElement> | null,
    newPage: number
  ) => {
    setPage(newPage);
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const apiData: ApiPartData[] = await fetchCatalogParts();

      // Map API data to PartInstance[]
      const mappedCarParts: PartType[] = apiData.map((part) =>
        mapApiPartDataToPartType(part)
      );

      mappedCarParts.reverse(); // Reverse the order of the array

      setCarParts(mappedCarParts);
      setInitialCarParts(mappedCarParts);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData(); // Call the async function
  }, []);

  const handleButtonClick = (partId: string) => {
    // partId is typically manufacturerId/manufacturerPartId
    const [manufacturerId, manufacturerPartId] = partId.split('/');
    navigate(`/product/${manufacturerId}/${encodeURIComponent(manufacturerPartId)}`); // Navigate to the details page
  };

  const handleShareDialog = (
    manufacturerId: string,
    manufacturerPartId: string
  ) => {
    const part = visibleRows.find(
      (p) =>
        p.manufacturerId === manufacturerId &&
        p.manufacturerPartId === manufacturerPartId
    ); // Use carParts directly as visibleRows is a slice
    if (part) {
      
      setSelectedPart(part);
      setShareDialogOpen(true);
    } else {
      console.warn(
        "Part not found for manufacturerId:",
        manufacturerId,
        ", manufacturerPartId:",
        manufacturerPartId
      );
    }
  };

  const handleMore = (manufacturerId: string, manufacturerPartId: string) => {
    // More options logic
  };

  const handleRegisterPart = async (manufacturerId: string, manufacturerPartId: string) => {
    try {
      const twinToCreate: CatalogPartTwinCreateType = {
        manufacturerId,
        manufacturerPartId,
      };
      await registerCatalogPartTwin(twinToCreate);
      setSnackbarMessage(t('messages.registerSuccess'));
      setSnackbarSeverity("success");
      setSnackbarOpen(true);
      fetchData();
    } catch (error) {
      console.error("Error registering part twin:", error);
      setSnackbarMessage(t('messages.registerError'));
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    }
  };

  const visibleRows = useMemo(() => {
    return [...carParts].slice(
      page * rowsPerPage,
      page * rowsPerPage + rowsPerPage
    );
  }, [page, rowsPerPage, carParts]);

  const handleOpenCreateDialog = () => {
    setIsCreateDialogOpen(true);
  };

  const handleCloseCreateDialog = () => {
    setIsCreateDialogOpen(false);
  };

  const handleSaveCatalogPart = () => {
    handleCloseCreateDialog();
    fetchData(); // Refresh the list after saving
    
  };

  return (
    <Box sx={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", p: { xs: 2, sm: 3, md: 4 } }}>
      <Snackbar
        open={snackbarOpen}
        onClose={() => setSnackbarOpen(false)}
        autoHideDuration={6000}
      >
        <Alert severity={snackbarSeverity} onClose={() => setSnackbarOpen(false)}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
      <Box sx={{ mb: 4 }}>
        <PageSectionHeader
          icon={<StorefrontIcon />}
          title={t('page.title')}
          subtitle={t('page.subtitle')}
          kitTheme={kitThemes.industryCore}
          actions={
            <Button
              variant="contained"
              onClick={handleOpenCreateDialog}
              startIcon={<AddIcon />}
              sx={{
                background: `linear-gradient(135deg, ${kitThemes.industryCore.gradientStart} 0%, ${kitThemes.industryCore.gradientEnd} 100%)`,
                color: '#fff',
                borderRadius: { xs: '10px', md: '12px' },
                fontWeight: 600,
                textTransform: 'none',
                boxShadow: `0 4px 16px ${kitThemes.industryCore.shadowColor}`,
                transition: 'all 0.2s ease',
                '&:hover': { filter: 'brightness(1.1)', boxShadow: `0 6px 24px ${kitThemes.industryCore.shadowColor}`, transform: 'translateY(-1px)' }
              }}
            >
              {t('page.createButton')}
            </Button>
          }
        />
      </Box>
      
      {/* Main content area that grows and positions content naturally */}
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-start", pt: 2 }}>
        <Grid2 className="product-catalog" container spacing={1} direction="row">
          <Grid2 className="flex flex-content-center" size={12}>
            <ProductCard
              onClick={handleButtonClick}
              onShare={handleShareDialog}
              onMore={handleMore}
              onRegisterClick={handleRegisterPart}
              items={visibleRows.map((part) => ({
                manufacturerId: part.manufacturerId,
                manufacturerPartId: part.manufacturerPartId,
                name: part.name,
                category: part.category,
                status: part.status,
              }))}
              isLoading={isLoading}
            />
          </Grid2>

          {/* Pagination pushed to bottom */}
          <Grid2 size={12} className="flex flex-content-center" sx={{ mt: "auto", pt: 3 }}>
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
      </Box>

      <CreateProductListDialog
        open={isCreateDialogOpen}
        onClose={handleCloseCreateDialog}
        onSave={handleSaveCatalogPart}
      />
    </Box>
  );
};

export default ProductsList;
